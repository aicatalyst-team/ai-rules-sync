// agentsync core engine — zero-dependency ESM, runs in Node and the browser.
//
// Two capabilities:
//   A) convert(text, {to})  — translate between AI coding-agent rule files
//   B) generate(spec)       — build a high-quality AGENTS.md from a spec
//
// Strategy: every format is parsed into one normalized intermediate
// representation (IR), then rendered into the target format. Adding a new
// tool = one parser + one renderer, nothing else changes.

/** @typedef {{heading: string, body: string}} Section */
/** @typedef {{
 *   title: string,
 *   intro: string,
 *   sections: Section[],
 *   globs: string[],
 *   sourceFormat: string,
 *   warnings: string[]
 * }} IR
 */

export const FORMATS = {
  agents: {
    id: 'agents',
    label: 'AGENTS.md (Codex / open standard)',
    filename: 'AGENTS.md',
  },
  claude: {
    id: 'claude',
    label: 'CLAUDE.md (Claude Code)',
    filename: 'CLAUDE.md',
  },
  cursor: {
    id: 'cursor',
    label: '.cursorrules (Cursor)',
    filename: '.cursorrules',
  },
  copilot: {
    id: 'copilot',
    label: 'copilot-instructions.md (GitHub Copilot)',
    filename: '.github/copilot-instructions.md',
  },
  windsurf: {
    id: 'windsurf',
    label: '.windsurfrules (Windsurf)',
    filename: '.windsurfrules',
  },
};

/** Guess the source format from a filename and/or its contents. */
export function detectFormat(filenameOrContent = '', content = '') {
  const name = filenameOrContent.toLowerCase();
  if (name.endsWith('agents.md')) return 'agents';
  if (name.endsWith('claude.md')) return 'claude';
  if (name.includes('copilot-instructions')) return 'copilot';
  if (name.includes('.cursorrules') || name.includes('.cursor/rules')) return 'cursor';
  if (name.includes('.windsurfrules')) return 'windsurf';

  // Fall back to sniffing the body.
  const body = (content || filenameOrContent).toLowerCase();
  if (body.includes('# agents.md') || body.includes('# agents')) return 'agents';
  if (body.includes('# claude.md') || body.includes('claude code')) return 'claude';
  if (body.includes('copilot')) return 'copilot';
  return 'agents';
}

// ---------------------------------------------------------------------------
// Parsing: any markdown-ish instruction file -> IR
// ---------------------------------------------------------------------------

/** Strip a leading YAML frontmatter block, returning {meta, body}. */
function stripFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kv) meta[kv[1].trim()] = kv[2].trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

/** Split markdown into sections keyed by their `##`/`#` headings. */
function splitSections(body) {
  const lines = body.split('\n');
  const sections = [];
  let intro = [];
  let current = null;

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.*)$/);
    if (h) {
      if (current) sections.push(current);
      else intro = intro; // keep collected intro
      current = { heading: h[1].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) sections.push(current);

  return {
    intro: intro.join('\n').trim(),
    sections: sections.map((s) => ({
      heading: s.heading,
      body: s.bodyLines.join('\n').trim(),
    })),
  };
}

/**
 * @param {string} text
 * @param {string} format
 * @returns {IR}
 */
export function parse(text, format) {
  const warnings = [];
  const globs = [];
  const { meta, body } = stripFrontmatter(text);

  // Cursor's new .mdc rules carry `globs:` in frontmatter.
  if (meta.globs) {
    globs.push(...meta.globs.replace(/[[\]'"]/g, '').split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (meta.description && format === 'cursor') {
    warnings.push('Cursor `description`/`globs` frontmatter has no AGENTS.md equivalent; folded into a note.');
  }

  // Claude's @path imports don't carry over to other tools.
  if (format === 'claude' && /(^|\s)@[\w./-]+/.test(body)) {
    warnings.push('Found Claude `@path` imports — other agents won\'t resolve these; inline the content if needed.');
  }

  let { intro, sections } = splitSections(body);

  // Plain-text rule files (classic .cursorrules) often have no headings.
  if (sections.length === 0 && intro) {
    sections = [{ heading: 'Project rules', body: intro }];
    intro = '';
  }

  const firstHeadingTitle = (text.match(/^#\s+(.*)$/m) || [])[1];

  return {
    title: meta.title || firstHeadingTitle || '',
    intro,
    sections,
    globs,
    sourceFormat: format,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Rendering: IR -> any target format
// ---------------------------------------------------------------------------

function renderSections(ir) {
  return ir.sections
    .map((s) => `## ${s.heading}\n\n${s.body}`.trim())
    .join('\n\n');
}

function renderAgents(ir) {
  const title = ir.title || 'AGENTS.md';
  const parts = [`# ${title.replace(/\.md$/i, '')}`];
  if (ir.intro) parts.push(ir.intro);
  if (ir.globs.length) {
    parts.push(`> **Applies to:** \`${ir.globs.join('`, `')}\``);
  }
  parts.push(renderSections(ir));
  return collapse(parts);
}

function renderClaude(ir) {
  const parts = [`# ${ir.title || 'CLAUDE.md'}`];
  if (ir.intro) parts.push(ir.intro);
  parts.push(renderSections(ir));
  return collapse(parts);
}

function renderCopilot(ir) {
  // Copilot expects a single instructions doc; keep it flat and imperative.
  const parts = ['# Copilot instructions'];
  if (ir.intro) parts.push(ir.intro);
  parts.push(renderSections(ir));
  return collapse(parts);
}

function renderCursor(ir) {
  const fm = [];
  if (ir.globs.length) fm.push(`globs: ${ir.globs.join(',')}`);
  const head = fm.length ? `---\n${fm.join('\n')}\n---\n\n` : '';
  const parts = [];
  if (ir.title) parts.push(`# ${ir.title}`);
  if (ir.intro) parts.push(ir.intro);
  parts.push(renderSections(ir));
  return head + collapse(parts);
}

function collapse(parts) {
  return parts.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const RENDERERS = {
  agents: renderAgents,
  claude: renderClaude,
  copilot: renderCopilot,
  cursor: renderCursor,
  windsurf: renderCursor, // Windsurf uses the same plain-markdown shape
};

export function render(ir, to) {
  const fn = RENDERERS[to];
  if (!fn) throw new Error(`Unknown target format: ${to}`);
  return fn(ir);
}

/**
 * Convert raw rule-file text from one format to another.
 * @returns {{output: string, warnings: string[], from: string, to: string}}
 */
export function convert(text, { from, to = 'agents' } = {}) {
  const source = from || detectFormat('', text);
  const ir = parse(text, source);
  return {
    output: render(ir, to),
    warnings: ir.warnings,
    from: source,
    to,
  };
}

// ---------------------------------------------------------------------------
// Generation (capability B): spec -> AGENTS.md
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   name?: string,
 *   description?: string,
 *   language?: string,
 *   framework?: string,
 *   packageManager?: string,
 *   install?: string,
 *   build?: string,
 *   test?: string,
 *   lint?: string,
 *   dev?: string,
 *   conventions?: string[],
 *   doNots?: string[],
 *   prChecklist?: string[],
 * }} spec
 */
export function generate(spec = {}) {
  const pm = spec.packageManager || 'npm';
  const ir = {
    title: spec.name || 'AGENTS.md',
    intro:
      spec.description ||
      `Guidance for AI coding agents working in this repository.${
        spec.language ? ` Primary language: ${spec.language}.` : ''
      }${spec.framework ? ` Framework: ${spec.framework}.` : ''}`,
    globs: [],
    sourceFormat: 'generate',
    warnings: [],
    sections: [],
  };

  const cmds = [];
  if (spec.install) cmds.push(`- Install: \`${spec.install}\``);
  else cmds.push(`- Install: \`${pm} install\``);
  if (spec.dev) cmds.push(`- Dev server: \`${spec.dev}\``);
  if (spec.build) cmds.push(`- Build: \`${spec.build}\``);
  if (spec.test) cmds.push(`- Test: \`${spec.test}\``);
  if (spec.lint) cmds.push(`- Lint: \`${spec.lint}\``);
  ir.sections.push({
    heading: 'Build & test commands',
    body: cmds.join('\n') + '\n\nAlways run the test and lint commands before finishing a task.',
  });

  const style = (spec.conventions && spec.conventions.length
    ? spec.conventions
    : [
        'Match the style of surrounding code; do not reformat unrelated lines.',
        'Prefer small, focused changes and clear names over cleverness.',
        spec.language ? `Write idiomatic ${spec.language}.` : 'Follow the project\'s existing idioms.',
      ]
  )
    .map((c) => `- ${c}`)
    .join('\n');
  ir.sections.push({ heading: 'Code style & conventions', body: style });

  if (spec.doNots && spec.doNots.length) {
    ir.sections.push({
      heading: 'Do not',
      body: spec.doNots.map((d) => `- ${d}`).join('\n'),
    });
  }

  const checklist = (spec.prChecklist && spec.prChecklist.length
    ? spec.prChecklist
    : [
        'Tests and lint pass locally.',
        'No unrelated files changed.',
        'Public APIs and docs updated if behavior changed.',
      ]
  )
    .map((c) => `- [ ] ${c}`)
    .join('\n');
  ir.sections.push({ heading: 'Before opening a PR', body: checklist });

  return { output: render(ir, 'agents'), warnings: [], ir };
}
