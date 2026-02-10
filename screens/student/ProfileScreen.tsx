import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    Image,
    ScrollView,
    Modal,
    ActivityIndicator
} from 'react-native';
import { supabase } from '../../supabaseConfig';

// Define Profile interface for type safety
interface Profile {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
    // Add other profile fields as needed
}

export default function ProfileScreen() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                if (error) {
                    console.error('Error fetching profile:', error);
                } else if (data) {
                    setProfile(data as Profile);
                    setNewEmail(data.email || '');
                }
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('Error', error.message);
        } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
        }
    }

    async function updateEmail() {
        if (!newEmail) {
            Alert.alert('Error', 'Please enter a valid email');
            return;
        }

        setUpdateLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                email: newEmail,
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert(
                    'Success', 
                    'Email update initiated. Please check your inbox for verification.',
                    [{ text: 'OK', onPress: () => setShowEmailModal(false) }]
                );
                // Update local profile data
                if (profile) {
                    setProfile({
                        ...profile,
                        email: newEmail
                    });
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update email');
        } finally {
            setUpdateLoading(false);
        }
    }

    async function updatePassword() {
        if (!currentPassword) {
            Alert.alert('Error', 'Please enter your current password');
            return;
        }
        
        if (!newPassword) {
            Alert.alert('Error', 'Please enter a new password');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return;
        }

        setUpdateLoading(true);
        try {
            // Check if profile exists
            if (!profile) {
                throw new Error('Profile not found');
            }
            
            // First verify the current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: currentPassword,
            });

            if (signInError) {
                Alert.alert('Error', 'Current password is incorrect');
                setUpdateLoading(false);
                return;
            }

            // Then update the password
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert(
                    'Success', 
                    'Password updated successfully',
                    [{ text: 'OK', onPress: () => setShowPasswordModal(false) }]
                );
                // Clear the password fields
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('Error', 'Failed to update password');
            }
        } finally {
            setUpdateLoading(false);
        }
    }

    function renderEmailModal() {
        return (
            <Modal
                visible={showEmailModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEmailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Email</Text>
                        
                        <Text style={styles.inputLabel}>New Email</Text>
                        <TextInput
                            style={styles.input}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            placeholder="Enter new email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]} 
                                onPress={() => setShowEmailModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={updateEmail}
                                disabled={updateLoading}
                            >
                                {updateLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Update</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    function renderPasswordModal() {
        return (
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Password</Text>
                        
                        <Text style={styles.inputLabel}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Enter current password"
                            secureTextEntry
                        />
                        
                        <Text style={styles.inputLabel}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                            secureTextEntry
                        />
                        
                        <Text style={styles.inputLabel}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            secureTextEntry
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]} 
                                onPress={() => setShowPasswordModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={updatePassword}
                                disabled={updateLoading}
                            >
                                {updateLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Update</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Profile</Text>
                </View>
                
                <View style={styles.profileContainer}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
                    ) : profile ? (
                        <>
                            <View style={styles.profileCard}>
                                <View style={styles.avatarContainer}>
                                    <Text style={styles.avatarText}>
                                        {profile.full_name?.charAt(0) || '?'}
                                    </Text>
                                </View>
                                <Text style={styles.profileName}>{profile.full_name || 'User'}</Text>
                                <Text style={styles.profileEmail}>{profile.email}</Text>
                                <View style={styles.profileRoleContainer}>
                                    <Text style={styles.profileRole}>{profile.role || 'Student'}</Text>
                                </View>
                            </View>

                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Account Settings</Text>
                                
                                <TouchableOpacity 
                                    style={styles.settingItem} 
                                    onPress={() => setShowEmailModal(true)}
                                >
                                    <View>
                                        <Text style={styles.settingTitle}>Email Address</Text>
                                        <Text style={styles.settingSubtitle}>{profile.email}</Text>
                                    </View>
                                    <View style={styles.settingActionButton}>
                                        <Text style={styles.settingActionText}>Edit</Text>
                                    </View>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.settingItem}
                                    onPress={() => setShowPasswordModal(true)}
                                >
                                    <View>
                                        <Text style={styles.settingTitle}>Password</Text>
                                        <Text style={styles.settingSubtitle}>••••••••</Text>
                                    </View>
                                    <View style={styles.settingActionButton}>
                                        <Text style={styles.settingActionText}>Edit</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.signOutButton}
                                onPress={handleSignOut}
                            >
                                <Text style={styles.signOutButtonText}>Sign Out</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <Text style={styles.loadingText}>Profile not found</Text>
                    )}
                </View>
            </ScrollView>
            
            {renderEmailModal()}
            {renderPasswordModal()}
        </SafeAreaView>
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
    header: {
        backgroundColor: '#3498db',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileContainer: {
        flex: 1,
        padding: 20,
    },
    loader: {
        marginTop: 40,
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 24,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    avatarContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    avatarText: {
        color: 'white',
        fontSize: 42,
        fontWeight: 'bold',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#2c3e50',
    },
    profileEmail: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 16,
    },
    profileRoleContainer: {
        backgroundColor: '#e1f5fe',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    profileRole: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0288d1',
    },
    sectionContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2c3e50',
    },
    settingSubtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 2,
    },
    settingActionButton: {
        backgroundColor: '#f1f9ff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    settingActionText: {
        color: '#3498db',
        fontWeight: '600',
        fontSize: 14,
    },
    loadingText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginTop: 40,
    },
    signOutButton: {
        backgroundColor: '#e74c3c',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginVertical: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    signOutButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#7f8c8d',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        height: 50,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 16,
        color: '#2c3e50',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#ecf0f1',
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#7f8c8d',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#3498db',
        marginLeft: 8,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    }
});