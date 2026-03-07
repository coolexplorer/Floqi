const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  try {
    console.log('✓ Opening signup page...');
    await page.goto('http://localhost:3000/signup');
    await page.waitForTimeout(2000);
    
    const testEmail = 'test-' + Date.now() + '@example.com';
    console.log('✓ Filling form:', testEmail);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    console.log('✓ Clicking Sign Up...');
    await page.click('button[type="submit"]');
    
    // Wait longer to see errors
    await page.waitForTimeout(5000);
    
    console.log('✓ Final URL:', page.url());
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();
