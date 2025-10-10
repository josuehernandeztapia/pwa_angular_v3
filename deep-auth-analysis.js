/**
 * 🔍 Deep Authentication Flow Analysis
 * Simulating Chrome DevTools MCP capabilities for auth debugging
 */

const puppeteer = require('puppeteer');

class DeepAuthAnalyzer {
    constructor() {
        this.authFlowResults = {
            routingAnalysis: {},
            angularBootstrap: {},
            authGuardBehavior: {},
            serviceAnalysis: {},
            consoleErrors: [],
            networkRequests: []
        };
    }

    async analyzeAuthFlow() {
        console.log('🔍 DEEP AUTHENTICATION FLOW ANALYSIS');
        console.log('=====================================\n');

        const browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            defaultViewport: { width: 1200, height: 800 },
            args: ['--no-sandbox', '--disable-web-security']
        });

        const page = await browser.newPage();

        try {
            // Setup comprehensive monitoring
            await this.setupAdvancedMonitoring(page);

            // Phase 1: Analyze Angular Bootstrap Process
            await this.analyzeAngularBootstrap(page);

            // Phase 2: Deep Route Analysis
            await this.analyzeRouting(page);

            // Phase 3: AuthGuard Behavior Analysis
            await this.analyzeAuthGuard(page);

            // Phase 4: Service Layer Analysis
            await this.analyzeServices(page);

            // Phase 5: State Management Analysis
            await this.analyzeStateManagement(page);

            // Phase 6: Component Lifecycle Analysis
            await this.analyzeComponentLifecycle(page);

            // Generate comprehensive report
            await this.generateDeepReport();

        } catch (error) {
            console.error('❌ Error en análisis profundo:', error);
        } finally {
            console.log('\n🔍 Navegador mantenido abierto para inspección manual...');
            // No cerramos el browser para permitir inspección manual
        }
    }

    async setupAdvancedMonitoring(page) {
        console.log('⚙️  Configurando monitoring avanzado...');

        // Console monitoring
        page.on('console', msg => {
            const logEntry = {
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date().toISOString()
            };

            this.authFlowResults.consoleErrors.push(logEntry);

            if (msg.type() === 'error' || msg.type() === 'warn') {
                console.log(`🚨 ${msg.type().toUpperCase()}: ${msg.text()}`);
            }
        });

        // Network monitoring
        await page.setRequestInterception(true);

        page.on('request', request => {
            this.authFlowResults.networkRequests.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType(),
                timestamp: new Date().toISOString(),
                headers: request.headers()
            });
            request.continue();
        });

        // Page error monitoring
        page.on('pageerror', error => {
            console.log('💥 Page Error:', error.message);
            this.authFlowResults.consoleErrors.push({
                type: 'pageerror',
                text: error.message,
                timestamp: new Date().toISOString()
            });
        });

        console.log('   ✅ Monitoring configurado\n');
    }

    async analyzeAngularBootstrap(page) {
        console.log('🅰️  PHASE 1: ANGULAR BOOTSTRAP ANALYSIS');
        console.log('======================================');

        await page.goto('http://localhost:4300', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for Angular to potentially load
        await new Promise(resolve => setTimeout(resolve, 3000));

        const bootstrapAnalysis = await page.evaluate(() => {
            const analysis = {
                windowNg: !!window.ng,
                windowAngular: !!window.angular,
                appRootPresent: !!document.querySelector('app-root'),
                appRootContent: document.querySelector('app-root')?.innerHTML?.substring(0, 200) || '',
                scriptsLoaded: [],
                angularVersion: null,
                routerOutlet: !!document.querySelector('router-outlet'),
                angularDevMode: false
            };

            // Check for Angular scripts
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            analysis.scriptsLoaded = scripts.map(s => ({
                src: s.src,
                loaded: s.readyState !== 'loading'
            })).filter(s => s.src.includes('main.js') || s.src.includes('angular'));

            // Check Angular dev mode
            try {
                if (window.ng && window.ng.getContext) {
                    analysis.angularDevMode = true;
                }
            } catch (e) {
                // Angular might not be fully loaded
            }

            // Try to get Angular version
            try {
                if (window.ng && window.ng.version) {
                    analysis.angularVersion = window.ng.version.full;
                }
            } catch (e) {
                // Version not available
            }

            return analysis;
        });

        console.log('📊 Bootstrap Status:');
        console.log(`   🅰️  window.ng available: ${bootstrapAnalysis.windowNg ? '✅' : '❌'}`);
        console.log(`   📦 app-root present: ${bootstrapAnalysis.appRootPresent ? '✅' : '❌'}`);
        console.log(`   🔄 router-outlet present: ${bootstrapAnalysis.routerOutlet ? '✅' : '❌'}`);
        console.log(`   🛠️  Dev mode: ${bootstrapAnalysis.angularDevMode ? '✅' : '❌'}`);
        console.log(`   📝 Version: ${bootstrapAnalysis.angularVersion || 'N/A'}`);

        if (bootstrapAnalysis.appRootContent) {
            console.log(`   📄 App Root Content: "${bootstrapAnalysis.appRootContent}..."`);
        }

        console.log('\n📦 Critical Scripts:');
        bootstrapAnalysis.scriptsLoaded.forEach(script => {
            console.log(`   ${script.loaded ? '✅' : '⏳'} ${script.src}`);
        });

        this.authFlowResults.angularBootstrap = bootstrapAnalysis;

        await page.screenshot({
            path: 'test-screenshots/deep-01-bootstrap.png',
            fullPage: true
        });

        console.log('\n');
    }

    async analyzeRouting(page) {
        console.log('🗺️  PHASE 2: ROUTING ANALYSIS');
        console.log('============================');

        const routingAnalysis = await page.evaluate(() => {
            const analysis = {
                currentUrl: window.location.href,
                currentPath: window.location.pathname,
                hashMode: window.location.hash.length > 0,
                routerPresent: false,
                routerState: null,
                navigatedRoutes: []
            };

            // Try to access Angular Router
            try {
                if (window.ng) {
                    const debugElement = window.ng.getContext(document.querySelector('app-root'));
                    if (debugElement && debugElement.injector) {
                        const router = debugElement.injector.get('Router', null);
                        if (router) {
                            analysis.routerPresent = true;
                            analysis.routerState = {
                                url: router.url,
                                events: 'Router events available'
                            };
                        }
                    }
                }
            } catch (e) {
                analysis.routerError = e.message;
            }

            return analysis;
        });

        console.log('🗺️  Routing Status:');
        console.log(`   📍 Current URL: ${routingAnalysis.currentUrl}`);
        console.log(`   🛤️  Current Path: ${routingAnalysis.currentPath}`);
        console.log(`   🔗 Hash Mode: ${routingAnalysis.hashMode ? '✅' : '❌'}`);
        console.log(`   🚀 Router Present: ${routingAnalysis.routerPresent ? '✅' : '❌'}`);

        if (routingAnalysis.routerState) {
            console.log(`   📊 Router URL: ${routingAnalysis.routerState.url}`);
        }

        if (routingAnalysis.routerError) {
            console.log(`   ⚠️  Router Error: ${routingAnalysis.routerError}`);
        }

        // Test different auth routes
        const routesToTest = ['/login', '/auth', '/signin', '/dashboard', '/home'];

        console.log('\n🔍 Testing Authentication Routes:');
        for (const route of routesToTest) {
            try {
                const testUrl = `http://localhost:4300${route}`;
                console.log(`   📍 Testing: ${route}`);

                await page.goto(testUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 5000
                });

                await new Promise(resolve => setTimeout(resolve, 2000));

                const routeResult = await page.evaluate(() => ({
                    finalUrl: window.location.href,
                    finalPath: window.location.pathname,
                    hasContent: document.body.innerText.length > 10,
                    hasForm: !!document.querySelector('form'),
                    hasLoginElements: !!(document.querySelector('input[type="email"]') &&
                                       document.querySelector('input[type="password"]'))
                }));

                console.log(`      → Final URL: ${routeResult.finalPath}`);
                console.log(`      → Has Content: ${routeResult.hasContent ? '✅' : '❌'}`);
                console.log(`      → Has Form: ${routeResult.hasForm ? '✅' : '❌'}`);
                console.log(`      → Has Login: ${routeResult.hasLoginElements ? '✅' : '❌'}`);

                if (routeResult.hasLoginElements) {
                    console.log(`      🎯 FOUND WORKING LOGIN ROUTE: ${route}`);

                    await page.screenshot({
                        path: `test-screenshots/deep-02-route-${route.replace('/', '')}.png`,
                        fullPage: true
                    });
                }

            } catch (error) {
                console.log(`      ❌ Route ${route} failed: ${error.message}`);
            }
        }

        this.authFlowResults.routingAnalysis = routingAnalysis;
        console.log('\n');
    }

    async analyzeAuthGuard(page) {
        console.log('🛡️  PHASE 3: AUTH GUARD BEHAVIOR ANALYSIS');
        console.log('=======================================');

        // Go back to root to test guard behavior
        await page.goto('http://localhost:4300', {
            waitUntil: 'domcontentloaded',
            timeout: 10000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const guardAnalysis = await page.evaluate(() => {
            const analysis = {
                initialUrl: window.location.href,
                redirectOccurred: false,
                expectedRedirectUrl: null,
                guardPresent: false,
                authServicePresent: false,
                localStorageAuth: null
            };

            // Check localStorage for auth data
            analysis.localStorageAuth = {
                authToken: localStorage.getItem('auth_token'),
                refreshToken: localStorage.getItem('refresh_token'),
                currentUser: localStorage.getItem('current_user'),
                rememberMe: localStorage.getItem('rememberMe')
            };

            // Try to access AuthService
            try {
                if (window.ng) {
                    const debugElement = window.ng.getContext(document.querySelector('app-root'));
                    if (debugElement && debugElement.injector) {
                        const authService = debugElement.injector.get('AuthService', null);
                        analysis.authServicePresent = !!authService;

                        if (authService) {
                            analysis.authServiceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(authService));
                        }
                    }
                }
            } catch (e) {
                analysis.authServiceError = e.message;
            }

            return analysis;
        });

        console.log('🛡️  Auth Guard Analysis:');
        console.log(`   📍 Initial URL: ${guardAnalysis.initialUrl}`);
        console.log(`   🔒 AuthService Present: ${guardAnalysis.authServicePresent ? '✅' : '❌'}`);

        if (guardAnalysis.authServiceMethods) {
            console.log('   🔧 AuthService Methods:');
            guardAnalysis.authServiceMethods.slice(0, 8).forEach(method => {
                console.log(`      - ${method}`);
            });
        }

        console.log('\n💾 LocalStorage Auth Data:');
        Object.entries(guardAnalysis.localStorageAuth).forEach(([key, value]) => {
            const hasValue = value !== null;
            console.log(`   ${hasValue ? '✅' : '❌'} ${key}: ${hasValue ? '***' : 'null'}`);
        });

        // Test authenticated vs unauthenticated behavior
        console.log('\n🧪 Testing Guard Behavior:');

        // Clear auth data and test
        await page.evaluate(() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            localStorage.removeItem('refresh_token');
        });

        await page.goto('http://localhost:4300/dashboard', {
            waitUntil: 'domcontentloaded',
            timeout: 5000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const unauthenticatedResult = await page.evaluate(() => ({
            finalUrl: window.location.href,
            finalPath: window.location.pathname,
            wasRedirected: window.location.pathname !== '/dashboard'
        }));

        console.log('   🚫 Unauthenticated Access:');
        console.log(`      → Attempted: /dashboard`);
        console.log(`      → Final: ${unauthenticatedResult.finalPath}`);
        console.log(`      → Redirected: ${unauthenticatedResult.wasRedirected ? '✅' : '❌'}`);

        this.authFlowResults.authGuardBehavior = {
            ...guardAnalysis,
            unauthenticatedTest: unauthenticatedResult
        };

        await page.screenshot({
            path: 'test-screenshots/deep-03-auth-guard.png',
            fullPage: true
        });

        console.log('\n');
    }

    async analyzeServices(page) {
        console.log('⚙️  PHASE 4: SERVICE LAYER ANALYSIS');
        console.log('=================================');

        const serviceAnalysis = await page.evaluate(() => {
            const analysis = {
                availableServices: [],
                authServiceMethods: null,
                httpClientPresent: false,
                interceptorsActive: false
            };

            try {
                if (window.ng) {
                    const debugElement = window.ng.getContext(document.querySelector('app-root'));
                    if (debugElement && debugElement.injector) {
                        // Try to get common services
                        const services = [
                            'AuthService',
                            'HttpClient',
                            'Router',
                            'ActivatedRoute',
                            'ToastService'
                        ];

                        services.forEach(serviceName => {
                            try {
                                const service = debugElement.injector.get(serviceName, null);
                                if (service) {
                                    analysis.availableServices.push({
                                        name: serviceName,
                                        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(m =>
                                            typeof service[m] === 'function' && !m.startsWith('_')
                                        ).slice(0, 10)
                                    });
                                }
                            } catch (e) {
                                // Service not available
                            }
                        });

                        // Special analysis for AuthService
                        try {
                            const authService = debugElement.injector.get('AuthService', null);
                            if (authService) {
                                analysis.authServiceMethods = {
                                    hasLogin: typeof authService.login === 'function',
                                    hasLogout: typeof authService.logout === 'function',
                                    hasRegister: typeof authService.register === 'function',
                                    hasCurrentUser: typeof authService.getCurrentUser === 'function',
                                    hasIsAuthenticated: typeof authService.isAuthenticated === 'function'
                                };

                                // Try to get current auth state
                                try {
                                    analysis.currentAuthState = {
                                        isAuthenticated: authService.isAuthenticated(),
                                        currentUser: authService.getCurrentUser()
                                    };
                                } catch (e) {
                                    analysis.currentAuthState = { error: e.message };
                                }
                            }
                        } catch (e) {
                            analysis.authServiceError = e.message;
                        }

                        // Check for HttpClient
                        try {
                            const httpClient = debugElement.injector.get('HttpClient', null);
                            analysis.httpClientPresent = !!httpClient;
                        } catch (e) {
                            // HttpClient not available
                        }
                    }
                }
            } catch (e) {
                analysis.error = e.message;
            }

            return analysis;
        });

        console.log('⚙️  Service Layer Status:');
        console.log(`   🌐 HttpClient: ${serviceAnalysis.httpClientPresent ? '✅' : '❌'}`);
        console.log(`   🔒 Services Available: ${serviceAnalysis.availableServices.length}`);

        serviceAnalysis.availableServices.forEach(service => {
            console.log(`\n   📦 ${service.name}:`);
            service.methods.forEach(method => {
                console.log(`      - ${method}()`);
            });
        });

        if (serviceAnalysis.authServiceMethods) {
            console.log('\n   🔐 AuthService Methods:');
            Object.entries(serviceAnalysis.authServiceMethods).forEach(([method, available]) => {
                console.log(`      ${available ? '✅' : '❌'} ${method}`);
            });
        }

        if (serviceAnalysis.currentAuthState) {
            console.log('\n   🔍 Current Auth State:');
            if (serviceAnalysis.currentAuthState.error) {
                console.log(`      ❌ Error: ${serviceAnalysis.currentAuthState.error}`);
            } else {
                console.log(`      🔒 Authenticated: ${serviceAnalysis.currentAuthState.isAuthenticated}`);
                console.log(`      👤 Current User: ${serviceAnalysis.currentAuthState.currentUser ? 'Present' : 'null'}`);
            }
        }

        this.authFlowResults.serviceAnalysis = serviceAnalysis;
        console.log('\n');
    }

    async analyzeStateManagement(page) {
        console.log('📊 PHASE 5: STATE MANAGEMENT ANALYSIS');
        console.log('===================================');

        const stateAnalysis = await page.evaluate(() => {
            const analysis = {
                localStorageKeys: Object.keys(localStorage),
                sessionStorageKeys: Object.keys(sessionStorage),
                cookieCount: document.cookie.split(';').filter(c => c.trim()).length,
                observables: {
                    currentUser$: false,
                    isAuthenticated$: false
                }
            };

            // Check for RxJS observables in AuthService
            try {
                if (window.ng) {
                    const debugElement = window.ng.getContext(document.querySelector('app-root'));
                    if (debugElement && debugElement.injector) {
                        const authService = debugElement.injector.get('AuthService', null);
                        if (authService) {
                            analysis.observables.currentUser$ = !!authService.currentUser$;
                            analysis.observables.isAuthenticated$ = !!authService.isAuthenticated$;
                        }
                    }
                }
            } catch (e) {
                analysis.observableError = e.message;
            }

            return analysis;
        });

        console.log('📊 State Management:');
        console.log(`   💾 LocalStorage Keys: ${stateAnalysis.localStorageKeys.length}`);
        stateAnalysis.localStorageKeys.forEach(key => {
            console.log(`      - ${key}`);
        });

        console.log(`   🗃️  SessionStorage Keys: ${stateAnalysis.sessionStorageKeys.length}`);
        console.log(`   🍪 Cookies: ${stateAnalysis.cookieCount}`);

        console.log('\n   📡 Observables:');
        Object.entries(stateAnalysis.observables).forEach(([obs, available]) => {
            console.log(`      ${available ? '✅' : '❌'} ${obs}`);
        });

        this.authFlowResults.stateManagement = stateAnalysis;
        console.log('\n');
    }

    async analyzeComponentLifecycle(page) {
        console.log('🔄 PHASE 6: COMPONENT LIFECYCLE ANALYSIS');
        console.log('======================================');

        const lifecycleAnalysis = await page.evaluate(() => {
            const analysis = {
                appRootInitialized: false,
                componentsDetected: [],
                routerOutletActive: false,
                loadingStates: {
                    hasLoadingSpinner: !!document.querySelector('.loading, .spinner'),
                    hasLoadingText: !!document.querySelector('[class*="loading"]')
                }
            };

            // Detect Angular components
            const elementsWithNg = Array.from(document.querySelectorAll('*')).filter(el => {
                return Array.from(el.attributes).some(attr =>
                    attr.name.startsWith('_ng') || attr.name.startsWith('ng-')
                );
            });

            analysis.componentsDetected = elementsWithNg.map(el => ({
                tagName: el.tagName,
                classList: Array.from(el.classList),
                hasNgContent: el.innerHTML.length > 0
            })).slice(0, 10);

            // Check app-root status
            const appRoot = document.querySelector('app-root');
            analysis.appRootInitialized = !!(appRoot && appRoot.innerHTML.trim().length > 0);
            analysis.routerOutletActive = !!document.querySelector('router-outlet');

            return analysis;
        });

        console.log('🔄 Component Lifecycle:');
        console.log(`   🏠 App Root Initialized: ${lifecycleAnalysis.appRootInitialized ? '✅' : '❌'}`);
        console.log(`   🔄 Router Outlet Active: ${lifecycleAnalysis.routerOutletActive ? '✅' : '❌'}`);

        console.log('\n   ⏳ Loading States:');
        Object.entries(lifecycleAnalysis.loadingStates).forEach(([state, present]) => {
            console.log(`      ${present ? '✅' : '❌'} ${state}`);
        });

        console.log(`\n   🧩 Components Detected: ${lifecycleAnalysis.componentsDetected.length}`);
        lifecycleAnalysis.componentsDetected.slice(0, 5).forEach(comp => {
            console.log(`      - <${comp.tagName.toLowerCase()}> ${comp.hasNgContent ? '(with content)' : '(empty)'}`);
        });

        this.authFlowResults.componentLifecycle = lifecycleAnalysis;

        await page.screenshot({
            path: 'test-screenshots/deep-04-components.png',
            fullPage: true
        });

        console.log('\n');
    }

    async generateDeepReport() {
        console.log('📋 GENERATING DEEP ANALYSIS REPORT');
        console.log('=================================');

        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(),
            findings: this.generateFindings(),
            recommendations: this.generateRecommendations(),
            details: this.authFlowResults
        };

        // Save detailed report
        const fs = require('fs');
        fs.writeFileSync('deep-auth-analysis-report.json', JSON.stringify(report, null, 2));

        console.log('\n🎯 DEEP ANALYSIS SUMMARY:');
        console.log('========================');

        report.summary.forEach(item => {
            console.log(`${item.status} ${item.area}: ${item.description}`);
        });

        console.log('\n💡 KEY FINDINGS:');
        report.findings.forEach(finding => {
            console.log(`   ${finding.severity} ${finding.title}`);
            console.log(`      ${finding.description}`);
        });

        console.log('\n🚀 PRIORITY RECOMMENDATIONS:');
        report.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });

        console.log('\n💾 Deep analysis report saved: deep-auth-analysis-report.json');

        return report;
    }

    generateSummary() {
        return [
            {
                area: 'Angular Bootstrap',
                status: this.authFlowResults.angularBootstrap.windowNg ? '✅' : '❌',
                description: this.authFlowResults.angularBootstrap.windowNg
                    ? 'Angular successfully loaded'
                    : 'Angular not fully initialized'
            },
            {
                area: 'Routing System',
                status: this.authFlowResults.routingAnalysis.routerPresent ? '✅' : '❌',
                description: this.authFlowResults.routingAnalysis.routerPresent
                    ? 'Angular Router active'
                    : 'Router not accessible'
            },
            {
                area: 'Auth Service',
                status: this.authFlowResults.serviceAnalysis.availableServices.some(s => s.name === 'AuthService') ? '✅' : '❌',
                description: 'AuthService availability in DI container'
            },
            {
                area: 'Component Rendering',
                status: this.authFlowResults.componentLifecycle.appRootInitialized ? '✅' : '❌',
                description: 'Component initialization status'
            }
        ];
    }

    generateFindings() {
        const findings = [];

        // Check for Angular initialization issues
        if (!this.authFlowResults.angularBootstrap.windowNg) {
            findings.push({
                severity: '🚨',
                title: 'Angular Not Fully Loaded',
                description: 'window.ng not available, suggesting Angular bootstrap issues'
            });
        }

        // Check for router issues
        if (!this.authFlowResults.routingAnalysis.routerPresent) {
            findings.push({
                severity: '⚠️',
                title: 'Router Access Issues',
                description: 'Cannot access Angular Router from injector'
            });
        }

        // Check console errors
        const criticalErrors = this.authFlowResults.consoleErrors.filter(e =>
            e.type === 'error' && !e.text.includes('resource isn\'t a valid image')
        );

        if (criticalErrors.length > 0) {
            findings.push({
                severity: '🚨',
                title: 'Console Errors Detected',
                description: `${criticalErrors.length} critical errors found in console`
            });
        }

        // Check for missing auth components
        if (!this.authFlowResults.componentLifecycle.routerOutletActive) {
            findings.push({
                severity: '⚠️',
                title: 'Router Outlet Missing',
                description: 'No active router-outlet found for component rendering'
            });
        }

        return findings;
    }

    generateRecommendations() {
        const recommendations = [];

        if (!this.authFlowResults.angularBootstrap.windowNg) {
            recommendations.push('🔧 Fix Angular bootstrap process - check main.ts and app initialization');
        }

        if (!this.authFlowResults.routingAnalysis.routerPresent) {
            recommendations.push('🗺️ Verify Angular Router configuration in app.config.ts');
        }

        if (this.authFlowResults.consoleErrors.some(e => e.type === 'error')) {
            recommendations.push('🚨 Resolve console errors that may block component rendering');
        }

        if (!this.authFlowResults.componentLifecycle.routerOutletActive) {
            recommendations.push('📦 Add router-outlet to app.component.html for route rendering');
        }

        recommendations.push('🔍 Use Angular DevTools browser extension for deeper component inspection');

        return recommendations;
    }
}

// Execute deep analysis
(async () => {
    try {
        await require('fs').promises.mkdir('test-screenshots', { recursive: true });
        const analyzer = new DeepAuthAnalyzer();
        await analyzer.analyzeAuthFlow();
    } catch (error) {
        console.error('❌ Critical error:', error);
    }
})();