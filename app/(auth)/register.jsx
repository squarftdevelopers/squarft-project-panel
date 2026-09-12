import { Text, View, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator, ScrollView } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    setFirstName,
    setLastName,
    setMobile,
    setCompanyName,
    setCompanyType,
    setReraNumber,
    setLocation,
    setBranch,
    setOtpFlow,
    clearError,
    clearAuthInputs,
    sendOtpThunk,
} from "../../store/slices/authSlice";
import AuthHeader from "../../components/AuthHeader";
import LocationMapPicker from "../../components/LocationMapPicker";
import { branchService } from "../../services/branchService";

const COUNTRY_CODE = "+91";

export default function Register() {
    const dispatch = useDispatch();
    const {
        firstName,
        lastName,
        mobile,
        companyName,
        reraNumber,
        location,
        branchId,
        branchName,
        loading,
        error,
    } = useSelector((state) => state.auth);
    const companyType = useSelector((state) => state.auth.companyType);
    const [showCompanyTypeDropdown, setShowCompanyTypeDropdown] = useState(false);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [mapPickerVisible, setMapPickerVisible] = useState(false);
    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [branchesError, setBranchesError] = useState('');
    const companyTypes = ["Builder", "Marketing"];

    useEffect(() => {
        dispatch(clearError());
        dispatch(clearAuthInputs());
    }, [dispatch]);

    useEffect(() => {
        const loadBranches = async () => {
            setBranchesLoading(true);
            setBranchesError('');
            try {
                const data = await branchService.getBranches();
                setBranches(data);
            } catch (err) {
                setBranchesError(err?.message || 'Unable to load branches');
            } finally {
                setBranchesLoading(false);
            }
        };
        loadBranches();
    }, []);

    const confirmMapAddress = (address) => {
        dispatch(setLocation(address.location));
        setMapPickerVisible(false);
    };

    const handleSendOtp = async () => {
        dispatch(clearError());

        if (!firstName || !lastName) {
            Alert.alert('Missing Information', 'Please enter your first and last name');
            return;
        }
        if (!companyName) {
            Alert.alert('Missing Information', 'Please enter your company name');
            return;
        }
        if (!companyType) {
            Alert.alert('Missing Information', 'Please select your company type');
            return;
        }
        if (!reraNumber) {
            Alert.alert('Missing Information', 'Please enter your RERA number');
            return;
        }
        if (!branchId) {
            Alert.alert('Missing Information', 'Please select your branch');
            return;
        }
        if (!location) {
            Alert.alert('Missing Information', 'Please enter your location');
            return;
        }
        if (mobile.length !== 10) {
            Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number');
            return;
        }

        const phone = `${COUNTRY_CODE}${mobile}`;
        dispatch(setOtpFlow('register'));
        const result = await dispatch(sendOtpThunk({ phone, purpose: 'register' }));

        if (sendOtpThunk.fulfilled.match(result)) {
            router.push("/otp-verification");
            return;
        }

        const errorMessage = String(result.payload || 'Failed to send OTP. Please try again.');
        if (errorMessage.toLowerCase().includes('already exists')) {
            Alert.alert(
                'Account Already Exists',
                'This phone number is already registered. Would you like to login instead?',
                [
                    { text: 'Go to Login', onPress: () => router.replace('/login') },
                    { text: 'Try Different Number', style: 'cancel' },
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
                className="flex-1"
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
                        title="Register"
                        subtitle="Already have an account? "
                        actionLabel="Log in"
                        actionHref="/login"
                    />

                    <View className="px-6 pt-6">
                        {/* First Name */}
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">First Name</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4">
                            <TextInput
                                value={firstName}
                                onChangeText={(val) => dispatch(setFirstName(val))}
                                placeholder="First Name"
                                placeholderTextColor="#aaa"
                                className="text-[15px] text-black font-lato"
                            />
                        </View>

                        {/* Last Name */}
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">Last Name</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4">
                            <TextInput
                                value={lastName}
                                onChangeText={(val) => dispatch(setLastName(val))}
                                placeholder="Last Name"
                                placeholderTextColor="#aaa"
                                className="text-[15px] text-black font-lato"
                            />
                        </View>

                        {/* Company Name */}
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">Company Name</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4">
                            <TextInput
                                value={companyName}
                                onChangeText={(val) => dispatch(setCompanyName(val))}
                                placeholder="Company Name"
                                placeholderTextColor="#aaa"
                                className="text-[15px] text-black font-lato"
                            />
                        </View>

                        {/* Company Type */}
                        <View className="z-[100]">
                            <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">Company Type</Text>
                            <TouchableOpacity
                                onPress={() => setShowCompanyTypeDropdown(!showCompanyTypeDropdown)}
                                className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center justify-between mb-4"
                            >
                                <Text className="text-[15px] text-black font-lato">{companyType ? companyType : 'Select Company Type'}</Text>
                                <Ionicons name={showCompanyTypeDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                            </TouchableOpacity>

                            {showCompanyTypeDropdown && (
                                <View className="absolute top-[56px] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-[101] overflow-hidden">
                                    {companyTypes.map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            onPress={() => {
                                                dispatch(setCompanyType(item));
                                                setShowCompanyTypeDropdown(false);
                                            }}
                                            className={`px-4 py-3 border-b border-gray-50`}
                                        >
                                            <Text className={`text-[13px] font-lato ${companyType === item ? 'text-[#4A43EC]' : 'text-gray-800'}`}>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Branch */}
                        <View className="z-[90]">
                            <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">Branch</Text>
                            <TouchableOpacity
                                onPress={() => setShowBranchDropdown(!showBranchDropdown)}
                                disabled={branchesLoading}
                                className="bg-white border border-gray-200 rounded-xl px-4 h-12 flex-row items-center justify-between mb-4"
                            >
                                <Text className="text-[15px] text-black font-lato">
                                    {branchesLoading ? 'Loading branches...' : (branchName || 'Select Branch')}
                                </Text>
                                <Ionicons name={showBranchDropdown ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                            </TouchableOpacity>

                            {branchesError && (
                                <Text className="text-red-500 text-[12px] mb-4 -mt-3">{branchesError}</Text>
                            )}

                            {showBranchDropdown && (
                                <View className="absolute top-[56px] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-[91] overflow-hidden max-h-56">
                                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                                        {branches.length === 0 ? (
                                            <View className="px-4 py-3">
                                                <Text className="text-[13px] font-lato text-gray-400">No branches available</Text>
                                            </View>
                                        ) : (
                                            branches.map((item) => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    onPress={() => {
                                                        dispatch(setBranch({ id: item.id, name: item.city ? `${item.name} — ${item.city}` : item.name }));
                                                        setShowBranchDropdown(false);
                                                    }}
                                                    className={`px-4 py-3 border-b border-gray-50`}
                                                >
                                                    <Text className={`text-[13px] font-lato ${branchId === item.id ? 'text-[#4A43EC]' : 'text-gray-800'}`}>
                                                        {item.city ? `${item.name} — ${item.city}` : item.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* RERA Number */}
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">RERA Number</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4">
                            <TextInput
                                value={reraNumber}
                                onChangeText={(val) => dispatch(setReraNumber(val))}
                                placeholder="RERA Number"
                                placeholderTextColor="#aaa"
                                className="text-[15px] text-black font-lato"
                            />
                        </View>

                        {/* Mobile */}
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">Phone Number</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                            <Text className="text-[15px] text-black font-lato-bold mr-2">{COUNTRY_CODE}</Text>
                            <View className="w-[1px] h-5 bg-gray-200 mr-3" />
                            <TextInput
                                value={mobile}
                                onChangeText={(val) => dispatch(setMobile(val.replace(/[^0-9]/g, '').slice(0, 10)))}
                                placeholder="Phone Number"
                                placeholderTextColor="#aaa"
                                keyboardType="phone-pad"
                                maxLength={10}
                                className="flex-1 text-[15px] text-black font-lato"
                            />
                        </View>

                        {/* Location */}
                        <Text className="text-gray-500 text-[13px] mb-1.5 font-lato-bold">Location</Text>
                        <View className="border border-gray-200 rounded-xl px-4 py-3 mb-4 flex-row items-center">
                            <TextInput
                                value={location}
                                onChangeText={(val) => dispatch(setLocation(val))}
                                placeholder="Location"
                                placeholderTextColor="#aaa"
                                className="flex-1 text-[15px] text-black font-lato"
                            />
                            <TouchableOpacity
                                onPress={() => setMapPickerVisible(true)}
                                className="w-8 h-8 rounded-lg bg-[#EBEAFF] items-center justify-center"
                            >
                                <Ionicons name="map-outline" size={17} color="#4A43EC" />
                            </TouchableOpacity>
                        </View>
                        <LocationMapPicker
                            visible={mapPickerVisible}
                            initialAddress={{ location }}
                            onClose={() => setMapPickerVisible(false)}
                            onConfirm={confirmMapAddress}
                        />

                        {error && (
                            <Text className="text-red-500 text-[13px] mb-4 text-center">{error}</Text>
                        )}

                        <TouchableOpacity
                            onPress={handleSendOtp}
                            disabled={loading}
                            className={`bg-[#4A43EC] rounded-2xl py-4 items-center mb-6 shadow-lg shadow-blue-500/30 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-[16px] font-lato-bold">Send OTP</Text>
                            )}
                        </TouchableOpacity>

                        <View className="items-center justify-center pt-2 pb-8">
                            <Text className="text-center text-xs text-gray-400 font-lato leading-5">
                                By registering, you agree to our{"\n"}
                                <Text
                                    onPress={() => router.push("/(screens)/terms-and-conditions")}
                                    className="font-bold text-[#4A43EC]"
                                >
                                    Terms & Conditions
                                </Text>
                                {" "}and{" "}
                                <Text
                                    onPress={() => router.push("/(screens)/privacy-policy")}
                                    className="font-bold text-[#4A43EC]"
                                >
                                    Privacy Policy
                                </Text>
                            </Text>
                        </View>
                    </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
