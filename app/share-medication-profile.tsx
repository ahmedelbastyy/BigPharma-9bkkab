import {View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Share} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import {MaterialIcons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {usePatientSharing} from '@/hooks/usePatientSharing';
import {useResponsiveLayout} from '@/hooks/useResponsiveLayout';
import {useAlert} from '@/template';
import {BrandMark} from '@/components/ui/BrandMark';
import {invitationCountdown, type ShareScope} from '@/services/patientSharingService';
import {Colors as C, Spacing as S, Radius as R, Typography as T} from '@/constants/theme';
const choices: {key: ShareScope; title: string; description: string}[] = [
 {key:'medications',title:'Current medications',description:'Names, strengths and formulations. Turn off to hide medication names throughout the shared view.'},
 {key:'schedule',title:'Medication schedules and dosages',description:'Dose quantities, frequency and times. Directions are included only when medication identity is also shared.'},
 {key:'adherence',title:'Medication adherence & statistics',description:'Recorded doses and trends within the selected history window. Unrecorded does not mean missed.'},
 {key:'activity',title:'Medication activity history',description:'Recorded changes. Names require medication sharing; private notes are never included.'},
];
const scopeLabel = (scope: string) => scope==='profile' ? 'Name, email & available profile photo' : choices.find(c => c.key===scope)?.title || scope;
export function ShareMedicationProfileScreen() {
 const s=usePatientSharing(),router=useRouter(),layout=useResponsiveLayout(),{showAlert}=useAlert();
 const canGenerate=Boolean(s.identity && !s.busy && !s.loading);
 const generate=()=>{if(canGenerate)void s.create();};
 const revoke=(id:string)=>showAlert('Revoke Access?','This ends the invitation and any redeemed patient session. Generate a new invitation to share again.',[
  {text:'Cancel',style:'cancel'},{text:'Revoke Access',style:'destructive',onPress:()=>{void s.revoke(id);}},
 ]);
 const share=async()=>{if(!s.current?.share_url)return;try{await Share.share({message:s.current.share_url,title:'BigPharma secure invitation'});}catch{showAlert('Could not share link','Please try again.');}};
 return <SafeAreaView edges={['top','left','right']} style={styles.root}>
  <FlatList data={s.items} keyExtractor={i=>i.id} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content,{paddingBottom:layout.tabContentBottom}]}
   ListHeaderComponent={<View style={styles.blocks}>
    <View style={styles.top}><Pressable onPress={()=>router.canGoBack()?router.back():router.replace('/(tabs)/more')} accessibilityLabel="Back to profile" style={({pressed})=>[styles.icon,pressed?styles.pressed:null]}><MaterialIcons name="arrow-back" size={24} color={C.textPrimary}/></Pressable><BrandMark width={112}/></View>
    <Text style={styles.eyebrow}>SHARE WITH PHARMACIST</Text><Text style={styles.title}>Share Your Medical Information</Text>
    <Text style={styles.body}>Give a verified healthcare professional temporary access. Choose the medication information you want to share, then generate an invitation.</Text>
    {s.current?.share_url ? <View testID="sharing-qr-card" style={styles.card}>
     <View style={styles.qr} accessibilityLabel="Secure invitation QR code"><QRCode value={s.current.share_url} size={208} color={C.background} backgroundColor={C.textPrimary}/></View>
     {s.current.data_class==='synthetic_demo_v1'?<Text testID="sharing-synthetic-badge" style={styles.heading}>SYNTHETIC DEMO — NO PERSONAL RECORDS</Text>:null}
     <View style={styles.center}><Text style={styles.heading}>Scan to connect</Text><Text testID="sharing-countdown" style={styles.timer}>Expires in {invitationCountdown(s.current.expires_at,s.now)}</Text></View>
     <Text style={styles.body}>Access automatically expires when the timer reaches zero.</Text>
     <Text style={styles.meta}>Expires {new Date(s.current.expires_at).toLocaleString()} · {new Date(s.current.expires_at).toISOString()}</Text>
     <Text style={styles.meta}>{s.current.scopes.map(scopeLabel).join(' · ')}</Text>
     <Text selectable style={styles.url}>{s.current.share_url}</Text>
     <Pressable onPress={()=>{void share();}} style={({pressed})=>[styles.primary,pressed?styles.pressed:null]}><Text style={styles.dark}>Share Invitation Link</Text></Pressable>
     <Pressable disabled={s.busy} onPress={()=>revoke(s.current!.id)} style={({pressed})=>[styles.secondary,pressed||s.busy?styles.pressed:null]}><Text style={styles.heading}>Revoke Access</Text></Pressable>
     <Pressable onPress={s.dismissQr} style={({pressed})=>[styles.secondary,pressed?styles.pressed:null]}><Text style={styles.heading}>New invitation</Text></Pressable>
    </View> : <>
     <View style={styles.notice}><MaterialIcons name="lock-outline" size={23} color={C.textPrimary}/><Text style={[styles.body,styles.flex]}>Your QR contains a random invitation, not your medical records. Share it directly with your healthcare professional.</Text></View>
     <Text style={styles.heading}>Optional medication permissions</Text>
     {choices.map(c=><Pressable key={c.key} testID={`sharing-scope-${c.key}`} disabled={s.busy} accessibilityRole="switch" accessibilityState={{checked:s.scopes.includes(c.key),disabled:s.busy}} accessibilityLabel={c.title} onPress={()=>s.choose(c.key)} style={({pressed})=>[styles.choice,s.scopes.includes(c.key)?styles.chosen:null,pressed?styles.pressed:null]}><View style={[styles.switchTrack,s.scopes.includes(c.key)?styles.switchOn:null]}><View style={[styles.switchThumb,s.scopes.includes(c.key)?styles.switchThumbOn:null]}/></View><View style={styles.flex}><Text style={styles.heading}>{c.title}</Text><Text style={styles.meta}>{c.description}</Text></View></Pressable>)}
     <Text style={styles.heading}>Access duration</Text><View style={styles.row}>{[5,15,30,60].map(m=><Pressable key={m} disabled={s.busy} accessibilityRole="radio" accessibilityState={{selected:s.minutes===m,disabled:s.busy}} onPress={()=>s.setMinutes(m)} style={({pressed})=>[styles.segment,s.minutes===m?styles.selected:null,pressed?styles.pressed:null]}><Text style={[styles.segmentText,s.minutes===m?styles.dark:null]}>{m===60?'1 hour':`${m} min`}</Text></Pressable>)}</View>
     <Text style={styles.meta}>Starts when generated. The same absolute expiration time applies on every device. Revoke access at any time.</Text>
     <Text testID="sharing-identity-notice" style={styles.body}>Your name, email, and profile photo (if available) will be included when you share with a verified healthcare professional.</Text>
     {s.loading ? <ActivityIndicator color={C.textSecondary}/> : !s.identity ? <Pressable onPress={()=>router.push('/settings')} style={({pressed})=>[styles.secondary,pressed?styles.pressed:null]}><Text style={styles.heading}>Complete profile in Settings</Text></Pressable> : null}
     <Pressable testID="generate-secure-qr" disabled={!canGenerate} accessibilityRole="button" accessibilityState={{disabled:!canGenerate}} onPress={generate} style={({pressed})=>[styles.primary,pressed||!canGenerate?styles.pressed:null]}>{s.busy?<ActivityIndicator color={C.background}/>:<Text style={styles.dark}>Generate Secure QR Code</Text>}</Pressable>
    </>}
    {s.error ? <View accessibilityLiveRegion="polite" style={styles.notice}><MaterialIcons name="error-outline" color={C.error} size={22}/><Text style={[styles.error,styles.flex]}>{s.error}</Text></View> : null}
    <View style={styles.top}><Text style={styles.heading}>Your sharing invitations</Text><Pressable disabled={s.loading} onPress={()=>{void s.load();}} accessibilityLabel="Refresh invitation status" style={({pressed})=>[styles.icon,pressed?styles.pressed:null]}>{s.loading?<ActivityIndicator color={C.textSecondary}/>:<MaterialIcons name="refresh" size={22} color={C.textPrimary}/>}</Pressable></View>
    <Text style={styles.meta}>Leaving this screen hides the QR, but access remains valid until expiration or revocation. Earlier invitations without identity authorization must be regenerated.</Text>
   </View>}
   renderItem={({item})=>{
    const status=item.revoked_at?'Revoked':s.clockReady&&Date.parse(item.expires_at)<=s.now?'Expired':item.status||'Active';
    return <View testID="sharing-invitation" style={styles.history}><View style={styles.top}><Text style={styles.heading}>{status}{item.data_class==='synthetic_demo_v1'?' · Synthetic demo':''}</Text><Text style={styles.meta}>{item.redeemed_at?'Redeemed by a professional':'Not yet redeemed'}</Text></View><Text style={styles.body}>{item.scopes.map(scopeLabel).join(' · ')}</Text><Text style={styles.meta}>Created {new Date(item.created_at).toLocaleString()}</Text><Text style={styles.meta}>Expires {new Date(item.expires_at).toLocaleString()}</Text>{!item.identity_consented_at?<Text style={styles.meta}>Earlier invitation format. Generate a new QR for BigPharma Connect.</Text>:null}{status==='Active'?<Pressable disabled={s.busy} onPress={()=>revoke(item.id)} style={({pressed})=>[styles.secondary,pressed||s.busy?styles.pressed:null]}><Text style={styles.heading}>Revoke Access</Text></Pressable>:null}</View>;
   }} ListEmptyComponent={!s.loading?<Text style={styles.meta}>No invitations yet.</Text>:null}/>
 </SafeAreaView>;
}
export default ShareMedicationProfileScreen;
const styles=StyleSheet.create({root:{flex:1,backgroundColor:C.background},content:{padding:S.md,maxWidth:640,width:'100%',alignSelf:'center'},blocks:{gap:S.md},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:S.xs,flexWrap:'wrap'},icon:{minHeight:48,minWidth:48,justifyContent:'center',alignItems:'center'},eyebrow:{fontSize:T.sm,letterSpacing:1.2,color:C.textMuted},title:{fontSize:T.xxl,color:C.textPrimary,fontWeight:T.semibold,letterSpacing:-.6,includeFontPadding:false},heading:{fontSize:T.base,color:C.textPrimary,fontWeight:T.semibold,lineHeight:24,includeFontPadding:false},body:{fontSize:T.base,color:C.textSecondary,lineHeight:27},meta:{fontSize:T.sm,color:C.textMuted,lineHeight:22},card:{padding:S.md,gap:S.md,backgroundColor:C.card,borderRadius:R.xl,borderWidth:1,borderColor:C.border},qr:{alignSelf:'center',backgroundColor:C.textPrimary,padding:S.md,borderRadius:R.md},center:{alignItems:'center',gap:S.xs},timer:{fontSize:T.xl,fontWeight:T.semibold,color:C.textPrimary,fontVariant:['tabular-nums'],includeFontPadding:false},notice:{flexDirection:'row',alignItems:'center',gap:S.sm,padding:S.md,backgroundColor:C.card,borderRadius:R.lg},choice:{minHeight:72,flexDirection:'row',alignItems:'center',gap:S.sm,padding:S.md,backgroundColor:C.card,borderRadius:R.lg,borderWidth:1,borderColor:C.border},chosen:{borderColor:C.borderLight,backgroundColor:C.elevated},flex:{flex:1,minWidth:1},row:{flexDirection:'row',gap:S.xs},segment:{flex:1,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:R.md,borderWidth:1,borderColor:C.border},selected:{backgroundColor:C.textPrimary,borderColor:C.textPrimary},segmentText:{fontSize:T.base,color:C.textSecondary,fontWeight:T.medium},primary:{minHeight:52,alignItems:'center',justifyContent:'center',backgroundColor:C.textPrimary,borderRadius:R.full,paddingHorizontal:S.md},dark:{fontSize:T.base,color:C.background,fontWeight:T.semibold,textAlign:'center'},secondary:{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:S.md,borderRadius:R.md,borderWidth:1,borderColor:C.borderLight},url:{fontSize:T.sm,color:C.textSecondary,lineHeight:22},history:{marginVertical:S.xs,padding:S.md,gap:S.xs,borderWidth:1,borderColor:C.border,borderRadius:R.lg,backgroundColor:C.card},switchTrack:{width:44,height:26,borderRadius:R.full,backgroundColor:C.elevated,borderWidth:1,borderColor:C.borderLight,justifyContent:'center',paddingHorizontal:3},switchOn:{backgroundColor:C.textPrimary},switchThumb:{width:18,height:18,borderRadius:R.full,backgroundColor:C.textSecondary},switchThumbOn:{alignSelf:'flex-end',backgroundColor:C.background},error:{fontSize:T.base,color:C.error,lineHeight:26},pressed:{opacity:.65}});
