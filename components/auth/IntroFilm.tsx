import { useEffect } from 'react';
import { useIntroFilm } from '@/hooks/useIntroFilm';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { AuthButton,AuthMessage } from '@/components/auth/AuthControls';
// Compatibility for existing saved `film` stages. No additional visual startup animation.
export function IntroFilm(){const film=useIntroFilm();useEffect(()=>{void film.complete();},[film.complete]);return film.error?<AuthFrame title="Continue to BigPharma"><AuthMessage error text={film.error}/><AuthButton label="Retry" onPress={()=>{void film.complete();}} loading={film.busy}/></AuthFrame>:null;}
