import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  // Open the file
  await page.goto('file:///home/runner/work/emc/emc/emc.html');
  
  // Wait for content to load
  await page.waitForTimeout(3000);
  
  // Take screenshot of landing page
  await page.screenshot({ path: '/tmp/landing-page.png', fullPage: false });
  console.log('Screenshot saved: /tmp/landing-page.png');
  
  // Scroll down to see more content
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/content-section.png', fullPage: false });
  console.log('Screenshot saved: /tmp/content-section.png');
  
  // Test a specific page
  await page.goto('file:///home/runner/work/emc/emc/emc.html#/seance-1');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/seance-1.png', fullPage: false });
  console.log('Screenshot saved: /tmp/seance-1.png');
  
  await browser.close();
})();
