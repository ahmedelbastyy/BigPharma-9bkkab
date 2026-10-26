# BigPharma experience upgrade — implementation and verification

## Implemented
- Pure-black opening reveal: approximately 1.5 seconds for the brand visual and 1.35 seconds for the introductory message. No initial Skip button, bouncing arrow, progress line, hidden system home indicator or gray background layer.
- Gesture-driven silver capsule: continuous rotation, scale and separation with Reanimated springs. Upward drag uses its starting position, not accumulated deltas. Accessible double-tap alternative and reduced-motion support.
- Five generated, bundled monochrome pharmaceutical backgrounds with preloading, approximately 5.2-second rotation, crossfades and restrained zoom. Stable foreground headline and authentication controls.
- Consistent dark email/password forms with labeled inputs, individual password visibility controls, inline errors, real busy states and scrollable actions. Confirm password is mandatory. No absolute-positioned Continue button covers inputs.
- Real backend email OTP + password signup with four boxes matching the current Cloud setting. Paste, numeric filtering, deletion and resend cooldown use the actual auth service. A password cannot be skipped; the app does not advance until verification and password saving succeed.
- `account_setup_pending` metadata preserves the verified-but-unfinished-password state across app restarts. A non-sensitive signup email draft is stored locally; passwords/codes are not persisted there.
- Session restoration, auth-state subscription and AppState refresh use the existing unique backend client. Login success is handled by AuthRouter in the index page, not manual navigation in form handlers.
- Email password recovery request and native/web code or token-hash callbacks. Legacy implicit **email recovery** links are handled separately from OAuth. Invalid recovery links cannot grant permission to set a password.
- Private account progress table, five optional personalization questions, saved survey answers/step, optional AI consent, 10-second introduction, optional support panel and six-step guide. Existing completed accounts stay completed.
- Support sheet is fixed in position, with independently scrollable contents and a prominent free continuation. Amounts are explicitly proposed; no checkout, receipt, subscription status or success animation is simulated.
- Interactive guide measures actual Home search, ZIP form, medication information/interaction controls, and Cabinet add controls. Users can operate the spotlighted control, go back or pause without marking completion. Empty Cabinets are handled without sample medications.
- Profile editing now saves real account metadata. Introduction and tutorial replay are available from Profile.
- Home search now searches actual Cabinet records, not an inactive AI placeholder. The oversized medication Cabinet hero uses the real count. Cabinet uses a virtualized inventory and confirmation wizard, preserving name/generic, strength/form, schedule/reminder times, quantity, dates, directions, pharmacy and notes.
- Unknown medication dates, directions and quantities are no longer silently replaced with invented dates or dosing. AI scan saving requires confirmation and leaves unestablished fields unrecorded. Consent is checked before image processing.
- Existing education, interaction, GoodRx pricing and medication APIs remain in place. Invalid interaction responses no longer become an empty all-clear; provider-unavailable checks stay retryable.
- Account changes clear cached medication state and prevent a prior account's in-flight fetch from populating the next account.
- Privacy/terms links open actual in-app product disclosures. These are clearly labeled as pre-release disclosures, not legally reviewed policies.

## Verification performed in this session
- Executed the additive database setup successfully.
- Executed database assertions verifying that `user_experience_state` exists with RLS enabled, four separate authenticated policies and the tutorial progress column. All assertions completed without errors.
- Statically reviewed route/provider wiring, callback busy/error behavior, four-digit OTP configuration, signup confirmation requirements, local-draft contents, independent scrolling, and missing/invalid provider response handling.
- Searched for obsolete image-resolver calls, premature onboarding completion in signup, and the interaction-empty-array fallback; these are no longer present.

**Not executed:** TypeScript compiler, Metro export, native builds, browser interaction automation, real mailbox OTP/recovery delivery, real user-to-user isolation requests, screen-reader/device gestures or payment sandbox tests. This editor session provides no command runner or device automation tool. Code review and schema assertions are not substitutes for these tests; no native or payment success is claimed.

## Uploaded branding and temporary launch preview
The three supplied PNGs are now bundled at `assets/images/bigpharma-wordmark-white.png`, `bigpharma-wordmark-pill.png` and `bigpharma-wordmark-black.png`. `BrandMark` uses the original white capsule wordmark on dark surfaces and original black artwork on light surfaces, with separate source-canvas aspect ratios and contain sizing. The alternate pill wordmark is available through `variant="pill"`; tinting that supplied artwork changes only its color. No wordmark is recreated with fonts, and no original image is overwritten. Auth, verification, welcome, film, support, loading, Profile and main tab headers share the same component. Written references within sentences and labels remain text.

`experienceConfig.previewLaunchEveryOpen` is temporarily **true** for testing. A root-level visual overlay plays the logo spring reveal, introductory message and gesture-driven capsule on every cold launch and genuine background-to-foreground return. Swipe or activate the accessible SWIPE UP TO BEGIN control to reveal the current screen. Sessions, unfinished forms, saved survey/tutorial progress and medications are not reset. Ordinary inactive/active transitions from permission dialogs do not trigger replay. The auth landing page does not play a second copy underneath the preview.

Set `previewLaunchEveryOpen` to **false** in `constants/experience.ts` to restore the normal behavior. Completing the reveal records only the existing local intro-viewed key, not account onboarding completion. Profile replay remains available. The native splash is configured with the supplied white wordmark on pure black; changed native splash assets require a rebuilt app.

### Launch/branding QA
- Statically checked shared brand references, local asset paths, source-specific proportions, root overlay wiring, AppState transition logic and animation cleanup.
- Added `tests/launchPreviewChecks.ts` with six exported transition assertions. These are not executed in this editor session; run with your TypeScript test runner.
- Device/browser interaction, image transparency/rendering, launch/resume animation performance and native splash builds remain unverified. No automated runtime test success is claimed.
- Test cold start signed out and signed in, returning from background, inactive permission dialogs, swipe cancellation, accessible tap, reduced motion, unfinished signup and a paused tutorial. Confirm the previous screen and saved records remain intact after the reveal.

## Authentication configuration / manual tests
1. Cloud → Users → Auth settings: keep email signup enabled, OTP length **4**, minimum password length **6** (update the shared configuration if settings change).
2. Ensure the OTP email template contains the actual `{{ .Token }}` code, not only a magic link; verify email delivery/SMTP for your domain. Backend sends the real email; the app never manufactures a token.
3. Add `onspaceapp://recovery` and the deployed web recovery URL to the auth redirect allowlist. Preserve existing redirect entries. Test the actual deployment URL generated by ExpoLinking and configure the corresponding auth email templates.
4. New account: intro → signup email → two passwords → real OTP → personalization → film → optional support → guide → Home. Close/reopen at each boundary and confirm resumption.
5. Verify empty/mismatched/short passwords, malformed email, invalid/expired/pasted codes, repeated resend taps, rate limits, offline retry and password-save failure after OTP verification.
6. Login with wrong credentials, restore a session, sign out, and sign in as another account. Confirm both the database RLS and in-memory records remain isolated.
7. Test password recovery on installed iOS and Android builds with success, invalid/expired links, cold start and hot start. Also test code/token-hash and any configured legacy email-link mode separately on web.
8. Apple login is not configured/enabled in the provided backend context; no Apple success flow is claimed. Enable/configure the provider and implement/test the shared browser OAuth protocol before showing that option.

## Store contributions — intentionally unavailable
Neither Stripe nor native store products/receipt verification are configured. The Support action explains this rather than opening fake checkout. Setting a local flag does not enable purchases.

Before enabling purchases: choose the applicable App Store/Google Play billing implementation, confirm policy eligibility for support contributions, configure store product IDs and actual localized pricing, implement purchase/cancel/failure handling, subscription disclosures and management/cancellation links, restoration where applicable, and authenticated server-side receipt/purchase-token verification. Only verified purchases may trigger supporter status or the thank-you animation. Test sandbox purchases on installed builds. Do not use a web payment shortcut to evade store policies.

## Known scope / release blockers
- Uploaded branding is integrated; native splash appearance requires a rebuild and device verification.
- Native store billing, server-side verification and payment thank-you state are not implemented because products/provider credentials are missing.
- This work does not add an independent push-notification engine. Existing in-app reminder data remains; non-daily schedules are not silently treated as daily. Native permissions, delivery, time zones and DST still require implementation/review and device tests.
- General condition search/AI chat, allergy management, account export/deletion and several legacy Profile settings are outside this experience pass. Their existing unsupported actions are not converted into simulated features. Complete these before release.
- GoodRx authorization and the interaction provider remain dependent on legitimate provider access. No invented coupons/prices or licensed interaction dataset are introduced.
- AI provider retention, legal policies, account lifecycle, healthcare/privacy obligations and clinical safety require professional review. No HIPAA certification, legal compliance or clinical validation is claimed.

## Build and visual QA checklist
Run in an exported repository with dependencies installed:

```sh
npx tsc --noEmit
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
```

Then produce installed device builds using the OnSpace download/publish flow or your configured Expo build process. Test widths 320/375/414, iPad split view and landscape, 768/1024 tablet layouts and desktop. Focus both password inputs with keyboard visible; paste the entire OTP; ensure every Continue and free-support action is reachable by scrolling. Test larger text, VoiceOver/TalkBack, reduced motion, slow image loading, gallery/camera refusal, consent refusal, interrupted saving, retries, and tutorial pause/back/replay/completion.

Re-check Cabinet create/archive/delete, recorded Taken/Skipped timestamps, medication education and actual provider pricing after login with a real test account. Do not add fabricated medication data to a real account. A release-ready claim requires successful native, security and clinical review, not only a successful preview.
