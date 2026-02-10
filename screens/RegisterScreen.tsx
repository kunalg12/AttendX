import React, { useState } from 'react';
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
    Image
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../supabaseConfig';
import RegisterIllustration from '../assets/undraw_sign-up_z2ku.png';

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
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Image source={RegisterIllustration} style={styles.illustration} />

                <View style={styles.headerContainer}>
                    <Text style={styles.headerText}>Create Account</Text>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Text style={styles.roleText}>Select your role:</Text>

                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                role === 'student' && styles.selectedRole
                            ]}
                            onPress={() => setRole('student')}
                        >
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    role === 'student' && styles.selectedRoleText
                                ]}
                            >
                                Student
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                role === 'teacher' && styles.selectedRole
                            ]}
                            onPress={() => setRole('teacher')}
                        >
                            <Text
                                style={[
                                    styles.roleButtonText,
                                    role === 'teacher' && styles.selectedRoleText
                                ]}
                            >
                                Teacher
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.authButton}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.authButtonText}>Register</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        style={styles.loginLink}
                    >
                        <Text style={styles.loginText}>
                            Already have an account? Login here
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    headerContainer: {
        paddingTop: 40, // ✅ Reduce top padding
        paddingBottom: 10,
        alignItems: 'center',

    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'black',
    },
    inputContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    input: {
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    roleText: {
        fontSize: 16,
        marginTop: 20,
        marginBottom: 10,
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roleButton: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: '48%',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    illustration: {
        width: 270,
        height: 270,
        resizeMode: 'contain',
        alignSelf: 'center',
        marginBottom: -20, // ✅ Reduce space
    },

    selectedRole: {
        backgroundColor: 'black',
        borderColor: '#3498db',
    },
    roleButtonText: {
        fontSize: 16,
    },
    selectedRoleText: {
        color: 'white',
        fontWeight: 'bold',
    },
    authButton: {
        backgroundColor: 'black',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
    },
    authButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loginLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    loginText: {
        color: 'black',
        fontSize: 16,
    },
});