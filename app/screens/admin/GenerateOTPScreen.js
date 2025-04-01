// AttendanceX/app/screens/admin/GenerateOTPScreen.js
import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { generateOTP } from '@/app/utils/otpUtils'; // Assuming you have a utility function for OTP generation

const GenerateOTPScreen = () => {
  const [otp, setOtp] = useState('');

  const handleGenerateOTP = () => {
    const newOtp = generateOTP(); // Generate a new OTP
    setOtp(newOtp);
    Alert.alert('OTP Generated', `Your OTP is: ${newOtp}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generate OTP</Text>
      <Button title="Generate OTP" onPress={handleGenerateOTP} />
      {otp ? <Text style={styles.otpText}>Generated OTP: {otp}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  otpText: {
    marginTop: 20,
    fontSize: 18,
    color: 'blue',
  },
});

export default GenerateOTPScreen;