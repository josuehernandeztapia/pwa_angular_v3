/**
 * 🎯 Business Logic Validation - Simplificado y Funcional
 */

const puppeteer = require('puppeteer');

async function validateBusinessLogic() {
    console.log('🏢 VALIDACIÓN COMPLETA DE LÓGICA DE NEGOCIO');
    console.log('==========================================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1400, height: 900 }
    });

    const page = await browser.newPage();

    const businessIssues = [];
    const functionalResults = [];

    // Monitor console errors
    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('DevTools')) {
            console.log(`🚨 Console Error: ${msg.text()}`);
        }
    });

    // Monitor network for 404s
    page.on('response', response => {
        if (response.status() === 404) {
            console.log(`❌ 404: ${response.url()}`);
        }
    });

    try {
        // Login como admin para acceso completo
        console.log('🔑 Iniciando sesión como admin...');
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.clear());

        await page.focus('input[type="email"]');
        await page.type('input[type="email"]', 'admin@conductores.com');
        await page.focus('input[type="password"]');
        await page.type('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Validar simuladores
        console.log('\n📊 VALIDANDO SIMULADORES');
        console.log('========================');

        const simuladores = [
            { name: 'AGS Ahorro', path: '/simulador/ags-ahorro' },
            { name: 'EdoMex Individual', path: '/simulador/edomex-individual' },
            { name: 'Tanda Colectiva', path: '/simulador/tanda-colectiva' }
        ];

        for (const sim of simuladores) {
            await page.goto(`http://localhost:4300${sim.path}`, { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentPath = new URL(page.url()).pathname;
            const hasCalculator = await page.evaluate(() => {
                return document.querySelector('input[type="number"], .calculator, .simulation-form') !== null;
            });

            if (currentPath.startsWith(sim.path.split('?')[0]) && hasCalculator) {
                console.log(`✅ ${sim.name}: Funcional con calculadora`);
                functionalResults.push(`${sim.name}: FUNCIONAL`);
            } else {
                console.log(`❌ ${sim.name}: Sin calculadora o redirección`);
                businessIssues.push(`${sim.name}: Lógica de negocio incompleta`);
            }
        }

        // Validar cotizadores
        console.log('\n💰 VALIDANDO COTIZADORES');
        console.log('========================');

        const cotizadores = [
            { name: 'AGS Individual', path: '/cotizador/ags-individual' },
            { name: 'EdoMex Colectivo', path: '/cotizador/edomex-colectivo' }
        ];

        for (const cot of cotizadores) {
            await page.goto(`http://localhost:4300${cot.path}`, { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentPath = new URL(page.url()).pathname;
            const hasQuotingForm = await page.evaluate(() => {
                return document.querySelector('.quote-form, .cotizacion-form, input[placeholder*="prima"], input[placeholder*="costo"]') !== null;
            });

            if (currentPath.startsWith(cot.path.split('?')[0]) && hasQuotingForm) {
                console.log(`✅ ${cot.name}: Funcional con formulario cotización`);
                functionalResults.push(`${cot.name}: FUNCIONAL`);
            } else {
                console.log(`❌ ${cot.name}: Sin formulario de cotización`);
                businessIssues.push(`${cot.name}: Lógica de cotización faltante`);
            }
        }

        // Validar módulos especializados
        console.log('\n🛡️ VALIDANDO MÓDULOS ESPECIALIZADOS');
        console.log('===================================');

        const modulos = [
            { name: 'Protección', path: '/proteccion' },
            { name: 'Claims', path: '/claims' },
            { name: 'Nueva Oportunidad', path: '/nueva-oportunidad' },
            { name: 'Documentos', path: '/documentos' }
        ];

        for (const mod of modulos) {
            await page.goto(`http://localhost:4300${mod.path}`, { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const currentPath = new URL(page.url()).pathname;
            const hasContent = await page.evaluate(() => {
                const content = document.body.innerText.trim();
                return content.length > 100 && !content.includes('404') && !content.includes('Not Found');
            });

            if (currentPath.startsWith(mod.path.split('?')[0]) && hasContent) {
                console.log(`✅ ${mod.name}: Módulo cargado con contenido`);
                functionalResults.push(`${mod.name}: FUNCIONAL`);
            } else {
                console.log(`❌ ${mod.name}: Sin contenido o redirección`);
                businessIssues.push(`${mod.name}: Módulo incompleto`);
            }
        }

        // Test generación PDF
        console.log('\n📄 VALIDANDO GENERACIÓN DE PDFs');
        console.log('================================');

        const pdfButton = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, .btn'));
            return buttons.some(btn => btn.textContent.toLowerCase().includes('pdf') ||
                               btn.textContent.toLowerCase().includes('descargar') ||
                               btn.textContent.toLowerCase().includes('imprimir'));
        });

        if (pdfButton) {
            console.log('✅ Botones de PDF encontrados');
            functionalResults.push('PDF Generation: DISPONIBLE');
        } else {
            console.log('❌ Sin funcionalidad de PDF visible');
            businessIssues.push('PDF Generation: FALTANTE');
        }

        // Test IndexedDB
        console.log('\n💾 VALIDANDO INDEXEDDB');
        console.log('======================');

        const indexedDBUsage = await page.evaluate(async () => {
            try {
                const databases = await indexedDB.databases();
                const hasAppData = databases.some(db => db.name && db.name.includes('conductor'));
                return { available: true, hasAppData, dbCount: databases.length };
            } catch (e) {
                return { available: false, error: e.message };
            }
        });

        if (indexedDBUsage.available && indexedDBUsage.hasAppData) {
            console.log(`✅ IndexedDB funcional con ${indexedDBUsage.dbCount} bases de datos`);
            functionalResults.push('IndexedDB: FUNCIONAL');
        } else {
            console.log('❌ IndexedDB sin datos de aplicación');
            businessIssues.push('IndexedDB: CONFIGURACIÓN INCOMPLETA');
        }

        // Reporte final
        console.log('\n📊 REPORTE FINAL DE LÓGICA DE NEGOCIO');
        console.log('=====================================');

        console.log(`\n✅ Módulos Funcionales: ${functionalResults.length}`);
        functionalResults.forEach(result => console.log(`   - ${result}`));

        console.log(`\n❌ Issues Encontrados: ${businessIssues.length}`);
        businessIssues.forEach(issue => console.log(`   - ${issue}`));

        const completionRate = (functionalResults.length / (functionalResults.length + businessIssues.length)) * 100;
        console.log(`\n📈 Tasa de Completitud: ${completionRate.toFixed(1)}%`);

        if (completionRate >= 90) {
            console.log('\n🎉 LÓGICA DE NEGOCIO 90%+ FUNCIONAL');
        } else if (completionRate >= 70) {
            console.log('\n⚠️ LÓGICA DE NEGOCIO PARCIALMENTE FUNCIONAL');
            console.log('🔧 Requiere completar módulos faltantes');
        } else {
            console.log('\n🚨 LÓGICA DE NEGOCIO REQUIERE TRABAJO SIGNIFICATIVO');
            console.log('🛠️ Múltiples módulos necesitan implementación');
        }

        await page.screenshot({ path: 'business-logic-validation.png', fullPage: true });

    } catch (error) {
        console.error('❌ Error en validación:', error);
    }

    console.log('\n🔍 Browser abierto para inspección manual...');
}

validateBusinessLogic().catch(console.error);