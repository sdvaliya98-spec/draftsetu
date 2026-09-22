import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import GovHeader from './src/components/GovHeader.jsx';
import UserMenu from './src/components/UserMenu.jsx';
import AuthModal from './src/components/AuthModal.jsx';
import HomePage from './src/pages/HomePage.jsx';
import StaticPageView from './src/pages/StaticPageView.jsx';
import PrivacyPolicyPage from './src/pages/PrivacyPolicyPage.jsx';
import TermsOfServicePage from './src/pages/TermsOfServicePage.jsx';
import TemplateLandingPage from './src/pages/TemplateLandingPage.jsx';
import { trackPageView, trackEvent } from './src/utils/analytics.js';
import { getTemplateSlug, findTemplateBySlug } from './src/utils/slugUtils.js';

// ─── Global API Configuration and Helpers ───

const getErrorMessage = async (res) => {
    try {
        const data = await res.json();
        return data.detail || `Server error (${res.status})`;
    } catch {
        return `Server error (${res.status}) - Could not parse JSON response.`;
    }
};

// --- Main App Component ---

const DEFAULT_INITIAL_DATA = {
    village: 'કોઠ',
    amount: '4500000',
    amount_in_words: '',
    survey_no: '૪૪૪',
    area: '૧-૫૦-૩૬',
    buyer_name: 'ઘનશ્યામસિંહ ભૂરુભા પરમાર',
    buyer_address: 'દાયમાં ફળી, ગાંગડ તા.બાવળા જી.અમદાવાદ-૩૮૨૨૪૦',
    buyer_pan: 'FFFP8792M',
    seller_name: 'વિઠ્ઠલ ભાઈ રામજીભાઈ સોલંકી',
    seller_address: 'વણકર વાસ, કોઠ, તા.ધોળકા-૩૮૨૨૪૦',
    seller_pan: 'XXXXX'
};

const getTemplateEmptyState = (template, useDefaultInitial = false) => {
    if (!template) return {};
    const vars = template.variables || template.fieldOrder || [];
    const fieldsConfig = template.fields || {};
    const emptyState = {};

    const fillValue = (v) => {
        if (useDefaultInitial && v in DEFAULT_INITIAL_DATA) {
            return DEFAULT_INITIAL_DATA[v];
        }
        const fieldCfg = fieldsConfig[v] || {};
        return fieldCfg.default !== undefined ? fieldCfg.default : '';
    };

    if (typeof vars === 'object' && !Array.isArray(vars)) {
        if (vars.groups) {
            Object.keys(vars.groups).forEach(groupName => {
                emptyState[groupName] = [];
            });
        }
        if (vars.single_variables) {
            vars.single_variables.forEach(v => {
                emptyState[v] = fillValue(v);
            });
        }
    } else if (Array.isArray(vars)) {
        vars.forEach(v => {
            if (v.startsWith('#')) {
                emptyState[v.slice(1)] = [];
            } else if (!v.startsWith('/')) {
                emptyState[v] = fillValue(v);
            }
        });
    }

    return emptyState;
};

const LazyFallback = () => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200]">
        <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100 animate-pulse">
            <span className="inline-block animate-spin text-lg">⏳</span>
            <span className="text-sm font-bold text-slate-700 font-gujarati">લોડ થઈ રહ્યું છે...</span>
        </div>
    </div>
);

const LazyAdminPanel = React.lazy(() => import('./src/components/AdminPanel.jsx'));
const LazyWalletDashboard = React.lazy(() => import('./src/components/WalletDashboard.jsx'));
const LazyTemplateEditorModal = React.lazy(() => import('./src/components/TemplateEditorModal.jsx'));
const LazyMyDocumentsModal = React.lazy(() => import('./src/components/MyDocumentsModal.jsx'));
const LazyDocumentServicesPanel = React.lazy(() => import('./src/components/DocumentServicesPanel.jsx'));
const LazyFormPanel = React.lazy(() => import('./src/components/FormPanel.jsx'));
const LazyDocumentPreview = React.lazy(() => import('./src/components/DocumentPreview.jsx'));
const LazyUserProfileModal = React.lazy(() => import('./src/components/UserProfileModal.jsx'));
import { CustomDialogContainer, showConfirmDialog, showAlertDialog } from './src/components/CustomDialog.jsx';

const App = () => {
    const isInitialLoadRef = useRef(true);
    const skipRecoveryRef = useRef(false);
    const viewHistoryRef = useRef([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [currentView, setCurrentView] = useState(() => {
        try {
            const path = window.location.pathname.toLowerCase();
            if (path === '/privacy-policy' || path === '/privacy-policy/') return 'privacy-policy';
            if (path === '/terms-of-service' || path === '/terms-of-service/') return 'terms-of-service';
            if (path === '/non-agricultural' || path === '/non-agricultural/') return 'page';
            if (path.startsWith('/templates/')) {
                const slug = path.slice(11).trim().replace(/\/+$/, '');
                if (slug) return 'template-landing';
            }
            if (path.startsWith('/page:')) {
                const slug = path.slice(6).trim();
                if (slug) return 'page';
            }
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('view') === 'editor' || searchParams.get('template')) return 'editor';
            const pageParam = searchParams.get('page');
            if (pageParam && pageParam.trim()) return 'page';
            const tplParam = searchParams.get('template_slug');
            if (tplParam && tplParam.trim()) return 'template-landing';

            const storedView = localStorage.getItem('currentView');
            if (storedView === 'editor') {
                return 'editor';
            } else if (storedView) {
                localStorage.removeItem('currentView');
            }
        } catch { }
        return 'home';
    }); // 'home' | 'editor' | 'page' | 'privacy-policy' | 'terms-of-service' | 'template-landing'
    const [editingTemplate, setEditingTemplate] = useState(null); // null = closed, object = being edited
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [currentPageSlug, setCurrentPageSlug] = useState(() => {
        try {
            const path = window.location.pathname;
            const lowerPath = path.toLowerCase();
            if (lowerPath === '/non-agricultural' || lowerPath === '/non-agricultural/') {
                return 'non-agricultural';
            }
            if (lowerPath.startsWith('/page:')) {
                const slug = path.slice(6).trim();
                if (slug) return slug;
            }
            const searchParams = new URLSearchParams(window.location.search);
            const pageParam = searchParams.get('page');
            if (pageParam && pageParam.trim()) return pageParam.trim();
        } catch { }
        return '';
    });
    const [currentTemplateSlug, setCurrentTemplateSlug] = useState(() => {
        try {
            const path = window.location.pathname;
            if (path.toLowerCase().startsWith('/templates/')) {
                const slug = path.slice(11).trim().replace(/\/+$/, '');
                if (slug) return slug;
            }
            const searchParams = new URLSearchParams(window.location.search);
            const tplParam = searchParams.get('template_slug');
            if (tplParam && tplParam.trim()) return tplParam.trim();
        } catch { }
        return '';
    });
    const [templates, setTemplates] = useState([]);
    const [activeTemplateId, setActiveTemplateId] = useState(() => {
        try {
            const searchParams = new URLSearchParams(window.location.search);
            return searchParams.get('template') || localStorage.getItem('activeTemplateId') || '';
        } catch { }
        return '';
    });
    const [role, setRole] = useState(() => localStorage.getItem('appRole') || 'user');
    const [isViewingDrafts, setIsViewingDrafts] = useState(false);
    const [authModalContext, setAuthModalContext] = useState(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return !!(params.get('reset_token') || params.get('token'));
        } catch {
            return false;
        }
    });
    window.openAuthModal = (context = null) => {
        setAuthModalContext(context || null);
        setIsAuthModalOpen(true);
    };

    const [isAuthHydrated, setIsAuthHydrated] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('currentUser') || null);
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || null);
    const [isAdminUser, setIsAdminUser] = useState(() => localStorage.getItem('isAdminUser') === 'true');
    const user = useMemo(() => {
        if (!currentUser) return null;
        return {
            username: currentUser,
            is_admin: isAdminUser
        };
    }, [currentUser, isAdminUser]);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(() => localStorage.getItem('isAdminPanelOpen') === 'true');
    const [adminPanelTab, setAdminPanelTab] = useState(() => localStorage.getItem('adminPanelTab') || 'templates');
    const [userCredits, setUserCredits] = useState(null);
    const [isViewingWallet, setIsViewingWallet] = useState(false);
    const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(true);
    const [menuItems, setMenuItems] = useState([]);
    const [dbTpls, setDbTpls] = useState([]);
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [templateLoadError, setTemplateLoadError] = useState(null);
    const [isDocServicesPanelOpen, setIsDocServicesPanelOpen] = useState(false);

    // Centralized Session Expiry Event Listener
    useEffect(() => {
        const onSessionExpired = () => {
            setCurrentUser(null);
            setAuthToken(null);
            setIsAdminUser(false);
            setRole('user');
            setIsAdminPanelOpen(false);
            setIsViewingWallet(false);
            setIsUserProfileOpen(false);
            setIsViewingDrafts(false);
            setUserCredits(null);
            setIsAuthHydrated(true);
        };

        window.addEventListener('draftsetu:session-expired', onSessionExpired);
        return () => {
            window.removeEventListener('draftsetu:session-expired', onSessionExpired);
        };
    }, []);

    // Global Auth Hydration on startup
    useEffect(() => {
        let isMounted = true;
        const hydrateAuth = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                if (isMounted) {
                    setIsAuthHydrated(true);
                }
                return;
            }

            try {
                const res = await window.apiFetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const userData = await res.json();

                if (userData && isMounted) {
                    const verifiedUsername = userData.username || localStorage.getItem('currentUser');
                    const verifiedIsAdmin = Boolean(userData.is_admin);
                    setCurrentUser(verifiedUsername);
                    setIsAdminUser(verifiedIsAdmin);
                    localStorage.setItem('currentUser', verifiedUsername);
                    localStorage.setItem('isAdminUser', String(verifiedIsAdmin));

                    if (verifiedIsAdmin) {
                        const savedRole = localStorage.getItem('appRole');
                        const targetRole = (savedRole === 'admin' || savedRole === 'user') ? savedRole : 'admin';
                        setRole(targetRole);
                        localStorage.setItem('appRole', targetRole);
                    } else {
                        setRole('user');
                        localStorage.setItem('appRole', 'user');
                    }
                }
            } catch (err) {
                console.warn("Auth hydration verification notice:", err);
                if (err.status === 401 || err.status === 403 || err.isSessionExpired) {
                    if (isMounted) {
                        setCurrentUser(null);
                        setAuthToken(null);
                        setIsAdminUser(false);
                        setRole('user');
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('isAdminUser');
                        localStorage.setItem('appRole', 'user');
                    }
                }
            } finally {
                if (isMounted) {
                    setIsAuthHydrated(true);
                }
            }
        };

        hydrateAuth();
        return () => {
            isMounted = false;
        };
    }, []);

    const isFetchingTemplatesRef = useRef(false);
    const refreshTemplates = async () => {
        if (isDownloading) return;
        if (isFetchingTemplatesRef.current) return;
        isFetchingTemplatesRef.current = true;
        setIsTemplatesLoading(true);
        setTemplateLoadError(null);
        try {
            const res = await window.apiFetch('/api/templates/');
            const rawData = await res.json();
            const data = rawData.map(t => {
                let fields = t.fields;
                if (!fields && t.fields_json) {
                    try { fields = JSON.parse(t.fields_json); } catch (e) { fields = {}; }
                }
                let fieldOrder = t.fieldOrder;
                if (!fieldOrder && t.field_order_json) {
                    try { fieldOrder = JSON.parse(t.field_order_json); } catch (e) { fieldOrder = []; }
                }
                let variables = t.variables || fieldOrder || [];
                return { ...t, fields: fields || {}, fieldOrder: fieldOrder || [], variables };
            });
            setDbTpls(data);
        }
        catch (err) {
            console.error("❌ [App] refreshTemplates failed:", err);
            setDbTpls([]);
            setTemplateLoadError(
                err.message === 'SERVER_OFFLINE'
                    ? 'સર્વર ઓફલાઈન છે. કૃપા કરીને તપાસો કે બેકએન્ડ ચાલુ છે (Server is offline. Please check if the backend is running).'
                    : `ટેમ્પલેટ્સ લોડ કરવામાં અસમર્થ: ${err.message || 'અજ્ઞાત ભૂલ'}`
            );
        } finally {
            setIsTemplatesLoading(false);
            isFetchingTemplatesRef.current = false;
        }
    };

    // Fetch user-facing menu from backend
    const refreshMenu = () => {
        if (isDownloading) return;
        window.apiFetch('/api/menu/')
            .then(r => r.json())
            .then(data => {
                // Ensure "My Documents" is always at the top for easy access
                const myDocsItem = {
                    id: 'internal-my-docs',
                    label: 'મારું દસ્તાવેજ ફોલ્ડર (My Documents)',
                    url: 'documents',
                    icon: '📂',
                    children: []
                };

                // Avoid duplicates if already in DB
                const filteredData = Array.isArray(data) ? data.filter(item => item.url !== 'documents') : [];
                setMenuItems([myDocsItem, ...filteredData]);
            })
            .catch(err => {
                console.error("❌ [App] refreshMenu failed:", err);
                // Even if backend fails, show My Documents
                setMenuItems([{
                    id: 'internal-my-docs',
                    label: 'મારું દસ્તાવેજ ફોલ્ડર (My Documents)',
                    url: 'documents',
                    icon: '📂',
                    children: []
                }]);
            });
    };

    useEffect(() => {
        if (isDownloading) return;
        refreshMenu();
        // Background-load templates after a small delay to prioritize initial view render
        const timer = setTimeout(() => {
            refreshTemplates();
        }, 100);
        return () => clearTimeout(timer);
    }, [isDownloading]);

    useEffect(() => {
        if (typeof window.hideSplashScreen === 'function') {
            window.hideSplashScreen();
        }
    }, []);

    const refreshCredits = async () => {
        if (!currentUser || !authToken) {
            setUserCredits(null);
            return;
        }
        try {
            const res = await window.apiFetch('/api/wallet/balance', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const creditData = await res.json();
                setUserCredits(creditData.balance);
            }
        } catch (e) {
            console.error("Failed to refresh credits:", e);
        }
    };

    useEffect(() => {
        refreshCredits();
    }, [currentUser, authToken]);

    // SPA Analytics Page View Tracking
    useEffect(() => {
        let path = '/';
        if (currentView === 'privacy-policy') path = '/privacy-policy';
        else if (currentView === 'terms-of-service') path = '/terms-of-service';
        else if (currentView === 'page' && currentPageSlug === 'non-agricultural') path = '/non-agricultural';
        else if (currentView === 'page' && currentPageSlug) path = `/page:${currentPageSlug}`;
        else if (currentView === 'template-landing' && currentTemplateSlug) path = `/templates/${currentTemplateSlug}`;
        else if (currentView === 'editor') path = activeTemplateId ? `/editor?template=${activeTemplateId}` : '/editor';
        else path = '/';

        trackPageView(path);
    }, [currentView, currentPageSlug, currentTemplateSlug, activeTemplateId]);


    // Flat dictionary for all dynamic data inputs
    const [data, setData] = useState(DEFAULT_INITIAL_DATA);

    // Stability and Polish States
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [draftError, setDraftError] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    let handleTemplateSelect;
    let loadTemplate;

    const [isLocked, setIsLocked] = useState(false);
    const [trackingId, setTrackingId] = useState(null);
    const [currentDocument, setCurrentDocument] = useState(null);
    const saveDebounceRef = useRef(null);

    const normalizeDates = (inputData) => {
        if (!inputData) return inputData;
        const normalized = { ...inputData };
        const toISO = (val) => {
            if (typeof val === 'string') {
                const trimmed = val.trim();
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
                    const parts = trimmed.split("/");
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            return val;
        };

        Object.keys(normalized).forEach(key => {
            const lowerKey = key.toLowerCase();
            const val = normalized[key];

            if (Array.isArray(val)) {
                normalized[key] = val.map(item => {
                    if (item && typeof item === 'object') {
                        const newItem = { ...item };
                        Object.keys(newItem).forEach(subKey => {
                            const lowerSubKey = subKey.toLowerCase();
                            if (lowerSubKey.includes('date') || lowerSubKey.includes('dob')) {
                                newItem[subKey] = toISO(newItem[subKey]);
                            }
                        });
                        return newItem;
                    }
                    return item;
                });
            } else if (lowerKey.includes('date') || lowerKey.includes('dob')) {
                normalized[key] = toISO(val);
            }
        });
        return normalized;
    };

    const showDocumentLimitDialog = async () => {
        const shouldOpenMyDocs = await showConfirmDialog({
            title: '10-Document Limit Reached',
            message: 'તમારા accountમાં maximum 10 saved documents રાખી શકાય છે.\n\nનવું document save કરવા માટે પહેલા My Documents માંથી કોઈ એક જૂનું document delete કરો.',
            confirmText: 'My Documents',
            cancelText: 'OK',
            type: 'warning',
            icon: '⚠️'
        });
        if (shouldOpenMyDocs) {
            setIsViewingDrafts(true);
        }
    };

    const handleNewDocument = (targetTemplateId = activeTemplateId) => {
        const tId = targetTemplateId || activeTemplateId;
        if (!tId) return;

        // Clear in-memory session & local recovery cache for this template
        if (window.SessionManager) {
            window.SessionManager.clearSession(tId);
        }
        if (window.DraftCacheManager) {
            window.DraftCacheManager.clear(tId, currentUser);
        } else {
            localStorage.removeItem(`temp_draft_${tId}`);
            localStorage.removeItem(`temp_tracking_id_${tId}`);
            localStorage.removeItem(`temp_locked_${tId}`);
        }

        const activeTemplate = allTemplates.find(t => t.id === tId);
        const emptyState = getTemplateEmptyState(activeTemplate, false);

        setData(emptyState);
        setTrackingId(null);
        setIsLocked(false);
        setDraftError(null);

        if (window.SessionManager) {
            window.SessionManager.saveSession(tId, { data: emptyState, trackingId: null, isLocked: false });
        }

        showToast("નવા દસ્તાવેજ માટે ફોર્મ તૈયાર છે (Ready for new document)", "info");
    };

    const handleSaveDraft = async () => {
        if (!currentUser) {
            setIsAuthModalOpen(true);
            return;
        }
        if (isSavingDraft) return;
        setIsSavingDraft(true);
        setDraftError(null);
        const targetTemplateId = activeTemplateId;
        try {
            // Frontend limit verification
            if (!trackingId) {
                try {
                    const countRes = await window.apiFetch('/api/documents/');
                    if (countRes.ok) {
                        const docs = await countRes.json();
                        const headerLimit = countRes.headers.get('X-Document-Limit');
                        let effectiveLimit = null;
                        if (headerLimit) {
                            if (headerLimit.toLowerCase() !== 'unlimited' && headerLimit !== 'null' && headerLimit !== 'none') {
                                const parsed = parseInt(headerLimit, 10);
                                if (!isNaN(parsed) && parsed > 0) effectiveLimit = parsed;
                            }
                        } else if (currentUser && typeof currentUser === 'object' && currentUser.document_limit !== undefined) {
                            effectiveLimit = currentUser.document_limit;
                        }
                        if (effectiveLimit !== null && docs.length >= effectiveLimit) {
                            if (activeTemplateId === targetTemplateId) {
                                const limitMsg = `Maximum ${effectiveLimit} saved documents allowed. Please delete old documents before saving new ones.`;
                                setDraftError(limitMsg);
                                showToast(limitMsg, "error");
                                showDocumentLimitDialog();
                            }
                            setIsSavingDraft(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn("Could not pre-verify document count", e);
                }
            }

            const path = trackingId ? `/api/documents/${trackingId}` : '/api/documents/draft';
            const method = trackingId ? 'PUT' : 'POST';

            const normalizedData = normalizeDates(data);
            const response = await window.apiFetch(path, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    ...normalizedData,
                    survey_no: normalizedData.survey_no || '',
                    buyer_name: normalizedData.buyer_name || '',
                    amount: normalizedData.amount || '',
                    template_id: targetTemplateId,
                    is_final: false
                })
            });
            const resData = await response.json();
            if (response.ok) {
                if (activeTemplateId !== targetTemplateId) return;

                // Clear any pending debounce saves
                if (saveDebounceRef.current) {
                    clearTimeout(saveDebounceRef.current);
                    saveDebounceRef.current = null;
                }

                const savedTrackingId = resData.tracking_id || trackingId;
                setTrackingId(savedTrackingId);
                setIsLocked(false);

                // Update session in SessionManager
                if (window.SessionManager) {
                    window.SessionManager.saveSession(targetTemplateId, {
                        data: normalizedData,
                        trackingId: savedTrackingId,
                        isLocked: false
                    });
                }

                // Update cache in DraftCacheManager
                if (window.DraftCacheManager) {
                    window.DraftCacheManager.save(targetTemplateId, normalizedData, savedTrackingId, false, currentUser);
                }

                trackEvent('draft_saved', { template_id: targetTemplateId, tracking_id: savedTrackingId });
                showToast("ડ્રાફ્ટ સફળતાપૂર્વક સેવ થયું (Draft saved to My Documents)", "success");
            } else {
                throw new Error(resData.detail || `Server status ${response.status}`);
            }
        } catch (err) {
            if (activeTemplateId !== targetTemplateId) return;
            console.error('❌ [Save Draft Error]', err);
            const msg = err.message === 'SERVER_OFFLINE'
                ? 'સર્વર અક્ષમ છે. કૃપા કરીને તપાસો કે બેકએન્ડ ચાલુ છે (Server unreachable. Check backend connection).'
                : (err.message || 'ડ્રાફ્ટ સેવ કરવામાં નિષ્ફળતા (Failed to save draft).');
            setDraftError(msg);
            showToast("ડ્રાફ્ટ સેવ કરવામાં ભૂલ આવી", "error");
            if (typeof msg === 'string' && msg.toLowerCase().includes('maximum') && msg.toLowerCase().includes('saved documents allowed')) {
                showDocumentLimitDialog();
            }
        } finally {
            if (activeTemplateId === targetTemplateId) {
                setIsSavingDraft(false);
            }
        }
    };

    const handleFinalSubmit = async () => {
        if (!currentUser) {
            setIsAuthModalOpen(true);
            return;
        }
        if (!trackingId) {
            await showAlertDialog({
                title: 'ડ્રાફ્ટ સેવ કરવો જરૂરી છે (Draft Required)',
                message: 'કૃપા કરીને ફાઈનલ લોક કરતાં પહેલાં દસ્તાવેજને ડ્રાફ્ટ તરીકે સેવ કરો.\n\nPlease save the document as a draft before final locking.',
                type: 'warning',
                icon: '📝'
            });
            return;
        }
        const confirmSubmit = await showConfirmDialog({
            title: 'દસ્તાવેજ ફાઇનલ લોક કરો (Final Lock Document)',
            message: 'શું તમે આ દસ્તાવેજને ફાઇનલ લોક કરવા માંગો છો? એકવાર લોક થયા પછી તમે તેમાં કોઈપણ ફેરફાર કરી શકશો નહીં.\n\nAre you sure you want to finalize and lock this document? Once locked, you will not be able to edit it.',
            confirmText: 'હા, ફાઇનલ લોક કરો (Final Lock)',
            cancelText: 'રદ કરો (Cancel)',
            type: 'warning',
            icon: '🔒'
        });
        if (confirmSubmit) {
            setDraftError(null);
            setIsFinalizing(true);
            const targetTemplateId = activeTemplateId;
            try {
                // Frontend limit verification
                try {
                    const countRes = await window.apiFetch('/api/documents/');
                    if (countRes.ok) {
                        const docs = await countRes.json();
                        const isNew = !docs.some(d => d.tracking_id === trackingId);
                        const headerLimit = countRes.headers.get('X-Document-Limit');
                        let effectiveLimit = null;
                        if (headerLimit) {
                            if (headerLimit.toLowerCase() !== 'unlimited' && headerLimit !== 'null' && headerLimit !== 'none') {
                                const parsed = parseInt(headerLimit, 10);
                                if (!isNaN(parsed) && parsed > 0) effectiveLimit = parsed;
                            }
                        } else if (currentUser && typeof currentUser === 'object' && currentUser.document_limit !== undefined) {
                            effectiveLimit = currentUser.document_limit;
                        }
                        if (isNew && effectiveLimit !== null && docs.length >= effectiveLimit) {
                            if (activeTemplateId === targetTemplateId) {
                                const limitMsg = `Maximum ${effectiveLimit} saved documents allowed. Please delete old documents before saving new ones.`;
                                setDraftError(limitMsg);
                                showToast(limitMsg, "error");
                                showDocumentLimitDialog();
                            }
                            setIsFinalizing(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn("Could not pre-verify document count", e);
                }

                trackEvent('document_final_lock_attempt', {
                    template_id: targetTemplateId,
                    authenticated: Boolean(currentUser)
                });

                const normalizedData = normalizeDates(data);
                const response = await window.apiFetch(`/api/documents/${trackingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        ...normalizedData,
                        survey_no: normalizedData.survey_no || '',
                        buyer_name: normalizedData.buyer_name || '',
                        amount: normalizedData.amount || '',
                        template_id: targetTemplateId,
                        is_final: true
                    })
                });
                const resData = await response.json();
                if (response.ok) {
                    if (activeTemplateId !== targetTemplateId) return;

                    // Clear session in SessionManager
                    window.SessionManager.clearSession(targetTemplateId);

                    // Clear cache
                    if (window.DraftCacheManager) {
                        window.DraftCacheManager.clear(targetTemplateId, currentUser);
                    } else {
                        localStorage.removeItem(`temp_draft_${targetTemplateId}`);
                        localStorage.removeItem(`temp_tracking_id_${targetTemplateId}`);
                        localStorage.removeItem(`temp_locked_${targetTemplateId}`);
                    }

                    // Reinitialize template to fresh empty state
                    const activeTemplate = allTemplates.find(t => t.id === targetTemplateId);
                    const emptyState = getTemplateEmptyState(activeTemplate, false);
                    setData(emptyState);
                    setTrackingId(null);
                    setIsLocked(false);

                    trackEvent('document_final_locked', { template_id: targetTemplateId });
                    showToast("Document finalized successfully! View and download it from My Documents.", "success");
                    refreshCredits();
                } else {
                    throw new Error(resData.detail || `Server status ${response.status}`);
                }
            } catch (err) {
                if (activeTemplateId !== targetTemplateId) return;
                console.error('❌ [Upload Error]', err);
                const msg = err.message === 'SERVER_OFFLINE'
                    ? 'સર્વર અક્ષમ છે. કૃપા કરીને તપાસો કે બેકએન્ડ ચાલુ છે (Server unreachable).'
                    : (err.message || 'દસ્તાવેજ લોક કરવામાં નિષ્ફળતા (Failed to lock document).');
                setDraftError(msg);
                showToast("દસ્તાવેજ લોક કરવામાં ભૂલ આવી", "error");
                if (typeof msg === 'string' && msg.toLowerCase().includes('maximum') && msg.toLowerCase().includes('saved documents allowed')) {
                    showDocumentLimitDialog();
                }
            } finally {
                if (activeTemplateId === targetTemplateId) {
                    setIsFinalizing(false);
                }
            }
        }
    };

    // Synchronize browser URL on popstate (Back / Forward buttons)
    useEffect(() => {
        const handlePopState = (event) => {
            const state = event && event.state;
            if (state && state.view) {
                if (state.view === 'privacy-policy') {
                    setCurrentView('privacy-policy');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug('');
                } else if (state.view === 'terms-of-service') {
                    setCurrentView('terms-of-service');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug('');
                } else if (state.view === 'page' && state.slug) {
                    setCurrentView('page');
                    setCurrentPageSlug(state.slug);
                    setCurrentTemplateSlug('');
                } else if (state.view === 'template-landing' && state.templateSlug) {
                    setCurrentView('template-landing');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug(state.templateSlug);
                } else if (state.view === 'editor') {
                    setCurrentView('editor');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug('');
                    if (state.templateId) {
                        setActiveTemplateId(state.templateId);
                        if (typeof loadTemplate === 'function') loadTemplate(state.templateId);
                    }
                } else {
                    setCurrentView('home');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug('');
                }
                return;
            }

            const path = window.location.pathname.toLowerCase();
            if (path === '/privacy-policy' || path === '/privacy-policy/') {
                setCurrentView('privacy-policy');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
            } else if (path === '/terms-of-service' || path === '/terms-of-service/') {
                setCurrentView('terms-of-service');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
            } else if (path === '/non-agricultural' || path === '/non-agricultural/') {
                setCurrentView('page');
                setCurrentPageSlug('non-agricultural');
                setCurrentTemplateSlug('');
            } else if (path.startsWith('/templates/')) {
                setCurrentView('template-landing');
                setCurrentPageSlug('');
                setCurrentTemplateSlug(window.location.pathname.slice(11).trim().replace(/\/+$/, ''));
            } else if (path.startsWith('/page:')) {
                setCurrentView('page');
                setCurrentPageSlug(window.location.pathname.slice(6).trim());
                setCurrentTemplateSlug('');
            } else {
                const searchParams = new URLSearchParams(window.location.search);
                const pageParam = searchParams.get('page');
                const tplParam = searchParams.get('template_slug');
                if (pageParam) {
                    setCurrentView('page');
                    setCurrentPageSlug(pageParam);
                    setCurrentTemplateSlug('');
                } else if (tplParam) {
                    setCurrentView('template-landing');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug(tplParam);
                } else {
                    setCurrentView('home');
                    setCurrentPageSlug('');
                    setCurrentTemplateSlug('');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const handleNavigate = (urlOrMenu) => {
        if (!urlOrMenu) return;

        let url = urlOrMenu;
        let menuTemplateId = null;

        if (typeof urlOrMenu === 'object' && urlOrMenu !== null) {
            const menu = urlOrMenu;
            if (menu.type === 'document_services_panel') {
                setIsDocServicesPanelOpen(true);
                return;
            }
            if (menu.type === 'template') {
                url = 'editor';
                menuTemplateId = menu.template_id;
            } else {
                url = menu.url;
            }
        }

        if (!url || url === '#') return;

        // Modals (Do not change view or push history)
        if (url === 'documents') {
            if (!currentUser || !authToken) {
                setAuthModalContext({
                    reason: 'my_documents',
                    title: 'મારા દસ્તાવેજો જોવા માટે Login કરો',
                    message: 'તમારા સાચવેલા ડ્રાફ્ટ્સ અને દસ્તાવેજો ઍક્સેસ કરવા માટે કૃપા કરીને તમારા DraftSetu એકાઉન્ટમાં Login / Register કરો.',
                    postLoginAction: 'open_my_docs'
                });
                setIsAuthModalOpen(true);
                return;
            }
            setIsViewingDrafts(true);
            return;
        }
        if (url === 'wallet') {
            setIsViewingWallet(true);
            return;
        }
        if (url === 'profile') {
            setIsUserProfileOpen(true);
            return;
        }

        // External URLs
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
            window.open(url, '_blank');
            return;
        }

        // --- BACK NAVIGATION (Pop exactly 1 previous view) ---
        if (url === 'back' || url === '/back') {
            if (viewHistoryRef.current.length === 0) {
                // Stack empty -> graceful fallback to Home
                setCurrentView('home');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
                if (window.location.pathname !== '/') {
                    window.history.pushState({ view: 'home' }, '', '/');
                }
                window.scrollTo({ top: 0, behavior: 'instant' });
                return;
            }

            const target = viewHistoryRef.current.pop();
            if (!target) {
                setCurrentView('home');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
                if (window.location.pathname !== '/') {
                    window.history.pushState({ view: 'home' }, '', '/');
                }
                window.scrollTo({ top: 0, behavior: 'instant' });
                return;
            }

            // Restore target view
            if (target.view === 'editor') {
                setCurrentView('editor');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
                if (target.templateId) {
                    setActiveTemplateId(target.templateId);
                    if (typeof loadTemplate === 'function') loadTemplate(target.templateId);
                }
                if (window.location.pathname !== '/') {
                    window.history.pushState({ view: 'editor', templateId: target.templateId }, '', '/');
                }
            } else if (target.view === 'template-landing' && target.templateSlug) {
                setCurrentView('template-landing');
                setCurrentPageSlug('');
                setCurrentTemplateSlug(target.templateSlug);
                if (window.location.pathname !== `/templates/${target.templateSlug}`) {
                    window.history.pushState({ view: 'template-landing', templateSlug: target.templateSlug }, '', `/templates/${target.templateSlug}`);
                }
            } else if (target.view === 'page' && target.slug) {
                setCurrentView('page');
                setCurrentPageSlug(target.slug);
                setCurrentTemplateSlug('');
                const targetUrl = target.slug === 'non-agricultural' ? '/non-agricultural' : '/';
                if (window.location.pathname !== targetUrl) {
                    window.history.pushState({ view: 'page', slug: target.slug }, '', targetUrl);
                }
            } else if (target.view === 'privacy-policy') {
                setCurrentView('privacy-policy');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
                if (window.location.pathname !== '/privacy-policy') {
                    window.history.pushState({ view: 'privacy-policy' }, '', '/privacy-policy');
                }
            } else if (target.view === 'terms-of-service') {
                setCurrentView('terms-of-service');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
                if (window.location.pathname !== '/terms-of-service') {
                    window.history.pushState({ view: 'terms-of-service' }, '', '/terms-of-service');
                }
            } else {
                // target is home
                setCurrentView('home');
                setCurrentPageSlug('');
                setCurrentTemplateSlug('');
                if (window.location.pathname !== '/') {
                    window.history.pushState({ view: 'home' }, '', '/');
                }
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        // Explicit Home Navigation -> reset stack to root
        if (url === 'home' || url === '/') {
            viewHistoryRef.current = [];
            setCurrentView('home');
            setCurrentPageSlug('');
            setCurrentTemplateSlug('');
            if (window.location.pathname !== '/') {
                window.history.pushState({ view: 'home' }, '', '/');
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        // --- FORWARD NAVIGATION ---
        // Push current view snapshot before transitioning
        const currentSnapshot = {
            view: currentView,
            slug: currentPageSlug,
            templateSlug: currentTemplateSlug,
            templateId: activeTemplateId || ''
        };
        viewHistoryRef.current.push(currentSnapshot);
        if (viewHistoryRef.current.length > 50) {
            viewHistoryRef.current.shift();
        }

        if (url === '/non-agricultural' || url === 'non-agricultural' || url === 'page:non-agricultural' || url === '/page:non-agricultural') {
            setCurrentView('page');
            setCurrentPageSlug('non-agricultural');
            setCurrentTemplateSlug('');
            if (window.location.pathname !== '/non-agricultural') {
                window.history.pushState({ view: 'page', slug: 'non-agricultural' }, '', '/non-agricultural');
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        if (url === '/privacy-policy' || url === 'privacy-policy') {
            setCurrentView('privacy-policy');
            setCurrentPageSlug('');
            setCurrentTemplateSlug('');
            if (window.location.pathname !== '/privacy-policy') {
                window.history.pushState({ view: 'privacy-policy' }, '', '/privacy-policy');
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        if (url === '/terms-of-service' || url === 'terms-of-service') {
            setCurrentView('terms-of-service');
            setCurrentPageSlug('');
            setCurrentTemplateSlug('');
            if (window.location.pathname !== '/terms-of-service') {
                window.history.pushState({ view: 'terms-of-service' }, '', '/terms-of-service');
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        if (url.startsWith('templates/') || url.startsWith('/templates/')) {
            const raw = url.startsWith('/') ? url.slice(1) : url;
            const slug = raw.slice(10).trim().replace(/\/+$/, '');
            setCurrentView('template-landing');
            setCurrentPageSlug('');
            setCurrentTemplateSlug(slug);
            if (window.location.pathname !== `/templates/${slug}`) {
                window.history.pushState({ view: 'template-landing', templateSlug: slug }, '', `/templates/${slug}`);
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        if (url.startsWith('editor')) {
            setCurrentView('editor');
            setCurrentPageSlug('');
            setCurrentTemplateSlug('');
            const match = url.match(/template=([^&]+)/);
            const templateId = menuTemplateId || (match && match[1] ? match[1] : activeTemplateId);
            if (window.location.pathname !== '/') {
                window.history.pushState({ view: 'editor', templateId }, '', '/');
            }
            if (templateId) {
                if (typeof loadTemplate === 'function') loadTemplate(templateId);
                else setActiveTemplateId(templateId);
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        if (url.startsWith('page:') || url.startsWith('/page:')) {
            const raw = url.startsWith('/') ? url.slice(1) : url;
            const slug = raw.slice(5).trim();
            setCurrentView('page');
            setCurrentPageSlug(slug);
            setCurrentTemplateSlug('');
            if (window.location.pathname !== '/') {
                window.history.pushState({ view: 'page', slug }, '', '/');
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        window.open(url, '_blank');
    };

    window.handleNavigate = handleNavigate;

    const printRef = useRef(null);

    useEffect(() => {
        try {
            if (currentView === 'editor') {
                localStorage.setItem('currentView', 'editor');
            } else {
                localStorage.removeItem('currentView');
            }
            // Always purge any stale slug keys
            localStorage.removeItem('currentPageSlug');
            localStorage.removeItem('currentTemplateSlug');
            localStorage.removeItem('pageSlug');
        } catch (e) { }
    }, [currentView]);

    useEffect(() => {
        try {
            // Clean up any legacy or stale navigation state keys from earlier versions
            if (localStorage.getItem('currentView') !== 'editor') {
                localStorage.removeItem('currentView');
            }
            localStorage.removeItem('currentPageSlug');
            localStorage.removeItem('currentTemplateSlug');
            localStorage.removeItem('pageSlug');
        } catch (e) { }

        const savedTemplates = localStorage.getItem('customTemplates');
        const savedRole = localStorage.getItem('appRole');
        if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { } }
        if (savedRole) { setRole(savedRole); }
        if (window.DraftCacheManager) {
            window.DraftCacheManager.purgeStaleDrafts();
        }
    }, []);

    // Template-specific draft recovery load with user confirmation dialog
    const isPromptingRecoveryRef = useRef(false);

    useEffect(() => {
        let active = true;
        if (isDownloading) return;
        if (!activeTemplateId) return;

        // Defer recovery check until the editor view is actually active!
        if (currentView !== 'editor') return;

        if (skipRecoveryRef.current) {
            skipRecoveryRef.current = false;
            return;
        }

        // Check if an in-memory session is already registered in SessionManager
        const existingSession = window.SessionManager ? window.SessionManager.restoreSession(activeTemplateId) : null;
        if (existingSession && window.DraftCacheManager && window.DraftCacheManager.isMeaningfulDraft(existingSession.data, getTemplateEmptyState(allTemplates.find(t => t.id === activeTemplateId), false))) {
            // Already actively working in memory for this session
            if (!active) return;
            setData(existingSession.data);
            setTrackingId(existingSession.trackingId || null);
            setIsLocked(Boolean(existingSession.isLocked));
            return;
        }

        const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
        const emptyState = getTemplateEmptyState(activeTemplate, isInitialLoadRef.current);
        isInitialLoadRef.current = false;

        const cachedDraft = window.DraftCacheManager ? window.DraftCacheManager.load(activeTemplateId, currentUser) : null;

        if (cachedDraft && !cachedDraft.isLocked && window.DraftCacheManager && window.DraftCacheManager.isMeaningfulDraft(cachedDraft.data, emptyState)) {
            // Safeguard B: Ensure cached template ID matches active template ID
            if (cachedDraft.templateId && cachedDraft.templateId !== activeTemplateId) {
                if (!active) return;
                setData(emptyState);
                setTrackingId(null);
                setIsLocked(false);
                window.SessionManager.saveSession(activeTemplateId, { data: emptyState, trackingId: null, isLocked: false });
                return;
            }

            const { data: cachedData, trackingId: cachedTrackId } = cachedDraft;

            // Scenario 1: Saved draft with trackingId -> Auto-restore from backend (source of truth)
            if (cachedTrackId && authToken) {
                (async () => {
                    try {
                        const res = await window.apiFetch(`/api/documents/${cachedTrackId}`, {
                            headers: { 'Authorization': `Bearer ${authToken}` }
                        });
                        if (!active) return;
                        if (res.ok) {
                            const docData = await res.json();
                            // Safeguard: Ensure document template matches active template
                            if (docData.template_id && docData.template_id !== activeTemplateId && docData.template_id !== '—') {
                                setData(emptyState);
                                setTrackingId(null);
                                setIsLocked(false);
                                return;
                            }
                            if (docData.is_locked) {
                                if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId, currentUser);
                                setTrackingId(docData.tracking_id);
                                setIsLocked(true);
                                try {
                                    const parsed = typeof docData.data_json === 'string' ? JSON.parse(docData.data_json) : (docData.data_json || {});
                                    setData(parsed);
                                    window.SessionManager.saveSession(activeTemplateId, { data: parsed, trackingId: docData.tracking_id, isLocked: true });
                                } catch (e) {
                                    setData(cachedData);
                                }
                                return;
                            }
                            try {
                                const parsed = typeof docData.data_json === 'string' ? JSON.parse(docData.data_json) : (docData.data_json || {});
                                setData(parsed);
                                setTrackingId(docData.tracking_id);
                                setIsLocked(false);
                                if (window.DraftCacheManager) window.DraftCacheManager.save(activeTemplateId, parsed, docData.tracking_id, false, currentUser);
                                window.SessionManager.saveSession(activeTemplateId, { data: parsed, trackingId: docData.tracking_id, isLocked: false });
                                showToast("ડ્રાફ્ટ સફળતાપૂર્વક પુનઃપ્રાપ્ત થયો (Draft restored)", "success");
                            } catch (e) {
                                console.error("❌ [App] Error parsing database draft JSON:", e);
                                setData(cachedData);
                                setTrackingId(docData.tracking_id);
                                setIsLocked(false);
                                window.SessionManager.saveSession(activeTemplateId, { data: cachedData, trackingId: docData.tracking_id, isLocked: false });
                                showToast("ડ્રાફ્ટ સફળતાપૂર્વક પુનઃપ્રાપ્ત થયો (Draft restored)", "success");
                            }
                        } else if (res.status === 404) {
                            // Saved draft was deleted from DB -> clean up stale local reference safely
                            if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId, currentUser);
                            if (window.SessionManager) window.SessionManager.clearSession(activeTemplateId);
                            setData(emptyState);
                            setTrackingId(null);
                            setIsLocked(false);
                        } else {
                            // Server error fallback
                            setData(cachedData);
                            setTrackingId(cachedTrackId);
                            setIsLocked(false);
                            window.SessionManager.saveSession(activeTemplateId, { data: cachedData, trackingId: cachedTrackId, isLocked: false });
                            showToast("ડ્રાફ્ટ સફળતાપૂર્વક પુનઃપ્રાપ્ત થયો (Draft restored)", "success");
                        }
                    } catch (err) {
                        if (!active) return;
                        console.error("❌ [App] Network exception during draft restore verification:", err);
                        setData(cachedData);
                        setTrackingId(cachedTrackId);
                        setIsLocked(false);
                        window.SessionManager.saveSession(activeTemplateId, { data: cachedData, trackingId: cachedTrackId, isLocked: false });
                        showToast("ડ્રાફ્ટ સફળતાપૂર્વક પુનઃપ્રાપ્ત થયો (Draft restored)", "success");
                    }
                })();
                return;
            }

            // Scenario 2: Truly unsaved local input (no trackingId) -> Prompt user
            if (isPromptingRecoveryRef.current) return;
            isPromptingRecoveryRef.current = true;

            trackEvent('draft_recovery_shown', { template_id: activeTemplateId });

            showConfirmDialog({
                title: 'Unsaved data found (અધૂરો ડેટા મળ્યો છે)',
                message: 'તમારો અગાઉનો અધૂરો ડેટા મળ્યો છે. શું તમે તેને restore કરવા માંગો છો?\n\nUnsaved draft data from your previous session was found. Would you like to restore it?',
                confirmText: 'Restore (પુનઃપ્રાપ્ત કરો)',
                cancelText: 'Discard (કાઢી નાખો)',
                type: 'primary',
                icon: '📝',
                closeOnOverlayClick: false
            }).then((userWantsRestore) => {
                isPromptingRecoveryRef.current = false;
                if (!active) return;

                if (userWantsRestore) {
                    trackEvent('draft_recovery_restored', { template_id: activeTemplateId });
                    setData(cachedData);
                    setTrackingId(null);
                    setIsLocked(false);
                    window.SessionManager.saveSession(activeTemplateId, { data: cachedData, trackingId: null, isLocked: false });
                    showToast("ડ્રાફ્ટ સફળતાપૂર્વક પુનઃપ્રાપ્ત થયો (Draft restored)", "success");
                } else {
                    // User chose Discard
                    trackEvent('draft_recovery_discarded', { template_id: activeTemplateId });
                    if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId, currentUser);
                    setData(emptyState);
                    setTrackingId(null);
                    setIsLocked(false);
                    window.SessionManager.saveSession(activeTemplateId, { data: emptyState, trackingId: null, isLocked: false });
                    showToast("અધૂરો ડેટા કાઢી નાખવામાં આવ્યો (Unsaved draft discarded)", "info");
                }
            }).catch((err) => {
                isPromptingRecoveryRef.current = false;
                console.error("❌ [App] Error in recovery confirmation dialog:", err);
            });
        } else {
            if (cachedDraft && cachedDraft.isLocked) {
                if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId, currentUser);
            }
            if (!active) return;
            setData(emptyState);
            setTrackingId(null);
            setIsLocked(false);
            window.SessionManager.saveSession(activeTemplateId, { data: emptyState, trackingId: null, isLocked: false });
        }

        return () => {
            active = false;
        };
    }, [activeTemplateId, authToken, isDownloading, currentView, currentUser]);

    // Template-specific draft recovery save using DraftCacheManager (user-isolated)
    useEffect(() => {
        if (isDownloading) return;
        if (currentView !== 'editor') return;
        if (!activeTemplateId) return;
        if (isPromptingRecoveryRef.current) return;
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(() => {
            if (isPromptingRecoveryRef.current) return;
            if (Object.keys(data).length > 0 && window.DraftCacheManager) {
                window.DraftCacheManager.save(activeTemplateId, data, trackingId, isLocked, currentUser);
            }
        }, 500);
        return () => {
            if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        };
    }, [data, trackingId, isLocked, activeTemplateId, isDownloading, currentUser, currentView]);

    useEffect(() => { localStorage.setItem('customTemplates', JSON.stringify(templates)); }, [templates]);
    useEffect(() => { localStorage.setItem('appRole', role); }, [role]);
    useEffect(() => { localStorage.setItem('isAdminPanelOpen', isAdminPanelOpen); }, [isAdminPanelOpen]);
    useEffect(() => { localStorage.setItem('adminPanelTab', adminPanelTab); }, [adminPanelTab]);

    // Auto-select first active template on startup if none is set
    useEffect(() => {
        if (!activeTemplateId && dbTpls.length > 0) {
            const firstActive = dbTpls.find(t => t.is_active);
            if (firstActive) {
                setActiveTemplateId(firstActive.template_id);
            }
        }
    }, [dbTpls, activeTemplateId]);

    // Hide splash screen on React App Mount
    useEffect(() => {
        if (typeof window.hideSplashScreen === 'function') {
            window.hideSplashScreen();
        }
    }, []);

    const openNewTemplateEditor = () => {
        const newId = `user_tpl_${Date.now()}`;
        setEditingTemplate({ id: newId, name: '', header: '', content: '', content2: '', footer: '', fields: {}, fieldOrder: [], _isNew: true });
        setIsTemplateEditorOpen(true);
    };

    const handleTemplateSave = async (updatedTemplate) => {
        try {
            if (updatedTemplate._isNew) {
                const { _isNew, id, ...clean } = updatedTemplate;
                const finalName = clean.name.trim() || 'Untitled Template';

                await window.apiFetch('/api/templates', {
                    method: 'POST',
                    body: {
                        name: finalName,
                        category: clean.category || 'General',
                        header: clean.header,
                        content: clean.content,
                        content2: clean.content2,
                        footer: clean.footer,
                        fields_json: JSON.stringify(clean.fields),
                        field_order_json: JSON.stringify(clean.fieldOrder),
                        file_path: clean.file_path,
                        menu_item_id: clean.menu_item_id,
                        credit_cost: clean.credit_cost,
                        document_identity_field: clean.document_identity_field,
                        document_secondary_field: clean.document_secondary_field,
                        identity_field: clean.identity_field,
                        secondary_field: clean.secondary_field
                    }
                });
                showToast("✅ Template created in database!", "success");
            } else if (updatedTemplate._source === 'db' || updatedTemplate.template_id || updatedTemplate.id) {
                const tId = updatedTemplate.template_id || updatedTemplate.id;

                try {
                    await window.apiFetch(`/api/templates/${tId}`, {
                        method: 'PUT',
                        body: {
                            name: updatedTemplate.name,
                            category: updatedTemplate.category || 'General',
                            header: updatedTemplate.header,
                            content: updatedTemplate.content,
                            content2: updatedTemplate.content2,
                            footer: updatedTemplate.footer,
                            fields_json: JSON.stringify(updatedTemplate.fields),
                            field_order_json: JSON.stringify(updatedTemplate.fieldOrder),
                            file_path: updatedTemplate.file_path,
                            menu_item_id: updatedTemplate.menu_item_id,
                            credit_cost: updatedTemplate.credit_cost,
                            document_identity_field: updatedTemplate.document_identity_field,
                            document_secondary_field: updatedTemplate.document_secondary_field,
                            identity_field: updatedTemplate.identity_field,
                            secondary_field: updatedTemplate.secondary_field
                        }
                    });
                    showToast("✅ Template updated successfully!", "success");
                } catch (putErr) {
                    if (putErr.status === 404) {
                        await window.apiFetch('/api/templates', {
                            method: 'POST',
                            body: {
                                name: updatedTemplate.name,
                                category: updatedTemplate.category || 'General',
                                header: updatedTemplate.header,
                                content: updatedTemplate.content,
                                content2: updatedTemplate.content2,
                                footer: updatedTemplate.footer,
                                fields_json: JSON.stringify(updatedTemplate.fields),
                                field_order_json: JSON.stringify(updatedTemplate.fieldOrder),
                                file_path: updatedTemplate.file_path,
                                menu_item_id: updatedTemplate.menu_item_id,
                                credit_cost: updatedTemplate.credit_cost,
                                document_identity_field: updatedTemplate.document_identity_field,
                                document_secondary_field: updatedTemplate.document_secondary_field,
                                identity_field: updatedTemplate.identity_field,
                                secondary_field: updatedTemplate.secondary_field
                            }
                        });
                        showToast("✅ Template created in database!", "success");
                    } else {
                        throw putErr;
                    }
                }
            } else {
                setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
            }

            setIsTemplateEditorOpen(false);
            refreshTemplates();
        } catch (err) {
            console.error("Template save error:", err);
            let userErrMsg = err.message;
            if (err.message === 'SERVER_OFFLINE') {
                userErrMsg = 'Unable to reach the server. Please check your network connection.';
            } else if (err.status === 401) {
                userErrMsg = 'Authentication required. Please log in as an administrator.';
            } else if (err.status === 403) {
                userErrMsg = 'Permission denied. Administrator access is required to edit templates.';
            } else if (err.status === 404) {
                userErrMsg = 'Template not found.';
            } else if (err.status === 422) {
                userErrMsg = `Validation error: ${err.message}`;
            }
            await showAlertDialog({
                title: 'Template Save Failed',
                message: userErrMsg,
                type: 'error'
            });
        }
    };

    const allTemplates = useMemo(() => {
        const activeDbTpls = (dbTpls || []).filter(t => t.is_active !== false && t.status !== 'ARCHIVED' && t.status !== 'DELETED');
        const dbIds = new Set(activeDbTpls.map(t => t.template_id));
        const filteredLocals = (templates || []).filter(t => !dbIds.has(t.id) && t.is_active !== false && t.status !== 'ARCHIVED' && t.status !== 'DELETED');
        const apiTemplates = [
            ...filteredLocals.map(t => ({ ...t, _source: 'local' })),
            ...activeDbTpls.map(t => ({ ...t, id: t.template_id, _source: 'db' }))
        ];
        const normalizedTemplates = apiTemplates.map(t => ({
            ...t,
            variables:
                t.variables ||
                t.fieldOrder ||
                Object.keys(t.fields || {}) ||
                [],
            fieldOrder:
                t.fieldOrder ||
                t.variables ||
                Object.keys(t.fields || {}) ||
                []
        }));
        return normalizedTemplates;
    }, [templates, dbTpls]);

    handleTemplateSelect = (newTemplateId) => {
        window.activeFocusedFieldPath = null;

        console.log(`[handleTemplateSelect] Switching from ${activeTemplateId} to ${newTemplateId}`);

        // Save the CURRENT states of the ACTIVE template before switching ONLY if currently in active editor view
        if (currentView === 'editor' && activeTemplateId) {
            console.log(`[handleTemplateSelect] Saving session for ${activeTemplateId}: data=${JSON.stringify(data)} trackingId=${trackingId} isLocked=${isLocked}`);
            window.SessionManager.saveSession(activeTemplateId, { data, trackingId, isLocked });
            if (window.DraftCacheManager && Object.keys(data).length > 0) {
                window.DraftCacheManager.save(activeTemplateId, data, trackingId, isLocked, currentUser);
            }
        }

        const newTpl = allTemplates.find(t => t.id === newTemplateId);
        if (!newTpl) {
            setActiveTemplateId(newTemplateId);
            return;
        }

        trackEvent('template_selected', {
            template_id: newTpl.id || newTemplateId,
            template_category: newTpl.category || 'General',
            template_name: newTpl.name || ''
        });

        const session = window.SessionManager.restoreSession(newTemplateId);
        if (session) {
            console.log(`[handleTemplateSelect] Restoring in-memory session for ${newTemplateId}`);
            setData(session.data);
            setTrackingId(session.trackingId);
            setIsLocked(session.isLocked);
            skipRecoveryRef.current = true;
        } else {
            const cachedDraft = window.DraftCacheManager ? window.DraftCacheManager.load(newTemplateId, currentUser) : null;
            const empty = getTemplateEmptyState(newTpl, false);
            const isMeaningful = cachedDraft && !cachedDraft.isLocked && window.DraftCacheManager && window.DraftCacheManager.isMeaningfulDraft(cachedDraft.data, empty);

            if (isMeaningful) {
                console.log(`[handleTemplateSelect] Found meaningful recovery cache for ${newTemplateId}, letting recovery effect prompt user`);
                skipRecoveryRef.current = false;
            } else {
                console.log(`[handleTemplateSelect] No session or meaningful cache for ${newTemplateId}, initializing with empty state`);
                setData(empty);
                setTrackingId(null);
                setIsLocked(false);
                skipRecoveryRef.current = true;
                window.SessionManager.saveSession(newTemplateId, { data: empty, trackingId: null, isLocked: false });
            }
        }

        const templateExists = allTemplates.some(t => t.id === newTemplateId);
        if (templateExists) {
            setActiveTemplateId(newTemplateId);
        } else {
            setActiveTemplateId("");
        }
    };

    loadTemplate = handleTemplateSelect;

    useEffect(() => {
        try {
            if (activeTemplateId) {
                localStorage.setItem('activeTemplateId', activeTemplateId);
            }
        } catch (e) { }
    }, [activeTemplateId]);

    useEffect(() => {
        if (currentView === 'editor' && !activeTemplateId && allTemplates.length > 0) {
            const savedTplId = localStorage.getItem('activeTemplateId');
            const targetTpl = (savedTplId && allTemplates.find(t => t.id === savedTplId)) || allTemplates[0];
            if (targetTpl) {
                handleTemplateSelect(targetTpl.id);
            }
        }
    }, [currentView, activeTemplateId, allTemplates]);

    const dynamicMenuItems = useMemo(() => {
        if (!menuItems || menuItems.length === 0) return [];

        const assignedTemplateIds = new Set();

        const processMenuTree = (nodes, isUnderCategoryParent = false) => {
            return nodes.map(node => {
                const processedNode = { ...node };

                const normLabel = (processedNode.label || '').toLowerCase();
                const isCurrentNodeCategoryParent = normLabel.includes('document services') || normLabel.includes('legal services');

                if (processedNode.children && processedNode.children.length > 0) {
                    processedNode.children = processMenuTree(processedNode.children, isCurrentNodeCategoryParent);
                }

                // If this is a static page link, preserve it as a page and do not mutate
                if (processedNode.type === 'page') {
                    return processedNode;
                }

                if (isUnderCategoryParent) {
                    const originalTemplateId = processedNode.template_id;

                    const matchingTemplates = allTemplates.filter(t => {
                        if (assignedTemplateIds.has(t.id)) return false;

                        const isIdMatch = originalTemplateId && (t.id === originalTemplateId || t.template_id === originalTemplateId);
                        const isSubmenuIdMatch = t.menu_item_id === processedNode.id;
                        const matched = isIdMatch || isSubmenuIdMatch;

                        return matched;
                    });

                    if (matchingTemplates.length > 0) {
                        matchingTemplates.forEach(t => {
                            assignedTemplateIds.add(t.id);
                        });

                        const templateChildren = matchingTemplates.map(t => ({
                            id: `dynamic-tpl-${t.id}`,
                            label: t.name,
                            url: `editor?template=${t.id}`,
                            icon: '📄',
                            type: 'template',
                            template_id: t.id,
                            children: []
                        }));

                        processedNode.children = [...(processedNode.children || []), ...templateChildren];

                        // If node has multiple child templates, make it a dropdown
                        if (processedNode.children.length > 1) {
                            processedNode.type = 'dropdown';
                            processedNode.url = '#';
                            processedNode.template_id = null;
                        }
                    }
                }

                return processedNode;
            });
        };

        return processMenuTree(menuItems);
    }, [menuItems, allTemplates]);

    const docServicesMenuItem = useMemo(() => {
        return dynamicMenuItems.find(item => (item.label || '').toLowerCase().includes('document services'));
    }, [dynamicMenuItems]);

    const activeTemplate = useMemo(() => {
        return allTemplates.find(t => t.id === activeTemplateId);
    }, [allTemplates, activeTemplateId]);

    const handleRoleChange = (newRole) => {
        if (newRole === 'admin' && !isAdminUser) {
            setRole('user');
            localStorage.setItem('appRole', 'user');
            return;
        }
        setRole(newRole);
        localStorage.setItem('appRole', newRole);
    };

    return (
        <div className="app-wrapper flex flex-col h-screen overflow-hidden bg-slate-50 font-gujarati">
            <GovHeader
                menuItems={dynamicMenuItems}
                currentUser={currentUser}
                user={user}
                role={role}
                onRoleChange={handleRoleChange}
                onLoginClick={(context) => {
                    const isExplicitContext = context && typeof context === 'object' && !context.nativeEvent && context.reason;
                    setAuthModalContext(isExplicitContext ? context : { reason: 'header_login' });
                    setIsAuthModalOpen(true);
                }}
                onLogout={async () => {
                    try {
                        await window.apiFetch('/api/logout', { method: 'POST' });
                    } catch (e) {
                        console.warn("Failed to log logout", e);
                    }
                    if (window.SessionManager) window.SessionManager.clearAll();
                    setCurrentUser(null);
                    setAuthToken(null);
                    setIsAdminUser(false);
                    setRole('user');
                    setIsAdminPanelOpen(false);
                    setIsUserProfileOpen(false);
                    setIsViewingWallet(false);
                    setIsViewingDrafts(false);
                    setUserCredits(null);
                    setIsAuthHydrated(true);
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('isAdminUser');
                    localStorage.setItem('appRole', 'user');
                }}
                onAdminPanelOpen={() => setIsAdminPanelOpen(true)}
                onProfileOpen={() => setIsUserProfileOpen(true)}
                onNavigate={handleNavigate}
                userCredits={userCredits}
                refreshCredits={refreshCredits}
                isAuthHydrated={isAuthHydrated}
                authLoading={!isAuthHydrated}
            />

            <main className="flex flex-1 overflow-hidden bg-slate-100">
                <div className="flex-1 flex overflow-hidden">
                    {currentView === 'home' && (
                        <div className="flex-1 overflow-y-auto">
                            <HomePage
                                currentUser={currentUser}
                                onNavigate={handleNavigate}
                                onLogin={(context) => {
                                    setAuthModalContext(context || null);
                                    setIsAuthModalOpen(true);
                                }}
                                templates={allTemplates}
                                isAuthHydrated={isAuthHydrated}
                            />
                        </div>
                    )}
                    {currentView === 'privacy-policy' && (
                        <div className="flex-1 overflow-y-auto">
                            <PrivacyPolicyPage onNavigate={handleNavigate} />
                        </div>
                    )}
                    {currentView === 'terms-of-service' && (
                        <div className="flex-1 overflow-y-auto">
                            <TermsOfServicePage onNavigate={handleNavigate} />
                        </div>
                    )}
                    {currentView === 'template-landing' && (
                        <div className="flex-1 overflow-y-auto">
                            <TemplateLandingPage
                                templateSlug={currentTemplateSlug}
                                templates={allTemplates}
                                isTemplatesLoading={isTemplatesLoading}
                                onNavigate={handleNavigate}
                                onLogin={(context) => {
                                    setAuthModalContext(context || null);
                                    setIsAuthModalOpen(true);
                                }}
                                currentUser={currentUser}
                            />
                        </div>
                    )}
                    {currentView === 'page' && (
                        <div className="flex-1 overflow-y-auto">
                            <StaticPageView slug={currentPageSlug} onNavigate={handleNavigate} />
                        </div>
                    )}
                    {currentView === 'editor' && (
                        <React.Suspense fallback={<LazyFallback />}>
                            <div className="flex flex-1 h-full overflow-hidden bg-slate-100">
                                {/* Left: Form Panel */}
                                <div className="w-[480px] flex-shrink-0 h-full bg-white shadow-xl z-20 overflow-y-auto custom-scrollbar flex flex-col border-r border-slate-200">
                                    <LazyFormPanel
                                        key={activeTemplateId}
                                        templates={allTemplates}
                                        activeTemplateId={activeTemplateId}
                                        onTemplateChange={handleTemplateSelect}
                                        data={data}
                                        setData={setData}
                                        onEditTemplate={() => { setEditingTemplate({ ...activeTemplate }); setIsTemplateEditorOpen(true); }}
                                        onNewTemplate={openNewTemplateEditor}
                                        role={role}
                                        isLocked={isLocked}
                                        trackingId={trackingId}
                                        onSaveDraft={handleSaveDraft}
                                        onFinalSubmit={handleFinalSubmit}
                                        isSavingDraft={isSavingDraft}
                                        draftError={draftError}
                                        templateLoadError={templateLoadError}
                                        isDownloading={isDownloading}
                                        setIsDownloading={setIsDownloading}
                                        isFinalizing={isFinalizing}
                                        userCredits={userCredits}
                                        isLoggedIn={Boolean(currentUser && authToken)}
                                        onLogin={(context) => {
                                            setAuthModalContext(context || null);
                                            setIsAuthModalOpen(true);
                                        }}
                                        onNewDocument={handleNewDocument}
                                    />
                                </div>

                                {/* Right: DOCX Preview Panel */}
                                <div className="flex-1 h-full overflow-hidden">
                                    <LazyDocumentPreview
                                        key={activeTemplateId}
                                        template={activeTemplate}
                                        data={data}
                                        printRef={printRef}
                                        pageSize={activeTemplate?.pageSize || 'A4'}
                                        templateId={activeTemplate?.template_id || activeTemplateId}
                                        isDownloading={isDownloading}
                                        setIsDownloading={setIsDownloading}
                                        allTemplates={allTemplates}
                                        isLoggedIn={Boolean(currentUser && authToken)}
                                        onLogin={(context) => {
                                            setAuthModalContext(context || null);
                                            setIsAuthModalOpen(true);
                                        }}
                                    />
                                </div>
                            </div>
                        </React.Suspense>
                    )}
                </div>
            </main>

            <React.Suspense fallback={<LazyFallback />}>
                {isTemplateEditorOpen && (
                    <LazyTemplateEditorModal
                        isOpen={isTemplateEditorOpen}
                        token={authToken}
                        template={editingTemplate || { id: 'temp', name: '', content: '', fields: {}, fieldOrder: [] }}
                        onSave={handleTemplateSave}
                        onClose={() => setIsTemplateEditorOpen(false)}
                    />
                )}
            </React.Suspense>

            <React.Suspense fallback={<LazyFallback />}>
                {isViewingWallet && (
                    <LazyWalletDashboard
                        onClose={() => setIsViewingWallet(false)}
                        token={authToken}
                        userCredits={userCredits}
                        refreshCredits={refreshCredits}
                    />
                )}
            </React.Suspense>

            <React.Suspense fallback={<LazyFallback />}>
                {isViewingDrafts && (
                    <LazyMyDocumentsModal
                        onClose={() => setIsViewingDrafts(false)}
                        token={authToken}
                        templates={allTemplates}
                        isDownloading={isDownloading}
                        setIsDownloading={setIsDownloading}
                        onSelectDraft={(draft) => {
                            if (draft.is_locked) {
                                showToast("This document is finalized and cannot be edited.", "error");
                                return;
                            }
                            try {
                                const draftData = JSON.parse(draft.data_json);
                                const tId = draftData.template_id || activeTemplateId;

                                // Save the CURRENT states of the ACTIVE template before loading the draft
                                if (activeTemplateId) {
                                    window.SessionManager.saveSession(activeTemplateId, { data, trackingId, isLocked });
                                }

                                skipRecoveryRef.current = true;

                                if (window.DraftCacheManager) {
                                    window.DraftCacheManager.save(tId, draftData, draft.tracking_id, draft.is_locked, currentUser);
                                } else {
                                    localStorage.setItem(`temp_draft_${tId}`, draft.data_json);
                                    if (draft.tracking_id) {
                                        localStorage.setItem(`temp_tracking_id_${tId}`, draft.tracking_id);
                                    } else {
                                        localStorage.removeItem(`temp_tracking_id_${tId}`);
                                    }
                                    localStorage.setItem(`temp_locked_${tId}`, String(draft.is_locked));
                                }

                                // Overwrite/register the session in SessionManager
                                window.SessionManager.saveSession(tId, { data: draftData, trackingId: draft.tracking_id, isLocked: draft.is_locked });

                                setActiveTemplateId(tId);
                                setData(draftData);
                                setTrackingId(draft.tracking_id);
                                setIsLocked(draft.is_locked);
                                setIsViewingDrafts(false);
                                setCurrentView('editor');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                showToast("Draft loaded successfully", "success");
                            } catch (e) {
                                console.error("Error loading draft", e);
                                showToast("Error loading draft", "error");
                            }
                        }}
                        onDraftDeleted={(deletedId, templateId) => {
                            const targetTemplateId = templateId || activeTemplateId;

                            window.SessionManager.clearSession(targetTemplateId);

                            if (window.DraftCacheManager) {
                                window.DraftCacheManager.clear(targetTemplateId, currentUser);
                            } else {
                                localStorage.removeItem(`temp_draft_${targetTemplateId}`);
                                localStorage.removeItem(`temp_tracking_id_${targetTemplateId}`);
                                localStorage.removeItem(`temp_locked_${targetTemplateId}`);
                            }

                            if (trackingId === deletedId) {
                                setTrackingId(null);
                                setIsLocked(false);
                                const activeTemplate = allTemplates.find(t => t.id === targetTemplateId);
                                setData(getTemplateEmptyState(activeTemplate, false));
                                if (window.DraftCacheManager) {
                                    window.DraftCacheManager.clear(targetTemplateId, currentUser);
                                }
                            }
                        }}
                    />
                )}
            </React.Suspense>

            {isAuthModalOpen && (
                <AuthModal
                    initialToken={(() => {
                        try {
                            const p = new URLSearchParams(window.location.search);
                            return p.get('reset_token') || p.get('token') || '';
                        } catch { return ''; }
                    })()}
                    initialView={(() => {
                        try {
                            const p = new URLSearchParams(window.location.search);
                            return (p.get('reset_token') || p.get('token')) ? 'forgot-reset' : 'login';
                        } catch { return 'login'; }
                    })()}
                    authContext={authModalContext}
                    onClose={() => {
                        setIsAuthModalOpen(false);
                        setAuthModalContext(null);
                    }}
                    onLoginSuccess={(username, token, isAdmin) => {
                        setCurrentUser(username); setAuthToken(token); setIsAdminUser(isAdmin);
                        setRole(isAdmin ? 'admin' : 'user');
                        setIsAuthHydrated(true);
                        localStorage.setItem('currentUser', username);
                        localStorage.setItem('authToken', token);
                        localStorage.setItem('isAdminUser', String(isAdmin));
                        localStorage.setItem('appRole', isAdmin ? 'admin' : 'user');
                        setIsAuthModalOpen(false);
                        if (authModalContext && authModalContext.postLoginAction === 'open_my_docs') {
                            setIsViewingDrafts(true);
                        }
                        setAuthModalContext(null);
                    }}
                />
            )}

            <React.Suspense fallback={<LazyFallback />}>
                {isAdminPanelOpen && user && user.is_admin === true && (
                    <LazyAdminPanel
                        onClose={() => setIsAdminPanelOpen(false)}
                        currentUser={currentUser}
                        tab={adminPanelTab}
                        setTab={setAdminPanelTab}
                        templates={templates}
                        dbTemplates={dbTpls}
                        isLoadingTemplates={isTemplatesLoading}
                        onEditTemplate={(t) => { setEditingTemplate({ ...t }); setIsTemplateEditorOpen(true); }}
                        onNewTemplate={() => { openNewTemplateEditor(); setIsTemplateEditorOpen(true); }}
                        onDeleteLocalTemplate={(id) => setTemplates(prev => prev.filter(t => t.id !== id))}
                        onMenuUpdate={refreshMenu}
                        onTemplatesUpdate={refreshTemplates}
                    />
                )}
            </React.Suspense>

            <React.Suspense fallback={<LazyFallback />}>
                {isDocServicesPanelOpen && (
                    <LazyDocumentServicesPanel
                        isOpen={isDocServicesPanelOpen}
                        onClose={() => setIsDocServicesPanelOpen(false)}
                        menuItem={docServicesMenuItem}
                        onSelectTemplate={(templateId) => {
                            setCurrentView('editor');
                            setCurrentPageSlug('');
                            handleTemplateSelect(templateId);
                        }}
                    />
                )}
            </React.Suspense>

            <React.Suspense fallback={<LazyFallback />}>
                {isUserProfileOpen && (
                    <LazyUserProfileModal
                        isOpen={isUserProfileOpen}
                        onClose={() => setIsUserProfileOpen(false)}
                        onUserUpdated={(updatedUser) => {
                            if (updatedUser.username && updatedUser.username !== currentUser) {
                                setCurrentUser(updatedUser.username);
                            }
                            showToast("પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ છે (Profile updated successfully)", "success");
                        }}
                    />
                )}
            </React.Suspense>

            <CustomDialogContainer />

            {toast && (
                <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all duration-300 animate-fade-in
                    ${toast.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                    <span className="text-xl">{toast.type === 'success' ? '✅' : '⚠️'}</span>
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default App;

