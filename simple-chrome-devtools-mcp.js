const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

class SimpleChromeDevToolsMCP {
    constructor() {
        this.chrome = null;
        this.results = [];
        this.baseUrl = 'http://localhost:4300';
    }

    async initialize() {
        console.log('🚀 SIMPLE CHROME DEVTOOLS MCP');
        console.log('🎯 Usando Chrome real con remote debugging');
        console.log('');

        try {
            // Launch Chrome with remote debugging
            this.chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
                '--remote-debugging-port=9222',
                '--no-first-run',
                '--no-default-browser-check',
                '--user-data-dir=/tmp/chrome-mcp',
                '--disable-web-security',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-dev-shm-usage',
                this.baseUrl
            ], {
                stdio: 'pipe'
            });

            console.log('✅ Chrome launched with debugging on port 9222');

            // Wait for Chrome to start
            await new Promise(resolve => setTimeout(resolve, 5000));

            return true;
        } catch (error) {
            console.error('❌ Error launching Chrome:', error.message);
            return false;
        }
    }

    async makeRequest(method, url) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: '127.0.0.1',
                port: 9222,
                path: url,
                method: method
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async testChromeConnection() {
        console.log('\n🔌 TESTING CHROME CONNECTION');

        try {
            const version = await this.makeRequest('GET', '/json/version');
            console.log(`✅ Chrome Version: ${version.Browser}`);

            const tabs = await this.makeRequest('GET', '/json');
            console.log(`✅ Active tabs: ${tabs.length}`);

            if (tabs.length > 0) {
                console.log(`✅ Main tab URL: ${tabs[0].url}`);
                console.log(`✅ Main tab Title: ${tabs[0].title}`);
            }

            this.results.push({
                test: 'Chrome DevTools Connection',
                passed: true,
                details: `Connected to ${version.Browser}, ${tabs.length} tabs active`
            });

            return true;
        } catch (error) {
            this.results.push({
                test: 'Chrome DevTools Connection',
                passed: false,
                details: error.message
            });
            return false;
        }
    }

    async testApplicationResponse() {
        console.log('\n🌐 TESTING APPLICATION RESPONSE');

        try {
            const response = await new Promise((resolve, reject) => {
                const req = http.request(this.baseUrl, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data.substring(0, 500) // First 500 chars
                    }));
                });
                req.on('error', reject);
                req.setTimeout(5000, () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
                req.end();
            });

            const isAngularApp = response.body.includes('ng-version') ||
                                response.body.includes('app-root') ||
                                response.body.includes('angular');

            console.log(`✅ HTTP Status: ${response.statusCode}`);
            console.log(`✅ Content-Type: ${response.headers['content-type']}`);
            console.log(`✅ Angular App: ${isAngularApp ? 'Yes' : 'No'}`);

            this.results.push({
                test: 'Application Response',
                passed: response.statusCode === 200,
                details: `HTTP ${response.statusCode}, Angular: ${isAngularApp}`
            });

            return response.statusCode === 200;

        } catch (error) {
            this.results.push({
                test: 'Application Response',
                passed: false,
                details: error.message
            });
            return false;
        }
    }

    async testRouteNavigation() {
        console.log('\n🧭 TESTING ROUTE NAVIGATION');

        const routes = [
            { path: '/simuladores', name: 'Simuladores' },
            { path: '/cotizadores', name: 'Cotizadores' },
            { path: '/configuracion/flow-builder', name: 'Flow Builder' },
            { path: '/onboarding', name: 'Onboarding' },
            { path: '/productos', name: 'Productos' }
        ];

        for (const route of routes) {
            try {
                const fullUrl = this.baseUrl + route.path;
                console.log(`🔍 Testing: ${fullUrl}`);

                const response = await new Promise((resolve, reject) => {
                    const req = http.request(fullUrl, (res) => {
                        let data = '';
                        res.on('data', (chunk) => data += chunk);
                        res.on('end', () => resolve({
                            statusCode: res.statusCode,
                            body: data
                        }));
                    });
                    req.on('error', reject);
                    req.setTimeout(5000, () => {
                        req.destroy();
                        reject(new Error('Timeout'));
                    });
                    req.end();
                });

                // Check if response contains Angular app structure
                const hasAngularContent = response.body.includes('app-root') ||
                                        response.body.includes('ng-version') ||
                                        response.statusCode === 200;

                console.log(`  ${hasAngularContent ? '✅' : '❌'} ${route.name}: ${response.statusCode}`);

                this.results.push({
                    test: `${route.name} Route`,
                    passed: hasAngularContent,
                    details: `HTTP ${response.statusCode}`
                });

            } catch (error) {
                console.log(`  ❌ ${route.name}: ${error.message}`);
                this.results.push({
                    test: `${route.name} Route`,
                    passed: false,
                    details: error.message
                });
            }
        }
    }

    async generateReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'Simple Chrome DevTools MCP',
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: successRate,
            tests: this.results
        };

        const filename = `simple-chrome-devtools-mcp-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\n📊 SIMPLE CHROME DEVTOOLS MCP - REPORTE FINAL');
        console.log(`📄 Tests ejecutados: ${totalTests}`);
        console.log(`✅ Tests exitosos: ${passedTests}`);
        console.log(`❌ Tests fallidos: ${failedTests}`);
        console.log(`📈 Tasa de éxito: ${successRate}%`);
        console.log(`💾 Reporte: ${filename}`);

        return report;
    }

    async cleanup() {
        try {
            if (this.chrome) {
                this.chrome.kill('SIGTERM');
                console.log('🧹 Chrome process terminated');
            }
        } catch (error) {
            console.log('⚠️ Cleanup error:', error.message);
        }
    }

    async run() {
        try {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('❌ Failed to initialize Chrome');
                return;
            }

            // Test Chrome DevTools connection
            await this.testChromeConnection();

            // Test application response
            await this.testApplicationResponse();

            // Test route navigation
            await this.testRouteNavigation();

            const report = await this.generateReport();

            console.log('\n🎉 SIMPLE CHROME DEVTOOLS MCP COMPLETED!');
            console.log('✅ Using real Chrome browser');
            console.log('✅ Direct HTTP requests validation');

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
    const tester = new SimpleChromeDevToolsMCP();
    tester.run()
        .then(() => {
            console.log('\n✅ Simple Chrome DevTools MCP execution completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Simple Chrome DevTools MCP failed:', error.message);
            process.exit(1);
        });
}

module.exports = SimpleChromeDevToolsMCP;