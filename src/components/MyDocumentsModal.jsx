
const MyDocumentsModal = ({ onClose, onSelectDraft, onDraftDeleted, token, templates = [], isDownloading, setIsDownloading }) => {
    const [drafts, setDrafts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [trackingInput, setTrackingInput] = React.useState('');
    const [trackingError, setTrackingError] = React.useState('');
    const [loadingById, setLoadingById] = React.useState(false);
    const [previewDoc, setPreviewDoc] = React.useState(null);
    const [toast, setToast] = React.useState('');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    React.useEffect(() => {
        if (isDownloading) return;
        window.apiFetch('/api/documents/', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(data => { setDrafts(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [token, isDownloading]);

    React.useEffect(() => {
        if (isDownloading) return;
        const hasPending = drafts.some(d => d.is_locked && d.pdf_generation_in_progress);
        if (!hasPending) return;

        const interval = setInterval(() => {
            window.apiFetch('/api/documents/', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => { if (res.ok) return res.json(); throw new Error(); })
                .then(data => { setDrafts(data); })
                .catch(err => console.error("Polling drafts failed", err));
        }, 3000);

        return () => clearInterval(interval);
    }, [drafts, token, isDownloading]);

    React.useEffect(() => {
        if (previewDoc) {
            const updated = drafts.find(d => d.tracking_id === previewDoc.tracking_id);
            if (updated && (
                updated.pdf_ready !== previewDoc.pdf_ready || 
                updated.is_locked !== previewDoc.is_locked ||
                updated.pdf_generation_in_progress !== previewDoc.pdf_generation_in_progress
            )) {
                setPreviewDoc(updated);
            }
        }
    }, [drafts, previewDoc]);

    const handleLoadById = async () => {
        const id = trackingInput.trim().toUpperCase();
        if (!id) return;
        setLoadingById(true); setTrackingError('');
        try {
            const res = await window.apiFetch(`/api/documents/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) { setTrackingError('Document not found or access denied.'); return; }
            const doc = await res.json();
            if (doc.is_locked) { setTrackingError('This document is locked and cannot be edited.'); return; }
            onSelectDraft(doc);
        } catch (err) {
            setTrackingError(err.message === 'SERVER_DOWN'
                ? '❌ Server not running. Start FastAPI on port 8000.'
                : 'Failed to connect to server.');
        }
        finally { setLoadingById(false); }
    };

    const handleDownload = async (trackingId, format = 'pdf') => {
        const fmtUpper = format.toUpperCase();
        try {
            if (setIsDownloading) setIsDownloading(true);
            showToast(`Starting ${fmtUpper} download...`);
            const res = await window.apiFetch(`/api/documents/${trackingId}/download?format=${format}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) {
                if (res.status === 500) {
                    showToast(`${fmtUpper} generation failed.`);
                } else {
                    const errData = await res.json().catch(() => ({}));
                    showToast(errData.detail || `Final ${fmtUpper} not available.`);
                }
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); 
            a.href = url; 
            a.download = `${trackingId}.${format}`; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Download complete!');
        } catch { 
            showToast('Download failed. Please try again.'); 
        } finally {
            if (setIsDownloading) setIsDownloading(false);
        }
    };

    const handleRetryPdf = async (trackingId) => {
        try {
            showToast('Retrying PDF generation...');
            const res = await window.apiFetch(`/api/documents/${trackingId}/retry-pdf`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.detail || 'Failed to retry PDF generation.');
                return;
            }
            showToast('PDF generation restarted!');
            
            // Refresh list
            const draftsRes = await window.apiFetch('/api/documents/', { headers: { 'Authorization': `Bearer ${token}` } });
            if (draftsRes.ok) {
                const data = await draftsRes.json();
                setDrafts(data);
            }
        } catch (err) {
            showToast('Connection error. Failed to retry.');
        }
    };

    const handleDeleteDocument = async (e, doc) => {
        e.preventDefault();
        e.stopPropagation();
        const confirmMsg = doc.is_locked
            ? "Delete this finalized document permanently?"
            : "Are you sure you want to permanently delete this draft?";
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await window.apiFetch(`/api/documents/${doc.tracking_id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to delete document');
            }
            let templateId = null;
            try {
                if (doc.data_json) {
                    const parsed = JSON.parse(doc.data_json);
                    templateId = parsed.template_id;
                }
            } catch (err) {
                console.error("⚠️ [MyDocumentsModal] Failed to parse template_id from data_json", err);
            }
            setDrafts(prev => prev.filter(item => item.tracking_id !== doc.tracking_id));
            if (onDraftDeleted) onDraftDeleted(doc.tracking_id, templateId);
            showToast(doc.is_locked ? 'Document deleted successfully' : 'Draft deleted successfully');
        } catch (err) {
            showToast(`Delete failed: ${err.message}`);
        }
    };

    const handleDuplicate = async (doc) => {
        if (drafts.length >= 10) {
            showToast("❌ Maximum document limit reached");
            return;
        }

        try {
            showToast("Duplicating document...");
            const res = await window.apiFetch(`/api/documents/${doc.tracking_id}/duplicate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.detail === "Maximum document limit reached") {
                    showToast("❌ Maximum document limit reached");
                } else {
                    showToast(data.detail || "Failed to duplicate document.");
                }
                return;
            }

            const newDoc = await res.json();
            showToast("✅ Document duplicated successfully");

            // Refresh documents list
            const draftsRes = await window.apiFetch('/api/documents/', { headers: { 'Authorization': `Bearer ${token}` } });
            if (draftsRes.ok) {
                const data = await draftsRes.json();
                setDrafts(data);
            }

            // UX Enhancement: Automatically open duplicated draft in editor
            setTimeout(() => {
                onSelectDraft(newDoc);
            }, 1000);

        } catch (err) {
            showToast("Connection error. Failed to duplicate.");
        }
    };

    const getDocumentTitle = (doc) => {
        try {
            const data = JSON.parse(doc.data_json || '{}');

            // 1. document_summary.title
            if (data.document_summary) {
                let summary = data.document_summary;
                if (typeof summary === 'string') {
                    try {
                        summary = JSON.parse(summary);
                    } catch (e) {}
                }
                if (summary && summary.title) {
                    return summary.title;
                }
            }

            // 2. stored document_name column or field in data
            if (doc.document_name) {
                return doc.document_name;
            }
            if (data.document_name) {
                return data.document_name;
            }

            // 3. template display name
            const templateId = data.template_id || doc.template_id;
            if (templateId) {
                const match = templates.find(t => t.id === templateId || t.template_id === templateId);
                if (match && match.name) {
                    return match.name;
                }
                const fallbackMap = {
                    'sale_deed_simple': 'વેચાણ દસ્તાવેજ (Sale Deed)',
                    'varasai_pedhinamu': 'વારસાઈ આંબો / પેઢીનામું (Pedhinamu)'
                };
                if (fallbackMap[templateId]) {
                    return fallbackMap[templateId];
                }
            }

            // 4. template_id
            if (templateId) {
                return templateId;
            }

            // 5. "Draft Document"
            return 'Draft Document';
        } catch (err) {
            if (doc.document_name) return doc.document_name;
            const templateId = doc.template_id;
            if (templateId) return templateId;
            return 'Draft Document';
        }
    };

    const getPreviewFields = (doc) => {
        try {
            const data = JSON.parse(doc.data_json || '{}');
            const priorities = [
                { key: 'APPLICANT_NAME', label: 'Applicant' },
                { key: 'BUYER_NAME', label: 'Buyer' },
                { key: 'SELLER_NAME', label: 'Seller' },
                { key: 'DECEASED_PERSON_NAME', label: 'Deceased' },
                { key: 'VILLAGE_NAME', label: 'Village' },
                { key: 'SURVEY_NO', label: 'Survey' },
                { key: 'ACCOUNT_NO', label: 'Account' }
            ];

            let found = [];
            const keys = Object.keys(data);
            for (let p of priorities) {
                const keyMatch = keys.find(k => k.toLowerCase() === p.key.toLowerCase());
                if (keyMatch && data[keyMatch]) {
                    found.push({ label: p.label, value: data[keyMatch] });
                }
                if (found.length >= 2) break;
            }

            if (found.length === 0) {
                return [{ label: 'Document', value: getDocumentTitle(doc) }];
            }
            return found;
        } catch {
            return [{ label: 'Document', value: getDocumentTitle(doc) }];
        }
    };

    const getTemplateForDoc = (doc) => {
        const templateId = doc.template_id;
        if (!templateId) return null;
        return templates.find(t => t.id === templateId || t.template_id === templateId) || null;
    };

    const hasIdentityConfig = (doc) => {
        const tpl = getTemplateForDoc(doc);
        return !!(tpl && (tpl.document_identity_field || tpl.document_secondary_field));
    };

    const getCardTemplateName = (doc) => {
        if (doc.template_name) return doc.template_name;
        const tpl = getTemplateForDoc(doc);
        if (tpl && tpl.name) return tpl.name;
        const templateId = doc.template_id;
        const fallbackMap = {
            'sale_deed_simple': 'વેચાણ દસ્તાવેજ (Sale Deed)',
            'varasai_pedhinamu': 'વારસાઈ આંબો / પેઢીનામું (Pedhinamu)'
        };
        if (templateId && fallbackMap[templateId]) {
            return fallbackMap[templateId];
        }
        return templateId || "Unknown Template";
    };

    const resolveFieldValue = (data, path) => {
        if (!path || !data) return null;
        const parts = path.split('.');
        let current = data;
        for (let part of parts) {
            if (current && typeof current === 'object' && !Array.isArray(current)) {
                if (part in current) {
                    current = current[part];
                } else {
                    let matched = false;
                    for (let k of Object.keys(current)) {
                        if (k.toLowerCase() === part.toLowerCase()) {
                            current = current[k];
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) return null;
                }
            } else if (Array.isArray(current)) {
                const idx = parseInt(part, 10);
                if (!isNaN(idx) && idx >= 0 && idx < current.length) {
                    current = current[idx];
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
        return current;
    };

    const getDocumentIdentity = (doc) => {
        const tpl = getTemplateForDoc(doc);
        const identityField = tpl ? tpl.document_identity_field : null;
        if (identityField) {
            try {
                const data = JSON.parse(doc.data_json || '{}');
                const val = resolveFieldValue(data, identityField);
                if (val !== null && val !== undefined && String(val).trim() !== "") {
                    return String(val).trim();
                }
            } catch (e) {}
        }
        return doc.document_identity || "";
    };

    const getDocumentSecondary = (doc) => {
        const tpl = getTemplateForDoc(doc);
        const secondaryField = tpl ? tpl.document_secondary_field : null;
        if (secondaryField) {
            try {
                const data = JSON.parse(doc.data_json || '{}');
                const val = resolveFieldValue(data, secondaryField);
                if (val !== null && val !== undefined && String(val).trim() !== "") {
                    return String(val).trim();
                }
            } catch (e) {}
        }
        return doc.document_secondary || "";
    };

    const getIdentityLabel = (doc) => {
        const tpl = getTemplateForDoc(doc);
        const field = tpl ? tpl.document_identity_field : null;
        if (!field) return "Primary";
        if (field.includes('.')) {
            const parts = field.split('.');
            const lastPart = parts[parts.length - 1];
            const cleanKey = lastPart.toLowerCase();
            if (window.REPEATER_FIELD_LABELS && window.REPEATER_FIELD_LABELS[cleanKey]) {
                return window.REPEATER_FIELD_LABELS[cleanKey];
            }
            return lastPart.replace(/_/g, ' ');
        }
        const fieldConfig = tpl?.fields?.[field];
        return fieldConfig?.label || field.replace(/_/g, ' ');
    };

    const getSecondaryLabel = (doc) => {
        const tpl = getTemplateForDoc(doc);
        const field = tpl ? tpl.document_secondary_field : null;
        if (!field) return "Secondary";
        if (field.includes('.')) {
            const parts = field.split('.');
            const lastPart = parts[parts.length - 1];
            const cleanKey = lastPart.toLowerCase();
            if (window.REPEATER_FIELD_LABELS && window.REPEATER_FIELD_LABELS[cleanKey]) {
                return window.REPEATER_FIELD_LABELS[cleanKey];
            }
            return lastPart.replace(/_/g, ' ');
        }
        const fieldConfig = tpl?.fields?.[field];
        return fieldConfig?.label || field.replace(/_/g, ' ');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0 relative">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        📂 My Documents
                    </h2>
                    {toast && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-gray-800 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg animate-fade-in-up">
                            {toast}
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all duration-300 ${
                            drafts.length >= 10
                                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                : drafts.length >= 8
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                            Documents: {drafts.length} / 10
                        </span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none bg-transparent border-0 cursor-pointer" type="button">&times;</button>
                    </div>
                </div>
                {/* Warning Banner */}
                {drafts.length >= 10 && (
                    <div className="bg-rose-50 border-b border-rose-100 px-5 py-2.5 flex items-center gap-2 text-rose-800 text-xs font-semibold flex-shrink-0 animate-fade-in">
                        <span>⚠️</span>
                        <span>Storage limit reached. Delete old documents to save new ones.</span>
                    </div>
                )}
                {/* Load by Tracking ID */}
                <div className="px-5 py-3 border-b border-gray-100 bg-blue-50 flex-shrink-0">
                    <p className="text-xs font-semibold text-blue-700 mb-2">📌 Load Draft by Tracking ID</p>
                    <div className="flex gap-2">
                        <input
                            value={trackingInput}
                            onChange={e => { setTrackingInput(e.target.value); setTrackingError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleLoadById()}
                            placeholder="e.g. DOC-A1B2C3D4"
                            className="flex-1 px-3 py-1.5 border border-blue-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500 bg-white"
                        />
                        <button onClick={handleLoadById} disabled={loadingById}
                            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                            type="button"
                        >
                            {loadingById ? '...' : 'Load'}
                        </button>
                    </div>
                    {trackingError && <p className="text-xs text-red-600 mt-1 font-semibold">{trackingError}</p>}
                </div>
                {/* Draft List */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50 custom-scrollbar">
                    {loading ? (
                        <div className="text-center text-gray-400 py-12">Loading documents...</div>
                    ) : drafts.length === 0 ? (
                        <div className="text-center bg-white border border-dashed border-gray-200 rounded-xl p-12 text-gray-400">
                            <div className="text-4xl mb-2">📄</div>
                            No saved drafts found
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {drafts.map(d => (
                                <div key={d.tracking_id}
                                    className={`bg-white border rounded-xl p-4 flex justify-between items-center transition
                                        ${d.is_locked
                                            ? 'border-gray-200 opacity-70 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer group'}`}
                                    onClick={() => !d.is_locked && onSelectDraft(d)}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-0.5
                                            ${d.is_locked ? 'bg-gray-100' : 'bg-blue-50'}`}>
                                            {d.is_locked ? '🔒' : '📝'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-bold text-sm text-gray-800">
                                                    {getCardTemplateName(d)}
                                                </span>
                                                {d.is_locked
                                                    ? (
                                                        d.pdf_ready
                                                            ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200 shadow-sm">✅ Verified PDF Ready</span>
                                                            : d.pdf_generation_in_progress
                                                                ? <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200 shadow-sm animate-pulse">⏳ Preparing Verified PDF...</span>
                                                                : <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200 shadow-sm">❌ PDF Generation Failed</span>
                                                      )
                                                    : <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">DRAFT</span>
                                                }
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono mb-2 flex items-center gap-1">
                                                <span className="font-semibold text-gray-700">ID:</span> {d.tracking_id}
                                            </div>
                                            
                                            {/* Line 2: Identity Value */}
                                            {(() => {
                                                const identity = (d.document_identity && d.document_identity !== '-') ? d.document_identity.trim() : '';
                                                const templateName = getCardTemplateName(d);
                                                if (identity && identity !== templateName && identity.toLowerCase() !== 'draft document') {
                                                    return (
                                                        <div className="text-sm text-gray-700 font-semibold mt-1">
                                                            {identity}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Line 3: Secondary Value */}
                                            {(() => {
                                                const secondary = (d.document_secondary && d.document_secondary !== '-') ? d.document_secondary.trim() : '';
                                                const templateName = getCardTemplateName(d);
                                                const identity = (d.document_identity && d.document_identity !== '-') ? d.document_identity.trim() : '';
                                                const hasSec = d.has_secondary;
                                                if (hasSec && secondary && secondary !== templateName && secondary !== identity && secondary.toLowerCase() !== 'draft document') {
                                                    return (
                                                        <div className="text-sm text-gray-500 mt-0.5">
                                                            {secondary}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <div className="text-xs text-gray-400 mb-2 font-sans font-semibold">
                                            {formatIndiaDateTime(d.created_at || d.updated_at)}
                                        </div>
                                        <div className="flex gap-1.5 justify-end">
                                            <button onClick={e => { e.stopPropagation(); setPreviewDoc(d); }}
                                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg font-bold hover:bg-gray-200 transition border-0 cursor-pointer" type="button">Preview</button>
                                            <button onClick={e => { e.stopPropagation(); handleDuplicate(d); }}
                                                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 border-0 cursor-pointer"
                                                type="button"
                                            >
                                                <CopyIcon size={12} /> Duplicate
                                            </button>
                                            {d.is_locked
                                                ? (
                                                    <>
                                                        <button onClick={e => { e.stopPropagation(); !isDownloading && handleDownload(d.tracking_id, 'docx'); }}
                                                            disabled={isDownloading}
                                                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center gap-1 border-0 cursor-pointer
                                                                ${isDownloading
                                                                    ? 'bg-gray-300 text-gray-400 cursor-not-allowed opacity-60' 
                                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                }`}
                                                            type="button"
                                                        >⬇ Download DOCX</button>
                                                        <button onClick={e => { e.stopPropagation(); !isDownloading && d.pdf_ready && handleDownload(d.tracking_id, 'pdf'); }}
                                                            disabled={isDownloading || !d.pdf_ready}
                                                            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center gap-1 border-0 cursor-pointer
                                                                ${isDownloading || !d.pdf_ready
                                                                    ? 'bg-gray-300 text-gray-400 cursor-not-allowed opacity-60' 
                                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                                }`}
                                                            type="button"
                                                        >⬇ Download PDF</button>
                                                        {!d.pdf_ready && !d.pdf_generation_in_progress && (
                                                            <button onClick={e => { e.stopPropagation(); handleRetryPdf(d.tracking_id); }}
                                                                className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-lg font-bold transition shadow-sm flex items-center gap-1 border-0 cursor-pointer"
                                                                type="button"
                                                            >
                                                                🔄 Retry PDF
                                                            </button>
                                                        )}
                                                        <button onClick={e => handleDeleteDocument(e, d)}
                                                            className="text-xs border border-red-500 text-red-500 px-2 py-1.5 rounded-lg font-bold hover:bg-red-50 transition flex items-center gap-1 bg-transparent cursor-pointer"
                                                            type="button"
                                                        >
                                                            🗑 Delete
                                                        </button>
                                                    </>
                                                )
                                                : (
                                                    <>
                                                        <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-bold hover:bg-blue-700 transition opacity-0 group-hover:opacity-100 border-0 cursor-pointer" type="button">Edit →</button>
                                                        <button onClick={e => handleDeleteDocument(e, d)} className="text-xs border border-red-500 text-red-500 px-2 py-1 rounded-lg font-bold hover:bg-red-50 transition opacity-0 group-hover:opacity-100 bg-transparent cursor-pointer" type="button">🗑 Delete</button>
                                                    </>
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setPreviewDoc(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-blue-600">{previewDoc.tracking_id}</span>
                                    {previewDoc.is_locked 
                                        ? (
                                            previewDoc.pdf_ready
                                                ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Verified PDF Ready</span>
                                                : previewDoc.pdf_generation_in_progress
                                                    ? <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold animate-pulse">⏳ Preparing Verified PDF...</span>
                                                    : <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">❌ PDF Generation Failed</span>
                                          )
                                        : <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">Draft</span>
                                    }
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">
                                    Created: {formatIndiaDateTime(previewDoc.created_at || previewDoc.updated_at)}
                                </div>
                            </div>
                            <button onClick={() => setPreviewDoc(null)} className="text-gray-400 text-2xl bg-transparent border-0 cursor-pointer" type="button">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {(() => {
                                try {
                                    const fields = JSON.parse(previewDoc.data_json || '{}');
                                    return (<table className="w-full text-sm"><tbody>{Object.entries(fields).filter(([k]) => k !== 'is_final').map(([k, v]) => (<tr key={k} className="border-b border-gray-50"><td className="py-2 pr-4 font-semibold text-gray-500 capitalize w-1/3">{k.replace(/_/g, ' ')}</td><td className="py-2 text-gray-800 font-medium">{Array.isArray(v) ? v.map(p => p.name).join(', ') : String(v || '—')}</td></tr>))}</tbody></table>);
                                } catch { return <p className="text-gray-400">No data available</p>; }
                            })()}
                        </div>
                        {previewDoc.is_locked && (
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                                {!previewDoc.pdf_ready && !previewDoc.pdf_generation_in_progress && (
                                    <button onClick={() => handleRetryPdf(previewDoc.tracking_id)}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow transition flex items-center gap-1 border-0 cursor-pointer"
                                        type="button"
                                    >
                                        🔄 Retry PDF
                                    </button>
                                )}
                                <button onClick={e => { handleDeleteDocument(e, previewDoc); setPreviewDoc(null); }}
                                    className="px-4 py-2 border border-red-500 text-red-500 rounded-lg font-bold hover:bg-red-50 transition flex items-center gap-1 bg-transparent cursor-pointer"
                                    type="button"
                                >
                                    🗑 Delete
                                </button>
                                <button onClick={() => !isDownloading && handleDownload(previewDoc.tracking_id, 'docx')} 
                                    disabled={isDownloading}
                                    className={`px-4 py-2 rounded-lg font-bold shadow transition border-0 cursor-pointer
                                        ${isDownloading
                                            ? 'bg-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    type="button"
                                >⬇ Download DOCX</button>
                                <button onClick={() => !isDownloading && previewDoc.pdf_ready && handleDownload(previewDoc.tracking_id, 'pdf')} 
                                    disabled={isDownloading || !previewDoc.pdf_ready}
                                    className={`px-4 py-2 rounded-lg font-bold shadow transition border-0 cursor-pointer
                                        ${isDownloading || !previewDoc.pdf_ready
                                            ? 'bg-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                    type="button"
                                >⬇ Download PDF</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Global backward compatibility
window.MyDocumentsModal = MyDocumentsModal;
