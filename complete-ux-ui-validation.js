/**
 * Complete UX/UI Components Validation
 * Validates ALL components from navigation.md are accessible in the real UI
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class CompleteUXUIValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                accessibilityScore: 0
            },
            modules: {},
            issues: [],
            recommendations: []
        };
    }

    async initialize() {
        console.log('🎯 Inicializando validación completa UX/UI...');

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized']
        });

        this.page = await this.browser.newPage();

        // Set up error and console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ Console error: ${msg.text()}`);
            }
        });
    }

    async authenticate() {
        console.log('🔐 Autenticando...');

        await this.page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        try {
            // Wait for demo users and click first one
            await this.page.waitForSelector('button[class*="demo"]', { timeout: 10000 });
            const demoButtons = await this.page.$$('button[class*="demo"]');

            if (demoButtons.length > 0) {
                console.log(`   Encontrados ${demoButtons.length} usuarios demo`);
                await demoButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Verify form was filled
                const email = await this.page.$eval('input[type="email"]', el => el.value);
                const password = await this.page.$eval('input[type="password"]', el => el.value);
                console.log(`   Credenciales cargadas: ${email} / ${password ? '****' : 'VACÍO'}`);

                if (!email || !password) {
                    throw new Error('Credenciales no se cargaron correctamente');
                }

                const submitBtn = await this.page.$('button[type="submit"]');
                if (submitBtn) {
                    await submitBtn.click();
                    console.log('   Enviando formulario de login...');

                    // Wait for either success (redirect) or error message
                    await Promise.race([
                        this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
                        this.page.waitForSelector('.error-message, .alert-danger', { timeout: 10000 })
                    ]);

                    const currentUrl = this.page.url();
                    if (currentUrl.includes('/dashboard') || !currentUrl.includes('/login')) {
                        console.log('✅ Autenticación exitosa');
                    } else {
                        // Check for error messages
                        const errorMsg = await this.page.evaluate(() => {
                            const errorEl = document.querySelector('.error-message, .alert-danger');
                            return errorEl ? errorEl.textContent : null;
                        });

                        if (errorMsg) {
                            throw new Error(`Autenticación falló: ${errorMsg}`);
                        } else {
                            throw new Error('Autenticación falló - no se redirigió al dashboard');
                        }
                    }
                } else {
                    throw new Error('Botón de submit no encontrado');
                }
            } else {
                throw new Error('No se encontraron usuarios demo');
            }
        } catch (error) {
            console.log(`❌ Error en autenticación: ${error.message}`);

            // Try manual fallback authentication
            console.log('🔄 Intentando autenticación manual...');
            await this.page.type('input[type="email"]', 'asesor@conductores.com', { delay: 100 });
            await this.page.type('input[type="password"]', 'demo123', { delay: 100 });

            const submitBtn = await this.page.$('button[type="submit"]');
            if (submitBtn) {
                await submitBtn.click();
                await new Promise(resolve => setTimeout(resolve, 5000));

                const currentUrl = this.page.url();
                if (currentUrl.includes('/dashboard') || !currentUrl.includes('/login')) {
                    console.log('✅ Autenticación manual exitosa');
                } else {
                    throw new Error('Autenticación manual también falló');
                }
            }
        }
    }

    async validateNavigation() {
        console.log('🧭 Validando navegación completa...');

        await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });

        const navigationTests = [
            // Primary navigation items
            { selector: '[data-cy="nav-dashboard"]', name: 'Dashboard', expected: true },
            { selector: '[data-cy="nav-onboarding"]', name: 'Onboarding', expected: true },
            { selector: '[data-cy="nav-cotizador"]', name: 'Cotizador', expected: true },
            { selector: '[data-cy="nav-simulador"]', name: 'Simulador', expected: true },
            { selector: '[data-cy="nav-clientes"]', name: 'Clientes', expected: true },
            { selector: '[data-cy="nav-documentos"]', name: 'Documentos', expected: true },
            { selector: '[data-cy="nav-ops"]', name: 'Operaciones', expected: true },
            { selector: '[data-cy="nav-gnv"]', name: 'GNV', expected: true },
            { selector: '[data-cy="nav-proteccion"]', name: 'Protección', expected: true },
            { selector: '[data-cy="nav-configuracion"]', name: 'Configuración', expected: true }
        ];

        const navResults = {};

        for (const test of navigationTests) {
            try {
                const element = await this.page.$(test.selector);
                const found = element !== null;

                navResults[test.name] = {
                    found,
                    expected: test.expected,
                    passed: found === test.expected,
                    selector: test.selector
                };

                console.log(`${found === test.expected ? '✅' : '❌'} ${test.name}: ${found ? 'Encontrado' : 'No encontrado'}`);

            } catch (error) {
                navResults[test.name] = {
                    found: false,
                    expected: test.expected,
                    passed: false,
                    error: error.message,
                    selector: test.selector
                };
                console.log(`❌ ${test.name}: Error - ${error.message}`);
            }
        }

        this.results.modules.navigation = navResults;
        return navResults;
    }

    async validateCotizadorModules() {
        console.log('💰 Validando módulos Cotizador...');

        const cotizadorTests = [
            { url: '/cotizador', name: 'Cotizador Main', expectComponent: 'app-cotizador-main' },
            { url: '/cotizador/ags-individual', name: 'AGS Individual', expectComponent: 'app-ags-individual' },
            { url: '/cotizador/edomex-colectivo', name: 'EdoMex Colectivo', expectComponent: 'app-edomex-colectivo' }
        ];

        const results = {};

        for (const test of cotizadorTests) {
            try {
                console.log(`   Testing: ${test.name} (${test.url})`);
                await this.page.goto(`http://localhost:4300${test.url}`, {
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });

                const component = await this.page.$(test.expectComponent);
                const hasContent = await this.page.evaluate(() => {
                    return document.body.textContent.length > 100 &&
                           !document.body.textContent.includes('404') &&
                           !document.body.textContent.includes('Error');
                });

                results[test.name] = {
                    accessible: true,
                    componentFound: !!component,
                    hasContent,
                    url: test.url,
                    passed: !!component && hasContent
                };

                console.log(`   ${results[test.name].passed ? '✅' : '❌'} ${test.name}`);

            } catch (error) {
                results[test.name] = {
                    accessible: false,
                    error: error.message,
                    url: test.url,
                    passed: false
                };
                console.log(`   ❌ ${test.name}: ${error.message}`);
            }
        }

        this.results.modules.cotizador = results;
        return results;
    }

    async validateSimuladorModules() {
        console.log('🎯 Validando módulos Simulador...');

        const simuladorTests = [
            { url: '/simulador', name: 'Simulador Main', expectComponent: 'app-simulador-main' },
            { url: '/simulador/ags-ahorro', name: 'Plan de Ahorro', expectComponent: 'app-ags-ahorro' },
            { url: '/simulador/edomex-individual', name: 'Venta a Plazo', expectComponent: 'app-edomex-individual' },
            { url: '/simulador/tanda-colectiva', name: 'Tanda Colectiva', expectComponent: 'app-tanda-colectiva' }
        ];

        const results = {};

        for (const test of simuladorTests) {
            try {
                console.log(`   Testing: ${test.name} (${test.url})`);
                await this.page.goto(`http://localhost:4300${test.url}`, {
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });

                const component = await this.page.$(test.expectComponent);
                const hasContent = await this.page.evaluate(() => {
                    return document.body.textContent.length > 100 &&
                           !document.body.textContent.includes('404') &&
                           !document.body.textContent.includes('Error');
                });

                // Check for specific business logic elements
                const hasBusinessLogic = await this.page.evaluate((testName) => {
                    const text = document.body.textContent.toLowerCase();
                    switch(testName) {
                        case 'Plan de Ahorro':
                            return text.includes('ahorro') || text.includes('plan');
                        case 'Venta a Plazo':
                            return text.includes('plazo') || text.includes('financiamiento');
                        case 'Tanda Colectiva':
                            return text.includes('tanda') || text.includes('colectivo');
                        default:
                            return true;
                    }
                }, test.name);

                results[test.name] = {
                    accessible: true,
                    componentFound: !!component,
                    hasContent,
                    hasBusinessLogic,
                    url: test.url,
                    passed: !!component && hasContent && hasBusinessLogic
                };

                console.log(`   ${results[test.name].passed ? '✅' : '❌'} ${test.name}`);

            } catch (error) {
                results[test.name] = {
                    accessible: false,
                    error: error.message,
                    url: test.url,
                    passed: false
                };
                console.log(`   ❌ ${test.name}: ${error.message}`);
            }
        }

        this.results.modules.simulador = results;
        return results;
    }

    async validateOnboardingFlow() {
        console.log('🎯 Validando flujo de Onboarding...');

        try {
            await this.page.goto('http://localhost:4300/onboarding', {
                waitUntil: 'networkidle0',
                timeout: 10000
            });

            const onboardingTests = await this.page.evaluate(() => {
                const results = {};

                // Check main component
                results.mainComponent = !!document.querySelector('app-onboarding-main');

                // Check for step indicators
                results.hasSteps = document.body.textContent.includes('paso') ||
                                  document.body.textContent.includes('step') ||
                                  document.querySelectorAll('.step').length > 0;

                // Check for AVI integration indicators
                results.aviIntegration = document.body.textContent.toLowerCase().includes('kyc') ||
                                        document.body.textContent.toLowerCase().includes('verificaci');

                // Check for document upload indicators
                results.documentUpload = document.body.textContent.toLowerCase().includes('documento') ||
                                        !!document.querySelector('input[type="file"]');

                // Check for form elements
                results.hasFormElements = document.querySelectorAll('input').length > 0 ||
                                         document.querySelectorAll('select').length > 0;

                return results;
            });

            const passed = onboardingTests.mainComponent && onboardingTests.hasSteps;

            this.results.modules.onboarding = {
                accessible: true,
                ...onboardingTests,
                passed,
                url: '/onboarding'
            };

            console.log(`   ${passed ? '✅' : '❌'} Onboarding Flow`);
            return onboardingTests;

        } catch (error) {
            this.results.modules.onboarding = {
                accessible: false,
                error: error.message,
                passed: false,
                url: '/onboarding'
            };
            console.log(`   ❌ Onboarding Flow: ${error.message}`);
            return { passed: false };
        }
    }

    async validateOperationalModules() {
        console.log('🚛 Validando módulos Operacionales...');

        const opsTests = [
            { url: '/ops/deliveries', name: 'Entregas', expectContent: 'entrega' },
            { url: '/ops/import-tracker', name: 'Import Tracker', expectContent: 'import' },
            { url: '/ops/gnv-health', name: 'GNV Health', expectContent: 'gnv' },
            { url: '/ops/triggers', name: 'Triggers', expectContent: 'trigger' }
        ];

        const results = {};

        for (const test of opsTests) {
            try {
                console.log(`   Testing: ${test.name} (${test.url})`);
                await this.page.goto(`http://localhost:4300${test.url}`, {
                    waitUntil: 'networkidle0',
                    timeout: 10000
                });

                const hasContent = await this.page.evaluate(() => {
                    return document.body.textContent.length > 100 &&
                           !document.body.textContent.includes('404') &&
                           !document.body.textContent.includes('Error');
                });

                const hasExpectedContent = await this.page.evaluate((expected) => {
                    return document.body.textContent.toLowerCase().includes(expected.toLowerCase());
                }, test.expectContent);

                results[test.name] = {
                    accessible: true,
                    hasContent,
                    hasExpectedContent,
                    url: test.url,
                    passed: hasContent
                };

                console.log(`   ${results[test.name].passed ? '✅' : '❌'} ${test.name}`);

            } catch (error) {
                results[test.name] = {
                    accessible: false,
                    error: error.message,
                    url: test.url,
                    passed: false
                };
                console.log(`   ❌ ${test.name}: ${error.message}`);
            }
        }

        this.results.modules.operations = results;
        return results;
    }

    async validateDocumentsAndOCR() {
        console.log('📄 Validando Documentos y OCR...');

        try {
            await this.page.goto('http://localhost:4300/documentos', {
                waitUntil: 'networkidle0',
                timeout: 10000
            });

            const documentsTests = await this.page.evaluate(() => {
                const results = {};

                // Check for document upload capability
                results.hasFileInputs = document.querySelectorAll('input[type="file"]').length > 0;

                // Check for OCR-related elements
                results.hasOCRElements = document.body.textContent.toLowerCase().includes('escanear') ||
                                        document.body.textContent.toLowerCase().includes('cámara') ||
                                        document.querySelector('[data-testid*="ocr"]') !== null;

                // Check for document management UI
                results.hasDocumentUI = document.body.textContent.toLowerCase().includes('documento') ||
                                       document.querySelector('.doc-') !== null ||
                                       document.querySelector('[data-cy*="doc"]') !== null;

                // Check for upload progress/status
                results.hasProgressUI = document.body.textContent.toLowerCase().includes('progreso') ||
                                       document.body.textContent.toLowerCase().includes('completado') ||
                                       document.querySelector('.progress') !== null;

                return results;
            });

            const passed = documentsTests.hasDocumentUI;

            this.results.modules.documents = {
                accessible: true,
                ...documentsTests,
                passed,
                url: '/documentos'
            };

            console.log(`   ${passed ? '✅' : '❌'} Documents & OCR`);
            return documentsTests;

        } catch (error) {
            this.results.modules.documents = {
                accessible: false,
                error: error.message,
                passed: false,
                url: '/documentos'
            };
            console.log(`   ❌ Documents & OCR: ${error.message}`);
            return { passed: false };
        }
    }

    calculateSummary() {
        let totalTests = 0;
        let passed = 0;

        Object.values(this.results.modules).forEach(module => {
            if (typeof module === 'object') {
                Object.values(module).forEach(test => {
                    if (typeof test === 'object' && test.passed !== undefined) {
                        totalTests++;
                        if (test.passed) passed++;
                    }
                });
            }
        });

        this.results.summary = {
            totalTests,
            passed,
            failed: totalTests - passed,
            accessibilityScore: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0
        };

        // Generate recommendations
        this.generateRecommendations();
    }

    generateRecommendations() {
        const failed = [];

        Object.entries(this.results.modules).forEach(([moduleName, module]) => {
            if (typeof module === 'object') {
                Object.entries(module).forEach(([testName, test]) => {
                    if (typeof test === 'object' && test.passed === false) {
                        failed.push({
                            module: moduleName,
                            test: testName,
                            url: test.url,
                            error: test.error
                        });
                    }
                });
            }
        });

        this.results.recommendations = failed.map(item => ({
            priority: 'HIGH',
            module: item.module,
            issue: `${item.test} no está accesible`,
            solution: `Verificar ruta ${item.url} y componente correspondiente`,
            error: item.error
        }));
    }

    async generateReport() {
        console.log('📊 Generando reporte completo...');

        const report = `# 🎯 REPORTE DE VALIDACIÓN COMPLETA UX/UI

**Timestamp:** ${this.results.timestamp}
**Score de Accesibilidad:** ${this.results.summary.accessibilityScore}%
**Tests:** ${this.results.summary.passed}/${this.results.summary.totalTests} pasados

## 📊 RESUMEN EJECUTIVO

- **Total de módulos validados:** ${Object.keys(this.results.modules).length}
- **Componentes accesibles:** ${this.results.summary.passed}
- **Componentes con problemas:** ${this.results.summary.failed}
- **Tasa de éxito:** ${this.results.summary.accessibilityScore}%

## 🧭 NAVEGACIÓN

${Object.entries(this.results.modules.navigation || {}).map(([name, test]) =>
    `- **${name}:** ${test.passed ? '✅' : '❌'} ${test.found ? 'Visible' : 'No visible'}`
).join('\n')}

## 💰 COTIZADOR

${Object.entries(this.results.modules.cotizador || {}).map(([name, test]) =>
    `- **${name}:** ${test.passed ? '✅' : '❌'} ${test.accessible ? 'Accesible' : 'No accesible'}${test.error ? ` (${test.error})` : ''}`
).join('\n')}

## 🎯 SIMULADOR

${Object.entries(this.results.modules.simulador || {}).map(([name, test]) =>
    `- **${name}:** ${test.passed ? '✅' : '❌'} ${test.accessible ? 'Accesible' : 'No accesible'}${test.error ? ` (${test.error})` : ''}`
).join('\n')}

## 🎯 ONBOARDING

${this.results.modules.onboarding ? `
- **Accesible:** ${this.results.modules.onboarding.accessible ? '✅' : '❌'}
- **Componente principal:** ${this.results.modules.onboarding.mainComponent ? '✅' : '❌'}
- **Pasos visibles:** ${this.results.modules.onboarding.hasSteps ? '✅' : '❌'}
- **Integración AVI:** ${this.results.modules.onboarding.aviIntegration ? '✅' : '❌'}
- **Carga de documentos:** ${this.results.modules.onboarding.documentUpload ? '✅' : '❌'}
` : 'No validado'}

## 📄 DOCUMENTOS Y OCR

${this.results.modules.documents ? `
- **Accesible:** ${this.results.modules.documents.accessible ? '✅' : '❌'}
- **Inputs de archivo:** ${this.results.modules.documents.hasFileInputs ? '✅' : '❌'}
- **Elementos OCR:** ${this.results.modules.documents.hasOCRElements ? '✅' : '❌'}
- **UI de documentos:** ${this.results.modules.documents.hasDocumentUI ? '✅' : '❌'}
- **UI de progreso:** ${this.results.modules.documents.hasProgressUI ? '✅' : '❌'}
` : 'No validado'}

## 🚛 OPERACIONES

${Object.entries(this.results.modules.operations || {}).map(([name, test]) =>
    `- **${name}:** ${test.passed ? '✅' : '❌'} ${test.accessible ? 'Accesible' : 'No accesible'}${test.error ? ` (${test.error})` : ''}`
).join('\n')}

## 🚨 PROBLEMAS IDENTIFICADOS

${this.results.recommendations.length === 0 ? '¡No se encontraron problemas! 🎉' :
this.results.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.module.toUpperCase()} - ${rec.issue}
**Prioridad:** ${rec.priority}
**Solución:** ${rec.solution}
${rec.error ? `**Error:** ${rec.error}` : ''}
`).join('')}

## 🎊 CONCLUSIÓN

${this.results.summary.accessibilityScore >= 90 ?
`🎉 **EXCELENTE** - La mayoría de componentes están accesibles y funcionando correctamente.` :
this.results.summary.accessibilityScore >= 70 ?
`⚠️ **BUENO CON MEJORAS** - La mayoría de componentes funcionan, pero hay algunos que necesitan atención.` :
`❌ **NECESITA TRABAJO** - Varios componentes requieren correcciones para estar completamente accesibles.`}

**Próximos pasos:**
1. Corregir los ${this.results.summary.failed} componentes con problemas
2. Verificar la navegación para los módulos faltantes
3. Probar flujos end-to-end para validación completa

---
**Generado por Complete UX/UI Validator**
**Validación exhaustiva de todos los componentes documentados**
        `;

        return report;
    }

    async run() {
        try {
            await this.initialize();
            await this.authenticate();

            // Run all validation modules
            await this.validateNavigation();
            await this.validateCotizadorModules();
            await this.validateSimuladorModules();
            await this.validateOnboardingFlow();
            await this.validateOperationalModules();
            await this.validateDocumentsAndOCR();

            // Calculate summary and generate report
            this.calculateSummary();
            const report = await this.generateReport();

            // Save report
            fs.writeFileSync('COMPLETE-UX-UI-VALIDATION-REPORT.md', report);

            console.log('\n' + '='.repeat(80));
            console.log('🎯 VALIDACIÓN COMPLETA UX/UI TERMINADA');
            console.log('='.repeat(80));
            console.log(`Score de Accesibilidad: ${this.results.summary.accessibilityScore}%`);
            console.log(`Tests pasados: ${this.results.summary.passed}/${this.results.summary.totalTests}`);
            console.log(`Problemas encontrados: ${this.results.summary.failed}`);
            console.log('Reporte guardado en: COMPLETE-UX-UI-VALIDATION-REPORT.md');
            console.log('='.repeat(80));

            return this.results;

        } catch (error) {
            console.error('❌ Validación falló:', error.message);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new CompleteUXUIValidator();
    validator.run().catch(console.error);
}

module.exports = CompleteUXUIValidator;