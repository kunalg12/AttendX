/**
 * Validate email format
 * @param {string} email - The email address to validate
 * @returns {boolean} Whether the email format is valid
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validate password strength
   * @param {string} password - The password to validate
   * @returns {boolean} Whether the password is strong
   */
  export const validatePassword = (password) => {
    // Password must be at least 8 characters long and contain a number
    return password.length >= 8 && /\d/.test(password);
  };
  
  /**
   * Validate required fields
   * @param {object} fields - An object containing field names and values
   * @returns {boolean} Whether all required fields are filled
   */
  export const validateRequiredFields = (fields) => {
    return Object.values(fields).every((value) => value.trim() !== '');
  };