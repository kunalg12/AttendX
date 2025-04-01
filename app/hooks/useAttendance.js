import { useContext } from 'react';
import AttendanceContext from '../store/AttendanceContext';

export const useAttendance = () => {
  const { attendance, markAttendance } = useContext(AttendanceContext);

  return {
    attendance,
    markAttendance,
  };
};