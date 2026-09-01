import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const PartyManager = ({ title, parties, onChange, disabled }) => {
    const addParty = () => {
        onChange([...parties, { name: '', age: '', occupation: '', address: '', pan: '', aadhar: '' }]);
    };

    const updateParty = (index, field, value) => {
        const newParties = [...parties];
        newParties[index][field] = value;
        onChange(newParties);
    };

    const removeParty = (index) => {
        onChange(parties.filter((_, i) => i !== index));
    };

    return (
        <div className="mb-6 border border-gray-300 rounded-lg p-4 bg-gray-50 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">{title}</h3>
                <button onClick={addParty} disabled={disabled} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50">+ Add Person</button>
            </div>
            {parties.map((p, i) => (
                <div key={i} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg relative shadow-sm">
                    <button onClick={() => removeParty(i)} disabled={disabled} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50">&times;</button>
                    <div className="font-bold text-sm text-gray-500 mb-2 border-b pb-1">Person {i + 1}</div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <InputField label="Name (નામ)" value={p.name} onChange={v => updateParty(i, 'name', v)} disabled={disabled} />
                        <InputField label="Age (ઉંમર)" value={p.age} onChange={v => updateParty(i, 'age', v)} disabled={disabled} type="number" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        <InputField label="Occupation (ધંધો)" value={p.occupation} onChange={v => updateParty(i, 'occupation', v)} disabled={disabled} />
                        <InputField label="Address (સરનામું)" value={p.address} onChange={v => updateParty(i, 'address', v)} disabled={disabled} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="PAN Card" value={p.pan} onChange={v => updateParty(i, 'pan', v)} disabled={disabled} />
                        <InputField label="Aadhar No" value={p.aadhar} onChange={v => updateParty(i, 'aadhar', v)} disabled={disabled} />
                    </div>
                </div>
            ))}
            {parties.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No persons added yet. Click "+ Add Person" to begin.</div>}
        </div>
    );
};

// Global backward compatibility
window.PartyManager = PartyManager;
export default PartyManager;
