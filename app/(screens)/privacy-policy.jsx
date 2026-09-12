import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ProjectPanelPrivacyScreen() {
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
          Privacy Policy
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
                DEVELOPER PRIVACY
              </Text>
            </View>
            <Text className="text-xs font-lato text-gray-500">
              Effective: September 2026
            </Text>
          </View>
          <Text className="text-base font-lato-bold text-gray-900 leading-snug">
            Developer & Project Organization Privacy Policy
          </Text>
          <Text className="text-xs font-lato text-gray-500 mt-1">
            squarFT by Paxtrade Global Pvt. Ltd.
          </Text>
        </View>

        {/* Data Scope Highlight Card */}
        <View className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5">
          <View className="flex-row items-center mb-2">
            <Ionicons name="shield" size={18} color="#334155" />
            <Text className="text-xs font-lato-bold text-slate-800 ml-1.5 uppercase tracking-wide">
              Project Panel Data Processing Scope
            </Text>
          </View>
          <Text className="text-xs font-lato text-slate-700 leading-relaxed">
            The Project Panel processes:
          </Text>
          <View className="mt-2 space-y-1">
            <Text className="text-xs font-lato text-slate-700">
              • Organization type, name, registered address, and authorized representative KYC
            </Text>
            <Text className="text-xs font-lato text-slate-700">
              • Project identity, location coordinates, RERA approvals, and certificates
            </Text>
            <Text className="text-xs font-lato text-slate-700">
              • Inventory units, floor configurations, pricing, and finance rules
            </Text>
            <Text className="text-xs font-lato text-slate-700">
              • Marketing media, brochure documents, and developer declarations
            </Text>
            <Text className="text-xs font-lato text-slate-700">
              • Synchronized buyer visit records and deal progression views
            </Text>
            <Text className="text-xs font-lato text-slate-700">
              • Admin-created milestone schedules and actual payment collection receipts
            </Text>
          </View>
        </View>

        {/* Section 1 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            1. What this Policy Covers
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            This Privacy Policy explains how organizational, project, and financial data are handled when utilizing the Squar FT Project Panel and associated developer integration services.
          </Text>
        </View>

        {/* Section 2 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            2. Common Operational Data Processed
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Data includes representative phone numbers and OTP verification logs; authorized user profiles; device session and security telemetry; notification configurations; developer support tickets; and platform audit entries.
          </Text>
        </View>

        {/* Section 3 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            3. Purpose of Processing
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            We use this data to authenticate authorized personnel, verify organization credentials, inspect and approve project submissions, synchronize inventory availability, display buyer visit itineraries, reconcile payment milestones against receipts, and meet statutory regulatory obligations.
          </Text>
        </View>

        {/* Section 4 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            4. Access Control & Confidentiality
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Organization records are restricted to designated organization members and authorized Squar FT administrators. Internal access is logged and governed by role-based privilege controls.
          </Text>
        </View>

        {/* Section 5 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            5. Payment Reconciliation & Audit Records
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Payment receipt uploads, bank references, and reconciliation audit logs are maintained with strict integrity safeguards to prevent tampering, misallocation, or duplicate entries.
          </Text>
        </View>

        {/* Section 6 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            6. Data Retention
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Project approvals, deal histories, payment logs, and compliance filings are retained in accordance with applicable Indian real estate laws (RERA) and corporate tax compliance mandates.
          </Text>
        </View>

        {/* Section 7 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            7. Organization Rights & Inquiries
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            Authorized representatives may request profile corrections or access history by writing to privacy@squarft.com. Project closure or account termination is subject to active deal and buyer milestone reconciliation.
          </Text>
        </View>

        {/* Section 8 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-3 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            8. Device Permissions
          </Text>
          <View className="space-y-1.5 mt-1">
            <Text className="text-xs font-lato text-gray-600">
              • <Text className="font-lato-bold text-gray-800">Camera / Media:</Text> Used to upload project photos, brochures, approvals, and payment receipts.
            </Text>
            <Text className="text-xs font-lato text-gray-600">
              • <Text className="font-lato-bold text-gray-800">Location:</Text> Used to accurately pin project and site boundaries on the platform map.
            </Text>
            <Text className="text-xs font-lato text-gray-600">
              • <Text className="font-lato-bold text-gray-800">Notifications:</Text> Real-time alerts on project verification, visit bookings, and payment audit notes.
            </Text>
          </View>
        </View>

        {/* Section 9 */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4 shadow-xs">
          <Text className="text-sm font-lato-bold text-gray-900 mb-1.5">
            9. Grievance Officer & Official Inquiries
          </Text>
          <Text className="text-xs font-lato text-gray-600 leading-relaxed">
            For compliance inquiries, corporate data requests, or privacy concerns, contact:
          </Text>
          <Text className="text-xs font-lato-bold text-gray-800 mt-2">
            Compliance & Grievance Officer: Squar FT Corporate Desk
          </Text>
          <Text className="text-xs font-lato text-gray-600">
            Email: privacy@squarft.com
          </Text>
          <Text className="text-xs font-lato text-gray-600">
            Address: 214/Sadhguru Pariyan , Vijay nagar, Indore
          </Text>
        </View>

        {/* Footer Links */}
        <View className="flex-row items-center justify-between p-4 bg-gray-100 rounded-xl mt-2">
          <Pressable
            onPress={() => router.push("/(screens)/terms-and-conditions")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-lato-bold text-[#3D30F2] mr-1">
              Terms & Conditions
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#3D30F2" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/(screens)/faqs")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-lato-bold text-gray-700 mr-1">
              View FAQs
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#4B5563" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
