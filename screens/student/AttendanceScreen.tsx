import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseConfig';

// Define interfaces for our data structure
interface AttendanceRecord {
    id: string;
    student_id: string;
    class_id: string;
    date: string;
    status: string;
    class_name?: string; // Will be populated after fetching
}

interface ClassInfo {
    id: string;
    name: string;
}

interface AttendanceByClass {
    className: string;
    classId: string;
    count: number;
    totalClasses: number; // This will now be an estimated value
    percentage: number;
    dates: { date: string, status: string }[];
}

export default function AttendanceScreen() {
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [groupedAttendance, setGroupedAttendance] = useState<AttendanceByClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const windowWidth = Dimensions.get('window').width;

    // Fetch both attendance records and class information
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch class enrollments for the student
            const { data: enrollments, error: enrollmentError } = await supabase
                .from('class_enrollments')
                .select('class_id')
                .eq('student_id', user.id);

            if (enrollmentError) {
                throw enrollmentError;
            }

            if (enrollments && enrollments.length > 0) {
                const classIds = enrollments.map(enrollment => enrollment.class_id);

                // Fetch class details for the joined classes
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('id, name')
                    .in('id', classIds);

                if (classesError) {
                    throw classesError;
                }

                if (classesData) {
                    setClasses(classesData);
                }

                // Fetch attendance records for the joined classes
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('attendance')
                    .select('id, student_id, class_id, date, status')
                    .eq('student_id', user.id)
                    .in('class_id', classIds)
                    .order('date', { ascending: false });

                if (attendanceError) {
                    throw attendanceError;
                }

                if (attendanceData) {
                    // Combine attendance with class names
                    const enrichedData = attendanceData.map(record => {
                        const classInfo = classesData?.find(c => c.id === record.class_id);
                        return {
                            ...record,
                            class_name: classInfo?.name || 'Unknown Class'
                        };
                    });

                    setAttendanceRecords(enrichedData);
                    await processAttendanceData(enrichedData, classesData || []);
                }
            } else {
                setClasses([]);
                setAttendanceRecords([]);
                setGroupedAttendance([]);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch attendance data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Process attendance data to group by class
    const processAttendanceData = async (data: AttendanceRecord[], classesData: ClassInfo[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create a map to group attendance by class
            const attendanceMap: Record<string, AttendanceByClass> = {};

            // Initialize with all classes
            for (const classInfo of classesData) {
                // Get total classes taken for this class using a fixed query
                const { data: totalClassesTaken, error } = await supabase
                    .from('attendance')
                    .select('date', { count: 'exact', head: false })
                    .eq('class_id', classInfo.id)
                    .order('date')
                    .limit(1000); // Adjust limit if needed

                if (error) throw error;

                // Get unique dates using JavaScript
                const uniqueDates = totalClassesTaken ?
                    [...new Set(totalClassesTaken.map(item => item.date))] : [];

                attendanceMap[classInfo.id] = {
                    classId: classInfo.id,
                    className: classInfo.name,
                    count: 0,
                    totalClasses: uniqueDates.length,
                    percentage: 0,
                    dates: []
                };
            }

            // Add attendance records
            data.forEach(record => {
                const classId = record.class_id;
                const className = record.class_name || 'Unknown Class';
                const formattedDate = new Date(record.date).toLocaleDateString();
                const status = record.status;

                if (status.toLowerCase() === 'present') {
                    attendanceMap[classId].count += 1;
                }
                attendanceMap[classId].dates.push({ date: formattedDate, status });
            });

            // Calculate percentage
            Object.values(attendanceMap).forEach(item => {
                item.percentage = item.totalClasses > 0
                    ? (item.count / item.totalClasses) * 100
                    : 0;
            });

            // Convert map to array and sort by class name
            const groupedData = Object.values(attendanceMap)
                .sort((a, b) => a.className.localeCompare(b.className));

            setGroupedAttendance(groupedData);
        } catch (error: any) {
            console.error('Process attendance error:', error);
            Alert.alert('Error', 'Failed to process attendance data');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    const handleClassSelect = (classId: string) => {
        if (selectedClass === classId) {
            setSelectedClass(null); // Toggle off if already selected
        } else {
            setSelectedClass(classId); // Select new class
        }
    };

    // Get selected class data
    const getSelectedClassData = () => {
        return groupedAttendance.find(item => item.classId === selectedClass);
    };

    // Custom bar chart component
    const CustomBarChart = ({ percentage }: { percentage: number }) => {
        return (
            <View style={styles.customChartContainer}>
                <Text style={styles.chartTitle}>Attendance Rate: {percentage.toFixed(1)}%</Text>
                <View style={styles.barContainer}>
                    <View style={[styles.barFill, { width: `${percentage}%` }]} />
                    <Text style={styles.barText}>{percentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#27ae60' }]} />
                        <Text style={styles.legendText}>Present</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#ecf0f1' }]} />
                        <Text style={styles.legendText}>Total Classes</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderClassCard = (item: AttendanceByClass) => {
        const isSelected = selectedClass === item.classId;

        return (
            <TouchableOpacity
                key={item.classId}
                style={[
                    styles.classCard,
                    isSelected ? styles.selectedCard : {}
                ]}
                onPress={() => handleClassSelect(item.classId)}
            >
                <Text style={styles.className}>{item.className}</Text>
                <View style={styles.cardDetails}>
                    <Text style={styles.attendanceCount}>
                        {item.count}/{item.totalClasses} Classes
                    </Text>
                    <Text style={[
                        styles.percentage,
                        item.percentage >= 75 ? styles.goodPercentage : styles.badPercentage
                    ]}>
                        {item.percentage.toFixed(1)}%
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderAttendanceDetails = () => {
        const classData = getSelectedClassData();
        if (!classData) return null;

        return (
            <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>
                    {classData.className} - Attendance Details
                </Text>

                {/* Custom Bar Chart */}
                <CustomBarChart percentage={classData.percentage} />

                {/* Attendance Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, styles.dateCol]}>Date</Text>
                        <Text style={[styles.headerText, styles.statusCol]}>Status</Text>
                    </View>

                    {classData.dates.length > 0 ? (
                        <ScrollView style={styles.tableBody}>
                            {classData.dates.map((record, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.cellText, styles.dateCol]}>{record.date}</Text>
                                    <Text style={[
                                        styles.cellText,
                                        styles.statusCol,
                                        record.status.toLowerCase() === 'present' ? styles.presentText : styles.absentText
                                    ]}>
                                        {record.status}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.noRecordsText}>No attendance records found</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.mainContainer}>
            {/* Fixed Header Section */}
            <View style={styles.fixedHeader}>
                <Text style={styles.title}>Attendance Dashboard</Text>
                {!loading && groupedAttendance.length > 0 && (
                    <View style={styles.statsContainer}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.statsScrollContent}
                        >
                            <View style={[styles.statCard, styles.statCardFirst]}>
                                <Text style={styles.statLabel}>Overall</Text>
                                <Text style={styles.statValue}>
                                    {Math.round(
                                        groupedAttendance.reduce((acc, curr) => acc + curr.percentage, 0) / 
                                        groupedAttendance.length
                                    )}%
                                </Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Total Classes</Text>
                                <Text style={styles.statValue}>
                                    {groupedAttendance.reduce((acc, curr) => acc + curr.totalClasses, 0)}
                                </Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Present</Text>
                                <Text style={styles.statValue}>
                                    {groupedAttendance.reduce((acc, curr) => acc + curr.count, 0)}
                                </Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statLabel}>Subjects</Text>
                                <Text style={styles.statValue}>{groupedAttendance.length}</Text>
                            </View>
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollableContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.classesContainer}>
                    <Text style={styles.sectionTitle}>My Subjects</Text>
                    {groupedAttendance.length > 0 ? (
                        groupedAttendance.map(item => (
                            <View key={item.classId}>
                                {renderClassCard(item)}
                                {selectedClass === item.classId && renderAttendanceDetails()}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="assessment" size={80} color="#e0e0e0" />
                            <Text style={styles.emptyTitle}>No Attendance Data</Text>
                            <Text style={styles.emptySubtext}>
                                Once you join classes and start marking attendance, your stats will appear here.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f4f6f8',
    },
    container: {
        flex: 1,
        backgroundColor: '#f4f6f8',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 10,
    },
    loader: {
        marginTop: 20,
    },
    classesSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 15,
    },
    classCard: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 8, // Reduce margin for more compact list
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: '#3498db',
    },
    className: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    cardDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    attendanceCount: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    percentage: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    goodPercentage: {
        color: '#27ae60',
    },
    badPercentage: {
        color: '#e74c3c',
    },
    detailsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        padding: 16,
        marginTop: 8,
        marginBottom: 16,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 15,
        textAlign: 'center',
    },
    customChartContainer: {
        marginVertical: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'center',
    },
    barContainer: {
        height: 30,
        backgroundColor: '#ecf0f1',
        borderRadius: 15,
        overflow: 'hidden',
        marginVertical: 10,
        position: 'relative',
    },
    barFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#27ae60',
        borderRadius: 15,
    },
    barText: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        textAlign: 'center',
        textAlignVertical: 'center',
        color: '#2c3e50',
        fontWeight: 'bold',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    tableContainer: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ddd',
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#2c3e50',
        padding: 12,
    },
    headerText: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 16,
    },
    tableBody: {
        maxHeight: 300,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: 'white',
        padding: 12,
    },
    dateCol: {
        flex: 2,
    },
    statusCol: {
        flex: 1,
        textAlign: 'center',
    },
    cellText: {
        fontSize: 14,
        color: '#2c3e50',
    },
    presentText: {
        color: '#27ae60',
        fontWeight: '600',
    },
    absentText: {
        color: '#e74c3c',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
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
    noRecordsText: {
        textAlign: 'center',
        fontSize: 14,
        color: 'gray',
        padding: 20,
    },
    statsSection: {
        backgroundColor: '#f4f6f8',
        padding: 16,
        maxHeight: '40%', // Adjust this value as needed
    },
    statsCards: {
        maxHeight: '100%',
    },
    scrollableSection: {
        flex: 1,
        padding: 16,
    },
    fixedHeader: {
        backgroundColor: '#ffffff',
        paddingTop: 40,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e8ed',
        elevation: 4,
        zIndex: 1,
    },
    statsContainer: {
        marginTop: 8,
    },
    statsScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    statCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 6,
        minWidth: 100,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statCardFirst: {
        marginLeft: 0,
    },
    statLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    scrollableContent: {
        flex: 1,
        padding: 16,
    },
    classesContainer: {
        flex: 1,
        paddingBottom: 20,
    },
    splitContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    upperSection: {
        flex: 0.4, // 40% of the screen
        backgroundColor: '#f4f6f8',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e1e8ed',
    },
    lowerSection: {
        flex: 0.6, // 60% of the screen
        backgroundColor: '#ffffff',
    },
    detailsScroll: {
        flex: 1,
        padding: 16,
    },
    noSelectionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noSelectionText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
});