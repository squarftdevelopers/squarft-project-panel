import { useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabDocuments({ documents = [] }) {
    const [error, setError] = useState('');
    return <View>
        <Text className="text-[16px] font-manrope-bold text-[#111827] mb-4">Documents</Text>
        {!!error && <Text className="text-red-600 mb-3">{error}</Text>}
        {!documents.length && <Text className="text-center text-[#9CA3AF] font-manrope-medium py-8">No documents added yet</Text>}
        {documents.map(document => <Pressable key={document.id} disabled={!document.url} onPress={() => Linking.openURL(document.url).catch(() => setError('Unable to open document.'))} className="flex-row items-center rounded-[12px] border border-[#F3F4F6] bg-white p-3.5 mb-3">
            <View className="w-[38px] h-[38px] rounded-[10px] bg-[#EEEDFF] items-center justify-center mr-3"><Ionicons name="document-text-outline" size={20} color="#4F48ED" /></View>
            <View className="flex-1"><Text className="text-[13px] font-manrope-bold text-[#111827]">{document.name || document.title || document.type || 'Document'}</Text><Text className="mt-1 text-[11px] font-manrope-medium text-[#9CA3AF]">{document.status || 'Uploaded'}</Text></View>
            {!!document.url && <Ionicons name="open-outline" size={18} color="#4F48ED" />}
        </Pressable>)}
    </View>;
}
