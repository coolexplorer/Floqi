const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  console.log('✓ Opening dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'dashboard-stage3.png', fullPage: true });
  console.log('✅ Dashboard screenshot saved: dashboard-stage3.png');
  
  // Also capture automations page
  console.log('✓ Opening automations...');
  await page.goto('http://localhost:3000/automations');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'automations-stage3.png', fullPage: true });
  console.log('✅ Automations screenshot saved: automations-stage3.png');
  
  await browser.close();
})();
