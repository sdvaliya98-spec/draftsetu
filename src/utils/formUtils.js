import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const processFieldValue = (name, val) => {
    if (val === null || val === undefined) return '';
    const sVal = String(val);
    const lowerName = name.toLowerCase();

    // Aadhaar variables
    if (lowerName === 'aadhaar' || lowerName === 'buyer_aadhaar' || lowerName === 'seller_aadhaar') {
        return sVal;
    }

    // PAN variables
    if (lowerName === 'pan' || lowerName === 'buyer_pan' || lowerName === 'seller_pan') {
        return sVal.toUpperCase();
    }

    // Mobile variables
    if (lowerName === 'mobile' || lowerName === 'phone') {
        return sVal.replace(/\D/g, '').slice(0, 10);
    }

    // Amount variable
    if (lowerName === 'amount') {
        let clean = sVal.replace(/,/g, '').replace(/[^\d.]/g, '');
        const parts = clean.split('.');
        if (parts.length > 2) {
            clean = parts[0] + '.' + parts.slice(1).join('');
        }
        if (clean === '') return '';

        const decParts = clean.split('.');
        let integerPart = decParts[0];
        const decimalPart = decParts.length > 1 ? '.' + decParts[1] : '';

        const lastThree = integerPart.substring(integerPart.length - 3);
        const otherNumbers = integerPart.substring(0, integerPart.length - 3);
        if (otherNumbers !== '') {
            const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
            return formattedOthers + ',' + lastThree + decimalPart;
        } else {
            return lastThree + decimalPart;
        }
    }

    return val;
};

const parseOptionsList = (opts) => {
    if (!opts) return [];
    let list = [];
    if (Array.isArray(opts)) {
        list = opts;
    } else if (typeof opts === 'string') {
        list = opts.includes('\n') ? opts.split('\n') : opts.split(',');
    }
    const clean = [];
    const seen = new Set();
    for (const item of list) {
        const val = typeof item === 'object' && item !== null ? (item.value || item.label || '') : String(item || '');
        const trimmed = val.trim();
        if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            clean.push(trimmed);
        }
    }
    return clean;
};

const getFieldType = (variableName, fallbackType = 'text') => {
    const lowerName = (variableName || '').toLowerCase();

    // If a specific custom type is configured (like 'hybrid-dropdown', 'select', 'dropdown', 'number', 'textarea'), respect it
    if (fallbackType && fallbackType !== 'text') {
        return fallbackType;
    }

    if (lowerName === 'extra_paragraphs_text' || lowerName === 'para.text') {
        return 'textarea';
    }

    if (lowerName.includes('date') || lowerName.includes('dob')) {
        return 'date';
    }

    if (lowerName.includes('address')) {
        return 'textarea';
    }

    return fallbackType || 'text';
};

const validateField = (name, val) => {
    if (val === null || val === undefined || val === '') {
        return null;
    }
    const sVal = String(val);
    const lowerName = name.toLowerCase();

    // Mobile check
    if (lowerName === 'mobile' || lowerName === 'phone') {
        if (sVal.length !== 10) {
            return "અમાન્ય મોબાઈલ નંબર: ૧૦ અંક હોવા જોઈએ (Invalid Mobile: must be 10 digits)";
        }
    }

    // Date check
    if (lowerName.includes('date') || lowerName.includes('dob')) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(sVal)) {
            const parts = sVal.split("-");
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
                return "અમાન્ય તારીખ (Invalid Date)";
            }
            return null;
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(sVal)) {
            const parts = sVal.split("/");
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
                return "અમાન્ય તારીખ (Invalid Date)";
            }
            return null;
        }
        return "અમાન્ય તારીખ: કૃપા કરીને સાચી તારીખ DD/MM/YYYY ફોર્મેટમાં લખો (Invalid date: please use DD/MM/YYYY format)";
    }

    return null;
};

const REPEATER_TITLES = {
    BUYERS: { gu: 'ખરીદનારાઓ (Buyers)', icon: '👥' },
    SELLERS: { gu: 'વેચનારાઓ (Sellers)', icon: '👥' },
    VENDORS: { gu: 'વેચનારાઓ (Vendors)', icon: '👥' },
    VENDOR_REPRESENTATIVES: { gu: 'વેચનાર પ્રતિનિધિઓ (Vendor Representatives)', icon: '👤' },
    PURCHASERS: { gu: 'ખરીદનારાઓ (Purchasers)', icon: '👥' },
    PURCHASER_REPRESENTATIVES: { gu: 'ખરીદનાર પ્રતિનિધિઓ (Purchaser Representatives)', icon: '👤' },
    PLOTS: { gu: 'પ્લોટ્સ વિગતો (Plots)', icon: '📐' },
    WITNESSES: { gu: 'સાક્ષીઓ (Witnesses)', icon: '✍️' },
    LAND_RECORDS: { gu: 'જમીન વિગતો / રેકોર્ડ્સ (Land Records)', icon: '🏗️' },
    PAYMENTS: { gu: 'ચુકવણી વિગતો / હપ્તાઓ (Payments)', icon: '💰' },
    HEIRS: { gu: 'વારસદારો (Heirs)', icon: '👪' },
    APPLICANTS: { gu: 'અરજદારો (Applicants)', icon: '📝' }
};

const REPEATER_FIELD_LABELS = {
    name: 'નામ (Name)',
    owner_name: 'આ નોંધથી દાખલ કબજેદાર (Occupant Applicants)',
    address: 'સરનામું (Address)',
    pan: 'પાન કાર્ડ (PAN)',
    aadhaar: 'આધાર નંબર (Aadhaar)',
    mobile: 'મોબાઈલ (Mobile)',
    phone: 'ફોન (Phone)',
    amount: 'રકમ (Amount)',
    date: 'તારીખ (Date)',
    index: 'ક્રમ (No.)'
};

const getRepeaterTitle = (name) => {
    const key = name.toUpperCase();
    if (REPEATER_TITLES[key]) {
        return REPEATER_TITLES[key];
    }
    return { gu: name.replace(/_/g, ' ').toUpperCase(), icon: '📋' };
};

const sanitizeTemplatePayload = (raw, activeTpl) => {
    if (!raw || typeof raw !== 'object') return raw;
    const conds = activeTpl?.conditions || activeTpl?.variables?.conditions || activeTpl?.fieldOrder?.conditions;
    if (!conds || typeof conds !== 'object' || Object.keys(conds).length === 0) {
        return raw;
    }
    const cleanVal = (v) => {
        if (v === undefined || v === null) return '';
        let s = String(v).trim();
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1).trim();
        }
        return s.toLowerCase();
    };

    const out = { ...raw };

    const checkCondActive = (cond) => {
        if (!cond) return true;
        let fieldName = cond.field || cond.var || cond.variable;
        let op = cond.op || cond.operator || '==';
        let targetVal = cond.value !== undefined ? cond.value : (cond.val !== undefined ? cond.val : '');
        if (!fieldName && cond.raw && typeof cond.raw === 'string') {
            const cleanCond = cond.raw.replace(/^\(+|\)+$/g, '').trim();
            const m = cleanCond.match(/^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*(==|!=)\s*["']?([^"']+)["']?\s*$/);
            if (m) {
                fieldName = m[1];
                op = m[2];
                targetVal = m[3];
            }
        }
        if (!fieldName) return true;
        let rawVal = raw[fieldName];
        if (rawVal === undefined) {
            const foundKey = Object.keys(raw).find(k => k.toLowerCase() === fieldName.toLowerCase());
            if (foundKey) rawVal = raw[foundKey];
        }
        if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
            const defaultVal = activeTpl?.fields?.[fieldName]?.default
                || activeTpl?.fields?.[fieldName.toLowerCase()]?.default
                || activeTpl?.fields?.[fieldName.toUpperCase()]?.default
                || '';
            rawVal = defaultVal;
        }
        const currentVal = cleanVal(rawVal);
        const cleanTarget = cleanVal(targetVal);
        if (cleanTarget === 'true' || cleanTarget === 'false') {
            const isTruthy = Boolean(rawVal) && String(rawVal).trim() !== '' && String(rawVal).trim().toLowerCase() !== 'false' && String(rawVal).trim() !== '0';
            const expected = cleanTarget === 'true';
            return op === '==' ? (isTruthy === expected) : (isTruthy !== expected);
        }
        return op === '==' ? (currentVal === cleanTarget) : (currentVal !== cleanTarget);
    };

    const tplGroups = activeTpl?.groups || activeTpl?.variables?.groups || activeTpl?.fieldOrder?.groups || null;
    const tplGroupNames = tplGroups
        ? (Array.isArray(tplGroups)
            ? tplGroups.map(g => (typeof g === 'string' ? g : (g.name || g.group || ''))).filter(Boolean)
            : Object.keys(tplGroups))
        : [];

    const scalarSuffixes = [
        '_name', '_pan', '_address', '_type', '_aadhaar', '_share',
        '_age', '_relation', '_mobile', '_email', '_phone', '_date',
        '_amount', '_no', '_number', '_details', '_desc', '_status'
    ];

    const isRepeaterCollection = (name) => {
        if (!name || typeof name !== 'string') return false;
        const lower = name.toLowerCase();
        if (scalarSuffixes.some(s => lower.endsWith(s) || lower.includes('_entity_'))) {
            return false;
        }
        if (tplGroupNames.length > 0) {
            return tplGroupNames.some(g => g.toLowerCase() === lower);
        }
        return (
            lower.includes('representative') ||
            lower.includes('rep') ||
            lower.endsWith('s') ||
            Array.isArray(raw[name]) ||
            Array.isArray(raw[Object.keys(raw).find(k => k.toLowerCase() === lower)])
        );
    };

    const partyPairs = [];
    const handledGroups = new Set();
    for (const [gRep, cRep] of Object.entries(conds)) {
        if (!cRep || !isRepeaterCollection(gRep)) continue;
        const field = cRep.field || cRep.var || cRep.variable;
        const gRepLower = gRep.toLowerCase();
        if (gRepLower.includes('representative') || gRepLower.includes('rep') || gRepLower.includes('agent')) {
            for (const [gBase, cBase] of Object.entries(conds)) {
                if (gBase === gRep || !isRepeaterCollection(gBase)) continue;
                const gBaseLower = gBase.toLowerCase();
                if (gBaseLower.includes('representative') || gBaseLower.includes('rep') || gBaseLower.includes('agent')) continue;
                const baseField = cBase?.field || cBase?.var || cBase?.variable;
                if (baseField && baseField.toLowerCase() === (field || '').toLowerCase()) {
                    partyPairs.push({ gBase, gRep, field, cBase, cRep });
                    handledGroups.add(gBase.toLowerCase());
                    handledGroups.add(gRep.toLowerCase());
                }
            }
        }
    }

    const deduplicateRows = (list) => {
        if (!Array.isArray(list) || list.length <= 1) return Array.isArray(list) ? list : [];
        const seen = new Set();
        const unique = [];
        list.forEach((item, idx) => {
            if (!item || typeof item !== 'object') {
                unique.push(item);
                return;
            }
            const nonIndexEntries = Object.entries(item)
                .filter(([k]) => k.toLowerCase() !== 'index' && k.toLowerCase() !== '_index' && k.toLowerCase() !== 'id')
                .map(([k, v]) => `${k.toLowerCase()}:${String(v ?? '').trim().toLowerCase()}`)
                .sort();
            const sig = nonIndexEntries.filter(s => !s.endsWith(':')).join('|');
            if (sig && seen.has(sig)) {
                return;
            }
            if (sig) seen.add(sig);
            unique.push({ ...item, index: String(unique.length + 1) });
        });
        return unique;
    };

    for (const { gBase, gRep, cBase, cRep } of partyPairs) {
        const repActive = checkCondActive(cRep);
        const baseActive = checkCondActive(cBase);

        const baseKeys = Object.keys(out).filter(k => k.toLowerCase() === gBase.toLowerCase());
        if (baseKeys.length === 0) baseKeys.push(gBase);
        const repKeys = Object.keys(out).filter(k => k.toLowerCase() === gRep.toLowerCase());
        if (repKeys.length === 0) repKeys.push(gRep);

        if (repActive) {
            let rawReps = null;
            for (const rk of repKeys) {
                if (Array.isArray(raw[rk]) && raw[rk].length > 0) {
                    rawReps = raw[rk];
                    break;
                }
            }
            if (!rawReps) rawReps = raw[repKeys[0]] || [];
            const reps = deduplicateRows(rawReps);
            for (const rk of repKeys) out[rk] = reps;
            for (const bk of baseKeys) out[bk] = reps;
        } else if (baseActive) {
            let rawBase = null;
            for (const bk of baseKeys) {
                if (Array.isArray(raw[bk]) && raw[bk].length > 0) {
                    rawBase = raw[bk];
                    break;
                }
            }
            if (!rawBase) rawBase = raw[baseKeys[0]] || [];
            const baseData = deduplicateRows(rawBase);
            for (const bk of baseKeys) out[bk] = baseData;
            for (const rk of repKeys) out[rk] = [];
        } else {
            for (const bk of baseKeys) out[bk] = [];
            for (const rk of repKeys) out[rk] = [];
        }
    }

    for (const [itemName, cond] of Object.entries(conds)) {
        if (handledGroups.has(itemName.toLowerCase())) continue;
        if (!checkCondActive(cond)) {
            if (Array.isArray(out[itemName])) {
                out[itemName] = [];
            } else if (typeof out[itemName] === 'string' || out[itemName] === undefined) {
                out[itemName] = '';
            }
        }
    }

    for (const [key, val] of Object.entries(out)) {
        if (!isRepeaterCollection(key)) {
            if (Array.isArray(val) || (val !== null && typeof val === 'object')) {
                out[key] = '';
            }
        }
    }
    return out;
};

const resetInactiveBranchData = (currentData, fieldName, newVal, tpl) => {
    if (!currentData || typeof currentData !== 'object') return currentData;
    const conds = tpl?.conditions || tpl?.variables?.conditions || tpl?.fieldOrder?.conditions;
    if (!conds || typeof conds !== 'object') return { ...currentData, [fieldName]: newVal };

    const clean = (v) => {
        if (v === undefined || v === null) return '';
        let s = String(v).trim();
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1).trim();
        }
        return s.toLowerCase();
    };

    const nextData = { ...currentData, [fieldName]: newVal };

    const checkCond = (cond) => {
        if (!cond) return true;
        let cField = cond.field || cond.var || cond.variable;
        let op = cond.op || cond.operator || '==';
        let targetVal = cond.value !== undefined ? cond.value : (cond.val !== undefined ? cond.val : '');
        if (!cField && cond.raw && typeof cond.raw === 'string') {
            const cleanCond = cond.raw.replace(/^\(+|\)+$/g, '').trim();
            const m = cleanCond.match(/^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*(==|!=)\s*["']?([^"']+)["']?\s*$/);
            if (m) {
                cField = m[1];
                op = m[2];
                targetVal = m[3];
            }
        }
        if (!cField) return true;
        let valToCheck = nextData[cField];
        if (valToCheck === undefined) {
            const foundKey = Object.keys(nextData).find(k => k.toLowerCase() === cField.toLowerCase());
            if (foundKey) valToCheck = nextData[foundKey];
        }
        if (valToCheck === undefined || valToCheck === null || String(valToCheck).trim() === '') {
            const defaultVal = tpl?.fields?.[cField]?.default
                || tpl?.fields?.[cField.toLowerCase()]?.default
                || tpl?.fields?.[cField.toUpperCase()]?.default
                || '';
            valToCheck = defaultVal;
        }
        const curVal = clean(valToCheck);
        const tgtVal = clean(targetVal);
        if (tgtVal === 'true' || tgtVal === 'false') {
            const isTruthy = Boolean(valToCheck) && String(valToCheck).trim() !== '' && String(valToCheck).trim().toLowerCase() !== 'false' && String(valToCheck).trim() !== '0';
            const expected = tgtVal === 'true';
            return op === '==' ? (isTruthy === expected) : (isTruthy !== expected);
        }
        return op === '==' ? (curVal === tgtVal) : (curVal !== tgtVal);
    };

    for (const [targetName, cond] of Object.entries(conds)) {
        if (!cond) continue;
        let cField = cond.field || cond.var || cond.variable;
        if (!cField && cond.raw && typeof cond.raw === 'string') {
            const m = cond.raw.match(/^\s*([a-zA-Z0-9_\u0A80-\u0AFF]+)\s*(==|!=)/);
            if (m) cField = m[1];
        }
        // Only reset if this condition actually depends on the field that changed
        if (cField && cField.toLowerCase() === fieldName.toLowerCase()) {
            const isActive = checkCond(cond);
            if (!isActive) {
                // Inactive! Reset matching keys in nextData
                const matchingKeys = Object.keys(nextData).filter(k => k.toLowerCase() === targetName.toLowerCase());
                if (matchingKeys.length === 0) matchingKeys.push(targetName);
                for (const mk of matchingKeys) {
                    if (Array.isArray(nextData[mk]) || Array.isArray(currentData[mk])) {
                        nextData[mk] = [];
                    } else if (typeof nextData[mk] === 'string' || nextData[mk] !== undefined) {
                        nextData[mk] = '';
                    }
                }
            }
        }
    }
    return nextData;
};

// Global backward compatibility
if (typeof window !== 'undefined') {
    window.processFieldValue = processFieldValue;
    window.getFieldType = getFieldType;
    window.validateField = validateField;
    window.REPEATER_TITLES = REPEATER_TITLES;
    window.REPEATER_FIELD_LABELS = REPEATER_FIELD_LABELS;
    window.getRepeaterTitle = getRepeaterTitle;
    window.parseOptionsList = parseOptionsList;
    window.sanitizeTemplatePayload = sanitizeTemplatePayload;
    window.resetInactiveBranchData = resetInactiveBranchData;
}

export {
    processFieldValue,
    getFieldType,
    validateField,
    REPEATER_TITLES,
    REPEATER_FIELD_LABELS,
    getRepeaterTitle,
    parseOptionsList,
    sanitizeTemplatePayload,
    resetInactiveBranchData
};
