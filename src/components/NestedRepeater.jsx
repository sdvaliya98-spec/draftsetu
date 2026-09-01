import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const syncNestedIndices = (list, parentIndexStr = '') => {
    if (!Array.isArray(list)) return [];
    return list.map((item, i) => {
        const currentIndexStr = parentIndexStr
            ? `${parentIndexStr}.${i + 1}`
            : String(i + 1);

        const newItem = {
            ...item,
            index: currentIndexStr
        };

        if (Array.isArray(item.children)) {
            newItem.children = syncNestedIndices(item.children, currentIndexStr);
        }

        return newItem;
    });
};

const NestedRepeaterNode = React.memo(({ node, fields, onUpdate, onRemove, onDuplicate, path, level, isLocked, showRequiredErrors, groupName, absolutePath }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    const childList = Array.isArray(node.children) ? node.children : [];

    const handleFieldChange = (fieldName, value) => {
        const processed = processFieldValue(fieldName, value);
        onUpdate(path, { ...node, [fieldName]: processed });
    };

    const handleAddChild = () => {
        const newChild = { index: '' };
        fields.forEach(f => {
            if (f.name !== 'index' && f.type !== 'repeater' && f.name !== 'children') {
                newChild[f.name] = '';
            }
        });
        newChild.children = [];
        onUpdate(path, { ...node, children: [...childList, newChild] });
    };

    const handleUpdateChild = (childPath, updatedChild) => {
        const childIndex = childPath[0];
        const remaining = childPath.slice(1);

        const newChildren = [...childList];
        if (remaining.length === 0) {
            newChildren[childIndex] = updatedChild;
        } else {
            const updateDeep = (item, p, val) => {
                if (p.length === 1) {
                    const nextChildren = [...(item.children || [])];
                    nextChildren[p[0]] = val;
                    return { ...item, children: nextChildren };
                }
                const nextChildren = [...(item.children || [])];
                nextChildren[p[0]] = updateDeep(nextChildren[p[0]], p.slice(1), val);
                return { ...item, children: nextChildren };
            };
            newChildren[childIndex] = updateDeep(newChildren[childIndex], remaining, updatedChild);
        }

        onUpdate(path, { ...node, children: newChildren });
    };

    const handleRemoveChild = (childIndex) => {
        const newChildren = childList.filter((_, idx) => idx !== childIndex);
        onUpdate(path, { ...node, children: newChildren });
    };

    const handleDuplicateChild = (childIndex) => {
        const target = childList[childIndex];
        if (!target) return;
        const cloneDeep = (item) => {
            const copy = { ...item };
            if (Array.isArray(item.children)) {
                copy.children = item.children.map(cloneDeep);
            }
            return copy;
        };
        const duplicated = cloneDeep(target);
        const newChildren = [...childList];
        newChildren.splice(childIndex + 1, 0, duplicated);
        onUpdate(path, { ...node, children: newChildren });
    };

    const nodeLabel = node.name || `વારસદાર / સભ્ય (Member) ${node.index}`;

    return (
        <div className="nested-node-container relative pl-6 border-l border-slate-200 mt-3 first:mt-0">
            {/* Tree Connector Line */}
            <div className="absolute left-0 top-0 bottom-0 w-6 flex items-start pointer-events-none">
                <div className="w-4 h-6 border-b border-slate-200 border-l rounded-bl-lg"></div>
            </div>

            {/* Node Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3 border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2">
                        {/* Collapse/Expand Toggle */}
                        {childList.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                            >
                                <span className="text-xs font-bold font-mono">{isCollapsed ? '+' : '-'}</span>
                            </button>
                        )}
                        {/* Index Badge */}
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-black px-2 py-0.5 rounded-full font-sans">
                            {node.index}
                        </span>
                        <span className="text-xs font-black text-slate-800">{nodeLabel}</span>
                    </div>

                    {/* Node Actions */}
                    <div className="flex items-center gap-1">
                        {/* Add Child */}
                        <button
                            type="button"
                            onClick={handleAddChild}
                            disabled={isLocked}
                            title="લાભાર્થી/વારસ ઉમેરો (Add Child Node)"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        {/* Duplicate */}
                        <button
                            type="button"
                            onClick={() => onDuplicate(path[path.length - 1])}
                            disabled={isLocked}
                            title="નકલ કરો (Duplicate Node)"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                        </button>
                        {/* Remove */}
                        <button
                            type="button"
                            onClick={() => onRemove(path[path.length - 1])}
                            disabled={isLocked}
                            title="દૂર કરો (Remove Node)"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form Fields for this Node */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fields.filter(f => f.name !== 'index' && f.name !== 'children' && f.type !== 'repeater').map(f => {
                        const fType = getFieldType(f.name);
                        const isAutoWordField = f.name === 'amount_in_words';
                        const isFieldRequired = f.name !== 'index' && f.name !== 'amount_in_words' && f.name !== 'children' && f.type !== 'repeater';
                        let fieldError = validateField(f.name, node[f.name]);
                        if (!fieldError && isFieldRequired && (!node[f.name] || String(node[f.name]).trim() === '') && showRequiredErrors) {
                            fieldError = "Required";
                        }
                        const readableLabel = (REPEATER_FIELD_LABELS && REPEATER_FIELD_LABELS[f.name.toLowerCase()]) 
                            || f.name.replace(/_/g, ' ').toUpperCase();

                        const pathStr = `${groupName}.${absolutePath.join('.children.')}.${f.name}`;

                        return (
                            <InputField
                                key={f.name}
                                variable={f.name}
                                type={fType}
                                label={readableLabel}
                                value={node[f.name] || ''}
                                onChange={v => handleFieldChange(f.name, v)}
                                disabled={isLocked || isAutoWordField}
                                error={fieldError}
                                required={isFieldRequired}
                                placeholder={`Enter ${readableLabel}...`}
                                path={pathStr}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Render Children Recursively */}
            {childList.length > 0 && !isCollapsed && (
                <div className="nested-children-list mt-3 space-y-3">
                    {childList.map((child, idx) => (
                        <NestedRepeaterNode
                            key={idx}
                            node={child}
                            fields={fields}
                            onUpdate={handleUpdateChild}
                            onRemove={handleRemoveChild}
                            onDuplicate={handleDuplicateChild}
                            path={[idx]}
                            level={level + 1}
                            isLocked={isLocked}
                            showRequiredErrors={showRequiredErrors}
                            groupName={groupName}
                            absolutePath={[...absolutePath, idx]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

const NestedRepeater = React.memo(({ name, fields, data, setData, isLocked, showRequiredErrors }) => {
    const list = Array.isArray(data[name]) ? data[name] : [];

    const titleInfo = getRepeaterTitle(name);

    // Sync nested indices helper
    const syncNestedList = (rawList) => {
        return syncNestedIndices(rawList);
    };

    // Auto empty row check
    React.useEffect(() => {
        if (list.length === 0 && !isLocked) {
            addItem();
        }
    }, [list.length]);

    const addItem = () => {
        const newItem = { index: '' };
        fields.forEach(f => {
            if (f.name !== 'index' && f.type !== 'repeater' && f.name !== 'children') {
                newItem[f.name] = '';
            }
        });
        newItem.children = [];

        setData(prev => ({
            ...prev,
            [name]: syncNestedList([...list, newItem])
        }));
    };

    const updateRootItem = (path, updatedNode) => {
        const rootIndex = path[0];
        const remaining = path.slice(1);

        const newList = [...list];
        if (remaining.length === 0) {
            newList[rootIndex] = updatedNode;
        } else {
            const updateDeep = (item, p, val) => {
                if (p.length === 1) {
                    const nextChildren = [...(item.children || [])];
                    nextChildren[p[0]] = val;
                    return { ...item, children: nextChildren };
                }
                const nextChildren = [...(item.children || [])];
                nextChildren[p[0]] = updateDeep(nextChildren[p[0]], p.slice(1), val);
                return { ...item, children: nextChildren };
            };
            newList[rootIndex] = updateDeep(newList[rootIndex], remaining, updatedNode);
        }

        setData(prev => ({
            ...prev,
            [name]: syncNestedList(newList)
        }));
    };

    const removeRootItem = (index) => {
        const filtered = list.filter((_, i) => i !== index);
        setData(prev => ({
            ...prev,
            [name]: syncNestedList(filtered)
        }));
    };

    const duplicateRootItem = (index) => {
        const target = list[index];
        if (!target) return;

        const cloneDeep = (item) => {
            const copy = { ...item };
            if (Array.isArray(item.children)) {
                copy.children = item.children.map(cloneDeep);
            }
            return copy;
        };

        const duplicated = cloneDeep(target);
        const newList = [...list];
        newList.splice(index + 1, 0, duplicated);

        setData(prev => ({
            ...prev,
            [name]: syncNestedList(newList)
        }));
    };

    return (
        <div className="mb-8 border border-slate-200 rounded-[24px] bg-white shadow-sm overflow-hidden animate-modal">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{titleInfo.icon}</span>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm tracking-tight">{titleInfo.gu}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-sans">
                            {name.replace(/_/g, ' ')} Nested Tree
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    disabled={isLocked}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md active:scale-95 font-sans"
                >
                    <span>+ Add Root Member</span>
                </button>
            </div>

            {/* Tree Container */}
            <div className="p-6 bg-slate-50/30">
                <div className="space-y-4">
                    {list.map((node, idx) => (
                        <NestedRepeaterNode
                            key={idx}
                            node={node}
                            fields={fields}
                            onUpdate={updateRootItem}
                            onRemove={removeRootItem}
                            onDuplicate={duplicateRootItem}
                            path={[idx]}
                            level={0}
                            isLocked={isLocked}
                            showRequiredErrors={showRequiredErrors}
                            groupName={name}
                            absolutePath={[idx]}
                        />
                    ))}
                </div>

                {list.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50">
                        No family tree nodes added. Click "+ Add Root Member" above.
                    </div>
                )}
            </div>
        </div>
    );
});

// Global backward compatibility
window.NestedRepeater = NestedRepeater;
export default NestedRepeater;
