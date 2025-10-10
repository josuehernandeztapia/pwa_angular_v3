/**
 * 🚀 Advanced Frontend Testing with Chrome DevTools Integration
 * PWA Angular v3 - Comprehensive Testing Suite
 */

const puppeteer = require('puppeteer');

class AdvancedFrontendTester {
    constructor() {
        this.results = {
            performance: {},
            security: {},
            accessibility: {},
            functionality: {},
            pwa: {},
            authentication: {}
        };
    }

    async runComprehensiveTests() {
        console.log('🚀 INICIANDO SUITE AVANZADA DE PRUEBAS FRONTEND\n');
        console.log('📊 Configurando entorno de testing...');

        const browser = await puppeteer.launch({
            headless: false, // Mostrar navegador para debugging
            devtools: true,  // Abrir DevTools automáticamente
            defaultViewport: { width: 1200, height: 800 },
            args: [
                '--no-sandbox',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-extensions',
                '--no-first-run',
                '--enable-automation'
            ]
        });

        const page = await browser.newPage();

        try {
            // 📊 Configurar monitoring detallado
            await this.setupPerformanceMonitoring(page);

            // 🔐 Test 1: Flujo de Autenticación Completo
            await this.testAuthenticationFlow(page);

            // ⚡ Test 2: Análisis de Performance Detallado
            await this.testPerformanceMetrics(page);

            // 🎯 Test 3: Auditoría de Accesibilidad
            await this.testAccessibility(page);

            // 📱 Test 4: Características PWA
            await this.testPWACapabilities(page);

            // 🔒 Test 5: Análisis de Seguridad
            await this.testSecurityFeatures(page);

            // 📊 Test 6: Responsividad Avanzada
            await this.testAdvancedResponsiveness(page);

            // 🎨 Test 7: UI/UX Quality Assessment
            await this.testUIUXQuality(page);

            // 📈 Generar reporte final
            await this.generateFinalReport();

        } catch (error) {
            console.error('❌ Error durante las pruebas:', error);
            await page.screenshot({
                path: 'test-screenshots/critical-error.png',
                fullPage: true
            });
        } finally {
            // Mantener navegador abierto para inspección manual
            console.log('\n🔍 Navegador mantenido abierto para inspección manual...');
            console.log('📌 Presiona Ctrl+C para cerrar cuando termines de revisar');

            // No cerrar el browser automáticamente
            // await browser.close();
        }
    }

    async setupPerformanceMonitoring(page) {
        console.log('⚙️  Configurando monitoring de performance...');

        // Interceptar requests
        await page.setRequestInterception(true);
        this.results.performance.requests = [];
        this.results.performance.resources = [];

        page.on('request', (request) => {
            this.results.performance.requests.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType(),
                timestamp: Date.now()
            });
            request.continue();
        });

        page.on('response', (response) => {
            this.results.performance.resources.push({
                url: response.url(),
                status: response.status(),
                contentLength: response.headers()['content-length'] || 0,
                contentType: response.headers()['content-type'] || 'unknown',
                timing: response.timing(),
                timestamp: Date.now()
            });
        });

        // Capturar errores de consola
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('🚨 Error de consola:', msg.text());
            }
        });

        console.log('   ✅ Performance monitoring configurado');
    }

    async testAuthenticationFlow(page) {
        console.log('\n🔐 TEST 1: FLUJO DE AUTENTICACIÓN COMPLETO');
        console.log('=====================================');

        const startTime = Date.now();

        // Navegar a la aplicación
        console.log('📱 Cargando aplicación...');
        await page.goto('http://localhost:4300', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Esperar a que Angular termine de cargar
        console.log('⏳ Esperando carga completa de Angular...');
        await page.waitForFunction(() => {
            return window.ng !== undefined || document.querySelector('app-root') !== null;
        }, { timeout: 15000 });

        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar render

        const loadTime = Date.now() - startTime;
        console.log(`   ⏱️  Tiempo de carga total: ${loadTime}ms`);

        // Screenshot inicial
        await page.screenshot({
            path: 'test-screenshots/01-app-loaded.png',
            fullPage: true
        });

        // Verificar URL actual
        const currentUrl = page.url();
        console.log(`   📍 URL actual: ${currentUrl}`);

        // Buscar elementos de login más específicamente
        console.log('🔍 Buscando elementos de autenticación...');

        const authElements = await page.evaluate(() => {
            const elements = {
                loginForm: !!document.querySelector('form'),
                emailInput: !!document.querySelector('input[type="email"], input[name="email"], input[formControlName="email"]'),
                passwordInput: !!document.querySelector('input[type="password"], input[name="password"], input[formControlName="password"]'),
                submitButton: !!document.querySelector('button[type="submit"], button.btn-primary'),
                loginComponent: !!document.querySelector('app-login'),
                loginText: document.body.innerText.toLowerCase().includes('login') || document.body.innerText.toLowerCase().includes('iniciar'),
                authText: document.body.innerText.toLowerCase().includes('email') || document.body.innerText.toLowerCase().includes('contraseña')
            };

            return {
                ...elements,
                bodyContent: document.body.innerText.substring(0, 500),
                htmlContent: document.documentElement.outerHTML.substring(0, 1000)
            };
        });

        console.log('   🔍 Elementos encontrados:');
        console.log(`      - Formulario: ${authElements.loginForm ? '✅' : '❌'}`);
        console.log(`      - Input Email: ${authElements.emailInput ? '✅' : '❌'}`);
        console.log(`      - Input Password: ${authElements.passwordInput ? '✅' : '❌'}`);
        console.log(`      - Botón Submit: ${authElements.submitButton ? '✅' : '❌'}`);
        console.log(`      - Componente Login: ${authElements.loginComponent ? '✅' : '❌'}`);
        console.log(`      - Texto Login: ${authElements.loginText ? '✅' : '❌'}`);
        console.log(`      - Texto Auth: ${authElements.authText ? '✅' : '❌'}`);

        // Mostrar contenido de la página para debugging
        console.log('📝 Primeros 200 caracteres del contenido:');
        console.log(`"${authElements.bodyContent.substring(0, 200)}..."`);

        // Intentar login si encontramos elementos
        if (authElements.emailInput && authElements.passwordInput) {
            await this.performLogin(page);
        } else {
            console.log('⚠️  No se encontraron elementos de login, revisando rutas...');

            // Intentar navegar directamente a /login
            try {
                await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle2' });
                await new Promise(resolve => setTimeout(resolve, 2000));

                await page.screenshot({
                    path: 'test-screenshots/02-login-direct.png',
                    fullPage: true
                });

                const loginPageElements = await page.evaluate(() => ({
                    hasForm: !!document.querySelector('form'),
                    hasEmail: !!document.querySelector('input[type="email"]'),
                    hasPassword: !!document.querySelector('input[type="password"]')
                }));

                if (loginPageElements.hasForm) {
                    console.log('   ✅ Formulario de login encontrado en /login');
                    await this.performLogin(page);
                } else {
                    console.log('   ❌ No se encontró formulario de login en /login');
                }

            } catch (e) {
                console.log('   ⚠️  Error navegando a /login:', e.message);
            }
        }

        this.results.authentication = {
            loadTime,
            currentUrl,
            elementsFound: authElements,
            loginAttempted: authElements.emailInput && authElements.passwordInput
        };
    }

    async performLogin(page) {
        console.log('🔑 Intentando login con credenciales demo...');

        try {
            // Llenar formulario
            await page.type('input[type="email"], input[formControlName="email"]', 'asesor@conductores.com');
            await page.type('input[type="password"], input[formControlName="password"]', 'demo123');

            console.log('   📝 Credenciales ingresadas');

            // Screenshot con credenciales
            await page.screenshot({
                path: 'test-screenshots/03-credentials-filled.png',
                fullPage: true
            });

            // Hacer submit
            await page.click('button[type="submit"], .btn-primary');
            console.log('   📤 Formulario enviado');

            // Esperar respuesta
            await page.waitForTimeout(3000);

            const finalUrl = page.url();
            console.log(`   📍 URL después del login: ${finalUrl}`);

            await page.screenshot({
                path: 'test-screenshots/04-after-login.png',
                fullPage: true
            });

            if (finalUrl.includes('/dashboard') || finalUrl.includes('/home')) {
                console.log('   ✅ Login exitoso - Redirigido al dashboard');
                this.results.authentication.loginSuccessful = true;
            } else {
                console.log('   ⚠️  Login status incierto - URL no cambió');
                this.results.authentication.loginSuccessful = false;
            }

        } catch (error) {
            console.log('   ❌ Error durante el login:', error.message);
            this.results.authentication.loginError = error.message;
        }
    }

    async testPerformanceMetrics(page) {
        console.log('\n⚡ TEST 2: ANÁLISIS DETALLADO DE PERFORMANCE');
        console.log('==========================================');

        // Core Web Vitals
        const coreWebVitals = await page.evaluate(() => {
            return new Promise((resolve) => {
                const vitals = {};

                // LCP (Largest Contentful Paint)
                if ('PerformanceObserver' in window) {
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        vitals.LCP = lastEntry.startTime;
                    }).observe({ entryTypes: ['largest-contentful-paint'] });

                    // FID se mide con user interaction, simulamos con CLS
                    new PerformanceObserver((list) => {
                        let cls = 0;
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                cls += entry.value;
                            }
                        }
                        vitals.CLS = cls;
                    }).observe({ entryTypes: ['layout-shift'] });
                }

                // Timing básico
                const timing = performance.timing;
                vitals.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
                vitals.loadComplete = timing.loadEventEnd - timing.navigationStart;

                setTimeout(() => resolve(vitals), 2000);
            });
        });

        console.log('📊 Core Web Vitals:');
        console.log(`   🎨 LCP: ${coreWebVitals.LCP?.toFixed(2) || 'N/A'}ms`);
        console.log(`   📐 CLS: ${coreWebVitals.CLS?.toFixed(3) || 'N/A'}`);
        console.log(`   ⚡ DOM Ready: ${coreWebVitals.domContentLoaded}ms`);
        console.log(`   🏁 Load Complete: ${coreWebVitals.loadComplete}ms`);

        // Métricas de memoria y CPU
        const metrics = await page.metrics();
        console.log('\n🧠 Métricas de Recursos:');
        console.log(`   💾 JS Heap: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📊 DOM Nodes: ${metrics.Nodes}`);
        console.log(`   🔄 Script Duration: ${metrics.ScriptDuration.toFixed(2)}ms`);
        console.log(`   ⏱️  Task Duration: ${metrics.TaskDuration.toFixed(2)}ms`);

        // Análisis de recursos cargados
        const resourceSummary = this.analyzeResources();
        console.log('\n📦 Análisis de Recursos:');
        console.log(`   📄 Total requests: ${resourceSummary.totalRequests}`);
        console.log(`   📊 JS files: ${resourceSummary.jsFiles}`);
        console.log(`   🎨 CSS files: ${resourceSummary.cssFiles}`);
        console.log(`   🖼️  Images: ${resourceSummary.images}`);
        console.log(`   ⚡ Avg response time: ${resourceSummary.avgResponseTime}ms`);

        this.results.performance = {
            ...this.results.performance,
            coreWebVitals,
            metrics,
            resourceSummary
        };
    }

    analyzeResources() {
        const resources = this.results.performance.resources;
        return {
            totalRequests: resources.length,
            jsFiles: resources.filter(r => r.contentType?.includes('javascript')).length,
            cssFiles: resources.filter(r => r.contentType?.includes('css')).length,
            images: resources.filter(r => r.contentType?.includes('image')).length,
            avgResponseTime: resources.reduce((sum, r) => sum + (r.timing?.responseEnd - r.timing?.responseStart || 0), 0) / resources.length || 0
        };
    }

    async testAccessibility(page) {
        console.log('\n🎯 TEST 3: AUDITORÍA DE ACCESIBILIDAD');
        console.log('=====================================');

        // Evaluar estructura semántica
        const accessibility = await page.evaluate(() => {
            const results = {};

            // Headings hierarchy
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            results.headings = headings.map(h => ({
                tag: h.tagName,
                text: h.textContent.trim().substring(0, 50),
                hasId: !!h.id
            }));

            // Images con alt text
            const images = Array.from(document.querySelectorAll('img'));
            results.images = {
                total: images.length,
                withAlt: images.filter(img => img.alt).length,
                withoutAlt: images.filter(img => !img.alt).length
            };

            // Form labels
            const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
            results.formElements = {
                total: inputs.length,
                withLabels: inputs.filter(input => {
                    const id = input.id;
                    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
                    const ariaLabel = input.getAttribute('aria-label');
                    return label || ariaLabel;
                }).length
            };

            // Color contrast (básico)
            results.colorContrast = {
                backgroundColors: Array.from(new Set([...document.querySelectorAll('*')].map(el =>
                    getComputedStyle(el).backgroundColor
                ).filter(bg => bg !== 'rgba(0, 0, 0, 0)'))).slice(0, 5),
                textColors: Array.from(new Set([...document.querySelectorAll('*')].map(el =>
                    getComputedStyle(el).color
                ).filter(color => color !== 'rgba(0, 0, 0, 0)'))).slice(0, 5)
            };

            // ARIA attributes
            const ariaElements = Array.from(document.querySelectorAll('[aria-label], [aria-describedby], [role]'));
            results.aria = {
                total: ariaElements.length,
                roles: Array.from(new Set(ariaElements.map(el => el.getAttribute('role')).filter(Boolean)))
            };

            return results;
        });

        console.log('📝 Estructura Semántica:');
        console.log(`   📑 Headings encontrados: ${accessibility.headings.length}`);
        accessibility.headings.slice(0, 3).forEach((heading, i) => {
            console.log(`      ${heading.tag}: "${heading.text}..."`);
        });

        console.log('\n🖼️  Análisis de Imágenes:');
        console.log(`   📊 Total: ${accessibility.images.total}`);
        console.log(`   ✅ Con alt text: ${accessibility.images.withAlt}`);
        console.log(`   ❌ Sin alt text: ${accessibility.images.withoutAlt}`);

        console.log('\n📝 Elementos de Formulario:');
        console.log(`   📊 Total inputs: ${accessibility.formElements.total}`);
        console.log(`   🏷️  Con labels: ${accessibility.formElements.withLabels}`);

        console.log('\n🎨 Análisis de Color:');
        console.log(`   🎨 Colores de fondo: ${accessibility.colorContrast.backgroundColors.length} únicos`);
        console.log(`   📝 Colores de texto: ${accessibility.colorContrast.textColors.length} únicos`);

        console.log('\n♿ ARIA y Roles:');
        console.log(`   📊 Elementos con ARIA: ${accessibility.aria.total}`);
        console.log(`   🎭 Roles encontrados: ${accessibility.aria.roles.join(', ') || 'Ninguno'}`);

        this.results.accessibility = accessibility;
    }

    async testPWACapabilities(page) {
        console.log('\n📱 TEST 4: CAPACIDADES PWA');
        console.log('===========================');

        const pwaFeatures = await page.evaluate(() => {
            const features = {};

            // Service Worker
            features.serviceWorker = {
                supported: 'serviceWorker' in navigator,
                registered: false
            };

            if (features.serviceWorker.supported) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    features.serviceWorker.registered = registrations.length > 0;
                });
            }

            // Manifest
            const manifestLink = document.querySelector('link[rel="manifest"]');
            features.manifest = {
                present: !!manifestLink,
                href: manifestLink?.href || null
            };

            // Offline capabilities
            features.offline = {
                onlineStatus: navigator.onLine,
                cacheAPI: 'caches' in window,
                localStorage: 'localStorage' in window,
                indexedDB: 'indexedDB' in window
            };

            // Push notifications
            features.notifications = {
                supported: 'Notification' in window,
                permission: Notification?.permission || 'not-supported'
            };

            // Device APIs
            features.deviceAPIs = {
                geolocation: 'geolocation' in navigator,
                camera: 'mediaDevices' in navigator,
                vibration: 'vibrate' in navigator,
                battery: 'getBattery' in navigator
            };

            return features;
        });

        console.log('🔧 Service Worker:');
        console.log(`   ✅ Soportado: ${pwaFeatures.serviceWorker.supported ? 'Sí' : 'No'}`);
        console.log(`   📋 Registrado: ${pwaFeatures.serviceWorker.registered ? 'Sí' : 'No'}`);

        console.log('\n📄 Web App Manifest:');
        console.log(`   📋 Presente: ${pwaFeatures.manifest.present ? 'Sí' : 'No'}`);
        if (pwaFeatures.manifest.href) {
            console.log(`   🔗 URL: ${pwaFeatures.manifest.href}`);
        }

        console.log('\n💾 Capacidades Offline:');
        console.log(`   🌐 Online: ${pwaFeatures.offline.onlineStatus ? 'Sí' : 'No'}`);
        console.log(`   📦 Cache API: ${pwaFeatures.offline.cacheAPI ? 'Sí' : 'No'}`);
        console.log(`   💾 LocalStorage: ${pwaFeatures.offline.localStorage ? 'Sí' : 'No'}`);
        console.log(`   🗃️  IndexedDB: ${pwaFeatures.offline.indexedDB ? 'Sí' : 'No'}`);

        console.log('\n🔔 Notificaciones:');
        console.log(`   ✅ Soportadas: ${pwaFeatures.notifications.supported ? 'Sí' : 'No'}`);
        console.log(`   🔐 Permiso: ${pwaFeatures.notifications.permission}`);

        console.log('\n📱 APIs del Dispositivo:');
        console.log(`   🗺️  Geolocation: ${pwaFeatures.deviceAPIs.geolocation ? 'Sí' : 'No'}`);
        console.log(`   📷 Camera: ${pwaFeatures.deviceAPIs.camera ? 'Sí' : 'No'}`);
        console.log(`   📳 Vibration: ${pwaFeatures.deviceAPIs.vibration ? 'Sí' : 'No'}`);
        console.log(`   🔋 Battery: ${pwaFeatures.deviceAPIs.battery ? 'Sí' : 'No'}`);

        this.results.pwa = pwaFeatures;
    }

    async testSecurityFeatures(page) {
        console.log('\n🔒 TEST 5: ANÁLISIS DE SEGURIDAD');
        console.log('================================');

        const securityFeatures = await page.evaluate(() => {
            const security = {};

            // HTTPS
            security.https = location.protocol === 'https:';

            // CSP Headers (checking meta tag)
            const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            security.csp = {
                present: !!cspMeta,
                content: cspMeta?.content || null
            };

            // Secure cookies
            security.cookies = document.cookie.split(';').map(cookie => ({
                name: cookie.trim().split('=')[0],
                secure: cookie.includes('Secure'),
                httpOnly: cookie.includes('HttpOnly'),
                sameSite: cookie.includes('SameSite')
            }));

            // Forms with proper action
            const forms = Array.from(document.querySelectorAll('form'));
            security.forms = forms.map(form => ({
                action: form.action,
                method: form.method,
                hasHttpsAction: form.action.startsWith('https://')
            }));

            return security;
        });

        console.log('🔐 Protocolo:');
        console.log(`   🔒 HTTPS: ${securityFeatures.https ? 'Sí (Producción ready)' : 'No (Solo desarrollo)'}`);

        console.log('\n🛡️  Content Security Policy:');
        console.log(`   📋 CSP presente: ${securityFeatures.csp.present ? 'Sí' : 'No'}`);
        if (securityFeatures.csp.content) {
            console.log(`   📝 Política: ${securityFeatures.csp.content.substring(0, 100)}...`);
        }

        console.log('\n🍪 Análisis de Cookies:');
        console.log(`   📊 Total cookies: ${securityFeatures.cookies.length}`);
        securityFeatures.cookies.forEach(cookie => {
            console.log(`   - ${cookie.name}: Secure=${cookie.secure}, HttpOnly=${cookie.httpOnly}`);
        });

        console.log('\n📝 Seguridad de Formularios:');
        console.log(`   📊 Total forms: ${securityFeatures.forms.length}`);
        securityFeatures.forms.forEach((form, i) => {
            console.log(`   - Form ${i + 1}: ${form.method?.toUpperCase() || 'GET'} → ${form.action || 'current page'}`);
        });

        this.results.security = securityFeatures;
    }

    async testAdvancedResponsiveness(page) {
        console.log('\n📱 TEST 6: RESPONSIVIDAD AVANZADA');
        console.log('=================================');

        const breakpoints = [
            { name: 'Mobile S', width: 320, height: 568 },
            { name: 'Mobile M', width: 375, height: 667 },
            { name: 'Mobile L', width: 425, height: 812 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Laptop', width: 1024, height: 768 },
            { name: 'Laptop L', width: 1440, height: 900 },
            { name: 'Desktop 4K', width: 2560, height: 1440 }
        ];

        for (const bp of breakpoints) {
            await page.setViewport({ width: bp.width, height: bp.height });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const responsiveMetrics = await page.evaluate(() => {
                return {
                    scrollHeight: document.body.scrollHeight,
                    clientHeight: document.body.clientHeight,
                    hasHorizontalScroll: document.body.scrollWidth > document.body.clientWidth,
                    visibleElements: document.querySelectorAll('[style*="display: none"]').length
                };
            });

            console.log(`📱 ${bp.name} (${bp.width}x${bp.height}):`);
            console.log(`   📏 Height: ${responsiveMetrics.scrollHeight}px`);
            console.log(`   ↔️  H-Scroll: ${responsiveMetrics.hasHorizontalScroll ? '❌ Presente' : '✅ No'}`);

            await page.screenshot({
                path: `test-screenshots/responsive-${bp.name.toLowerCase().replace(/\s+/g, '-')}.png`,
                fullPage: false // Solo viewport visible
            });
        }

        // Restaurar viewport original
        await page.setViewport({ width: 1200, height: 800 });
    }

    async testUIUXQuality(page) {
        console.log('\n🎨 TEST 7: CALIDAD UI/UX');
        console.log('========================');

        const uiMetrics = await page.evaluate(() => {
            const metrics = {};

            // Color palette análisis
            const allElements = Array.from(document.querySelectorAll('*'));
            const backgroundColors = new Set();
            const textColors = new Set();

            allElements.forEach(el => {
                const styles = getComputedStyle(el);
                if (styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                    backgroundColors.add(styles.backgroundColor);
                }
                if (styles.color !== 'rgba(0, 0, 0, 0)') {
                    textColors.add(styles.color);
                }
            });

            metrics.colorPalette = {
                backgroundColors: backgroundColors.size,
                textColors: textColors.size,
                uniqueColors: new Set([...backgroundColors, ...textColors]).size
            };

            // Typography analysis
            const fonts = new Set();
            allElements.forEach(el => {
                fonts.add(getComputedStyle(el).fontFamily);
            });

            metrics.typography = {
                uniqueFonts: fonts.size,
                fonts: Array.from(fonts).slice(0, 5)
            };

            // Button consistency
            const buttons = Array.from(document.querySelectorAll('button, .btn, input[type="button"]'));
            const buttonStyles = buttons.map(btn => {
                const styles = getComputedStyle(btn);
                return {
                    borderRadius: styles.borderRadius,
                    padding: styles.padding,
                    backgroundColor: styles.backgroundColor,
                    height: styles.height
                };
            });

            metrics.buttonConsistency = {
                totalButtons: buttons.length,
                uniqueStyles: new Set(buttonStyles.map(s => JSON.stringify(s))).size
            };

            return metrics;
        });

        console.log('🎨 Paleta de Colores:');
        console.log(`   🎨 Colores de fondo únicos: ${uiMetrics.colorPalette.backgroundColors}`);
        console.log(`   📝 Colores de texto únicos: ${uiMetrics.colorPalette.textColors}`);
        console.log(`   🌈 Total colores únicos: ${uiMetrics.colorPalette.uniqueColors}`);

        console.log('\n📝 Tipografía:');
        console.log(`   🔤 Fuentes únicas: ${uiMetrics.typography.uniqueFonts}`);
        uiMetrics.typography.fonts.forEach((font, i) => {
            console.log(`   ${i + 1}. ${font}`);
        });

        console.log('\n🔘 Consistencia de Botones:');
        console.log(`   📊 Total botones: ${uiMetrics.buttonConsistency.totalButtons}`);
        console.log(`   🎨 Estilos únicos: ${uiMetrics.buttonConsistency.uniqueStyles}`);
        console.log(`   ${uiMetrics.buttonConsistency.uniqueStyles <= 3 ? '✅' : '⚠️ '} Consistencia: ${uiMetrics.buttonConsistency.uniqueStyles <= 3 ? 'Buena' : 'Revisar'}`);

        this.results.uiux = uiMetrics;
    }

    async generateFinalReport() {
        console.log('\n📊 GENERANDO REPORTE FINAL...');
        console.log('============================');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                performance: this.evaluatePerformance(),
                accessibility: this.evaluateAccessibility(),
                pwa: this.evaluatePWA(),
                security: this.evaluateSecurity(),
                overall: 0
            },
            details: this.results
        };

        // Calcular score general
        const scores = [
            report.summary.performance,
            report.summary.accessibility,
            report.summary.pwa,
            report.summary.security
        ];
        report.summary.overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // Guardar reporte
        const fs = require('fs');
        fs.writeFileSync('advanced-testing-report.json', JSON.stringify(report, null, 2));

        console.log('\n🏆 RESUMEN EJECUTIVO:');
        console.log('====================');
        console.log(`⚡ Performance: ${report.summary.performance}/100`);
        console.log(`♿ Accesibilidad: ${report.summary.accessibility}/100`);
        console.log(`📱 PWA: ${report.summary.pwa}/100`);
        console.log(`🔒 Seguridad: ${report.summary.security}/100`);
        console.log('─'.repeat(30));
        console.log(`🎯 Score General: ${report.summary.overall}/100`);

        console.log('\n📋 Recomendaciones:');
        this.generateRecommendations(report.summary);

        console.log('\n💾 Reporte completo guardado: advanced-testing-report.json');
        console.log('📸 Screenshots disponibles en: test-screenshots/');

        return report;
    }

    evaluatePerformance() {
        const metrics = this.results.performance.metrics;
        if (!metrics) return 50;

        let score = 100;

        // Penalizar por uso excesivo de memoria
        const memoryUsageMB = metrics.JSHeapUsedSize / 1024 / 1024;
        if (memoryUsageMB > 50) score -= 20;
        else if (memoryUsageMB > 25) score -= 10;

        // Penalizar por muchos nodos DOM
        if (metrics.Nodes > 1500) score -= 20;
        else if (metrics.Nodes > 1000) score -= 10;

        return Math.max(score, 0);
    }

    evaluateAccessibility() {
        const a11y = this.results.accessibility;
        if (!a11y) return 50;

        let score = 100;

        // Penalizar por imágenes sin alt
        if (a11y.images.total > 0) {
            const altRatio = a11y.images.withAlt / a11y.images.total;
            if (altRatio < 0.5) score -= 30;
            else if (altRatio < 0.8) score -= 15;
        }

        // Penalizar por falta de headings
        if (a11y.headings.length === 0) score -= 20;

        // Penalizar por forms sin labels
        if (a11y.formElements.total > 0) {
            const labelRatio = a11y.formElements.withLabels / a11y.formElements.total;
            if (labelRatio < 0.8) score -= 25;
        }

        return Math.max(score, 0);
    }

    evaluatePWA() {
        const pwa = this.results.pwa;
        if (!pwa) return 50;

        let score = 0;

        if (pwa.serviceWorker.supported) score += 25;
        if (pwa.serviceWorker.registered) score += 25;
        if (pwa.manifest.present) score += 25;
        if (pwa.offline.cacheAPI && pwa.offline.localStorage) score += 15;
        if (pwa.notifications.supported) score += 10;

        return score;
    }

    evaluateSecurity() {
        const security = this.results.security;
        if (!security) return 50;

        let score = 60; // Base score for localhost

        if (security.https) score += 40;
        if (security.csp.present) score += 20;

        // En desarrollo, no penalizamos tanto la falta de HTTPS
        return Math.min(score, 100);
    }

    generateRecommendations(summary) {
        const recommendations = [];

        if (summary.performance < 80) {
            recommendations.push('🚀 Optimizar performance: Reducir bundle size, lazy loading');
        }
        if (summary.accessibility < 80) {
            recommendations.push('♿ Mejorar accesibilidad: Agregar alt text, labels a forms');
        }
        if (summary.pwa < 70) {
            recommendations.push('📱 Completar PWA: Registrar service worker, manifest');
        }
        if (summary.security < 70) {
            recommendations.push('🔒 Reforzar seguridad: HTTPS, CSP headers, secure cookies');
        }

        recommendations.forEach(rec => console.log(`   ${rec}`));
    }
}

// Ejecutar tests
(async () => {
    try {
        await require('fs').promises.mkdir('test-screenshots', { recursive: true });
        const tester = new AdvancedFrontendTester();
        await tester.runComprehensiveTests();
    } catch (error) {
        console.error('❌ Error crítico:', error);
        process.exit(1);
    }
})();