const DocumentServicesPanel = ({ isOpen, onClose, menuItem, onSelectTemplate }) => {
    const categories = React.useMemo(() => {
        return menuItem?.children || [];
    }, [menuItem]);

    const [selectedCategoryId, setSelectedCategoryId] = React.useState(null);

    React.useEffect(() => {
        if (isOpen) {
            if (categories.length > 0) {
                setSelectedCategoryId(categories[0].id);
            } else {
                setSelectedCategoryId(null);
            }
        }
    }, [isOpen, categories]);

    if (!isOpen) return null;

    const selectedCategory = categories.find(c => c.id === selectedCategoryId) || categories[0];
    const templates = selectedCategory?.children || [];

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 font-sans select-none animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col w-full max-w-5xl h-[80vh] overflow-hidden animate-modal" onClick={e => e.stopPropagation()}>
                
                {/* iORA Style Official Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-8 py-5 flex justify-between items-center flex-shrink-0 text-white border-b border-blue-950">
                    <div>
                        <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-1">
                            <span>🏛️ મહેસૂલ વિભાગ પ્રેરિત પોર્ટલ</span>
                            <span>·</span>
                            <span>iORA Inspired Selection</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1">
                            દસ્તાવેજ સેવાઓ અને ડ્રાફ્ટ નમૂનાઓ <span className="text-sm font-semibold text-blue-200">(Document Services & Templates)</span>
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl font-bold transition active:scale-95 cursor-pointer border-0"
                        type="button"
                    >
                        &times;
                    </button>
                </div>

                {/* Main Two-Column Layout */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left Side: Category Sidebar (દસ્તાવેજ શ્રેણી) */}
                    <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col flex-shrink-0">
                        <div className="bg-slate-100/80 px-6 py-3.5 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                            દસ્તાવેજ શ્રેણી (Categories)
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                            {categories.map((cat) => {
                                const isSelected = cat.id === selectedCategoryId;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`w-full text-left px-5 py-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 font-bold scale-[1.02]' 
                                                : 'bg-white border-slate-200/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-semibold'
                                        }`}
                                        type="button"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{cat.icon || '📁'}</span>
                                            <span className="text-xs md:text-sm tracking-tight">{cat.label}</span>
                                        </div>
                                        {isSelected && (
                                            <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side: Templates Grid (દસ્તાવેજ પ્રકાર) */}
                    <div className="flex-1 flex flex-col bg-white">
                        <div className="bg-slate-50 px-6 py-3.5 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 flex justify-between items-center">
                            <span>દસ્તાવેજ પ્રકાર (Templates list)</span>
                            {selectedCategory && (
                                <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                                    {selectedCategory.label}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {templates.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                    <span className="text-5xl grayscale opacity-30">📄</span>
                                    <h4 className="text-slate-800 font-bold text-sm mt-3">આ શ્રેણીમાં કોઈ દસ્તાવેજ ઉપલબ્ધ નથી</h4>
                                    <p className="text-slate-400 text-xs mt-1">No templates found in this category.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            onClick={() => {
                                                if (tpl.template_id) {
                                                    onSelectTemplate(tpl.template_id);
                                                    onClose();
                                                }
                                            }}
                                            className="w-full text-left bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 p-5 rounded-2xl transition-all duration-200 group flex flex-col justify-between h-40 cursor-pointer"
                                            type="button"
                                        >
                                            <div className="w-full">
                                                <div className="flex justify-between items-start">
                                                    <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                                                        {tpl.icon || '📄'}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-300 font-mono tracking-wider uppercase group-hover:text-blue-500 transition-colors">
                                                        Official Template
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-black text-slate-800 group-hover:text-blue-600 mt-4 leading-snug tracking-tight transition-colors">
                                                    {tpl.label}
                                                </h3>
                                            </div>
                                            <div className="w-full flex justify-between items-center border-t border-slate-100 pt-3 mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
                                                <span>દસ્તાવેજ બનાવો (Create)</span>
                                                <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer Section */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200/80 flex justify-end items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mr-auto hidden sm:inline">
                        © મહેસૂલ વિભાગ પ્રેરિત દસ્તાવેજ ઓટોમેશન પોર્ટલ - DraftSetu
                    </span>
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-700 transition active:scale-95 cursor-pointer border-0"
                        type="button"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

window.DocumentServicesPanel = DocumentServicesPanel;
