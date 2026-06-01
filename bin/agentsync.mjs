#!/usr/bin/env node
// agentsync CLI — convert between AI agent rule files, or generate AGENTS.md.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { convert, generate, detectFormat, FORMATS } from '../src/core/agentsync.js';

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name, short) {
  const i = args.findIndex((a) => a === `--${name}` || (short && a === `-${short}`));
  return i >= 0 ? args[i + 1] : undefined;
}
function has(name) {
  return args.includes(`--${name}`);
}

const HELP = `agentsync — one source of truth for your AI coding-agent rules

Usage:
  agentsync convert <file> [--to agents|claude|cursor|copilot|windsurf] [--from <fmt>] [-o <out>]
  agentsync generate --name <n> [--language ts] [--framework next] [--test "npm test"] ... [-o <out>]
  agentsync detect <file>
  agentsync formats

Examples:
  agentsync convert .cursorrules --to agents -o AGENTS.md
  agentsync convert CLAUDE.md --to copilot
  agentsync generate --name "my-app" --language TypeScript --framework Next.js \\
      --test "npm test" --build "npm run build" -o AGENTS.md
`;

function out(text, target) {
  if (target) {
    writeFileSync(target, text);
    process.stderr.write(`✓ wrote ${target}\n`);
  } else {
    process.stdout.write(text);
  }
}

try {
  switch (cmd) {
    case 'convert': {
      const file = args[1];
      if (!file || !existsSync(file)) throw new Error(`file not found: ${file}`);
      const text = readFileSync(file, 'utf8');
      const from = flag('from') || detectFormat(basename(file), text);
      const to = flag('to') || 'agents';
      const res = convert(text, { from, to });
      res.warnings.forEach((w) => process.stderr.write(`⚠ ${w}\n`));
      process.stderr.write(`→ ${from} → ${to}\n`);
      out(res.output, flag('o', 'o'));
      break;
    }
    case 'generate': {
      const spec = {
        name: flag('name'),
        description: flag('description'),
        language: flag('language'),
        framework: flag('framework'),
        packageManager: flag('pm'),
        install: flag('install'),
        build: flag('build'),
        test: flag('test'),
        lint: flag('lint'),
        dev: flag('dev'),
      };
      const res = generate(spec);
      out(res.output, flag('o', 'o'));
      break;
    }
    case 'detect': {
      const file = args[1];
      if (!file || !existsSync(file)) throw new Error(`file not found: ${file}`);
      const text = readFileSync(file, 'utf8');
      const fmt = detectFormat(basename(file), text);
      process.stdout.write(`${fmt} — ${FORMATS[fmt].label}\n`);
      break;
    }
    case 'formats': {
      for (const f of Object.values(FORMATS)) {
        process.stdout.write(`${f.id.padEnd(10)} ${f.filename.padEnd(34)} ${f.label}\n`);
      }
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      process.stdout.write(HELP);
      break;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`);
      process.exit(1);
  }
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}
