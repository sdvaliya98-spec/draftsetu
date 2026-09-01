import React from 'react';

const AuthModal = ({ onClose, onLoginSuccess }) => {
    const [view, setView] = React.useState('login'); // 'login' | 'register' | 'forgot-step1' | 'forgot-step2'
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPw, setConfirmPw] = React.useState('');
    const [birthDate, setBirthDate] = React.useState('');
    const [mobileNumber, setMobileNumber] = React.useState('');
    
    // Forgot password states
    const [token, setToken] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPw, setConfirmNewPw] = React.useState('');
    
    const [error, setError] = React.useState('');

    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

    const handleGoogleSuccess = async (idToken) => {
        setError('');
        setIsGoogleLoading(true);
        try {
            const res = await window.apiFetch('/api/auth/google', {
                method: 'POST',
                body: { id_token: idToken }
            });
            const data = await res.json();
            onLoginSuccess(data.username, data.access_token, data.is_admin);
        } catch (err) {
            console.error('❌ [Google Auth Error]', err);
            setError(err.message || 'Google authentication failed.');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    // Expose mock for automated tests
    React.useEffect(() => {
        window.mockGoogleLogin = handleGoogleSuccess;
        return () => {
            delete window.mockGoogleLogin;
        };
    }, []);

    // Dynamically load Google GIS SDK only when login/register modal is active
    React.useEffect(() => {
        if (view !== 'login' && view !== 'register') return;

        let isMounted = true;
        const initGIS = () => {
            if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
            const clientId = window.GOOGLE_CLIENT_ID || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_CLIENT_ID : "") || "test-google-client-id.apps.googleusercontent.com";
            
            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => {
                        if (response && response.credential) {
                            handleGoogleSuccess(response.credential);
                        }
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });

                const btnContainer = document.getElementById("google-gis-btn-anchor");
                if (btnContainer && window.google.accounts.id.renderButton) {
                    btnContainer.innerHTML = "";
                    window.google.accounts.id.renderButton(btnContainer, {
                        theme: "outline",
                        size: "large",
                        type: "standard",
                        text: view === "register" ? "signup_with" : "signin_with",
                        shape: "rectangular",
                        logo_alignment: "left",
                        width: 340
                    });
                }
            } catch (e) {
                console.warn("GIS initialization notice:", e);
            }
        };

        if (window.google && window.google.accounts) {
            initGIS();
        } else {
            const scriptId = "google-gis-script";
            if (!document.getElementById(scriptId)) {
                const script = document.createElement("script");
                script.id = scriptId;
                script.src = "https://accounts.google.com/gsi/client";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    if (isMounted) initGIS();
                };
                document.body.appendChild(script);
            } else {
                const existing = document.getElementById(scriptId);
                existing.addEventListener("load", () => {
                    if (isMounted) initGIS();
                });
            }
        }

        return () => { isMounted = false; };
    }, [view]);

    const handleCustomGoogleClick = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
            try {
                window.google.accounts.id.prompt();
            } catch (err) {
                console.warn("GIS prompt:", err);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (view === 'login') {
            try {
                const res = await window.apiFetch('/api/login', {
                    method: 'POST',
                    body: { username: username.trim(), password }
                });
                const data = await res.json();
                onLoginSuccess(data.username, data.access_token, data.is_admin);
            } catch (err) {
                console.error('❌ [Login Error]', err);
                setError(err.message || 'Incorrect username or password.');
            }
        } else if (view === 'register') {
            if (username.trim().length < 3) return setError('Username must be at least 3 characters');
            if (password.length < 8) return setError('Password must be at least 8 characters long');
            if (!/[A-Z]/.test(password)) return setError('Password must contain at least one uppercase letter');
            if (!/[a-z]/.test(password)) return setError('Password must contain at least one lowercase letter');
            if (!/\d/.test(password)) return setError('Password must contain at least one number');
            if (password !== confirmPw) return setError('Passwords do not match');
            if (!birthDate) return setError('Date of Birth is required');
            if (!mobileNumber.trim()) return setError('Mobile Number is required');
            if (mobileNumber.trim().replace(/\D/g, '').length < 10) return setError('Mobile Number must be at least 10 digits');

            try {
                const res = await window.apiFetch('/api/register', {
                    method: 'POST',
                    body: {
                        username: username.trim(),
                        password,
                        birth_date: birthDate,
                        mobile_number: mobileNumber.trim()
                    }
                });
                const data = await res.json();
                onLoginSuccess(data.username, data.access_token, data.is_admin);
            } catch (err) {
                console.error('❌ [Register Error]', err);
                setError(err.message || 'Registration failed');
            }
        } else if (view === 'forgot-step1') {
            if (!username.trim()) return setError('Username is required');
            if (!birthDate) return setError('Date of Birth is required');
            if (!mobileNumber.trim()) return setError('Mobile Number is required');

            try {
                const res = await window.apiFetch('/api/forgot-password/verify', {
                    method: 'POST',
                    body: {
                        username: username.trim(),
                        birth_date: birthDate,
                        mobile_number: mobileNumber.trim()
                    }
                });
                const data = await res.json();
                setToken(data.token);
                setView('forgot-step2');
            } catch (err) {
                console.error('❌ [Forgot Step 1 Error]', err);
                setError(err.message || 'User details do not match.');
            }
        } else if (view === 'forgot-step2') {
            if (newPassword.length < 8) return setError('Password must be at least 8 characters long');
            if (!/[A-Z]/.test(newPassword)) return setError('Password must contain at least one uppercase letter');
            if (!/[a-z]/.test(newPassword)) return setError('Password must contain at least one lowercase letter');
            if (!/\d/.test(newPassword)) return setError('Password must contain at least one number');
            if (newPassword !== confirmNewPw) return setError('Passwords do not match');

            try {
                await window.apiFetch('/api/forgot-password/reset', {
                    method: 'POST',
                    body: {
                        token: token,
                        new_password: newPassword
                    }
                });
                alert('Password reset successfully! Please log in with your new password.');
                setView('login');
                setPassword('');
                setNewPassword('');
                setConfirmNewPw('');
            } catch (err) {
                console.error('❌ [Forgot Step 2 Error]', err);
                setError(err.message || 'Resetting password failed');
            }
        }
    };

    const handleSwitchToForgot = () => {
        setView('forgot-step1');
        setError('');
        setUsername('');
        setBirthDate('');
        setMobileNumber('');
    };

    const handleSwitchToRegister = () => {
        setView('register');
        setError('');
        setUsername('');
        setPassword('');
        setConfirmPw('');
        setBirthDate('');
        setMobileNumber('');
    };

    const handleSwitchToLogin = () => {
        setView('login');
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div id="auth-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div id="auth-modal-dialog" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in relative">
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white relative">
                    <button
                        id="btn-close-auth-modal"
                        onClick={onClose}
                        type="button"
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
                        title="Close"
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold pr-8">
                        {view === 'login' && '👋 Welcome Back'}
                        {view === 'register' && '🚀 Create Account'}
                        {view === 'forgot-step1' && '🔍 Verify Identity'}
                        {view === 'forgot-step2' && '🔒 Reset Password'}
                    </h2>
                    <p className="text-blue-200 text-sm mt-1">
                        {view === 'login' && 'Log in to access your documents & wallet'}
                        {view === 'register' && 'Join to save and manage documents with 100 free credits'}
                        {view === 'forgot-step1' && 'Enter details to verify and reset password'}
                        {view === 'forgot-step2' && 'Choose a strong new password'}
                    </p>
                </div>
                <div className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">{error}</div>}

                    {/* Google Authentication Section */}
                    {(view === 'login' || view === 'register') && (
                        <div className="mb-4">
                            <div id="google-gis-btn-anchor" className="flex justify-center mb-2"></div>
                            
                            <button
                                id="btn-google-login"
                                type="button"
                                onClick={handleCustomGoogleClick}
                                disabled={isGoogleLoading}
                                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition-all hover:shadow hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                            >
                                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>{isGoogleLoading ? 'કનેક્ટ થઈ રહ્યું છે...' : (view === 'register' ? 'Google સાથે સાઇન અપ કરો (Continue with Google)' : 'Google સાથે લૉગિન કરો (Continue with Google)')}</span>
                            </button>

                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-3 text-slate-400 font-bold">અથવા (OR)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {(view === 'login' || view === 'register' || view === 'forgot-step1') && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                                    placeholder="Unique username (min 3 chars)"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                            </div>
                        )}

                        {view === 'login' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                    placeholder="Your password"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                            </div>
                        )}

                        {view === 'register' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                        placeholder="Min 8 characters (mixed case, numbers)"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                                        placeholder="Re-enter password"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                                </div>
                            </>
                        )}

                        {(view === 'register' || view === 'forgot-step1') && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                                    <input type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} required
                                        placeholder="10-digit mobile number"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                                </div>
                            </>
                        )}

                        {view === 'forgot-step2' && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                                        placeholder="Min 8 characters (mixed case, numbers)"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                                    <input type="password" value={confirmNewPw} onChange={e => setConfirmNewPw(e.target.value)} required
                                        placeholder="Re-enter new password"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white" />
                                </div>
                            </>
                        )}

                        <button type="submit" className="w-full bg-blue-900 text-white font-bold py-2.5 rounded-lg hover:bg-blue-800 transition shadow-md">
                            {view === 'login' && 'Log In'}
                            {view === 'register' && 'Create Account'}
                            {view === 'forgot-step1' && 'Verify Details'}
                            {view === 'forgot-step2' && 'Reset Password'}
                        </button>
                    </form>

                    {view === 'login' && (
                        <div className="mt-2 text-right">
                            <button onClick={handleSwitchToForgot} className="text-xs text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer">
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <div className="mt-4 text-center text-sm text-gray-500">
                        {view === 'login' && (
                            <>
                                Don't have an account?{' '}
                                <button onClick={handleSwitchToRegister} className="text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer">
                                    Sign Up
                                </button>
                            </>
                        )}
                        {view === 'register' && (
                            <>
                                Already have an account?{' '}
                                <button onClick={handleSwitchToLogin} className="text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer">
                                    Log In
                                </button>
                            </>
                        )}
                        {(view === 'forgot-step1' || view === 'forgot-step2') && (
                            <button onClick={handleSwitchToLogin} className="text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer">
                                Back to Log In
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">Cancel</button>
                </div>
            </div>
        </div>
    );
};

// Global backward compatibility
window.AuthModal = AuthModal;
export default AuthModal;

