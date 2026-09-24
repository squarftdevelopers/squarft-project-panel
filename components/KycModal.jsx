import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { router, usePathname } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchDeveloperKyc } from '../store/slices/authSlice';

export default function KycModal() {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const pathname = usePathname();
    const sheetRef = useRef(null);
    const [refreshing, setRefreshing] = useState(false);
    const {
        isLoggedIn,
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
    const snapPoints = useMemo(() => ['92%'], []);
    const authRoute = pathname.includes('(auth)') || pathname.includes('onboarding')
        || pathname.includes('login') || pathname.includes('register') || pathname.includes('otp-verification')
        || pathname.includes('location-permission');
    const visible = isLoggedIn && kycInitialized && !approved && !authRoute && !pathname.includes('kyc');
    const actionLoading = submitted && (refreshing || kycLoading);

    const presentSheet = useCallback(() => {
        let attempts = 0;
        let timer;
        const tryPresent = () => {
            if (sheetRef.current) {
                sheetRef.current.present();
                return;
            }
            attempts += 1;
            if (attempts < 20) timer = setTimeout(tryPresent, 100);
        };
        timer = setTimeout(tryPresent, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isLoggedIn && !kycInitialized && !kycLoading) {
            dispatch(fetchDeveloperKyc());
        }
    }, [dispatch, isLoggedIn, kycInitialized, kycLoading]);

    useEffect(() => {
        if (visible) {
            return presentSheet();
        }
        sheetRef.current?.dismiss();
    }, [presentSheet, status, visible]);

    useEffect(() => {
        if (!visible) return undefined;

        const subscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                presentSheet();
            }
        });

        return () => subscription.remove();
    }, [presentSheet, visible]);

    const backdrop = useCallback((props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} pressBehavior="none" />
    ), []);

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

        sheetRef.current?.dismiss();
        router.push('/(screens)/kyc');
    };

    return (
        <BottomSheetModal
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={backdrop}
            enablePanDownToClose={false}
            enableDismissOnClose={false}
            handleComponent={null}
            backgroundStyle={styles.background}
            bottomInset={insets.bottom}
            onDismiss={() => {
                if (visible) {
                    presentSheet();
                }
            }}
        >
            <BottomSheetView style={styles.container}>
                <View style={styles.visual}>
                    <View style={[styles.headerBackground, rejected && styles.rejectedBackground]} />
                    <View style={styles.handle} />
                    <Image source={require('../assets/images/pana.png')} style={styles.illustration} resizeMode="contain" />
                </View>
                <View style={styles.copy}>
                    <Text style={[styles.title, rejected && styles.rejectedTitle]}>
                        {rejected ? 'KYC Rejected' : submitted ? 'KYC Submitted' : 'Please Complete Your KYC'}
                    </Text>
                    <Text style={styles.description}>
                        {rejected
                            ? (kyc?.rejection_reason ? `Reason: ${kyc.rejection_reason}` : 'Your documents did not meet the requirements. Please re-upload valid documents.')
                            : submitted
                                ? 'Your KYC is submitted for admin review. Access will unlock after approval.'
                                : 'Complete your KYC to start uploading projects and managing your inventory.'}
                    </Text>
                </View>
                <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 38 : 28) }]}>
                    <Pressable
                        style={[styles.button, rejected && styles.rejectedButton, actionLoading && styles.disabled]}
                        onPress={handleAction}
                        disabled={actionLoading}
                        android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                        {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                            <Text style={styles.buttonText}>
                                {submitted ? 'Refresh Status' : rejected ? 'Re-upload Documents' : 'Complete KYC'}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    background: { borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFFFFF', overflow: 'hidden' },
    container: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
    visual: { width: '100%', height: 370, position: 'relative', alignItems: 'center', justifyContent: 'flex-start' },
    headerBackground: { position: 'absolute', top: 0, right: 0, bottom: 100, left: 0, backgroundColor: '#4A43EC', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    rejectedBackground: { backgroundColor: '#DC2626' },
    handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.75)', position: 'absolute', top: 14, zIndex: 10 },
    illustration: { width: '80%', height: 275, marginTop: 65, alignSelf: 'center' },
    copy: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 16, paddingBottom: 20, flex: 1, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12, textAlign: 'center', fontFamily: 'Lato-Bold', letterSpacing: -0.3 },
    rejectedTitle: { color: '#DC2626' },
    description: { fontSize: 14.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, fontFamily: 'Lato-Regular', paddingHorizontal: 8 },
    bottomBar: { width: '100%', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 20, backgroundColor: '#FFFFFF' },
    button: { minHeight: 52, backgroundColor: '#4A43EC', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#4A43EC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    rejectedButton: { backgroundColor: '#DC2626', shadowColor: '#DC2626' },
    disabled: { opacity: 0.85 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Lato-Bold' },
});
