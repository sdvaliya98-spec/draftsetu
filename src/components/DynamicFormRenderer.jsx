import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const DynamicFormRenderer = ({ fields = [], data = {}, setData, isLocked = false, showRequiredErrors = false }) => {
    return (
        <div className="space-y-4">
            {fields.map(field => {
                const variable = field.name || field.variable;
                if (!variable) return null;

                if (field.type === 'repeater') {
                    return null; 
                }

                const readableLabel = field.label || variable.replace(/_/g, ' ').toUpperCase();
                const val = data[variable] || '';
                
                if (field.type === "hybrid-dropdown") {
                    return (
                        <HybridDropdownField
                            key={variable}
                            label={readableLabel}
                            variable={variable}
                            value={val}
                            options={field.options || []}
                            onChange={(newVal) => setData(prev => ({ ...prev, [variable]: newVal }))}
                            disabled={isLocked}
                            required={field.required !== false}
                            placeholder={`Enter ${readableLabel}...`}
                        />
                    );
                }

                return (
                    <InputField
                        key={variable}
                        variable={variable}
                        type={field.type || 'text'}
                        label={readableLabel}
                        value={val}
                        options={field.options || []}
                        onChange={(newVal) => setData(prev => ({ ...prev, [variable]: newVal }))}
                        disabled={isLocked}
                        required={field.required !== false}
                        placeholder={`Enter ${readableLabel}...`}
                    />
                );
            })}
        </div>
    );
};

// Global backward compatibility
window.DynamicFormRenderer = DynamicFormRenderer;
export default DynamicFormRenderer;
