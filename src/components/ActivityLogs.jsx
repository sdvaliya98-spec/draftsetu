import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from './Icons.jsx';

const ActivityLogs = ({ refreshTrigger }) => {
    const [logs, setLogs] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);

    const [search, setSearch] = React.useState('');
    const [action, setAction] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Debounce search reference
    const searchRef = React.useRef(null);

    const loadLogs = React.useCallback(async (searchVal, actionVal, pageVal, sizeVal) => {
        setLoading(true);
        setError(null);
        const currentSize = sizeVal || pageSize;
        try {
            const params = new URLSearchParams({
                search: searchVal || '',
                action: actionVal || '',
                page: pageVal || 1,
                page_size: currentSize
            });
            const res = await window.apiFetch(`/api/admin/activity-logs?${params}`);
            const data = await res.json();
            
            setLogs(data.logs || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
            setPage(data.page || 1);
        } catch (err) {
            setError(err.message || 'Failed to load activity logs');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    // Initial load & refresh trigger watch
    React.useEffect(() => {
        loadLogs(search, action, page, pageSize);
    }, [refreshTrigger]);

    // Debounced search on username change
    React.useEffect(() => {
        if (searchRef.current) clearTimeout(searchRef.current);
        searchRef.current = setTimeout(() => {
            loadLogs(search, action, 1, pageSize);
        }, 350);
        return () => clearTimeout(searchRef.current);
    }, [search, pageSize]);

    const handleActionChange = (newAction) => {
        setAction(newAction);
        loadLogs(search, newAction, 1, pageSize);
    };

    const handlePageSizeChange = (newSize) => {
        const sizeNum = parseInt(newSize, 10) || 20;
        setPageSize(sizeNum);
        loadLogs(search, action, 1, sizeNum);
    };

    const handlePage = (newPage) => {
        if (newPage < 1 || newPage > totalPages || newPage === page) return;
        loadLogs(search, action, newPage, pageSize);
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        if (page <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (page >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
        }
        return pages;
    };

    // Format action badges
    const renderActionBadge = (act) => {
        let classes = "bg-slate-100 text-slate-600 border border-slate-200";
        if (act === "Login Success") {
            classes = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        } else if (act === "Logout") {
            classes = "bg-slate-100 text-slate-500 border border-slate-200";
        } else if (act === "Draft Saved") {
            classes = "bg-amber-50 text-amber-700 border border-amber-200";
        } else if (act === "Document Generated") {
            classes = "bg-indigo-50 text-indigo-700 border border-indigo-200";
        } else if (act === "PDF Downloaded") {
            classes = "bg-rose-50 text-rose-700 border border-rose-200";
        } else if (act === "DOCX Downloaded") {
            classes = "bg-sky-50 text-sky-700 border border-sky-200";
        } else if (act === "Template Archived") {
            classes = "bg-amber-50 text-amber-700 border border-amber-200";
        } else if (act === "Template Restored") {
            classes = "bg-emerald-50 text-emerald-700 border border-emerald-200";
        }

        return (
            <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${classes}`}>
                {act}
            </span>
        );
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-modal">
            {/* Header */}
            <div className="flex items-end justify-between px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Audit Logs</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Read-only · {total} system events recorded</p>
                </div>
                <button
                    onClick={() => loadLogs(search, action, page, pageSize)}
                    className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                >
                    🔄 REFRESH
                </button>
            </div>

            {/* Controls: Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3 px-1">
                {/* Search Username */}
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm pointer-events-none">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by username…"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-lg leading-none"
                        >&times;</button>
                    )}
                </div>

                {/* Filter Action */}
                <div className="w-full sm:w-64">
                    <select
                        value={action}
                        onChange={e => handleActionChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBCCD4%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1.25rem_center] bg-no-repeat"
                    >
                        <option value="">All Actions (બધી પ્રવૃત્તિ)</option>
                        <option value="Login Success">Login Success (સફળ લોગિન)</option>
                        <option value="Logout">Logout (લોગઆઉટ)</option>
                        <option value="Draft Saved">Draft Saved (ડ્રાફ્ટ સેવ)</option>
                        <option value="Document Generated">Document Generated (દસ્તાવેજ બનેલ)</option>
                        <option value="PDF Downloaded">PDF Downloaded (પીડીએફ ડાઉનલોડ)</option>
                        <option value="DOCX Downloaded">DOCX Downloaded (docx ડાઉનલોડ)</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Audit Logs…</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-16 px-6">
                        <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-6 max-w-md w-full flex gap-4 items-start shadow-sm">
                            <span className="text-3xl">⚠️</span>
                            <div>
                                <h4 className="font-black text-rose-800 text-sm mb-1">Error Loading Logs</h4>
                                <p className="text-xs text-rose-600 font-semibold leading-relaxed mb-4">{error}</p>
                                <button onClick={() => loadLogs(search, action, page, pageSize)} className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-md transition-all active:scale-95">Retry</button>
                            </div>
                        </div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-300 grayscale opacity-50">
                        <div className="text-8xl mb-6">📄</div>
                        <p className="font-black uppercase tracking-widest text-sm text-center">
                            {search || action ? 'No matching logs found' : 'No logs recorded yet'}
                        </p>
                    </div>
                ) : (
                    <div className="premium-card bg-white border border-slate-200/60 overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[165px_150px_170px_110px_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time (IST)</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Type</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity ID</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-slate-50">
                            {logs.map((log, idx) => (
                                <div
                                    key={log.id}
                                    className="grid grid-cols-[165px_150px_170px_110px_1fr] gap-4 px-6 py-3.5 items-center hover:bg-slate-50/60 transition-colors group animate-modal"
                                    style={{ animationDelay: `${idx * 0.025}s` }}
                                >
                                    {/* Time */}
                                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                                        {window.formatIndiaDateTime ? window.formatIndiaDateTime(log.timestamp) : log.timestamp}
                                    </span>

                                    {/* User */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                                            {log.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-xs text-slate-700 truncate">{log.username}</span>
                                    </div>

                                    {/* Action */}
                                    <div>
                                        {renderActionBadge(log.action)}
                                    </div>

                                    {/* Entity Type */}
                                    <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${log.entity_type ? 'text-slate-500' : 'text-slate-300'}`}>
                                        {log.entity_type || '—'}
                                    </span>

                                    {/* Entity ID */}
                                    <span className={`text-xs font-mono truncate ${log.entity_id ? 'text-slate-600 font-bold' : 'text-slate-300'}`}>
                                        {log.entity_id || '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && !error && total > 0 && (
                <div className="bg-slate-50 px-5 py-3 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl shadow-xs flex-shrink-0">
                    {/* Left: Info Label & Page Size Selector */}
                    <div className="flex items-center gap-3.5 flex-wrap">
                        <div className="text-xs font-bold text-slate-500">
                            Showing <span className="font-black text-slate-800">{(page - 1) * pageSize + 1}</span>–<span className="font-black text-slate-800">{Math.min(page * pageSize, total)}</span> of <span className="font-black text-slate-800">{total}</span>
                        </div>
                        <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span>Per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => handlePageSizeChange(e.target.value)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Page Navigation Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <ArrowLeftIcon size={12} />
                            <span>Prev</span>
                        </button>

                        {getPageNumbers().map((p, idx) => {
                            if (p === '...') {
                                return (
                                    <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-black text-slate-400">
                                        ...
                                    </span>
                                );
                            }
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePage(p)}
                                    className={`w-8 h-8 text-xs font-black rounded-xl transition-all flex items-center justify-center ${
                                        p === page
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <span>Next</span>
                            <ArrowRightIcon size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Register globally
window.ActivityLogs = ActivityLogs;
export default ActivityLogs;
