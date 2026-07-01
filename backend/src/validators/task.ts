import { z } from 'zod';

export const createTaskSchema = z.object({
  id: z.string().uuid({ message: 'Task ID must be a valid UUID' }).optional(),
  title: z.string().trim().min(1, { message: 'Title is required and cannot be empty' }),
  description: z.string().nullable().optional(),
  is_completed: z.boolean().default(false),
  due_date: z.string().datetime({ message: 'due_date must be a valid ISO 8601 date string' }).nullable().optional(),
  created_at: z.string().datetime({ message: 'created_at must be a valid ISO 8601 date string' }).optional(),
  updated_at: z.string().datetime({ message: 'updated_at must be a valid ISO 8601 date string' }).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, { message: 'Title cannot be empty' }).optional(),
  description: z.string().nullable().optional(),
  is_completed: z.boolean().optional(),
  due_date: z.string().datetime({ message: 'due_date must be a valid ISO 8601 date string' }).nullable().optional(),
  updated_at: z.string().datetime({ message: 'updated_at must be a valid ISO 8601 date string' }).optional(),
});

