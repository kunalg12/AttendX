import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    ScrollView,
    Modal
} from 'react-native';
import { supabase } from '../../supabaseConfig';
interface Profile {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
}

function ProfileScreen() {
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
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    Alert.alert('Error', error.message);
                } else if (data) {
                    setProfile(data as Profile);
                    setNewEmail(data.email || '');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch profile');
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
            // Email format validation
            if (!/\S+@\S+\.\S+/.test(newEmail)) {
                Alert.alert('Error', 'Please enter a valid email address');
                setUpdateLoading(false);
                return;
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'No authenticated user found');
                setUpdateLoading(false);
                return;
            }

            // Update email
            const { data, error } = await supabase.auth.updateUser({
                email: newEmail,
            });

            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert(
                    'Success',
                    'Email update initiated. Please check your inbox to verify.',
                    [{
                        text: 'OK',
                        onPress: () => {
                            setShowEmailModal(false);
                            if (profile) {
                                setProfile({
                                    ...profile,
                                    email: newEmail,
                                });
                            }
                            setNewEmail('');
                        }
                    }]
                );
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update email';
            Alert.alert('Error', message);
        } finally {
            setUpdateLoading(false);
        }
    }

    async function updatePassword() {
        // Input validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all password fields');
            return;
        }

        if (!profile) {
            Alert.alert('Error', 'Profile not found');
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
            // First verify current password
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: currentPassword,
            });

            if (signInError || !signInData.user) {
                Alert.alert('Error', 'Current password is incorrect');
                setUpdateLoading(false);
                return;
            }

            // Update password
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                Alert.alert('Error', updateError.message);
                setUpdateLoading(false);
                return;
            }

            // Show success message after state updates
            Alert.alert(
                'Success',
                'Password updated successfully!',
                [{ 
                    text: 'OK', 
                    onPress: () => {
                        // Clear form and close modal before showing success message
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setShowPasswordModal(false);
                        setUpdateLoading(false);
                    } 
                }]
            );

        } catch (error: any) {
            console.error('Error updating password:', error);
            Alert.alert('Error', error.message || 'Failed to update password');
            setUpdateLoading(false);
        }
    }

    // Clear input fields when modals are closed
    function closeEmailModal() {
        setShowEmailModal(false);
        setNewEmail('');
    }

    function closePasswordModal() {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    }

    // Clear input fields when modals are opened
    function openEmailModal() {
        setNewEmail('');
        setShowEmailModal(true);
    }

    function openPasswordModal() {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(true);
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.header}>Teacher Profile</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#4361ee" style={styles.loader} />
                ) : (
                    <View style={styles.profileContainer}>
                        {profile ? (
                            <>
                                <View style={styles.avatarContainer}>
                                    <Text style={styles.avatarText}>{profile.full_name?.charAt(0) || '?'}</Text>
                                </View>
                                <Text style={styles.profileName}>{profile.full_name || 'User'}</Text>
                                <Text style={styles.profileEmail}>{profile.email}</Text>
                                <View style={styles.profileBadge}>
                                    <Text style={styles.profileRole}>{profile.role || 'Teacher'}</Text>
                                </View>

                                <View style={styles.settingsContainer}>
                                    <Text style={styles.settingsHeader}>Account Settings</Text>

                                    <TouchableOpacity style={styles.settingItem} onPress={openEmailModal}>
                                        <View style={styles.settingTextContainer}>
                                            <Text style={styles.settingLabel}>Email Address</Text>
                                            <Text style={styles.settingValue}>{profile.email}</Text>
                                        </View>
                                        <Text style={styles.settingAction}>Update</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.settingItem} onPress={openPasswordModal}>
                                        <View style={styles.settingTextContainer}>
                                            <Text style={styles.settingLabel}>Password</Text>
                                            <Text style={styles.settingValue}>••••••••</Text>
                                        </View>
                                        <Text style={styles.settingAction}>Change</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <Text style={styles.emptyText}>Profile not found.</Text>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Email Modal */}
            <Modal visible={showEmailModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Email</Text>
                        <Text style={styles.inputLabel}>New Email</Text>
                        <TextInput
                            style={styles.input}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeEmailModal}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={updateEmail}>
                                <Text style={styles.saveButtonText}>{updateLoading ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Password Modal */}
            <Modal visible={showPasswordModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>
                        <Text style={styles.inputLabel}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                        />
                        <Text style={styles.inputLabel}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <Text style={styles.inputLabel}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closePasswordModal}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    styles.modalButton, 
                                    styles.saveButton,
                                    updateLoading && { opacity: 0.7 }
                                ]} 
                                onPress={updatePassword}
                                disabled={updateLoading}
                            >
                                <Text style={styles.saveButtonText}>
                                    {updateLoading ? 'Saving...' : 'Save'}
                                </Text>
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
        backgroundColor: '#f8f9fa',
    },
    scrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginTop: 20,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 30,
        color: '#1a1a2c',
    },
    loader: {
        marginTop: 50,
    },
    profileContainer: {
        alignItems: 'center',
        width: '100%',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#4361ee',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarText: {
        fontSize: 48,
        color: 'white',
        fontWeight: 'bold',
    },
    profileName: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a2c',
    },
    profileEmail: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 12,
    },
    profileBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 30,
    },
    profileRole: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4338ca',
    },
    settingsContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    settingsHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#1a1a2c',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    settingTextContainer: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a2c',
    },
    settingValue: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    settingAction: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4361ee',
    },
    signOutButton: {
        backgroundColor: '#f43f5e',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    signOutButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 20,
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
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
        color: '#1a1a2c',
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748b',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f1f5f9',
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#4361ee',
        marginLeft: 8,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    }
});

export default ProfileScreen;
