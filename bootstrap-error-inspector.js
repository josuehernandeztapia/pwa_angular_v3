/**
 * 🔍 Bootstrap Error Inspector
 * Captures the actual bootstrap error details that are being masked
 */

const puppeteer = require('puppeteer');

async function inspectBootstrapError() {
    console.log('🔍 BOOTSTRAP ERROR INSPECTOR');
    console.log('============================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1200, height: 800 },
        args: ['--no-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();

    // Capture ALL JavaScript errors with full stack traces
    const errors = [];

    page.on('pageerror', error => {
        errors.push({
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString()
        });
        console.log('💥 PAGE ERROR CAPTURED:');
        console.log('  Message:', error.message);
        console.log('  Name:', error.name);
        console.log('  Stack:', error.stack);
        console.log('  Time:', new Date().toISOString());
        console.log('---');
    });

    // Capture console errors with full context
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const args = msg.args();
            console.log('🚨 CONSOLE ERROR:');
            console.log('  Text:', msg.text());
            console.log('  Location:', msg.location());

            // Try to extract actual error objects
            args.forEach(async (arg, i) => {
                try {
                    const value = await arg.jsonValue();
                    console.log(`  Arg ${i}:`, value);
                } catch (e) {
                    console.log(`  Arg ${i}: [Object - could not serialize]`);
                }
            });
            console.log('---');
        }
    });

    // Inject error capture before Angular loads
    await page.evaluateOnNewDocument(() => {
        // Override bootstrapApplication to capture errors
        window.__bootstrapErrors = [];
        window.__originalConsoleError = console.error;

        console.error = function(...args) {
            window.__bootstrapErrors.push({
                args: args.map(arg => {
                    if (arg instanceof Error) {
                        return {
                            message: arg.message,
                            stack: arg.stack,
                            name: arg.name,
                            toString: arg.toString()
                        };
                    }
                    return arg;
                }),
                timestamp: Date.now(),
                stack: new Error().stack
            });
            return window.__originalConsoleError.apply(console, args);
        };

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', event => {
            window.__bootstrapErrors.push({
                type: 'unhandledrejection',
                reason: event.reason,
                promise: event.promise,
                timestamp: Date.now(),
                stack: event.reason?.stack || new Error().stack
            });
            console.log('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
        });

        // Capture general errors
        window.addEventListener('error', event => {
            window.__bootstrapErrors.push({
                type: 'error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error ? {
                    message: event.error.message,
                    stack: event.error.stack,
                    name: event.error.name
                } : null,
                timestamp: Date.now()
            });
            console.log('🚨 GLOBAL ERROR:', event.error || event.message);
        });
    });

    try {
        console.log('🌐 Navigating to application...');

        await page.goto('http://localhost:4300', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for potential bootstrap
        console.log('⏳ Waiting for bootstrap completion or failure...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Extract captured errors
        const capturedErrors = await page.evaluate(() => {
            return {
                bootstrapErrors: window.__bootstrapErrors || [],
                angularPresent: !!window.ng,
                appRootContent: document.querySelector('app-root')?.innerHTML || '',
                hasContext: window.ng ? (() => {
                    try {
                        const appRoot = document.querySelector('app-root');
                        return appRoot ? !!window.ng.getContext(appRoot) : false;
                    } catch (e) {
                        return { error: e.message };
                    }
                })() : false
            };
        });

        console.log('\n🔍 DETAILED ERROR ANALYSIS:');
        console.log('===========================');

        console.log('\n📊 Bootstrap State:');
        console.log(`   Angular Present: ${capturedErrors.angularPresent ? '✅' : '❌'}`);
        console.log(`   App Root Content Length: ${capturedErrors.appRootContent.length} chars`);
        console.log(`   Has Angular Context: ${typeof capturedErrors.hasContext === 'boolean' ? (capturedErrors.hasContext ? '✅' : '❌') : JSON.stringify(capturedErrors.hasContext)}`);

        console.log(`\n🚨 Captured Bootstrap Errors (${capturedErrors.bootstrapErrors.length}):`);

        if (capturedErrors.bootstrapErrors.length === 0) {
            console.log('   No bootstrap errors captured - this might indicate the error is being swallowed');
        } else {
            capturedErrors.bootstrapErrors.forEach((error, i) => {
                console.log(`\n   Error ${i + 1}:`);
                if (error.type) {
                    console.log(`     Type: ${error.type}`);
                }
                if (error.args) {
                    console.log(`     Args: ${JSON.stringify(error.args, null, 2)}`);
                }
                if (error.message) {
                    console.log(`     Message: ${error.message}`);
                }
                if (error.reason) {
                    console.log(`     Reason: ${JSON.stringify(error.reason, null, 2)}`);
                }
                if (error.stack) {
                    console.log(`     Stack: ${error.stack}`);
                }
                console.log(`     Time: ${new Date(error.timestamp).toISOString()}`);
            });
        }

        // Try to manually inspect the specific error in main.js
        const mainJsAnalysis = await page.evaluate(() => {
            // Look for any runtime errors that might be hidden
            const scripts = Array.from(document.querySelectorAll('script[src*="main.js"]'));
            return {
                mainScriptsFound: scripts.length,
                mainScriptSrcs: scripts.map(s => s.src),
                currentErrors: window.__bootstrapErrors?.length || 0
            };
        });

        console.log('\n📦 Main.js Analysis:');
        console.log(`   Main Scripts Found: ${mainJsAnalysis.mainScriptsFound}`);
        console.log(`   Current Captured Errors: ${mainJsAnalysis.currentErrors}`);

        // Save comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            capturedErrors,
            pageErrors: errors,
            mainJsAnalysis,
            recommendations: [
                capturedErrors.bootstrapErrors.length === 0 ?
                    "🔍 No bootstrap errors captured - error might be caught and swallowed. Check main.ts error handler." :
                    "🚨 Bootstrap errors captured - review detailed error analysis above",
                capturedErrors.angularPresent && capturedErrors.appRootContent.length === 0 ?
                    "🎯 Angular loads but AppComponent not rendering - check AppComponent constructor/OnInit" :
                    "🔧 Check Angular bootstrap configuration in main.ts and app.config.ts"
            ]
        };

        require('fs').writeFileSync('bootstrap-error-analysis.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Full error analysis saved: bootstrap-error-analysis.json');

        console.log('\n💡 NEXT STEPS:');
        console.log('==============');
        if (capturedErrors.bootstrapErrors.length > 0) {
            console.log('1. Review the captured bootstrap errors above');
            console.log('2. Focus on the first error - subsequent errors are likely cascade effects');
            console.log('3. Check the specific line/file mentioned in the stack trace');
        } else {
            console.log('1. The error is likely being caught and handled silently');
            console.log('2. Check main.ts line 35 error handler - it might be swallowing the actual error');
            console.log('3. Temporarily modify main.ts to log the full error object');
        }

        await page.screenshot({
            path: 'bootstrap-error-state.png',
            fullPage: true
        });

        console.log('📸 Screenshot saved: bootstrap-error-state.png');
        console.log('\n🔍 Browser left open for manual inspection...');

    } catch (error) {
        console.error('❌ Inspector error:', error);
    }

    // Keep browser open for inspection
}

// Execute the inspector
(async () => {
    try {
        await inspectBootstrapError();
    } catch (error) {
        console.error('❌ Critical inspector error:', error);
        process.exit(1);
    }
})();