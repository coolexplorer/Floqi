const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture network requests
  page.on('response', async (response) => {
    if (response.url().includes('auth')) {
      console.log(`\n📡 ${response.request().method()} ${response.url()}`);
      console.log(`   Status: ${response.status()}`);
      
      if (response.status() >= 400) {
        try {
          const body = await response.text();
          console.log(`   Error body:`, body.substring(0, 500));
        } catch (e) {
          console.log(`   (Could not read error body)`);
        }
      }
    }
  });
  
  try {
    console.log('✓ Opening signup page...');
    await page.goto('http://localhost:3000/signup');
    await page.waitForTimeout(2000);
    
    const testEmail = 'test-' + Date.now() + '@example.com';
    console.log('✓ Testing with:', testEmail);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    console.log('✓ Submitting...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
    
    console.log('\n✓ Final URL:', page.url());
    
    await browser.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
})();
