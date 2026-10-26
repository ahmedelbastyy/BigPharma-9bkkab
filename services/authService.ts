import { getSupabaseClient } from '@/template';
import type { User } from '@supabase/supabase-js';

export interface AuthResult { success: boolean; error?: string }
const message = (error: unknown) => error instanceof Error ? error.message : 'Please check your connection and try again.';
export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { success: false, error: error.message };
    return data.user && data.session ? { success: true } : { success: false, error: 'A verified session could not be established.' };
  } catch (error) { return { success: false, error: message(error) }; }
}
export async function sendRegistrationCode(email: string): Promise<AuthResult> {
  try {
    const { error } = await getSupabaseClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, data: { account_setup_pending: true, onboarding_complete: false, initial_profile_version: 1 } } });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (error) { return { success: false, error: message(error) }; }
}
export async function verifyRegistration(email: string, token: string, password: string): Promise<AuthResult> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    if (error) return { success: false, error: error.message };
    if (!data.user || !data.session) return { success: false, error: 'No verified session was returned. Request a new code.' };
    const result = await client.auth.updateUser({ password, data: { account_setup_pending: false } });
    if (result.error) return { success: false, error: `Your email was verified, but the password could not be saved. Retry setting the password: ${result.error.message}` };
    return { success: true };
  } catch (error) { return { success: false, error: message(error) }; }
}
export async function saveVerifiedPassword(password: string): Promise<AuthResult> {
  try {
    const { data, error } = await getSupabaseClient().auth.updateUser({ password, data: { account_setup_pending: false } });
    if (error) return { success: false, error: error.message };
    return data.user ? { success: true } : { success: false, error: 'No account was returned.' };
  } catch (error) { return { success: false, error: message(error) }; }
}
export async function updateAccountMetadata(data: Record<string, unknown>): Promise<User> {
  const result = await getSupabaseClient().auth.updateUser({ data });
  if (result.error) throw new Error(result.error.message);
  if (!result.data.user) throw new Error('Your profile could not be saved.');
  return result.data.user;
}
export async function signOutAccount(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(error.message);
}
export async function requestPasswordReset(email: string, redirectTo: string): Promise<AuthResult> {
  try {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (error) { return { success: false, error: message(error) }; }
}
function queryParam(url: string, key: string): string | null {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  for (const part of query.split('&')) {
    const pieces = part.split('=');
    if (decodeURIComponent(pieces.shift() ?? '') === key) return decodeURIComponent(pieces.join('='));
  }
  return null;
}
const recoveryExchanges = new Map<string, Promise<AuthResult>>();
export async function consumeRecoveryLink(url: string): Promise<AuthResult> {
  try {
    if (queryParam(url, 'error') || queryParam(url, 'error_code')) return { success: false, error: 'This recovery link is invalid or expired. Request another email.' };
    const client = getSupabaseClient();
    const code = queryParam(url, 'code');
    const tokenHash = queryParam(url, 'token_hash');
    const identifier = code || tokenHash;
    if (!identifier) {
      // Email-recovery only: support legacy implicit reset links with the existing client.
      // This is not the Google/Apple OAuth callback protocol.
      const fragment = url.split('#')[1] ?? '';
      const parameters: Record<string, string> = {};
      for (const part of fragment.split('&')) {
        const pieces = part.split('=');
        const key = pieces.shift() ?? '';
        parameters[key] = decodeURIComponent(pieces.join('='));
      }
      if (parameters.type === 'recovery' && parameters.access_token && parameters.refresh_token) {
        const { data, error } = await client.auth.setSession({ access_token: parameters.access_token, refresh_token: parameters.refresh_token });
        return error ? { success: false, error: error.message } : data.session ? { success: true } : { success: false, error: 'Recovery did not establish a session.' };
      }
      return { success: false, error: 'This link has no recovery code. Please use the latest recovery email.' };
    }
    const existing = recoveryExchanges.get(identifier);
    if (existing) return existing;
    const exchange = (async (): Promise<AuthResult> => {
      const result = code ? await client.auth.exchangeCodeForSession(code) : await client.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' });
      if (result.error) return { success: false, error: result.error.message };
      return result.data.session ? { success: true } : { success: false, error: 'Recovery did not return a session.' };
    })();
    recoveryExchanges.set(identifier, exchange);
    return exchange;
  } catch (error) { return { success: false, error: message(error) }; }
}
