import React from 'react';

/**
 * DraftSetu Reusable Website Footer
 * Consistent across Home, Legal, and Informational pages.
 */
const Footer = ({ onNavigate }) => {
    const handleNav = (target) => {
        if (typeof onNavigate === 'function') {
            onNavigate(target);
        } else if (typeof window.handleNavigate === 'function') {
            window.handleNavigate(target);
        } else {
            if (target === 'home' || target === '/') {
                window.location.href = '/';
            } else if (target === 'privacy-policy' || target === '/privacy-policy') {
                window.location.href = '/privacy-policy';
            } else if (target === 'terms-of-service' || target === '/terms-of-service') {
                window.location.href = '/terms-of-service';
            }
        }
    };

    return (
        <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 no-print font-sans">
            <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Col 1: Brand & Overview */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                                <path d="M12 22V8M5 12H19M5 12A3.5 3.5 0 0 1 12 8.5M19 12A3.5 3.5 0 0 0 12 8.5M5 12L12 16.5L19 12" />
                            </svg>
                        </div>
                        <span className="font-black text-white text-lg tracking-wider font-outfit">DraftSetu</span>
                    </div>
                    <p className="text-xs leading-relaxed font-semibold text-slate-400">
                        Professional Legal Document Automation Platform. Automating complex drafting workflows with standardized blueprints.
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium font-gujarati">
                        કાનૂની દસ્તાવેજ ડ્રાફ્ટિંગ અને બ્લુપ્રિન્ટ ઓટોમેશન પ્લેટફોર્મ.
                    </p>
                </div>

                {/* Col 2: Legal & Terms */}
                <div>
                    <h4 className="font-black text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">Legal & Policies</h4>
                    <ul className="space-y-2.5 text-xs font-semibold">
                        <li>
                            <button
                                type="button"
                                onClick={() => handleNav('/privacy-policy')}
                                className="hover:text-white transition-colors cursor-pointer text-left"
                            >
                                Privacy Policy (પ્રાઇવસી પોલિસી)
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => handleNav('/terms-of-service')}
                                className="hover:text-white transition-colors cursor-pointer text-left"
                            >
                                Terms of Service (સેવાની શરતો)
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => handleNav('page:contact')}
                                className="hover:text-white transition-colors cursor-pointer text-left"
                            >
                                Contact Us (સંપર્ક)
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Col 3: Resources */}
                <div>
                    <h4 className="font-black text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">Resources</h4>
                    <ul className="space-y-2.5 text-xs font-semibold">
                        <li>
                            <button
                                type="button"
                                onClick={() => handleNav('page:user-guide')}
                                className="hover:text-white transition-colors cursor-pointer text-left"
                            >
                                User Guide (વપરાશકર્તા માર્ગદર્શિકા)
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => handleNav('page:faqs')}
                                className="hover:text-white transition-colors cursor-pointer text-left"
                            >
                                FAQs (વારંવાર પૂછાતા પ્રશ્નો)
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => handleNav('documents')}
                                className="hover:text-white transition-colors cursor-pointer text-left"
                            >
                                My Documents (Vault)
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Col 4: Disclaimer & Notice */}
                <div className="space-y-3">
                    <h4 className="font-black text-white text-xs uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">Legal Disclaimer</h4>
                    <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                        DraftSetu is a technology platform providing document drafting automation tools. Generated documents are draft blueprints and do not constitute formal legal advice. Final execution is subject to appropriate stamp duty, verification, and legal registration.
                    </p>
                    <p className="text-[9px] leading-relaxed text-slate-500 font-gujarati">
                        ડ્રાફ્ટસેતુ એક ટેકનોલોજી પ્લેટફોર્મ છે જે દસ્તાવેજ ઓટોમેશન સહાય પૂરી પાડે છે અને કાનૂની સલાહ આપતું નથી.
                    </p>
                </div>
            </div>

            {/* Bottom copyright line */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
                <div>
                    &copy; {new Date().getFullYear()} DraftSetu. All rights reserved.
                </div>
                <div className="flex items-center gap-6 text-xs">
                    <button
                        type="button"
                        onClick={() => handleNav('/privacy-policy')}
                        className="hover:text-slate-300 transition-colors"
                    >
                        Privacy Policy
                    </button>
                    <span>•</span>
                    <button
                        type="button"
                        onClick={() => handleNav('/terms-of-service')}
                        className="hover:text-slate-300 transition-colors"
                    >
                        Terms of Service
                    </button>
                    <span>•</span>
                    <button
                        type="button"
                        onClick={() => handleNav('home')}
                        className="hover:text-slate-300 transition-colors"
                    >
                        Home
                    </button>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
