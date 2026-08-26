
const AdminWalletPanel = ({ token, refreshTrigger }) => {
    const [wallets, setWallets] = React.useState([]);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalWallets, setTotalWallets] = React.useState(0);
    const [hasNext, setHasNext] = React.useState(false);
    const [hasPrevious, setHasPrevious] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [isPaginating, setIsPaginating] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeSearch, setActiveSearch] = React.useState('');
    const [adjustingWallet, setAdjustingWallet] = React.useState(null); // { user_id, username, current_balance }
    const [adjustForm, setAdjustForm] = React.useState({ credits: '', type: 'CREDIT', remarks: 'Manual adjustment' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [isMigrating, setIsMigrating] = React.useState(false);

    const handleInitializeWallets = async () => {
        const confirm = window.confirm("Are you sure you want to initialize wallets for all existing users? Users who already have wallets will not be modified.");
        if (!confirm) return;
        
        setIsMigrating(true);
        try {
            const res = await window.apiFetch('/api/admin/wallets/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Wallet initialization complete!\n\nTotal Scanned: ${data.scanned}\nWallets Created: ${data.created}\nSkipped: ${data.skipped}\nErrors: ${data.errors}`);
                fetchWallets(1);
            } else {
                alert(`Migration failed: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            alert(`Migration failed: ${err.message || 'Connection error'}`);
        } finally {
            setIsMigrating(false);
        }
    };

    const fetchWallets = React.useCallback(async (targetPage = 1, isBackground = false) => {
        if (isBackground) {
            setIsPaginating(true);
        } else {
            setLoading(true);
        }
        try {
            const queryParams = new URLSearchParams({
                page: String(targetPage),
                page_size: '20'
            });
            if (activeSearch.trim()) {
                queryParams.set('search', activeSearch.trim());
            }
            const url = `/api/admin/wallets?${queryParams.toString()}`;
            
            const res = await window.apiFetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setWallets(data);
                    setTotalWallets(data.length);
                    setTotalPages(1);
                    setPage(1);
                    setHasNext(false);
                    setHasPrevious(false);
                } else {
                    setWallets(data.items || []);
                    setPage(data.page || targetPage);
                    setTotalPages(data.total_pages || 1);
                    setTotalWallets(data.total || 0);
                    setHasNext(Boolean(data.has_next));
                    setHasPrevious(Boolean(data.has_previous));
                }
            }
        } catch (err) {
            console.error("Error fetching wallets in admin:", err);
        } finally {
            setLoading(false);
            setIsPaginating(false);
        }
    }, [token, activeSearch]);

    React.useEffect(() => {
        fetchWallets(1);
    }, [fetchWallets, refreshTrigger]);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        setActiveSearch(searchQuery.trim());
    };

    const handleAdjustSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!adjustForm.credits || parseInt(adjustForm.credits) <= 0) {
            setErrorMessage('Please enter a valid credit amount greater than 0.');
            return;
        }
        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const res = await window.apiFetch('/api/admin/wallets/recharge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: adjustingWallet.user_id,
                    credits: parseInt(adjustForm.credits),
                    type: adjustForm.type,
                    remarks: adjustForm.remarks.trim()
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Successfully adjusted balance! New Balance: ${data.current_balance}`);
                setAdjustingWallet(null);
                setAdjustForm({ credits: '', type: 'CREDIT', remarks: 'Manual adjustment' });
                fetchWallets(page);
            } else {
                setErrorMessage(data.detail || 'Adjustment failed.');
            }
        } catch (err) {
            const msg = err.message === 'SERVER_OFFLINE' 
                ? 'Network or server connection failed.' 
                : (err.message || 'Adjustment failed.');
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            
            {/* Top Bar with Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex-shrink-0">
                <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Wallet Balance Manager</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                        Audit user wallets and process manual credit adjustments. 
                        {totalWallets > 0 && <span className="text-slate-500 font-black ml-1.5">• કુલ યુઝર્સ: {totalWallets}</span>}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleInitializeWallets}
                        disabled={isMigrating}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                        type="button"
                    >
                        {isMigrating ? 'Initializing...' : 'Initialize Existing User Wallets'}
                    </button>

                    <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
                        <input 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search username or mobile..."
                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 w-full sm:w-64"
                        />
                        <button 
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition"
                        >
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* Wallets List Grid */}
            <div className="flex-1 overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col relative">
                {loading ? (
                    <div className="text-center text-slate-400 py-24 text-sm font-bold animate-pulse">Loading wallet balance listings...</div>
                ) : wallets.length === 0 ? (
                    <div className="text-center py-24 text-slate-400 space-y-2">
                        <div className="text-4xl">👥</div>
                        <p className="text-xs font-semibold">No wallets found matching search criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto custom-scrollbar flex-1 relative">
                        {isPaginating && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                                <span className="text-xs font-bold text-blue-700 animate-pulse flex items-center gap-1.5 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                    <span>⏳</span>
                                    <span>લોડ થઈ રહ્યું છે...</span>
                                </span>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-50 border-b border-slate-100 text-slate-400 z-10">
                                <tr>
                                    <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-wider">User ID</th>
                                    <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-wider">Username</th>
                                    <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-wider">Mobile Number</th>
                                    <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-wider">Wallet Balance</th>
                                    <th className="py-3.5 px-6 text-[10px] font-black uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {wallets.map(w => (
                                    <tr key={w.user_id} className="hover:bg-slate-50/50 transition">
                                        <td className="py-4 px-6 text-xs text-slate-400 font-mono font-bold">
                                            #{w.user_id}
                                        </td>
                                        <td className="py-4 px-6 text-xs font-bold text-slate-800">
                                            {w.username}
                                        </td>
                                        <td className="py-4 px-6 text-xs font-bold text-slate-500">
                                            {w.mobile_number || '—'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-mono">
                                                {w.current_balance} Credits
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button 
                                                onClick={() => setAdjustingWallet(w)}
                                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black uppercase tracking-wider px-3.5 py-2 rounded-xl transition border-0 cursor-pointer shadow-sm"
                                                type="button"
                                            >
                                                ⚙️ Adjust Credits
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls Bar */}
                {!loading && totalPages > 1 && (
                    <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs flex-shrink-0">
                        <div className="text-slate-500 font-bold">
                            પેજ <span className="font-black text-slate-800">{page}</span> / <span className="font-black text-slate-800">{totalPages}</span>
                            <span className="text-slate-400 font-normal ml-3">• કુલ યુઝર્સ: {totalWallets}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                id="btn-admin-wallet-prev"
                                type="button"
                                disabled={!hasPrevious || page <= 1 || isPaginating}
                                onClick={() => fetchWallets(page - 1, true)}
                                className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border text-xs ${
                                    !hasPrevious || page <= 1 || isPaginating
                                        ? 'bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed shadow-none'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm'
                                }`}
                            >
                                <span>←</span>
                                <span>પાછળ</span>
                            </button>
                            <button
                                id="btn-admin-wallet-next"
                                type="button"
                                disabled={!hasNext || page >= totalPages || isPaginating}
                                onClick={() => fetchWallets(page + 1, true)}
                                className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border text-xs ${
                                    !hasNext || page >= totalPages || isPaginating
                                        ? 'bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed shadow-none'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm'
                                }`}
                            >
                                <span>આગળ</span>
                                <span>→</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Adjust Balance Modal */}
            {adjustingWallet && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
                    <form onSubmit={handleAdjustSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-modal">
                        
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                                Adjust Credits for {adjustingWallet.username}
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setAdjustingWallet(null)} 
                                className="text-slate-400 hover:text-slate-700 text-xl leading-none bg-transparent border-0 cursor-pointer"
                            >&times;</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {errorMessage && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-pulse">
                                    ❌ {errorMessage}
                                </div>
                            )}

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Adjustment Type</label>
                                <select 
                                    value={adjustForm.type}
                                    onChange={e => setAdjustForm(p => ({ ...p, type: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 bg-white"
                                >
                                    <option value="CREDIT">CREDIT (+ Add Balance)</option>
                                    <option value="DEBIT">DEBIT (- Deduct Balance)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (Credits)</label>
                                <input 
                                    type="number"
                                    required
                                    min="1"
                                    value={adjustForm.credits}
                                    onChange={e => setAdjustForm(p => ({ ...p, credits: e.target.value }))}
                                    placeholder="e.g. 50"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Remarks / Reason</label>
                                <input 
                                    type="text"
                                    value={adjustForm.remarks}
                                    onChange={e => setAdjustForm(p => ({ ...p, remarks: e.target.value }))}
                                    placeholder="Reason for change..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button 
                                type="button"
                                onClick={() => setAdjustingWallet(null)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-white transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Processing...' : 'Apply Adjust'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

window.AdminWalletPanel = AdminWalletPanel;
