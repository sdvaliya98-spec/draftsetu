import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const AdminDocumentPreviewModal = ({ previewDoc, onClose }) => {
    if (!previewDoc) return null;

    const getDocPreviewFields = (doc) => {
        try {
            const data = JSON.parse(doc.data_json || '{}');
            return Object.entries(data)
                .filter(([k]) => !['is_final', 'template_id', 'template_name'].includes(k))
                .slice(0, 30);
        } catch { return []; }
    };

    const formatDateTime = (iso) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-modal" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-blue-600">{previewDoc.tracking_id}</span>
                            {previewDoc.is_locked
                                ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Finalized</span>
                                : <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">Draft</span>
                            }
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                            Owner: <span className="font-bold text-slate-700">{previewDoc.username}</span>
                            &nbsp;·&nbsp; Created: {formatDateTime(previewDoc.created_at)}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 text-2xl bg-transparent border-0 cursor-pointer" type="button">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {(() => {
                        const fields = getDocPreviewFields(previewDoc);
                        if (fields.length === 0) return <p className="text-gray-400 text-sm">No data available</p>;
                        return (
                            <table className="w-full text-sm">
                                <tbody>
                                    {fields.map(([k, v]) => (
                                        <tr key={k} className="border-b border-gray-50">
                                            <td className="py-2 pr-4 font-semibold text-gray-500 capitalize w-1/3">{k.replace(/_/g, ' ')}</td>
                                            <td className="py-2 text-gray-800 font-medium">
                                                {Array.isArray(v) ? `[${v.length} items]` : String(v || '—')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

const AdminUserDetailModal = ({ userDetailDoc, onClose }) => {
    const [userDetail, setUserDetail] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        if (!userDetailDoc || !userDetailDoc.user_id) {
            setUserDetail(null);
            return;
        }
        const fetchUser = async () => {
            setLoading(true);
            setError(null);
            setUserDetail(null);
            try {
                const res = await window.apiFetch(`/api/admin/user-details/${userDetailDoc.user_id}`);
                if (!res.ok) throw new Error('Failed to load user details');
                const data = await res.json();
                setUserDetail(data);
            } catch (err) {
                setError(err.message === 'SERVER_OFFLINE' ? 'Server is offline.' : err.message || 'Failed to load user details');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [userDetailDoc]);

    if (!userDetailDoc) return null;

    const formatDateTime = (iso) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 font-sans" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-modal" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center text-lg font-black">
                            {(userDetailDoc.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="font-black text-slate-800 text-sm">{userDetailDoc.username}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">User Profile</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 text-2xl bg-transparent border-0 cursor-pointer" type="button">&times;</button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                    {loading && (
                        <div className="flex items-center justify-center py-10 text-slate-400">
                            <div className="w-7 h-7 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin mr-3"></div>
                            Loading profile...
                        </div>
                    )}
                    {error && (
                        <div className="text-rose-500 text-sm font-semibold text-center py-6">{error}</div>
                    )}
                    {userDetail && !loading && (
                        <>
                            {/* Profile Fields */}
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Profile</p>
                                {[
                                    { label: 'Username', value: userDetail.username },
                                    { label: 'Mobile Number', value: userDetail.mobile_number || '—' },
                                    { label: 'Birth Date', value: userDetail.birth_date || '—' },
                                    { label: 'Role', value: userDetail.role },
                                    { label: 'Status', value: userDetail.is_active ? '✅ Active' : '🔴 Disabled' },
                                    { label: 'Member Since', value: formatDateTime(userDetail.created_at) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                                        <span className="text-xs font-bold text-slate-500">{label}</span>
                                        <span className="text-xs font-black text-slate-800">{value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Document Statistics */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Document Statistics</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-black text-slate-800">{userDetail.stats.total}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</div>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-black text-amber-700">{userDetail.stats.drafts}</div>
                                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Drafts</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-black text-emerald-700">{userDetail.stats.finalized}</div>
                                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Finalized</div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-300 text-center italic">Read-only view · Admin access only</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminSharedModals = {
    AdminDocumentPreviewModal,
    AdminUserDetailModal
};

window.AdminDocumentPreviewModal = AdminDocumentPreviewModal;
window.AdminUserDetailModal = AdminUserDetailModal;
window.AdminSharedModals = AdminSharedModals;

export { AdminDocumentPreviewModal, AdminUserDetailModal };
export default AdminSharedModals;

