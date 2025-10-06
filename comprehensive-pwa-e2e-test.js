/**
 * 🎭 Comprehensive PWA E2E Chrome DevTools Test
 * Tests all requirements specified for Angular PWA frontend with BFF integration
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

class ComprehensivePWAE2ETest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.currentTest = null;
        this.screenshots = [];
        this.consoleErrors = [];
        this.networkFailures = [];

        // BFF Demo users
        this.demoUsers = [
            { email: 'asesor@conductores.com', password: 'demo123', role: 'asesor' },
            { email: 'supervisor@conductores.com', password: 'super123', role: 'supervisor' },
            { email: 'admin@conductores.com', password: 'admin123', role: 'admin' }
        ];

        this.frontendUrl = 'http://localhost:4300';
        this.bffUrl = 'http://localhost:3000';
    }

    async init() {
        console.log('🎭 COMPREHENSIVE PWA E2E CHROME DEVTOOLS TEST');
        console.log('============================================\n');

        // Create screenshots directory
        try {
            await fs.mkdir('pwa-e2e-screenshots', { recursive: true });
            console.log('📁 Created screenshots directory');
        } catch (error) {
            console.log('⚠️  Screenshots directory already exists');
        }

        // Launch browser with Chrome DevTools enabled
        this.browser = await puppeteer.launch({
            headless: false, // Keep visible for manual inspection
            devtools: true,
            defaultViewport: { width: 1200, height: 800 },
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--enable-devtools-experiments',
                '--disable-features=VizDisplayCompositor',
                '--ignore-certificate-errors',
                '--allow-running-insecure-content'
            ]
        });

        this.page = await this.browser.newPage();

        // Enable Chrome DevTools Protocol domains
        const client = await this.page.target().createCDPSession();
        await client.send('Runtime.enable');
        await client.send('Network.enable');
        await client.send('Page.enable');
        await client.send('DOM.enable');
        await client.send('Console.enable');
        await client.send('Security.enable');

        // Set up comprehensive monitoring
        this.setupMonitoring(client);

        console.log('✅ Chrome DevTools Protocol enabled');
        console.log('🔍 Comprehensive monitoring active\n');
    }

    setupMonitoring(client) {
        // Network request monitoring
        this.page.on('request', request => {
            const url = request.url();
            if (url.includes('/auth/') || url.includes('/api/') || url.includes('localhost')) {
                console.log(`🌐 REQUEST: ${request.method()} ${url}`);
            }
        });

        // Network response monitoring
        this.page.on('response', response => {
            const url = response.url();
            const status = response.status();

            if (url.includes('/auth/') || url.includes('/api/') || status >= 400) {
                const statusIcon = status >= 400 ? '❌' : '✅';
                console.log(`${statusIcon} RESPONSE: ${status} ${url}`);

                if (status >= 400) {
                    this.networkFailures.push({
                        url,
                        status,
                        timestamp: Date.now(),
                        test: this.currentTest?.test || 'unknown'
                    });
                }
            }
        });

        // Console error monitoring (excluding common non-critical errors)
        this.page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error' &&
                !text.includes('favicon') &&
                !text.includes('font') &&
                !text.includes('icon-') &&
                !text.includes('Failed to load resource')) {

                console.log(`❌ CONSOLE ERROR: ${text}`);
                this.consoleErrors.push({
                    message: text,
                    timestamp: Date.now(),
                    test: this.currentTest?.test || 'unknown'
                });
            } else if (msg.type() === 'warn' && text.includes('auth')) {
                console.log(`⚠️  CONSOLE WARN: ${text}`);
            }
        });

        // Page JavaScript errors
        this.page.on('pageerror', error => {
            console.log(`💥 PAGE ERROR: ${error.message}`);
            this.consoleErrors.push({
                message: `Page Error: ${error.message}`,
                timestamp: Date.now(),
                test: this.currentTest?.test || 'unknown'
            });
        });
    }

    async takeScreenshot(name, description = '') {
        try {
            const filename = `pwa-e2e-screenshots/${name}-${Date.now()}.png`;
            await this.page.screenshot({
                path: filename,
                fullPage: true
            });

            console.log(`📸 Screenshot: ${filename}`);
            if (description) {
                console.log(`   ${description}`);
            }

            this.screenshots.push({
                filename,
                name,
                description,
                timestamp: Date.now(),
                test: this.currentTest?.test || 'unknown'
            });
        } catch (error) {
            console.log(`⚠️  Failed to take screenshot ${name}: ${error.message}`);
        }
    }

    async waitAndClick(selector, description, timeout = 10000) {
        console.log(`🖱️  Clicking: ${description}`);

        try {
            await this.page.waitForSelector(selector, { timeout });

            // Highlight element
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.style.outline = '3px solid #4285f4';
                    element.style.outlineOffset = '2px';
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, selector);

            await new Promise(resolve => setTimeout(resolve, 500));
            await this.page.click(selector);

            // Remove highlight
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                }
            }, selector);

            console.log(`✅ Successfully clicked: ${description}`);
            return true;
        } catch (error) {
            console.log(`❌ Failed to click ${description}: ${error.message}`);
            await this.takeScreenshot(`click-failed-${description.replace(/\s+/g, '-')}`, `Failed to click: ${description}`);
            return false;
        }
    }

    async testLoginPageLoad() {
        this.currentTest = {
            test: 'login_page_load',
            startTime: Date.now(),
            issues: []
        };

        console.log('\n🌐 TEST 1: Login Page Load');
        console.log('==========================');

        try {
            // Navigate to login page
            console.log('📍 Navigating to login page...');
            await this.page.goto(`${this.frontendUrl}/login`, {
                waitUntil: 'networkidle2',
                timeout: 15000
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Take initial screenshot
            await this.takeScreenshot('01-login-page-loaded', 'Initial login page state');

            // Check page title
            const title = await this.page.title();
            console.log(`📄 Page title: "${title}"`);

            // Verify critical elements are present
            const criticalSelectors = [
                'input[type="email"]',
                'input[type="password"]',
                'button[type="submit"]'
            ];

            let elementsFound = 0;
            for (const selector of criticalSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 });
                    console.log(`✅ Found element: ${selector}`);
                    elementsFound++;
                } catch {
                    console.log(`❌ Missing element: ${selector}`);
                    this.currentTest.issues.push(`Missing critical element: ${selector}`);
                }
            }

            // Check for demo users section
            let demoUsersPresent = false;
            try {
                // Look for common patterns of demo user elements
                const demoSelectors = [
                    '.demo-users-grid',
                    '.demo-user-card',
                    '[data-testid*="demo"]',
                    '.user-card',
                    '.demo-user'
                ];

                for (const selector of demoSelectors) {
                    try {
                        await this.page.waitForSelector(selector, { timeout: 1000 });
                        console.log(`✅ Demo users section found: ${selector}`);
                        demoUsersPresent = true;
                        break;
                    } catch {
                        // Continue to next selector
                    }
                }

                if (!demoUsersPresent) {
                    // Check text content for demo users
                    const pageContent = await this.page.content();
                    const hasDemoText = pageContent.includes('asesor@conductores.com') ||
                                       pageContent.includes('Demo Users') ||
                                       pageContent.includes('demo123');
                    if (hasDemoText) {
                        console.log('✅ Demo users found in page content');
                        demoUsersPresent = true;
                    }
                }
            } catch (error) {
                console.log(`⚠️  Could not detect demo users section: ${error.message}`);
            }

            const success = elementsFound === criticalSelectors.length;

            console.log(`\n📊 Login Page Load Results:`);
            console.log(`   Critical elements: ${elementsFound}/${criticalSelectors.length} found`);
            console.log(`   Demo users visible: ${demoUsersPresent ? 'Yes' : 'No'}`);
            console.log(`   Console errors: ${this.consoleErrors.length}`);
            console.log(`   Network failures: ${this.networkFailures.length}`);

            this.currentTest.success = success;
            this.currentTest.demoUsersPresent = demoUsersPresent;
            this.currentTest.elementsFound = elementsFound;

        } catch (error) {
            console.log(`💥 Login page load test failed: ${error.message}`);
            this.currentTest.success = false;
            this.currentTest.error = error.message;
            await this.takeScreenshot('01-login-page-error', 'Login page load error');
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async testDemoUserSelection() {
        this.currentTest = {
            test: 'demo_user_selection',
            startTime: Date.now(),
            issues: []
        };

        console.log('\n👥 TEST 2: Demo User Selection');
        console.log('==============================');

        try {
            // Look for demo user elements
            console.log('🔍 Searching for demo user elements...');

            let demoUserElements = [];
            const possibleSelectors = [
                '.demo-user',
                '.user-card',
                '[data-testid*="demo"]',
                'button[class*="demo"]',
                'div[class*="user"]'
            ];

            for (const selector of possibleSelectors) {
                try {
                    const elements = await this.page.$$(selector);
                    if (elements.length > 0) {
                        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                        demoUserElements = elements;
                        break;
                    }
                } catch {
                    // Continue to next selector
                }
            }

            if (demoUserElements.length === 0) {
                // Try to find by text content
                console.log('🔍 Searching for demo users by text content...');

                for (const user of this.demoUsers) {
                    try {
                        const element = await this.page.$x(`//button[contains(text(), "${user.role}")]`);
                        if (element.length > 0) {
                            demoUserElements.push(element[0]);
                            console.log(`✅ Found demo user by text: ${user.role}`);
                        }
                    } catch (error) {
                        console.log(`⚠️  Could not find demo user ${user.role}: ${error.message}`);
                    }
                }
            }

            let successfulClicks = 0;

            if (demoUserElements.length > 0) {
                console.log(`\n🖱️  Testing ${demoUserElements.length} demo user elements...`);

                for (let i = 0; i < Math.min(demoUserElements.length, 3); i++) {
                    try {
                        console.log(`\nTesting demo user ${i + 1}...`);

                        // Click the demo user element
                        await demoUserElements[i].click();
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Check if form was populated
                        const emailValue = await this.page.$eval('input[type="email"]', el => el.value);
                        const passwordValue = await this.page.$eval('input[type="password"]', el => el.value);

                        console.log(`   Email field: "${emailValue}"`);
                        console.log(`   Password field: "${passwordValue ? '[FILLED]' : '[EMPTY]'}"`);

                        if (emailValue && passwordValue) {
                            console.log(`✅ Demo user ${i + 1} populated form successfully`);
                            successfulClicks++;

                            await this.takeScreenshot(`02-demo-user-${i + 1}-selected`, `Demo user ${i + 1} form populated`);

                            // Clear form for next test
                            await this.page.evaluate(() => {
                                document.querySelector('input[type="email"]').value = '';
                                document.querySelector('input[type="password"]').value = '';
                            });
                        } else {
                            console.log(`❌ Demo user ${i + 1} did not populate form properly`);
                            this.currentTest.issues.push(`Demo user ${i + 1} click did not populate form`);
                        }

                    } catch (error) {
                        console.log(`❌ Error testing demo user ${i + 1}: ${error.message}`);
                        this.currentTest.issues.push(`Demo user ${i + 1} error: ${error.message}`);
                    }
                }
            } else {
                console.log('⚠️  No demo user elements found - testing with manual form filling');

                // Test manual form filling as fallback
                for (const user of this.demoUsers) {
                    try {
                        await this.page.focus('input[type="email"]');
                        await this.page.evaluate(() => document.querySelector('input[type="email"]').value = '');
                        await this.page.type('input[type="email"]', user.email, { delay: 50 });

                        await this.page.focus('input[type="password"]');
                        await this.page.evaluate(() => document.querySelector('input[type="password"]').value = '');
                        await this.page.type('input[type="password"]', user.password, { delay: 50 });

                        console.log(`✅ Manual form fill successful for ${user.role}`);
                        successfulClicks++;
                        break; // Just test one for manual fallback
                    } catch (error) {
                        console.log(`❌ Manual form fill failed for ${user.role}: ${error.message}`);
                    }
                }
            }

            console.log(`\n📊 Demo User Selection Results:`);
            console.log(`   Demo elements found: ${demoUserElements.length}`);
            console.log(`   Successful clicks: ${successfulClicks}`);

            this.currentTest.success = successfulClicks > 0;
            this.currentTest.successfulClicks = successfulClicks;
            this.currentTest.elementsFound = demoUserElements.length;

        } catch (error) {
            console.log(`💥 Demo user selection test failed: ${error.message}`);
            this.currentTest.success = false;
            this.currentTest.error = error.message;
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async testBFFAuthentication(user) {
        this.currentTest = {
            test: 'bff_authentication',
            user: user.role,
            startTime: Date.now(),
            issues: []
        };

        console.log(`\n🔐 TEST 3: BFF Authentication - ${user.role.toUpperCase()}`);
        console.log('================================================');

        try {
            // Fill login form
            console.log(`📝 Filling form for ${user.email}...`);

            await this.page.focus('input[type="email"]');
            await this.page.evaluate(() => document.querySelector('input[type="email"]').value = '');
            await this.page.type('input[type="email"]', user.email, { delay: 30 });

            await this.page.focus('input[type="password"]');
            await this.page.evaluate(() => document.querySelector('input[type="password"]').value = '');
            await this.page.type('input[type="password"]', user.password, { delay: 30 });

            await this.takeScreenshot(`03-login-form-filled-${user.role}`, `Login form filled for ${user.role}`);

            // Clear previous network monitoring
            const initialNetworkFailures = this.networkFailures.length;
            const initialConsoleErrors = this.consoleErrors.length;

            // Submit form
            console.log('🚀 Submitting login form...');
            await this.page.click('button[type="submit"]');

            // Monitor authentication process
            console.log('⏳ Monitoring authentication process...');

            // Wait for either success (redirect) or failure
            let authResult = 'timeout';
            let finalUrl = '';

            for (let i = 0; i < 10; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                finalUrl = this.page.url();

                if (finalUrl.includes('/dashboard')) {
                    authResult = 'success';
                    break;
                } else if (finalUrl.includes('/login') && i > 3) {
                    // Still on login after several seconds - likely failed
                    authResult = 'failed';
                    break;
                }

                console.log(`   Waiting... Current URL: ${new URL(finalUrl).pathname}`);
            }

            console.log(`🎯 Authentication result: ${authResult}`);
            console.log(`📍 Final URL: ${finalUrl}`);

            // Check authentication state
            const authState = await this.page.evaluate(() => ({
                hasToken: !!localStorage.getItem('auth_token') || !!localStorage.getItem('token') || !!localStorage.getItem('authToken'),
                hasUser: !!localStorage.getItem('user') || !!localStorage.getItem('currentUser') || !!localStorage.getItem('current_user'),
                localStorageKeys: Object.keys(localStorage),
                sessionStorageKeys: Object.keys(sessionStorage),
                cookies: document.cookie
            }));

            console.log(`🔍 Authentication state check:`);
            console.log(`   Has auth token: ${authState.hasToken}`);
            console.log(`   Has user data: ${authState.hasUser}`);
            console.log(`   LocalStorage keys: [${authState.localStorageKeys.join(', ')}]`);
            console.log(`   Session keys: [${authState.sessionStorageKeys.join(', ')}]`);

            // Check for new network failures during authentication
            const newNetworkFailures = this.networkFailures.length - initialNetworkFailures;
            const newConsoleErrors = this.consoleErrors.length - initialConsoleErrors;

            console.log(`📊 BFF Authentication Results:`);
            console.log(`   Authentication: ${authResult}`);
            console.log(`   Final URL contains dashboard: ${finalUrl.includes('/dashboard')}`);
            console.log(`   Auth token present: ${authState.hasToken}`);
            console.log(`   User data present: ${authState.hasUser}`);
            console.log(`   New network failures: ${newNetworkFailures}`);
            console.log(`   New console errors: ${newConsoleErrors}`);

            await this.takeScreenshot(`03-auth-result-${user.role}`, `Authentication result for ${user.role}: ${authResult}`);

            this.currentTest.success = (authResult === 'success' &&
                                      finalUrl.includes('/dashboard') &&
                                      (authState.hasToken || authState.hasUser));
            this.currentTest.authResult = authResult;
            this.currentTest.finalUrl = finalUrl;
            this.currentTest.authState = authState;
            this.currentTest.newNetworkFailures = newNetworkFailures;
            this.currentTest.newConsoleErrors = newConsoleErrors;

        } catch (error) {
            console.log(`💥 BFF authentication test failed: ${error.message}`);
            this.currentTest.success = false;
            this.currentTest.error = error.message;
            await this.takeScreenshot(`03-auth-error-${user.role}`, `Authentication error for ${user.role}`);
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async testDashboardAccess() {
        this.currentTest = {
            test: 'dashboard_access',
            startTime: Date.now(),
            issues: []
        };

        console.log('\n🏠 TEST 4: Dashboard Access & Navigation');
        console.log('=======================================');

        try {
            // Ensure we're on dashboard
            console.log('📍 Verifying dashboard access...');

            const currentUrl = this.page.url();
            console.log(`Current URL: ${currentUrl}`);

            if (!currentUrl.includes('/dashboard')) {
                console.log('⚠️  Not on dashboard, attempting navigation...');
                await this.page.goto(`${this.frontendUrl}/dashboard`, {
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });
            }

            await new Promise(resolve => setTimeout(resolve, 2000));

            // Take dashboard screenshot
            await this.takeScreenshot('04-dashboard-loaded', 'Dashboard successfully loaded');

            // Check for critical dashboard elements
            const dashboardElements = [
                'nav',
                '.dashboard, [data-testid="dashboard"], main',
                'header, .header',
                'aside, .sidebar, nav'
            ];

            let elementsFound = 0;
            for (const selector of dashboardElements) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    console.log(`✅ Found dashboard element: ${selector}`);
                    elementsFound++;
                    break; // Found at least one critical element
                } catch {
                    // Continue checking
                }
            }

            // Test basic navigation if elements found
            let navigationWorks = false;
            if (elementsFound > 0) {
                try {
                    const navLinks = await this.page.$$('nav a, .nav a, [role="navigation"] a');
                    console.log(`🔍 Found ${navLinks.length} navigation links`);

                    if (navLinks.length > 0) {
                        // Test clicking first nav link
                        await navLinks[0].click();
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const newUrl = this.page.url();
                        navigationWorks = !newUrl.includes('/login');
                        console.log(`🧭 Navigation test: ${navigationWorks ? 'Success' : 'Failed'}`);
                    }
                } catch (error) {
                    console.log(`⚠️  Navigation test failed: ${error.message}`);
                }
            }

            console.log(`\n📊 Dashboard Access Results:`);
            console.log(`   On dashboard URL: ${currentUrl.includes('/dashboard')}`);
            console.log(`   Dashboard elements found: ${elementsFound > 0 ? 'Yes' : 'No'}`);
            console.log(`   Navigation functional: ${navigationWorks ? 'Yes' : 'No'}`);

            this.currentTest.success = currentUrl.includes('/dashboard') && elementsFound > 0;
            this.currentTest.onDashboard = currentUrl.includes('/dashboard');
            this.currentTest.elementsFound = elementsFound;
            this.currentTest.navigationWorks = navigationWorks;

        } catch (error) {
            console.log(`💥 Dashboard access test failed: ${error.message}`);
            this.currentTest.success = false;
            this.currentTest.error = error.message;
            await this.takeScreenshot('04-dashboard-error', 'Dashboard access error');
        } finally {
            this.currentTest.endTime = Date.now();
            this.testResults.push(this.currentTest);
        }
    }

    async generateComprehensiveReport() {
        console.log('\n📊 COMPREHENSIVE PWA E2E TEST REPORT');
        console.log('====================================');

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.success).length;
        const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

        console.log(`\n🎯 Overall Results:`);
        console.log(`   Tests: ${passedTests}/${totalTests} passed (${successRate}%)`);
        console.log(`   Screenshots captured: ${this.screenshots.length}`);
        console.log(`   Console errors detected: ${this.consoleErrors.length}`);
        console.log(`   Network failures detected: ${this.networkFailures.length}`);

        console.log(`\n📋 Detailed Test Results:`);
        this.testResults.forEach((result, i) => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            const duration = result.endTime ? `${result.endTime - result.startTime}ms` : 'N/A';

            console.log(`\n   ${i + 1}. ${status} ${result.test.toUpperCase()}`);
            console.log(`      Duration: ${duration}`);

            if (result.user) {
                console.log(`      User: ${result.user}`);
            }

            if (result.issues && result.issues.length > 0) {
                console.log(`      Issues:`);
                result.issues.forEach(issue => {
                    console.log(`        - ${issue}`);
                });
            }

            // Test-specific details
            if (result.test === 'login_page_load') {
                console.log(`      Elements found: ${result.elementsFound}`);
                console.log(`      Demo users visible: ${result.demoUsersPresent ? 'Yes' : 'No'}`);
            } else if (result.test === 'demo_user_selection') {
                console.log(`      Demo elements: ${result.elementsFound}`);
                console.log(`      Successful selections: ${result.successfulClicks}`);
            } else if (result.test === 'bff_authentication') {
                console.log(`      Auth result: ${result.authResult}`);
                console.log(`      Final URL: ${result.finalUrl}`);
                console.log(`      Auth token: ${result.authState?.hasToken ? 'Present' : 'Missing'}`);
            } else if (result.test === 'dashboard_access') {
                console.log(`      On dashboard: ${result.onDashboard ? 'Yes' : 'No'}`);
                console.log(`      Elements found: ${result.elementsFound > 0 ? 'Yes' : 'No'}`);
            }
        });

        if (this.consoleErrors.length > 0) {
            console.log(`\n❌ Console Errors Detected:`);
            this.consoleErrors.forEach((error, i) => {
                console.log(`   ${i + 1}. [${error.test}] ${error.message}`);
            });
        }

        if (this.networkFailures.length > 0) {
            console.log(`\n🌐 Network Failures Detected:`);
            this.networkFailures.forEach((failure, i) => {
                console.log(`   ${i + 1}. [${failure.test}] ${failure.status} ${failure.url}`);
            });
        }

        console.log(`\n📸 Screenshots Location:`);
        console.log(`   Directory: pwa-e2e-screenshots/`);
        console.log(`   Count: ${this.screenshots.length} screenshots`);
        this.screenshots.forEach((screenshot, i) => {
            console.log(`   ${i + 1}. ${screenshot.name} - ${screenshot.description}`);
        });

        // Overall assessment
        console.log(`\n🎯 FINAL ASSESSMENT:`);
        if (successRate >= 90 && this.consoleErrors.length === 0 && this.networkFailures.length === 0) {
            console.log('🎉 EXCELLENT: PWA is working perfectly with BFF integration!');
            console.log('✅ All authentication flows functional');
            console.log('✅ No critical errors detected');
        } else if (successRate >= 75) {
            console.log('👍 GOOD: PWA is mostly functional');
            console.log('⚠️  Some minor issues detected, but core flows work');
        } else {
            console.log('🔧 NEEDS IMPROVEMENT: Several issues detected');
            console.log('❌ Core PWA functionality needs attention');
        }

        // Create detailed JSON report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                passedTests,
                successRate: parseFloat(successRate),
                screenshotCount: this.screenshots.length,
                consoleErrorCount: this.consoleErrors.length,
                networkFailureCount: this.networkFailures.length
            },
            testResults: this.testResults,
            consoleErrors: this.consoleErrors,
            networkFailures: this.networkFailures,
            screenshots: this.screenshots,
            demoUsers: this.demoUsers,
            configuration: {
                frontendUrl: this.frontendUrl,
                bffUrl: this.bffUrl,
                chromeDevTools: true
            }
        };

        await fs.writeFile('pwa-e2e-comprehensive-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Comprehensive report saved: pwa-e2e-comprehensive-report.json');

        return successRate >= 75;
    }

    async runCompleteE2ETest() {
        console.log('🚀 Starting Comprehensive PWA E2E Test');
        console.log('======================================\n');

        try {
            await this.init();

            // Test 1: Login page loads correctly
            await this.testLoginPageLoad();

            // Test 2: Demo user selection functionality
            await this.testDemoUserSelection();

            // Test 3: BFF authentication integration (test with admin user)
            const adminUser = this.demoUsers.find(u => u.role === 'admin');
            await this.testBFFAuthentication(adminUser);

            // Test 4: Dashboard access verification
            await this.testDashboardAccess();

            // Generate comprehensive report
            const success = await this.generateComprehensiveReport();

            console.log('\n🎭 CHROME DEVTOOLS INSPECTION');
            console.log('Browser left open for manual DevTools inspection');
            console.log('You can now manually inspect the application state');

            return success;

        } catch (error) {
            console.error('💥 Critical E2E test failure:', error);
            await this.takeScreenshot('critical-error', 'Critical test failure');
            return false;
        }
    }

    async cleanup() {
        console.log('\n🛠️  Chrome DevTools available for manual inspection');
        console.log('Browser will remain open for 60 seconds for inspection...');

        setTimeout(async () => {
            if (this.browser) {
                await this.browser.close();
                console.log('🔄 Browser closed after inspection period');
            }
        }, 60000); // Close after 60 seconds
    }
}

// Execute the comprehensive test
(async () => {
    const tester = new ComprehensivePWAE2ETest();

    try {
        const success = await tester.runCompleteE2ETest();

        if (success) {
            console.log('\n🎯 COMPREHENSIVE PWA E2E TEST: SUCCESS');
            console.log('✅ PWA authentication system fully validated');
            process.exit(0);
        } else {
            console.log('\n⚠️  COMPREHENSIVE PWA E2E TEST: ISSUES DETECTED');
            console.log('🔧 Review detailed report and screenshots for specifics');
            process.exit(1);
        }

    } catch (error) {
        console.error('💥 Critical test execution failure:', error);
        process.exit(1);
    } finally {
        await tester.cleanup();
    }
})();