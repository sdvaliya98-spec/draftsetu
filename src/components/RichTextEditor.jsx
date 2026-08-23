const Editor = ({ value, onEditorChange, init }) => {
    const textareaRef = React.useRef(null);
    const editorRef = React.useRef(null);
    const isSettingValueRef = React.useRef(false);

    React.useEffect(() => {
        if (!textareaRef.current || !window.tinymce) return;

        let activeEditor = null;
        window.tinymce.init({
            ...init,
            target: textareaRef.current,
            setup: (editor) => {
                activeEditor = editor;
                editorRef.current = editor;
                
                editor.on('init', () => {
                    if (value) {
                        editor.setContent(value);
                    }
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

        return () => {
            if (activeEditor) {
                window.tinymce.remove(activeEditor);
            }
        };
    }, []);

    React.useEffect(() => {
        if (editorRef.current && value !== undefined && !isSettingValueRef.current) {
            const currentContent = editorRef.current.getContent();
            if (value !== currentContent) {
                editorRef.current.setContent(value || '');
            }
        }
    }, [value]);

    const idRef = React.useRef('tinymce-editor-' + Math.random().toString(36).substring(2, 9));

    return <textarea id={idRef.current} ref={textareaRef} style={{ display: 'none' }} />;
};

const RichTextEditor = ({ value, onChange }) => {
    return (
        <div className="rich-text-editor-wrapper overflow-hidden rounded-xl border border-slate-200">
            <Editor
                value={value}
                onEditorChange={(content) => {
                    onChange(content);
                }}
                init={{
                    height: 550,
                    menubar: 'file edit view insert format tools table help',
                    plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'help', 'wordcount', 'pagebreak', 'paste'
                    ],
                    toolbar: 'undo redo | fontfamily fontsize | ' +
                        'bold italic underline strikethrough | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist | outdent indent | ' +
                        'forecolor backcolor | table pagebreak | removeformat | fullscreen',
                    font_family_formats: 'Gujarati (Noto Sans)="Noto Sans Gujarati",sans-serif; Gujarati (Shruti)=Shruti,sans-serif; Arial=arial,helvetica,sans-serif;',
                    content_style: `
                        body { 
                            font-family: 'Noto Sans Gujarati', 'Shruti', sans-serif;
                            font-size: 14pt;
                            line-height: 1.2;
                            letter-spacing: 0px;
                            word-spacing: 0px;
                            margin: 0;
                            padding: 20px;
                            white-space: pre-wrap;
                            box-sizing: border-box;
                            overflow-wrap: break-word;
                            background: #ffffff;
                            color: #1f2937;
                        }
                        p, div, span {
                            margin-top: 0 !important;
                            margin-bottom: 0 !important;
                            padding: 0 !important;
                            line-height: 1.2 !important;
                        }
                        p {
                            min-height: unset !important;
                        }
                    `,
                    forced_root_block: false,
                    force_br_newlines: true,
                    force_p_newlines: false,
                    remove_linebreaks: false,
                    verify_html: false,
                    cleanup: false,
                    entity_encoding: "raw",
                    paste_as_text: false,
                    paste_webkit_styles: "all",
                    paste_merge_formats: true,
                    smart_paste: true,
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
