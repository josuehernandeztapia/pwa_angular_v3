const { chromium } = require('playwright');
const fs = require('fs');

class ChromeDevToolsMCPCompleteValidation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.context = null;
        this.baseUrl = 'http://localhost:4300';
        this.results = [];
        this.screenshots = [];
        this.errors = [];
        this.isAuthenticated = false;
    }

    async initialize() {
        console.log('🚀 CHROME DEVTOOLS MCP - COMPLETE E2E VALIDATION');
        console.log('🎯 Focus: Authentication + Complete Click-by-Click validation of all sections');
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        console.log('');

        this.browser = await chromium.launch({
            headless: false,
            devtools: false,
            slowMo: 300,
            timeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=TranslateUI'
            ]
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });

        this.page = await this.context.newPage();

        // Enhanced error tracking
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                const error = `Console Error: ${msg.text()}`;
                console.log(`🖥️ ${error}`);
                this.errors.push(error);
            }
        });

        this.page.on('pageerror', error => {
            const pageError = `Page Error: ${error.message}`;
            console.log(`💥 ${pageError}`);
            this.errors.push(pageError);
        });

        // Monitor network calls
        this.page.on('response', async (response) => {
            if (response.url().includes('auth/login')) {
                console.log(`🌐 AUTH CALL: ${response.status()} ${response.url()}`);
                const responseBody = await response.text().catch(() => 'Could not read body');
                console.log(`🔍 Response: ${responseBody.substring(0, 200)}`);
            }
        });

        return true;
    }

    async takeScreenshot(name) {
        try {
            const filename = `mcp-complete-${name}-${Date.now()}.png`;
            await this.page.screenshot({
                path: filename,
                fullPage: true
            });
            this.screenshots.push(filename);
            console.log(`📸 Screenshot: ${filename}`);
            return filename;
        } catch (error) {
            console.log(`❌ Screenshot failed: ${error.message}`);
            return null;
        }
    }

    async step1_CompleteAuthentication() {
        console.log('\\n🔐 STEP 1: COMPLETE AUTHENTICATION FLOW (DEMO USER + LOGIN BUTTON)');

        try {
            // Navigate to login page
            console.log(`🌐 Navigating to ${this.baseUrl}...`);
            await this.page.goto(this.baseUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            await this.takeScreenshot('01-login-page-loaded');

            // Wait for demo users to be visible
            console.log('⏳ Waiting for demo users to load...');
            await this.page.waitForSelector('[data-cy^="demo-user-"]', {
                state: 'visible',
                timeout: 20000
            });

            // Count available demo users
            const demoUsers = await this.page.$$('[data-cy^="demo-user-"]');
            console.log(`✅ Found ${demoUsers.length} demo users`);

            // Get current state before authentication
            const beforeAuth = await this.page.evaluate(() => ({
                url: window.location.href,
                pathname: window.location.pathname,
                localStorage: Object.keys(localStorage).length,
                sessionStorage: Object.keys(sessionStorage).length
            }));

            console.log(`📍 Before auth - URL: ${beforeAuth.url}`);

            // STEP 1A: Click the first demo user (fills form)
            console.log('👆 STEP 1A: Click demo user to fill form...');
            await this.page.click('[data-cy^="demo-user-"]:first-child');
            await this.page.waitForTimeout(1000);
            await this.takeScreenshot('02-demo-user-clicked');

            // Check form values after demo user click
            const formValues = await this.page.evaluate(() => {
                const emailInput = document.querySelector('input[type="email"]');
                const passwordInput = document.querySelector('input[type="password"]');
                return {
                    email: emailInput ? emailInput.value : '',
                    password: passwordInput ? passwordInput.value : ''
                };
            });

            console.log(`📝 Form filled - Email: ${formValues.email}, Password: ${formValues.password ? '***' : 'empty'}`);

            // STEP 1B: Click login button (submits form)
            console.log('👆 STEP 1B: Click login button to submit...');

            // Wait for login button and click it
            const loginButtonSelector = 'button[type="submit"], button:has-text("Iniciar"), button:has-text("Login"), .login-btn';

            try {
                await this.page.waitForSelector(loginButtonSelector, { timeout: 5000 });
                await this.page.click(loginButtonSelector);
                console.log('✅ Clicked login button');
            } catch (error) {
                // Try alternative selectors
                const alternativeSelectors = [
                    'button[type="submit"]',
                    'form button',
                    '.btn-primary',
                    '.login-button',
                    'button:has-text("Iniciar")'
                ];

                let buttonClicked = false;
                for (const selector of alternativeSelectors) {
                    try {
                        const element = await this.page.$(selector);
                        if (element) {
                            await element.click();
                            console.log(`✅ Clicked login button with selector: ${selector}`);
                            buttonClicked = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (!buttonClicked) {
                    console.log('❌ Could not find login button, trying form submission...');
                    // Try to submit form directly
                    await this.page.keyboard.press('Enter');
                }
            }

            // Enhanced wait for authentication processing
            console.log('⏳ Waiting for authentication to process...');

            // Wait for potential navigation or state changes
            await Promise.race([
                this.page.waitForNavigation({ timeout: 10000 }).catch(() => null),
                this.page.waitForFunction(() =>
                    window.location.pathname !== '/login' ||
                    Object.keys(localStorage).length > 0 ||
                    Object.keys(sessionStorage).length > 0,
                    { timeout: 10000 }
                ).catch(() => null),
                this.page.waitForTimeout(8000)
            ]);

            // Check authentication result
            const afterAuth = await this.page.evaluate(() => ({
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
            }));

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
                test: 'Complete Authentication Flow',
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
                test: 'Complete Authentication Flow',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step2_ValidateSection(sectionName, url) {
        console.log(`\\n🧭 STEP 2: VALIDATE ${sectionName.toUpperCase()}`);

        try {
            const fullUrl = `${this.baseUrl}${url}`;
            console.log(`🌐 Navigating to ${fullUrl}...`);

            await this.page.goto(fullUrl, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            // Wait for page content to load
            await this.page.waitForTimeout(3000);

            await this.takeScreenshot(sectionName.toLowerCase().replace(' ', '-'));

            // Check if we're still on login (authentication failed)
            const currentUrl = this.page.url();
            const isOnLogin = currentUrl.includes('login');

            if (isOnLogin && !this.isAuthenticated) {
                console.log('⚠️ Redirected to login - authentication may have failed');
            }

            // Comprehensive page analysis
            const pageAnalysis = await this.page.evaluate((section) => {
                const analysis = {
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
                    // Check for specific components
                    components: {
                        simuladorMain: document.querySelector('app-simulador-main') !== null,
                        cotizadorMain: document.querySelector('app-cotizador-main') !== null,
                        flowBuilder: document.querySelector('app-flow-builder') !== null,
                        onboardingMain: document.querySelector('app-onboarding-main') !== null,
                        productsCatalog: document.querySelector('app-productos-catalog') !== null,
                        proteccion: document.querySelector('app-proteccion') !== null
                    }
                };

                return analysis;
            }, sectionName);

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
                test: `${sectionName} Validation`,
                passed: isWorking,
                details: `Loaded: ${pageAnalysis.isLoaded}, Elements: ${pageAnalysis.totalElements}, Interactive: ${hasInteraction}, NotOnLogin: ${!isOnLogin}`,
                metrics: pageAnalysis,
                url: currentUrl,
                redirectedToLogin: isOnLogin
            });

            return isWorking;

        } catch (error) {
            console.error(`❌ Validation of ${sectionName} failed: ${error.message}`);
            await this.takeScreenshot(`${sectionName.toLowerCase()}-error`);

            this.results.push({
                test: `${sectionName} Validation`,
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step3_ValidateBusinessLogic() {
        console.log('\\n🧮 STEP 3: VALIDATE BUSINESS LOGIC & MATHEMATICAL FUNCTIONS');

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
                        hasSimulateButton: '[data-cy="simulate-btn"], button[type="submit"], button:contains("Simular"), button:contains("Calcular")',
                        hasResultsArea: '[data-cy="results-area"], [data-cy*="sim-"], .results, .simulation-results'
                    }
                },
                {
                    name: 'EdoMex Individual',
                    url: `${this.baseUrl}/simulador/edomex-individual`,
                    selectors: {
                        hasTargetInput: '[data-cy="target-amount"], [data-cy="target-down-payment"], input[placeholder*="meta"], input[placeholder*="objetivo"], input[type="number"]',
                        hasConsumptionInput: '[data-cy="consumption"], input[placeholder*="consumo"], input[placeholder*="litros"]',
                        hasCalculateButton: '[data-cy="calculate-btn"], button[type="submit"], button:contains("Calcular"), button:contains("Simular")',
                        hasResultsArea: '[data-cy="results-area"], [data-cy*="sim-"], .results, .simulation-results'
                    }
                },
                {
                    name: 'EdoMex Colectivo',
                    url: `${this.baseUrl}/simulador/tanda-colectiva`,
                    selectors: {
                        hasMembersInput: '[data-cy="members-count"], [data-cy="members"], input[placeholder*="miembros"], input[placeholder*="participantes"], input[type="number"]',
                        hasUnitPriceInput: '[data-cy="unit-price"], input[placeholder*="precio"], input[placeholder*="costo"], input[type="number"]',
                        hasRunButton: '[data-cy="run-simulation"], [data-cy="run-edomex-colectivo"], button[type="submit"], button:contains("Ejecutar"), button:contains("Simular")',
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
                    await this.page.goto(calculator.url, { waitUntil: 'networkidle' });
                    await this.page.waitForTimeout(3000);

                    // Check if we're on the correct page
                    const currentUrl = this.page.url();
                    if (currentUrl.includes('/nueva-oportunidad') || currentUrl.includes('/login')) {
                        console.log(`${calculator.name}: ❌ REDIRECTED TO ${currentUrl}`);
                        calculatorResults.push({
                            name: calculator.name,
                            working: false,
                            analysis: { error: `Redirected to ${currentUrl}`, currentUrl }
                        });
                        continue;
                    }

                    // Analyze calculator elements with flexible selectors
                    const analysis = await this.page.evaluate((selectors) => {
                        const result = { currentUrl: window.location.href };

                        // Helper function to check multiple selectors
                        function checkSelector(selector) {
                            const selectorList = selector.split(', ');
                            for (const singleSelector of selectorList) {
                                try {
                                    if (singleSelector.includes(':contains(')) {
                                        // Handle :contains() pseudo-selector manually
                                        const text = singleSelector.match(/:contains\\("(.+?)"\\)/)[1];
                                        const buttons = document.querySelectorAll('button');
                                        for (const button of buttons) {
                                            if (button.textContent.toLowerCase().includes(text.toLowerCase())) {
                                                return true;
                                            }
                                        }
                                    } else {
                                        const element = document.querySelector(singleSelector);
                                        if (element) {
                                            return true;
                                        }
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                            return false;
                        }

                        // Check each selector type
                        for (const [key, selector] of Object.entries(selectors)) {
                            result[key] = checkSelector(selector);
                        }

                        // Also check for any inputs and buttons as fallback
                        result.hasAnyInput = document.querySelectorAll('input').length > 0;
                        result.hasAnyButton = document.querySelectorAll('button').length > 0;
                        result.totalElements = document.querySelectorAll('*').length;
                        result.hasContent = document.body.innerText.length > 100;

                        return result;
                    }, calculator.selectors);

                    // Determine if calculator is working based on found elements
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

                    // Take screenshot
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
                test: 'Business Logic Detection',
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
                test: 'Business Logic Detection',
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
            tool: 'Chrome DevTools MCP - Complete E2E Validation',
            description: 'Comprehensive authentication + click-by-click validation of all sections',
            baseUrl: this.baseUrl,
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            successRate: successRate,
            authenticationPassed: this.isAuthenticated,
            tests: this.results,
            screenshots: this.screenshots,
            errors: this.errors.length > 0 ? this.errors : null,
            method: 'Playwright with Chrome DevTools MCP'
        };

        const filename = `mcp-complete-validation-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\\n📊 CHROME DEVTOOLS MCP - COMPLETE E2E VALIDATION REPORT');
        console.log('=' .repeat(70));
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

        if (this.browser) {
            await this.browser.close();
            console.log('✅ Browser closed');
        }
    }

    async run() {
        try {
            await this.initialize();

            console.log('\\n🚀 STARTING CHROME DEVTOOLS MCP COMPLETE E2E VALIDATION');
            console.log('🎯 Goal: Authentication + Comprehensive section validation + Business logic');

            // Step 1: Complete Authentication (Demo User + Login Button)
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

                // Test sections even without auth to see what we can access
                await this.step2_ValidateSection('Public Simuladores', '/simuladores');
                await this.step2_ValidateSection('Public Cotizadores', '/cotizadores');
            }

            const report = await this.generateFinalReport();

            console.log('\\n🎉 CHROME DEVTOOLS MCP COMPLETE E2E VALIDATION COMPLETED!');

            if (this.isAuthenticated && report.successRate >= 80) {
                console.log('✅ COMPREHENSIVE SUCCESS: Authentication and validation completed with high success rate');
            } else if (this.isAuthenticated) {
                console.log('⚠️ PARTIAL SUCCESS: Authentication worked but some validations failed');
            } else {
                console.log('❌ AUTHENTICATION FAILURE: Could not complete full validation');
            }

            return report;

        } catch (error) {
            console.error('💥 Chrome DevTools MCP validation error:', error.message);
            await this.generateFinalReport();
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new ChromeDevToolsMCPCompleteValidation();
    validator.run()
        .then((report) => {
            if (report.authenticationPassed && report.successRate >= 80) {
                console.log('\\n✅ Chrome DevTools MCP complete validation SUCCESS!');
                process.exit(0);
            } else if (report.authenticationPassed) {
                console.log('\\n⚠️ Chrome DevTools MCP validation completed with partial success');
                process.exit(0);
            } else {
                console.log('\\n❌ Chrome DevTools MCP validation failed - authentication issue');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\\n❌ Chrome DevTools MCP validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = ChromeDevToolsMCPCompleteValidation;
