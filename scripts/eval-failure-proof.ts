// Runs the failure proof on the seeded tests and checks each verdict against the expected one: a sound proof passes,
// and a test that can't fail or a sabotage that removes an element are both caught. Runs against the live site.
// Usage: tsx scripts/eval-failure-proof.ts
import fs from 'fs';
import path from 'path';
import { type ProofManifest, proofTable, runProof } from './verify-failure-proof';

const EVAL_DIR = 'agents/evals/failure-proof';
const OUT_DIR = '.proof/eval';

if (require.main === module) {
  const root = process.cwd();
  const manifest = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'proof.json'), 'utf8')) as ProofManifest;
  const { expected } = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'expected.json'), 'utf8')) as { expected: Record<string, boolean> };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outcomes = manifest.proofs.map((proof) => runProof(proof, manifest, OUT_DIR, root));
  console.log(proofTable(outcomes));
  const wrong = outcomes.filter((o) => o.passed !== expected[o.proof.id]);
  console.log(`\n${outcomes.length - wrong.length} of ${outcomes.length} verdicts as expected.`);
  for (const o of wrong) console.log(`- ${o.proof.id}: expected the proof to ${expected[o.proof.id] ? 'pass' : 'fail'}`);
  if (wrong.length > 0) process.exitCode = 1;
}
