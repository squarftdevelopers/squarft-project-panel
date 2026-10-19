import { useRef, useState } from 'react';
import { View, Text, Pressable, Linking, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickUpload } from '../../utils/pickUpload';
import api from '../../services/api';

const label = status => ({required:'Upload requested',pending:'Awaiting admin review',verified:'Approved',rejected:'Please upload again'}[status] || status);
export default function TabDocuments({ documents = [], dealId, onUploaded }) {
    const [activeTab, setActiveTab] = useState('shared');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(null);
    const uploadLock = useRef(false);
    const visible = documents.filter(document => activeTab === 'shared' ? document.source === 'admin' : document.source === 'project_panel');
    const upload = async document => {
        if (uploadLock.current) return;
        uploadLock.current = true; setError('');
        try {
            const result = await pickUpload({type:['application/pdf','image/jpeg','image/png','image/webp'],copyToCacheDirectory:true},true);
            if (result.canceled || !result.assets?.[0]) return;
            const file = result.assets[0];
            if (file.size > 5*1024*1024 || file.fileSize > 5*1024*1024) throw new Error('Choose a file smaller than 5 MB.');
            const name = file.name || file.fileName || 'document.jpg';
            const mime = file.mimeType || ({pdf:'application/pdf',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg'}[name.split('.').pop().toLowerCase()]) || 'image/jpeg';
            const form = new FormData();
            form.append('file',{uri:file.uri,name,type:mime});
            setUploading(document.id);
            await api.post(`/api/project-panel/owner-deals/${dealId}/documents/${document.id}/upload`,form,{headers:{'Content-Type':'multipart/form-data'},timeout:60000});
            await onUploaded?.();
            Alert.alert('Document submitted','Your document has been sent to admin for review.');
        } catch(e) { setError(e.response?.data?.message || e.message || 'Unable to upload document. Please try again.'); }
        finally { uploadLock.current=false; setUploading(null); }
    };
    return <View>
        <View className="flex-row bg-[#EEEDFF] rounded-[10px] p-1 mb-4">
            {[['shared','Shared documents'],['requested','Requested documents']].map(([id,title]) => <Pressable key={id} onPress={() => setActiveTab(id)} className={`flex-1 rounded-lg py-2 items-center ${activeTab===id ? 'bg-white' : ''}`}><Text className={`text-[11px] font-manrope-bold ${activeTab===id ? 'text-[#4F48ED]' : 'text-[#9CA3AF]'}`}>{title}</Text></Pressable>)}
        </View>
        <Text className="text-[12px] font-manrope-medium text-[#6B7280] mb-4">{activeTab==='shared' ? 'Documents shared by admin. Tap to view.' : 'Upload the documents requested by admin. PDF, JPG, PNG or WebP, up to 5 MB.'}</Text>
        {!!error && <Text accessibilityRole="alert" className="text-red-600 mb-3">{error}</Text>}
        {!visible.length && <Text className="text-center text-[#9CA3AF] font-manrope-medium py-8">{activeTab==='shared' ? 'No shared documents yet' : 'No documents requested'}</Text>}
        {visible.map(document => <View key={document.id} className="rounded-[12px] border border-[#F3F4F6] bg-white p-3.5 mb-3">
            <View className="flex-row items-center">
                <View className="w-[38px] h-[38px] rounded-[10px] bg-[#EEEDFF] items-center justify-center mr-3"><Ionicons name="document-text-outline" size={20} color="#4F48ED" /></View>
                <View className="flex-1"><Text className="text-[13px] font-manrope-bold text-[#111827]">{document.name || 'Document'}</Text><Text className="mt-1 text-[11px] font-manrope-medium text-[#9CA3AF]">{label(document.status)}</Text></View>
                {!!document.url && <Pressable accessibilityLabel={`View ${document.name}`} onPress={() => Linking.openURL(document.url).catch(() => setError('Unable to open document.'))} className="p-2"><Ionicons name="open-outline" size={20} color="#4F48ED" /></Pressable>}
            </View>
            {document.source==='project_panel' && ['required','rejected'].includes(document.status) && <Pressable disabled={!!uploading} onPress={() => upload(document)} className={`mt-3 rounded-lg bg-[#4F48ED] py-3 items-center ${uploading ? 'opacity-50' : ''}`}>
                {uploading===document.id ? <ActivityIndicator color="white"/> : <Text className="text-[12px] font-manrope-bold text-white">{document.url ? 'Upload again' : 'Upload document'}</Text>}
            </Pressable>}
        </View>)}
    </View>;
}
