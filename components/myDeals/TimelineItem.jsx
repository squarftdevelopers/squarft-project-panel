import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TimelineItem = ({ status, title, time, badge, iconName, children, index = 0, onItemLayout }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.6)).current;
    const slideAnim = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        const delay = index * 120;
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 350,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 80,
                friction: 8,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index]);

    return (
        <Animated.View
            onLayout={(event) => onItemLayout?.(index, event.nativeEvent.layout)}
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
            className="flex-row mb-6 relative z-10"
        >
            {/* Dot */}
            <View className="mr-3 items-center mt-0.5">
                {status === 'completed' && (
                    <Animated.View
                        style={{ transform: [{ scale: scaleAnim }] }}
                        className="w-[18px] h-[18px] rounded-full bg-[#6231FF] justify-center items-center z-10"
                    >
                        <Ionicons name="checkmark" size={10} color="white" />
                    </Animated.View>
                )}
                {status === 'current' && (
                    <Animated.View
                        style={{ transform: [{ scale: scaleAnim }] }}
                        className="w-[18px] h-[18px] rounded-full border-[2px] border-[#6231FF] bg-white justify-center items-center z-10"
                    >
                        <View className="w-[8px] h-[8px] bg-[#6231FF] rounded-full" />
                    </Animated.View>
                )}
                {status === 'pending' && (
                    <Animated.View
                        style={{ transform: [{ scale: scaleAnim }] }}
                        className="w-[18px] h-[18px] rounded-full border border-gray-200 bg-white justify-center items-center z-10"
                    >
                        <Ionicons name={iconName} size={10} color="#D1D5DB" />
                    </Animated.View>
                )}
            </View>

            {/* Content */}
            <View className="flex-1">
                <View className="flex-row items-center gap-2">
                    <Text className={`text-[13px] font-inter-bold ${
                        status === 'current' ? 'text-[#6231FF]'
                        : status === 'pending' ? 'text-[#9CA3AF]'
                        : 'text-[#1F2937]'
                    }`}>
                        {title}
                    </Text>
                    {badge && (
                        <View className="bg-[#6231FF] px-1 py-[1.5px] rounded-[4px]">
                            <Text className="text-[8px] font-inter-bold text-white tracking-wider">{badge}</Text>
                        </View>
                    )}
                </View>
                {time && (
                    <Text className={`text-[10px] mt-0.5 font-inter-medium ${
                        status === 'pending' ? 'text-[#D1D5DB]' : 'text-[#6B7280]'
                    }`}>
                        {time}
                    </Text>
                )}
                {children}
            </View>
        </Animated.View>
    );
};

export default TimelineItem;
