
const DateInputField = ({ value, onChange, disabled, borderClass, placeholder = "DD/MM/YYYY", className, onFocus, variable }) => {
    const inputRef = React.useRef(null);
    const fpRef = React.useRef(null);
    const [displayVal, setDisplayVal] = React.useState("");
    const isDirtyRef = React.useRef(false);

    // Diagnostic tracking for state before/after updates
    const prevValueRef = React.useRef(value);
    React.useEffect(() => {
        if (prevValueRef.current !== value) {
            console.log(`[DateInputField Diagnostic] Field: ${variable || 'date'}, State before update: "${prevValueRef.current}", State after update: "${value}"`);
            prevValueRef.current = value;
        }
    }, [value, variable]);

    // Keep latest onChange in a ref to prevent recreating flatpickr
    const onChangeRef = React.useRef(onChange);
    React.useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Helper to format ISO YYYY-MM-DD to DD/MM/YYYY
    const toDisplay = (val) => {
        return window.formatDateDDMMYYYY ? window.formatDateDDMMYYYY(val) : val;
    };

    // Helper to convert DD/MM/YYYY to ISO YYYY-MM-DD if valid
    const toStorage = (val) => {
        if (!val) return "";
        const str = String(val).trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            const parts = str.split("/");
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day) {
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
        }
        return str; // Return raw string if invalid/incomplete
    };

    // Sync external value to displayVal
    React.useEffect(() => {
        setDisplayVal(toDisplay(value));
        isDirtyRef.current = false;
    }, [value]);

    // Initialize/Destroy Flatpickr once on mount
    React.useEffect(() => {
        if (!inputRef.current) return;

        fpRef.current = window.flatpickr ? window.flatpickr(inputRef.current, {
            dateFormat: "d/m/Y",
            allowInput: true,
            clickOpens: true,
            onChange: (selectedDates, dateStr) => {
                if (selectedDates.length > 0) {
                    const dateObj = selectedDates[0];
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const isoDate = `${year}-${month}-${day}`;
                    console.log(`[DateInputField Selected] Field: ${variable || 'date'}, Selected date value: "${isoDate}"`);
                    onChangeRef.current(isoDate);
                } else {
                    console.log(`[DateInputField Selected] Field: ${variable || 'date'}, Selected date value: "${dateStr}"`);
                    onChangeRef.current(dateStr);
                }
            }
        }) : null;

        return () => {
            if (fpRef.current) {
                fpRef.current.destroy();
            }
        };
    }, [variable]); // Re-run only if field name changes

    // Sync external value with flatpickr selected date
    React.useEffect(() => {
        if (fpRef.current) {
            if (value) {
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    const dateObj = window.flatpickr ? window.flatpickr.parseDate(value, "Y-m-d") : null;
                    if (dateObj) fpRef.current.setDate(dateObj, false);
                } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                    const dateObj = window.flatpickr ? window.flatpickr.parseDate(value, "d/m/Y") : null;
                    if (dateObj) fpRef.current.setDate(dateObj, false);
                }
            } else {
                fpRef.current.clear(false);
            }
        }
    }, [value]);

    // Handle keystroke typing & auto-slashing
    const handleInputChange = (e) => {
        let val = e.target.value;
        let clean = val.replace(/\D/g, "");
        let formatted = "";
        
        if (clean.length > 0) {
            formatted += clean.substring(0, 2);
        }
        if (clean.length > 2) {
            formatted += "/" + clean.substring(2, 4);
        }
        if (clean.length > 4) {
            formatted += "/" + clean.substring(4, 8);
        }
        
        setDisplayVal(formatted);
        isDirtyRef.current = true;

        // Propagate immediately if it's a complete valid date or if it's empty
        if (formatted.length === 10 || formatted === "") {
            onChangeRef.current(toStorage(formatted));
            isDirtyRef.current = false;
        } else {
            // Propagate partial/incomplete string so validation is aware
            onChangeRef.current(formatted);
        }
    };

    const handleInputBlur = () => {
        if (isDirtyRef.current) {
            onChangeRef.current(toStorage(displayVal));
            isDirtyRef.current = false;
        }
    };

    const finalClass = className || `w-full px-3 py-2 border rounded focus:outline-none ${borderClass} ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`;

    return (
        <div className="relative w-full">
            <input
                ref={inputRef}
                type="text"
                value={displayVal}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onFocus={onFocus}
                placeholder={placeholder}
                disabled={disabled}
                className={`${finalClass} pr-10`}
                id="custom-date-input"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        </div>
    );
};

const InputField = ({ label, value, onChange, type = "text", placeholder = "", disabled = false, options = [], error = null, required = true, variable = "", path = "" }) => {
    const borderClass = error 
        ? "border-red-300 focus:border-red-500 focus:ring-red-500 focus:ring-1" 
        : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
        
    const lowerVar = (variable || "").toLowerCase();
    const isAadhaar = lowerVar === "aadhaar" || lowerVar === "buyer_aadhaar" || lowerVar === "seller_aadhaar" || lowerVar.includes("aadhaar");
    const finalPlaceholder = isAadhaar ? "123456789012 / XXXX XXXX 4587" : placeholder;

    const focusPath = path || variable;
    const triggerFocus = () => {
        if (!focusPath) return;
        window.activeFocusedFieldPath = focusPath;
        window.dispatchEvent(new CustomEvent('focus-preview-field', { detail: { path: focusPath } }));
    };

    return (
        <div className="mb-4">
            <label className="flex items-center justify-between text-sm font-semibold text-gray-700 mb-1">
                <span>
                    {label}
                    {required && <span className="text-red-500 ml-1 font-bold">*</span>}
                </span>
                {focusPath && (
                    <button
                        type="button"
                        onClick={triggerFocus}
                        title="View in Document"
                        className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold font-sans transition-colors active:scale-95"
                    >
                        👁 <span className="underline">View in Document</span>
                    </button>
                )}
            </label>
            {type === "textarea" ? (
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={triggerFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={(lowerVar === 'extra_paragraphs_text' || lowerVar === 'para.text') ? 6 : 3}
                    className={`w-full px-3 py-2 border rounded focus:outline-none custom-scrollbar resize-y ${borderClass} ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                />
            ) : (type === "select" || type === "dropdown") ? (
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={triggerFocus}
                    disabled={disabled}
                    className={`w-full px-3 py-2 border rounded bg-white focus:outline-none ${borderClass} ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                >
                    <option value="">Select {label}...</option>
                    {options.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : type === "hybrid-dropdown" ? (
                <HybridDropdownField
                    value={value}
                    onChange={onChange}
                    onFocus={triggerFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    options={options}
                    variable={variable}
                    borderClass={borderClass}
                />
            ) : type === "date" ? (
                <DateInputField
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    borderClass={borderClass}
                    placeholder={placeholder || "DD/MM/YYYY"}
                    onFocus={triggerFocus}
                    variable={variable}
                />
            ) : (
                <input
                    type={type}
                    value={(type === 'number' && typeof value === 'string') ? value.replace(/,/g, '') : (value || "")}
                    onChange={e => onChange(e.target.value)}
                    onFocus={triggerFocus}
                    placeholder={finalPlaceholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2 border rounded focus:outline-none ${borderClass} ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                />
            )}
            {error && (
                <p className="mt-1 text-xs text-red-500 font-bold font-sans">{error}</p>
            )}
        </div>
    );
};

// Global backward compatibility
window.InputField = InputField;
