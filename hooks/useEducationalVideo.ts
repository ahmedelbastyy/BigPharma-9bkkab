import { useCallback, useEffect, useState } from 'react';
import { fetchEducationalVideo, type EducationalVideo } from '@/services/videoService';
import type { MedicationVideoIdentity } from '@/services/videoLibraryRules';
export function useEducationalVideo(medication: MedicationVideoIdentity) {
  const identity = [medication.name,medication.genericName,medication.brandName,medication.form,medication.route,medication.device,medication.catalogId].join('|');
  const [video, setVideo] = useState<EducationalVideo | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => { let alive = true; setLoading(true); setError(null); setVideo(null); void fetchEducationalVideo(medication).then(result => { if (alive) { setVideo(result.data); setError(result.error); setLoading(false); } }); return () => { alive = false; }; }, [identity, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { video, loading, error, retry };
}
