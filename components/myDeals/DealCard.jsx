import { View, Text, Pressable, Animated, Easing } from 'react-native';
import { memo, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const ProgressBar = memo(function ProgressBar({ percentage, animKey }) {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        animatedValue.setValue(0);
        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [animatedValue, percentage, animKey]);

    const width = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View className="w-full h-[3px] bg-[#F3F4F6] rounded-full mb-2 overflow-hidden">
            <Animated.View style={{ width, height: '100%', borderRadius: 9999 }}>
                <LinearGradient
                    colors={['#434EEC', '#434EEC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, borderRadius: 9999 }}
                />
            </Animated.View>
        </View>
    );
});

const formatValue = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return "₹0";
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${Number((num / 100000).toFixed(2))} L`;
    return `₹${num.toLocaleString('en-IN')}`;
};

export default memo(function DealCard({ deal, animKey, onPress }) {
    const rawStatus = String(deal.status || 'pending').toLowerCase();
    const status = ['deal_in_process', 'payment_schedule', 'confirmed'].includes(rawStatus) ? 'active' : rawStatus;
    const isActive = status === 'active';
    const totalStages = deal.journey_total_stages || 8;
    const currentStage = deal.journey_current_stage || 1;
    const paidPct = deal.total_value > 0
        ? Math.min(100, Math.max(0, Math.round((deal.paid_so_far / deal.total_value) * 100)))
        : 0;
    const statusLabel = status ? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Pending';
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            className="bg-white rounded-[12px] p-3 mb-3"
            style={{ borderWidth: 1, borderColor: '#e4e5e8ff' }}
        >
            <View className="flex-row items-center mb-2.5">
                <View className="flex-1">
                    <Text className="text-[14px] font-manrope-bold text-[#111827] mb-0.5">{deal.property_title}</Text>
                    <Text className="text-[11px] font-manrope-medium text-[#6B7280]">{deal.city}{deal.area ? `, ${deal.area}` : ''}</Text>
                </View>
                <View className={`px-2 py-[2px] rounded-full ${isActive ? 'bg-[#EAF8EE]' : 'bg-[#FFF8E6]'}`}>
                    <Text className={`text-[10px] font-manrope-bold ${isActive ? 'text-[#22A559]' : 'text-[#F59E0B]'}`}>
                        {statusLabel}
                    </Text>
                </View>
            </View>
            <View className="h-[1px] bg-[#F3F4F6] mb-2.5" />
            <View className="flex-row justify-between mb-3">
                <View className="flex-1">
                    <Text className="text-[10px] font-manrope-medium text-[#9CA3AF] mb-0.5">Total Value</Text>
                    <Text className="text-[13px] font-manrope-bold text-[#111827]">{formatValue(deal.total_value)}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[10px] font-manrope-medium text-[#9CA3AF] mb-0.5">Paid So Far</Text>
                    <Text className="text-[13px] font-manrope-bold text-[#111827]">{formatValue(deal.paid_so_far)}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[10px] font-manrope-medium text-[#9CA3AF] mb-0.5">Stage</Text>
                    <Text className="text-[13px] font-manrope-bold text-[#4F48ED]">{currentStage}/{totalStages}</Text>
                </View>
            </View>
            <ProgressBar percentage={paidPct} animKey={animKey} />
            <View className="flex-row justify-between items-center">
                <Text className="text-[11px] font-manrope-medium text-[#9CA3AF]">{paidPct}% paid</Text>
                <Text className="text-[12px] font-manrope-bold text-[#4F48ED]">View Details →</Text>
            </View>
        </Pressable>
    );
});

