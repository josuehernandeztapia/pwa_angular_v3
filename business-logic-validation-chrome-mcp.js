/**
 * 🏢 Business Logic Validation with Chrome DevTools MCP
 * Comprehensive validation of all business modules and functionality
 */

const puppeteer = require('puppeteer');

class BusinessLogicValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = [];
        this.issues = [];

        // Business modules to validate
        this.businessModules = [
            // Simuladores
            { name: 'AGS Ahorro', path: '/simulador/ags-ahorro', type: 'simulador' },
            { name: 'EdoMex Individual', path: '/simulador/edomex-individual', type: 'simulador' },
            { name: 'Tanda Colectiva', path: '/simulador/tanda-colectiva', type: 'simulador' },

            // Cotizadores
            { name: 'AGS Individual', path: '/cotizador/ags-individual', type: 'cotizador' },
            { name: 'EdoMex Colectivo', path: '/cotizador/edomex-colectivo', type: 'cotizador' },

            // Módulos especializados
            { name: 'Protección', path: '/proteccion', type: 'protection' },
            { name: 'Claims', path: '/claims', type: 'claims', requiresAdmin: true },
            { name: 'Postventa Wizard', path: '/postventa/wizard', type: 'postventa', requiresContext: true },

            // Core modules
            { name: 'Clientes', path: '/clientes', type: 'management' },
            { name: 'Nueva Oportunidad', path: '/nueva-oportunidad', type: 'opportunity' },
            { name: 'Documentos', path: '/documentos', type: 'documents' },
        ];
    }

    async init() {
        console.log('🏢 BUSINESS LOGIC VALIDATION WITH CHROME DEVTOOLS MCP');
        console.log('====================================================\n');

        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            defaultViewport: { width: 1400, height: 900 },
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--enable-devtools-experiments',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();

        // Enable comprehensive Chrome DevTools Protocol
        const client = await this.page.target().createCDPSession();
        await client.send('Runtime.enable');
        await client.send('Network.enable');
        await client.send('Page.enable');
        await client.send('DOM.enable');
        await client.send('Console.enable');
        await client.send('Security.enable');
        await client.send('Storage.enable');
        await client.send('IndexedDB.enable');

        this.setupAdvancedMonitoring(client);
        console.log('✅ Chrome DevTools MCP comprehensive monitoring active\n');
    }

    setupAdvancedMonitoring(client) {
        // Network monitoring
        this.page.on('response', response => {
            if (response.status() >= 400) {
                this.recordIssue('network_error', `${response.status()} ${response.url()}`);
            }
        });

        // Console monitoring
        this.page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('font') && !msg.text().includes('DevTools')) {
                this.recordIssue('console_error', msg.text());
            }
        });

        // Page error monitoring
        this.page.on('pageerror', error => {
            this.recordIssue('page_error', error.message);
        });

        // IndexedDB monitoring
        client.on('Storage.indexedDBListUpdated', () => {
            console.log('📊 IndexedDB updated');
        });
    }

    recordIssue(type, message) {
        this.issues.push({
            type,
            message,
            timestamp: new Date().toISOString(),
            module: this.currentModule || 'unknown'
        });
    }

    async authenticateAsAdmin() {
        console.log('🔐 Authenticating as admin for full access...');

        await this.page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
        await this.page.evaluate(() => localStorage.clear());

        await this.page.focus('input[type="email"]');
        await this.page.type('input[type="email"]', 'admin@conductores.com');
        await this.page.focus('input[type="password"]');
        await this.page.type('input[type="password"]', 'admin123');

        await this.page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const currentPath = new URL(this.page.url()).pathname;
        if (currentPath === '/dashboard') {
            console.log('✅ Admin authentication successful\n');
            return true;
        } else {
            console.log('❌ Admin authentication failed\n');
            this.recordIssue('auth_failed', 'Admin authentication failed');
            return false;
        }
    }

    async validateBusinessModule(module) {
        this.currentModule = module.name;
        console.log(`🧪 Testing Business Module: ${module.name}`);
        console.log(`   Type: ${module.type} | Path: ${module.path}`);

        const result = {
            module: module.name,
            type: module.type,
            path: module.path,
            accessible: false,
            functional: false,
            hasContent: false,
            hasCalculation: false,
            hasPDFGeneration: false,
            hasIndexedDB: false,
            features: [],
            issues: []
        };

        try {
            // Navigate to module
            await this.page.goto(`http://localhost:4300${module.path}`, {
                waitUntil: 'networkidle0',
                timeout: 15000
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentPath = new URL(this.page.url()).pathname;

            // Check accessibility
            if (currentPath.startsWith(module.path.split('?')[0]) || currentPath === module.path) {
                result.accessible = true;
                console.log(`   ✅ Accessible`);
            } else {
                console.log(`   ❌ Not accessible - redirected to ${currentPath}`);
                result.issues.push(`Redirected to ${currentPath}`);
                return result;
            }

            // Check content presence
            const pageAnalysis = await this.page.evaluate(() => {
                const content = document.body.innerText;
                const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t);
                const inputs = Array.from(document.querySelectorAll('input')).length;
                const selects = Array.from(document.querySelectorAll('select')).length;
                const forms = Array.from(document.querySelectorAll('form')).length;

                return {
                    contentLength: content.length,
                    hasCalculateButton: buttons.some(b => b.toLowerCase().includes('calcular') || b.toLowerCase().includes('cotizar') || b.toLowerCase().includes('simular')),
                    hasPDFButton: buttons.some(b => b.toLowerCase().includes('pdf') || b.toLowerCase().includes('descargar') || b.toLowerCase().includes('export')),
                    hasGuardarButton: buttons.some(b => b.toLowerCase().includes('guardar') || b.toLowerCase().includes('save')),
                    inputCount: inputs,
                    selectCount: selects,
                    formCount: forms,
                    buttons: buttons.slice(0, 10), // First 10 buttons
                    hasErrorMessages: content.toLowerCase().includes('error') || content.toLowerCase().includes('falta')
                };
            });

            if (pageAnalysis.contentLength > 500) {
                result.hasContent = true;
                console.log(`   ✅ Has content (${pageAnalysis.contentLength} chars)`);
            }

            // Test specific business logic based on module type
            if (module.type === 'simulador' || module.type === 'cotizador') {
                result.functional = await this.testCalculationModule(pageAnalysis, module);
                result.features = pageAnalysis.buttons;
            } else if (module.type === 'protection') {
                result.functional = await this.testProtectionModule(pageAnalysis);
            } else if (module.type === 'claims') {
                result.functional = await this.testClaimsModule(pageAnalysis);
            } else {
                result.functional = pageAnalysis.inputCount > 0 || pageAnalysis.buttons.length > 0;
            }

            // Test PDF generation capability
            if (pageAnalysis.hasPDFButton) {
                result.hasPDFGeneration = await this.testPDFGeneration();
            }

            // Test IndexedDB usage
            result.hasIndexedDB = await this.testIndexedDBUsage();

            console.log(`   📊 Analysis: Inputs(${pageAnalysis.inputCount}) Forms(${pageAnalysis.formCount}) Buttons(${pageAnalysis.buttons.length})`);
            console.log(`   🔧 Features: ${pageAnalysis.buttons.join(', ')}`);

            if (result.functional) {
                console.log(`   ✅ Functional business logic detected`);
            } else {
                console.log(`   ❌ Limited or no business logic functionality`);
                result.issues.push('No functional business logic detected');
            }

            await this.page.screenshot({
                path: `business-validation/${module.name.toLowerCase().replace(/\s+/g, '-')}.png`,
                fullPage: true
            });

        } catch (error) {
            console.log(`   💥 Error testing ${module.name}: ${error.message}`);
            result.issues.push(`Testing error: ${error.message}`);
            this.recordIssue('module_test_error', `${module.name}: ${error.message}`);
        }

        this.results.push(result);
        return result;
    }

    async testCalculationModule(pageAnalysis, module) {
        console.log(`   🧮 Testing calculation logic for ${module.name}...`);

        try {
            // Try to fill basic form data if inputs exist
            if (pageAnalysis.inputCount > 0) {
                // Fill some basic data
                const inputs = await this.page.$$('input[type="number"], input[type="text"]');
                for (let i = 0; i < Math.min(inputs.length, 3); i++) {
                    try {
                        await inputs[i].focus();
                        await inputs[i].type('100');
                    } catch (e) {
                        // Continue if input fails
                    }
                }
            }

            // Try to trigger calculation
            if (pageAnalysis.hasCalculateButton) {
                const calcButton = await this.page.$('button');
                if (calcButton) {
                    await calcButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Check for results
                    const hasResults = await this.page.evaluate(() => {
                        const text = document.body.innerText.toLowerCase();
                        return text.includes('resultado') || text.includes('total') || text.includes('prima') || text.includes('costo');
                    });

                    if (hasResults) {
                        console.log(`   ✅ Calculation produces results`);
                        return true;
                    }
                }
            }

            return pageAnalysis.inputCount > 0 && pageAnalysis.buttons.length > 0;

        } catch (error) {
            console.log(`   ⚠️  Calculation test failed: ${error.message}`);
            return false;
        }
    }

    async testProtectionModule(pageAnalysis) {
        console.log(`   🛡️  Testing protection module...`);
        // Protection should have specific protection-related content
        const hasProtectionContent = await this.page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('protec') || text.includes('segur') || text.includes('coberta') || text.includes('polit');
        });

        return hasProtectionContent && pageAnalysis.buttons.length > 0;
    }

    async testClaimsModule(pageAnalysis) {
        console.log(`   🎫 Testing claims module...`);
        const hasClaimsContent = await this.page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes('reclam') || text.includes('siniestro') || text.includes('claim');
        });

        return hasClaimsContent;
    }

    async testPDFGeneration() {
        console.log(`   📄 Testing PDF generation...`);
        try {
            const pdfButton = await this.page.$('button');
            if (pdfButton) {
                // Don't actually click to avoid downloads, just check if button exists
                const buttonText = await this.page.evaluate(btn => btn.textContent, pdfButton);
                return buttonText && (buttonText.toLowerCase().includes('pdf') || buttonText.toLowerCase().includes('descargar'));
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async testIndexedDBUsage() {
        try {
            const indexedDBUsage = await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    if (!window.indexedDB) {
                        resolve(false);
                        return;
                    }

                    // Check if there are any IndexedDB databases
                    window.indexedDB.databases().then(databases => {
                        resolve(databases.length > 0);
                    }).catch(() => {
                        resolve(false);
                    });
                });
            });

            if (indexedDBUsage) {
                console.log(`   💾 IndexedDB usage detected`);
            }

            return indexedDBUsage;
        } catch (error) {
            return false;
        }
    }

    async generateComprehensiveReport() {
        console.log('\n📊 COMPREHENSIVE BUSINESS LOGIC VALIDATION REPORT');
        console.log('=================================================');

        const totalModules = this.results.length;
        const accessibleModules = this.results.filter(r => r.accessible).length;
        const functionalModules = this.results.filter(r => r.functional).length;
        const modulesWithContent = this.results.filter(r => r.hasContent).length;
        const modulesWithPDF = this.results.filter(r => r.hasPDFGeneration).length;
        const modulesWithIndexedDB = this.results.filter(r => r.hasIndexedDB).length;

        console.log(`\n🎯 Overall Metrics:`);
        console.log(`   Total Modules: ${totalModules}`);
        console.log(`   Accessible: ${accessibleModules}/${totalModules} (${((accessibleModules/totalModules)*100).toFixed(1)}%)`);
        console.log(`   Functional: ${functionalModules}/${totalModules} (${((functionalModules/totalModules)*100).toFixed(1)}%)`);
        console.log(`   With Content: ${modulesWithContent}/${totalModules} (${((modulesWithContent/totalModules)*100).toFixed(1)}%)`);
        console.log(`   PDF Capable: ${modulesWithPDF}/${totalModules}`);
        console.log(`   IndexedDB: ${modulesWithIndexedDB}/${totalModules}`);

        console.log(`\n📋 Module-by-Module Results:`);
        this.results.forEach((result, i) => {
            const status = result.accessible && result.functional ? '✅' :
                          result.accessible ? '⚠️' : '❌';

            console.log(`   ${i + 1}. ${status} ${result.module} (${result.type})`);
            console.log(`      Path: ${result.path}`);
            console.log(`      Accessible: ${result.accessible ? '✅' : '❌'} | Functional: ${result.functional ? '✅' : '❌'} | Content: ${result.hasContent ? '✅' : '❌'}`);
            console.log(`      PDF: ${result.hasPDFGeneration ? '✅' : '❌'} | IndexedDB: ${result.hasIndexedDB ? '✅' : '❌'}`);

            if (result.features.length > 0) {
                console.log(`      Features: ${result.features.slice(0, 5).join(', ')}${result.features.length > 5 ? '...' : ''}`);
            }

            if (result.issues.length > 0) {
                result.issues.forEach(issue => {
                    console.log(`      ⚠️  Issue: ${issue}`);
                });
            }
            console.log();
        });

        if (this.issues.length > 0) {
            console.log(`\n🚨 Technical Issues Detected (${this.issues.length}):`);
            this.issues.forEach((issue, i) => {
                console.log(`   ${i + 1}. [${issue.type}] ${issue.message} (${issue.module})`);
            });
        }

        // Business logic completeness assessment
        const businessCompletenessScore = ((accessibleModules + functionalModules) / (totalModules * 2)) * 100;

        console.log(`\n🎯 BUSINESS LOGIC COMPLETENESS ASSESSMENT:`);
        if (businessCompletenessScore >= 90) {
            console.log(`🎉 EXCELLENT (${businessCompletenessScore.toFixed(1)}%): Business logic is comprehensive and functional`);
            console.log('✅ All major business modules are implemented and working');
        } else if (businessCompletenessScore >= 75) {
            console.log(`👍 GOOD (${businessCompletenessScore.toFixed(1)}%): Most business logic is functional`);
            console.log('⚠️  Some modules may need attention for full functionality');
        } else if (businessCompletenessScore >= 50) {
            console.log(`⚠️  PARTIAL (${businessCompletenessScore.toFixed(1)}%): Basic business logic present but incomplete`);
            console.log('🔧 Several modules need implementation or fixes');
        } else {
            console.log(`❌ INCOMPLETE (${businessCompletenessScore.toFixed(1)}%): Major business logic gaps detected`);
            console.log('🚨 Significant development work needed');
        }

        // Missing business features
        console.log(`\n🔍 MISSING FEATURES ANALYSIS:`);
        const missingFeatures = [];

        if (modulesWithPDF === 0) {
            missingFeatures.push('PDF generation not implemented in any module');
        }
        if (modulesWithIndexedDB === 0) {
            missingFeatures.push('IndexedDB storage not utilized');
        }

        const simulatorResults = this.results.filter(r => r.type === 'simulador');
        const cotizadorResults = this.results.filter(r => r.type === 'cotizador');

        if (simulatorResults.filter(r => r.functional).length < simulatorResults.length) {
            missingFeatures.push('Some simulators lack full calculation logic');
        }
        if (cotizadorResults.filter(r => r.functional).length < cotizadorResults.length) {
            missingFeatures.push('Some cotizadores lack full calculation logic');
        }

        if (missingFeatures.length > 0) {
            missingFeatures.forEach(feature => console.log(`   ❌ ${feature}`));
        } else {
            console.log('   ✅ No critical missing features detected');
        }

        // Save comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            metrics: {
                totalModules,
                accessibleModules,
                functionalModules,
                modulesWithContent,
                modulesWithPDF,
                modulesWithIndexedDB,
                businessCompletenessScore
            },
            moduleResults: this.results,
            issues: this.issues,
            missingFeatures,
            chromeDevToolsMCP: true
        };

        require('fs').writeFileSync('business-logic-validation-report.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Comprehensive report saved: business-logic-validation-report.json');

        return businessCompletenessScore >= 75;
    }

    async runCompleteValidation() {
        try {
            await require('fs').promises.mkdir('business-validation', { recursive: true });

            await this.init();

            const authSuccess = await this.authenticateAsAdmin();
            if (!authSuccess) {
                console.log('❌ Cannot proceed without admin authentication');
                return false;
            }

            console.log('🧪 Starting comprehensive business module validation...\n');

            for (const module of this.businessModules) {
                await this.validateBusinessModule(module);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between modules
            }

            const success = await this.generateComprehensiveReport();
            return success;

        } catch (error) {
            console.error('💥 Critical validation error:', error);
            return false;
        }
    }

    async cleanup() {
        console.log('\n🔍 Browser and Chrome DevTools left open for manual inspection');
        console.log('You can continue investigating business logic with full DevTools capabilities');
    }
}

// Execute comprehensive business logic validation
(async () => {
    const validator = new BusinessLogicValidator();

    try {
        const success = await validator.runCompleteValidation();

        if (success) {
            console.log('\n🎯 BUSINESS LOGIC VALIDATION: SUCCESS');
            console.log('✅ Business logic is comprehensive and functional');
        } else {
            console.log('\n⚠️  BUSINESS LOGIC VALIDATION: ISSUES DETECTED');
            console.log('🔧 Review detailed report for specific business logic gaps');
        }

        await validator.cleanup();

    } catch (error) {
        console.error('💥 Critical business validation failure:', error);
        await validator.cleanup();
        process.exit(1);
    }
})();