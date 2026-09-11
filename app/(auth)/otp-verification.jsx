import { Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    setOtpDigit,
    clearOtp,
    setLoggedIn,
    clearError,
    sendOtpThunk,
    verifyOtpThunk,
    registerThunk,
    loginThunk,
    fetchDeveloperKyc,
} from "../../store/slices/authSlice";

const logo = require("../../assets/icons/app-icon.png");

const COUNTRY_CODE = "+91";

export default function OtpVerification() {
    const dispatch = useDispatch();
    const {
        otp,
        otpFlow,
        otpToken,
        mobile,
        firstName,
        lastName,
        companyName,
        companyType,
        reraNumber,
        location,
        branchId,
        loading,
        error,
    } = useSelector((state) => state.auth);
    const inputs = useRef([]);
    const autoSubmittedRef = useRef(false);

    useEffect(() => {
        dispatch(clearError());
        autoSubmittedRef.current = false;
        const focusTimeout = setTimeout(() => inputs.current[0]?.focus(), 300);
        return () => clearTimeout(focusTimeout);
    }, [dispatch]);

    const handleChange = (text, index) => {
        const digits = text.replace(/[^0-9]/g, '');

        if (digits.length > 1) {
            digits.slice(0, 6).split('').forEach((d, i) => {
                dispatch(setOtpDigit({ index: i, value: d }));
            });
            const lastFilledIndex = Math.min(digits.length, 6) - 1;
            if (digits.length < 6) {
                inputs.current[lastFilledIndex + 1]?.focus();
            } else {
                Keyboard.dismiss();
            }
            return;
        }

        const digit = digits.slice(-1);
        dispatch(setOtpDigit({ index, value: digit }));
        if (digit && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = useCallback(async () => {
        dispatch(clearError());
        const otpString = otp.join('');
        if (otpString.length !== 6) return;

        const result = await dispatch(verifyOtpThunk({ otp_token: otpToken, otp: otpString }));
        if (!verifyOtpThunk.fulfilled.match(result)) return;

        const verifiedToken = result.payload.verified_token;

        if (otpFlow === 'login') {
            const loginResult = await dispatch(loginThunk(verifiedToken));
            if (loginThunk.fulfilled.match(loginResult)) {
                dispatch(clearOtp());
                dispatch(setLoggedIn(true));
                // isKycCompleted defaults to false and (tabs)/_layout.jsx hard-redirects
                // to /kyc whenever it's false - without this, that redirect fired on
                // every single login (even for already-approved developers) because
                // nothing had fetched their real KYC status yet at that point. Wait for
                // it here so the redirect gate sees accurate data before it evaluates.
                await dispatch(fetchDeveloperKyc());
                router.replace("/(tabs)/home");
            }
            return;
        }

        // otpFlow === 'register'
        const registerResult = await dispatch(registerThunk({
            verified_token: verifiedToken,
            first_name: firstName,
            last_name: lastName,
            company_name: companyName,
            company_type: companyType,
            rera_number: reraNumber,
            location,
            branch_id: branchId,
        }));

        if (registerThunk.fulfilled.match(registerResult)) {
            dispatch(clearOtp());
            dispatch(setLoggedIn(true));
            router.replace("/(tabs)/home");
        }
    }, [otp, otpToken, otpFlow, firstName, lastName, companyName, companyType, reraNumber, location, branchId, dispatch]);

    // Auto-submit once all 6 digits are present (covers paste + OS autofill).
    useEffect(() => {
        const otpString = otp.join('');
        if (otpString.length === 6 && !loading && !autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            handleVerify();
        }
        if (otpString.length < 6) {
            autoSubmittedRef.current = false;
        }
    }, [otp, loading, handleVerify]);

    const handleResend = async () => {
        dispatch(clearError());
        dispatch(clearOtp());
        autoSubmittedRef.current = false;
        await dispatch(sendOtpThunk({ phone: `${COUNTRY_CODE}${mobile}`, purpose: otpFlow }));
        inputs.current[0]?.focus();
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 40}
            >
                <View className="bg-[#4A43EC] pt-12 pb-10 px-6">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mb-4"
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>

                    <View style={{ width: 60, height: 60, overflow: 'hidden' }} className="mb-4">
                        <Image source={logo} style={{ width: 110, height: 110, margin: -20 }} resizeMode="contain" />
                    </View>
                    <Text className="text-white text-[32px] font-lato-bold mb-1">Verification</Text>
                    <Text className="text-white/80 text-[14px] font-lato">{"We've sent a 6-digit code to your mobile number"}</Text>
                </View>

                <View className="flex-1 bg-white px-6 pt-12">
                    <View className="flex-row justify-between mb-10">
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputs.current[index] = ref)}
                                value={digit}
                                onChangeText={(text) => handleChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                textContentType={index === 0 ? "oneTimeCode" : "none"}
                                autoComplete={index === 0 ? "sms-otp" : "off"}
                                importantForAutofill={index === 0 ? "yes" : "no"}
                                maxLength={index === 0 ? 6 : 1}
                                style={{
                                    width: 48,
                                    height: 56,
                                    borderWidth: 1,
                                    borderColor: digit ? '#4A43EC' : '#E5E7EB',
                                    borderRadius: 14,
                                    textAlign: 'center',
                                    fontSize: 20,
                                    fontFamily: 'Lato_700Bold',
                                    color: '#000',
                                }}
                            />
                        ))}
                    </View>

                    {error && (
                        <Text className="text-red-500 text-[13px] mb-6 text-center">{error}</Text>
                    )}

                    <TouchableOpacity
                        onPress={handleVerify}
                        disabled={loading}
                        className={`bg-[#4A43EC] rounded-2xl py-4 items-center mb-6 shadow-lg shadow-blue-500/30 ${loading ? 'opacity-70' : ''}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white text-[16px] font-lato-bold uppercase tracking-wider">Continue</Text>
                        )}
                    </TouchableOpacity>

                    <View className="flex-row justify-center items-center">
                        <Text className="text-gray-500 text-[14px] font-lato">{"Didn't receive code? "}</Text>
                        <TouchableOpacity onPress={handleResend} disabled={loading}>
                            <Text className="text-[#4A43EC] text-[14px] font-lato-bold">Resend OTP</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
