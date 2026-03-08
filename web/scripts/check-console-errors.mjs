import { chromium } from 'playwright';

const PAGES = [
  { name: 'Landing', url: 'http://localhost:3000' },
  { name: 'Login', url: 'http://localhost:3000/login' },
  { name: 'Signup', url: 'http://localhost:3000/signup' },
  { name: 'Dashboard', url: 'http://localhost:3000/dashboard' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const page of PAGES) {
    console.log('\n' + '='.repeat(60));
    console.log('Page: ' + page.name + ' - ' + page.url);
    console.log('='.repeat(60));

    const tab = await context.newPage();
    const errors = [];
    const warnings = [];
    const networkErrors = [];

    tab.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    tab.on('pageerror', (err) => {
      errors.push('[PAGE ERROR] ' + err.message);
    });

    tab.on('response', (res) => {
      if (res.status() >= 400) {
        networkErrors.push(res.status() + ' ' + res.url());
      }
    });

    try {
      const response = await tab.goto(page.url, { waitUntil: 'networkidle', timeout: 15000 });
      const status = response ? response.status() : 'unknown';
      const title = await tab.title();
      const h1 = await tab.$eval('h1', function(el) { return el.textContent; }).catch(function() { return '(no h1)'; });

      console.log('  Status: ' + status);
      console.log('  Title: ' + title);
      console.log('  H1: ' + h1);

      const bodyText = await tab.textContent('body');
      const has404 = bodyText.includes('This page could not be found');
      if (has404) console.log('  WARNING: Body contains "This page could not be found"');

      const finalUrl = tab.url();
      if (finalUrl !== page.url) console.log('  Redirected to: ' + finalUrl);

    } catch (err) {
      console.log('  Navigation error: ' + err.message);
    }

    if (networkErrors.length) {
      console.log('\n  Network Errors (' + networkErrors.length + '):');
      networkErrors.forEach(function(e) { console.log('    ' + e); });
    }
    if (errors.length) {
      console.log('\n  Console Errors (' + errors.length + '):');
      errors.forEach(function(e) { console.log('    ' + e); });
    }
    if (warnings.length) {
      console.log('\n  Warnings (' + warnings.length + '):');
      warnings.forEach(function(e) { console.log('    ' + e); });
    }
    if (!networkErrors.length && !errors.length) {
      console.log('\n  No errors');
    }

    await tab.close();
  }

  await browser.close();
  console.log('\n' + '='.repeat(60));
  console.log('Done.');
}

main();
