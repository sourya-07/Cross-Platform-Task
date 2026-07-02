export interface Task {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncOperationType = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: number;
  operation_type: SyncOperationType;
  task_id: string;
  payload: string; // JSON string representing Task or partial updates
  local_timestamp: string;
  synced: number; // 0 = pending, 1 = synced
}

export interface SyncLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'conflict';
}

export type SyncStatus = 'synced' | 'pending' | 'conflict_resolved';
