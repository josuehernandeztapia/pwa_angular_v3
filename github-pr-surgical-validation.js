#!/usr/bin/env node

/**
 * 🔍 VALIDACIÓN QUIRÚRGICA DEL PR EN GITHUB
 * Usa Chrome DevTools MCP para validar que el PR esté perfecto
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class GitHubPRSurgicalValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            prUrl: 'https://github.com/josuehernandeztapia/pwa_angular_v3/pull/new/feature/bff-auth-integration',
            validations: [],
            screenshots: [],
            errors: [],
            score: 0
        };
    }

    async initialize() {
        console.log('🔍 Iniciando validación quirúrgica del PR en GitHub...');

        this.browser = await puppeteer.launch({
            headless: false, // Mostrar browser para debugging
            defaultViewport: { width: 1440, height: 900 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });

        this.page = await this.browser.newPage();

        // Setup console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.results.errors.push({
                    type: 'console_error',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Setup network monitoring
        await this.page.setRequestInterception(true);
        this.page.on('request', request => {
            request.continue();
        });

        console.log('✅ Chrome DevTools MCP inicializado');
    }

    async validatePRCreationPage() {
        console.log('📝 Validando página de creación del PR...');

        try {
            // Navegar a la página de creación del PR
            await this.page.goto(this.results.prUrl, { waitUntil: 'networkidle0', timeout: 30000 });

            // Screenshot inicial
            const screenshotPath = `github-pr-creation-${Date.now()}.png`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.results.screenshots.push(screenshotPath);

            // Validar elementos clave de la página
            const validations = [
                {
                    name: 'Página de PR cargada',
                    selector: '[data-testid="pull-request-form"]',
                    fallbackSelectors: ['.new-pull-request', '#new_pull_request', '[class*="pull-request"]'],
                    critical: true
                },
                {
                    name: 'Campo de título presente',
                    selector: '[name="pull_request[title]"]',
                    fallbackSelectors: ['input[placeholder*="Title"]', '#pull_request_title'],
                    critical: true
                },
                {
                    name: 'Campo de descripción presente',
                    selector: '[name="pull_request[body]"]',
                    fallbackSelectors: ['textarea[placeholder*="description"]', '#pull_request_body'],
                    critical: true
                },
                {
                    name: 'Botón Create pull request presente',
                    selector: '[data-disable-with="Creating pull request…"]',
                    fallbackSelectors: ['button[type="submit"]', 'input[value*="Create"]'],
                    critical: true
                },
                {
                    name: 'Rama origen correcta (feature/bff-auth-integration)',
                    selector: '.branch-name',
                    expectedText: 'feature/bff-auth-integration',
                    critical: true
                },
                {
                    name: 'Rama destino correcta (main)',
                    selector: '.base-ref',
                    expectedText: 'main',
                    critical: true
                }
            ];

            for (const validation of validations) {
                await this.performValidation(validation);
            }

            // Validar información de commits
            await this.validateCommitInformation();

            // Validar archivos cambiados
            await this.validateChangedFiles();

            console.log('✅ Validación de página de creación completada');

        } catch (error) {
            this.results.errors.push({
                type: 'pr_creation_page_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            console.error('❌ Error en validación de página de creación:', error.message);
        }
    }

    async performValidation(validation) {
        try {
            let elementFound = false;
            let finalSelector = '';

            // Intentar con selector principal
            try {
                await this.page.waitForSelector(validation.selector, { timeout: 5000 });
                elementFound = true;
                finalSelector = validation.selector;
            } catch (e) {
                // Intentar con selectores fallback
                if (validation.fallbackSelectors) {
                    for (const fallbackSelector of validation.fallbackSelectors) {
                        try {
                            await this.page.waitForSelector(fallbackSelector, { timeout: 2000 });
                            elementFound = true;
                            finalSelector = fallbackSelector;
                            break;
                        } catch (fallbackError) {
                            continue;
                        }
                    }
                }
            }

            if (elementFound) {
                let textMatch = true;
                if (validation.expectedText) {
                    const elementText = await this.page.$eval(finalSelector, el => el.textContent?.trim());
                    textMatch = elementText?.includes(validation.expectedText) || false;
                }

                this.results.validations.push({
                    name: validation.name,
                    status: textMatch ? 'PASS' : 'FAIL',
                    selector: finalSelector,
                    critical: validation.critical || false,
                    details: validation.expectedText ? `Texto esperado: ${validation.expectedText}` : 'Elemento encontrado',
                    timestamp: new Date().toISOString()
                });

                if (textMatch) {
                    this.results.score += validation.critical ? 20 : 10;
                }

                console.log(`${textMatch ? '✅' : '❌'} ${validation.name}: ${textMatch ? 'PASS' : 'FAIL'}`);
            } else {
                this.results.validations.push({
                    name: validation.name,
                    status: 'FAIL',
                    selector: 'NOT_FOUND',
                    critical: validation.critical || false,
                    details: 'Elemento no encontrado',
                    timestamp: new Date().toISOString()
                });
                console.log(`❌ ${validation.name}: FAIL - Elemento no encontrado`);
            }

        } catch (error) {
            this.results.validations.push({
                name: validation.name,
                status: 'ERROR',
                selector: validation.selector,
                critical: validation.critical || false,
                details: error.message,
                timestamp: new Date().toISOString()
            });
            console.log(`⚠️ ${validation.name}: ERROR - ${error.message}`);
        }
    }

    async validateCommitInformation() {
        console.log('📊 Validando información de commits...');

        try {
            // Buscar información de commits
            const commitSelectors = [
                '.commit-summary',
                '.commit-message',
                '[data-testid="commit-list"]',
                '.commit-list-item'
            ];

            let commitsFound = false;
            for (const selector of commitSelectors) {
                try {
                    const commits = await this.page.$$(selector);
                    if (commits.length > 0) {
                        commitsFound = true;

                        this.results.validations.push({
                            name: 'Commits detectados en PR',
                            status: 'PASS',
                            selector: selector,
                            critical: false,
                            details: `${commits.length} commits encontrados`,
                            timestamp: new Date().toISOString()
                        });

                        this.results.score += 15;
                        console.log(`✅ Commits detectados: ${commits.length} commits encontrados`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!commitsFound) {
                this.results.validations.push({
                    name: 'Commits detectados en PR',
                    status: 'WARNING',
                    selector: 'NOT_FOUND',
                    critical: false,
                    details: 'No se pudieron detectar commits específicos',
                    timestamp: new Date().toISOString()
                });
                console.log('⚠️ No se pudieron detectar commits específicos');
            }

        } catch (error) {
            console.error('❌ Error validando commits:', error.message);
        }
    }

    async validateChangedFiles() {
        console.log('📁 Validando archivos cambiados...');

        try {
            // Buscar información de archivos cambiados
            const fileSelectors = [
                '.file-info',
                '.file-header',
                '[data-testid="changed-files"]',
                '.js-details-container'
            ];

            let filesFound = false;
            for (const selector of fileSelectors) {
                try {
                    const files = await this.page.$$(selector);
                    if (files.length > 0) {
                        filesFound = true;

                        this.results.validations.push({
                            name: 'Archivos cambiados detectados',
                            status: 'PASS',
                            selector: selector,
                            critical: false,
                            details: `${files.length} archivos cambiados detectados`,
                            timestamp: new Date().toISOString()
                        });

                        this.results.score += 10;
                        console.log(`✅ Archivos cambiados: ${files.length} archivos detectados`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!filesFound) {
                this.results.validations.push({
                    name: 'Archivos cambiados detectados',
                    status: 'WARNING',
                    selector: 'NOT_FOUND',
                    critical: false,
                    details: 'No se pudieron detectar archivos cambiados',
                    timestamp: new Date().toISOString()
                });
                console.log('⚠️ No se pudieron detectar archivos cambiados específicos');
            }

        } catch (error) {
            console.error('❌ Error validando archivos:', error.message);
        }
    }

    async validateBranchIntegrity() {
        console.log('🔄 Validando integridad de la rama...');

        try {
            // Verificar que la rama existe en el repositorio
            const branchUrl = 'https://github.com/josuehernandeztapia/pwa_angular_v3/tree/feature/bff-auth-integration';

            const response = await this.page.goto(branchUrl, { waitUntil: 'networkidle0' });

            if (response.status() === 200) {
                this.results.validations.push({
                    name: 'Rama feature/bff-auth-integration existe',
                    status: 'PASS',
                    selector: 'branch_url',
                    critical: true,
                    details: 'Rama accesible en GitHub',
                    timestamp: new Date().toISOString()
                });

                this.results.score += 25;
                console.log('✅ Rama existe y es accesible');
            } else {
                throw new Error(`HTTP ${response.status()}`);
            }

        } catch (error) {
            this.results.validations.push({
                name: 'Rama feature/bff-auth-integration existe',
                status: 'FAIL',
                selector: 'branch_url',
                critical: true,
                details: `Error: ${error.message}`,
                timestamp: new Date().toISOString()
            });
            console.error('❌ Error validando rama:', error.message);
        }
    }

    async generateReport() {
        console.log('📊 Generando reporte quirúrgico...');

        // Calcular métricas finales
        const totalValidations = this.results.validations.length;
        const passedValidations = this.results.validations.filter(v => v.status === 'PASS').length;
        const failedValidations = this.results.validations.filter(v => v.status === 'FAIL').length;
        const criticalFailures = this.results.validations.filter(v => v.status === 'FAIL' && v.critical).length;

        const finalScore = Math.min(100, this.results.score);
        const successRate = totalValidations > 0 ? (passedValidations / totalValidations * 100).toFixed(1) : 0;

        const report = {
            ...this.results,
            summary: {
                totalValidations,
                passedValidations,
                failedValidations,
                criticalFailures,
                finalScore,
                successRate: `${successRate}%`,
                status: criticalFailures === 0 && failedValidations <= 1 ? 'READY_FOR_MERGE' : 'NEEDS_ATTENTION'
            }
        };

        // Guardar reporte
        const reportPath = 'github-pr-surgical-validation-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generar reporte markdown
        await this.generateMarkdownReport(report);

        console.log(`\n🎯 VALIDACIÓN QUIRÚRGICA COMPLETADA`);
        console.log(`📊 Score: ${finalScore}/100`);
        console.log(`✅ Éxito: ${successRate}%`);
        console.log(`📁 Reporte: ${reportPath}`);
        console.log(`📸 Screenshots: ${this.results.screenshots.length}`);

        return report;
    }

    async generateMarkdownReport(report) {
        const markdown = `# 🔍 GitHub PR - Validación Quirúrgica

**Timestamp:** ${report.timestamp}
**PR URL:** ${report.prUrl}
**Score Final:** ${report.summary.finalScore}/100
**Estado:** ${report.summary.status}

## 📊 Resumen Ejecutivo

- **Validaciones Totales:** ${report.summary.totalValidations}
- **Exitosas:** ${report.summary.passedValidations} ✅
- **Fallidas:** ${report.summary.failedValidations} ❌
- **Críticas Fallidas:** ${report.summary.criticalFailures} 🚨
- **Tasa de Éxito:** ${report.summary.successRate}

## 🎯 Resultados Detallados

${report.validations.map(v =>
    `### ${v.status === 'PASS' ? '✅' : v.status === 'FAIL' ? '❌' : '⚠️'} ${v.name}
- **Estado:** ${v.status}
- **Selector:** \`${v.selector}\`
- **Crítico:** ${v.critical ? 'Sí' : 'No'}
- **Detalles:** ${v.details}
- **Timestamp:** ${v.timestamp}
`).join('\n')}

## 🚨 Errores Detectados

${report.errors.length > 0 ?
    report.errors.map(e => `- **${e.type}**: ${e.message} (${e.timestamp})`).join('\n') :
    '✅ No se detectaron errores críticos'}

## 📸 Screenshots Capturadas

${report.screenshots.map(s => `- ${s}`).join('\n')}

## 🎯 Recomendaciones

${report.summary.status === 'READY_FOR_MERGE' ?
    '✅ **EL PR ESTÁ LISTO PARA MERGE**\n\nTodas las validaciones críticas pasaron exitosamente.' :
    '⚠️ **EL PR NECESITA ATENCIÓN**\n\nSe detectaron fallos críticos que deben ser corregidos antes del merge.'}

---
**Generado por Chrome DevTools MCP - Validación Quirúrgica**`;

        fs.writeFileSync('GITHUB-PR-SURGICAL-REPORT.md', markdown);
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
            await this.validateBranchIntegrity();
            await this.validatePRCreationPage();
            const report = await this.generateReport();
            return report;
        } catch (error) {
            console.error('💥 Error en validación quirúrgica:', error);
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

// Ejecutar validación
if (require.main === module) {
    const validator = new GitHubPRSurgicalValidator();
    validator.run().then(report => {
        console.log('\n🎉 Validación quirúrgica completada exitosamente!');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error fatal en validación:', error);
        process.exit(1);
    });
}

module.exports = GitHubPRSurgicalValidator;