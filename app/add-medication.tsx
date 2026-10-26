import { Text,ActivityIndicator } from 'react-native';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { AuthButton,AuthMessage } from '@/components/auth/AuthControls';
import { MedicationAddFlow } from '@/components/feature/MedicationAddFlow';
import { useMedicationAddRoute } from '@/hooks/useMedicationAddRoute';
import { Colors } from '@/constants/theme';
export function AddMedicationScreen(){const s=useMedicationAddRoute();if(!s.ready)return <AuthFrame title="Your medication" onBack={s.close}><ActivityIndicator color={Colors.textPrimary}/></AuthFrame>;if(s.error)return <AuthFrame title="Product unavailable" onBack={s.close}><AuthMessage error text={s.error}/><AuthButton label="Return to Cabinet" onPress={s.close}/></AuthFrame>;return <MedicationAddFlow initial={s.initial} editing={s.editing} initialQuery={s.query} onClose={s.close} onScan={s.scan}/>;}
export default AddMedicationScreen;
