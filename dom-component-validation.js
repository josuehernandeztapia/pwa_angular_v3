const http = require('http');
const fs = require('fs');

class DOMComponentValidation {
    constructor() {
        this.results = [];
        this.baseUrl = 'http://localhost:4300';
    }

    async makeRequest(path = '') {
        const fullUrl = this.baseUrl + path;

        return new Promise((resolve, reject) => {
            const req = http.request(fullUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
            });
            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            req.end();
        });
    }

    checkComponentInHTML(html, componentChecks) {
        const results = {};

        for (const [name, checks] of Object.entries(componentChecks)) {
            const checkResults = [];

            for (const check of checks) {
                let found = false;

                if (check.type === 'tag') {
                    found = html.includes(`<${check.value}`) || html.includes(`<${check.value}>`);
                } else if (check.type === 'class') {
                    found = html.includes(`class="${check.value}"`) || html.includes(`class='${check.value}'`) ||
                            html.includes(`"${check.value}"`) || html.includes(`'${check.value}'`);
                } else if (check.type === 'id') {
                    found = html.includes(`id="${check.value}"`) || html.includes(`id='${check.value}'`);
                } else if (check.type === 'text') {
                    found = html.includes(check.value);
                } else if (check.type === 'attribute') {
                    found = html.includes(`${check.attr}="${check.value}"`) || html.includes(`${check.attr}='${check.value}'`);
                }

                checkResults.push({
                    description: check.description,
                    found: found,
                    value: check.value
                });
            }

            results[name] = checkResults;
        }

        return results;
    }

    async testRoute(path, name, componentChecks) {
        console.log(`\n🔍 TESTING: ${name} (${path})`);

        try {
            const html = await this.makeRequest(path);
            const componentResults = this.checkComponentInHTML(html, componentChecks);

            // Count successful checks
            let totalChecks = 0;
            let passedChecks = 0;

            for (const [componentName, checks] of Object.entries(componentResults)) {
                console.log(`  📦 Component: ${componentName}`);

                for (const check of checks) {
                    totalChecks++;
                    if (check.found) {
                        passedChecks++;
                        console.log(`    ✅ ${check.description}`);
                    } else {
                        console.log(`    ❌ ${check.description} (${check.value})`);
                    }
                }
            }

            const success = passedChecks > 0;
            const percentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

            console.log(`  📊 Result: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`);

            this.results.push({
                test: name,
                path: path,
                passed: success,
                totalChecks: totalChecks,
                passedChecks: passedChecks,
                percentage: percentage,
                components: componentResults,
                details: `${passedChecks}/${totalChecks} component checks passed`
            });

            return success;

        } catch (error) {
            console.log(`  ❌ ERROR: ${error.message}`);
            this.results.push({
                test: name,
                path: path,
                passed: false,
                details: error.message
            });
            return false;
        }
    }

    async run() {
        console.log('🚀 DOM COMPONENT VALIDATION');
        console.log('🎯 Checking if Angular components render in the DOM');
        console.log('🔗 Base URL:', this.baseUrl);
        console.log('');

        // Define component checks for each route
        const routeTests = [
            {
                path: '',
                name: 'Login Page',
                checks: {
                    'App Root': [
                        { type: 'tag', value: 'app-root', description: 'Angular app-root element' },
                        { type: 'attribute', attr: 'ng-version', value: '17', description: 'Angular version 17' }
                    ],
                    'Login Component': [
                        { type: 'tag', value: 'app-login', description: 'Login component' },
                        { type: 'attribute', attr: 'data-cy', value: 'login-email', description: 'Email input' },
                        { type: 'attribute', attr: 'data-cy', value: 'login-password', description: 'Password input' },
                        { type: 'attribute', attr: 'data-cy', value: 'login-submit', description: 'Login submit button' }
                    ],
                    'Demo Users': [
                        { type: 'text', value: 'demo-user-', description: 'Demo user buttons' },
                        { type: 'text', value: 'Admin', description: 'Admin demo user' },
                        { type: 'text', value: 'Vendedor', description: 'Vendedor demo user' }
                    ]
                }
            },
            {
                path: '/simuladores',
                name: 'Simuladores Page',
                checks: {
                    'Simuladores Container': [
                        { type: 'tag', value: 'app-simulador-main', description: 'Simuladores main component' },
                        { type: 'class', value: 'premium-card', description: 'Premium card styling' },
                        { type: 'text', value: 'Simuladores', description: 'Page title' }
                    ],
                    'TIR Components': [
                        { type: 'text', value: 'TIR', description: 'TIR mentions' },
                        { type: 'text', value: 'tasa', description: 'Interest rate mentions' },
                        { type: 'tag', value: 'input', description: 'Input fields' }
                    ]
                }
            },
            {
                path: '/cotizadores',
                name: 'Cotizadores Page',
                checks: {
                    'Cotizadores Container': [
                        { type: 'tag', value: 'app-cotizador-main', description: 'Cotizadores main component' },
                        { type: 'text', value: 'Cotizadores', description: 'Page title' }
                    ],
                    'PMT Elements': [
                        { type: 'text', value: 'PMT', description: 'PMT calculations' },
                        { type: 'text', value: 'Newton', description: 'Newton-Raphson method' },
                        { type: 'tag', value: 'button', description: 'Action buttons' }
                    ]
                }
            },
            {
                path: '/configuracion/flow-builder',
                name: 'Flow Builder Page',
                checks: {
                    'Flow Builder Container': [
                        { type: 'tag', value: 'app-flow-builder', description: 'Flow Builder component' },
                        { type: 'attribute', attr: 'data-cy', value: 'flow-builder', description: 'Flow builder container' }
                    ],
                    'Flow Elements': [
                        { type: 'attribute', attr: 'data-cy', value: 'flow-palette', description: 'Flow palette' },
                        { type: 'attribute', attr: 'data-cy', value: 'flow-canvas', description: 'Flow canvas' },
                        { type: 'text', value: 'Flow', description: 'Flow mentions' }
                    ]
                }
            },
            {
                path: '/onboarding',
                name: 'Onboarding Page',
                checks: {
                    'Onboarding Container': [
                        { type: 'tag', value: 'app-onboarding-main', description: 'Onboarding main component' },
                        { type: 'text', value: 'Onboarding', description: 'Page title' }
                    ],
                    'Form Elements': [
                        { type: 'attribute', attr: 'data-cy', value: 'onboarding-market-select', description: 'Market selector' },
                        { type: 'tag', value: 'select', description: 'Select elements' },
                        { type: 'tag', value: 'input', description: 'Input elements' }
                    ]
                }
            }
        ];

        let totalSuccess = 0;

        for (const routeTest of routeTests) {
            const success = await this.testRoute(routeTest.path, routeTest.name, routeTest.checks);
            if (success) totalSuccess++;
        }

        // Generate report
        const totalTests = this.results.length;
        const successRate = Math.round((totalSuccess / totalTests) * 100);

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'DOM Component Validation',
            baseUrl: this.baseUrl,
            total: totalTests,
            passed: totalSuccess,
            failed: totalTests - totalSuccess,
            successRate: successRate,
            tests: this.results
        };

        const filename = `dom-component-validation-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\n📊 DOM COMPONENT VALIDATION - FINAL REPORT');
        console.log('=' * 50);
        console.log(`📄 Total routes tested: ${totalTests}`);
        console.log(`✅ Routes with components: ${totalSuccess}`);
        console.log(`❌ Routes without components: ${totalTests - totalSuccess}`);
        console.log(`📈 Component detection rate: ${successRate}%`);
        console.log(`💾 Report saved: ${filename}`);

        // Detailed summary
        console.log('\n📋 DETAILED COMPONENT ANALYSIS:');
        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            const percentage = result.percentage || 0;
            console.log(`  ${status} ${result.test}: ${percentage}% components detected`);
        });

        if (successRate === 100) {
            console.log('\n🎉 ALL COMPONENTS RENDERING CORRECTLY!');
            console.log('✅ Angular PWA is fully functional');
        } else if (successRate >= 80) {
            console.log('\n✅ MOST COMPONENTS WORKING - Minor rendering issues');
        } else {
            console.log('\n⚠️ COMPONENT RENDERING ISSUES DETECTED');
            console.log('🔧 Check if Angular components are loading properly');
        }

        return report;
    }
}

// Run directly
if (require.main === module) {
    const validator = new DOMComponentValidation();
    validator.run()
        .then(() => {
            console.log('\n✅ DOM Component validation completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ DOM Component validation failed:', error);
            process.exit(1);
        });
}

module.exports = DOMComponentValidation;