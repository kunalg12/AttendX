import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';

const OtpInput = ({ length = 6, value = '', onChange }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = Array(length)
      .fill()
      .map((_, i) => inputRefs.current[i] || React.createRef());
  }, [length]);

  useEffect(() => {
    // Update OTP from value prop
    if (value) {
      const otpArray = value.split('').slice(0, length);
      while (otpArray.length < length) otpArray.push('');
      setOtp(otpArray);
    }
  }, [value, length]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Combine OTP and call onChange
    const otpValue = newOtp.join('');
    onChange(otpValue);

    // Auto focus next input if we have a value
    if (text && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // On backspace, clear current field and focus previous
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
      
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      
      // Combine OTP and call onChange
      const otpValue = newOtp.join('');
      onChange(otpValue);
    }
  };

  const handlePaste = (text) => {
    // Handle paste only for the first input
    if (text && text.length > 1) {
      const pastedText = text.slice(0, length).split('');
      const newOtp = [...otp];
      
      pastedText.forEach((char, idx) => {
        newOtp[idx] = char;
      });
      
      setOtp(newOtp);
      
      // Combine OTP and call onChange
      const otpValue = newOtp.join('');
      onChange(otpValue);
      
      // Focus the last input
      const lastFilledIndex = Math.min(pastedText.length - 1, length - 1);
      if (lastFilledIndex < length - 1) {
        inputRefs.current[lastFilledIndex + 1].focus();
      } else {
        Keyboard.dismiss();
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array(length)
        .fill()
        .map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.input}
            maxLength={1}
            keyboardType="number-pad"
            value={otp[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            selectTextOnFocus
          />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  input: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    backgroundColor: '#fff',
  },
});

export default OtpInput;