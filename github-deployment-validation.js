#!/usr/bin/env node

/**
 * 🚀 VALIDACIÓN DE DEPLOYMENT EN GITHUB
 *
 * Valida el deployment correcto en GitHub Pages / Actions
 * Diagnóstica problemas 404 y routing issues
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class GitHubDeploymentValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            deploymentTests: [],
            screenshots: [],
            errors: [],
            score: 0
        };

        // URLs a validar
        this.urls = [
            'http://localhost:4200/',
            'http://localhost:4200/login',
            'http://localhost:4200/dashboard',
            'http://localhost:4200/cotizadores',
            'http://localhost:4200/clientes',
            'http://localhost:4200/documentos',
            'http://localhost:4200/reportes',
            'http://localhost:4200/configuracion',
            'http://localhost:4200/manifest.webmanifest'
        ];
    }

    async initialize() {
        console.log('🚀 INICIANDO VALIDACIÓN DE DEPLOYMENT EN GITHUB');
        console.log('🔍 Verificando si el deployment está funcionando correctamente');

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1440, height: 900 },
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        });

        this.page = await this.browser.newPage();

        // Monitor errores
        this.page.on('response', response => {
            if (response.status() >= 400) {
                this.results.errors.push({
                    type: 'http_error',
                    status: response.status(),
                    url: response.url(),
                    timestamp: new Date().toISOString()
                });
                console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
            }
        });

        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.results.errors.push({
                    type: 'console_error',
                    message: msg.text(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        console.log('✅ Chrome DevTools MCP inicializado para validación de deployment');
    }

    async validateDeployment() {
        console.log('\n🔍 VALIDANDO DEPLOYMENT EN GITHUB\n');

        for (const url of this.urls) {
            console.log(`🌐 Probando: ${url}`);

            try {
                const startTime = Date.now();

                // Navegar a la URL
                const response = await this.page.goto(url, {
                    waitUntil: 'networkidle0',
                    timeout: 30000
                });

                const loadTime = Date.now() - startTime;
                const status = response.status();

                // Capturar screenshot
                const urlPath = url.replace('http://localhost:4200', '').replace('/', '') || 'root';
                await this.captureScreenshot(`github-deployment-${urlPath}`);

                // Validar contenido
                let contentValid = false;
                if (url.includes('manifest.webmanifest')) {
                    // Validar manifest
                    const content = await response.text();
                    contentValid = content.includes('"name"') && content.includes('"icons"');
                } else {
                    // Validar que no sea una página de error 404
                    const bodyText = await this.page.evaluate(() => document.body.textContent);
                    contentValid = !bodyText.includes('404') &&
                                 !bodyText.includes('Page not found') &&
                                 !bodyText.includes('Cannot GET');
                }

                this.results.deploymentTests.push({
                    url,
                    status,
                    loadTime,
                    contentValid,
                    passed: status === 200 && contentValid,
                    timestamp: new Date().toISOString()
                });

                if (status === 200 && contentValid) {
                    console.log(`  ✅ ${url}: OK (${loadTime}ms)`);
                    this.results.score += 10;
                } else {
                    console.log(`  ❌ ${url}: FAIL (HTTP ${status}, content: ${contentValid})`);
                }

            } catch (error) {
                this.results.deploymentTests.push({
                    url,
                    status: 0,
                    loadTime: 0,
                    contentValid: false,
                    passed: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                console.log(`  💥 ${url}: ERROR - ${error.message}`);
            }

            // Pausa entre requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async validateRouting() {
        console.log('\n🛣️ VALIDANDO ROUTING Y NAVEGACIÓN\n');

        try {
            // Probar navegación SPA
            await this.page.goto('http://localhost:4200/login', { waitUntil: 'networkidle0' });

            // Verificar que los elementos de navegación existan
            const hasNavigation = await this.page.evaluate(() => {
                return document.querySelector('nav') !== null ||
                       document.querySelector('.nav') !== null ||
                       document.querySelector('[role="navigation"]') !== null;
            });

            // Probar navegación programática
            await this.page.evaluate(() => {
                if (window.history && window.history.pushState) {
                    window.history.pushState({}, '', '/dashboard');
                }
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentUrl = this.page.url();
            const routingWorks = currentUrl.includes('/dashboard');

            this.results.deploymentTests.push({
                name: 'SPA Routing Test',
                hasNavigation,
                routingWorks,
                passed: hasNavigation && routingWorks,
                timestamp: new Date().toISOString()
            });

            if (hasNavigation && routingWorks) {
                console.log('✅ SPA Routing: Funcionando correctamente');
                this.results.score += 20;
            } else {
                console.log('❌ SPA Routing: Problemas detectados');
            }

        } catch (error) {
            console.log(`❌ Routing Test: ERROR - ${error.message}`);
        }
    }

    async captureScreenshot(name) {
        try {
            const filename = `github-deployment-${name}-${Date.now()}.png`;
            await this.page.screenshot({
                path: filename,
                fullPage: true
            });
            this.results.screenshots.push(filename);
            console.log(`    📸 Screenshot: ${filename}`);
        } catch (error) {
            console.log(`    ⚠️ Error capturando screenshot: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('\n📊 GENERANDO REPORTE DE DEPLOYMENT\n');

        const totalTests = this.results.deploymentTests.length;
        const passedTests = this.results.deploymentTests.filter(t => t.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

        const finalScore = Math.min(100, this.results.score);

        const report = {
            ...this.results,
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: `${successRate}%`,
                finalScore,
                status: failedTests === 0 ? 'DEPLOYMENT_SUCCESS' : 'DEPLOYMENT_ISSUES'
            }
        };

        // Guardar reporte JSON
        fs.writeFileSync('github-deployment-report.json', JSON.stringify(report, null, 2));

        // Generar reporte Markdown
        const markdown = `# 🚀 GitHub Deployment Validation Report

**Timestamp:** ${report.timestamp}
**Score Final:** ${report.summary.finalScore}/100
**Estado:** ${report.summary.status}

## 📊 Resumen

- **Tests Ejecutados:** ${totalTests}
- **Exitosos:** ${passedTests} ✅
- **Fallidos:** ${failedTests} ❌
- **Tasa de Éxito:** ${report.summary.successRate}

## 🔍 Resultados Detallados

${report.deploymentTests.map(test =>
    `### ${test.passed ? '✅' : '❌'} ${test.url || test.name}
- **Status:** ${test.status || 'N/A'}
- **Load Time:** ${test.loadTime || 'N/A'}ms
- **Content Valid:** ${test.contentValid ? 'Yes' : 'No'}
- **Passed:** ${test.passed ? 'Yes' : 'No'}
${test.error ? `- **Error:** ${test.error}` : ''}
- **Timestamp:** ${test.timestamp}
`).join('\n')}

## 🚨 Errores Detectados

${report.errors.length > 0 ?
    report.errors.map(e => `- **${e.type}**: ${e.message || e.status + ' ' + e.url}`).join('\n') :
    '✅ No se detectaron errores críticos'}

## 📸 Screenshots

${report.screenshots.map(s => `- ${s}`).join('\n')}

## 🎊 CONCLUSIÓN

${report.summary.status === 'DEPLOYMENT_SUCCESS' ?
    '✅ **DEPLOYMENT EXITOSO**\n\nEl deployment en GitHub está funcionando correctamente.' :
    '⚠️ **DEPLOYMENT CON PROBLEMAS**\n\nSe detectaron problemas que necesitan atención para el deployment en GitHub.'}

### 🔧 Recomendaciones

${failedTests > 0 ?
    `- Revisar errores 404 en las URLs fallidas
- Verificar configuración de GitHub Pages
- Validar que el base href esté configurado correctamente
- Confirmar que el servidor está sirviendo archivos estáticos correctamente` :
    '- El deployment está funcionando correctamente\n- Continuar con el monitoreo regular'}

---
**Generado por Chrome DevTools MCP - GitHub Deployment Validation**`;

        fs.writeFileSync('GITHUB-DEPLOYMENT-REPORT.md', markdown);

        console.log(`\n🎉 VALIDACIÓN DE DEPLOYMENT COMPLETADA`);
        console.log(`📊 Score: ${finalScore}/100`);
        console.log(`✅ Éxito: ${successRate}%`);
        console.log(`📁 Reporte: github-deployment-report.json`);
        console.log(`📄 Markdown: GITHUB-DEPLOYMENT-REPORT.md`);

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
            await this.validateDeployment();
            await this.validateRouting();
            const report = await this.generateReport();
            return report;
        } catch (error) {
            console.error('💥 Error en validación de deployment:', error);
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
    const validator = new GitHubDeploymentValidator();
    validator.run().then(report => {
        console.log('\n🎉 Validación de deployment completada!');
        if (report?.summary?.status === 'DEPLOYMENT_SUCCESS') {
            console.log('✅ EL DEPLOYMENT ESTÁ FUNCIONANDO PERFECTAMENTE');
            process.exit(0);
        } else {
            console.log('⚠️ SE DETECTARON PROBLEMAS EN EL DEPLOYMENT');
            process.exit(1);
        }
    }).catch(error => {
        console.error('💥 Error en validación de deployment:', error);
        process.exit(1);
    });
}

module.exports = GitHubDeploymentValidator;