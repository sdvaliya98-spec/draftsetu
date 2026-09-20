import { test, expect } from '@playwright/test';

test.describe('Template-Specific Shareable Links & WhatsApp Share Suite', () => {

    test('1. Unit & Deterministic Slug Rules - Independence, stability, and collision safety', async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const result = await page.evaluate(async () => {
            const { getTemplateSlug, findTemplateBySlug, isTemplatePubliclyAccessible } = await import('/src/utils/slugUtils.js');

            const tplA = { id: 'tpl_111', template_id: 'tpl_111', name: 'વેચાણ ખેતીની જમીનનો દસ્તાવેજ', is_active: true, status: 'ACTIVE' };
            const tplB = { id: 'tpl_222', template_id: 'tpl_222', name: 'વેચાણ બાનાખત કબજા સાથે', is_active: true, status: 'ACTIVE' };
            const tplC = { id: 'tpl_333', template_id: 'tpl_333', name: 'હક્ક રીલીઝનો લેખ', is_active: true, status: 'ACTIVE' };
            const tplDupName = { id: 'tpl_444', template_id: 'tpl_444', name: 'વેચાણ ખેતીની જમીનનો દસ્તાવેજ', is_active: true, status: 'ACTIVE' };

            const slugA = getTemplateSlug(tplA);
            const slugB = getTemplateSlug(tplB);
            const slugC = getTemplateSlug(tplC);
            const slugDup = getTemplateSlug(tplDupName);

            // Verify slugs are stable and deterministic
            const slugA_again = getTemplateSlug(tplA);

            // Verify independent matching
            const allList = [tplA, tplB, tplC, tplDupName];
            const matchedA = findTemplateBySlug(allList, slugA);
            const matchedDup = findTemplateBySlug(allList, slugDup);

            // Simulate deletion of Template B from the list
            const listWithoutB = [tplA, tplC, tplDupName];
            const slugA_after_delete = getTemplateSlug(tplA);
            const slugC_after_delete = getTemplateSlug(tplC);

            return {
                slugA,
                slugB,
                slugC,
                slugDup,
                slugA_is_stable: slugA === slugA_again,
                slugA_after_delete_same: slugA === slugA_after_delete,
                slugC_after_delete_same: slugC === slugC_after_delete,
                duplicate_names_distinct: slugA !== slugDup,
                matchedA_id: matchedA?.template_id,
                matchedDup_id: matchedDup?.template_id,
                is_tplA_accessible: isTemplatePubliclyAccessible(tplA),
                is_archived_accessible: isTemplatePubliclyAccessible({ ...tplB, status: 'ARCHIVED' }),
                is_deleted_accessible: isTemplatePubliclyAccessible({ ...tplB, status: 'DELETED' }),
                is_inactive_accessible: isTemplatePubliclyAccessible({ ...tplB, is_active: false })
            };
        });

        expect(result.slugA).toBe('vechan-khetini-jaminno-dastavej-111');
        expect(result.slugB).toBe('vechan-banakhat-kabja-sathe-222');
        expect(result.slugC).toBe('hakk-release-no-lekh-333');
        expect(result.slugDup).toBe('vechan-khetini-jaminno-dastavej-444');
        expect(result.slugA_is_stable).toBe(true);
        expect(result.slugA_after_delete_same).toBe(true);
        expect(result.slugC_after_delete_same).toBe(true);
        expect(result.duplicate_names_distinct).toBe(true);
        expect(result.matchedA_id).toBe('tpl_111');
        expect(result.matchedDup_id).toBe('tpl_444');
        expect(result.is_tplA_accessible).toBe(true);
        expect(result.is_archived_accessible).toBe(false);
        expect(result.is_deleted_accessible).toBe(false);
        expect(result.is_inactive_accessible).toBe(false);
    });

    test('2. Active Template Landing Page - Direct URL navigation, SEO tags, and Feature List', async ({ page }) => {
        // Direct load of Sale Deed template landing page
        await page.goto('http://127.0.0.1:5500/templates/vechan-khetini-jaminno-dastavej-997fd57d', { waitUntil: 'domcontentloaded' });
        
        // Wait for H1 to render
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible({ timeout: 10000 });
        await expect(h1).toHaveText('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');

        // Verify Title
        const title = await page.title();
        expect(title).toContain('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');
        expect(title).toContain('DraftSetu');

        // Verify Canonical Link
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        expect(canonical).toBe('https://draftsetu.in/templates/vechan-khetini-jaminno-dastavej-997fd57d');

        // Verify Meta Description & OpenGraph tags
        const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
        expect(metaDesc).toBeTruthy();
        expect(metaDesc).toContain('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');

        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
        expect(ogTitle).toContain('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');

        const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
        expect(ogUrl).toBe('https://draftsetu.in/templates/vechan-khetini-jaminno-dastavej-997fd57d');

        // Verify Breadcrumbs
        const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
        await expect(breadcrumb).toBeVisible();
        await expect(breadcrumb).toContainText('મુખ્ય પૃષ્ઠ');
        await expect(breadcrumb).toContainText('દસ્તાવેજ નમૂનાઓ');
        await expect(breadcrumb).toContainText('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');

        // Verify "આ Template માં શું મળશે?" Features Scope
        const featuresHeading = page.locator('h2:has-text("આ Template માં શું મળશે?")');
        await expect(featuresHeading).toBeVisible();
        await expect(page.locator('text=ગુજરાતી કાનૂની બ્લુપ્રિન્ટ')).toBeVisible();
        await expect(page.locator('text=સરળ માહિતી એન્ટ્રી')).toBeVisible();
        await expect(page.locator('text=તત્કાળ લાઈવ પ્રીવ્યૂ')).toBeVisible();
        await expect(page.locator('text=DOCX અને PDF ડાઉનલોડ')).toBeVisible();
        await expect(page.locator('text=સુરક્ષિત ડ્રાફ્ટ સેવ')).toBeVisible();
        await expect(page.locator('text=ફાઇનલ લોક સુરક્ષા')).toBeVisible();
    });

    test('3. Primary CTA navigates to Editor with correct active template', async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/templates/vechan-khetini-jaminno-dastavej-997fd57d', { waitUntil: 'domcontentloaded' });
        
        const createBtn = page.locator('button:has-text("દસ્તાવેજ બનાવો")').first();
        await expect(createBtn).toBeVisible({ timeout: 10000 });
        await createBtn.click();

        // Should enter Editor view for tpl_997fd57d
        await expect(page.locator('#template-selector, #variable-form').first()).toBeVisible({ timeout: 15000 });
    });

    test('4. WhatsApp Share and Copy Link interaction generates distinct URLs for each opened template', async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

        const testTemplates = [
            {
                slug: 'vechan-khetini-jaminno-dastavej-997fd57d',
                name: 'વેચાણ ખેતીની જમીનનો દસ્તાવેજ'
            },
            {
                slug: 'vechan-banakhat-kabja-sathe-1ee12a63',
                name: 'વેચાણ બાનાખત કબજા સાથે'
            },
            {
                slug: 'hakk-release-no-lekh-737760b1',
                name: 'હક્ક રીલીઝનો લેખ'
            }
        ];

        const copiedUrls = [];
        const clipboardValues = [];
        const whatsAppUrls = [];

        for (const item of testTemplates) {
            await page.goto(`http://127.0.0.1:5500/templates/${item.slug}`, { waitUntil: 'domcontentloaded' });
            
            // Wait for H1 to render matching current template
            const h1 = page.locator('h1').first();
            await expect(h1).toBeVisible({ timeout: 10000 });
            await expect(h1).toHaveText(item.name);

            // Verify browser URL matches current template landing page
            const expectedUrl = `http://127.0.0.1:5500/templates/${item.slug}`;
            expect(page.url()).toBe(expectedUrl);

            // Test Copy Link Button
            const copyBtn = page.locator('button:has-text("Link Copy કરો"), button:has-text("લિંક કોપી")').first();
            await expect(copyBtn).toBeVisible();
            await copyBtn.click();
            await page.waitForTimeout(400);

            // 1. Read actual clipboard value
            const clipText = await page.evaluate(async () => {
                try {
                    return await navigator.clipboard.readText();
                } catch {
                    return '';
                }
            });
            if (clipText) {
                clipboardValues.push(clipText);
                expect(clipText).toBe(expectedUrl);
            }

            // 2. Dialog displays the copied URL
            const dialogMsg = page.locator('div[role="dialog"] .whitespace-pre-line, div[role="dialog"]').first();
            await expect(dialogMsg).toBeVisible();
            const dialogText = await dialogMsg.innerText();
            expect(dialogText).toContain(item.slug);
            copiedUrls.push(dialogText);

            // Click OK on CustomDialog
            const okBtn = page.locator('button:has-text("OK"), button:has-text("ઠીક છે")').first();
            if (await okBtn.isVisible()) {
                await okBtn.click();
                await page.waitForTimeout(300);
            }

            // 3. Test WhatsApp Share Target URL
            const [popup] = await Promise.all([
                page.waitForEvent('popup', { timeout: 3000 }).catch(() => null),
                page.locator('button:has-text("WhatsApp"), a:has-text("WhatsApp")').first().click()
            ]);

            if (popup) {
                const popupUrl = popup.url();
                whatsAppUrls.push(popupUrl);
                expect(popupUrl).toContain(encodeURIComponent(expectedUrl));
                await popup.close();
            }
        }

        // Verify that all 3 templates generated completely distinct URLs
        expect(copiedUrls.length).toBe(3);
        expect(new Set(copiedUrls).size).toBe(3);

        if (clipboardValues.length === 3) {
            expect(new Set(clipboardValues).size).toBe(3);
            expect(clipboardValues[0]).not.toBe(clipboardValues[1]);
            expect(clipboardValues[1]).not.toBe(clipboardValues[2]);
            expect(clipboardValues[0]).not.toBe(clipboardValues[2]);
        }

        if (whatsAppUrls.length === 3) {
            expect(new Set(whatsAppUrls).size).toBe(3);
            expect(whatsAppUrls[0]).not.toBe(whatsAppUrls[1]);
            expect(whatsAppUrls[1]).not.toBe(whatsAppUrls[2]);
        }
    });

    test('5. Archived / Inactive / Non-existent template shows clean "Template ઉપલબ્ધ નથી" state', async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/templates/non-existent-template-slug-999999');
        
        // Verify "Template ઉપલબ્ધ નથી" is displayed
        const notFoundH1 = page.locator('h1:has-text("Template ઉપલબ્ધ નથી")').first();
        await expect(notFoundH1).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=આ દસ્તાવેજ Template હાલમાં ઉપલબ્ધ નથી')).toBeVisible();

        // Verify title
        const title = await page.title();
        expect(title).toContain('Template ઉપલબ્ધ નથી');

        // Click browse all button
        const browseBtn = page.locator('button:has-text("બધા દસ્તાવેજો જુઓ")');
        await expect(browseBtn).toBeVisible();
        await browseBtn.click();
        await page.waitForTimeout(1000);

        // Navigates back to Homepage
        await expect(page.locator('h1:has-text("સચોટ ગુજરાતી કાનૂની દસ્તાવેજો")')).toBeVisible();
    });

    test('6. GA4 Telemetry for Template Landing View and Share Clicks', async ({ page }) => {
        await page.addInitScript(() => {
            window.__capturedGaEvents = [];
            window.gtag = function (type, eventName, params) {
                if (type === 'event') {
                    window.__capturedGaEvents.push({ eventName, params });
                }
                if (Array.isArray(window.dataLayer)) {
                    window.dataLayer.push(arguments);
                }
            };
        });

        await page.goto('http://127.0.0.1:5500/templates/vechan-khetini-jaminno-dastavej-997fd57d');
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // Click WhatsApp share
        const waBtn = page.locator('button:has-text("WhatsApp પર શેર કરો")').first();
        if (await waBtn.isVisible()) {
            await waBtn.click();
            await page.waitForTimeout(500);
        }

        // Click Copy Link
        const copyBtn = page.locator('button:has-text("Link Copy કરો")').first();
        if (await copyBtn.isVisible()) {
            await copyBtn.click();
            await page.waitForTimeout(500);
            const okBtn = page.locator('button:has-text("OK")').first();
            if (await okBtn.isVisible()) await okBtn.click();
        }

        const events = await page.evaluate(() => window.__capturedGaEvents || []);

        const landingViewEvent = events.find(e => e.eventName === 'template_landing_view');
        expect(landingViewEvent).toBeTruthy();
        expect(landingViewEvent.params.template_id).toBe('tpl_997fd57d');
        expect(landingViewEvent.params.template_category).toBe('Sale Deed');

        const shareEvents = events.filter(e => e.eventName === 'template_share_click');
        expect(shareEvents.length).toBeGreaterThanOrEqual(1);

        // Verify zero PII in any captured event
        const jsonDump = JSON.stringify(events);
        expect(jsonDump).not.toContain('Aadhaar');
        expect(jsonDump).not.toContain('password');
        expect(jsonDump).not.toContain('jwt');
    });

    test('7. Back Navigation Stack Integrity (Home -> Landing -> Editor -> Back -> Landing -> Back -> Home)', async ({ page }) => {
        await page.goto('http://127.0.0.1:5500/');
        await page.waitForTimeout(1000);

        // Step 1: Click template card on Homepage -> Navigates to Template Landing Page
        const templateCardBtn = page.locator('button:has-text("દસ્તાવેજ પસંદ કરો")').first();
        await expect(templateCardBtn).toBeVisible({ timeout: 10000 });
        await templateCardBtn.click();
        
        // We are on Template Landing Page
        const landingH1 = page.locator('h1').first();
        await expect(landingH1).toBeVisible({ timeout: 10000 });
        const expectedLandingTitle = await landingH1.innerText();
        expect(expectedLandingTitle).toBeTruthy();

        // Step 2: Click "દસ્તાવેજ બનાવો" -> Navigates to Editor
        const createBtn = page.locator('button:has-text("દસ્તાવેજ બનાવો")').first();
        await createBtn.click();
        await expect(page.locator('#template-selector, #variable-form').first()).toBeVisible({ timeout: 15000 });

        // Step 3: Trigger Back Navigation in Header
        const backBtn = page.locator('button[title*="Back"], button:has-text("પાછા જાઓ"), button:has-text("Back")').first();
        if (await backBtn.isVisible()) {
            await backBtn.click();
            await page.waitForTimeout(1000);
            // Should be back on Template Landing Page
            await expect(page.locator('h1').first()).toHaveText(expectedLandingTitle);

            // Click Back again -> Returns to Home
            await backBtn.click();
            await page.waitForTimeout(1000);
            await expect(page.locator('h1:has-text("સચોટ ગુજરાતી કાનૂની દસ્તાવેજો")')).toBeVisible();
        }
    });

    test('8. Sitemap fallback verification contains active template URLs and valid XML structure', async ({ page }) => {
        // Verify public/sitemap.xml
        const response = await page.goto('http://127.0.0.1:5500/sitemap.xml');
        expect(response.status()).toBe(200);
        const xmlText = await response.text();

        expect(xmlText).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xmlText).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(xmlText).toContain('https://draftsetu.in/');
        expect(xmlText).toContain('https://draftsetu.in/privacy-policy');
        expect(xmlText).toContain('https://draftsetu.in/terms-of-service');
        expect(xmlText).toContain('https://draftsetu.in/templates/vechan-khetini-jaminno-dastavej-997fd57d');
        expect(xmlText).toContain('https://draftsetu.in/templates/vechan-banakhat-kabja-sathe-1ee12a63');
        expect(xmlText).toContain('https://draftsetu.in/templates/hakk-release-no-lekh-737760b1');
    });

    test('9. Template Landing Page Schema.org BreadcrumbList JSON-LD lifecycle and validity', async ({ page }) => {
        // 1. Visit Template A
        await page.goto('http://127.0.0.1:5500/templates/vechan-khetini-jaminno-dastavej-997fd57d', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toHaveText('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');

        // Verify exactly one BreadcrumbList script
        let breadcrumbs = page.locator('script#schema-template-breadcrumb');
        await expect(breadcrumbs).toHaveCount(1);

        let jsonA = JSON.parse(await breadcrumbs.textContent());
        expect(jsonA['@type']).toBe('BreadcrumbList');
        expect(jsonA.itemListElement).toHaveLength(3);
        expect(jsonA.itemListElement[0].name).toBe('Home');
        expect(jsonA.itemListElement[0].item).toBe('https://draftsetu.in/');
        expect(jsonA.itemListElement[1].name).toBe('Templates');
        expect(jsonA.itemListElement[1].item).toBe('https://draftsetu.in/#quick-services');
        expect(jsonA.itemListElement[2].name).toBe('વેચાણ ખેતીની જમીનનો દસ્તાવેજ');
        expect(jsonA.itemListElement[2].item).toBe('https://draftsetu.in/templates/vechan-khetini-jaminno-dastavej-997fd57d');

        // 2. Navigate directly to Template B
        await page.goto('http://127.0.0.1:5500/templates/hakk-release-no-lekh-737760b1', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toHaveText('હક્ક રીલીઝનો લેખ');

        // Check that BreadcrumbList updated correctly with zero duplicates
        breadcrumbs = page.locator('script#schema-template-breadcrumb');
        await expect(breadcrumbs).toHaveCount(1);
        let jsonB = JSON.parse(await breadcrumbs.textContent());
        expect(jsonB.itemListElement[2].name).toBe('હક્ક રીલીઝનો લેખ');
        expect(jsonB.itemListElement[2].item).toBe('https://draftsetu.in/templates/hakk-release-no-lekh-737760b1');

        // 3. Visit Invalid template page -> BreadcrumbList should not be rendered
        await page.goto('http://127.0.0.1:5500/templates/invalid-slug-999999');
        await expect(page.locator('h1:has-text("Template ઉપલબ્ધ નથી")')).toBeVisible();
        await expect(page.locator('script#schema-template-breadcrumb')).toHaveCount(0);
    });
});
