import { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, ScrollView, Alert, StatusBar, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import { logout as logoutAction, setUser } from "../../store/slices/authSlice";
import { clearProjects } from "../../store/slices/projectsSlice";
import { resetInventory } from "../../store/slices/inventorySlice";
import { clearNotifications } from "../../store/slices/notificationSlice";
import { authService } from "../../services/authService";
import { profileService } from "../../services/profileService";
import { useRouter } from "expo-router";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Avatar from "../../components/Avatar";

const KYC_BADGE = {
    approved: { label: "KYC Approved", color: "#10B981", bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-300" },
    verified: { label: "KYC Approved", color: "#10B981", bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-300" },
    rejected: { label: "KYC Rejected", color: "#F87171", bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-300" },
    under_review: { label: "KYC Under Review", color: "#FBBF24", bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-300" },
    pending: { label: "KYC Pending", color: "#FBBF24", bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-300" },
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function Settings() {
    const router = useRouter();
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();

    // Get logged-in user data from Redux store
    const user = useSelector((state) => state.auth.user);

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    useEffect(() => {
        let isMounted = true;
        profileService.getMyProfile()
            .then((data) => { if (isMounted) setProfile(data); })
            .catch((error) => console.log("[SETTINGS] Failed to load full profile:", error?.message))
            .finally(() => { if (isMounted) setLoadingProfile(false); });
        return () => { isMounted = false; };
    }, []);

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out of SquarFT Project Panel?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await authService.logout();
                            dispatch(logoutAction());
                            dispatch(clearProjects());
                            dispatch(resetInventory());
                            dispatch(clearNotifications());
                            router.replace("/(auth)/login");
                        } catch (error) {
                            console.error("Logout error:", error);
                            Alert.alert("Error", "Failed to log out. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action is permanent and cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setDeletingAccount(true);
                        try {
                            await profileService.deleteAccount();
                            await authService.logout();
                            dispatch(logoutAction());
                            dispatch(clearProjects());
                            dispatch(resetInventory());
                            dispatch(clearNotifications());
                            router.replace("/(auth)/login");
                        } catch (error) {
                            console.error("Delete account error:", error);
                            Alert.alert("Delete failed", error?.message || "Failed to delete account. Please try again.");
                        } finally {
                            setDeletingAccount(false);
                        }
                    }
                }
            ]
        );
    };

    if (!user) {
        return (
            <View className="flex-1 bg-[#F8F9FE] items-center justify-center p-5">
                <Text className="text-gray-500 font-lato mb-4">No active user session found.</Text>
                <TouchableOpacity
                    onPress={() => router.replace("/(auth)/login")}
                    className="border border-gray-200 bg-white px-6 py-3 rounded-2xl"
                >
                    <Text className="text-gray-700 font-lato-bold">Go to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const displayName = profile?.full_name?.trim()
        || [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
        || user.full_name
        || user.name
        || null;
    const avatarUrl = profile?.profilePictureUrl || profile?.avatar_url || user.profilePictureUrl || user.avatar_url;
    const displayPhone = profile?.phone || user.phone || user.mobile;
    const displayEmail = profile?.email && profile.email !== "No email provided" ? profile.email : null;
    const companyName = profile?.company_name || user.company_name;
    const reraNumber = profile?.rera_number || user.rera_number;
    const location = profile?.location || user.location;
    const branch = profile?.branch;
    const memberSince = formatDate(profile?.created_at);
    const kycBadge = profile?.kyc_status ? KYC_BADGE[String(profile.kyc_status).toLowerCase()] : null;

    const handleChangePhoto = () => {
        Alert.alert(
            "Profile Photo",
            "Take a new photo or upload one from your gallery.",
            [
                { text: "Take Photo", onPress: () => pickAndUpload(true) },
                { text: "Upload from Gallery", onPress: () => pickAndUpload(false) },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    const pickAndUpload = async (useCamera) => {
        const permission = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permission.status !== "granted") {
            Alert.alert("Permission needed", useCamera ? "Camera permission is required." : "Photo library permission is required.");
            return;
        }

        const result = useCamera
            ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

        if (result.canceled) return;

        setUploadingPhoto(true);
        try {
            const updated = await profileService.updateProfilePicture(result.assets[0]);
            const newAvatarUrl = updated?.profilePictureUrl || updated?.avatar_url || null;
            setProfile((current) => ({ ...current, profilePictureUrl: newAvatarUrl, avatar_url: newAvatarUrl }));
            dispatch(setUser({ ...user, profilePictureUrl: newAvatarUrl, avatar_url: newAvatarUrl }));
        } catch (error) {
            Alert.alert("Upload Failed", error?.message || "Unable to update your profile photo.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <View className="flex-1 bg-[#F8F9FE]">
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={["#4A43EC", "#3D30F2"]}
                style={{
                    paddingTop: Math.max(insets.top, 20) + 16,
                    paddingBottom: 24,
                    paddingHorizontal: 20,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                    borderBottomWidth: 1,
                    borderBottomColor: "#3D30F2"
                }}
            >
                <View className="flex-row items-center gap-3 mb-6">
                    <TouchableOpacity onPress={() => router.back()} className="p-1">
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-lato-bold">Profile</Text>
                </View>

                {/* Profile Card Info */}
                <View className="flex-row items-center gap-4">
                    <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto} activeOpacity={0.85} className="relative">
                        <Avatar
                            uri={avatarUrl}
                            name={displayName}
                            className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30"
                            textClassName="text-white text-2xl font-lato-bold"
                        />
                        <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white items-center justify-center border-2 border-[#4A43EC]">
                            {uploadingPhoto ? (
                                <ActivityIndicator size="small" color="#4A43EC" />
                            ) : (
                                <Ionicons name="camera" size={12} color="#4A43EC" />
                            )}
                        </View>
                    </TouchableOpacity>
                    <View className="flex-1">
                        {displayName && <Text className="text-white text-lg font-lato-bold">{displayName}</Text>}
                        {companyName && <Text className="text-white/80 text-xs font-lato-medium mt-0.5">{companyName}</Text>}
                        {kycBadge && (
                            <View className="flex-row items-center mt-1.5">
                                <View className={`${kycBadge.bg} border ${kycBadge.border} px-2 py-0.5 rounded-md flex-row items-center gap-1`}>
                                    <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: kycBadge.color }} />
                                    <Text className={`${kycBadge.text} text-[10px] font-lato-bold uppercase tracking-wider`}>
                                        {kycBadge.label}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
                className="flex-1"
            >
                {loadingProfile && (
                    <View className="items-center py-4">
                        <ActivityIndicator color="#4A43EC" />
                    </View>
                )}

                {/* Account Details Card - thin border instead of shadow */}
                <View className="bg-white rounded-3xl border border-gray-200 p-5 mb-6">
                    <Text className="text-gray-900 text-[15px] font-lato-bold mb-4">Account Details</Text>

                    {displayPhone && (
                        <View className="flex-row items-center gap-4 py-3 border-b border-gray-100">
                            <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center">
                                <Feather name="phone" size={16} color="#4A43EC" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">Phone Number</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">{displayPhone}</Text>
                            </View>
                        </View>
                    )}

                    {displayEmail && (
                        <View className="flex-row items-center gap-4 py-3 border-b border-gray-100">
                            <View className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 items-center justify-center">
                                <Feather name="mail" size={16} color="#6366F1" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">Email</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">{displayEmail}</Text>
                            </View>
                        </View>
                    )}

                    {companyName && (
                        <View className="flex-row items-center gap-4 py-3 border-b border-gray-100">
                            <View className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 items-center justify-center">
                                <Feather name="briefcase" size={16} color="#A855F7" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">Company Name</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">{companyName}</Text>
                            </View>
                        </View>
                    )}

                    {location && (
                        <View className="flex-row items-center gap-4 py-3 border-b border-gray-100">
                            <View className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 items-center justify-center">
                                <Feather name="map-pin" size={16} color="#F97316" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">Location</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">{location}</Text>
                            </View>
                        </View>
                    )}

                    {reraNumber && (
                        <View className="flex-row items-center gap-4 py-3 border-b border-gray-100">
                            <View className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center">
                                <Feather name="award" size={16} color="#10B981" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">RERA Registration</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">{reraNumber}</Text>
                            </View>
                        </View>
                    )}

                    {branch?.name && (
                        <View className="flex-row items-center gap-4 py-3 border-b border-gray-100">
                            <View className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 items-center justify-center">
                                <MaterialCommunityIcons name="office-building-outline" size={16} color="#06B6D4" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">Branch</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">
                                    {branch.city ? `${branch.name} — ${branch.city}` : branch.name}
                                </Text>
                            </View>
                        </View>
                    )}

                    {memberSince && (
                        <View className="flex-row items-center gap-4 py-3">
                            <View className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 items-center justify-center">
                                <Feather name="calendar" size={16} color="#6B7280" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider">Member Since</Text>
                                <Text className="text-gray-800 text-[14px] font-lato-medium mt-0.5">{memberSince}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* KYC Status Card */}
                {profile?.kyc_status && (
                    <TouchableOpacity
                        onPress={() => router.push("/(screens)/kyc-details")}
                        activeOpacity={0.85}
                        className="bg-white rounded-3xl border border-gray-200 p-5 mb-6 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center gap-3 flex-1">
                            <View
                                className="w-9 h-9 rounded-xl items-center justify-center border"
                                style={{ backgroundColor: `${kycBadge?.color}20`, borderColor: `${kycBadge?.color}40` }}
                            >
                                <MaterialCommunityIcons name="shield-check-outline" size={18} color={kycBadge?.color || "#6B7280"} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-900 text-[14px] font-lato-bold">{kycBadge?.label || "KYC Status"}</Text>
                                {profile.kyc_status?.toLowerCase() === "rejected" && profile.kyc_rejection_reason ? (
                                    <Text className="text-red-500 text-[11px] font-lato mt-0.5" numberOfLines={2}>{profile.kyc_rejection_reason}</Text>
                                ) : (
                                    <Text className="text-gray-400 text-[11px] font-lato mt-0.5">Tap to view details</Text>
                                )}
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                )}

                {/* Support & Legal Card */}
                <View className="bg-white rounded-3xl border border-gray-200 p-5 mb-6">
                    <Text className="text-gray-400 text-[11px] font-lato-bold uppercase tracking-wider mb-2">Support & Legal</Text>
                    {[
                        { label: "Terms & Conditions", icon: "file-document-outline" },
                        { label: "Privacy Policy", icon: "shield-check-outline" },
                        { label: "Contact Us", icon: "phone-outline" },
                        { label: "FAQs", icon: "help-circle-outline" },
                    ].map((item, index) => (
                        <TouchableOpacity
                            key={item.label}
                            onPress={() => router.push({ pathname: "/(screens)/coming-soon", params: { title: item.label } })}
                            className={`flex-row items-center py-3.5 ${index > 0 ? "border-t border-gray-100" : ""}`}
                        >
                            <View className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 items-center justify-center">
                                <MaterialCommunityIcons name={item.icon} size={18} color="#4A43EC" />
                            </View>
                            <Text className="flex-1 ml-3 text-[14px] font-lato-medium text-gray-800">{item.label}</Text>
                            <Feather name="chevron-right" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout Button - thin border instead of shadow */}
                <TouchableOpacity
                    onPress={handleLogout}
                    disabled={deletingAccount}
                    activeOpacity={0.8}
                    className="bg-white border border-rose-200 rounded-3xl py-4 flex-row items-center justify-center gap-2 mb-3"
                >
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    <Text className="text-rose-500 text-[15px] font-lato-bold">Log Out</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                    activeOpacity={0.8}
                    className="bg-rose-50 border border-rose-200 rounded-3xl py-4 flex-row items-center justify-center gap-2 mb-8"
                >
                    {deletingAccount ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                        <>
                            <Ionicons name="trash-outline" size={18} color="#DC2626" />
                            <Text className="text-rose-600 text-[15px] font-lato-bold">Delete Account</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
