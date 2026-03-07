const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1920, height: 1080 });

  // Step 1: Sign up
  console.log('✓ Signing up...');
  await page.goto('http://localhost:3000/signup');
  await page.waitForTimeout(2000);

  const testEmail = 'test-' + Date.now() + '@example.com';
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Wait for redirect to automations
  await page.waitForTimeout(3000);

  // Step 2: Capture Automations page
  console.log('✓ Capturing Automations page...');
  await page.screenshot({ path: 'automations-authenticated.png', fullPage: true });
  console.log('✅ Automations screenshot saved');

  // Step 3: Navigate to Dashboard (home)
  console.log('✓ Navigating to Dashboard...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'dashboard-authenticated.png', fullPage: true });
  console.log('✅ Dashboard screenshot saved');

  // Step 4: Navigate to Connections
  console.log('✓ Navigating to Connections...');
  await page.goto('http://localhost:3000/connections');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'connections-authenticated.png', fullPage: true });
  console.log('✅ Connections screenshot saved');

  await browser.close();
})();
