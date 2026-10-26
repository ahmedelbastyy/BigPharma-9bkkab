/**
 * BigPharma — goodrx-prices Edge Function
 * Integrates with GoodRx V2 Price Compare API.
 *
 * Required secrets:
 *   GOODRX_API_KEY       — your GoodRx partner API key
 *   GOODRX_SIGNING_SECRET — your GoodRx HMAC signing secret
 *
 * GoodRx V2 endpoint: https://api.goodrx.com/v2/price/compare
 * Authentication: HMAC-SHA256 request signature per GoodRx V2 docs.
 *
 * If credentials are not configured, returns a 402 to signal
 * that partner authorization is needed — never fake prices.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOODRX_V2_ENDPOINT = 'https://api.goodrx.com/v2/price/compare';

// ── GoodRx HMAC-SHA256 request signing ───────────────────────────────────────
// Per GoodRx V2 API authentication documentation:
//   Signature = HMAC-SHA256(signingSecret, canonicalString)
//   canonicalString = sorted query params joined with "&" then base64url-encoded

async function signGoodRxRequest(
  params: Record<string, string>,
  signingSecret: string
): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  // Web Crypto is available in the Edge runtime; no Node compatibility module is needed.
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(signingSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sorted));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
  // Convert to base64url
  return sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Your session could not be verified.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GOODRX_API_KEY');
    const signingSecret = Deno.env.get('GOODRX_SIGNING_SECRET');

    if (!apiKey || !signingSecret) {
      // 402 signals to the client that partner authorization is required
      return new Response(
        JSON.stringify({
          error: 'GoodRx partner credentials not configured. Partner API access required.',
          requiresAuth: true,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { name, dosage, quantity, form, zip } = body;

    if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
        (zip && (typeof zip !== 'string' || !/^\d{5}$/.test(zip))) ||
        (dosage && (typeof dosage !== 'string' || dosage.length > 100)) ||
        (form && (typeof form !== 'string' || form.length > 100)) ||
        (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000))) {
      return new Response(JSON.stringify({ error: 'Provide a medication name, valid formulation and quantity, and an optional five-digit ZIP code.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build GoodRx V2 request parameters
    const params: Record<string, string> = {
      api_key: apiKey,
      drug: name.toLowerCase().trim(),
      dosage: dosage || '',
      quantity: String(quantity || 30),
      format: form || '',
    };
    if (zip) params.zip = zip;

    // Remove empty params
    Object.keys(params).forEach(k => {
      if (!params[k]) delete params[k];
    });

    // Sign the request
    const signature = await signGoodRxRequest(params, signingSecret);
    params.sig = signature;

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const goodrxRes = await fetch(`${GOODRX_V2_ENDPOINT}?${queryString}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!goodrxRes.ok) {
      const errText = await goodrxRes.text();
      console.error(`GoodRx provider returned HTTP ${goodrxRes.status}`);

      if (goodrxRes.status === 401 || goodrxRes.status === 403) {
        return new Response(
          JSON.stringify({ error: 'GoodRx: Invalid or unauthorized API credentials', requiresAuth: true }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `GoodRx: the provider could not complete this price search (HTTP ${goodrxRes.status}). Please retry.` }),
        { status: goodrxRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const goodrxData = await goodrxRes.json();

    // Normalize GoodRx V2 response into our PharmacyPrice format
    if (!Array.isArray(goodrxData?.data?.prices)) {
      return new Response(JSON.stringify({ error: 'GoodRx: the provider response does not match the configured partner adapter.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const prices = goodrxData.data.prices.flatMap((p: any) => {
      if (!p || typeof p !== 'object') return [];
      const pharmacyName = p.pharmacy_name || p.pharmacy;
      const rawPrice = p.display_price ?? p.price;
      const amount = Number(String(rawPrice ?? '').replace(/[$,]/g, ''));
      if (typeof pharmacyName !== 'string' || !pharmacyName.trim() || rawPrice == null ||
          rawPrice === '' || !Number.isFinite(amount) || amount < 0) return [];
      const offerQuantity = Number(p.quantity);
      return [{
        pharmacyName: pharmacyName.trim(),
        pharmacyType: typeof p.pharmacy_type === 'string' ? p.pharmacy_type : '',
        price: amount,
        displayPrice: `$${amount.toFixed(2)}`,
        savings: p.savings ? `Provider savings: ${p.savings}%` : undefined,
        quantity: Number.isFinite(offerQuantity) && offerQuantity > 0 ? offerQuantity : 0,
        form: typeof p.form === 'string' ? p.form : '',
        dosage: typeof p.dosage === 'string' ? p.dosage : '',
        couponCode: typeof p.coupon_code === 'string' ? p.coupon_code : undefined,
        offerUrl: typeof p.url === 'string' && /^https:\/\//i.test(p.url) ? p.url : undefined,
        isEstimate: false,
      }];
    });
    if (goodrxData.data.prices.length > 0 && prices.length === 0) {
      return new Response(JSON.stringify({ error: 'GoodRx: no valid live prices were returned.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ prices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('goodrx-prices error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
