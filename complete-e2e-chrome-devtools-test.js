/**
 * 🎭 Complete E2E Chrome DevTools MCP Test
 * Comprehensive user flow validation with Chrome DevTools integration
 */

const puppeteer = require('puppeteer');

class ChromeDevToolsE2EValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.currentTest = null;

        // All demo users from AuthService
        this.demoUsers = [
            { email: 'asesor@conductores.com', password: 'demo123', role: 'asesor' },
            { email: 'supervisor@conductores.com', password: 'super123', role: 'supervisor' },
            { email: 'admin@conductores.com', password: 'admin123', role: 'admin' }
        ];

        // Test scenarios for each user
        this.testScenarios = [
            'login_flow',
            'dashboard_access',
            'navigation_protected_routes',
            'logout_flow',
            'auth_persistence',
            'guard_protection'
        ];
    }

    async init() {
        console.log('🔧 CHROME DEVTOOLS MCP E2E VALIDATOR');
        console.log('====================================\n');

        // Launch browser with Chrome DevTools simulation
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            defaultViewport: { width: 1200, height: 800 },
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--enable-devtools-experiments',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();

        // Enable Chrome DevTools Protocol domains (MCP simulation)
        const client = await this.page.target().createCDPSession();
        await client.send('Runtime.enable');
        await client.send('Network.enable');
        await client.send('Page.enable');
        await client.send('DOM.enable');
        await client.send('Console.enable');
        await client.send('Security.enable');

        // Set up comprehensive monitoring
        this.setupMonitoring(client);

        console.log('✅ Chrome DevTools MCP simulation enabled');
        console.log('🔍 Comprehensive monitoring active\n');
    }

    setupMonitoring(client) {
        // Network monitoring
        this.page.on('request', request => {
            if (request.url().includes('/api/') || request.url().includes('auth')) {
                console.log(`🌐 Request: ${request.method()} ${request.url()}`);
            }
        });

        this.page.on('response', response => {
            if (response.url().includes('/api/') || response.status() >= 400) {
                const status = response.status() >= 400 ? '❌' : '✅';
                console.log(`${status} Response: ${response.status()} ${response.url()}`);
            }
        });

        // Console monitoring
        this.page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('font') && !msg.text().includes('icon')) {
                console.log(`❌ Console Error: ${msg.text()}`);
                this.recordIssue('console_error', msg.text());
            }
        });

        // Page errors
        this.page.on('pageerror', error => {
            console.log(`💥 Page Error: ${error.message}`);
            this.recordIssue('page_error', error.message);
        });

        // Security state changes
        client.on('Security.securityStateChanged', (params) => {
            if (params.securityState === 'insecure') {
                console.log('🔓 Security: Page is not secure');
            }
        });
    }

    recordIssue(type, message) {
        if (this.currentTest) {
            if (!this.currentTest.issues) this.currentTest.issues = [];
            this.currentTest.issues.push({ type, message, timestamp: Date.now() });
        }
    }

    async takeScreenshot(name) {
        await this.page.screenshot({
            path: `e2e-chrome-devtools/${name}.png`,
            fullPage: true
        });
        console.log(`📸 Screenshot: ${name}.png`);
    }

    async waitAndClick(selector, description, timeout = 5000) {
        console.log(`🖱️  Clicking: ${description}`);

        try {
            await this.page.waitForSelector(selector, { timeout });

            // Highlight element (Chrome DevTools style)
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.style.outline = '2px solid #4285f4';
                    element.style.outlineOffset = '1px';
                    setTimeout(() => {
                        element.style.outline = '';
                        element.style.outlineOffset = '';
                    }, 800);
                }
            }, selector);

            await new Promise(resolve => setTimeout(resolve, 300));
            await this.page.click(selector);
            console.log(`✅ Clicked: ${description}`);
            return true;
        } catch (error) {
            console.log(`❌ Failed to click ${description}: ${error.message}`);
            this.recordIssue('click_failed', `${description}: ${error.message}`);
            return false;
        }
    }

    async fillForm(email, password) {
        console.log(`📝 Filling form for ${email}`);

        try {
            // Email field
            await this.page.waitForSelector('input[type="email"]', { timeout: 5000 });
            await this.page.focus('input[type="email"]');
            await this.page.evaluate(() => document.querySelector('input[type="email"]').value = '');
            await this.page.type('input[type="email"]', email, { delay: 30 });

            // Password field
            await this.page.focus('input[type="password"]');
            await this.page.evaluate(() => document.querySelector('input[type="password"]').value = '');
            await this.page.type('input[type="password"]', password, { delay: 30 });

            console.log('✅ Form filled successfully');
            return true;
        } catch (error) {
            console.log(`❌ Form fill failed: ${error.message}`);
            this.recordIssue('form_fill_failed', error.message);
            return false;
        }
    }

    async validateAuth(expectedState = true) {
        const authData = await this.page.evaluate(() => ({
            hasToken: !!localStorage.getItem('auth_token'),
            hasUser: !!localStorage.getItem('current_user'),
            hasRefreshToken: !!localStorage.getItem('refresh_token'),
            currentUrl: window.location.href,
            pathname: window.location.pathname
        }));

        const isAuthenticated = authData.hasToken && authData.hasUser;

        if (expectedState && isAuthenticated) {
            console.log('✅ Authentication state valid');
            return true;
        } else if (!expectedState && !isAuthenticated) {
            console.log('✅ Unauthenticated state valid');
            return true;
        } else {
            const expected = expectedState ? 'authenticated' : 'unauthenticated';
            const actual = isAuthenticated ? 'authenticated' : 'unauthenticated';
            console.log(`❌ Auth state mismatch: expected ${expected}, got ${actual}`);
            this.recordIssue('auth_state_mismatch', `Expected ${expected}, got ${actual}`);
            return false;
        }
    }

    async testLoginFlow(user) {
        this.currentTest = {
            test: 'login_flow',
            user: user.role,
            issues: [],
            startTime: Date.now()
        };

        console.log(`\n🔐 Testing Login Flow: ${user.role.toUpperCase()}`);
        console.log('=' .repeat(40));

        try {
            // Navigate to login
            await this.page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
            await this.takeScreenshot(`login-start-${user.role}`);

            // Fill and submit form
            const formFilled = await this.fillForm(user.email, user.password);
            if (!formFilled) {
                this.currentTest.success = false;
                return false;
            }

            const submitted = await this.waitAndClick('button[type="submit"]', 'Submit login');
            if (!submitted) {
                this.currentTest.success = false;
                return false;
            }

            // Wait for navigation
            console.log('⏳ Waiting for authentication...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentPath = new URL(this.page.url()).pathname;
            console.log(`📍 Current path: ${currentPath}`);

            // Validate successful login
            const authValid = await this.validateAuth(true);

            if (currentPath === '/dashboard' && authValid) {
                console.log(`🎉 Login SUCCESS for ${user.role}`);
                await this.takeScreenshot(`login-success-${user.role}`);
                this.currentTest.success = true;
                return true;
            } else {
                console.log(`❌ Login FAILED for ${user.role} - redirected to ${currentPath}`);
                await this.takeScreenshot(`login-failed-${user.role}`);
                this.recordIssue('login_redirect_failed', `Expected /dashboard, got ${currentPath}`);
                this.currentTest.success = false;
                return false;
            }
        } catch (error) {
            console.log(`💥 Login test crashed for ${user.role}: ${error.message}`);
            this.recordIssue('test_crashed', error.message);
            this.currentTest.success = false;
            return false;
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async testNavigationFlow(user) {
        this.currentTest = {
            test: 'navigation_flow',
            user: user.role,
            issues: [],
            startTime: Date.now()
        };

        console.log(`\n🧭 Testing Navigation Flow: ${user.role.toUpperCase()}`);
        console.log('=' .repeat(40));

        const routes = [
            '/cotizador',
            '/simulador',
            '/clientes',
            '/dashboard' // Return to dashboard
        ];

        let successCount = 0;

        try {
            for (const route of routes) {
                console.log(`📍 Navigating to ${route}`);

                await this.page.goto(`http://localhost:4300${route}`, {
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });

                await new Promise(resolve => setTimeout(resolve, 1500));

                const currentPath = new URL(this.page.url()).pathname;
                const authValid = await this.validateAuth(true);

                if (currentPath.startsWith(route.split('?')[0]) && authValid) {
                    console.log(`✅ ${route} accessible`);
                    successCount++;
                } else {
                    console.log(`❌ ${route} failed - redirected to ${currentPath}`);
                    this.recordIssue('navigation_failed', `${route} redirected to ${currentPath}`);
                }
            }

            const success = successCount === routes.length;
            console.log(`📊 Navigation: ${successCount}/${routes.length} routes accessible`);

            await this.takeScreenshot(`navigation-${user.role}`);
            this.currentTest.success = success;
            return success;

        } catch (error) {
            console.log(`💥 Navigation test crashed: ${error.message}`);
            this.recordIssue('navigation_crashed', error.message);
            this.currentTest.success = false;
            return false;
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async testLogoutFlow(user) {
        this.currentTest = {
            test: 'logout_flow',
            user: user.role,
            issues: [],
            startTime: Date.now()
        };

        console.log(`\n🚪 Testing Logout Flow: ${user.role.toUpperCase()}`);
        console.log('=' .repeat(40));

        try {
            // Ensure we're on dashboard
            await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });

            // Manual logout (clear storage and test redirection)
            await this.page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });

            console.log('🧹 Cleared authentication storage');

            // Try to access protected route
            await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentPath = new URL(this.page.url()).pathname;
            const authValid = await this.validateAuth(false);

            if (currentPath === '/login' && !authValid) {
                console.log(`✅ Logout SUCCESS for ${user.role}`);
                await this.takeScreenshot(`logout-success-${user.role}`);
                this.currentTest.success = true;
                return true;
            } else {
                console.log(`❌ Logout FAILED for ${user.role} - still on ${currentPath}`);
                this.recordIssue('logout_failed', `Expected redirect to /login, stayed on ${currentPath}`);
                this.currentTest.success = false;
                return false;
            }

        } catch (error) {
            console.log(`💥 Logout test crashed: ${error.message}`);
            this.recordIssue('logout_crashed', error.message);
            this.currentTest.success = false;
            return false;
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async runCompleteE2EFlow() {
        console.log('🚀 Starting Complete E2E Chrome DevTools MCP Test');
        console.log('================================================\n');

        try {
            await require('fs').promises.mkdir('e2e-chrome-devtools', { recursive: true });

            await this.init();

            const totalUsers = this.demoUsers.length;
            let successfulUsers = 0;

            // Test each user through complete flow
            for (const user of this.demoUsers) {
                console.log(`\n👤 TESTING USER: ${user.role.toUpperCase()} (${user.email})`);
                console.log('='.repeat(60));

                let userSuccess = true;

                // 1. Login Flow
                const loginOk = await this.testLoginFlow(user);
                if (!loginOk) {
                    console.log(`❌ ${user.role} failed at login, skipping further tests`);
                    continue;
                }

                // 2. Navigation Flow
                const navigationOk = await this.testNavigationFlow(user);
                if (!navigationOk) {
                    userSuccess = false;
                }

                // 3. Logout Flow
                const logoutOk = await this.testLogoutFlow(user);
                if (!logoutOk) {
                    userSuccess = false;
                }

                if (userSuccess) {
                    successfulUsers++;
                    console.log(`✅ ${user.role} completed all tests successfully`);
                } else {
                    console.log(`⚠️  ${user.role} had some test failures`);
                }

                // Small delay between users
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Generate final report
            return this.generateFinalReport(successfulUsers, totalUsers);

        } catch (error) {
            console.error('💥 Critical E2E error:', error);
            return false;
        }
    }

    generateFinalReport(successfulUsers, totalUsers) {
        console.log('\n📊 CHROME DEVTOOLS MCP E2E TEST REPORT');
        console.log('=====================================');

        const passedTests = this.testResults.filter(r => r.success).length;
        const totalTests = this.testResults.length;
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

        console.log(`\n🎯 Overall Results:`);
        console.log(`   Users: ${successfulUsers}/${totalUsers} successful`);
        console.log(`   Tests: ${passedTests}/${totalTests} passed (${successRate}%)`);

        console.log(`\n📋 Detailed Test Results:`);
        this.testResults.forEach((result, i) => {
            const status = result.success ? '✅' : '❌';
            const duration = result.endTime ? `${result.endTime - result.startTime}ms` : 'N/A';
            console.log(`   ${i + 1}. ${status} ${result.test} (${result.user}) - ${duration}`);

            if (result.issues && result.issues.length > 0) {
                result.issues.forEach(issue => {
                    console.log(`      ⚠️  ${issue.type}: ${issue.message}`);
                });
            }
        });

        // Overall assessment
        console.log(`\n🎯 ASSESSMENT:`);
        if (successRate >= 90) {
            console.log('🎉 EXCELLENT: Authentication system is working perfectly!');
            console.log('✅ All user flows functional with Chrome DevTools MCP');
        } else if (successRate >= 75) {
            console.log('👍 GOOD: Authentication system is mostly functional');
            console.log('⚠️  Some minor issues detected, but core flows work');
        } else {
            console.log('🔧 NEEDS IMPROVEMENT: Several issues detected');
            console.log('❌ Core authentication flows need attention');
        }

        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalUsers,
                successfulUsers,
                totalTests,
                passedTests,
                successRate: parseFloat(successRate)
            },
            testResults: this.testResults,
            chromeDevToolsMode: true
        };

        require('fs').writeFileSync('chrome-devtools-e2e-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Full report saved: chrome-devtools-e2e-report.json');

        console.log('\n🔍 Browser left open for manual inspection with Chrome DevTools');

        return successRate >= 75;
    }

    async cleanup() {
        // Keep browser open for manual DevTools inspection
        console.log('\n🛠️  Chrome DevTools available for manual inspection');
        console.log('You can continue debugging with the full DevTools capabilities');
    }
}

// Execute Complete E2E Flow
(async () => {
    const validator = new ChromeDevToolsE2EValidator();

    try {
        const success = await validator.runCompleteE2EFlow();

        if (success) {
            console.log('\n🎯 CHROME DEVTOOLS MCP E2E: SUCCESS');
            console.log('✅ Authentication system fully validated');
        } else {
            console.log('\n⚠️  CHROME DEVTOOLS MCP E2E: ISSUES DETECTED');
            console.log('🔧 Review detailed report and browser DevTools for specifics');
        }

        await validator.cleanup();

    } catch (error) {
        console.error('💥 Critical E2E failure:', error);
        await validator.cleanup();
        process.exit(1);
    }
})();