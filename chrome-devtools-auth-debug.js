const { chromium } = require('playwright');
const fs = require('fs');

class ChromeDevToolsAuthDebug {
    constructor() {
        this.browser = null;
        this.baseUrl = 'http://localhost:4300';
        this.results = [];
        this.screenshots = [];
    }

    async initialize() {
        console.log('🔍 CHROME DEVTOOLS AUTH DEBUG');
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        console.log('');

        this.browser = await chromium.launch({
            headless: false,
            devtools: false,
            slowMo: 500,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=TranslateUI'
            ],
            timeout: 60000
        });

        const context = await this.browser.newContext();
        this.page = await context.newPage();

        // Enable console logging
        this.page.on('console', msg => {
            console.log(`🖥️ Console: ${msg.text()}`);
        });

        // Enable network request logging
        this.page.on('request', request => {
            console.log(`🌐 Request: ${request.method()} ${request.url()}`);
        });

        this.page.on('response', response => {
            if (response.status() >= 400) {
                console.log(`❌ Response Error: ${response.status()} ${response.url()}`);
            } else {
                console.log(`✅ Response OK: ${response.status()} ${response.url()}`);
            }
        });

        return true;
    }

    async takeScreenshot(name) {
        const filename = `auth-debug-${name}-${Date.now()}.png`;
        await this.page.screenshot({ path: filename, fullPage: true });
        this.screenshots.push(filename);
        console.log(`📸 Screenshot: ${filename}`);
        return filename;
    }

    async debugInitialLoad() {
        console.log('\\n🚀 STEP 1: INITIAL PAGE LOAD');

        try {
            console.log(`Navigating to: ${this.baseUrl}`);
            await this.page.goto(this.baseUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.takeScreenshot('01-initial-load');

            // Check what's actually on the page
            const pageContent = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    hasAppRoot: !!document.querySelector('app-root'),
                    bodyText: document.body.innerText.substring(0, 500),
                    demoUsers: Array.from(document.querySelectorAll('[data-cy^="demo-user-"]')).map(el => ({
                        text: el.innerText,
                        dataCy: el.getAttribute('data-cy'),
                        visible: el.offsetWidth > 0 && el.offsetHeight > 0
                    })),
                    allButtons: Array.from(document.querySelectorAll('button')).map(btn => ({
                        text: btn.innerText,
                        classes: btn.className,
                        visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
                    }))
                };
            });

            console.log('📊 Initial Page Analysis:');
            console.log(`  Title: ${pageContent.title}`);
            console.log(`  URL: ${pageContent.url}`);
            console.log(`  Has app-root: ${pageContent.hasAppRoot}`);
            console.log(`  Demo users found: ${pageContent.demoUsers.length}`);

            pageContent.demoUsers.forEach((user, i) => {
                console.log(`    ${i + 1}. "${user.text}" (${user.dataCy}) - Visible: ${user.visible}`);
            });

            console.log(`  Total buttons: ${pageContent.allButtons.length}`);

            this.results.push({
                test: 'Initial Load',
                passed: pageContent.hasAppRoot && pageContent.demoUsers.length > 0,
                details: `Found ${pageContent.demoUsers.length} demo users, app-root: ${pageContent.hasAppRoot}`,
                data: pageContent
            });

            return pageContent;

        } catch (error) {
            console.log(`❌ Initial load error: ${error.message}`);
            await this.takeScreenshot('01-error');
            return null;
        }
    }

    async debugDemoUserClick() {
        console.log('\\n🖱️ STEP 2: DEMO USER CLICK');

        try {
            // Wait for demo user buttons to be visible
            await this.page.waitForSelector('[data-cy^="demo-user-"]', { timeout: 10000 });

            // Get the first visible demo user
            const demoUser = await this.page.evaluate(() => {
                const users = Array.from(document.querySelectorAll('[data-cy^="demo-user-"]'));
                return users.find(user => user.offsetWidth > 0 && user.offsetHeight > 0);
            });

            if (!demoUser) {
                console.log('❌ No visible demo user found');
                return false;
            }

            console.log('✅ Found visible demo user, clicking...');

            // Click the demo user button
            await this.page.click('[data-cy^="demo-user-"]');

            await this.takeScreenshot('02-after-click');

            // Wait and check what happens
            await this.page.waitForTimeout(3000);

            const postClickContent = await this.page.evaluate(() => {
                return {
                    url: window.location.href,
                    pathname: window.location.pathname,
                    hasError: document.body.innerText.includes('404') ||
                             document.body.innerText.includes('Cannot GET') ||
                             document.body.innerText.includes('Not Found'),
                    bodyText: document.body.innerText.substring(0, 500),
                    localStorage: Object.keys(localStorage).reduce((acc, key) => {
                        acc[key] = localStorage.getItem(key);
                        return acc;
                    }, {}),
                    hasSimuladorMain: !!document.querySelector('app-simulador-main'),
                    hasNavigation: !!document.querySelector('nav, .nav, [class*="nav"]'),
                    currentComponent: document.querySelector('app-root').innerHTML.substring(0, 200)
                };
            });

            console.log('📊 Post-Click Analysis:');
            console.log(`  URL: ${postClickContent.url}`);
            console.log(`  Pathname: ${postClickContent.pathname}`);
            console.log(`  Has 404 Error: ${postClickContent.hasError}`);
            console.log(`  Has Simulador Main: ${postClickContent.hasSimuladorMain}`);
            console.log(`  Has Navigation: ${postClickContent.hasNavigation}`);
            console.log(`  LocalStorage keys: ${Object.keys(postClickContent.localStorage).join(', ')}`);

            if (postClickContent.hasError) {
                console.log('❌ 404 Error detected after login!');
                console.log('Body text:', postClickContent.bodyText);
            }

            await this.takeScreenshot('03-post-analysis');

            this.results.push({
                test: 'Demo User Click',
                passed: !postClickContent.hasError && postClickContent.pathname !== '/',
                details: `URL: ${postClickContent.pathname}, Error: ${postClickContent.hasError}`,
                data: postClickContent
            });

            return !postClickContent.hasError;

        } catch (error) {
            console.log(`❌ Demo user click error: ${error.message}`);
            await this.takeScreenshot('02-click-error');
            return false;
        }
    }

    async debugRoutingIssue() {
        console.log('\\n🔍 STEP 3: ROUTING DEBUG');

        try {
            // Try to navigate directly to simuladores
            console.log('Trying direct navigation to /simuladores...');
            await this.page.goto(`${this.baseUrl}/simuladores`, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.takeScreenshot('04-direct-simuladores');

            const routingContent = await this.page.evaluate(() => {
                return {
                    url: window.location.href,
                    pathname: window.location.pathname,
                    hasError: document.body.innerText.includes('404') ||
                             document.body.innerText.includes('Cannot GET') ||
                             document.body.innerText.includes('Not Found'),
                    hasSimuladorMain: !!document.querySelector('app-simulador-main'),
                    hasAppRoot: !!document.querySelector('app-root'),
                    bodyText: document.body.innerText.substring(0, 300)
                };
            });

            console.log('📊 Direct Routing Analysis:');
            console.log(`  URL: ${routingContent.url}`);
            console.log(`  Has Error: ${routingContent.hasError}`);
            console.log(`  Has Simulador Main: ${routingContent.hasSimuladorMain}`);
            console.log(`  Has App Root: ${routingContent.hasAppRoot}`);

            if (routingContent.hasError) {
                console.log('❌ Direct routing to /simuladores also shows 404');
                console.log('Body text:', routingContent.bodyText);
            }

            this.results.push({
                test: 'Direct Routing',
                passed: !routingContent.hasError,
                details: `Direct /simuladores - Error: ${routingContent.hasError}`,
                data: routingContent
            });

            return !routingContent.hasError;

        } catch (error) {
            console.log(`❌ Direct routing error: ${error.message}`);
            await this.takeScreenshot('04-routing-error');
            return false;
        }
    }

    async generateReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'Chrome DevTools Auth Debug',
            baseUrl: this.baseUrl,
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            successRate: successRate,
            tests: this.results,
            screenshots: this.screenshots
        };

        const filename = `chrome-devtools-auth-debug-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\\n📊 AUTH DEBUG REPORT');
        console.log('=' * 40);
        console.log(`📄 Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${totalTests - passedTests}`);
        console.log(`📈 Success: ${successRate}%`);
        console.log(`💾 Report: ${filename}`);
        console.log(`📸 Screenshots: ${this.screenshots.length}`);

        console.log('\\n🔍 DETAILED FINDINGS:');
        this.results.forEach((result, index) => {
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

            console.log('🚀 STARTING AUTH DEBUG WITH CHROME DEVTOOLS MCP');

            // Step 1: Debug initial load
            const initialContent = await this.debugInitialLoad();

            if (initialContent && initialContent.demoUsers.length > 0) {
                // Step 2: Debug demo user click
                const clickSuccess = await this.debugDemoUserClick();

                // Step 3: Debug routing issue
                await this.debugRoutingIssue();
            } else {
                console.log('❌ Cannot proceed - no demo users found');
            }

            const report = await this.generateReport();

            console.log('\\n🎯 AUTH DEBUG COMPLETED');
            console.log('Check the screenshots for visual evidence of the issue');

            return report;

        } catch (error) {
            console.error('💥 Auth debug error:', error.message);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the debug
if (require.main === module) {
    const authDebugger = new ChromeDevToolsAuthDebug();
    authDebugger.run()
        .then(() => {
            console.log('\\n✅ Auth debug completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\\n❌ Auth debug failed:', error.message);
            process.exit(1);
        });
}

module.exports = ChromeDevToolsAuthDebug;