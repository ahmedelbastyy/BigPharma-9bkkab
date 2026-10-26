import { Colors, Typography } from '@/constants/theme';
export type MedicationProductKind = 'bottle' | 'inhaler' | 'nasal' | 'liquid' | 'tube' | 'powder' | 'white';
// Matte sculpted illustrations with real transparency; labels are separate native Text nodes.
export const MedicationProductTheme = {
 defaultSize: 64, aspectRatio: 320 / 400,
 colors: { background: Colors.transparent, labelText: Colors.background },
 type: { nameWeight: Typography.bold, strengthWeight: Typography.medium, minimumScale: 0.5 },
 caption: 'Product illustration · not actual packaging',
 variants: {
  bottle: { label: { left: 79 / 320, top: 202 / 400, width: 162 / 320, height: 80 / 400 }, description: 'orange prescription bottle' },
  inhaler: { label: { left: 103 / 320, top: 207 / 400, width: 116 / 320, height: 58 / 400 }, description: 'inhaler' },
  nasal: { label: { left: 111 / 320, top: 260 / 400, width: 98 / 320, height: 56 / 400 }, description: 'nasal spray' },
  liquid: { label: { left: 82 / 320, top: 227 / 400, width: 156 / 320, height: 76 / 400 }, description: 'liquid medicine container' },
  tube: { label: { left: 106 / 320, top: 188 / 400, width: 108 / 320, height: 60 / 400 }, description: 'topical medicine tube' },
  powder: { label: { left: 106 / 320, top: 214 / 400, width: 108 / 320, height: 55 / 400 }, description: 'dry-powder inhaler' },
  white: { label: { left: 95 / 320, top: 211 / 400, width: 130 / 320, height: 62 / 400 }, description: 'white medicine container' },
 },
} as const;
