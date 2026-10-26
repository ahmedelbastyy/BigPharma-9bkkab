import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAlert } from '@/template';
import { useExperience } from '@/hooks/useExperience';
export function useReplayExperience() {
  const experience = useExperience();
  const router = useRouter();
  const { showAlert } = useAlert();
  const replayTutorial = useCallback(async () => {
    try { await experience.replayTutorial(); router.replace('/(tabs)'); }
    catch (error) { showAlert('Could not start guide', error instanceof Error ? error.message : 'Check your connection and retry.'); }
  }, [experience.replayTutorial, router, showAlert]);
  const replayIntro = useCallback(() => router.push({ pathname: '/', params: { replay: 'intro' } }), [router]);
  return { replayTutorial, replayIntro };
}
