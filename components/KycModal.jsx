import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { router, usePathname } from 'expo-router';
import { useSelector } from 'react-redux';

const { width } = Dimensions.get('window');

const statusCopy = {
    rejected: {
        title: 'KYC Rejected',
        description: 'Your KYC documents were rejected. Please re-upload valid documents to continue.',
        action: 'Re-upload KYC',
        color: '#DC2626',
    },
    under_review: {
        title: 'KYC Under Review',
        description: 'Your documents are submitted and waiting for approval. App access unlocks after approval.',
        action: 'View KYC Status',
        color: '#CA8A04',
    },
    pending: {
        title: 'KYC Pending',
        description: 'Submit all required KYC documents so the admin team can verify your account.',
        action: 'Complete KYC',
        color: '#4A43EC',
    },
    default: {
        title: 'Complete Your KYC',
        description: 'Upload your project developer documents to continue using the app.',
        action: 'Complete KYC',
        color: '#4A43EC',
    },
};

export default function KycModal() {
    const pathname = usePathname();
    const bottomSheetRef = useRef(null);
    const isPresentedRef = useRef(false);
    const snapPoints = useMemo(() => ['64%'], []);
    const {
        isLoggedIn,
        isKycCompleted,
        kycInitialized,
        kycLoading,
        kycError,
        kycStatus,
        user,
        branchId,
    } = useSelector((state) => state.auth);
    const isAuthPath =
        pathname === '/' ||
        pathname.includes('(auth)') ||
        pathname.includes('onboarding') ||
        pathname.includes('login') ||
        pathname.includes('register') ||
        pathname.includes('otp-verification') ||
        pathname.includes('location-permission');

    const hasAssignedBranch = Boolean(user?.branch_id || branchId);

    const isVisible = Boolean(
        isLoggedIn &&
        hasAssignedBranch &&
        kycInitialized &&
        !kycLoading &&
        !kycError &&
        !isKycCompleted &&
        !isAuthPath &&
        !pathname.includes('kyc')
    );
    const copy = statusCopy[String(kycStatus || '').toLowerCase()] || statusCopy.default;

    useEffect(() => {
        if (isVisible && !isPresentedRef.current) {
            isPresentedRef.current = true;
            bottomSheetRef.current?.present();
        } else if (!isVisible && isPresentedRef.current) {
            isPresentedRef.current = false;
            bottomSheetRef.current?.dismiss();
        }
    }, [isVisible]);

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                pressBehavior="none"
            />
        ),
        []
    );

    if (!isVisible) return null;

    return (
        <BottomSheetModal
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={false}
            enableDismissOnClose={false}
            handleComponent={null}
            backgroundStyle={styles.sheetBackground}
        >
            <BottomSheetView style={styles.container}>
                <View style={[styles.hero, { backgroundColor: copy.color }]}>
                    <Image source={require('../assets/images/pana.png')} style={styles.illustration} resizeMode="contain" />
                </View>

                <Text style={styles.title}>{copy.title}</Text>
                <Text style={styles.description}>{copy.description}</Text>

                <Pressable
                    style={[styles.button, { backgroundColor: copy.color }]}
                    onPress={() => router.push('/(screens)/kyc')}
                >
                    <Text style={styles.buttonText}>{copy.action}</Text>
                </Pressable>
            </BottomSheetView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    sheetBackground: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingBottom: 28,
    },
    hero: {
        width: '100%',
        height: 230,
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        overflow: 'hidden',
    },
    illustration: { width: width * 0.90, height: 280, marginBottom: -75 },
    title: {
        color: '#111827',
        fontSize: 21,
        fontWeight: '700',
        marginTop: 100,
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        color: '#6B7280',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        paddingHorizontal: 30,
        marginBottom: 26,
    },
    button: {
        width: width * 0.84,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
