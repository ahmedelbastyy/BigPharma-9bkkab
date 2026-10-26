import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import type { ScanCandidate } from '@/services/scannerService';
import type { CatalogMatch } from '@/services/catalogService';
import { resolveScanProduct } from '@/services/scanProductResolutionService';
import { loadMedicationProfile, type LoadedMedicationProfile } from '@/services/medicationProfileService';
import { scannerMedicationGuide } from '@/services/prewrittenMedicationService';
import { scanIdentification } from '@/services/scannerReviewService';
import { curatedScanSummary, verifiedScanSummary, scanReferenceMatches } from '@/services/scanMedicationSummaryService';
import { buildDetailPage } from '@/services/medicationDetailPresentation';

const emptyProfile = (): LoadedMedicationProfile => ({ reference: null, labels: [], progress: null, error: null });
interface ScanLookup {
  candidate: ScanCandidate | null;
  matched: CatalogMatch | null;
  result: LoadedMedicationProfile;
  loading: boolean;
}

export function useScanClinicalProfile(candidate: ScanCandidate | null) {
  const identification = useMemo(() => scanIdentification(candidate), [candidate]);
  const curated = useMemo(() => curatedScanSummary(candidate), [candidate]);
  const guide = useMemo(() => candidate ? scannerMedicationGuide(candidate, null) : null, [candidate]);
  const [expandedFor, setExpandedFor] = useState<ScanCandidate | null>(null);
  const detailsExpanded = Boolean(candidate && expandedFor === candidate);
  const toggleDetails = useCallback(() => setExpandedFor(value => value === candidate ? null : candidate), [candidate]);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const [lookup, setLookup] = useState<ScanLookup>({ candidate: null, matched: null, result: emptyProfile(), loading: false });
  const completed = useRef<{ candidate: ScanCandidate | null; attempt: number }>({ candidate: null, attempt: -1 });
  const needsReference = identification.canPreview && (!curated || detailsExpanded);

  useEffect(() => {
    if (!candidate || !needsReference) return;
    if (completed.current.candidate === candidate && completed.current.attempt === attempt) return;
    let alive = true;
    setLookup({ candidate, matched: null, result: emptyProfile(), loading: true });
    void (async () => {
      // Resolve once, then load only that product's saved profile. No concurrent legacy lookup.
      const matched = await resolveScanProduct(candidate);
      if (!alive) return;
      const result = matched
        ? await loadMedicationProfile({ name: matched.matchedName, rxcui: matched.rxcui }, undefined, attempt > 0)
        : { ...emptyProfile(), error: 'Verified general information is not available for this label match.' };
      if (!alive) return;
      completed.current = { candidate, attempt };
      setLookup({ candidate, matched, result, loading: false });
    })().catch(() => {
      if (!alive) return;
      completed.current = { candidate, attempt };
      setLookup({ candidate, matched: null, result: { ...emptyProfile(), error: 'Medication information is unavailable. You can still review the prescription details.' }, loading: false });
    });
    return () => { alive = false; };
  }, [candidate, needsReference, attempt]);

  // Never show a previous candidate's profile while switching among OCR alternatives.
  const current = lookup.candidate === candidate ? lookup : { candidate, matched: null, result: emptyProfile(), loading: false };
  const ready = Boolean(candidate && current.matched && current.result.approved && current.result.reference?.rxcui === current.matched.rxcui && scanReferenceMatches(candidate, current.result.reference));
  const model = useMemo(() => buildDetailPage(candidate?.name || '', ready ? current.result.reference?.details || {} : {}, candidate?.strength, candidate?.form), [candidate, ready, current.result.reference]);
  const summary = useMemo(() => curated || (candidate ? verifiedScanSummary(candidate, ready ? current.result.reference : null, ready, model) : null), [curated, candidate, ready, current.result.reference, model]);
  const facts = useMemo(() => [model.bigPicture, model.mechanism, model.boxed, model.warning, model.contraindications, model.adverse, ...model.precautions, model.administration, model.storage].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact)), [model]);
  return {
    identification, summary, guide, detailsExpanded, toggleDetails, ready, model, facts,
    matched: current.matched,
    resolving: current.loading,
    profile: { ...current.result, loading: current.loading, retry, error: current.result.error || '' },
  };
}
