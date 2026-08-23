
const WalletDashboard = ({ onClose, token, userCredits, refreshCredits }) => {
    const [transactions, setTransactions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [publicConfig, setPublicConfig] = React.useState({
        support_whatsapp: '919999999999',
        support_upi: 'legalsetu@upi',
        wallet_enabled: true
    });

    const fetchWalletData = React.useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch balance & config
            const balRes = await window.apiFetch('/api/wallet/balance', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (balRes.ok) {
                const balData = await balRes.json();
                setPublicConfig({
                    support_whatsapp: balData.support_whatsapp,
                    support_upi: balData.support_upi,
                    wallet_enabled: balData.wallet_enabled
                });
                if (refreshCredits) refreshCredits();
            }

            // 2. Fetch transaction history
            const txRes = await window.apiFetch('/api/wallet/transactions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (txRes.ok) {
                const txData = await txRes.json();
                setTransactions(txData);
            }
        } catch (err) {
            console.error("Error loading wallet details:", err);
        } finally {
            setLoading(false);
        }
    }, [token, refreshCredits]);

    React.useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    const formatTxDateTime = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return isoString;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-modal border border-slate-100">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🪙</span>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            ક્રેડિટ વોલેટ અને હિસાબ (Credits Wallet & History)
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 text-3xl leading-none bg-transparent border-0 cursor-pointer transition-all"
                        type="button"
                    >&times;</button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 space-y-6 custom-scrollbar">
                    
                    {/* Top Stats and Topup Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 text-[120px] opacity-10 select-none pointer-events-none">🪙</div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-blue-100">
                                    Current Balance
                                </span>
                                <div className="text-4xl font-black tracking-tight flex items-baseline gap-2">
                                    {userCredits !== null ? userCredits : '...'}
                                    <span className="text-sm font-bold text-blue-200">Credits</span>
                                </div>
                                <p className="text-xs text-blue-100/80 leading-relaxed">
                                    આ ક્રેડિટનો ઉપયોગ દસ્તાવેજોને ફાઇનલ લોક કરવા અને ડાઉનલોડ કરવા માટે થાય છે. 
                                    (These credits are used to lock and download your documents).
                                </p>
                            </div>
                        </div>

                        {/* Topup Info Card */}
                        <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    🔌 એકાઉન્ટ રિચાર્જ કરો (Recharge Account)
                                </h3>
                                <p className="text-xs text-slate-500 leading-normal">
                                    ક્રેડિટ્સ ખરીદવા માટે કૃપા કરીને નીચે આપેલા UPI પર પેમેન્ટ કરો અને વ્હોટ્સએપ પર ટ્રાન્ઝેક્શન સ્ક્રીનશોટ મોકલો.
                                    (To recharge, please pay to the UPI ID below and send screenshot to WhatsApp).
                                </p>
                                
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UPI ID</span>
                                        <span className="font-mono text-xs font-bold text-blue-600">{publicConfig.support_upi}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp Support</span>
                                        <span className="text-xs font-bold text-emerald-600">+{publicConfig.support_whatsapp}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <a 
                                    href={`https://wa.me/${publicConfig.support_whatsapp}?text=Hello,%20I%20want%20to%20recharge%20my%20credits%20wallet.`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-center py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 no-underline"
                                >
                                    💬 Support WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest pl-1">
                            ટ્રાન્ઝેક્શનનો ઇતિહાસ (Transaction History)
                        </h3>

                        <div className="bg-white border border-slate-200/80 rounded-[24px] overflow-hidden shadow-sm">
                            {loading ? (
                                <div className="text-center text-slate-400 py-16 text-sm font-bold animate-pulse">Loading transaction logs...</div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 space-y-2">
                                    <div className="text-3xl">📭</div>
                                    <p className="text-xs font-semibold">No transactions recorded yet.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400">
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Date & Time</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider text-center">Type</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Credits</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">New Balance</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Source</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {transactions.map(tx => (
                                                <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="py-3.5 px-6 whitespace-nowrap text-xs text-slate-500 font-semibold">
                                                        {formatTxDateTime(tx.created_at)}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-center">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                            tx.type === 'CREDIT' 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className={`py-3.5 px-6 text-xs font-black ${
                                                        tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.credits}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-xs text-slate-700 font-bold font-mono">
                                                        {tx.balance_after}
                                                    </td>
                                                    <td className="py-3.5 px-6">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                                            {tx.source}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-6 text-xs text-slate-600 font-medium max-w-[200px] truncate" title={tx.remarks}>
                                                        {tx.remarks || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end flex-shrink-0">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest"
                        type="button"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

window.WalletDashboard = WalletDashboard;
