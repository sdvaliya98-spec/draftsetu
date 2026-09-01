import React from 'react';

const StaticPageView = ({ slug, onNavigate }) => {
    const [page, setPage] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setLoading(true);
        if (window.apiFetch) {
            window.apiFetch(`/api/pages/${slug}`)
                .then(r => r.ok ? r.json() : null)
                .then(setPage)
                .catch(() => setPage(null))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [slug]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">માહિતી લોડ થઈ રહી છે...</p>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[60vh] font-gujarati">
                <div className="text-center bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm max-w-sm">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="text-lg font-black text-slate-800">પાનું મળ્યું નથી</h3>
                    <p className="text-xs text-slate-400 mt-1">આ સરનામે કોઈ માહિતી ઉપલબ્ધ નથી.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 px-5 py-2.5 bg-blue-900 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                        ફરી પ્રયાસ કરો
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50 py-12 px-4 md:px-6 min-h-screen font-gujarati">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Navigation Breadcrumb */}
                <div className="flex justify-between items-center no-print">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <button onClick={() => onNavigate('home')} className="hover:text-blue-900 transition">મુખ્ય પૃષ્ઠ</button>
                        <span>&rarr;</span>
                        <span className="text-slate-600 font-black">{page.title}</span>
                    </div>
                    <button 
                        onClick={() => onNavigate('home')}
                        className="flex items-center gap-1 text-xs font-black text-blue-900 hover:text-blue-700 bg-white border px-4 py-2 rounded-xl shadow-sm hover:shadow transition"
                    >
                        &larr; પાછા જાઓ
                    </button>
                </div>

                {/* Main Article Container */}
                <article className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-10 shadow-sm space-y-8 animate-fade-in">
                    <header className="border-b border-slate-100 pb-6">
                        <h1 className="text-2xl md:text-3xl font-black text-blue-900 tracking-tight leading-tight">
                            {page.title}
                        </h1>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
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
        </div>
    );
};

// Global backward compatibility
window.StaticPageView = StaticPageView;
export default StaticPageView;
