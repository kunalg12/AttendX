import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

const OTPAttendanceScreen = () => {
  const [otp, setOtp] = useState('');

  const handleVerifyOTP = () => {
    // Logic to verify the OTP
    Alert.alert('OTP Verified', `Entered OTP: ${otp}`);
    setOtp(''); // Clear the input after verification
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP for Attendance</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
      />
      <Button title="Verify OTP" onPress={handleVerifyOTP} />
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
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderColor: 'gray',
    borderWidth: 1,
    padding: 8,
    marginBottom: 16,
  },
});

export default OTPAttendanceScreen;