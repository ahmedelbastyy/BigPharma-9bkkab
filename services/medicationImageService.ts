import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { readMedicationImageFile } from '@/services/medicationImageFileService';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import { verifiedMedicationSession } from '@/services/authenticatedSessionService';
import type { LibraryImage } from '@/services/medicationImageIdentity';
export interface MedicationUpload {name:string;uri:string;mimeType?:string;size?:number}
export async function pickMedicationImages():Promise<MedicationUpload[]>{const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp'],multiple:true,copyToCacheDirectory:true});return result.canceled?[]:result.assets.map(a=>({name:a.name,uri:a.uri,mimeType:a.mimeType,size:a.size}));}
export async function imageAction(body:Record<string,unknown>){const session=await verifiedMedicationSession();if(session.error)throw new Error(session.error);const {data,error}=await getSupabaseClient().functions.invoke('medication-images',{body});if(error){let message=error.message;if(error instanceof FunctionsHttpError){try{const text=await error.context.text();try{message=JSON.parse(text).error||text;}catch{message=text;}}catch{}}throw new Error(message);}if(data?.error)throw new Error(data.error);return data;}
export async function uploadMedicationImage(file:MedicationUpload){
 const session=await verifiedMedicationSession();if(session.error||!session.user)throw new Error(session.error||'Please sign in');if((file.size||0)>10000000)throw new Error('Image exceeds 10 MB');
 const filename=file.name.replace(/[^a-zA-Z0-9_.-]/g,'_').toLowerCase();if(!/\.(jpe?g|png|webp)$/.test(filename))throw new Error('Use a JPG, PNG or WebP image');
 const folder=`${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,10)}`,path=`${folder}/${filename}`,storage=getSupabaseClient().storage.from('medication-images');
 // Decode locally for safe mobile file:// handling. Derivatives use efficient WebP with no upscaling.
 const original=await ImageManipulator.manipulateAsync(file.uri,[],{base64:true,compress:1,format:ImageManipulator.SaveFormat.PNG});
 const display=await ImageManipulator.manipulateAsync(original.uri,[{resize:{width:Math.min(1000,original.width)}}],{base64:true,compress:.82,format:ImageManipulator.SaveFormat.WEBP});
 const thumb=await ImageManipulator.manipulateAsync(original.uri,[{resize:{width:Math.min(160,original.width)}}],{base64:true,compress:.72,format:ImageManipulator.SaveFormat.WEBP});
 // Retain original content under its actual filename/format, not a JPEG disguised as a WebP.
 const sourceBytes=await readMedicationImageFile(file.uri);
 const mime=/\.png$/.test(filename)?'image/png':/\.webp$/.test(filename)?'image/webp':'image/jpeg';
 for(const [target,payload,contentType] of [[path,sourceBytes,mime],[`${folder}/display.webp`,await readMedicationImageFile(display.uri,display.base64),'image/webp'],[`${folder}/thumb.webp`,await readMedicationImageFile(thumb.uri,thumb.base64),'image/webp']] as const){const result=await storage.upload(target,payload,{contentType,upsert:false,cacheControl:'3600'});if(result.error)throw new Error(result.error.message);}
 return imageAction({action:'register',path});
}
export async function loadApprovedMedicationImages():Promise<LibraryImage[]>{const client=getSupabaseClient();const rows:LibraryImage[]=[];for(let offset=0;offset<10000;offset+=400){const result=await client.from('medication_images').select('*').eq('review_status','approved').order('reviewed_at',{ascending:false}).range(offset,offset+399);if(result.error)throw new Error(result.error.message);rows.push(...result.data as LibraryImage[]);if(result.data.length<400)break;}
 const paths=Array.from(new Set(rows.flatMap(i=>[i.display_path,i.thumbnail_path].filter((p):p is string=>Boolean(p)))));const urls=new Map<string,string>();for(let n=0;n<paths.length;n+=400){const result=await client.storage.from('medication-images').createSignedUrls(paths.slice(n,n+400),3600);if(result.error)throw new Error(result.error.message);for(const item of result.data||[])if(item.path&&item.signedUrl)urls.set(item.path,item.signedUrl);}
 return rows.map(i=>({...i,displayUrl:urls.get(i.display_path||''),thumbnailUrl:urls.get(i.thumbnail_path||'')}));
}
export async function loadMedicationImageQueue():Promise<LibraryImage[]>{const client=getSupabaseClient(),result=await client.from('medication_images').select('*').eq('review_status','pending').order('uploaded_at',{ascending:false}).limit(100);if(result.error)throw new Error(result.error.message);const paths=result.data.map(i=>i.thumbnail_path||i.storage_path),signed=await client.storage.from('medication-images').createSignedUrls(paths,900);if(signed.error)throw new Error(signed.error.message);return result.data.map((i,index)=>({...i,thumbnailUrl:signed.data?.[index]?.signedUrl}));}
