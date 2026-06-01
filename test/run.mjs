// Minimal zero-dependency test runner.
import { convert, generate, detectFormat } from '../src/core/agentsync.js';

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

// detect
ok('detect filename .cursorrules', detectFormat('.cursorrules', '') === 'cursor');
ok('detect filename CLAUDE.md', detectFormat('CLAUDE.md', '') === 'claude');
ok('detect copilot by path', detectFormat('.github/copilot-instructions.md', '') === 'copilot');

// convert cursor -> agents
const cursor = `Use TypeScript strict mode.\n\n- Run tests with \`npm test\`.\nDo not edit src/generated/.`;
const r1 = convert(cursor, { from: 'cursor', to: 'agents' });
ok('cursor→agents has AGENTS title', r1.output.startsWith('# AGENTS'));
ok('cursor→agents keeps rules', r1.output.includes('npm test'));

// convert claude with @import warns
const claude = `# CLAUDE.md\n\nApp intro.\n\n## Setup\nSee @docs/arch.md`;
const r2 = convert(claude, { from: 'claude', to: 'agents' });
ok('claude @import produces a warning', r2.warnings.some((w) => w.includes('@path')));

// round-trip preserves a heading
const r3 = convert(claude, { from: 'claude', to: 'copilot' });
ok('claude→copilot keeps Setup heading', r3.output.includes('## Setup'));

// generate
const g = generate({ name: 'demo', language: 'Go', test: 'go test ./...', build: 'go build ./...' });
ok('generate has title', g.output.includes('# demo'));
ok('generate includes test cmd', g.output.includes('go test ./...'));
ok('generate has PR checklist', g.output.includes('Before opening a PR'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
