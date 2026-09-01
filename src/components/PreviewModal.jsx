import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

const PreviewModal = ({ previewRef, previewLoading, previewError, onClose }) => {

    // ── ESC key handler ──
    React.useEffect(() => {
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
    React.useEffect(() => {
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

    // ── Backdrop click handler ──
    const handleBackdropClick = (e) => {
        // Only close if clicking directly on the backdrop, not the modal content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const modalMarkup = (
        <div
            className="preview-modal-backdrop"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Document Preview"
        >
            {/* Modal Container */}
            <div className="preview-modal-container">

                {/* ── Floating Close Button (always visible, top-right) ── */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                    }}
                    className="preview-modal-close-btn"
                    title="Close preview (ESC)"
                    id="btn-preview-close"
                    type="button"
                >
                    <svg className="w-5 h-5 text-gray-500 hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* ── Sticky Top Toolbar ── */}
                <div className="preview-modal-toolbar">
                    <div className="flex items-center gap-2">
                        <span className="text-base">📄</span>
                        <h2 className="font-bold text-gray-800 text-sm">
                            દસ્તાવેજ પૂર્વદર્શન (Document Preview)
                        </h2>
                    </div>
                    <span className="text-xs text-gray-400 font-normal">
                        ESC દબાવીને બંધ કરો
                    </span>
                </div>

                {/* ── Modal Body (Render Area) ── */}
                <div className="preview-modal-body">
                    {/* Loading State */}
                    {previewLoading && (
                        <div className="preview-modal-loading">
                            <div className="preview-modal-spinner"></div>
                            <span className="text-sm font-semibold text-gray-600">
                                પૂર્વદર્શન તૈયાર થઈ રહ્યું છે... (Rendering preview...)
                            </span>
                        </div>
                    )}

                    {/* Error State */}
                    {previewError && !previewLoading && (
                        <div className="preview-modal-error">
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md text-center">
                                ❌ {previewError}
                            </div>
                        </div>
                    )}

                    {/* DOCX Render Target — centered for Gujarati content */}
                    <div className="preview-modal-docx-wrapper">
                        <div
                            ref={previewRef}
                            className="docx-wrapper preview-modal-docx-target"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : modalMarkup;
};

// Global backward compatibility
window.PreviewModal = PreviewModal;
export default PreviewModal;
