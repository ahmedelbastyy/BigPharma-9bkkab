# Temporary launch preview

The requested launch test mode is enabled by `experienceConfig.previewLaunchEveryOpen = true` in `constants/experience.ts`.

## What plays
1. Uploaded white BigPharma wordmark with a restrained spring entrance (about 1.5 seconds).
2. “Something better starts here” (about 1.35 seconds).
3. Floating silver capsule, opened by upward swipe or the accessible SWIPE UP TO BEGIN control. Tap follows the same spring separation as the gesture.
4. The current app screen is revealed continuously behind the separating capsule. Signed-in users stay signed in; unfinished auth forms and onboarding progress stay mounted.

It plays on cold launches/reloads and background-to-active returns. There is no opening Skip button or bouncing instruction arrow. Background changes are observed with React Native AppState; a permission dialog's inactive-to-active transition alone does not replay it.

## Revert later
Set `previewLaunchEveryOpen` to `false`. Do not delete account progress or medication records. Existing completed users return directly to the dashboard; a guest who has not viewed the intro still receives the usual first-launch experience. Profile retains manual replay.

## Supplied artwork
All three original PNGs are stored locally, without overwriting or synthesizing their design. `BrandMark` centrally selects the white capsule wordmark on black, the black variant on light surfaces, or the optional pill variant. Original source proportions and margins are retained with expo-image contain sizing. The standalone product capsule remains a separate animated scene, not a replacement logo.

Native splash changes take effect in a newly built app, not just a live JavaScript refresh. Launcher/store icons are separate assets and are not replaced by a stretched, non-square wordmark.

## Manual verification still required
- Cold start, foreground return and browser tab visibility on iOS/Android/web.
- Brand clarity, transparency and proportions at 320px, phone, tablet and desktop sizes.
- Swipe, incomplete swipe/cancellation, and accessible button activation.
- Reduced motion, VoiceOver/TalkBack and the system home indicator.
- Signed-in sessions, interrupted signup/password entry, recovery links and paused tutorial preservation.
- Native splash on rebuilt iOS/Android apps.

There is no command runner/device automation in this session. Asset download and source inspection are completed; runtime and native-build success are not claimed. The exported assertions in `tests/launchPreviewChecks.ts` can be run with a TypeScript test runner.
