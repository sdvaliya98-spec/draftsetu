import React, { useState, useEffect } from 'react';
import { UserIcon, ShieldIcon, MailIcon, PhoneIcon, MapPinIcon, KeyIcon, XIcon, CheckCircleIcon, AlertCircleIcon } from './Icons.jsx';

const UserProfileModal = ({ isOpen, onClose, onUserUpdated }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const [profile, setProfile] = useState({
        id: '',
        username: '',
        email: '',
        full_name: '',
        mobile_number: '',
        city: '',
        auth_provider: 'local',
        is_admin: false,
        document_limit: 10
    });

    const [form, setForm] = useState({
        full_name: '',
        username: '',
        mobile_number: '',
        city: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setSuccessMessage(null);
        setLoading(true);

        const fetchProfile = async () => {
            try {
                const res = await window.apiFetch('/api/auth/me');
                if (!res.ok) {
                    throw new Error('Failed to load profile details.');
                }
                const data = await res.json();
                setProfile(data);
                setForm({
                    full_name: data.full_name && data.full_name !== '—' ? data.full_name : '',
                    username: data.username || '',
                    mobile_number: data.mobile_number && data.mobile_number !== '—' ? data.mobile_number : '',
                    city: data.city && data.city !== '—' ? data.city : ''
                });
            } catch (err) {
                console.error('Error loading profile:', err);
                setError(err.message || 'Could not fetch profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const trimmedFullName = form.full_name.trim();
        const trimmedUsername = form.username.trim();
        const trimmedMobile = form.mobile_number.trim();
        const trimmedCity = form.city.trim();

        // 1. Username Validation
        if (!trimmedUsername) {
            setError('Username cannot be empty.');
            return;
        }
        if (trimmedUsername.length !== 6) {
            setError('Username must be exactly 6 characters.');
            return;
        }
        if (!/^[a-zA-Z0-9]{6}$/.test(trimmedUsername)) {
            setError('Username must contain only letters and numbers (alphanumeric).');
            return;
        }

        // 2. Mobile Validation (if provided)
        if (trimmedMobile) {
            const digitsOnly = trimmedMobile.replace(/\D/g, '');
            if (digitsOnly.length !== 10) {
                setError('Mobile number must be exactly 10 digits (numbers only).');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                full_name: trimmedFullName || '',
                username: trimmedUsername,
                mobile_number: trimmedMobile || '',
                city: trimmedCity || ''
            };

            const res = await window.apiFetch('/api/auth/profile', {
                method: 'PUT',
                body: payload
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || 'Failed to update profile.');
            }

            if (data.access_token) {
                localStorage.setItem('authToken', data.access_token);
            }
            if (data.username) {
                localStorage.setItem('currentUser', data.username);
            }

            setProfile(data);
            setSuccessMessage('Profile updated successfully!');
            if (onUserUpdated) {
                onUserUpdated(data);
            }
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError(err.message || 'An unexpected error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    const getProviderBadge = (provider) => {
        const p = (provider || 'local').toUpperCase();
        if (p === 'GOOGLE') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200">GOOGLE</span>;
        if (p === 'BOTH') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">GOOGLE + LOCAL</span>;
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">LOCAL</span>;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[250] p-4 font-sans" onClick={() => !saving && onClose()}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#1E60FF]/10 flex items-center justify-center text-[#1E60FF]">
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 leading-tight">My Profile</h3>
                            <p className="text-xs text-slate-500 font-medium">Manage your personal account details</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition disabled:opacity-50"
                        type="button"
                    >
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <span className="inline-block animate-spin text-2xl">⏳</span>
                            <span className="text-xs font-bold">Loading profile...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-4">
                            {error && (
                                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                                    <AlertCircleIcon size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {successMessage && (
                                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                                    <CheckCircleIcon size={16} className="shrink-0" />
                                    <span>{successMessage}</span>
                                </div>
                            )}

                            {/* Read-Only Account Info Card */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">User ID</span>
                                    <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">#{profile.id}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Auth Provider</span>
                                    <div>{getProviderBadge(profile.auth_provider)}</div>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Account Role</span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${profile.is_admin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                                        {profile.is_admin ? 'ADMINISTRATOR' : 'CITIZEN / USER'}
                                    </span>
                                </div>
                            </div>

                            {/* Email (Read-Only) */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <MailIcon size={14} className="text-slate-400" />
                                        <span>Email Address</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded">Read-only</span>
                                </div>
                                <input
                                    type="email"
                                    value={profile.email || '—'}
                                    disabled
                                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed select-all"
                                />
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    placeholder="Enter your full name"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#1E60FF] focus:ring-2 focus:ring-[#1E60FF]/10 rounded-xl text-xs font-bold text-slate-800 transition outline-none"
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <KeyIcon size={14} className="text-slate-400" />
                                        <span>Username</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-medium">Exactly 6 alphanumeric chars</span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    placeholder="e.g. user01"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#1E60FF] focus:ring-2 focus:ring-[#1E60FF]/10 rounded-xl text-xs font-bold text-slate-800 transition outline-none uppercase font-mono tracking-wider"
                                />
                            </div>

                            {/* Mobile Number */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <PhoneIcon size={14} className="text-slate-400" />
                                        <span>Mobile Number</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400 font-medium">10 digits</span>
                                </div>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={form.mobile_number}
                                    onChange={e => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, '') })}
                                    placeholder="Enter 10-digit mobile number"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#1E60FF] focus:ring-2 focus:ring-[#1E60FF]/10 rounded-xl text-xs font-bold text-slate-800 transition outline-none"
                                />
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <MapPinIcon size={14} className="text-slate-400" />
                                    <span>City</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.city}
                                    onChange={e => setForm({ ...form, city: e.target.value })}
                                    placeholder="Enter your city (e.g. Ahmedabad)"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-[#1E60FF] focus:ring-2 focus:ring-[#1E60FF]/10 rounded-xl text-xs font-bold text-slate-800 transition outline-none"
                                />
                            </div>

                            {/* Submit Buttons */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={saving}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-[#1E60FF] hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving && <span className="animate-spin text-sm">⏳</span>}
                                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
