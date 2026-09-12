import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ProjectPanelTermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8F9FE]">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-200"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-lato-bold text-gray-900">
          Terms & Conditions
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        className="px-5"
      >
        {/* Header Card */}
        <View className="bg-white rounded-2xl p-5 border border-gray-200 mt-4 mb-4 shadow-xs">
          <View className="flex-row items-center mb-2">
            <View className="px-2.5 py-1 rounded-full bg-[#E9E8FF] border border-[#D0CDFE] mr-2">
              <Text className="text-[11px] font-lato-bold text-[#3D30F2]">
                PROJECT PANEL
              </Text>
            </View>
            <Text className="text-xs font-lato text-gray-500">
              Effective: September 2026
            </Text>
          </View>
          <Text className="text-base font-lato-bold text-gray-900 leading-snug">
            Developer Organization & Project Panel Terms
          </Text>
          <Text className="text-xs font-lato text-gray-500 mt-1">
            Operated by squarFT by Paxtrade Global Pvt. Ltd.
          </Text>
        </View>

        {/* Developer Terms Callout */}
        <View className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 mb-5">
          <View className="flex-row items-center mb-2">
            <Ionicons name="business" size={18} color="#3730A3" />
            <Text className="text-xs font-lato-bold text-indigo-900 ml-1.5 uppercase tracking-wide">
              Developer Organization Rules
            </Text>
          </View>
          <Text className="text-xs font-lato text-indigo-950 leading-relaxed">
            Only authorized organization and project users may access permitted records. Project and inventory drafts require Admin verification before live publication.
          </Text>
          <Text className="text-xs font-lato text-indigo-950 leading-relaxed mt-2 font-lato-bold">
            Payment Recording Standard: Recording a payment means recording an amount actually received against the Admin-created milestone schedule. Duplicate references, test entries, and double-posting are strictly prohibited.
          </Text>
        </View>

        {/* Section 1 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            1. Acceptance and Scope
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            These Terms govern access to and use of this Squar FT Project Panel application. By registering, logging in or using the app, you agree to these Terms and the Privacy Policy. Permitted records synchronize with Admin, support, project, visit, deal, and payment reconciliation modules.
          </Text>
        </View>

        {/* Section 2 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            2. Eligibility and Account Security
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            You must provide accurate corporate and representative information, use an authorized corporate mobile number, keep OTPs confidential, and promptly report unauthorized access. OTP verification confirms control of a phone number; it does not by itself guarantee legal authorization, project approval, or regulatory compliance.
          </Text>
        </View>

        {/* Section 3 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            3. Accurate Information and Documents
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Project details, RERA registrations, layout plans, pricing schedules, unit availability, media, and payment receipts must be accurate and lawfully submitted. Uploading forged, misleading, or unauthorized materials is strictly forbidden and may result in immediate suspension.
          </Text>
        </View>

        {/* Section 4 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            4. Platform Records and Approvals
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Submitted projects and inventory undergo Admin verification. A draft submission is not an active public listing. Displayed statuses and notifications do not replace legal, architectural, structural, or regulatory due diligence under applicable state RERA rules.
          </Text>
        </View>

        {/* Section 5 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            5. Acceptable Use
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Do not attempt unauthorized access, bypass organization or project-level boundaries, interfere with platform security, scrape data at scale, or misrepresent pricing, payment reconciliation, or unit availability.
          </Text>
        </View>

        {/* Section 6 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            6. Third-Party Services
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            The Project Panel utilizes maps, OTP gateways, push messaging, cloud media storage, and banking reconciliation references provided by third parties, which operate under their respective operational policies.
          </Text>
        </View>

        {/* Section 7 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            7. Availability and Changes
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Features may be updated, restricted, or temporarily paused for security audits, legal compliance, or product upgrades. The current effective terms are always maintained in-app and on the public website.
          </Text>
        </View>

        {/* Section 8 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            8. Suspension and Termination
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Developer organization access may be suspended for compliance failures, fraudulent payment recording, RERA revocation, or policy breaches. Account closure is subject to open deal obligations.
          </Text>
        </View>

        {/* Section 9 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            9. Intellectual Property
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            The platform, brand, codebase, and interfaces belong to squarFT by Paxtrade Global Pvt. Ltd.. The developer grants Squar FT a license to display submitted project media, floor plans, and pricing for marketing and buyer discovery.
          </Text>
        </View>

        {/* Section 10 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            10. Governing Law
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            These Terms are governed by the laws of India. Any dispute arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in Indore, Madhya Pradesh, India.
          </Text>
        </View>

        {/* Footer Links */}
        <View className="flex-row items-center justify-between p-4 bg-gray-100 rounded-xl mt-2">
          <Pressable
            onPress={() => router.push("/(screens)/privacy-policy")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-lato-bold text-[#3D30F2] mr-1">
              Privacy Policy
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#3D30F2" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(screens)/contact-us")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-lato-bold text-gray-700 mr-1">
              Support Desk
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#4B5563" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
