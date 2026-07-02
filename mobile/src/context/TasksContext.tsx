import React, { createContext, useReducer, useEffect, useContext, ReactNode } from 'react';
import { Task } from '../types';
import { getLocalTasks } from '../db/sqlite';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
}

type TasksAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK_OPTIMISTIC'; payload: Task }
  | { type: 'UPDATE_TASK_OPTIMISTIC'; payload: Task }
  | { type: 'DELETE_TASK_OPTIMISTIC'; payload: string }
  | { type: 'SYNC_SUCCESS'; payload: Task }
  | { type: 'SYNC_CONFLICT_RESOLVED'; payload: Task };

const initialState: TasksState = {
  tasks: [],
  isLoading: true,
};

function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, isLoading: false };
    case 'ADD_TASK_OPTIMISTIC':
      // Optimistically add to top of the list
      return {
        ...state,
        tasks: [action.payload, ...state.tasks.filter(t => t.id !== action.payload.id)],
      };
    case 'UPDATE_TASK_OPTIMISTIC':
    case 'SYNC_SUCCESS':
    case 'SYNC_CONFLICT_RESOLVED':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
      };
    case 'DELETE_TASK_OPTIMISTIC':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    default:
      return state;
  }
}

interface TasksContextType {
  state: TasksState;
  dispatch: React.Dispatch<TasksAction>;
  refreshTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  const refreshTasks = async () => {
    try {
      const localTasks = await getLocalTasks();
      dispatch({ type: 'SET_TASKS', payload: localTasks });
    } catch (error) {
      console.error('Failed to load local tasks on startup:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load from SQLite on mount
  useEffect(() => {
    refreshTasks();
  }, []);

  return (
    <TasksContext.Provider value={{ state, dispatch, refreshTasks }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasksContext() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasksContext must be used within a TasksProvider');
  }
  return context;
}
