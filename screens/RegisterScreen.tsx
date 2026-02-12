import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    Text,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Image,
    Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../supabaseConfig';
import RegisterIllustration from '../assets/undraw_sign-up_z2ku.png';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring 
} from 'react-native-reanimated';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Define navigation type
type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    StudentDashboard: undefined;
    TeacherDashboard: undefined;
};

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

type Props = {
    navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'student' | 'teacher' | null>(null);
    const [loading, setLoading] = useState(false);

    // Animation values
    const fadeAnim = useSharedValue(0);
    const slideAnim = useSharedValue(50);

    useEffect(() => {
        fadeAnim.value = withTiming(1, { duration: 1000 });
        slideAnim.value = withSpring(0);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: fadeAnim.value,
            transform: [{ translateY: slideAnim.value }],
        };
    });

    async function handleRegister() {
        if (email === '' || password === '' || fullName === '' || role === null) {
            Alert.alert('Error', 'Please fill in all fields and select a role');
            return;
        }

        setLoading(true);

        // Sign up with Supabase auth
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError || !user) {
            setLoading(false);
            Alert.alert('Error', signUpError?.message || 'Registration failed');
            return;
        }

        // Insert user profile data
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: user.id,
                    email,
                    full_name: fullName,
                    role
                }
            ]);

        setLoading(false);

        if (profileError) {
            Alert.alert('Error', profileError.message);
            return;
        }

        // Success message
        Alert.alert(
            'Registration Successful',
            'Your account has been created successfully',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <LinearGradient
                colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Animated.View style={[styles.logoContainer, animatedStyle]}>
                        <Image source={RegisterIllustration} style={styles.illustration} />
                        <Text style={styles.title}>Join AttendX</Text>
                        <Text style={styles.subtitle}>Start managing your attendance today</Text>
                    </Animated.View>

                    <Animated.View style={[styles.inputContainer, animatedStyle]}>
                        <View style={styles.inputWrapper}>
                            <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                placeholderTextColor="#999"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <Text style={styles.roleLabel}>I am a:</Text>

                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    role === 'student' && styles.selectedRole
                                ]}
                                onPress={() => setRole('student')}
                            >
                                <FontAwesome5 
                                    name="user-graduate" 
                                    size={24} 
                                    color={role === 'student' ? '#fff' : '#666'} 
                                />
                                <Text style={[
                                    styles.roleButtonText,
                                    role === 'student' && styles.selectedRoleText
                                ]}>Student</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.roleButton,
                                    role === 'teacher' && styles.selectedRole
                                ]}
                                onPress={() => setRole('teacher')}
                            >
                                <FontAwesome5 
                                    name="chalkboard-teacher" 
                                    size={24} 
                                    color={role === 'teacher' ? '#fff' : '#666'} 
                                />
                                <Text style={[
                                    styles.roleButtonText,
                                    role === 'teacher' && styles.selectedRoleText
                                ]}>Teacher</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.authButton}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#2c3e50', '#000000']}
                                style={styles.buttonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.authButtonText}>Register</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginText}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
        paddingTop: 60,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    illustration: {
        width: 180,
        height: 180,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 5,
        fontWeight: '500',
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f3f5',
        borderRadius: 15,
        marginBottom: 12,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    roleLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#444',
        marginTop: 10,
        marginBottom: 15,
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    roleButton: {
        backgroundColor: '#f1f3f5',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        width: '48%',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    selectedRole: {
        backgroundColor: '#2c3e50',
        borderColor: '#2c3e50',
    },
    roleButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
        color: '#666',
    },
    selectedRoleText: {
        color: '#fff',
    },
    authButton: {
        borderRadius: 15,
        overflow: 'hidden',
        marginTop: 10,
    },
    buttonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    authButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    footerText: {
        color: '#666',
        fontSize: 15,
    },
    loginText: {
        color: '#b21f1f',
        fontWeight: 'bold',
        fontSize: 15,
    },
});