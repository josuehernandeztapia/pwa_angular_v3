const { chromium } = require('playwright');
const fs = require('fs');

class RealAuthFix {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:4300';
        this.results = [];
        this.screenshots = [];
    }

    async initialize() {
        console.log('🚀 REAL AUTH FIX - Complete Login Flow');
        console.log('🎯 1. Click demo user (fill form) + 2. Click login button (submit)');
        console.log(`🔗 Base URL: ${this.baseUrl}`);

        this.browser = await chromium.launch({
            headless: false,
            devtools: false,
            slowMo: 300
        });

        this.page = await this.browser.newPage();

        // Monitor network calls
        this.page.on('response', async (response) => {
            if (response.url().includes('auth/login')) {
                console.log(`🌐 AUTH CALL: ${response.status()} ${response.url()}`);
                const responseBody = await response.text().catch(() => 'Could not read body');
                console.log(`🔍 Response: ${responseBody.substring(0, 200)}`);
            }
        });

        return true;
    }

    async takeScreenshot(name) {
        const filename = `real-auth-${name}-${Date.now()}.png`;
        await this.page.screenshot({ path: filename, fullPage: true });
        this.screenshots.push(filename);
        console.log(`📸 ${filename}`);
        return filename;
    }

    async completeAuthentication() {
        console.log('\\n🔐 COMPLETE AUTHENTICATION FLOW');

        // Step 1: Navigate
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
        await this.takeScreenshot('01-login-page');

        // Step 2: Wait for demo users
        await this.page.waitForSelector('[data-cy^="demo-user-"]', { timeout: 15000 });
        const demoUsers = await this.page.$$('[data-cy^="demo-user-"]');
        console.log(`✅ Found ${demoUsers.length} demo users`);

        // Step 3: Click first demo user (fills form)
        console.log('👆 STEP 1: Click demo user to fill form...');
        await this.page.click('[data-cy^="demo-user-"]:first-child');
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot('02-demo-user-clicked');

        // Check form values after demo user click
        const formValues = await this.page.evaluate(() => {
            const emailInput = document.querySelector('input[type="email"]');
            const passwordInput = document.querySelector('input[type="password"]');
            return {
                email: emailInput ? emailInput.value : '',
                password: passwordInput ? passwordInput.value : ''
            };
        });

        console.log(`📝 Form filled - Email: ${formValues.email}, Password: ${formValues.password ? '***' : 'empty'}`);

        // Step 4: Click login button (submits form)
        console.log('👆 STEP 2: Click login button to submit...');

        // Wait for login button and click it
        const loginButtonSelector = 'button[type="submit"], button:has-text("Iniciar"), button:has-text("Login"), .login-btn';

        try {
            await this.page.waitForSelector(loginButtonSelector, { timeout: 5000 });
            await this.page.click(loginButtonSelector);
            console.log('✅ Clicked login button');
        } catch (error) {
            // Try alternative selectors
            const alternativeSelectors = [
                'button[type="submit"]',
                'form button',
                '.btn-primary',
                '.login-button',
                'button:has-text("Iniciar")'
            ];

            let buttonClicked = false;
            for (const selector of alternativeSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        console.log(`✅ Clicked login button with selector: ${selector}`);
                        buttonClicked = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!buttonClicked) {
                console.log('❌ Could not find login button, trying form submission...');
                // Try to submit form directly
                await this.page.keyboard.press('Enter');
            }
        }

        await this.page.waitForTimeout(3000);
        await this.takeScreenshot('03-after-login-submit');

        // Step 5: Check authentication result
        const authResult = await this.page.evaluate(() => {
            return {
                currentUrl: window.location.href,
                pathname: window.location.pathname,
                localStorage: Object.keys(localStorage),
                sessionStorage: Object.keys(sessionStorage),
                cookies: document.cookie
            };
        });

        console.log(`📍 Final URL: ${authResult.currentUrl}`);
        console.log(`📱 Storage: ${authResult.localStorage.length} local, ${authResult.sessionStorage.length} session`);

        const authSuccess = !authResult.pathname.includes('login') ||
                           authResult.localStorage.length > 1 ||
                           authResult.sessionStorage.length > 1;

        this.results.push({
            test: 'Complete Authentication Flow',
            passed: authSuccess,
            details: `URL: ${authResult.currentUrl}, Storage: ${authResult.localStorage.length + authResult.sessionStorage.length}`,
            formFilled: formValues.email !== '' && formValues.password !== '',
            finalUrl: authResult.currentUrl
        });

        return authSuccess;
    }

    async testNavigationAfterAuth() {
        console.log('\\n🧭 TESTING NAVIGATION AFTER AUTH');

        const testRoutes = ['/simuladores', '/cotizadores', '/dashboard'];

        for (const route of testRoutes) {
            console.log(`🌐 Testing ${route}...`);

            await this.page.goto(`${this.baseUrl}${route}`, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);

            const currentUrl = this.page.url();
            const isWorking = !currentUrl.includes('login');

            console.log(`${isWorking ? '✅' : '❌'} ${route}: ${currentUrl}`);

            this.results.push({
                test: `Navigation to ${route}`,
                passed: isWorking,
                details: `Final URL: ${currentUrl}`,
                redirectedToLogin: currentUrl.includes('login')
            });

            if (isWorking) {
                await this.takeScreenshot(`nav-${route.replace('/', '')}`);
            }
        }
    }

    async generateReport() {
        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const successRate = Math.round((passed / total) * 100);

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'Real Auth Fix - Complete Login Flow',
            total,
            passed,
            failed: total - passed,
            successRate,
            results: this.results,
            screenshots: this.screenshots
        };

        const filename = `real-auth-fix-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\\n📊 REAL AUTH FIX - FINAL REPORT');
        console.log('='.repeat(50));
        console.log(`📄 Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${total - passed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`💾 Report: ${filename}`);

        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.details}`);
        });

        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();

            const authSuccess = await this.completeAuthentication();

            if (authSuccess) {
                console.log('🎉 AUTHENTICATION SUCCESSFUL! Testing navigation...');
                await this.testNavigationAfterAuth();
            } else {
                console.log('❌ Authentication failed, cannot test navigation');
            }

            await this.generateReport();

        } catch (error) {
            console.error('💥 Error:', error.message);
        } finally {
            await this.cleanup();
        }
    }
}

// Run
if (require.main === module) {
    const fixer = new RealAuthFix();
    fixer.run()
        .then(() => {
            console.log('\\n✅ Real auth fix completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\\n❌ Real auth fix failed:', error.message);
            process.exit(1);
        });
}

module.exports = RealAuthFix;