import React, { useContext, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import AttendanceContext from '../../store/AttendanceContext';
import AttendanceCard from '../../components/attendance/AttendanceCard';

const ManageAttendanceScreen = () => {
  const { attendanceRecords, refreshAttendance } = useContext(AttendanceContext);

  useEffect(() => {
    refreshAttendance();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Attendance</Text>
      <FlatList
        data={attendanceRecords}
        renderItem={({ item }) => <AttendanceCard attendance={item} />}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
});

export default ManageAttendanceScreen;