import fs from 'fs';

const html = fs.readFileSync('emc.html', 'utf8');

// Extract the JavaScript code from the HTML
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.log('ERROR: Could not find React code');
  process.exit(1);
}

const jsCode = scriptMatch[1];

// Check for common issues
const checks = {
  'Has useState': jsCode.includes('useState'),
  'Has useEffect': jsCode.includes('useEffect'),
  'Has HashRouter': jsCode.includes('HashRouter'),
  'Has ProgressIndicator': jsCode.includes('const ProgressIndicator'),
  'Has ScrollToTop': jsCode.includes('const ScrollToTop'),
  'Has Navbar': jsCode.includes('const Navbar'),
  'Has Background': jsCode.includes('const Background'),
  'Has Card': jsCode.includes('const Card'),
  'Has SectionHeader': jsCode.includes('const SectionHeader'),
  'Has App': jsCode.includes('const App'),
  'ProgressIndicator in App': jsCode.includes('<ProgressIndicator />'),
  'ScrollToTop in App': jsCode.includes('<ScrollToTop />'),
};

console.log('\n=== Syntax Validation ===\n');
let allPassed = true;
for (const [check, passed] of Object.entries(checks)) {
  console.log(`${passed ? '✓' : '✗'} ${check}`);
  if (!passed) allPassed = false;
}

console.log('\n=== File Stats ===\n');
console.log(`Total file size: ${html.length} bytes`);
console.log(`JavaScript code size: ${jsCode.length} bytes`);
console.log(`Number of React components: ${(jsCode.match(/const \w+ = \(/g) || []).length}`);

if (allPassed) {
  console.log('\n✅ All validation checks passed!');
} else {
  console.log('\n❌ Some validation checks failed!');
  process.exit(1);
}
