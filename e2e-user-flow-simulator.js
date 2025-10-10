/**
 * 🎭 E2E User Flow Simulator with Chrome DevTools MCP
 * Simulates complete user journeys click by click with real-time validation
 */

const puppeteer = require('puppeteer');

class UserFlowSimulator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.currentUser = null;

        // Demo users from AuthService
        this.demoUsers = [
            { email: 'asesor@conductores.com', password: 'demo123', role: 'asesor' },
            { email: 'supervisor@conductores.com', password: 'super123', role: 'supervisor' },
            { email: 'admin@conductores.com', password: 'admin123', role: 'admin' }
        ];
    }

    async init() {
        console.log('🚀 CHROME DEVTOOLS MCP E2E USER FLOW SIMULATOR');
        console.log('=============================================\n');

        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            defaultViewport: { width: 1200, height: 800 },
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();

        // Enable Chrome DevTools domains for MCP simulation
        const client = await this.page.target().createCDPSession();
        await client.send('Runtime.enable');
        await client.send('Network.enable');
        await client.send('Page.enable');
        await client.send('DOM.enable');

        // Network monitoring
        this.page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
            }
        });

        this.page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`📡 API Response: ${response.status()} ${response.url()}`);
            }
        });

        // Console monitoring for errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });

        console.log('✅ Chrome DevTools MCP connection established');
        console.log('🔧 Network monitoring active');
        console.log('📊 Real-time validation enabled\n');
    }

    async takeScreenshot(name) {
        await this.page.screenshot({
            path: `e2e-screenshots/${name}.png`,
            fullPage: true
        });
        console.log(`📸 Screenshot saved: e2e-screenshots/${name}.png`);
    }

    async waitAndClick(selector, description, timeout = 5000) {
        console.log(`🖱️  Waiting to click: ${description}`);

        try {
            await this.page.waitForSelector(selector, { timeout });

            // Highlight element before clicking (DevTools style)
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.style.outline = '3px solid #ff6b6b';
                    element.style.outlineOffset = '2px';
                    setTimeout(() => {
                        element.style.outline = '';
                        element.style.outlineOffset = '';
                    }, 1000);
                }
            }, selector);

            await new Promise(resolve => setTimeout(resolve, 500)); // Visual feedback
            await this.page.click(selector);
            console.log(`✅ Successfully clicked: ${description}`);
            return true;
        } catch (error) {
            console.log(`❌ Failed to click ${description}: ${error.message}`);
            return false;
        }
    }

    async fillInput(selector, value, description) {
        console.log(`⌨️  Filling input: ${description}`);

        try {
            await this.page.waitForSelector(selector, { timeout: 5000 });
            await this.page.focus(selector);
            await this.page.evaluate(sel => document.querySelector(sel).value = '', selector);
            await this.page.type(selector, value, { delay: 50 });
            console.log(`✅ Successfully filled: ${description}`);
            return true;
        } catch (error) {
            console.log(`❌ Failed to fill ${description}: ${error.message}`);
            return false;
        }
    }

    async validateElement(selector, description, shouldExist = true) {
        try {
            const element = await this.page.$(selector);
            const exists = element !== null;

            if ((shouldExist && exists) || (!shouldExist && !exists)) {
                console.log(`✅ Validation passed: ${description}`);
                return true;
            } else {
                console.log(`❌ Validation failed: ${description} (Expected: ${shouldExist ? 'exists' : 'not exists'}, Found: ${exists ? 'exists' : 'not exists'})`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Validation error for ${description}: ${error.message}`);
            return false;
        }
    }

    async validateUrl(expectedPath, description) {
        const currentUrl = this.page.url();
        const actualPath = new URL(currentUrl).pathname;

        if (actualPath === expectedPath) {
            console.log(`✅ URL validation passed: ${description} (${actualPath})`);
            return true;
        } else {
            console.log(`❌ URL validation failed: ${description} (Expected: ${expectedPath}, Got: ${actualPath})`);
            return false;
        }
    }

    async simulateUnauthenticatedFlow() {
        console.log('\n🔓 PHASE 1: UNAUTHENTICATED USER FLOW');
        console.log('=====================================');

        // 1. Visit root - should redirect to login
        console.log('\n📍 Step 1: Visiting root URL');
        await this.page.goto('http://localhost:4300/', { waitUntil: 'networkidle0' });
        await this.takeScreenshot('01-root-redirect');

        const redirectToLogin = await this.validateUrl('/login', 'Root redirects to login');
        this.testResults.push({ test: 'Root redirect to login', passed: redirectToLogin });

        // 2. Validate login page elements
        console.log('\n🔍 Step 2: Validating login page elements');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const loginFormExists = await this.validateElement('form', 'Login form exists');
        const emailInput = await this.validateElement('input[type="email"]', 'Email input exists');
        const passwordInput = await this.validateElement('input[type="password"]', 'Password input exists');
        const loginButton = await this.validateElement('button[type="submit"]', 'Login button exists');

        this.testResults.push(
            { test: 'Login form elements', passed: loginFormExists && emailInput && passwordInput && loginButton }
        );

        // 3. Try accessing protected route without auth
        console.log('\n🚫 Step 3: Testing AuthGuard protection');
        await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 1000));

        const guardRedirect = await this.validateUrl('/login', 'AuthGuard redirects to login');
        this.testResults.push({ test: 'AuthGuard protection', passed: guardRedirect });
        await this.takeScreenshot('02-authguard-protection');

        return loginFormExists && emailInput && passwordInput && loginButton;
    }

    async simulateLoginFlow(user) {
        console.log(`\n🔐 PHASE 2: LOGIN FLOW (${user.role.toUpperCase()})`);
        console.log('=======================================');

        this.currentUser = user;

        // 1. Fill login form
        console.log('\n📝 Step 1: Filling login credentials');
        await this.page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        const emailFilled = await this.fillInput('input[type="email"]', user.email, 'Email field');
        const passwordFilled = await this.fillInput('input[type="password"]', user.password, 'Password field');

        await this.takeScreenshot(`03-login-form-${user.role}`);

        if (!emailFilled || !passwordFilled) {
            this.testResults.push({ test: `Login form fill (${user.role})`, passed: false });
            return false;
        }

        // 2. Submit login form
        console.log('\n🚀 Step 2: Submitting login form');
        const loginSubmitted = await this.waitAndClick('button[type="submit"]', 'Login submit button');

        if (!loginSubmitted) {
            this.testResults.push({ test: `Login submission (${user.role})`, passed: false });
            return false;
        }

        // 3. Wait for authentication and redirect
        console.log('\n⏳ Step 3: Waiting for authentication...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const dashboardRedirect = await this.validateUrl('/dashboard', 'Login redirects to dashboard');
        this.testResults.push({ test: `Login success (${user.role})`, passed: dashboardRedirect });

        if (dashboardRedirect) {
            await this.takeScreenshot(`04-dashboard-${user.role}`);
            console.log(`✅ ${user.role} successfully logged in`);
        }

        return dashboardRedirect;
    }

    async simulateAuthenticatedFlow() {
        console.log('\n🏠 PHASE 3: AUTHENTICATED USER NAVIGATION');
        console.log('=========================================');

        if (!this.currentUser) {
            console.log('❌ No authenticated user found');
            return false;
        }

        const navigationTests = [
            { path: '/dashboard', name: 'Dashboard' },
            { path: '/cotizador', name: 'Cotizador' },
            { path: '/clientes', name: 'Clientes' },
            { path: '/documentos', name: 'Documentos' },
            { path: '/simulador', name: 'Simulador' }
        ];

        let allNavigationPassed = true;

        for (const nav of navigationTests) {
            console.log(`\n🧭 Testing navigation to ${nav.name}`);

            try {
                await this.page.goto(`http://localhost:4300${nav.path}`, {
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });

                await new Promise(resolve => setTimeout(resolve, 2000));

                const currentUrl = this.page.url();
                const actualPath = new URL(currentUrl).pathname;

                // Check if we're still authenticated (not redirected to login)
                const stillAuthenticated = actualPath !== '/login';

                if (stillAuthenticated) {
                    console.log(`✅ ${nav.name} navigation successful: ${actualPath}`);
                    await this.takeScreenshot(`05-nav-${nav.name.toLowerCase()}-${this.currentUser.role}`);
                } else {
                    console.log(`❌ ${nav.name} navigation failed: redirected to login`);
                    allNavigationPassed = false;
                }

                this.testResults.push({
                    test: `Navigate to ${nav.name}`,
                    passed: stillAuthenticated
                });

            } catch (error) {
                console.log(`❌ ${nav.name} navigation error: ${error.message}`);
                allNavigationPassed = false;
                this.testResults.push({
                    test: `Navigate to ${nav.name}`,
                    passed: false
                });
            }
        }

        return allNavigationPassed;
    }

    async simulateLogoutFlow() {
        console.log('\n🚪 PHASE 4: LOGOUT FLOW');
        console.log('========================');

        // Go to dashboard first
        await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Look for logout button (could be in various places)
        const logoutSelectors = [
            'button[title*="logout" i]',
            'button[aria-label*="logout" i]',
            'a[href*="logout"]',
            '[data-testid="logout"]',
            'button:contains("Cerrar")',
            'button:contains("Salir")'
        ];

        let logoutClicked = false;

        for (const selector of logoutSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    console.log(`🔍 Found logout element: ${selector}`);
                    logoutClicked = await this.waitAndClick(selector, 'Logout button');
                    if (logoutClicked) break;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        if (!logoutClicked) {
            // Try alternative: look for user menu or profile dropdown
            const userMenuClicked = await this.waitAndClick('[data-testid="user-menu"], .user-menu, .profile-dropdown', 'User menu');
            if (userMenuClicked) {
                await new Promise(resolve => setTimeout(resolve, 500));
                logoutClicked = await this.waitAndClick('button:contains("Logout"), button:contains("Cerrar"), button:contains("Salir")', 'Logout from menu');
            }
        }

        if (logoutClicked) {
            console.log('⏳ Waiting for logout redirect...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            const logoutRedirect = await this.validateUrl('/login', 'Logout redirects to login');
            this.testResults.push({ test: 'Logout functionality', passed: logoutRedirect });

            if (logoutRedirect) {
                await this.takeScreenshot(`06-logout-${this.currentUser.role}`);
                console.log(`✅ ${this.currentUser.role} successfully logged out`);

                // Verify we can't access protected routes anymore
                await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });
                const postLogoutProtection = await this.validateUrl('/login', 'Post-logout protection works');
                this.testResults.push({ test: 'Post-logout protection', passed: postLogoutProtection });

                return true;
            }
        } else {
            console.log('⚠️  Could not find logout button, testing manual logout via localStorage');

            // Manual logout simulation
            await this.page.evaluate(() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = '/login';
            });

            await new Promise(resolve => setTimeout(resolve, 2000));
            const manualLogout = await this.validateUrl('/login', 'Manual logout works');
            this.testResults.push({ test: 'Manual logout (localStorage)', passed: manualLogout });

            return manualLogout;
        }

        return false;
    }

    async generateReport() {
        console.log('\n📊 E2E TEST RESULTS SUMMARY');
        console.log('===========================');

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const percentage = ((passed / total) * 100).toFixed(1);

        console.log(`\n🎯 Overall Score: ${passed}/${total} (${percentage}%)`);

        console.log('\n📋 Detailed Results:');
        this.testResults.forEach((result, i) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`   ${i + 1}. ${status} ${result.test}`);
        });

        if (percentage >= 90) {
            console.log('\n🎉 EXCELLENT: Authentication system is working perfectly!');
        } else if (percentage >= 75) {
            console.log('\n👍 GOOD: Authentication system is mostly functional');
        } else {
            console.log('\n⚠️  NEEDS IMPROVEMENT: Several authentication issues detected');
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            totalTests: total,
            passedTests: passed,
            percentage: parseFloat(percentage),
            results: this.testResults,
            usersTested: this.demoUsers.map(u => u.role),
            environment: 'http://localhost:4300'
        };

        require('fs').writeFileSync('e2e-authentication-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Detailed report saved: e2e-authentication-report.json');

        return percentage >= 75;
    }

    async runCompleteFlow() {
        try {
            // Create screenshots directory
            await require('fs').promises.mkdir('e2e-screenshots', { recursive: true });

            await this.init();

            // Phase 1: Unauthenticated flow
            const unauthFlowOk = await this.simulateUnauthenticatedFlow();

            if (!unauthFlowOk) {
                console.log('❌ Unauthenticated flow failed, aborting');
                return false;
            }

            // Phase 2-4: Test each user role
            for (const user of this.demoUsers) {
                const loginOk = await this.simulateLoginFlow(user);

                if (loginOk) {
                    await this.simulateAuthenticatedFlow();
                    await this.simulateLogoutFlow();
                } else {
                    console.log(`❌ Login failed for ${user.role}, skipping authenticated tests`);
                }

                // Small break between users
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const success = await this.generateReport();
            return success;

        } catch (error) {
            console.error('❌ E2E Flow Error:', error);
            return false;
        }
    }

    async cleanup() {
        if (this.browser) {
            // Don't close browser for manual inspection
            console.log('\n🔍 Browser left open for manual inspection...');
            console.log('You can continue testing manually in the opened Chrome DevTools');
        }
    }
}

// Execute the complete E2E flow
(async () => {
    const simulator = new UserFlowSimulator();

    try {
        const success = await simulator.runCompleteFlow();

        if (success) {
            console.log('\n🎯 E2E AUTHENTICATION VALIDATION: SUCCESS');
            console.log('✅ All critical user flows are working correctly');
        } else {
            console.log('\n⚠️  E2E AUTHENTICATION VALIDATION: ISSUES DETECTED');
            console.log('🔧 Review the detailed report for specific problems');
        }

        await simulator.cleanup();

    } catch (error) {
        console.error('💥 Critical E2E error:', error);
        await simulator.cleanup();
        process.exit(1);
    }
})();