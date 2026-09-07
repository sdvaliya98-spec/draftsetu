import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DraftSetu Custom Dialog System
 * Replaces native browser alert(), confirm(), and prompt() dialogs
 * with rich, accessible, Gujarati-aware, responsive DraftSetu modals.
 */

let dialogHandler = null;

export const showConfirmDialog = ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    subtitle = null,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning' | 'danger' | 'info' | 'success' | 'primary'
    icon = null,
    isDestructive = false,
    closeOnOverlayClick = false
} = {}) => {
    if (dialogHandler) {
        return dialogHandler({
            mode: 'confirm',
            title,
            message,
            subtitle,
            confirmText,
            cancelText,
            type: isDestructive ? 'danger' : type,
            icon,
            closeOnOverlayClick
        });
    }
    // Fallback if dialog container is unmounted
    return Promise.resolve(window.confirm(typeof message === 'string' ? message : title));
};

export const showAlertDialog = ({
    title = 'Notice',
    message = '',
    subtitle = null,
    confirmText = 'OK',
    type = 'info', // 'info' | 'success' | 'warning' | 'error' | 'danger'
    icon = null,
    closeOnOverlayClick = true
} = {}) => {
    if (dialogHandler) {
        return dialogHandler({
            mode: 'alert',
            title,
            message,
            subtitle,
            confirmText,
            type: type === 'error' ? 'danger' : type,
            icon,
            closeOnOverlayClick
        });
    }
    // Fallback if dialog container is unmounted
    window.alert(typeof message === 'string' && message ? `${title ? title + '\n\n' : ''}${message}` : title);
    return Promise.resolve(true);
};

export const showPromptDialog = ({
    title = 'Input Required',
    message = '',
    subtitle = null,
    defaultValue = '',
    placeholder = 'Enter value...',
    confirmText = 'Submit',
    cancelText = 'Cancel',
    type = 'primary',
    icon = null,
    closeOnOverlayClick = false
} = {}) => {
    if (dialogHandler) {
        return dialogHandler({
            mode: 'prompt',
            title,
            message,
            subtitle,
            defaultValue,
            placeholder,
            confirmText,
            cancelText,
            type,
            icon,
            closeOnOverlayClick
        });
    }
    // Fallback
    return Promise.resolve(window.prompt(message || title, defaultValue));
};

// Global backward compatibility
if (typeof window !== 'undefined') {
    window.showConfirmDialog = showConfirmDialog;
    window.showAlertDialog = showAlertDialog;
    window.showPromptDialog = showPromptDialog;
}

const TYPE_CONFIG = {
    danger: {
        iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
        defaultIcon: '🗑️',
        confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 focus:ring-rose-500',
        badgeColor: 'bg-rose-100 text-rose-800'
    },
    warning: {
        iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
        defaultIcon: '⚠️',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 focus:ring-amber-500',
        badgeColor: 'bg-amber-100 text-amber-800'
    },
    success: {
        iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        defaultIcon: '✅',
        confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 focus:ring-emerald-500',
        badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    info: {
        iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
        defaultIcon: 'ℹ️',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 focus:ring-blue-500',
        badgeColor: 'bg-blue-100 text-blue-800'
    },
    primary: {
        iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        defaultIcon: '📋',
        confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 focus:ring-indigo-500',
        badgeColor: 'bg-indigo-100 text-indigo-800'
    }
};

export const CustomDialogContainer = () => {
    const [dialog, setDialog] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const resolverRef = useRef(null);
    const confirmBtnRef = useRef(null);
    const inputRef = useRef(null);

    const openDialog = useCallback((config) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setInputValue(config.defaultValue || '');
            setIsLoading(false);
            setDialog(config);
        });
    }, []);

    useEffect(() => {
        dialogHandler = openDialog;
        return () => {
            dialogHandler = null;
        };
    }, [openDialog]);

    const handleConfirm = useCallback(() => {
        if (isLoading) return;
        if (dialog?.mode === 'prompt') {
            const val = inputValue;
            setDialog(null);
            if (resolverRef.current) resolverRef.current(val);
        } else {
            setDialog(null);
            if (resolverRef.current) resolverRef.current(true);
        }
    }, [dialog, inputValue, isLoading]);

    const handleCancel = useCallback(() => {
        if (isLoading) return;
        setDialog(null);
        if (resolverRef.current) {
            if (dialog?.mode === 'prompt') {
                resolverRef.current(null);
            } else {
                resolverRef.current(false);
            }
        }
    }, [dialog, isLoading]);

    // Keyboard handling
    useEffect(() => {
        if (!dialog) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            } else if (e.key === 'Enter' && dialog.mode !== 'prompt') {
                e.preventDefault();
                handleConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dialog, handleCancel, handleConfirm]);

    // Focus management
    useEffect(() => {
        if (!dialog) return;
        const timer = setTimeout(() => {
            if (dialog.mode === 'prompt' && inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            } else if (confirmBtnRef.current) {
                confirmBtnRef.current.focus();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [dialog]);

    if (!dialog) return null;

    const theme = TYPE_CONFIG[dialog.type] || TYPE_CONFIG.info;
    const displayIcon = dialog.icon || theme.defaultIcon;

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100000] p-4 font-sans animate-fade-in"
            onClick={() => {
                if (dialog.closeOnOverlayClick) {
                    handleCancel();
                }
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-modal border border-slate-100 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center space-y-4">
                    {/* Icon Badge */}
                    <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-inner border ${theme.iconBg}`}>
                        {displayIcon}
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
                            {dialog.title}
                        </h3>
                        {dialog.subtitle && (
                            <span className={`inline-block mt-1.5 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full ${theme.badgeColor}`}>
                                {dialog.subtitle}
                            </span>
                        )}
                    </div>

                    {/* Message Box */}
                    {dialog.message && (
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 text-center text-xs text-slate-700 space-y-2 leading-relaxed whitespace-pre-line font-medium">
                            {dialog.message}
                        </div>
                    )}

                    {/* Prompt Input Mode */}
                    {dialog.mode === 'prompt' && (
                        <div className="mt-2 text-left">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleConfirm();
                                    }
                                }}
                                placeholder={dialog.placeholder || 'Enter value...'}
                                className="w-full px-4 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
                    {(dialog.mode === 'confirm' || dialog.mode === 'prompt') && (
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={handleCancel}
                            className="px-5 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-600 hover:bg-white hover:text-slate-800 transition-all uppercase tracking-widest disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
                        >
                            {dialog.cancelText || 'Cancel'}
                        </button>
                    )}
                    <button
                        ref={confirmBtnRef}
                        type="button"
                        disabled={isLoading}
                        onClick={handleConfirm}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${theme.confirmBtn}`}
                    >
                        {isLoading ? (
                            <>
                                <span className="inline-block animate-spin text-xs">⏳</span>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>{dialog.confirmText || 'OK'}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomDialogContainer;
