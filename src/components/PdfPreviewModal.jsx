import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

const PdfPreviewModal = ({ pdfUrl, onClose, activeTemplateId }) => {
    const [zoom, setZoom] = useState(100);

    // ── ESC key handler ──
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // ── Body scroll lock ──
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;

        // Calculate scrollbar width to prevent layout shift
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

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 50));
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `preview_${activeTemplateId || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const modalMarkup = (
        <div
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 md:p-6"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="PDF Preview"
        >
            {/* Modal Container */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
                
                {/* ── Sticky Top Toolbar ── */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-white shrink-0">
                    
                    {/* Left: Title */}
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📄</span>
                        <div>
                            <h2 className="font-black text-white text-base tracking-tight">
                                દસ્તાવેજ પીડીએફ પૂર્વદર્શન
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-sans">
                                PDF Document Layout Preview
                            </p>
                        </div>
                    </div>

                    {/* Middle: Controls */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                            <button
                                onClick={handleZoomOut}
                                disabled={zoom <= 50}
                                className="p-2 text-slate-300 hover:text-white disabled:opacity-40 hover:bg-slate-700 rounded-lg transition-all"
                                title="Zoom Out"
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                                </svg>
                            </button>
                            <span className="px-3 text-xs font-black text-slate-300 w-12 text-center font-sans">
                                {zoom}%
                            </span>
                            <button
                                onClick={handleZoomIn}
                                disabled={zoom >= 200}
                                className="p-2 text-slate-300 hover:text-white disabled:opacity-40 hover:bg-slate-700 rounded-lg transition-all"
                                title="Zoom In"
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        <button
                            onClick={handleDownload}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 font-sans"
                            title="Download PDF"
                            type="button"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Download PDF</span>
                        </button>
                    </div>

                    {/* Right: Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-xl transition-all"
                        title="બંધ કરો (Close) — ESC"
                        id="btn-pdf-preview-close"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── Modal Body (PDF Viewer) ── */}
                <div className="flex-1 bg-slate-800 overflow-auto p-6 flex justify-center items-start custom-scrollbar">
                    <div
                        style={{
                            width: `${zoom}%`,
                            height: '100%',
                            minHeight: '75vh',
                            transition: 'width 0.2s ease'
                        }}
                        className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        <object
                            data={pdfUrl}
                            type="application/pdf"
                            className="w-full h-full min-h-[75vh] flex-1 rounded-xl"
                            aria-label="PDF Document Preview"
                        >
                            <iframe
                                src={`${pdfUrl}#toolbar=1`}
                                className="w-full h-full border-0 min-h-[75vh]"
                                title="PDF Preview Viewer"
                            >
                                <div className="p-8 text-center text-slate-700 font-sans">
                                    <p className="mb-3 font-bold">
                                        તમારું બ્રાઉઝર સીધું PDF પૂર્વદર્શન દર્શાવી શકતું નથી.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-md"
                                    >
                                        📄 PDF ડાઉનલોડ કરો (Download PDF)
                                    </button>
                                </div>
                            </iframe>
                        </object>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
};

// Global backward compatibility
window.PdfPreviewModal = PdfPreviewModal;
export default PdfPreviewModal;
