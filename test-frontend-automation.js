/**
 * 🧪 Frontend Testing Automation Script
 * Tests the PWA Angular v3 authentication flow and functionality
 */

const puppeteer = require('puppeteer');

async function runFrontendTests() {
    console.log('🚀 Iniciando pruebas de frontend automatizadas...\n');

    const browser = await puppeteer.launch({
        headless: false, // Para poder ver las pruebas en acción
        defaultViewport: { width: 1200, height: 800 },
        args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();

    try {
        // 📊 Configurar métricas de performance
        await page.setRequestInterception(true);
        const resourceSizes = [];

        page.on('request', (request) => {
            request.continue();
        });

        page.on('response', (response) => {
            resourceSizes.push({
                url: response.url(),
                status: response.status(),
                size: response.headers()['content-length'] || 'unknown'
            });
        });

        // 🔍 Test 1: Cargar aplicación principal
        console.log('📱 Test 1: Cargando aplicación principal...');
        const startTime = Date.now();

        await page.goto('http://localhost:4300', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const loadTime = Date.now() - startTime;
        console.log(`   ✅ Aplicación cargada en ${loadTime}ms`);

        // Verificar que redirige al login (por el AuthGuard)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const currentUrl = page.url();
        console.log(`   📍 URL actual: ${currentUrl}`);

        // 🔐 Test 2: Probar formulario de login
        console.log('\n🔐 Test 2: Probando formulario de login...');

        // Verificar que el formulario existe
        const loginForm = await page.$('form');
        if (loginForm) {
            console.log('   ✅ Formulario de login encontrado');

            // Tomar screenshot del estado inicial
            await page.screenshot({
                path: 'test-screenshots/01-login-form.png',
                fullPage: true
            });

            // Probar validaciones de campo vacío
            const submitButton = await page.$('button[type="submit"]');
            if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));

                const errorMessages = await page.$$('.error-message');
                console.log(`   ⚠️  Mensajes de error mostrados: ${errorMessages.length}`);

                // Tomar screenshot de validaciones
                await page.screenshot({
                    path: 'test-screenshots/02-validation-errors.png',
                    fullPage: true
                });
            }

            // Probar login con credenciales demo
            console.log('   🔑 Probando credenciales demo...');

            const emailField = await page.$('input[type="email"]');
            const passwordField = await page.$('input[type="password"]');

            if (emailField && passwordField) {
                await emailField.clear();
                await emailField.type('asesor@conductores.com');
                await passwordField.clear();
                await passwordField.type('demo123');

                // Tomar screenshot con credenciales
                await page.screenshot({
                    path: 'test-screenshots/03-credentials-filled.png',
                    fullPage: true
                });

                await submitButton.click();
                console.log('   📤 Formulario enviado, esperando respuesta...');

                // Esperar a que cambie la URL o aparezca el dashboard
                try {
                    await page.waitForNavigation({
                        waitUntil: 'networkidle2',
                        timeout: 5000
                    });

                    const newUrl = page.url();
                    console.log(`   ✅ Login exitoso! Redirigido a: ${newUrl}`);

                    // Tomar screenshot del dashboard
                    await page.screenshot({
                        path: 'test-screenshots/04-dashboard-logged-in.png',
                        fullPage: true
                    });

                } catch (e) {
                    console.log('   ⏱️  Timeout esperando navegación, revisando estado actual...');

                    const loadingSpinner = await page.$('.loading');
                    if (loadingSpinner) {
                        console.log('   🔄 Spinner de carga detectado');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }

                    const finalUrl = page.url();
                    console.log(`   📍 URL final: ${finalUrl}`);
                }
            }

        } else {
            console.log('   ❌ Formulario de login no encontrado');
        }

        // 📊 Test 3: Métricas de performance
        console.log('\n📊 Test 3: Analizando métricas de performance...');

        const metrics = await page.metrics();
        console.log('   📈 Métricas principales:');
        console.log(`      - DOM Nodes: ${metrics.Nodes}`);
        console.log(`      - JS Heap Used: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`      - JS Heap Total: ${(metrics.JSHeapTotalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`      - Script Duration: ${metrics.ScriptDuration.toFixed(2)}ms`);
        console.log(`      - Task Duration: ${metrics.TaskDuration.toFixed(2)}ms`);

        // 🎨 Test 4: Verificar tema oscuro por defecto
        console.log('\n🎨 Test 4: Verificando tema y estilos...');

        const htmlClass = await page.evaluate(() => {
            return document.documentElement.className;
        });
        console.log(`   🌙 Clase del HTML: "${htmlClass}"`);

        const isDarkMode = htmlClass.includes('dark');
        console.log(`   ${isDarkMode ? '✅' : '❌'} Tema oscuro ${isDarkMode ? 'activado' : 'no detectado'}`);

        // 📱 Test 5: Responsividad
        console.log('\n📱 Test 5: Probando responsividad...');

        const viewports = [
            { width: 375, height: 667, name: 'iPhone SE' },
            { width: 768, height: 1024, name: 'iPad' },
            { width: 1920, height: 1080, name: 'Desktop FHD' }
        ];

        for (const viewport of viewports) {
            await page.setViewport(viewport);
            await new Promise(resolve => setTimeout(resolve, 1000));

            await page.screenshot({
                path: `test-screenshots/05-responsive-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
                fullPage: true
            });

            console.log(`   📱 Screenshot capturado para ${viewport.name} (${viewport.width}x${viewport.height})`);
        }

        // 🔍 Test 6: Verificar elementos clave de PWA
        console.log('\n🔍 Test 6: Verificando características PWA...');

        const manifestLink = await page.$('link[rel="manifest"]');
        console.log(`   ${manifestLink ? '✅' : '❌'} Web App Manifest ${manifestLink ? 'encontrado' : 'no encontrado'}`);

        const serviceWorkerScript = await page.evaluate(() => {
            return 'serviceWorker' in navigator;
        });
        console.log(`   ${serviceWorkerScript ? '✅' : '❌'} Service Worker ${serviceWorkerScript ? 'soportado' : 'no soportado'}`);

        // 🎯 Test 7: Accessibility básica
        console.log('\n🎯 Test 7: Verificando accesibilidad básica...');

        const altTexts = await page.$$eval('img', imgs => {
            return imgs.map(img => ({
                src: img.src,
                alt: img.alt,
                hasAlt: !!img.alt
            }));
        });

        const imagesWithoutAlt = altTexts.filter(img => !img.hasAlt);
        console.log(`   📊 Imágenes totales: ${altTexts.length}`);
        console.log(`   ${imagesWithoutAlt.length === 0 ? '✅' : '⚠️ '} Imágenes sin alt text: ${imagesWithoutAlt.length}`);

        const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headings => {
            return headings.map(h => ({
                tag: h.tagName,
                text: h.textContent?.trim()
            }));
        });

        console.log(`   📝 Estructura de headings encontrada: ${headings.length} elementos`);
        headings.forEach((heading, i) => {
            if (i < 5) { // Mostrar solo los primeros 5
                console.log(`      ${heading.tag}: "${heading.text?.substring(0, 50)}..."`);
            }
        });

        console.log('\n🎉 ¡Pruebas de frontend completadas!');
        console.log('📸 Screenshots guardados en: test-screenshots/');

        return {
            loadTime,
            metrics,
            resourceSizes: resourceSizes.slice(0, 10), // Primeros 10 recursos
            accessibility: {
                totalImages: altTexts.length,
                imagesWithoutAlt: imagesWithoutAlt.length,
                headingsCount: headings.length
            }
        };

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);

        // Tomar screenshot del error
        await page.screenshot({
            path: 'test-screenshots/error-state.png',
            fullPage: true
        });

        throw error;

    } finally {
        await browser.close();
    }
}

// Crear directorio para screenshots si no existe
const fs = require('fs').promises;

async function ensureScreenshotsDir() {
    try {
        await fs.mkdir('test-screenshots', { recursive: true });
    } catch (error) {
        // Directorio ya existe
    }
}

// Ejecutar pruebas
(async () => {
    try {
        await ensureScreenshotsDir();
        const results = await runFrontendTests();

        console.log('\n📋 RESUMEN DE RESULTADOS:');
        console.log('=====================================');
        console.log(`⏱️  Tiempo de carga: ${results.loadTime}ms`);
        console.log(`🧠 Memoria JS usada: ${(results.metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`🖼️  Imágenes sin alt: ${results.accessibility.imagesWithoutAlt}/${results.accessibility.totalImages}`);
        console.log(`📝 Headings encontrados: ${results.accessibility.headingsCount}`);
        console.log('\n✅ Todas las pruebas ejecutadas correctamente!');

    } catch (error) {
        console.error('\n❌ Error general:', error.message);
        process.exit(1);
    }
})();