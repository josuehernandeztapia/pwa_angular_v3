const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: 'http://localhost:4200' });
  await page.goto('/');
  const routes = ['/login', '/dashboard', '/simulador/ags-ahorro'];
  for (const path of routes) {
    await page.goto(path);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const info = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.getAttribute('lang'),
      href: window.location.href
    }));
    console.log(path, info);
  }
  await browser.close();
})();
