const TemplateAnalyticsDetail = ({ templateId, isOpen, onClose }) => {
    const [data, setData] = React.useState(null);
    const [allDocs, setAllDocs] = React.useState([]);
    const [recentDocs, setRecentDocs] = React.useState([]);
    const [templateUsers, setTemplateUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Modals state
    const [previewDoc, setPreviewDoc] = React.useState(null);
    const [selectedUserDoc, setSelectedUserDoc] = React.useState(null);

    // Sub-modal drill down state
    const [drillDownType, setDrillDownType] = React.useState(null); // 'generated' | 'draft' | 'finalized' | 'users'

    React.useEffect(() => {
        if (isOpen && !window.Recharts?.ResponsiveContainer && window.loadRecharts) {
            window.loadRecharts().catch(console.error);
        }
    }, [isOpen]);

    const loadData = React.useCallback(async () => {
        if (!templateId) return;
        setLoading(true);
        setError(null);
        try {
            const [analyticsRes, docsRes, usersRes] = await Promise.all([
                window.apiFetch(`/api/admin/template-analytics/${templateId}`),
                window.apiFetch(`/api/admin/template-analytics/${templateId}/documents`),
                window.apiFetch(`/api/admin/template-analytics/${templateId}/users`)
            ]);

            if (!analyticsRes.ok || !docsRes.ok || !usersRes.ok) {
                throw new Error("Failed to load some analytics resources");
            }

            const [analyticsData, docsData, usersData] = await Promise.all([
                analyticsRes.json(),
                docsRes.json(),
                usersRes.json()
            ]);

            setData(analyticsData);
            setAllDocs(docsData);
            setRecentDocs(docsData.slice(0, 20));
            setTemplateUsers(usersData);
        } catch (err) {
            console.error("❌ Failed to load detailed template analytics:", err);
            setError(err.message === 'SERVER_OFFLINE'
                ? 'સર્વર ઓફલાઈન છે. કૃપા કરીને તપાસો કે બેકએન્ડ ચાલુ છે (Server is offline. Check backend connection).'
                : err.message || 'Failed to load template analytics');
        } finally {
            setLoading(false);
        }
    }, [templateId]);

    React.useEffect(() => {
        if (isOpen && templateId) {
            loadData();
        } else {
            setData(null);
            setAllDocs([]);
            setRecentDocs([]);
            setTemplateUsers([]);
            setDrillDownType(null);
            setPreviewDoc(null);
            setSelectedUserDoc(null);
            setLoading(true);
        }
    }, [isOpen, templateId, loadData]);

    const formatDateTime = (iso) => {
        if (!iso) return 'Never';
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    const renderDrillDownModal = () => {
        if (!drillDownType) return null;

        let title = "";
        let columns = [];
        let rows = [];

        if (drillDownType === 'generated') {
            title = "All Generated Documents";
            columns = ["Tracking ID", "Status", "Created Date", "User", "Action"];
            rows = allDocs;
        } else if (drillDownType === 'draft') {
            title = "Draft Documents";
            columns = ["Tracking ID", "Status", "Created Date", "User", "Action"];
            rows = allDocs.filter(d => !d.is_locked);
        } else if (drillDownType === 'finalized') {
            title = "Finalized Documents";
            columns = ["Tracking ID", "Status", "Created Date", "User", "Action"];
            rows = allDocs.filter(d => d.is_locked);
        } else if (drillDownType === 'users') {
            title = "All Template Users";
            columns = ["Username", "Documents", "Drafts", "Finalized", "Action"];
            rows = templateUsers;
        }

        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4" onClick={() => setDrillDownType(null)}>
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                        <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Analytics Drill-down</span>
                            <h3 className="text-xl font-black text-slate-800 mt-1">{title} ({rows.length})</h3>
                        </div>
                        <button onClick={() => setDrillDownType(null)} className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-slate-700 hover:shadow-sm border border-slate-200/60 flex items-center justify-center text-lg font-bold transition active:scale-95 cursor-pointer">&times;</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {rows.length === 0 ? (
                            <div className="py-12 text-center text-sm font-bold text-slate-400">
                                No records found.
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-100 rounded-2xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            {columns.map(col => (
                                                <th key={col} className={`py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${col === 'Action' ? 'text-center' : ''}`}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {drillDownType !== 'users' ? (
                                            rows.map(doc => (
                                                <tr key={doc.tracking_id} className="hover:bg-slate-50/50 transition">
                                                    <td className="py-3 px-4 text-xs font-mono font-bold text-blue-600">{doc.tracking_id}</td>
                                                    <td className="py-3 px-4">
                                                        {doc.is_locked ? (
                                                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">Finalized</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">Draft</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs font-semibold text-slate-500 font-mono">{formatDateTime(doc.created_at)}</td>
                                                    <td className="py-3 px-4">
                                                        <button 
                                                            onClick={() => setSelectedUserDoc({ user_id: doc.user_id, username: doc.username })}
                                                            className="text-xs font-bold text-slate-700 hover:text-blue-600 transition bg-transparent border-0 p-0 cursor-pointer"
                                                        >
                                                            {doc.username}
                                                        </button>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <button 
                                                            onClick={() => setPreviewDoc(doc)}
                                                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition border-0 cursor-pointer"
                                                        >
                                                            👁 Preview
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            rows.map((rowUser, idx) => (
                                                <tr key={rowUser.user_id || idx} className="hover:bg-slate-50/50 transition">
                                                    <td className="py-3 px-4 text-xs font-bold text-slate-700">
                                                        <span className="inline-block w-5 text-slate-300 font-mono text-[10px]">#{idx + 1}</span>
                                                        {rowUser.username}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs font-black text-slate-800 font-mono">{rowUser.documents}</td>
                                                    <td className="py-3 px-4 text-xs font-bold text-amber-600 font-mono">{rowUser.drafts}</td>
                                                    <td className="py-3 px-4 text-xs font-bold text-emerald-600 font-mono">{rowUser.finalized}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <button 
                                                            onClick={() => setSelectedUserDoc({ user_id: rowUser.user_id, username: rowUser.username })}
                                                            className="px-3 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-xs font-bold transition border-0 cursor-pointer"
                                                        >
                                                            👤 View User
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in font-sans">
            <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col w-full max-w-5xl max-h-[90vh] overflow-hidden animate-modal">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Blueprint Diagnostics</div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                            {data ? data.template_name : 'Loading blueprint...'}
                        </h2>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {templateId}</div>
                        {data && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 font-medium">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">Generated: {data?.documents_generated ?? 0}</span>
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">Drafts: {data?.draft_count ?? 0}</span>
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">Finalized: {data?.finalized_count ?? 0}</span>
                                <span>Last Used: <span className="font-mono font-bold text-slate-700">{formatDateTime(data?.last_used)}</span></span>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-slate-700 hover:shadow-md border border-slate-200/60 flex items-center justify-center text-xl font-bold transition active:scale-95 cursor-pointer"
                        type="button"
                    >
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Gathering usage data...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-4">⚠️</div>
                            <h4 className="text-lg font-black text-slate-800">Error Loading Analytics</h4>
                            <p className="text-slate-500 text-sm mt-1 text-center max-w-md">{error}</p>
                            <button
                                onClick={loadData}
                                className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : !data ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="text-6xl mb-4 grayscale opacity-40">📊</div>
                            <h4 className="text-lg font-black text-slate-700">Analytics Data Unavailable</h4>
                            <p className="text-slate-400 text-sm mt-1 max-w-sm">No analytics data could be loaded for this template.</p>
                        </div>
                    ) : (data?.documents_generated ?? 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="text-6xl mb-4 grayscale opacity-40">📊</div>
                            <h4 className="text-lg font-black text-slate-700">No Analytics Data Available</h4>
                            <p className="text-slate-400 text-sm mt-1 max-w-sm">This blueprint template has not been used to generate any documents or drafts yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            
                            {/* Cards Metrics Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div 
                                    onClick={() => setDrillDownType('generated')}
                                    className="premium-card bg-slate-50/50 p-5 border border-slate-100 flex flex-col justify-between hover:border-blue-300 hover:shadow-md cursor-pointer transition"
                                >
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Generated</span>
                                    <span className="block text-3xl font-black text-slate-800 mt-2 font-mono leading-none">{data?.documents_generated ?? 0}</span>
                                    <span className="block text-[9px] text-slate-400 font-bold mt-2 leading-tight">All drafts & finalized docs</span>
                                </div>
                                <div 
                                    onClick={() => setDrillDownType('draft')}
                                    className="premium-card bg-amber-50/20 p-5 border border-amber-100/40 flex flex-col justify-between hover:border-amber-300 hover:shadow-md cursor-pointer transition"
                                >
                                    <span className="block text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Drafts</span>
                                    <span className="block text-3xl font-black text-amber-700 mt-2 font-mono leading-none">{data?.draft_count ?? 0}</span>
                                    <span className="block text-[9px] text-amber-500 font-bold mt-2 leading-tight">Currently being edited</span>
                                </div>
                                <div 
                                    onClick={() => setDrillDownType('finalized')}
                                    className="premium-card bg-emerald-50/20 p-5 border border-emerald-100/40 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md cursor-pointer transition"
                                >
                                    <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Finalized</span>
                                    <span className="block text-3xl font-black text-emerald-700 mt-2 font-mono leading-none">{data?.finalized_count ?? 0}</span>
                                    <span className="block text-[9px] text-emerald-500 font-bold mt-2 leading-tight">Locked and ready to print</span>
                                </div>
                                <div 
                                    onClick={() => setDrillDownType('users')}
                                    className="premium-card bg-indigo-50/20 p-5 border border-indigo-100/40 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md cursor-pointer transition"
                                >
                                    <span className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">Active Users</span>
                                    <span className="block text-3xl font-black text-indigo-700 mt-2 font-mono leading-none">{data?.active_users ?? 0}</span>
                                    <span className="block text-[9px] text-indigo-500 font-bold mt-2 leading-tight">Unique users in last 30 days</span>
                                </div>
                            </div>

                            {/* Main Grid: Chart and Highlights */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Monthly Trend Chart */}
                                <div className="lg:col-span-2 flex flex-col gap-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Monthly Generation Trend (Last 12 Months)</h4>
                                    <div className="premium-card bg-white p-5 border border-slate-200/60 h-[280px]">
                                        <window.Recharts.ResponsiveContainer width="100%" height="100%">
                                            <window.Recharts.BarChart data={data?.monthly_trend ?? []}>
                                                <window.Recharts.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <window.Recharts.XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <window.Recharts.YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <window.Recharts.Tooltip 
                                                    contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                                    cursor={{ fill: '#f8fafc' }}
                                                />
                                                <window.Recharts.Bar dataKey="count" fill="url(#blueGrad)" radius={[4, 4, 0, 0]} barSize={24}>
                                                    <defs>
                                                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#3b82f6" />
                                                            <stop offset="100%" stopColor="#1d4ed8" />
                                                        </linearGradient>
                                                    </defs>
                                                </window.Recharts.Bar>
                                            </window.Recharts.BarChart>
                                        </window.Recharts.ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Summary details */}
                                <div className="lg:col-span-1 flex flex-col gap-5">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Activity Highlights</h4>
                                    <div className="premium-card bg-slate-50/50 p-6 border border-slate-100 flex-1 space-y-5">
                                        <div>
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Finalized</span>
                                            <span className="block text-xs font-bold text-slate-700 mt-2 font-mono">
                                                {formatDateTime(data?.last_generated)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Used Activity</span>
                                            <span className="block text-xs font-bold text-slate-700 mt-2 font-mono">
                                                {formatDateTime(data?.last_used)}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200/60">
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                                <span>Finalization Ratio</span>
                                                <span className="font-mono text-slate-700">{(data?.documents_generated ?? 0) > 0 ? Math.round(((data?.finalized_count ?? 0) / (data?.documents_generated ?? 1)) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                                                <div 
                                                    className="bg-emerald-500 h-full rounded-full"
                                                    style={{ width: `${(data?.documents_generated ?? 0) > 0 ? ((data?.finalized_count ?? 0) / (data?.documents_generated ?? 1)) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Documents & Top Users Panels */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Documents Panel */}
                                <div className="lg:col-span-2 flex flex-col gap-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Recent Documents</h4>
                                    <div className="premium-card bg-white border border-slate-200/60 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tracking ID</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Open</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {recentDocs.length > 0 ? (
                                                        recentDocs.map(doc => (
                                                            <tr key={doc.tracking_id} className="hover:bg-slate-50/50 transition">
                                                                <td className="py-3 px-4 text-xs font-mono font-bold text-blue-600">{doc.tracking_id}</td>
                                                                <td className="py-3 px-4">
                                                                    {doc.is_locked ? (
                                                                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">Finalized</span>
                                                                    ) : (
                                                                        <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">Draft</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-3 px-4 text-xs font-semibold text-slate-500 font-mono">{formatDateTime(doc.created_at)}</td>
                                                                <td className="py-3 px-4 text-xs font-bold text-slate-700">{doc.username}</td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <button 
                                                                        onClick={() => setPreviewDoc(doc)}
                                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition border-0 cursor-pointer"
                                                                    >
                                                                        👁 Open
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="5" className="py-8 text-center text-xs font-bold text-slate-400">No recent documents found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Users Panel */}
                                <div className="lg:col-span-1 flex flex-col gap-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Top Users</h4>
                                    <div className="premium-card bg-white border border-slate-200/60 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Username</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Drafts</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Finalized</th>
                                                        <th className="py-3 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {templateUsers.length > 0 ? (
                                                        templateUsers.map((u, idx) => (
                                                            <tr key={u.user_id || idx} className="hover:bg-slate-50/50 transition">
                                                                <td className="py-3 px-4 text-xs font-bold text-slate-700">{u.username}</td>
                                                                <td className="py-3 px-4 text-xs font-black text-slate-800 font-mono text-center">{u.documents}</td>
                                                                <td className="py-3 px-4 text-xs font-bold text-amber-600 font-mono text-center">{u.drafts}</td>
                                                                <td className="py-3 px-4 text-xs font-bold text-emerald-600 font-mono text-center">{u.finalized}</td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <button 
                                                                        onClick={() => setSelectedUserDoc({ user_id: u.user_id, username: u.username })}
                                                                        className="px-2 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[11px] font-bold transition border-0 cursor-pointer"
                                                                    >
                                                                        👤 View
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="5" className="py-8 text-center text-xs font-bold text-slate-400">No users found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-700 transition active:scale-95 cursor-pointer"
                        type="button"
                    >
                        Close
                    </button>
                </div>

            </div>

            {/* Shared Document Preview Modal */}
            <window.AdminDocumentPreviewModal
                previewDoc={previewDoc}
                onClose={() => setPreviewDoc(null)}
            />

            {/* Shared User Profile Modal */}
            <window.AdminUserDetailModal
                userDetailDoc={selectedUserDoc}
                onClose={() => setSelectedUserDoc(null)}
            />

            {/* Custom Drill Down Sub-modal */}
            {renderDrillDownModal()}
        </div>
    );
};

window.TemplateAnalyticsDetail = TemplateAnalyticsDetail;
