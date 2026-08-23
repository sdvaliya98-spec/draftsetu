const {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    Legend,
    LineChart,
    BarChart
} = window.Recharts || {};

const AdminDashboard = ({ refreshTrigger }) => {
    const [stats, setStats] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.apiFetch('/api/admin/dashboard-stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error("Failed to load dashboard stats", err);
            setError(
                err.message === 'SERVER_OFFLINE'
                ? 'સર્વર ઓફલાઈન છે. કૃપા કરીને બેકએન્ડ ચાલુ કરો (Server is offline. Please start the backend FastAPI server).'
                : `આંકડા મેળવવામાં નિષ્ફળતા: ${err.message || 'અજ્ઞાત ક્ષતિ'}`
            );
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadStats();
    }, [refreshTrigger]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">આંકડા લોડ થઈ રહ્યા છે (Loading Stats...)</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center py-20 px-6">
                <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-6 max-w-lg w-full flex gap-4 items-start shadow-sm animate-fade-in">
                    <span className="text-3xl">⚠️</span>
                    <div>
                        <h4 className="font-black text-rose-800 text-sm mb-1">ભૂલ આવી છે (An Error Occurred)</h4>
                        <p className="text-xs text-rose-600 font-semibold leading-relaxed mb-4">{error}</p>
                        <button 
                            onClick={loadStats}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
                        >
                            ફરી પ્રયાસ કરો (Retry)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const {
        total_documents = 0,
        today_documents = 0,
        total_users = 0,
        active_users = 0,
        locked_documents = 0,
        draft_documents = 0,
        total_templates = 0,
        total_static_pages = 0,
        today_activity = { generated: 0, drafts: 0, locked: 0 },
        template_usage = [],
        pdf_engine = 'Not Available',
        documents_per_day = [],
        locked_vs_drafts = []
    } = stats || {};

    const COLORS = ['#ef4444', '#3b82f6']; // Red for Locked, Blue for Drafts

    return (
        <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-8 animate-modal">
            
            {/* Title / Description */}
            <div className="flex justify-between items-end px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">System Status</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Global platform metrics & telemetry</p>
                </div>
                <button 
                    onClick={loadStats}
                    className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                >
                    🔄 REFRESH METRICS
                </button>
            </div>

            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                
                {/* 1. Total Users */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex items-center gap-5 group">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                        👥
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">Total Users</div>
                        <div className="text-2xl font-black text-slate-800 font-sans mt-0.5">{total_users}</div>
                    </div>
                </div>

                {/* 2. Total Documents */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex items-center gap-5 group">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                        📄
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">Total Documents</div>
                        <div className="text-2xl font-black text-slate-800 font-sans mt-0.5">{total_documents}</div>
                    </div>
                </div>

                {/* 3. Draft Documents */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex items-center gap-5 group">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                        📝
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">Draft Documents</div>
                        <div className="text-2xl font-black text-slate-800 font-sans mt-0.5">{draft_documents}</div>
                    </div>
                </div>

                {/* 4. Finalized Documents */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex items-center gap-5 group">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                        🔒
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">Finalized Documents</div>
                        <div className="text-2xl font-black text-slate-800 font-sans mt-0.5">{locked_documents}</div>
                    </div>
                </div>

                {/* 5. Active Templates */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex items-center gap-5 group">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                        🏛️
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">Active Templates</div>
                        <div className="text-2xl font-black text-slate-800 font-sans mt-0.5">{total_templates}</div>
                    </div>
                </div>

                {/* 6. Total Static Pages */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex items-center gap-5 group">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition duration-300">
                        📖
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 font-bold">Total Static Pages</div>
                        <div className="text-2xl font-black text-slate-800 font-sans mt-0.5">{total_static_pages}</div>
                    </div>
                </div>

            </div>

            {/* Split row: Today's activity logs & ratios */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Today activity logs */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 lg:col-span-2 flex flex-col justify-between">
                    <div>
                        <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1">આજની ગતિવિધિ (Today's Telemetry Log)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Real-time system events</p>
                    </div>

                    <div className="space-y-4 mt-6">
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                            <span className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                                નમૂના ડ્રાફ્ટ બનાવ્યા (Drafts Prepared)
                            </span>
                            <span className="text-sm font-black text-slate-700">{today_activity.drafts}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-slate-50">
                            <span className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                દસ્તાવેજો ડાઉનલોડ કર્યા (Documents Generated)
                            </span>
                            <span className="text-sm font-black text-slate-700">{today_activity.generated}</span>
                        </div>
                        <div className="flex justify-between items-center py-3">
                            <span className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                ફાઇનલ લોક થયેલ (Documents Locked)
                            </span>
                            <span className="text-sm font-black text-slate-700">{today_activity.locked}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Area Chart: Documents Per Day */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 lg:col-span-2">
                    <div className="mb-4">
                        <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1">છેલ્લા ૭ દિવસની પ્રગતિ (Last 7 Days Document Creation)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Volume graph per day</p>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={documents_per_day} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <YAxis tickLine={false} axisLine={false} allowDecimals={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontFamily: 'sans-serif' }} />
                                <Area type="monotone" dataKey="count" name="Documents Created" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart: Locked vs Drafts */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex flex-col justify-between">
                    <div>
                        <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1">દસ્તાવેજની સ્થિતિ ગુણોત્તર (Submission Lock Ratios)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Locked vs drafts ratio</p>
                    </div>

                    {locked_documents === 0 && draft_documents === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-300 text-xs italic">No submission ratios recorded</div>
                    ) : (
                        <div className="h-48 w-full relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={locked_vs_drafts}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {locked_vs_drafts.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="flex justify-center gap-6 mt-2">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                            Locked: {locked_documents}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            Drafts: {draft_documents}
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Row: Template usage lists & detail tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Template Usage Statistics list */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 lg:col-span-2 flex flex-col justify-between gap-6">
                    <div>
                        <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1">નમૂનાઓની લોકપ્રિયતા (Template Popularity Graph)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Most drafted templates</p>
                    </div>

                    <div className="space-y-4">
                        {template_usage.slice(0, 5).map((t, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                    <span>{t.name}</span>
                                    <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-sans">{t.value} drafts</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${(t.value / (total_documents || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}

                        {template_usage.length === 0 && (
                            <p className="text-center text-xs text-slate-400 py-6 italic">No template drafting data recorded yet.</p>
                        )}
                    </div>
                </div>

                {/* System Diagnostics Table */}
                <div className="premium-card p-6 bg-white border border-slate-200/60 flex flex-col justify-between">
                    <div>
                        <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1">સિસ્ટમ ડાયગ્નોસ્ટિક્સ (Diagnostics)</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Core environment health</p>
                    </div>

                    <div className="space-y-3 mt-4 flex-1">
                        <div className="flex justify-between items-center py-2.5 border-b border-slate-50 text-xs">
                            <span className="font-bold text-slate-500">Database Engine</span>
                            <span className="font-black text-slate-700 font-mono">SQLite 3</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-slate-50 text-xs">
                            <span className="font-bold text-slate-500">PDF Generator</span>
                            <span className="font-black text-slate-700 font-mono">
                                {pdf_engine === 'Not Available' ? 'Offline' : 'Online'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-slate-50 text-xs">
                            <span className="font-bold text-slate-500">FastAPI Health</span>
                            <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">Healthy</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 text-xs">
                            <span className="font-bold text-slate-500">UI Stack</span>
                            <span className="font-black text-slate-700 font-mono">React 18 + Tailwind</span>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

// Global backward compatibility
window.AdminDashboard = AdminDashboard;

