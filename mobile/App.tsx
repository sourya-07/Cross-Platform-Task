import './global.css';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
} from 'react-native';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SyncProvider, useSyncContext } from './src/context/SyncContext';
import { TasksProvider, useTasksContext } from './src/context/TasksContext';
import { useNetwork } from './src/hooks/useNetwork';
import { useSyncQueue } from './src/hooks/useSyncQueue';
import { useTasks } from './src/hooks/useTasks';
import { getDb, getLocalTask, getLocalTasks, saveLocalTask, deleteLocalTask, getUnsyncedQueueItems } from './src/db/sqlite';
import { api } from './src/api/client';
import { Task } from './src/types';

// UI Components
import GlobalBanner from './src/components/GlobalBanner';
import TaskCard from './src/components/TaskCard';
import AddTaskModal from './src/components/AddTaskModal';
import EditTaskModal from './src/components/EditTaskModal';
import DebugLogsPanel from './src/components/DebugLogsPanel';
import { Feather } from '@expo/vector-icons';

const queryClient = new QueryClient();

function AppContent() {
  const { isOnline } = useNetwork();
  const { drainQueue } = useSyncQueue();
  const { state: { pendingCount }, log } = useSyncContext();
  const { state: { isLoading, tasks }, refreshTasks } = useTasksContext();
  const { toggleTaskCompletion, deleteTask, createTask, updateTask, getTaskSyncStatus } = useTasks();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Diagnostic log
  console.log(`[Diagnostic] AppContent Render: tasks.length = ${tasks.length}, isLoading = ${isLoading}`);

  // Fetch tasks periodically from the server using React Query when online
  const { data: serverTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: api.getTasks,
    enabled: isOnline,
    refetchInterval: 10000, // Poll every 10 seconds to sync changes from other clients
  });
  
  // Reconcile server tasks with local SQLite database
  useEffect(() => {
    if (serverTasks && isOnline) {
      const reconcile = async () => {
        try {
          let hasChanged = false;
          
          // Get tasks currently pending in the sync queue
          const pendingQueue = await getUnsyncedQueueItems();
          const pendingIds = new Set(pendingQueue.map(q => q.task_id));

          // 1. Sync tasks from server -> local SQLite
          for (const serverTask of serverTasks) {
            if (pendingIds.has(serverTask.id)) {
              // Skip overwriting local tasks with pending edits
              continue;
            }

            const localTask = await getLocalTask(serverTask.id);
            if (!localTask) {
              await saveLocalTask(serverTask);
              hasChanged = true;
            } else {
              const localTime = new Date(localTask.updated_at).getTime();
              const serverTime = new Date(serverTask.updated_at).getTime();
              
              if (serverTime > localTime) {
                // Server has a newer version, overwrite SQLite
                await saveLocalTask(serverTask);
                hasChanged = true;
              }
            }
          }

          // 2. Remove local tasks that have been deleted on the server
          const serverIds = new Set(serverTasks.map(t => t.id));
          const localTasks = await getLocalTasks();
          
          for (const localTask of localTasks) {
            if (!serverIds.has(localTask.id) && !pendingIds.has(localTask.id)) {
              // Task deleted on server, remove locally
              await deleteLocalTask(localTask.id);
              hasChanged = true;
            }
          }

          if (hasChanged) {
            log('Reconciled backend updates with local cache.', 'info');
            await refreshTasks();
          }
        } catch (error: any) {
          log(`Reconciliation warning: ${error.message || error}`, 'warn');
        }
      };

      reconcile();
    }
  }, [serverTasks, isOnline, refreshTasks, log]);

  // Trigger sync queue drain whenever connection status switches to online
  useEffect(() => {
    if (isOnline) {
      drainQueue();
    }
  }, [isOnline, drainQueue]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-gray-50/50">
      <StatusBar barStyle="dark-content" />
      
      {/* Global Connection Banner */}
      <GlobalBanner />

      {/* Main Header */}
      <View className="px-6 pt-5 pb-4 flex-row items-center justify-between border-b border-gray-100 bg-white">
        <View>
          <Text className="text-2xl font-bold text-gray-800 tracking-tight">Antigravity Tasks</Text>
          <Text className="text-xs text-gray-500 font-semibold mt-0.5">
            {isOnline ? 'Online Sync Mode' : 'Offline Mode'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddModalOpen(true)}
          activeOpacity={0.85}
          className="w-11 h-11 bg-indigo-600 rounded-full items-center justify-center shadow-md shadow-indigo-200"
        >
          <Feather name="plus" size={22} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Task List container */}
      <View style={{ flex: 1 }} className="px-6 pt-4">
        {isLoading ? (
          <View style={{ flex: 1 }} className="items-center justify-center">
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text className="text-xs text-gray-500 font-semibold mt-3">Loading local store...</Text>
          </View>
        ) : tasks.length === 0 ? (
          /* Empty State */
          <View style={{ flex: 1 }} className="items-center justify-center py-10">
            <View className="w-20 h-20 bg-indigo-50 rounded-full items-center justify-center mb-5">
              <Feather name="check-circle" size={36} color="#4f46e5" />
            </View>
            <Text className="text-lg font-bold text-gray-700">No tasks yet</Text>
            <Text className="text-sm text-gray-500 text-center max-w-[240px] mt-1 leading-relaxed">
              Create a task and they will synchronize automatically across all devices.
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              activeOpacity={0.8}
              className="mt-6 bg-indigo-50 border border-indigo-100 px-5 py-3 rounded-2xl flex-row items-center"
            >
              <Feather name="plus" size={16} color="#4f46e5" strokeWidth={2.5} />
              <Text className="text-indigo-600 text-sm font-bold ml-1.5">Add Your First Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* List rendering */
          <FlatList
            data={tasks}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TaskCard
                task={item}
                syncStatus={getTaskSyncStatus(item.id)}
                onToggle={() => toggleTaskCompletion(item.id)}
                onEdit={() => setEditingTask(item)}
                onDelete={() => deleteTask(item.id)}
              />
            )}
          />
        )}
      </View>

      {/* Modals & Dashboard Panel */}
      <AddTaskModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={createTask}
      />

      <EditTaskModal
        visible={editingTask !== null}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSave={updateTask}
      />

      {/* Sync Queue Logs Bottom Drawer */}
      <DebugLogsPanel />
    </SafeAreaView>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  // Initialize SQLite database on startup
  useEffect(() => {
    getDb()
      .then(() => setDbReady(true))
      .catch(err => console.error('Failed to initialize database:', err));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SyncProvider>
        <TasksProvider>
          <AppContent />
        </TasksProvider>
      </SyncProvider>
    </QueryClientProvider>
  );
}
