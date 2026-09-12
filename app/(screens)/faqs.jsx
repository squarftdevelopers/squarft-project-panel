import React, { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const FAQS_DATA = [
  {
    id: "1",
    question: "Who can register on the Project Panel?",
    answer: "The supported account types are Developer or Marketing Agency organizations, with designated responsible personnel mapped to authorized system access."
  },
  {
    id: "2",
    question: "Why can't I log in after registration?",
    answer: "Organization KYC and activation require administrative approval. OTP login is permitted only after your organization account is officially verified and activated by Admin."
  },
  {
    id: "3",
    question: "Can one organization manage multiple projects?",
    answer: "Yes, a single approved Developer or Agency organization can create and manage multiple projects within the same dashboard."
  },
  {
    id: "4",
    question: "A Field Officer already created our organization. What should we do?",
    answer: "Use the same mapped mobile number and organization profile instead of registering a duplicate entity. Contact your assigned Field Officer or Support if access needs to be linked."
  },
  {
    id: "5",
    question: "Why is my project not visible to buyers on the platform?",
    answer: "Unverified project drafts and inventory are excluded from public discovery until comprehensive Admin verification, legal check, and live publication are completed."
  },
  {
    id: "6",
    question: "What project information and documents are required?",
    answer: "The project workflow requires project identity, map location coordinates, primary contacts, regulatory approvals (RERA), inventory units, pricing structures, marketing media, and required declarations."
  },
  {
    id: "7",
    question: "Can I change or update an already approved project?",
    answer: "Changes depend on user permissions and the current verification state. Minor updates may update directly, while material changes to pricing, inventory, or approvals may require Admin review."
  },
  {
    id: "8",
    question: "Where do I see scheduled visits and ongoing buyer deals?",
    answer: "Select your project and open the 'Visits' and 'Deals' tabs to view synchronized buyer itineraries, assigned Sales Officers, and current deal milestones."
  },
  {
    id: "9",
    question: "Who creates the deal and payment schedule?",
    answer: "Authoritative deals and payment milestone schedules are created and owned by Squar FT Admin Deal Management. Authorized project panel users record actual payments collected against those schedules."
  },
  {
    id: "10",
    question: "How do I record a payment received from a buyer?",
    answer: "Open the relevant deal's payment schedule, choose full or partial payment, enter the payment mode, transaction reference, date received, and upload the payment receipt."
  },
  {
    id: "11",
    question: "Why was a recorded payment rejected or disputed?",
    answer: "Common causes include duplicate transaction references, amount exceeding milestone due, stale payment status, invalid bank receipt, or reconciliation mismatch during Admin audit."
  },
  {
    id: "12",
    question: "How do I get help with project approvals or payment reconciliation?",
    answer: "Raise a contextual support ticket under 'Project Approval' or 'Payment Reconciliation' so the support team can immediately review the linked project and transaction logs."
  }
];

export default function ProjectPanelFAQsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState({ "1": true });

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS_DATA;
    const q = searchQuery.toLowerCase();
    return FAQS_DATA.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8F9FE]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-200"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-lato-bold text-gray-900">
          Project Panel FAQs
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Search Bar */}
        <View className="px-5 pt-5 pb-2">
          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search developer questions..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2.5 text-sm font-lato text-gray-900"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Subtitle */}
        <View className="px-5 pt-3 pb-4">
          <Text className="text-xs font-lato text-gray-500 uppercase tracking-wider">
            Developer & Agency Knowledge Base ({filteredFaqs.length} Questions)
          </Text>
        </View>

        {/* Accordion List */}
        <View className="px-5">
          {filteredFaqs.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200 mt-2">
              <Ionicons name="help-circle-outline" size={44} color="#D1D5DB" />
              <Text className="text-base font-lato-bold text-gray-800 mt-3">
                No matching answers
              </Text>
              <Text className="text-xs font-lato text-gray-500 text-center mt-1">
                Try searching with different keywords or submit an Admin ticket.
              </Text>
              <Pressable
                onPress={() => setSearchQuery("")}
                className="mt-4 px-4 py-2 bg-gray-100 rounded-lg"
              >
                <Text className="text-xs font-lato-bold text-gray-700">Clear Search</Text>
              </Pressable>
            </View>
          ) : (
            filteredFaqs.map((item, index) => {
              const isExpanded = !!expandedIds[item.id];
              return (
                <View
                  key={item.id}
                  className="bg-white rounded-xl mb-3 border border-gray-200 overflow-hidden shadow-xs"
                >
                  <Pressable
                    onPress={() => toggleExpand(item.id)}
                    className="p-4 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 pr-3">
                      <View className="w-6 h-6 rounded-full bg-[#E9E8FF] items-center justify-center mr-3">
                        <Text className="text-xs font-lato-bold text-[#3D30F2]">
                          {index + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm font-lato-bold text-gray-900 leading-snug">
                        {item.question}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#6B7280"
                    />
                  </Pressable>

                  {isExpanded && (
                    <View className="px-4 pb-4 pt-1 border-t border-gray-100 bg-[#FAFAFF]">
                      <Text className="text-xs font-lato text-gray-600 leading-relaxed">
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Contact Support Card */}
        <View className="mx-5 mt-6 p-5 bg-[#E9E8FF]/80 rounded-2xl border border-[#D0CDFE]">
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-[#3D30F2]/15 items-center justify-center mr-3.5">
              <Ionicons name="briefcase-outline" size={20} color="#3D30F2" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-lato-bold text-gray-900">
                Developer Support & Reconciliation Desk
              </Text>
              <Text className="text-xs font-lato text-gray-600 mt-1 leading-relaxed">
                Connect with our operations team for project listing verification, inventory updates, and payment audit support.
              </Text>
              <Pressable
                onPress={() => router.push("/(screens)/contact-us")}
                className="mt-3.5 bg-[#3D30F2] self-start px-4 py-2 rounded-lg active:opacity-80 flex-row items-center"
              >
                <Text className="text-xs font-lato-bold text-white mr-1.5">
                  Open Support Desk
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
