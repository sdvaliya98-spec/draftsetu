import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const StorageAnalytics = ({ refreshTrigger }) => {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await window.apiFetch('/api/admin/storage-analytics');
            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error("❌ Failed to load storage analytics:", err);
            setError(err.message || 'Failed to load storage analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData, refreshTrigger]);

    const formatBytes = (bytes) => {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

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
                <h4 className="text-lg font-black text-slate-800">Error Loading Storage Analytics</h4>
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

    const { summary, storage, top_users, top_templates } = data || {};

    const summaryCards = [
        { label: 'Total Users', value: summary?.total_users ?? 0, icon: <window.UserIcon size={20} />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
        { label: 'Total Documents', value: summary?.total_documents ?? 0, icon: <window.FileTextIcon size={20} />, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
        { label: 'Draft Documents', value: summary?.draft_documents ?? 0, icon: <window.EditIcon size={20} />, color: 'bg-amber-50 text-amber-600 border-amber-100' },
        { label: 'Finalized Documents', value: summary?.locked_documents ?? 0, icon: <window.LockIcon size={20} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        { label: 'Total Templates', value: summary?.total_templates ?? 0, icon: <window.VariableIcon size={20} />, color: 'bg-violet-50 text-violet-600 border-violet-100' },
        { label: 'Static Pages', value: summary?.total_static_pages ?? 0, icon: <window.FileTextIcon size={20} />, color: 'bg-sky-50 text-sky-600 border-sky-100' },
    ];

    const storageMetrics = [
        { name: 'SQLite Database', size: storage?.database_bytes ?? 0, desc: 'Database file, journal & WAL state', icon: <window.DatabaseIcon size={24} />, color: 'bg-slate-50 text-slate-700 border-slate-200' },
        { name: 'Uploads (Templates)', size: storage?.uploads_bytes ?? 0, desc: 'Uploaded DOCX & asset files', icon: <window.UploadIcon size={24} />, color: 'bg-blue-50 text-blue-600 border-blue-100' },
        { name: 'Generated Documents', size: storage?.generated_bytes ?? 0, desc: 'Output DOCX & final PDF exports', icon: <window.DownloadIcon size={24} />, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
        { name: 'Temp Renders', size: storage?.temp_bytes ?? 0, desc: 'Temporary preview & rendering cache', icon: <window.PrinterIcon size={24} />, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    ];

    return (
        <div className="h-full flex flex-col gap-8 animate-modal">
            {/* Header */}
            <div className="flex items-end justify-between px-2 flex-shrink-0">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Storage & Analytics</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Read-only · Live system storage footprint</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {summaryCards.map((c, idx) => (
                        <div key={c.label} className="premium-card bg-white p-5 border border-slate-200/60 flex flex-col gap-4 animate-modal" style={{ animationDelay: `${idx * 0.03}s` }}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.color.split(' ')[0]} ${c.color.split(' ')[1]} ${c.color.split(' ')[2]}`}>
                                {c.icon}
                            </div>
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{c.label}</span>
                                <span className="block text-2xl font-black text-slate-800 mt-1 leading-none font-mono">{c.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Storage Metrics Footprint */}
                <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Storage Footprint</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {storageMetrics.map((sm, idx) => (
                            <div key={sm.name} className="premium-card bg-white p-6 border border-slate-200/60 flex gap-4 items-start animate-modal" style={{ animationDelay: `${(idx + 6) * 0.03}s` }}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border flex-shrink-0 ${sm.color.split(' ')[0]} ${sm.color.split(' ')[1]} ${sm.color.split(' ')[2]}`}>
                                    {sm.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{sm.name}</span>
                                    <span className="block text-xl font-black text-slate-800 mt-2 font-mono leading-none truncate">{formatBytes(sm.size)}</span>
                                    <span className="block text-[10px] text-slate-400 font-bold mt-2 leading-tight">{sm.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lists Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Users */}
                    <div className="flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Top 10 Active Users</h4>
                        <div className="premium-card bg-white border border-slate-200/60 overflow-hidden flex-1">
                            <div className="grid grid-cols-[60px_1fr_120px] gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Documents</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {top_users && top_users.length > 0 ? (
                                    top_users.map((user, idx) => (
                                        <div key={user.username} className="grid grid-cols-[60px_1fr_120px] gap-4 px-6 py-3.5 items-center hover:bg-slate-50/50 transition duration-150">
                                            <span className="text-xs font-black text-slate-300 font-mono">#{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-700">{user.username}</span>
                                            <span className="text-sm font-black text-slate-800 font-mono text-right">{user.doc_count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-6 py-8 text-center text-xs font-bold text-slate-400">
                                        No documents submitted yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Top Templates */}
                    <div className="flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Top 10 Used Templates</h4>
                        <div className="premium-card bg-white border border-slate-200/60 overflow-hidden flex-1">
                            <div className="grid grid-cols-[60px_1fr_120px] gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Uses</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {top_templates && top_templates.length > 0 ? (
                                    top_templates.map((tpl, idx) => (
                                        <div key={tpl.name} className="grid grid-cols-[60px_1fr_120px] gap-4 px-6 py-3.5 items-center hover:bg-slate-50/50 transition duration-150">
                                            <span className="text-xs font-black text-slate-300 font-mono">#{idx + 1}</span>
                                            <span className="text-sm font-bold text-slate-700 truncate" title={tpl.name}>{tpl.name}</span>
                                            <span className="text-sm font-black text-slate-800 font-mono text-right">{tpl.count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-6 py-8 text-center text-xs font-bold text-slate-400">
                                        No templates used yet.
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

window.StorageAnalytics = StorageAnalytics;
export default StorageAnalytics;
