const ensureRazorpayLoaded = () => {
    if (window.Razorpay) return Promise.resolve(true);
    if (window._razorpayLoadingPromise) return window._razorpayLoadingPromise;
    window._razorpayLoadingPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => {
            console.error("Failed to load Razorpay SDK dynamically.");
            resolve(false);
        };
        document.body.appendChild(script);
    });
    return window._razorpayLoadingPromise;
};

const WalletDashboard = ({ onClose, token, userCredits, refreshCredits }) => {
    const [transactions, setTransactions] = React.useState([]);
    const [page, setPage] = React.useState(1);
    const [totalPages, setTotalPages] = React.useState(1);
    const [totalTransactions, setTotalTransactions] = React.useState(0);
    const [hasNext, setHasNext] = React.useState(false);
    const [hasPrevious, setHasPrevious] = React.useState(false);
    const [txLoading, setTxLoading] = React.useState(false);
    const [customCredits, setCustomCredits] = React.useState(250);
    const [razorpayKeyId, setRazorpayKeyId] = React.useState('');
    const [loading, setLoading] = React.useState(true);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [alertState, setAlertState] = React.useState(null);
    const [publicConfig, setPublicConfig] = React.useState({
        support_whatsapp: '919999999999',
        support_upi: 'legalsetu@upi',
        wallet_enabled: true
    });

    React.useEffect(() => {
        ensureRazorpayLoaded();
    }, []);

    const parsedCredits = parseInt(customCredits, 10);
    const isValidCredits = !isNaN(parsedCredits) && Number.isInteger(parsedCredits) && parsedCredits >= 50 && String(customCredits).indexOf('.') === -1;
    const payableAmount = isValidCredits ? parsedCredits : 0;

    const fetchTransactions = React.useCallback(async (targetPage = 1) => {
        setTxLoading(true);
        try {
            const txRes = await window.apiFetch(`/api/wallet/transactions?page=${targetPage}&page_size=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (txRes.ok) {
                const txData = await txRes.json();
                if (Array.isArray(txData)) {
                    setTransactions(txData);
                    setPage(1);
                    setTotalPages(1);
                    setTotalTransactions(txData.length);
                    setHasNext(false);
                    setHasPrevious(false);
                } else {
                    setTransactions(txData.items || []);
                    setPage(txData.page || targetPage);
                    setTotalPages(txData.total_pages || 1);
                    setTotalTransactions(txData.total || 0);
                    setHasNext(Boolean(txData.has_next));
                    setHasPrevious(Boolean(txData.has_previous));
                }
            }
        } catch (err) {
            console.error("Error fetching wallet transactions:", err);
        } finally {
            setTxLoading(false);
        }
    }, [token]);

    React.useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // 1. Fetch paginated transactions (page 1)
                await fetchTransactions(1);

                // 2. Fetch config and public Razorpay Key ID
                const plansRes = await window.apiFetch('/api/wallet/plans', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (plansRes.ok) {
                    const plansData = await plansRes.json();
                    setRazorpayKeyId(plansData.razorpay_key_id || '');
                    if (plansData.support_whatsapp || plansData.support_upi) {
                        setPublicConfig({
                            support_whatsapp: plansData.support_whatsapp || '919999999999',
                            support_upi: plansData.support_upi || 'legalsetu@upi',
                            wallet_enabled: plansData.wallet_enabled ?? true
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading wallet initial data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [token, fetchTransactions]);

    const handleCustomRecharge = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        if (!isValidCredits) {
            setAlertState({
                type: 'error',
                message: 'કૃપા કરીને માન્ય ક્રેડિટ્સ દાખલ કરો (ઓછામાં ઓછા 50 ક્રેડિટ્સ જરૂરી છે).'
            });
            return;
        }

        setIsProcessing(true);
        setAlertState(null);

        try {
            // 1. Create order on backend
            const orderRes = await window.apiFetch('/api/wallet/create-order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ credits: parsedCredits })
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to create payment order.");
            }

            const orderData = await orderRes.json();

            // 2. Ensure Razorpay script is available in browser
            await ensureRazorpayLoaded();
            if (!window.Razorpay) {
                throw new Error("Razorpay Checkout SDK લોડ થઈ શક્યું નથી. કૃપા કરીને પેજ રીફ્રેશ કરો.");
            }

            // Format prefill contact cleanly (ensure numeric digits)
            let formattedContact = "";
            if (orderData.user_mobile) {
                const rawDigits = String(orderData.user_mobile).replace(/\D/g, '');
                if (rawDigits.length >= 10) {
                    formattedContact = rawDigits.slice(-10);
                }
            }

            // Construct safe prefill email if not provided
            const safeEmail = orderData.user_email || (orderData.user_name 
                ? `${orderData.user_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com` 
                : "user@example.com");

            console.log("[Razorpay Checkout] Opening Checkout modal for Custom Order:", orderData.order_id, {
                credits: orderData.credits,
                amount_in_paise: orderData.amount,
                currency: orderData.currency || "INR",
                key_id: orderData.key_id || razorpayKeyId
            });

            // 3. Configure standard Razorpay Checkout options
            const options = {
                key: orderData.key_id || razorpayKeyId,
                amount: orderData.amount,
                currency: orderData.currency || "INR",
                name: "DraftSetu",
                description: `${orderData.credits} ક્રેડિટ્સ રિચાર્જ (₹${orderData.credits})`,
                order_id: orderData.order_id,
                prefill: {
                    name: orderData.user_name || "Customer",
                    contact: formattedContact || undefined,
                    email: safeEmail
                },
                theme: {
                    color: "#1e3a8a"
                },
                retry: {
                    enabled: true,
                    max_count: 3
                },
                handler: async function (response) {
                    try {
                        setIsProcessing(true);
                        console.log("[Razorpay Checkout] Payment successful on client. Verifying signature on server...", {
                            order_id: response.razorpay_order_id,
                            payment_id: response.razorpay_payment_id
                        });

                        // 4. Secure server-side signature verification & atomic credit addition
                        const verifyRes = await window.apiFetch('/api/wallet/verify-payment', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            }
                        });

                        if (!verifyRes.ok) {
                            const vErr = await verifyRes.json().catch(() => ({}));
                            throw new Error(vErr.detail || "Payment verification failed.");
                        }

                        const verifyData = await verifyRes.json();
                        setAlertState({
                            type: 'success',
                            message: verifyData.message || `સફળતાપૂર્વક ${orderData.credits} ક્રેડિટ્સ તમારા ખાતામાં ઉમેરાઈ ગઈ છે!`
                        });

                        // 5. Refresh wallet balance and transactions automatically
                        await fetchWalletData();
                        if (refreshCredits) refreshCredits();

                    } catch (vErr) {
                        console.error("[Razorpay Checkout] Verification error:", vErr);
                        setAlertState({
                            type: 'error',
                            message: "ચુકવણી ચકાસણીમાં ભૂલ આવી: " + (vErr.message || "Unknown error")
                        });
                    } finally {
                        setIsProcessing(false);
                    }
                },
                modal: {
                    backdropclose: false,
                    escape: true,
                    handleback: true,
                    ondismiss: function() {
                        console.log("[Razorpay Checkout] User closed/dismissed Checkout modal.");
                        window.apiFetch('/api/wallet/payment-failed', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: {
                                razorpay_order_id: orderData.order_id,
                                error_code: "USER_DISMISSED",
                                error_description: "User closed Razorpay modal before completing payment."
                            }
                        }).catch(() => {});
                        setIsProcessing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (resp) {
                const err = resp?.error || {};
                console.error("[Razorpay Checkout] Payment failed event received:", {
                    code: err.code,
                    description: err.description,
                    source: err.source,
                    step: err.step,
                    reason: err.reason
                });

                window.apiFetch('/api/wallet/payment-failed', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: {
                        razorpay_order_id: orderData.order_id,
                        error_code: err.code || "PAYMENT_FAILED",
                        error_description: err.description || "Payment failed at gateway."
                    }
                }).catch(() => {});

                setAlertState({
                    type: 'error',
                    message: "પેમેન્ટ નિષ્ફળ ગયું: " + (err.description || "Payment unsuccessful. Please try again.")
                });
                setIsProcessing(false);
            });

            rzp.open();

        } catch (err) {
            console.error("[Razorpay Checkout] Order initiation error:", err);
            setAlertState({
                type: 'error',
                message: "ઓર્ડર બનાવવામાં સમસ્યા આવી: " + (err.message || "Network error")
            });
            setIsProcessing(false);
        }
    };

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
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-modal border border-slate-100">
                
                {/* Modal Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🪙</span>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                ક્રેડિટ વોલેટ અને હિસાબ (Credits Wallet & History)
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Razorpay દ્વારા સુરક્ષિત અને ત્વરિત ક્રેડિટ રિચાર્જ (Instant & Secure Payment via Razorpay)
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 text-3xl leading-none bg-transparent border-0 cursor-pointer transition-all p-1"
                        type="button"
                    >&times;</button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 space-y-8 custom-scrollbar">
                    
                    {/* Alert / Notification Banner */}
                    {alertState && (
                        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold animate-fade-in ${
                            alertState.type === 'success' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' 
                                : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-2">
                                <span>{alertState.type === 'success' ? '✅' : '⚠️'}</span>
                                <span>{alertState.message}</span>
                            </div>
                            <button 
                                onClick={() => setAlertState(null)} 
                                className="text-xs opacity-60 hover:opacity-100 bg-transparent border-0 cursor-pointer font-black"
                            >
                                &times;
                            </button>
                        </div>
                    )}

                    {/* Top Balance & Payment Highlights Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Current Balance Card */}
                        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 text-[100px] opacity-10 select-none pointer-events-none">🪙</div>
                            <div className="space-y-3 relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full text-blue-100 inline-block">
                                    Current Balance
                                </span>
                                <div className="text-4xl font-black tracking-tight flex items-baseline gap-2">
                                    {userCredits !== null ? userCredits : '...'}
                                    <span className="text-sm font-bold text-blue-200">Credits</span>
                                </div>
                                <p className="text-xs text-blue-100/80 leading-relaxed">
                                    દસ્તાવેજોને ફાઇનલ લોક કરવા અને ડાઉનલોડ કરવા માટે વપરાય છે.
                                </p>
                            </div>
                        </div>

                        {/* Instant Payment Support Banner */}
                        <div className="md:col-span-2 bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                                    <span>⚡</span>
                                    <span>ઇન્સ્ટન્ટ ઓટોમેટિક ક્રેડિટ (Instant Automatic Credits)</span>
                                </div>
                                <h3 className="text-base font-black text-slate-800">
                                    Razorpay દ્વારા UPI, GPay, PhonePe, Paytm, કાર્ડ્સ અને નેટબેન્કિંગ સપોર્ટેડ છે
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    કોઈપણ પ્લાન પસંદ કરો અને પેમેન્ટ પૂર્ણ થતાં જ તમારા ખાતામાં ક્રેડિટ્સ આપમેળે જમા થઈ જશે. કોઈ સ્ક્રીનશોટ મોકલવાની જરૂર નથી.
                                </p>
                            </div>

                            <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-slate-100">
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">UPI / QR Code</span>
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">Google Pay</span>
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">PhonePe / Paytm</span>
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">Debit & Credit Cards</span>
                                <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">Net Banking</span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Credit Recharge Section */}
                    <div className="bg-white rounded-[28px] border border-slate-200/80 p-8 shadow-sm space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>💳</span>
                                    <span>કેટલા ક્રેડિટ્સ ઉમેરવા છે?</span>
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    તમારી જરૂરિયાત મુજબ કોઈપણ ક્રેડિટ રકમ ઉમેરો (1 ક્રેડિટ = ₹1) • <span className="text-blue-600 font-bold">ઓછામાં ઓછા 50 ક્રેડિટ્સ</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-2xl text-xs font-black w-fit">
                                <span>⚖️</span>
                                <span>1 Credit = ₹1 INR</span>
                            </div>
                        </div>

                        <form onSubmit={handleCustomRecharge} className="space-y-6">
                            {/* Preset Selection Chips */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                    ઝડપી પસંદગી (Quick Select):
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                    {[50, 100, 250, 500, 1000].map((preset) => {
                                        const isSelected = parsedCredits === preset;
                                        return (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setCustomCredits(preset)}
                                                className={`py-3 px-4 rounded-2xl font-black text-sm transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                                                    isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                <span className="text-base font-black">{preset}</span>
                                                <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                    ₹{preset}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Credit Input and Realtime Summary Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                {/* Input Box */}
                                <div className="space-y-2">
                                    <label htmlFor="custom-credits-input" className="text-xs font-black text-slate-700 flex items-center justify-between">
                                        <span>ક્રેડિટ્સ દાખલ કરો</span>
                                        <span className="text-[11px] font-bold text-slate-400">ઓછામાં ઓછા 50 ક્રેડિટ્સ</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-lg">
                                            🪙
                                        </div>
                                        <input
                                            id="custom-credits-input"
                                            type="number"
                                            min="50"
                                            step="1"
                                            value={customCredits}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomCredits(val);
                                            }}
                                            placeholder="ક્રેડિટ્સ દાખલ કરો"
                                            className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-2xl text-lg font-black text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                                                customCredits !== '' && !isValidCredits
                                                    ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
                                                    : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                            }`}
                                        />
                                    </div>
                                    
                                    {/* Validation Warning */}
                                    {customCredits !== '' && !isValidCredits && (
                                        <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5 pt-1 animate-fade-in" id="credits-error-msg">
                                            <span>⚠️</span>
                                            <span>ઓછામાં ઓછા 50 ક્રેડિટ્સ ઉમેરવા જરૂરી છે.</span>
                                        </p>
                                    )}
                                </div>

                                {/* Dynamic Calculation Summary Card */}
                                <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                                                પેમેન્ટ સારાંશ (Summary)
                                            </span>
                                            <div className="text-2xl font-black mt-1 text-white tracking-tight" id="payable-amount-display">
                                                ચુકવવાની રકમ: ₹{isValidCredits ? parsedCredits : (parsedCredits || 0)}
                                            </div>
                                        </div>
                                        <span className="text-2xl">⚡</span>
                                    </div>

                                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-200">
                                        <span className="flex items-center gap-1.5">
                                            <span className="text-emerald-400">✓</span>
                                            <span>{isValidCredits ? parsedCredits : 0} ક્રેડિટ્સ તમારા વોલેટમાં ઉમેરાશે</span>
                                        </span>
                                        <span className="text-[10px] text-blue-300/80 uppercase">No Expiry</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div>
                                <button
                                    id="btn-recharge-submit"
                                    type="submit"
                                    disabled={!isValidCredits || isProcessing}
                                    className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-0 shadow-lg ${
                                        !isValidCredits || isProcessing
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                            : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-blue-600/30'
                                    }`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="inline-block animate-spin">⏳</span>
                                            <span>પેમેન્ટ શરૂ થઈ રહ્યું છે...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>⚡</span>
                                            <span>
                                                {isValidCredits 
                                                    ? `₹${parsedCredits} ચૂકવો અને ${parsedCredits} ક્રેડિટ્સ મેળવો (Pay ₹${parsedCredits})`
                                                    : 'ક્રેડિટ્સ દાખલ કરો (ઓછામાં ઓછા 50)'}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Transaction History Section */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest pl-1">
                                ટ્રાન્ઝેક્શનનો ઇતિહાસ (Transaction History)
                            </h3>
                            <span className="text-xs text-slate-400 font-medium">
                                કુલ ટ્રાન્ઝેક્શન: {totalTransactions}
                            </span>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-[24px] overflow-hidden shadow-sm">
                            {loading ? (
                                <div className="text-center text-slate-400 py-16 text-sm font-bold animate-pulse">
                                    ટ્રાન્ઝેક્શન લોગ્સ લોડ થઈ રહ્યા છે...
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 space-y-2">
                                    <div className="text-3xl">📭</div>
                                    <p className="text-xs font-semibold">હજુ સુધી કોઈ ટ્રાન્ઝેક્શન થયેલ નથી.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto relative">
                                    {txLoading && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            <span className="text-xs font-bold text-blue-700 animate-pulse flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                                                <span>⏳</span>
                                                <span>લોડ થઈ રહ્યું છે...</span>
                                            </span>
                                        </div>
                                    )}
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400">
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Date & Time</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider text-center">Type</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Credits</th>
                                                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-wider">Balance</th>
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
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                                            tx.source === 'PAYMENT' 
                                                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                                                : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {tx.source}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-6 text-xs text-slate-600 font-medium max-w-[240px] truncate" title={tx.remarks}>
                                                        {tx.remarks || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <div className="text-slate-500 font-bold">
                                                પેજ <span className="font-black text-slate-800">{page}</span> / <span className="font-black text-slate-800">{totalPages}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    id="btn-prev-page"
                                                    type="button"
                                                    disabled={!hasPrevious || page <= 1 || txLoading}
                                                    onClick={() => fetchTransactions(page - 1)}
                                                    className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border text-xs ${
                                                        !hasPrevious || page <= 1 || txLoading
                                                            ? 'bg-slate-100 text-slate-300 border-slate-200/60 cursor-not-allowed shadow-none'
                                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95 shadow-sm'
                                                    }`}
                                                >
                                                    <span>←</span>
                                                    <span>પાછળ</span>
                                                </button>
                                                <button
                                                    id="btn-next-page"
                                                    type="button"
                                                    disabled={!hasNext || page >= totalPages || txLoading}
                                                    onClick={() => fetchTransactions(page + 1)}
                                                    className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border text-xs ${
                                                        !hasNext || page >= totalPages || txLoading
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
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>🔒 256-Bit SSL Encrypted Payment Gateway</span>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest cursor-pointer"
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
