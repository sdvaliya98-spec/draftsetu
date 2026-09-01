const { chromium } = require('playwright');

async function runBenchmark(label, isWarm = false, existingPage = null) {
    let browser, context, page;
    
    if (existingPage) {
        page = existingPage;
    } else {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        page = await context.newPage();
    }

    const requests = [];
    let totalTransferred = 0;
    let jsTransferred = 0;
    let cssTransferred = 0;
    let jsCount = 0;
    let cssCount = 0;
    let externalCount = 0;
    let localCount = 0;

    const requestListener = req => {
        const url = req.url();
        const isExt = !url.includes('localhost:5500') && !url.includes('127.0.0.1:5500') && !url.includes('localhost:8000') && !url.includes('127.0.0.1:8000');
        if (isExt) externalCount++;
        else localCount++;
    };

    const responseListener = async res => {
        try {
            const headers = res.headers();
            const url = res.url();
            const status = res.status();
            const contentLength = parseInt(headers['content-length'] || '0', 10);
            
            let bodySize = contentLength;
            if (!bodySize) {
                try {
                    const buf = await res.body();
                    bodySize = buf.length;
                } catch (e) {
                    bodySize = 0;
                }
            }

            totalTransferred += bodySize;
            if (url.includes('.js') || url.includes('javascript') || headers['content-type']?.includes('javascript') || url.includes('.jsx')) {
                jsTransferred += bodySize;
                jsCount++;
            } else if (url.includes('.css') || headers['content-type']?.includes('css')) {
                cssTransferred += bodySize;
                cssCount++;
            }

            requests.push({
                url: url.length > 80 ? url.substring(0, 77) + '...' : url,
                status,
                size: bodySize,
                type: res.request().resourceType()
            });
        } catch (e) {}
    };

    page.on('request', requestListener);
    page.on('response', responseListener);

    const startTime = Date.now();
    await page.goto('http://127.0.0.1:5500', { waitUntil: 'load', timeout: 30000 });

    // Wait for React initial render (e.g. splash screen detached or app rendered)
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800); // allow paint stabilization

    const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paint = performance.getEntriesByType('paint') || [];
        const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
        
        let lcp = 0;
        try {
            const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
            if (lcpEntries && lcpEntries.length) {
                lcp = lcpEntries[lcpEntries.length - 1].startTime;
            }
        } catch (e) {}

        return {
            ttfb: nav.responseStart ? Math.round(nav.responseStart - nav.requestStart) : 0,
            domContentLoaded: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : 0,
            loadEvent: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : 0,
            fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
            lcp: Math.round(lcp)
        };
    });

    page.off('request', requestListener);
    page.off('response', responseListener);

    const result = {
        label,
        metrics,
        totalRequests: requests.length,
        totalTransferredKB: (totalTransferred / 1024).toFixed(2),
        jsTransferredKB: (jsTransferred / 1024).toFixed(2),
        jsCount,
        cssTransferredKB: (cssTransferred / 1024).toFixed(2),
        cssCount,
        externalCount,
        localCount
    };

    return { result, page, browser };
}

async function main() {
    console.log('=== BENCHMARKING DRAFTSETU STARTUP PERFORMANCE ===');
    
    // 1. Cold Cache
    const cold = await runBenchmark('Cold Cache');
    console.log('\n--- Cold Cache Metrics ---');
    console.log(JSON.stringify(cold.result, null, 2));

    // 2. Warm Cache (Reload in same page context)
    const warm = await runBenchmark('Warm Cache', true, cold.page);
    console.log('\n--- Warm Cache Metrics ---');
    console.log(JSON.stringify(warm.result, null, 2));

    if (cold.browser) {
        await cold.browser.close();
    }
}

main().catch(err => {
    console.error('Benchmark error:', err);
    process.exit(1);
});
