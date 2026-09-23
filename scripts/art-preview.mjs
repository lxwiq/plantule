#!/usr/bin/env node
/**
 * Renders Plantule's drawings (src/art) to a PNG contact sheet, to look at them
 * while drawing. Needs Node 23.6+ (TypeScript type stripping) and Google Chrome.
 *
 *   node scripts/art-preview.mjs [filter] [--out sheet.png] [--size 200] [--cols 6] [--dark] [--svg-dir dir]
 *
 * `filter` keeps the drawings whose "group/name" contains it ("plants/monstera",
 * "pepin", "moods"). --dark draws the tiles on the app's dark background.
 * --svg-dir also writes each drawing to its own .svg file.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// Node warns that src/ is TypeScript in a package without "type": that's expected here.
process.removeAllListeners('warning');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Resolve the app's imports the way Metro does: "@/…" is src/, extensions are optional.
registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = specifier;
    if (target.startsWith('@/')) target = pathToFileURL(join(root, 'src', target.slice(2))).href;
    const local = target.startsWith('.') || target.startsWith('file:');
    if (local && !/\.[cm]?[jt]sx?$/.test(target)) {
      const base = new URL(target, context.parentURL).href;
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        if (existsSync(fileURLToPath(base + suffix))) return nextResolve(base + suffix, context);
      }
    }
    return nextResolve(target, context);
  },
});

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: join(tmpdir(), `plantule-art-${process.pid}.png`) },
    size: { type: 'string', default: '200' },
    cols: { type: 'string', default: '6' },
    dark: { type: 'boolean', default: false },
    'svg-dir': { type: 'string' },
  },
});

const { previews } = await import(pathToFileURL(join(root, 'src/art/preview.ts')).href);
const filter = positionals[0] ?? '';
const items = previews().filter((p) => `${p.group}/${p.name}`.includes(filter));
if (items.length === 0) {
  console.error(`No drawing matches "${filter}".`);
  process.exit(1);
}

if (values['svg-dir']) {
  mkdirSync(values['svg-dir'], { recursive: true });
  for (const p of items) writeFileSync(join(values['svg-dir'], `${p.group}-${p.name}.svg`), p.svg);
}

const size = Number(values.size);
const cols = Math.min(Number(values.cols), items.length);
const rows = Math.ceil(items.length / cols);
const gap = 12;
const label = 22;
const width = cols * (size + gap) + gap;
const height = rows * (size + label + gap) + gap;
// The tile colors of PlantThumb: primaryContainer in light and dark mode.
const [page, tile, text] = values.dark ? ['#0F1510', '#145228', '#DEE4DA'] : ['#F6FBF3', '#B4F1BD', '#171D18'];

const html = `<!doctype html><html><body style="margin:0;background:${page};font:13px sans-serif;color:${text}">
<div style="display:grid;grid-template-columns:repeat(${cols},${size}px);gap:${gap}px;padding:${gap}px">
${items
  .map(
    (p) => `<div><div style="width:${size}px;height:${size}px;background:${tile};border-radius:${size * 0.2}px;overflow:hidden">
${p.svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
<div style="height:${label}px;line-height:${label}px;overflow:hidden;white-space:nowrap">${p.group}/${p.name}</div></div>`,
  )
  .join('\n')}
</div></body></html>`;

const htmlFile = join(tmpdir(), `plantule-art-${process.pid}.html`);
writeFileSync(htmlFile, html);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
try {
  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${resolve(values.out)}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: 'ignore', timeout: 60_000 },
  );
} finally {
  rmSync(htmlFile, { force: true });
}
console.log(`${items.length} drawings → ${resolve(values.out)}`);
