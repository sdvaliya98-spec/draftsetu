/**
 * DocumentPreview — DOCX Template Engine Preview
 * ================================================
 * Architecture: DOCX → LibreOffice → PDF
 */
const DocumentPreview = ({ template, data, printRef, pageSize = 'A4', templateId, isDownloading, setIsDownloading }) => {
    const [lastError, setLastError] = useState(null);
    const [pdfAvailable, setPdfAvailable] = useState(null);

    // Live Preview state
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [previewBlob, setPreviewBlob] = useState(null);
    const [autoSync, setAutoSync] = useState(true);
    const [showHighlights, setShowHighlights] = useState(true);
    const [isVarsExpanded, setIsVarsExpanded] = useState(false);
    const [isGuideExpanded, setIsGuideExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const previewContainerRef = React.useRef(null);
    const originalHtmlRef = React.useRef("");
    
    const activeFetchControllerRef = React.useRef(null);
    const previewVersionRef = React.useRef(0);
    const activeTimeoutsRef = React.useRef([]);

    const safeSetTimeout = (fn, delay) => {
        const id = setTimeout(fn, delay);
        activeTimeoutsRef.current.push(id);
        return id;
    };

    useEffect(() => {
        return () => {
            if (activeFetchControllerRef.current) {
                activeFetchControllerRef.current.abort();
            }
            activeTimeoutsRef.current.forEach(id => clearTimeout(id));
        };
    }, []);

    // Check LibreOffice availability on mount
    useEffect(() => {
        if (isDownloading) return;
        if (window.apiFetch) {
            window.apiFetch('/api/documents/libreoffice-status')
                .then(r => r.json())
                .then(d => setPdfAvailable(d.available))
                .catch(() => setPdfAvailable(false));
        } else {
            setPdfAvailable(false);
        }
    }, [isDownloading]);

    const activeTemplateId = templateId || window._activeTemplateId;

    // Get template variables only (no stale cached fields)
    const templateKeys = React.useMemo(() => {
        const vars = template?.variables;
        if (!vars) return [];
        if (Array.isArray(vars)) {
            return vars.filter(v => !v.startsWith('#') && !v.startsWith('/'));
        }
        if (typeof vars === 'object') {
            const singles = vars.single_variables || [];
            const groups = Object.keys(vars.groups || {});
            return [...singles, ...groups];
        }
        return [];
    }, [template]);

    const filledCount = templateKeys.filter(key => {
        const val = data?.[key];
        return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
    }).length;
    const totalKeys = templateKeys.length;

    // Helper to recursively wrap filled variables with highlight markers
    const addPreviewMarkers = (obj, prefix = "") => {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map((item, idx) => addPreviewMarkers(item, `${prefix}[${idx}]`));
        }
        if (typeof obj === 'object') {
            const newObj = {};
            for (const [k, v] of Object.entries(obj)) {
                newObj[k] = addPreviewMarkers(v, prefix ? `${prefix}.${k}` : k);
            }
            return newObj;
        }
        if (typeof obj === 'string' || typeof obj === 'number') {
            const keyName = prefix.split('.').pop() || prefix;
            return `[[[VAR_START:${keyName}]]]${obj}[[[VAR_END]]]`;
        }
        return obj;
    };

    // Prepares preview data by injecting preview markers and missing indicators
    const preparePreviewData = () => {
        const previewData = {};
        const vars = template?.variables;

        let singles = [];
        let groups = {};
        if (vars) {
            if (Array.isArray(vars)) {
                singles = vars.filter(v => !v.startsWith('#') && !v.startsWith('/'));
            } else if (typeof vars === 'object') {
                singles = vars.single_variables || [];
                groups = vars.groups || {};
            }
        }

        const isDateField = (fieldName) => {
            const fieldConfig = (template?.fields && template.fields[fieldName]) || {};
            return fieldConfig.type === 'date' || getFieldType(fieldName) === 'date';
        };

        const formatValue = (fieldName, val) => {
            if (isDateField(fieldName)) {
                return window.formatPreviewDate ? window.formatPreviewDate(val) : val;
            }
            return val;
        };

        // Helper to recursively inject markers
        const injectValue = (val, path) => {
            const isEmpty = val === '' || val === null || val === undefined;
            if (isEmpty) {
                return `[[[VAR_START:${path}]]][[[VAR_MISSING:${path}]]][[[VAR_END]]]`;
            }
            return `[[[VAR_START:${path}]]]${val}[[[VAR_END]]]`;
        };

        const processItem = (item, fields, pathPrefix) => {
            if (!item || typeof item !== 'object') return item;
            const newItem = { ...item };
            fields.forEach(field => {
                if (field !== 'index' && field !== 'children') {
                    const val = item[field];
                    const formattedVal = formatValue(field, val);
                    newItem[field] = injectValue(formattedVal, `${pathPrefix}.${field}`);
                }
            });
            if (Array.isArray(item.children)) {
                newItem.children = item.children.map((child, childIdx) => {
                    return processItem(child, fields, `${pathPrefix}.children.${childIdx}`);
                });
            }
            return newItem;
        };

        // 1. Process singles
        singles.forEach(key => {
            const val = data?.[key];
            const formattedVal = formatValue(key, val);
            previewData[key] = injectValue(formattedVal, key);
        });

        // 2. Process groups
        Object.entries(groups).forEach(([groupName, groupFields]) => {
            const userList = data?.[groupName];
            if (!userList || !Array.isArray(userList)) {
                previewData[groupName] = [];
            } else {
                previewData[groupName] = userList.map((item, idx) => {
                    return processItem(item, groupFields, `${groupName}.${idx}`);
                });
            }
        });

        // Fallback for other data keys not explicitly in the variables schema
        Object.entries(data || {}).forEach(([k, v]) => {
            if (!(k in previewData) && !groups[k]) {
                if (typeof v === 'string' || typeof v === 'number') {
                    const formattedVal = formatValue(k, v);
                    previewData[k] = injectValue(formattedVal, k);
                } else {
                    previewData[k] = v;
                }
            }
        });

        return previewData;
    };

    const applyHighlights = (highlight) => {
        if (!originalHtmlRef.current || !previewContainerRef.current) return;

        let html = originalHtmlRef.current;
        if (highlight) {
            // Replace filled markers
            html = html.replace(/\[\[\[VAR_START:([^\]]+)\]\]\]([\s\S]*?)\[\[\[VAR_END\]\]\]/g, (match, key, content) => {
                const displayName = key.split('.').pop().replace(/_/g, ' ');
                if (content.includes('[[[VAR_MISSING:')) {
                    return `<span class="dp-highlight-missing" data-var-path="${key}" title="Required field: ${key}">[${displayName} Required]</span>`;
                }
                return `<span class="dp-highlight-filled" data-var-path="${key}" title="Variable: ${key}">${content}</span>`;
            });
        } else {
            // Strip markers and replace missing markers with empty string
            html = html.replace(/\[\[\[VAR_START:([^\]]+)\]\]\]([\s\S]*?)\[\[\[VAR_END\]\]\]/g, (match, key, content) => {
                if (content.includes('[[[VAR_MISSING:')) {
                    return `<span data-var-path="${key}"></span>`;
                }
                return `<span data-var-path="${key}">${content}</span>`;
            });
        }
        previewContainerRef.current.innerHTML = html;
    };

    const scrollToField = (path, smooth = true) => {
        if (!path || !previewContainerRef.current) return;
        const element = previewContainerRef.current.querySelector(`[data-var-path="${path}"]`);
        if (element) {
            element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
            element.classList.remove('dp-pulse-active');
            void element.offsetWidth; // Force reflow
            element.classList.add('dp-pulse-active');
            safeSetTimeout(() => {
                element.classList.remove('dp-pulse-active');
            }, 2400);
        }
    };

    useEffect(() => {
        const handleScrollEvent = (e) => {
            const { path } = e.detail;
            scrollToField(path, true);
        };
        window.addEventListener('focus-preview-field', handleScrollEvent);
        return () => {
            window.removeEventListener('focus-preview-field', handleScrollEvent);
        };
    }, []);

    // Live preview fetch helper
    const fetchLivePreview = async (signal = null) => {
        if (!activeTemplateId || !template) return;

        if (activeFetchControllerRef.current) {
            activeFetchControllerRef.current.abort();
        }

        const controller = signal ? null : new AbortController();
        if (controller) {
            activeFetchControllerRef.current = controller;
        }

        const fetchSignal = signal || controller.signal;
        const currentVersion = ++previewVersionRef.current;

        setIsPreviewLoading(true);
        setPreviewError(null);
        try {
            const previewData = preparePreviewData();
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            const res = await fetch(`${window.API_BASE || ''}/api/documents/generate?format=docx`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    template_id: activeTemplateId,
                    data: previewData,
                    format: 'docx'
                }),
                signal: fetchSignal
            });

            if (!res.ok) {
                let errMsg = `Preview generation failed (${res.status})`;
                try {
                    const errData = await res.json();
                    errMsg = errData.detail || errMsg;
                } catch (_) { }
                throw new Error(errMsg);
            }

            const blob = await res.blob();
            const arrayBuffer = await blob.arrayBuffer();

            if (currentVersion === previewVersionRef.current && !fetchSignal.aborted) {
                setPreviewBlob(arrayBuffer);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('[DocumentPreview] Live preview fetch error:', err);
            if (currentVersion === previewVersionRef.current && !fetchSignal.aborted) {
                setPreviewError(err.message || 'Failed to generate live preview');
            }
        } finally {
            if (currentVersion === previewVersionRef.current && !fetchSignal.aborted) {
                setIsPreviewLoading(false);
            }
        }
    };

    // Debounced automatic updates upon data / template change
    useEffect(() => {
        if (!activeTemplateId || !template || !autoSync) return;

        const controller = new AbortController();
        const timeoutId = safeSetTimeout(() => {
            fetchLivePreview(controller.signal);
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [activeTemplateId, template, data, autoSync]);

    // Force initial preview load if auto-sync is on
    useEffect(() => {
        if (autoSync && activeTemplateId && template && !previewBlob) {
            fetchLivePreview();
        }
    }, [autoSync, activeTemplateId, template]);

    // docx-preview rendering effect
    useEffect(() => {
        let active = true;
        if (!previewBlob || !previewContainerRef.current) return;

        const renderPreview = async () => {
            try {
                if (!window.docx) {
                    throw new Error("docx-preview library is not loaded");
                }
                previewContainerRef.current.innerHTML = "";
                await window.docx.renderAsync(
                    previewBlob,
                    previewContainerRef.current,
                    undefined,
                    {
                        breakPages: true,
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        experimental: true
                    }
                );
                if (active) {
                    originalHtmlRef.current = previewContainerRef.current.innerHTML;
                    applyHighlights(showHighlights);
                    if (window.activeFocusedFieldPath) {
                        safeSetTimeout(() => {
                            scrollToField(window.activeFocusedFieldPath, false);
                        }, 50);
                    }
                }
            } catch (err) {
                console.error('[DocumentPreview] Render error:', err);
                if (active) {
                    setPreviewError("Render failed: " + err.message);
                }
            }
        };

        renderPreview();

        return () => {
            active = false;
        };
    }, [previewBlob]);

    // Fast toggle update effect without fetching from server
    useEffect(() => {
        if (originalHtmlRef.current && previewContainerRef.current) {
            applyHighlights(showHighlights);
        }
    }, [showHighlights]);



    if (!template || !activeTemplateId) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 dp-container">
                <div className="text-center text-slate-400 p-8">
                    <div className="text-5xl mb-4">📄</div>
                    <p className="font-black uppercase tracking-widest text-sm">Select a template to begin</p>
                </div>
            </div>
        );
    }

    const hasDocxFile = template?.file_path || template?.filePath;

    return (
        <div ref={printRef} className="h-full w-full overflow-hidden flex flex-col relative dp-container">
            {/* Scoped Styling Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm z-10 dp-header flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm tracking-tight">DOCX Template Engine</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Word-native rendering • Zero HTML approximation
                            </p>
                        </div>
                    </div>

                    {/* Status Indicators row */}
                    <div className="flex items-center gap-2">
                        {/* Highlight Toggle */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Highlight Variables</span>
                            <label className="dp-switch">
                                <input
                                    type="checkbox"
                                    checked={showHighlights}
                                    onChange={(e) => setShowHighlights(e.target.checked)}
                                    id="toggle-show-highlights"
                                />
                                <span className="dp-slider"></span>
                            </label>
                        </div>

                        {/* Auto Sync Toggle */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5 shadow-sm">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Live Sync</span>
                            <label className="dp-switch">
                                <input
                                    type="checkbox"
                                    checked={autoSync}
                                    onChange={(e) => setAutoSync(e.target.checked)}
                                    id="toggle-auto-sync"
                                />
                                <span className="dp-slider"></span>
                            </label>
                        </div>

                        {/* PDF Engine Status badge */}
                        <span className={`dp-status-badge ${pdfAvailable ? 'dp-status-ready' : 'dp-status-info'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {pdfAvailable === null ? 'Checking PDF Engine...' : pdfAvailable ? 'PDF Engine: Ready' : 'DOCX only'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                {/* Dashboard Card */}
                <div className="dp-card p-5 space-y-4">
                    {/* Header Details */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Template</span>
                            <h4 className="font-extrabold text-slate-800 text-base mt-0.5">{template?.name || '—'}</h4>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completion</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black text-blue-700">{filledCount} / {totalKeys} fields</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                    {totalKeys > 0 ? Math.round((filledCount / totalKeys) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${totalKeys > 0 ? (filledCount / totalKeys) * 100 : 0}%` }}
                        />
                    </div>

                    {/* Action Buttons & Sync */}
                    <div className="w-full">
                        <button
                            onClick={() => fetchLivePreview()}
                            disabled={isPreviewLoading || !activeTemplateId}
                            className="dp-btn dp-btn-secondary w-full"
                            id="btn-sync-preview"
                            title="Force sync preview"
                        >
                            {isPreviewLoading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H12" />
                                    </svg>
                                    Sync Preview
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Collapsible Variable Summary Card */}
                {totalKeys > 0 && (
                    <div className="dp-card">
                        <button
                            onClick={() => setIsVarsExpanded(!isVarsExpanded)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm">🔍</span>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                    Variable Fill Summary ({filledCount}/{totalKeys})
                                </span>
                            </div>
                            <svg
                                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isVarsExpanded ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isVarsExpanded && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
                                {/* Search input */}
                                <div className="relative mt-3">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                                        🔍
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search variables..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                                    {templateKeys
                                        .filter(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(key => {
                                            const val = data?.[key];
                                            const isEmpty = val === '' || val === null || val === undefined ||
                                                (Array.isArray(val) && val.length === 0);
                                            return (
                                                <div key={key} className="dp-var-row">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isEmpty ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                                        <span className="dp-var-name truncate max-w-[180px]">
                                                            {key.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <span className={`dp-var-value truncate ${isEmpty ? 'dp-var-empty' : ''}`}>
                                                        {isEmpty ? 'empty' : Array.isArray(val) ? `[${val.length} item(s)]` : String(val)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Errors/Success alerts */}
                {lastError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">❌</span>
                        <div>
                            <p className="font-black text-red-800 text-sm mb-1">Action Failed</p>
                            <p className="text-red-600 text-xs leading-relaxed">{lastError}</p>
                        </div>
                    </div>
                )}

                {previewError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div>
                            <p className="font-black text-amber-800 text-sm mb-1">Preview Notice</p>
                            <p className="text-amber-600 text-xs leading-relaxed">{previewError}</p>
                        </div>
                    </div>
                )}



                {!hasDocxFile && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div>
                            <p className="font-black text-amber-800 text-sm mb-1">No DOCX Template Attached</p>
                            <p className="text-amber-600 text-xs leading-relaxed">
                                Upload a <code>.docx</code> file in the Admin Panel to enable preview and downloads.
                            </p>
                        </div>
                    </div>
                )}

                {/* Inline Document Preview Workspace */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Document Preview (Live)
                        </h5>
                        {isPreviewLoading && (
                            <span className="text-[10px] font-bold text-blue-500 animate-pulse">
                                Recompiling...
                            </span>
                        )}
                    </div>

                    <div className="dp-preview-workspace">
                        <div className="dp-paper-container">
                            {/* Loader / Skeletons */}
                            {isPreviewLoading && !previewBlob && (
                                <div className="p-16 space-y-6">
                                    <div className="dp-skeleton-title"></div>
                                    <div className="space-y-3">
                                        <div className="dp-skeleton-line w-full"></div>
                                        <div className="dp-skeleton-line w-[95%]"></div>
                                        <div className="dp-skeleton-line w-[98%]"></div>
                                        <div className="dp-skeleton-line w-[90%]"></div>
                                        <div className="dp-skeleton-line w-[85%]"></div>
                                    </div>
                                    <div className="pt-8 space-y-3">
                                        <div className="dp-skeleton-line w-[40%]"></div>
                                        <div className="dp-skeleton-line w-[45%]"></div>
                                    </div>
                                </div>
                            )}

                            {/* Render Target */}
                            <div
                                ref={previewContainerRef}
                                className="w-full"
                                style={{ display: (!isPreviewLoading || previewBlob) ? 'block' : 'none' }}
                            />

                            {/* Empty Preview Message */}
                            {!previewBlob && !isPreviewLoading && (
                                <div className="text-center py-24 text-slate-400 p-8">
                                    <div className="text-4xl mb-3">📄</div>
                                    <p className="text-xs font-bold uppercase tracking-wider">
                                        No preview loaded
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Fill some fields or click "Sync Preview" to load the document preview.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collapsible Workflow Guide */}
                <div className="dp-card">
                    <button
                        onClick={() => setIsGuideExpanded(!isGuideExpanded)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm">💡</span>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                How It Works
                            </span>
                        </div>
                        <svg
                            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isGuideExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isGuideExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-3.5">
                            <div className="h-4" />
                            {[
                                { step: '1', icon: '📋', title: 'Admin creates DOCX template', desc: 'Standard Word document with {{variable}} placeholders' },
                                { step: '2', icon: '🔍', title: 'Variables auto-extracted', desc: 'System reads all {{vars}} and builds the input form' },
                                { step: '3', icon: '✍️', title: 'User fills in the form', desc: 'Type values for each legal field' },
                                { step: '4', icon: '⚙️', title: 'Backend renders DOCX', desc: 'docxtpl fills all placeholders preserving Word formatting' },
                                { step: '5', icon: '📥', title: 'Download & Open', desc: 'Open in Word for final review and print' },
                            ].map(item => (
                                <div key={item.step} className="flex items-start gap-3">
                                    <span className="w-5.5 h-5.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {item.step}
                                    </span>
                                    <div>
                                        <span className="text-xs font-extrabold text-slate-700">{item.icon} {item.title}</span>
                                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

// Global backward compatibility
window.DocumentPreview = DocumentPreview;
