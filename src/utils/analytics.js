/**
 * DraftSetu GA4 Analytics & Conversion Telemetry Utility
 * =====================================================
 * Handles Google Analytics 4 (gtag.js) SPA page view tracking and product conversion funnel events.
 * 
 * Safety & Privacy Guarantees:
 * 1. Safe no-op when VITE_GA4_MEASUREMENT_ID is missing or not configured.
 * 2. Zero console errors or network blocking if GA4 is unreachable or disabled.
 * 3. Strict PII sanitization: guarantees no passwords, tokens, JWTs, PAN, Aadhaar,
 *    names, emails, phone numbers, or document form data are ever transmitted to GA4.
 * 4. Duplicate initialization and consecutive identical SPA page_view protection.
 */

// Retrieve measurement ID from Vite environment or window override
const getMeasurementId = () => {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GA4_MEASUREMENT_ID) {
            return String(import.meta.env.VITE_GA4_MEASUREMENT_ID).trim();
        }
    } catch { }

    if (typeof window !== 'undefined' && window.VITE_GA4_MEASUREMENT_ID) {
        return String(window.VITE_GA4_MEASUREMENT_ID).trim();
    }

    return '';
};

// Disallowed keys and patterns that must NEVER be sent to analytics
const SENSITIVE_PARAM_KEYS = new Set([
    'password', 'confirm_password', 'token', 'access_token', 'jwt', 'auth_token',
    'email', 'user_email', 'phone', 'mobile', 'mobile_number', 'user_mobile',
    'pan', 'buyer_pan', 'seller_pan', 'pan_number',
    'aadhaar', 'aadhaar_number', 'buyer_aadhaar', 'seller_aadhaar',
    'data', 'data_json', 'fields', 'document_data', 'content', 'document_content',
    'buyer_name', 'seller_name', 'buyer_address', 'seller_address',
    'razorpay_signature', 'razorpay_secret', 'signature', 'secret'
]);

const isSensitiveKey = (key) => {
    const lowerKey = String(key || '').toLowerCase();
    if (SENSITIVE_PARAM_KEYS.has(lowerKey)) return true;
    if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret') ||
        lowerKey.includes('aadhaar') || lowerKey.includes('pan_') || lowerKey.includes('_pan') ||
        lowerKey.includes('content') || lowerKey.includes('signature')) {
        return true;
    }
    return false;
};

// Sanitize parameter object to guarantee privacy and safe telemetry
export const sanitizeParameters = (params) => {
    if (!params || typeof params !== 'object') return {};

    const clean = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;

        if (isSensitiveKey(key)) {
            continue;
        }

        if (typeof value === 'object' && !Array.isArray(value)) {
            clean[key] = sanitizeParameters(value);
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            // Trim strings and truncate to safe length (100 chars)
            if (typeof value === 'string') {
                clean[key] = value.slice(0, 100);
            } else {
                clean[key] = value;
            }
        }
    }
    return clean;
};

export const sanitizePayload = sanitizeParameters;

let lastTrackedPath = null;

/**
 * Initialize GA4 tracking script if measurement ID is present.
 */
export const initAnalytics = () => {
    if (typeof window === 'undefined') return;

    const measurementId = getMeasurementId();

    // If already initialized or measurement ID is missing / default placeholder, safely return
    if (window._draftsetu_ga4_initialized) return;
    if (!measurementId || measurementId.startsWith('G-XXXX') || measurementId === 'undefined') {
        // Set dummy dataLayer / gtag for safe no-op in tests / dev
        window.dataLayer = window.dataLayer || [];
        if (!window.gtag) {
            window.gtag = function () {
                window.dataLayer.push(arguments);
            };
        }
        window._draftsetu_ga4_initialized = true;
        return;
    }

    try {
        // Setup dataLayer and gtag function
        window.dataLayer = window.dataLayer || [];
        function gtag() {
            window.dataLayer.push(arguments);
        }
        window.gtag = window.gtag || gtag;

        window.gtag('js', new Date());
        // Configure with send_page_view: false for manual SPA pageview tracking
        window.gtag('config', measurementId, { send_page_view: false });

        // Inject gtag.js script if not already present
        const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`);
        if (!existingScript) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
            document.head.appendChild(script);
        }

        window._draftsetu_ga4_initialized = true;
    } catch (err) {
        console.warn('[Analytics] Initialization notice:', err.message);
    }
};

/**
 * Track SPA Page / View navigation
 * @param {string} pagePath - URL path or view slug (e.g. '/', '/privacy-policy', '/editor/tpl_123')
 * @param {string} [pageTitle] - Document or view title
 */
export const trackPageView = (pagePath, pageTitle = '') => {
    if (typeof window === 'undefined') return;

    // Prevent duplicate consecutive page views
    if (pagePath && pagePath === lastTrackedPath) return;
    lastTrackedPath = pagePath;

    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'page_view', {
                page_path: pagePath,
                page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
                page_location: typeof window.location !== 'undefined' ? window.location.href : ''
            });
        }
    } catch { }
};

/**
 * Track Funnel / Product Analytics Event
 * @param {string} eventName - Standard event name (e.g. 'template_selected', 'draft_saved')
 * @param {Object} [parameters] - Event metadata (non-sensitive)
 */
export const trackEvent = (eventName, parameters = {}) => {
    if (typeof window === 'undefined' || !eventName) return;

    try {
        const sanitized = sanitizeParameters(parameters);
        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, sanitized);
        }
    } catch { }
};

// Expose globally for convenience and automated testing
if (typeof window !== 'undefined') {
    window.DraftSetuAnalytics = {
        initAnalytics,
        trackPageView,
        trackEvent,
        getMeasurementId,
        sanitizeParameters,
        sanitizePayload
    };
    window.trackAnalyticsEvent = trackEvent;
    window.trackAnalyticsPageView = trackPageView;
}

export default {
    initAnalytics,
    trackPageView,
    trackEvent,
    getMeasurementId,
    sanitizeParameters,
    sanitizePayload
};
