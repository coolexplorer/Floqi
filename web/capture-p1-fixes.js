const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Login page (form on left now)
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'login-p1.png', fullPage: true });
  console.log('✓ Login page (P1) screenshot saved');
  
  // Signup page (form on left now)
  await page.goto('http://localhost:3000/signup');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'signup-p1.png', fullPage: true });
  console.log('✓ Signup page (P1) screenshot saved');
  
  // Connections page (3-column grid)
  await page.goto('http://localhost:3000/connections');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'connections-p1.png', fullPage: true });
  console.log('✓ Connections page (P1) screenshot saved');
  
  await browser.close();
})();
