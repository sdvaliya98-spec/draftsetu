import React from 'react';
import { MenuIcon, SettingsIcon } from './Icons.jsx';
import UserMenu from './UserMenu.jsx';

const SubNavItem = ({ sub, onNavigate, onCloseParent }) => {
    const hasChildren = sub.children && sub.children.length > 0;
    const [isSubOpen, setIsSubOpen] = React.useState(false);

    return (
        <div
            className="relative w-full"
            onMouseEnter={() => setIsSubOpen(true)}
            onMouseLeave={() => setIsSubOpen(false)}
        >
            <button
                onClick={() => {
                    if (sub.type !== "dropdown" && !hasChildren) {
                        onNavigate(sub);
                        onCloseParent();
                    }
                }}
                className="w-full text-left px-5 py-3 text-xs font-bold hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-between border-b border-slate-50 last:border-0"
                type="button"
            >
                <div className="flex items-center gap-3">
                    {sub.icon && <span className="text-sm">{sub.icon}</span>}
                    <span>{sub.label}</span>
                </div>
                {hasChildren && <span className="text-[8px] text-slate-400">▶</span>}
            </button>

            {hasChildren && isSubOpen && (
                <div className="absolute left-full top-0 ml-1 w-64 bg-white text-slate-800 rounded-2xl shadow-2xl py-2 border-l-4 border-blue-600 animate-fade-in z-[110]">
                    {sub.children.map((child, cidx) => (
                        <button
                            key={child.id || cidx}
                            onClick={() => {
                                onNavigate(child);
                                setIsSubOpen(false);
                                onCloseParent();
                            }}
                            className="w-full text-left px-4 py-2.5 text-[11px] font-bold hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-2 border-b border-slate-50 last:border-0"
                            type="button"
                        >
                            {child.icon && <span className="text-xs">{child.icon}</span>}
                            <span>{child.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};const NavItem = ({ item, onNavigate }) => {
    const hasChildren = item.children && item.children.length > 0;
    const [isOpen, setIsOpen] = React.useState(false);

    const isDocServices = (item.label || '').toLowerCase().includes('document services');

    const handleItemClick = () => {
        if (isDocServices) {
            onNavigate({ type: 'document_services_panel', item });
            return;
        }
        if (item.type === "template") {
            onNavigate(item);
            return;
        }
        if (!hasChildren && item.url) {
            onNavigate(item);
        }
    };

    const renderNavContent = () => {
        const label = item.label || '';
        const lower = label.toLowerCase();

        if (lower.includes('my documents') || lower.includes('મારા દસ્તાવેજ')) {
            return (
                <div className="flex items-center gap-1 xl:gap-1.5 text-left">
                    {item.icon && <span className="text-sm xl:text-base 2xl:text-lg grayscale group-hover:grayscale-0 transition-all shrink-0">{item.icon}</span>}
                    <div className="flex flex-col justify-center leading-[1.12] font-bold">
                        <span>મારું દસ્તાવેજ</span>
                        <span>ફોલ્ડર (MY</span>
                        <span>DOCUMENTS)</span>
                    </div>
                </div>
            );
        }

        if (lower.includes('document services')) {
            return (
                <div className="flex items-center gap-1 xl:gap-1.5 text-left">
                    {item.icon && <span className="text-sm xl:text-base 2xl:text-lg grayscale group-hover:grayscale-0 transition-all shrink-0">{item.icon}</span>}
                    <div className="flex flex-col justify-center leading-[1.12] font-bold">
                        <span>DOCUMENT</span>
                        <span className="flex items-center gap-0.5">
                            SERVICES
                            {hasChildren && <span className="text-[7.5px] xl:text-[8.5px] text-blue-600 transition-all shrink-0 ml-0.5">▼</span>}
                        </span>
                    </div>
                </div>
            );
        }

        if (lower.includes('legal services')) {
            return (
                <div className="flex items-center gap-1 xl:gap-1.5 text-left">
                    {item.icon && <span className="text-sm xl:text-base 2xl:text-lg grayscale group-hover:grayscale-0 transition-all shrink-0">{item.icon}</span>}
                    <div className="flex flex-col justify-center leading-[1.12] font-bold">
                        <span>LEGAL</span>
                        <span className="flex items-center gap-0.5">
                            SERVICES
                            {hasChildren && <span className="text-[7.5px] xl:text-[8.5px] text-slate-400 group-hover:text-blue-600 transition-all shrink-0 ml-0.5">▼</span>}
                        </span>
                    </div>
                </div>
            );
        }

        if (lower.includes('help center')) {
            return (
                <div className="flex items-center gap-1 xl:gap-1.5 text-left">
                    {item.icon && <span className="text-sm xl:text-base 2xl:text-lg grayscale group-hover:grayscale-0 transition-all shrink-0">{item.icon}</span>}
                    <div className="flex flex-col justify-center leading-[1.12] font-bold">
                        <span>HELP</span>
                        <span className="flex items-center gap-0.5">
                            CENTER
                            {hasChildren && <span className="text-[7.5px] xl:text-[8.5px] text-slate-400 group-hover:text-blue-600 transition-all shrink-0 ml-0.5">▼</span>}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-1 xl:gap-1.5 whitespace-nowrap font-bold">
                {item.icon && <span className="text-sm xl:text-base 2xl:text-lg grayscale group-hover:grayscale-0 transition-all shrink-0">{item.icon}</span>}
                <span>{label}</span>
                {hasChildren && <span className="text-[7.5px] xl:text-[8.5px] text-slate-400 group-hover:text-blue-600 transition-all shrink-0 ml-0.5">▼</span>}
            </div>
        );
    };

    return (
        <div
            className="relative h-full flex items-center group shrink-0"
            onMouseEnter={() => { setIsOpen(true); }}
            onMouseLeave={() => { setIsOpen(false); }}
        >
            <button
                onClick={handleItemClick}
                className="px-0.5 lg:px-0.5 xl:px-1 2xl:px-2 py-2 text-[7.5px] lg:text-[8px] xl:text-[10.5px] 2xl:text-[12px] font-black uppercase tracking-wider text-slate-600 hover:text-blue-600 transition-all flex items-center h-full focus:outline-none border-b-2 border-transparent hover:border-blue-600"
                type="button"
            >
                {renderNavContent()}
            </button>

            {hasChildren && isOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 w-72 bg-white text-slate-800 rounded-b-2xl shadow-2xl py-3 border-t-4 border-blue-600 animate-fade-in z-[100]">
                    {item.children.map((sub, sidx) => (
                        <SubNavItem
                            key={sub.id || sidx}
                            sub={sub}
                            onNavigate={onNavigate}
                            onCloseParent={() => setIsOpen(false)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const MobileSubNavItem = ({ sub, onNavigate }) => {
    const hasChildren = sub.children && sub.children.length > 0;
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="border-b border-slate-100/50 last:border-0 pb-1 w-full">
            <div className="flex justify-between items-center py-1.5 px-3">
                <button
                    onClick={() => {
                        if (sub.type === "template") {
                            onNavigate(sub);
                        } else if (sub.type === "dropdown" || hasChildren) {
                            setExpanded(!expanded);
                        } else if (sub.url && sub.url !== "#") {
                            onNavigate(sub);
                        }
                    }}
                    className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors text-left"
                    type="button"
                >
                    {sub.icon && <span>{sub.icon}</span>}
                    <span>{sub.label}</span>
                </button>
                {hasChildren && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 text-slate-400 hover:text-blue-600 text-[10px]"
                        type="button"
                    >
                        {expanded ? '▲' : '▼'}
                    </button>
                )}
            </div>

            {hasChildren && expanded && (
                <div className="pl-4 mt-1 space-y-1 bg-slate-100/50 py-1.5 rounded-lg border border-slate-150">
                    {sub.children.map((child, cidx) => (
                        <button
                            key={child.id || cidx}
                            onClick={() => onNavigate(child)}
                            className="w-full text-left py-1.5 px-3 text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-2 border-0 bg-transparent font-semibold"
                            type="button"
                        >
                            {child.icon && <span>{child.icon}</span>}
                            <span>{child.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const MobileNavItem = ({ item, onNavigate }) => {
    const hasChildren = item.children && item.children.length > 0;
    const [expanded, setExpanded] = React.useState(false);

    const isDocServices = (item.label || '').toLowerCase().includes('document services');

    return (
        <div className="border-b border-slate-100 last:border-0 pb-2">
            <div className="flex justify-between items-center py-2">
                <button
                    onClick={() => {
                        if (isDocServices) {
                            onNavigate({ type: 'document_services_panel', item });
                        } else if (item.type === "template") {
                            onNavigate(item);
                        } else if (!hasChildren && item.url) {
                            onNavigate(item);
                        } else {
                            setExpanded(!expanded);
                        }
                    }}
                    className="flex items-center gap-2 text-sm font-black text-slate-700 hover:text-blue-600 transition-colors text-left"
                    type="button"
                >
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.label}</span>
                </button>
                {hasChildren && !isDocServices && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 text-slate-400 hover:text-blue-600"
                        type="button"
                    >
                        {expanded ? '▲' : '▼'}
                    </button>
                )}
            </div>

            {hasChildren && !isDocServices && expanded && (
                <div className="pl-4 mt-1 space-y-1 bg-slate-50 py-2 rounded-xl border border-slate-100">
                    {item.children.map((sub, sidx) => (
                        <MobileSubNavItem
                            key={sub.id || sidx}
                            sub={sub}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const GovHeader = ({
    menuItems,
    currentUser,
    user,
    role,
    onRoleChange,
    onLoginClick,
    onLogout,
    onAdminPanelOpen,
    onNavigate,
    userCredits,
    refreshCredits
}) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);

    return (
        <header className="w-full bg-white border-b border-slate-200/80 no-print z-50 shadow-sm relative">
            <div className="w-full mx-auto px-2 sm:px-3 lg:px-2.5 xl:px-3.5 2xl:px-6">
                <div className="flex justify-between items-center h-20 sm:h-22 xl:h-24">
                    {/* 1. BRANDING (Left, flex-shrink-0) */}
                    <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0" onClick={() => onNavigate('home')}>
                        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/10 hover:scale-105 transition-transform shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5 sm:h-6 sm:w-6">
                                <path d="M12 22V8M5 12H19M5 12A3.5 3.5 0 0 1 12 8.5M19 12A3.5 3.5 0 0 0 12 8.5M5 12L12 16.5L19 12" />
                            </svg>
                        </div>
                        <div className="shrink-0">
                            <h1 className="text-base sm:text-lg xl:text-xl font-black tracking-tight text-slate-900 flex items-center gap-1.5 font-sans whitespace-nowrap">
                                DraftSetu <span className="font-gujarati text-blue-600 text-base sm:text-lg xl:text-xl font-bold">(ડ્રાફ્ટસેતુ)</span>
                            </h1>
                            <p className="text-[8px] sm:text-[9px] xl:text-[10px] font-black text-slate-400 tracking-wider font-sans uppercase leading-tight max-w-[120px] sm:max-w-[150px] xl:max-w-[200px]">
                                Professional Legal Document Automation Platform
                            </p>
                        </div>
                    </div>

                    {/* 2. NAVIGATION (Flexible middle region) */}
                    <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-0.5 h-full ml-1 lg:ml-1.5 xl:ml-2 mr-auto shrink min-w-0">
                        {menuItems.map((item, idx) => (
                            <NavItem key={item.id || idx} item={item} onNavigate={onNavigate} />
                        ))}
                    </nav>

                    {/* 3. RIGHT CONTROLS (Right, shrink-0, static flow) */}
                    <div className="hidden md:flex items-center gap-1.5 xl:gap-2 shrink-0 ml-auto pl-2">
                        {user && user.is_admin === true && (
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-[9px] font-black tracking-wider gap-1 shrink-0">
                                <button
                                    onClick={() => onRoleChange('admin')}
                                    className={`px-2.5 py-1 rounded-lg transition-all duration-200 font-black leading-tight flex flex-col items-center justify-center text-center ${role === 'admin'
                                        ? 'bg-[#1E60FF] text-white shadow-sm'
                                        : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                        }`}
                                    type="button"
                                >
                                    <span>Admin</span>
                                    <span>Mode</span>
                                </button>
                                <button
                                    onClick={() => onRoleChange('user')}
                                    className={`px-2.5 py-1 rounded-lg transition-all duration-200 font-black leading-tight flex flex-col items-center justify-center text-center ${role === 'user'
                                        ? 'bg-[#1E60FF] text-white shadow-sm'
                                        : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                        }`}
                                    type="button"
                                >
                                    <span>User</span>
                                    <span>Mode</span>
                                </button>
                            </div>
                        )}

                        {user && user.is_admin === true && role === 'admin' && (
                            <button
                                onClick={onAdminPanelOpen}
                                className="bg-[#e67e00] hover:bg-[#d97706] text-white font-black text-[9px] uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap shrink-0"
                                type="button"
                            >
                                <SettingsIcon size={14} />
                                <div className="flex flex-col text-left font-black leading-tight">
                                    <span>DRAFTSETU</span>
                                    <span>ADMIN</span>
                                </div>
                            </button>
                        )}

                        {currentUser ? (
                            <div className="flex items-center gap-1.5 xl:gap-2 shrink-0">
                                {userCredits !== null && userCredits !== undefined && (
                                    <button
                                        onClick={() => onNavigate('wallet')}
                                        className="text-[9px] bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl font-black flex items-center gap-1 uppercase tracking-wider transition cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                                        type="button"
                                        title="View Wallet Ledger"
                                    >
                                        🪙 {userCredits} Credits
                                    </button>
                                )}
                                <span className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5 text-[9px] font-black text-slate-800 shadow-sm select-none whitespace-nowrap shrink-0">
                                    <span className="bg-[#10b981] w-2 h-3.5 rounded-full animate-pulse"></span>
                                    <span className="text-purple-700">👤</span>
                                    <span className="font-extrabold text-slate-900">{currentUser}</span>
                                </span>
                                {role !== 'admin' && (
                                    <button
                                        onClick={onLogout}
                                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[9px] font-black tracking-wider uppercase transition border border-rose-200/60 whitespace-nowrap shrink-0 flex items-center justify-center"
                                        type="button"
                                    >
                                        LOGOUT
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={onLoginClick}
                                className="px-3.5 xl:px-4 py-2 bg-[#1E60FF] hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider xl:tracking-widest transition-all shadow-md shadow-blue-600/10 hover:shadow-lg active:scale-95 whitespace-nowrap shrink-0 flex items-center justify-center"
                                type="button"
                            >
                                Log In / Register
                            </button>
                        )}
                    </div>

                    {/* 4. Mobile Hamburger Toggle (for smaller screens) */}
                    <div className="lg:hidden flex items-center gap-2 shrink-0">
                        {user && user.is_admin === true && (
                            <button
                                onClick={() => onRoleChange(role === 'admin' ? 'user' : 'admin')}
                                className="text-[8px] font-black bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-slate-600 uppercase whitespace-nowrap md:hidden"
                                type="button"
                            >
                                {role === 'admin' ? 'Admin' : 'User'}
                            </button>
                        )}

                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition focus:outline-none border-0 bg-transparent shrink-0"
                            aria-label="Toggle navigation menu"
                            type="button"
                        >
                            <MenuIcon size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Panel */}
            {mobileOpen && (
                <div className="lg:hidden border-t border-slate-200/80 bg-white px-4 py-4 space-y-3 shadow-xl max-h-[75vh] overflow-y-auto">
                    <div className="space-y-1.5">
                        {menuItems.map((item, idx) => (
                            <MobileNavItem
                                key={item.id || idx}
                                item={item}
                                onNavigate={(url) => {
                                    onNavigate(url);
                                    setMobileOpen(false);
                                }}
                            />
                        ))}
                    </div>

                    {/* Mobile login / credentials */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                        {user && user.is_admin === true && role === 'admin' && (
                            <button
                                onClick={() => { onAdminPanelOpen(); setMobileOpen(false); }}
                                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-2.5 rounded-xl font-black text-[9px] uppercase tracking-wider shadow-sm"
                                type="button"
                            >
                                <SettingsIcon size={12} /> DraftSetu Admin
                            </button>
                        )}
                        {currentUser ? (
                            <div className="space-y-2">
                                {userCredits !== null && userCredits !== undefined && (
                                    <button
                                        onClick={() => { onNavigate('wallet'); setMobileOpen(false); }}
                                        className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-[9px] font-black uppercase text-center block cursor-pointer"
                                        type="button"
                                    >
                                        🪙 Credits Balance: {userCredits}
                                    </button>
                                )}
                                <div className="text-[10px] text-slate-500 font-black uppercase text-center bg-slate-50 py-2 rounded-xl border border-slate-100">
                                    👤 Signed In As: {currentUser}
                                </div>
                                <button
                                    onClick={() => { onLogout(); setMobileOpen(false); }}
                                    className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black tracking-widest uppercase text-center border border-rose-200"
                                    type="button"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { onLoginClick(); setMobileOpen(false); }}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center shadow-md shadow-blue-600/10"
                                type="button"
                            >
                                Log In / Register
                            </button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

// Global backward compatibility
window.GovHeader = GovHeader;
export default GovHeader;
