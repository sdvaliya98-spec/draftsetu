
const HybridDropdownField = ({ 
    label,
    value, 
    onChange, 
    placeholder = "", 
    disabled = false, 
    options = [], 
    variable = "", 
    error = null,
    required = false,
    borderClass = "",
    onFocus = null
}) => {
    const listId = `list-${variable || Math.random().toString(36).substr(2, 9)}`;
    const finalBorderClass = borderClass || (error 
        ? "border-red-300 focus:border-red-500 focus:ring-red-500 focus:ring-1" 
        : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50");

    const inputElement = (
        <div className="relative w-full">
            <input
                type="text"
                list={listId}
                value={value || ""}
                onChange={e => onChange(e.target.value)}
                onFocus={onFocus}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-3 py-2 border rounded-xl bg-white focus:outline-none transition-all ${finalBorderClass} ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
            <datalist id={listId}>
                {(options || []).map((option, i) => (
                    <option key={i} value={option} />
                ))}
            </datalist>
        </div>
    );

    // If label is provided, render as a full field container. Otherwise render just the input.
    if (label) {
        return (
            <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1 font-bold">*</span>}
                </label>
                {inputElement}
                {error && (
                    <p className="mt-1 text-xs text-red-500 font-bold font-sans">{error}</p>
                )}
            </div>
        );
    }

    return inputElement;
};

// Global backward compatibility
window.HybridDropdownField = HybridDropdownField;
