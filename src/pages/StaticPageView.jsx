import React from 'react';
import Footer from '../components/Footer.jsx';

const StaticPageView = ({ slug, onNavigate }) => {
    const [page, setPage] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    const handleBack = () => {
        if (typeof onNavigate === 'function') {
            onNavigate('back');
        } else if (typeof window.handleNavigate === 'function') {
            window.handleNavigate('back');
        } else {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
        }
    };

    React.useEffect(() => {
        if (!slug) {
            setPage(null);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const fetchPage = async () => {
            if (slug === 'user-guide') {
                if (isMounted) {
                    setPage({
                        title: 'DraftSetu – Document Creation User Manual (દસ્તાવેજ નિર્માણ માર્ગદર્શિકા)',
                        content: `
                            <div class="space-y-6">
                                <p class="text-slate-700 text-sm md:text-base leading-relaxed">
                                    DraftSetu પ્લેટફોર્મ પર લોગિનથી લઈને દસ્તાવેજ પસંદગી, ડેટા એન્ટ્રી, લાઈવ પ્રિવ્યૂ, વોટરમાર્ક્ડ પીડીએફ વેરિફિકેશન, ક્રેડિટ્સ અને ફાઇનલ અધિકૃત DOCX/PDF ડાઉનલોડ સુધીની સંપૂર્ણ માર્ગદર્શિકા નીચે ઉપલબ્ધ છે.
                                </p>
                                <div class="flex flex-wrap gap-4 pt-2">
                                    <a href="/docs/DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition active:scale-95 no-underline">
                                        <span>📄 View / Open PDF in New Tab</span>
                                    </a>
                                    <a href="/docs/DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" download="DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition active:scale-95 no-underline">
                                        <span>📥 Download User Manual (PDF)</span>
                                    </a>
                                </div>
                                <div class="mt-6 border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                                    <iframe src="/docs/DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" class="w-full h-[700px] border-0" title="DraftSetu User Manual"></iframe>
                                </div>
                            </div>
                        `
                    });
                    setLoading(false);
                }
                return;
            }

            try {
                if (typeof window.apiFetch === 'function') {
                    const r = await window.apiFetch(`/api/pages/${slug}`);
                    if (r && r.ok) {
                        const data = await r.json();
                        if (isMounted) {
                            if (data && typeof data === 'object' && !Array.isArray(data) && data.title) {
                                setPage(data);
                            } else {
                                setPage(null);
                            }
                        }
                    } else {
                        if (isMounted) setPage(null);
                    }
                } else {
                    if (isMounted) setPage(null);
                }
            } catch (err) {
                if (isMounted) setPage(null);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPage();

        return () => {
            isMounted = false;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-gujarati">
                <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">માહિતી લોડ થઈ રહી છે...</p>
                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-gujarati">
                <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
                    <div className="text-center bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm max-w-sm w-full">
                        <div className="text-5xl mb-4">🔍</div>
                        <h3 className="text-lg font-black text-slate-800">પાનું મળ્યું નથી</h3>
                        <p className="text-xs text-slate-400 mt-1">આ સરનામે કોઈ માહિતી ઉપલબ્ધ નથી.</p>
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <button 
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                &larr; પાછા જાઓ
                            </button>
                            <button 
                                type="button"
                                onClick={() => onNavigate && onNavigate('home')}
                                className="px-5 py-2.5 bg-blue-900 text-white hover:bg-blue-800 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer"
                            >
                                મુખ્ય પૃષ્ઠ
                            </button>
                        </div>
                    </div>
                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-gujarati">
            <div className="flex-1 max-w-5xl mx-auto w-full py-8 md:py-12 px-4 md:px-6 space-y-6">
                
                {/* Navigation Breadcrumb & Back Bar */}
                <div className="flex justify-between items-center no-print bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <button 
                            type="button"
                            onClick={() => onNavigate && onNavigate('home')} 
                            className="hover:text-blue-900 transition flex items-center gap-1 cursor-pointer"
                        >
                            <span>🏠</span>
                            <span>મુખ્ય પૃષ્ઠ</span>
                        </button>
                        <span>&rarr;</span>
                        <span className="text-slate-700 font-black truncate max-w-[200px] sm:max-w-md">{page.title}</span>
                    </div>
                    <button 
                        type="button"
                        onClick={handleBack}
                        className="flex items-center gap-1.5 text-xs font-black text-blue-900 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl shadow-2xs hover:shadow transition active:scale-95 cursor-pointer"
                    >
                        <span>&larr;</span>
                        <span>પાછા જાઓ</span>
                    </button>
                </div>

                {/* Main Article Container */}
                <article className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-10 shadow-sm space-y-8 animate-fade-in">
                    <header className="border-b border-slate-100 pb-6">
                        <h1 className="text-2xl md:text-3xl font-black text-blue-900 tracking-tight leading-tight">
                            {page.title}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                            ડ્રાફ્ટસેતુ પ્લેટફોર્મ માર્ગદર્શિકા • કાનૂની માહિતી પત્રક
                        </p>
                    </header>

                    {/* Rich HTML Content */}
                    <div 
                        className="prose max-w-none text-slate-600 leading-relaxed font-semibold text-sm md:text-base space-y-4"
                        dangerouslySetInnerHTML={{ __html: page.content }} 
                    />
                </article>

                {/* Document Footer Disclaimer */}
                <div className="text-center text-[10px] text-slate-400 font-semibold no-print py-4">
                    આ પૃષ્ઠ પરની માહિતી છેલ્લે ૨૦ મે ૨૦૨૬ ના રોજ અપડેટ કરવામાં આવી હતી. કાયદાકીય ફેરફારો માટે સત્તાવાર ગેઝેટ જુઓ.
                </div>

            </div>
            
            {/* Reusable Site Footer */}
            <Footer onNavigate={onNavigate} />
        </div>
    );
};

// Global backward compatibility
window.StaticPageView = StaticPageView;
export default StaticPageView;

