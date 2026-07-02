# 🎥 Loom Demo Video Transcript (4-Minute Walkthrough)

This document contains a structured, step-by-step script for recording a 4-minute demo video of the **Cross-Platform Task Management System**. It aligns visual actions with the speech transcript to demonstrate the app's features: optimistic UI updates, SQLite persistence, online/offline synchronization, and Last-Write-Wins (LWW) conflict resolution.

---

## ⏱️ Video Outline & Timestamps

* **0:00 - 0:35** | Introduction & Core Architecture
* **0:35 - 1:20** | Basic Operations & Online Sync
* **1:20 - 2:30** | Offline Mode, SQLite Queue & Optimistic UI
* **2:30 - 3:15** | Reconnection & Chronological Sync
* **3:15 - 3:45** | Conflict Resolution (Last-Write-Wins)
* **3:45 - 4:00** | Conclusion & Outro

---

## 🎙️ Script & Action Walkthrough

### Part 1: Introduction & Core Architecture (0:00 - 0:35)

* **[Visual Action]**
  Show the mobile emulator/device screen alongside the terminal where the Express backend server is running (`npm run dev`). Point with your cursor to the mobile screen, showing the header **"Antigravity Tasks"** and the green network banner at the top.
* **[Speech Transcript]**
  > "Hi everyone! Welcome to the demo of our Cross-Platform Task Management System. This is a production-ready, offline-first application designed for seamless task tracking.
  >
  > On the backend, we have a Node.js and Express server written in TypeScript, backed by Supabase Postgres. On the client side, we’re running a React Native Expo application using local SQLite for caching and queue management, NetInfo for network state tracking, and a custom Last-Write-Wins sync engine."

---

### Part 2: Basic Operations & Online Sync (0:35 - 1:20)

* **[Visual Action]**
  1. Click the blue circular `+` button in the top-right corner.
  2. In the "Add Task" modal, type:
     - Title: `Review Architecture Design`
     - Description: `Go through database schemas and conflict flows.`
  3. Select a due date and click **Add Task**.
  4. Point to the task card that appears instantly with a green **"Synced"** badge.
  5. Click the checkbox on the task card to complete it, showing the line-through styling.
* **[Speech Transcript]**
  > "Let's start by looking at basic operations while we are online. I’ll tap the plus button and create a new task: 'Review Architecture Design' with a description and a due date.
  >
  > Once added, the task is written instantly to our local SQLite database and immediately synchronized with our backend database. You can see the green status badge here showing **'Synced'**. 
  >
  > Toggling the completion checkmark updates the state locally and remotely. Under the hood, React Query helps us poll and keep the client state updated with the server's records."

---

### Part 3: Offline Mode & Optimistic UI (1:20 - 2:30)

* **[Visual Action]**
  1. Turn off your Wi-Fi, toggle Airplane Mode on your simulator, or shut down the backend server.
  2. Point out the top banner transitioning to yellow: **"Offline Mode. Changes will sync once connection is restored."**
  3. Click the `+` button and add a new task:
     - Title: `Write Documentation`
     - Description: `Complete the README and architecture overview.`
  4. Note how the task appears *immediately* without any loading spinner.
  5. Point to the amber **"Pending Sync"** badge on the task card.
  6. Tap the **"Sync & Conflict Logs"** panel at the bottom to slide it up. Point to the `1 pending` badge and the log entry showing the local mutation enqueued.
* **[Speech Transcript]**
  > "Now, let’s see what happens when the device loses its connection. I'll simulate going offline. Instantly, our global network hook detects the change, showing this yellow offline banner.
  >
  > While offline, I can still create new tasks. I’ll add 'Write Documentation'. Notice how the task is added instantly to our list. That's because of our optimistic UI updates. We write directly to SQLite and update the UI context without blocking the user.
  >
  > The task displays a yellow **'Pending Sync'** badge. If we slide open the Sync and Conflict logs panel at the bottom, we can see the SQLite sync queue tracks this pending change."

---

### Part 4: Reconnection & Chronological Sync (2:30 - 3:15)

* **[Visual Action]**
  1. Turn Wi-Fi/connection back on (or restart the backend server).
  2. Watch the top banner turn green and then fade away.
  3. Open the **"Sync & Conflict Logs"** bottom panel.
  4. Watch the logs update in real-time as the queue drains.
  5. Show the **"Pending Sync"** badge on "Write Documentation" transition to green **"Synced"**.
* **[Speech Transcript]**
  > "Let's turn the network connection back on. As soon as the device reconnects, the background Sync Engine triggers. 
  >
  > It locks the sync queue and drains the pending mutations in strict chronological order. Looking at the real-time logs panel, we can see it sent a PATCH request to our Express API. The server processed the task, and our local badge changed from 'Pending Sync' to **'Synced'**."

---

### Part 5: Conflict Resolution (Last-Write-Wins) (3:15 - 3:45)

* **[Visual Action]**
  1. Explain the LWW logic briefly.
  2. (Optional/Directly Explain): If explaining visually, mention that if a task is updated offline, but a newer version already exists on the server (which we check via `GET /tasks/:id` comparing the `updated_at` ISO timestamps), the server version wins.
  3. Point to the log in the drawer that displays **"Conflict resolved: server version is newer"** and the indigo status badge labeled **"Resolved"**.
* **[Speech Transcript]**
  > "A crucial feature of our system is our conflict resolution engine, which uses a Last-Write-Wins strategy based on updated timestamps. 
  >
  > When draining the queue, the engine fetches the server state for each task. If the server version has a newer timestamp than our local change, the server wins. The engine discards our local edit, overwrites SQLite with the server's state, and marks the task as **'Resolved'** with this indigo badge. If the client’s change is newer, the client wins, pushing the updates upstream. This ensures a deterministic state without complex CRDT overhead."

---

### Part 6: Conclusion & Outro (3:45 - 4:00)

* **[Visual Action]**
  Show the entire mobile screen with the clean task list. Close the logs panel and give a friendly wave or cursor gesture.
* **[Speech Transcript]**
  > "To wrap up, this offline-first architecture gives us a blazing-fast user experience with local SQLite storage, while maintaining full sync accuracy with Supabase in the cloud.
  >
  > Thanks for watching the demo, and feel free to check out the source code in the repository!"
