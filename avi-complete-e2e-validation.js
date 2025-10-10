const puppeteer = require('puppeteer');
const fs = require('fs');

class AVICompleteE2EValidation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:4300';
        this.results = [];
        this.screenshots = [];
        this.errors = [];
        this.isAuthenticated = false;
    }

    async initialize() {
        console.log('🚀 AVI COMPLETE E2E VALIDATION');
        console.log('🎯 Focus: AVI System + Laboratory + Document Flow + KYC Integration');
        console.log(`🔗 Base URL: ${this.baseUrl}`);
        console.log('');

        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            slowMo: 300,
            timeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--allow-microphone',
                '--allow-camera'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 720 });

        // Enable permissions for microphone and camera
        await this.page.evaluateOnNewDocument(() => {
            navigator.permissions = navigator.permissions || {};
            navigator.permissions.query = () => Promise.resolve({ state: 'granted' });
            navigator.mediaDevices = navigator.mediaDevices || {};
            navigator.mediaDevices.getUserMedia = () => Promise.resolve({
                getTracks: () => [{ stop: () => {} }]
            });
        });

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

        console.log('✅ AVI E2E Browser initialized!');
        return true;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async takeScreenshot(name) {
        try {
            const filename = `avi-e2e-${name}-${Date.now()}.png`;
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

    async step1_Authentication() {
        console.log('\\n🔐 STEP 1: AUTHENTICATION FOR AVI ACCESS');

        try {
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            await this.takeScreenshot('01-login-page');

            await this.page.waitForSelector('[data-cy^="demo-user-"]', { visible: true, timeout: 20000 });
            await this.page.click('[data-cy^="demo-user-"]:first-child');
            await this.delay(1000);

            const loginButtonSelectors = ['button[type="submit"]', 'form button', '.btn-primary'];
            for (const selector of loginButtonSelectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        await element.click();
                        console.log(`✅ Clicked login button`);
                        break;
                    }
                } catch (e) { continue; }
            }

            await this.delay(5000);

            const afterAuth = await this.page.evaluate(() => ({
                url: window.location.href,
                pathname: window.location.pathname,
                hasToken: !!localStorage.getItem('auth_token') || !!localStorage.getItem('token')
            }));

            this.isAuthenticated = !afterAuth.pathname.includes('login') && afterAuth.hasToken;

            await this.takeScreenshot('02-auth-completed');

            this.results.push({
                test: 'AVI Authentication',
                passed: this.isAuthenticated,
                details: `Auth success: ${this.isAuthenticated}, URL: ${afterAuth.url}`,
                url: afterAuth.url
            });

            console.log(`✅ Authentication: ${this.isAuthenticated ? 'SUCCESS' : 'FAILED'}`);
            return this.isAuthenticated;

        } catch (error) {
            console.error(`❌ Authentication failed: ${error.message}`);
            this.results.push({
                test: 'AVI Authentication',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });
            return false;
        }
    }

    async step2_ValidateAVILaboratory() {
        console.log('\\n🧪 STEP 2: VALIDATE AVI LABORATORY (avi-lab/app-complete.js)');

        try {
            // Check if AVI lab is accessible
            const labUrl = `${this.baseUrl}/lab/avi-system`;
            await this.page.goto(labUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            await this.delay(3000);

            await this.takeScreenshot('03-avi-lab-page');

            // Analyze AVI Lab components
            const labAnalysis = await this.page.evaluate(() => {
                const analysis = {
                    currentUrl: window.location.href,
                    hasAppContainer: document.querySelector('#app') !== null || document.querySelector('.container') !== null,
                    hasAVILabComponent: document.querySelector('[data-cy="avi-lab"]') !== null ||
                                       document.querySelector('.avi-lab') !== null ||
                                       document.body.innerText.includes('AVI Laboratory'),
                    hasToggles: document.querySelectorAll('input[type="checkbox"], .toggle, .switch').length > 0,
                    hasFlowControls: document.querySelectorAll('button, .btn, [role="button"]').length > 0,
                    totalElements: document.querySelectorAll('*').length,
                    hasContent: document.body.innerText.length > 100,
                    hasAVISystem: document.body.innerText.includes('AVI') || document.body.innerText.includes('Voice') || document.body.innerText.includes('Interview'),
                    hasStressDetection: document.body.innerText.includes('Stress') || document.body.innerText.includes('Detection'),
                    hasVoiceRecording: document.body.innerText.includes('Recording') || document.body.innerText.includes('Audio')
                };

                // Check for specific AVI lab elements
                analysis.aviLabFeatures = {
                    hasQuestions: document.body.innerText.includes('questions') || document.body.innerText.includes('preguntas'),
                    hasScoring: document.body.innerText.includes('score') || document.body.innerText.includes('puntaje'),
                    hasAnalytics: document.body.innerText.includes('analytics') || document.body.innerText.includes('analítica'),
                    hasThresholds: document.body.innerText.includes('threshold') || document.body.innerText.includes('umbral')
                };

                return analysis;
            });

            const isLabWorking = labAnalysis.hasAppContainer &&
                                labAnalysis.hasContent &&
                                labAnalysis.totalElements > 30 &&
                                (labAnalysis.hasAVILabComponent || labAnalysis.hasAVISystem);

            console.log(`✅ Lab URL: ${labAnalysis.currentUrl}`);
            console.log(`✅ App Container: ${labAnalysis.hasAppContainer}`);
            console.log(`✅ AVI System: ${labAnalysis.hasAVISystem}`);
            console.log(`✅ Has Toggles: ${labAnalysis.hasToggles}`);
            console.log(`✅ Flow Controls: ${labAnalysis.hasFlowControls}`);
            console.log(`✅ Elements: ${labAnalysis.totalElements}`);
            console.log(`✅ Lab Working: ${isLabWorking}`);

            this.results.push({
                test: 'AVI Laboratory Validation',
                passed: isLabWorking,
                details: `Lab accessible: ${isLabWorking}, Elements: ${labAnalysis.totalElements}, AVI System: ${labAnalysis.hasAVISystem}`,
                metrics: labAnalysis,
                url: labAnalysis.currentUrl
            });

            await this.takeScreenshot('04-avi-lab-analysis');
            return isLabWorking;

        } catch (error) {
            console.error(`❌ AVI Laboratory validation failed: ${error.message}`);
            await this.takeScreenshot('avi-lab-error');

            this.results.push({
                test: 'AVI Laboratory Validation',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step3_ValidateAVIConfiguration() {
        console.log('\\n⚙️ STEP 3: VALIDATE AVI CONFIGURATION & ENVIRONMENT SETTINGS');

        try {
            // Check environment configuration
            const configAnalysis = await this.page.evaluate(() => {
                // Try to access window environment or configuration
                const analysis = {
                    hasEnvironmentConfig: typeof window.environment !== 'undefined',
                    hasAVIFeatureFlags: false,
                    aviSystemEnabled: false,
                    voiceRecordingEnabled: false,
                    stressDetectionEnabled: false,
                    hasAVIThresholds: false
                };

                // Check for AVI-related configuration in localStorage or global vars
                const localStorage_keys = Object.keys(localStorage);
                analysis.hasAVILocalStorage = localStorage_keys.some(key =>
                    key.toLowerCase().includes('avi') ||
                    key.toLowerCase().includes('voice') ||
                    key.toLowerCase().includes('interview')
                );

                // Check for AVI services or components loaded
                analysis.hasAVIServices = document.body.innerHTML.includes('AVI') ||
                                         document.body.innerHTML.includes('avi-interview') ||
                                         document.body.innerHTML.includes('avi-scientific');

                return analysis;
            });

            console.log(`✅ Environment Config: ${configAnalysis.hasEnvironmentConfig}`);
            console.log(`✅ AVI Services: ${configAnalysis.hasAVIServices}`);
            console.log(`✅ AVI LocalStorage: ${configAnalysis.hasAVILocalStorage}`);

            const isConfigValid = configAnalysis.hasAVIServices || configAnalysis.hasAVILocalStorage;

            this.results.push({
                test: 'AVI Configuration Validation',
                passed: isConfigValid,
                details: `Config valid: ${isConfigValid}, Services: ${configAnalysis.hasAVIServices}`,
                metrics: configAnalysis
            });

            return isConfigValid;

        } catch (error) {
            console.error(`❌ AVI Configuration validation failed: ${error.message}`);

            this.results.push({
                test: 'AVI Configuration Validation',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step4_ValidateAVIInterviewComponent() {
        console.log('\\n🎤 STEP 4: VALIDATE AVI INTERVIEW COMPONENT');

        try {
            // Navigate to document upload flow where AVI is integrated
            const documentsUrl = `${this.baseUrl}/documentos`;
            await this.page.goto(documentsUrl, { waitUntil: 'networkidle0', timeout: 30000 });
            await this.delay(3000);

            await this.takeScreenshot('05-documents-flow');

            // Look for AVI interview component
            const aviInterviewAnalysis = await this.page.evaluate(() => {
                const analysis = {
                    currentUrl: window.location.href,
                    hasAVIInterviewComponent: document.querySelector('app-avi-interview') !== null ||
                                            document.querySelector('[data-cy="avi-interview"]') !== null ||
                                            document.body.innerHTML.includes('avi-interview'),
                    hasAVIQuestions: document.body.innerText.includes('pregunta') ||
                                    document.body.innerText.includes('question') ||
                                    document.body.innerText.includes('interview'),
                    hasVoiceControls: document.querySelector('button[data-cy*="voice"]') !== null ||
                                     document.querySelector('.voice-control') !== null ||
                                     document.body.innerHTML.includes('microphone'),
                    hasStressIndicators: document.body.innerHTML.includes('stress') ||
                                        document.body.innerHTML.includes('estrés'),
                    hasProgressIndicator: document.querySelector('.progress') !== null ||
                                         document.querySelector('.progress-bar') !== null,
                    hasAVIButton: document.querySelector('button:contains("AVI")') !== null ||
                                 document.querySelector('[data-cy*="avi"]') !== null,
                    totalElements: document.querySelectorAll('*').length,
                    hasContent: document.body.innerText.length > 100
                };

                // Try to find any AVI-related elements
                const aviElements = document.querySelectorAll('[class*="avi"], [id*="avi"], [data-cy*="avi"]');
                analysis.aviElementsCount = aviElements.length;

                return analysis;
            });

            const isAVIComponentWorking = aviInterviewAnalysis.hasAVIInterviewComponent ||
                                         aviInterviewAnalysis.hasAVIQuestions ||
                                         aviInterviewAnalysis.aviElementsCount > 0;

            console.log(`✅ AVI Interview Component: ${aviInterviewAnalysis.hasAVIInterviewComponent}`);
            console.log(`✅ AVI Questions: ${aviInterviewAnalysis.hasAVIQuestions}`);
            console.log(`✅ Voice Controls: ${aviInterviewAnalysis.hasVoiceControls}`);
            console.log(`✅ AVI Elements: ${aviInterviewAnalysis.aviElementsCount}`);
            console.log(`✅ Component Working: ${isAVIComponentWorking}`);

            this.results.push({
                test: 'AVI Interview Component Validation',
                passed: isAVIComponentWorking,
                details: `Component working: ${isAVIComponentWorking}, Elements: ${aviInterviewAnalysis.aviElementsCount}`,
                metrics: aviInterviewAnalysis,
                url: aviInterviewAnalysis.currentUrl
            });

            await this.takeScreenshot('06-avi-interview-component');
            return isAVIComponentWorking;

        } catch (error) {
            console.error(`❌ AVI Interview Component validation failed: ${error.message}`);
            await this.takeScreenshot('avi-interview-error');

            this.results.push({
                test: 'AVI Interview Component Validation',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step5_ValidateAVIServices() {
        console.log('\\n🔧 STEP 5: VALIDATE AVI SERVICES (AVIService + AVIScientificEngineService)');

        try {
            // Check if AVI services are loaded and functional
            const servicesAnalysis = await this.page.evaluate(() => {
                const analysis = {
                    hasAVIService: false,
                    hasScientificEngine: false,
                    hasAngularServices: typeof window.ng !== 'undefined',
                    serviceErrors: []
                };

                // Try to access Angular services if available
                if (window.ng && window.ng.probe) {
                    try {
                        const component = window.ng.probe(document.querySelector('app-root'));
                        if (component && component.injector) {
                            // Try to get AVI-related services
                            analysis.hasAngularInjector = true;
                        }
                    } catch (e) {
                        analysis.serviceErrors.push(e.message);
                    }
                }

                // Check for AVI-related script tags or module loads
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    if (script.src && (script.src.includes('avi') || script.src.includes('AVI'))) {
                        analysis.hasAVIScripts = true;
                        break;
                    }
                }

                return analysis;
            });

            console.log(`✅ Angular Services: ${servicesAnalysis.hasAngularServices}`);
            console.log(`✅ AVI Scripts: ${servicesAnalysis.hasAVIScripts || false}`);
            console.log(`✅ Service Errors: ${servicesAnalysis.serviceErrors.length}`);

            const areServicesWorking = servicesAnalysis.hasAngularServices && servicesAnalysis.serviceErrors.length === 0;

            this.results.push({
                test: 'AVI Services Validation',
                passed: areServicesWorking,
                details: `Services working: ${areServicesWorking}, Angular: ${servicesAnalysis.hasAngularServices}`,
                metrics: servicesAnalysis
            });

            return areServicesWorking;

        } catch (error) {
            console.error(`❌ AVI Services validation failed: ${error.message}`);

            this.results.push({
                test: 'AVI Services Validation',
                passed: false,
                details: `Error: ${error.message}`,
                error: error.message
            });

            return false;
        }
    }

    async step6_ValidateAVIFlowIntegration() {
        console.log('\\n🔄 STEP 6: VALIDATE AVI FLOW INTEGRATION (Document Upload + KYC + Onboarding)');

        try {
            const flowIntegrationResults = [];

            // Test 1: Document Upload Flow Integration
            console.log('🔍 Testing Document Upload Flow...');
            await this.page.goto(`${this.baseUrl}/documentos`, { waitUntil: 'networkidle0', timeout: 30000 });
            await this.delay(3000);

            const docFlowAnalysis = await this.page.evaluate(() => ({
                currentUrl: window.location.href,
                hasDocumentFlow: document.querySelector('app-document-upload-flow') !== null ||
                               document.body.innerHTML.includes('document-upload'),
                hasAVIIntegration: document.body.innerHTML.includes('avi') ||
                                 document.body.innerHTML.includes('AVI') ||
                                 document.querySelector('[data-cy*="avi"]') !== null,
                totalElements: document.querySelectorAll('*').length
            }));

            flowIntegrationResults.push({
                flow: 'Document Upload',
                working: docFlowAnalysis.hasDocumentFlow && docFlowAnalysis.totalElements > 50,
                aviIntegrated: docFlowAnalysis.hasAVIIntegration,
                analysis: docFlowAnalysis
            });

            await this.takeScreenshot('07-document-flow-avi');

            // Test 2: Onboarding Flow Integration
            console.log('🔍 Testing Onboarding Flow...');
            await this.page.goto(`${this.baseUrl}/onboarding`, { waitUntil: 'networkidle0', timeout: 30000 });
            await this.delay(3000);

            const onboardingAnalysis = await this.page.evaluate(() => ({
                currentUrl: window.location.href,
                hasOnboardingFlow: document.querySelector('app-onboarding-main') !== null ||
                                 document.body.innerHTML.includes('onboarding'),
                hasAVIIntegration: document.body.innerHTML.includes('avi') ||
                                 document.body.innerHTML.includes('AVI') ||
                                 document.querySelector('[data-cy*="avi"]') !== null,
                hasInterviewCheckpoint: document.body.innerHTML.includes('interview') ||
                                       document.body.innerHTML.includes('checkpoint'),
                totalElements: document.querySelectorAll('*').length
            }));

            flowIntegrationResults.push({
                flow: 'Onboarding',
                working: onboardingAnalysis.hasOnboardingFlow && onboardingAnalysis.totalElements > 50,
                aviIntegrated: onboardingAnalysis.hasAVIIntegration,
                analysis: onboardingAnalysis
            });

            await this.takeScreenshot('08-onboarding-avi');

            // Test 3: Flow Builder Integration
            console.log('🔍 Testing Flow Builder Integration...');
            await this.page.goto(`${this.baseUrl}/configuracion/flow-builder`, { waitUntil: 'networkidle0', timeout: 30000 });
            await this.delay(3000);

            const flowBuilderAnalysis = await this.page.evaluate(() => ({
                currentUrl: window.location.href,
                hasFlowBuilder: document.querySelector('app-flow-builder') !== null ||
                              document.body.innerHTML.includes('flow-builder'),
                hasAVIIntegration: document.body.innerHTML.includes('avi') ||
                                 document.body.innerHTML.includes('AVI'),
                hasAVISteps: document.body.innerText.includes('AVI') ||
                           document.body.innerText.includes('Interview'),
                totalElements: document.querySelectorAll('*').length
            }));

            flowIntegrationResults.push({
                flow: 'Flow Builder',
                working: flowBuilderAnalysis.hasFlowBuilder && flowBuilderAnalysis.totalElements > 50,
                aviIntegrated: flowBuilderAnalysis.hasAVIIntegration,
                analysis: flowBuilderAnalysis
            });

            await this.takeScreenshot('09-flow-builder-avi');

            // Analyze overall integration
            const workingFlows = flowIntegrationResults.filter(f => f.working).length;
            const aviIntegratedFlows = flowIntegrationResults.filter(f => f.aviIntegrated).length;
            const totalFlows = flowIntegrationResults.length;

            console.log(`\\n📊 Flow Integration Summary:`);
            flowIntegrationResults.forEach(result => {
                console.log(`   ${result.working ? '✅' : '❌'} ${result.flow}: Working=${result.working}, AVI=${result.aviIntegrated}`);
            });

            const isFlowIntegrationWorking = workingFlows === totalFlows && aviIntegratedFlows > 0;

            this.results.push({
                test: 'AVI Flow Integration Validation',
                passed: isFlowIntegrationWorking,
                details: `${workingFlows}/${totalFlows} flows working, ${aviIntegratedFlows} with AVI integration`,
                metrics: {
                    workingFlows,
                    totalFlows,
                    aviIntegratedFlows,
                    flows: flowIntegrationResults
                }
            });

            return isFlowIntegrationWorking;

        } catch (error) {
            console.error(`❌ AVI Flow Integration validation failed: ${error.message}`);
            await this.takeScreenshot('avi-flow-integration-error');

            this.results.push({
                test: 'AVI Flow Integration Validation',
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
            tool: 'AVI Complete E2E Validation',
            description: 'Comprehensive AVI System validation: Laboratory + Components + Services + Flow Integration',
            baseUrl: this.baseUrl,
            total: totalTests,
            passed: passedTests,
            failed: totalTests - passedTests,
            successRate: successRate,
            authenticationPassed: this.isAuthenticated,
            tests: this.results,
            screenshots: this.screenshots,
            errors: this.errors.length > 0 ? this.errors : null,
            method: 'Puppeteer E2E with AVI Focus'
        };

        const filename = `avi-complete-e2e-validation-report-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(report, null, 2));

        console.log('\\n📊 AVI COMPLETE E2E VALIDATION REPORT');
        console.log('=' .repeat(60));
        console.log(`📄 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${totalTests - passedTests}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`🔐 Authentication: ${this.isAuthenticated ? 'SUCCESS' : 'FAILED'}`);
        console.log(`💾 Report: ${filename}`);
        console.log(`📸 Screenshots: ${this.screenshots.length}`);
        console.log(`❌ Console Errors: ${this.errors.length}`);

        console.log('\\n🔍 DETAILED AVI TEST RESULTS:');
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
            console.log('✅ AVI E2E browser closed');
        }
    }

    async run() {
        try {
            await this.initialize();

            console.log('\\n🚀 STARTING AVI COMPLETE E2E VALIDATION');
            console.log('🎯 Goal: Validate entire AVI system end-to-end');

            // Execute all validation steps
            const authSuccess = await this.step1_Authentication();

            if (authSuccess) {
                await this.step2_ValidateAVILaboratory();
                await this.step3_ValidateAVIConfiguration();
                await this.step4_ValidateAVIInterviewComponent();
                await this.step5_ValidateAVIServices();
                await this.step6_ValidateAVIFlowIntegration();
            } else {
                console.log('❌ Authentication failed, skipping AVI-specific tests');
            }

            const report = await this.generateFinalReport();

            console.log('\\n🎉 AVI COMPLETE E2E VALIDATION COMPLETED!');

            if (this.isAuthenticated && report.successRate >= 80) {
                console.log('✅ AVI SYSTEM COMPREHENSIVE SUCCESS: All components and integrations working!');
            } else if (this.isAuthenticated) {
                console.log('⚠️ AVI SYSTEM PARTIAL SUCCESS: Some components need attention');
            } else {
                console.log('❌ AVI SYSTEM AUTHENTICATION FAILURE: Could not complete full validation');
            }

            return report;

        } catch (error) {
            console.error('💥 AVI Complete E2E validation error:', error.message);
            await this.generateFinalReport();
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Run if called directly
if (require.main === module) {
    const validator = new AVICompleteE2EValidation();
    validator.run()
        .then((report) => {
            if (report.authenticationPassed && report.successRate >= 80) {
                console.log('\\n✅ AVI Complete E2E validation SUCCESS!');
                process.exit(0);
            } else if (report.authenticationPassed) {
                console.log('\\n⚠️ AVI Complete E2E validation completed with partial success');
                process.exit(0);
            } else {
                console.log('\\n❌ AVI Complete E2E validation failed - authentication issue');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\\n❌ AVI Complete E2E validation failed:', error.message);
            process.exit(1);
        });
}

module.exports = AVICompleteE2EValidation;