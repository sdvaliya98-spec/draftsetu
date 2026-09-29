import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * ApplicantMultiSelectField
 * 
 * Supports:
 * 1. Dynamic multi-selection of existing applicants from the APPLICANTS list.
 * 2. Adding one or more custom/other occupant names (owner_other_names).
 * 3. Removable chips/badges for custom occupant names.
 * 4. Automatic deduplication, trimming, and legacy owner_name fallback.
 */
const ApplicantMultiSelectField = ({
    selectedIndices = [],
    otherNames = [],
    applicants = [],
    ownerName = '',
    onChange,
    disabled = false,
    borderClass = '',
    onFocus,
    variable = '',
    placeholder = 'કબજેદાર પસંદ કરો / Select Occupants...'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newOtherNameInput, setNewOtherNameInput] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Normalize selectedIndices to positive numbers
    const currentIndices = useMemo(() => {
        if (!Array.isArray(selectedIndices)) return [];
        return selectedIndices
            .map(x => (typeof x === 'number' ? x : parseInt(x, 10)))
            .filter(n => !isNaN(n) && n > 0);
    }, [selectedIndices]);

    // Normalize otherNames to trimmed strings
    const currentOtherNames = useMemo(() => {
        if (!Array.isArray(otherNames)) return [];
        return otherNames
            .map(x => (typeof x === 'string' ? x.trim() : ''))
            .filter(Boolean);
    }, [otherNames]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Compute combined occupant names in order: 1. Selected Applicants, 2. Other Manual Names
    const { combinedNames, displaySummary, totalSelectedCount } = useMemo(() => {
        const names = [];
        const seenLower = new Set();

        // 1. Resolve selected applicant names
        if (currentIndices.length > 0 && Array.isArray(applicants)) {
            currentIndices.forEach(idx => {
                const app = applicants.find(a => a.index === idx);
                const nameStr = app ? (app.name ? app.name.trim() : `Applicant ${app.index}`) : `Applicant ${idx}`;
                if (nameStr && !seenLower.has(nameStr.toLowerCase())) {
                    names.push(nameStr);
                    seenLower.add(nameStr.toLowerCase());
                }
            });
        }

        // 2. Resolve other occupant names
        if (currentOtherNames.length > 0) {
            currentOtherNames.forEach(oname => {
                const trimmed = oname.trim();
                if (trimmed && !seenLower.has(trimmed.toLowerCase())) {
                    names.push(trimmed);
                    seenLower.add(trimmed.toLowerCase());
                }
            });
        }

        if (names.length > 0) {
            return {
                combinedNames: names,
                displaySummary: names.join(', '),
                totalSelectedCount: names.length
            };
        }

        // Legacy fallback
        if (ownerName && typeof ownerName === 'string' && ownerName.trim()) {
            return {
                combinedNames: [ownerName.trim()],
                displaySummary: ownerName.trim(),
                totalSelectedCount: 0
            };
        }

        return {
            combinedNames: [],
            displaySummary: '',
            totalSelectedCount: 0
        };
    }, [currentIndices, currentOtherNames, applicants, ownerName]);

    // Helper to notify parent component with all synced fields
    const notifyChanges = useCallback((nextIndices, nextOthers) => {
        const names = [];
        const seenLower = new Set();

        // 1. Resolve selected applicants
        nextIndices.forEach(idx => {
            const app = applicants.find(a => a.index === idx);
            const nameStr = app ? (app.name ? app.name.trim() : `Applicant ${app.index}`) : `Applicant ${idx}`;
            if (nameStr && !seenLower.has(nameStr.toLowerCase())) {
                names.push(nameStr);
                seenLower.add(nameStr.toLowerCase());
            }
        });

        // 2. Resolve other names (deduplicated against applicants and other names)
        const validOthers = [];
        nextOthers.forEach(raw => {
            const trimmed = (typeof raw === 'string' ? raw : '').trim();
            if (trimmed && !seenLower.has(trimmed.toLowerCase())) {
                names.push(trimmed);
                seenLower.add(trimmed.toLowerCase());
                validOthers.push(trimmed);
            }
        });

        const ownerNameStr = names.join(', ');

        if (onChange) {
            onChange(nextIndices, validOthers, ownerNameStr, names);
        }
    }, [applicants, onChange]);

    // Toggle applicant checkbox
    const handleToggleIndex = (idx) => {
        if (disabled) return;
        const exists = currentIndices.includes(idx);
        let nextIndices = exists
            ? currentIndices.filter(i => i !== idx)
            : [...currentIndices, idx];

        nextIndices.sort((a, b) => a - b);
        notifyChanges(nextIndices, currentOtherNames);
    };

    // Select all applicants
    const handleSelectAll = () => {
        if (disabled || applicants.length === 0) return;
        const allIndices = applicants.map(a => a.index).sort((a, b) => a - b);
        notifyChanges(allIndices, currentOtherNames);
    };

    // Clear all selections & other names
    const handleClearAll = () => {
        if (disabled) return;
        notifyChanges([], []);
    };

    // Add a manual custom occupant name
    const handleAddOtherName = () => {
        if (disabled) return;
        const val = newOtherNameInput.trim();
        if (!val) return;

        // Check if already in current other names (case-insensitive)
        const existsInOthers = currentOtherNames.some(n => n.toLowerCase() === val.toLowerCase());
        let nextOthers = currentOtherNames;
        if (!existsInOthers) {
            nextOthers = [...currentOtherNames, val];
        }

        setNewOtherNameInput('');
        notifyChanges(currentIndices, nextOthers);

        // Keep input focused for quick multi-add
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Remove an individual manual occupant name
    const handleRemoveOtherName = (idxToRemove) => {
        if (disabled) return;
        const nextOthers = currentOtherNames.filter((_, i) => i !== idxToRemove);
        notifyChanges(currentIndices, nextOthers);
    };

    return (
        <div ref={containerRef} className="relative w-full min-w-[200px]">
            {/* Trigger Button */}
            <button
                type="button"
                id={variable ? `field-${variable}` : undefined}
                name={variable || undefined}
                data-field-key={variable || undefined}
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(prev => !prev);
                        if (onFocus) onFocus();
                    }
                }}
                className={`w-full px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center justify-between gap-2 text-left transition-all ${borderClass || 'border-slate-200 focus:border-blue-500'} ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white hover:border-slate-300'}`}
            >
                <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                    {totalSelectedCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                            {totalSelectedCount}
                        </span>
                    )}
                    <span className={`text-xs truncate ${displaySummary ? 'text-slate-800' : 'text-slate-400 font-normal'}`}>
                        {displaySummary || placeholder}
                    </span>
                </div>
                <svg
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Popover */}
            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1.5 w-80 max-w-[92vw] bg-white border border-slate-200 rounded-xl shadow-2xl p-3.5 animate-modal">
                    {/* Header */}
                    <div className="border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800">
                                👥 આ નોંધથી દાખલ કબજેદાર
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 font-sans">
                                ({applicants.length} Applicants)
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            Occupant Applicants / Additional Occupants
                        </p>
                    </div>

                    {/* Quick Action Buttons */}
                    {applicants.length > 0 && (
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-50">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                બધા પસંદ કરો (Select All)
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="text-[11px] font-bold text-slate-400 hover:text-red-600 hover:underline"
                            >
                                સાફ કરો (Clear)
                            </button>
                        </div>
                    )}

                    {/* Section 1: Dynamic Applicants Checklist */}
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 my-1">
                        {applicants.length > 0 ? (
                            applicants.map(app => {
                                const isChecked = currentIndices.includes(app.index);
                                return (
                                    <label
                                        key={app.index}
                                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleIndex(app.index)}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                        />
                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                                            {app.index}
                                        </span>
                                        <span className="truncate flex-1">
                                            {app.name ? app.name : `અરજદાર ${app.index}`}
                                        </span>
                                    </label>
                                );
                            })
                        ) : (
                            <div className="p-2 text-center bg-slate-50 border border-slate-200/60 rounded-lg text-[11px] text-slate-600">
                                <p className="text-[10px] text-slate-500">
                                    અરજદારોની યાદી ખાલી છે. નીચે અન્ય કબજેદારનું નામ ઉમેરી શકો છો.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Custom / Other Occupant Names */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-slate-700">
                                ➕ અન્ય કબજેદાર (Other Occupant)
                            </span>
                            {currentOtherNames.length > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 font-sans">
                                    +{currentOtherNames.length} Custom
                                </span>
                            )}
                        </div>

                        {/* Removable Chips for Other Occupants */}
                        {currentOtherNames.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-slate-50 rounded-lg border border-slate-100">
                                {currentOtherNames.map((nameStr, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold shadow-2xs"
                                    >
                                        <span className="truncate max-w-[150px]">{nameStr}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveOtherName(idx);
                                            }}
                                            title="કાઢી નાખો / Remove"
                                            className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 text-[10px] font-black transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Input + Add Button */}
                        <div className="flex items-center gap-1.5">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newOtherNameInput}
                                onChange={(e) => setNewOtherNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAddOtherName();
                                    }
                                }}
                                placeholder="અન્ય કબજેદારનું નામ લખો..."
                                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleAddOtherName}
                                disabled={!newOtherNameInput.trim()}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${newOtherNameInput.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                                + ઉમેરો
                            </button>
                        </div>
                    </div>

                    {/* Footer with Done button */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                            {totalSelectedCount > 0 ? `${totalSelectedCount} કબજેદાર પસંદ કર્યા` : 'કોઈ પસંદગી નથી'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                        >
                            થઈ ગયું (Done)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Global backward compatibility
if (typeof window !== 'undefined') {
    window.ApplicantMultiSelectField = ApplicantMultiSelectField;
}
export default ApplicantMultiSelectField;
