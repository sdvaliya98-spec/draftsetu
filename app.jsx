import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import GovHeader from './src/components/GovHeader.jsx';
import UserMenu from './src/components/UserMenu.jsx';
import AuthModal from './src/components/AuthModal.jsx';
import HomePage from './src/pages/HomePage.jsx';
import StaticPageView from './src/pages/StaticPageView.jsx';

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

const App = () => {
    const isInitialLoadRef = useRef(true);
    const skipRecoveryRef = useRef(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [currentView, setCurrentView] = useState(
        localStorage.getItem('currentView') || 'home'
    ); // 'home' | 'editor' | 'page'
    const [editingTemplate, setEditingTemplate] = useState(null); // null = closed, object = being edited
    const [currentPageSlug, setCurrentPageSlug] = useState('');
    const [templates, setTemplates] = useState([]);
    const [activeTemplateId, setActiveTemplateId] = useState('');
    const [role, setRole] = useState('user');
    const [isViewingDrafts, setIsViewingDrafts] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    window.openAuthModal = () => setIsAuthModalOpen(true);

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
    const [menuOpen, setMenuOpen] = useState(true);
    const [menuItems, setMenuItems] = useState([]);
    const [dbTpls, setDbTpls] = useState([]);
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [templateLoadError, setTemplateLoadError] = useState(null);
    const [isDocServicesPanelOpen, setIsDocServicesPanelOpen] = useState(false);

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
                let fields = t.fields || {};
                let fieldOrder = t.fieldOrder || [];
                let variables = t.variables || [];
                try { if (t.fields_json) fields = JSON.parse(t.fields_json); } catch (e) { }
                try { if (t.field_order_json) fieldOrder = JSON.parse(t.field_order_json); } catch (e) { }
                return { ...t, fields, fieldOrder, variables };
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
                const filteredData = data.filter(item => item.url !== 'documents');
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
                        if (docs.length >= 10) {
                            if (activeTemplateId === targetTemplateId) {
                                const limitMsg = "Maximum 10 saved documents allowed. Please delete old documents before saving new ones.";
                                setDraftError(limitMsg);
                                showToast(limitMsg, "error");
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

                // Clear session in SessionManager
                window.SessionManager.clearSession(targetTemplateId);

                // Clear cache
                if (window.DraftCacheManager) {
                    window.DraftCacheManager.clear(targetTemplateId);
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
            alert('કૃપા કરીને ફાઈનલ લોક કરતાં પહેલાં દસ્તાવેજને ડ્રાફ્ટ તરીકે સેવ કરો (Please save as Draft first).');
            return;
        }
        const confirmSubmit = window.confirm(
            "શું તમે આ દસ્તાવેજને ફાઇનલ લોક કરવા માંગો છો? એકવાર લોક થયા પછી તમે તેને સંપાદિત કરી શકશો નહીં. (Are you sure you want to finalize and lock?)"
        );
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
                        if (isNew && docs.length >= 10) {
                            if (activeTemplateId === targetTemplateId) {
                                const limitMsg = "Maximum 10 saved documents allowed. Please delete old documents before saving new ones.";
                                setDraftError(limitMsg);
                                showToast(limitMsg, "error");
                            }
                            setIsFinalizing(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.warn("Could not pre-verify document count", e);
                }

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
                        window.DraftCacheManager.clear(targetTemplateId);
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
            } finally {
                if (activeTemplateId === targetTemplateId) {
                    setIsFinalizing(false);
                }
            }
        }
    };

    const handleNavigate = (urlOrMenu) => {
        if (!urlOrMenu) return;

        let url = urlOrMenu;
        if (typeof urlOrMenu === 'object' && urlOrMenu !== null) {
            const menu = urlOrMenu;
            if (menu.type === 'document_services_panel') {
                setIsDocServicesPanelOpen(true);
                return;
            }
            if (menu.type === 'template') {
                setCurrentView('editor');
                localStorage.setItem('currentView', 'editor');
                loadTemplate(menu.template_id);
                return;
            }
            url = menu.url;
        }

        if (!url || url === '#') return;
        if (url === 'home' || url === '/') {
            setCurrentView('home');
            localStorage.setItem('currentView', 'home');
            return;
        }
        if (url.startsWith('editor')) {
            setCurrentView('editor');
            localStorage.setItem('currentView', 'editor');
            const match = url.match(/template=([^&]+)/);
            if (match && match[1]) {
                const templateId = match[1];
                loadTemplate(templateId);
            }
            return;
        }
        if (url === 'documents') {
            setIsViewingDrafts(true);
            return;
        }
        if (url === 'wallet') {
            setIsViewingWallet(true);
            return;
        }
        if (url.startsWith('page:')) {
            setCurrentView('page');
            localStorage.setItem('currentView', 'page');
            setCurrentPageSlug(url.slice(5));
            return;
        }
        window.open(url, '_blank');
    };

    const printRef = useRef(null);

    useEffect(() => {
        const savedTemplates = localStorage.getItem('customTemplates');
        const savedRole = localStorage.getItem('appRole');
        if (savedTemplates) { try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { } }
        if (savedRole) { setRole(savedRole); }
        if (window.DraftCacheManager) {
            window.DraftCacheManager.purgeStaleDrafts();
        }
    }, []);

    // Template-specific draft recovery load with backend verification
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

        const cachedDraft = window.DraftCacheManager ? window.DraftCacheManager.load(activeTemplateId) : null;

        if (cachedDraft) {
            const { data: cachedData, trackingId: cachedTrackId, isLocked: cachedLocked } = cachedDraft;

            if (cachedLocked) {
                if (!active) return;
                setTrackingId(null);
                setIsLocked(false);
                const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
                const empty = getTemplateEmptyState(activeTemplate, false);
                setData(empty);
                if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId);
                window.SessionManager.saveSession(activeTemplateId, { data: empty, trackingId: null, isLocked: false });
                return;
            }

            if (cachedTrackId && authToken) {
                window.apiFetch(`/api/documents/${cachedTrackId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                })
                    .then(async (res) => {
                        if (!active) return;
                        if (res.ok) {
                            const docData = await res.json();
                            if (docData.is_locked) {
                                if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId);
                                setTrackingId(null);
                                setIsLocked(false);
                                const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
                                const empty = getTemplateEmptyState(activeTemplate, false);
                                setData(empty);
                                window.SessionManager.saveSession(activeTemplateId, { data: empty, trackingId: null, isLocked: false });
                                showToast("આ દસ્તાવેજ ફાઇનલ લોક કરેલ છે અને તેમાં ફેરફાર કરી શકાશે નહીં. (This document has been locked and cannot be edited.)", "error");
                            } else {
                                try {
                                    const parsed = JSON.parse(docData.data_json);
                                    setData(parsed);
                                    setTrackingId(docData.tracking_id);
                                    setIsLocked(false);
                                    if (window.DraftCacheManager) window.DraftCacheManager.save(activeTemplateId, parsed, docData.tracking_id, false);
                                    window.SessionManager.saveSession(activeTemplateId, { data: parsed, trackingId: docData.tracking_id, isLocked: false });
                                } catch (e) {
                                    console.error("❌ [App] Error parsing database draft JSON:", e);
                                    const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
                                    const empty = getTemplateEmptyState(activeTemplate, false);
                                    setData(empty);
                                    setTrackingId(docData.tracking_id);
                                    setIsLocked(false);
                                    window.SessionManager.saveSession(activeTemplateId, { data: empty, trackingId: docData.tracking_id, isLocked: false });
                                }
                            }
                        } else if (res.status === 404) {
                            if (window.DraftCacheManager) window.DraftCacheManager.clear(activeTemplateId);
                            setTrackingId(null);
                            setIsLocked(false);
                            const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
                            const empty = getTemplateEmptyState(activeTemplate, false);
                            setData(empty);
                            window.SessionManager.saveSession(activeTemplateId, { data: empty, trackingId: null, isLocked: false });
                            showToast("સંદર્ભિત ડ્રાફ્ટ ડેટાબેઝમાં મળ્યો નથી, નવો દસ્તાવેજ શરૂ થઈ રહ્યો છે (Draft not found in database. Opening a fresh document.)", "error");
                        } else {
                            console.error(`❌ [App] Server error ${res.status} during draft verification.`);
                            showToast(`ડ્રાફ્ટ ચકાસવામાં ભૂલ આવી (Error verifying draft): status ${res.status}`, "error");
                        }
                    })
                    .catch((err) => {
                        if (!active) return;
                        console.error("❌ [App] Network/Service exception during draft verification:", err);
                        if (err.message === 'SERVER_OFFLINE') {
                            const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
                            const restoredData = cachedData || getTemplateEmptyState(activeTemplate, false);
                            setData(restoredData);
                            setTrackingId(cachedTrackId);
                            setIsLocked(false);
                            window.SessionManager.saveSession(activeTemplateId, { data: restoredData, trackingId: cachedTrackId, isLocked: false });
                        }
                    });
            } else {
                const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
                const restoredData = cachedData || getTemplateEmptyState(activeTemplate, false);
                setData(restoredData);
                setTrackingId(null);
                setIsLocked(false);
                window.SessionManager.saveSession(activeTemplateId, { data: restoredData, trackingId: null, isLocked: false });
            }
        } else {
            if (!active) return;
            const activeTemplate = allTemplates.find(t => t.id === activeTemplateId);
            const emptyState = getTemplateEmptyState(activeTemplate, isInitialLoadRef.current);
            isInitialLoadRef.current = false;
            setData(emptyState);
            setTrackingId(null);
            setIsLocked(false);
            window.SessionManager.saveSession(activeTemplateId, { data: emptyState, trackingId: null, isLocked: false });
        }

        return () => {
            active = false;
        };
    }, [activeTemplateId, authToken, isDownloading, currentView]);

    // Template-specific draft recovery save using DraftCacheManager
    useEffect(() => {
        if (isDownloading) return;
        if (!activeTemplateId) return;
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = setTimeout(() => {
            if (Object.keys(data).length > 0 && window.DraftCacheManager) {
                window.DraftCacheManager.save(activeTemplateId, data, trackingId, isLocked);
            }
        }, 500);
        return () => {
            if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
        };
    }, [data, trackingId, isLocked, activeTemplateId, isDownloading]);

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

                await window.apiFetch('/api/templates/', {
                    method: 'POST',
                    body: {
                        name: finalName,
                        header: clean.header,
                        content: clean.content,
                        content2: clean.content2,
                        footer: clean.footer,
                        fields_json: JSON.stringify(clean.fields),
                        field_order_json: JSON.stringify(clean.fieldOrder),
                        file_path: clean.file_path,
                        menu_item_id: clean.menu_item_id,
                        credit_cost: clean.credit_cost
                    }
                });
                alert("✅ Template created in database!");
            } else if (updatedTemplate._source === 'db' || updatedTemplate.template_id || updatedTemplate.id) {
                const tId = updatedTemplate.template_id || updatedTemplate.id;

                try {
                    await window.apiFetch(`/api/templates/${tId}/`, {
                        method: 'PUT',
                        body: {
                            name: updatedTemplate.name,
                            header: updatedTemplate.header,
                            content: updatedTemplate.content,
                            content2: updatedTemplate.content2,
                            footer: updatedTemplate.footer,
                            fields_json: JSON.stringify(updatedTemplate.fields),
                            field_order_json: JSON.stringify(updatedTemplate.fieldOrder),
                            file_path: updatedTemplate.file_path,
                            menu_item_id: updatedTemplate.menu_item_id,
                            credit_cost: updatedTemplate.credit_cost
                        }
                    });
                    alert("✅ Template updated successfully!");
                } catch (putErr) {
                    if (putErr.status === 404) {
                        await window.apiFetch('/api/templates/', {
                            method: 'POST',
                            body: {
                                name: updatedTemplate.name,
                                header: updatedTemplate.header,
                                content: updatedTemplate.content,
                                content2: updatedTemplate.content2,
                                footer: updatedTemplate.footer,
                                fields_json: JSON.stringify(updatedTemplate.fields),
                                field_order_json: JSON.stringify(updatedTemplate.fieldOrder),
                                file_path: updatedTemplate.file_path,
                                menu_item_id: updatedTemplate.menu_item_id,
                                credit_cost: updatedTemplate.credit_cost
                            }
                        });
                        alert("✅ Template created in database!");
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
            alert(`❌ Failed to save template: ${err.message}`);
        }
    };

    const allTemplates = useMemo(() => {
        const dbIds = new Set(dbTpls.map(t => t.template_id));
        const filteredLocals = templates.filter(t => !dbIds.has(t.id));
        const apiTemplates = [
            ...filteredLocals.map(t => ({ ...t, _source: 'local' })),
            ...dbTpls.map(t => ({ ...t, id: t.template_id, _source: 'db' }))
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

        // Save the CURRENT states of the ACTIVE template before switching
        if (activeTemplateId) {
            console.log(`[handleTemplateSelect] Saving session for ${activeTemplateId}: data=${JSON.stringify(data)} trackingId=${trackingId} isLocked=${isLocked}`);
            window.SessionManager.saveSession(activeTemplateId, { data, trackingId, isLocked });
        }

        const newTpl = allTemplates.find(t => t.id === newTemplateId);
        if (!newTpl) {
            console.warn(`[handleTemplateSelect] New template not found: ${newTemplateId}`);
            return;
        }

        const session = window.SessionManager.restoreSession(newTemplateId);
        if (session) {
            console.log(`[handleTemplateSelect] Restoring session for ${newTemplateId}: data=${JSON.stringify(session.data)} trackingId=${session.trackingId} isLocked=${session.isLocked}`);
            setData(session.data);
            setTrackingId(session.trackingId);
            setIsLocked(session.isLocked);
            skipRecoveryRef.current = true;
        } else {
            const cachedDraft = window.DraftCacheManager ? window.DraftCacheManager.load(newTemplateId) : null;
            if (cachedDraft) {
                console.log(`[handleTemplateSelect] Found local recovery cache for ${newTemplateId}, letting recovery useEffect run`);
                skipRecoveryRef.current = false;
            } else {
                console.log(`[handleTemplateSelect] No session or cache for ${newTemplateId}, initializing with empty state`);
                const empty = getTemplateEmptyState(newTpl, false);
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
        setRole(newRole);
    };

    return (
        <div className="app-wrapper flex flex-col h-screen overflow-hidden bg-slate-50 font-gujarati">
            <GovHeader
                menuItems={dynamicMenuItems}
                currentUser={currentUser}
                user={user}
                role={role}
                onRoleChange={handleRoleChange}
                onLoginClick={() => setIsAuthModalOpen(true)}
                onLogout={async () => {
                    try {
                        await window.apiFetch('/api/logout', { method: 'POST' });
                    } catch (e) {
                        console.warn("Failed to log logout", e);
                    }
                    setCurrentUser(null); setAuthToken(null); setIsAdminUser(false);
                    setRole('user');
                    localStorage.removeItem('currentUser'); localStorage.removeItem('authToken'); localStorage.removeItem('isAdminUser');
                    localStorage.setItem('appRole', 'user');
                }}
                onAdminPanelOpen={() => setIsAdminPanelOpen(true)}
                onNavigate={handleNavigate}
                userCredits={userCredits}
                refreshCredits={refreshCredits}
            />

            <main className="flex flex-1 overflow-hidden bg-slate-100">
                <div className="flex-1 flex overflow-hidden">
                    {currentView === 'home' && (
                        <div className="flex-1 overflow-y-auto">
                            <HomePage
                                currentUser={currentUser}
                                onNavigate={handleNavigate}
                                onLogin={() => setIsAuthModalOpen(true)}
                                templates={allTemplates}
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
                                        onLogin={() => setIsAuthModalOpen(true)}
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
                                        onLogin={() => setIsAuthModalOpen(true)}
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
                                    window.DraftCacheManager.save(tId, draftData, draft.tracking_id, draft.is_locked);
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
                                localStorage.setItem('currentView', 'editor');
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
                                window.DraftCacheManager.clear(targetTemplateId);
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
                                    window.DraftCacheManager.clear(targetTemplateId);
                                }
                            }
                        }}
                    />
                )}
            </React.Suspense>

            {isAuthModalOpen && (
                <AuthModal
                    onClose={() => setIsAuthModalOpen(false)}
                    onLoginSuccess={(username, token, isAdmin) => {
                        setCurrentUser(username); setAuthToken(token); setIsAdminUser(isAdmin);
                        setRole(isAdmin ? 'admin' : 'user');
                        localStorage.setItem('currentUser', username);
                        localStorage.setItem('authToken', token);
                        localStorage.setItem('isAdminUser', String(isAdmin));
                        localStorage.setItem('appRole', isAdmin ? 'admin' : 'user');
                        setIsAuthModalOpen(false);
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
                            localStorage.setItem('currentView', 'editor');
                            handleTemplateSelect(templateId);
                        }}
                    />
                )}
            </React.Suspense>

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

