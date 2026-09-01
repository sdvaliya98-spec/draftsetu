import React, { useState, useEffect, useRef } from 'react';

const ensureTinyMCELoaded = () => {
    if (window.tinymce) return Promise.resolve();
    if (window._tinymceLoadingPromise) return window._tinymceLoadingPromise;
    window._tinymceLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tinymce@6.8.3/tinymce.min.js';
        script.referrerPolicy = 'origin';
        script.onload = () => resolve();
        script.onerror = () => {
            console.error("Failed to load TinyMCE script dynamically.");
            window._tinymceLoadingPromise = null;
            reject(new Error("FAILED_TO_LOAD_TINYMCE"));
        };
        document.head.appendChild(script);
    });
    return window._tinymceLoadingPromise;
};

const Editor = ({ value, onEditorChange, init }) => {
    const textareaRef = React.useRef(null);
    const editorRef = React.useRef(null);
    const isSettingValueRef = React.useRef(false);
    const valueRef = React.useRef(value);
    valueRef.current = value;
    const [editorId] = React.useState(() => 'tinymce-editor-' + Math.random().toString(36).substring(2, 9));
    const [isReady, setIsReady] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const [retryKey, setRetryKey] = React.useState(0);

    React.useEffect(() => {
        let isCancelled = false;
        let activeEditor = null;
        setHasError(false);

        const initializeEditor = () => {
            if (isCancelled || !window.tinymce) return;
            const el = document.getElementById(editorId);
            if (!el) return;

            window.tinymce.init({
                ...init,
                selector: `#${editorId}`,
                setup: (editor) => {
                    activeEditor = editor;
                    editorRef.current = editor;
                    
                    editor.on('init', () => {
                        if (isCancelled) return;
                        const contentToSet = (valueRef.current !== undefined && valueRef.current !== null)
                            ? valueRef.current
                            : (el.value || '');
                        editor.setContent(contentToSet);
                        setIsReady(true);
                    });

                    editor.on('change keyup undo redo input', () => {
                        const content = editor.getContent();
                        if (onEditorChange) {
                            isSettingValueRef.current = true;
                            onEditorChange(content);
                            isSettingValueRef.current = false;
                        }
                    });
                }
            });
        };

        ensureTinyMCELoaded()
            .then(() => {
                if (!isCancelled) {
                    setTimeout(initializeEditor, 30);
                }
            })
            .catch((err) => {
                if (!isCancelled) {
                    console.error("TinyMCE loading error:", err);
                    setHasError(true);
                }
            });

        return () => {
            isCancelled = true;
            if (activeEditor && window.tinymce) {
                try {
                    window.tinymce.remove(activeEditor);
                } catch (e) {
                    console.warn("Error removing TinyMCE editor instance:", e);
                }
            }
        };
    }, [editorId, retryKey]);

    React.useEffect(() => {
        if (editorRef.current && value !== undefined && !isSettingValueRef.current) {
            const currentContent = editorRef.current.getContent();
            if (value !== currentContent) {
                editorRef.current.setContent(value || '');
            }
        }
    }, [value]);

    const handleRetry = () => {
        window._tinymceLoadingPromise = null;
        setHasError(false);
        setIsReady(false);
        setRetryKey(k => k + 1);
    };

    return (
        <div className="relative w-full min-h-[480px] flex flex-col justify-center">
            {/* Loading Placeholder */}
            {!isReady && !hasError && (
                <div className="absolute inset-0 bg-slate-50/90 rounded-2xl flex flex-col items-center justify-center gap-3 p-8 z-10 animate-pulse border border-slate-100">
                    <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-700 font-gujarati">રિચ ટેક્સ્ટ એડિટર લોડ થઈ રહ્યું છે...</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Rich Text Editor...</p>
                </div>
            )}

            {/* Error Fallback */}
            {hasError && (
                <div className="absolute inset-0 bg-rose-50/95 rounded-2xl flex flex-col items-center justify-center gap-3 p-8 z-10 border border-rose-100 text-center">
                    <span className="text-3xl">⚠️</span>
                    <p className="text-sm font-bold text-rose-800 font-gujarati">રિચ ટેક્સ્ટ એડિટર લોડ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.</p>
                    <p className="text-xs text-rose-500 font-semibold">Failed to load Rich Text Editor.</p>
                    <button
                        type="button"
                        onClick={handleRetry}
                        className="mt-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-sm cursor-pointer"
                    >
                        ફરી પ્રયાસ કરો (Retry)
                    </button>
                </div>
            )}

            {/* Target textarea for TinyMCE initialization */}
            <textarea
                id={editorId}
                ref={textareaRef}
                defaultValue={value || ''}
                style={{
                    width: '100%',
                    minHeight: '450px',
                    padding: '16px',
                    border: 'none',
                    outline: 'none',
                    resize: 'vertical',
                    opacity: isReady ? 1 : 0
                }}
            />
        </div>
    );
};

const RichTextEditor = ({ value, onChange }) => {
    return (
        <div className="rich-text-editor-wrapper w-full min-h-[480px] rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col">
            <Editor
                value={value}
                onEditorChange={(content) => {
                    onChange(content);
                }}
                init={{
                    height: 480,
                    min_height: 450,
                    menubar: 'file edit view insert format tools table help',
                    plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount', 'pagebreak'
                    ],
                    toolbar: 'undo redo | fontfamily fontsize | ' +
                        'bold italic underline strikethrough | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist | outdent indent | ' +
                        'forecolor backcolor | table pagebreak | code removeformat | fullscreen',
                    font_family_formats: 'Gujarati (Noto Sans)="Noto Sans Gujarati",sans-serif; Gujarati (Shruti)=Shruti,sans-serif; Arial=arial,helvetica,sans-serif;',
                    content_style: `
                        body { 
                            font-family: 'Noto Sans Gujarati', 'Shruti', sans-serif;
                            font-size: 14pt;
                            line-height: 1.5;
                            letter-spacing: 0px;
                            word-spacing: 0px;
                            margin: 0;
                            padding: 20px;
                            box-sizing: border-box;
                            overflow-wrap: break-word;
                            background: #ffffff;
                            color: #1f2937;
                        }
                    `,
                    forced_root_block: 'div',
                    entity_encoding: "raw",
                    skin: 'oxide',
                    branding: false,
                    promotion: false,
                    statusbar: true
                }}
            />
        </div>
    );
};

// Global backward compatibility
window.RichTextEditor = RichTextEditor;
export default RichTextEditor;

