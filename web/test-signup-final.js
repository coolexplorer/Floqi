const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ BROWSER ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => console.log('❌ PAGE ERROR:', error.message));
  
  try {
    console.log('✓ Opening signup page...');
    await page.goto('http://localhost:3000/signup');
    await page.waitForTimeout(2000);
    
    const testEmail = 'test-' + Date.now() + '@example.com';
    console.log('✓ Email:', testEmail);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    console.log('✓ Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('✓ Current URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ SUCCESS! Redirected to dashboard');
      await page.screenshot({ path: 'dashboard-success.png' });
    } else {
      console.log('⚠️  Still on signup page');
      await page.screenshot({ path: 'signup-failed.png' });
    }
    
    await page.waitForTimeout(2000);
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();
