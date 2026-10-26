import { getResponsiveLayout, getTutorialCardLayout } from '../services/responsiveLayoutService';
import { Layout, Spacing } from '../constants/theme';
import { createPowderParticles } from '../services/capsuleParticleService';
/** Run with npx tsx -e "import {runResponsiveLayoutChecks} from './tests/responsiveLayoutChecks'; console.log(runResponsiveLayoutChecks())". These checks do not replace rendered-device testing. */
export function runResponsiveLayoutChecks() {
  let passed = 0;
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); passed += 1; };
  const devices = [
    { width: 320, height: 568, topInset: 20, bottomInset: 0 },
    { width: 360, height: 640, topInset: 24, bottomInset: 0 },
    { width: 375, height: 667, topInset: 20, bottomInset: 0 },
    { width: 390, height: 844, topInset: 47, bottomInset: 34 },
    { width: 414, height: 736, topInset: 20, bottomInset: 0 },
    { width: 430, height: 932, topInset: 59, bottomInset: 34 },
    { width: 320, height: 360, topInset: 20, bottomInset: 0 },
    { width: 844, height: 390, topInset: 0, bottomInset: 21, leftInset: 47, rightInset: 47 },
    { width: 768, height: 1024, topInset: 24, bottomInset: 20 },
    { width: 1024, height: 768, topInset: 24, bottomInset: 20 },
    { width: 1440, height: 900, topInset: 0, bottomInset: 0 },
  ];
  for (const device of devices) {
    const layout = getResponsiveLayout(device);
    assert(layout.contentWidth > 0 && layout.contentWidth <= Math.min(device.width, Layout.contentWidth), 'Content width is bounded.');
    assert(layout.capsuleWidth > 0 && layout.capsuleWidth * 2.5 <= layout.usableHeight * 0.36 + 1, 'Capsule fits usable height.');
    assert(layout.sheetHeight > 0 && layout.sheetHeight <= layout.usableHeight, 'Sheet fits between safe areas.');
    assert(layout.tabContentBottom >= Layout.dockHeight + device.bottomInset + Spacing.xs + Spacing.lg, 'Scroll end clears the floating dock and safe area.');
    assert(layout.authTitle <= 34 && layout.pageTitle <= 28 && layout.heroTitle <= 34, 'Typography remains bounded.');
    assert(layout.heroHeight >= 160 && layout.heroHeight <= 208, 'Hero imagery remains compact.');
    const target = { x: 16, y: device.topInset + 80, width: Math.max(1, device.width - 32), height: 48 };
    const clearance = device.bottomInset + Layout.dockHeight + Spacing.xs;
    const card = getTutorialCardLayout(device.height, device.topInset, clearance, target);
    assert(card.top >= device.topInset && card.top + card.height <= device.height - clearance, 'Guide fits safe content bounds.');
    assert(card.top >= target.y + target.height || card.top + card.height <= target.y, 'Guide does not cover highlighted control.');
  }
  const fallback = getResponsiveLayout({ width: Number.NaN, height: 0, bottomInset: -12 });
  assert(Number.isFinite(fallback.contentWidth) && fallback.capsuleWidth > 0, 'Invalid measurements have safe defaults.');
  const buttonWidth = (320 - Spacing.md * 2 - (Layout.dockHeight - Spacing.sm) - Spacing.xs - Spacing.sm - 2) / 4;
  assert(buttonWidth >= Layout.touchTarget, 'All four dock controls fit at 320 pixels.');
  const nearBottom = { x: 16, y: 652, width: 358, height: 48 };
  const above = getTutorialCardLayout(844, 47, 106, nearBottom);
  assert(above.top + above.height <= nearBottom.y, 'Bottom highlights place the card above.');
  const powder = createPowderParticles();
  assert(powder.length === 28 && powder.every(item => item.size < 2 && item.opacity <= 0.7), 'Powder is bounded, fine and restrained.');
  assert(JSON.stringify(powder) === JSON.stringify(createPowderParticles()), 'Particle layout is deterministic.');
  return { passed, viewports: devices.length };
}
