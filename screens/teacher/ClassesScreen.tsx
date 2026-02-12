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
    ActivityIndicator,
    ScrollView
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../supabaseConfig';
import { MaterialIcons } from '@expo/vector-icons';

interface Course {
    id: string;
    name: string;
    description: string;
    semester: string;
    join_code: string;
    teacher_name: string;  // Add this
    subject: string;       // Add this
    classes: Class[];
}

interface Class {
    id: string;
    name: string;
    join_code: string;
}

interface CourseFormData {
    courseName: string;
    description: string;
    semester: string;
    className: string;
    teacher_name: string;
    subject: string;
    selectedClasses: string[];
}

export default function CoursesAndClassesScreen() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CourseFormData>({
        courseName: '',
        description: '',
        semester: '',
        className: '',
        teacher_name: '',
        subject: '',
        selectedClasses: []
    });
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [classModalVisible, setClassModalVisible] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [creationMode, setCreationMode] = useState<'course' | 'class'>('course');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [editedClassName, setEditedClassName] = useState('');
    const [availableClasses, setAvailableClasses] = useState<{ id: string, name: string }[]>([]); // Add this
    const [availableTeachers, setAvailableTeachers] = useState<{ id: string, name: string }[]>([]); // Add this

    useEffect(() => {
        fetchCourses();
        fetchAvailableClasses(); // Add this
        fetchTeachers();  // Add this
    }, []);

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const fetchCourses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch courses with their classes
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
                    *,
                    course_classes (
                        classes (
                            id,
                            name,
                            join_code
                        )
                    )
                `)
                .eq('teacher_id', user.id)
                .order('created_at', { ascending: false });

            if (coursesError) throw coursesError;

            // First get all class_ids that are in course_classes
            const { data: linkedClassIds } = await supabase
                .from('course_classes')
                .select('class_id');

            // Create array of linked IDs
            const linkedIds = linkedClassIds?.map(item => item.class_id) || [];

            // Fetch standalone classes - if there are linked classes, filter them out
            const { data: standaloneClasses, error: classesError } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', user.id)
                .not(linkedIds.length > 0 ? 'id' : 'dummy_column', 'in', `(${linkedIds.join(',')})`);

            if (classesError) throw classesError;

            // Format courses data
            const formattedCourses = coursesData.map(course => ({
                ...course,
                classes: course.course_classes
                    .map((cc: any) => cc.classes)
                    .filter(Boolean)
            }));

            // Add standalone classes as a special "course"
            if (standaloneClasses && standaloneClasses.length > 0) {
                formattedCourses.push({
                    id: 'standalone',
                    name: 'Standalone Classes',
                    description: '',
                    semester: '',
                    join_code: '',
                    classes: standaloneClasses
                });
            }

            setCourses(formattedCourses);
        } catch (error) {
            console.error('Fetch error:', error);
            Alert.alert('Error', 'Failed to load courses and classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableClasses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('teacher_id', user.id);

            if (error) throw error;
            setAvailableClasses(data || []);
        } catch (error: any) {
            Alert.alert('Error', 'Failed to fetch available classes');
        }
    };

    const fetchTeachers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name') // Remove 'name' as it doesn't exist
                .eq('role', 'teacher');

            if (error) throw error;

            // Format teacher data using only full_name
            const formattedTeachers = data?.map(teacher => ({
                id: teacher.id,
                name: teacher.full_name || 'Unknown Teacher'
            })) || [];

            setAvailableTeachers(formattedTeachers);
        } catch (error) {
            console.error('Fetch teachers error:', error);
            Alert.alert('Error', 'Failed to fetch teachers');
        }
    };

    const handleCreateCourse = async () => {
        if (!formData.courseName || !formData.semester || !formData.teacher_name || !formData.subject || formData.selectedClasses?.length === 0) {
            Alert.alert('Error', 'Please fill in all required fields and select at least one class');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const joinCode = generateCode();

            // Create course
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .insert([{
                    name: formData.courseName,
                    description: formData.description,
                    semester: formData.semester,
                    join_code: joinCode,
                    teacher_id: user.id,
                    teacher_name: formData.teacher_name,
                    subject: formData.subject
                }])
                .select()
                .single();

            if (courseError) throw courseError;

            // Create class associations
            const courseClasses = formData.selectedClasses.map(classId => ({
                course_id: courseData.id,
                class_id: classId
            }));

            const { error: classError } = await supabase
                .from('course_classes')
                .insert(courseClasses);

            if (classError) throw classError;

            setModalVisible(false);
            resetForm();
            fetchCourses();
            Alert.alert('Success', 'Course created successfully!');
        } catch (error) {
            console.error('Create course error:', error);
            Alert.alert('Error', 'Failed to create course');
        }
    };

    const handleCreateClass = async () => {
        const className = creationMode === 'class' ? newClassName : formData.className;
        if (!className) {
            Alert.alert('Error', 'Please enter a class name');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Create class
            const joinCode = generateCode();
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .insert([{
                    name: className,
                    join_code: joinCode,
                    teacher_id: user.id
                }])
                .select()
                .single();

            if (classError) throw classError;

            // If creating within a course, link it
            if (selectedCourse) {
                const { error: linkError } = await supabase
                    .from('course_classes')
                    .insert([{
                        course_id: selectedCourse.id,
                        class_id: classData.id
                    }]);

                if (linkError) throw linkError;
            }

            setModalVisible(false);
            setClassModalVisible(false);
            setNewClassName('');
            resetForm();
            fetchCourses();
            Alert.alert('Success', 'Class created successfully!');
        } catch (error) {
            console.error('Create class error:', error);
            Alert.alert('Error', 'Failed to create class');
        }
    };

    const handleDeleteClass = async (classId: string) => {
        try {
            Alert.alert(
                "Delete Class",
                "Are you sure you want to delete this class? This action cannot be undone.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            const { error } = await supabase
                                .from('classes')
                                .delete()
                                .eq('id', classId);

                            if (error) throw error;
                            fetchCourses();
                            Alert.alert('Success', 'Class deleted successfully');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Delete class error:', error);
            Alert.alert('Error', 'Failed to delete class');
        }
    };

    const handleEditClass = async () => {
        if (!editingClass || !editedClassName.trim()) {
            Alert.alert('Error', 'Please enter a class name');
            return;
        }

        try {
            const { error } = await supabase
                .from('classes')
                .update({ name: editedClassName.trim() })
                .eq('id', editingClass.id);

            if (error) throw error;

            setEditModalVisible(false);
            setEditingClass(null);
            setEditedClassName('');
            fetchCourses();
            Alert.alert('Success', 'Class name updated successfully');
        } catch (error) {
            console.error('Edit class error:', error);
            Alert.alert('Error', 'Failed to update class name');
        }
    };

    const handleAddSubject = async (courseId: string, subject: string) => {
        try {
            const { error } = await supabase
                .from('courses')
                .update({ subject })
                .eq('id', courseId);

            if (error) throw error;
            fetchCourses();
            Alert.alert('Success', 'Subject added successfully!');
        } catch (error) {
            console.error('Add subject error:', error);
            Alert.alert('Error', 'Failed to add subject');
        }
    };

    const copyJoinCode = async (code: string) => {
        await Clipboard.setStringAsync(code);
        Alert.alert('Success', 'Join code copied to clipboard!');
    };

    const resetForm = () => {
        setFormData({
            courseName: '',
            description: '',
            semester: '',
            className: '',
            teacher_name: '',
            subject: '',
            selectedClasses: []
        });
    };

    const renderCourseItem = ({ item: course }: { item: Course }) => (
        <View style={styles.courseCard}>
            <TouchableOpacity 
                style={styles.courseHeader}
                onPress={() => setExpandedCourseId(
                    expandedCourseId === course.id ? null : course.id
                )}
            >
                <View>
                    <Text style={styles.courseName}>{course.name}</Text>
                    {course.id !== 'standalone' && (
                        <>
                            <Text style={styles.courseSemester}>Semester: {course.semester}</Text>
                            {course.description && (
                                <Text style={styles.courseDescription}>{course.description}</Text>
                            )}
                            <TouchableOpacity
                                style={styles.codeButton}
                                onPress={() => copyJoinCode(course.join_code)}
                            >
                                <Text style={styles.codeButtonText}>Join Code: {course.join_code}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <Text style={styles.expandIcon}>
                    {expandedCourseId === course.id ? '▼' : '▶'}
                </Text>
            </TouchableOpacity>

            {expandedCourseId === course.id && (
                <View style={styles.classesContainer}>
                    <View style={styles.classesHeader}>
                        <Text style={styles.classesTitle}>Classes</Text>
                        {course.id !== 'standalone' && (
                            <TouchableOpacity 
                                style={styles.addClassButton}
                                onPress={() => {
                                    setSelectedCourse(course);
                                    setClassModalVisible(true);
                                }}
                            >
                                <Text style={styles.addClassButtonText}>+ Add Class</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {course.classes.length > 0 ? (
                        course.classes.map(cls => (
                            <View key={cls.id} style={styles.classItem}>
                                <View style={styles.classInfo}>
                                    <Text style={styles.className}>{cls.name}</Text>
                                    <TouchableOpacity
                                        onPress={() => copyJoinCode(cls.join_code)}
                                    >
                                        <Text style={styles.classCode}>Code: {cls.join_code}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.classActions}>
                                    <TouchableOpacity 
                                        style={[styles.actionButton, styles.editButton]}
                                        onPress={() => {
                                            setEditingClass(cls);
                                            setEditedClassName(cls.name);
                                            setEditModalVisible(true);
                                        }}
                                    >
                                        <Text style={styles.actionButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionButton, styles.deleteButton]}
                                        onPress={() => handleDeleteClass(cls.id)}
                                    >
                                        <Text style={styles.actionButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noClassesText}>No classes yet</Text>
                    )}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Courses & Classes</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        style={styles.createButton}
                        onPress={() => {
                            setCreationMode('class');
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.createButtonText}>New Class</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.createButton, styles.secondButton]}
                        onPress={() => {
                            setCreationMode('course');
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.createButtonText}>New Course</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1a73e8" />
            ) : (
                <FlatList
                    data={courses}
                    renderItem={renderCourseItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[
                        styles.listContainer,
                        courses.length === 0 && { flex: 1, justifyContent: 'center' }
                    ]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="school" size={80} color="#e0e0e0" />
                            <Text style={styles.emptyTitle}>No Courses Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Create your first course or class to start managing attendance.
                            </Text>
                            <TouchableOpacity 
                                style={[styles.createButton, { marginTop: 20 }]}
                                onPress={() => {
                                    setCreationMode('course');
                                    setModalVisible(true);
                                }}
                            >
                                <Text style={styles.createButtonText}>Get Started</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Create Course Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Create New {creationMode === 'course' ? 'Course' : 'Class'}
                        </Text>
                        
                        <ScrollView 
                            style={styles.modalScrollView}
                            contentContainerStyle={styles.modalInnerContent}
                            showsVerticalScrollIndicator={true}
                            bounces={false}
                        >
                            {creationMode === 'course' ? (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Course Name *"
                                        value={formData.courseName}
                                        onChangeText={text => setFormData({...formData, courseName: text})}
                                    />
                                    <View style={styles.selectContainer}>
                                        <Text style={styles.selectLabel}>Select Teacher *</Text>
                                        {availableTeachers.length > 0 ? (
                                            <ScrollView 
                                                style={styles.teachersList}
                                                nestedScrollEnabled={true}
                                            >
                                                {availableTeachers.map(teacher => (
                                                    <TouchableOpacity
                                                        key={teacher.id}
                                                        style={[
                                                            styles.teacherItem,
                                                            formData.teacher_name === teacher.name && styles.selectedTeacherItem
                                                        ]}
                                                        onPress={() => setFormData({
                                                            ...formData,
                                                            teacher_name: teacher.name
                                                        })}
                                                    >
                                                        <Text style={[
                                                            styles.teacherName,
                                                            formData.teacher_name === teacher.name && styles.selectedTeacherName
                                                        ]}>
                                                            {teacher.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        ) : (
                                            <Text style={styles.noTeachersText}>No teachers available</Text>
                                        )}
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Subject *"
                                        value={formData.subject}
                                        onChangeText={text => setFormData({...formData, subject: text})}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Description (optional)"
                                        value={formData.description}
                                        onChangeText={text => setFormData({...formData, description: text})}
                                        multiline
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Semester *"
                                        value={formData.semester}
                                        onChangeText={text => setFormData({...formData, semester: text})}
                                    />
                                    <Text style={styles.label}>Select Classes *</Text>
                                    <ScrollView style={styles.classList}>
                                        {availableClasses.map(cls => (
                                            <TouchableOpacity
                                                key={cls.id}
                                                style={[
                                                    styles.classItem,
                                                    formData.selectedClasses.includes(cls.id) && styles.selectedClassItem
                                                ]}
                                                onPress={() => {
                                                    const selectedClasses = formData.selectedClasses.includes(cls.id)
                                                        ? formData.selectedClasses.filter(id => id !== cls.id)
                                                        : [...formData.selectedClasses, cls.id];
                                                    setFormData({ ...formData, selectedClasses });
                                                }}
                                            >
                                                <Text style={styles.className}>{cls.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            ) : (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Class Name"
                                    value={newClassName}
                                    onChangeText={setNewClassName}
                                />
                            )}
                        </ScrollView>

                        <View style={[styles.modalButtons, { marginTop: 16 }]}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setNewClassName('');
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={creationMode === 'course' ? handleCreateCourse : handleCreateClass}
                            >
                                <Text style={styles.submitButtonText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Class Modal */}
            <Modal
                visible={classModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setClassModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Class</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Class Name"
                            value={newClassName}
                            onChangeText={setNewClassName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setClassModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handleCreateClass}
                            >
                                <Text style={styles.submitButtonText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Class Modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Class Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Class Name"
                            value={editedClassName}
                            onChangeText={setEditedClassName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setEditModalVisible(false);
                                    setEditingClass(null);
                                    setEditedClassName('');
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={handleEditClass}
                            >
                                <Text style={styles.submitButtonText}>Save</Text>
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a73e8',
        flex: 1,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    createButton: {
        backgroundColor: '#1a73e8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 1,
    },
    secondButton: {
        backgroundColor: '#27ae60',
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    listContainer: {
        padding: 16,
    },
    courseCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
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
    courseName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    courseSemester: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 4,
    },
    expandIcon: {
        fontSize: 18,
        color: '#1a73e8',
    },
    classesContainer: {
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    classesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    classesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    addClassButton: {
        backgroundColor: '#27ae60',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    addClassButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    classItem: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    classInfo: {
        flex: 1,
    },
    classActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    editButton: {
        backgroundColor: '#3498db',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    className: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    classCode: {
        fontSize: 14,
        color: '#1a73e8',
        marginTop: 4,
        fontWeight: '500',
    },
    noClassesText: {
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: 14,
        marginTop: 8,
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
    emptySubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20, // Add padding to ensure modal isn't full screen
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxHeight: '90%', // Increase max height
    },
    modalScrollView: {
        maxHeight: 500, // Set a fixed maximum height
    },
    modalInnerContent: {
        paddingBottom: 20, // Add padding at the bottom for better scrolling
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#2c3e50',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
    },
    submitButton: {
        backgroundColor: '#1a73e8',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    courseCode: {
        fontSize: 14,
        color: '#1a73e8',
        marginTop: 4,
        fontWeight: '600',
    },
    courseDescription: {
        fontSize: 14,
        color: '#444',
        marginTop: 4,
    },
    codeButton: {
        backgroundColor: '#e8f0fe',
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    codeButtonText: {
        color: '#1a73e8',
        fontWeight: '600',
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    classList: {
        maxHeight: 120,
        marginBottom: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 4,
    },
    selectedClassItem: {
        backgroundColor: '#e8f0fe',
    },
    selectLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    classesSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
        maxHeight: 200,
    },
    selectedClass: {
        backgroundColor: '#1a73e8',
    },
    classItemText: {
        color: '#444',
    },
    selectedClassText: {
        color: '#fff',
    },
    selectContainer: {
        marginBottom: 16,
    },
    teachersList: {
        maxHeight: 120,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 4,
        marginBottom: 16,
    },
    teacherItem: {
        padding: 12,
        borderRadius: 6,
        marginBottom: 4,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    noTeachersText: {
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: 14,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    selectedTeacherItem: {
        backgroundColor: '#e8f0fe',
        borderColor: '#1a73e8',
    },
    teacherName: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedTeacherName: {
        color: '#1a73e8',
        fontWeight: '600',
    },
});