import { format, parseISO } from 'date-fns';

/**
 * Format a date to a readable string
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date
 */
export const formatDate = (dateString) => {
  const date = parseISO(dateString);
  return format(date, 'MMMM d, yyyy'); // Example format
};

/**
 * Get the current date
 * @returns {Date} The current date
 */
export const getCurrentDate = () => {
  return new Date();
};