const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Connections page
  await page.goto('http://localhost:3000/connections');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'connections-verified.png', fullPage: true });
  console.log('✓ Connections page screenshot saved');
  
  await browser.close();
})();
