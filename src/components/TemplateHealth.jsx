import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const TrashIcon = window.TrashIcon || (({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
));
const ArrowLeftIcon = window.ArrowLeftIcon || (({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
));
const ArrowRightIcon = window.ArrowRightIcon || (({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
));

const PAGE_SIZE = 10;

const TemplateHealth = ({ refreshTrigger }) => {
    const [data, setData] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = React.useState(null);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = React.useState(false);
    const [deleteTargetTemplate, setDeleteTargetTemplate] = React.useState(null);
    const [isDeletingTemplate, setIsDeletingTemplate] = React.useState(false);
    const [page, setPage] = React.useState(1);

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

    const handlePermanentDelete = async () => {
        if (!deleteTargetTemplate) return;
        setIsDeletingTemplate(true);
        try {
            const res = await window.apiFetch(`/api/templates/${deleteTargetTemplate.template_id}`, {
                method: 'DELETE'
            });
            const resData = await res.json().catch(() => ({}));
            if (res.ok) {
                setDeleteTargetTemplate(null);
                loadData();
            } else {
                alert(resData.detail || 'Failed to delete template.');
            }
        } catch (err) {
            alert('Failed to delete template: ' + err.message);
        } finally {
            setIsDeletingTemplate(false);
        }
    };

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

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(totalTemplates / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedData = data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const summaryCards = [
        {
            label: "Total Blueprints",
            value: totalTemplates,
            desc: "Total templates in database",
            icon: <window.VariableIcon size={18} />,
            color: "bg-blue-50 text-blue-600 border-blue-100"
        },
        {
            label: "Active Blueprints",
            value: activeTemplates,
            desc: "Live and accessible to users",
            icon: <window.ShieldIcon size={18} />,
            color: "bg-emerald-50 text-emerald-600 border-emerald-100"
        },
        {
            label: "Archived Blueprints",
            value: archivedTemplates,
            desc: "Hidden from general users",
            icon: <window.DatabaseIcon size={18} />,
            color: "bg-amber-50 text-amber-600 border-amber-100"
        },
        {
            label: "Most Used Blueprint",
            value: mostUsed ? `${mostUsed.documents_generated} uses` : "None",
            desc: mostUsed ? mostUsed.template_name : "No usages recorded",
            icon: <window.ArrowUpIcon size={18} />,
            color: "bg-indigo-50 text-indigo-600 border-indigo-100"
        },
        {
            label: "Unused (>90 days)",
            value: unusedCount,
            desc: "Zero recent activity",
            icon: <window.ArrowDownIcon size={18} />,
            color: "bg-rose-50 text-rose-600 border-rose-100"
        }
    ];

    return (
        <div className="h-full flex flex-col gap-4 animate-modal">
            {/* Header */}
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
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-shrink-0">
                {summaryCards.map((c, idx) => (
                    <div key={c.label} className="premium-card bg-white p-3.5 border border-slate-200/60 flex gap-3 items-center animate-modal shadow-sm" style={{ animationDelay: `${idx * 0.03}s` }}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${c.color.split(" ")[0]} ${c.color.split(" ")[1]} ${c.color.split(" ")[2]}`}>
                            {c.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">{c.label}</span>
                            <span className="block text-base font-black text-slate-800 mt-1 font-mono leading-none truncate">{c.value}</span>
                            <span className="block text-[8.5px] text-slate-400 font-bold mt-1 leading-tight truncate">{c.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Template Table Area */}
            <div className="flex-1 min-h-[360px] bg-white border border-slate-200/60 rounded-[32px] shadow-sm flex flex-col overflow-hidden">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-300 py-10 grayscale opacity-50">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="font-black uppercase tracking-widest text-sm">No templates configured in the system</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                                    <th className="py-3.5 px-6 text-left">Template Name</th>
                                    <th className="py-3.5 px-4 text-center">Version</th>
                                    <th className="py-3.5 px-4 text-center">Documents Generated</th>
                                    <th className="py-3.5 px-4 text-right">Last Used</th>
                                    <th className="py-3.5 px-4 text-center">30d Active Users</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-6 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.map((t, idx) => (
                                    <tr key={t.template_id} className="hover:bg-slate-50/60 transition-colors animate-modal" style={{ animationDelay: `${idx * 0.02}s` }}>
                                        <td className="py-3 px-6">
                                            <div className="font-bold text-slate-800 text-sm max-w-[260px] truncate" title={t.template_name}>{t.template_name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[260px] truncate">ID: {t.template_id}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">{t.version || "v1"}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-sm font-black font-mono px-3 py-1 rounded-xl ${t.documents_generated > 0 ? "bg-blue-50 text-blue-600" : "text-slate-300"}`}>{t.documents_generated}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-xs font-bold text-slate-500 font-mono">{formatDateTime(t.last_used)}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-sm font-black font-mono px-3 py-1 rounded-xl ${t.active_users > 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-300"}`}>{t.active_users}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {t.status === "ARCHIVED" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">Archived</span>
                                            ) : t.status === "ACTIVE" ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">Active</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">{t.status}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTemplateId(t.template_id);
                                                        setIsAnalyticsOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer border border-blue-200/60 shadow-sm"
                                                    type="button"
                                                >
                                                    Analytics
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteTargetTemplate(t);
                                                    }}
                                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer border border-rose-200/60 shadow-sm flex items-center gap-1"
                                                    type="button"
                                                    title="Permanently Delete Template"
                                                >
                                                    <TrashIcon size={12} />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                        <span className="text-xs font-bold text-slate-400">
                            Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalTemplates)} of {totalTemplates} templates
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="px-3.5 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                            >
                                <ArrowLeftIcon size={12} /> Prev
                            </button>
                            <span className="text-xs font-bold text-slate-600 px-2 font-mono">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-3.5 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                            >
                                Next <ArrowRightIcon size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Permanent Template Delete Confirmation Modal */}
            {deleteTargetTemplate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-sans" onClick={() => !isDeletingTemplate && setDeleteTargetTemplate(null)}>
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-modal border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
                                ⚠️
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Permanent Template Deletion</h3>
                                <p className="text-xs text-rose-600 font-black uppercase tracking-widest mt-1">Warning: Irreversible Action</p>
                            </div>
                            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2">
                                <p className="font-bold">
                                    Are you sure you want to permanently delete template <span className="font-black text-rose-700 font-mono">"{deleteTargetTemplate.template_name}"</span> (ID: {deleteTargetTemplate.template_id})?
                                </p>
                                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                                    <li>The template blueprint and configuration will be deleted permanently.</li>
                                    <li>If any generated documents exist referencing this template, deletion will be safely prevented.</li>
                                    <li>This action <span className="font-black text-rose-600">CANNOT BE UNDONE</span>.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
                            <button
                                disabled={isDeletingTemplate}
                                onClick={() => setDeleteTargetTemplate(null)}
                                className="px-5 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isDeletingTemplate}
                                onClick={handlePermanentDelete}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeletingTemplate ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon size={14} />
                                        <span>Delete Permanently</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Analytics Detail Modal */}
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
export default TemplateHealth;
