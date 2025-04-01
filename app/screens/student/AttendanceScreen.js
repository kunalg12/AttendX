import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../../store/AuthContext';
import AttendanceContext from '../../store/AttendanceContext';
import AttendanceCard from '../../components/attendance/AttendanceCard';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import { formatDate } from '../../utils/dateUtils';

const AttendanceScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const {
    attendanceRecords,
    activeSession,
    loading,
    checkOut,
    refreshAttendance,
  } = useContext(AttendanceContext);
  const [refreshing, setRefreshing] = useState(false);

  // Filter recent records (last 7 days)
  const recentRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.check_in_time);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recordDate >= weekAgo;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAttendance();
    setRefreshing(false);
  };

  const handleCheckOut = async () => {
    Alert.alert(
      'Check Out',
      'Are you sure you want to check out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Check Out',
          onPress: async () => {
            const { error } = await checkOut();
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Success', 'You have checked out successfully');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading && !refreshing) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
      </View>

      {activeSession ? (
        <View style={styles.activeSessionContainer}>
          <View style={styles.activeSession}>
            <Ionicons name="time" size={24} color="#2ecc71" style={styles.activeIcon} />
            <View style={styles.activeInfo}>
              <Text style={styles.activeTitle}>Active Session</Text>
              <Text style={styles.activeTime}>
                Since: {formatDate(activeSession.check_in_time)}
              </Text>
            </View>
          </View>
          <Button
            title="Check Out"
            onPress={handleCheckOut}
            style={styles.checkOutButton}
          />
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('OTPAttendance')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#3498db' }]}>
              <Ionicons name="keypad" size={24} color="#fff" />
            </View>
            <Text style={styles.optionTitle}>OTP Attendance</Text>
            <Text style={styles.optionDesc}>Enter OTP code to mark attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => navigation.navigate('GPSAttendance')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#2ecc71' }]}>
              <Ionicons name="location" size={24} color="#fff" />
            </View>
            <Text style={styles.optionTitle}>GPS Attendance</Text>
            <Text style={styles.optionDesc}>Use your location to check in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => Alert.alert('Coming Soon', 'This feature will be available soon')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#9b59b6' }]}>
              <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <Text style={styles.optionTitle}>Manual Attendance</Text>
            <Text style={styles.optionDesc}>Manually mark your attendance</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AttendanceHistory')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No recent attendance records</Text>
          </View>
        ) : (
          <FlatList
            data={recentRecords}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <AttendanceCard record={item} />}
            contentContainerStyle={styles.recordsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  activeSessionContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  }
})

export default AttendanceScreen;