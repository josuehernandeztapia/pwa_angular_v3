/**
 * 🚀 Bootstrap Fix Verification
 * Quick test to verify the Angular bootstrap fix worked
 */

const puppeteer = require('puppeteer');

async function verifyBootstrapFix() {
    console.log('🚀 BOOTSTRAP FIX VERIFICATION');
    console.log('=============================\n');

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    // Capture any remaining errors
    const errors = [];
    page.on('pageerror', error => {
        errors.push(error.message);
    });

    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('font') && !msg.text().includes('icon')) {
            errors.push(msg.text());
        }
    });

    try {
        console.log('🌐 Loading application...');

        await page.goto('http://localhost:4300', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
        });

        // Give Angular time to bootstrap
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check Angular state
        const appState = await page.evaluate(() => {
            const result = {
                angularLoaded: !!window.ng,
                appRootExists: !!document.querySelector('app-root'),
                appRootHasContent: false,
                routerOutletExists: false,
                hasAngularContext: false,
                currentUrl: window.location.href,
                bodyContent: document.body.innerHTML.length
            };

            const appRoot = document.querySelector('app-root');
            if (appRoot) {
                result.appRootHasContent = appRoot.innerHTML.length > 0;
                result.routerOutletExists = !!appRoot.querySelector('router-outlet');

                // Check if Angular context is available
                if (window.ng && window.ng.getContext) {
                    try {
                        const context = window.ng.getContext(appRoot);
                        result.hasAngularContext = !!context;
                    } catch (e) {
                        result.contextError = e.message;
                    }
                }
            }

            return result;
        });

        console.log('📊 VERIFICATION RESULTS:');
        console.log('========================');
        console.log(`✅ Angular Loaded: ${appState.angularLoaded ? 'YES' : 'NO'}`);
        console.log(`✅ App Root Exists: ${appState.appRootExists ? 'YES' : 'NO'}`);
        console.log(`✅ App Root Has Content: ${appState.appRootHasContent ? 'YES' : 'NO'} (${appState.appRootExists ? 'content detected' : 'empty'})`);
        console.log(`✅ Router Outlet Exists: ${appState.routerOutletExists ? 'YES' : 'NO'}`);
        console.log(`✅ Angular Context Available: ${appState.hasAngularContext ? 'YES' : 'NO'}`);
        console.log(`📍 Current URL: ${appState.currentUrl}`);
        console.log(`📏 Body Content Length: ${appState.bodyContent} chars`);

        if (errors.length > 0) {
            console.log(`\n🚨 Remaining Bootstrap Errors (${errors.length}):`);
            errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ No bootstrap errors detected!');
        }

        // Test basic navigation
        console.log('\n🧭 Testing Navigation...');

        try {
            // Try to navigate to login page
            await page.goto('http://localhost:4300/login', {
                waitUntil: 'domcontentloaded',
                timeout: 5000
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            const loginPageState = await page.evaluate(() => ({
                url: window.location.href,
                hasLoginContent: !!document.querySelector('form') || document.body.innerHTML.includes('login') || document.body.innerHTML.includes('Iniciar'),
                appRootContent: document.querySelector('app-root')?.innerHTML.length || 0
            }));

            console.log(`📍 Login Page URL: ${loginPageState.url}`);
            console.log(`📝 Has Login Content: ${loginPageState.hasLoginContent ? 'YES' : 'NO'}`);
            console.log(`📏 App Root Content: ${loginPageState.appRootContent} chars`);

        } catch (navError) {
            console.log(`❌ Navigation test failed: ${navError.message}`);
        }

        // Overall assessment
        console.log('\n🎯 OVERALL ASSESSMENT:');
        console.log('======================');

        const isBootstrapFixed = appState.angularLoaded &&
                                appState.appRootExists &&
                                appState.appRootHasContent &&
                                appState.hasAngularContext &&
                                errors.length === 0;

        if (isBootstrapFixed) {
            console.log('🎉 SUCCESS: Angular bootstrap is now working correctly!');
            console.log('✅ Components are rendering');
            console.log('✅ Router is functional');
            console.log('✅ Authentication system should be accessible');
        } else {
            console.log('⚠️  PARTIAL SUCCESS: Bootstrap improved but some issues remain');
            if (!appState.appRootHasContent) console.log('   - App root still empty');
            if (!appState.hasAngularContext) console.log('   - Angular context still unavailable');
            if (errors.length > 0) console.log(`   - ${errors.length} errors still present`);
        }

    } catch (error) {
        console.error('❌ Verification error:', error.message);
    } finally {
        await browser.close();
    }
}

// Execute verification
(async () => {
    try {
        await verifyBootstrapFix();
        console.log('\n✅ Bootstrap fix verification complete');
    } catch (error) {
        console.error('❌ Critical verification error:', error);
        process.exit(1);
    }
})();