/**
 * Quick Admin Test
 */

const puppeteer = require('puppeteer');

async function testAdmin() {
    const browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (!msg.text().includes('font') && !msg.text().includes('DevTools')) {
            console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
        }
    });

    try {
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.clear());

        await page.focus('input[type="email"]');
        await page.type('input[type="email"]', 'admin@conductores.com');
        await page.focus('input[type="password"]');
        await page.type('input[type="password"]', 'admin123');

        console.log('Submitting admin login...');
        await page.click('button[type="submit"]');

        // Monitor for 5 seconds
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const path = new URL(page.url()).pathname;
            const hasToken = await page.evaluate(() => !!localStorage.getItem('auth_token'));
            console.log(`${i * 0.5}s: ${path} | Token: ${hasToken ? 'YES' : 'NO'}`);

            if (path === '/dashboard') {
                console.log('✅ Admin login SUCCESS!');
                break;
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }

    console.log('Browser open for inspection...');
}

testAdmin().catch(console.error);