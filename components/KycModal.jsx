import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDeveloperKyc, logout } from '../store/slices/authSlice';
import { clearProjects } from '../store/slices/projectsSlice';
import { resetInventory } from '../store/slices/inventorySlice';
import { clearNotifications } from '../store/slices/notificationSlice';
import { authService } from '../services/authService';

export default function KycModal() {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const {
        isLoggedIn,
        authChecked,
        token,
        kycInitialized,
        kycLoading,
        kyc,
        kycStatus,
    } = useSelector((state) => state.auth);

    const rawStatus = String(
        kyc?.verification_status || kyc?.status || kyc?.kyc_status || kycStatus || 'missing'
    ).toLowerCase();
    const status = rawStatus === 'pending' ? 'under_review' : rawStatus;
    const submitted = ['submitted', 'under_review', 'in_review'].includes(status);
    const rejected = status === 'rejected';
    const approved = ['approved', 'verified'].includes(status);
    // This component only exists inside the authenticated tabs layout. The
    // KYC document screen is outside that layout, so route-name filtering here
    // can only create false negatives during Expo Router cold-start hydration.
    const checkingStatus = !kycInitialized || (kycLoading && !kyc);
    const visible = authChecked && isLoggedIn && Boolean(token) && (checkingStatus || !approved);
    const actionLoading = checkingStatus || (submitted && (refreshing || kycLoading));

    useEffect(() => {
        if (authChecked && isLoggedIn && token && !kycInitialized && !kycLoading) {
            dispatch(fetchDeveloperKyc());
        }
    }, [authChecked, dispatch, isLoggedIn, kycInitialized, kycLoading, token]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState !== 'active' || !authChecked || !isLoggedIn || !token) return;

            // Always revalidate on foreground. This covers an app restored
            // from recents as well as a process recreated by the OS.
            dispatch(fetchDeveloperKyc());
        });

        return () => subscription.remove();
    }, [authChecked, dispatch, isLoggedIn, token]);

    const handleAction = async () => {
        if (submitted) {
            if (actionLoading) return;
            setRefreshing(true);
            try {
                await dispatch(fetchDeveloperKyc()).unwrap();
            } catch (error) {
                console.log('[KycModal] KYC refresh failed:', error);
            } finally {
                setRefreshing(false);
            }
            return;
        }

        router.push('/(screens)/kyc');
    };

    const handleLogout = async () => {
        await authService.logout();
        dispatch(logout());
        dispatch(clearProjects());
        dispatch(resetInventory());
        dispatch(clearNotifications());
        router.replace('/(auth)/login');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={() => {}}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.visual}>
                        <View style={[styles.headerBackground, rejected && styles.rejectedBackground]} />
                        <View style={styles.handle} />
                        <Image source={require('../assets/images/pana.png')} style={styles.illustration} resizeMode="contain" />
                    </View>
                    <View style={styles.copy}>
                        <Text style={[styles.title, rejected && styles.rejectedTitle]}>
                            {checkingStatus ? 'Checking KYC Status' : rejected ? 'KYC Rejected' : submitted ? 'KYC Submitted' : 'Please Complete Your KYC'}
                        </Text>
                        <Text style={styles.description}>
                            {checkingStatus
                                ? 'Please wait while we verify your account status.'
                                : rejected
                                ? (kyc?.rejection_reason ? `Reason: ${kyc.rejection_reason}` : 'Your documents did not meet the requirements. Please re-upload valid documents.')
                                : submitted
                                    ? 'Your KYC is submitted for admin review. Access will unlock after approval.'
                                    : 'Complete your KYC to start uploading projects and managing your inventory.'}
                        </Text>
                    </View>
                    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
                        <Pressable
                            style={[styles.button, rejected && styles.rejectedButton, actionLoading && styles.disabled]}
                            onPress={handleAction}
                            disabled={actionLoading}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                            {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                <Text style={styles.buttonText}>
                                    {checkingStatus ? 'Checking Status' : submitted ? 'Refresh Status' : rejected ? 'Re-upload Documents' : 'Complete KYC'}
                                </Text>
                            )}
                        </Pressable>
                        <Pressable style={styles.logoutButton} onPress={handleLogout} hitSlop={8}>
                            <Text style={styles.logoutText}>Log out</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    container: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    visual: { width: '100%', height: 370, position: 'relative', alignItems: 'center', justifyContent: 'flex-start' },
    headerBackground: { position: 'absolute', top: 0, right: 0, bottom: 100, left: 0, backgroundColor: '#4A43EC', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    rejectedBackground: { backgroundColor: '#DC2626' },
    handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.75)', position: 'absolute', top: 14, zIndex: 10 },
    illustration: { width: '80%', height: 275, marginTop: 65, alignSelf: 'center' },
    copy: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 24, paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center', fontFamily: 'Lato-Bold', letterSpacing: -0.3 },
    rejectedTitle: { color: '#DC2626' },
    description: { fontSize: 14.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, fontFamily: 'Lato-Regular', paddingHorizontal: 8 },
    bottomBar: { width: '100%', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 20, backgroundColor: '#FFFFFF' },
    button: { minHeight: 52, backgroundColor: '#4A43EC', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#4A43EC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    rejectedButton: { backgroundColor: '#DC2626', shadowColor: '#DC2626' },
    disabled: { opacity: 0.85 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Lato-Bold' },
    logoutButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 3 },
    logoutText: { color: '#DC2626', fontSize: 12, fontWeight: '600', fontFamily: 'Lato-Bold' },
});
