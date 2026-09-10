import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDeveloperKyc, submitDeveloperKyc, uploadDeveloperKyc } from '../../store/slices/authSlice';

const isApprovedStatus = (status) => ['verified', 'approved'].includes(String(status || '').toLowerCase());
const isReviewStatus = (status) => ['under_review', 'pending'].includes(String(status || '').toLowerCase());

const UploadBox = ({ label, value, existingUrl, icon, onPress, onRemove, useCamera }) => (
    <View style={styles.fieldBlock}>
        <Text style={styles.label}>{label}</Text>
        {value || existingUrl ? (
            <View style={styles.uploadedCard}>
                <View style={styles.fileRow}>
                    <View style={styles.fileIcon}>
                        <MaterialCommunityIcons name={useCamera ? 'camera' : 'file-image-outline'} size={20} color="#4A43EC" />
                    </View>
                    <Text style={styles.fileName} numberOfLines={1}>
                        {value?.fileName || 'Document uploaded'}
                    </Text>
                    {value ? (
                        <Pressable onPress={onRemove} style={styles.removeButton}>
                            <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        </Pressable>
                    ) : (
                        <Pressable onPress={onPress} style={styles.replaceButton}>
                            <Text style={styles.replaceText}>Replace</Text>
                        </Pressable>
                    )}
                </View>
                <Image source={{ uri: value?.uri || existingUrl }} style={styles.preview} resizeMode="cover" />
            </View>
        ) : (
            <Pressable onPress={onPress} style={styles.uploadBox}>
                <View style={styles.uploadIcon}>
                    <MaterialCommunityIcons name={icon} size={28} color="#4A43EC" />
                </View>
                <Text style={styles.uploadTitle}>{useCamera ? 'Take Selfie or Upload' : 'Upload Image'}</Text>
                <Text style={styles.uploadHint}>JPG or PNG</Text>
            </Pressable>
        )}
    </View>
);

const statusMeta = {
    verified: {
        icon: 'check-decagram-outline',
        color: '#16A34A',
        bg: '#DCFCE7',
        title: 'KYC Approved',
        message: 'Your KYC is approved. You can continue using the project panel.',
        action: 'Continue to App',
    },
    under_review: {
        icon: 'clock-outline',
        color: '#CA8A04',
        bg: '#FEF9C3',
        title: 'KYC Under Review',
        message: 'Your documents are submitted. App access will unlock after admin approval.',
        action: 'Refresh Status',
    },
    pending: {
        icon: 'clock-outline',
        color: '#CA8A04',
        bg: '#FEF9C3',
        title: 'KYC Pending',
        message: 'Your documents are saved. Submit all required documents for admin review.',
        action: 'Refresh Status',
    },
};

export default function KycScreen() {
    const dispatch = useDispatch();
    const { kyc, kycStatus, kycLoading } = useSelector((state) => state.auth);

    const [profilePhoto, setProfilePhoto] = useState(null);
    const [aadharFront, setAadharFront] = useState(null);
    const [aadharBack, setAadharBack] = useState(null);
    const [panCard, setPanCard] = useState(null);
    const [aadharNumber, setAadharNumber] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        dispatch(fetchDeveloperKyc());
    }, [dispatch]);

    useEffect(() => {
        if (!kyc) return;
        setAadharNumber(kyc.aadhar_number || '');
        setPanNumber(kyc.pan_number || '');
    }, [kyc]);

    const pickImage = async (setter, useCamera = false) => {
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permission.status !== 'granted') {
            Alert.alert('Permission needed', useCamera ? 'Camera permission is required.' : 'Photo library permission is required.');
            return;
        }

        const result = useCamera
            ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

        if (!result.canceled) setter(result.assets[0]);
    };

    const pickSelfie = (setter) => {
        Alert.alert(
            'Profile Photo',
            'Take a new selfie or upload one from your gallery.',
            [
                { text: 'Take Selfie', onPress: () => pickImage(setter, true) },
                { text: 'Upload from Gallery', onPress: () => pickImage(setter, false) },
                { text: 'Cancel', style: 'cancel' },
            ],
        );
    };

    const handleSubmit = async () => {
        const needsProfile = !profilePhoto && !kyc?.profile_photo_url;
        const needsAadharFront = !aadharFront && !kyc?.aadhar_front_url;
        const needsAadharBack = !aadharBack && !kyc?.aadhar_back_url;
        const needsPan = !panCard && !kyc?.pan_card_url;
        const cleanAadhar = aadharNumber.replace(/\D/g, '');
        const cleanPan = panNumber.trim().toUpperCase();

        if (needsProfile || needsAadharFront || needsAadharBack || needsPan) {
            Alert.alert('Incomplete KYC', 'Please upload profile photo, Aadhaar front, Aadhaar back, and PAN card.');
            return;
        }

        if (cleanAadhar.length !== 12) {
            Alert.alert('Invalid Aadhaar', 'Please enter a valid 12 digit Aadhaar number.');
            return;
        }

        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
            Alert.alert('Invalid PAN', 'Please enter a valid PAN number.');
            return;
        }

        setSubmitting(true);
        try {
            await dispatch(uploadDeveloperKyc({
                profilePhoto,
                aadharFront,
                aadharBack,
                panCard,
                aadharNumber: cleanAadhar,
                panNumber: cleanPan,
            })).unwrap();
            await dispatch(submitDeveloperKyc()).unwrap();
            Alert.alert('KYC Submitted', 'Your KYC has been submitted for admin approval.');
        } catch (error) {
            Alert.alert('KYC Failed', error || 'Unable to submit KYC. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const currentStatus = String(kycStatus || '').toLowerCase();
    const showStatusOnly = isApprovedStatus(currentStatus) || isReviewStatus(currentStatus);
    const meta = statusMeta[currentStatus] || statusMeta.under_review;
    const isRejected = currentStatus === 'rejected';
    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/home');
    };

    if (showStatusOnly) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <StatusBar barStyle="dark-content" />
                <View style={[styles.statusIcon, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon} size={54} color={meta.color} />
                </View>
                <Text style={styles.statusTitle}>{meta.title}</Text>
                <Text style={styles.statusMessage}>{meta.message}</Text>
                <Pressable
                    style={[styles.primaryButton, { backgroundColor: meta.color }]}
                    onPress={() => {
                        if (isApprovedStatus(currentStatus)) {
                            router.replace('/(tabs)/home');
                        } else {
                            dispatch(fetchDeveloperKyc());
                        }
                    }}
                >
                    {kycLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{meta.action}</Text>}
                </Pressable>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#111827" />
                </Pressable>
                <Text style={styles.headerTitle}>KYC Verification</Text>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {isRejected && (
                        <View style={styles.rejectedBanner}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#DC2626" />
                            <Text style={styles.rejectedText}>
                                Your KYC was rejected{kyc?.rejection_reason ? `: ${kyc.rejection_reason}` : '. Please re-upload valid documents.'}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.subtitle}>
                        Upload these documents once. You can access the app only after admin approval.
                    </Text>

                    <UploadBox
                        label="Profile Photo / Selfie"
                        value={profilePhoto}
                        existingUrl={kyc?.profile_photo_url}
                        icon="camera-outline"
                        useCamera
                        onPress={() => pickSelfie(setProfilePhoto)}
                        onRemove={() => setProfilePhoto(null)}
                    />

                    <UploadBox
                        label="Aadhaar Front"
                        value={aadharFront}
                        existingUrl={kyc?.aadhar_front_url}
                        icon="cloud-upload-outline"
                        onPress={() => pickImage(setAadharFront)}
                        onRemove={() => setAadharFront(null)}
                    />

                    <UploadBox
                        label="Aadhaar Back"
                        value={aadharBack}
                        existingUrl={kyc?.aadhar_back_url}
                        icon="cloud-upload-outline"
                        onPress={() => pickImage(setAadharBack)}
                        onRemove={() => setAadharBack(null)}
                    />

                    <UploadBox
                        label="PAN Card"
                        value={panCard}
                        existingUrl={kyc?.pan_card_url}
                        icon="card-account-details-outline"
                        onPress={() => pickImage(setPanCard)}
                        onRemove={() => setPanCard(null)}
                    />

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Aadhaar Number</Text>
                        <TextInput
                            value={aadharNumber}
                            onChangeText={(value) => setAadharNumber(value.replace(/\D/g, '').slice(0, 12))}
                            keyboardType="number-pad"
                            placeholder="Enter 12 digit Aadhaar number"
                            placeholderTextColor="#9CA3AF"
                            style={styles.input}
                            maxLength={12}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PAN Number</Text>
                        <TextInput
                            value={panNumber}
                            onChangeText={(value) => setPanNumber(value.toUpperCase().slice(0, 10))}
                            autoCapitalize="characters"
                            placeholder="ABCDE1234F"
                            placeholderTextColor="#9CA3AF"
                            style={styles.input}
                            maxLength={10}
                        />
                    </View>

                    <Pressable
                        onPress={handleSubmit}
                        disabled={submitting || kycLoading}
                        style={[styles.submitButton, (submitting || kycLoading) && styles.disabledButton]}
                    >
                        {submitting || kycLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitText}>{isRejected ? 'Re-submit KYC' : 'Submit KYC'}</Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        paddingHorizontal: 22,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerSpacer: { width: 28 },
    backButton: { width: 28, padding: 3 },
    headerTitle: { color: '#111827', fontSize: 18, fontWeight: '700' },
    content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 42 },
    subtitle: {
        color: '#6B7280',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 24,
    },
    rejectedBanner: {
        backgroundColor: '#FEE2E2',
        borderRadius: 14,
        padding: 14,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rejectedText: { color: '#B91C1C', fontSize: 13, lineHeight: 19, flex: 1 },
    fieldBlock: { marginBottom: 22 },
    label: { color: '#374151', fontSize: 14, fontWeight: '700', marginBottom: 9 },
    uploadBox: {
        height: 158,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#B9C5FF',
        backgroundColor: '#F7F8FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    uploadTitle: { color: '#111827', fontSize: 14, fontWeight: '700' },
    uploadHint: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
    uploadedCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    fileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    fileIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#F4F7FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    fileName: { flex: 1, color: '#111827', fontSize: 13, fontWeight: '700' },
    removeButton: { backgroundColor: '#FEF2F2', borderRadius: 20, padding: 8 },
    replaceButton: { backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
    replaceText: { color: '#4A43EC', fontSize: 12, fontWeight: '700' },
    preview: { width: '100%', height: 178, borderRadius: 12 },
    inputGroup: { marginBottom: 20 },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 11,
        color: '#111827',
        fontSize: 15,
        backgroundColor: '#FFFFFF',
    },
    submitButton: {
        backgroundColor: '#4A43EC',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    disabledButton: { opacity: 0.7 },
    submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    statusContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    statusIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    statusTitle: { color: '#111827', fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
    statusMessage: { color: '#6B7280', fontSize: 14, lineHeight: 22, textAlign: 'center' },
    primaryButton: {
        minWidth: 190,
        borderRadius: 14,
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 22,
        marginTop: 30,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
