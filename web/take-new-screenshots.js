const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login page
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'login-new.png', fullPage: true });
  console.log('✓ Login page screenshot saved');
  
  // Signup page
  await page.goto('http://localhost:3000/signup');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'signup-new.png', fullPage: true });
  console.log('✓ Signup page screenshot saved');
  
  // Connections page
  await page.goto('http://localhost:3000/connections');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'connections-new.png', fullPage: true });
  console.log('✓ Connections page screenshot saved');
  
  await browser.close();
})();
