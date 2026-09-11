import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from "react-native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { dealService } from "../services/dealService";
import ImageLightbox from "./ImageLightbox";

const { width } = Dimensions.get("window");

const AMENITY_ICONS = {
    "Gymnasium": { icon: "dumbbell", color: "#4A43EC" },
    "Swimming Pool": { icon: "pool", color: "#4A43EC" },
    "24/7 Security": { icon: "shield-check-outline", color: "#4A43EC" },
    "Power Backup": { icon: "lightning-bolt", color: "#4A43EC" },
    Landscaping: { icon: "tree-outline", color: "#4A43EC" },
    "Car Parking": { icon: "car-outline", color: "#4A43EC" },
    "Sports Court": { icon: "tennis", color: "#4A43EC" },
    "Wi-Fi Zone": { icon: "wifi", color: "#4A43EC" },
    Clubhouse: { icon: "home-group", color: "#4A43EC" },
    Garden: { icon: "flower-outline", color: "#4A43EC" },
};

function AmenityItem({ label }) {
    const config = AMENITY_ICONS[label] ?? { icon: "star-outline", color: "#003D9B" };

    return (
        <View className="flex-row items-center gap-3 w-[50%] mb-4">
            <View className="w-10 h-10 rounded-[14px] bg-[#F1F3FF] items-center justify-center">
                <MaterialCommunityIcons name={config.icon} size={18} color={config.color} />
            </View>
            <Text className="text-[13px] font-lato text-[#101010] flex-1">{label}</Text>
        </View>
    );
}

const MILESTONE_ORDER = ["Token", "Booking Amount", "Agreement", "Registry"];

const parseAmount = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) => `\u20B9${Math.round(value || 0).toLocaleString("en-IN")}`;

const EMPTY_LABEL = "\u2014";
const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const getObjectCandidates = (payload) => {
    const candidates = [];
    const push = (value) => {
        if (value && typeof value === "object" && !Array.isArray(value) && !candidates.includes(value)) {
            candidates.push(value);
        }
    };

    push(payload);
    push(payload?.data);
    push(payload?.data?.data);
    push(payload?.deal);
    push(payload?.data?.deal);
    push(payload?.user_deal);
    push(payload?.data?.user_deal);
    push(payload?.userDeal);
    push(payload?.data?.userDeal);
    push(payload?.deal_summary);
    push(payload?.data?.deal_summary);
    push(payload?.dealSummary);
    push(payload?.data?.dealSummary);

    return candidates;
};

const getDealPayload = (variant) => {
    const candidates = getObjectCandidates(variant);
    const primary = candidates[0] || {};
    const inner = primary.deal_summary || primary.dealSummary || primary.user_deal || primary.userDeal || candidates[0] || {};
    const dealId = firstPresent(variant?.deal_id, variant?.dealId, inner?.deal_id, inner?.dealId, inner?.id);

    return dealId && !inner?.deal_id && !inner?.dealId
        ? { ...inner, deal_id: dealId, dealId }
        : inner;
};

const extractPaymentSchedule = (payload) => {
    if (Array.isArray(payload)) return payload;

    for (const source of getObjectCandidates(payload)) {
        const schedule = firstPresent(
            source.payment_schedule,
            source.paymentSchedule,
            source.milestones,
            source.payment_milestones,
            source.paymentMilestones,
            source.payment_plan,
            source.paymentPlan,
            source.schedule
        );

        if (Array.isArray(schedule)) return schedule;
    }

    return [];
};

const canonicalMilestoneKey = (value) => {
    const label = String(value ?? "").toLowerCase().trim();
    if (label.includes("book")) return "booking amount";
    if (label.includes("token")) return "token";
    if (label.includes("agreement")) return "agreement";
    if (label.includes("registry") || label.includes("registration")) return "registry";
    return label;
};

const getMilestoneTitle = (source, fallbackTitle) => {
    const title = firstPresent(
        source?.title,
        source?.milestone_title,
        source?.milestoneTitle,
        source?.milestone_name,
        source?.milestoneName,
        source?.milestone,
        source?.name,
        fallbackTitle
    );

    return String(title || "Milestone").trim() || EMPTY_LABEL;
};

const formatDateDetail = (value) => {
    if (!value) return null;
    if (typeof value !== "string") return String(value);

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return parsed.toLocaleDateString();
};

const normalizeMilestone = (title, source, fallbackAmount, fallbackDetail) => {
    const resolvedTitle = getMilestoneTitle(source, title);
    const totalAmount = parseAmount(firstPresent(
        source?.totalAmount,
        source?.total_amount,
        source?.amount,
        source?.milestone_amount,
        source?.milestoneAmount,
        source?.due_amount,
        source?.dueAmount,
        source?.payable_amount,
        source?.payableAmount,
        fallbackAmount
    ));
    const status = String(firstPresent(source?.status, source?.payment_status, source?.paymentStatus, "")).toLowerCase();
    const collectedAmount = Math.min(
        totalAmount,
        parseAmount(firstPresent(
            source?.collectedAmount,
            source?.collected_amount,
            source?.paidAmount,
            source?.paid_amount,
            source?.received_amount,
            source?.receivedAmount,
            source?.amount_paid,
            source?.amountPaid,
            status === "paid" || status === "completed" || status === "collected" ? totalAmount : 0
        ))
    );

    const dueDetail = firstPresent(
        source?.dueDetail,
        source?.due_detail,
        source?.detail,
        source?.due_date,
        source?.dueDate,
        source?.expected_date,
        source?.expectedDate,
        fallbackDetail
    );
    const receiptDetail = firstPresent(
        source?.receiptDetail,
        source?.receipt_detail,
        source?.receipt_no,
        source?.receiptNo,
        source?.transaction_id,
        source?.transactionId,
        source?.detail
    );
    const detailFallbacks = {
        dueDetail: formatDateDetail(dueDetail) ?? EMPTY_LABEL,
        receiptDetail: receiptDetail ?? EMPTY_LABEL,
    };

    return {
        id: firstPresent(source?.id, source?.milestone_id, source?.milestoneId, source?.payment_milestone_id, source?.paymentMilestoneId),
        key: canonicalMilestoneKey(resolvedTitle),
        title: resolvedTitle,
        totalAmount,
        collectedAmount,
        ...detailFallbacks,
    };
};

const buildPaymentPlan = (variant) => {
    const target = getDealPayload(variant);
    const schedule = extractPaymentSchedule(target);
    const usedScheduleItems = new Set();
    const scheduleMap = new Map(schedule.map((item) => [canonicalMilestoneKey(getMilestoneTitle(item)), item]));

    const orderedMilestones = MILESTONE_ORDER.map((title, index) => {
        const source = scheduleMap.get(canonicalMilestoneKey(title));
        if (source) usedScheduleItems.add(source);
        const fallbackAmount = [
            target?.token_amount || target?.tokenAmount, 
            target?.booking_amount || target?.bookingAmount, 
            target?.agreement_amount || target?.agreementAmount, 
            target?.registry_amount || target?.registryAmount
        ][index];
        const fallbackDetail = [
            target?.booking_date || target?.bookingDate || target?.created_at, 
            target?.booking_amount_date || target?.bookingAmountDate, 
            target?.next_due_date || target?.nextDue, 
            target?.registry_date || target?.registryDue
        ][index];
        return normalizeMilestone(title, source, fallbackAmount, fallbackDetail);
    });

    const extraMilestones = schedule
        .filter((item) => !usedScheduleItems.has(item))
        .map((item, index) => normalizeMilestone(getMilestoneTitle(item, `Milestone ${index + 1}`), item));

    return [...orderedMilestones, ...extraMilestones].filter((milestone) => milestone.totalAmount > 0 || milestone.id);
};

const derivePaymentSummary = (paymentPlan, variant) => {
    const target = getDealPayload(variant);

    const milestoneTotalAmount = paymentPlan.reduce((sum, milestone) => sum + milestone.totalAmount, 0);
    const milestoneCollectedAmount = paymentPlan.reduce((sum, milestone) => sum + milestone.collectedAmount, 0);
    const hasScheduleMilestones = paymentPlan.some((milestone) => milestone.id || milestone.totalAmount > 0);

    const dealTotalAmount = parseAmount(firstPresent(target?.total_amount, target?.total_value, target?.deal_value, target?.dealValue, variant?.total_amount, variant?.deal_value, variant?.dealValue, target?.amount));
    const dealCollectedAmount = parseAmount(firstPresent(target?.paid_amount, target?.received_amount, target?.receivedAmount, target?.received, target?.paid, variant?.received_amount, variant?.paid_amount));

    const totalAmount = dealTotalAmount > 0 ? dealTotalAmount : milestoneTotalAmount;
    const collectedAmount = hasScheduleMilestones ? milestoneCollectedAmount : (dealCollectedAmount > 0 ? dealCollectedAmount : milestoneCollectedAmount);
    const pendingAmount = Math.max(totalAmount - collectedAmount, 0);
    const nextDueMilestone = paymentPlan.find((milestone) => milestone.collectedAmount < milestone.totalAmount);
    const progress = totalAmount > 0 ? Math.min(100, Math.round((collectedAmount / totalAmount) * 100)) : (target?.progress || target?.payment_progress_percent || 0);
    const allPaid = pendingAmount === 0 && totalAmount > 0;

    return {
        totalAmount,
        collectedAmount,
        pendingAmount,
        nextDueLabel: allPaid ? "Paid" : nextDueMilestone?.title || "Upcoming",
        progress,
        allPaid,
    };
};

const toPaymentSchedulePayload = (paymentPlan) => paymentPlan.map((milestone) => {
    const remainingAmount = Math.max(milestone.totalAmount - milestone.collectedAmount, 0);
    const isPaid = remainingAmount === 0;

    return {
        id: milestone.id,
        title: milestone.title,
        milestone_title: milestone.title,
        amount: formatAmount(milestone.totalAmount),
        totalAmount: milestone.totalAmount,
        total_amount: milestone.totalAmount,
        collectedAmount: milestone.collectedAmount,
        collected_amount: milestone.collectedAmount,
        status: isPaid ? "Paid" : "Upcoming",
        tone: isPaid ? "success" : "warning",
        detail: isPaid
            ? `Collected: ${formatAmount(milestone.collectedAmount)}`
            : `Remaining: ${formatAmount(remainingAmount)}`,
    };
});

const isInventoryUnitId = (value) => typeof value === "string" && value.trim().startsWith("#");

const getActiveDealId = (variant) => {
    const target = getDealPayload(variant);
    return firstPresent(
        variant?.deal_id,
        variant?.dealId,
        variant?.id,              // deals list items have id = deal UUID
        variant?.user_deal_id,
        variant?.userDealId,
        target?.deal_id,
        target?.dealId,
        target?.user_deal_id,
        target?.userDealId,
        !isInventoryUnitId(target?.id) ? target?.id : null,
        !isInventoryUnitId(variant?.id) ? variant?.id : null
    );
};

export default function ProjectDetailModal({ visible, onClose, project, variant, onVariantUpdate, showDealSummary = false, showFollowUps = false }) {
    const sheetRef = useRef(null);
    const [sheetView, setSheetView] = useState("property");
    const [isImageLightboxVisible, setIsImageLightboxVisible] = useState(false);
    const [paymentPlan, setPaymentPlan] = useState(() => buildPaymentPlan(variant));
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(null);
    const [collectAmount, setCollectAmount] = useState("");
    const [collectPaymentMode, setCollectPaymentMode] = useState("cash");
    const [collectError, setCollectError] = useState("");
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [savingCollection, setSavingCollection] = useState(false);
    const [realPaymentSchedule, setRealPaymentSchedule] = useState(null);
    const snapPoints = useMemo(() => ["88%"], []);
    
    const activeDealId = getActiveDealId(variant);
    const variantKey = activeDealId ?? variant?.title ?? "variant";
    const paymentPlanSeedRef = useRef({ key: null, plan: [], schedule: null });

    if (paymentPlanSeedRef.current.key !== variantKey) {
        const schedule = extractPaymentSchedule(variant);
        paymentPlanSeedRef.current = { key: variantKey, plan: buildPaymentPlan(variant), schedule: schedule.length ? schedule : null };
    }

    useEffect(() => {
        if (visible) {
            setSheetView("property");
            setPaymentPlan(paymentPlanSeedRef.current.plan);
            setRealPaymentSchedule(paymentPlanSeedRef.current.schedule);
            setActiveMilestoneIndex(null);
            setCollectAmount("");
            setCollectError("");
            sheetRef.current?.present();
            return;
        }

        sheetRef.current?.dismiss();
    }, [visible, variantKey]);

    if (!project || !variant) return null;

    const goToSchedule = async () => {
        if (activeDealId && !realPaymentSchedule) {
            try {
                setLoadingSchedule(true);
                console.log('🔵 [MODAL] Fetching payment schedule for deal:', activeDealId);
                const response = await dealService.getPaymentSchedule(activeDealId);
                
                const extractedSchedule = extractPaymentSchedule(response);
                if (extractedSchedule.length) {
                    const nextPlan = buildPaymentPlan({ ...getDealPayload(variant), payment_schedule: extractedSchedule });
                    setRealPaymentSchedule(extractedSchedule);
                    setPaymentPlan(nextPlan);
                    console.log('✅ [MODAL] Payment schedule loaded');
                }
            } catch (error) {
                console.log('❌ [MODAL] Failed to fetch payment schedule:', error);
                Alert.alert('Error', 'Failed to load payment schedule');
            } finally {
                setLoadingSchedule(false);
            }
        }
        setSheetView("schedule");
    };
    
    const goToProperty = () => setSheetView("property");
    const paymentSummaryState = derivePaymentSummary(paymentPlan, variant);

    const openCollectForm = async (milestoneIndex) => {
        const milestone = paymentPlan[milestoneIndex];
        if (!milestone || milestone.collectedAmount >= milestone.totalAmount) return;

        // If milestone has no ID yet, fetch the real schedule first
        if (!milestone.id && activeDealId) {
            try {
                setLoadingSchedule(true);
                const response = await dealService.getPaymentSchedule(activeDealId);
                const extractedSchedule = extractPaymentSchedule(response);
                if (extractedSchedule.length) {
                    const nextPlan = buildPaymentPlan({ ...getDealPayload(variant), payment_schedule: extractedSchedule });
                    setRealPaymentSchedule(extractedSchedule);
                    setPaymentPlan(nextPlan);
                    // Use the updated milestone with real ID
                    const updatedMilestone = nextPlan[milestoneIndex];
                    if (!updatedMilestone?.id) {
                        Alert.alert('Error', 'Could not load milestone details. Please try again.');
                        return;
                    }
                    setActiveMilestoneIndex(milestoneIndex);
                    setCollectAmount(String(Math.max(1, Math.round(updatedMilestone.totalAmount - updatedMilestone.collectedAmount))));
                    setCollectPaymentMode("cash");
                    setCollectError("");
                    setSheetView("collect");
                    return;
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to load payment schedule. Please try again.');
                return;
            } finally {
                setLoadingSchedule(false);
            }
        }

        if (!milestone.id) {
            Alert.alert('Error', 'Milestone ID not available. Please reload the payment schedule.');
            return;
        }

        setActiveMilestoneIndex(milestoneIndex);
        setCollectAmount(String(Math.max(1, Math.round(milestone.totalAmount - milestone.collectedAmount))));
        setCollectPaymentMode("cash");
        setCollectError("");
        setSheetView("collect");
    };

    const closeCollectForm = () => {
        setSheetView("schedule");
        setActiveMilestoneIndex(null);
        setCollectAmount("");
        setCollectPaymentMode("cash");
        setCollectError("");
    };

    const handleSaveCollection = async () => {
        const amount = parseAmount(collectAmount);
        const milestoneIndex = activeMilestoneIndex;

        if (milestoneIndex === null || !paymentPlan[milestoneIndex]) {
            Alert.alert("Error", "No milestone selected. Please try again.");
            return;
        }
        
        if (!Number.isFinite(amount) || amount <= 0) {
            setCollectError("Enter a valid amount");
            return;
        }

        const selectedMilestone = paymentPlan[milestoneIndex];
        const selectedRemaining = Math.max(selectedMilestone.totalAmount - selectedMilestone.collectedAmount, 0);
        if (amount > selectedRemaining) {
            setCollectError(`Amount cannot exceed ${formatAmount(selectedRemaining)}`);
            return;
        }

        try {
            setSavingCollection(true);
            console.log(`📤 [MODAL] Collecting payment for milestone: ${selectedMilestone.id}`);

            if (!selectedMilestone.id) {
                setCollectError("Milestone ID missing. Please go back and reopen the payment schedule.");
                return;
            }

            const response = await dealService.collectPayment(selectedMilestone.id, {
                amount: amount,
                payment_mode: collectPaymentMode,
            });

            if (response?.success !== false) {
                const responseSchedule = extractPaymentSchedule(response);
                const nextPlan = responseSchedule.length ? buildPaymentPlan({ ...getDealPayload(variant), payment_schedule: responseSchedule }) : paymentPlan.map((milestone, index) => {
                    if (index !== milestoneIndex) return milestone;
                    return {
                        ...milestone,
                        collectedAmount: milestone.collectedAmount + amount,
                    };
                });

                if (responseSchedule.length) {
                    setRealPaymentSchedule(responseSchedule);
                }
                setPaymentPlan(nextPlan);
                const summary = derivePaymentSummary(nextPlan, variant);

                if (typeof onVariantUpdate === "function") {
                    onVariantUpdate({
                        ...variant,
                        paymentSchedule: toPaymentSchedulePayload(nextPlan),
                        payment_schedule: toPaymentSchedulePayload(nextPlan),
                        total_amount: summary.totalAmount,
                        paid_amount: summary.collectedAmount,
                        dealValue: formatAmount(summary.deal_value),
                        received: formatAmount(summary.collectedAmount),
                        pending: formatAmount(summary.pendingAmount),
                        nextDue: summary.nextDueLabel,
                        progress: summary.progress,
                        topStatus: summary.allPaid ? "Paid" : "Upcoming",
                        footerStatus: summary.allPaid ? "Paid" : "Upcoming",
                    });
                }
                
                Alert.alert("Success", "Payment recorded successfully!");
                closeCollectForm();
            }
        } catch (err) {
            console.log("❌ [MODAL] Payment collection network request failed:", err);
            setCollectError(err.message || "Failed to record payment transaction entry.");
        } finally {
            setSavingCollection(false);
        }
    };

    const dealData = getDealPayload(variant);

    const title = firstPresent(variant.property_title, variant.unit_title, variant.property?.title, variant.unit?.title, variant.type, variant.propertyType, variant.title, "Property");
    
    const rawTotalAmount = parseAmount(firstPresent(dealData.total_value, dealData.total_amount, dealData.deal_value, dealData.dealValue, variant.total_value, variant.deal_value, variant.dealValue));
    const priceLabel = rawTotalAmount > 0 
        ? formatAmount(rawTotalAmount)
        : variant.price || variant.priceRange || variant.footerTotal || project.avg_price_per_sqft || project.avgPrice || "Contact for price";
        
    const possession = (() => {
        const raw = firstPresent(variant.possession, project.possession);
        if (!raw) return 'Already Possessed';
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            return new Date(raw).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        }
        return raw;
    })();
    const area = firstPresent(variant.area, variant.area_sqft, variant.property?.area, project.total_area, project.area, EMPTY_LABEL);
    
    const bookedBy = firstPresent(dealData?.booked_by_name, dealData?.bookedBy, dealData?.customer_name, dealData?.customer?.name, dealData?.booked_by?.name, variant.contactName, EMPTY_LABEL);
    const mobile = firstPresent(dealData?.booked_by_mobile, dealData?.mobile, dealData?.customer_phone, dealData?.customer?.phone, dealData?.booked_by?.mobile, EMPTY_LABEL);
    const bookingDate = firstPresent(dealData?.booking_date, dealData?.bookingDate, formatDateDetail(dealData?.created_at), EMPTY_LABEL);
    
    const tokenAmount = formatAmount(parseAmount(firstPresent(dealData?.token_amount, dealData?.tokenAmount, paymentPlan[0]?.totalAmount, 0)));
    const dealValue = formatAmount(paymentSummaryState.totalAmount);
    const received = formatAmount(paymentSummaryState.collectedAmount);
    const pending = formatAmount(paymentSummaryState.pendingAmount);
    
    // ✅ FIXED: Safely maps avgPrice using available project fields to clear out the ReferenceError crash
    const avgPrice = (() => {
        const raw = firstPresent(variant.avgPricePerSqft, project.avg_price_per_sqft, project.avgPrice);
        if (!raw) return EMPTY_LABEL;
        // Already formatted (e.g. "₹1,23,456" or "₹1,23,456/sqft")
        if (typeof raw === 'string' && raw.includes('₹')) return raw.includes('/sqft') ? raw : `${raw}/sqft`;
        // Raw number — format it
        const num = Number(raw);
        if (!Number.isFinite(num) || num <= 0) return EMPTY_LABEL;
        return `₹${Math.round(num).toLocaleString('en-IN')}/sqft`;
    })();
    
    const nextDue = firstPresent(dealData?.next_due_label, dealData?.nextDue, dealData?.next_due_date, paymentSummaryState.nextDueLabel);
    // "STATUS" means two different things depending on whether this unit has
    // an actual deal: payment status ("Paid"/"Upcoming") when it does, but
    // the unit's real availability (Available/Booked/Sold) when it doesn't —
    // it must never show a payment-progress placeholder for a unit nobody
    // has booked yet.
    const dealStatus = variant.showDealSummary
        ? (paymentSummaryState.allPaid ? "Paid" : "Upcoming")
        : firstPresent(variant.footerStatus, variant.topStatus, EMPTY_LABEL);
    
    const normalizeImage = (image) => {
        if (!image) return null;
        if (typeof image === "string") return { uri: image };
        return image.uri ? { uri: image.uri } : null;
    };
    
    const propertyImages = (variant.images?.length ? variant.images : project.projectImages || [])
        .map(normalizeImage)
        .filter(Boolean);
    const totalImages = propertyImages.length;
    const heroImage = propertyImages[0] || null;
    
    const amenitiesList = variant.amenities?.length
        ? variant.amenities
        : project.amenities?.length
            ? project.amenities
            : [];

    const stats = [
        { label: "AREA", value: typeof area === "number" ? `${area} Sq.Ft` : area },
        { label: "POSSESSION", value: possession },
        { label: "STATUS", value: dealStatus },
        { label: "PROGRESS", value: `${paymentSummaryState.progress}%` },
    ];

    const dealSummaryRows = [
        { label: "Booked By", value: bookedBy, valueColor: "#111827" },
        { label: "Mobile", value: mobile, valueColor: "#111827" },
        { label: "Booking Date", value: bookingDate, valueColor: "#111827" },
        { label: "Token Amount", value: tokenAmount, valueColor: "#10B981" },
        { label: "Deal Value", value: dealValue, valueColor: "#111827" },
        { label: "Received", value: received, valueColor: "#10B981" },
        { label: "Pending", value: pending, valueColor: "#F97316" },
        { label: "Next Due", value: nextDue, valueColor: "#F59E0B" },
    ];

    const paymentSummary = [
        { label: "Total Value", value: dealValue, tone: "#5B5CE2", bg: "#EAEBFF" },
        { label: "Collected", value: received, tone: "#059669", bg: "#E6FBF3" },
        { label: "Remaining", value: pending, tone: "#D97706", bg: "#FFF1E6" },
        { label: "Next Due", value: nextDue, tone: paymentSummaryState.allPaid ? "#059669" : "#D97706", bg: paymentSummaryState.allPaid ? "#E6FBF3" : "#FFF4DB" },
    ];

    const paymentMilestones = paymentPlan.map((milestone) => {
        const remainingAmount = Math.max(milestone.totalAmount - milestone.collectedAmount, 0);
        const status = remainingAmount === 0 ? "Paid" : "Upcoming";

        return {
            ...milestone,
            remainingAmount,
            status,
            tone: status === "Paid" ? "success" : "warning",
            amount: formatAmount(milestone.totalAmount),
            detail: status === "Paid"
                ? `Collected: ${formatAmount(milestone.collectedAmount)}`
                : `${milestone.dueDetail && milestone.dueDetail !== EMPTY_LABEL ? `${milestone.dueDetail} - ` : ""}Remaining: ${formatAmount(remainingAmount)}`,
        };
    });

    const followUps = variant.followUps?.length
        ? variant.followUps
        : project.visits?.followUps?.length
            ? project.visits.followUps
            : [];

    const statusToneClasses = {
        success: {
            container: "border-[#93E6C8] bg-[#EAFBF5]",
            status: "text-[#0F9B68]",
            amount: "text-[#0F9B68]",
        },
        warning: {
            container: "border-[#F3D08A] bg-[#FFF7E9]",
            status: "text-[#D58A00]",
            amount: "text-[#D58A00]",
        },
    };

    return (
        <BottomSheetModal
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose
            onDismiss={onClose}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} pressBehavior="close" />
            )}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#fff" }}
            handleIndicatorStyle={{ backgroundColor: "#CBD5E1" }}
        >
            <BottomSheetScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: sheetView === "collect" ? 120 : 18 }}
            >
                {sheetView === "property" ? (
                    <>
                        <View className="mx-5 rounded-3xl overflow-hidden border border-[#E8ECF4] bg-white">
                            <TouchableOpacity
                                activeOpacity={heroImage ? 0.9 : 1}
                                disabled={!heroImage}
                                onPress={() => setIsImageLightboxVisible(true)}
                                style={{ height: 170 }}
                            >
                                {heroImage ? (
                                    <Image source={heroImage} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                                ) : (
                                    <View style={{ width: "100%", height: "100%", backgroundColor: "#F4F7FF", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
                                        <Ionicons name="image-outline" size={28} color="#9CA3AF" />
                                        <Text className="mt-2 text-[11px] font-lato-bold text-gray-400 text-center">No images available</Text>
                                    </View>
                                )}
                                {totalImages > 1 && (
                                    <View
                                        style={{
                                            position: "absolute",
                                            bottom: 8,
                                            right: 8,
                                            backgroundColor: "rgba(0,0,0,0.6)",
                                            borderRadius: 8,
                                            paddingHorizontal: 8,
                                            paddingVertical: 5,
                                            flexDirection: "row",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Ionicons name="images-outline" size={12} color="white" />
                                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", marginLeft: 4 }}>View {totalImages} Photos</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <ImageLightbox
                                visible={isImageLightboxVisible}
                                images={propertyImages.map((img) => img.uri)}
                                onClose={() => setIsImageLightboxVisible(false)}
                            />

                            <View className="px-5 pt-4 pb-3">
                                <View className="flex-row items-center gap-5 mb-3">
                                    <Text className="text-[12px] font-lato text-gray-500">Possession: {possession}</Text>
                                    <Text className="text-[12px] font-lato text-gray-500">• Avg Price per sq ft: {avgPrice}</Text>
                                </View>

                                <View style={{ borderBottomWidth: 1, borderBottomColor: "#D1D5DB", borderStyle: "dashed" }} />

                                <View className="mt-3">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View>
                                            <Text className="text-[12px] font-lato-bold text-gray-500">{title}</Text>
                                            <Text className="text-[16px] font-lato-bold text-[#0F172A]">{priceLabel}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View className="flex-row flex-wrap justify-between mt-4">
                                    {stats.map((item) => (
                                        <View key={item.label} className="bg-[#F1F3FF] border border-[#E0E8FF] rounded-2xl p-4 py-4 mb-4" style={{ width: (width - 68) / 2 - 6 }}>
                                            <Text className="text-[10px] font-lato-bold text-gray-400 tracking-widest">{item.label}</Text>
                                            <Text className="text-[16px] font-lato-bold text-[#041B3C]">{item.value}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View className="bg-white border border-gray-100 rounded-2xl p-4 px-5 mb-2">
                                    <Text className="text-[15px] font-lato text-[#1A1A1A] mb-4">World-Class Amenities</Text>
                                    {amenitiesList.length > 0 ? (
                                        <View className="flex-row flex-wrap">
                                            {amenitiesList.map((item, index) => (
                                                <AmenityItem key={`${item}-${index}`} label={item} />
                                            ))}
                                        </View>
                                    ) : (
                                        <View className="bg-[#F8FAFC] rounded-2xl border border-gray-100 py-5 px-4">
                                            <Text className="text-[12px] font-lato text-gray-400 text-center">No amenities available for this property yet.</Text>
                                        </View>
                                    )}
                                </View>

                                {showDealSummary ? (
                                    <View className="border border-[#CFC5FF] rounded-[16px] bg-[#F8F6FF] p-3 mt-2">
                                        <View className="flex-row items-start justify-between mb-2.5">
                                            <Text className="text-[16px] font-lato-bold text-[#4C3FE0]">Deal Summary</Text>
                                            <Text className="text-[11px] font-lato text-[#6C63F0]">{dealStatus}</Text>
                                        </View>

                                        <View className="border-t border-[#D8D2F7]">
                                            {dealSummaryRows.map((row) => (
                                                <View key={row.label} className="flex-row items-start justify-between py-2 border-b border-[#D8D2F7] gap-3">
                                                    <Text className="text-[12px] font-lato text-[#4B5563] flex-1">{row.label}</Text>
                                                    <Text className="text-[12px] font-lato-bold flex-1 text-right" style={{ color: row.valueColor }}>
                                                        {row.value}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            className="mt-3 rounded-[12px] py-3 items-center justify-center"
                                            style={{ backgroundColor: "#6C5CE7" }}
                                            onPress={goToSchedule}
                                        >
                                            {loadingSchedule ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <Text className="text-white text-[13px] font-lato-bold">View Payment Schedule</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {showFollowUps ? (
                                    <View className="border border-[#CFC5FF] rounded-[16px] bg-[#F8F6FF] p-3 mt-2">
                                        <View className="flex-row items-start justify-between mb-2.5">
                                            <Text className="text-[16px] font-lato-bold text-[#4C3FE0]">Upcoming Follow-ups</Text>
                                            <Text className="text-[11px] font-lato text-[#6C63F0]">Visits</Text>
                                        </View>

                                        {followUps.length > 0 ? (
                                            <View className="space-y-2">
                                                {followUps.map((item) => (
                                                <View key={`${item.name}-${item.time}`} className="bg-white rounded-[14px] border border-[#E6E0FF] px-3 py-2.5 mb-2">
                                                    <View className="flex-row items-start">
                                                        <View className="w-8 h-8 rounded-full bg-[#E8ECFF] items-center justify-center mr-3 mt-0.5">
                                                            <Text className="text-[10px] font-lato-bold text-[#4A43EC]">{item.initials}</Text>
                                                        </View>

                                                        <View className="flex-1 pr-2">
                                                            <View className="flex-row items-start justify-between gap-2">
                                                                <View className="flex-1 pr-1">
                                                                    <Text className="text-[12px] font-lato-bold text-[#1F2937] leading-4">{item.name}</Text>
                                                                    <Text className="mt-0.5 text-[10px] font-lato text-[#8E9AAF]" numberOfLines={1}>
                                                                        {item.project}
                                                                    </Text>
                                                                </View>
                                                                <View className={`px-2 py-0.5 rounded-full ${item.tone === "indigo" ? "bg-[#E8ECFF]" : "bg-[#FFF2E5]"}`}>
                                                                    <Text className={`text-[8px] font-lato-bold ${item.tone === "indigo" ? "text-[#4A43EC]" : "text-[#F97316]"}`}>
                                                                        {item.tone === "indigo" ? "Hot" : "Warm"}
                                                                    </Text>
                                                                </View>
                                                            </View>

                                                            <Text className="mt-1 text-[10px] font-lato-bold text-[#6B7280]" numberOfLines={1}>
                                                                {item.type} • {item.time}
                                                            </Text>
                                                            <Text className="mt-0.5 text-[10px] font-lato text-[#8E9AAF]" numberOfLines={1}>
                                                                {item.salesperson}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <View className="bg-white rounded-[14px] border border-[#E6E0FF] px-3 py-5">
                                                <Text className="text-[12px] font-lato text-gray-400 text-center">No follow-ups available for this property yet.</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </>
                ) : sheetView === "schedule" ? (
                    <>
                        <View className="px-3 pb-1.5">
                            <View className="flex-row items-center justify-between mb-2">
                                <TouchableOpacity
                                    onPress={goToProperty}
                                    className="w-7 h-7 rounded-full bg-[#F3F4F8] items-center justify-center"
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="arrow-back" size={12} color="#1F2937" />
                                </TouchableOpacity>
                                <View className="flex-1 ml-2">
                                    <Text className="text-[14px] font-lato-bold text-[#1F2937]">Payment Schedule</Text>
                                    <Text className="mt-0.5 text-[9px] font-lato text-[#8E98AA]" numberOfLines={1}>
                                        {title} · {bookedBy}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row flex-wrap justify-between">
                                {paymentSummary.map((item) => (
                                    <View key={item.label} className="rounded-[10px] px-2 py-2 mb-2" style={{ width: (width - 62) / 2, backgroundColor: item.bg }}>
                                        <Text className="text-[8px] font-lato text-[#6B7280]">{item.label}</Text>
                                        <Text className="mt-0.5 text-[11px] font-lato-bold" style={{ color: item.tone }} numberOfLines={1}>
                                            {item.value}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <Text className="mt-2 mb-1 text-[10px] font-lato-bold tracking-[1px] text-[#53637D]">MILESTONE SCHEDULE</Text>

                            <View>
                                {paymentMilestones.map((milestone, index) => {
                                    const tone = statusToneClasses[milestone.tone] || statusToneClasses.success;
                                    const isLast = index === paymentMilestones.length - 1;

                                    return (
                                        <View key={`${milestone.title}-${index}`} className={`rounded-[12px] border px-3 py-2 mb-2 ${tone.container}`}>
                                            <View className="flex-row items-center justify-between mb-1">
                                                <Text className="text-[11px] font-lato-bold text-[#1F2937]">{milestone.title}</Text>
                                                <Text className={`text-[9px] font-lato-bold ${tone.status}`}>{milestone.status}</Text>
                                            </View>

                                            <Text className={`text-[13px] font-lato-bold ${tone.amount}`}>{milestone.amount}</Text>
                                            <Text className="mt-0.5 text-[9px] font-lato text-[#52607A]">{milestone.detail}</Text>

                                            <Text className="mt-2 text-[11px] text-[#64748B]">{milestone.remainingAmount > 0 ? 'Awaiting payment confirmation by admin' : 'Paid'}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </>
                ) : (
                    <View className="px-5 pb-2">
                        <View className="flex-row items-center justify-between mb-4">
                            <TouchableOpacity
                                onPress={closeCollectForm}
                                className="w-8 h-8 rounded-full bg-[#F3F4F8] items-center justify-center"
                                activeOpacity={0.85}
                            >
                                <Ionicons name="arrow-back" size={14} color="#1F2937" />
                            </TouchableOpacity>
                            <View className="flex-1 ml-3">
                                <Text className="text-[16px] font-lato-bold text-[#1F2937]">Collect Payment</Text>
                                <Text className="mt-0.5 text-[10px] font-lato text-[#8E98AA]" numberOfLines={1}>
                                    {paymentMilestones[activeMilestoneIndex]?.title || "Milestone"} · {title}
                                </Text>
                            </View>
                        </View>

                        <View className="rounded-[18px] border border-[#E6E0FF] bg-[#F8F6FF] p-4">
                            <Text className="text-[12px] font-lato text-[#6B7280]">
                                Enter the amount to collect for {paymentMilestones[activeMilestoneIndex]?.title || "this milestone"}.
                            </Text>

                            <View className="mt-4 rounded-[14px] bg-white border border-[#ECE8FF] p-3">
                                <Text className="text-[10px] font-lato-bold text-[#6B7280] uppercase mb-1">Pending Amount</Text>
                                <Text className="text-[18px] font-lato-bold text-[#4A43EC]">
                                    {formatAmount(paymentMilestones[activeMilestoneIndex]?.remainingAmount || 0)}
                                </Text>
                            </View>

                            <View className="mt-4">
                                <Text className="text-[10px] font-lato-bold text-[#6B7280] uppercase mb-1.5">Amount</Text>
                                <BottomSheetTextInput
                                    value={collectAmount}
                                    onChangeText={(value) => {
                                        setCollectAmount(value);
                                        setCollectError("");
                                    }}
                                    keyboardType="numeric"
                                    placeholder="Enter amount"
                                    placeholderTextColor="#94A3B8"
                                    style={{
                                        height: 48,
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: "#E5E7EB",
                                        paddingHorizontal: 16,
                                        fontSize: 14,
                                        color: "#111827",
                                        backgroundColor: "#fff",
                                        fontFamily: "Lato-Regular",
                                    }}
                                    returnKeyType="done"
                                />
                                {collectError ? <Text className="mt-1 text-[11px] text-red-500">{collectError}</Text> : null}
                            </View>

                            <View className="mt-4">
                                <Text className="text-[10px] font-lato-bold text-[#6B7280] uppercase mb-1.5">Payment Mode</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {["cash", "upi", "bank_transfer", "cheque", "card", "other"].map((mode) => (
                                        <TouchableOpacity
                                            key={mode}
                                            onPress={() => setCollectPaymentMode(mode)}
                                            className={`px-3 py-2 rounded-full border ${collectPaymentMode === mode ? "bg-[#4A43EC] border-[#4A43EC]" : "bg-white border-[#E5E7EB]"}`}
                                        >
                                            <Text className={`text-[11px] font-lato-bold capitalize ${collectPaymentMode === mode ? "text-white" : "text-[#374151]"}`}>
                                                {mode.replace("_", " ")}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                <View className="px-5 pt-3 border-t border-gray-100 mt-1" style={{ paddingBottom: 8 }}>
                    {sheetView === "property" ? (
                        <TouchableOpacity
                            onPress={onClose}
                            className="rounded-2xl py-4 items-center flex-row justify-center gap-2"
                            style={{ backgroundColor: "#4A43EC" }}
                        >
                            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
                            <Text className="text-white text-[15px] font-lato-bold">Close</Text>
                        </TouchableOpacity>
                    ) : sheetView === "schedule" ? (
                        <TouchableOpacity
                            onPress={goToProperty}
                            className="rounded-2xl py-3 items-center flex-row justify-center gap-2"
                            style={{ backgroundColor: "#4A43EC" }}
                        >
                            <Ionicons name="arrow-back" size={14} color="#fff" />
                            <Text className="text-white text-[12px] font-lato-bold">Back to Property Details</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                disabled={savingCollection}
                                onPress={closeCollectForm}
                                className="flex-1 rounded-2xl py-3 items-center justify-center border border-gray-200 bg-white"
                            >
                                <Text className="text-[12px] font-lato-bold text-[#374151]">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={savingCollection}
                                onPress={handleSaveCollection}
                                className="flex-1 rounded-2xl py-3 items-center justify-center bg-[#4A43EC]"
                            >
                                {savingCollection ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text className="text-[12px] font-lato-bold text-white">Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
}
