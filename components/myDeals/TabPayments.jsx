import { memo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

const PAYMENTS_TABS = ["All", "Paid", "Upcoming", "Overdue"];

const getPaymentStyles = (status) => {
    switch (status) {
        case "paid":
        case "completed":
            return { borderClass: "border-[#F3F4F6]", bgIcon: "bg-[#E6F6ED]", textIcon: "text-[#22A559]", badgeBg: "bg-[#E6F6ED]", badgeText: "text-[#22A559]" };
        case "due_soon":
            return { borderClass: "border-[#F59E0B]", bgIcon: "bg-[#FFF8E6]", textIcon: "text-[#F59E0B]", badgeBg: "bg-[#FFF8E6]", badgeText: "text-[#F59E0B]" };
        case "upcoming":
            return { borderClass: "border-[#F3F4F6]", bgIcon: "bg-[#F3F4F6]", textIcon: "text-[#6B7280]", badgeBg: "bg-[#F3F4F6]", badgeText: "text-[#6B7280]" };
        case "overdue":
            return { borderClass: "border-[#EF4444]", bgIcon: "bg-[#FEF2F2]", textIcon: "text-[#EF4444]", badgeBg: "bg-[#FEF2F2]", badgeText: "text-[#EF4444]" };
        default:
            return { borderClass: "border-[#F3F4F6]", bgIcon: "bg-[#F3F4F6]", textIcon: "text-[#6B7280]", badgeBg: "bg-[#F3F4F6]", badgeText: "text-[#6B7280]" };
    }
};

const formatAmount = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return '₹0';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(0)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusLabel = (status) => {
    const map = { paid: 'Paid', completed: 'Paid', due_soon: 'Due Soon', upcoming: 'Upcoming', overdue: 'Overdue', pending_verification: 'Pending Verification' };
    return map[status] ?? String(status || 'Upcoming').replace(/_/g, ' ');
};

const TabPayments = memo(function TabPayments({ payments = [], onCollect, collectingId, tokenOnly = false }) {
    const [paymentFilter, setPaymentFilter] = useState("All");
    const hasGeneratedPayments = payments.some((payment) => payment.is_generated);

    const filteredPayments = paymentFilter === "All"
        ? payments
        : payments.filter(p => {
            if (paymentFilter === "Upcoming") return p.status === "upcoming" || p.status === "due_soon";
            if (paymentFilter === "Paid") return p.status === "paid" || p.status === "completed";
            return p.status === paymentFilter.toLowerCase();
        });

    return (
        <View className="mb-4">
            <View className="flex-row bg-[#EEEDFF] rounded-[10px] p-[3px] mb-4">
                {PAYMENTS_TABS.map((tab) => {
                    const isActive = paymentFilter === tab;
                    return (
                        <Pressable
                            key={`pay-tab-${tab}`}
                            onPress={() => setPaymentFilter(tab)}
                            className={`flex-1 items-center justify-center py-[6px] rounded-[8px] ${isActive ? 'bg-white' : ''}`}
                            style={isActive ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
                        >
                            <Text className={`text-[11px] ${isActive ? 'font-manrope-bold text-[#4F48ED]' : 'font-manrope-medium text-[#9CA3AF]'}`}>
                                {tab}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {hasGeneratedPayments && (
                <View className="bg-[#FFF8E6] border border-[#FDE68A] rounded-[10px] px-3 py-2 mb-3">
                    <Text className="text-[11px] font-manrope-medium text-[#92400E]">
                        Estimated payment schedule shown until official milestones are added.
                    </Text>
                </View>
            )}

            <View>
                {filteredPayments.length === 0 ? (
                    <Text className="text-center text-[#9CA3AF] font-manrope-medium py-8">No payments found</Text>
                ) : (
                    filteredPayments.map((item, index) => {
                        const styles = getPaymentStyles(item.status);
                        return (
                            <View key={`pay-item-${item.id ?? index}`} className={`flex-row items-center p-3.5 bg-white rounded-[12px] mb-3 border ${styles.borderClass}`}>
                                <View className={`w-[38px] h-[38px] rounded-[10px] items-center justify-center mr-3 ${styles.bgIcon}`}>
                                    <Text className={`text-[14px] font-manrope-bold ${styles.textIcon}`}>
                                        {String(index + 1).padStart(2, '0')}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[13px] font-manrope-bold text-[#111827] mb-0.5">{item.title}</Text>
                                    <Text className="text-[11px] font-manrope-medium text-[#9CA3AF]">{formatDate(item.due_date)}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-[14px] font-manrope-bold text-[#111827] mb-1">{formatAmount(item.amount)}</Text>
                                    <View className={`px-2 py-[2px] rounded-[6px] ${styles.badgeBg}`}>
                                        <Text className={`text-[10px] font-manrope-bold ${styles.badgeText}`}>{statusLabel(item.status)}</Text>
                                    </View>
                                    {!!onCollect && Boolean(item.is_token) === tokenOnly && ['upcoming','overdue'].includes(item.status) && <Pressable
                                        accessibilityRole="button" disabled={!!collectingId} onPress={() => onCollect(item)}
                                        className={`mt-2 rounded-lg bg-[#22A559] px-3 py-2 ${collectingId ? 'opacity-50' : ''}`}>
                                        {collectingId === item.id ? <ActivityIndicator size="small" color="white" /> : <Text className="text-[11px] font-manrope-bold text-white">Collect</Text>}
                                    </Pressable>}
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </View>
    );
});

export default TabPayments;
