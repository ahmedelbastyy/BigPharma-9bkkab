import { memo,useState,useCallback } from 'react';
import { View,Text,Pressable,StyleSheet,FlatList } from 'react-native';
import { savingsPerformanceSnapshot } from '@/services/savingsPerformanceService';
import { nadacRequestSnapshot } from '@/services/nadacService';
import { Colors as C,Spacing as S,Typography as T,Layout } from '@/constants/theme';
interface SavingsDiagnosticsProps {}
export const SavingsDiagnostics=memo(function SavingsDiagnostics(_props:SavingsDiagnosticsProps){
 const [visible,setVisible]=useState(false),[metrics,setMetrics]=useState<ReturnType<typeof savingsPerformanceSnapshot>>([]),[requests,setRequests]=useState(nadacRequestSnapshot());
 const refresh=useCallback(()=>{setMetrics(savingsPerformanceSnapshot());setRequests(nadacRequestSnapshot());},[]);
 return <View style={styles.block}><Pressable onPress={()=>{refresh();setVisible(v=>!v);}} accessibilityState={{expanded:visible}} accessibilityRole="button" style={({pressed})=>[styles.button,pressed?styles.pressed:null]}><Text style={styles.text}>Performance diagnostics</Text></Pressable>{visible?<View testID="savings-performance-diagnostics" style={styles.block}><Text style={styles.text}>This session only · no patient or location information.</Text><Text style={styles.text}>{requests.active} active cost request · {requests.queued} queued</Text><FlatList scrollEnabled={false} data={metrics} keyExtractor={m=>m.stage} renderItem={({item:m})=><Text style={styles.text}>{m.stage.replace(/_/g,' ')}: {m.count} samples · mean {m.meanMs} ms · max {m.maxMs} ms · {m.errors} errors · {m.cancelled} cancelled</Text>}/><Text style={styles.text}>Layout timing is not a native frame-rate or memory measurement. Use device profiling for memory, FPS and closed-app tests.</Text><Pressable onPress={refresh} style={({pressed})=>[styles.button,pressed?styles.pressed:null]}><Text style={styles.text}>Refresh measurements</Text></Pressable></View>:null}</View>;
});
const styles=StyleSheet.create({block:{gap:S.xs},text:{color:C.textSecondary,fontSize:T.sm,lineHeight:22},button:{minHeight:Layout.touchTarget,justifyContent:'center'},pressed:{opacity:.65}});
