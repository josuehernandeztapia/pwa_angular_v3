/**
 * 🔧 Bootstrap Diagnostic Tool
 * Identifies the exact cause of Angular bootstrap failure
 */

const puppeteer = require('puppeteer');

async function diagnoseBootstrapIssue() {
    console.log('🔧 BOOTSTRAP DIAGNOSTIC TOOL');
    console.log('============================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1200, height: 800 },
        args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();

    // Capture all console messages with full details
    const consoleMessages = [];
    const networkErrors = [];

    page.on('console', msg => {
        const entry = {
            type: msg.type(),
            text: msg.text(),
            location: msg.location(),
            timestamp: new Date().toISOString()
        };
        consoleMessages.push(entry);
        console.log(`📝 ${entry.type.toUpperCase()}: ${entry.text}`);
        if (entry.location && entry.location.url) {
            console.log(`   📍 Location: ${entry.location.url}:${entry.location.lineNumber}`);
        }
    });

    page.on('pageerror', error => {
        console.log('💥 PAGE ERROR:', error.message);
        console.log('Stack:', error.stack);
    });

    page.on('response', response => {
        if (!response.ok()) {
            networkErrors.push({
                url: response.url(),
                status: response.status(),
                statusText: response.statusText()
            });
            console.log(`🚨 NETWORK ERROR: ${response.status()} ${response.statusText()} - ${response.url()}`);
        }
    });

    try {
        console.log('🌐 Navigating to application...');

        await page.goto('http://localhost:4300', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait longer for Angular to potentially load
        console.log('⏳ Waiting for Angular initialization...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Detailed Angular state analysis
        const angularDiagnostic = await page.evaluate(() => {
            const diagnostic = {
                timestamp: Date.now(),
                windowGlobals: {},
                angularState: {},
                domState: {},
                scriptAnalysis: {},
                errorDetails: {}
            };

            // Check window globals
            diagnostic.windowGlobals = {
                ng: !!window.ng,
                angular: !!window.angular,
                Zone: !!window.Zone,
                ngDevMode: !!window.ngDevMode,
                ngI18nClosureMode: !!window.ngI18nClosureMode
            };

            // Analyze Angular state if available
            if (window.ng) {
                try {
                    diagnostic.angularState = {
                        hasGetContext: typeof window.ng.getContext === 'function',
                        hasPlatform: !!window.ng.platformBrowser,
                        version: window.ng.version ? window.ng.version.full : 'unknown'
                    };

                    // Try to get app context
                    const appRoot = document.querySelector('app-root');
                    if (appRoot) {
                        try {
                            const context = window.ng.getContext(appRoot);
                            diagnostic.angularState.appContext = {
                                hasInjector: !!context?.injector,
                                hasComponentInstance: !!context?.componentInstance,
                                hasElement: !!context?.element
                            };

                            // Try to get router if injector is available
                            if (context?.injector) {
                                try {
                                    const router = context.injector.get('Router', null);
                                    diagnostic.angularState.router = {
                                        present: !!router,
                                        url: router?.url || 'N/A',
                                        isNavigated: !!router?.navigated
                                    };
                                } catch (e) {
                                    diagnostic.angularState.routerError = e.message;
                                }

                                // Try to get AuthService
                                try {
                                    const authService = context.injector.get('AuthService', null);
                                    diagnostic.angularState.authService = {
                                        present: !!authService,
                                        methods: authService ? Object.getOwnPropertyNames(Object.getPrototypeOf(authService)) : []
                                    };
                                } catch (e) {
                                    diagnostic.angularState.authServiceError = e.message;
                                }
                            }
                        } catch (e) {
                            diagnostic.angularState.contextError = e.message;
                        }
                    }
                } catch (e) {
                    diagnostic.angularState.error = e.message;
                }
            }

            // DOM analysis
            diagnostic.domState = {
                appRootExists: !!document.querySelector('app-root'),
                appRootHTML: document.querySelector('app-root')?.innerHTML.substring(0, 300) || '',
                routerOutletExists: !!document.querySelector('router-outlet'),
                bodyChildrenCount: document.body.children.length,
                headScriptsCount: document.head.querySelectorAll('script').length,
                hasStylesheets: document.head.querySelectorAll('link[rel="stylesheet"]').length
            };

            // Script analysis
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            diagnostic.scriptAnalysis = {
                totalScripts: scripts.length,
                mainJsLoaded: scripts.some(s => s.src.includes('main.js')),
                polyfillsLoaded: scripts.some(s => s.src.includes('polyfills.js')),
                failedScripts: scripts.filter(s => s.readyState === 'error' || s.onerror).length
            };

            // Try to capture any stored errors
            if (window.__diagnosticErrors) {
                diagnostic.errorDetails.storedErrors = window.__diagnosticErrors;
            }

            return diagnostic;
        });

        console.log('\n🔍 DETAILED DIAGNOSTIC RESULTS:');
        console.log('===============================');

        console.log('\n🌐 Window Globals:');
        Object.entries(angularDiagnostic.windowGlobals).forEach(([key, value]) => {
            console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
        });

        console.log('\n🅰️ Angular State:');
        if (angularDiagnostic.angularState.error) {
            console.log(`   ❌ Error: ${angularDiagnostic.angularState.error}`);
        } else {
            Object.entries(angularDiagnostic.angularState).forEach(([key, value]) => {
                if (key === 'appContext' && typeof value === 'object') {
                    console.log('   📦 App Context:');
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        console.log(`      ${subValue ? '✅' : '❌'} ${subKey}: ${subValue}`);
                    });
                } else if (key === 'router' && typeof value === 'object') {
                    console.log('   🗺️ Router:');
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        console.log(`      ${subKey === 'present' && subValue ? '✅' : '❌'} ${subKey}: ${subValue}`);
                    });
                } else if (key === 'authService' && typeof value === 'object') {
                    console.log('   🔐 AuthService:');
                    console.log(`      ${value.present ? '✅' : '❌'} present: ${value.present}`);
                    if (value.methods && value.methods.length > 0) {
                        console.log(`      📋 methods: ${value.methods.slice(0, 5).join(', ')}...`);
                    }
                } else {
                    console.log(`   ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                }
            });
        }

        console.log('\n📄 DOM State:');
        Object.entries(angularDiagnostic.domState).forEach(([key, value]) => {
            if (key === 'appRootHTML') {
                console.log(`   📝 ${key}: "${value.substring(0, 100)}${value.length > 100 ? '...' : ''}"`);
            } else if (typeof value === 'boolean') {
                console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
            } else {
                console.log(`   📊 ${key}: ${value}`);
            }
        });

        console.log('\n📦 Script Analysis:');
        Object.entries(angularDiagnostic.scriptAnalysis).forEach(([key, value]) => {
            const status = (key.includes('Loaded') && value) || (key === 'failedScripts' && value === 0) ? '✅' :
                          key === 'failedScripts' && value > 0 ? '❌' : '📊';
            console.log(`   ${status} ${key}: ${value}`);
        });

        // Analyze console messages for patterns
        console.log('\n📋 Console Message Analysis:');
        const errorMessages = consoleMessages.filter(m => m.type === 'error');
        const warningMessages = consoleMessages.filter(m => m.type === 'warn');

        console.log(`   📊 Total messages: ${consoleMessages.length}`);
        console.log(`   🚨 Errors: ${errorMessages.length}`);
        console.log(`   ⚠️ Warnings: ${warningMessages.length}`);

        if (errorMessages.length > 0) {
            console.log('\n   🚨 Critical Error Messages:');
            errorMessages.forEach((msg, i) => {
                if (i < 5) { // Show first 5 errors
                    console.log(`      ${i + 1}. ${msg.text}`);
                    if (msg.location?.url && !msg.location.url.includes('data:')) {
                        console.log(`         📍 ${msg.location.url}:${msg.location.lineNumber}`);
                    }
                }
            });
        }

        // Network error analysis
        if (networkErrors.length > 0) {
            console.log('\n🌐 Network Error Analysis:');
            networkErrors.forEach(error => {
                console.log(`   ❌ ${error.status} ${error.statusText}: ${error.url}`);
            });
        }

        // Try to inject a fix and test
        console.log('\n🛠️ ATTEMPTING RUNTIME DIAGNOSTIC FIX:');
        console.log('===================================');

        const fixResult = await page.evaluate(() => {
            // Try to manually trigger Angular if it's loaded but not initialized
            const results = {
                manualBootstrapAttempted: false,
                routerNavigationAttempted: false,
                errorsCaught: []
            };

            try {
                // If Angular is loaded but app seems stuck, try to help it along
                if (window.ng && document.querySelector('app-root')) {
                    const appRoot = document.querySelector('app-root');
                    const context = window.ng.getContext(appRoot);

                    if (context && context.injector) {
                        results.manualBootstrapAttempted = true;

                        // Try to get router and navigate
                        try {
                            const router = context.injector.get('Router', null);
                            if (router) {
                                router.navigate(['/']);
                                results.routerNavigationAttempted = true;
                            }
                        } catch (e) {
                            results.errorsCaught.push(`Router navigation error: ${e.message}`);
                        }
                    }
                }
            } catch (e) {
                results.errorsCaught.push(`Manual bootstrap error: ${e.message}`);
            }

            return results;
        });

        console.log(`   🔧 Manual bootstrap attempted: ${fixResult.manualBootstrapAttempted ? '✅' : '❌'}`);
        console.log(`   🗺️ Router navigation attempted: ${fixResult.routerNavigationAttempted ? '✅' : '❌'}`);

        if (fixResult.errorsCaught.length > 0) {
            console.log('   ❌ Errors during fix attempt:');
            fixResult.errorsCaught.forEach(error => {
                console.log(`      - ${error}`);
            });
        }

        // Wait a bit more to see if the fix worked
        await new Promise(resolve => setTimeout(resolve, 3000));

        const postFixState = await page.evaluate(() => ({
            appRootHasContent: document.querySelector('app-root')?.innerHTML.length > 50,
            routerOutletActive: !!document.querySelector('router-outlet'),
            currentUrl: window.location.href
        }));

        console.log('\n📊 Post-Fix State:');
        Object.entries(postFixState).forEach(([key, value]) => {
            console.log(`   ${typeof value === 'boolean' && value ? '✅' : '📊'} ${key}: ${value}`);
        });

        // Generate actionable recommendations
        console.log('\n💡 ACTIONABLE RECOMMENDATIONS:');
        console.log('=============================');

        const recommendations = [];

        if (!angularDiagnostic.windowGlobals.ng) {
            recommendations.push('🚨 CRITICAL: Angular not loading - check main.js and app.config.ts');
        } else if (angularDiagnostic.angularState.contextError) {
            recommendations.push('🔧 Angular context error - check component initialization');
        } else if (!angularDiagnostic.angularState.router?.present) {
            recommendations.push('🗺️ Router not accessible - verify router configuration in app.config.ts');
        } else if (!angularDiagnostic.domState.appRootExists) {
            recommendations.push('📦 app-root missing - check index.html and app.component.ts');
        } else if (angularDiagnostic.domState.appRootHTML.length < 20) {
            recommendations.push('🎨 app-root empty - components not rendering, check router-outlet');
        }

        if (errorMessages.some(m => m.text.includes('Error starting app'))) {
            recommendations.push('🚨 Bootstrap error detected - check dependencies in app.config.ts');
        }

        if (networkErrors.length > 0) {
            recommendations.push('🌐 Network errors detected - check asset paths and server setup');
        }

        recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });

        await page.screenshot({
            path: 'test-screenshots/bootstrap-diagnostic.png',
            fullPage: true
        });

        console.log('\n💾 Diagnostic complete - screenshot saved: test-screenshots/bootstrap-diagnostic.png');
        console.log('🔍 Browser kept open for manual inspection...');

        // Save detailed diagnostic report
        const diagnosticReport = {
            timestamp: new Date().toISOString(),
            angularDiagnostic,
            consoleMessages: consoleMessages.slice(0, 20), // First 20 messages
            networkErrors,
            fixAttempt: fixResult,
            postFixState,
            recommendations
        };

        require('fs').writeFileSync('bootstrap-diagnostic-report.json', JSON.stringify(diagnosticReport, null, 2));
        console.log('💾 Full diagnostic report saved: bootstrap-diagnostic-report.json');

    } catch (error) {
        console.error('❌ Diagnostic error:', error);
    }

    // Don't close browser for manual inspection
}

// Execute diagnostic
(async () => {
    try {
        await require('fs').promises.mkdir('test-screenshots', { recursive: true });
        await diagnoseBootstrapIssue();
    } catch (error) {
        console.error('❌ Critical diagnostic error:', error);
        process.exit(1);
    }
})();