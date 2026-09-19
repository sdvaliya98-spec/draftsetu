import React from 'react';
import Footer from '../components/Footer.jsx';
import { trackEvent } from '../utils/analytics.js';
import { getTemplateSlug } from '../utils/slugUtils.js';

const HomePage = ({ currentUser, onNavigate, onLogin, templates = [], isAuthHydrated = true }) => {
    const [selectedCategory, setSelectedCategory] = React.useState('All');

    React.useEffect(() => {
        document.title = 'DraftSetu — Gujarati Legal Document Templates & DOCX/PDF';
    }, []);

    const activeTemplates = React.useMemo(() => {
        return (templates || []).filter(t => t.is_active !== false && t.status !== 'ARCHIVED' && t.status !== 'DELETED');
    }, [templates]);

    const filteredTemplates = selectedCategory === 'All'
        ? activeTemplates
        : activeTemplates.filter(t => (t.category || 'General') === selectedCategory);
    
    // Dynamic Category List derived from templates
    const availableCategories = React.useMemo(() => {
        const cats = new Set(activeTemplates.map(t => t.category || 'General').filter(c => c && c !== 'Test / Dummy'));
        return ['All', ...Array.from(cats)];
    }, [activeTemplates]);

    // Dynamic URL Resolver Helper
    const getTemplateUrl = (categoryName, targetTemplateId = null, searchKeywords = []) => {
        // 1. Direct active template ID match if provided
        if (targetTemplateId) {
            const targetTpl = activeTemplates.find(t => (t.template_id === targetTemplateId || t.id === targetTemplateId));
            if (targetTpl) {
                return `editor?template=${targetTpl.template_id || targetTpl.id}`;
            }
            return `editor?template=${targetTemplateId}`;
        }
        // 2. Direct category match
        const categoryMatch = activeTemplates.find(t => (t.category || '').toLowerCase() === (categoryName || '').toLowerCase());
        if (categoryMatch) {
            return `editor?template=${categoryMatch.template_id || categoryMatch.id}`;
        }
        // 3. Fallback to search keywords if needed
        const keywordMatch = activeTemplates.find(t => {
            const text = `${t.name || ''} ${t.category || ''} ${t.content || ''}`.toLowerCase();
            return searchKeywords.some(kw => text.includes(kw.toLowerCase()));
        });
        if (keywordMatch) {
            return `editor?template=${keywordMatch.template_id || keywordMatch.id}`;
        }
        return "editor"; // Fallback to editor
    };
    
    const quickServices = [
        {
            title: "વેચાણ દસ્તાવેજ",
            enTitle: "Sale Deed Blueprint",
            desc: "સ્થાવર મિલકતોના ખરીદ-વેચાણ માટે પ્રમાણભૂત વેચાણ દસ્તાવેજનો સચોટ ડ્રાફ્ટ તૈયાર કરો.",
            icon: "✍️",
            url: getTemplateUrl('Sale Deed', 'tpl_997fd57d', ['વેચાણ', 'sale_deed']),
            badge: "મોસ્ટ પોપ્યુલર",
            color: "border-blue-200 hover:border-blue-500 hover:shadow-blue-50 bg-blue-50/20"
        },
        {
            title: "બિનખેતી (NA)",
            enTitle: "Non-Agricultural Guide",
            desc: "જમીનને બિનખેતીમાં રૂપાંતર કરવા અંગેના અરજી સોગંદનામા અને જરૂરી નિયમોનું માર્ગદર્શન મેળવો.",
            icon: "🏗️",
            url: "page:non-agricultural",
            badge: "માર્ગદર્શિકા",
            color: "border-amber-200 hover:border-amber-500 hover:shadow-amber-50 bg-amber-50/20"
        },
        {
            title: "હક્ક કમી",
            enTitle: "Relinquishment Guide",
            desc: "વારસાઈ હક્ક કમી કરવા અથવા ખાતેદારના હક્ક છોડવા અંગેની કરાર પદ્ધતિ અને સોગંદનામા બનાવો.",
            icon: "❌",
            url: "page:relinquishment",
            badge: "માહિતી પત્રક",
            color: "border-rose-200 hover:border-rose-500 hover:shadow-rose-50 bg-rose-50/20"
        },
        {
            title: "પેપર નોટીસ",
            enTitle: "Paper Notice Template",
            desc: "જમીન મિલકતના ટાઇટલ ક્લિયરન્સ અંગે દૈનિક વર્તમાનપત્રોમાં આપવા માટેની સચોટ પેપર નોટિસ ડ્રાફ્ટ કરો.",
            icon: "📰",
            url: getTemplateUrl('Paper Notice', 'tpl_adff5672', ['પેપર', 'notic']),
            badge: "નવું ટેમ્પલેટ",
            color: "border-emerald-200 hover:border-emerald-500 hover:shadow-emerald-50 bg-emerald-50/20"
        },
        {
            title: "વારસાઈ",
            enTitle: "Heirship / Succession",
            desc: "મૂળ જમીન માલિકના અવસાન બાદ પેઢીનામું અને કાયદેસરના વારસાઈ રેકોર્ડ માટેના દસ્તાવેજો ડ્રાફ્ટ કરો.",
            icon: "👥",
            url: "page:heirship",
            badge: "નવું ફોર્મ",
            color: "border-purple-200 hover:border-purple-500 hover:shadow-purple-50 bg-purple-50/20"
        },
        {
            title: "એફિડેવિટ",
            enTitle: "Affidavit Template",
            desc: "વિવિધ સરકારી અને બિનસરકારી હેતુઓ માટે સત્તાવાર સોગંદનામા અને એકરારનામા ઓટોમેટેડ તૈયાર કરો.",
            icon: "📄",
            url: getTemplateUrl('Affidavit', 'tpl_ecd0bc4a', ['એફિડેવિટ', 'affidavit']),
            badge: "લોકપ્રિય",
            color: "border-indigo-200 hover:border-indigo-500 hover:shadow-indigo-50 bg-indigo-50/20"
        },
        {
            title: "નોટરી દસ્તાવેજ",
            enTitle: "Notarized Document",
            desc: "પ્રમાણિત કરાર પત્રો, લીઝ એગ્રીમેન્ટ અને સત્તાવાર સંમતિ પત્રો નોટરાઈઝેશન માટે ડ્રાફ્ટ કરો.",
            icon: "✒️",
            url: getTemplateUrl('Affidavit', 'tpl_ecd0bc4a', ['નોટરી', 'notary']),
            badge: "સ્ટેન્ડર્ડ નમૂનો",
            color: "border-teal-200 hover:border-teal-500 hover:shadow-teal-50 bg-teal-50/20"
        }
    ];

    const notices = [
        { date: "૧૫ મે ૨૦૨૬", text: "DraftSetu પ્લેટફોર્મ પર એફિડેવિટ અને નોટરી દસ્તાવેજ ઓટોમેશન સપોર્ટ શરૂ કરાયો છે.", isNew: true },
        { date: "૧૦ મે ૨૦૨૬", text: "પ્રોફેશનલ ડ્રાફ્ટ એડિટિંગ સુવિધા માટે TinyMCE રીચ ટેક્સ્ટ એડિટર અપડેટ કરવામાં આવ્યું છે.", isNew: true },
        { date: "૦૧ મે ૨૦૨૬", text: "દસ્તાવેજ ડ્રાફ્ટ એન્ક્રિપ્ટેડ સેવ કરવા માટે વપરાશકર્તાઓએ રજીસ્ટ્રેશન કરાવવું અનિવાર્ય છે.", isNew: false },
        { date: "૨૨ એપ્રિલ ૨૦૨૬", text: "કસ્ટમ પર્સનલ ટેમ્પલેટ બનાવવાની અને ડોક્યુમેન્ટ વોલ્ટ (My Documents) સેવાની શરૂઆત.", isNew: false }
    ];

    return (
        <div className="w-full bg-slate-50 flex flex-col font-gujarati overflow-x-hidden min-h-screen">
            {/* 1. Improved Conversion Hero Section */}
            <div className="relative w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white shadow-xl no-print z-10 py-10 md:py-16 px-4 sm:px-6 md:px-12 lg:px-16 border-b border-blue-900/30 overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    
                    {/* Left Column: Core Value Proposition & CTAs */}
                    <div className="lg:col-span-7 space-y-4 md:space-y-6">
                        <span className="inline-flex items-center gap-1.5 bg-blue-600/30 backdrop-blur-md text-blue-200 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider font-sans">
                            <span>⚡ ૧૦૦% સચોટ નમૂનાઓ</span>
                        </span>
                        
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white font-outfit">
                            સચોટ ગુજરાતી કાનૂની દસ્તાવેજો
                        </h1>
                        
                        <h2 className="text-lg sm:text-xl md:text-2xl text-blue-200 font-bold font-sans">
                            નિયમ અનુસાર ડ્રાફ્ટિંગ સોલ્યુશન્સ
                        </h2>
                        
                        <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-semibold">
                            વેચાણ દસ્તાવેજ, બાનાખત, સોગંદનામું અને અન્ય કાનૂની દસ્તાવેજો માટે તૈયાર Templates પસંદ કરો, માહિતી भरो અને DOCX/PDF Document તૈયાર કરો.
                        </p>
                        
                        {/* Primary & Secondary CTA Buttons */}
                        <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    trackEvent('homepage_cta_click', {
                                        cta_name: 'start_document',
                                        location: 'hero'
                                    });
                                    onNavigate(getTemplateUrl('Sale Deed', 'tpl_997fd57d', ['વેચાણ', 'sale_deed']));
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl shadow-xl shadow-blue-900/40 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer font-sans border-0"
                            >
                                <span>🚀 દસ્તાવેજ બનાવવાનું શરૂ કરો</span>
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    trackEvent('homepage_how_it_works_click', {
                                        location: 'hero'
                                    });
                                    const target = document.getElementById('how-it-works');
                                    if (target) {
                                        target.scrollIntoView({ behavior: 'smooth' });
                                    } else {
                                        onNavigate('page:user-guide');
                                    }
                                }}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl transition flex items-center gap-2 cursor-pointer font-sans"
                            >
                                <span>▶ કેવી રીતે કામ કરે છે?</span>
                            </button>
                        </div>

                        {/* 3-Point Value Row */}
                        <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-300">
                            <div className="flex items-center gap-1.5 text-blue-200">
                                <span className="text-emerald-400 font-bold text-base leading-none">✓</span>
                                <span>તૈયાર Gujarati Templates</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-blue-200">
                                <span className="text-emerald-400 font-bold text-base leading-none">✓</span>
                                <span>Live Preview</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-blue-200">
                                <span className="text-emerald-400 font-bold text-base leading-none">✓</span>
                                <span>DOCX + PDF</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Clean Workflow Visual Card */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end">
                        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/15 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                                        DS
                                    </div>
                                    <div>
                                        <span className="text-sm sm:text-base font-black text-white font-outfit tracking-wide block leading-tight">DraftSetu</span>
                                        <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider font-sans">Workflow Visual</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-sky-300 bg-sky-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-sans border border-sky-400/30">
                                    4-Step Process
                                </span>
                            </div>

                            <div className="space-y-2 font-sans">
                                {/* Step 1 */}
                                <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 sm:p-3 transition">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center text-base shrink-0">
                                        📄
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                                            <span>Template</span>
                                            <span className="text-[10px] font-semibold text-blue-300 font-gujarati">નમૂનો પસંદ કરો</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Down Connector */}
                                <div className="flex justify-center text-blue-400 text-xs font-bold leading-none py-0.5">
                                    ↓
                                </div>

                                {/* Step 2 */}
                                <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 sm:p-3 transition">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center text-base shrink-0">
                                        📝
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                                            <span>Data Input</span>
                                            <span className="text-[10px] font-semibold text-indigo-300 font-gujarati">માહિતી દાખલ કરો</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Down Connector */}
                                <div className="flex justify-center text-indigo-400 text-xs font-bold leading-none py-0.5">
                                    ↓
                                </div>

                                {/* Step 3 */}
                                <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 sm:p-3 transition">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-base shrink-0">
                                        👁
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                                            <span>Live Preview</span>
                                            <span className="text-[10px] font-semibold text-amber-300 font-gujarati">લાઈવ પ્રિવ્યૂ</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Down Connector */}
                                <div className="flex justify-center text-amber-400 text-xs font-bold leading-none py-0.5">
                                    ↓
                                </div>

                                {/* Step 4 */}
                                <div className="flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-400/30 rounded-xl p-2.5 sm:p-3 transition">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center text-base shrink-0">
                                        📥
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs sm:text-sm font-black text-emerald-200 flex items-center gap-2">
                                            <span>DOCX / PDF</span>
                                            <span className="text-[10px] font-semibold text-emerald-300 font-gujarati">તૈયાર દસ્તાવેજ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 w-full space-y-16">
                
                {/* 1.5 Dedicated How It Works Section */}
                <div id="how-it-works" className="space-y-8 scroll-mt-6">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest font-sans border border-blue-200 mb-2">
                            HOW IT WORKS
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                            કેવી રીતે કામ કરે છે?
                        </h2>
                        <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-3 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Step 1 */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                                        📄
                                    </div>
                                    <span className="text-xs font-black text-blue-600 bg-blue-50/80 px-2.5 py-1 rounded-full font-sans">
                                        Step ①
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-900 transition">
                                        Template પસંદ કરો
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
                                        તમારો જરૂરી દસ્તાવેજ પસંદ કરો
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                                        📝
                                    </div>
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50/80 px-2.5 py-1 rounded-full font-sans">
                                        Step ②
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-900 transition">
                                        માહિતી દાખલ કરો
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
                                        Document માટે જરૂરી માહિતી भरो
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                                        👁️
                                    </div>
                                    <span className="text-xs font-black text-amber-600 bg-amber-50/80 px-2.5 py-1 rounded-full font-sans">
                                        Step ③
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-amber-900 transition">
                                        Live Preview તપાસો
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
                                        દસ્તાવેજનું Live Preview જુઓ અને જરૂરી સુધારા કરો
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300">
                                        📥
                                    </div>
                                    <span className="text-xs font-black text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-full font-sans">
                                        Step ④
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-emerald-900 transition">
                                        DOCX / PDF તૈયાર કરો
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-semibold mt-2">
                                        અંતિમ દસ્તાવેજ તૈયાર કરો
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Document Services & Available Templates Discovery */}
                <div id="quick-services" className="space-y-8 scroll-mt-6">
                    <div className="text-center max-w-3xl mx-auto space-y-2">
                        <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest font-sans border border-blue-200">
                            DOCUMENT SERVICES & TEMPLATES
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                            તમારા માટે ઉપલબ્ધ દસ્તાવેજો
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed">
                            જરૂરિયાત મુજબ દસ્તાવેજ પસંદ કરો અને DraftSetu દ્વારા તેને તૈયાર કરો.
                        </p>
                        <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-3 rounded-full"></div>
                    </div>

                    {/* Dynamic Category Filter Pills */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-6 rounded-[28px] border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto py-1 custom-scrollbar">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0 mr-1 font-sans hidden sm:inline-block">
                                Categories:
                            </span>
                            {availableCategories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer font-sans ${selectedCategory === cat ? 'bg-blue-900 text-white shadow-md shadow-blue-900/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Dropdown for Mobile / Direct Select */}
                        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest md:hidden font-sans">
                                Filter:
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className="w-full md:w-52 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 font-sans text-xs"
                            >
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Active Templates Grid */}
                    {filteredTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTemplates.map((t) => (
                                <div 
                                    key={t.id} 
                                    className="border rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/50 bg-white group border-indigo-100 hover:border-indigo-300"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition duration-300 shadow-sm border border-indigo-100">
                                                📄
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-sans border border-indigo-200">
                                                {t.category || 'General'}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 mb-2 group-hover:text-indigo-900 transition leading-snug">
                                            {t.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 leading-relaxed font-semibold line-clamp-3">
                                            {(t.content || '').replace(/<[^>]+>/g, ' ').trim() || 'પ્રમાણિત કાનૂની બ્લુપ્રિન્ટ અને ઓટોમેટેડ ડ્રાફ્ટ.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onNavigate(`templates/${getTemplateSlug(t)}`)}
                                        className="mt-6 w-full py-2.5 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl text-xs font-black transition-all border border-indigo-100 group-hover:border-indigo-600 text-center tracking-wider font-sans shadow-sm cursor-pointer"
                                    >
                                        દસ્તાવેજ પસંદ કરો &rarr;
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[28px] p-12 text-center space-y-3">
                            <span className="text-4xl block">📭</span>
                            <h3 className="text-lg font-black text-slate-700">આ કેટેગરીમાં કોઈ સક્રિય ટેમ્પલેટ નથી</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest font-sans">
                                Try selecting 'All' or a different category
                            </p>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('All')}
                                className="mt-2 px-5 py-2 bg-blue-900 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition hover:bg-blue-800 cursor-pointer font-sans"
                            >
                                બધા ટેમ્પલેટ્સ જુઓ (View All)
                            </button>
                        </div>
                    )}

                    {/* Informational Legal Guides Row */}
                    <div className="pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                                કાનૂની માર્ગદર્શિકા અને માહિતી પત્રકો
                            </h3>
                            <span className="text-[11px] font-bold text-slate-400 font-sans">
                                Official Information Guides
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="bg-amber-50/40 border border-amber-200 rounded-[24px] p-5 flex flex-col justify-between hover:shadow-md transition group">
                                <div>
                                    <div className="text-3xl mb-3">🏗️</div>
                                    <h4 className="text-base font-black text-slate-800 mb-1 group-hover:text-amber-900 transition">
                                        બિનખેતી (NA) માર્ગદર્શિકા
                                    </h4>
                                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                        જમીનને બિનખેતીમાં રૂપાંતર કરવા અંગેના નિયમો અને સોગંદનામાની વિગતો.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('page:non-agricultural')}
                                    className="mt-4 text-xs font-black text-amber-800 hover:text-amber-900 flex items-center gap-1 font-sans cursor-pointer text-left"
                                >
                                    માર્ગદર્શિકા વાંચો &rarr;
                                </button>
                            </div>

                            <div className="bg-rose-50/40 border border-rose-200 rounded-[24px] p-5 flex flex-col justify-between hover:shadow-md transition group">
                                <div>
                                    <div className="text-3xl mb-3">❌</div>
                                    <h4 className="text-base font-black text-slate-800 mb-1 group-hover:text-rose-900 transition">
                                        હક્ક કમી (Relinquishment)
                                    </h4>
                                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                        વારસાઈ હક્ક કમી કરવા અથવા ખાતેદારના હક્ક છોડવા અંગેની માહિતી.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('page:relinquishment')}
                                    className="mt-4 text-xs font-black text-rose-800 hover:text-rose-900 flex items-center gap-1 font-sans cursor-pointer text-left"
                                >
                                    માહિતી પત્રક જુઓ &rarr;
                                </button>
                            </div>

                            <div className="bg-purple-50/40 border border-purple-200 rounded-[24px] p-5 flex flex-col justify-between hover:shadow-md transition group">
                                <div>
                                    <div className="text-3xl mb-3">👥</div>
                                    <h4 className="text-base font-black text-slate-800 mb-1 group-hover:text-purple-900 transition">
                                        વારસાઈ (Heirship Guide)
                                    </h4>
                                    <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                        પેઢીનામું અને કાયદેસરના વારસાઈ રેકોર્ડ માટેના દસ્તાવેજો અંગે માર્ગદર્શન.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('page:heirship')}
                                    className="mt-4 text-xs font-black text-purple-800 hover:text-purple-900 flex items-center gap-1 font-sans cursor-pointer text-left"
                                >
                                    વારસાઈ ગાઈડ &rarr;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2.5 Trust + Product Demo Section */}
                <div id="product-demo" className="space-y-12 scroll-mt-6">
                    
                    {/* Header */}
                    <div className="text-center max-w-3xl mx-auto space-y-2">
                        <span className="inline-block bg-indigo-50 text-indigo-800 text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest font-sans border border-indigo-200">
                            PRODUCT DEMO & CAPABILITIES
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                            DraftSetuમાં Document કેવી રીતે તૈયાર થાય છે?
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 font-semibold leading-relaxed">
                            Template પસંદ કરો, માહિતી દાખલ કરો, Preview તપાસો અને તૈયાર Document મેળવો.
                        </p>
                        <div className="h-1.5 w-16 bg-indigo-600 mx-auto mt-3 rounded-full"></div>
                    </div>

                    {/* 4 Workflow Stages - Visual Product Demonstration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Stage 1: Template Selection */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 border border-blue-100">
                                        📄
                                    </div>
                                    <span className="text-[10px] font-black text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full font-sans uppercase tracking-wider">
                                        Stage 1
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 group-hover:text-blue-900 transition">
                                        Template પસંદ કરો
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1.5">
                                        તમારા જરૂરી દસ્તાવેજ મુજબ કેટેગરીમાંથી પ્રમાણિત બ્લુપ્રિન્ટ ટેમ્પલેટ પસંદ કરો.
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-[11px] font-sans space-y-1.5 text-slate-600">
                                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        <span>વેચાણ દસ્તાવેજ / બાનાખત</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-500">
                                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                        <span>સોગંદનામું / સંમતિપત્રક</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stage 2: Data Input */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 border border-indigo-100">
                                        📝
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full font-sans uppercase tracking-wider">
                                        Stage 2
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 group-hover:text-indigo-900 transition">
                                        માહિતી દાખલ કરો
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1.5">
                                        પક્ષકારોની વિગતો, જમીન/મિલકત રેકોર્ડ અને શરતો સરળ ઇનપુટ ફોર્મમાં ભરો.
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-[11px] font-sans space-y-1 text-slate-600">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                        <span>DYNAMIC FIELDS</span>
                                        <span className="text-indigo-600">AUTO-SYNC</span>
                                    </div>
                                    <div className="bg-white px-2 py-1 rounded-md border border-slate-200 text-[10px] font-bold text-slate-700 truncate">
                                        પ્રથમ પક્ષકાર: રમેશભાઈ પટેલ
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stage 3: Live Preview */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 border border-amber-100">
                                        👁
                                    </div>
                                    <span className="text-[10px] font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full font-sans uppercase tracking-wider">
                                        Stage 3
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 group-hover:text-amber-900 transition">
                                        Live Preview જુઓ
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1.5">
                                        તમે જે વિગતો ભરો છો તે દસ્તાવેજના મૂળ કાનૂની ફોર્મેટમાં તુરંત સામે જોઈ શકો છો.
                                    </p>
                                </div>
                                <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-100 text-[11px] font-sans space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-amber-700">
                                        <span>INSTANT PREVIEW</span>
                                        <span className="text-amber-800 font-black">● LIVE</span>
                                    </div>
                                    <div className="text-[10px] text-slate-700 line-clamp-1 italic">
                                        "...આથી અમે પ્રથમ પક્ષકાર લખી આપીએ છીએ..."
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stage 4: Ready Document */}
                        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition duration-300 border border-emerald-100">
                                        📥
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full font-sans uppercase tracking-wider">
                                        Stage 4
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800 group-hover:text-emerald-900 transition">
                                        DOCX / PDF તૈયાર કરો
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1.5">
                                        સંપૂર્ણ ચકાસણી બાદ એડિટેબલ Word (DOCX) અથવા પ્રિન્ટ-રેડી PDF ફાઇલ ડાઉનલોડ કરો.
                                    </p>
                                </div>
                                <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100 text-[11px] font-sans flex items-center justify-between">
                                    <span className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider">FINAL EXPORT</span>
                                    <span className="font-black text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">.DOCX & .PDF</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Trust / Feature Points Section ("DraftSetuની ખાસિયતો") */}
                    <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-[32px] p-6 md:p-10 shadow-xl space-y-8 relative overflow-hidden">
                        
                        <div className="max-w-2xl space-y-2">
                            <span className="bg-white/10 text-sky-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-sans border border-white/10">
                                CORE FEATURES & RELIABILITY
                            </span>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                DraftSetuની ખાસિયતો
                            </h3>
                            <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                                કાનૂની દસ્તાવેજીકરણને સરળ, ઝડપી અને સચોટ બનાવવા માટે તૈયાર કરાયેલ સાધનો.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            
                            {/* Feature 1 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">તૈયાર Gujarati Templates</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    ગુજરાતી ભાષામાં તૈયાર કરેલ દસ્તાવેજ Templates.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">Live Preview</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    માહિતી ભરતાં જ તરત સામે પ્રિવ્યૂમાં ફેરફારો જોવાની સુવિધા.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">DOCX + PDF</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    એડિટિંગ માટે Microsoft Word (.docx) અને પ્રિન્ટિંગ માટે .pdf.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">Draft Save</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    અધૂરા દસ્તાવેજને કોઈપણ સમયે સુરક્ષિત સાચવવાની ક્ષમતા.
                                </p>
                            </div>

                            {/* Feature 5 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">Unsaved Data Recovery</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    અચાનક પેજ બંધ થાય તો પણ ભરેલી માહિતી પાછી મેળવવાની સુવિધા.
                                </p>
                            </div>

                            {/* Feature 6 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">Secure Login</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    ઓટીપી / પાસવર્ડ સુરક્ષા સાથે એકાઉન્ટ ઓથેન્ટિકેશન.
                                </p>
                            </div>

                            {/* Feature 7 */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition sm:col-span-2 lg:col-span-1">
                                <div className="text-emerald-400 font-black text-sm mb-1 flex items-center gap-1.5">
                                    <span>✓</span>
                                    <span className="text-white">Admin-managed Templates</span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">
                                    સિસ્ટમ એડમિન દ્વારા ચકાસાયેલ અને અપડેટ કરેલ ટેમ્પલેટ્સ.
                                </p>
                            </div>

                        </div>

                        {/* CTA Box inside Demo/Trust Section */}
                        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-center sm:text-left space-y-0.5">
                                <h4 className="text-base md:text-lg font-black text-white">
                                    તમારો પહેલો દસ્તાવેજ શરૂ કરો
                                </h4>
                                <p className="text-xs text-slate-300 font-semibold">
                                    જરૂરિયાત મુજબ દસ્તાવેજ પસંદ કરો અને DraftSetu દ્વારા તેને તૈયાર કરો.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onNavigate(getTemplateUrl('Sale Deed', 'tpl_997fd57d', ['વેચાણ', 'sale_deed']))}
                                className="w-full sm:w-auto px-6 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl text-xs md:text-sm uppercase tracking-wider transition-all duration-300 shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-sans shrink-0 border-0"
                            >
                                <span>🚀 દસ્તાવેજ બનાવવાનું શરૂ કરો</span>
                            </button>
                        </div>

                    </div>

                </div>

                {/* 3. Notice Board & Resources Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Notice Board */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-center border-b pb-4 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">📢</span>
                                    <div>
                                        <h3 className="text-lg md:text-xl font-black text-slate-800">
                                            તાજા અપડેટ્સ અને અખબારી યાદી
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 font-sans">
                                            Latest Platform Updates
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {notices.map((notice, idx) => (
                                    <div 
                                        key={idx} 
                                        className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                                    >
                                        <span className="bg-blue-50 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 mt-0.5 font-sans">
                                            {notice.date}
                                        </span>
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-700 leading-relaxed font-bold">
                                                {notice.text}
                                            </p>
                                            {notice.isNew && (
                                                <span className="inline-block bg-orange-100 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse font-sans">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t text-center lg:text-left">
                            <span className="text-xs font-semibold text-slate-400 font-sans">
                                Last Updated: May 20, 2026 / DraftSetu Support Team
                            </span>
                        </div>
                    </div>

                    {/* Quick Help & Official Resources */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-[32px] p-6 shadow-xl flex flex-col justify-between h-56 relative overflow-hidden group">
                            <div className="absolute right-[-20px] bottom-[-20px] text-9xl text-white/5 font-black pointer-events-none group-hover:scale-110 transition duration-500 select-none">
                                ⚖️
                            </div>
                            <div className="space-y-3 z-10">
                                <span className="bg-white/20 text-blue-100 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-sans">
                                    Support Center
                                </span>
                                <h3 className="text-xl md:text-2xl font-black leading-tight">
                                    દસ્તાવેજ સંબંધિત કોઈ પ્રશ્ન છે?
                                </h3>
                                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                                    દસ્તાવેજ જનરેશન, ડાઉનલોડ પ્રક્રિયા અને ડ્રાફ્ટિંગ નિયમો અંગેની માર્ગદર્શિકા મેળવવા માટે યુઝર ગાઈડ વાંચો.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onNavigate('page:user-guide')}
                                className="bg-white text-slate-900 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition hover:bg-slate-100 shadow-md flex items-center justify-center gap-1.5 z-10 active:scale-95 font-sans cursor-pointer"
                            >
                                USER MANUAL &rarr;
                            </button>
                        </div>

                        {/* Helpful Resources Links */}
                        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-3 mb-2 font-sans">
                                મહત્વપૂર્ણ લિંક્સ (Helpful Links)
                            </h3>
                            <div className="space-y-2.5 font-sans">
                                <button
                                    type="button"
                                    onClick={() => onNavigate('page:user-guide')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📖</span>
                                        <div>
                                            <div className="text-xs font-black text-slate-800">User Manual (માર્ગદર્શિકા)</div>
                                            <div className="text-[11px] text-slate-400">Step-by-step PDF manual</div>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 text-xs">→</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('page:faqs')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">❓</span>
                                        <div>
                                            <div className="text-xs font-black text-slate-800">FAQs (પ્રશ્નોત્તરી)</div>
                                            <div className="text-[11px] text-slate-400">Common questions & answers</div>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 text-xs">→</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('page:contact')}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📞</span>
                                        <div>
                                            <div className="text-xs font-black text-slate-800">Contact (સંપર્ક)</div>
                                            <div className="text-[11px] text-slate-400">Official support info</div>
                                        </div>
                                    </div>
                                    <span className="text-slate-400 text-xs">→</span>
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

            </div>

            {/* 4. Footer Section */}
            <Footer onNavigate={onNavigate} />
        </div>
    );
};

// Global backward compatibility
window.HomePage = HomePage;
export default HomePage;

