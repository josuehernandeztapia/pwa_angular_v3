/**
 * 🕐 Authentication Timing Debug
 * Diagnoses race conditions between login and AuthGuard
 */

const puppeteer = require('puppeteer');

async function debugAuthTiming() {
    console.log('🕐 AUTHENTICATION TIMING DEBUG');
    console.log('==============================\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        defaultViewport: { width: 1200, height: 800 }
    });

    const page = await browser.newPage();

    // Inject monitoring code to trace auth state
    await page.evaluateOnNewDocument(() => {
        window.__authDebug = {
            logs: [],
            log: (message, data) => {
                const entry = {
                    timestamp: Date.now(),
                    message,
                    data: JSON.parse(JSON.stringify(data || {})),
                    localStorage: {
                        auth_token: localStorage.getItem('auth_token'),
                        current_user: localStorage.getItem('current_user'),
                        refresh_token: localStorage.getItem('refresh_token')
                    }
                };
                window.__authDebug.logs.push(entry);
                console.log(`[AUTH_DEBUG] ${message}`, entry);
            }
        };

        // Monitor localStorage changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key.includes('token') || key.includes('user')) {
                window.__authDebug.log(`localStorage.setItem('${key}')`, { key, value: value.substring(0, 50) + '...' });
            }
            return originalSetItem.call(this, key, value);
        };

        // Monitor URL changes
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                window.__authDebug.log('URL changed', {
                    from: currentUrl,
                    to: window.location.href,
                    pathname: window.location.pathname
                });
                currentUrl = window.location.href;
            }
        }, 100);
    });

    try {
        console.log('🌐 Starting auth timing test...');

        // Navigate to login
        await page.goto('http://localhost:4300/login', { waitUntil: 'networkidle0' });

        // Clear any existing auth state
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.__authDebug.log('Cleared all storage', {});
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📝 Filling login form...');

        // Fill login form
        await page.focus('input[type="email"]');
        await page.type('input[type="email"]', 'asesor@conductores.com');
        await page.focus('input[type="password"]');
        await page.type('input[type="password"]', 'demo123');

        // Start monitoring before submit
        await page.evaluate(() => {
            window.__authDebug.log('About to submit login form', {
                url: window.location.href,
                hasAuthService: !!window.ng
            });
        });

        console.log('🚀 Submitting login...');

        // Submit and monitor
        await page.click('button[type="submit"]');

        // Wait and collect debug logs
        console.log('⏳ Monitoring auth state changes...');

        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));

            const debugState = await page.evaluate(() => {
                const logs = window.__authDebug?.logs || [];
                return {
                    currentUrl: window.location.href,
                    pathname: window.location.pathname,
                    logsCount: logs.length,
                    lastLog: logs[logs.length - 1],
                    localStorage: {
                        auth_token: !!localStorage.getItem('auth_token'),
                        current_user: !!localStorage.getItem('current_user'),
                        refresh_token: !!localStorage.getItem('refresh_token')
                    }
                };
            });

            console.log(`   ${i * 0.5}s: ${debugState.pathname} | Token: ${debugState.localStorage.auth_token ? '✅' : '❌'} | User: ${debugState.localStorage.current_user ? '✅' : '❌'} | Logs: ${debugState.logsCount}`);

            // If we reach dashboard and have tokens, success!
            if (debugState.pathname === '/dashboard' && debugState.localStorage.auth_token) {
                console.log('🎉 Success! Reached dashboard with valid auth state');
                break;
            }
        }

        // Get full debug timeline
        const fullDebugLog = await page.evaluate(() => {
            return window.__authDebug?.logs || [];
        });

        console.log('\n📊 FULL AUTHENTICATION TIMELINE');
        console.log('==============================');

        fullDebugLog.forEach((log, i) => {
            const timeFromStart = i === 0 ? 0 : log.timestamp - fullDebugLog[0].timestamp;
            console.log(`${timeFromStart.toString().padStart(4, ' ')}ms: ${log.message}`);
            if (log.data && Object.keys(log.data).length > 0) {
                console.log(`       Data:`, log.data);
            }
            console.log(`       Storage: token=${!!log.localStorage.auth_token}, user=${!!log.localStorage.current_user}`);
            console.log();
        });

        // Final state check
        const finalState = await page.evaluate(() => {
            return {
                url: window.location.href,
                pathname: window.location.pathname,
                hasAngular: !!window.ng,
                storage: {
                    auth_token: localStorage.getItem('auth_token'),
                    current_user: localStorage.getItem('current_user'),
                    refresh_token: localStorage.getItem('refresh_token')
                }
            };
        });

        console.log('\n🎯 FINAL STATE ANALYSIS');
        console.log('=======================');
        console.log(`URL: ${finalState.url}`);
        console.log(`Path: ${finalState.pathname}`);
        console.log(`Angular: ${finalState.hasAngular ? '✅' : '❌'}`);
        console.log(`Auth Token: ${finalState.storage.auth_token ? '✅ Present' : '❌ Missing'}`);
        console.log(`User Data: ${finalState.storage.current_user ? '✅ Present' : '❌ Missing'}`);
        console.log(`Refresh Token: ${finalState.storage.refresh_token ? '✅ Present' : '❌ Missing'}`);

        if (finalState.pathname === '/login') {
            console.log('\n❌ DIAGNOSIS: Login failed or was redirected back');
            console.log('Possible causes:');
            console.log('1. AuthService login() not updating BehaviorSubjects properly');
            console.log('2. AuthGuard checking authentication before state is set');
            console.log('3. Token validation failing in AuthGuard');
            console.log('4. LoginComponent error handling not working');
        } else if (finalState.pathname === '/onboarding') {
            console.log('\n⚠️  DIAGNOSIS: Login succeeded but redirected to onboarding');
            console.log('This suggests auth is working but routing logic redirects new users');
        } else if (finalState.pathname === '/dashboard') {
            console.log('\n✅ DIAGNOSIS: Login successful!');
        } else {
            console.log(`\n⚠️  DIAGNOSIS: Unexpected state - redirected to ${finalState.pathname}`);
        }

        // Save detailed report
        const report = {
            finalState,
            debugLogs: fullDebugLog,
            timestamp: new Date().toISOString()
        };

        require('fs').writeFileSync('auth-timing-debug.json', JSON.stringify(report, null, 2));
        console.log('\n💾 Detailed report saved: auth-timing-debug.json');

    } catch (error) {
        console.error('❌ Debug error:', error);
    }

    console.log('\n🔍 Browser left open for manual inspection...');
    // Keep browser open
}

// Execute debug
debugAuthTiming().catch(console.error);