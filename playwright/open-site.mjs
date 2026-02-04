import { chromium, firefox, webkit } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    browser: 'chromium',
    headless: false,
    waitMs: 0,
    screenshot: null,
    url: null,
  };

  while (args.length) {
    const a = args.shift();
    if (!a) continue;

    if (a === '--browser' || a === '-b') {
      options.browser = (args.shift() ?? '').trim();
      continue;
    }
    if (a === '--headless') {
      options.headless = true;
      continue;
    }
    if (a === '--wait' || a === '-w') {
      options.waitMs = Number(args.shift() ?? 0);
      continue;
    }
    if (a === '--screenshot' || a === '-s') {
      options.screenshot = args.shift() ?? 'screenshot.png';
      continue;
    }
    if (a === '--help' || a === '-h') {
      return { ...options, help: true };
    }

    // first positional = url/path
    if (!options.url) options.url = a;
  }

  return options;
}

function toNavigableUrl(input) {
  if (!input || input.trim().length === 0) {
    const localPath = path.resolve(process.cwd(), 'emc.html');
    return pathToFileURL(localPath).toString();
  }

  const trimmed = input.trim();

  // Already a URL
  if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Treat as local path
  const localPath = path.resolve(process.cwd(), trimmed);
  return pathToFileURL(localPath).toString();
}

function getBrowserLauncher(name) {
  const n = (name || '').toLowerCase();
  if (n === 'firefox') return firefox;
  if (n === 'webkit') return webkit;
  return chromium;
}

function printHelp() {
  console.log(`Usage:
  npm run open -- [url|path] [options]

Examples:
  npm run open -- https://example.com
  npm run open -- ./emc.html
  npm run open -- https://example.com --headless -s shot.png -w 1500

Options:
  -b, --browser <chromium|firefox|webkit>
  --headless
  -s, --screenshot <file>
  -w, --wait <ms>   Additional wait after networkidle
  -h, --help
`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const targetUrl = toNavigableUrl(options.url);
const browserType = getBrowserLauncher(options.browser);

const browser = await browserType.launch({ headless: options.headless });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
});

const page = await context.newPage();
page.on('console', (msg) => {
  // Reduce noise but keep errors/warnings
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  }
});

console.log(`Navigating to: ${targetUrl}`);
await page.goto(targetUrl, { waitUntil: 'networkidle' });

if (options.waitMs > 0) {
  await page.waitForTimeout(options.waitMs);
}

if (options.screenshot) {
  await page.screenshot({ path: options.screenshot, fullPage: true });
  console.log(`Saved screenshot: ${options.screenshot}`);
}

if (!options.headless) {
  console.log('Browser is open. Close it to end the script.');
  await page.waitForEvent('close').catch(() => {});
}

await context.close();
await browser.close();
