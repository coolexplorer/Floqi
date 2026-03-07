const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login page
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'login-screenshot.png', fullPage: true });
  console.log('✓ Login page screenshot saved');
  
  // Signup page
  await page.goto('http://localhost:3000/signup');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'signup-screenshot.png', fullPage: true });
  console.log('✓ Signup page screenshot saved');
  
  await browser.close();
})();
