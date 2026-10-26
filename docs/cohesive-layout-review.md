# Launch motion and adaptive layout update

## Implemented
- The opening message now lasts 2,500 ms, with a soft entrance, a restrained vertical drift, and a fade into the capsule. Brand reveal remains 1,500 ms.
- Capsule highlights, rims, dimensions, floating motion and separation were refined. Swipe completion uses a 620 ms eased reveal with duplicate completion prevention. Reduced motion removes rotation/separation and ambient movement.
- The authentication landing has no image-position indicators. Only two background image layers are rendered at once; the next image is preloaded before switching, with cleaned-up animation timers.
- Create Account starts with email, then password/confirmation, then the existing real four-digit OTP. The added marketing pre-step was removed. The pure-black interface, email draft, validation, verification, resend, and account onboarding are retained.
- Shared responsive rules reduce oversized headings, cap desktop content widths and scale the capsule to viewport height. Body typography and touch targets are not globally shrunk.
- Authentication buttons remain in the scrollable form instead of covering fields. Focused native password inputs are revealed again after keyboard opening. Android is configured for keyboard resizing in new native builds.
- Home and Profile now use safe-area roots. Home reminder cards and medication detail actions no longer place action buttons over text. Calendar columns flex with their actual container instead of using a stale screen-width constant.
- Home, Cabinet, Coupons and Profile reserve safe-area-aware floating-dock clearance. The dock is centered and width-bounded and hides while the native keyboard is shown. ZIP controls can wrap.
- Scanner result sheets have explicit viewport-bounded height and a flexible inner scroll area. Support sheets, introduction text, walkthrough cards and medication entry forms are more compact.
- Profile editing uses a labeled full-width name input and a wrapping email block rather than a narrow horizontal field row. Existing backend services, medication records and authentication calls were not replaced.
- Temporary every-open launch replay remains enabled; sessions and onboarding progress are not reset.

## Verification status
Source review confirmed that landing indicator calls, signup marketing steps, stale SCREEN_WIDTH/SCREEN_HEIGHT constants in app pages and the medication-detail button pulse were removed. Pure layout regression checks were added, but no terminal, device runner or native build executor was available in this session. No executed test suite, visual perfection, successful email delivery, native frame rate or end-to-end device pass is claimed.

Run the pure checks from the repository root with a TypeScript runner:

```sh
npx tsx -e "import { runResponsiveLayoutChecks } from './tests/responsiveLayoutChecks.ts'; console.log(runResponsiveLayoutChecks())"
npx tsc --noEmit
npx expo lint
```

These geometry checks do not test React Native layout, keyboard behavior or backend authentication.

## Required device review
1. Open/reopen the app: read the message for 2.5 seconds, release a partial swipe, complete a swipe, and double tap the accessible prompt. Confirm only one route reveal.
2. Confirm no image-position bars appear near either landing button and background changes never reveal a missing image.
3. At 320/375/390/414 phone widths, enter email, password and confirmation with the keyboard open. Scroll to both fields and Continue. Repeat with Android resizing, an iOS keyboard, autofill and mobile-browser address-bar changes.
4. Test actual signup, invalid/expired OTP, resend cooldown, login and recovery against configured email delivery. Passwords are still not persisted in the signup draft.
5. Rotate phones/tablets, test landscape and large accessibility text. Review Home banners, calendar, reminder actions, ZIP controls, medication notes, scanner results, tutorial anchors, support and profile editing for clipping.
6. Enable Reduce Motion and review the launch, capsule and carousel. Profile the image carousel on a lower-memory device.
7. Native keyboard configuration changes require rebuilding the installed Android app; Live Preview alone cannot validate them.

## Existing limits not addressed by this visual update
Unconfigured savings providers, optional billing/store products and unfinished settings integrations retain their existing availability limits. This update does not supply provider credentials, add payment processing or certify clinical/release readiness.
