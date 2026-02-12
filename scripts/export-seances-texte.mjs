import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    input: './emc.html',
    output: './exports/emc-texte.md',
    headless: true,
    channel: 'msedge',
  };

  while (args.length) {
    const a = args.shift();
    if (!a) continue;

    if (a === '--in' || a === '-i') {
      options.input = args.shift() ?? options.input;
      continue;
    }
    if (a === '--out' || a === '-o') {
      options.output = args.shift() ?? options.output;
      continue;
    }
    if (a === '--headed') {
      options.headless = false;
      continue;
    }
    if (a === '--channel' || a === '-c') {
      options.channel = (args.shift() ?? '').trim() || null;
      continue;
    }
    if (a === '--help' || a === '-h') {
      options.help = true;
      continue;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node ./scripts/export-seances-texte.mjs [options]

Options:
  -i, --in  <path>   Input HTML (default: ./emc.html)
  -o, --out <path>   Output Markdown (default: ./exports/emc-texte.md)
  -c, --channel <name>  Browser channel (default: msedge). Use "" to disable.
  --headed           Run with a visible browser
  -h, --help
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const inputPath = path.resolve(process.cwd(), options.input);
const outputPath = path.resolve(process.cwd(), options.output);

const inputUrl = pathToFileURL(inputPath).toString();
const navigableUrl = `${inputUrl}#/`;

let browser;
try {
  browser = await chromium.launch({
    headless: options.headless,
    channel: options.channel || undefined,
  });
} catch (err) {
  // Fallback to Playwright-managed browser binaries
  browser = await chromium.launch({ headless: options.headless });
}
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  }
});

await page.goto(navigableUrl, { waitUntil: 'networkidle' });
await page.waitForSelector('#seance-1', { timeout: 60_000 });

const extracted = await page.evaluate(() => {
  const sectionIds = [
    'seance-1',
    'seance-2',
    'inter-seance',
    'seance-3',
    'seance-4',
  ];

  function cleanNode(root) {
    root.querySelectorAll('.material-symbols-outlined').forEach((el) => el.remove());
    root.querySelectorAll('sup').forEach((el) => el.remove());
    root.querySelectorAll('ol.list-decimal').forEach((ol) => {
      const container = ol.closest('.glass-card');
      if (container) container.remove();
      else ol.remove();
    });
    root.querySelectorAll('a').forEach((a) => {
      // keep visible link text only
      const span = document.createElement('span');
      span.textContent = a.textContent ?? '';
      a.replaceWith(span);
    });
  }

  function getHeader(sectionEl) {
    const h1 = sectionEl.querySelector('h1');
    const subtitle = sectionEl.querySelector('h1 + p');
    return {
      title: (h1?.innerText ?? '').trim(),
      subtitle: (subtitle?.innerText ?? '').trim(),
    };
  }

  function getTopLevelGlassCards(sectionEl) {
    const all = Array.from(sectionEl.querySelectorAll('.glass-card'));
    return all.filter((el) => {
      const parentGlass = el.parentElement?.closest('.glass-card');
      return !parentGlass || parentGlass === el;
    });
  }

  function formatCardText(cardEl) {
    const blocks = [];
    const elements = Array.from(
      cardEl.querySelectorAll(
        'h3, h4, p, li, figcaption, blockquote, span.uppercase.tracking-wider'
      )
    );

    let inList = false;
    for (const el of elements) {
      const raw = (el.innerText ?? '').trim();
      if (!raw) continue;

      if (el.tagName === 'LI') {
        if (!inList) {
          // ensure list starts on a new paragraph
          inList = true;
        }
        blocks.push(`- ${raw}`);
        continue;
      }

      if (inList) {
        // add a separator after a list when switching back to paragraphs
        blocks.push('');
        inList = false;
      }

      blocks.push(raw);
    }

    // Cleanup: remove empty separators at ends, then join
    while (blocks.length && blocks[0] === '') blocks.shift();
    while (blocks.length && blocks[blocks.length - 1] === '') blocks.pop();

    // Join: list items are already prefixed; keep list items contiguous.
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const cur = blocks[i];
      if (cur === '') {
        if (out.length && out[out.length - 1] !== '') out.push('');
        continue;
      }

      const isListItem = cur.startsWith('- ');
      const prev = out[out.length - 1];
      const prevIsListItem = typeof prev === 'string' && prev.startsWith('- ');

      if (isListItem && prevIsListItem) {
        out.push(cur);
        continue;
      }

      if (out.length) out.push('');
      out.push(cur);
    }

    return out.join('\n');
  }

  const sections = [];
  for (const id of sectionIds) {
    const sectionEl = document.getElementById(id);
    if (!sectionEl) continue;

    const clone = sectionEl.cloneNode(true);
    cleanNode(clone);

    const header = getHeader(clone);
    const cards = getTopLevelGlassCards(clone);

    const parts = [];
    for (const card of cards) {
      const cardClone = card.cloneNode(true);
      cleanNode(cardClone);

      const txt = formatCardText(cardClone).trim();
      if (!txt) continue;

      // Skip any leftover "Sources" cards if the structure changes
      if (/\bSources\b/i.test(txt) && /Références/i.test(txt)) continue;
      parts.push(txt);
    }

    sections.push({
      id,
      title: header.title,
      subtitle: header.subtitle,
      parts,
    });
  }

  return sections;
});

await context.close();
await browser.close();

const exportedAt = new Date().toLocaleString('fr-FR');

let md = '';
md += '# Texte des séances (sans sources)\n\n';
md += `Exporté le ${exportedAt}\n\n`;

for (const s of extracted) {
  const title = s.title && s.title.length > 0 ? s.title : s.id;
  md += `## ${title}\n\n`;
  if (s.subtitle) {
    md += `_${s.subtitle}_\n\n`;
  }

  for (const part of s.parts) {
    // Normalize excessive blank lines for readability
    const normalized = part
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    md += `${normalized}\n\n`;
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, md, 'utf8');

console.log(`Wrote: ${outputPath}`);
