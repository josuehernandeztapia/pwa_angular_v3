const http = require('http');
const fs = require('fs');

class HTTPValidationMCP {
    constructor() {
        this.results = [];
        this.baseUrl = 'http://localhost:4300';
    }

    async makeHttpRequest(path = '') {
        const fullUrl = this.baseUrl + path;

        return new Promise((resolve, reject) => {
            const req = http.request(fullUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        url: fullUrl
                    });
                });
            });

            req.on('error', (error) => {
                reject({
                    error: error.message,
                    url: fullUrl
                });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject({
                    error: 'Request timeout',
                    url: fullUrl
                });
            });

            req.end();
        });
    }

    async testRoute(path, name) {
        console.log(`\n🔍 TESTING: ${name} (${path})`);

        try {
            const response = await this.makeHttpRequest(path);

            // Check response details
            const isSuccess = response.statusCode === 200;
            const hasAngularContent = response.body.includes('app-root') ||
                                    response.body.includes('ng-version') ||
                                    response.body.includes('angular');
            const hasContent = response.body.length > 1000; // Reasonable content size

            console.log(`  📊 Status Code: ${response.statusCode}`);
            console.log(`  🎯 Content-Type: ${response.headers['content-type']}`);
            console.log(`  📝 Content Length: ${response.body.length} chars`);
            console.log(`  ⚡ Angular App: ${hasAngularContent ? 'YES' : 'NO'}`);
            console.log(`  ${isSuccess ? '✅' : '❌'} ${isSuccess ? 'SUCCESS' : 'FAILED'}`);

            this.results.push({
                test: name,
                path: path,
                passed: isSuccess,
                statusCode: response.statusCode,
                contentLength: response.body.length,
                hasAngularContent: hasAngularContent,
                details: `HTTP ${response.statusCode}, Angular: ${hasAngularContent}, Size: ${response.body.length}`
            });

            return isSuccess;

        } catch (error) {
            console.log(`  ❌ ERROR: ${error.error || error.message}`);

            this.results.push({
                test: name,
                path: path,
                passed: false,
                statusCode: 'ERROR',
                details: error.error || error.message
            });

            return false;
        }
    }

    async run() {
        console.log('🚀 HTTP VALIDATION MCP');
        console.log('🎯 Validating all routes via HTTP requests');
        console.log('🔗 Base URL:', this.baseUrl);
        console.log('');

        // Test routes
        const routes = [
            { path: '', name: 'Home/Login' },
            { path: '/simuladores', name: 'Simuladores' },
            { path: '/cotizadores', name: 'Cotizadores' },
            { path: '/configuracion/flow-builder', name: 'Flow Builder' },
            { path: '/onboarding', name: 'Onboarding' },
            { path: '/productos', name: 'Productos' },
            { path: '/proteccion', name: 'Protección' },
            { path: '/dashboard', name: 'Dashboard' }
        ];

        let totalSuccess = 0;

        for (const route of routes) {
            const success = await this.testRoute(route.path, route.name);
            if (success) totalSuccess++;
        }

        // Generate report
        const totalTests = this.results.length;
        const successRate = Math.round((totalSuccess / totalTests) * 100);

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'HTTP Validation MCP',
            baseUrl: this.baseUrl,
            total: totalTests,
            passed: totalSuccess,
            failed: totalTests - totalSuccess,
            successRate: successRate,
            tests: this.results
        };

        const filename = `http-validation-mcp-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\n📊 HTTP VALIDATION MCP - FINAL REPORT');
        console.log('=' * 50);
        console.log(`📄 Total tests: ${totalTests}`);
        console.log(`✅ Successful: ${totalSuccess}`);
        console.log(`❌ Failed: ${totalTests - totalSuccess}`);
        console.log(`📈 Success rate: ${successRate}%`);
        console.log(`💾 Report saved: ${filename}`);

        if (successRate === 100) {
            console.log('\n🎉 ALL ROUTES WORKING - NO 404 ERRORS!');
            console.log('✅ Application is fully operational');
        } else if (successRate >= 80) {
            console.log('\n✅ MOSTLY WORKING - Minor issues detected');
        } else {
            console.log('\n⚠️ SOME ISSUES DETECTED - Check individual route results');
        }

        console.log('\n🔗 Verified URLs:');
        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`  ${status} ${this.baseUrl}${result.path} - ${result.statusCode}`);
        });

        return report;
    }
}

// Run directly
if (require.main === module) {
    const validator = new HTTPValidationMCP();
    validator.run()
        .then(() => {
            console.log('\n✅ HTTP Validation completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ HTTP Validation failed:', error);
            process.exit(1);
        });
}

module.exports = HTTPValidationMCP;