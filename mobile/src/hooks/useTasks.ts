import { useCallback } from 'react';
import { useTasksContext } from '../context/TasksContext';
import { useSyncContext } from '../context/SyncContext';
import { useSyncQueue } from './useSyncQueue';
import { saveLocalTask, deleteLocalTask, enqueueSyncOperation } from '../db/sqlite';
import { Task } from '../types';

// RFC4122 v4 compliant UUID generator (self-contained for absolute cross-platform safety)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useTasks() {
  const { state: { tasks, isLoading }, dispatch: tasksDispatch } = useTasksContext();
  const { setTaskStatus, log, state: { syncStatus } } = useSyncContext();
  const { drainQueue } = useSyncQueue();

  // Create Task
  const createTask = useCallback(
    async (title: string, description: string | null, dueDate: string | null) => {
      const now = new Date().toISOString();
      const newTask: Task = {
        id: generateUUID(),
        title: title.trim(),
        description: description ? description.trim() : null,
        is_completed: false,
        due_date: dueDate,
        created_at: now,
        updated_at: now,
      };

      try {
        // 1. Save to local SQLite database
        await saveLocalTask(newTask);

        // 2. Queue mutation
        await enqueueSyncOperation('create', newTask.id, newTask);

        // 3. Optimistic Context Updates
        tasksDispatch({ type: 'ADD_TASK_OPTIMISTIC', payload: newTask });
        setTaskStatus(newTask.id, 'pending');

        log(`Task '${newTask.title}' created locally (offline-first).`, 'info');

        // 4. Trigger queue drain
        drainQueue();
      } catch (err: any) {
        log(`Failed to create task locally: ${err.message}`, 'warn');
        throw err;
      }
    },
    [tasksDispatch, setTaskStatus, log, drainQueue]
  );

  // Update Task
  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<Task, 'id' | 'created_at'>>) => {
      const existingTask = tasks.find(t => t.id === id);
      if (!existingTask) return;

      const now = new Date().toISOString();
      const updatedTask: Task = {
        ...existingTask,
        ...updates,
        updated_at: now,
      };

      const syncPayload = {
        ...updates,
        updated_at: now,
      };

      try {
        // 1. Save to local SQLite
        await saveLocalTask(updatedTask);

        // 2. Queue mutation
        await enqueueSyncOperation('update', id, syncPayload);

        // 3. Optimistic Context Updates
        tasksDispatch({ type: 'UPDATE_TASK_OPTIMISTIC', payload: updatedTask });
        setTaskStatus(id, 'pending');

        log(`Task '${updatedTask.title}' updated locally (offline-first).`, 'info');

        // 4. Trigger queue drain
        drainQueue();
      } catch (err: any) {
        log(`Failed to update task locally: ${err.message}`, 'warn');
        throw err;
      }
    },
    [tasks, tasksDispatch, setTaskStatus, log, drainQueue]
  );

  // Toggle Completion
  const toggleTaskCompletion = useCallback(
    async (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const now = new Date().toISOString();
      const updatedTask: Task = {
        ...task,
        is_completed: !task.is_completed,
        updated_at: now,
      };

      try {
        await saveLocalTask(updatedTask);
        await enqueueSyncOperation('update', id, {
          is_completed: updatedTask.is_completed,
          updated_at: now,
        });

        tasksDispatch({ type: 'UPDATE_TASK_OPTIMISTIC', payload: updatedTask });
        setTaskStatus(id, 'pending');

        log(
          `Task '${task.title}' marked as ${updatedTask.is_completed ? 'completed' : 'incomplete'} locally.`,
          'info'
        );

        drainQueue();
      } catch (err: any) {
        log(`Failed to toggle completion locally: ${err.message}`, 'warn');
      }
    },
    [tasks, tasksDispatch, setTaskStatus, log, drainQueue]
  );

  // Delete Task
  const deleteTask = useCallback(
    async (id: string) => {
      const task = tasks.find(t => t.id === id);
      const title = task ? task.title : id;

      try {
        // 1. Delete from SQLite
        await deleteLocalTask(id);

        // 2. Queue deletion mutation
        await enqueueSyncOperation('delete', id, null);

        // 3. Optimistic Context Updates
        tasksDispatch({ type: 'DELETE_TASK_OPTIMISTIC', payload: id });
        // Clean up task sync state
        setTaskStatus(id, 'pending');

        log(`Task '${title}' deleted locally (offline-first).`, 'info');

        // 4. Trigger queue drain
        drainQueue();
      } catch (err: any) {
        log(`Failed to delete task locally: ${err.message}`, 'warn');
        throw err;
      }
    },
    [tasks, tasksDispatch, setTaskStatus, log, drainQueue]
  );

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    getTaskSyncStatus: (id: string) => syncStatus[id] || 'synced',
  };
}
