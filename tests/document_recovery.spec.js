// tests/document_recovery.spec.js
import { test, expect } from '@playwright/test';

test.describe('Document Data Recovery & Isolation Spec', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('1. Autosave persists unsaved data in localStorage with anon key', async ({ page }) => {
    await page.goto('/?view=editor');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    await page.waitForSelector('#template-selector');
    await page.waitForFunction(() => {
      const sel = document.querySelector('#template-selector');
      return sel && sel.options.length > 1;
    });
    await page.selectOption('#template-selector', { index: 1 });

    const inputField = page.locator('input[type="text"]').first();
    await expect(inputField).toBeVisible();

    const testVal = 'Recovery-Test-Village-123';
    await inputField.fill(testVal);

    // Wait >500ms for debounce
    await page.waitForTimeout(1000);

    const keys = await page.evaluate(() => Object.keys(localStorage));
    const recoveryKey = keys.find(k => k.startsWith('draftsetu_recovery_anon_'));
    expect(recoveryKey).toBeTruthy();

    const storedData = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), recoveryKey);
    expect(Object.values(storedData)).toContain(testVal);
  });

  test('2. Recovery dialog appears on refresh and Restore populates form', async ({ page }) => {
    await page.goto('/?view=editor');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    await page.waitForSelector('#template-selector');
    await page.waitForFunction(() => {
      const sel = document.querySelector('#template-selector');
      return sel && sel.options.length > 1;
    });
    await page.selectOption('#template-selector', { index: 1 });

    const inputField = page.locator('input[type="text"]').first();
    await expect(inputField).toBeVisible();

    const testVal = 'Restore-Me-Data';
    await inputField.fill(testVal);
    await page.waitForTimeout(1000);

    // Reload page to simulate browser reopen/refresh
    await page.reload();
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // CustomDialog should appear
    const recoveryModal = page.locator('text=Unsaved data found');
    await expect(recoveryModal).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=તમારો અગાઉનો અધૂરો ડેટા મળ્યો છે')).toBeVisible();

    // Click Restore
    const restoreBtn = page.locator('button:has-text("Restore"), button:has-text("પુનઃપ્રાપ્ત કરો")').first();
    await restoreBtn.click();

    // Verify restored value
    await expect(inputField).toHaveValue(testVal);
  });

  test('3. Discard clears recovery cache and resets form to empty state', async ({ page }) => {
    await page.goto('/?view=editor');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    await page.waitForSelector('#template-selector');
    await page.waitForFunction(() => {
      const sel = document.querySelector('#template-selector');
      return sel && sel.options.length > 1;
    });
    await page.selectOption('#template-selector', { index: 1 });

    const inputField = page.locator('input[type="text"]').first();
    await expect(inputField).toBeVisible();

    const discardVal = 'Discard-Me-Data';
    await inputField.fill(discardVal);
    await page.waitForTimeout(1000);

    // Reload
    await page.reload();
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    const recoveryModal = page.locator('text=Unsaved data found');
    await expect(recoveryModal).toBeVisible({ timeout: 15000 });

    // Click Discard
    const discardBtn = page.locator('button:has-text("Discard"), button:has-text("કાઢી નાખો")').first();
    await discardBtn.click();

    // Verify input is empty
    await expect(inputField).not.toHaveValue(discardVal);

    // Reload again to verify no dialog reappears
    await page.reload();
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });
    await expect(recoveryModal).not.toBeVisible();
  });

  test('4. Template switching preserves in-memory session without dialog', async ({ page }) => {
    await page.goto('/?view=editor');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // Template 1
    await page.waitForSelector('#template-selector');
    await page.waitForFunction(() => {
      const sel = document.querySelector('#template-selector');
      return sel && sel.options.length > 2;
    });
    await page.selectOption('#template-selector', { index: 1 });

    const input1 = page.locator('input[type="text"]').first();
    await expect(input1).toBeVisible();
    await input1.fill('Tpl1-Session-Value');
    await page.waitForTimeout(1000);

    // Switch to Template 2
    await page.selectOption('#template-selector', { index: 2 });
    await page.waitForTimeout(800);

    const input2 = page.locator('input[type="text"]').first();
    await expect(input2).toBeVisible();
    await expect(input2).not.toHaveValue('Tpl1-Session-Value');
    await input2.fill('Tpl2-Session-Value');
    await page.waitForTimeout(1000);

    // Switch back to Template 1: in-memory SessionManager should restore without dialog
    await page.selectOption('#template-selector', { index: 1 });
    await page.waitForTimeout(800);
    await expect(input1).toHaveValue('Tpl1-Session-Value');
    await expect(page.locator('text=Unsaved data found')).not.toBeVisible();
  });

  test('5. User account isolation ensures User B does not see User A recovery data', async ({ page }) => {
    const userA = `user_recA_${Math.floor(Math.random() * 1000000)}`;
    const userB = `user_recB_${Math.floor(Math.random() * 1000000)}`;

    await page.goto('/?view=editor');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // Simulate User A having stored draft
    await page.evaluate(({ uA }) => {
      localStorage.setItem('currentUser', uA);
      localStorage.setItem('authToken', 'mock_token_A');
      localStorage.setItem(`draftsetu_recovery_${uA.toLowerCase()}_sample_tpl`, JSON.stringify({ village: 'User-A-Secret' }));
      localStorage.setItem(`draftsetu_recovery_time_${uA.toLowerCase()}_sample_tpl`, new Date().toISOString());
    }, { uA: userA });

    // Switch to User B
    await page.evaluate(({ uB }) => {
      localStorage.setItem('currentUser', uB);
      localStorage.setItem('authToken', 'mock_token_B');
    }, { uB: userB });

    await page.reload();
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // Recovery dialog for User A's data should NOT appear for User B
    const recoveryModal = page.locator('text=Unsaved data found');
    await expect(recoveryModal).not.toBeVisible();
  });

  test('6. Corrupted cache in localStorage is safely purged without crashing app', async ({ page }) => {
    await page.goto('/?view=editor');
    await page.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // Corrupt the recovery key
    await page.evaluate(() => {
      localStorage.setItem('draftsetu_recovery_anon_test_corrupt', '{{{invalid_json:');
    });

    // Loading corrupted key should return null and purge corrupted key without crashing
    const result = await page.evaluate(() => {
      return window.DraftCacheManager.load('test_corrupt', 'anon');
    });

    expect(result).toBeNull();
    const isPurged = await page.evaluate(() => {
      return localStorage.getItem('draftsetu_recovery_anon_test_corrupt') === null;
    });
    expect(isPurged).toBe(true);
  });

  test('7. Real-world Home flow: Home -> Template -> Enter Data -> Tab close -> Reopen Home -> Template -> Restore', async ({ context }) => {
    const page1 = await context.newPage();
    await page1.goto('/');
    await page1.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // Click "USE TEMPLATE" on first available card
    const useBtn1 = page1.locator('button:has-text("USE TEMPLATE")').first();
    await expect(useBtn1).toBeVisible({ timeout: 15000 });
    await useBtn1.click();

    // Fill unique value
    const input1 = page1.locator('input[type="text"]').first();
    await expect(input1).toBeVisible({ timeout: 15000 });
    const uniqueVal = 'RECOVERY_HOME_FLOW_12345';
    await input1.fill(uniqueVal);

    // Wait for debounced autosave
    await page1.waitForTimeout(2000);

    // Verify localStorage contains that value
    const storage1 = await page1.evaluate(() => ({ ...localStorage }));
    const savedKeys = Object.keys(storage1).filter(k => k.startsWith('draftsetu_recovery_'));
    expect(savedKeys.length).toBeGreaterThan(0);
    const hasValue = savedKeys.some(k => storage1[k].includes(uniqueVal));
    expect(hasValue).toBe(true);

    // Close page 1 (simulating tab close)
    await page1.close();

    // Reopen application at '/' (Home page)
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    // Ensure Home mount did not overwrite recovery draft
    await page2.waitForTimeout(1000);
    const storage2 = await page2.evaluate(() => ({ ...localStorage }));
    const hasValueAfterHomeMount = savedKeys.some(k => storage2[k] && storage2[k].includes(uniqueVal));
    expect(hasValueAfterHomeMount).toBe(true);

    // Select the SAME template from Home
    const useBtn2 = page2.locator('button:has-text("USE TEMPLATE")').first();
    await expect(useBtn2).toBeVisible({ timeout: 15000 });
    await useBtn2.click();

    // Verify recovery dialog appears
    const recoveryModal = page2.locator('text=Unsaved data found');
    await expect(recoveryModal).toBeVisible({ timeout: 15000 });

    // Click Restore
    const restoreBtn = page2.locator('button:has-text("Restore"), button:has-text("પુનઃપ્રાપ્ત કરો")').first();
    await restoreBtn.click();

    // Verify data restored in form
    const input2 = page2.locator('input[type="text"]').first();
    await expect(input2).toHaveValue(uniqueVal);
  });

  test('8. Real-world Home flow: Home -> Template -> Enter Data -> Tab close -> Reopen Home -> Template -> Discard', async ({ context }) => {
    const page1 = await context.newPage();
    await page1.goto('/');
    await page1.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    const useBtn1 = page1.locator('button:has-text("USE TEMPLATE")').first();
    await expect(useBtn1).toBeVisible({ timeout: 15000 });
    await useBtn1.click();

    const input1 = page1.locator('input[type="text"]').first();
    await expect(input1).toBeVisible({ timeout: 15000 });
    const discardVal = 'DISCARD_HOME_FLOW_12345';
    await input1.fill(discardVal);
    await page1.waitForTimeout(2000);

    // Close page 1
    await page1.close();

    // Reopen at '/'
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });

    const useBtn2 = page2.locator('button:has-text("USE TEMPLATE")').first();
    await expect(useBtn2).toBeVisible({ timeout: 15000 });
    await useBtn2.click();

    const recoveryModal = page2.locator('text=Unsaved data found');
    await expect(recoveryModal).toBeVisible({ timeout: 15000 });

    // Click Discard
    const discardBtn = page2.locator('button:has-text("Discard"), button:has-text("કાઢી નાખો")').first();
    await discardBtn.click();

    // Verify data is not restored
    const input2 = page2.locator('input[type="text"]').first();
    await expect(input2).not.toHaveValue(discardVal);

    // Reopen again to confirm recovery cache was cleared
    await page2.goto('/');
    await page2.waitForSelector('#splash-screen', { state: 'detached', timeout: 60000 });
    const useBtn3 = page2.locator('button:has-text("USE TEMPLATE")').first();
    await useBtn3.click();
    await page2.waitForTimeout(1000);
    await expect(page2.locator('text=Unsaved data found')).not.toBeVisible();
  });
});

