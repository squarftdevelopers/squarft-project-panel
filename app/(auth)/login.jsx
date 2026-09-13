import { Text, View, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import { setMobile, setOtpFlow, clearError, clearAuthInputs, sendOtpThunk } from "../../store/slices/authSlice";
import AuthHeader from "../../components/AuthHeader";

const COUNTRY_CODE = "+91";

const cleanPhoneNumber = (val) => {
    let digits = String(val || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0') && digits.length > 10) {
        digits = digits.slice(1);
    }
    return digits.slice(0, 10);
};

export default function Login() {
    const dispatch = useDispatch();
    const { mobile, loading, error } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(clearError());
        dispatch(clearAuthInputs());
    }, [dispatch]);

    const handleSendOtp = async () => {
        dispatch(clearError());

        if (mobile.length !== 10) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
            return;
        }

        const phone = `${COUNTRY_CODE}${mobile}`;
        dispatch(setOtpFlow('login'));
        const result = await dispatch(sendOtpThunk({ phone, purpose: 'login' }));

        if (sendOtpThunk.fulfilled.match(result)) {
            router.push("/otp-verification");
            return;
        }

        const errorMessage = String(result.payload || 'Failed to send OTP. Please try again.');
        if (errorMessage.toLowerCase().includes('no account found')) {
            Alert.alert(
                'Account Not Found',
                'No account found with this phone number. Would you like to register?',
                [
                    { text: 'Register', onPress: () => router.replace('/register') },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        } else {
            Alert.alert('Could Not Send OTP', errorMessage);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <StatusBar style="dark" />
            <KeyboardAwareScrollView
                className="flex-1 bg-white"
                contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === "android" ? 40 : 24 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={Platform.OS === "android" ? 24 : 20}
                extraHeight={Platform.OS === "android" ? 120 : 75}
                keyboardOpeningTime={Platform.OS === "android" ? 0 : 250}
            >
                    <AuthHeader
                        title="Login"
                        subtitle="Don't have an account? "
                        actionLabel="Register"
                        actionHref="/register"
                    />

                    <View className="flex-1 px-6 pt-8">
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato">Mobile Number</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-5 flex-row items-center">
                            <Text className="text-[15px] text-black font-lato-bold mr-2">{COUNTRY_CODE}</Text>
                            <View className="w-[1px] h-5 bg-gray-200 mr-3" />
                            <TextInput
                                value={mobile}
                                onChangeText={(val) => dispatch(setMobile(cleanPhoneNumber(val)))}
                                placeholder="Phone Number"
                                placeholderTextColor="#aaa"
                                keyboardType="phone-pad"
                                maxLength={10}
                                className="flex-1 text-[15px] text-black font-lato"
                            />
                        </View>

                        {error && (
                            <Text className="text-red-500 text-[13px] mb-4 text-center">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleSendOtp}
                            disabled={loading}
                            className={`bg-[#4A43EC] rounded-2xl py-4 items-center mb-8 shadow-lg shadow-blue-500/30 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-[16px] font-lato-bold">Send OTP</Text>
                            )}
                        </TouchableOpacity>

                    </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
