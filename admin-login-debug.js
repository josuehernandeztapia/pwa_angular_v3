/**
 * 🔍 Admin Login Debug
 * Specific debugging for admin login issue
 */

const puppeteer = require('puppeteer');

async function debugAdminLogin() {
    console.log('🔍 ADMIN LOGIN DEBUG');
    console.log('===================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    // Monitor detailed auth flow
    const logs = [];

    page.on('console', msg => {
        const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
        logs.push(entry);
        if (!msg.text().includes('font') && !msg.text().includes('icon')) {
            console.log(entry);
        }
    });

    // Inject detailed monitoring
    await page.evaluateOnNewDocument(() => {
        window.__adminDebug = [];

        // Monitor AuthService calls
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            window.__adminDebug.push({
                type: 'fetch',
                args: args[0],
                timestamp: Date.now()
            });
            return originalFetch.apply(this, args);
        };

        // Monitor localStorage changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key.includes('token') || key.includes('user')) {
                window.__adminDebug.push({
                    type: 'localStorage_set',
                    key,
                    valuePreview: value.substring(0, 50) + '...',
                    timestamp: Date.now()
                });
                console.log(`[ADMIN_DEBUG] localStorage.setItem('${key}', '${value.substring(0, 30)}...')`);
            }
            return originalSetItem.call(this, key, value);
        };
    });

    try {
        console.log('🌐 Navigating to login...');
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        console.log('🧹 Clearing storage...');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📝 Filling admin credentials...');

        // Fill admin credentials
        await page.focus('input[type="email"]');
        await page.type('input[type="email"]', 'admin@conductores.com');
        await page.focus('input[type="password"]');
        await page.type('input[type="password"]', 'admin123');

        console.log('🚀 Submitting form...');
        await page.click('button[type="submit"]');

        console.log('⏳ Monitoring auth flow...');

        // Monitor for 10 seconds
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));

            const state = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    pathname: window.location.pathname,
                    hasToken: !!localStorage.getItem('auth_token'),
                    hasUser: !!localStorage.getItem('current_user'),
                    debugLogs: window.__adminDebug ? window.__adminDebug.length : 0
                };
            });

            console.log(`${(i * 0.5).toFixed(1)}s: ${state.pathname} | Token: ${state.hasToken ? '✅' : '❌'} | User: ${state.hasUser ? '✅' : '❌'} | Logs: ${state.debugLogs}`);

            if (state.pathname === '/dashboard' && state.hasToken) {
                console.log('🎉 Admin login SUCCESS!');
                break;
            }
        }

        // Get detailed debug info
        const debugInfo = await page.evaluate(() => {
            return {
                currentUrl: window.location.href,
                pathname: window.location.pathname,
                localStorage: {
                    auth_token: localStorage.getItem('auth_token'),
                    current_user: localStorage.getItem('current_user'),
                    refresh_token: localStorage.getItem('refresh_token')
                },
                debugLogs: window.__adminDebug || [],
                formData: {
                    email: document.querySelector('input[type="email"]')?.value,
                    password: document.querySelector('input[type="password"]')?.value
                }
            };
        });

        console.log('\n📊 FINAL ADMIN DEBUG STATE:');
        console.log('===========================');
        console.log(`URL: ${debugInfo.currentUrl}`);
        console.log(`Path: ${debugInfo.pathname}`);
        console.log(`Email Field: ${debugInfo.formData.email}`);
        console.log(`Password Field: ${debugInfo.formData.password}`);
        console.log(`Auth Token: ${debugInfo.localStorage.auth_token ? 'Present' : 'Missing'}`);
        console.log(`User Data: ${debugInfo.localStorage.current_user ? 'Present' : 'Missing'}`);

        if (debugInfo.localStorage.current_user) {
            try {
                const userData = JSON.parse(debugInfo.localStorage.current_user);
                console.log(`User Role: ${userData.role}`);
                console.log(`User Email: ${userData.email}`);
            } catch (e) {
                console.log('User Data: Invalid JSON');
            }
        }

        console.log(`\n📋 Debug Log Events: ${debugInfo.debugLogs.length}`);
        debugInfo.debugLogs.forEach((log, i) => {
            console.log(`   ${i + 1}. [${log.type}] ${log.key || log.args || 'N/A'}`);
        });

        // Test manual AuthService call
        console.log('\n🧪 Testing AuthService manually...');
        const manualAuthResult = await page.evaluate(() => {
            // Check if Angular is loaded
            if (!window.ng) {
                return { error: 'Angular not loaded' };
            }

            // Try to get AuthService from Angular
            try {
                const appRoot = document.querySelector('app-root');
                if (!appRoot) {
                    return { error: 'App root not found' };
                }

                const context = window.ng.getContext(appRoot);
                if (!context) {
                    return { error: 'Angular context not available' };
                }

                return {
                    success: true,
                    hasInjector: !!context.injector,
                    contextAvailable: true
                };
            } catch (e) {
                return { error: 'Failed to access Angular context: ' + e.message };
            }
        });

        console.log('Angular Context Test:', manualAuthResult);

        await page.screenshot({ path: 'admin-debug-final.png', fullPage: true });
        console.log('📸 Screenshot saved: admin-debug-final.png');

    } catch (error) {
        console.error('❌ Debug error:', error);
    }

    console.log('\n🔍 Browser left open for manual inspection...');
    // Keep browser open
}

debugAdminLogin().catch(console.error);