
const HomePage = ({ currentUser, onNavigate, onLogin, templates = [] }) => {
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [selectedCategory, setSelectedCategory] = React.useState('All');

    const filteredTemplates = selectedCategory === 'All' 
        ? templates 
        : templates.filter(t => (t.category || 'General') === selectedCategory);
    
    // Dynamic Category List derived from templates
    const availableCategories = React.useMemo(() => {
        const cats = new Set(templates.map(t => t.category || 'General').filter(c => c && c !== 'Test / Dummy'));
        return ['All', ...Array.from(cats)];
    }, [templates]);

    // Dynamic URL Resolver Helper
    const getTemplateUrl = (categoryName, targetTemplateId = null, searchKeywords = []) => {
        // 1. Direct active template ID match if provided
        if (targetTemplateId) {
            const targetTpl = templates.find(t => t.is_active && (t.template_id === targetTemplateId || t.id === targetTemplateId));
            if (targetTpl) {
                return `editor?template=${targetTpl.template_id || targetTpl.id}`;
            }
        }
        // 2. Direct category match
        const categoryMatch = templates.find(t => t.is_active && (t.category || '').toLowerCase() === (categoryName || '').toLowerCase());
        if (categoryMatch) {
            return `editor?template=${categoryMatch.template_id || categoryMatch.id}`;
        }
        // 3. Fallback to search keywords if needed
        const keywordMatch = templates.find(t => {
            if (!t.is_active) return false;
            return searchKeywords.some(keyword => 
                (t.name || '').toLowerCase().includes(keyword.toLowerCase()) || 
                (t.template_id || t.id || '').toLowerCase().includes(keyword.toLowerCase())
            );
        });
        if (keywordMatch) {
            return `editor?template=${keywordMatch.template_id || keywordMatch.id}`;
        }
        return "editor"; // Fallback to editor
    };
    
    const slides = [
        {
            title: "DraftSetu",
            subtitle: "Professional Legal Document Automation Platform",
            desc: "Generate Gujarati legal and revenue documents instantly using advanced DOCX template automation.",
            badge: "Advanced Legal-Tech SaaS",
            bg: "from-blue-900 via-slate-900 to-indigo-950",
            actionText: "Start Generating",
            actionUrl: getTemplateUrl('Sale Deed', 'tpl_997fd57d', ['વેચાણ', 'sale_deed'])
        },
        {
            title: "સચોટ ગુજરાતી કાનૂની દસ્તાવેજો",
            subtitle: "નિયમ અનુસાર ડ્રાફ્ટિંગ સોલ્યુશન્સ",
            desc: "વેચાણ દસ્તાવેજ, પેપર નોટીસ, સોગંદનામા અને વારસાઈ પત્રકો માત્ર થોડી મિનિટોમાં તૈયાર કરો.",
            badge: "૧૦૦% સચોટ નમૂનાઓ",
            bg: "from-slate-900 via-sky-950 to-blue-900",
            actionText: "સેવાઓ એક્સપ્લોર કરો",
            actionUrl: getTemplateUrl('Sale Deed', 'tpl_997fd57d', ['વેચાણ', 'sale_deed'])
        },
        {
            title: "સુરક્ષિત દસ્તાવેજ વોલ્ટ (Vault)",
            subtitle: "તમારા ડ્રાફ્ટ્સ ગમે ત્યારે એક્સેસ કરો",
            desc: "તમારા પર્સનલ એકાઉન્ટમાં સેવ કરેલા દસ્તાવેજો સુરક્ષિત રીતે સંગ્રહિત કરો અને ગમે ત્યારે સુધારા કરો.",
            badge: "ડેટા સુરક્ષા અને ગુપ્તતા",
            bg: "from-blue-950 via-slate-900 to-indigo-950",
            actionText: "મારા દસ્તાવેજો",
            actionUrl: "documents"
        }
    ];

    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [slides.length]);

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

    const statistics = [
        { label: "કુલ નોંધાયેલ યુઝર્સ", value: "૧,૫૦,૦૦૦+", icon: "👥", color: "text-blue-600 bg-blue-50" },
        { label: "તૈયાર કરેલ દસ્તાવેજો", value: "૪,૮૫,૦૦૦+", icon: "📄", color: "text-emerald-600 bg-emerald-50" },
        { label: "સિસ્ટમ ઓટોમેશન સચોટતા", value: "૯૯.૯%", icon: "✅", color: "text-amber-600 bg-amber-50" }
    ];

    return (
        <div className="w-full bg-slate-50 flex flex-col font-gujarati overflow-x-hidden min-h-screen">
            {/* 1. Hero Slider Section */}
            <div className="relative w-full h-[380px] md:h-[450px] overflow-hidden shadow-inner no-print z-10">
                {slides.map((slide, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 bg-gradient-to-br ${slide.bg} text-white transition-opacity duration-1000 flex items-center px-6 md:px-16 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                        <div className="max-w-4xl mx-auto w-full space-y-4 md:space-y-6">
                            <span className="inline-block bg-blue-600/30 backdrop-blur-md text-blue-200 border border-blue-400/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider font-sans">
                                {slide.badge}
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight font-outfit">
                                {slide.title}
                            </h2>
                            <h3 className="text-lg md:text-2xl text-blue-200 font-bold font-sans">
                                {slide.subtitle}
                            </h3>
                            <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed font-semibold">
                                {slide.desc}
                            </p>
                            <div className="pt-2 md:pt-4 flex gap-4">
                                <button
                                    onClick={() => onNavigate(slide.actionUrl)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs md:text-sm uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 font-sans"
                                >
                                    {slide.actionText}
                                </button>
                                {!currentUser && (
                                    <button
                                        onClick={onLogin}
                                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs md:text-sm uppercase tracking-widest px-6 py-3.5 rounded-xl transition font-sans"
                                    >
                                        Login / Register
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Dots indicators */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-blue-500 w-6' : 'bg-white/40'}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 w-full space-y-16">
                
                {/* 2. Quick-Access Service Cards */}
                <div className="space-y-6">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                            પ્રોફેશનલ દસ્તાવેજ સેવાઓ અને ડ્રાફ્ટ નમૂનાઓ
                        </h2>
                        <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-widest mt-1.5 font-sans">
                            Document Services & Templates
                        </p>
                        <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6">
                        {quickServices.map((service, idx) => (
                            <div 
                                key={idx}
                                className={`border rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/50 bg-white ${service.color} group`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-4xl">{service.icon}</span>
                                        <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-sans">
                                            {service.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-blue-900 transition">
                                        {service.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-3 font-sans">
                                        {service.enTitle}
                                    </p>
                                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                        {service.desc}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onNavigate(service.url)}
                                    className="mt-6 w-full py-2.5 bg-slate-50 group-hover:bg-blue-900 text-slate-600 group-hover:text-white rounded-xl text-xs font-black transition-all border border-slate-200 group-hover:border-blue-900 text-center tracking-wider font-sans"
                                >
                                    GET STARTED &rarr;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2.5 Dynamic Template Library */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                                બ્રાવ્ઝ ટેમ્પલેટ લાયબ્રેરી
                            </h2>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1 font-sans">
                                Browse Template Library
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Category Filter
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className="flex-1 md:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 font-sans"
                            >
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredTemplates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTemplates.map((t) => (
                                <div key={t.id} className="border rounded-[28px] p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/50 bg-white group border-indigo-100 hover:border-indigo-300">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition duration-300 shadow-sm border border-indigo-100">
                                                📄
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full font-sans border border-indigo-200">
                                                {t.category || 'General'}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-800 mb-2 group-hover:text-indigo-700 transition">
                                            {t.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 leading-relaxed font-semibold line-clamp-3">
                                            {(t.content || '').replace(/<[^>]+>/g, ' ').trim() || 'No preview available'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onNavigate(`editor?template=${t.template_id || t.id}`)}
                                        className="mt-6 w-full py-2.5 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl text-xs font-black transition-all border border-indigo-100 group-hover:border-indigo-600 text-center tracking-wider font-sans shadow-sm"
                                    >
                                        USE TEMPLATE &rarr;
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-[28px] p-12 text-center">
                            <span className="text-4xl mb-4 block">📭</span>
                            <h3 className="text-lg font-black text-slate-700 mb-1">No templates found</h3>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                Try selecting a different category
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. Notice Board & Statistics Row */}
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

                    {/* Quick Help & Dashboard Stats */}
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
                                onClick={() => onNavigate('page:user-guide')}
                                className="bg-white text-slate-900 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition hover:bg-slate-100 shadow-md flex items-center justify-center gap-1.5 z-10 active:scale-95 font-sans"
                            >
                                USER MANUAL &rarr;
                            </button>
                        </div>

                        {/* Portal Stats */}
                        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-3 mb-2 font-sans">
                                Live Platform Stats
                            </h3>
                            <div className="space-y-4">
                                {statistics.map((stat, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${stat.color}`}>
                                            {stat.icon}
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400 font-bold">{stat.label}</div>
                                            <div className="text-lg font-black text-slate-800 font-sans">{stat.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>

            </div>

            {/* 4. Footer Section */}
            <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-20 no-print">
                <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                                    <path d="M12 22V8M5 12H19M5 12A3.5 3.5 0 0 1 12 8.5M19 12A3.5 3.5 0 0 0 12 8.5M5 12L12 16.5L19 12" />
                                </svg>
                            </div>
                            <span className="font-black text-white text-lg tracking-wider font-outfit">DraftSetu</span>
                        </div>
                        <p className="text-xs leading-relaxed font-semibold">
                            Professional Legal Document Automation Platform. Automating complex drafting workflows with standard blueprints.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-black text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">Legal & Terms</h4>
                        <ul className="space-y-2.5 text-xs font-semibold">
                            <li><button className="hover:text-white transition">Privacy Policy</button></li>
                            <li><button className="hover:text-white transition">Terms of Service</button></li>
                            <li><button onClick={() => onNavigate('page:contact')} className="hover:text-white transition">Contact Us</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">Resources</h4>
                        <ul className="space-y-2.5 text-xs font-semibold">
                            <li><button onClick={() => onNavigate('page:user-guide')} className="hover:text-white transition">User Guide</button></li>
                            <li><button onClick={() => onNavigate('page:faqs')} className="hover:text-white transition">FAQs</button></li>
                            <li><button onClick={() => onNavigate('documents')} className="hover:text-white transition">My Documents (Vault)</button></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-black text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">Disclaimer</h4>
                        <p className="text-[10px] leading-relaxed">
                            DraftSetu is a private document automation SaaS platform. All generated documents are draft blueprints. Final execution is subject to appropriate stamp duty, notarization, and registration before legal authorities.
                        </p>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 mt-8 border-t border-slate-800/60 text-center text-xs font-sans">
                    <p>© 2026 DraftSetu. All rights reserved. Designed for professional legal-tech automation.</p>
                </div>
            </footer>
        </div>
    );
};

// Global backward compatibility
window.HomePage = HomePage;

