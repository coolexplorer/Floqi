const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('✓ Opening signup page...');
    await page.goto('http://localhost:3000/signup');
    await page.waitForTimeout(2000);
    
    // Fill form
    const testEmail = 'test-' + Date.now() + '@example.com';
    console.log('✓ Filling signup form with:', testEmail);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'signup-before.png' });
    console.log('✓ Screenshot saved: signup-before.png');
    
    // Click sign up button
    console.log('✓ Clicking Sign Up button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Take screenshot after submit
    await page.screenshot({ path: 'signup-after.png' });
    console.log('✓ Screenshot saved: signup-after.png');
    
    console.log('✓ Current URL:', page.url());
    
    await page.waitForTimeout(2000);
    await browser.close();
    
    console.log('\n✅ Test completed! Check signup-before.png and signup-after.png');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'signup-error.png' });
    await browser.close();
  }
})();
