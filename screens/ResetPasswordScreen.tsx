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
    Dimensions,
    Image
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../supabaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring 
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import LoginIllustration from '../assets/undraw_login_wqkt.png'; // Using the same illust or different one

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
    Login: undefined;
};

type ResetPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
    navigation: ResetPasswordScreenNavigationProp;
    onResetComplete: () => void;
};

export default function ResetPasswordScreen({ navigation, onResetComplete }: Props) {
    const [newPassword, setNewPassword] = useState('');
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

    async function handleUpdatePassword() {
        if (newPassword === '') {
            Alert.alert('Error', 'Please enter your new password');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert(
                'Success',
                'Your password has been updated successfully.',
                [{ text: 'OK', onPress: () => {
                    onResetComplete();
                    navigation.navigate('Login'); 
                } }]
            );
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
                <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
                    <Image source={LoginIllustration} style={styles.illustration} />
                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.subtitle}>Enter your new password below</Text>
                </Animated.View>

                <Animated.View style={[styles.inputContainer, animatedStyle]}>
                    <View style={styles.inputWrapper}>
                        <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="New Password"
                            placeholderTextColor="#999"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleUpdatePassword}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={['#2c3e50', '#000000']}
                            style={styles.buttonGradient}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.resetButtonText}>Update Password</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
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
        height: height * 0.4,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    illustration: {
        width: 180,
        height: 180,
        resizeMode: 'contain',
        marginBottom: 20,
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
        textAlign: 'center',
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
        marginBottom: 20,
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
    resetButton: {
        borderRadius: 15,
        overflow: 'hidden',
        marginTop: 10,
    },
    buttonGradient: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    resetButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
});
