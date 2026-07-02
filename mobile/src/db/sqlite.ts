import * as SQLite from 'expo-sqlite';
import { Task, SyncQueueItem, SyncOperationType } from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

// Initialize SQLite database
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('tasks.db');
  
  // Set journal mode and create tables
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_completed INTEGER DEFAULT 0,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL,
      task_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      local_timestamp TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);
  
  return dbInstance;
}

// Convert SQLite row to Task object
function mapRowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    is_completed: Boolean(row.is_completed),
    due_date: row.due_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Fetch all local tasks
export async function getLocalTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM tasks ORDER BY created_at DESC');
  return rows.map(mapRowToTask);
}

// Fetch a single local task by ID
export async function getLocalTask(id: string): Promise<Task | null> {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? mapRowToTask(row) : null;
}

// Save or overwrite a task locally
export async function saveLocalTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO tasks (id, title, description, is_completed, due_date, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.description,
      task.is_completed ? 1 : 0,
      task.due_date,
      task.created_at,
      task.updated_at,
    ]
  );
}

// Delete a task locally
export async function deleteLocalTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

// Clear all local tasks (for sync refresh/resets)
export async function clearLocalTasks(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks');
}

// Add an item to the synchronization queue
export async function enqueueSyncOperation(
  operation: SyncOperationType,
  taskId: string,
  payload: any
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sync_queue (operation_type, task_id, payload, local_timestamp, synced) 
     VALUES (?, ?, ?, ?, 0)`,
    [operation, taskId, JSON.stringify(payload), new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

// Fetch all unsynced queue items in order
export async function getUnsyncedQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id ASC');
  return rows.map((row: any) => ({
    id: row.id,
    operation_type: row.operation_type as SyncOperationType,
    task_id: row.task_id,
    payload: row.payload,
    local_timestamp: row.local_timestamp,
    synced: row.synced,
  }));
}

// Mark a queue item as successfully synced (synced = 1)
export async function markQueueItemSynced(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [id]);
}

// Remove an item from the queue (alternative: used when discarding conflicting mutations)
export async function deleteQueueItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

// Prune synced items (optional utility to avoid ballooning sync_queue table)
export async function pruneSyncedQueue(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE synced = 1');
}
