import { Colors } from '@/constants/theme';

// Original uploaded artwork, bundled locally. Never recreate branding with a font.
// Each canvas retains its own aspect ratio, including the original transparent margins.
export const brandAssets = {
  white: require('@/assets/images/bigpharma-wordmark-white.png'),
  black: require('@/assets/images/bigpharma-wordmark-black.png'),
  pill: require('@/assets/images/bigpharma-wordmark-pill.png'),
  aspectRatio: 2170 / 724,
  blackAspectRatio: 1448 / 1086,
  pillAspectRatio: 2170 / 724,
};
export const authImages = [
  require('@/assets/images/auth-capsules.webp'),
  require('@/assets/images/auth-macro.webp'),
  require('@/assets/images/auth-glass.webp'),
  require('@/assets/images/auth-molecular.webp'),
  require('@/assets/images/auth-stilllife.webp'),
];
export const experienceConfig = {
  otpLength: 4, minimumPasswordLength: 6, resendSeconds: 60,
  brandDuration: 900, messageDuration: 1100, capsuleRevealDuration: 900, capsuleIdleTimeout: 7000,
  privacyUrl: 'https://bigpharma.app/privacy', termsUrl: 'https://bigpharma.app/terms',
  contributionProductsReady: false,
  // Cold-launch splash uses retained brand/message phases; no background replay or tutorials.
  previewLaunchEveryOpen: false,
};
export const ExperienceColors = {
  black: '#000000', white: Colors.textPrimary, surface: '#141414', elevated: '#202020',
  silver: '#D8D8D8', muted: '#ABABAB', border: '#353535', transparent: 'transparent',
  veil: 'rgba(0,0,0,0.76)', lightVeil: 'rgba(0,0,0,0.18)',
};
export const surveySteps = [
  { key: 'name', title: 'Make it yours.', subtitle: 'What would you like us to call you? Your display name is optional.', options: [], multi: false },
  { key: 'role', title: 'Who are you\nmanaging for?', subtitle: 'Professional selections are preferences, not verification of credentials.', options: ['Myself', 'A family member', 'I am a pharmacist', 'I am a healthcare professional', 'Just exploring'], multi: false },
  { key: 'goals', title: 'A little more\nclarity.', subtitle: 'Choose the tools that interest you. Availability depends on permissions and authorized providers.', options: ['Scanning labels', 'Medication organization', 'Medication education', 'Prescription savings', 'Interaction information', 'Reminders & expiration tracking'], multi: true },
  { key: 'medications', title: 'Where are you\nstarting?', subtitle: 'We never assume what you take. You can add medications after this introduction.', options: ['I take medications regularly', 'Occasionally or as needed', 'I am exploring', 'Prefer not to say'], multi: false },
  { key: 'privacy', title: 'Your health.\nYour choice.', subtitle: 'Medication records are private to your account. Scanning sends images to our AI processor. AI is not a diagnosis. Choosing no does not limit Cabinet or savings. Read the privacy policy before consenting.', options: ['Allow AI image processing', 'Do not allow AI image processing'], multi: false },
];
export const tutorialSteps = [
  { target: 'homeSearch', title: 'Start with a name.', body: 'Search the medications already in your Cabinet. Tap a result to open its information. General condition search and AI chat are not available in this field.' },
  { target: 'couponsZip', title: 'Care and savings, nearby.', body: 'Allow location access to find nearby pharmacies, then select a Cabinet medication to request provider prices. Live prices appear only when an authorized provider returns them; unavailable prices are never estimated.' },
  { target: 'detailInfo', title: 'Know your medications.', body: 'Open a saved medication to read educational information and your confirmed instructions. If your Cabinet is empty, you can add one later; no sample records are created.' },
  { target: 'detailInteractions', title: 'Stay informed, not instructed.', body: 'Use Check interactions on a medication page. Checks need at least two medications and a configured reliable provider. Unavailable is not an all-clear. Always consult a pharmacist.' },
  { target: 'cabinetAdd', title: 'A Cabinet that is yours.', body: 'Use Add medication for manual entry or Scan for a label. Verify every detail with your prescription; never take an unidentified pill based on AI.' },
  { target: 'welcome', title: 'Make yourself at home.', body: 'Your introduction is complete. Explore at your own pace. You can replay this guide from Profile without repeating account setup.' },
];
