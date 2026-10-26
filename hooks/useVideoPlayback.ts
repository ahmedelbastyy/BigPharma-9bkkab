import { useCallback, useEffect, useRef, useState } from 'react';
export function useVideoPlayback(videoId: string) {
  const [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  useEffect(() => { setReady(false); setError(null); clearTimer(); timer.current = setTimeout(() => setError('The player did not load. YouTube may restrict playback on this device or network.'), 20000); return clearTimer; }, [videoId, attempt, clearTimer]);
  const loaded = useCallback(() => { clearTimer(); setReady(true); setError(null); }, [clearTimer]);
  const failed = useCallback((code?: number) => { clearTimer(); setReady(true); setError(code ? `YouTube playback unavailable (code ${code}). No restrictions are bypassed.` : 'The video could not load. Check your connection.'); }, [clearTimer]);
  const retry = useCallback(() => { setReady(false); setError(null); setAttempt(value => value + 1); }, []);
  return { ready, error, attempt, loaded, failed, retry };
}
