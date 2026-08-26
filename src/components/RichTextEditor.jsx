const Editor = ({ value, onEditorChange, init }) => {
    const textareaRef = React.useRef(null);
    const editorRef = React.useRef(null);
    const isSettingValueRef = React.useRef(false);
    const valueRef = React.useRef(value);
    valueRef.current = value;
    const [editorId] = React.useState(() => 'tinymce-editor-' + Math.random().toString(36).substring(2, 9));

    React.useEffect(() => {
        if (!window.tinymce) {
            console.warn("TinyMCE is not loaded on window.");
            return;
        }

        let activeEditor = null;
        const timer = setTimeout(() => {
            const el = document.getElementById(editorId);
            if (!el) return;

            window.tinymce.init({
                ...init,
                selector: `#${editorId}`,
                setup: (editor) => {
                    activeEditor = editor;
                    editorRef.current = editor;
                    
                    editor.on('init', () => {
                        const contentToSet = (valueRef.current !== undefined && valueRef.current !== null)
                            ? valueRef.current
                            : (el.value || '');
                        editor.setContent(contentToSet);
                    });

                    editor.on('change keyup undo redo input SetContent', () => {
                        const content = editor.getContent();
                        if (onEditorChange) {
                            isSettingValueRef.current = true;
                            onEditorChange(content);
                            isSettingValueRef.current = false;
                        }
                    });
                }
            });
        }, 50);

        return () => {
            clearTimeout(timer);
            if (activeEditor) {
                try {
                    window.tinymce.remove(activeEditor);
                } catch (e) {
                    console.warn("Error removing TinyMCE editor instance:", e);
                }
            }
        };
    }, [editorId]);

    React.useEffect(() => {
        if (editorRef.current && value !== undefined && !isSettingValueRef.current) {
            const currentContent = editorRef.current.getContent();
            if (value !== currentContent) {
                editorRef.current.setContent(value || '');
            }
        }
    }, [value]);

    return (
        <textarea
            id={editorId}
            ref={textareaRef}
            defaultValue={value || ''}
            style={{ width: '100%', minHeight: '450px', padding: '16px', border: 'none', outline: 'none', resize: 'vertical' }}
        />
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
                        'insertdatetime', 'media', 'table', 'help', 'wordcount', 'pagebreak', 'paste'
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

