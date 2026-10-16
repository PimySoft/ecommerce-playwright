import { Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { KnownViolation } from '../test-data/accessibilityBaseline';

export interface ViolationSummary {
  rule: string;
  impact: string | null | undefined;
  help: string;
  targets: string[];
}

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function isKnown(rule: string, target: string, baseline: KnownViolation[]): boolean {
  return baseline.some((known) => known.rule === rule && (!known.targets || known.targets.includes(target)));
}

export class AccessibilityScanner {
  constructor(private readonly page: Page) {}

  // Returns only what the baseline doesn't cover, as plain data, so `toEqual([])` prints each new violation.
  async findNewViolations(baseline: KnownViolation[]): Promise<ViolationSummary[]> {
    const { violations } = await new AxeBuilder({ page: this.page }).withTags(WCAG_TAGS).analyze();
    const found: ViolationSummary[] = violations.map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));

    this.reportFixedEntries(found, baseline);

    return found
      .map((violation) => ({
        ...violation,
        targets: violation.targets.filter((target) => !isKnown(violation.rule, target, baseline)),
      }))
      .filter((violation) => violation.targets.length > 0);
  }

  // A fixed baseline entry is good news, not a failure, so it is surfaced in the report for pruning instead.
  private reportFixedEntries(found: ViolationSummary[], baseline: KnownViolation[]): void {
    const fixed = baseline.filter((known) => !found.some((violation) =>
      violation.rule === known.rule && (!known.targets || known.targets.some((target) => violation.targets.includes(target)))));

    test.info().annotations.push(...fixed.map((known) => ({
      type: 'accessibility-baseline',
      description: `"${known.rule}" ${known.targets?.join(', ') ?? ''} no longer occurs; remove it from the baseline.`,
    })));
  }
}
