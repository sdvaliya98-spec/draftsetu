/**
 * TemplateEditorModal — DOCX Template Management
 * ================================================
 * Workflow: Upload DOCX → Extract Variables → Configure Field Labels/Types → Save
 *
 * Uses raw fetch() to /api/templates/upload-docx (public endpoint, no auth required).
 * Bypasses apiFetch to avoid: FormData retry issues, auth token requirement,
 * and response body consumption on error.
 */

const TemplateEditorModal = ({ isOpen, token, template, onSave, onClose }) => {
    const [name, setName] = React.useState(template.name || '');
    const [category, setCategory] = React.useState(template.category || 'Sale Deed');
    const [menuItemId, setMenuItemId] = React.useState(template.menu_item_id || '');
    const [pageSize, setPageSize] = React.useState(template.pageSize || 'A4');
    const [creditCost, setCreditCost] = React.useState(template.credit_cost ?? 10);
    const [fields, setFields] = React.useState(template.fields || {});
    const [fieldOrder, setFieldOrder] = React.useState(template.fieldOrder || []);
    const [filePath, setFilePath] = React.useState(template.file_path || null);
    const [loading, setLoading] = React.useState(false);
    const [uploadStatus, setUploadStatus] = React.useState(null); // { type: 'success'|'error', msg }
    const [fileName, setFileName] = React.useState(
        template.file_path ? template.file_path.split('/').pop() : null
    );
    const [uploadStep, setUploadStep] = React.useState(''); // progress label
    const [submenus, setSubmenus] = React.useState([]);
    const [documentIdentityField, setDocumentIdentityField] = React.useState(
        template.identity_field || 
        (template.fieldOrder && template.fieldOrder.identity_field) || 
        template.document_identity_field || ''
    );
    const [documentSecondaryField, setDocumentSecondaryField] = React.useState(
        template.secondary_field || 
        (template.fieldOrder && template.fieldOrder.secondary_field) || 
        template.document_secondary_field || ''
    );
    const isSavingRef = React.useRef(false);

    React.useEffect(() => {
        if (isOpen) {
            window.apiFetch('/api/menu/')
                .then(r => r.json())
                .then(data => {
                    const submenusList = [];
                    data.forEach(parent => {
                        const lbl = (parent.label || '').trim().toLowerCase();
                        if (lbl.includes('document services')) {
                            if (parent.children) {
                                parent.children.forEach(child => {
                                    submenusList.push({
                                        id: child.id,
                                        label: child.label
                                    });
                                });
                            }
                        }
                    });
                    setSubmenus(submenusList);
                })
                .catch(err => {
                    console.error("Error loading submenus in editor modal:", err);
                    setSubmenus([]);
                });
        }
    }, [isOpen]);

    // Reset state when modal opens with a new template
    React.useEffect(() => {
        if (isOpen) {
            setName(template.name || '');
            setMenuItemId(template.menu_item_id || '');
            setPageSize(template.pageSize || 'A4');
            setCreditCost(template.credit_cost ?? 10);
            const normalized = {};
            if (template.fields) {
                Object.keys(template.fields).forEach(key => {
                    const f = template.fields[key] || {};
                    let type = f.type || 'text';
                    if (type === 'Dropdown' || type === 'dropdown' || type === 'select') {
                        type = 'select';
                    }
                    normalized[key] = { ...f, type };
                });
            }
            setFields(normalized);
            setFieldOrder(template.fieldOrder || []);
            setFilePath(template.file_path || null);
            setFileName(template.file_path ? template.file_path.split('/').pop() : null);
            setUploadStatus(null);
            setUploadStep('');
            setDocumentIdentityField(
                template.identity_field || 
                (template.fieldOrder && template.fieldOrder.identity_field) || 
                template.document_identity_field || ''
            );
            setDocumentSecondaryField(
                template.secondary_field || 
                (template.fieldOrder && template.fieldOrder.secondary_field) || 
                template.document_secondary_field || ''
            );
        }
    }, [isOpen, template]);

    const handleFileUpload = async (e) => {
        if (e) {
            try { e.preventDefault(); } catch (_) {}
            try { e.stopPropagation(); } catch (_) {}
        }
        const file = e.target.files[0];
        if (!file) return;

        // ── 1. Client-side validation ────────────────────────────────────

        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (ext !== '.docx') {
            console.warn('[UPLOAD] REJECTED: not a .docx, got:', ext);
            setUploadStatus({ type: 'error', msg: `Only .docx files are supported. Got: "${ext}"` });
            e.target.value = '';
            return;
        }
        if (file.size === 0) {
            console.warn('[UPLOAD] REJECTED: 0-byte file');
            setUploadStatus({ type: 'error', msg: 'File is empty (0 bytes). Please select a valid DOCX file.' });
            e.target.value = '';
            return;
        }

        setLoading(true);
        setUploadStatus(null);
        setUploadStep('Uploading to server...');

        // ── 2. Build FormData ────────────────────────────────────────────
        const formData = new FormData();
        formData.append('file', file, file.name);

        // ── 3. Send via raw fetch (NOT apiFetch) ─────────────────────────
        // Reasons we bypass apiFetch:
        //  a) apiFetch retries on 5xx but FormData stream is consumed on first attempt → empty retry body
        //  b) This endpoint is public — no auth token needed
        //  c) apiFetch reads res.json() on error, consuming the stream before we can read it
        const tId = template.template_id || template.id || '';
        const uploadUrl = `${window.API_BASE}/api/templates/upload-docx?template_id=${tId}`;

        const tokenToSend = token || localStorage.getItem('authToken');
        const headers = {};
        if (tokenToSend) {
            headers['Authorization'] = `Bearer ${tokenToSend}`;
        }

        let rawRes;
        try {
            rawRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: headers,
                body: formData,
                // ⚠️ Do NOT set Content-Type manually — browser auto-sets multipart/form-data with boundary
            });
        } catch (netErr) {
            console.error('[UPLOAD] NETWORK ERROR:', netErr);
            setUploadStatus({
                type: 'error',
                msg: `Cannot reach server at ${window.API_BASE}. Is the FastAPI backend running on port 8000?`
            });
            setLoading(false);
            setUploadStep('');
            e.target.value = '';
            return;
        }

        // ── 4. Parse JSON response ───────────────────────────────────────
        setUploadStep('Parsing response...');
        let data;
        try {
            data = await rawRes.json();
        } catch (parseErr) {
            console.error('[UPLOAD] JSON PARSE ERROR:', parseErr);
            setUploadStatus({
                type: 'error',
                msg: `Server returned non-JSON (HTTP ${rawRes.status}). Check backend terminal for errors.`
            });
            setLoading(false);
            setUploadStep('');
            e.target.value = '';
            return;
        }

        // ── 5. Handle error responses ────────────────────────────────────
        if (!rawRes.ok || !data.success) {
            const errMsg = data?.error || data?.detail || `HTTP ${rawRes.status}`;
            const details = data?.details ? `: ${data.details}` : '';
            console.error('[UPLOAD] Server-side error:', errMsg, details);
            setUploadStatus({ type: 'error', msg: errMsg + details });
            setLoading(false);
            setUploadStep('');
            e.target.value = '';
            return;
        }

        // ── 6. Apply extracted variables to modal state ──────────────────
        setUploadStep('Applying variables...');
        const vars = data.variables || [];
        
        const totalVarsCount = (() => {
            if (!vars) return 0;
            if (Array.isArray(vars)) return vars.length;
            if (typeof vars === 'object') {
                const singles = vars.single_variables?.length || 0;
                const groupVars = Object.values(vars.groups || {}).reduce((acc, curr) => acc + (curr?.length || 0), 0);
                return singles + groupVars;
            }
            return 0;
        })();

        // Update local modal states in real-time
        setFieldOrder(data.fieldOrder || vars);
        const uploadedFields = data.fields || {};
        const normalizedUploaded = {};
        Object.keys(uploadedFields).forEach(key => {
            const f = uploadedFields[key] || {};
            let type = f.type || 'text';
            if (type === 'Dropdown' || type === 'dropdown' || type === 'select') {
                type = 'select';
            }
            normalizedUploaded[key] = { ...f, type };
        });
        setFields(normalizedUploaded);
        setFilePath(data.file_path);
        setFileName(data.filename || file.name);
        
        if (data.name) {
            setName(data.name);
        } else if (!name) {
            setName(file.name.replace(/\.[^/.]+$/, ''));
        }

        const updatedTemplate = {
            id: data.template_id,
            template_id: data.template_id,
            name: data.name || name || file.name.replace(/\.[^/.]+$/, ''),
            fields: data.fields || {},
            fieldOrder: data.fieldOrder || vars,
            variables: data.variables || vars,
            file_path: data.file_path,
            _source: 'db'
        };

        const noVarsHint = totalVarsCount === 0
            ? ' (No {{variables}} found — make sure your Word doc has {{var_name}} placeholders.)'
            : '';
        setUploadStatus({
            type: 'success',
            msg: `Uploaded! ${totalVarsCount} variable(s) extracted and template linked in DB.${noVarsHint}`
        });

        setLoading(false);
        setUploadStep('');
        e.target.value = '';
    };

    // ─── Field config updater ─────────────────────────────────────────────────
    const updateField = (varName, keyOrObj, value) => {
        setFields(prev => {
            const currentField = prev[varName] || {};
            const merged = typeof keyOrObj === 'object' && keyOrObj !== null
                ? { ...currentField, ...keyOrObj }
                : { ...currentField, [keyOrObj]: value };
            return {
                ...prev,
                [varName]: merged
            };
        });
    };

    // ─── Save Handler ─────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        if (e) {
            try { e.preventDefault(); } catch (_) {}
            try { e.stopPropagation(); } catch (_) {}
        }
        if (isSavingRef.current) {
            return;
        }
        if (!name.trim()) {
            alert('Please enter a template name.');
            return;
        }
        if (!filePath) {
            alert('Please upload a DOCX template file before saving.');
            return;
        }
        
        isSavingRef.current = true;
        setLoading(true);
        try {
            const normalizedFields = {};
            Object.keys(fields).forEach(key => {
                const field = fields[key] || {};
                let type = field.type || 'text';
                if (type === 'Dropdown' || type === 'dropdown' || type === 'select') {
                    type = 'select';
                }
                normalizedFields[key] = {
                    ...field,
                    type
                };
            });

            const mergedFieldOrder = typeof fieldOrder === 'object' && !Array.isArray(fieldOrder)
                ? {
                    ...fieldOrder,
                    identity_field: documentIdentityField,
                    secondary_field: documentSecondaryField
                  }
                : {
                    single_variables: Array.isArray(fieldOrder) ? fieldOrder : [],
                    groups: {},
                    identity_field: documentIdentityField,
                    secondary_field: documentSecondaryField
                  };

            await onSave({
                ...template,
                name,
                category: category || 'General',
                menu_item_id: menuItemId ? parseInt(menuItemId) : null,
                pageSize,
                content: '',
                header: '',
                footer: '',
                fields: normalizedFields,
                fieldOrder: mergedFieldOrder,
                file_path: filePath,
                document_identity_field: documentIdentityField,
                document_secondary_field: documentSecondaryField,
                identity_field: documentIdentityField,
                secondary_field: documentSecondaryField,
                credit_cost: creditCost
            });
            onClose();
        } catch (err) {
            console.error('[SAVE] Error:', err);
            alert('Save failed: ' + err.message);
        } finally {
            setLoading(false);
            isSavingRef.current = false;
        }
    };

    const { inputVars, repeaterBlocks } = React.useMemo(() => {
        if (!fieldOrder) return { inputVars: [], repeaterBlocks: [] };
        if (typeof fieldOrder === 'object' && !Array.isArray(fieldOrder)) {
            const singles = fieldOrder.single_variables || [];
            const groups = fieldOrder.groups || {};
            const repeaters = Object.keys(groups);
            
            // Gather all variables: singles plus sub-variables from repeaters
            const allVarsSet = new Set(singles);
            Object.values(groups).forEach(groupFields => {
                if (Array.isArray(groupFields)) {
                    groupFields.forEach(f => allVarsSet.add(f));
                }
            });
            
            return {
                inputVars: Array.from(allVarsSet),
                repeaterBlocks: repeaters
            };
        }
        
        // Fallback to old flat array
        if (!Array.isArray(fieldOrder)) return { inputVars: [], repeaterBlocks: [] };
        const singles = fieldOrder.filter(v => !v.startsWith('#') && !v.startsWith('/'));
        const repeaters = fieldOrder.filter(v => v.startsWith('#')).map(v => v.slice(1));
        return { inputVars: singles, repeaterBlocks: repeaters };
    }, [fieldOrder]);

    const allSelectableVars = React.useMemo(() => {
        const list = [];
        if (!fieldOrder) return list;
        
        if (typeof fieldOrder === 'object' && !Array.isArray(fieldOrder)) {
            const singles = fieldOrder.single_variables || [];
            singles.forEach(v => {
                if (v && !list.includes(v)) list.push(v);
            });
            
            const groups = fieldOrder.groups || {};
            Object.keys(groups).forEach(groupName => {
                const groupFields = groups[groupName] || [];
                if (Array.isArray(groupFields)) {
                    groupFields.forEach(f => {
                        const path = `${groupName}.0.${f}`;
                        if (!list.includes(path)) list.push(path);
                    });
                }
            });
        } else if (Array.isArray(fieldOrder)) {
            fieldOrder.forEach(v => {
                if (v && !v.startsWith('#') && !v.startsWith('/') && !list.includes(v)) {
                    list.push(v);
                }
            });
        }
        
        Object.keys(fields).forEach(k => {
            if (k && !list.includes(k)) {
                list.push(k);
            }
        });

        // Add standard defaults if not already present
        const commonDefaults = [
            'TESTATOR_NAME',
            'DECEASED_PERSON_NAME',
            'APPLICANT_NAME',
            'BUYER_NAME',
            'BUYERS.0.name',
            'SELLERS.0.name',
            'MEMBERS.0.CHILDREN.0.name',
            'VILLAGE_NAME',
            'TESTATOR_VILLAGE',
            'SURVEY_NO',
            'ACCOUNT_NO'
        ];
        commonDefaults.forEach(def => {
            if (!list.includes(def)) {
                list.push(def);
            }
        });
        
        return list;
    }, [fieldOrder, fields]);

    const getMockValue = (fieldName, isSecondary) => {
        if (!fieldName) return '';
        const nameUpper = fieldName.toUpperCase();
        if (isSecondary) {
            if (nameUpper.includes('VILLAGE') || nameUpper.includes('CITY') || nameUpper.includes('ADDRESS')) {
                return 'અમદાવાદ';
            }
            if (nameUpper.includes('SURVEY')) {
                return 'સર્વે નં. ૧૫૮';
            }
            if (nameUpper.includes('ACCOUNT')) {
                return 'ખાતા નં. ૪૫';
            }
            return 'અમદાવાદ';
        } else {
            if (nameUpper.includes('BUYER')) {
                return 'ધનશ્યામસિંહ પરમાર';
            }
            if (nameUpper.includes('TESTATOR') || nameUpper.includes('DECEASED') || nameUpper.includes('APPLICANT') || nameUpper.includes('NAME')) {
                return 'રમેશભાઈ પટેલ';
            }
            return 'રમેશભાઈ પટેલ';
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4"
            onClick={(e) => {
                if (e) {
                    try { e.preventDefault(); } catch (_) {}
                    try { e.stopPropagation(); } catch (_) {}
                }
                onClose();
            }}
        >
            <div 
                className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-[96vw] max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-modal border border-white/20"
                onClick={(e) => {
                    if (e) {
                        try { e.stopPropagation(); } catch (_) {}
                    }
                }}
            >

                {/* ─── Header ───────────────────────────────────────────── */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                                <SettingsIcon />
                            </span>
                            ટેમ્પલેટ એડિટર <span className="text-slate-400 font-medium text-base ml-1">Template Editor</span>
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 ml-12">
                            DOCX Template Engine — Upload Word file with {"{{variables}}"}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page Size:</label>
                            <select value={pageSize} onChange={e => setPageSize(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20">
                                <option value="A4">A4 (210 × 297mm)</option>
                                <option value="Legal">Legal (8.5 × 14in)</option>
                                <option value="Letter">Letter (8.5 × 11in)</option>
                            </select>
                        </div>
                         <button 
                            onClick={(e) => {
                                if (e) {
                                    try { e.preventDefault(); } catch (_) {}
                                    try { e.stopPropagation(); } catch (_) {}
                                }
                                onClose();
                            }} 
                            className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-800"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* ─── Left Panel: Upload & Config ──────────────────── */}
                    <div className="w-[420px] flex-shrink-0 overflow-y-auto p-6 space-y-6 custom-scrollbar border-r border-slate-100">

                        {/* Template Name */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Template Name
                            </label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                placeholder="e.g., Sale Deed — વેચાણ દસ્તાવેજ"
                                id="template-name-input"
                            />
                        </div>

                        {/* Document Category */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Document Category
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-white"
                                id="template-category-input"
                            >
                                <option value="Sale Deed">Sale Deed (વેચાણ દસ્તાવેજ)</option>
                                <option value="Paper Notice">Paper Notice (પેપર નોટીસ)</option>
                                <option value="Affidavit">Affidavit (સોગંદનામું)</option>
                                <option value="Relinquishment">Relinquishment (હક્ક રીલીઝ)</option>
                                <option value="Heirship / Pedhinamu">Heirship / Pedhinamu (વારસાઈ / પેઢીનામું)</option>
                                <option value="Will / Vasiyat">Will / Vasiyat (વીલ / વસીયતનામું)</option>
                                <option value="Gift Deed">Gift Deed (બક્ષીસ દસ્તાવેજ)</option>
                                <option value="Power of Attorney">Power of Attorney (પાવર ઓફ એટર્ની)</option>
                                <option value="General">General (સામાન્ય)</option>
                            </select>
                        </div>

                        {/* Submenu Assignment */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Assign Template To Submenu
                            </label>
                            <select
                                value={menuItemId ?? ''}
                                onChange={e => setMenuItemId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-white"
                                id="template-submenu-input"
                            >
                                <option value="">— Select Submenu —</option>
                                {submenus.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Template Credit Cost */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Template Credit Cost
                            </label>
                            <input
                                type="number"
                                value={creditCost}
                                onChange={e => setCreditCost(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                                placeholder="e.g., 10"
                                min="0"
                                id="template-credit-cost-input"
                            />
                        </div>

                        {/* Document Identity Field Selector */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Document Identity Field
                            </label>
                            <select
                                value={documentIdentityField}
                                onChange={e => setDocumentIdentityField(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-white"
                                id="template-identity-field-input"
                            >
                                <option value="">— Select Primary Field —</option>
                                {allSelectableVars.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Document Secondary Field Selector */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Document Secondary Field
                            </label>
                            <select
                                value={documentSecondaryField}
                                onChange={e => setDocumentSecondaryField(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 bg-white"
                                id="template-secondary-field-input"
                            >
                                <option value="">— Select Secondary Field —</option>
                                {allSelectableVars.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Live Card Preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Live Card Preview
                            </p>
                            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-1">
                                <div className="font-bold text-sm text-slate-800">
                                    {name || template.name || 'વીલ યાને વસીયત નામું'}
                                </div>
                                {documentIdentityField && (
                                    <div className="text-sm text-slate-700 font-semibold">
                                        {getMockValue(documentIdentityField, false)}
                                    </div>
                                )}
                                {documentSecondaryField && (
                                    <div className="text-sm text-slate-500">
                                        {getMockValue(documentSecondaryField, true)}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                                This is how documents of this template will appear in the document list.
                            </p>
                        </div>



                        {/* DOCX Upload Zone */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                DOCX Template File <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".docx"
                                    onChange={handleFileUpload}
                                    disabled={loading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
                                    id="docx-upload-input"
                                />
                                <div className={`w-full px-5 py-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                                    loading ? 'border-blue-300 bg-blue-50 animate-pulse' :
                                    filePath ? 'border-emerald-300 bg-emerald-50' :
                                    'border-blue-200 bg-blue-50 group-hover:bg-blue-100'
                                }`}>
                                    <div className="text-3xl">
                                        {loading ? '⏳' : filePath ? '📄' : '⬆️'}
                                    </div>
                                    <p className="font-black text-sm text-center text-slate-700">
                                        {loading ? (uploadStep || 'Processing...') :
                                         filePath ? (fileName || 'DOCX Uploaded') :
                                         'Upload DOCX Template'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium text-center">
                                        {loading ? 'Please wait...' :
                                         filePath ? `Click to replace • ${inputVars.length} vars extracted` :
                                         'Create your Word doc with {{variable_name}} placeholders'}
                                    </p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            {uploadStatus && (
                                <div className={`px-4 py-3 rounded-xl text-xs font-bold border leading-relaxed ${
                                    uploadStatus.type === 'success'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-red-50 border-red-200 text-red-700'
                                }`}>
                                    {uploadStatus.msg}
                                </div>
                            )}
                        </div>

                        {/* Repeater Blocks */}
                        {repeaterBlocks.length > 0 && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Repeater Blocks Detected</p>
                                <div className="flex flex-wrap gap-2">
                                    {repeaterBlocks.map(b => (
                                        <span key={b} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs font-black">
                                            {'{{#' + b + '}}...{{/' + b + '}}'}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-indigo-500 mt-2">These render as repeating table rows or sections.</p>
                            </div>
                        )}

                        {/* Syntax Guide */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Syntax Guide</p>
                            <div className="space-y-2 text-xs">
                                {[
                                    { code: '{{buyer_name}}', desc: 'Simple variable (text)' },
                                    { code: '{{#sellers}}', desc: 'Repeater block start' },
                                    { code: '{{/sellers}}', desc: 'Repeater block end' },
                                    { code: '{{date}}', desc: 'Date field' },
                                    { code: '{{amount}}', desc: 'Number / currency' },
                                ].map(({ code, desc }) => (
                                    <div key={code} className="flex items-center gap-2">
                                        <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono text-[10px]">{code}</code>
                                        <span className="text-slate-500 text-[10px]">{desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ─── Right Panel: Variable Configuration ──────────── */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                Variable Configuration
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                                {inputVars.length} input field(s) detected • Set labels &amp; types for the dynamic form
                            </p>
                        </div>

                        <div className="p-6 space-y-3">
                            {inputVars.length === 0 && (
                                <div className="h-52 flex flex-col items-center justify-center text-slate-300 text-center space-y-3 px-8">
                                    <div className="text-5xl">🔍</div>
                                    <p className="text-sm font-black uppercase tracking-widest">No variables yet</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Upload a DOCX file with <code className="bg-slate-100 px-1 rounded">{'{{variable_name}}'}</code> placeholders
                                        to configure the dynamic input form here.
                                    </p>
                                </div>
                            )}

                            {inputVars.map((v) => {
                                const field = fields[v] || {};
                                const index = v;
                                return (
                                    <div key={v} className="premium-card p-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="flex-shrink-0 min-w-0">
                                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Variable</span>
                                                <code className="text-xs font-black text-slate-700 bg-blue-50 px-2 py-0.5 rounded truncate block max-w-[120px]">
                                                    {'{{' + v + '}}'}
                                                </code>
                                            </div>

                                            <div className="flex-1 grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Display Label</label>
                                                    <input
                                                        value={field.label || v.replace(/_/g, ' ')}
                                                        onChange={e => updateField(v, 'label', e.target.value)}
                                                        className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700"
                                                        placeholder="User-facing label..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Input Type</label>
                                                    <select
                                                        value={field.type || 'text'}
                                                        onChange={e => updateField(v, 'type', e.target.value)}
                                                        className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 bg-white"
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="textarea">Textarea (Long)</option>
                                                        <option value="number">Number</option>
                                                        <option value="date">Date</option>
                                                        <option value="select">Dropdown</option>
                                                        <option value="hybrid-dropdown">Hybrid Dropdown</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Required Status</label>
                                                    <select
                                                        value={field.required !== false ? 'required' : 'optional'}
                                                        onChange={e => updateField(v, 'required', e.target.value === 'required')}
                                                        className="w-full mt-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 bg-white"
                                                    >
                                                        <option value="required">Required</option>
                                                        <option value="optional">Optional</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex gap-1 flex-shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        if (e) {
                                                            try { e.preventDefault(); } catch (_) {}
                                                            try { e.stopPropagation(); } catch (_) {}
                                                        }
                                                        const i = fieldOrder.indexOf(v);
                                                        if (i <= 0) return;
                                                        const o = [...fieldOrder];
                                                        [o[i - 1], o[i]] = [o[i], o[i - 1]];
                                                        setFieldOrder(o);
                                                    }}
                                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                                                    title="Move up"
                                                >
                                                    <ArrowUpIcon size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        if (e) {
                                                            try { e.preventDefault(); } catch (_) {}
                                                            try { e.stopPropagation(); } catch (_) {}
                                                        }
                                                        const i = fieldOrder.indexOf(v);
                                                        if (i >= fieldOrder.length - 1) return;
                                                        const o = [...fieldOrder];
                                                        [o[i + 1], o[i]] = [o[i], o[i + 1]];
                                                        setFieldOrder(o);
                                                    }}
                                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                                                    title="Move down"
                                                >
                                                    <ArrowDownIcon size={12} />
                                                </button>
                                            </div>
                                        </div>

                                         {(field.type === "Dropdown" || field.type === "dropdown" || field.type === "select" || field.type === "hybrid-dropdown") && (
                                            <div className="mt-3">
                                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Dropdown Options
                                                </label>
                                                <textarea
                                                    value={(field.options || []).join('\n')}
                                                    onChange={(e) =>
                                                        updateField(index, {
                                                            ...field,
                                                            options: e.target.value
                                                                .split('\n')
                                                                .map(o => o.trim())
                                                                .filter(Boolean)
                                                        })
                                                    }
                                                    placeholder={`વારસાઈ હકથી
ખરીદી હકથી
બક્ષીસ હકથી`}
                                                    className="w-full min-h-[120px] rounded-2xl border border-slate-300 px-4 py-3"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ─── Footer ──────────────────────────────────────────── */}
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div className="text-xs text-slate-400 font-bold">
                        {filePath
                            ? `📄 ${fileName || filePath} • ${inputVars.length} variable(s) ready`
                            : '⚠️ Upload a DOCX file to enable saving'}
                    </div>
                    <div className="flex gap-3">
                         <button
                            onClick={(e) => {
                                if (e) {
                                    try { e.preventDefault(); } catch (_) {}
                                    try { e.stopPropagation(); } catch (_) {}
                                }
                                onClose();
                            }}
                            disabled={loading}
                            className="px-6 py-3 border border-slate-200 rounded-2xl text-slate-600 font-black text-sm hover:bg-slate-50 transition-all btn-premium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !filePath}
                            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all btn-premium"
                            id="btn-deploy-template"
                        >
                            {loading ? 'Saving...' : 'Deploy Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.TemplateEditorModal = TemplateEditorModal;
