# System Architecture: Offline Sync & Conflict Resolution

This document describes the architectural flow, component relationships, and data synchronization engine of the Cross-Platform Task System.

---

## 🔄 End-to-End Synchronization Lifecycle

The system utilizes an offline-first architectural pattern: SQLite acts as the immediate write-store, and a background processor synchronizes changes to the Supabase database.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Interface
    participant DB as SQLite (tasks.db)
    participant Q as SQLite (sync_queue)
    participant Engine as Sync Engine (useSyncQueue)
    participant API as Express API (Backend)
    participant Cloud as Supabase Postgres

    Note over User, DB: Device is Offline
    User->>DB: Perform Action (Create/Update/Delete)
    Note over DB: Write is applied immediately
    DB-->>User: Update UI state (Optimistic)
    User->>Q: Enqueue Mutation (synced = 0)
    Note over User, Q: Task status badge = "Pending Sync"

    Note over User, Engine: Device goes Online (NetInfo)
    Engine->>Q: Fetch pending items ordered by ID
    
    loop For each pending item in order
        Engine->>API: GET /tasks/:id (Fetch Server Task)
        API->>Cloud: Query Postgres
        Cloud-->>API: Return task or 404
        API-->>Engine: Server state
        
        alt Conflict Check: Server updated_at > Local updated_at
            Note over Engine: Server Wins
            Engine->>DB: Overwrite local task with server version
            Engine->>Q: Discard queue item (synced = 1)
            Engine-->>User: Dispatch SYNC_CONFLICT_RESOLVED
            Note over User: Task status badge = "Resolved"
        else Conflict Check: Local updated_at >= Server updated_at (or Server 404)
            Note over Engine: Local Wins
            Engine->>API: PATCH /tasks/:id (Send local changes)
            API->>Cloud: Update Postgres
            Cloud-->>API: Return updated task
            API-->>Engine: Success Response
            Engine->>Q: Mark queue item synced (synced = 1)
            Engine-->>User: Dispatch SYNC_SUCCESS
            Note over User: Task status badge = "Synced"
        end
    end
    
    Engine->>DB: Query final consolidated task list
    DB-->>Engine: Tasks list
    Engine-->>User: Update state & Refresh view
```

### Flow Step-by-Step

1. **Local Writes (Offline)**: When the user interacts with the app (e.g. toggles completion), the operation is applied immediately to the local SQLite database. The state reducer is immediately updated (`TasksContext`), resulting in instantaneous UI changes without showing any loading indicators.
2. **Queuing**: Simultaneously, a sync entry is pushed to the SQLite `sync_queue` table containing the action type (`create`, `update`, `delete`), the task ID, and the JSON payload representing the changes. The task's status in `SyncContext` is updated to `pending`.
3. **Reconnection**: The `useNetwork` hook monitors device connectivity. The moment connection is restored (or when a new write occurs while online), the `drainQueue` routine is triggered.
4. **Queue Drainage**: The Sync Engine locks itself, fetches all unsynced queue items sorted chronologically (`id ASC`), and processes them sequentially to preserve the order of user actions.
5. **Conflict Check**: For each item, the client fetches the server's task state (`GET /tasks/:id`).
   - If the server has a version with a newer `updated_at` timestamp, the server wins. The engine discards the local update and overwrites SQLite with the server's data.
   - Otherwise, the local version wins. The engine sends the update to the server (`PATCH /tasks/:id`) and updates SQLite with the server's confirmation.
6. **Persistence & Refresh**: Once the queue is fully drained, the tasks list in the Context is refreshed from SQLite, and the lock is released. If a network call fails, the transaction is aborted and remains in the queue for the next reconnect attempt.

---

## ⚖️ Conflict Resolution Strategy (Last-Write-Wins)

### Why Last-Write-Wins (LWW) was chosen
1. **Low Footprint**: Running queries on `expo-sqlite` and performing basic timestamp string comparisons requires no heavy dependencies or syncing frameworks, maintaining a lightweight app build.
2. **Deterministic**: Resolution is executed client-side based on timestamps, guaranteeing a single deterministic winner.
3. **Task Systems Context**: Task managers are rarely collaborative document editors; tasks are typically owned and updated by a single user. Complex merges are rarely necessary, making LWW the perfect pragmatic choice.

### Technical Trade-offs
- **Device Clock Dependence**: LWW relies on the client's local system time (`updated_at`). If a client's device clock is incorrect, their changes may either always win (if in the future) or always lose (if in the past).
- **Update Overwrites**: If two users modify different fields of the same task offline (e.g. User A updates the description, User B updates the due date), the final sync will discard one entire update, rather than merging the changes.

---

## 📌 Architectural Assumptions
- **Public Sandbox**: Suppabase Row Level Security (RLS) is enabled but configured with a basic policy allowing all operations. For a multi-user production build, tasks must link to an authenticated `user_id` and have RLS policies restrict operations to `auth.uid() = user_id`.
- **Single-device or Low Collaboration**: The database is structured assuming that conflicts are sporadic, rather than continuous.
