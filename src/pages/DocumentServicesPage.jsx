import React, { useState, useMemo, useEffect } from 'react';
import Footer from '../components/Footer.jsx';

/**
 * DocumentServicesPage - Full-page Document Services & Template Selection Interface.
 * 
 * Flow:
 * 1. Full-page category navigation and template browsing with search.
 * 2. When user selects a template, opens the existing DraftSetu Document Editor directly.
 * 3. Preserves existing session/draft recovery, repeaters, previews, and editor functionality.
 */
const DocumentServicesPage = ({
    menuItem,
    allTemplates = [],
    onSelectTemplate,
    onNavigate
}) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Derive categories from menuItem
    const categories = useMemo(() => {
        return menuItem?.children || [];
    }, [menuItem]);

    // Initialize selected category to first category if available
    useEffect(() => {
        if (categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);

    // Active category object
    const selectedCategory = useMemo(() => {
        if (!selectedCategoryId && categories.length > 0) return categories[0];
        return categories.find(c => String(c.id) === String(selectedCategoryId)) || categories[0];
    }, [categories, selectedCategoryId]);

    // Templates belonging to the selected category
    const categoryTemplates = useMemo(() => {
        if (!selectedCategory) return [];

        const categoryChildren = (selectedCategory.children && selectedCategory.children.length > 0)
            ? selectedCategory.children
            : (selectedCategory.template_id ? [selectedCategory] : []);

        const fromMenu = categoryChildren
            .filter(t => t && (t.template_id || t.id))
            .map(t => {
                const tplId = t.template_id || t.id;
                const richTpl = allTemplates.find(at => 
                    String(at.id) === String(tplId) || 
                    String(at.template_id) === String(tplId) ||
                    String(at.numeric_id) === String(tplId)
                );
                return {
                    id: tplId,
                    template_id: tplId,
                    label: richTpl?.name || t.label || t.name,
                    name: richTpl?.name || t.label || t.name,
                    icon: t.icon || richTpl?.icon || '📄',
                    category: selectedCategory.label,
                    description: richTpl?.description || t.description || 'ગુજરાત મહેસૂલ અને કાયદાકીય નિયમો અનુસાર પ્રમાણિત ડ્રાફ્ટ ફોર્મેટ.',
                    raw: richTpl || t
                };
            });

        // Also check if any templates in allTemplates have this category name or menu_item_id
        const existingIds = new Set(fromMenu.map(t => String(t.id)));
        const catLabelLower = (selectedCategory.label || '').toLowerCase();

        const fromAll = allTemplates.filter(at => {
            if (existingIds.has(String(at.id))) return false;
            if (at.menu_item_id && String(at.menu_item_id) === String(selectedCategory.id)) return true;
            if (at.category && catLabelLower.includes((at.category || '').toLowerCase())) return true;
            return false;
        }).map(at => ({
            id: at.id,
            template_id: at.id,
            label: at.name,
            name: at.name,
            icon: at.icon || '📄',
            category: selectedCategory.label,
            description: at.description || 'ગુજરાત મહેસૂલ અને કાયદાકીય નિયમો અનુસાર પ્રમાણિત ડ્રાફ્ટ ફોર્મેટ.',
            raw: at
        }));

        return [...fromMenu, ...fromAll];
    }, [selectedCategory, allTemplates]);

    // Filter templates based on real-time search query
    const filteredTemplates = useMemo(() => {
        if (!searchQuery.trim()) return categoryTemplates;
        const q = searchQuery.toLowerCase().trim();
        
        // Search in current category first
        const inCat = categoryTemplates.filter(t => 
            (t.label || t.name || '').toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q)
        );

        if (inCat.length > 0) return inCat;

        // If none found in current category, search across all available templates
        return allTemplates.filter(at => 
            (at.name || at.label || '').toLowerCase().includes(q) ||
            (at.description || '').toLowerCase().includes(q) ||
            (at.category || '').toLowerCase().includes(q)
        ).map(at => ({
            id: at.id,
            template_id: at.id,
            label: at.name,
            name: at.name,
            icon: at.icon || '📄',
            category: at.category || selectedCategory?.label || 'દસ્તાવેજ',
            description: at.description || 'ગુજરાત મહેસૂલ અને કાયદાકીય નિયમો અનુસાર પ્રમાણિત ડ્રાફ્ટ ફોર્મેટ.',
            raw: at
        }));
    }, [categoryTemplates, searchQuery, allTemplates, selectedCategory]);

    // Direct Template Selection: Immediately opens the existing Document Editor
    const handleTemplateClick = (tpl) => {
        const templateId = tpl.template_id || tpl.id;
        if (typeof onSelectTemplate === 'function') {
            onSelectTemplate(templateId);
        } else if (typeof onNavigate === 'function') {
            onNavigate(`editor?template=${templateId}`);
        }
    };

    return (
        <div className="w-full min-h-screen flex flex-col bg-slate-50 font-sans select-none" id="document-services-fullpage">
            
            {/* Top Official Portal Header */}
            <div className="bg-gradient-to-r from-[#0d1b3e] via-[#132c69] to-[#1e3a8a] text-white shadow-xl flex-shrink-0 border-b border-blue-950 relative overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-sky-400 w-full" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-[11px] font-black tracking-widest text-amber-400 uppercase">
                                <span>🏛️ DRAFTSETU DOCUMENT SERVICES</span>
                                <span>·</span>
                                <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Digital Legal Drafting
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-1 text-white" id="doc-services-header">
                                દસ્તાવેજ સેવાઓ અને ડ્રાફ્ટ નમૂનાઓ{' '}
                                <span className="text-sm md:text-base font-semibold text-blue-200">
                                    (Document Services & Templates)
                                </span>
                            </h2>
                            <p className="text-xs md:text-sm text-blue-100/90 mt-1 max-w-2xl font-gujarati">
                                ગુજરાત મહેસૂલ, જમીન વ્યવહાર અને કાનૂની દસ્તાવેજો માટે ડિજિટલ ડ્રાફ્ટિંગ અને ટેમ્પલેટ પસંદગી પોર્ટલ.
                            </p>
                        </div>

                        {/* Return to Home Action */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onNavigate && onNavigate('home')}
                                id="btn-return-home"
                                type="button"
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition active:scale-95 border border-white/20 cursor-pointer"
                            >
                                <span>←</span>
                                <span>મુખ્ય પેજ (Home)</span>
                            </button>
                        </div>
                    </div>

                    {/* Progress Stepper: Direct 2-Step Workflow */}
                    <div className="mt-6 pt-4 border-t border-blue-900/60 flex items-center justify-between max-w-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-900 font-black text-xs flex items-center justify-center shadow-md">
                                ૧
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white">દસ્તાવેજ પસંદગી</span>
                                <span className="text-[10px] text-blue-200">1. Template Selection</span>
                            </div>
                        </div>

                        <div className="h-0.5 flex-1 mx-4 bg-blue-800" />

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-900/60 text-blue-300 border border-blue-800 font-black text-xs flex items-center justify-center">
                                ૨
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-blue-300">દસ્તાવેજ એડિટર અને ડાઉનલોડ</span>
                                <span className="text-[10px] text-blue-400">2. Document Editor & Generation</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area: Category Navigation & Template Grid */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
                <div className="flex-1 flex flex-col md:flex-row gap-6 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    
                    {/* Left Column: Category Navigation (દસ્તાવેજ શ્રેણી) */}
                    <div className="w-full md:w-80 lg:w-96 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col flex-shrink-0">
                        <div className="p-5 border-b border-slate-200/80 bg-slate-100/60 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">
                                    દસ્તાવેજ શ્રેણી (Categories)
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    કુલ {categories.length} શ્રેણીઓ ઉપલબ્ધ છે
                                </p>
                            </div>
                            <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                                {categories.length}
                            </span>
                        </div>

                        {/* Categories List */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 custom-scrollbar max-h-[300px] md:max-h-[calc(100vh-320px)]" id="category-nav">
                            {categories.map((cat) => {
                                const isSelected = selectedCategory && String(cat.id) === String(selectedCategory.id);
                                const tplCount = cat.children ? cat.children.length : (cat.template_id ? 1 : 0);

                                return (
                                    <button
                                        key={cat.id}
                                        id={`btn-category-${cat.id}`}
                                        onClick={() => {
                                            setSelectedCategoryId(cat.id);
                                            setSearchQuery('');
                                        }}
                                        type="button"
                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-700 border-blue-700 text-white shadow-lg shadow-blue-700/20 font-bold scale-[1.01]' 
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-semibold'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <span className="text-xl flex-shrink-0">{cat.icon || '📁'}</span>
                                            <div className="truncate">
                                                <div className="text-xs sm:text-sm font-bold tracking-tight truncate">
                                                    {cat.label}
                                                </div>
                                                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    {tplCount > 0 ? `${tplCount} નમૂનાઓ ઉપલબ્ધ` : 'દસ્તાવેજ ઉપલબ્ધ'}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected ? (
                                            <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs flex-shrink-0">✓</span>
                                        ) : (
                                            <span className="text-slate-300 text-xs flex-shrink-0">›</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column: Templates Grid (દસ્તાવેજ પ્રકાર) */}
                    <div className="flex-1 flex flex-col bg-white">
                        
                        {/* Toolbar with Search and Category Banner */}
                        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base sm:text-lg font-black text-slate-800">
                                        {selectedCategory ? selectedCategory.label : 'દસ્તાવેજ નમૂનાઓ'}
                                    </h3>
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-blue-100">
                                        {filteredTemplates.length} Templates
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 font-gujarati">
                                    નમૂનો પસંદ કરો — ક્લિક કરતાં જ સીધું દસ્તાવેજ એડિટર ખુલશે
                                </p>
                            </div>

                            {/* Real-time Search Box */}
                            <div className="relative w-full sm:w-72">
                                <input
                                    type="text"
                                    id="template-search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="🔍 દસ્તાવેજ શોધો (Search)..."
                                    className="w-full pl-3 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                        type="button"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Templates Grid Area */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar max-h-[calc(100vh-320px)]">
                            {filteredTemplates.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <span className="text-4xl grayscale opacity-30">📄</span>
                                    <h4 className="text-slate-700 font-bold text-sm mt-3">
                                        કોઈ દસ્તાવેજ નમૂનો મળ્યો નથી
                                    </h4>
                                    <p className="text-slate-400 text-xs mt-1 max-w-sm">
                                        આ શ્રેણીમાં અથવા શોધ શબ્દ અનુસાર કોઈ નમૂના ઉપલબ્ધ નથી. કૃપા કરીને અન્ય શ્રેણી પસંદ કરો.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredTemplates.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            id={`btn-template-${tpl.id}`}
                                            onClick={() => handleTemplateClick(tpl)}
                                            type="button"
                                            className="w-full text-left bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 p-5 rounded-2xl transition-all duration-200 group flex flex-col justify-between cursor-pointer min-h-[190px]"
                                        >
                                            <div className="w-full">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 flex-shrink-0 shadow-sm">
                                                        {tpl.icon || '📄'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                                                        પ્રમાણિત ડ્રાફ્ટ
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-black text-slate-800 group-hover:text-blue-600 mt-3.5 leading-snug tracking-tight transition-colors">
                                                    {tpl.label || tpl.name}
                                                </h3>
                                                
                                                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed font-gujarati">
                                                    {tpl.description}
                                                </p>
                                            </div>

                                            <div className="w-full flex justify-between items-center border-t border-slate-100 pt-3 mt-4 text-[11px] font-black text-slate-500 group-hover:text-blue-600 transition-colors">
                                                <span>દસ્તાવેજ બનાવો (Create)</span>
                                                <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-xs transition-transform group-hover:translate-x-1">
                                                    →
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Page Footer */}
            <Footer onNavigate={onNavigate} />

        </div>
    );
};

export default DocumentServicesPage;
