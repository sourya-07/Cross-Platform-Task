import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { SyncLog, SyncStatus } from '../types';

interface SyncState {
  isOnline: boolean;
  syncStatus: Record<string, SyncStatus>;
  logs: SyncLog[];
  pendingCount: number;
}

type SyncAction =
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_TASK_SYNC_STATUS'; payload: { id: string; status: SyncStatus } }
  | { type: 'SET_ALL_SYNC_STATUS'; payload: Record<string, SyncStatus> }
  | { type: 'ADD_SYNC_LOG'; payload: { message: string; type: SyncLog['type'] } }
  | { type: 'CLEAR_SYNC_LOGS' }
  | { type: 'SET_PENDING_COUNT'; payload: number };

const initialState: SyncState = {
  isOnline: false,
  syncStatus: {},
  logs: [
    {
      id: 'init',
      timestamp: new Date().toLocaleTimeString(),
      message: 'Sync system initialized.',
      type: 'info',
    },
  ],
  pendingCount: 0,
};

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case 'SET_ONLINE':
      if (state.isOnline === action.payload) {
        return state;
      }
      const connectionLog: SyncLog = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: action.payload ? 'Network is connected. Device online.' : 'Network disconnected. Device offline.',
        type: action.payload ? 'success' : 'warn',
      };
      return {
        ...state,
        isOnline: action.payload,
        logs: [connectionLog, ...state.logs].slice(0, 50), // keep last 50 logs
      };
    case 'SET_TASK_SYNC_STATUS':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          [action.payload.id]: action.payload.status,
        },
      };
    case 'SET_ALL_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.payload,
      };
    case 'ADD_SYNC_LOG':
      const newLog: SyncLog = {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: action.payload.message,
        type: action.payload.type,
      };
      return {
        ...state,
        logs: [newLog, ...state.logs].slice(0, 50),
      };
    case 'CLEAR_SYNC_LOGS':
      return {
        ...state,
        logs: [],
      };
    case 'SET_PENDING_COUNT':
      return {
        ...state,
        pendingCount: action.payload,
      };
    default:
      return state;
  }
}

interface SyncContextType {
  state: SyncState;
  dispatch: React.Dispatch<SyncAction>;
  log: (message: string, type?: SyncLog['type']) => void;
  setTaskStatus: (id: string, status: SyncStatus) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(syncReducer, initialState);

  const log = (message: string, type: SyncLog['type'] = 'info') => {
    dispatch({ type: 'ADD_SYNC_LOG', payload: { message, type } });
    console.log(`[SyncEngine] [${type.toUpperCase()}] ${message}`);
  };

  const setTaskStatus = (id: string, status: SyncStatus) => {
    dispatch({ type: 'SET_TASK_SYNC_STATUS', payload: { id, status } });
  };

  return (
    <SyncContext.Provider value={{ state, dispatch, log, setTaskStatus }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}
