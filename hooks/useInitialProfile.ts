import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { pickProfilePhoto, type PhotoDraft } from '@/services/profilePhotoService';
export function useInitialProfile() {
  const auth = useAuth();
  const [firstName, setFirstName] = useState(auth.user?.firstName ?? '');
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [fresh, setFresh] = useState(false);
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!fresh) return; const timer = setTimeout(auth.finishInitialProfileTransition, 900); return () => clearTimeout(timer); }, [fresh, auth.finishInitialProfileTransition]);
  const pick = useCallback(async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const selected = await pickProfilePhoto(); if (alive.current && selected) setPhoto(selected); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Photo could not open.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }, []);
  // Skip retains existing server profile values and saves no empty sentinel names.
  const complete = useCallback(async (skip = false) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await auth.completeInitialProfile(skip ? '' : firstName, skip ? null : photo); if (alive.current) setFresh(true); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Profile could not save. Please retry.'); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }, [auth.completeInitialProfile, firstName, photo]);
  return { firstName, setFirstName, photo, busy, error, fresh, pick, complete };
}
