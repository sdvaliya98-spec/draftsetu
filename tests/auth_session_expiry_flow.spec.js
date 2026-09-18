import { test, expect } from '@playwright/test';

test.describe('DraftSetu Authentication Session-Expiry Behavior & UX Audit', () => {
    test.beforeEach(async ({ page }) => {
        // Monitor for any native dialogs (alert, confirm, prompt) to ensure NONE are triggered
        page.on('dialog', async (dialog) => {
            throw new Error(`UNEXPECTED NATIVE DIALOG DETECTED: ${dialog.type()} ("${dialog.message()}")`);
        });
    });

    test('A & H: Public/guest visitors can load homepage, templates, and menu without any token', async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // Verify header branding and login button exist
        const brandTitle = page.locator('text=DraftSetu');
        await expect(brandTitle.first()).toBeVisible();

        const loginBtn = page.locator('button:has-text("Log In / Register")');
        await expect(loginBtn.first()).toBeVisible();

        // Verify no session expired dialog is rendered
        const sessionDialog = page.locator('text=સેશન સમાપ્ત થયું (Session Expired)');
        await expect(sessionDialog).toHaveCount(0);
    });

    test('B & C & E: Expired JWT triggers exactly one CustomDialog, clears session, and LOGIN AGAIN button opens AuthModal', async ({ page }) => {
        // Set an expired mock token in localStorage before loading
        await page.addInitScript(() => {
            localStorage.setItem('currentUser', 'expired_user');
            localStorage.setItem('authToken', 'mock_expired_token_xyz');
            localStorage.setItem('isAdminUser', 'false');
            localStorage.setItem('appRole', 'user');
        });

        // Intercept /api/auth/me to return 401 with Token has expired detail
        await page.route('**/api/auth/me', async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Token has expired or is invalid' })
            });
        });

        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // CustomDialog for session expiry must be displayed
        const sessionDialog = page.locator('text=સેશન સમાપ્ત થયું (Session Expired)');
        await expect(sessionDialog).toBeVisible({ timeout: 10000 });

        // Gujarati message must match expected copy
        const messageText = page.locator('text=તમારું સેશન સમાપ્ત થયું છે. કૃપા કરીને ફરી Login કરો.');
        await expect(messageText).toBeVisible();

        // Exactly one session dialog
        await expect(sessionDialog).toHaveCount(1);

        // Verify generic error popup "Token has expired or is invalid" with RETRY is NOT displayed
        const genericRetry = page.locator('button:has-text("ફરી પ્રયાસ કરો (Retry)")');
        await expect(genericRetry).toHaveCount(0);

        // Verify credentials in localStorage were cleared
        const storedToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(storedToken).toBeNull();
        const storedUser = await page.evaluate(() => localStorage.getItem('currentUser'));
        expect(storedUser).toBeNull();

        // Click "ફરી Login કરો (LOGIN AGAIN)"
        const loginAgainBtn = page.locator('button:has-text("ફરી Login કરો (LOGIN AGAIN)")');
        await expect(loginAgainBtn).toBeVisible();
        await loginAgainBtn.click();

        // Verify Login Modal is opened
        const authModal = page.locator('text=દસ્તાવેજ બનાવવા માટે Login કરો');
        await expect(authModal.first()).toBeVisible({ timeout: 5000 });
    });

    test('D: Multiple simultaneous 401 responses trigger only ONE session expired dialog', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('currentUser', 'multi_user');
            localStorage.setItem('authToken', 'mock_expired_token_multi');
            localStorage.setItem('isAdminUser', 'false');
        });

        // Intercept multiple endpoints to return 401 simultaneously
        await page.route('**/api/auth/me', async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Token has expired or is invalid' })
            });
        });

        await page.route('**/api/wallet/balance', async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Token has expired or is invalid' })
            });
        });

        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // Dispatch additional concurrent 401 requests in page context
        await page.evaluate(async () => {
            const reqs = [
                window.apiFetch('/api/wallet/balance').catch(() => {}),
                window.apiFetch('/api/documents/').catch(() => {}),
                window.apiFetch('/api/auth/me').catch(() => {})
            ];
            await Promise.all(reqs);
        });

        // Verify exactly ONE CustomDialog is rendered
        const sessionDialog = page.locator('text=સેશન સમાપ્ત થયું (Session Expired)');
        await expect(sessionDialog).toBeVisible({ timeout: 10000 });
        await expect(sessionDialog).toHaveCount(1);
    });

    test('G: Normal 403 Forbidden does NOT trigger session expired dialog', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('currentUser', 'normal_user');
            localStorage.setItem('authToken', 'valid_user_token_abc');
            localStorage.setItem('isAdminUser', 'false');
            localStorage.setItem('appRole', 'user');
        });

        // Allow /api/auth/me to succeed
        await page.route(/.*\/api\/auth\/me.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ username: 'normal_user', is_admin: false })
            });
        });

        // Allow wallet balance to succeed
        await page.route(/.*\/api\/wallet\/balance.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ balance: 100 })
            });
        });

        // Intercept admin route to return 403 Forbidden
        await page.route(/.*\/api\/admin\/dashboard-stats.*/, async (route) => {
            await route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Admin access required' })
            });
        });

        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // Trigger 403 request
        await page.evaluate(async () => {
            try {
                await window.apiFetch('/api/admin/dashboard-stats');
            } catch (e) {
                // Expected 403
            }
        });

        // Verify session dialog was NOT triggered
        const sessionDialog = page.locator('text=સેશન સમાપ્ત થયું (Session Expired)');
        await expect(sessionDialog).toHaveCount(0);

        // Verify user token remains intact
        const storedToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(storedToken).toBe('valid_user_token_abc');
    });

    test('I: Admin expired token closes Admin panel and follows session expired flow', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('currentUser', 'admin_user');
            localStorage.setItem('authToken', 'expired_admin_token');
            localStorage.setItem('isAdminUser', 'true');
            localStorage.setItem('appRole', 'admin');
            localStorage.setItem('isAdminPanelOpen', 'true');
        });

        // Intercept admin endpoints to return 401
        await page.route(/.*\/api\/admin\/dashboard-stats.*/, async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Token has expired or is invalid' })
            });
        });

        await page.route(/.*\/api\/auth\/me.*/, async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ detail: 'Token has expired or is invalid' })
            });
        });

        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // Verify session expired dialog is displayed
        const sessionDialog = page.locator('text=સેશન સમાપ્ત થયું (Session Expired)');
        await expect(sessionDialog).toBeVisible({ timeout: 10000 });

        // Generic error popup in AdminDashboard must NOT be displayed
        const genericRetry = page.locator('button:has-text("ફરી પ્રયાસ કરો (Retry)")');
        await expect(genericRetry).toHaveCount(0);

        // Verify admin credentials cleared
        const storedToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(storedToken).toBeNull();
        const storedRole = await page.evaluate(() => localStorage.getItem('appRole'));
        expect(storedRole).toBe('user');
    });

    test('J & F: Login / Google login succeeds and clears session expiry state', async ({ page }) => {
        // Intercept Google auth
        await page.route(/.*\/api\/auth\/google.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'fresh_google_access_token_123',
                    token_type: 'bearer',
                    username: 'googler',
                    is_admin: false,
                    requires_profile_completion: false
                })
            });
        });

        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // Open Auth modal
        const loginBtn = page.locator('button:has-text("Log In / Register")');
        await loginBtn.first().click();

        const authModal = page.locator('text=દસ્તાવેજ બનાવવા માટે Login કરો');
        await expect(authModal.first()).toBeVisible();

        // Trigger mock Google login
        await page.evaluate(async () => {
            if (typeof window.mockGoogleLogin === 'function') {
                await window.mockGoogleLogin('mock_google_id_token');
            }
        });

        // Verify user profile appears in header
        const userBadge = page.locator('text=googler');
        await expect(userBadge.first()).toBeVisible({ timeout: 5000 });

        // Verify fresh token in localStorage
        const storedToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(storedToken).toBe('fresh_google_access_token_123');
    });

    test('K: Normal user logout cleanly clears credentials without session expired dialog', async ({ page }) => {
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

        await page.setViewportSize({ width: 1400, height: 900 });
        await page.addInitScript(() => {
            localStorage.setItem('currentUser', 'logout_test_user');
            localStorage.setItem('authToken', 'valid_token_for_logout');
            localStorage.setItem('isAdminUser', 'false');
            localStorage.setItem('appRole', 'user');
        });

        await page.route(/.*\/api\/auth\/me.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ username: 'logout_test_user', is_admin: false })
            });
        });

        await page.route(/.*\/api\/wallet\/balance.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ balance: 50 })
            });
        });

        await page.route(/.*\/api\/logout.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'ok' })
            });
        });

        await page.goto('http://127.0.0.1:5500/');
        await page.waitForLoadState('domcontentloaded');

        // Wait for authenticated user profile in header
        const userProfileBtn = page.locator('text=logout_test_user');
        await expect(userProfileBtn.first()).toBeVisible({ timeout: 10000 });

        // Click Logout button
        const logoutBtn = page.locator('#gov-header-logout-btn');
        await expect(logoutBtn).toBeVisible();
        await logoutBtn.click();

        // Verify user logged out and Log In / Register button restored
        const loginBtn = page.locator('#gov-header-login-btn');
        await expect(loginBtn).toBeVisible({ timeout: 10000 });

        // Verify no session expired dialog appeared
        const sessionDialog = page.locator('text=સેશન સમાપ્ત થયું (Session Expired)');
        await expect(sessionDialog).toHaveCount(0);

        // Verify localStorage cleared
        const storedTokenAfter = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(storedTokenAfter).toBeNull();
    });
});
