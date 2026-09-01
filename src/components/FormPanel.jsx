import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DateInputField } from './InputField.jsx';
import PreviewModal from './PreviewModal.jsx';
import PdfPreviewModal from './PdfPreviewModal.jsx';

const {
    processFieldValue,
    getFieldType,
    validateField,
    REPEATER_FIELD_LABELS,
    getRepeaterTitle
} = window;

const DynamicRepeater = React.memo(({ name, fields, data, setData, isLocked, showRequiredErrors, templateFields = {}, peerGroups = [], onCopyRow, onCopyAll }) => {
    const isFinalized = isLocked === true;
    const list = Array.isArray(data[name]) ? data[name] : [];

    const titleInfo = getRepeaterTitle(name);

    // Sync indices helper
    const syncRowIndices = (rawList) => {
        return rawList.map((item, i) => ({
            ...item,
            index: String(i + 1)
        }));
    };

    // Auto empty row check
    React.useEffect(() => {
        if (list.length === 0 && !isLocked) {
            addItem();
        }
    }, [list.length]);

    const addItem = () => {
        const newItem = { index: String(list.length + 1) };
        fields.forEach(f => {
            if (f.name !== 'index') {
                newItem[f.name] = '';
            }
        });
        setData(prev => ({
            ...prev,
            [name]: syncRowIndices([...list, newItem])
        }));
    };

    const updateItem = (index, field, value) => {
        const processedVal = processFieldValue(field, value);
        const newList = [...list];
        newList[index] = { ...newList[index], [field]: processedVal };

        // Auto word field inside repeater
        if (field === 'amount') {
            const hasAmountInWords = fields.some(f => f.name === 'amount_in_words');
            if (hasAmountInWords) {
                newList[index]['amount_in_words'] = numberToGujaratiWords
                    ? numberToGujaratiWords(processedVal)
                    : processedVal;
            }
        }

        setData(prev => ({
            ...prev,
            [name]: syncRowIndices(newList)
        }));
    };

    const removeItem = (index) => {
        const filtered = list.filter((_, i) => i !== index);
        setData(prev => ({
            ...prev,
            [name]: syncRowIndices(filtered)
        }));
    };

    const duplicateItem = (index) => {
        const target = list[index];
        if (!target) return;

        const duplicated = { ...target };
        const newList = [...list];
        newList.splice(index + 1, 0, duplicated);

        setData(prev => ({
            ...prev,
            [name]: syncRowIndices(newList)
        }));
    };

    const inputFields = fields.filter(f => f.name !== 'index');

    return (
        <div className="mb-8 border border-slate-200 rounded-[24px] bg-white shadow-sm overflow-hidden animate-modal">
            {/* Header section with Gujarati title and icon */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200 gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{titleInfo.icon}</span>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm tracking-tight">{titleInfo.gu}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-sans">
                            {name.replace(/_/g, ' ')} Table Loop
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Copy All to peer groups */}
                    {!isFinalized && peerGroups.length > 0 && onCopyAll && peerGroups.map(peer => (
                        <button
                            key={peer.name}
                            type="button"
                            onClick={() => onCopyAll(peer.name)}
                            title={`Copy all rows to ${peer.label}`}
                            className="bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-2 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 font-sans"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy All → {peer.label}</span>
                        </button>
                    ))}
                    {!isFinalized && (
                        <button
                            type="button"
                            onClick={addItem}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all flex items-center gap-1.5 shadow-md active:scale-95 font-sans"
                        >
                            <span>+ Add Row</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table layout container */}
            <div className="p-4 overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[600px] border-collapse text-left" style={{ tableLayout: 'auto' }}>
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            {/* No. Column */}
                            <th className="py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-16 text-center font-sans">
                                No.
                            </th>
                            {/* Field Columns */}
                            {inputFields.map(f => {
                                const isRequired = templateFields[f.name]?.required !== false;
                                return (
                                    <th key={f.name} className="py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider font-sans whitespace-nowrap">
                                        {REPEATER_FIELD_LABELS[f.name.toLowerCase()] || f.name.replace(/_/g, ' ').toUpperCase()}
                                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                                    </th>
                                );
                            })}
                            {/* Actions Column */}
                            <th className="py-3 px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-28 text-center font-sans">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {list.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                                {/* Index Badge Cell */}
                                <td className="py-3 px-3 text-center align-middle">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-100 font-sans">
                                        {i + 1}
                                    </span>
                                </td>
                                {/* Inputs Cells */}
                                {inputFields.map(f => {
                                    const fType = getFieldType(f.name);
                                    const isAutoWordField = f.name === 'amount_in_words';
                                    const isFieldRequired = templateFields[f.name]?.required !== false;
                                    let fieldError = validateField(f.name, item[f.name]);
                                    if (!fieldError && isFieldRequired && (!item[f.name] || String(item[f.name]).trim() === '') && showRequiredErrors) {
                                        fieldError = "ફરજિયાત (Required)";
                                    }
                                    const borderClass = fieldError
                                        ? "border-red-300 focus:border-red-500 focus:ring-red-500 focus:ring-1"
                                        : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
                                    const pathStr = `${name}.${i}.${f.name}`;
                                    const triggerFocus = () => {
                                        window.activeFocusedFieldPath = pathStr;
                                        window.dispatchEvent(new CustomEvent('focus-preview-field', { detail: { path: pathStr } }));
                                    };

                                    return (
                                        <td key={f.name} className="py-2 px-2 align-middle">
                                            <div className="flex items-center gap-1">
                                                {fType === 'textarea' ? (
                                                    <textarea
                                                        value={item[f.name] || ''}
                                                        onChange={e => updateItem(i, f.name, e.target.value)}
                                                        onFocus={triggerFocus}
                                                        disabled={isFinalized}
                                                        rows={2}
                                                        placeholder={f.name.replace(/_/g, ' ')}
                                                        className={`w-full min-w-[160px] px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none custom-scrollbar resize-none ${borderClass} ${isFinalized ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                                    />
                                                ) : fType === 'date' ? (
                                                    <DateInputField
                                                        value={item[f.name] || ''}
                                                        onChange={v => updateItem(i, f.name, v)}
                                                        disabled={isFinalized}
                                                        borderClass={borderClass}
                                                        placeholder="DD/MM/YYYY"
                                                        onFocus={triggerFocus}
                                                        className={`w-full min-w-[140px] px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none ${borderClass} ${isFinalized ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                                        variable={`${name}.${i}.${f.name}`}
                                                    />
                                                ) : (
                                                    <input
                                                        type={fType}
                                                        value={fType === 'number' ? String(item[f.name] || '').replace(/,/g, '') : (item[f.name] || '')}
                                                        onChange={e => updateItem(i, f.name, e.target.value)}
                                                        onFocus={triggerFocus}
                                                        disabled={isFinalized || isAutoWordField}
                                                        placeholder={f.name.toLowerCase() === 'aadhaar' || f.name.toLowerCase().includes('aadhaar') ? "123456789012 / XXXX XXXX 4587" : f.name.replace(/_/g, ' ')}
                                                        className={`w-full min-w-[140px] px-3 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none ${borderClass} ${isFinalized || isAutoWordField ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={triggerFocus}
                                                    title="View in Document"
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                                                >
                                                    👁
                                                </button>
                                            </div>
                                            {fieldError && (
                                                <p className="mt-1 text-[9px] text-red-500 font-bold font-sans leading-tight whitespace-nowrap">{fieldError}</p>
                                            )}
                                        </td>
                                    );
                                })}
                                {/* Actions Cell */}
                                <td className="py-2 px-2 align-middle text-center">
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                        {!isFinalized && (
                                            <>
                                                {/* Copy to peer group buttons */}
                                                {peerGroups.length > 0 && onCopyRow && peerGroups.map(peer => (
                                                    <button
                                                        key={peer.name}
                                                        type="button"
                                                        onClick={() => onCopyRow(item, peer.name)}
                                                        title={`Copy row to ${peer.label}`}
                                                        className="p-1.5 text-violet-500 hover:text-violet-700 rounded-lg hover:bg-violet-50 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                ))}
                                                {/* Duplicate Row */}
                                                <button
                                                    type="button"
                                                    onClick={() => duplicateItem(i)}
                                                    title="Duplicate Row"
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                    </svg>
                                                </button>
                                                {/* Remove Row */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(i)}
                                                    title="Remove Row"
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {list.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50">
                    No rows added. Click "+ Add Row" above to begin.
                </div>
            )}
        </div>
    );
});

// ─── Main FormPanel ──────────────────────────────────────────────────────────

const FormPanel = ({
    templates,
    activeTemplateId,
    onTemplateChange,
    data,
    setData,
    onEditTemplate,
    onNewTemplate,
    role,
    isLocked,
    trackingId,
    onSaveDraft,
    onFinalSubmit,
    onGenerateDocx,
    onGeneratePdf,
    isSavingDraft,
    draftError,
    templateLoadError,
    isDownloading,
    setIsDownloading,
    isFinalizing,
    userCredits,
    isLoggedIn,
    onLogin
}) => {
    const hasAuthToken = Boolean(localStorage.getItem('authToken') || localStorage.getItem('token'));
    const isVisitor = isLoggedIn !== undefined ? !isLoggedIn : !hasAuthToken;

    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    const selectedTemplate = activeTemplate;

    const vars = (() => {
        const v = activeTemplate?.variables;
        if (!v) return activeTemplate?.fieldOrder || [];
        if (Array.isArray(v)) return v.length > 0 ? v : (activeTemplate?.fieldOrder || []);
        if (typeof v === 'object') {
            if (v.groups || v.single_variables) return v;
            if (Object.keys(v).length > 0) return v;
        }
        return activeTemplate?.fieldOrder || [];
    })();

    // Auto-detect and structure variables (handles repeater blocks)
    const structuredVariables = React.useMemo(() => {
        if (!vars) return [];

        if (typeof vars === 'object' && !Array.isArray(vars)) {
            const result = [];
            // Add groups as repeaters
            if (vars.groups) {
                Object.entries(vars.groups).forEach(([groupName, groupFields]) => {
                    result.push({
                        type: 'repeater',
                        name: groupName,
                        fields: (groupFields || []).map(f => ({ name: f }))
                    });
                });
            }
            // Add single variables as text inputs
            if (vars.single_variables) {
                vars.single_variables.forEach(v => {
                    result.push({ type: 'text', name: v });
                });
            }
            return result;
        }

        if (!Array.isArray(vars) || vars.length === 0) return [];

        const result = [];
        const stack = [];
        let current = result;

        vars.forEach(v => {
            if (v.startsWith('#')) {
                const repeater = { type: 'repeater', name: v.slice(1), fields: [] };
                current.push(repeater);
                stack.push(current);
                current = repeater.fields;
            } else if (v.startsWith('/')) {
                current = stack.pop() || result;
            } else {
                current.push({ type: 'text', name: v });
            }
        });
        return result;
    }, [vars]);

    const [pdfStatus, setPdfStatus] = React.useState({ available: null, engine: null });
    const pdfAvailable = pdfStatus?.available;
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isPdfLoading, setIsPdfLoading] = React.useState(false);
    const [generateError, setGenerateError] = React.useState(null);
    const [generateSuccess, setGenerateSuccess] = React.useState(null);

    const [showRequiredErrors, setShowRequiredErrors] = React.useState(false);
    const previewAbortControllerRef = React.useRef(null);
    const generateAbortControllerRef = React.useRef(null);

    React.useEffect(() => {
        return () => {
            if (previewAbortControllerRef.current) {
                previewAbortControllerRef.current.abort();
            }
            if (generateAbortControllerRef.current) {
                generateAbortControllerRef.current.abort();
            }
        };
    }, []);

    // PREVIEW STATE
    const previewRef = React.useRef(null);
    const renderingRef = React.useRef(false);
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewBlob, setPreviewBlob] = React.useState(null);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [previewError, setPreviewError] = React.useState("");
    const [previewRendered, setPreviewRendered] = React.useState(false);

    // PDF PREVIEW STATE
    const [pdfPreviewOpen, setPdfPreviewOpen] = React.useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState("");
    const [pdfPreviewLoading, setPdfPreviewLoading] = React.useState(false);
    const [pdfPreviewError, setPdfPreviewError] = React.useState("");

    // Expose active template ID globally for DocumentPreview component and clear generateError
    React.useEffect(() => {
        window._activeTemplateId = activeTemplateId;
        setGenerateError(null);
    }, [activeTemplateId]);

    // Check PDF engine availability
    React.useEffect(() => {
        if (isDownloading) return;
        window.apiFetch('/api/documents/libreoffice-status')
            .then(r => r.json())
            .then(d => setPdfStatus(d))
            .catch(() => setPdfStatus({ available: false, engine: null }));
    }, [isDownloading]);

    // Auto-detect and format initial field values and word fields
    React.useEffect(() => {
        if (isDownloading) return;
        if (!data || !structuredVariables) return;
        let changed = false;
        const newData = { ...data };

        const formatNestedList = (list, fields, parentIndexStr = '') => {
            if (!Array.isArray(list)) return { list: [], changed: false };
            let listChanged = false;

            const newList = list.map((item, i) => {
                const newItem = { ...item };
                const currentIndexStr = parentIndexStr ? `${parentIndexStr}.${i + 1}` : String(i + 1);
                if (newItem.index !== currentIndexStr) {
                    newItem.index = currentIndexStr;
                    listChanged = true;
                }

                fields.forEach(f => {
                    if (f.type !== 'repeater' && f.name !== 'children') {
                        const val = item[f.name];
                        if (val !== undefined && val !== null) {
                            const processed = processFieldValue(f.name, val);
                            if (processed !== val) {
                                newItem[f.name] = processed;
                                listChanged = true;
                            }
                        }
                        if (f.name === 'amount') {
                            const hasWordField = fields.some(rf => rf.name === 'amount_in_words');
                            if (hasWordField && (!newItem['amount_in_words'] || newItem['amount_in_words'] === '')) {
                                newItem['amount_in_words'] = numberToGujaratiWords
                                    ? numberToGujaratiWords(newItem['amount'])
                                    : newItem['amount'];
                                listChanged = true;
                            }
                        }
                    }
                });

                if (Array.isArray(item.children) || fields.some(f => f.name === 'children' || f.type === 'repeater')) {
                    const childFields = fields.find(f => f.name === 'children' || f.type === 'repeater')?.fields || fields;
                    const { list: formattedChildren, changed: childrenChanged } = formatNestedList(item.children || [], childFields, currentIndexStr);
                    if (childrenChanged) {
                        newItem.children = formattedChildren;
                        listChanged = true;
                    }
                }

                return newItem;
            });

            return { list: newList, changed: listChanged };
        };

        structuredVariables.forEach(group => {
            if (group.type === 'text') {
                const name = group.name;
                const val = data[name];
                if (val !== undefined && val !== null) {
                    const processed = processFieldValue(name, val);
                    if (processed !== val) {
                        newData[name] = processed;
                        changed = true;
                    }
                }
            } else if (group.type === 'repeater') {
                const name = group.name;
                const list = data[name];
                if (Array.isArray(list)) {
                    const isNestedRepeater = name.toLowerCase().includes('children') ||
                        name.toLowerCase().includes('heir') ||
                        name.toLowerCase().includes('family') ||
                        name.toLowerCase().includes('member') ||
                        name.toLowerCase().includes('pedhinamu') ||
                        name.toLowerCase().includes('varasai') ||
                        group.fields.some(f => f.type === 'repeater');

                    if (isNestedRepeater) {
                        const { list: formatted, changed: listChanged } = formatNestedList(list, group.fields);
                        if (listChanged) {
                            newData[name] = formatted;
                            changed = true;
                        }
                    } else {
                        let listChanged = false;
                        const newList = list.map((item, i) => {
                            const newItem = { ...item };
                            if (newItem.index !== String(i + 1)) {
                                newItem.index = String(i + 1);
                                listChanged = true;
                            }
                            group.fields.forEach(f => {
                                const val = item[f.name];
                                if (val !== undefined && val !== null) {
                                    const processed = processFieldValue(f.name, val);
                                    if (processed !== val) {
                                        newItem[f.name] = processed;
                                        listChanged = true;
                                    }
                                }
                                if (f.name === 'amount') {
                                    const hasWordField = group.fields.some(rf => rf.name === 'amount_in_words');
                                    if (hasWordField && (!newItem['amount_in_words'] || newItem['amount_in_words'] === '')) {
                                        newItem['amount_in_words'] = numberToGujaratiWords
                                            ? numberToGujaratiWords(newItem['amount'])
                                            : newItem['amount'];
                                        listChanged = true;
                                    }
                                }
                            });
                            return newItem;
                        });
                        if (listChanged) {
                            newData[name] = newList;
                            changed = true;
                        }
                    }
                }
            }
        });

        // Generate amount_in_words if it is missing or empty
        const hasAmount = 'amount' in newData;
        const hasAmountInWords = structuredVariables.some(v => v.name === 'amount_in_words');
        if (hasAmount && hasAmountInWords && (!newData['amount_in_words'] || newData['amount_in_words'] === '')) {
            const amountVal = newData['amount'];
            newData['amount_in_words'] = numberToGujaratiWords
                ? numberToGujaratiWords(amountVal)
                : amountVal;
            changed = true;
        }

        if (changed) {
            setData(newData);
        }
    }, [activeTemplateId, structuredVariables, data, isDownloading]);

    const handleDocumentPreview = async () => {
        setPreviewOpen(true);

        try {
            setPreviewError(null);
            setPreviewLoading(true);

            if (!activeTemplateId || !activeTemplate) {
                throw new Error('No template selected. Please select a template first.');
            }
            if (!docx) {
                throw new Error("DOCX Preview library failed to load");
            }

            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) {
                throw new Error("Login required");
            }

            if (previewAbortControllerRef.current) {
                previewAbortControllerRef.current.abort();
            }
            const controller = new AbortController();
            previewAbortControllerRef.current = controller;

            const response = await fetch(
                `${window.API_BASE || ''}/api/documents/generate?format=docx`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        template_id: activeTemplateId,
                        data: data || {},
                        format: "docx"
                    }),
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                let errMsg = "Document generation failed";
                try {
                    const errData = await response.json();
                    errMsg = errData.detail || errMsg;
                } catch (_) { }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            setPreviewBlob(arrayBuffer);
        } catch (err) {
            if (err.name === 'AbortError') return;
            setPreviewError(err?.message || "Preview failed");
        } finally {
            setPreviewLoading(false);
        }
    };

    React.useEffect(() => {
        if (!previewBlob || !previewRef.current) return;

        const renderPreview = async () => {
            try {
                setPreviewError(null);

                if (!previewRef.current) {
                    return;
                }
                previewRef.current.innerHTML = "";

                const docxLib = window.docx || (window.loadDocxPreview ? await window.loadDocxPreview() : null);
                if (!docxLib) {
                    throw new Error("docx-preview not loaded");
                }

                await docxLib.renderAsync(
                    previewBlob,
                    previewRef.current,
                    undefined,
                    {
                        breakPages: true,
                        inWrapper: true
                    }
                );

                setPreviewRendered(true);
            } catch (err) {
                setPreviewError(err.message || "Preview failed");
            }
        };

        renderPreview();

        return () => {
            if (previewRef.current) {
                previewRef.current.innerHTML = "";
            }
        };
    }, [previewBlob, previewOpen]);

    const handlePdfPreview = async () => {
        if (isVisitor) {
            if (typeof onLogin === 'function') {
                onLogin();
            } else if (typeof window.openAuthModal === 'function') {
                window.openAuthModal();
            } else {
                const headerBtn = document.querySelector('header button:has-text("Log In / Register")');
                if (headerBtn) headerBtn.click();
            }
            alert('PDF Preview માટે Login / Register કરો (Login / Register to generate PDF)');
            return;
        }

        if (!activeTemplateId || !activeTemplate) {
            setPdfPreviewError('Please select a template first.');
            alert('કૃપા કરીને પહેલા ટેમ્પલેટ પસંદ કરો (Please select a template first).');
            return;
        }

        const tplId = activeTemplate?.template_id || activeTemplateId;

        if (!activeTemplate?.file_path) {
            setPdfPreviewError('This template has no DOCX file attached.');
            alert('આ ટેમ્પલેટમાં કોઈ DOCX ફાઇલ શામેલ નથી (This template has no DOCX file attached).');
            return;
        }

        setPdfPreviewLoading(true);
        setPdfPreviewError("");

        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) {
                if (typeof onLogin === 'function') {
                    onLogin();
                } else if (typeof window.openAuthModal === 'function') {
                    window.openAuthModal();
                }
                throw new Error("સત્ર સમાપ્ત થઈ ગયું છે, કૃપા કરીને ફરીથી લોગિન કરો (Session expired. Please login again).");
            }

            if (previewAbortControllerRef.current) {
                previewAbortControllerRef.current.abort();
            }
            const controller = new AbortController();
            previewAbortControllerRef.current = controller;

            // Call the preview-pdf endpoint
            const res = await fetch(`${window.API_BASE || ''}/api/documents/preview-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    template_id: tplId,
                    data: data || {}
                }),
                signal: controller.signal
            });

            if (!res.ok) {
                let errMsg = "PDF preview generation failed";
                try {
                    const errData = await res.json();
                    errMsg = errData.detail || errMsg;
                } catch (_) { }
                throw new Error(errMsg);
            }

            const resJson = await res.json();
            if (!resJson.success || !resJson.url) {
                throw new Error("પીડીએફ પૂર્વદર્શન બનાવવામાં નિષ્ફળતા (Failed to generate PDF preview)");
            }

            // Fetch the PDF binary via GET
            const pdfRes = await fetch(`${window.API_BASE || ''}${resJson.url}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });

            if (!pdfRes.ok) {
                throw new Error("પીડીએફ ફાઇલ ડાઉનલોડ કરવામાં નિષ્ફળતા (Failed to fetch PDF file)");
            }

            const blob = await pdfRes.blob();
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(pdfBlob);
            setPdfPreviewUrl(blobUrl);
            setPdfPreviewOpen(true);

        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('[FormPanel] PDF Preview error:', err);
            const msg = err.message === 'SERVER_OFFLINE'
                ? 'સર્વર ઓફલાઈન છે. કૃપા કરીને બેકએન્ડ ચાલુ કરો (Server offline. Please start the backend).'
                : (err.message || 'પીડીએફ પૂર્વદર્શન લોડ કરવામાં ભૂલ આવી (Error loading PDF preview).');
            setPdfPreviewError(msg);
            alert(`પૂર્વદર્શન ભૂલ (Preview Error): ${msg}`);
        } finally {
            setPdfPreviewLoading(false);
        }
    };

    const handleClosePdfPreview = () => {
        setPdfPreviewOpen(false);
        if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl("");
        }
    };


    // ─── Document Generation (DOCX Engine) ────────────────────────────────

    const validateRequiredFields = () => {
        let hasEmptyRequired = false;
        structuredVariables.forEach(group => {
            if (group.type === 'text') {
                const variable = group.name;
                const fieldConfig = (selectedTemplate?.fields && selectedTemplate.fields[variable]) || {};
                const isRequired = fieldConfig.required !== false;
                const val = data[variable];
                if (isRequired && (val === null || val === undefined || String(val).trim() === '')) {
                    hasEmptyRequired = true;
                }
            } else if (group.type === 'repeater') {
                const list = data[group.name];
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        group.fields.forEach(f => {
                            const fieldConfig = (selectedTemplate?.fields && selectedTemplate.fields[f.name]) || {};
                            if (fieldConfig.required !== false) {
                                const val = item[f.name];
                                if (val === null || val === undefined || String(val).trim() === '') {
                                    hasEmptyRequired = true;
                                }
                            }
                        });
                    });
                }
            }
        });
        return !hasEmptyRequired;
    };

    const validateFormatFields = () => {
        let hasFormatErrors = false;
        structuredVariables.forEach(group => {
            if (group.type === 'text') {
                const err = validateField(group.name, data[group.name]);
                if (err) hasFormatErrors = true;
            } else if (group.type === 'repeater') {
                const list = data[group.name];
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        group.fields.forEach(f => {
                            const err = validateField(f.name, item[f.name]);
                            if (err) hasFormatErrors = true;
                        });
                    });
                }
            }
        });
        return !hasFormatErrors;
    };

    const LockIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    );

    return (
        <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">


            {/* Template Selector */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <h2 className="text-[32px] font-black tracking-tight text-[#0f2460]">
                        1. દસ્તાવેજ પસંદ કરો
                    </h2>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePdfPreview();
                        }}
                        disabled={pdfPreviewLoading || isGenerating || isPdfLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white px-4 py-2 font-bold shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                        style={{ position: "relative", zIndex: 9999 }}
                        id="btn-pdf-preview-top"
                    >
                        {pdfPreviewLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>લોડ થઈ રહ્યું છે...</span>
                            </>
                        ) : (
                            <>📄 PDF Preview</>
                        )}
                    </button>
                </div>
                {templateLoadError && (
                    <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs font-semibold animate-fade-in">
                        ❌ {templateLoadError}
                    </div>
                )}
                <select
                    value={activeTemplateId || ""}
                    onChange={(e) => onTemplateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 font-semibold mb-1"
                    id="template-selector"
                >
                    <option value="" disabled>Select a DOCX template</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                {/* DOCX file status indicator */}
                {activeTemplate && (
                    <div className={`flex items-center gap-2 text-xs font-bold mt-2 px-2 py-1.5 rounded-lg ${activeTemplate.file_path ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        <span>{activeTemplate.file_path ? '✓' : '⚠'}</span>
                        <span>{activeTemplate.file_path
                            ? `DOCX template: ${activeTemplate.file_path.split('/').pop() || activeTemplate.file_path}`
                            : 'No DOCX file — upload in Admin Panel'}
                        </span>
                    </div>
                )}

                <p className="text-xs text-gray-400 mt-1">Form auto-generated from DOCX template variables.</p>
            </div>

            {/* Input Fields & Actions Block (only if activeTemplate exists) */}
            {!activeTemplate ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
                    <div className="text-center text-slate-400 p-8 max-w-sm">
                        <div className="text-6xl mb-4">📄</div>
                        <h3 className="font-black text-slate-700 text-lg">No template selected</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            Select a DOCX template from the dropdown above to begin entering document details.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col">
                    <h2 className="text-xl font-bold mb-4 text-primary">
                        2. માહિતી દાખલ કરો (Data Input)
                    </h2>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        {structuredVariables.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                <div className="text-3xl mb-2">🔍</div>
                                <p className="font-medium">No variables found.</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Upload a DOCX template with {'{{variable_name}}'} placeholders in the Admin Panel.
                                </p>
                            </div>
                        )}
                        {structuredVariables.map(group => {
                            if (group.type === 'repeater') {
                                const isNestedRepeater = group.name.toLowerCase().includes('children') ||
                                    group.name.toLowerCase().includes('heir') ||
                                    group.name.toLowerCase().includes('family') ||
                                    group.name.toLowerCase().includes('member') ||
                                    group.name.toLowerCase().includes('pedhinamu') ||
                                    group.name.toLowerCase().includes('varasai') ||
                                    group.fields.some(f => f.type === 'repeater');

                                if (isNestedRepeater && NestedRepeater) {
                                    return (
                                        <NestedRepeater
                                            key={group.name}
                                            name={group.name}
                                            fields={group.fields}
                                            data={data}
                                            setData={setData}
                                            isLocked={isLocked}
                                            showRequiredErrors={showRequiredErrors}
                                            templateFields={activeTemplate?.fields || {}}
                                        />
                                    );
                                }

                                // ── Cross-Repeater Copy Logic ──────────────────────────
                                // Peer groups are flat repeaters that share canonical pair:
                                // BUYERS ↔ SELLERS (case-insensitive)
                                const CROSS_COPY_PAIRS = [
                                    ['buyers', 'sellers']
                                ];
                                const nameLower = group.name.toLowerCase();
                                const peerGroupDefs = [];

                                CROSS_COPY_PAIRS.forEach(([a, b]) => {
                                    let peerName = null;
                                    if (nameLower === a) peerName = b;
                                    else if (nameLower === b) peerName = a;

                                    if (peerName) {
                                        // find the peer group object in structuredVariables
                                        const peerGroup = structuredVariables.find(
                                            g => g.type === 'repeater' && g.name.toLowerCase() === peerName
                                        );
                                        if (peerGroup) {
                                            peerGroupDefs.push({
                                                name: peerGroup.name,
                                                fields: peerGroup.fields,
                                                label: getRepeaterTitle(peerGroup.name).gu
                                            });
                                        }
                                    }
                                });

                                // Sync indices helper (local)
                                const syncIdx = (rawList) =>
                                    rawList.map((item, i) => ({ ...item, index: String(i + 1) }));

                                // Copy a single row from this group into a target group
                                const handleCopyRow = (sourceRow, targetGroupName) => {
                                    const targetGroupDef = structuredVariables.find(
                                        g => g.type === 'repeater' && g.name === targetGroupName
                                    );
                                    if (!targetGroupDef) return;

                                    const targetFieldNames = new Set(
                                        targetGroupDef.fields.map(f => f.name)
                                    );

                                    // Build new row for target: copy only matching fields
                                    const newRow = { index: '' };
                                    targetGroupDef.fields.forEach(f => {
                                        if (f.name !== 'index' && targetFieldNames.has(f.name)) {
                                            newRow[f.name] = sourceRow[f.name] !== undefined ? sourceRow[f.name] : '';
                                        }
                                    });

                                    setData(prev => {
                                        const targetList = Array.isArray(prev[targetGroupName]) ? prev[targetGroupName] : [];
                                        return {
                                            ...prev,
                                            [targetGroupName]: syncIdx([...targetList, newRow])
                                        };
                                    });
                                };

                                // Copy ALL rows from this group into a target group
                                const handleCopyAll = (targetGroupName) => {
                                    const sourceList = Array.isArray(data[group.name]) ? data[group.name] : [];
                                    if (sourceList.length === 0) return;

                                    const targetGroupDef = structuredVariables.find(
                                        g => g.type === 'repeater' && g.name === targetGroupName
                                    );
                                    if (!targetGroupDef) return;

                                    const targetFieldNames = new Set(
                                        targetGroupDef.fields.map(f => f.name)
                                    );

                                    setData(prev => {
                                        const targetList = Array.isArray(prev[targetGroupName]) ? prev[targetGroupName] : [];
                                        const newRows = sourceList.map(sourceRow => {
                                            const newRow = { index: '' };
                                            targetGroupDef.fields.forEach(f => {
                                                if (f.name !== 'index' && targetFieldNames.has(f.name)) {
                                                    newRow[f.name] = sourceRow[f.name] !== undefined ? sourceRow[f.name] : '';
                                                }
                                            });
                                            return newRow;
                                        });
                                        return {
                                            ...prev,
                                            [targetGroupName]: syncIdx([...targetList, ...newRows])
                                        };
                                    });
                                };

                                return (
                                    <DynamicRepeater
                                        key={group.name}
                                        name={group.name}
                                        fields={group.fields}
                                        data={data}
                                        setData={setData}
                                        isLocked={isLocked}
                                        showRequiredErrors={showRequiredErrors}
                                        templateFields={activeTemplate?.fields || {}}
                                        peerGroups={peerGroupDefs}
                                        onCopyRow={handleCopyRow}
                                        onCopyAll={handleCopyAll}
                                    />
                                );
                            }

                            const variable = group.name;
                            const fieldConfig = (activeTemplate?.fields && activeTemplate.fields[variable]) || {};
                            const readableLabel = fieldConfig.label
                                || variable.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().toUpperCase();
                            const inputType = getFieldType(variable, fieldConfig.type || 'text');

                            const isFieldRequired = fieldConfig.required !== false;
                            const val = data[variable] || '';
                            let fieldError = validateField(variable, val);
                            if (!fieldError && isFieldRequired && String(val).trim() === '' && showRequiredErrors) {
                                fieldError = "આ માહિતી ફરજિયાત છે (This field is required)";
                            }

                            return (
                                <InputField
                                    key={variable}
                                    variable={variable}
                                    type={inputType}
                                    label={readableLabel}
                                    value={val}
                                    options={fieldConfig.options || []}
                                    onChange={(val) => {
                                        setData(prev => {
                                            const processedVal = processFieldValue(variable, val);
                                            const newData = { ...prev, [variable]: processedVal };
                                            if (variable === 'amount') {
                                                const hasAmountInWords = structuredVariables.some(v => v.name === 'amount_in_words');
                                                if (hasAmountInWords) {
                                                    newData['amount_in_words'] = numberToGujaratiWords
                                                        ? numberToGujaratiWords(processedVal)
                                                        : processedVal;
                                                }
                                            }
                                            return newData;
                                        });
                                    }}
                                    disabled={isLocked}
                                    error={fieldError}
                                    required={isFieldRequired}
                                    placeholder={`Enter ${readableLabel}...`}
                                />
                            );
                        })}
                    </div>

                    {/* Draft Save (for logged in users) */}
                    {(role === 'user' || role === 'admin') && (
                        <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            {generateError && (
                                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold animate-fade-in">
                                    ❌ {generateError}
                                </div>
                            )}
                            {draftError && (
                                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold animate-fade-in">
                                    ❌ {draftError}
                                </div>
                            )}
                            {isLocked ? (
                                <>
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                        <span className="text-emerald-700">🔒 Document Finalized</span>
                                    </h3>
                                    <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded text-sm font-medium flex items-center justify-between shadow-inner">
                                        <span className="flex items-center gap-1">Status: <span className="font-bold bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider text-xs">LOCKED</span></span>
                                        <span className="font-mono bg-white px-2 py-0.5 rounded text-xs border border-emerald-300 font-bold">
                                            ID: {trackingId}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-amber-800 flex items-start gap-3">
                                        <span className="text-lg">ℹ️</span>
                                        <div>This document has been finalized and can no longer be edited. To make changes, please create a new document.</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">3. ડ્રાફ્ટ સેવ / લોક (Draft Save / Lock)</h3>
                                    {trackingId && (
                                        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded text-sm font-medium flex items-center justify-between">
                                            <span>Status: <span className="font-bold tracking-wider">DRAFT</span></span>
                                            <span className="font-mono bg-white px-2 py-0.5 rounded text-xs border border-amber-300 font-bold">
                                                ID: {trackingId}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-3">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    let baseName = activeTemplate?.slug;
                                                    if (!baseName && activeTemplate?.name) {
                                                        baseName = activeTemplate.name.trim().toLowerCase().replace(/[\s-]+/g, '_');
                                                    }
                                                    if (!baseName) baseName = activeTemplateId;

                                                    const datasetId = `${baseName}_demo`;

                                                    const res = await window.apiFetch(`/api/demo-datasets/${datasetId}`);
                                                    if (res.ok) {
                                                        const dataset = await res.json();
                                                        const mappedDataset = { ...dataset };
                                                        structuredVariables.forEach(group => {
                                                            if (group.type === 'repeater') {
                                                                const targetKey = group.name;
                                                                if (!mappedDataset[targetKey]) {
                                                                    // Find any key in the dataset that matches case-insensitively or is a known alias
                                                                    const foundKey = Object.keys(mappedDataset).find(k => {
                                                                        if (k.toLowerCase() === targetKey.toLowerCase()) return true;
                                                                        const aliases = ['family_members', 'members', 'heirs', 'heir_tree'];
                                                                        if (aliases.includes(k.toLowerCase()) && aliases.includes(targetKey.toLowerCase())) return true;
                                                                        return false;
                                                                    });
                                                                    if (foundKey) {
                                                                        mappedDataset[targetKey] = mappedDataset[foundKey];
                                                                    }
                                                                }
                                                            }
                                                        });

                                                        // ── EXTRA_PARAGRAPHS → paragraph textarea mapping ──
                                                        // Demo JSON stores paragraphs as EXTRA_PARAGRAPHS: [{text: "..."}, ...],
                                                        // but some templates use a single textarea variable (para.text or
                                                        // EXTRA_PARAGRAPHS_TEXT) instead of a repeater loop.
                                                        // The backend docx_engine handles this conversion at render time,
                                                        // so PDF works. But the frontend form needs explicit mapping.
                                                        const extraParas = mappedDataset['EXTRA_PARAGRAPHS'] || mappedDataset['extra_paragraphs'];
                                                        if (Array.isArray(extraParas) && extraParas.length > 0) {
                                                            // Check if the form uses a single textarea field for paragraphs
                                                            // (i.e., para.text or EXTRA_PARAGRAPHS_TEXT exists as a text field,
                                                            // NOT as a repeater group named EXTRA_PARAGRAPHS)
                                                            const paragraphTextFieldNames = ['para.text', 'EXTRA_PARAGRAPHS_TEXT'];
                                                            const hasRepeaterGroup = structuredVariables.some(
                                                                g => g.type === 'repeater' && g.name.toUpperCase() === 'EXTRA_PARAGRAPHS'
                                                            );
                                                            const textFieldVar = structuredVariables.find(
                                                                g => g.type === 'text' && paragraphTextFieldNames.some(
                                                                    pn => pn.toLowerCase() === g.name.toLowerCase()
                                                                )
                                                            );

                                                            if (textFieldVar && !hasRepeaterGroup) {
                                                                const combinedText = extraParas
                                                                    .map(p => (typeof p === 'string' ? p : (p?.text || '')))
                                                                    .filter(t => t.trim())
                                                                    .join('\n\n');
                                                                mappedDataset[textFieldVar.name] = combinedText;
                                                            }
                                                        }

                                                        setData(mappedDataset);
                                                    } else {
                                                        alert("No demo dataset found for this template.");
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("Failed to load demo dataset.");
                                                }
                                            }}
                                            className="w-full py-2.5 rounded font-bold transition flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                                        >
                                            🧪 Load Demo Data
                                        </button>
                                        <div className="space-y-3 pt-2">
                                            {isVisitor ? (
                                                <div id="form-panel-visitor-cta" className="p-5 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-xl space-y-4 border border-blue-700/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
                                                            🚀
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-white">દસ્તાવેજ બનાવવા માટે લૉગિન કરો</h4>
                                                            <p className="text-blue-200 text-[11px]">Login / Register to Generate Document</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-blue-100 text-xs leading-relaxed">
                                                        ડ્રાફ્ટ સાચવવા, વિગતો સંપાદિત કરવા અને અધિકૃત DOCX/PDF ડાઉનલોડ કરવા માટે મફત એકાઉન્ટ બનાવો (૧૦૦ ફ્રી ક્રેડિટ મેળવો).
                                                    </p>
                                                    <button
                                                        type="button"
                                                        id="btn-visitor-generate-login"
                                                        onClick={() => {
                                                            if (typeof onLogin === 'function') onLogin();
                                                            else if (typeof window.openAuthModal === 'function') window.openAuthModal();
                                                            else {
                                                                const headerBtn = document.querySelector('header button:has-text("Log In / Register")');
                                                                if (headerBtn) headerBtn.click();
                                                            }
                                                        }}
                                                        className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-black rounded-xl transition-all shadow-lg active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        <span>🚀 Login / Register → Generate Document</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={handlePdfPreview}
                                                        disabled={pdfPreviewLoading || isSavingDraft || isFinalizing || isGenerating || isPdfLoading}
                                                        className="w-full py-2.5 rounded font-black transition flex items-center justify-center gap-2 text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow active:scale-[0.99]"
                                                        id="btn-pdf-preview-actions"
                                                    >
                                                        {pdfPreviewLoading ? (
                                                            <>
                                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                                <span>લોડ થઈ રહ્યું છે (Loading Preview)...</span>
                                                            </>
                                                        ) : (
                                                            <>📄 PDF Preview (પૂર્વદર્શન)</>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={onSaveDraft}
                                                        disabled={isSavingDraft || isFinalizing}
                                                        className={`w-full py-2.5 rounded font-bold transition border flex items-center justify-center gap-2 ${isSavingDraft || isFinalizing
                                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                            : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                                                            }`}
                                                        id="btn-save-draft"
                                                    >
                                                        {isSavingDraft ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                                <span>સેવ થઈ રહ્યું છે (Saving...)</span>
                                                            </>
                                                        ) : (
                                                            <span>સેવ ડ્રાફ્ટ (Save Draft)</span>
                                                        )}
                                                    </button>
                                                    {(() => {
                                                        const creditCost = activeTemplate ? (activeTemplate.credit_cost !== undefined ? activeTemplate.credit_cost : 10) : 10;
                                                        const hasInsufficientCredits = userCredits !== null && userCredits !== undefined && userCredits < creditCost;

                                                        return (
                                                            <>
                                                                {userCredits !== null && userCredits !== undefined && (
                                                                    <div className={`p-3 rounded-lg border text-[11px] font-bold transition flex items-center gap-2 mb-1
                                                                        ${hasInsufficientCredits
                                                                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                                                                            : 'bg-blue-50 border-blue-100 text-blue-800'
                                                                        }`}
                                                                    >
                                                                        <span>🪙</span>
                                                                        <div className="flex-1">
                                                                            આ ટેમ્પલેટ લોક કરવાની કિંમત: <span className="underline">{creditCost} ક્રેડિટ્સ</span>.
                                                                            {hasInsufficientCredits ? (
                                                                                <div className="text-[10px] text-rose-600 mt-0.5 font-semibold">તમારી પાસે અપૂરતી ક્રેડિટ છે (Insufficient credits: {userCredits} available).</div>
                                                                            ) : (
                                                                                <div className="text-[10px] text-blue-600 mt-0.5 font-semibold">તમારી વર્તમાન ક્રેડિટ: {userCredits} (Current credits: {userCredits}).</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        if (hasInsufficientCredits) {
                                                                            alert(`આ દસ્તાવેજ લોક કરવા માટે અપૂરતી ક્રેડિટ. જરૂરી ક્રેડિટ: ${creditCost}, તમારી ક્રેડિટ: ${userCredits}. (Insufficient credits to lock. Required: ${creditCost}, Yours: ${userCredits}.)`);
                                                                            return;
                                                                        }
                                                                        const isValid = validateRequiredFields();
                                                                        if (!isValid) {
                                                                            setShowRequiredErrors(true);
                                                                            setGenerateError("કૃપા કરીને બધી ફરજિયાત માહિતી ભરો (Please fill all required fields).");
                                                                            return;
                                                                        }
                                                                        const isFormatValid = validateFormatFields();
                                                                        if (!isFormatValid) {
                                                                            setGenerateError("કૃપા કરીને અમાન્ય આધાર, પાન અથવા મોબાઈલ વિગતો સુધારો (Please correct invalid Aadhaar, PAN, or Mobile details).");
                                                                            return;
                                                                        }
                                                                        onFinalSubmit();
                                                                    }}
                                                                    disabled={isSavingDraft || isFinalizing || hasInsufficientCredits}
                                                                    className={`w-full py-2.5 rounded font-bold transition flex items-center justify-center gap-2 text-white shadow
                                                                    ${isSavingDraft || isFinalizing || hasInsufficientCredits
                                                                            ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                                                            : 'bg-red-600 hover:bg-red-700'
                                                                        }`}
                                                                    id="btn-final-lock"
                                                                >
                                                                    {isFinalizing ? (
                                                                        <>
                                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                            <span>લોક થઈ રહ્યું છે... (Finalizing...)</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <LockIcon /> ફાઈનલ લોક કરો (Final Lock - {creditCost} Credits)
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* PREVIEW MODAL */}
            {previewOpen && (
                <PreviewModal
                    previewRef={previewRef}
                    previewLoading={previewLoading}
                    previewError={previewError}
                    onClose={() => {
                        setPreviewOpen(false);
                        setPreviewBlob(null);
                        setPreviewRendered(false);
                    }}
                />
            )}

            {/* PDF PREVIEW MODAL */}
            {pdfPreviewOpen && (
                <PdfPreviewModal
                    pdfUrl={pdfPreviewUrl}
                    onClose={handleClosePdfPreview}
                    activeTemplateId={activeTemplateId}
                />
            )}
        </div>
    );
};

window.FormPanel = React.memo(FormPanel);
export default FormPanel;
