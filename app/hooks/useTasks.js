import { useContext } from 'react';
import TaskContext from '../store/TaskContext';

export const useTasks = () => {
  const { tasks, refreshTasks } = useContext(TaskContext);

  return {
    tasks,
    refreshTasks,
  };
};