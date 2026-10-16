// Violations the live site already had when the accessibility checks were added (axe-core 4.13, WCAG 2.1 A/AA).
// The site isn't ours to fix, so these are recorded instead of failing every run. Anything not listed here fails.
// An entry without `targets` accepts every element for that rule; use that only when the count depends on the
// catalogue. A test notes in the report when an entry stops occurring, so the baseline can be pruned.

export interface KnownViolation {
  rule: string;
  reason: string;
  targets?: string[];
}

export type AuditedPage = 'home' | 'products' | 'cart' | 'login' | 'contact';

const subscribeButtonName: KnownViolation = {
  rule: 'button-name',
  targets: ['#subscribe'],
  reason: 'The footer newsletter button holds only an icon and has no accessible name.',
};

const themeContrast: KnownViolation = {
  rule: 'color-contrast',
  reason: 'The theme\'s grey and orange text is below 4.5:1, including every product card, so the count follows the catalogue.',
};

export const ACCESSIBILITY_BASELINE: Record<AuditedPage, KnownViolation[]> = {
  home: [
    subscribeButtonName,
    themeContrast,
    {
      rule: 'link-name',
      targets: [
        '.left.control-carousel.hidden-xs',
        '.right.control-carousel.hidden-xs',
        '.left.recommended-item-control[href="#recommended-item-carousel"]',
        '.right.recommended-item-control[href="#recommended-item-carousel"]',
      ],
      reason: 'The previous and next arrows of both carousels are icon-only links.',
    },
  ],
  products: [
    subscribeButtonName,
    themeContrast,
    {
      rule: 'button-name',
      targets: ['#submit_search'],
      reason: 'The search button holds only an icon and has no accessible name.',
    },
  ],
  cart: [subscribeButtonName, themeContrast],
  login: [subscribeButtonName, themeContrast],
  contact: [
    subscribeButtonName,
    themeContrast,
    {
      rule: 'label',
      targets: ['input[type="file"]'],
      reason: 'The attachment file input has no label.',
    },
  ],
};
