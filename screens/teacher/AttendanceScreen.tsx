import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    SafeAreaView,
    ActivityIndicator,
    Modal,
    TextInput,
    RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseConfig';
import { RealtimeChannel } from '@supabase/supabase-js';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { Linking } from 'react-native';

interface Class {
    id: number;
    name: string;
}

interface LocationPreview {
    latitude: number;
    longitude: number;
}

const TIMER_STORAGE_KEY = '@attendance_timer_settings';

function AttendanceScreen() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [attendanceCode, setAttendanceCode] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [codeLoading, setCodeLoading] = useState<boolean>(false);
    const [expiryMinutes, setExpiryMinutes] = useState<string>('15');
    const [expirySeconds, setExpirySeconds] = useState<number>(0);
    const [tempMinutes, setTempMinutes] = useState<string>('15');
    const [tempSeconds, setTempSeconds] = useState<string>('0');
    const [timeLeft, setTimeLeft] = useState<string>('00:00');
    const [showTimerModal, setShowTimerModal] = useState<boolean>(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const realtimeSubscription = useRef<RealtimeChannel | null>(null);
    const [locationPermission, setLocationPermission] = useState(false);
    const [showLocationPreview, setShowLocationPreview] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<LocationPreview | null>(null);

    // Load saved timer settings
    useEffect(() => {
        loadSavedTimerSettings();
        requestLocationPermission();
    }, []);

    const loadSavedTimerSettings = async () => {
        try {
            const savedSettings = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
            if (savedSettings) {
                const { minutes, seconds } = JSON.parse(savedSettings);
                setExpiryMinutes(minutes);
                setTempMinutes(minutes);
                setTempSeconds(seconds);
            }
        } catch (error) {
            console.error('Error loading timer settings:', error);
        }
    };

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === 'granted');
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 
                    'Location permission is required to generate attendance codes. Students will not be able to verify their location without this permission.');
            }
        } catch (error) {
            console.error('Error requesting location permission:', error);
        }
    };

    async function fetchClasses() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('teacher_id', user.id);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setClasses((data || []) as Class[]);
        }
        setLoading(false);
    }

    const setupRealtimeSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Cleanup existing subscription if any
        if (realtimeSubscription.current) {
            supabase.removeChannel(realtimeSubscription.current);
        }

        // Subscribe to changes in the classes table
        realtimeSubscription.current = supabase
            .channel('classes_channel')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'classes',
                    filter: `teacher_id=eq.${user.id}` // Only listen to changes for this teacher's classes
                },
                async (payload) => {
                    console.log('Received real-time update:', payload);
                    // Refresh the classes list
                    await fetchClasses();
                }
            )
            .subscribe();
    };

    // Handle pull-to-refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchClasses();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchClasses();
        setupRealtimeSubscription();

        // Cleanup subscription on unmount
        return () => {
            if (realtimeSubscription.current) {
                supabase.removeChannel(realtimeSubscription.current);
            }
        };
    }, []);

    // Cleanup effect for timer
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Separate useEffect for timer that doesn't cause a re-fetch of classes
    useEffect(() => {
        // Clear any existing timer first
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (expirySeconds > 0) {
            // Format time immediately to avoid layout shift
            formatTimeLeft(expirySeconds);
            
            // Create new timer
            timerRef.current = setInterval(() => {
                setExpirySeconds(prev => {
                    const newValue = prev - 1;
                    if (newValue <= 0) {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        return 0;
                    }
                    formatTimeLeft(newValue);
                    return newValue;
                });
            }, 1000);
        } else {
            setTimeLeft('00:00');
        }
    }, [expirySeconds]);

    // Helper function to format time left for display
    const formatTimeLeft = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    // Format the expiry duration for display
    const formatExpiryDuration = () => {
        const mins = parseInt(expiryMinutes, 10);
        const secs = parseInt(tempSeconds, 10) || 0;
        if (mins === 0) {
            return `${secs} second${secs !== 1 ? 's' : ''}`;
        } else if (mins === 1) {
            return secs === 0 ? '1 minute' : `1 minute ${secs} second${secs !== 1 ? 's' : ''}`;
        } else {
            return secs === 0 ? `${mins} minutes` : `${mins} minutes ${secs} second${secs !== 1 ? 's' : ''}`;
        }
    };

    const saveTimerSettings = async () => {
        const minutes = parseInt(tempMinutes, 10);
        const seconds = parseInt(tempSeconds, 10);
        
        if (isNaN(minutes) || minutes < 0 || isNaN(seconds) || seconds < 0 || seconds > 59) {
            Alert.alert('Invalid Input', 'Please enter valid minutes (≥ 0) and seconds (0-59)');
            return;
        }
        
        // Check if at least some time is set
        if (minutes === 0 && seconds === 0) {
            Alert.alert('Invalid Input', 'Please set at least 1 second');
            return;
        }

        try {
            // Save settings to AsyncStorage
            await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
                minutes: tempMinutes,
                seconds: tempSeconds
            }));

            setExpiryMinutes(tempMinutes);
            setTempSeconds(seconds.toString());
            setShowTimerModal(false);
        } catch (error) {
            console.error('Error saving timer settings:', error);
            Alert.alert('Error', 'Failed to save timer settings');
        }
    };

    async function handleGenerateCode() {
        if (!selectedClass) {
            Alert.alert('Error', 'Please select a class first');
            return;
        }
    
        if (!locationPermission) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Required', 
                    'Location permission is required to generate attendance codes.',
                    [
                        { text: 'Cancel' },
                        { text: 'Open Settings', onPress: () => Alert.alert('Open Settings', 'Please open your device settings and enable location permissions for this app.') }
                    ]
                );
                return;
            }
            setLocationPermission(true);
        }
    
        try {
            const enabled = await Location.hasServicesEnabledAsync();
            if (!enabled) {
                Alert.alert(
                    'Location Services Disabled',
                    'Please enable location services to generate attendance codes.',
                    [
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                return;
            }
    
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
    
            if (!location) {
                throw new Error('Could not determine your location. Please try again.');
            }

            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
            setShowLocationPreview(true);
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert('Error', 'Failed to get current location');
        }
    }

    const confirmAndGenerateCode = async () => {
        if (!currentLocation) return;
        
        setShowLocationPreview(false);
        setCodeLoading(true);
        
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
            const expiryTime = new Date();
            const minutes = parseInt(expiryMinutes, 10) || 0;
            const seconds = parseInt(tempSeconds, 10) || 0;
            expiryTime.setMinutes(expiryTime.getMinutes() + minutes);
            expiryTime.setSeconds(expiryTime.getSeconds() + seconds);
    
            const { error: insertError } = await supabase
                .from('attendance_codes')
                .insert([{ 
                    class_id: selectedClass!.id, 
                    code, 
                    expiry_time: expiryTime.toISOString(),
                    teacher_latitude: currentLocation.latitude,
                    teacher_longitude: currentLocation.longitude
                }]);
    
            if (insertError) throw insertError;
            
            setAttendanceCode(code);
            const totalSeconds = (minutes * 60) + seconds;
            setExpirySeconds(totalSeconds);
        } catch (error) {
            console.error('Generate code error:', error);
            Alert.alert('Error', 'Failed to generate attendance code');
        } finally {
            setCodeLoading(false);
        }
    };

    const renderClassItem = ({ item }: { item: Class }) => (
        <TouchableOpacity
            style={[
                styles.classCard,
                item.id === selectedClass?.id && styles.selectedCard
            ]}
            onPress={() => setSelectedClass(item)}
        >
            <Text style={[
                styles.classText,
                item.id === selectedClass?.id && styles.selectedClassText
            ]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Attendance</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#2c3e50" style={styles.loader} />
            ) : (
                <FlatList
                    data={classes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderClassItem}
                    numColumns={2}
                    columnWrapperStyle={styles.classRow}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#1abc9c']}
                            tintColor="#1abc9c"
                        />
                    }
                />
            )}

            <View style={styles.timerSection}>
                <Text style={styles.timerText}>
                    Code Expiry: {formatExpiryDuration()}
                </Text>
                <TouchableOpacity 
                    style={styles.timerButton}
                    onPress={() => {
                        setTempMinutes(expiryMinutes);
                        setShowTimerModal(true);
                    }}
                >
                    <Text style={styles.timerButtonText}>Change</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                onPress={handleGenerateCode}
                disabled={!selectedClass || codeLoading}
                style={[styles.button, (codeLoading || !selectedClass) && styles.disabledButton]}
            >
                <Text style={styles.buttonText}>{codeLoading ? 'Generating...' : 'Generate Code'}</Text>
            </TouchableOpacity>

            {attendanceCode && (
                <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>Attendance Code: {attendanceCode}</Text>
                    {expirySeconds > 0 ? (
                        <View style={styles.timerContainer}>
                            <Text style={styles.codeExpiry}>Time Remaining: {timeLeft}</Text>
                        </View>
                    ) : (
                        <Text style={styles.expiredText}>Code Expired</Text>
                    )}
                </View>
            )}

            {/* Timer Setting Modal */}
            <Modal
                visible={showTimerModal}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Code Expiry Time</Text>
                        <View style={styles.timerInputContainer}>
                            <View style={styles.timerInputWrapper}>
                                <TextInput
                                    style={styles.timerInput}
                                    value={tempMinutes}
                                    onChangeText={setTempMinutes}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    maxLength={3}
                                />
                                <Text style={styles.timerInputLabel}>Minutes</Text>
                            </View>
                            <Text style={styles.timerInputSeparator}>:</Text>
                            <View style={styles.timerInputWrapper}>
                                <TextInput
                                    style={styles.timerInput}
                                    value={tempSeconds}
                                    onChangeText={setTempSeconds}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    maxLength={2}
                                />
                                <Text style={styles.timerInputLabel}>Seconds</Text>
                            </View>
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowTimerModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveTimerSettings}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Location Preview Modal */}
            <Modal
                visible={showLocationPreview}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.mapModalContent}>
                        <Text style={styles.modalTitle}>Confirm Location</Text>
                        {currentLocation && (
                            <View style={styles.mapContainer}>
                                <MapView
                                    style={styles.map}
                                    camera={{
                                        center: {
                                            latitude: currentLocation.latitude,
                                            longitude: currentLocation.longitude,
                                        },
                                        pitch: 0,
                                        heading: 0,
                                        altitude: 100, // Lower value = more zoom
                                        zoom: 18 // Higher value = more zoom (0-20)
                                    }}
                                >
                                    <Marker
                                        coordinate={{
                                            latitude: currentLocation.latitude,
                                            longitude: currentLocation.longitude,
                                        }}
                                    />
                                </MapView>
                            </View>
                        )}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowLocationPreview(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={confirmAndGenerateCode}
                            >
                                <Text style={styles.saveButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 12,
    },
    header: {
        marginTop: 20,
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
        color: '#1a2a3a',
    },
    loader: {
        marginTop: 12,
    },
    classRow: {
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    classCard: {
        width: '48%',
        aspectRatio: 2.2,
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
    },
    leftCard: {
        marginRight: 3,
    },
    rightCard: {
        marginLeft: 3,
    },
    selectedCard: {
        backgroundColor: '#1abc9c',
        borderLeftColor: '#0fa18e',
        shadowColor: '#0fa18e',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    classText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        textAlign: 'center',
    },
    selectedClassText: {
        color: 'white',
    },
    timerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 8,
        padding: 10,
        backgroundColor: '#f0f4f8',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    timerText: {
        fontSize: 14,
        color: '#2c3e50',
        flex: 1,
    },
    timerButton: {
        backgroundColor: '#3498db',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    timerButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    button: {
        marginTop: 12,
        backgroundColor: '#1abc9c',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        shadowColor: '#0fa18e',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    disabledButton: {
        backgroundColor: '#a0aec0',
        shadowColor: '#718096',
        shadowOpacity: 0.1,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    codeContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    codeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#e74c3c',
        marginBottom: 6,
        letterSpacing: 1,
        textAlign: 'center',
    },
    timerContainer: {
        height: 20, // Fixed height to prevent layout shifts
    },
    codeExpiry: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '500',
    },
    expiredText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#e74c3c',  // Red color
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '75%',
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 14,
    },
    timerInputContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    timerInputWrapper: {
        alignItems: 'center',
        width: '40%',
    },
    timerInput: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#cbd5e0',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    timerInputLabel: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4,
    },
    timerInputSeparator: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginHorizontal: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        width: '48%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
    },
    cancelButtonText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
    },
    saveButton: {
        backgroundColor: '#1abc9c',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    mapModalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    mapContainer: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 16,
    },
    map: {
        width: '100%',
        height: '100%',
    },
});

export default AttendanceScreen;