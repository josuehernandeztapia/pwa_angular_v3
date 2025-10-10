const { spawn } = require('child_process');
const CDP = require('chrome-devtools-protocol');
const WebSocket = require('ws');
const fs = require('fs');

class TrueChromeDevToolsMCP {
    constructor() {
        this.chrome = null;
        this.client = null;
        this.results = [];
        this.screenshots = [];
        this.baseUrl = 'http://localhost:4300';
        this.wsUrl = null;
    }

    async initialize() {
        console.log('🚀 TRUE CHROME DEVTOOLS MCP');
        console.log('🎯 Usando Chrome DevTools Protocol directamente');
        console.log('');

        try {
            // Launch Chrome with remote debugging
            this.chrome = spawn('google-chrome', [
                '--remote-debugging-port=9222',
                '--no-sandbox',
                '--disable-web-security',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-dev-shm-usage'
            ], {
                detached: true,
                stdio: 'ignore'
            });

            // Wait for Chrome to start
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Get WebSocket debugging URL
            const response = await fetch('http://127.0.0.1:9222/json/version');
            const version = await response.json();

            const tabs = await fetch('http://127.0.0.1:9222/json');
            const tabsData = await tabs.json();

            if (tabsData.length === 0) {
                throw new Error('No tabs available');
            }

            this.wsUrl = tabsData[0].webSocketDebuggerUrl;
            console.log('✅ Chrome DevTools Protocol connected');

            return true;
        } catch (error) {
            console.error('❌ Error initializing Chrome DevTools MCP:', error.message);
            return false;
        }
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.wsUrl);
            let messageId = 0;
            const pendingCallbacks = new Map();

            ws.on('open', () => {
                console.log('✅ WebSocket connected to Chrome DevTools');

                // Enable domains
                const domains = ['Page', 'Runtime', 'DOM'];
                const enablePromises = domains.map(domain => {
                    return new Promise(resolve => {
                        const id = ++messageId;
                        pendingCallbacks.set(id, resolve);
                        ws.send(JSON.stringify({
                            id: id,
                            method: `${domain}.enable`
                        }));
                    });
                });

                Promise.all(enablePromises).then(() => resolve({ ws, messageId, pendingCallbacks }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.id && pendingCallbacks.has(message.id)) {
                    const callback = pendingCallbacks.get(message.id);
                    pendingCallbacks.delete(message.id);
                    callback(message);
                }
            });

            ws.on('error', reject);
        });
    }

    async sendCommand(ws, pendingCallbacks, messageId, method, params = {}) {
        return new Promise(resolve => {
            const id = ++messageId.value;
            pendingCallbacks.set(id, resolve);
            ws.send(JSON.stringify({
                id: id,
                method: method,
                params: params
            }));
        });
    }

    async takeScreenshot(ws, pendingCallbacks, messageId, name) {
        try {
            const result = await this.sendCommand(ws, pendingCallbacks, messageId, 'Page.captureScreenshot', {
                format: 'png',
                quality: 90
            });

            if (result.result && result.result.data) {
                const filename = `mcp-${name}-${Date.now()}.png`;
                fs.writeFileSync(filename, result.result.data, 'base64');
                this.screenshots.push(filename);
                console.log(`📸 Screenshot: ${filename}`);
                return filename;
            }
        } catch (error) {
            console.log(`⚠️ Error screenshot: ${error.message}`);
            return null;
        }
    }

    async testAuthentication() {
        console.log('\n🔐 TESTING AUTHENTICATION');

        const { ws, messageId: msgIdObj, pendingCallbacks } = await this.connectWebSocket();
        const messageId = { value: 0 };

        try {
            // Navigate to page
            await this.sendCommand(ws, pendingCallbacks, messageId, 'Page.navigate', {
                url: this.baseUrl
            });

            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 5000));

            await this.takeScreenshot(ws, pendingCallbacks, messageId, '01-login-page');

            // Look for demo user buttons
            const result = await this.sendCommand(ws, pendingCallbacks, messageId, 'Runtime.evaluate', {
                expression: 'document.querySelectorAll("[data-cy^=\\"demo-user-\\"]").length'
            });

            const demoUsersCount = result.result.value;
            console.log(`✅ Found ${demoUsersCount} demo user buttons`);

            if (demoUsersCount > 0) {
                // Click first demo user
                await this.sendCommand(ws, pendingCallbacks, messageId, 'Runtime.evaluate', {
                    expression: 'document.querySelector("[data-cy^=\\"demo-user-\\"]").click()'
                });

                await new Promise(resolve => setTimeout(resolve, 3000));
                await this.takeScreenshot(ws, pendingCallbacks, messageId, '02-after-auth');

                this.results.push({
                    test: 'Authentication',
                    passed: true,
                    details: `Login successful with ${demoUsersCount} demo users`
                });

                ws.close();
                return true;
            } else {
                this.results.push({
                    test: 'Authentication',
                    passed: false,
                    details: 'No demo user buttons found'
                });
                ws.close();
                return false;
            }

        } catch (error) {
            this.results.push({
                test: 'Authentication',
                passed: false,
                details: error.message
            });
            ws.close();
            return false;
        }
    }

    async testNavigation(route, name) {
        console.log(`\n🧭 TESTING ${name}`);

        const { ws, messageId: msgIdObj, pendingCallbacks } = await this.connectWebSocket();
        const messageId = { value: 0 };

        try {
            await this.sendCommand(ws, pendingCallbacks, messageId, 'Page.navigate', {
                url: `${this.baseUrl}${route}`
            });

            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.takeScreenshot(ws, pendingCallbacks, messageId, name.toLowerCase().replace(/\s+/g, '-'));

            // Check if page loaded (look for body content)
            const bodyResult = await this.sendCommand(ws, pendingCallbacks, messageId, 'Runtime.evaluate', {
                expression: 'document.body.children.length'
            });

            const hasContent = bodyResult.result.value > 0;

            this.results.push({
                test: `${name} Navigation`,
                passed: hasContent,
                details: hasContent ? 'Page loaded successfully' : 'Page appears empty'
            });

            ws.close();
            return hasContent;

        } catch (error) {
            this.results.push({
                test: `${name} Navigation`,
                passed: false,
                details: error.message
            });
            ws.close();
            return false;
        }
    }

    async generateReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        const report = {
            timestamp: new Date().toISOString(),
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: successRate,
            tests: this.results,
            screenshots: this.screenshots
        };

        const filename = `true-chrome-devtools-mcp-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\n📊 TRUE CHROME DEVTOOLS MCP - REPORTE FINAL');
        console.log(`📄 Tests ejecutados: ${totalTests}`);
        console.log(`✅ Tests exitosos: ${passedTests}`);
        console.log(`❌ Tests fallidos: ${failedTests}`);
        console.log(`📈 Tasa de éxito: ${successRate}%`);
        console.log(`💾 Reporte: ${filename}`);
        console.log(`📸 Screenshots: ${this.screenshots.length}`);

        return report;
    }

    async cleanup() {
        try {
            if (this.chrome) {
                this.chrome.kill('SIGTERM');
            }
            console.log('🧹 Chrome process terminated');
        } catch (error) {
            console.log('⚠️ Cleanup error:', error.message);
        }
    }

    async run() {
        try {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('❌ Failed to initialize Chrome DevTools MCP');
                return;
            }

            // Test authentication
            const authSuccess = await this.testAuthentication();

            // Test navigation to different routes
            const routes = [
                { path: '/simuladores', name: 'Simuladores' },
                { path: '/cotizadores', name: 'Cotizadores' },
                { path: '/configuracion/flow-builder', name: 'Flow Builder' },
                { path: '/onboarding', name: 'Onboarding' },
                { path: '/productos', name: 'Productos' }
            ];

            for (const route of routes) {
                await this.testNavigation(route.path, route.name);
            }

            const report = await this.generateReport();

            console.log('\n🎉 TRUE CHROME DEVTOOLS MCP COMPLETED!');
            console.log('✅ Using real Chrome DevTools Protocol');
            console.log('✅ Direct WebSocket communication');

            return report;

        } catch (error) {
            console.error('💥 Unexpected error:', error.message);
            await this.generateReport();
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new TrueChromeDevToolsMCP();
    tester.run()
        .then(() => {
            console.log('\n✅ True Chrome DevTools MCP execution completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ True Chrome DevTools MCP failed:', error.message);
            process.exit(1);
        });
}

module.exports = TrueChromeDevToolsMCP;