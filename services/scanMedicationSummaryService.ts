import type { ScanCandidate } from './scannerService';
import type { CatalogMatch } from './catalogService';
import type { DetailPageModel } from './medicationDetailPresentation';
import type { SupportedMedication } from './prewrittenMedicationService';
import { scannerMedicationGuide } from './prewrittenMedicationService';
import { scanIdentification, sameScanMedication } from './scannerReviewService';
import { medicationBulletPoints, medicationInformationGroups } from './medicationBulletService';

export interface QuickMedicationSummary {
  name: string;
  uses: string | null;
  mechanism: string | null;
  important: string | null;
  sourceUrl: string;
  source: 'MedlinePlus' | 'Official labeling';
}

// Concise paraphrases checked against the linked MedlinePlus monographs on 2026-10-26.
// No AI-generated claims, product-specific dose instructions, or claimed clinical review.
const summaries: Record<SupportedMedication, Pick<QuickMedicationSummary, 'uses' | 'mechanism' | 'important'>> = {
  losartan: {
    uses: 'Losartan is commonly prescribed to treat high blood pressure. It can also help protect the kidneys in certain people with type 2 diabetes.',
    mechanism: 'Losartan is an angiotensin II receptor blocker (ARB). It relaxes blood vessels, making it easier for blood to flow and helping lower blood pressure.',
    important: 'Losartan can cause dizziness, particularly when starting treatment. It should not be used during pregnancy. Ask a healthcare professional before using potassium supplements or potassium-containing salt substitutes.',
  },
  atorvastatin: {
    uses: 'Helps lower cholesterol and reduce the risk of heart attack and stroke.',
    mechanism: 'A statin that slows cholesterol production in the body.',
    important: 'Report unexplained muscle pain or weakness, or signs of liver problems such as dark urine. Check other medicines and grapefruit use with your clinician.',
  },
  metformin: {
    uses: 'Helps control blood sugar in type 2 diabetes.',
    mechanism: 'Reduces sugar made by the liver and helps the body respond better to insulin.',
    important: 'May cause nausea or diarrhea. Rarely causes serious lactic acidosis. Tell your clinician about kidney disease, severe illness, dehydration, or a planned contrast scan.',
  },
  lisinopril: {
    uses: 'Treats high blood pressure and heart failure, and may improve survival after a heart attack.',
    mechanism: 'An ACE inhibitor that reduces chemicals that tighten blood vessels, helping blood flow more easily.',
    important: 'May cause dizziness or a dry cough. Do not use during pregnancy. Face or tongue swelling needs emergency care. Check with a clinician before using potassium supplements or salt substitutes.',
  },
  amlodipine: {
    uses: 'Treats high blood pressure and helps prevent certain types of angina (chest pain).',
    mechanism: 'A calcium channel blocker that relaxes blood vessels and improves blood flow to the heart.',
    important: 'May cause ankle swelling or dizziness. It does not stop an active angina attack. Seek medical advice urgently for worsening chest pain.',
  },
  levothyroxine: {
    uses: 'Treats an underactive thyroid by replacing missing thyroid hormone.',
    mechanism: 'Replaces thyroid hormone normally made by the body, supporting metabolism and other body functions.',
    important: 'Not for weight loss. Too much can cause a fast or irregular heartbeat. Calcium and iron can reduce absorption; ask about separating them from this medicine.',
  },
};

export function curatedScanSummary(candidate: ScanCandidate | null): QuickMedicationSummary | null {
  if (!candidate || !scanIdentification(candidate).canPreview) return null;
  // Never wait for manufacturer, NDC, RxCUI, directions, or an enrichment request.
  const guide = scannerMedicationGuide(candidate, null);
  return guide ? { name: guide.name, ...summaries[guide.id], sourceUrl: guide.sourceUrl, source: 'MedlinePlus' } : null;
}

export function scanReferenceMatches(candidate: ScanCandidate, reference: CatalogMatch | null): boolean {
  if (!reference || reference.spellingSuggestion || !scanIdentification(candidate).canPreview) return false;
  const ingredients = reference.details.activeIngredients || [];
  const names = ingredients.length ? [ingredients.map(i => i.name).join(' / ')] : [reference.genericName, reference.matchedName, reference.details.fullGenericName || '', ...(reference.details.brandNames || [])];
  return sameScanMedication(candidate, names);
}

function trustedMedicalSource(url: string | undefined): url is string {
  return Boolean(url && /^https:\/\/(?:medlineplus\.gov|dailymed\.nlm\.nih\.gov|(?:www\.)?accessdata\.fda\.gov|(?:www\.)?fda\.gov)\//.test(url));
}

// Unsupported drugs use only already-approved, identity-matched reference content.
// Missing sections stay unavailable; neither OCR text nor a generated scan summary is used.
export function verifiedScanSummary(candidate: ScanCandidate, reference: CatalogMatch | null, approved: boolean, model: DetailPageModel): QuickMedicationSummary | null {
  if (!approved || !scanReferenceMatches(candidate, reference) || !reference) return null;
  const details = reference.details;
  const url = details.splSetId ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(details.splSetId)}` : [model.bigPicture?.fullLabelUrl, model.warning?.fullLabelUrl, ...(details.sourceUrls || [])].find(trustedMedicalSource);
  if (!trustedMedicalSource(url)) return null;
  const groups = medicationInformationGroups(model, details.medicationSections, url);
  const excerpt = (text: string | undefined) => text ? medicationBulletPoints(text)[0] || null : null;
  const uses = excerpt(groups.what.find(f => f.key === 'indications_and_usage')?.preview || model.bigPicture?.preview);
  const mechanism = excerpt(groups.what.find(f => f.key === 'mechanism_of_action')?.preview || model.mechanism?.preview);
  const safety = groups.warnings.find(f => f.key === 'boxed_warning') || groups.warnings.find(f => f.key === 'warnings_and_cautions') || groups.effects[0];
  // Complete warnings remain accessible in the full-information expander and official source.
  const important = excerpt(safety?.preview);
  return uses || mechanism || important ? { name: scanIdentification(candidate).name, uses, mechanism, important, sourceUrl: url, source: url.startsWith('https://medlineplus.gov/') ? 'MedlinePlus' : 'Official labeling' } : null;
}
