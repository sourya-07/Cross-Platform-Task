import axios from 'axios';
import { Task } from '../types';

// Expo automatically exposes environment variables prefixed with EXPO_PUBLIC_
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Fetch all tasks from the server
  getTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks');
    return response.data;
  },

  // Fetch a single task by ID (needed for checking server version in LWW conflict resolution)
  getTask: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  // Create a task on the server
  createTask: async (task: Task): Promise<Task> => {
    const response = await apiClient.post<Task>('/tasks', task);
    return response.data;
  },

  // Update a task on the server
  updateTask: async (id: string, updates: Partial<Task> & { updated_at: string }): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, updates);
    return response.data;
  },

  // Delete a task on the server
  deleteTask: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/${id}`);
    return response.data;
  },
};
