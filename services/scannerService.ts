/**
 * BigPharma — Scanner Service
 * Sends captured images to OnSpace AI image analysis via Edge Function.
 */

import { getSupabaseClient } from '@/template';
import * as Crypto from 'expo-crypto';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface ScanCandidate {
  summary?:{overview:string[];safety:string[];sourceUrl:string;model:string;generatedAt:string;notice:string};
  summaryMessage?:string;
  name: string;
  rxcui?: string;
  identitySource?: string;
  normalizedName?: string;
  genericName?: string;
  strength?: string;
  form?: string;
  manufacturer?: string;
  ndc?:string; barcode?:string;
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  evidenceBasis: string; // what visual evidence supports this
  warnings: string[];
}

export interface ScanResult {
  candidates: ScanCandidate[];
  visibleText: string[];     // raw text extracted from the label
  observedFeatures: string[]; // colors, shapes, imprints
  analysisNote: string;       // AI explanation of uncertainty
  requiresConfirmation: boolean;
}

export interface ScanServiceResult {
  data: ScanResult | null;
  error: string | null;
}

export async function saveScanRecord(result:ScanResult){const client=getSupabaseClient(),{data,error:sessionError}=await client.auth.getSession();if(sessionError||!data.session)throw new Error('Sign in to save scan history.');const {error}=await client.from('medication_scan_records').insert({id:Crypto.randomUUID(),user_id:data.session.user.id,candidates:result.candidates,confirmed:false});if(error)throw new Error(error.message);}

export async function analyzeMedicationImage(
  base64Image: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg', barcode?:string
): Promise<ScanServiceResult> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.functions.invoke('gemini-scanner', {
      body: {
        image: base64Image,
        mimeType, barcode,
      },
    });

    if (error) {
      let errorMessage = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const textContent = await error.context?.text();
          try{const payload=JSON.parse(textContent);errorMessage=typeof payload.error==='string'?payload.error:error.message;}catch{errorMessage=error.message;}
        } catch { /* ignore */ }
      }
      return { data: null, error: errorMessage };
    }

    if (typeof data?.error === 'string') return { data: null, error: data.error };
    if (!data || !Array.isArray(data.candidates) || !Array.isArray(data.visibleText) || !Array.isArray(data.observedFeatures) || typeof data.analysisNote !== 'string') return { data: null, error: 'Incomplete scan response. Please retry with a clearer label.' };
    return { data: { ...data, requiresConfirmation: true } as ScanResult, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Unknown error during scan' };
  }
}
