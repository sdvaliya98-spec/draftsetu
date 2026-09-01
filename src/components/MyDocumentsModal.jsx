import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CopyIcon } from './Icons.jsx';

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

    const safeFormatDateTime = (dateStr) => {
        if (typeof window.formatIndiaDateTime === 'function') {
            return window.formatIndiaDateTime(dateStr);
        }
        if (typeof formatIndiaDateTime === 'function') {
            return formatIndiaDateTime(dateStr);
        }
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return dateStr;
        }
    };

    // ESC key handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (previewDoc) {
                    setPreviewDoc(null);
                } else if (typeof onClose === 'function') {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewDoc, onClose]);

    // Body scroll lock
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, []);

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

    const getTemplateForDoc = (doc) => {
        const templateId = doc.template_id;
        if (!templateId) return null;
        return templates.find(t => t.id === templateId || t.template_id === templateId) || null;
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

    const modalContent = (
        <div 
            id="my-documents-modal-backdrop" 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && typeof onClose === 'function') {
                    onClose();
                }
            }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] h-[88vh] flex flex-col overflow-hidden animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center flex-shrink-0 relative">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                        📂 My Documents
                    </h2>
                    {toast && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-3 sm:top-4 bg-slate-800 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg animate-fade-in-up z-10">
                            {toast}
                        </div>
                    )}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
                            drafts.length >= 10
                                ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                : drafts.length >= 8
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                            Documents: {drafts.length} / 10
                        </span>
                        <button 
                            onClick={onClose} 
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 text-2xl leading-none p-1 rounded-lg transition bg-transparent border-0 cursor-pointer" 
                            type="button"
                            title="Close"
                        >
                            &times;
                        </button>
                    </div>
                </div>

                {/* Warning Banner */}
                {drafts.length >= 10 && (
                    <div className="bg-rose-50 border-b border-rose-100 px-5 py-2.5 flex items-center gap-2 text-rose-800 text-xs font-semibold flex-shrink-0 animate-fade-in">
                        <span>⚠️</span>
                        <span>Storage limit reached (10/10). Delete old documents to save new ones.</span>
                    </div>
                )}

                {/* Load by Tracking ID */}
                <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-blue-50/60 flex-shrink-0">
                    <p className="text-xs font-semibold text-blue-800 mb-2">📌 Load Draft by Tracking ID</p>
                    <div className="flex gap-2">
                        <input
                            value={trackingInput}
                            onChange={e => { setTrackingInput(e.target.value); setTrackingError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleLoadById()}
                            placeholder="e.g. DOC-A1B2C3D4"
                            className="flex-1 px-3.5 py-2 border border-blue-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                        <button 
                            onClick={handleLoadById} 
                            disabled={loadingById}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-60 cursor-pointer border-0"
                            type="button"
                        >
                            {loadingById ? '...' : 'Load'}
                        </button>
                    </div>
                    {trackingError && <p className="text-xs text-red-600 mt-1.5 font-semibold">{trackingError}</p>}
                </div>

                {/* Draft List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 bg-slate-50/50 custom-scrollbar">
                    {loading ? (
                        <div className="text-center text-slate-400 py-16 flex flex-col items-center gap-2">
                            <span className="text-2xl animate-spin">⏳</span>
                            <span className="text-sm font-medium">Loading documents...</span>
                        </div>
                    ) : drafts.length === 0 ? (
                        <div className="text-center bg-white border border-dashed border-slate-200 rounded-2xl p-12 sm:p-16 text-slate-400">
                            <div className="text-5xl mb-3">📄</div>
                            <h3 className="text-base font-bold text-slate-600 mb-1">No saved documents found</h3>
                            <p className="text-xs text-slate-400">Create and save drafts to access them here anytime.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {drafts.map(d => (
                                <div 
                                    key={d.tracking_id}
                                    className={`bg-white border rounded-xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all shadow-sm
                                        ${d.is_locked
                                            ? 'border-slate-200 opacity-90 cursor-default'
                                            : 'border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer group'}`}
                                    onClick={() => !d.is_locked && onSelectDraft(d)}
                                >
                                    {/* Top Row: Icon, Titles & Status (Left) and Date/Time (Right) */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                                        {/* Left Side: Icon + Title & Metadata */}
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 mt-0.5 shadow-sm
                                                ${d.is_locked ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                {d.is_locked ? '🔒' : '📝'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                {/* Title + Status Badge */}
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <h3 
                                                        className="font-bold text-sm sm:text-base text-slate-800 leading-snug break-words font-gujarati"
                                                        style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
                                                    >
                                                        {getCardTemplateName(d)}
                                                    </h3>
                                                    {d.is_locked ? (
                                                        d.pdf_ready ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 shadow-sm">
                                                                ✅ Verified PDF Ready
                                                            </span>
                                                        ) : d.pdf_generation_in_progress ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-200 shadow-sm animate-pulse">
                                                                ⏳ Preparing Verified PDF...
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-bold border border-rose-200 shadow-sm">
                                                                ❌ PDF Generation Failed
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="inline-flex items-center text-[10px] sm:text-[11px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold uppercase border border-amber-200 shadow-sm">
                                                            DRAFT
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Tracking ID */}
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                    <span className="font-semibold text-slate-700">ID:</span> {d.tracking_id}
                                                </div>
                                                
                                                {/* Line 2: Identity Value */}
                                                {(() => {
                                                    const identity = (d.document_identity && d.document_identity !== '-') ? d.document_identity.trim() : '';
                                                    const templateName = getCardTemplateName(d);
                                                    if (identity && identity !== templateName && identity.toLowerCase() !== 'draft document') {
                                                        return (
                                                            <div className="text-xs sm:text-sm text-slate-700 font-semibold mt-1 break-words">
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
                                                            <div className="text-xs sm:text-sm text-slate-500 mt-0.5 break-words">
                                                                {secondary}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Right Side: Created Date/Time */}
                                        <div className="sm:text-right flex-shrink-0 self-start text-xs text-slate-500 font-sans font-medium bg-slate-50 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none">
                                            <span className="sm:hidden text-slate-400 font-normal mr-1">Created: </span>
                                            {safeFormatDateTime(d.created_at || d.updated_at)}
                                        </div>
                                    </div>

                                    {/* Bottom Row / Action Buttons Toolbar */}
                                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button 
                                                onClick={e => { e.stopPropagation(); setPreviewDoc(d); }}
                                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border-0 cursor-pointer shadow-sm" 
                                                type="button"
                                            >
                                                👁 Preview
                                            </button>
                                            <button 
                                                onClick={e => { e.stopPropagation(); handleDuplicate(d); }}
                                                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 border-0 cursor-pointer shadow-sm"
                                                type="button"
                                            >
                                                <CopyIcon size={12} /> Duplicate
                                            </button>
                                            {!d.is_locked && (
                                                <button 
                                                    onClick={e => { e.stopPropagation(); onSelectDraft(d); }} 
                                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border-0 cursor-pointer shadow-sm" 
                                                    type="button"
                                                >
                                                    ✏️ Edit →
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {d.is_locked && (
                                                <>
                                                    <button 
                                                        onClick={e => { e.stopPropagation(); !isDownloading && handleDownload(d.tracking_id, 'docx'); }}
                                                        disabled={isDownloading}
                                                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center gap-1 border-0 cursor-pointer
                                                            ${isDownloading
                                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}
                                                        type="button"
                                                    >
                                                        ⬇ Download DOCX
                                                    </button>
                                                    <button 
                                                        onClick={e => { e.stopPropagation(); !isDownloading && d.pdf_ready && handleDownload(d.tracking_id, 'pdf'); }}
                                                        disabled={isDownloading || !d.pdf_ready}
                                                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center gap-1 border-0 cursor-pointer
                                                            ${isDownloading || !d.pdf_ready
                                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                            }`}
                                                        type="button"
                                                    >
                                                        ⬇ Download PDF
                                                    </button>
                                                    {!d.pdf_ready && !d.pdf_generation_in_progress && (
                                                        <button 
                                                            onClick={e => { e.stopPropagation(); handleRetryPdf(d.tracking_id); }}
                                                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center gap-1 border-0 cursor-pointer"
                                                            type="button"
                                                        >
                                                            🔄 Retry PDF
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button 
                                                onClick={e => handleDeleteDocument(e, d)}
                                                className="text-xs border border-rose-300 text-rose-600 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-50 hover:border-rose-400 transition flex items-center gap-1 bg-white cursor-pointer shadow-sm"
                                                type="button"
                                            >
                                                🗑 Delete
                                            </button>
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
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-fade-in" 
                    onClick={() => setPreviewDoc(null)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
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
                                <div className="text-[11px] text-slate-500 mt-1">
                                    Created: {safeFormatDateTime(previewDoc.created_at || previewDoc.updated_at)}
                                </div>
                            </div>
                            <button 
                                onClick={() => setPreviewDoc(null)} 
                                className="text-slate-400 hover:text-slate-700 text-2xl leading-none p-1 bg-transparent border-0 cursor-pointer" 
                                type="button"
                                title="Close"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {(() => {
                                try {
                                    const fields = JSON.parse(previewDoc.data_json || '{}');
                                    return (
                                        <table className="w-full text-sm">
                                            <tbody>
                                                {Object.entries(fields).filter(([k]) => k !== 'is_final').map(([k, v]) => (
                                                    <tr key={k} className="border-b border-slate-50">
                                                        <td className="py-2 pr-4 font-semibold text-slate-500 capitalize w-1/3">{k.replace(/_/g, ' ')}</td>
                                                        <td className="py-2 text-slate-800 font-medium">{Array.isArray(v) ? v.map(p => p.name).join(', ') : String(v || '—')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    );
                                } catch { return <p className="text-slate-400">No data available</p>; }
                            })()}
                        </div>
                        {previewDoc.is_locked && (
                            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2 bg-slate-50/50">
                                {!previewDoc.pdf_ready && !previewDoc.pdf_generation_in_progress && (
                                    <button 
                                        onClick={() => handleRetryPdf(previewDoc.tracking_id)}
                                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1 border-0 cursor-pointer"
                                        type="button"
                                    >
                                        🔄 Retry PDF
                                    </button>
                                )}
                                <button 
                                    onClick={e => { handleDeleteDocument(e, previewDoc); setPreviewDoc(null); }}
                                    className="px-3.5 py-2 border border-rose-300 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-50 transition flex items-center gap-1 bg-white cursor-pointer"
                                    type="button"
                                >
                                    🗑 Delete
                                </button>
                                <button 
                                    onClick={() => !isDownloading && handleDownload(previewDoc.tracking_id, 'docx')} 
                                    disabled={isDownloading}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition border-0 cursor-pointer
                                        ${isDownloading
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    type="button"
                                >
                                    ⬇ Download DOCX
                                </button>
                                <button 
                                    onClick={() => !isDownloading && previewDoc.pdf_ready && handleDownload(previewDoc.tracking_id, 'pdf')} 
                                    disabled={isDownloading || !previewDoc.pdf_ready}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition border-0 cursor-pointer
                                        ${isDownloading || !previewDoc.pdf_ready
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                    type="button"
                                >
                                    ⬇ Download PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
};

// Global backward compatibility
window.MyDocumentsModal = MyDocumentsModal;
export default MyDocumentsModal;
