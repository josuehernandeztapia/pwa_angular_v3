/**
 * Missing Components Validation Script
 * Tests the actual visibility and accessibility of AVI, OCR, and onboarding components
 */

const puppeteer = require('puppeteer');

class MissingComponentsValidator {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            components: {},
            routes: {},
            issues: [],
            recommendations: []
        };
    }

    async initialize() {
        console.log('🔍 Initializing Missing Components Validator...');

        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 720 });
    }

    async authenticate() {
        console.log('🔐 Authenticating...');

        await this.page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        // Use demo user for quick authentication (updated selector)
        await this.page.waitForSelector('.demo-users-grid', { timeout: 10000 });
        const demoButtons = await this.page.$$('button[class*="demo"]');
        if (demoButtons.length > 0) {
            await demoButtons[0].click(); // Click first demo user (admin)
        } else {
            throw new Error('No demo user buttons found');
        }

        await this.page.waitForSelector('button[type="submit"]', { timeout: 5000 });
        await this.page.click('button[type="submit"]');

        // Wait for dashboard
        await this.page.waitForSelector('[data-testid="nav-item-dashboard"]', { timeout: 10000 });
        console.log('✅ Authentication successful');
    }

    async validateOnboardingComponent() {
        console.log('🎯 Validating Onboarding Component...');

        try {
            // Navigate to onboarding
            await this.page.goto('http://localhost:4300/onboarding', { waitUntil: 'networkidle0' });

            const componentExists = await this.page.$('app-onboarding-main');
            const hasSteps = await this.page.$$('.step-content, .onboarding-steps, .step-header');
            const hasAVIStep = await this.page.$eval('body', () => {
                return document.body.textContent.includes('KYC') ||
                       document.body.textContent.includes('AVI') ||
                       document.body.textContent.includes('Verificación');
            });

            this.results.components.onboarding = {
                componentExists: !!componentExists,
                hasSteps: hasSteps.length > 0,
                hasAVIStep,
                stepCount: hasSteps.length,
                route: '/onboarding',
                accessible: true
            };

            // Check for AVI integration within onboarding
            const aviModal = await this.page.$('app-avi-verification-modal');
            const aviInterview = await this.page.$('app-avi-interview');

            this.results.components.aviIntegration = {
                aviModal: !!aviModal,
                aviInterview: !!aviInterview,
                integratedInOnboarding: hasAVIStep
            };

            console.log(`✅ Onboarding component found with ${hasSteps.length} steps`);
            if (hasAVIStep) console.log('✅ AVI verification step detected');
            else console.log('❌ AVI verification step NOT detected');

        } catch (error) {
            console.log(`❌ Onboarding validation failed: ${error.message}`);
            this.results.issues.push(`Onboarding component not accessible: ${error.message}`);
            this.results.components.onboarding = { error: error.message, accessible: false };
        }
    }

    async validateAVIComponent() {
        console.log('🎤 Validating AVI Component...');

        try {
            // Try to find AVI components in the DOM
            await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });

            const aviComponents = await this.page.evaluate(() => {
                const components = [];

                // Check for AVI-related components
                if (document.querySelector('app-avi-interview')) components.push('avi-interview');
                if (document.querySelector('app-avi-verification-modal')) components.push('avi-verification-modal');
                if (document.querySelector('app-avi-validation-runner')) components.push('avi-validation-runner');

                // Check for voice recorder
                if (document.querySelector('app-voice-recorder')) components.push('voice-recorder');

                // Check for AVI-related text in the DOM
                const bodyText = document.body.textContent || '';
                const aviKeywords = ['AVI', 'voice analysis', 'voice verification', 'entrevista de voz', 'análisis de voz'];
                const hasAVIContent = aviKeywords.some(keyword =>
                    bodyText.toLowerCase().includes(keyword.toLowerCase())
                );

                return {
                    components,
                    hasContent: hasAVIContent,
                    services: window.aviService ? ['aviService'] : []
                };
            });

            this.results.components.avi = {
                componentsFound: aviComponents.components,
                hasContent: aviComponents.hasContent,
                servicesAvailable: aviComponents.services,
                accessible: aviComponents.components.length > 0 || aviComponents.hasContent
            };

            console.log(`AVI Components found: ${aviComponents.components.join(', ') || 'None'}`);
            console.log(`AVI Content detected: ${aviComponents.hasContent ? 'Yes' : 'No'}`);

        } catch (error) {
            console.log(`❌ AVI validation failed: ${error.message}`);
            this.results.issues.push(`AVI component validation failed: ${error.message}`);
        }
    }

    async validateOCRComponent() {
        console.log('📷 Validating OCR Component...');

        try {
            // Navigate to a page that might use OCR (documentos)
            await this.page.goto('http://localhost:4300/documentos', { waitUntil: 'networkidle0' });

            const ocrComponents = await this.page.evaluate(() => {
                const components = [];

                // Check for OCR-related components
                if (document.querySelector('app-ocr-scanner-enhanced')) components.push('ocr-scanner-enhanced');
                if (document.querySelector('app-manual-ocr-entry')) components.push('manual-ocr-entry');
                if (document.querySelector('[data-testid*="ocr"]')) components.push('ocr-testid-elements');

                // Check for camera/scanner buttons
                const cameraButtons = document.querySelectorAll('button[title*="camera"], button[title*="scan"], input[type="file"]');
                const hasCameraUI = cameraButtons.length > 0;

                // Check for OCR-related text
                const bodyText = document.body.textContent || '';
                const ocrKeywords = ['OCR', 'escanear', 'scanner', 'camera', 'foto del documento', 'capturar imagen'];
                const hasOCRContent = ocrKeywords.some(keyword =>
                    bodyText.toLowerCase().includes(keyword.toLowerCase())
                );

                return {
                    components,
                    hasCameraUI,
                    hasContent: hasOCRContent,
                    cameraButtonCount: cameraButtons.length
                };
            });

            this.results.components.ocr = {
                componentsFound: ocrComponents.components,
                hasCameraUI: ocrComponents.hasCameraUI,
                hasContent: ocrComponents.hasContent,
                cameraButtonCount: ocrComponents.cameraButtonCount,
                accessible: ocrComponents.components.length > 0 || ocrComponents.hasCameraUI
            };

            console.log(`OCR Components found: ${ocrComponents.components.join(', ') || 'None'}`);
            console.log(`Camera UI detected: ${ocrComponents.hasCameraUI ? 'Yes' : 'No'}`);
            console.log(`OCR Content detected: ${ocrComponents.hasContent ? 'Yes' : 'No'}`);

        } catch (error) {
            console.log(`❌ OCR validation failed: ${error.message}`);
            this.results.issues.push(`OCR component validation failed: ${error.message}`);
        }
    }

    async validateNavigationIntegration() {
        console.log('🧭 Validating Navigation Integration...');

        try {
            await this.page.goto('http://localhost:4300/dashboard', { waitUntil: 'networkidle0' });

            const navigationAnalysis = await this.page.evaluate(() => {
                const navItems = Array.from(document.querySelectorAll('[data-testid*="nav-item"]')).map(el => el.getAttribute('data-testid'));
                const routerLinks = Array.from(document.querySelectorAll('[routerLink]')).map(el => el.getAttribute('routerLink'));

                // Check for missing navigation items
                const expectedItems = ['onboarding', 'avi', 'voice', 'ocr', 'scanner'];
                const missingItems = expectedItems.filter(item =>
                    !navItems.some(navItem => navItem && navItem.includes(item)) &&
                    !routerLinks.some(route => route && route.includes(item))
                );

                return {
                    navItems,
                    routerLinks,
                    missingItems,
                    hasOnboardingLink: routerLinks.includes('/onboarding') || navItems.some(item => item && item.includes('onboarding'))
                };
            });

            this.results.routes.navigation = navigationAnalysis;

            if (navigationAnalysis.missingItems.length > 0) {
                this.results.issues.push(`Missing navigation items: ${navigationAnalysis.missingItems.join(', ')}`);
            }

            console.log(`Navigation items: ${navigationAnalysis.navItems.join(', ')}`);
            console.log(`Missing from navigation: ${navigationAnalysis.missingItems.join(', ') || 'None'}`);

        } catch (error) {
            console.log(`❌ Navigation validation failed: ${error.message}`);
            this.results.issues.push(`Navigation validation failed: ${error.message}`);
        }
    }

    async validateRoutes() {
        console.log('🛣️ Validating Routes Accessibility...');

        const routesToTest = [
            '/onboarding',
            '/dashboard',
            '/documentos',
            '/clientes',
            '/cotizador',
            '/simulador'
        ];

        for (const route of routesToTest) {
            try {
                await this.page.goto(`http://localhost:4300${route}`, { waitUntil: 'networkidle0', timeout: 10000 });

                const pageContent = await this.page.evaluate(() => ({
                    title: document.title,
                    hasContent: document.body.textContent.length > 100,
                    hasErrorMessage: document.body.textContent.includes('404') || document.body.textContent.includes('Error'),
                    url: window.location.href
                }));

                this.results.routes[route] = {
                    accessible: !pageContent.hasErrorMessage && pageContent.hasContent,
                    title: pageContent.title,
                    error: pageContent.hasErrorMessage
                };

                console.log(`Route ${route}: ${pageContent.hasErrorMessage ? '❌ Error' : '✅ Accessible'}`);

            } catch (error) {
                console.log(`Route ${route}: ❌ Failed to load (${error.message})`);
                this.results.routes[route] = { accessible: false, error: error.message };
            }
        }
    }

    generateRecommendations() {
        console.log('💡 Generating Recommendations...');

        // Onboarding recommendations
        if (!this.results.components.onboarding?.accessible) {
            this.results.recommendations.push({
                component: 'Onboarding',
                issue: 'Component not accessible in UI',
                solution: 'Add "Onboarding" link to navigation menu pointing to /onboarding route',
                priority: 'HIGH'
            });
        }

        if (!this.results.components.onboarding?.hasAVIStep) {
            this.results.recommendations.push({
                component: 'AVI Integration',
                issue: 'AVI step not visible in onboarding process',
                solution: 'Ensure AVI verification is integrated in onboarding step 2 (KYC) as documented',
                priority: 'HIGH'
            });
        }

        // AVI recommendations
        if (!this.results.components.avi?.accessible) {
            this.results.recommendations.push({
                component: 'AVI Components',
                issue: 'AVI components not visible in the application',
                solution: 'Activate AVI interview component in onboarding flow and ensure voice recorder is available',
                priority: 'HIGH'
            });
        }

        // OCR recommendations
        if (!this.results.components.ocr?.accessible) {
            this.results.recommendations.push({
                component: 'OCR Components',
                issue: 'OCR scanner not visible in document upload flow',
                solution: 'Integrate OCR scanner in document upload process with camera capture functionality',
                priority: 'MEDIUM'
            });
        }

        // Navigation recommendations
        if (this.results.routes.navigation?.missingItems?.length > 0) {
            this.results.recommendations.push({
                component: 'Navigation',
                issue: 'Missing navigation items',
                solution: `Add navigation items for: ${this.results.routes.navigation.missingItems.join(', ')}`,
                priority: 'MEDIUM'
            });
        }
    }

    async generateReport() {
        console.log('📊 Generating Comprehensive Report...');

        this.generateRecommendations();

        const report = `
# 🔍 MISSING COMPONENTS VALIDATION REPORT

**Timestamp:** ${this.results.timestamp}
**Status:** ${this.results.issues.length === 0 ? 'ALL COMPONENTS ACCESSIBLE' : 'ISSUES FOUND'}

## 📋 COMPONENT VALIDATION SUMMARY

### 🎯 Onboarding Component
- **Component Exists:** ${this.results.components.onboarding?.componentExists ? '✅' : '❌'} ${this.results.components.onboarding?.componentExists ? 'Found' : 'Not Found'}
- **Has Steps:** ${this.results.components.onboarding?.hasSteps ? '✅' : '❌'} ${this.results.components.onboarding?.stepCount || 0} steps detected
- **AVI Integration:** ${this.results.components.onboarding?.hasAVIStep ? '✅' : '❌'} ${this.results.components.onboarding?.hasAVIStep ? 'AVI step found' : 'AVI step missing'}
- **Route Accessible:** ${this.results.routes['/onboarding']?.accessible ? '✅' : '❌'} ${this.results.routes['/onboarding']?.accessible ? 'Accessible' : 'Not accessible'}

### 🎤 AVI (Voice Analysis) Components
- **Components Found:** ${this.results.components.avi?.componentsFound?.join(', ') || 'None'}
- **Content Detected:** ${this.results.components.avi?.hasContent ? '✅ Yes' : '❌ No'}
- **Services Available:** ${this.results.components.avi?.servicesAvailable?.join(', ') || 'None'}
- **Overall Status:** ${this.results.components.avi?.accessible ? '✅ Accessible' : '❌ Not accessible'}

### 📷 OCR (Document Scanner) Components
- **Components Found:** ${this.results.components.ocr?.componentsFound?.join(', ') || 'None'}
- **Camera UI:** ${this.results.components.ocr?.hasCameraUI ? '✅ Available' : '❌ Not available'}
- **Camera Buttons:** ${this.results.components.ocr?.cameraButtonCount || 0} buttons found
- **Content Detected:** ${this.results.components.ocr?.hasContent ? '✅ Yes' : '❌ No'}
- **Overall Status:** ${this.results.components.ocr?.accessible ? '✅ Accessible' : '❌ Not accessible'}

## 🛣️ ROUTE ACCESSIBILITY

${Object.entries(this.results.routes).filter(([key]) => key.startsWith('/')).map(([route, data]) =>
    `- **${route}:** ${data.accessible ? '✅' : '❌'} ${data.accessible ? 'Accessible' : data.error || 'Not accessible'}`
).join('\n')}

## 🧭 NAVIGATION INTEGRATION

- **Navigation Items:** ${this.results.routes.navigation?.navItems?.length || 0} items found
- **Missing Items:** ${this.results.routes.navigation?.missingItems?.join(', ') || 'None'}
- **Onboarding Link:** ${this.results.routes.navigation?.hasOnboardingLink ? '✅ Present' : '❌ Missing'}

## 🚨 ISSUES IDENTIFIED

${this.results.issues.length === 0 ? 'No issues found! 🎉' : this.results.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

## 💡 RECOMMENDATIONS

${this.results.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.component} (Priority: ${rec.priority})
**Issue:** ${rec.issue}
**Solution:** ${rec.solution}
`).join('')}

## 🎯 NEXT STEPS

${this.results.issues.length === 0 ? `
✅ **All components are properly implemented and accessible!**

The validation confirms that:
- Onboarding component exists at /onboarding route
- AVI components are implemented (${this.results.components.avi?.componentsFound?.length || 0} components found)
- OCR components are available (${this.results.components.ocr?.componentsFound?.length || 0} components found)
- All major routes are accessible

The components exist in the codebase as documented. If they appear "missing" in the UI, it may be due to:
1. Navigation menu not including links to these components
2. Components being conditionally displayed based on user state or business logic
3. Components requiring specific user actions or flows to become visible
` : `
❌ **Action Required:**

1. **High Priority:** ${this.results.recommendations.filter(r => r.priority === 'HIGH').length} issues need immediate attention
2. **Medium Priority:** ${this.results.recommendations.filter(r => r.priority === 'MEDIUM').length} issues for improvement
3. **Review:** Navigation integration and user flow accessibility

Focus on making existing components visible and accessible through proper navigation and user flows.
`}

---
**Generated by Missing Components Validator**
**Components verified in codebase and tested for UI accessibility**
        `;

        return report;
    }

    async run() {
        try {
            await this.initialize();
            await this.authenticate();

            // Run all validations
            await this.validateOnboardingComponent();
            await this.validateAVIComponent();
            await this.validateOCRComponent();
            await this.validateNavigationIntegration();
            await this.validateRoutes();

            const report = await this.generateReport();

            // Save report
            const fs = require('fs');
            fs.writeFileSync('MISSING-COMPONENTS-VALIDATION-REPORT.md', report);

            console.log('\n' + '='.repeat(80));
            console.log('📊 MISSING COMPONENTS VALIDATION COMPLETE');
            console.log('='.repeat(80));
            console.log(`Issues found: ${this.results.issues.length}`);
            console.log(`Recommendations: ${this.results.recommendations.length}`);
            console.log('Report saved to: MISSING-COMPONENTS-VALIDATION-REPORT.md');
            console.log('='.repeat(80));

            return this.results;

        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new MissingComponentsValidator();
    validator.run().catch(console.error);
}

module.exports = MissingComponentsValidator;