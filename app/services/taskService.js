import { supabase } from '../config/supabase';

export const createTask = async (task) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();
  return { data, error };
};

export const updateTask = async (taskId, updates) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  return { data, error };
};

export const deleteTask = async (taskId) => {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  return { data, error };
};

export const fetchTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*');
  return { data, error };
};