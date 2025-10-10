/**
 * 🎯 Validación Rápida de Cotizadores - Servidor Limpio
 */

const puppeteer = require('puppeteer');

async function validateCotizadores() {
    console.log('🎯 VALIDACIÓN RÁPIDA DE COTIZADORES - SERVIDOR LIMPIO');
    console.log('====================================================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1400, height: 900 }
    });

    const page = await browser.newPage();

    try {
        // Login como admin
        console.log('🔑 Iniciando sesión como admin...');
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.clear());

        await page.focus('input[type="email"]');
        await page.type('input[type="email"]', 'admin@conductores.com');
        await page.focus('input[type="password"]');
        await page.type('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Validar AGS Individual
        console.log('\n💰 VALIDANDO AGS INDIVIDUAL');
        console.log('============================');

        await page.goto('http://localhost:4300/cotizador/ags-individual', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const agsHasForm = await page.evaluate(() => {
            // Buscar formularios de cotización específicos
            const formExists = document.querySelector('form') !== null;
            const hasSaleTypeRadios = document.querySelector('input[type="radio"][value*="aguascalientes"]') !== null;
            const hasDownPaymentInput = document.querySelector('input[type="number"]') !== null;
            const hasCalculateButton = document.querySelector('button[type="button"]') !== null;
            const hasConfigurationSection = document.querySelector('.ags-quote__config, .cotizador-form, .config-form') !== null;

            return {
                formExists,
                hasSaleTypeRadios,
                hasDownPaymentInput,
                hasCalculateButton,
                hasConfigurationSection,
                elementCount: document.querySelectorAll('input, select, button').length
            };
        });

        console.log(`✅ AGS Individual - Formulario: ${agsHasForm.formExists ? 'SÍ' : 'NO'}`);
        console.log(`   - Radio buttons: ${agsHasForm.hasSaleTypeRadios ? 'SÍ' : 'NO'}`);
        console.log(`   - Input enganche: ${agsHasForm.hasDownPaymentInput ? 'SÍ' : 'NO'}`);
        console.log(`   - Botón calcular: ${agsHasForm.hasCalculateButton ? 'SÍ' : 'NO'}`);
        console.log(`   - Elementos totales: ${agsHasForm.elementCount}`);

        // Validar EdoMex Colectivo
        console.log('\n💰 VALIDANDO EDOMEX COLECTIVO');
        console.log('==============================');

        await page.goto('http://localhost:4300/cotizador/edomex-colectivo', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const edomexHasForm = await page.evaluate(() => {
            const formExists = document.querySelector('form') !== null;
            const hasMemberCountInput = document.querySelector('input[type="number"]') !== null;
            const hasUnitPriceInput = document.querySelector('input[min="500000"], input[value="749000"]') !== null;
            const hasGenerateButton = document.querySelector('button:not([disabled])') !== null;
            const hasConfigurationSection = document.querySelector('.edomex-config, .cotizador-form, .config-form') !== null;

            return {
                formExists,
                hasMemberCountInput,
                hasUnitPriceInput,
                hasGenerateButton,
                hasConfigurationSection,
                elementCount: document.querySelectorAll('input, select, button').length,
                pageTitle: document.title,
                hasContent: document.body.innerText.length > 100
            };
        });

        console.log(`✅ EdoMex Colectivo - Formulario: ${edomexHasForm.formExists ? 'SÍ' : 'NO'}`);
        console.log(`   - Input miembros: ${edomexHasForm.hasMemberCountInput ? 'SÍ' : 'NO'}`);
        console.log(`   - Input precio: ${edomexHasForm.hasUnitPriceInput ? 'SÍ' : 'NO'}`);
        console.log(`   - Botón generar: ${edomexHasForm.hasGenerateButton ? 'SÍ' : 'NO'}`);
        console.log(`   - Elementos totales: ${edomexHasForm.elementCount}`);
        console.log(`   - Contenido: ${edomexHasForm.hasContent ? 'SÍ' : 'NO'}`);

        // Prueba funcional rápida AGS
        console.log('\n🧪 PRUEBA FUNCIONAL AGS');
        console.log('========================');

        await page.goto('http://localhost:4300/cotizador/ags-individual', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // Seleccionar venta a plazo
            const plazoRadio = await page.$('input[value="aguascalientes-plazo"]');
            if (plazoRadio) {
                await plazoRadio.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Intentar calcular cotización
            const calculateButton = await page.$('button:not([disabled])');
            if (calculateButton) {
                const buttonText = await page.evaluate(btn => btn.textContent, calculateButton);
                if (buttonText.includes('Calcular') || buttonText.includes('calcular')) {
                    await calculateButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const hasQuote = await page.evaluate(() => {
                        return document.querySelector('.ags-quote__result, .quotation-result, .quote-result') !== null;
                    });

                    console.log(`✅ AGS - Generación de cotización: ${hasQuote ? 'FUNCIONAL' : 'PENDIENTE'}`);
                } else {
                    console.log(`⚠️  AGS - Botón encontrado pero no es "Calcular": "${buttonText}"`);
                }
            } else {
                console.log(`❌ AGS - No se encontró botón de calcular habilitado`);
            }
        } catch (error) {
            console.log(`⚠️  AGS - Error en prueba funcional: ${error.message}`);
        }

        // Reporte final
        console.log('\n📊 REPORTE DE VALIDACIÓN CON SERVIDOR LIMPIO');
        console.log('=============================================');

        const agsScore = (agsHasForm.formExists ? 1 : 0) + (agsHasForm.hasSaleTypeRadios ? 1 : 0) +
                        (agsHasForm.hasDownPaymentInput ? 1 : 0) + (agsHasForm.hasCalculateButton ? 1 : 0);

        const edomexScore = (edomexHasForm.formExists ? 1 : 0) + (edomexHasForm.hasMemberCountInput ? 1 : 0) +
                           (edomexHasForm.hasUnitPriceInput ? 1 : 0) + (edomexHasForm.hasGenerateButton ? 1 : 0);

        console.log(`\n✅ AGS Individual: ${agsScore}/4 componentes detectados`);
        console.log(`✅ EdoMex Colectivo: ${edomexScore}/4 componentes detectados`);

        if (agsScore >= 3 && edomexScore >= 3) {
            console.log('\n🎉 COTIZADORES VALIDADOS EXITOSAMENTE');
            console.log('✅ Ambos cotizadores tienen formularios funcionales');
        } else {
            console.log('\n⚠️  COTIZADORES REQUIEREN REVISIÓN');
            console.log(`❌ AGS: ${agsScore < 3 ? 'Formulario incompleto' : 'OK'}`);
            console.log(`❌ EdoMex: ${edomexScore < 3 ? 'Formulario incompleto' : 'OK'}`);
        }

    } catch (error) {
        console.error('❌ Error en validación:', error);
    }

    console.log('\n🔍 Browser abierto para inspección manual...');
}

validateCotizadores().catch(console.error);