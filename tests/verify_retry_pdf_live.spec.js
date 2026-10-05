import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test('Verify Live My Documents Retry PDF for DOC-C147AE9E', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Reset DOC-C147AE9E in DB to simulated failed PDF state
    console.log('Resetting DOC-C147AE9E to failed PDF state in database...');
    execSync(`.\\venv\\Scripts\\python.exe -c "from backend.database import SessionLocal; from backend.models import DocumentSubmission; db = SessionLocal(); doc = db.query(DocumentSubmission).filter(DocumentSubmission.tracking_id == 'DOC-C147AE9E').first(); doc.is_locked = True; doc.pdf_ready = False; doc.pdf_generation_in_progress = False; doc.final_pdf_path = None; db.commit(); print('RESET_DONE:', doc.tracking_id, doc.pdf_ready); db.close()"`, { cwd: 'd:/new', stdio: 'inherit' });

    // 2. Navigate to app
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    console.log('Navigating to http://127.0.0.1:5500 ...');
    await page.goto('http://127.0.0.1:5500');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 30000 });
    await page.waitForTimeout(1000);

    // 3. Log in as test01 via API directly into localStorage
    console.log('Authenticating test01 session...');
    await page.evaluate(async () => {
        const res = await fetch('http://127.0.0.1:8000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test01', password: 'Password123!' })
        });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('currentUser', data.username);
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('token', data.access_token);
            return true;
        }
        return false;
    });

    // Reload to apply authenticated session
    await page.reload();
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 30000 });
    await page.waitForTimeout(1000);

    // 4. Open My Documents Modal
    console.log('Opening My Documents modal...');
    const myDocsBtn = page.getByRole('button', { name: /MY DOCUMENTS/i }).first();
    await expect(myDocsBtn).toBeVisible({ timeout: 15000 });
    await myDocsBtn.click();

    // 5. Wait for My Documents modal to display DOC-C147AE9E
    console.log('Waiting for My Documents modal with DOC-C147AE9E...');
    const docCard = page.locator('div.bg-white.border.rounded-xl', { hasText: 'DOC-C147AE9E' }).first();
    await expect(docCard).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1000);

    // 6. Locate Retry PDF button within DOC-C147AE9E card
    const retryBtn = docCard.locator('button:has-text("Retry PDF")').first();
    await expect(retryBtn).toBeVisible({ timeout: 10000 });

    console.log('Clicking Retry PDF and capturing network traffic...');
    let interceptedUrl = '';
    let interceptedMethod = '';
    let interceptedStatus = 0;
    let interceptedBody = '';

    const [retryResponse] = await Promise.all([
        page.waitForResponse(async res => {
            if (res.url().includes('/retry-pdf') && res.request().method() === 'POST') {
                interceptedUrl = res.url();
                interceptedMethod = res.request().method();
                interceptedStatus = res.status();
                try {
                    interceptedBody = await res.text();
                } catch (e) {
                    interceptedBody = '';
                }
                return true;
            }
            return false;
        }, { timeout: 30000 }),
        retryBtn.click()
    ]);

    console.log('=== NETWORK DIAGNOSTICS CAPTURED ===');
    console.log('Request URL:', interceptedUrl);
    console.log('Request Method:', interceptedMethod);
    console.log('Response Status:', interceptedStatus);
    console.log('Response Body:', interceptedBody);

    expect(interceptedStatus).toBe(200);
    expect(interceptedBody).toContain('DOC-C147AE9E');

    // 7. Wait for polling to detect PDF Ready on DOC-C147AE9E card
    console.log('Waiting for background PDF generation to complete and UI to update to PDF Ready...');
    
    // Polling interval in MyDocumentsModal updates the list
    const readyBadge = docCard.locator('text=Verified PDF Ready');
    await expect(readyBadge).toBeVisible({ timeout: 45000 });

    const downloadPdfBtn = docCard.locator('button:has-text("Download PDF")');
    await expect(downloadPdfBtn).toBeVisible({ timeout: 10000 });
    await expect(downloadPdfBtn).toBeEnabled({ timeout: 10000 });

    // Verify "PDF Generation Failed" is no longer present on DOC-C147AE9E card
    const failedBadge = docCard.locator('text=PDF Generation Failed');
    await expect(failedBadge).not.toBeVisible();

    console.log('Verified PDF Ready badge and Download PDF button are enabled for DOC-C147AE9E!');
    console.log('SUCCESS: Live Retry PDF verification passed completely!');
});
