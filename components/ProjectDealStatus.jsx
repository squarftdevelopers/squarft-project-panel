import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const amount = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const stages = ['Deal in process', 'Documentation', 'Payment schedule', 'Completed'];
export default function ProjectDealStatus() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get(`/api/project-panel/owner-deals/${id}`); setDeal(response.data.data); }
    catch(e) { setError(e.response?.data?.message || 'Unable to load deal. Pull down to retry.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <SafeAreaView style={{flex:1,backgroundColor:'#F8FAFC'}}>
    <TouchableOpacity onPress={() => router.back()} style={{padding:20,flexDirection:'row',gap:14,alignItems:'center'}}><Ionicons name="arrow-back" size={24}/><Text style={{fontSize:20,fontWeight:'700'}}>Deal details</Text></TouchableOpacity>
    <ScrollView contentContainerStyle={{padding:20,gap:16}} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
      {loading && !deal && <ActivityIndicator color="#4A43EC"/>}
      {!!error && <Text style={{color:'#B91C1C'}}>{error}</Text>}
      {deal && <>
        <Text style={{fontSize:22,fontWeight:'700'}}>{deal.property_title}</Text>
        <Text>{deal.status === 'closed' ? 'Completed' : deal.status === 'cancelled' ? 'Cancelled' : stages[deal.current_stage_index] || 'Deal in process'}</Text>
        <Text>Deal value: {amount(deal.deal_value || deal.total_value)}</Text>
        <Text>Received: {amount(deal.received_amount || deal.paid_so_far)} · Remaining: {amount(deal.pending_amount)}</Text>
        <Text style={{fontSize:18,fontWeight:'700'}}>Payment schedule</Text>
        {!deal.payments.length && <Text>The admin team has not added the payment schedule yet.</Text>}
        {deal.payments.map(p => <View key={p.id} style={{backgroundColor:'white',padding:16,borderRadius:16,gap:6}}><Text style={{fontWeight:'700'}}>{p.milestone} · {amount(p.amount)}</Text><Text>{p.status} · Due {p.due_date ? new Date(p.due_date).toLocaleDateString('en-IN') : 'Not scheduled'}</Text>{!!p.reference && <Text>Reference: {p.reference}</Text>}</View>)}
        <Text style={{fontSize:18,fontWeight:'700'}}>Documents</Text>
        {!deal.documents.length && <Text>No documents added yet.</Text>}
        {deal.documents.map(d => <TouchableOpacity key={d.id} onPress={() => Linking.openURL(d.url).catch(() => setError('Unable to open document.'))} style={{padding:16,backgroundColor:'white',borderRadius:16}}><Text style={{color:'#4A43EC'}}>{d.name} ↗</Text><Text>{d.status || 'Uploaded'}</Text></TouchableOpacity>)}
        <Text style={{fontSize:18,fontWeight:'700'}}>Activity</Text>
        {deal.timeline.map(t => <View key={t.id} style={{borderLeftWidth:3,borderLeftColor:'#4A43EC',padding:12,gap:5}}><Text style={{fontWeight:'700'}}>{t.title}</Text><Text>{t.details}</Text><Text style={{color:'#64748B'}}>{new Date(t.created_at).toLocaleString('en-IN')}</Text></View>)}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
