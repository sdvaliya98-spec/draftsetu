
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

    return (
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
                    title="બંધ કરો (Close) — ESC"
                    aria-label="Close preview modal"
                    id="btn-preview-close"
                    type="button"
                >
                    <span aria-hidden="true">×</span>
                </button>

                {/* ── Modal Header ── */}
                <div className="preview-modal-header">
                    <div className="preview-modal-header-left">
                        <span className="preview-modal-header-icon">👁️</span>
                        <div>
                            <h2 className="preview-modal-title">
                                દસ્તાવેજ પૂર્વદર્શન
                            </h2>
                            <p className="preview-modal-subtitle">Document Preview</p>
                        </div>
                    </div>
                    <div className="preview-modal-header-hint">
                        <kbd>ESC</kbd> to close
                    </div>
                </div>

                {/* ── Modal Content ── */}
                <div className="preview-modal-body custom-scrollbar">
                    {/* Loading Overlay */}
                    {previewLoading && (
                        <div className="preview-modal-loading">
                            <div className="preview-modal-spinner"></div>
                            <p className="preview-modal-loading-text">
                                દસ્તાવેજ લોડ થઈ રહ્યો છે...
                            </p>
                            <p className="preview-modal-loading-subtext">
                                Loading document preview...
                            </p>
                        </div>
                    )}

                    {/* Error Display */}
                    {previewError && (
                        <div className="preview-modal-error">
                            <span className="preview-modal-error-icon">❌</span>
                            <div>
                                <p className="preview-modal-error-title">ભૂલ (Preview Error)</p>
                                <p className="preview-modal-error-detail">{previewError}</p>
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
};

// Global backward compatibility
window.PreviewModal = PreviewModal;
