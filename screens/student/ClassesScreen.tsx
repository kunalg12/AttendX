import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    SafeAreaView,
    Modal,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseConfig';

interface CourseWithClasses {
    id: string;
    name: string;
    classes: Array<{
        id: string;
        name: string;
    }>;
}

export default function ClassesScreen() {
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<CourseWithClasses[]>([]);
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joinType, setJoinType] = useState<'course' | 'class'>('course');

    useEffect(() => {
        fetchEnrolledCoursesAndClasses();
    }, []);

    const fetchEnrolledCoursesAndClasses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch course enrollments with classes
            const { data: courseEnrollments, error: courseError } = await supabase
                .from('course_enrollments')
                .select(`
                    courses (
                        id,
                        name,
                        course_classes (
                            classes (
                                id,
                                name
                            )
                        )
                    )
                `)
                .eq('student_id', user.id);

            if (courseError) throw courseError;

            // Fetch standalone class enrollments
            const { data: classEnrollments, error: classError } = await supabase
                .from('class_enrollments')
                .select(`
                    classes (
                        id,
                        name
                    )
                `)
                .eq('student_id', user.id);

            if (classError) throw classError;

            // Format course data
            const courseData: CourseWithClasses[] = [];

            // Add courses with their classes
            if (courseEnrollments) {
                courseEnrollments.forEach((enrollment: any) => {
                    if (enrollment.courses) {
                        const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
                        if (course) {
                            courseData.push({
                                id: course.id,
                                name: course.name,
                                classes: (course.course_classes || []).map((cc: any) => ({
                                    id: cc.classes?.id || (Array.isArray(cc.classes) ? cc.classes[0]?.id : cc.classes?.id),
                                    name: cc.classes?.name || (Array.isArray(cc.classes) ? cc.classes[0]?.name : cc.classes?.name)
                                }))
                            });
                        }
                    }
                });
            }

            // Add standalone classes as a special group
            const standaloneClasses = (classEnrollments as any[])
                ?.filter(ce => ce.classes)
                .map(ce => {
                    const cls = Array.isArray(ce.classes) ? ce.classes[0] : ce.classes;
                    return {
                        id: cls.id,
                        name: cls.name
                    };
                }) || [];

            if (standaloneClasses.length > 0) {
                courseData.push({
                    id: 'standalone-classes',
                    name: 'Individual Classes',
                    classes: standaloneClasses
                });
            }

            setCourses(courseData);
        } catch (error) {
            console.error('Fetch error:', error);
            Alert.alert('Error', 'Failed to load enrolled courses and classes');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!joinCode.trim()) {
            Alert.alert('Error', 'Please enter a join code');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (joinType === 'course') {
                await handleCourseJoin(user.id);
            } else {
                await handleClassJoin(user.id);
            }

        } catch (error) {
            console.error('Join error:', error);
            Alert.alert('Error', 'Failed to join');
        }
    };

    const handleCourseJoin = async (userId: string) => {
        // Get course details
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select(`
                id,
                course_classes(class_id)
            `)
            .eq('join_code', joinCode.trim())
            .single();

        if (courseError || !course) {
            Alert.alert('Error', 'Invalid course code');
            return;
        }

        // Check existing enrollment
        const { data: existing } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('course_id', course.id)
            .eq('student_id', userId)
            .single();

        if (existing) {
            Alert.alert('Error', 'Already enrolled in this course');
            return;
        }

        // Enroll in course
        const { error: enrollError } = await supabase
            .from('course_enrollments')
            .insert({
                course_id: course.id,
                student_id: userId
            });

        if (enrollError) throw enrollError;

        // Enroll in classes
        const classEnrollments = course.course_classes.map(cc => ({
            class_id: cc.class_id,
            student_id: userId
        }));

        const { error: classError } = await supabase
            .from('class_enrollments')
            .insert(classEnrollments);

        if (classError) throw classError;

        setModalVisible(false);
        setJoinCode('');
        fetchEnrolledCoursesAndClasses();
        Alert.alert('Success', 'Successfully joined the course and its classes!');
    };

    const handleClassJoin = async (userId: string) => {
        // Check if class exists
        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('join_code', joinCode.trim())
            .single();

        if (classError || !classData) {
            Alert.alert('Error', 'Invalid class code');
            return;
        }

        // Check existing enrollment
        const { data: existing } = await supabase
            .from('class_enrollments')
            .select('id')
            .eq('class_id', classData.id)
            .eq('student_id', userId)
            .single();

        if (existing) {
            Alert.alert('Error', 'Already enrolled in this class');
            return;
        }

        // Enroll in class
        const { error: enrollError } = await supabase
            .from('class_enrollments')
            .insert({
                class_id: classData.id,
                student_id: userId
            });

        if (enrollError) throw enrollError;

        setModalVisible(false);
        setJoinCode('');
        fetchEnrolledCoursesAndClasses();
        Alert.alert('Success', 'Successfully joined the class!');
    };

    // Update the return JSX for better UI
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>My Classes</Text>
                <TouchableOpacity 
                    style={styles.joinButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.joinButtonText}>+ Join New</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#1a73e8" />
                    <Text style={styles.loadingText}>Loading your classes...</Text>
                </View>
            ) : (
                <FlatList
                    data={courses}
                    keyExtractor={item => item.id}
                    renderItem={({ item: course }) => (
                        <View style={styles.courseContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.courseHeader,
                                    expandedCourseId === course.id && styles.courseHeaderActive
                                ]}
                                onPress={() => setExpandedCourseId(
                                    expandedCourseId === course.id ? null : course.id
                                )}
                                activeOpacity={0.7}
                            >
                                <View style={styles.courseHeaderLeft}>
                                    <Text style={styles.courseName}>{course.name}</Text>
                                    <Text style={styles.classCount}>
                                        {course.classes.length} {course.classes.length === 1 ? 'Class' : 'Classes'}
                                    </Text>
                                </View>
                                <Text style={styles.expandIcon}>
                                    {expandedCourseId === course.id ? '▼' : '▶'}
                                </Text>
                            </TouchableOpacity>

                            {expandedCourseId === course.id && (
                                <View style={styles.classesContainer}>
                                    {course.classes.map(cls => (
                                        <TouchableOpacity
                                            key={cls.id}
                                            style={styles.classItem}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.classIconContainer}>
                                                <Text style={styles.classIcon}>📚</Text>
                                            </View>
                                            <View style={styles.classDetails}>
                                                <Text style={styles.className}>{cls.name}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                    contentContainerStyle={[
                        styles.listContainer,
                        courses.length === 0 && { flex: 1, justifyContent: 'center' }
                    ]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="class" size={80} color="#e0e0e0" />
                            <Text style={styles.emptyTitle}>No Classes Joined</Text>
                            <Text style={styles.emptySubtext}>
                                You haven't joined any courses or classes yet. Enter a code to get started!
                            </Text>
                            <TouchableOpacity 
                                style={[styles.joinButton, { marginTop: 20 }]}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={styles.joinButtonText}>Join Now</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* ... existing Modal code ... */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Join {joinType === 'course' ? 'Course' : 'Class'}</Text>
                        
                        <View style={styles.toggleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    joinType === 'course' && styles.toggleButtonActive
                                ]}
                                onPress={() => setJoinType('course')}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    joinType === 'course' && styles.toggleButtonTextActive
                                ]}>Course</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    joinType === 'class' && styles.toggleButtonActive
                                ]}
                                onPress={() => setJoinType('class')}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    joinType === 'class' && styles.toggleButtonTextActive
                                ]}>Class</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder={`Enter ${joinType === 'course' ? 'Course' : 'Class'} Code`}
                            value={joinCode}
                            onChangeText={setJoinCode}
                            autoCapitalize="characters"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setJoinCode('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handleJoin}
                            >
                                <Text style={styles.submitButtonText}>Join</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Update the styles
const styles = StyleSheet.create({
    // ... existing styles ...
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 2,
    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a73e8',
    },
    joinButton: {
        backgroundColor: '#1a73e8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 2,
    },
    joinButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    listContainer: {
        padding: 16,
    },
    courseContainer: {
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
    },
    courseHeaderActive: {
        backgroundColor: '#f8f9fa',
    },
    courseHeaderLeft: {
        flex: 1,
    },
    courseName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 4,
    },
    classCount: {
        fontSize: 14,
        color: '#666',
    },
    expandIcon: {
        fontSize: 18,
        color: '#1a73e8',
        marginLeft: 8,
    },
    classesContainer: {
        padding: 8,
        backgroundColor: '#f8f9fa',
    },
    classItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
        elevation: 1,
    },
    classIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e8f0fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    classIcon: {
        fontSize: 20,
    },
    classDetails: {
        flex: 1,
    },
    className: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    emptyContainer: {
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
    // ... existing modal styles ...
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 25,
        borderRadius: 15,
        width: '85%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#2c3e50',
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 15,
        marginBottom: 25,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        borderRadius: 8,
        padding: 12,
        width: '48%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#1a73e8',
    },
    submitButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    toggleButtonActive: {
        backgroundColor: '#1a73e8',
    },
    toggleButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    toggleButtonTextActive: {
        color: '#fff',
    },
});