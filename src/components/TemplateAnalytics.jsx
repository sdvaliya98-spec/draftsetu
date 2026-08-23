
const TemplateAnalytics = ({ refreshTrigger }) => {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.apiFetch('/api/admin/template-analytics');
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error("❌ Failed to load template analytics:", err);
            setError(err.message || 'Failed to load template analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData, refreshTrigger]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 animate-modal">
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-black text-slate-500 uppercase tracking-widest">Loading Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 animate-modal">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-4">⚠️</div>
                <h4 className="text-lg font-black text-slate-800">Error Loading Template Analytics</h4>
                <p className="text-slate-500 text-sm mt-1">{error}</p>
                <button
                    onClick={loadData}
                    className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition active:scale-95"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { total_templates = 0, total_documents = 0, templates = [] } = data || {};

    // Calculate most used and least used template
    const mostUsed = templates.length > 0 ? templates[0] : null;
    const leastUsed = templates.length > 0 ? templates[templates.length - 1] : null;

    const summaryCards = [
        { 
            label: 'Total Templates', 
            value: total_templates, 
            desc: 'Configured and active in platform', 
            icon: <window.VariableIcon size={20} />, 
            color: 'bg-blue-50 text-blue-600 border-blue-100' 
        },
        { 
            label: 'Total Generated Documents', 
            value: total_documents, 
            desc: 'Total locked & draft submissions', 
            icon: <window.FileTextIcon size={20} />, 
            color: 'bg-indigo-50 text-indigo-600 border-indigo-100' 
        },
        { 
            label: 'Most Used Template', 
            value: mostUsed ? `${mostUsed.usage_count} uses` : 'None', 
            desc: mostUsed ? mostUsed.template_name : 'No usages recorded', 
            icon: <window.ArrowUpIcon size={20} />, 
            color: 'bg-emerald-50 text-emerald-600 border-emerald-100' 
        },
        { 
            label: 'Least Used Template', 
            value: leastUsed ? `${leastUsed.usage_count} uses` : 'None', 
            desc: leastUsed ? leastUsed.template_name : 'No usages recorded', 
            icon: <window.ArrowDownIcon size={20} />, 
            color: 'bg-rose-50 text-rose-600 border-rose-100' 
        },
    ];

    const top10 = templates.slice(0, 10);
    const maxUsage = top10.length > 0 ? Math.max(...top10.map(t => t.usage_count)) : 1;

    return (
        <div className="h-full flex flex-col gap-8 animate-modal">
            {/* Header */}
            <div className="flex items-end justify-between px-2 flex-shrink-0">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Template Analytics</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Read-only &middot; Template usage frequencies & telemetry</p>
                </div>
                <button
                    onClick={loadData}
                    className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                >
                    🔄 REFRESH
                </button>
            </div>

            {/* Content Body */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-8 pb-10">
                {/* Summary Metrics Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {summaryCards.map((c, idx) => (
                        <div key={c.label} className="premium-card bg-white p-6 border border-slate-200/60 flex gap-4 items-start animate-modal" style={{ animationDelay: `${idx * 0.03}s` }}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0 ${c.color.split(' ')[0]} ${c.color.split(' ')[1]} ${c.color.split(' ')[2]}`}>
                                {c.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{c.label}</span>
                                <span className="block text-xl font-black text-slate-800 mt-2 font-mono leading-none truncate">{c.value}</span>
                                <span className="block text-[10px] text-slate-400 font-bold mt-2 leading-tight truncate">{c.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Visualizations & Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Top 10 chart */}
                    <div className="premium-card bg-white p-6 border border-slate-200/60 lg:col-span-1 flex flex-col gap-6 h-fit">
                        <div>
                            <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1">Top 10 Templates by Usage</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Relative usage frequency</p>
                        </div>

                        <div className="space-y-4">
                            {top10.length > 0 ? (
                                top10.map((t, idx) => (
                                    <div key={t.template_id} className="space-y-1.5 animate-modal" style={{ animationDelay: `${idx * 0.05}s` }}>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                            <span className="truncate max-w-[65%]" title={t.template_name}>#{idx + 1} &middot; {t.template_name}</span>
                                            <span className="font-black text-slate-700 bg-slate-50 px-2 py-0.5 rounded font-mono border border-slate-100">{t.usage_count} uses</span>
                                        </div>
                                        <div className="w-full bg-slate-100/80 h-2 rounded-full overflow-hidden border border-slate-50">
                                            <div 
                                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-1000"
                                                style={{ width: `${(t.usage_count / (maxUsage || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-xs text-slate-400 py-6 italic">No template usages recorded yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Full table ranking */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div>
                            <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1 px-2">Template Usage Details</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans px-2">Full ranking for top 20 templates</p>
                        </div>
                        <div className="premium-card bg-white border border-slate-200/60 overflow-hidden">
                            <div className="grid grid-cols-[60px_1fr_120px_180px] gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Usage Count</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Used</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {templates.length > 0 ? (
                                    templates.map((tpl, idx) => (
                                        <div key={tpl.template_id} className="grid grid-cols-[60px_1fr_120px_180px] gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition duration-150 animate-modal" style={{ animationDelay: `${idx * 0.02}s` }}>
                                            <span className="text-xs font-black text-slate-300 font-mono">#{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-700 truncate" title={tpl.template_name}>{tpl.template_name}</span>
                                            <span className="text-sm font-black text-slate-800 font-mono text-right">{tpl.usage_count}</span>
                                            <span className="text-xs font-bold text-slate-400 font-mono text-right">
                                                {tpl.last_used ? window.formatIndiaDateTime(tpl.last_used) : 'Never'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-6 py-8 text-center text-xs font-bold text-slate-400">
                                        No templates found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.TemplateAnalytics = TemplateAnalytics;
