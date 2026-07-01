import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { createTaskSchema, updateTaskSchema } from '../validators/task';
import { ZodError } from 'zod';

const router = Router();

// Helper to format validation errors
const formatZodError = (error: ZodError) => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

/**
 * GET /tasks - Fetch all tasks
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return res.status(500).json({
      error: 'Failed to retrieve tasks from the database.',
      details: error.message,
    });
  }
});

/**
 * GET /tasks/:id - Fetch single task by ID (critical for conflict verification)
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: `Task with ID ${id} not found.` });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error(`Error fetching task ${id}:`, error);
    return res.status(500).json({
      error: 'Failed to retrieve task from database.',
      details: error.message,
    });
  }
});

/**
 * POST /tasks - Create a task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createTaskSchema.parse(req.body);

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          ...(validatedData.id && { id: validatedData.id }),
          title: validatedData.title,
          description: validatedData.description || null,
          is_completed: validatedData.is_completed,
          due_date: validatedData.due_date || null,
          created_at: validatedData.created_at || new Date().toISOString(),
          updated_at: validatedData.updated_at || new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json(data);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: formatZodError(error),
      });
    }

    console.error('Error creating task:', error);
    return res.status(500).json({
      error: 'Failed to create task.',
      details: error.message,
    });
  }
});

/**
 * PATCH /tasks/:id - Update a task
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const validatedData = updateTaskSchema.parse(req.body);

    // Perform the update
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...(validatedData.title !== undefined && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.is_completed !== undefined && { is_completed: validatedData.is_completed }),
        ...(validatedData.due_date !== undefined && { due_date: validatedData.due_date }),
        updated_at: validatedData.updated_at, // Use client's updated_at (crucial for LWW state alignment)
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: `Task with ID ${id} not found or was deleted.` });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: formatZodError(error),
      });
    }

    console.error(`Error updating task ${id}:`, error);
    return res.status(500).json({
      error: 'Failed to update task.',
      details: error.message,
    });
  }
});

/**
 * DELETE /tasks/:id - Delete a task
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error, count } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      message: `Task with ID ${id} successfully deleted.`,
    });
  } catch (error: any) {
    console.error(`Error deleting task ${id}:`, error);
    return res.status(500).json({
      error: 'Failed to delete task.',
      details: error.message,
    });
  }
});

export default router;
