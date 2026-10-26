import { AuthFrame } from '@/components/auth/AuthFrame';
import { AuthButton,AuthMessage } from '@/components/auth/AuthControls';
import { useRouter } from 'expo-router';
// Legacy mobile invitation destination. New QR codes open BigPharma Connect over HTTPS.
export function MedicationShareInvitationScreen(){const router=useRouter();return <AuthFrame title="Private medication invitation" onBack={()=>router.replace('/')}><AuthMessage text="New invitations open BigPharma Connect, where verified professionals sign in before requesting access. To share your information, open Share With Pharmacist in your BigPharma profile. This earlier mobile link does not grant record access."/><AuthButton label="Return to BigPharma" onPress={()=>router.replace('/')}/></AuthFrame>;}
export default MedicationShareInvitationScreen;
