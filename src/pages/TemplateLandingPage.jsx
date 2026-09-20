import React, { useEffect, useState } from 'react';
import Footer from '../components/Footer.jsx';
import { trackEvent } from '../utils/analytics.js';
import { getTemplateSlug, isTemplatePubliclyAccessible, findTemplateBySlug } from '../utils/slugUtils.js';
import { showAlertDialog } from '../components/CustomDialog.jsx';

const getBaseOrigin = () => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return window.location.origin;
    }
    return 'https://draftsetu.in';
};

const CANONICAL_SITE_URL = 'https://draftsetu.in';

const TemplateLandingPage = ({ templateSlug, templates = [], isTemplatesLoading = false, onNavigate, onLogin, currentUser }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    // Resolve active slug from prop or window location fallback
    const resolvedSlug = React.useMemo(() => {
        if (templateSlug) return String(templateSlug).trim().replace(/\/+$/, '');
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/templates/')) {
            return window.location.pathname.slice(11).trim().replace(/\/+$/, '');
        }
        return '';
    }, [templateSlug]);

    // Find the matching template using the deterministic slug utility
    const matchedTemplate = React.useMemo(() => {
        return findTemplateBySlug(templates, resolvedSlug);
    }, [templates, resolvedSlug]);

    const isAccessible = React.useMemo(() => {
        return isTemplatePubliclyAccessible(matchedTemplate);
    }, [matchedTemplate]);

    const canonicalSlug = React.useMemo(() => {
        if (!matchedTemplate) return resolvedSlug || '';
        return getTemplateSlug(matchedTemplate);
    }, [matchedTemplate, resolvedSlug]);

    // Current browser/origin URL for Copy Link and WhatsApp Share
    const fullShareUrl = React.useMemo(() => {
        const base = getBaseOrigin();
        return `${base}/templates/${canonicalSlug}`;
    }, [canonicalSlug]);

    // SEO Metadata Management
    useEffect(() => {
        if (!matchedTemplate || !isAccessible) {
            document.title = 'Template ઉપલબ્ધ નથી | DraftSetu';
            const staleBreadcrumb = document.getElementById('schema-template-breadcrumb');
            if (staleBreadcrumb) staleBreadcrumb.remove();
            return;
        }

        const templateName = matchedTemplate.name || 'કાનૂની દસ્તાવેજ Template';
        const category = matchedTemplate.category || 'General';
        const pageTitle = `${templateName} | DraftSetu`;
        document.title = pageTitle;

        const descriptionContent = `DraftSetu પર ${templateName} (${category}) Template ઓનલાઈન તૈયાર કરો. ગુજરાતીમાં માહિતી ભરો, Live Preview તપાસો અને સચોટ DOCX/PDF મેળવો.`;
        const canonicalUrl = `${CANONICAL_SITE_URL}/templates/${canonicalSlug}`;

        // Update meta tags
        const setMetaTag = (nameAttr, nameValue, content) => {
            let tag = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute(nameAttr, nameValue);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content);
        };

        const setLinkTag = (rel, href) => {
            let tag = document.querySelector(`link[rel="${rel}"]`);
            if (!tag) {
                tag = document.createElement('link');
                tag.setAttribute('rel', rel);
                document.head.appendChild(tag);
            }
            tag.setAttribute('href', href);
        };

        setMetaTag('name', 'description', descriptionContent);
        setLinkTag('canonical', canonicalUrl);

        // OpenGraph
        setMetaTag('property', 'og:title', pageTitle);
        setMetaTag('property', 'og:description', descriptionContent);
        setMetaTag('property', 'og:url', canonicalUrl);
        setMetaTag('property', 'og:type', 'website');
        setMetaTag('property', 'og:site_name', 'DraftSetu');

        // Twitter
        setMetaTag('name', 'twitter:card', 'summary');
        setMetaTag('name', 'twitter:title', pageTitle);
        setMetaTag('name', 'twitter:description', descriptionContent);

        // Schema.org BreadcrumbList JSON-LD
        const breadcrumbData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://draftsetu.in/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Templates",
                    "item": "https://draftsetu.in/#quick-services"
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": templateName,
                    "item": canonicalUrl
                }
            ]
        };

        let breadcrumbScript = document.getElementById('schema-template-breadcrumb');
        if (!breadcrumbScript) {
            breadcrumbScript = document.createElement('script');
            breadcrumbScript.id = 'schema-template-breadcrumb';
            breadcrumbScript.type = 'application/ld+json';
            document.head.appendChild(breadcrumbScript);
        }
        breadcrumbScript.textContent = JSON.stringify(breadcrumbData, null, 2);

        // GA4 Telemetry for Template Landing View
        const templateId = matchedTemplate.template_id || matchedTemplate.id || '';
        trackEvent('template_landing_view', {
            template_id: templateId,
            template_category: category,
            template_name: templateName
        });

        return () => {
            const script = document.getElementById('schema-template-breadcrumb');
            if (script) {
                script.remove();
            }
        };

    }, [matchedTemplate, isAccessible, canonicalSlug]);

    // Handle WhatsApp Share Action
    const handleWhatsAppShare = () => {
        if (!matchedTemplate) return;
        const templateId = matchedTemplate.template_id || matchedTemplate.id || '';
        const category = matchedTemplate.category || 'General';

        trackEvent('template_share_click', {
            template_id: templateId,
            template_category: category,
            share_method: 'whatsapp'
        });

        const shareMessage = `📄 ${matchedTemplate.name}\n\nDraftSetu પર આ Gujarati legal document Template જુઓ અને Document તૈયાર કરો:\n${fullShareUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    // Handle Copy Link Action
    const handleCopyLink = async () => {
        if (!matchedTemplate) return;
        const templateId = matchedTemplate.template_id || matchedTemplate.id || '';
        const category = matchedTemplate.category || 'General';

        trackEvent('template_share_click', {
            template_id: templateId,
            template_category: category,
            share_method: 'copy_link'
        });

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(fullShareUrl);
            } else {
                // Fallback for non-secure / older browser context
                const textArea = document.createElement('textarea');
                textArea.value = fullShareUrl;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 3000);
            await showAlertDialog({
                title: 'લિંક કોપી થઈ ગઈ છે (Link Copied)',
                message: `આ Template ની લિંક તમારા ક્લિપબોર્ડમાં સફળતાપૂર્વક કોપી થઈ ગઈ છે:\n\n${fullShareUrl}`,
                type: 'success',
                icon: '🔗'
            });
        } catch (err) {
            console.warn('[Copy Link] Notice:', err);
            await showAlertDialog({
                title: 'લિંક શેરિંગ (Template Link)',
                message: fullShareUrl,
                type: 'info',
                icon: '🔗'
            });
        }
    };

    // Handle Primary Create Document CTA
    const handleCreateDocument = () => {
        if (!matchedTemplate) return;
        const templateId = matchedTemplate.template_id || matchedTemplate.id;
        onNavigate(`editor?template=${templateId}`);
    };

    // ─── Initial Loading State ───
    if (isTemplatesLoading || !templates || templates.length === 0) {
        return (
            <div className="w-full bg-slate-50 flex flex-col font-gujarati min-h-screen">
                <div className="flex-1 flex items-center justify-center p-12">
                    <div className="bg-white px-8 py-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 animate-pulse">
                        <span className="text-xl animate-spin">⏳</span>
                        <span className="text-sm font-bold text-slate-700">લોડ થઈ રહ્યું છે... (Loading Template...)</span>
                    </div>
                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        );
    }

    // ─── 404 / Inactive / Archived Template State ───
    if (!matchedTemplate || !isAccessible) {
        return (
            <div className="w-full bg-slate-50 flex flex-col font-gujarati min-h-screen">
                <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                    <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-sm">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center text-3xl border border-amber-100">
                            📭
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                                Template ઉપલબ્ધ નથી
                            </h1>
                            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                આ દસ્તાવેજ Template હાલમાં ઉપલબ્ધ નથી અથવા કાઢી નાખવામાં આવ્યું છે.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onNavigate('home')}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-900/20 transition-all font-sans cursor-pointer"
                        >
                            બધા દસ્તાવેજો જુઓ (Browse All Templates)
                        </button>
                    </div>
                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        );
    }

    // ─── Clean Description Resolution ───
    const rawContent = (matchedTemplate.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const shortDescription = rawContent && rawContent.length > 20
        ? (rawContent.length > 220 ? `${rawContent.substring(0, 220)}...` : rawContent)
        : `આ Template દ્વારા DraftSetu પર સંબંધિત કાનૂની માહિતી દાખલ કરીને સરળતાથી ${matchedTemplate.name} તૈયાર કરી શકાય છે.`;

    return (
        <div className="w-full bg-slate-50 flex flex-col font-gujarati min-h-screen overflow-x-hidden">
            {/* 1. Header Hero & Breadcrumb */}
            <div className="w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-8 md:py-12 px-4 sm:px-6 md:px-12 lg:px-16 border-b border-blue-900/30">
                <div className="max-w-5xl mx-auto space-y-5">
                    
                    {/* Breadcrumbs */}
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-blue-200/80 font-sans flex-wrap">
                        <button
                            type="button"
                            onClick={() => onNavigate('home')}
                            className="hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                            <span>🏠 મુખ્ય પૃષ્ઠ</span>
                        </button>
                        <span>/</span>
                        <button
                            type="button"
                            onClick={() => onNavigate('home')}
                            className="hover:text-white transition cursor-pointer"
                        >
                            <span>દસ્તાવેજ નમૂનાઓ</span>
                        </button>
                        <span>/</span>
                        <span className="text-white font-black truncate max-w-[200px] sm:max-w-none">
                            {matchedTemplate.name}
                        </span>
                    </nav>

                    {/* Category & Badge */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-blue-600/30 backdrop-blur-md text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-sans">
                            📄 {matchedTemplate.category || 'General'}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-sans">
                            ✓ સક્રિય કાનૂની ફોર્મ
                        </span>
                    </div>

                    {/* H1: Exact Template Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug font-outfit">
                        {matchedTemplate.name}
                    </h1>

                    {/* Short Gujarati Summary */}
                    <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed font-semibold">
                        {shortDescription}
                    </p>

                    {/* CTA & Share Action Row in Hero */}
                    <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
                        <button
                            type="button"
                            onClick={handleCreateDocument}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-xl shadow-blue-900/50 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer font-sans border-0"
                        >
                            <span>🚀 દસ્તાવેજ બનાવો</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleWhatsAppShare}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl shadow-lg shadow-emerald-900/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer font-sans border-0"
                        >
                            <span>📱 WhatsApp પર શેર કરો</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl transition flex items-center gap-2 cursor-pointer font-sans"
                        >
                            <span>{copySuccess ? '✓ લિંક કોપી થઈ ગઈ' : '🔗 Link Copy કરો'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main Body: Features & Information */}
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-12 py-8 md:py-12 space-y-10">
                
                {/* Feature Scope Box */}
                <section aria-labelledby="template-features-heading" className="bg-white border border-slate-200 rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                        <span className="text-[10px] font-black text-blue-800 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider font-sans border border-blue-100">
                            FEATURES & SCOPE
                        </span>
                        <h2 id="template-features-heading" className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-2">
                            આ Template માં શું મળશે?
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                            DraftSetu પ્લેટફોર્મ પર આ Template માટે નીચે મુજબની તમામ સુવિધાઓ ઉપલબ્ધ છે:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-xl">
                                ⚡
                            </div>
                            <h3 className="text-sm font-black text-slate-800">ગુજરાતી કાનૂની બ્લુપ્રિન્ટ</h3>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                પ્રમાણભૂત અને માળખાકીય ગુજરાતી લીગલ ડ્રાફ્ટિંગ ફોર્મેટ.
                            </p>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-xl">
                                ✍️
                            </div>
                            <h3 className="text-sm font-black text-slate-800">સરળ માહિતી એન્ટ્રી</h3>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                પક્ષકારો, મિલકત અને શરતોની વિગતો માટે સરળ ફોર્મ ઇનપુટ્સ.
                            </p>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xl">
                                👁️
                            </div>
                            <h3 className="text-sm font-black text-slate-800">તત્કાળ લાઈવ પ્રીવ્યૂ</h3>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                માહિતી દાખલ કરતાંની સાથે જ રીયલ-ટાઇમ પ્રીવ્યૂમાં ફેરફારો ચકાસો.
                            </p>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-xl">
                                📥
                            </div>
                            <h3 className="text-sm font-black text-slate-800">DOCX અને PDF ડાઉનલોડ</h3>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                માઇક્રોસોફ્ટ વર્ડ (DOCX) અને હાઇ-ક્વોલિટી PDF બંને ફોર્મેટમાં આઉટપુટ.
                            </p>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl">
                                💾
                            </div>
                            <h3 className="text-sm font-black text-slate-800">સુરક્ષિત ડ્રાફ્ટ સેવ</h3>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                તમારો ડેટા સેવ કરો અને ગમે ત્યારે અધૂરા ડ્રાફ્ટમાંથી આગળ વધો.
                            </p>
                        </div>

                        <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4.5 space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center text-xl">
                                🔒
                            </div>
                            <h3 className="text-sm font-black text-slate-800">ફાઇનલ લોક સુરક્ષા</h3>
                            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                                દસ્તાવેજ તૈયાર થયા પછી તેને સુરક્ષિત રીતે ફાઇનલ લોક કરો.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 3. Steps & How To Use */}
                <section aria-labelledby="steps-heading" className="bg-slate-900 text-white rounded-[28px] p-6 sm:p-8 space-y-6 shadow-xl">
                    <div>
                        <span className="text-[10px] font-black text-blue-300 bg-blue-900/50 px-3 py-1 rounded-full uppercase tracking-wider font-sans border border-blue-700/40">
                            QUICK WORKFLOW
                        </span>
                        <h2 id="steps-heading" className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2">
                            આ દસ્તાવેજ કેવી રીતે બનાવશો?
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-slate-300">
                        <div className="space-y-2 border-l-2 border-blue-500 pl-4">
                            <span className="text-xs font-black text-blue-400 font-sans uppercase">પગલું ૧</span>
                            <h3 className="text-base font-black text-white">માહિતી દાખલ કરો</h3>
                            <p className="text-xs leading-relaxed text-slate-400 font-semibold">
                                "દસ્તાવેજ બનાવો" બટન ક્લિક કરી ફોર્મમાં જરૂરી વિગતો ભરો.
                            </p>
                        </div>

                        <div className="space-y-2 border-l-2 border-indigo-500 pl-4">
                            <span className="text-xs font-black text-indigo-400 font-sans uppercase">પગલું ૨</span>
                            <h3 className="text-base font-black text-white">લાઈવ પ્રીવ્યૂ તપાસો</h3>
                            <p className="text-xs leading-relaxed text-slate-400 font-semibold">
                                દસ્તાવેજનો ડ્રાફ્ટ વાંચીને તમામ વિગતો યોગ્ય હોવાની ખાતરી કરો.
                            </p>
                        </div>

                        <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                            <span className="text-xs font-black text-emerald-400 font-sans uppercase">પગલું ૩</span>
                            <h3 className="text-base font-black text-white">ડાઉનલોડ મેળવો</h3>
                            <p className="text-xs leading-relaxed text-slate-400 font-semibold">
                                લૉગિન કરીને DOCX અથવા PDF દસ્તાવેજ સુરક્ષિત ડાઉનલોડ કરો.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-xs text-slate-400 font-semibold">
                            તૈયાર છો? કોઈ અગાઉથી લૉગિન વિના તરત જ માહિતી ભરવાનું શરૂ કરી શકાય છે.
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateDocument}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg transition transform hover:scale-[1.02] active:scale-95 font-sans cursor-pointer"
                        >
                            🚀 દસ્તાવેજ બનાવવાનું શરૂ કરો
                        </button>
                    </div>
                </section>
            </main>

            {/* Footer Component */}
            <Footer onNavigate={onNavigate} />
        </div>
    );
};

export default TemplateLandingPage;
