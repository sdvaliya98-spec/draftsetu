import React from 'react';

const AuthModal = ({ onClose, onLoginSuccess, initialView = 'login', initialToken = '' }) => {
    const [view, setView] = React.useState(initialView); // 'login' | 'register' | 'forgot-request' | 'forgot-legacy' | 'forgot-reset'
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPw, setConfirmPw] = React.useState('');
    const [fullName, setFullName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [city, setCity] = React.useState('');
    const [birthDate, setBirthDate] = React.useState('');
    const [mobileNumber, setMobileNumber] = React.useState('');
    
    // Forgot password request states
    const [resetIdentifier, setResetIdentifier] = React.useState('');
    const [requestSent, setRequestSent] = React.useState(false);
    const [devResetLink, setDevResetLink] = React.useState('');
    const [devToken, setDevToken] = React.useState('');
    const [devResetData, setDevResetData] = React.useState(null);
    const [isSubmittingForgot, setIsSubmittingForgot] = React.useState(false);

    // Reset password states
    const [token, setToken] = React.useState(initialToken);
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPw, setConfirmNewPw] = React.useState('');
    const [isTokenValidating, setIsTokenValidating] = React.useState(false);
    const [tokenError, setTokenError] = React.useState('');
    
    const [error, setError] = React.useState('');
    const [successMessage, setSuccessMessage] = React.useState('');

    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
    const [googleProfileData, setGoogleProfileData] = React.useState(null);
    const [isCompletingProfile, setIsCompletingProfile] = React.useState(false);

    // Auto-detect reset_token from URL query parameters if not passed explicitly
    React.useEffect(() => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const queryToken = urlParams.get('reset_token') || urlParams.get('token');
            if (queryToken && !token) {
                setToken(queryToken);
                setView('forgot-reset');
            }
        } catch (e) {
            console.warn('URL token detection notice:', e);
        }
    }, []);

    // Validate token whenever entering forgot-reset view
    React.useEffect(() => {
        if (view === 'forgot-reset') {
            if (!token) {
                setTokenError('Password reset token is missing. Please request a new reset link.');
                return;
            }
            let isMounted = true;
            setIsTokenValidating(true);
            setTokenError('');

            window.apiFetch(`/api/forgot-password/verify-token?token=${encodeURIComponent(token)}`)
                .then(res => res.json())
                .then(data => {
                    if (!isMounted) return;
                    if (data.valid === false || data.detail) {
                        setTokenError(data.detail || 'This reset link has expired or has already been used.');
                    }
                })
                .catch(err => {
                    if (!isMounted) return;
                    setTokenError(err.message || 'This reset link has expired or is invalid.');
                })
                .finally(() => {
                    if (isMounted) setIsTokenValidating(false);
                });

            return () => { isMounted = false; };
        }
    }, [view, token]);

    const handleGoogleSuccess = async (idToken) => {
        setError('');
        setIsGoogleLoading(true);
        try {
            const res = await window.apiFetch('/api/auth/google', {
                method: 'POST',
                body: { id_token: idToken }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Google authentication failed.');
            }
            if (data.requires_profile_completion) {
                setGoogleProfileData({
                    token: data.access_token,
                    username: data.username,
                    email: data.email,
                    full_name: data.full_name || '',
                    mobile_number: data.mobile_number || '',
                    city: data.city || '',
                    isAdmin: data.is_admin
                });
                setFullName(data.full_name || '');
                setUsername(data.username || '');
                setEmail(data.email || '');
                setMobileNumber(data.mobile_number || '');
                setCity(data.city || '');
                setView('complete-profile');
            } else {
                onLoginSuccess(data.username, data.access_token, data.is_admin);
            }
        } catch (err) {
            console.error('❌ [Google Auth Error]', err);
            setError(err.message || 'Google authentication failed.');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleCompleteProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedFullName = fullName.trim();
        if (!trimmedFullName) {
            setError('Full Name is required.');
            return;
        }

        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            setError('Username is required.');
            return;
        }
        if (trimmedUsername.length < 3) {
            setError('Username must be at least 3 characters.');
            return;
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
            setError('Username contains invalid characters.');
            return;
        }

        const trimmedMobile = mobileNumber.trim();
        if (!trimmedMobile) {
            setError('Mobile Number is required.');
            return;
        }
        const digitsOnly = trimmedMobile.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
            setError('Mobile number must be exactly 10 digits.');
            return;
        }

        const trimmedCity = city.trim();
        if (!trimmedCity) {
            setError('City is required.');
            return;
        }

        const authToken = googleProfileData?.token;
        if (!authToken) {
            setError('Session expired. Please sign in with Google again.');
            return;
        }

        setIsCompletingProfile(true);
        try {
            const res = await window.apiFetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: {
                    full_name: trimmedFullName,
                    username: trimmedUsername,
                    mobile_number: digitsOnly,
                    city: trimmedCity
                }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Failed to update profile.');
            }
            onLoginSuccess(data.username, authToken, googleProfileData?.isAdmin ?? data.is_admin);
        } catch (err) {
            console.error('❌ [Profile Completion Error]', err);
            setError(err.message || 'Failed to update profile.');
        } finally {
            setIsCompletingProfile(false);
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
            const clientId = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GOOGLE_CLIENT_ID : "") || window.GOOGLE_CLIENT_ID || "";
            if (!clientId) {
                console.warn("Google Client ID not found. Set VITE_GOOGLE_CLIENT_ID in environment.");
                return;
            }
            
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

    const cleanUrlResetToken = () => {
        try {
            if (window.location.search.includes('reset_token') || window.location.search.includes('token')) {
                const url = new URL(window.location.href);
                url.searchParams.delete('reset_token');
                url.searchParams.delete('token');
                window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
            }
        } catch (e) {
            console.warn('URL clean notice:', e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        
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
            if (!fullName.trim()) return setError('Full Name is required');
            if (!email.trim()) return setError('Email Address is required');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email address');
            if (username.trim().length !== 6) return setError('Username must be exactly 6 characters.');
            if (!/^[a-zA-Z0-9]{6}$/.test(username.trim())) return setError('Username must contain only letters and numbers.');
            if (!mobileNumber.trim()) return setError('Mobile Number is required');
            if (mobileNumber.trim().replace(/\D/g, '').length < 10) return setError('Mobile Number must be at least 10 digits');
            if (!city.trim()) return setError('City is required');
            if (password.length < 8) return setError('Password must be at least 8 characters long');
            if (!/[A-Z]/.test(password)) return setError('Password must contain at least one uppercase letter');
            if (!/[a-z]/.test(password)) return setError('Password must contain at least one lowercase letter');
            if (!/\d/.test(password)) return setError('Password must contain at least one number');
            if (password !== confirmPw) return setError('Passwords do not match');

            try {
                const res = await window.apiFetch('/api/register', {
                    method: 'POST',
                    body: {
                        full_name: fullName.trim(),
                        email: email.trim().toLowerCase(),
                        username: username.trim(),
                        mobile_number: mobileNumber.trim(),
                        city: city.trim(),
                        password
                    }
                });
                const data = await res.json();
                onLoginSuccess(data.username, data.access_token, data.is_admin);
            } catch (err) {
                console.error('❌ [Register Error]', err);
                setError(err.message || 'Registration failed');
            }
        } else if (view === 'forgot-request') {
            if (!resetIdentifier.trim()) return setError('Please enter your username or registered email');
            setIsSubmittingForgot(true);
            try {
                const res = await window.apiFetch('/api/forgot-password/request', {
                    method: 'POST',
                    body: { identifier: resetIdentifier.trim() }
                });
                const data = await res.json();
                console.log('📬 [Forgot Password API Response]:', data);
                setRequestSent(true);
                setSuccessMessage(data.message || 'If an account matches that email or username, password reset instructions have been sent.');
                
                setDevResetData(data);
                const rawLink = data?.dev_reset_link || data?.devResetLink || data?.link || '';
                let rawToken = data?.dev_token || data?.devToken || data?.token || data?.reset_token || '';

                if (!rawToken && rawLink) {
                    try {
                        const parsed = new URL(rawLink, window.location.origin);
                        rawToken = parsed.searchParams.get('reset_token') || parsed.searchParams.get('token') || '';
                    } catch (e) {
                        console.warn('Could not parse token from dev_reset_link:', e);
                    }
                }

                if (rawLink) {
                    setDevResetLink(rawLink);
                }
                if (rawToken) {
                    setDevToken(rawToken);
                    setToken(rawToken);
                }
            } catch (err) {
                console.error('❌ [Forgot Request Error]', err);
                setError(err.message || 'Failed to submit password reset request');
            } finally {
                setIsSubmittingForgot(false);
            }
        } else if (view === 'forgot-legacy') {
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
                setView('forgot-reset');
            } catch (err) {
                console.error('❌ [Forgot Legacy Error]', err);
                setError(err.message || 'User details do not match.');
            }
        } else if (view === 'forgot-reset') {
            if (!token) return setError('Reset token is missing. Please request a new reset link.');
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
                cleanUrlResetToken();
                setView('login');
                setPassword('');
                setNewPassword('');
                setConfirmNewPw('');
                setToken('');
                setTokenError('');
            } catch (err) {
                console.error('❌ [Forgot Reset Error]', err);
                setError(err.message || 'Resetting password failed');
            }
        }
    };

    const handleSwitchToForgot = () => {
        setView('forgot-request');
        setError('');
        setSuccessMessage('');
        setResetIdentifier('');
        setRequestSent(false);
        setDevResetLink('');
        setDevToken('');
        setDevResetData(null);
    };

    const handleSwitchToRegister = () => {
        setView('register');
        setError('');
        setSuccessMessage('');
        setFullName('');
        setEmail('');
        setUsername('');
        setMobileNumber('');
        setCity('');
        setPassword('');
        setConfirmPw('');
        setBirthDate('');
    };

    const handleSwitchToLogin = () => {
        cleanUrlResetToken();
        setView('login');
        setError('');
        setSuccessMessage('');
        setUsername('');
        setPassword('');
        setTokenError('');
    };

    return (
        <div id="auth-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div id="auth-modal-dialog" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in relative">
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white relative">
                    <button
                        id="btn-close-auth-modal"
                        onClick={() => {
                            cleanUrlResetToken();
                            onClose();
                        }}
                        type="button"
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer"
                        title="Close"
                    >
                        ✕
                    </button>
                    <h2 className="text-2xl font-bold pr-8">
                        {view === 'login' && '👋 Welcome Back'}
                        {view === 'register' && '🚀 Create Account'}
                        {view === 'forgot-request' && '🔑 Reset Password'}
                        {view === 'forgot-legacy' && '🔍 Verify Identity'}
                        {view === 'forgot-reset' && '🔒 Set New Password'}
                        {view === 'complete-profile' && '✨ Complete Your Profile'}
                    </h2>
                    <p className="text-blue-200 text-sm mt-1">
                        {view === 'login' && 'Log in to access your documents & wallet'}
                        {view === 'register' && 'Join to save and manage documents with 100 free credits'}
                        {view === 'forgot-request' && 'Enter your username or email to receive reset instructions'}
                        {view === 'forgot-legacy' && 'Enter your registered details to verify identity'}
                        {view === 'forgot-reset' && 'Choose a strong new password for your account'}
                        {view === 'complete-profile' && 'Please complete your profile to continue.'}
                    </p>
                </div>
                <div className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">{error}</div>}
                    {successMessage && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-semibold">{successMessage}</div>}

                    {/* Google Authentication Section (Only for login and register) */}
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

                    {/* View: Forgot Password Request Sent State */}
                    {view === 'forgot-request' && requestSent ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-sm leading-relaxed">
                                <p className="font-semibold mb-1">📬 Request Received</p>
                                <p className="text-xs text-blue-800">
                                    If an account exists with this email, a password reset link has been sent.
                                </p>
                                <div className="mt-2 pt-2 border-t border-blue-200/60 text-[11px] text-blue-700 flex items-center gap-1.5">
                                    <span>💡</span>
                                    <span>If your account was created using Google, please use <strong>Sign in with Google</strong>.</span>
                                </div>
                            </div>

                            {/* Development mode direct test helper */}
                            {Boolean(devResetLink || devToken || token || devResetData?.dev_reset_link || devResetData?.dev_token) && (
                                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
                                    <p className="font-bold flex items-center gap-1.5">
                                        <span>🛠️</span> <span>Local Development Testing:</span>
                                    </p>
                                    <p className="text-[11px] text-amber-800">
                                        Because you are testing locally, you can click directly below to open the reset form:
                                    </p>
                                    <button
                                        type="button"
                                        id="btn-dev-reset-open"
                                        onClick={() => {
                                            const activeToken = devToken || token || devResetData?.dev_token || (devResetLink ? (new URL(devResetLink, window.location.origin).searchParams.get('reset_token') || '') : '') || (devResetData?.dev_reset_link ? (new URL(devResetData.dev_reset_link, window.location.origin).searchParams.get('reset_token') || '') : '');
                                            if (activeToken) {
                                                setToken(activeToken);
                                            }
                                            setView('forgot-reset');
                                            setError('');
                                            setSuccessMessage('');
                                            setTokenError('');
                                        }}
                                        className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        <span>👉</span> <span>Proceed to Set New Password</span>
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleSwitchToLogin}
                                className="w-full bg-blue-900 text-white font-bold py-2.5 rounded-lg hover:bg-blue-800 transition shadow-md"
                            >
                                Back to Log In
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 1. Register View Fields (Strict requested structure) */}
                            {view === 'register' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            id="input-register-fullname"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            required
                                            placeholder="Enter your full name"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            id="input-register-email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            placeholder="name@example.com"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            id="input-register-username"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            required
                                            maxLength={6}
                                            placeholder="6 characters (e.g. user01)"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                        <p className="text-[11px] text-gray-500 mt-0.5">Username must be exactly 6 characters (letters and numbers only).</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone / Mobile Number</label>
                                        <input
                                            type="tel"
                                            id="input-register-mobile"
                                            value={mobileNumber}
                                            onChange={e => setMobileNumber(e.target.value)}
                                            required
                                            placeholder="10-digit mobile number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                                        <input
                                            type="text"
                                            id="input-register-city"
                                            value={city}
                                            onChange={e => setCity(e.target.value)}
                                            required
                                            placeholder="Your city"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                        <input
                                            type="password"
                                            id="input-register-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            placeholder="Min 8 characters (mixed case, numbers)"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            id="input-register-confirmpw"
                                            value={confirmPw}
                                            onChange={e => setConfirmPw(e.target.value)}
                                            required
                                            placeholder="Re-enter password"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white text-sm"
                                        />
                                    </div>
                                </>
                            )}

                            {/* 2. Login View Fields */}
                            {view === 'login' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            id="input-login-username"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            required
                                            placeholder="Enter your username"
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                        <input
                                            type="password"
                                            id="input-login-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            placeholder="Your password"
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>
                                </>
                            )}

                            {/* 3. Forgot Request View Field */}
                            {view === 'forgot-request' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email or Username</label>
                                    <input
                                        type="text"
                                        id="input-forgot-identifier"
                                        value={resetIdentifier}
                                        onChange={e => setResetIdentifier(e.target.value)}
                                        required
                                        placeholder="Enter your username or email"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                    />
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        We will send you a secure link to reset your password.
                                    </p>
                                </div>
                            )}

                            {/* 4. Legacy Forgot View Fields (DOB + Mobile) */}
                            {view === 'forgot-legacy' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                                        <input
                                            type="text"
                                            id="input-legacy-username"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            required
                                            placeholder="Enter your username"
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            id="input-legacy-dob"
                                            value={birthDate}
                                            onChange={e => setBirthDate(e.target.value)}
                                            required
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                                        <input
                                            type="tel"
                                            id="input-legacy-mobile"
                                            value={mobileNumber}
                                            onChange={e => setMobileNumber(e.target.value)}
                                            required
                                            placeholder="10-digit mobile number"
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>
                                </>
                            )}

                            {/* View: Reset Password (New Password & Confirm) */}
                            {view === 'forgot-reset' && (
                                <>
                                    {isTokenValidating && (
                                        <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                                            <span className="animate-spin">⏳</span> Verifying reset token...
                                        </div>
                                    )}

                                    {tokenError ? (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm space-y-3">
                                            <p className="font-semibold flex items-center gap-1.5">
                                                <span>⚠️</span> <span>Link Expired or Invalid</span>
                                            </p>
                                            <p className="text-xs text-red-600">{tokenError}</p>
                                            <button
                                                type="button"
                                                onClick={handleSwitchToForgot}
                                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs transition"
                                            >
                                                Request New Reset Link
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
                                                <input
                                                    type="password"
                                                    id="input-new-password"
                                                    value={newPassword}
                                                    onChange={e => setNewPassword(e.target.value)}
                                                    required
                                                    placeholder="Min 8 characters (mixed case, numbers)"
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    id="input-confirm-new-password"
                                                    value={confirmNewPw}
                                                    onChange={e => setConfirmNewPw(e.target.value)}
                                                    required
                                                    placeholder="Re-enter new password"
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Submit button */}
                            {!(view === 'forgot-reset' && tokenError) && (
                                <button
                                    type="submit"
                                    id="btn-auth-submit"
                                    disabled={isSubmittingForgot || isTokenValidating}
                                    className="w-full bg-blue-900 text-white font-bold py-2.5 rounded-lg hover:bg-blue-800 transition shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                    {view === 'login' && 'Log In'}
                                    {view === 'register' && 'Create Account'}
                                    {view === 'forgot-request' && (isSubmittingForgot ? 'Sending...' : 'Send Reset Link')}
                                    {view === 'forgot-legacy' && 'Verify Details'}
                                    {view === 'forgot-reset' && 'Reset Password'}
                                </button>
                            )}
                        </form>
                    )}

                    {/* View: Complete Profile Form (For Google First-Time Logins) */}
                    {view === 'complete-profile' && (
                        <form onSubmit={handleCompleteProfileSubmit} className="space-y-4">
                            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                                <span className="text-base flex-shrink-0">ℹ️</span>
                                <div>
                                    <span className="font-bold">Google Authentication Verified: </span>
                                    Please complete your contact details below to continue to the DraftSetu dashboard.
                                </div>
                            </div>

                            {/* 1. Full Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    1. Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="input-complete-fullname"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                    placeholder="Enter full name"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                />
                            </div>

                            {/* 2. Email Address (Read-Only) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    2. Email Address (Read-Only)
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        id="input-complete-email"
                                        value={email}
                                        readOnly
                                        disabled
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-500 bg-gray-100 font-mono cursor-not-allowed select-all"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                        ✓ Google Verified
                                    </span>
                                </div>
                            </div>

                            {/* 3. Username */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    3. Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="input-complete-username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    placeholder="username"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white font-mono"
                                />
                            </div>

                            {/* 4. Mobile Number */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    4. Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="input-complete-mobile"
                                    value={mobileNumber}
                                    onChange={e => setMobileNumber(e.target.value)}
                                    required
                                    placeholder="10-digit mobile number"
                                    maxLength={10}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white font-mono"
                                />
                            </div>

                            {/* 5. City */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    5. City <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="input-complete-city"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    required
                                    placeholder="e.g. Ahmedabad, Surat"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                id="btn-complete-profile-submit"
                                disabled={isCompletingProfile}
                                className="w-full bg-blue-900 text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
                            >
                                {isCompletingProfile ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Saving Profile...</span>
                                    </>
                                ) : (
                                    <span>Save &amp; Continue</span>
                                )}
                            </button>
                        </form>
                    )}

                    {view === 'login' && (
                        <div className="mt-2 text-right">
                            <button
                                id="btn-switch-forgot"
                                onClick={handleSwitchToForgot}
                                className="text-xs text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    {view === 'forgot-request' && !requestSent && (
                        <div className="mt-3 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setView('forgot-legacy');
                                    setError('');
                                }}
                                className="text-xs text-slate-500 hover:text-blue-700 underline bg-transparent border-0 cursor-pointer"
                            >
                                Or verify using Date of Birth & Mobile
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
                        {(view === 'forgot-request' || view === 'forgot-legacy' || view === 'forgot-reset') && (
                            <button onClick={handleSwitchToLogin} className="text-blue-600 font-bold hover:underline bg-transparent border-0 cursor-pointer">
                                Back to Log In
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            cleanUrlResetToken();
                            onClose();
                        }}
                        className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// Global backward compatibility
window.AuthModal = AuthModal;
export default AuthModal;
