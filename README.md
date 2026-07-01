# Cross-Platform Task Management System (Phase 1 + Phase 2)

A production-ready, offline-first task management application consisting of a Node.js/Express TypeScript backend connected to Supabase (Postgres) and a React Native (Expo) mobile client with local persistence (SQLite), network monitoring, optimistic updates, and Last-Write-Wins (LWW) conflict resolution.

---

## 📂 Repository Structure

- [**`backend/`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/backend) — Express REST API with input validation, Supabase client integration, and SQL schema migrations.
- [**`mobile/`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/mobile) — React Native Expo application with local SQLite caching, isolated state contexts, and background sync manager.

---

## ⚡ Quick Start

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables. Copy the example file and modify it:
   ```bash
   cp .env.example .env
   ```
   *Note: If no Supabase credentials are provided, the backend starts in **Local Demo Mode** (in-memory database fallback) automatically, allowing instant local testing.*
4. Run the SQL migration in your Supabase SQL editor:
   - Copy the schema from [**`backend/supabase/migrations/0001_create_tasks_table.sql`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/backend/supabase/migrations/0001_create_tasks_table.sql) to set up the `tasks` table, Row Level Security (RLS) policies, and the `updated_at` auto-update triggers.
5. Spin up the server:
   ```bash
   npm run dev
   ```
   The backend will start listening on `http://localhost:3000`.

### 2. Mobile Setup
1. Open a terminal and navigate to the mobile folder:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables. Copy the example file:
   ```bash
   cp .env.example .env
   ```
   *Note: If running the Expo client on a physical mobile device or external emulator, replace `localhost` in `.env` with your computer's local IP address (e.g. `http://192.168.1.50:3000`).*
4. Run the Expo project:
   ```bash
   npm run ios     # Run on iOS Simulator
   # or
   npm run android # Run on Android Emulator
   # or
   npm run start   # Open Expo Developer Tools CLI (scan QR code)
   ```

---

## 🛠️ Architecture & Core Modules

### 1. SQLite Data Store
Local caching and sync queue management are handled in [**`mobile/src/db/sqlite.ts`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/mobile/src/db/sqlite.ts). This module configures a WAL SQLite database `tasks.db` on startup and exports functions to read/write tasks and interact with the local `sync_queue` table.

### 2. State Isolation Contexts
We utilize two isolated React Context instances to optimize performance:
- [**`mobile/src/context/TasksContext.tsx`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/mobile/src/context/TasksContext.tsx) — Manages the list of tasks shown in the UI. It dispatches immediate `ADD_TASK_OPTIMISTIC`, `UPDATE_TASK_OPTIMISTIC`, and `DELETE_TASK_OPTIMISTIC` operations, avoiding any loading indicators.
- [**`mobile/src/context/SyncContext.tsx`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/mobile/src/context/SyncContext.tsx) — Tracks online/offline connection state, pending queue counts, task sync badges (`synced` / `pending` / `conflict_resolved`), and maintains an interactive log drawer.

### 3. Synchronization & Conflict Engine
The sync mechanics are implemented in [**`mobile/src/hooks/useSyncQueue.ts`**](file:///Users/souryagupta/Desktop/cross-platform-task/Cross-Platform-Task/mobile/src/hooks/useSyncQueue.ts):
- It subscribes to network updates via NetInfo.
- Upon reconnection, it acquires an execution lock and drains the SQLite `sync_queue` in chronological order.
- Updates are evaluated against the server's current timestamp.
  - **Server version is newer**: Local task is overwritten with server state, the local pending queue item is discarded, and the UI status turns to `Conflict Resolved`.
  - **Local version is newer**: Local updates are pushed to the server via a `PATCH` request, and the status changes to `Synced`.
- If an API request fails mid-drain, the sync pauses and the item remains in the queue, safeguarding against any data loss.

---

## 📈 Conflict Resolution Strategy

We chose **Last-Write-Wins (LWW)** based on an `updated_at` ISO timestamp.

### Why LWW?
1. **Developer & Runtime Simplicity**: LWW requires no heavy client/server sync libraries (like CRDTs) or complex UI merge overlays, making it fast and lightweight for a mobile task system.
2. **Deterministic Behavior**: Comparing milliseconds ensures there is always a clear "winner" without requiring manual human resolution.
3. **Task-Specific Alignment**: Tasks are highly individual records (usually updated by a single assignee). Multi-user concurrent edits on the exact same field are rare, making the trade-off of discarding one update acceptable.

### Alternatives and Trade-offs
- **CRDTs (Conflict-free Replicated Data Types)**: Highly robust for collaborative tools (like Google Docs) but introduce enormous payload overhead, code complexity, and battery drain.
- **Manual Merge UI**: Requires building complex dialogs showing line-by-line differences, which hampers mobile usability and blocks the user experience.
- **LWW Trade-off**: If User A edits a description offline, and User B edits the title online shortly after, when User A reconnects, User B's change might overwrite User A's edit entirely (or vice versa), causing silent data loss of one party's edit.

---

## 💡 Assumptions & Limitations
- **Single Tenant / Minimal Auth**: RLS is configured in demo mode allowing open public access. In a production build, Supabase JWT/Auth user-IDs should be mapped to tasks.
- **Client Clock Trust**: LWW relies on the device's clock. If a client's device clock is manually set to the future, their writes will permanently win until the server's time catches up.

---

## 🚀 Future Improvements (With More Time)
1. **Clocks Synchronization**: Implement NTP (Network Time Protocol) client-side clock offset calculation to resolve client clock skew issues.
2. **Patch Merging**: Rather than overwriting the entire task object on conflict, compare individual field updates so that User A changing the title and User B changing the due date can be merged together automatically.
3. **Queue Pruning & Compaction**: Compact the SQLite queue before syncing (e.g., if a task is created and then deleted offline, remove both operations from the queue to prevent unnecessary server requests).
