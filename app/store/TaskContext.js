import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../config/supabase';
import AuthContext from './AuthContext';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

export const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const { user, userRole } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load tasks and submissions when user is authenticated
  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchSubmissions();
      
      // Set up real-time subscription for tasks
      const tasksSubscription = supabase
        .channel('tasks_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'tasks' 
          }, 
          (payload) => {
            fetchTasks();
          }
        )
        .subscribe();
        
      // Set up real-time subscription for submissions
      const submissionsSubscription = supabase
        .channel('submissions_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'submissions' 
          }, 
          (payload) => {
            fetchSubmissions();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(tasksSubscription);
        supabase.removeChannel(submissionsSubscription);
      };
    }
  }, [user, userRole]);

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tasks')
        .select('*, profiles(full_name)');
        
      if (userRole === 'student') {
        // Filter tasks by class/group the student belongs to
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('user_id', user.id);
          
        if (enrollments && enrollments.length > 0) {
          const classIds = enrollments.map(e => e.class_id);
          query = query.in('class_id', classIds);
        }
      }
      
      // Sort by due date
      query = query.order('due_date', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch submissions
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('submissions')
        .select('*, profiles(full_name), tasks(title)');
        
      if (userRole === 'student') {
        // Students can only see their own submissions
        query = query.eq('user_id', user.id);
      }
      
      // Sort by submission date descending
      query = query.order('submitted_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new task (admin/teacher only)
  const createTask = async (taskData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            ...taskData,
            created_by: user.id,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Update task (admin/teacher only)
  const updateTask = async (taskId, updates) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Delete task (admin/teacher only)
  const deleteTask = async (taskId) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
        
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Pick and upload file
  const pickAndUploadFile = async () => {
    try {
      // Pick a document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return { data: null, error: null };
      }
      
      const file = result.assets[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `submissions/${fileName}`;
      
      // Read the file as base64
      const base64File = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('assignments')
        .upload(filePath, decode(base64File), {
          contentType: file.mimeType,
        });
        
      if (error) throw error;
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);
        
      return {
        data: {
          path: filePath,
          url: publicUrlData.publicUrl,
          name: file.name,
          type: file.mimeType,
          size: file.size,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error uploading file:', error.message);
      return { data: null, error };
    }
  };

  // Helper function to decode base64
  const decode = (base64) => {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  };

  // Submit assignment
  const submitAssignment = async (taskId, fileData, notes) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('submissions')
        .insert([
          {
            task_id: taskId,
            user_id: user.id,
            file_path: fileData.path,
            file_url: fileData.url,
            file_name: fileData.name,
            file_type: fileData.type,
            file_size: fileData.size,
            notes,
            submitted_at: new Date(),
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      fetchSubmissions();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Grade submission (admin/teacher only)
  const gradeSubmission = async (submissionId, grade, feedback) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('submissions')
        .update({
          grade,
          feedback,
          graded_by: user.id,
          graded_at: new Date(),
        })
        .eq('id', submissionId)
        .select()
        .single();
        
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        submissions,
        loading,
        createTask,
        updateTask,
        deleteTask,
        pickAndUploadFile,
        submitAssignment,
        gradeSubmission,
        refreshTasks: fetchTasks,
        refreshSubmissions: fetchSubmissions,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext;