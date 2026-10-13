import React, { useState, useMemo, useCallback } from 'react';
import Footer from '../components/Footer.jsx';

/**
 * Canonical Gujarat Legal Document Categories from Database Menu (parent_id = 2)
 * Exact 7 categories configured in the database:
 * 1. ભાડા કરાર / ભાડાપટ્ટો (Rent / Lease Agreement) - ID: 18
 * 2. વેચાણ દસ્તાવેજ (Sale Deed) - ID: 7
 * 3. પેપર નોટીસ (Paper Notice) - ID: 8
 * 4. એફિડેવિટ (Affidavit) - ID: 9
 * 5. હક્ક રીલીઝનો લેખ (Release Deed) - ID: 10
 * 6. વારસાઈ / પેઢીનામું (Pedhinamu) - ID: 16
 * 7. વીલ / વસીયતનામું (Will) - ID: 17
 */
const CANONICAL_CATEGORIES = [
    {
        id: 18,
        label: 'ભાડા કરાર / ભાડાપટ્ટો (Rent / Lease Agreement)',
        icon: '📑',
        template_id: null
    },
    {
        id: 7,
        label: 'વેચાણ દસ્તાવેજ (Sale Deed)',
        icon: '✍️',
        template_id: 'tpl_997fd57d'
    },
    {
        id: 8,
        label: 'પેપર નોટીસ (Paper Notice)',
        icon: '📰',
        template_id: 'tpl_adff5672'
    },
    {
        id: 9,
        label: 'એફિડેવિટ (Affidavit)',
        icon: '📄',
        template_id: 'tpl_ecd0bc4a'
    },
    {
        id: 10,
        label: 'હક્ક રીલીઝનો લેખ (Release Deed)',
        icon: '✒️',
        template_id: 'tpl_737760b1'
    },
    {
        id: 16,
        label: 'વારસાઈ / પેઢીનામું (Pedhinamu)',
        icon: '👥',
        template_id: 'tpl_60cbf655'
    },
    {
        id: 17,
        label: 'વીલ / વસીયતનામું (Will)',
        icon: '📜',
        template_id: 'tpl_85507d16'
    }
];

/**
 * DocumentServicesPage - Modern Two-Column Dashboard Layout for DraftSetu.
 * 
 * Features:
 * - Left Sidebar: 'દસ્તાવેજ શ્રેણી (CATEGORIES)' with count badge and bordered cards.
 * - Active Selection: Highlighted in deep blue (#1e40af) with checkmark icon.
 * - Right Content Area: Category Header, '4 TEMPLATES' pill badge, Search input.
 * - 3-Column Template Grid: Fully framed cards with deep drop-shadows and double borders.
 */
const DocumentServicesPage = ({
    menuItem,
    allTemplates = [],
    onSelectTemplate,
    onNavigate
}) => {
    // Default active category is Rent / Lease Agreement (ID 18)
    const [selectedCategoryId, setSelectedCategoryId] = useState(18);
    const [searchQuery, setSearchQuery] = useState('');

    // Categories derived dynamically from menuItem.children (with canonical fallback)
    const categories = useMemo(() => {
        const rawCategories = (menuItem?.children && menuItem.children.length > 0)
            ? menuItem.children
            : CANONICAL_CATEGORIES;

        return rawCategories.map((cat) => {
            // Find templates that legitimately belong to this category by menu_item_id or template_id
            const matchedTemplates = (allTemplates || []).filter(t => {
                const isMenuMatch = t.menu_item_id === cat.id;
                const isTemplateIdMatch = Boolean(
                    cat.template_id && (
                        t.id === cat.template_id ||
                        t.template_id === cat.template_id ||
                        String(t.numeric_id) === String(cat.template_id)
                    )
                );
                return isMenuMatch || isTemplateIdMatch;
            });

            const templateList = matchedTemplates.map(t => ({
                id: t.id,
                name: t.name,
                category: cat.label,
                icon: cat.icon || '📄',
                badge: 'પ્રમાણિત ડ્રાફ્ટ',
                description: t.description || 'ગુજરાત મહેસૂલ અને કાયદાકીય નિયમો અનુસાર પ્રમાણિત ડ્રાફ્ટ ફોર્મેટ.',
                raw: t
            }));

            return {
                id: cat.id,
                label: cat.label,
                icon: cat.icon || '📄',
                template_id: cat.template_id,
                templates: templateList,
                count: templateList.length,
                badgeCount: `${templateList.length} નમૂનાઓ ઉપલબ્ધ`
            };
        });
    }, [menuItem, allTemplates]);

    // Active Category Object
    const activeCategory = useMemo(() => {
        if (!categories || categories.length === 0) return null;
        if (selectedCategoryId != null) {
            const found = categories.find(c => 
                String(c.id) === String(selectedCategoryId) ||
                (typeof selectedCategoryId === 'string' && (
                    (c.label || '').toLowerCase().includes(selectedCategoryId.toLowerCase()) ||
                    (selectedCategoryId === 'rent' && c.id === 18) ||
                    (selectedCategoryId === 'sale' && c.id === 7)
                ))
            );
            if (found) return found;
        }
        return categories[0];
    }, [categories, selectedCategoryId]);

    // Filter templates in the active category based on user search query
    const filteredTemplates = useMemo(() => {
        const list = activeCategory?.templates || [];
        if (!searchQuery.trim()) return list;

        const q = searchQuery.toLowerCase().trim();
        return list.filter(t => 
            (t.name || '').toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q)
        );
    }, [activeCategory, searchQuery]);

    // Template click handler - directly opens the document editor
    const handleTemplateClick = useCallback((tpl) => {
        // Find matching template in allTemplates
        let targetId = tpl.id;
        
        if (allTemplates && allTemplates.length > 0) {
            const foundInAll = allTemplates.find(at => 
                String(at.id) === String(tpl.id) || 
                (at.name && at.name.toLowerCase() === (tpl.name || '').toLowerCase())
            );
            if (foundInAll) {
                targetId = foundInAll.id;
            } else {
                // Fallback to first template in allTemplates so user is never blocked
                targetId = allTemplates[0].id;
            }
        }

        if (typeof onSelectTemplate === 'function') {
            onSelectTemplate(targetId);
        } else if (typeof onNavigate === 'function') {
            onNavigate(`editor?template=${targetId}`);
        }
    }, [allTemplates, onSelectTemplate, onNavigate]);

    return (
        <div className="w-full min-h-screen flex flex-col bg-[#f1f3f6] font-gujarati text-slate-800" id="document-services-page">
            
            {/* Top Sub-Bar with Breadcrumb Navigation */}
            <div className="bg-[#0f1e36] text-white border-b border-blue-900/60 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <span className="text-blue-400">DraftSetu</span>
                            <span>›</span>
                            <span className="text-white">દસ્તાવેજ પસંદગી (Document Selection)</span>
                            <span>›</span>
                            <span className="text-amber-400 font-extrabold">{activeCategory?.label}</span>
                        </div>
                        <h2 className="text-xs sm:text-base font-black text-white mt-1 block" id="doc-services-header">
                            દસ્તાવેજ સેવાઓ અને ડ્રાફ્ટ નમૂનાઓ <span className="text-[11px] sm:text-xs text-blue-200 font-semibold font-sans">(Document Services & Templates)</span>
                        </h2>
                    </div>

                    <button
                        type="button"
                        id="btn-back-home"
                        onClick={() => onNavigate && onNavigate('home')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition border border-white/20 cursor-pointer self-start sm:self-auto"
                    >
                        <span>←</span>
                        <span>મુખ્ય પેજ (HOME)</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area: 2-Column Desktop Grid Layout */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
                <div className="flex-1 flex flex-col md:flex-row gap-6 items-start">
                    
                    {/* ─── LEFT COLUMN: CATEGORIES SIDEBAR ─── */}
                    <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col space-y-3" id="categories-sidebar">
                        
                        {/* Sidebar Header with circular count badge */}
                        <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-md flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl">📁</span>
                                <div>
                                    <h2 className="text-sm font-black text-slate-900 tracking-tight">
                                        દસ્તાવેજ શ્રેણી (CATEGORIES)
                                    </h2>
                                    <p className="text-[11px] text-slate-500 font-sans font-semibold">
                                        Select a category to view templates
                                    </p>
                                </div>
                            </div>
                            <span 
                                id="categories-count-badge"
                                className="w-7 h-7 rounded-full bg-blue-700 text-white font-black text-xs flex items-center justify-center shadow-xs font-sans"
                                title={`${categories.length} Categories Available`}
                            >
                                {categories.length}
                            </span>
                        </div>

                        {/* Category Cards List */}
                        <div className="space-y-2.5 w-full" id="category-nav">
                            {categories.map((cat) => {
                                const isActive = cat.id === selectedCategoryId;

                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        id={`btn-category-${cat.id}`}
                                        onClick={() => {
                                            setSelectedCategoryId(cat.id);
                                            setSearchQuery('');
                                        }}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between cursor-pointer ${
                                            isActive
                                                ? 'bg-[#1e40af] border-[#1e3a8a] text-white shadow-md ring-2 ring-blue-300/40 font-bold scale-[1.01]'
                                                : 'bg-white border-slate-300 hover:border-slate-400 hover:shadow-md text-slate-800 shadow-xs font-bold'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {cat.icon || '📄'}
                                            </span>
                                            <div className="truncate">
                                                <div className="text-xs sm:text-sm font-black tracking-tight truncate leading-tight">
                                                    {cat.label}
                                                </div>
                                                <div className={`text-[11px] mt-1 font-medium ${
                                                    isActive ? 'text-blue-100 font-semibold' : 'text-slate-500'
                                                }`}>
                                                    {cat.badgeCount}
                                                </div>
                                            </div>
                                        </div>

                                        {isActive ? (
                                            <span className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-xs">
                                                ✓
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 font-black text-base flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                                                ›
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* ─── RIGHT COLUMN: TEMPLATES & DRAFT SELECTION ─── */}
                    <section className="flex-1 w-full bg-white border-2 border-slate-300 rounded-xl p-5 sm:p-6 shadow-md flex flex-col" id="templates-content-area">
                        
                        {/* Section Header: Category Title, Badge, and Search Bar */}
                        <div className="border-b-2 border-slate-200 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight" id="active-category-title">
                                        {activeCategory?.label}
                                    </h1>
                                    <span 
                                        id="templates-count-badge"
                                        className="bg-blue-100 text-blue-800 font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider border border-blue-200 font-sans shadow-xs"
                                    >
                                        {activeCategory?.count ?? activeCategory?.templates?.length ?? 0} TEMPLATES
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 font-semibold font-gujarati">
                                    નમૂનો પસંદ કરો — ક્લિક કરતાં જ સીધું દસ્તાવેજ એડિટર ખુલશે
                                </p>
                            </div>

                            {/* Right-aligned Search Input */}
                            <div className="relative w-full sm:w-72">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    id="template-search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="દસ્તાવેજ શોધો (Search)..."
                                    className="w-full pl-9 pr-8 py-2 text-xs font-bold bg-slate-50 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 3-Column Template Cards Grid */}
                        {filteredTemplates.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                                <span className="text-4xl text-slate-300 mb-2">📄</span>
                                <h3 className="text-sm font-bold text-slate-700">
                                    કોઈ દસ્તાવેજ નમૂનો મળ્યો નથી
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    શોધ શબ્દ અનુસાર કોઈ નમૂના મળ્યા નથી. કૃપા કરીને અન્ય શબ્દ અથવા શ્રેણી પસંદ કરો.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="templates-grid">
                                {filteredTemplates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        id={`btn-template-${tpl.id}`}
                                        onClick={() => handleTemplateClick(tpl)}
                                        className="bg-white border-2 border-slate-300 hover:border-blue-600 rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between group cursor-pointer min-h-[220px] text-left w-full"
                                    >
                                        <div className="w-full">
                                            {/* Top: Blue document icon & 'પ્રમાણિત ડ્રાફ્ટ' badge */}
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 border border-blue-100 shadow-xs flex-shrink-0">
                                                    📄
                                                </div>
                                                <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 uppercase tracking-wider font-sans">
                                                    પ્રમાણિત ડ્રાફ્ટ
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-700 mt-4 leading-snug tracking-tight transition-colors">
                                                {tpl.name}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-gujarati">
                                                {tpl.description}
                                            </p>
                                        </div>

                                        {/* Bottom Action: 'દસ્તાવેજ બનાવો (Create) ➔' button */}
                                        <div className="w-full flex justify-between items-center border-t border-slate-200 pt-3.5 mt-4 text-xs font-black text-slate-600 group-hover:text-blue-700 transition-colors">
                                            <span>દસ્તાવેજ બનાવો (Create)</span>
                                            <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-xs transition-transform group-hover:translate-x-1 font-bold">
                                                ➔
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                    </section>

                </div>
            </main>

            {/* Page Footer */}
            <Footer onNavigate={onNavigate} />

        </div>
    );
};

export default DocumentServicesPage;
