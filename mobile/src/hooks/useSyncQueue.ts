import { useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyncContext } from '../context/SyncContext';
import { useTasksContext } from '../context/TasksContext';
import { api } from '../api/client';
import {
  getUnsyncedQueueItems,
  markQueueItemSynced,
  deleteQueueItem,
  saveLocalTask,
  deleteLocalTask,
} from '../db/sqlite';
import { Task } from '../types';

// Global execution lock to prevent overlapping sync runs
let isSyncingInProgress = false;

export function useSyncQueue() {
  const { state: { isOnline }, log, dispatch: syncDispatch, setTaskStatus } = useSyncContext();
  const { dispatch: tasksDispatch, refreshTasks } = useTasksContext();
  const isSyncingRef = useRef(false);
  const queryClient = useQueryClient();

  // Register TanStack Query mutations for automatic cache invalidations
  const createMutation = useMutation({
    mutationFn: (task: Task) => api.createTask(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const drainQueue = useCallback(async () => {
    if (!isOnline) {
      // Offline: do not run sync
      return;
    }

    if (isSyncingInProgress || isSyncingRef.current) {
      // Already running: skip
      return;
    }

    // Set locks
    isSyncingInProgress = true;
    isSyncingRef.current = true;

    try {
      let queue = await getUnsyncedQueueItems();
      syncDispatch({ type: 'SET_PENDING_COUNT', payload: queue.length });

      if (queue.length === 0) {
        isSyncingInProgress = false;
        isSyncingRef.current = false;
        return;
      }

      log(`Draining sync queue: ${queue.length} pending mutations...`, 'info');

      for (const item of queue) {
        // Double-check if we went offline mid-drain
        if (!isOnline) {
          log('Sync paused: connection lost during queue drainage.', 'warn');
          break;
        }

        log(`Syncing item #${item.id}: ${item.operation_type.toUpperCase()} for Task ${item.task_id}`, 'info');

        try {
          if (item.operation_type === 'delete') {
            // Delete operation
            try {
              await deleteMutation.mutateAsync(item.task_id);
            } catch (err: any) {
              // If task already deleted on server (404), it is a success for us
              if (err.response && err.response.status !== 404) {
                throw err;
              }
            }
            // Mark queue item synced and delete from SQLite
            await markQueueItemSynced(item.id);
            await deleteQueueItem(item.id); // clean up deleted tasks
            log(`Deleted Task ${item.task_id} on server.`, 'success');
          } else if (item.operation_type === 'create') {
            // Create operation
            const task: Task = JSON.parse(item.payload);

            // Check if task exists on server (to prevent duplicate creation)
            let serverTask: Task | null = null;
            try {
              serverTask = await api.getTask(task.id);
            } catch (err: any) {
              if (err.response && err.response.status !== 404) {
                throw err;
              }
            }

            if (serverTask) {
              // Task already exists on server, treat as conflict/merge
              const localTime = new Date(task.updated_at).getTime();
              const serverTime = new Date(serverTask.updated_at).getTime();

              if (serverTime > localTime) {
                // Server wins
                await saveLocalTask(serverTask);
                await markQueueItemSynced(item.id);
                tasksDispatch({ type: 'SYNC_CONFLICT_RESOLVED', payload: serverTask });
                setTaskStatus(task.id, 'conflict_resolved');
                log(
                  `Conflict Resolved (LWW): Server has newer version of '${task.title}'. Local overwrite complete.`,
                  'conflict'
                );
              } else {
                // Local wins, push update
                const updatedServerTask = await updateMutation.mutateAsync({ id: task.id, updates: task });
                await markQueueItemSynced(item.id);
                tasksDispatch({ type: 'SYNC_SUCCESS', payload: updatedServerTask });
                setTaskStatus(task.id, 'synced');
                log(`Conflict Resolved (LWW): Local created version is newer. Pushed to server.`, 'success');
              }
            } else {
              // Standard create
              const createdServerTask = await createMutation.mutateAsync(task);
              await markQueueItemSynced(item.id);
              tasksDispatch({ type: 'SYNC_SUCCESS', payload: createdServerTask });
              setTaskStatus(task.id, 'synced');
              log(`Created Task '${task.title}' on server.`, 'success');
            }
          } else if (item.operation_type === 'update') {
            // Update operation
            const localUpdates = JSON.parse(item.payload);
            const taskId = item.task_id;

            // Fetch server version
            let serverTask: Task | null = null;
            let alreadyDeletedOnServer = false;

            try {
              serverTask = await api.getTask(taskId);
            } catch (err: any) {
              if (err.response && err.response.status === 404) {
                alreadyDeletedOnServer = true;
              } else {
                throw err;
              }
            }

            if (alreadyDeletedOnServer) {
              // Server wins (deleted wins)
              await deleteLocalTask(taskId);
              await markQueueItemSynced(item.id);
              await deleteQueueItem(item.id);
              tasksDispatch({ type: 'DELETE_TASK_OPTIMISTIC', payload: taskId });
              log(
                `Conflict Resolved: Task with ID ${taskId} was deleted on server. Discarded local update.`,
                'conflict'
              );
            } else if (serverTask) {
              const localTime = new Date(localUpdates.updated_at).getTime();
              const serverTime = new Date(serverTask.updated_at).getTime();

              if (serverTime > localTime) {
                // Server wins
                await saveLocalTask(serverTask);
                await markQueueItemSynced(item.id);
                tasksDispatch({ type: 'SYNC_CONFLICT_RESOLVED', payload: serverTask });
                setTaskStatus(taskId, 'conflict_resolved');
                log(
                  `Conflict Resolved (LWW): Server has newer updates for '${serverTask.title}'. Overwrote local changes.`,
                  'conflict'
                );
              } else {
                // Local wins, push updates
                const updatedServerTask = await updateMutation.mutateAsync({ id: taskId, updates: localUpdates });
                await markQueueItemSynced(item.id);
                tasksDispatch({ type: 'SYNC_SUCCESS', payload: updatedServerTask });
                setTaskStatus(taskId, 'synced');
                log(`Updated Task '${updatedServerTask.title}' on server.`, 'success');
              }
            }
          }
        } catch (itemError: any) {
          // Individual item sync failed, stop draining queue to preserve order
          log(`Sync failed for item #${item.id}: ${itemError.message || 'Network error'}. Will retry.`, 'warn');
          break;
        }
      }

      // Refresh final tasks from local SQLite DB
      await refreshTasks();

      // Check if there are newly added items in the queue while we were syncing
      const remainingQueue = await getUnsyncedQueueItems();
      syncDispatch({ type: 'SET_PENDING_COUNT', payload: remainingQueue.length });

      if (remainingQueue.length > 0 && isOnline) {
        // Run queue drain again asynchronously, releasing locks first
        isSyncingInProgress = false;
        isSyncingRef.current = false;
        setTimeout(() => {
          drainQueue();
        }, 100);
        return;
      }
    } catch (error: any) {
      log(`Error processing sync queue: ${error.message}`, 'warn');
    } finally {
      // Release locks
      isSyncingInProgress = false;
      isSyncingRef.current = false;
    }
  }, [isOnline, log, syncDispatch, tasksDispatch, refreshTasks, setTaskStatus, createMutation, updateMutation, deleteMutation]);

  return { drainQueue };
}

