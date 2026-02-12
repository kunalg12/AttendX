import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../supabaseConfig';
import MapView, { Marker } from 'react-native-maps';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Class {
    id: number;
    name: string;
    teacher_id: string;
}

interface Location {
    coords: {
        latitude: number;
        longitude: number;
    };
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
};

function MarkAttendanceScreen() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<Location | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [address, setAddress] = useState<string>('');
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [classSelectModalVisible, setClassSelectModalVisible] = useState<boolean>(false);
    const [fetchingClasses, setFetchingClasses] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const realtimeSubscription = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        // Get location permission and current location
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setLocationError('Permission to access location was denied');
                    return;
                }

                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);

                // Get the address from coordinates
                try {
                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude
                    });

                    if (reverseGeocode.length > 0) {
                        const loc = reverseGeocode[0];
                        const addressComponents = [
                            loc.street,
                            loc.district,
                            loc.city,
                            loc.region,
                            loc.postalCode,
                            loc.country
                        ].filter(Boolean);

                        setAddress(addressComponents.join(', '));
                    }
                } catch (geoError) {
                    console.log('Error getting address:', geoError);
                }
            } catch (error) {
                setLocationError('Could not get your location');
            }
        })();

        // Fetch classes the student is enrolled in
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        setFetchingClasses(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setFetchingClasses(false);
            return;
        }

        // Fetch classes the student is enrolled in
        const { data: enrollments, error: enrollmentError } = await supabase
            .from('class_enrollments')
            .select('class_id')
            .eq('student_id', user.id);

        if (enrollmentError) {
            Alert.alert('Error', enrollmentError.message);
            setFetchingClasses(false);
            return;
        }

        const classIds = enrollments?.map(e => e.class_id) || [];

        if (classIds.length > 0) {
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('*')
                .in('id', classIds);

            if (classesError) {
                Alert.alert('Error', classesError.message);
            } else {
                setClasses(classesData || []);
            }
        } else {
            setClasses([]);
        }
        setFetchingClasses(false);
    };

    const setupRealtimeSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Cleanup existing subscription if any
        if (realtimeSubscription.current) {
            supabase.removeChannel(realtimeSubscription.current);
        }

        // Subscribe to changes in the classes table
        realtimeSubscription.current = supabase
            .channel('student_classes_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'classes'
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

        return () => {
            if (realtimeSubscription.current) {
                supabase.removeChannel(realtimeSubscription.current);
            }
        };
    }, []);

    async function handleMarkAttendance() {
        if (!selectedClass) {
            Alert.alert('Error', 'Please select a class first');
            return;
        }

        if (!code.trim()) {
            Alert.alert('Error', 'Please enter the attendance code');
            return;
        }

        if (!location) {
            Alert.alert('Error', 'Location is required to mark attendance');
            return;
        }

        setLoading(true);

        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
            setLoading(false);
            Alert.alert('Error', 'User not found');
            return;
        }

        const user = userData.user;

        // Check if the code is valid and not expired
        const { data: codeData, error: codeError } = await supabase
            .from('attendance_codes')
            .select('*, classes(id, name), teacher_latitude, teacher_longitude')
            .eq('code', code)
            .eq('class_id', selectedClass.id) // Make sure code is for the selected class
            .gte('expiry_time', new Date().toISOString())
            .single();

        if (codeError || !codeData) {
            setLoading(false);
            Alert.alert('Error', 'Invalid or expired code for this class');
            return;
        }

        // Calculate distance between student and teacher
        if (codeData.teacher_latitude && codeData.teacher_longitude) {
            const distance = calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                codeData.teacher_latitude,
                codeData.teacher_longitude
            );

            if (distance > 50) { // 50 meters threshold
                setLoading(false);
                Alert.alert(
                    'Location Error',
                    'You are too far from the class location. Please ensure you are within 50 meters of the teacher\'s location.'
                );
                return;
            }
        }

        // Check if student is enrolled in this class
        const { data: enrollment, error: enrollmentError } = await supabase
            .from('class_enrollments')
            .select('*')
            .eq('student_id', user.id)
            .eq('class_id', codeData.class_id)
            .single();

        if (enrollmentError || !enrollment) {
            setLoading(false);
            Alert.alert('Error', 'You are not enrolled in this class');
            return;
        }

        // Mark the student as present
        const { error: attendanceError } = await supabase
            .from('attendance')
            .insert([
                {
                    class_id: codeData.class_id,
                    student_id: user.id,
                    status: 'present',
                    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    location_address: address
                }
            ]);

        setLoading(false);

        if (attendanceError) {
            if (attendanceError.code === '23505') {
                Alert.alert('Already Marked', 'You have already marked your attendance for this class today');
            } else {
                Alert.alert('Error', attendanceError.message);
            }
        } else {
            Alert.alert(
                'Success',
                `Attendance marked for ${selectedClass.name}`,
                [{
                    text: 'OK', onPress: () => {
                        setCode('');
                        setSelectedClass(null);
                    }
                }]
            );
        }
    }

    const handleSelectClass = (classItem: Class) => {
        setSelectedClass(classItem);
        setClassSelectModalVisible(false);
    };

    if (fetchingClasses) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Loading your classes...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (classes.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="event-available" size={80} color="#e0e0e0" />
                    <Text style={styles.emptyTitle}>No Classes Enrolled</Text>
                    <Text style={styles.emptySubtext}>
                        You are not enrolled in any classes yet. Join a class to start marking your attendance.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#1abc9c']}
                        tintColor="#1abc9c"
                    />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Mark Attendance</Text>
                </View>

                <View style={styles.markAttendanceContainer}>
                    <Text style={styles.instructionText}>
                        Select a class and enter the attendance code:
                    </Text>

                    <TouchableOpacity
                        style={styles.classSelector}
                        onPress={() => setClassSelectModalVisible(true)}
                    >
                        <Text style={styles.classSelectorLabel}>Class:</Text>
                        <Text style={styles.selectedClassText}>
                            {selectedClass ? selectedClass.name : 'Select class'}
                        </Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.codeInput}
                        placeholder="Enter attendance code"
                        value={code}
                        onChangeText={setCode}
                        maxLength={6}
                        editable={!!selectedClass}
                    />

                    <View style={styles.locationContainer}>
                        <Text style={styles.locationTitle}>Location Status:</Text>
                        <Text style={[
                            styles.locationStatus,
                            { color: location ? '#4CAF50' : '#F44336' }
                        ]}>
                            {location ? 'Location detected ✓' : locationError || 'Fetching location...'}
                        </Text>

                        {location && address && (
                            <Text style={styles.addressText}>
                                {address}
                            </Text>
                        )}
                    </View>

                    {location && (
                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.map}
                                initialRegion={{
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                    latitudeDelta: 0.005,
                                    longitudeDelta: 0.005,
                                }}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: location.coords.latitude,
                                        longitude: location.coords.longitude,
                                    }}
                                    title="Your Location"
                                    description="You are here"
                                />
                            </MapView>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.markButton,
                            (!location || !code.trim() || !selectedClass) && styles.disabledButton
                        ]}
                        onPress={handleMarkAttendance}
                        disabled={loading || !location || !code.trim() || !selectedClass}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.markButtonText}>Mark Attendance</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Class Selection Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={classSelectModalVisible}
                    onRequestClose={() => setClassSelectModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Class</Text>

                            <FlatList
                                data={classes}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.classItem}
                                        onPress={() => handleSelectClass(item)}
                                    >
                                        <Text style={styles.classItemText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                                style={styles.classList}
                            />

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setClassSelectModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#555',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    markAttendanceContainer: {
        backgroundColor: '#f5f5f5',
        padding: 20,
        borderRadius: 10,
        elevation: 3,
    },
    instructionText: {
        fontSize: 16,
        marginBottom: 15,
    },
    classSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
    },
    classSelectorLabel: {
        fontWeight: 'bold',
        marginRight: 10,
        fontSize: 16,
    },
    selectedClassText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    codeInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
        marginBottom: 15,
    },
    locationContainer: {
        marginBottom: 15,
    },
    locationTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
    },
    locationStatus: {
        fontSize: 14,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 12,
        color: '#555',
        marginTop: 5,
    },
    mapContainer: {
        marginBottom: 15,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    map: {
        width: '100%',
        height: 200,
    },
    markButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 5,
    },
    disabledButton: {
        backgroundColor: '#aaa',
    },
    markButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '85%',
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    classList: {
        maxHeight: 300,
    },
    classItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    classItemText: {
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 15,
        backgroundColor: '#95a5a6',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
});

export default MarkAttendanceScreen;