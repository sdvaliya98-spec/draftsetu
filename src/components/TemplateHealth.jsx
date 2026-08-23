const TemplateHealth = ({ refreshTrigger }) => {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = React.useState(null);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = React.useState(false);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.apiFetch('/api/admin/template-health');
            if (!res.ok) throw new Error(`HTTP Error (${res.status})`);
            const result = await res.json();
            setData(result || []);
        } catch (err) {
            console.error("❌ Failed to load template health telemetry:", err);
            setError(err.message === 'SERVER_OFFLINE'
                ? 'સર્વર ઓફલાઈન છે. કૃપા કરીને તપાસો કે બેકએન્ડ ચાલુ છે (Server is offline. Check backend connection).'
                : err.message || 'Failed to load telemetry');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData, refreshTrigger]);

    // Format ISO Datetime to India standard locale
    const formatDateTime = (iso) => {
        if (!iso) return 'Never';
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 animate-modal">
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-black text-slate-500 uppercase tracking-widest">Gathering Health Telemetry...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20 animate-modal">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-4">⚠️</div>
                <h4 className="text-lg font-black text-slate-800">Error Loading Telemetry</h4>
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

    const totalTemplates = data.length;
    const activeTemplates = data.filter(t => t.status === "ACTIVE").length;
    const archivedTemplates = data.filter(t => t.status === "ARCHIVED").length;
    const mostUsed = data.length > 0 && data[0].documents_generated > 0 ? data[0] : null;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const unusedCount = data.filter((t) => {
        if (t.documents_generated === 0) return true;
        if (!t.last_used) return true;
        const lastUsedDate = new Date(t.last_used);
        return lastUsedDate < ninetyDaysAgo;
    }).length;

    const summaryCards = [
        {
            label: "Total Blueprints",
            value: totalTemplates,
            desc: "Total templates in database",
            icon: <window.VariableIcon size={20} />,
            color: "bg-blue-50 text-blue-600 border-blue-100"
        },
        {
            label: "Active Blueprints",
            value: activeTemplates,
            desc: "Live and accessible to users",
            icon: <window.ShieldIcon size={20} />,
            color: "bg-emerald-50 text-emerald-600 border-emerald-100"
        },
        {
            label: "Archived Blueprints",
            value: archivedTemplates,
            desc: "Hidden from general users",
            icon: <window.DatabaseIcon size={20} />,
            color: "bg-amber-50 text-amber-600 border-amber-100"
        },
        {
            label: "Most Used Blueprint",
            value: mostUsed ? `${mostUsed.documents_generated} uses` : "None",
            desc: mostUsed ? mostUsed.template_name : "No usages recorded",
            icon: <window.ArrowUpIcon size={20} />,
            color: "bg-indigo-50 text-indigo-600 border-indigo-100"
        },
        {
            label: "Unused (>90 days)",
            value: unusedCount,
            desc: "Blueprints with zero recent activity",
            icon: <window.ArrowDownIcon size={20} />,
            color: "bg-rose-50 text-rose-600 border-rose-100"
        }
    ];

    return (
        <div className="h-full flex flex-col gap-6 animate-modal">
            <div className="flex items-end justify-between px-2 flex-shrink-0">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Template Health Dashboard</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Real-time usage telemetry & blueprint status metrics</p>
                </div>
                <button
                    onClick={loadData}
                    className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                >
                    🔄 REFRESH
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 flex-shrink-0">
                {summaryCards.map((c, idx) => (
                    <div key={c.label} className="premium-card bg-white p-5 border border-slate-200/60 flex gap-3.5 items-start animate-modal" style={{ animationDelay: `${idx * 0.03}s` }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${c.color.split(" ")[0]} ${c.color.split(" ")[1]} ${c.color.split(" ")[2]}`}>
                            {c.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{c.label}</span>
                            <span className="block text-lg font-black text-slate-800 mt-1.5 font-mono leading-none truncate">{c.value}</span>
                            <span className="block text-[9px] text-slate-400 font-bold mt-1.5 leading-tight truncate">{c.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-grow overflow-y-auto bg-white border border-slate-200/60 rounded-[32px] shadow-sm flex flex-col">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-300 py-10 grayscale opacity-50">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="font-black uppercase tracking-widest text-sm">No templates configured in the system</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                                    <th className="py-4 px-6 text-left">Template Name</th>
                                    <th className="py-4 px-6 text-center">Version</th>
                                    <th className="py-4 px-6 text-center">Documents Generated</th>
                                    <th className="py-4 px-6 text-right">Last Used</th>
                                    <th className="py-4 px-6 text-center">30d Active Users</th>
                                    <th className="py-4 px-6 text-center">Status</th>
                                    <th className="py-4 px-6 text-center">Analytics</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.map((t, idx) => (
                                    <tr key={t.template_id} className="hover:bg-slate-50/50 transition-colors animate-modal" style={{ animationDelay: `${idx * 0.02}s` }}>
                                        <td className="py-3.5 px-6">
                                            <div className="font-bold text-slate-800 text-sm max-w-[280px] truncate" title={t.template_name}>{t.template_name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[280px] truncate">ID: {t.template_id}</div>
                                        </td>
                                        <td className="py-3.5 px-6 text-center">
                                            <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">{t.version || "v1"}</span>
                                        </td>
                                        <td className="py-3.5 px-6 text-center">
                                            <span className={`text-sm font-black font-mono px-3 py-1 rounded-xl ${t.documents_generated > 0 ? "bg-blue-50 text-blue-600" : "text-slate-300"}`}>{t.documents_generated}</span>
                                        </td>
                                        <td className="py-3.5 px-6 text-right">
                                            <span className="text-xs font-bold text-slate-500 font-mono">{formatDateTime(t.last_used)}</span>
                                        </td>
                                        <td className="py-3.5 px-6 text-center">
                                            <span className={`text-sm font-black font-mono px-3 py-1 rounded-xl ${t.active_users > 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-300"}`}>{t.active_users}</span>
                                        </td>
                                        <td className="py-3.5 px-6 text-center">
                                            {t.status === "ARCHIVED" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">Archived</span>
                                            ) : t.status === "ACTIVE" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">Active</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">{t.status}</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-6 text-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTemplateId(t.template_id);
                                                    setIsAnalyticsOpen(true);
                                                }}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer border-0"
                                                type="button"
                                            >
                                                Analytics
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <window.TemplateAnalyticsDetail 
                templateId={selectedTemplateId} 
                isOpen={isAnalyticsOpen} 
                onClose={() => {
                    setIsAnalyticsOpen(false);
                    setSelectedTemplateId(null);
                }} 
            />
        </div>
    );
};

// Mount to window for global access
window.TemplateHealth = TemplateHealth;