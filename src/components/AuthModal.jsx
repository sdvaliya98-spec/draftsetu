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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-5 text-white">
                    <h2 className="text-2xl font-bold">
                        {view === 'login' && '👋 Welcome Back'}
                        {view === 'register' && '🚀 Create Account'}
                        {view === 'forgot-step1' && '🔍 Verify Identity'}
                        {view === 'forgot-step2' && '🔒 Reset Password'}
                    </h2>
                    <p className="text-blue-200 text-sm mt-1">
                        {view === 'login' && 'Log in to access your documents'}
                        {view === 'register' && 'Join to save and manage documents'}
                        {view === 'forgot-step1' && 'Enter details to verify and reset password'}
                        {view === 'forgot-step2' && 'Choose a strong new password'}
                    </p>
                </div>
                <div className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold">{error}</div>}
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
