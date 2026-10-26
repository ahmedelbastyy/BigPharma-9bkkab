import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMedications } from '@/hooks/useMedications';
import { prepareCabinetGuides } from '@/services/cabinetGuidePreparationService';
export function useCabinetGuidePreparation(){const {user}=useAuth(),{medications,loading}=useMedications(),identity=medications.filter(m=>m.status!=='archived'&&!m.deletedAt).map(m=>m.rxcui||'').sort().join('|');useEffect(()=>{if(!user||loading||!identity)return;void prepareCabinetGuides(user.id,identity).catch(e=>console.error('Cabinet guide preparation',{message:e.message}));},[user?.id,identity,loading]);}
