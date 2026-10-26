
import { memo,useMemo } from 'react';
import { View,Text,Pressable,StyleSheet,ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors,Spacing,Radius,Typography,Layout } from '@/constants/theme';
import { youtubeDocument,youtubeEmbedOrigin } from '@/services/videoService';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { useLegalLinks } from '@/hooks/useLegalLinks';
export interface YouTubePlayerProps{videoId:string;title:string}
export const YouTubePlayer=memo(function YouTubePlayer({videoId,title}:YouTubePlayerProps){
 const state=useVideoPlayback(videoId),openLink=useLegalLinks();const html=useMemo(()=>youtubeDocument(videoId),[videoId]);
 if(!html)return null;
 return (
  <View style={styles.container}>
   <View style={styles.frame}>
    {!state.error ? (
     <WebView
      key={`${videoId}:${state.attempt}`}
      source={{html,baseUrl:`${youtubeEmbedOrigin}/`}}
      style={styles.webview}
      containerStyle={StyleSheet.absoluteFill}
      setSupportMultipleWindows={false}
      originWhitelist={['https://*']}
      javaScriptEnabled
      domStorageEnabled
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction
      scrollEnabled={false}
      accessibilityLabel={title}
      onMessage={event=>{try{const data=JSON.parse(event.nativeEvent.data);if(data.ready===true)state.loaded();if(typeof data.error==='number')state.failed(data.error);}catch{/* Ignore unrelated messages. */}}}
      onError={()=>state.failed()}
      onHttpError={()=>state.failed()}
     />
    ) : null}
    {!state.ready&&!state.error ? (
     <View pointerEvents="none" style={styles.loading}>
      <ActivityIndicator color={Colors.textPrimary}/>
      <Text style={styles.text}>Loading YouTube player</Text>
     </View>
    ) : null}
    {state.error ? (
     <View style={styles.loading}>
      <Text style={styles.text}>Embedded playback unavailable</Text>
     </View>
    ) : null}
   </View>
   {state.error ? (
    <View style={styles.error}>
     <Text style={styles.text}>{state.error}</Text>
     <Pressable onPress={state.retry} style={({pressed})=>[styles.button,pressed?styles.pressed:null]}>
      <Text style={styles.text}>Retry player</Text>
     </Pressable>
    </View>
   ) : null}
   <Pressable onPress={()=>openLink(`https://www.youtube.com/watch?v=${videoId}`)} style={({pressed})=>[styles.button,pressed?styles.pressed:null]} accessibilityLabel="Watch on YouTube if embedded playback is restricted">
    <Text style={styles.text}>Watch on YouTube</Text>
   </Pressable>
  </View>
 );
});
const styles=StyleSheet.create({container:{gap:Spacing.xs,width:'100%',minWidth:1,alignSelf:'center'},frame:{width:'100%',aspectRatio:16/9,backgroundColor:Colors.background,borderRadius:Radius.md,overflow:'hidden'},webview:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',backgroundColor:Colors.background},loading:{...StyleSheet.absoluteFillObject,padding:Spacing.md,backgroundColor:Colors.card,alignItems:'center',justifyContent:'center',gap:Spacing.xs},error:{padding:Spacing.sm,gap:Spacing.xs},text:{fontSize:Typography.base,color:Colors.textSecondary,textAlign:'center',lineHeight:26},button:{minHeight:Layout.touchTarget,padding:Spacing.sm,borderWidth:1,borderColor:Colors.borderLight,borderRadius:Radius.full,justifyContent:'center',alignItems:'center'},pressed:{opacity:0.6}});
