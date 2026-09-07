import React, { useEffect } from 'react';
import Footer from './Footer.jsx';

/**
 * LegalPageLayout — Shared Layout for DraftSetu Legal Documents
 * Supports bilingual (English + Gujarati) presentation, sticky TOC, breadcrumbs,
 * responsive design tokens, and smooth scrolling.
 */
const LegalPageLayout = ({
    titleEn,
    titleGu,
    subtitleEn,
    subtitleGu,
    effectiveDate = '06 September 2026',
    lastUpdated = '06 September 2026',
    pageType = 'Policy', // 'Policy' | 'Terms'
    seoTitle = 'DraftSetu Legal',
    tocItems = [],
    onNavigate,
    children
}) => {
    useEffect(() => {
        document.title = seoTitle;
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [seoTitle]);

    const handleBackHome = () => {
        if (typeof onNavigate === 'function') {
            onNavigate('home');
        } else if (typeof window.handleNavigate === 'function') {
            window.handleNavigate('home');
        } else {
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-100/70 font-sans text-slate-800">
            {/* Top Banner / Breadcrumb Bar */}
            <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <button
                            type="button"
                            onClick={handleBackHome}
                            className="hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>🏠</span>
                            <span>Home (મુખ્ય પૃષ્ઠ)</span>
                        </button>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-400 font-semibold">{pageType}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-blue-700 font-black truncate max-w-[200px] sm:max-w-none">
                            {titleEn}
                        </span>
                    </nav>

                    <button
                        type="button"
                        onClick={handleBackHome}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition active:scale-95 shadow-2xs cursor-pointer"
                    >
                        <span>&larr;</span>
                        <span className="hidden sm:inline">Back to Home (પાછા જાઓ)</span>
                        <span className="sm:hidden">Home</span>
                    </button>
                </div>
            </div>

            {/* Hero Header */}
            <header className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-extrabold uppercase tracking-widest">
                        <span>⚖️</span>
                        <span>Official Platform Document</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-outfit">
                        {titleEn}
                    </h1>

                    <h2 className="text-xl sm:text-2xl font-bold text-blue-200 font-gujarati tracking-normal">
                        {titleGu}
                    </h2>

                    <p className="text-sm text-slate-300 max-w-3xl leading-relaxed font-medium">
                        {subtitleEn}
                    </p>
                    <p className="text-xs text-slate-400 max-w-3xl leading-relaxed font-gujarati">
                        {subtitleGu}
                    </p>

                    <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                            <span className="text-emerald-400 font-bold">●</span>
                            <span className="text-slate-300 font-semibold">Effective Date:</span>
                            <span className="text-amber-300 font-bold">{effectiveDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                            <span className="text-blue-400 font-bold">🕒</span>
                            <span className="text-slate-300 font-semibold">Last Updated:</span>
                            <span className="text-slate-200">{lastUpdated}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 font-gujarati">
                            <span>🌐</span>
                            <span>ભાષા: અંગ્રેજી અને ગુજરાતી</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area with Optional Sticky Sidebar TOC */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sticky Table of Contents (Desktop) */}
                    {tocItems && tocItems.length > 0 && (
                        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
                            <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
                                <div className="border-b border-slate-100 pb-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-sans">
                                        Table of Contents
                                    </h3>
                                    <p className="text-[11px] font-bold text-slate-600 font-gujarati">
                                        વિષય સૂચિ
                                    </p>
                                </div>
                                <nav className="space-y-1">
                                    {tocItems.map((item, idx) => (
                                        <a
                                            key={item.id || idx}
                                            href={`#${item.id}`}
                                            className="block px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition leading-snug group"
                                        >
                                            <div className="flex items-start gap-2">
                                                <span className="font-mono text-[10px] text-slate-400 group-hover:text-blue-600 pt-0.5">
                                                    {idx + 1}.
                                                </span>
                                                <div>
                                                    <div className="font-bold">{item.titleEn}</div>
                                                    {item.titleGu && (
                                                        <div className="text-[10px] text-slate-400 font-gujarati">
                                                            {item.titleGu}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </aside>
                    )}

                    {/* Main Legal Content */}
                    <div className={tocItems && tocItems.length > 0 ? "lg:col-span-8 xl:col-span-9 space-y-6" : "lg:col-span-12 space-y-6"}>
                        {children}

                        {/* Document End Disclaimers */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 text-center space-y-2 mt-12">
                            <div className="text-xl">⚖️</div>
                            <p className="text-xs font-bold text-slate-700">
                                This document is published electronically in compliance with the Information Technology Act, 2000 and applicable digital governance standards.
                            </p>
                            <p className="text-[11px] text-slate-500 font-gujarati font-medium">
                                આ દસ્તાવેજ ઈન્ફોર્મેશન ટેકનોલોજી એક્ટ, ૨૦૦૦ અને લાગુ ડિજિટલ નિયમો હેઠળ ઇલેક્ટ્રોનિક રીતે પ્રકાશિત થયેલ છે.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer onNavigate={onNavigate} />
        </div>
    );
};

export default LegalPageLayout;
