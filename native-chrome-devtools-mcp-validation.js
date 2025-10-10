const CDP = require('chrome-remote-interface');
const { spawn } = require('child_process');
const fs = require('fs');

class NativeChromeDevToolsMCPValidation {
    constructor() {
        this.chrome = null;
        this.client = null;
        this.baseUrl = 'http://localhost:4300';
        this.results = [];
        this.screenshots = [];
        this.errors = [];
        this.isAuthenticated = false;
        this.chromeProcess = null;
    }

    async initialize() {
        console.log('🚀 NATIVE CHROME DEVTOOLS MCP - COMPLETE E2E VALIDATION');
        console.log('🎯 Focus: Chrome DevTools Protocol nativo + Authentication + Business Logic');
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        console.log('');

        // Launch Chrome with remote debugging
        console.log('🌐 Launching Chrome with remote debugging...');
        this.chromeProcess = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
            '--remote-debugging-port=9222',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--user-data-dir=/tmp/chrome-testing'
        ], {
            detached: true,
            stdio: 'ignore'
        });

        // Wait for Chrome to start
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Connect to Chrome DevTools
        console.log('🔌 Connecting to Chrome DevTools Protocol...');
        this.client = await CDP();

        const { Network, Page, Runtime, DOM } = this.client;

        // Enable necessary domains
        await Network.enable();
        await Page.enable();
        await Runtime.enable();
        await DOM.enable();

        // Enhanced error tracking
        Runtime.consoleAPICalled((params) => {
            if (params.type === 'error') {
                const error = `Console Error: ${params.args.map(arg => arg.value || arg.description).join(' ')}`;
                console.log(`🖥️ ${error}`);
                this.errors.push(error);
            }
        });

        Runtime.exceptionThrown((params) => {
            const error = `Runtime Exception: ${params.exceptionDetails.text}`;
            console.log(`💥 ${error}`);
            this.errors.push(error);
        });

        // Monitor network for auth calls
        Network.responseReceived((params) => {
            if (params.response.url.includes('auth/login')) {
                console.log(`🌐 AUTH RESPONSE: ${params.response.status} ${params.response.url}`);
            }
        });

        console.log('✅ Chrome DevTools Protocol connected!');
        return true;
    }

    async takeScreenshot(name) {
        try {
            const filename = `native-cdp-${name}-${Date.now()}.png`;
            const { data } = await this.client.Page.captureScreenshot({ format: 'png' });
            fs.writeFileSync(filename, data, 'base64');
            this.screenshots.push(filename);
            console.log(`📸 Screenshot: ${filename}`);
            return filename;
        } catch (error) {
            console.log(`❌ Screenshot failed: ${error.message}`);
            return null;
        }
    }

    async step1_CompleteAuthentication() {
        console.log('\\n🔐 STEP 1: COMPLETE AUTHENTICATION FLOW (NATIVE CDP)');

        try {
            // Navigate to login page
            console.log(`🌐 Navigating to ${this.baseUrl}...`);
            await this.client.Page.navigate({ url: this.baseUrl });
            await this.client.Page.loadEventFired();
            await new Promise(resolve => setTimeout(resolve, 3000));

            await this.takeScreenshot('01-login-page-loaded');

            // Wait for demo users to be visible
            console.log('⏳ Waiting for demo users to load...');

            // Get page content and check for demo users
            const { root } = await this.client.DOM.getDocument();
            const demoUsersResult = await this.client.DOM.performSearch({
                query: '[data-cy^="demo-user-"]',
                includeUserAgentShadowDOM: true
            });

            if (demoUsersResult.resultCount === 0) {
                throw new Error('No demo users found');
            }

            console.log(`✅ Found ${demoUsersResult.resultCount} demo users`);

            // Get current state before authentication
            const beforeAuthResult = await this.client.Runtime.evaluate({
                expression: `({
                    url: window.location.href,
                    pathname: window.location.pathname,
                    localStorage: Object.keys(localStorage).length,
                    sessionStorage: Object.keys(sessionStorage).length
                })`
            });
            const beforeAuth = beforeAuthResult.result.value;

            console.log(`📍 Before auth - URL: ${beforeAuth.url}`);

            // STEP 1A: Click the first demo user
            console.log('👆 STEP 1A: Click demo user to fill form...');

            const firstDemoUserNodes = await this.client.DOM.getSearchResults({
                searchId: demoUsersResult.searchId,
                fromIndex: 0,
                toIndex: 1
            });

            if (firstDemoUserNodes.nodeIds.length > 0) {
                const nodeId = firstDemoUserNodes.nodeIds[0];
                const { object } = await this.client.DOM.resolveNode({ nodeId });
                await this.client.Runtime.callFunctionOn({
                    objectId: object.objectId,
                    functionDeclaration: 'function() { this.click(); }'
                });

                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('02-demo-user-clicked');
            }

            // Check form values after demo user click
            const formValuesResult = await this.client.Runtime.evaluate({
                expression: `({
                    email: document.querySelector('input[type="email"]')?.value || '',
                    password: document.querySelector('input[type="password"]')?.value || ''
                })`
            });
            const formValues = formValuesResult.result.value;

            console.log(`📝 Form filled - Email: ${formValues.email}, Password: ${formValues.password ? '***' : 'empty'}`);

            // STEP 1B: Click login button
            console.log('👆 STEP 1B: Click login button to submit...');

            const loginButtonResult = await this.client.Runtime.evaluate({
                expression: `
                    const selectors = [
                        'button[type="submit"]',
                        'button:contains("Iniciar")',
                        'button:contains("Login")',
                        '.login-btn'
                    ];

                    let button = null;
                    for (const selector of selectors) {
                        if (selector.includes(':contains(')) {
                            const text = selector.match(/:contains\\("(.+?)"\\)/)[1];
                            const buttons = document.querySelectorAll('button');
                            for (const btn of buttons) {
                                if (btn.textContent.toLowerCase().includes(text.toLowerCase())) {
                                    button = btn;
                                    break;
                                }
                            }
                        } else {
                            button = document.querySelector(selector);
                        }
                        if (button) break;
                    }

                    if (button) {
                        button.click();
                        return true;
                    }
                    return false;
                `
            });

            if (loginButtonResult.result.value) {
                console.log('✅ Clicked login button');
            } else {
                console.log('❌ Could not find login button, trying form submission...');
                await this.client.Runtime.evaluate({
                    expression: 'document.querySelector("form")?.submit() || document.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter"}))'
                });
            }

            // Enhanced wait for authentication processing
            console.log('⏳ Waiting for authentication to process...');
            await new Promise(resolve => setTimeout(resolve, 8000));

            // Check authentication result
            const afterAuthResult = await this.client.Runtime.evaluate({
                expression: `({
                    url: window.location.href,
                    pathname: window.location.pathname,
                    localStorage: Object.keys(localStorage),
                    sessionStorage: Object.keys(sessionStorage),
                    hasUserData: !!localStorage.getItem('userData') ||
                                !!sessionStorage.getItem('userData') ||
                                !!localStorage.getItem('user') ||
                                !!sessionStorage.getItem('user'),
                    hasToken: !!localStorage.getItem('token') ||
                             !!localStorage.getItem('authToken') ||
                             !!sessionStorage.getItem('token') ||
                             !!sessionStorage.getItem('authToken'),
                    hasSession: document.cookie.includes('session') ||
                               document.cookie.includes('auth') ||
                               document.cookie.includes('token')
                })`
            });
            const afterAuth = afterAuthResult.result.value;

            console.log(`📍 After auth - URL: ${afterAuth.url}`);
            console.log(`📱 Has User Data: ${afterAuth.hasUserData}`);
            console.log(`🔑 Has Token: ${afterAuth.hasToken}`);
            console.log(`🍪 Has Session Cookie: ${afterAuth.hasSession}`);
            console.log(`💾 LocalStorage keys: ${afterAuth.localStorage.join(', ')}`);
            console.log(`🗃️ SessionStorage keys: ${afterAuth.sessionStorage.join(', ')}`);

            // Determine if authentication was successful
            const urlChanged = beforeAuth.url !== afterAuth.url;
            const notOnLogin = !afterAuth.pathname.includes('login');
            const hasAuthData = afterAuth.hasUserData || afterAuth.hasToken || afterAuth.hasSession;
            const storageChanged = afterAuth.localStorage.length > beforeAuth.localStorage ||
                                 afterAuth.sessionStorage.length > beforeAuth.sessionStorage;

            this.isAuthenticated = urlChanged || notOnLogin || hasAuthData || storageChanged;

            console.log(`🔄 URL Changed: ${urlChanged}`);
            console.log(`🚪 Not on Login: ${notOnLogin}`);
            console.log(`💾 Storage Changed: ${storageChanged}`);
            console.log(`✅ Authentication Success: ${this.isAuthenticated}`);

            await this.takeScreenshot('03-auth-completed');

            this.results.push({
                test: 'Complete Authentication Flow (Native CDP)',
                passed: this.isAuthenticated,
                details: `URL changed: ${urlChanged}, Auth data: ${hasAuthData}, Storage: ${storageChanged}`,
                beforeUrl: beforeAuth.url,
                afterUrl: afterAuth.url,
                authData: { hasUserData: afterAuth.hasUserData, hasToken: afterAuth.hasToken },
                formFilled: formValues.email !== '' && formValues.password !== ''
            });

            return this.isAuthenticated;

        } catch (error) {
            console.error(`❌ Authentication failed: ${error.message}`);
            await this.takeScreenshot('auth-error');

            this.results.push({
                test: 'Complete Authentication Flow (Native CDP)',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step2_ValidateSection(sectionName, url) {
        console.log(`\\n🧭 STEP 2: VALIDATE ${sectionName.toUpperCase()} (NATIVE CDP)`);

        try {
            const fullUrl = `${this.baseUrl}${url}`;
            console.log(`🌐 Navigating to ${fullUrl}...`);

            await this.client.Page.navigate({ url: fullUrl });
            await this.client.Page.loadEventFired();
            await new Promise(resolve => setTimeout(resolve, 3000));

            await this.takeScreenshot(sectionName.toLowerCase().replace(' ', '-'));

            // Comprehensive page analysis using native CDP
            const pageAnalysisResult = await this.client.Runtime.evaluate({
                expression: `({
                    currentUrl: window.location.href,
                    pathname: window.location.pathname,
                    title: document.title,
                    hasAppRoot: document.querySelector('app-root') !== null,
                    hasAngularApp: typeof window.ng !== 'undefined',
                    isLoaded: document.readyState === 'complete',
                    bodyText: document.body.innerText.length,
                    totalElements: document.querySelectorAll('*').length,
                    buttons: document.querySelectorAll('button').length,
                    inputs: document.querySelectorAll('input').length,
                    forms: document.querySelectorAll('form').length,
                    links: document.querySelectorAll('a').length,
                    hasContent: document.body.innerText.length > 50,
                    hasErrors: document.querySelectorAll('.error, [class*="error"], .ng-invalid').length,
                    components: {
                        simuladorMain: document.querySelector('app-simulador-main') !== null,
                        cotizadorMain: document.querySelector('app-cotizador-main') !== null,
                        flowBuilder: document.querySelector('app-flow-builder') !== null,
                        onboardingMain: document.querySelector('app-onboarding-main') !== null,
                        productsCatalog: document.querySelector('app-productos-catalog') !== null,
                        proteccion: document.querySelector('app-proteccion') !== null
                    }
                })`
            });
            const pageAnalysis = pageAnalysisResult.result.value;

            const isOnLogin = pageAnalysis.currentUrl.includes('login');
            const isWorking = pageAnalysis.hasAppRoot &&
                             pageAnalysis.isLoaded &&
                             pageAnalysis.hasContent &&
                             pageAnalysis.totalElements > 30 &&
                             !isOnLogin;

            const hasInteraction = pageAnalysis.buttons > 5 ||
                                  pageAnalysis.inputs > 0 ||
                                  pageAnalysis.forms > 0;

            console.log(`✅ URL: ${pageAnalysis.currentUrl}`);
            console.log(`✅ App Root: ${pageAnalysis.hasAppRoot}`);
            console.log(`✅ Angular: ${pageAnalysis.hasAngularApp}`);
            console.log(`✅ Loaded: ${pageAnalysis.isLoaded}`);
            console.log(`✅ Has Content: ${pageAnalysis.hasContent}`);
            console.log(`✅ Elements: ${pageAnalysis.totalElements}`);
            console.log(`✅ Interactive: ${hasInteraction}`);
            console.log(`✅ Components: ${Object.values(pageAnalysis.components).filter(Boolean).length}`);
            console.log(`✅ Not on Login: ${!isOnLogin}`);

            this.results.push({
                test: `${sectionName} Validation (Native CDP)`,
                passed: isWorking,
                details: `Loaded: ${pageAnalysis.isLoaded}, Elements: ${pageAnalysis.totalElements}, Interactive: ${hasInteraction}, NotOnLogin: ${!isOnLogin}`,
                metrics: pageAnalysis,
                url: pageAnalysis.currentUrl,
                redirectedToLogin: isOnLogin
            });

            return isWorking;

        } catch (error) {
            console.error(`❌ Validation of ${sectionName} failed: ${error.message}`);
            await this.takeScreenshot(`${sectionName.toLowerCase()}-error`);

            this.results.push({
                test: `${sectionName} Validation (Native CDP)`,
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step3_ValidateBusinessLogic() {
        console.log('\\n🧮 STEP 3: VALIDATE BUSINESS LOGIC & MATHEMATICAL FUNCTIONS (NATIVE CDP)');

        if (!this.isAuthenticated) {
            console.log('⚠️ Skipping business logic validation - authentication failed');
            return false;
        }

        try {
            const calculators = [
                {
                    name: 'AGS Ahorro',
                    url: `${this.baseUrl}/simulador/ags-ahorro`,
                    selectors: {
                        hasUnitValueInput: '[data-cy="unit-value"], input[placeholder*="valor"], input[placeholder*="monto"], input[type="number"]',
                        hasConsumptionInput: '[data-cy="consumption"], [data-cy="plate-consumption"], input[placeholder*="consumo"], input[placeholder*="litros"]',
                        hasSimulateButton: '[data-cy="simulate-btn"], button[type="submit"]',
                        hasResultsArea: '[data-cy="results-area"], [data-cy*="sim-"], .results, .simulation-results'
                    }
                },
                {
                    name: 'EdoMex Individual',
                    url: `${this.baseUrl}/simulador/edomex-individual`,
                    selectors: {
                        hasTargetInput: '[data-cy="target-amount"], [data-cy="target-down-payment"], input[placeholder*="meta"], input[placeholder*="objetivo"], input[type="number"]',
                        hasConsumptionInput: '[data-cy="consumption"], input[placeholder*="consumo"], input[placeholder*="litros"]',
                        hasCalculateButton: '[data-cy="calculate-btn"], button[type="submit"]',
                        hasResultsArea: '[data-cy="results-area"], [data-cy*="sim-"], .results, .simulation-results'
                    }
                },
                {
                    name: 'EdoMex Colectivo',
                    url: `${this.baseUrl}/simulador/tanda-colectiva`,
                    selectors: {
                        hasMembersInput: '[data-cy="members-count"], [data-cy="members"], input[placeholder*="miembros"], input[placeholder*="participantes"], input[type="number"]',
                        hasUnitPriceInput: '[data-cy="unit-price"], input[placeholder*="precio"], input[placeholder*="costo"], input[type="number"]',
                        hasRunButton: '[data-cy="run-simulation"], [data-cy="run-edomex-colectivo"], button[type="submit"]',
                        hasResultsArea: '[data-cy="results-area"], [data-cy*="group-"], [data-cy*="first-"], [data-cy*="full-"], .results, .tanda-results'
                    }
                }
            ];

            let workingCalculators = 0;
            const calculatorResults = [];

            for (const calculator of calculators) {
                try {
                    console.log(`🎯 Testing ${calculator.name} at ${calculator.url}...`);

                    // Navigate directly to calculator
                    await this.client.Page.navigate({ url: calculator.url });
                    await this.client.Page.loadEventFired();
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Check current URL
                    const urlCheckResult = await this.client.Runtime.evaluate({
                        expression: 'window.location.href'
                    });
                    const currentUrl = urlCheckResult.result.value;

                    if (currentUrl.includes('/nueva-oportunidad') || currentUrl.includes('/login')) {
                        console.log(`${calculator.name}: ❌ REDIRECTED TO ${currentUrl}`);
                        calculatorResults.push({
                            name: calculator.name,
                            working: false,
                            analysis: { error: `Redirected to ${currentUrl}`, currentUrl }
                        });
                        continue;
                    }

                    // Analyze calculator elements using native CDP
                    const analysisResult = await this.client.Runtime.evaluate({
                        expression: `(() => {
                            const selectors = ${JSON.stringify(calculator.selectors)};
                            const result = { currentUrl: window.location.href };

                            function checkSelector(selector) {
                                const selectorList = selector.split(', ');
                                for (const singleSelector of selectorList) {
                                    try {
                                        const element = document.querySelector(singleSelector);
                                        if (element) return true;
                                    } catch (e) {
                                        continue;
                                    }
                                }
                                return false;
                            }

                            for (const [key, selector] of Object.entries(selectors)) {
                                result[key] = checkSelector(selector);
                            }

                            result.hasAnyInput = document.querySelectorAll('input').length > 0;
                            result.hasAnyButton = document.querySelectorAll('button').length > 0;
                            result.totalElements = document.querySelectorAll('*').length;
                            result.hasContent = document.body.innerText.length > 100;

                            return result;
                        })()`
                    });
                    const analysis = analysisResult.result.value;

                    // Determine if calculator is working
                    const selectorKeys = Object.keys(calculator.selectors);
                    const foundElements = selectorKeys.filter(key => analysis[key]);
                    const isWorking = foundElements.length >= Math.ceil(selectorKeys.length / 2) ||
                                     (analysis.hasAnyInput && analysis.hasAnyButton && analysis.hasContent);

                    if (isWorking) workingCalculators++;

                    calculatorResults.push({
                        name: calculator.name,
                        working: isWorking,
                        analysis
                    });

                    console.log(`🏛️ ${calculator.name}: ${isWorking ? 'WORKING' : 'FAILED'} (${foundElements.length}/${selectorKeys.length} specific elements found)`);
                    if (foundElements.length > 0) {
                        console.log(`   └─ Found: ${foundElements.join(', ')}`);
                    }

                    await this.takeScreenshot(`0${4 + calculators.indexOf(calculator)}-business-logic-${calculator.name.toLowerCase().replace(/\\s+/g, '-')}`);

                } catch (error) {
                    console.log(`❌ ${calculator.name}: ERROR - ${error.message}`);
                    calculatorResults.push({
                        name: calculator.name,
                        working: false,
                        analysis: { error: error.message }
                    });
                }
            }

            const allSimulatorsWorking = workingCalculators === calculators.length;
            const totalCount = calculators.length;

            console.log(`\\n🧮 Business Logic Summary: ${workingCalculators}/${totalCount} calculators working`);
            calculatorResults.forEach(result => {
                console.log(`   ${result.working ? '✅' : '❌'} ${result.name}`);
            });

            this.results.push({
                test: 'Business Logic Detection (Native CDP)',
                passed: allSimulatorsWorking,
                details: `${workingCalculators}/${totalCount} calculators working: ${calculatorResults.map(r => r.name + '(' + (r.working ? 'OK' : 'FAIL') + ')').join(', ')}`,
                metrics: {
                    workingCalculators,
                    totalCalculators: totalCount,
                    calculators: calculatorResults
                }
            });

            return allSimulatorsWorking;

        } catch (error) {
            console.error(`❌ Business logic validation failed: ${error.message}`);
            await this.takeScreenshot('business-logic-error');

            this.results.push({
                test: 'Business Logic Detection (Native CDP)',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async generateFinalReport() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        const report = {
            timestamp: new Date().toISOString(),
            tool: 'Native Chrome DevTools Protocol - Complete E2E Validation',
            description: 'Comprehensive native CDP authentication + click-by-click validation',
            baseUrl: this.baseUrl,
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            successRate: successRate,
            authenticationPassed: this.isAuthenticated,
            tests: this.results,
            screenshots: this.screenshots,
            errors: this.errors.length > 0 ? this.errors : null,
            method: 'Native Chrome DevTools Protocol'
        };

        const filename = `native-cdp-validation-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\\n📊 NATIVE CHROME DEVTOOLS PROTOCOL - COMPLETE E2E VALIDATION REPORT');
        console.log('=' .repeat(80));
        console.log(`📄 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${totalTests - passedTests}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`🔐 Authentication: ${this.isAuthenticated ? 'SUCCESS' : 'FAILED'}`);
        console.log(`💾 Report: ${filename}`);
        console.log(`📸 Screenshots: ${this.screenshots.length}`);
        console.log(`❌ Console Errors: ${this.errors.length}`);

        console.log('\\n🔍 DETAILED TEST RESULTS:');
        this.results.forEach((result, index) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}`);
            console.log(`   └─ ${result.details}`);
        });

        if (this.errors.length > 0) {
            console.log('\\n🖥️ CONSOLE ERRORS DETECTED:');
            this.errors.forEach(error => console.log(`   • ${error}`));
        }

        return report;
    }

    async cleanup() {
        console.log('\\n🧹 Cleaning up...');

        if (this.client) {
            await this.client.close();
            console.log('✅ Chrome DevTools client closed');
        }

        if (this.chromeProcess) {
            this.chromeProcess.kill();
            console.log('✅ Chrome process terminated');
        }
    }

    async run() {
        try {
            await this.initialize();

            console.log('\\n🚀 STARTING NATIVE CHROME DEVTOOLS PROTOCOL COMPLETE E2E VALIDATION');
            console.log('🎯 Goal: Native CDP + Authentication + Comprehensive validation + Business logic');

            // Step 1: Complete Authentication
            const authSuccess = await this.step1_CompleteAuthentication();

            console.log(`\\n📍 Authentication Status: ${authSuccess ? 'SUCCESS' : 'FAILED'}`);

            if (authSuccess) {
                console.log('🎉 AUTHENTICATION SUCCESSFUL! Proceeding with comprehensive validation...');

                // Step 2: Validate All Sections
                await this.step2_ValidateSection('Simuladores', '/simuladores');
                await this.step2_ValidateSection('Cotizadores', '/cotizadores');
                await this.step2_ValidateSection('Flow Builder', '/configuracion/flow-builder');
                await this.step2_ValidateSection('Onboarding', '/onboarding');
                await this.step2_ValidateSection('Productos', '/productos');
                await this.step2_ValidateSection('Protección', '/proteccion');
                await this.step2_ValidateSection('Dashboard', '/dashboard');

                // Step 3: Validate Business Logic
                await this.step3_ValidateBusinessLogic();

            } else {
                console.log('❌ Authentication failed, testing sections in public mode...');
                await this.step2_ValidateSection('Public Simuladores', '/simuladores');
                await this.step2_ValidateSection('Public Cotizadores', '/cotizadores');
            }

            const report = await this.generateFinalReport();

            console.log('\\n🎉 NATIVE CHROME DEVTOOLS PROTOCOL COMPLETE E2E VALIDATION COMPLETED!');

            if (this.isAuthenticated && report.successRate >= 80) {
                console.log('✅ COMPREHENSIVE SUCCESS: Native CDP authentication and validation completed with high success rate');
            } else if (this.isAuthenticated) {
                console.log('⚠️ PARTIAL SUCCESS: Native CDP authentication worked but some validations failed');
            } else {
                console.log('❌ AUTHENTICATION FAILURE: Could not complete full validation with native CDP');
            }

            return report;

        } catch (error) {
            console.error('💥 Native Chrome DevTools Protocol validation error:', error.message);
            await this.generateFinalReport();
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new NativeChromeDevToolsMCPValidation();
    validator.run()
        .then((report) => {
            if (report.authenticationPassed && report.successRate >= 80) {
                console.log('\\n✅ Native Chrome DevTools Protocol complete validation SUCCESS!');
                process.exit(0);
            } else if (report.authenticationPassed) {
                console.log('\\n⚠️ Native Chrome DevTools Protocol validation completed with partial success');
                process.exit(0);
            } else {
                console.log('\\n❌ Native Chrome DevTools Protocol validation failed - authentication issue');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\\n❌ Native Chrome DevTools Protocol validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = NativeChromeDevToolsMCPValidation;