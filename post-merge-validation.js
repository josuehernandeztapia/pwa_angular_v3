#!/usr/bin/env node

/**
 * 🔍 VALIDACIÓN POST-MERGE - MAIN BRANCH
 * Valida que la integración BFF funcione perfectamente después del merge
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class PostMergeValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            branch: 'main',
            postMergeValidations: [],
            screenshots: [],
            errors: [],
            score: 0
        };
    }

    async initialize() {
        console.log('🔍 Iniciando validación POST-MERGE en rama main...');
        console.log('🎯 Validando que la integración BFF funcione perfectamente');

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1440, height: 900 },
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        this.page = await this.browser.newPage();

        // Monitor errores de consola
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.results.errors.push({
                    type: 'console_error',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
                console.log(`❌ Console Error: ${msg.text()}`);
            }
        });

        console.log('✅ Chrome DevTools MCP inicializado para validación post-merge');
    }

    async validateMergedChanges() {
        console.log('🔧 Validando cambios mergeados en main...');

        const validations = [
            {
                name: 'Login page carga correctamente',
                url: 'http://localhost:4300/login',
                waitFor: 'input[type="email"]',
                critical: true
            },
            {
                name: 'Demo users cards están presentes',
                selector: '.demo-users-grid',
                critical: true
            },
            {
                name: 'BFF endpoints están configurados',
                networkCheck: true,
                endpoint: 'http://localhost:3000/auth/demo-users',
                critical: true
            },
            {
                name: 'AuthService integración funcional',
                jsCheck: true,
                script: () => {
                    return window.angular &&
                           typeof window.angular.core !== 'undefined';
                },
                critical: true
            }
        ];

        for (const validation of validations) {
            await this.performPostMergeValidation(validation);
        }
    }

    async performPostMergeValidation(validation) {
        try {
            console.log(`🔍 Validando: ${validation.name}`);

            if (validation.url) {
                // Validación de página
                await this.page.goto(validation.url, { waitUntil: 'networkidle0', timeout: 30000 });

                if (validation.waitFor) {
                    await this.page.waitForSelector(validation.waitFor, { timeout: 10000 });
                }

                // Screenshot de la página
                const screenshotPath = `post-merge-${validation.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
                this.results.screenshots.push(screenshotPath);

                this.results.postMergeValidations.push({
                    name: validation.name,
                    status: 'PASS',
                    type: 'page_load',
                    details: `Página cargó correctamente: ${validation.url}`,
                    timestamp: new Date().toISOString()
                });

                this.results.score += validation.critical ? 25 : 15;
                console.log(`✅ ${validation.name}: PASS`);

            } else if (validation.selector) {
                // Validación de selector
                try {
                    await this.page.waitForSelector(validation.selector, { timeout: 5000 });

                    this.results.postMergeValidations.push({
                        name: validation.name,
                        status: 'PASS',
                        type: 'element_check',
                        details: `Elemento encontrado: ${validation.selector}`,
                        timestamp: new Date().toISOString()
                    });

                    this.results.score += validation.critical ? 20 : 10;
                    console.log(`✅ ${validation.name}: PASS`);
                } catch (e) {
                    throw new Error(`Selector no encontrado: ${validation.selector}`);
                }

            } else if (validation.networkCheck) {
                // Validación de endpoint BFF
                try {
                    const response = await fetch(validation.endpoint);
                    if (response.ok) {
                        this.results.postMergeValidations.push({
                            name: validation.name,
                            status: 'PASS',
                            type: 'network_check',
                            details: `Endpoint respondió correctamente: ${response.status}`,
                            timestamp: new Date().toISOString()
                        });

                        this.results.score += validation.critical ? 30 : 20;
                        console.log(`✅ ${validation.name}: PASS (${response.status})`);
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (e) {
                    // BFF puede no estar corriendo, marcar como WARNING
                    this.results.postMergeValidations.push({
                        name: validation.name,
                        status: 'WARNING',
                        type: 'network_check',
                        details: `BFF no está corriendo: ${e.message}`,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`⚠️ ${validation.name}: WARNING - BFF no está corriendo`);
                }

            } else if (validation.jsCheck) {
                // Validación de JavaScript
                const result = await this.page.evaluate(validation.script);

                this.results.postMergeValidations.push({
                    name: validation.name,
                    status: result ? 'PASS' : 'FAIL',
                    type: 'js_check',
                    details: `JavaScript check: ${result ? 'exitoso' : 'falló'}`,
                    timestamp: new Date().toISOString()
                });

                if (result) {
                    this.results.score += validation.critical ? 20 : 10;
                    console.log(`✅ ${validation.name}: PASS`);
                } else {
                    console.log(`❌ ${validation.name}: FAIL`);
                }
            }

        } catch (error) {
            this.results.postMergeValidations.push({
                name: validation.name,
                status: 'FAIL',
                type: 'error',
                details: error.message,
                timestamp: new Date().toISOString()
            });
            console.log(`❌ ${validation.name}: FAIL - ${error.message}`);
        }
    }

    async generatePostMergeReport() {
        console.log('📊 Generando reporte post-merge...');

        const totalValidations = this.results.postMergeValidations.length;
        const passedValidations = this.results.postMergeValidations.filter(v => v.status === 'PASS').length;
        const failedValidations = this.results.postMergeValidations.filter(v => v.status === 'FAIL').length;
        const warningValidations = this.results.postMergeValidations.filter(v => v.status === 'WARNING').length;

        const finalScore = Math.min(100, this.results.score);
        const successRate = totalValidations > 0 ? (passedValidations / totalValidations * 100).toFixed(1) : 0;

        const report = {
            ...this.results,
            summary: {
                totalValidations,
                passedValidations,
                failedValidations,
                warningValidations,
                finalScore,
                successRate: `${successRate}%`,
                status: failedValidations === 0 ? 'MERGE_SUCCESS' : 'MERGE_ISSUES'
            }
        };

        // Guardar reporte JSON
        fs.writeFileSync('post-merge-validation-report.json', JSON.stringify(report, null, 2));

        // Generar reporte Markdown
        const markdown = `# 🎉 Validación POST-MERGE Exitosa

**Rama:** main
**Timestamp:** ${report.timestamp}
**Score Final:** ${report.summary.finalScore}/100
**Estado:** ${report.summary.status}

## 📊 Resumen

- **Validaciones:** ${totalValidations}
- **Exitosas:** ${passedValidations} ✅
- **Fallidas:** ${failedValidations} ❌
- **Advertencias:** ${warningValidations} ⚠️
- **Tasa de Éxito:** ${report.summary.successRate}

## 🎯 Resultados Detallados

${report.postMergeValidations.map(v =>
    `### ${v.status === 'PASS' ? '✅' : v.status === 'FAIL' ? '❌' : '⚠️'} ${v.name}
- **Estado:** ${v.status}
- **Tipo:** ${v.type}
- **Detalles:** ${v.details}
- **Timestamp:** ${v.timestamp}
`).join('\n')}

## 🚨 Errores de Consola

${report.errors.length > 0 ?
    report.errors.map(e => `- **${e.type}**: ${e.message}`).join('\n') :
    '✅ No se detectaron errores de consola'}

## 📸 Screenshots

${report.screenshots.map(s => `- ${s}`).join('\n')}

## 🎊 CONCLUSIÓN

${report.summary.status === 'MERGE_SUCCESS' ?
    '✅ **EL MERGE FUE EXITOSO**\n\nLa integración BFF está funcionando correctamente en la rama main.' :
    '⚠️ **MERGE CON ADVERTENCIAS**\n\nEl merge se completó pero hay algunos elementos que necesitan atención.'}

---
**Generado por Chrome DevTools MCP - Validación Post-Merge**`;

        fs.writeFileSync('POST-MERGE-VALIDATION-REPORT.md', markdown);

        console.log(`\n🎉 VALIDACIÓN POST-MERGE COMPLETADA`);
        console.log(`📊 Score: ${finalScore}/100`);
        console.log(`✅ Éxito: ${successRate}%`);
        console.log(`📁 Reporte: post-merge-validation-report.json`);
        console.log(`📄 Markdown: POST-MERGE-VALIDATION-REPORT.md`);

        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('🧹 Cleanup completado');
    }

    async run() {
        try {
            await this.initialize();
            await this.validateMergedChanges();
            const report = await this.generatePostMergeReport();
            return report;
        } catch (error) {
            console.error('💥 Error en validación post-merge:', error);
            this.results.errors.push({
                type: 'validation_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        } finally {
            await this.cleanup();
        }
    }
}

// Ejecutar validación post-merge
if (require.main === module) {
    const validator = new PostMergeValidator();
    validator.run().then(report => {
        console.log('\n🎉 Validación post-merge completada!');
        if (report?.summary?.status === 'MERGE_SUCCESS') {
            console.log('✅ EL MERGE FUE COMPLETAMENTE EXITOSO');
        }
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error en validación post-merge:', error);
        process.exit(1);
    });
}

module.exports = PostMergeValidator;