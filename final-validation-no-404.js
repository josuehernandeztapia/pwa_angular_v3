/**
 * 🎯 Final Validation - 100% Click by Click Sin 404s
 */

const puppeteer = require('puppeteer');

async function finalValidation() {
    console.log('🎯 FINAL VALIDATION - 100% FUNCTIONAL');
    console.log('====================================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    const errors404 = [];
    const functionalIssues = [];

    // Monitor 404s specifically
    page.on('response', response => {
        if (response.status() === 404) {
            errors404.push(response.url());
            console.log(`❌ 404 Error: ${response.url()}`);
        }
    });

    // Monitor console errors
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('DevTools')) {
            console.log(`🚨 Console Error: ${msg.text()}`);
        }
    });

    try {
        const users = [
            { email: 'asesor@conductores.com', password: 'demo123', role: 'asesor' },
            { email: 'supervisor@conductores.com', password: 'super123', role: 'supervisor' },
            { email: 'admin@conductores.com', password: 'admin123', role: 'admin' }
        ];

        let allTestsPassed = true;

        for (const user of users) {
            console.log(`\n👤 Testing ${user.role.toUpperCase()}`);
            console.log('='.repeat(30));

            // Login flow
            await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
            await page.evaluate(() => localStorage.clear());

            await page.focus('input[type="email"]');
            await page.type('input[type="email"]', user.email);
            await page.focus('input[type="password"]');
            await page.type('input[type="password"]', user.password);

            console.log(`📝 Filled credentials for ${user.email}`);

            await page.click('button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentPath = new URL(page.url()).pathname;
            if (currentPath === '/dashboard') {
                console.log(`✅ Login successful - redirected to dashboard`);
            } else {
                console.log(`❌ Login failed - at ${currentPath}`);
                functionalIssues.push(`${user.role} login failed`);
                allTestsPassed = false;
                continue;
            }

            // Test navigation
            const routes = ['/cotizador', '/simulador', '/clientes'];

            for (const route of routes) {
                await page.goto(`http://localhost:4300${route}`, { waitUntil: 'networkidle0' });
                await new Promise(resolve => setTimeout(resolve, 1000));

                const path = new URL(page.url()).pathname;
                if (path.startsWith(route.split('?')[0])) {
                    console.log(`✅ ${route} accessible`);
                } else {
                    console.log(`❌ ${route} not accessible - redirected to ${path}`);
                    functionalIssues.push(`${user.role} cannot access ${route}`);
                    allTestsPassed = false;
                }
            }

            // Logout test
            await page.evaluate(() => localStorage.clear());
            await page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const logoutPath = new URL(page.url()).pathname;
            if (logoutPath === '/login') {
                console.log(`✅ Logout protection working`);
            } else {
                console.log(`❌ Logout protection failed`);
                functionalIssues.push(`${user.role} logout protection failed`);
                allTestsPassed = false;
            }
        }

        // Final report
        console.log('\n📊 FINAL VALIDATION REPORT');
        console.log('==========================');

        console.log(`\n🔍 404 Errors Found: ${errors404.length}`);
        if (errors404.length > 0) {
            errors404.forEach(url => console.log(`   - ${url}`));
        } else {
            console.log('   ✅ No 404 errors detected!');
        }

        console.log(`\n⚙️  Functional Issues: ${functionalIssues.length}`);
        if (functionalIssues.length > 0) {
            functionalIssues.forEach(issue => console.log(`   - ${issue}`));
        } else {
            console.log('   ✅ All functionality working perfectly!');
        }

        if (errors404.length === 0 && allTestsPassed) {
            console.log('\n🎉 SUCCESS: 100% FUNCTIONAL - NO 404s');
            console.log('✅ All users can login, navigate, and be protected by guards');
            console.log('✅ No missing assets or broken links');
            console.log('✅ Authentication system fully operational');
        } else {
            console.log('\n⚠️  ISSUES REMAINING:');
            if (errors404.length > 0) console.log(`   - ${errors404.length} missing assets`);
            if (!allTestsPassed) console.log(`   - ${functionalIssues.length} functional issues`);
        }

        await page.screenshot({ path: 'final-validation-state.png', fullPage: true });

    } catch (error) {
        console.error('❌ Validation error:', error);
    }

    console.log('\n🔍 Browser open for manual inspection...');
}

finalValidation().catch(console.error);