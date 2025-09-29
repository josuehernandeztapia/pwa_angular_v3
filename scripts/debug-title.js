const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4200/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.getAttribute('lang'),
  }));
  console.log(info);
  await browser.close();
})();
