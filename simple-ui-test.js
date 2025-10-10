/**
 * Simple UI Test - Manual validation of navigation components
 */

const puppeteer = require('puppeteer');

async function testUIManually() {
    console.log('🔍 Probando UX/UI manualmente...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    try {
        const page = await browser.newPage();

        // Test 1: Login manual
        console.log('1. Navegando a login...');
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        console.log('   Llenando credenciales manualmente...');
        await page.type('input[type="email"]', 'asesor@conductores.com', { delay: 50 });
        await page.type('input[type="password"]', 'demo123', { delay: 50 });

        console.log('   Enviando formulario...');
        await page.click('button[type="submit"]');

        // Wait for login result
        await new Promise(resolve => setTimeout(resolve, 5000));
        const currentUrl = page.url();
        console.log(`   URL actual: ${currentUrl}`);

        if (currentUrl.includes('/dashboard') || !currentUrl.includes('/login')) {
            console.log('✅ Login exitoso');

            // Test navigation visibility
            console.log('2. Validando elementos de navegación...');
            const navElements = await page.evaluate(() => {
                const navText = document.body.textContent;
                return {
                    hasOnboarding: navText.includes('Onboarding'),
                    hasOperaciones: navText.includes('Operaciones'),
                    hasCotizador: navText.includes('Cotizador'),
                    hasSimulador: navText.includes('Simulador'),
                    hasFlowBuilder: navText.includes('Flow Builder'),
                    hasImportTracker: navText.includes('Import Tracker'),
                    navText: navText.substring(0, 500)
                };
            });

            console.log('   Navegación encontrada:');
            console.log(`   - Onboarding: ${navElements.hasOnboarding ? '✅' : '❌'}`);
            console.log(`   - Operaciones: ${navElements.hasOperaciones ? '✅' : '❌'}`);
            console.log(`   - Cotizador: ${navElements.hasCotizador ? '✅' : '❌'}`);
            console.log(`   - Simulador: ${navElements.hasSimulador ? '✅' : '❌'}`);

            // Test specific components
            console.log('3. Probando rutas específicas...');

            const testRoutes = [
                { url: '/onboarding', name: 'Onboarding' },
                { url: '/cotizador/ags-individual', name: 'AGS Individual' },
                { url: '/simulador/ags-ahorro', name: 'Plan de Ahorro' },
                { url: '/simulador/tanda-colectiva', name: 'Tanda Colectiva' },
                { url: '/ops/deliveries', name: 'Entregas' },
                { url: '/ops/import-tracker', name: 'Import Tracker' },
                { url: '/configuracion/flow-builder', name: 'Flow Builder' }
            ];

            for (const route of testRoutes) {
                try {
                    console.log(`   Probando ${route.name}...`);
                    await page.goto(`http://localhost:4300${route.url}`, {
                        waitUntil: 'networkidle0',
                        timeout: 8000
                    });

                    const pageContent = await page.evaluate(() => {
                        const text = document.body.textContent;
                        return {
                            hasContent: text.length > 100,
                            has404: text.includes('404'),
                            hasError: text.includes('Error') || text.includes('error'),
                            title: document.title || 'Sin título',
                            contentPreview: text.substring(0, 200)
                        };
                    });

                    const success = pageContent.hasContent && !pageContent.has404;
                    console.log(`   ${success ? '✅' : '❌'} ${route.name}: ${success ? 'Funciona' : 'Problema'}`);

                    if (!success) {
                        console.log(`     - Título: ${pageContent.title}`);
                        console.log(`     - Contenido: ${pageContent.contentPreview}`);
                    }

                } catch (error) {
                    console.log(`   ❌ ${route.name}: Error - ${error.message}`);
                }
            }

        } else {
            console.log('❌ Login falló');
        }

        console.log('\n👀 Manteniendo browser abierto para inspección manual...');
        console.log('Presiona Ctrl+C cuando hayas terminado de revisar');
        await new Promise(() => {}); // Wait indefinitely

    } catch (error) {
        console.error('❌ Test falló:', error.message);
    }
}

testUIManually().catch(console.error);