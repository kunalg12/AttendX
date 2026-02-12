import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Image,
    FlatList,
    SafeAreaView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'Welcome to AttendX',
        description: 'The smartest way to manage classroom attendance.',
        image: require('../assets/undraw_sign-up_z2ku.png'), // Reusing illustration for now or use placeholder
        colors: ['#1a2a6c', '#b21f1f'] as const
    },
    {
        id: '2',
        title: 'Real-time Tracking',
        description: 'Teachers can see attendance marked live. Students mark with a simple code.',
        image: require('../assets/undraw_login_wqkt.png'),
        colors: ['#b21f1f', '#fdbb2d'] as const
    },
    {
        id: '3',
        title: 'Location Verified',
        description: 'Secure attendance with location verification to ensure students are present in class.',
        image: require('../assets/undraw_login_wqkt.png'), // Change to location related if available
        colors: ['#11998e', '#38ef7d'] as const
    }
];

type RootStackParamList = {
    Onboarding: undefined;
    Login: undefined;
};

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

type Props = {
    navigation: OnboardingScreenNavigationProp;
    onComplete: () => void;
};

export default function OnboardingScreen({ navigation, onComplete }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleNext = async () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // Last slide, complete onboarding
            await AsyncStorage.setItem('@onboarding_completed', 'true');
            onComplete();
        }
    };

    const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => (
        <View style={styles.slide}>
            <LinearGradient
                colors={item.colors}
                style={styles.slideGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.image} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_DATA}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorContainer}>
                    {ONBOARDING_DATA.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                currentIndex === index && styles.activeIndicator
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>
                        {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    slide: {
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slideGradient: {
        position: 'absolute',
        width,
        height,
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: width * 0.8,
        height: width * 0.8,
        resizeMode: 'contain',
    },
    textContainer: {
        flex: 0.4,
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 15,
    },
    description: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 25,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        paddingHorizontal: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    indicatorContainer: {
        flexDirection: 'row',
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 4,
    },
    activeIndicator: {
        width: 24,
        backgroundColor: '#fff',
    },
    nextButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    nextButtonText: {
        color: '#2c3e50',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
