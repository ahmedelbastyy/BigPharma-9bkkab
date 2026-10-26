import { useState, useCallback, useEffect, useRef } from 'react';
import { useAlert } from '@/template';
import { useMedications } from '@/hooks/useMedications';
import { fetchMedicationEducation, checkDrugInteractions, type MedEducationContent, type DrugInteraction } from '@/services/educationService';
export function useMedicationReference(id: string) {
  const { getMedicationById, medications } = useMedications();
  const medication = getMedicationById(id);
  const { showAlert } = useAlert();
  const [education, setEducation] = useState<MedEducationContent | null>(null);
  const [eduLoading, setEduLoading] = useState(false);
  const [eduError, setEduError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<DrugInteraction[] | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionChecked, setInteractionChecked] = useState(false);
  const alive = useRef(true);
  const requestId = useRef(0);
  const identity = [id, medication?.name, medication?.genericName, medication?.strength, medication?.form, medication?.rxcui, medication?.ndc].join('|');
  useEffect(() => { alive.current = true; return () => { alive.current = false; requestId.current++; }; }, []);
  const loadEducation = useCallback(async (refresh = false) => {
    if (!medication) return;
    const request = ++requestId.current;
    setEduLoading(true); setEduError(null);
    const result = await fetchMedicationEducation({ name: medication.name, genericName: medication.genericName, strength: medication.strength, form: medication.form, rxcui: medication.rxcui, ndc: medication.ndc, refresh });
    if (!alive.current || request !== requestId.current) return;
    setEduLoading(false);
    if (result.error) setEduError(result.error); else setEducation(result.data);
  }, [identity]);
  useEffect(() => { requestId.current++; setEducation(null); setEduError(null); setInteractions(null); setInteractionChecked(false); }, [identity]);
  const handleCheckInteractions = useCallback(async () => {
    const active = medications.filter(medication => medication.status !== 'archived');
    if (active.length < 2) { showAlert('Not enough medications', 'Interaction checks require at least two active medications in your Cabinet.'); return; }
    if (interactionLoading) return;
    setInteractionLoading(true);
    const result = await checkDrugInteractions({ medications: active.map(medication => ({ name: medication.genericName || medication.name, rxcui: medication.rxcui })) });
    if (!alive.current) return;
    setInteractionLoading(false);
    if (result.unavailable || result.error || !result.data) {
      setInteractionChecked(false); setInteractions(null);
      showAlert('Interaction check could not be completed', result.error || 'Reliable interaction data is not currently available for this app. This is not an all-clear. Consult your pharmacist.'); return;
    }
    setInteractions(result.data); setInteractionChecked(true);
  }, [medications, interactionLoading, showAlert]);
  return { education, eduLoading, eduError, interactions, interactionLoading, interactionChecked, loadEducation, handleCheckInteractions };
}
