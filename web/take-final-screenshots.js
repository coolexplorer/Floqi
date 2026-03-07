const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Connections page with longer wait
  await page.goto('http://localhost:3000/connections');
  await page.waitForTimeout(3000); // Wait 3 seconds
  await page.screenshot({ path: 'connections-final.png', fullPage: true });
  console.log('✓ Connections page screenshot saved');
  
  await browser.close();
})();
