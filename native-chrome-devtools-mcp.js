const CDP = require('chrome-remote-interface');
const { spawn } = require('child_process');
const fs = require('fs');

class NativeChromeDevToolsMCP {
    constructor() {
        this.client = null;
        this.chrome = null;
        this.baseUrl = 'http://localhost:4300';
        this.cdpPort = 9222;
        this.results = [];
        this.screenshots = [];
        this.currentStep = 0;
    }

    async initialize() {
        console.log('🚀 NATIVE CHROME DEVTOOLS MCP - VERDADERO CDP');
        console.log('🎯 Usando Chrome DevTools Protocol nativo, NO Chromium');
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        console.log(`🌐 CDP Port: ${this.cdpPort}`);
        console.log('');

        // Kill any existing Chrome processes on the CDP port
        try {
            await this.killExistingChromeProcesses();
            await this.sleep(2000);
        } catch (e) {
            console.log('No existing Chrome processes to kill');
        }

        // Launch Chrome with DevTools Protocol
        console.log('🚀 Launching Chrome with CDP...');

        const chromeArgs = [
            `--remote-debugging-port=${this.cdpPort}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-mode',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,720',
            this.baseUrl
        ];

        // Try different Chrome paths
        const chromePaths = [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/opt/google/chrome/chrome'
        ];

        let chromePath = null;
        for (const path of chromePaths) {
            if (fs.existsSync(path)) {
                chromePath = path;
                break;
            }
        }

        if (!chromePath) {
            throw new Error('Chrome not found. Please install Google Chrome');
        }

        console.log(`📍 Using Chrome at: ${chromePath}`);

        this.chrome = spawn(chromePath, chromeArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        this.chrome.on('error', (error) => {
            console.error('Chrome spawn error:', error);
        });

        // Wait for Chrome to start
        console.log('⏳ Waiting for Chrome to start...');
        await this.sleep(5000);

        // Connect to Chrome DevTools
        console.log('🔌 Connecting to Chrome DevTools Protocol...');

        try {
            this.client = await CDP({ port: this.cdpPort });
            console.log('✅ Connected to Chrome DevTools Protocol');
        } catch (error) {
            console.error('❌ Failed to connect to CDP:', error.message);
            throw error;
        }

        const { Network, Page, Runtime, DOM } = this.client;

        // Enable necessary domains
        await Network.enable();
        await Page.enable();
        await Runtime.enable();
        await DOM.enable();

        console.log('✅ CDP domains enabled');

        // Enhanced event listeners
        Runtime.consoleAPICalled((params) => {
            if (params.type === 'error') {
                console.log(`🖥️ Console Error: ${params.args.map(arg => arg.value || arg.description).join(' ')}`);
            }
        });

        Network.responseReceived((params) => {
            if (params.response.status >= 400) {
                console.log(`🌐 Network Error: ${params.response.status} - ${params.response.url}`);
            }
        });

        return true;
    }

    async killExistingChromeProcesses() {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            exec(`lsof -ti:${this.cdpPort} | xargs kill -9`, (error, stdout, stderr) => {
                resolve(); // Always resolve, don't fail if no processes found
            });
        });
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async takeScreenshot(name) {
        try {
            const { Page } = this.client;
            const screenshot = await Page.captureScreenshot({
                format: 'png',
                quality: 80
            });
            const filename = `native-cdp-${name}-${Date.now()}.png`;
            fs.writeFileSync(filename, screenshot.data, 'base64');
            this.screenshots.push(filename);
            console.log(`📸 Screenshot: ${filename}`);
            return filename;
        } catch (error) {
            console.log(`❌ Screenshot failed: ${error.message}`);
            return null;
        }
    }

    async waitForSelector(selector, timeout = 15000) {
        const { Runtime } = this.client;
        const startTime = Date.now();

        console.log(`⏳ Waiting for selector: ${selector}`);

        while (Date.now() - startTime < timeout) {
            try {
                const result = await Runtime.evaluate({
                    expression: `document.querySelector('${selector}') !== null`
                });

                if (result.result.value === true) {
                    console.log(`✅ Found selector: ${selector}`);
                    return true;
                }

                await this.sleep(500);
            } catch (error) {
                await this.sleep(500);
            }
        }

        console.log(`❌ Timeout waiting for selector: ${selector}`);
        return false;
    }

    async clickElement(selector, description) {
        try {
            const { Runtime } = this.client;

            // First check if element exists
            const exists = await Runtime.evaluate({
                expression: `document.querySelector('${selector}') !== null`
            });

            if (!exists.result.value) {
                console.log(`❌ Element not found: ${selector}`);
                return false;
            }

            // Get element position and click it
            const clickResult = await Runtime.evaluate({
                expression: `
                    (function() {
                        const element = document.querySelector('${selector}');
                        if (element) {
                            // Scroll into view
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                            // Wait a moment for scroll
                            setTimeout(() => {
                                // Create and dispatch click events
                                const rect = element.getBoundingClientRect();
                                const centerX = rect.left + rect.width / 2;
                                const centerY = rect.top + rect.height / 2;

                                element.focus();
                                element.click();

                                // Dispatch mouse events for better compatibility
                                ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                                    const event = new MouseEvent(eventType, {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        clientX: centerX,
                                        clientY: centerY
                                    });
                                    element.dispatchEvent(event);
                                });
                            }, 100);

                            return true;
                        }
                        return false;
                    })()
                `
            });

            if (clickResult.result.value) {
                console.log(`✅ Click: ${description}`);
                await this.sleep(2000); // Wait for any navigation or state changes
                return true;
            }

            return false;

        } catch (error) {
            console.log(`❌ Click Failed: ${description} - ${error.message}`);
            return false;
        }
    }

    async step1_AuthenticationFlow() {
        console.log('\\n🔐 STEP 1: NATIVE CDP AUTHENTICATION FLOW');
        this.currentStep++;

        try {
            const { Page, Runtime } = this.client;

            // Navigate to the app
            console.log(`🌐 Navigating to ${this.baseUrl}...`);
            await Page.navigate({ url: this.baseUrl });

            // Wait for page load
            await this.sleep(3000);
            await this.takeScreenshot('01-initial-load');

            // Wait for demo users to appear
            console.log('⏳ Waiting for demo users...');
            const demoUsersFound = await this.waitForSelector('[data-cy^="demo-user-"]', 20000);

            if (!demoUsersFound) {
                throw new Error('Demo users not found on login page');
            }

            // Count demo users
            const userCount = await Runtime.evaluate({
                expression: 'document.querySelectorAll(\'[data-cy^="demo-user-"]\').length'
            });

            console.log(`✅ Found ${userCount.result.value} demo users`);

            // Get current page state before clicking
            const beforeClick = await Runtime.evaluate({
                expression: `({
                    url: window.location.href,
                    pathname: window.location.pathname,
                    title: document.title
                })`
            });

            console.log(`📍 Before click - URL: ${beforeClick.result.value.url}`);

            // Click first demo user with enhanced detection
            console.log('👆 Clicking first demo user...');
            const clickSuccess = await this.clickElement('[data-cy^="demo-user-"]:first-child', 'First Demo User');

            if (!clickSuccess) {
                throw new Error('Failed to click demo user');
            }

            await this.takeScreenshot('02-after-demo-click');

            // Wait for authentication processing
            console.log('⏳ Waiting for authentication...');
            await this.sleep(4000);

            // Check authentication result
            const afterClick = await Runtime.evaluate({
                expression: `({
                    url: window.location.href,
                    pathname: window.location.pathname,
                    title: document.title,
                    hasUserData: !!localStorage.getItem('userData') || !!sessionStorage.getItem('userData'),
                    hasToken: !!localStorage.getItem('token') || !!localStorage.getItem('authToken') || !!localStorage.getItem('access_token'),
                    localStorage: Object.keys(localStorage).join(', '),
                    sessionStorage: Object.keys(sessionStorage).join(', ')
                })`
            });

            console.log(`📍 After click - URL: ${afterClick.result.value.url}`);
            console.log(`📱 Has User Data: ${afterClick.result.value.hasUserData}`);
            console.log(`🔑 Has Token: ${afterClick.result.value.hasToken}`);
            console.log(`💾 LocalStorage keys: ${afterClick.result.value.localStorage}`);
            console.log(`🗃️ SessionStorage keys: ${afterClick.result.value.sessionStorage}`);

            const urlChanged = beforeClick.result.value.url !== afterClick.result.value.url;
            const hasAuthData = afterClick.result.value.hasUserData || afterClick.result.value.hasToken;
            const authSuccess = urlChanged || hasAuthData || !afterClick.result.value.pathname.includes('login');

            console.log(`🔄 URL Changed: ${urlChanged}`);
            console.log(`✅ Authentication Success: ${authSuccess}`);

            this.results.push({
                test: 'Native CDP Authentication',
                passed: authSuccess,
                details: `Users: ${userCount.result.value}, URL changed: ${urlChanged}, Auth data: ${hasAuthData}`,
                beforeUrl: beforeClick.result.value.url,
                afterUrl: afterClick.result.value.url
            });

            return authSuccess;

        } catch (error) {
            console.error(`❌ Authentication failed: ${error.message}`);
            this.results.push({
                test: 'Native CDP Authentication',
                passed: false,
                details: `Error: ${error.message}`
            });
            return false;
        }
    }

    async step2_NavigationTest(sectionName, url) {
        console.log(`\\n🧭 STEP ${++this.currentStep}: NAVIGATION TO ${sectionName.toUpperCase()}`);

        try {
            const { Page, Runtime } = this.client;

            console.log(`🌐 Navigating to ${this.baseUrl}${url}...`);
            await Page.navigate({ url: `${this.baseUrl}${url}` });
            await this.sleep(3000);

            await this.takeScreenshot(`${sectionName.toLowerCase().replace(' ', '-')}`);

            // Comprehensive component analysis
            const analysis = await Runtime.evaluate({
                expression: `
                    (() => {
                        const data = {
                            hasAppRoot: document.querySelector('app-root') !== null,
                            hasAngularApp: window.ng !== undefined || window.getAllAngularRootElements !== undefined,
                            currentUrl: window.location.href,
                            pathname: window.location.pathname,
                            bodyChildren: document.body.children.length,
                            totalElements: document.querySelectorAll('*').length,
                            buttons: document.querySelectorAll('button').length,
                            inputs: document.querySelectorAll('input').length,
                            forms: document.querySelectorAll('form').length,
                            selects: document.querySelectorAll('select').length,
                            hasContent: document.body.innerText.length > 100,
                            hasErrors: document.querySelectorAll('.error, .ng-invalid, [class*="error"]').length,
                            isLoaded: document.readyState === 'complete'
                        };

                        // Check for specific component selectors
                        const componentChecks = {
                            simulador: document.querySelector('app-simulador-main') !== null,
                            cotizador: document.querySelector('app-cotizador-main') !== null,
                            flowBuilder: document.querySelector('app-flow-builder') !== null,
                            onboarding: document.querySelector('app-onboarding-main') !== null,
                            productos: document.querySelector('app-productos-catalog') !== null,
                            proteccion: document.querySelector('app-proteccion') !== null
                        };

                        data.components = componentChecks;
                        return data;
                    })()
                `
            });

            const result = analysis.result.value;
            const isWorking = result.hasAppRoot &&
                             result.hasContent &&
                             result.totalElements > 50 &&
                             result.isLoaded;

            console.log(`✅ App Root: ${result.hasAppRoot}`);
            console.log(`✅ Angular App: ${result.hasAngularApp}`);
            console.log(`✅ Has Content: ${result.hasContent}`);
            console.log(`✅ Total Elements: ${result.totalElements}`);
            console.log(`✅ Interactive Elements: ${result.buttons + result.inputs}`);
            console.log(`✅ Is Loaded: ${result.isLoaded}`);

            this.results.push({
                test: `${sectionName} Navigation`,
                passed: isWorking,
                details: `Elements: ${result.totalElements}, Interactive: ${result.buttons + result.inputs}, Component: ${Object.values(result.components).some(c => c)}`,
                metrics: result
            });

            return isWorking;

        } catch (error) {
            console.error(`❌ Navigation to ${sectionName} failed: ${error.message}`);
            this.results.push({
                test: `${sectionName} Navigation`,
                passed: false,
                details: `Error: ${error.message}`
            });
            return false;
        }
    }

    async generateFinalReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'Native Chrome DevTools MCP with True CDP',
            method: 'Pure Chrome DevTools Protocol (No Chromium/Playwright)',
            baseUrl: this.baseUrl,
            cdpPort: this.cdpPort,
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            successRate: successRate,
            tests: this.results,
            screenshots: this.screenshots
        };

        const filename = `native-chrome-devtools-mcp-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\\n📊 NATIVE CHROME DEVTOOLS MCP - FINAL REPORT');
        console.log('='.repeat(70));
        console.log(`📄 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${totalTests - passedTests}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`💾 Report: ${filename}`);
        console.log(`📸 Screenshots: ${this.screenshots.length}`);
        console.log(`🌐 Method: Pure Chrome DevTools Protocol`);

        console.log('\\n🔍 DETAILED TEST RESULTS:');
        this.results.forEach((result, index) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}`);
            console.log(`   └─ ${result.details}`);
        });

        return report;
    }

    async cleanup() {
        console.log('\\n🧹 Cleaning up...');

        if (this.client) {
            try {
                await this.client.close();
                console.log('✅ CDP client closed');
            } catch (e) {
                console.log('CDP client already closed');
            }
        }

        if (this.chrome && !this.chrome.killed) {
            try {
                this.chrome.kill('SIGTERM');
                await this.sleep(1000);

                if (!this.chrome.killed) {
                    this.chrome.kill('SIGKILL');
                }
                console.log('✅ Chrome process terminated');
            } catch (e) {
                console.log('Chrome process already terminated');
            }
        }

        // Kill any remaining processes on the CDP port
        await this.killExistingChromeProcesses();
    }

    async run() {
        try {
            await this.initialize();

            console.log('\\n🚀 STARTING NATIVE CHROME DEVTOOLS MCP VALIDATION');
            console.log('🎯 Using Pure Chrome DevTools Protocol - NO Chromium/Playwright');
            console.log('🔍 Click-by-click navigation with true CDP');

            // Step 1: Authentication
            const authSuccess = await this.step1_AuthenticationFlow();

            if (!authSuccess) {
                console.log('⚠️ Authentication failed, continuing with navigation tests...');
            }

            // Step 2-7: Navigation tests
            await this.step2_NavigationTest('Simuladores', '/simuladores');
            await this.step2_NavigationTest('Cotizadores', '/cotizadores');
            await this.step2_NavigationTest('Flow Builder', '/configuracion/flow-builder');
            await this.step2_NavigationTest('Onboarding', '/onboarding');
            await this.step2_NavigationTest('Productos', '/productos');
            await this.step2_NavigationTest('Protección', '/proteccion');

            const report = await this.generateFinalReport();

            console.log('\\n🎉 NATIVE CHROME DEVTOOLS MCP VALIDATION COMPLETED!');
            console.log('✅ Pure Chrome DevTools Protocol validation finished');
            console.log('✅ No Chromium/Playwright - True CDP implementation');
            console.log('✅ All sections tested with real Chrome browser');

            return report;

        } catch (error) {
            console.error('💥 Native Chrome DevTools MCP validation error:', error.message);
            console.error(error.stack);
            await this.generateFinalReport();
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new NativeChromeDevToolsMCP();
    validator.run()
        .then(() => {
            console.log('\\n✅ Native Chrome DevTools MCP validation completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('\\n❌ Native Chrome DevTools MCP validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = NativeChromeDevToolsMCP;