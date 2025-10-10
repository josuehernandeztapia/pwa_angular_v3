/**
 * 🔧 Login Fix Test
 * Quick test to validate the corrected login functionality
 */

const puppeteer = require('puppeteer');

async function testLoginFix() {
    console.log('🔧 TESTING LOGIN FIX');
    console.log('===================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    // Monitor console for errors
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('font') && !msg.text().includes('icon')) {
            errors.push(msg.text());
            console.log(`❌ Console Error: ${msg.text()}`);
        }
    });

    try {
        console.log('🌐 Navigating to login page...');
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        // Test each demo user
        const demoUsers = [
            { email: 'asesor@conductores.com', password: 'demo123', role: 'asesor' },
            { email: 'supervisor@conductores.com', password: 'super123', role: 'supervisor' },
            { email: 'admin@conductores.com', password: 'admin123', role: 'admin' }
        ];

        for (const user of demoUsers) {
            console.log(`\n🧪 Testing login for ${user.role}...`);

            // Navigate to fresh login page
            await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Fill credentials
            await page.waitForSelector('input[type="email"]');
            await page.focus('input[type="email"]');
            await page.evaluate(() => document.querySelector('input[type="email"]').value = '');
            await page.type('input[type="email"]', user.email);

            await page.focus('input[type="password"]');
            await page.evaluate(() => document.querySelector('input[type="password"]').value = '');
            await page.type('input[type="password"]', user.password);

            console.log(`   📝 Filled credentials for ${user.email}`);

            // Submit form
            await page.click('button[type="submit"]');
            console.log('   🚀 Submitted login form');

            // Wait for navigation or error
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentUrl = page.url();
            const currentPath = new URL(currentUrl).pathname;

            if (currentPath === '/dashboard') {
                console.log(`   ✅ ${user.role} login SUCCESS - redirected to dashboard`);

                // Validate dashboard content
                const dashboardContent = await page.evaluate(() => {
                    return {
                        hasAppRoot: !!document.querySelector('app-root'),
                        hasContent: document.querySelector('app-root')?.innerHTML.length > 100,
                        title: document.title,
                        url: window.location.href
                    };
                });

                if (dashboardContent.hasContent) {
                    console.log(`   🎯 Dashboard loaded with ${dashboardContent.hasAppRoot ? 'content' : 'no content'}`);
                } else {
                    console.log('   ⚠️  Dashboard page loaded but no content visible');
                }

                // Quick logout test
                try {
                    // Clear localStorage to simulate logout
                    await page.evaluate(() => {
                        localStorage.clear();
                        sessionStorage.clear();
                    });

                    // Try to access protected route
                    await page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const postLogoutPath = new URL(page.url()).pathname;
                    if (postLogoutPath === '/login') {
                        console.log('   🔒 Logout protection working - redirected to login');
                    } else {
                        console.log('   ⚠️  Logout protection issue - still on protected page');
                    }
                } catch (e) {
                    console.log('   ⚠️  Logout test failed:', e.message);
                }

            } else if (currentPath === '/login') {
                console.log(`   ❌ ${user.role} login FAILED - stayed on login page`);

                // Check for error message
                const errorMessage = await page.$eval('.error-message, [class*="error"], .alert-danger',
                    el => el.textContent,
                ).catch(() => null);

                if (errorMessage) {
                    console.log(`   📝 Error message: "${errorMessage}"`);
                } else {
                    console.log('   📝 No visible error message');
                }
            } else {
                console.log(`   ⚠️  ${user.role} login UNEXPECTED - redirected to ${currentPath}`);
            }
        }

        console.log('\n📊 LOGIN FIX TEST SUMMARY');
        console.log('========================');

        if (errors.length === 0) {
            console.log('✅ No JavaScript errors detected');
        } else {
            console.log(`❌ ${errors.length} JavaScript errors detected:`);
            errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
        }

        console.log('\n💡 Next: Run the full E2E simulator to validate complete user flows');

        await page.screenshot({ path: 'login-fix-test.png', fullPage: true });
        console.log('📸 Screenshot saved: login-fix-test.png');

    } catch (error) {
        console.error('❌ Test error:', error);
    }

    console.log('\n🔍 Browser left open for manual inspection...');
    // Don't close browser for manual testing
}

// Execute test
testLoginFix().catch(console.error);