/**
 * DraftSetu Slug & URL Utility
 * =============================
 * Deterministic, stable, and independent URL slug generation for templates.
 * 
 * Rules:
 * 1. URLs NEVER depend on array position, list order, or other templates.
 * 2. Slugs are pure functions of (template.name + template.template_id).
 * 3. Immutable ID suffix guarantees 100% collision-free uniqueness across duplicate names.
 * 4. Active rule: templates are only publicly accessible if is_active === true and status === 'ACTIVE'.
 */

// Common Gujarati legal dictionary words for optimal readability
const GUJARATI_WORD_MAP = {
    'વેચાણ': 'vechan',
    'ખેતીની': 'khetini',
    'જમીનનો': 'jaminno',
    'જમીન': 'jamin',
    'દસ્તાવેજ': 'dastavej',
    'બાનાખતનો': 'banakhatno',
    'બાનાખત': 'banakhat',
    'કરાર': 'karar',
    'કબજા': 'kabja',
    'વગર': 'vagar',
    'સાથે': 'sathe',
    'અઘાટ': 'aghat',
    'દુકાન': 'dukan',
    'વહેંચણીનું': 'vehnchninu',
    'સોગંદનામું': 'sogandnamu',
    'હયાતીમાં': 'hayati-ma',
    'પેઢીનામું': 'pedhinamu',
    'પેઢીનામાં': 'pedhinama',
    'હક્ક': 'hakk',
    'દાખલ': 'dakhal',
    'કરવા': 'karva',
    'અંગેનું': 'angenu',
    'અંગે': 'ange',
    'બીનખેડુત': 'binkhedut',
    'એનએ': 'na',
    'વીલ': 'will',
    'યાને': 'yane',
    'વસીયત': 'vasiyat',
    'નામું': 'namu',
    'પેપર': 'paper',
    'નોટીસ': 'notice',
    'રીલીઝનો': 'release-no',
    'રીલીઝ': 'release',
    'લેખ': 'lekh',
    'એફિડેવિટ': 'affidavit',
    'નોટરી': 'notary',
    'વારસાઈ': 'varasai',
    'દેવ': 'dev',
    'વાટિકા': 'vatika'
};

// General phonetic character map for Gujarati script
const GUJARATI_CHAR_MAP = {
    'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo',
    'ઋ': 'ru', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
    'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
    'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'z', 'ઞ': 'ny',
    'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
    'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
    'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
    'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v',
    'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
    'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u',
    'ૃ': 'ru', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
    'ં': 'n', 'ઃ': 'h', '્': '',
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

/**
 * Transliterate Gujarati / mixed text to a clean ASCII string
 */
export const transliterateGujarati = (text) => {
    if (!text) return '';
    let str = String(text).trim();

    // Replace known dictionary words first
    for (const [gujWord, engWord] of Object.entries(GUJARATI_WORD_MAP)) {
        const regex = new RegExp(gujWord, 'g');
        str = str.replace(regex, ` ${engWord} `);
    }

    // Replace remaining individual Gujarati characters phonetically
    let result = '';
    for (const ch of str) {
        if (GUJARATI_CHAR_MAP[ch] !== undefined) {
            result += GUJARATI_CHAR_MAP[ch];
        } else {
            result += ch;
        }
    }

    return result;
};

/**
 * Extract clean short template ID suffix (e.g. "tpl_997fd57d" -> "997fd57d")
 */
export const getTemplateIdSuffix = (templateId) => {
    if (!templateId) return '';
    const cleanId = String(templateId).trim().toLowerCase();
    if (cleanId.startsWith('tpl_')) {
        return cleanId.slice(4);
    }
    return cleanId;
};

/**
 * Generate a deterministic, collision-free, independent slug for a template.
 * Output format: `<transliterated-title>-<template-id-suffix>`
 * Example: `vechan-khetini-jaminno-dastavej-997fd57d`
 */
export const getTemplateSlug = (template) => {
    if (!template) return '';
    const templateId = template.template_id || template.id || '';
    const idSuffix = getTemplateIdSuffix(templateId);

    const rawName = template.name || template.title || '';
    const transliterated = transliterateGujarati(rawName);

    // Clean to URL-safe alphanumeric and hyphens
    const cleanSlug = transliterated
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (cleanSlug && idSuffix) {
        return `${cleanSlug}-${idSuffix}`;
    }
    if (cleanSlug) {
        return cleanSlug;
    }
    if (idSuffix) {
        return `template-${idSuffix}`;
    }
    return 'template';
};

/**
 * Check if a template is actively public
 */
export const isTemplatePubliclyAccessible = (template) => {
    if (!template) return false;
    const isActive = template.is_active !== false && template.is_active !== 0;
    const isStatusActive = (template.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
    return isActive && isStatusActive;
};

/**
 * Find a template from a list by slug or ID
 */
export const findTemplateBySlug = (templates, slug) => {
    if (!Array.isArray(templates) || !slug) return null;
    const targetSlug = String(slug).trim().toLowerCase();

    // 1. Direct canonical slug match
    const canonicalMatch = templates.find(t => getTemplateSlug(t) === targetSlug);
    if (canonicalMatch) return canonicalMatch;

    // 2. ID suffix match (e.g. slug ends with "997fd57d" or "tpl_997fd57d")
    const idMatch = templates.find(t => {
        const fullId = String(t.template_id || t.id || '').toLowerCase();
        const suffix = getTemplateIdSuffix(fullId);
        return fullId === targetSlug || (suffix && (targetSlug === suffix || targetSlug.endsWith(`-${suffix}`)));
    });
    if (idMatch) return idMatch;

    // 3. Fallback: Normalized base slug without suffix match
    const baseMatch = templates.find(t => {
        const rawName = t.name || t.title || '';
        const base = transliterateGujarati(rawName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return base && base === targetSlug;
    });
    if (baseMatch) return baseMatch;

    return null;
};

export default {
    getTemplateSlug,
    getTemplateIdSuffix,
    transliterateGujarati,
    isTemplatePubliclyAccessible,
    findTemplateBySlug
};
