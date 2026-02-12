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
    Share,
    Platform,
    RefreshControl,
    ScrollView
} from 'react-native';
import { supabase } from '../../supabaseConfig';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FontAwesome } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Class {
    id: number;
    name: string;
}

interface AttendanceRecord {
    id: string;
    date: string;
    status: string;
    profiles: {
        full_name: string;
        email: string;
    };
}

function ReportsScreen() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [reportsLoading, setReportsLoading] = useState<boolean>(false);
    const [sharingLoading, setSharingLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const realtimeSubscription = useRef<RealtimeChannel | null>(null);

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

    useEffect(() => {
        fetchClasses();
    }, []);

    async function fetchAttendanceReports() {
        if (!selectedClass) return;
        setReportsLoading(true);
        try {
            // First get all attendance records for the class
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('attendance')
                .select(`id, date, status, student_id`)
                .eq('class_id', selectedClass.id)
                .order('date', { ascending: false });

            if (attendanceError) {
                throw attendanceError;
            }

            if (!attendanceData || attendanceData.length === 0) {
                setAttendanceRecords([]);
                return;
            }

            // Get all student profiles in one go
            const studentIds = [...new Set(attendanceData.map(record => record.student_id))];
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', studentIds);

            if (profilesError) {
                throw profilesError;
            }

            // Map student profiles to attendance records
            const processedData = attendanceData.map(record => {
                const studentProfile = profilesData?.find(profile => profile.id === record.student_id);
                return {
                    ...record,
                    profiles: studentProfile || { 
                        id: record.student_id,
                        full_name: `Student (ID: ${record.student_id.substring(0, 6)}...)`, 
                        email: 'Profile not found' 
                    }
                };
            });
            
            setAttendanceRecords(processedData);
            console.log('Fetched attendance records:', processedData.length);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            Alert.alert('Error', (error as Error).message || 'Failed to fetch attendance records');
        } finally {
            setReportsLoading(false);
        }
    }

    // Set up real-time subscription to attendance records
    const setupAttendanceSubscription = () => {
        if (!selectedClass) return;
        
        // Clean up any existing subscription
        if (realtimeSubscription.current) {
            supabase.removeChannel(realtimeSubscription.current);
        }

        // Subscribe to changes in the attendance table for the selected class
        realtimeSubscription.current = supabase
            .channel('attendance_channel')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'attendance',
                    filter: `class_id=eq.${selectedClass.id}` // Only listen to changes for this class
                },
                () => {
                    // Refresh the attendance records when a change is detected
                    fetchAttendanceReports();
                }
            )
            .subscribe();
    };

    useEffect(() => {
        if (selectedClass) {
            fetchAttendanceReports();
            setupAttendanceSubscription();
        } else {
            setAttendanceRecords([]);
            // Clean up subscription when class is deselected
            if (realtimeSubscription.current) {
                supabase.removeChannel(realtimeSubscription.current);
                realtimeSubscription.current = null;
            }
        }

        // Clean up subscription on unmount or when selected class changes
        return () => {
            if (realtimeSubscription.current) {
                supabase.removeChannel(realtimeSubscription.current);
            }
        };
    }, [selectedClass]);

    // Format date to DD/MM/YY
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().substring(2);
        return `${day}/${month}/${year}`;
    };

    // Extract unique dates and students
    const uniqueDates = Array.from(
        new Set(attendanceRecords.map((record) => formatDate(record.date)))
    );
    const uniqueStudents = Array.from(
        new Set(attendanceRecords.map((record) => record.profiles.full_name))
    );

    // Create a table-like structure
    const attendanceTable = uniqueStudents.map((student) => {
        const studentRecords = attendanceRecords.filter(
            (record) => record.profiles.full_name === student
        );
        const attendanceByDate = uniqueDates.map((date) => {
            const record = studentRecords.find(
                (record) => formatDate(record.date) === date
            );
            return record ? record.status : 'absent';
        });
        return { student, attendanceByDate };
    });

    // Create CSV content
    const createCSVContent = () => {
        let csvContent = `Student,Date,Status\n`;
        attendanceRecords.forEach(record => {
            const date = new Date(record.date).toLocaleDateString();
            const status = record.status === 'present' ? 'P' : 'A';
            csvContent += `${record.profiles.full_name},${date},${status}\n`;
        });
        return csvContent;
    };

    // Share or download attendance report as CSV
    const shareAttendanceReport = async () => {
        if (!selectedClass || attendanceRecords.length === 0) {
            Alert.alert('No Data', 'No attendance data available to share');
            return;
        }

        setSharingLoading(true);
        try {
            const csvContent = createCSVContent();
            if (!Paths.document) {
                throw new Error('documentDirectory is not available');
            }
            const fileUri = Paths.document.uri + `${selectedClass.name.replace(/\s+/g, '_')}_attendance.csv`;
            await new ExpoFile(fileUri).write(csvContent);

            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                await Sharing.shareAsync(fileUri);
            } else {
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const file = new File([blob], `${selectedClass.name}_attendance.csv`, { type: 'text/csv' });
                await navigator.share({
                    files: [file],
                    title: `${selectedClass.name} Attendance Report`,
                });
            }
        } catch (error) {
            console.error('Error sharing report:', error);
            Alert.alert('Error', 'Failed to share attendance report');
        } finally {
            setSharingLoading(false);
        }
    };

    // Generate PDF report

const generatePDFReport = async () => {
    if (!selectedClass || attendanceRecords.length === 0) {
        Alert.alert('No Data', 'No attendance data available to generate PDF');
        return;
    }

    const htmlContent = `
        <h1>${selectedClass.name} Attendance Report</h1>
        <table border="1" cellspacing="0" cellpadding="5">
            <tr>
                <th>Student</th>
                <th>Date</th>
                <th>Status</th>
            </tr>
            ${attendanceRecords.map(record => {
                const date = new Date(record.date).toLocaleDateString();
                const status = record.status === 'present' ? 'Present' : 'Absent';
                return `<tr>
                    <td>${record.profiles.full_name}</td>
                    <td>${date}</td>
                    <td>${status}</td>
                </tr>`;
            }).join('')}
        </table>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);
    } catch (error) {
        console.error('Error generating PDF:', error);
        Alert.alert('Error', 'Failed to generate PDF');
    }
};


    const renderClassItem = ({ item }: { item: Class }) => (
        <TouchableOpacity 
            onPress={() => setSelectedClass(item)} 
            style={[
                styles.card, 
                selectedClass?.id === item.id && styles.selectedCard
            ]}
        >
            <Text 
                style={[
                    styles.classText, 
                    selectedClass?.id === item.id && styles.selectedClassText
                ]}
                numberOfLines={2}
            >
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    // Handle pull-to-refresh for attendance records
    const onRefresh = useCallback(async () => {
        if (!selectedClass) return;
        setRefreshing(true);
        await fetchAttendanceReports();
        setRefreshing(false);
    }, [selectedClass]);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Attendance Dashboard</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#2c3e50" style={styles.loader} />
            ) : (
                <FlatList
                    data={classes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderClassItem}
                    numColumns={2}
                    columnWrapperStyle={styles.classRow}
                />
            )}

            {selectedClass && (
                <View style={styles.reportsContainer}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.selectedClassTitle}>{selectedClass.name} - Attendance</Text>
                        <TouchableOpacity 
                            style={styles.shareButton}
                            onPress={shareAttendanceReport}
                            disabled={sharingLoading || reportsLoading || attendanceRecords.length === 0}
                        >
                            {sharingLoading ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <>
                                    <FontAwesome name="share-alt" size={14} color="#ffffff" style={styles.shareIcon} />
                                    <Text style={styles.shareButtonText}>Export CSV</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.shareButton}
                            onPress={generatePDFReport}
                            disabled={reportsLoading || attendanceRecords.length === 0}
                        >
                            <Text style={styles.shareButtonText}>Download PDF</Text>
                        </TouchableOpacity>
                    </View>

                    {reportsLoading ? (
                        <ActivityIndicator size="large" color="#2c3e50" style={styles.loader} />
                    ) : attendanceRecords.length === 0 ? (
                        <ScrollView 
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={["#3498db"]}
                                    tintColor="#3498db"
                                />
                            }
                            contentContainerStyle={styles.noDataContainer}
                        >
                            <FontAwesome name="inbox" size={40} color="#95a5a6" style={styles.noDataIcon} />
                            <Text style={styles.noDataText}>No attendance records available</Text>
                            <Text style={styles.noDataSubText}>
                                Attendance records will appear here when students mark their attendance.
                            </Text>
                            <Text style={styles.refreshHintText}>Pull down to refresh</Text>
                        </ScrollView>
                    ) : (
                        <ScrollView 
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={["#3498db"]}
                                    tintColor="#3498db"
                                />
                            }
                        >
                            <View style={styles.tableContainer}>
                                {/* Render Table Header */}
                                <View style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.tableHeader, styles.studentNameCell]}>Student</Text>
                                    {uniqueDates.map((date) => (
                                        <Text key={date} style={[styles.tableCell, styles.tableHeader, styles.dateCell]}>
                                            {date}
                                        </Text>
                                    ))}
                                </View>

                                {/* Render Table Rows */}
                                {attendanceTable.map((row, index) => (
                                    <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}>
                                        <Text style={[styles.tableCell, styles.studentNameCell]} numberOfLines={1}>{row.student}</Text>
                                        {row.attendanceByDate.map((status, idx) => (
                                            <Text
                                                key={idx}
                                                style={[
                                                    styles.tableCell,
                                                    styles.dateCell,
                                                    {
                                                        color:
                                                            status === 'present'
                                                                ? '#1abc9c'
                                                                : '#e74c3c',
                                                        fontWeight: '600'
                                                    },
                                                ]}
                                            >
                                                {status === 'present' ? 'P' : 'A'}
                                            </Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    )}
                </View>
            )}
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
    card: {
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
    reportsContainer: {
        marginTop: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectedClassTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        flex: 1,
    },
    shareButton: {
        margin: 4,
        backgroundColor: '#3498db',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    shareButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    shareIcon: {
        marginRight: 5,
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        minHeight: 200,
    },
    noDataIcon: {
        marginBottom: 16,
    },
    noDataText: {
        textAlign: 'center',
        color: '#718096',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    noDataSubText: {
        textAlign: 'center',
        color: '#95a5a6',
        fontSize: 14,
        marginBottom: 16,
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    alternateRow: {
        backgroundColor: '#f9fafb',
    },
    tableCell: {
        padding: 8,
        textAlign: 'center',
        fontSize: 12,
    },
    studentNameCell: {
        flex: 2,
        textAlign: 'left',
        fontWeight: '500',
    },
    dateCell: {
        flex: 1,
    },
    tableHeader: {
        fontWeight: '600',
        backgroundColor: '#f0f4f8',
    },
    refreshHintText: {
        textAlign: 'center',
        color: '#95a5a6',
        marginTop: 8,
        fontSize: 12,
    },
});

export default ReportsScreen;