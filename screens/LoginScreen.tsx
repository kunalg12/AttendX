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
    Image,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../supabaseConfig';
import LoginIllustration from '../assets/undraw_login_wqkt.png';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Define navigation type
type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    StudentDashboard: undefined;
    TeacherDashboard: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
    navigation: LoginScreenNavigationProp;
};

export default function LoginScreen({ navigation }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Animation values
    const fadeAnim = useSharedValue(0);
    const slideAnim = useSharedValue(50);
    const logoScale = useSharedValue(0.8);

    useEffect(() => {
        fadeAnim.value = withTiming(1, { duration: 1000 });
        slideAnim.value = withSpring(0);
        logoScale.value = withSpring(1);
    }, []);

    const animatedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: fadeAnim.value,
            transform: [{ translateY: slideAnim.value }],
        };
    });

    const animatedLogoStyle = useAnimatedStyle(() => {
        return {
            opacity: fadeAnim.value,
            transform: [{ scale: logoScale.value }],
        };
    });

    async function handleLogin() {
        if (email === '' || password === '') {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <LinearGradient
                colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={styles.content}>
                <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
                    <Image source={LoginIllustration} style={styles.illustration} />
                    <Text style={styles.title}>AttendX</Text>
                    <Text style={styles.subtitle}>Smart Attendance Made Simple</Text>
                </Animated.View>

                <Animated.View style={[styles.inputContainer, animatedContentStyle]}>
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

                    <TouchableOpacity
                        onPress={() => navigation.navigate('ForgotPassword')}
                        style={styles.forgotPasswordLink}
                    >
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.authButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#2c3e50', '#000000']}
                            style={styles.buttonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.authButtonText}>Login</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerText}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
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
        height: Dimensions.get('window').height * 0.4,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    illustration: {
        width: 220,
        height: 220,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
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
        marginBottom: 15,
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
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginBottom: 20,
    },
    forgotPasswordText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
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
        marginTop: 25,
    },
    footerText: {
        color: '#666',
        fontSize: 15,
    },
    registerText: {
        color: '#b21f1f',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
