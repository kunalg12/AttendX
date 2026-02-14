import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Animated,
    Easing,
    Dimensions,
    Platform,
    StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    onLoadingComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onLoadingComplete }: Props) {
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const logoScaleAnim = useRef(new Animated.Value(0.7)).current;
    const translateYTitle = useRef(new Animated.Value(20)).current;
    const translateYSubtitle = useRef(new Animated.Value(20)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(-width)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Sequence of animations for a professional entrance
        Animated.stagger(150, [
            // Logo fade in and scale
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic)
                }),
                Animated.spring(logoScaleAnim, {
                    toValue: 1,
                    friction: 7,
                    tension: 40,
                    useNativeDriver: true
                })
            ]),

            // Title slide up
            Animated.spring(translateYTitle, {
                toValue: 0,
                friction: 6,
                tension: 50,
                useNativeDriver: true
            }),

            // Subtitle slide up
            Animated.spring(translateYSubtitle, {
                toValue: 0,
                friction: 6,
                tension: 50,
                useNativeDriver: true
            })
        ]).start();

        // Progress bar animation
        Animated.timing(progressWidth, {
            toValue: width - 80,
            duration: 1800,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.quad)
        }).start();

        // Shimmer effect
        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: width,
                duration: 1500,
                useNativeDriver: true,
                easing: Easing.ease
            })
        ).start();

        // Subtle pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin)
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.sin)
                })
            ])
        ).start();

        // Complete loading
        const timer = setTimeout(() => {
            console.log('SplashScreen timeout - calling onLoadingComplete');
            onLoadingComplete();
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000b29" />
            <LinearGradient
                colors={['#000b29', '#003366', '#00264d']}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={styles.content}>
                {/* Logo */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { scale: logoScaleAnim },
                                { scale: pulseAnim }
                            ]
                        }
                    ]}
                >
                    <View style={styles.logo}>
                        <Text style={styles.logoIcon}>X</Text>
                    </View>
                    <Animated.View
                        style={[
                            styles.shimmerContainer,
                            {
                                transform: [{ translateX: shimmerAnim }]
                            }
                        ]}
                    />
                </Animated.View>

                {/* App Title */}
                <Animated.Text
                    style={[
                        styles.logoText,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: translateYTitle }]
                        }
                    ]}
                >
                    AttendX
                </Animated.Text>

                {/* Subtitle */}
                <Animated.Text
                    style={[
                        styles.subtitle,
                        {
                            opacity: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 0.8]
                            }),
                            transform: [{ translateY: translateYSubtitle }]
                        }
                    ]}
                >
                    Attendance Management System
                </Animated.Text>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            { width: progressWidth }
                        ]}
                    />
                </View>
            </View>

            {/* Bottom decorative elements */}
            <View style={styles.bottomDecorator} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000b29',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    logo: {
        width: 110,
        height: 110,
        borderRadius: 30,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4fc3f7',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
    logoIcon: {
        fontSize: 70,
        fontWeight: 'bold',
        color: '#003366',
        ...Platform.select({
            ios: {
                fontFamily: 'System',
            },
            android: {
                fontFamily: 'sans-serif-medium',
            },
        }),
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: [{ skewX: '-20deg' }],
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        letterSpacing: 1,
        ...Platform.select({
            ios: {
                fontFamily: 'System',
            },
            android: {
                fontFamily: 'sans-serif-medium',
            },
        }),
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 60,
        letterSpacing: 1,
    },
    progressContainer: {
        width: width - 80,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#4fc3f7',
        borderRadius: 2,
    },
    bottomDecorator: {
        position: 'absolute',
        bottom: 0,
        height: 5,
        width: width,
        backgroundColor: '#4fc3f7',
    }
});