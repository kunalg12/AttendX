/**
 * Generates a random numeric OTP code of specified length
 * @param {number} length - The length of the OTP to generate
 * @returns {string} The generated OTP code
 */
export const generateRandomCode = (length = 6) => {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  };
  
  /**
   * Check if an OTP code is valid
   * @param {string} code - The OTP code to validate
   * @param {object} validOtp - The valid OTP object with expiry time
   * @returns {boolean} Whether the OTP is valid
   */
  export const isValidOtp = (code, validOtp) => {
    if (!validOtp || !code) return false;
    
    // Check if OTP matches
    if (code !== validOtp.code) return false;
    
    // Check if OTP has expired
    const now = new Date();
    const expiryTime = new Date(validOtp.expires_at);
    
    return now < expiryTime;
  };
  
  /**
   * Calculate time remaining for OTP expiry
   * @param {Date} expiryTime - The expiry time for the OTP
   * @returns {Object} Object containing minutes and seconds remaining
   */
  export const getOtpTimeRemaining = (expiryTime) => {
    if (!expiryTime) return { minutes: 0, seconds: 0 };
    
    const now = new Date();
    const expiry = new Date(expiryTime);
    
    // Calculate difference in milliseconds
    const diffMs = expiry - now;
    
    if (diffMs <= 0) return { minutes: 0, seconds: 0 };
    
    // Convert to minutes and seconds
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return { minutes, seconds };
  };