import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  // Listen for console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  
  // Listen for page errors
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Open the file
  console.log('Opening page...');
  await page.goto('file:///home/runner/work/emc/emc/emc.html');
  
  // Wait longer for content to load
  console.log('Waiting for content...');
  await page.waitForTimeout(5000);
  
  // Check if root has content
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.length : 0;
  });
  console.log('Root content length:', rootContent);
  
  // Check for any errors in console
  await page.waitForTimeout(1000);
  
  await browser.close();
})();
