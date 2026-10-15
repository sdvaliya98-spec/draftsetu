import React from 'react';
import Footer from '../components/Footer.jsx';

// Configurable Official Support & Social Channels
export const DRAFTSETU_SUPPORT_PHONE = '7861029433';
export const DRAFTSETU_SUPPORT_EMAIL = 'contact@draftsetu.in';
export const DRAFTSETU_WHATSAPP_NUMBER = '917861029433';
export const DRAFTSETU_WHATSAPP_PREFILLED_MSG = 'નમસ્તે DraftSetu સપોર્ટ, મને કાનૂની દસ્તાવેજ / પ્લેટફોર્મ સેવાઓ અંગે સહાય જોઈએ છે. (Hello DraftSetu Support, I need assistance with legal documents / services.)';
export const DRAFTSETU_WHATSAPP_URL = `https://wa.me/${DRAFTSETU_WHATSAPP_NUMBER}?text=${encodeURIComponent(DRAFTSETU_WHATSAPP_PREFILLED_MSG)}`;

// Configurable Telegram Group / Channel URL (Official DraftSetu Telegram)
export const DRAFTSETU_TELEGRAM_GROUP_URL = 'https://t.me/draftsetu';

export const isPlaceholderTelegram = (url) => {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase().trim();
    return (
        lower.includes('placeholder') ||
        lower.includes('example') ||
        lower.includes('your_channel') ||
        lower.includes('your_group') ||
        lower.includes('channel_name') ||
        lower.includes('group_name') ||
        lower === 'https://t.me' ||
        lower === 'https://t.me/' ||
        lower === 'http://t.me' ||
        lower === 'http://t.me/' ||
        lower === 't.me' ||
        lower === 't.me/'
    );
};

export const extractTelegramUrl = (content) => {
    if (!content || typeof content !== 'string') return null;

    // 1. Check for href="..." with telegram domain
    const hrefMatch = content.match(/href=["']([^"']*(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+\-?=&%]+)["']/i);
    if (hrefMatch && hrefMatch[1]) {
        let url = hrefMatch[1].trim();
        if (!url.startsWith('http')) url = 'https://' + url.replace(/^\/+/, '');
        if (!isPlaceholderTelegram(url)) return url;
    }

    // 2. Check for https://t.me/... or http://t.me/...
    const fullMatch = content.match(/https?:\/\/(?:t\.me|telegram\.me)\/[a-zA-Z0-9_+\-?=&%]+/i);
    if (fullMatch && fullMatch[0]) {
        const url = fullMatch[0].trim();
        if (!isPlaceholderTelegram(url)) return url;
    }

    // 3. Check for plaintext t.me/handle
    const shortMatch = content.match(/(?:^|[\s"'>])(?:www\.)?t\.me\/([a-zA-Z0-9_+\-?=&%]+)/i);
    if (shortMatch && shortMatch[1]) {
        const url = `https://t.me/${shortMatch[1].trim()}`;
        if (!isPlaceholderTelegram(url)) return url;
    }

    return null;
};

export const renderContactContent = (rawContent) => {
    let telegramUrl = extractTelegramUrl(rawContent);

    // If no custom URL is embedded in rawContent, fall back to official DRAFTSETU_TELEGRAM_GROUP_URL
    // unless explicitly disabled or placeholder
    const isExplicitlyAbsent = rawContent && typeof rawContent === 'string' && (
        /data-telegram=["'](?:none|disabled|false|coming-soon)["']/i.test(rawContent) ||
        /<!--\s*no-telegram\s*-->/i.test(rawContent)
    );

    if (!telegramUrl && !isExplicitlyAbsent && DRAFTSETU_TELEGRAM_GROUP_URL && !isPlaceholderTelegram(DRAFTSETU_TELEGRAM_GROUP_URL)) {
        telegramUrl = DRAFTSETU_TELEGRAM_GROUP_URL;
    }

    const isTelegramActive = Boolean(telegramUrl && !isPlaceholderTelegram(telegramUrl));

    // Determine channel vs group label from content
    const isChannel = rawContent && /channel|ચેનલ/i.test(rawContent);
    const tgTypeLabel = isChannel ? 'Channel' : 'Group';
    const tgTypeGujarati = isChannel ? 'ચેનલ' : 'ગ્રુપ';

    let telegramHandleDisplay = '@draftsetu';
    if (telegramUrl) {
        try {
            const parsed = new URL(telegramUrl);
            const pathParts = parsed.pathname.replace(/^\//, '').split('/');
            if (pathParts[0]) {
                telegramHandleDisplay = pathParts[0].startsWith('+') ? pathParts[0] : `@${pathParts[0]}`;
            }
        } catch {
            telegramHandleDisplay = telegramUrl.replace(/^https?:\/\/(?:www\.)?t\.me\//, '@');
        }
    }

    // Extract any custom announcement or notes if present in rawContent
    let customAnnouncementHtml = '';
    if (rawContent && typeof rawContent === 'string') {
        const isFullDefaultTemplate = rawContent.includes('DraftSetu Customer Support') && rawContent.includes('grid-cols-1 md:grid-cols-2');
        if (!isFullDefaultTemplate && rawContent.trim().length > 0) {
            const sanitizedCustom = rawContent
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
            if (sanitizedCustom.trim().length > 0) {
                customAnnouncementHtml = `
                    <div class="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 text-slate-700 text-sm leading-relaxed mb-6 space-y-2">
                        <div class="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <span>📌</span>
                            <span>એડમિન સૂચના (Admin Notice &amp; Information)</span>
                        </div>
                        <div class="prose max-w-none text-slate-700 text-xs sm:text-sm">
                            ${sanitizedCustom}
                        </div>
                    </div>
                `;
            }
        }
    }

    return `
        <div class="space-y-8">
            <div class="border-b border-slate-150 pb-5">
                <h2 class="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight">DraftSetu Customer Support</h2>
                <p class="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
                    પ્લેટફોર્મ, એપ્લિકેશન, અથવા કાનૂની દસ્તાવેજ ડિઝાઇન અંગે કોઈપણ સહાય માટે સંપર્ક કરો.
                </p>
            </div>

            ${customAnnouncementHtml}

            <!-- Official Contact Information Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                <!-- 1. Mobile & WhatsApp Direct Support Card -->
                <div class="bg-gradient-to-br from-blue-50/70 via-emerald-50/30 to-white border border-blue-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div class="space-y-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-xs font-bold uppercase tracking-wider">
                                <span>📞</span>
                                <span>સત્તાવાર મોબાઇલ</span>
                            </span>
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold uppercase tracking-wider">
                                <span>💬</span>
                                <span>WhatsApp સપોર્ટ</span>
                            </span>
                        </div>
                        <h3 class="text-lg font-black text-slate-800">Phone &amp; WhatsApp Direct Chat</h3>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            કૉલ અથવા ડાયરેક્ટ WhatsApp ચેટ દ્વારા ત્વરિત સહાય અને પૂછપરછ માટે સંપર્ક કરો.
                        </p>
                        <div class="pt-1">
                            <a
                                href="tel:${DRAFTSETU_SUPPORT_PHONE}"
                                class="inline-flex items-center gap-2.5 text-xl font-black text-blue-900 hover:text-blue-700 tracking-wide font-sans no-underline transition-colors"
                                title="Call ${DRAFTSETU_SUPPORT_PHONE}"
                            >
                                <span class="text-2xl">📞</span>
                                <span>${DRAFTSETU_SUPPORT_PHONE}</span>
                            </a>
                        </div>
                    </div>
                    <div class="pt-4 mt-4 border-t border-blue-100/80 space-y-2.5">
                        <!-- WhatsApp Button -->
                        <a
                            href="${DRAFTSETU_WHATSAPP_URL}"
                            target="_blank"
                            rel="noopener noreferrer"
                            id="btn-contact-whatsapp"
                            class="inline-flex items-center justify-center gap-2.5 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs no-underline text-center cursor-pointer"
                            title="Chat on WhatsApp with DraftSetu Official Support"
                        >
                            <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.587 1.777.876 2.796.877 3.18 0 5.767-2.587 5.768-5.766 0-3.181-2.587-5.766-5.768-5.766zm3.364 8.213c-.144.405-.837.774-1.17.824-.312.045-.694.06-2.115-.527-1.44-.596-2.39-2.03-2.463-2.126-.073-.097-.587-.78-.587-1.488 0-.708.371-1.056.503-1.199.132-.144.29-.18.388-.18.096 0 .193.001.277.006.09.004.21-.034.329.251.121.29.414 1.01.45 1.083.036.073.06.157.012.253-.048.096-.072.156-.144.24-.072.084-.153.187-.218.252-.073.072-.149.15-.064.295.084.145.375.619.805 1.002.553.493 1.02.646 1.164.718.144.072.229.06.313-.036.084-.097.362-.421.458-.565.097-.145.193-.12.325-.073.133.048.845.398.99.47.144.072.24.108.277.169.036.06.036.349-.108.754zM12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5.006L2 22l5.16-1.354A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                            </svg>
                            <span>WhatsApp પર મેસેજ કરો (Chat on WhatsApp)</span>
                        </a>
                        <!-- Call Now Button -->
                        <a
                            href="tel:${DRAFTSETU_SUPPORT_PHONE}"
                            id="btn-contact-call"
                            class="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs no-underline text-center cursor-pointer"
                        >
                            <span>📞</span>
                            <span>કૉલ કરો (Call Now)</span>
                        </a>
                    </div>
                </div>

                <!-- 2. Telegram Official Group/Channel Card -->
                <div class="bg-gradient-to-br from-sky-50/70 to-white border border-sky-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div class="space-y-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-[#0077b5] rounded-full text-xs font-bold uppercase tracking-wider">
                                <span>📢</span>
                                <span>સત્તાવાર કોમ્યુનિટી</span>
                            </span>
                            ${isTelegramActive ? `
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <span>✓</span>
                                <span>Live</span>
                            </span>
                            ` : `
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <span>⏳</span>
                                <span>Coming Soon</span>
                            </span>
                            `}
                        </div>
                        <h3 class="text-lg font-black text-slate-800">Telegram Official ${tgTypeLabel}</h3>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            દસ્તાવેજ સુધારા, કાનૂની પરિપત્રો અને પ્લેટફોર્મ અપડેટ્સ માટે સત્તાવાર Telegram ${tgTypeGujarati}.
                        </p>
                        <div class="pt-1">
                            ${isTelegramActive ? `
                            <a
                                href="${telegramUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 text-base font-black text-[#0088cc] hover:text-[#0077b5] font-sans no-underline transition-colors break-all"
                                title="Join Official Telegram ${tgTypeLabel}"
                            >
                                <span class="text-xl">✈️</span>
                                <span>${telegramHandleDisplay}</span>
                            </a>
                            ` : `
                            <div class="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
                                <span class="text-xl">✈️</span>
                                <span class="font-sans text-xs bg-sky-50 text-slate-600 border border-sky-200/60 px-2.5 py-1 rounded-lg">@draftsetu (ટૂંક સમયમાં શરૂ થશે)</span>
                            </div>
                            `}
                        </div>
                    </div>
                    <div class="pt-4 mt-4 border-t border-sky-100">
                        ${isTelegramActive ? `
                        <a
                            href="${telegramUrl}"
                            target="_blank"
                            rel="noopener noreferrer"
                            id="btn-contact-telegram"
                            class="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs no-underline text-center cursor-pointer"
                            title="Join DraftSetu Telegram ${tgTypeLabel}"
                        >
                            <span>✈️</span>
                            <span>Telegram માં જોડાવો (Join Telegram ${tgTypeLabel})</span>
                        </a>
                        ` : `
                        <button
                            type="button"
                            disabled
                            id="btn-contact-telegram"
                            class="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs sm:text-sm font-bold cursor-not-allowed border border-slate-200 text-center select-none"
                            title="Telegram Community Group Coming Soon"
                        >
                            <span>✈️</span>
                            <span>Telegram ગ્રુપ (ટૂંક સમયમાં / Coming Soon)</span>
                        </button>
                        `}
                    </div>
                </div>

                <!-- 3. Email Support Card -->
                <div class="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div class="space-y-3">
                        <div class="inline-flex items-center gap-2 px-3 py-1 bg-slate-200/80 text-slate-800 rounded-full text-xs font-bold uppercase tracking-wider">
                            <span>📧</span>
                            <span>સંપર્ક વિગતો</span>
                        </div>
                        <h3 class="text-lg font-black text-slate-800">Email Support</h3>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            સામાન્ય પ્રશ્નો, દસ્તાવેજ સુધારા અને ટેકનિકલ સપોર્ટ માટે ઇમેઇલ કરો.
                        </p>
                        <div class="pt-1">
                            <a
                                href="mailto:${DRAFTSETU_SUPPORT_EMAIL}"
                                class="inline-flex items-center gap-2 text-base font-black text-blue-900 hover:text-blue-700 font-sans no-underline transition-colors break-all"
                                title="Send email to ${DRAFTSETU_SUPPORT_EMAIL}"
                            >
                                <span class="text-xl">✉️</span>
                                <span>${DRAFTSETU_SUPPORT_EMAIL}</span>
                            </a>
                        </div>
                    </div>
                    <div class="pt-4 mt-4 border-t border-slate-100">
                        <a
                            href="mailto:${DRAFTSETU_SUPPORT_EMAIL}"
                            id="btn-contact-email"
                            class="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs no-underline text-center cursor-pointer"
                        >
                            <span>✉️</span>
                            <span>ઇમેઇલ મોકલો (Send Email)</span>
                        </a>
                    </div>
                </div>

                <!-- 4. Office Address Card -->
                <div class="bg-gradient-to-br from-emerald-50/40 to-white border border-emerald-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div class="space-y-3">
                        <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-xs font-bold uppercase tracking-wider">
                            <span>🏢</span>
                            <span>કાર્યાલય સરનામું</span>
                        </div>
                        <h3 class="text-lg font-black text-slate-800">Office Address</h3>
                        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
                            અમારા સત્તાવાર કાર્યાલયનું સરનામું:
                        </p>
                        <div class="pt-1">
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=G13%2C+Krishna+Heights%2C+Kalikund+Saroda+Road%2C+382225"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex items-start gap-2.5 text-slate-700 hover:text-blue-900 text-sm font-semibold leading-relaxed no-underline transition-colors group cursor-pointer"
                                title="Open in Google Maps: G13, Krishna Heights, Kalikund Saroda Road, 382225"
                            >
                                <span class="text-xl text-emerald-700 shrink-0 mt-0.5 group-hover:scale-110 transition-transform">🏢</span>
                                <div class="space-y-0.5 font-sans">
                                    <div class="font-bold text-slate-900 group-hover:text-blue-900">G13, Krishna Heights,</div>
                                    <div class="group-hover:text-blue-900">Kalikund Saroda Road,</div>
                                    <div class="font-black text-emerald-900 group-hover:text-blue-900">382225</div>
                                </div>
                            </a>
                        </div>
                    </div>
                    <div class="pt-4 mt-4 border-t border-emerald-100">
                        <a
                            href="https://www.google.com/maps/search/?api=1&query=G13%2C+Krishna+Heights%2C+Kalikund+Saroda+Road%2C+382225"
                            target="_blank"
                            rel="noopener noreferrer"
                            id="btn-contact-maps"
                            class="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs no-underline text-center cursor-pointer"
                            title="Open G13, Krishna Heights, Kalikund Saroda Road, 382225 in Google Maps"
                        >
                            <span>📍</span>
                            <span>Google Maps પર જુઓ (Directions)</span>
                        </a>
                    </div>
                </div>

            </div>

            <!-- Operating Hours & Timings Section -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xs">
                <h3 class="text-base font-black text-slate-800 flex items-center gap-2">
                    <span>🕒</span>
                    <span>કામકાજના કલાકો અને પ્રતિસાદ સમય (Office Hours &amp; SLA)</span>
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs sm:text-sm font-semibold text-slate-600">
                    <div class="bg-white p-4 rounded-xl border border-slate-150 space-y-1">
                        <div class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">સપોર્ટ કલાકો (Timings)</div>
                        <div class="font-bold text-slate-800 text-sm">સવારે 10:00 થી સાંજે 05:00</div>
                        <div class="text-slate-500 text-xs">સોમવાર થી શુક્રવાર (Monday – Friday)</div>
                    </div>
                    <div class="bg-white p-4 rounded-xl border border-slate-150 space-y-1">
                        <div class="text-slate-400 font-bold uppercase text-[10px] tracking-wider">જવાબ સમય (Response Time)</div>
                        <div class="font-bold text-slate-800 text-sm">2 કાર્યકારી દિવસોમાં</div>
                        <div class="text-slate-500 text-xs">Within 2 working days via Email / WhatsApp / Phone</div>
                    </div>
                </div>
            </div>

            <!-- Important Notice Section -->
            <div class="border border-amber-200/80 bg-amber-50/50 rounded-2xl p-6 space-y-3">
                <h4 class="text-sm font-black text-amber-950 flex items-center gap-2 uppercase tracking-wide">
                    <span>📌</span>
                    <span>મહત્વપૂર્ણ નોંધ (Important Notice)</span>
                </h4>
                <ul class="list-disc pl-5 space-y-1.5 text-xs sm:text-sm font-semibold text-amber-900 leading-relaxed">
                    <li>આપ અમને ફોન (<strong>${DRAFTSETU_SUPPORT_PHONE}</strong>), WhatsApp (<strong>${DRAFTSETU_SUPPORT_PHONE}</strong>) અને ઈમેઇલ (<strong>${DRAFTSETU_SUPPORT_EMAIL}</strong>) દ્વારા સંપર્ક કરી શકો છો.</li>
                    <li>${isTelegramActive ? `સત્તાવાર Telegram માં જોડાવા માટે: <strong><a href="${telegramUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-900 underline">${telegramHandleDisplay}</a></strong>` : `નવા કાનૂની પરિપત્રો અને દસ્તાવેજ અપડેટ્સ માટે સત્તાવાર Telegram ગ્રુપ ટૂંક સમયમાં શરૂ કરવામાં આવશે.`}</li>
                    <li>કાર્યાલયની રૂબરૂ મુલાકાત માટે અગાઉથી ફોન અથવા WhatsApp દ્વારા સમય નક્કી કરવા વિનંતી છે.</li>
                    <li>આપના ઈમેઇલ અથવા મેસેજનો જવાબ સામાન્ય રીતે 2 કાર્યકારી દિવસોમાં આપવામાં આવે છે.</li>
                </ul>
                <div class="pt-2 text-xs font-bold text-amber-950">
                    આભાર! DraftSetu પર વિશ્વાસ રાખવા બદલ.
                </div>
            </div>
        </div>
    `;
};

export const getShareUrl = (slug) => {
    const cleanSlug = slug ? String(slug).trim().replace(/^\/?page:/, '').replace(/^\/+|\/+$/g, '') : '';
    if (typeof window === 'undefined') {
        return `https://draftsetu.in/${cleanSlug}`;
    }

    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
        return `${window.location.origin}/${cleanSlug}`;
    }

    // Production URL resolution
    return `https://draftsetu.in/${cleanSlug}`;
};

export const getShareTitle = (slug, pageData) => {
    if (slug === 'non-agricultural') {
        return 'બિનખેતી (NA) માર્ગદર્શિકા અને કાનૂની સહાય';
    }
    if (slug === 'contact') {
        return 'સંપર્ક માહિતી (Contact DraftSetu)';
    }
    if (pageData && pageData.title) {
        return `${pageData.title} - DraftSetu`;
    }
    return 'DraftSetu કાનૂની માર્ગદર્શિકા';
};

const StaticPageView = ({ slug, onNavigate }) => {
    const [page, setPage] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [copyToast, setCopyToast] = React.useState(false);

    const handleBack = () => {
        if (typeof onNavigate === 'function') {
            onNavigate('back');
        } else if (typeof window.handleNavigate === 'function') {
            window.handleNavigate('back');
        } else {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/';
            }
        }
    };

    const handleShare = async () => {
        const shareUrl = getShareUrl(slug);
        const shareTitle = getShareTitle(slug, page);
        const shareData = {
            title: page?.title || (slug === 'non-agricultural' ? 'બિનખેતી (NA) માર્ગદર્શિકા | DraftSetu' : 'DraftSetu'),
            text: `${shareTitle}:\n`,
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }
            }
        }

        // Fallback: Copy link
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setCopyToast(true);
                setTimeout(() => setCopyToast(false), 3000);
            } catch (e) { }
        }
    };

    const handleWhatsAppShare = () => {
        const shareUrl = getShareUrl(slug);
        const shareTitle = getShareTitle(slug, page);
        const message = `${shareTitle}:\n${shareUrl}`;
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    // Page SEO & Meta title management
    React.useEffect(() => {
        const setMetaTag = (attr, val, content) => {
            let el = document.querySelector(`meta[${attr}="${val}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, val);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
        }

        let robotsMeta = document.querySelector('meta[name="robots"]');
        if (!robotsMeta) {
            robotsMeta = document.createElement('meta');
            robotsMeta.setAttribute('name', 'robots');
            document.head.appendChild(robotsMeta);
        }
        const cleanSlug = slug ? String(slug).trim().replace(/^\/?page:/, '').replace(/^\/+|\/+$/g, '') : '';
        const defaultOgImage = 'https://draftsetu.in/logo.png';
        const pageCanonical = cleanSlug === 'non-agricultural'
            ? 'https://draftsetu.in/non-agricultural'
            : `https://draftsetu.in/${cleanSlug}`;

        if (cleanSlug) {
            canonicalLink.setAttribute('href', pageCanonical);
            robotsMeta.setAttribute('content', 'index, follow');
        }

        if (cleanSlug === 'non-agricultural') {
            const pageTitle = 'બિનખેતી (NA) માર્ગદર્શિકા | DraftSetu';
            const pageDesc = 'બિનખેતી (NA) જમીન ઉપયોગ માટેની સંપૂર્ણ માર્ગદર્શિકા, જરૂરી સોગંદનામા, અરજી પ્રક્રિયા અને કાનૂની સહાય.';
            document.title = pageTitle;
            setMetaTag('name', 'description', pageDesc);

            // OpenGraph & Twitter
            setMetaTag('property', 'og:title', pageTitle);
            setMetaTag('property', 'og:description', pageDesc);
            setMetaTag('property', 'og:url', pageCanonical);
            setMetaTag('property', 'og:type', 'article');
            setMetaTag('property', 'og:image', defaultOgImage);
            setMetaTag('name', 'twitter:card', 'summary');
            setMetaTag('name', 'twitter:title', pageTitle);
            setMetaTag('name', 'twitter:description', pageDesc);
            setMetaTag('name', 'twitter:image', defaultOgImage);
        } else if (cleanSlug === 'contact') {
            const pageTitle = 'સંપર્ક માહિતી (Contact DraftSetu) | DraftSetu';
            const pageDesc = 'DraftSetu ગ્રાહક સહાય અને સત્તાવાર સંપર્ક વિગતો: મોબાઇલ 7861029433, ઇમેઇલ contact@draftsetu.in, કાર્યાલય: G13, Krishna Heights, Kalikund Saroda Road, 382225.';
            document.title = pageTitle;
            setMetaTag('name', 'description', pageDesc);

            // OpenGraph & Twitter
            setMetaTag('property', 'og:title', pageTitle);
            setMetaTag('property', 'og:description', pageDesc);
            setMetaTag('property', 'og:url', pageCanonical);
            setMetaTag('property', 'og:type', 'website');
            setMetaTag('property', 'og:image', defaultOgImage);
            setMetaTag('name', 'twitter:card', 'summary');
            setMetaTag('name', 'twitter:title', pageTitle);
            setMetaTag('name', 'twitter:description', pageDesc);
            setMetaTag('name', 'twitter:image', defaultOgImage);
        } else if (page && page.title) {
            const pageTitle = `${page.title} | DraftSetu`;
            const customDesc = page.description || `DraftSetu પર ${page.title} માર્ગદર્શિકા વાંચો. નિયમો, પ્રક્રિયા અને પ્રમાણભૂત દસ્તાવેજોની સંપૂર્ણ કાનૂની વિગતો.`;
            document.title = pageTitle;
            setMetaTag('name', 'description', customDesc);

            // OpenGraph & Twitter
            setMetaTag('property', 'og:title', pageTitle);
            setMetaTag('property', 'og:description', customDesc);
            setMetaTag('property', 'og:url', pageCanonical);
            setMetaTag('property', 'og:type', 'article');
            setMetaTag('property', 'og:image', defaultOgImage);
            setMetaTag('name', 'twitter:card', 'summary');
            setMetaTag('name', 'twitter:title', pageTitle);
            setMetaTag('name', 'twitter:description', customDesc);
            setMetaTag('name', 'twitter:image', defaultOgImage);

            // FAQPage Schema Injection (when slug is 'faqs')
            if (cleanSlug === 'faqs') {
                const faqSchema = {
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": [
                        {
                            "@type": "Question",
                            "name": "DraftSetu શું સેવા પ્રદાન કરે છે?",
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": "DraftSetu એ ખાનગી કાનૂની ટેકનોલોજી પ્લેટફોર્મ છે જે દસ્તાવેજોના સચોટ અને ઝડપી ઓટોમેશન માટે વર્ડ ટેમ્પલેટ્સ પૂરા પાડે છે."
                            }
                        },
                        {
                            "@type": "Question",
                            "name": "શું મારા સેવ કરેલા ડ્રાફ્ટ સુરક્ષિત છે?",
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": "હા, તમારા કાનૂની ડ્રાફ્ટ્સ અત્યંત સુરક્ષિત એન્ક્રિપ્ટેડ કલાઉડ વોલ્ટ (My Documents) માં સેવ રહે છે અને માત્ર તમે જ તે એક્સેસ કરી શકો છો."
                            }
                        },
                        {
                            "@type": "Question",
                            "name": "શું અહીં તૈયાર કરેલા દસ્તાવેજો કાનૂની રીતે માન્ય છે?",
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": "DraftSetu તમને પ્રમાણિત કાનૂની ડ્રાફ્ટ્સ તૈયાર કરી આપે છે. તેને પૂર્ણ કાનૂની માન્યતા આપવા માટે સબ-રજીસ્ટ્રાર કચેરીએ નોધણી કરાવવી અને સ્ટેમ્પ ડ્યુટી ભરવી અનિવાર્ય છે."
                            }
                        }
                    ]
                };
                let faqScript = document.getElementById('schema-faq-page');
                if (!faqScript) {
                    faqScript = document.createElement('script');
                    faqScript.id = 'schema-faq-page';
                    faqScript.type = 'application/ld+json';
                    document.head.appendChild(faqScript);
                }
                faqScript.textContent = JSON.stringify(faqSchema, null, 2);
            }
        } else if (!loading && !page) {
            document.title = '404: પાનું મળ્યું નથી | DraftSetu';
            if (canonicalLink) canonicalLink.remove();
            if (!robotsMeta) {
                robotsMeta = document.createElement('meta');
                robotsMeta.setAttribute('name', 'robots');
                document.head.appendChild(robotsMeta);
            }
            robotsMeta.setAttribute('content', 'noindex, nofollow');
        }

        return () => {
            document.title = 'DraftSetu — Gujarati Legal Document Templates & DOCX/PDF';
            const defaultDesc = 'DraftSetu પર તૈયાર Gujarati legal document Templates પસંદ કરો, માહિતી દાખલ કરો, Live Preview તપાસો અને DOCX/PDF Document તૈયાર કરો.';
            setMetaTag('name', 'description', defaultDesc);
            setMetaTag('property', 'og:title', 'DraftSetu — Gujarati Legal Document Templates & DOCX/PDF');
            setMetaTag('property', 'og:description', defaultDesc);
            setMetaTag('property', 'og:url', 'https://draftsetu.in/');
            setMetaTag('property', 'og:type', 'website');
            setMetaTag('property', 'og:image', defaultOgImage);
            setMetaTag('name', 'twitter:card', 'summary');
            setMetaTag('name', 'twitter:title', 'DraftSetu — Gujarati Legal Document Templates & DOCX/PDF');
            setMetaTag('name', 'twitter:description', defaultDesc);
            setMetaTag('name', 'twitter:image', defaultOgImage);

            let restoredCanonical = document.querySelector('link[rel="canonical"]');
            if (!restoredCanonical) {
                restoredCanonical = document.createElement('link');
                restoredCanonical.setAttribute('rel', 'canonical');
                document.head.appendChild(restoredCanonical);
            }
            restoredCanonical.setAttribute('href', 'https://draftsetu.in/');
            const currentRobots = document.querySelector('meta[name="robots"]');
            if (currentRobots) {
                currentRobots.setAttribute('content', 'index, follow');
            }

            const faqScript = document.getElementById('schema-faq-page');
            if (faqScript) {
                faqScript.remove();
            }
        };
    }, [slug, page, loading]);

    React.useEffect(() => {
        if (!slug) {
            setPage(null);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const fetchPage = async () => {
            const cleanSlug = slug ? String(slug).trim().replace(/^\/?page:/, '').replace(/^\/+|\/+$/g, '') : '';
            if (cleanSlug === 'user-guide') {
                if (isMounted) {
                    setPage({
                        title: 'DraftSetu – Document Creation User Manual (દસ્તાવેજ નિર્માણ માર્ગદર્શિકા)',
                        content: `
                            <div class="space-y-6">
                                <p class="text-slate-700 text-sm md:text-base leading-relaxed">
                                    DraftSetu પ્લેટફોર્મ પર લોગિનથી લઈને દસ્તાવેજ પસંદગી, ડેટા એન્ટ્રી, લાઈવ પ્રિવ્યૂ, વોટરમાર્ક્ડ પીડીએફ વેરિફિકેશન, ક્રેડિટ્સ અને ફાઇનલ અધિકૃત DOCX/PDF ડાઉનલોડ સુધીની સંપૂર્ણ માર્ગદર્શિકા નીચે ઉપલબ્ધ છે.
                                </p>
                                <div class="flex flex-wrap gap-4 pt-2">
                                    <a href="/docs/DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition active:scale-95 no-underline">
                                        <span>📄 View / Open PDF in New Tab</span>
                                    </a>
                                    <a href="/docs/DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" download="DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition active:scale-95 no-underline">
                                        <span>📥 Download User Manual (PDF)</span>
                                    </a>
                                </div>
                                <div class="mt-6 border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100">
                                    <iframe src="/docs/DraftSetu_Document_Creation_User_Manual_Gujarati.pdf" class="w-full h-[700px] border-0" title="DraftSetu User Manual"></iframe>
                                </div>
                            </div>
                        `
                    });
                    setLoading(false);
                }
                return;
            }

            if (cleanSlug === 'non-agricultural') {
                if (isMounted) {
                    setPage({
                        title: 'બિનખેતી (NA) માર્ગદર્શિકા (Non-Agricultural Land Guide)',
                        content: `
                            <div class="space-y-6">
                                <p class="text-lg text-slate-700">ખેતીની જમીનને બિન-ખેતી (NA) ઉપયોગ (રહેણાંક, વાણિજ્યિક, અથવા ઔદ્યોગિક) માટે રૂપાંતરિત કરવા માટેની કાનૂની સહાય અને માર્ગદર્શિકા:</p>
                                <h2 class="text-2xl font-bold text-blue-900 border-b pb-2">અરજી અને દસ્તાવેજીકરણ તબક્કાઓ</h2>
                                <ol class="list-decimal pl-6 space-y-3 text-slate-600">
                                    <li><strong>જમીન માલિકી પુરાવા:</strong> ૭/૧૨, ૮-અ ઉતારા અને હક્ક પત્રકો તૈયાર કરો.</li>
                                    <li><strong>લે-આઉટ પ્લાનિંગ:</strong> એન્જિનિયર અથવા આર્કિટેક્ટ પાસે લે-આઉટ પ્લાન તૈયાર કરાવો.</li>
                                    <li><strong>ખરાઈ અને સબમિશન:</strong> સ્થાનિક સત્તામંડળ સમક્ષ ચોક્કસ ફી સાથે અરજી ફાઈલ કરો.</li>
                                    <li><strong>ફી અને પ્રીમિયમ ગણતરી:</strong> જો જમીન નવી શરતની હોય તો કલેક્ટરશ્રીની પરવાનગી અને પ્રીમિયમની ચૂકવણી જરૂરી બને છે.</li>
                                </ol>
                                <div class="p-5 bg-blue-50 rounded-2xl">
                                    <p class="font-bold text-blue-950">DraftSetu અરજી સહાય:</p>
                                    <p class="text-blue-900">તમે અમારા દસ્તાવેજ પ્રવાહનો ઉપયોગ કરીને સંબંધિત સોગંદનામા અને અરજી પત્રકો ઓટોમેટેડ રીતે જનરેટ કરી શકો છો.</p>
                                </div>

                                <!-- Professional Advocate Support Card -->
                                <div class="mt-8 border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl p-6 shadow-sm">
                                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                                        <div class="space-y-1.5">
                                            <div class="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-xs font-bold uppercase tracking-wider">
                                                <span>⚖️</span>
                                                <span>કાનૂની સહાય • Legal Assistance</span>
                                            </div>
                                            <h3 class="text-xl font-black text-slate-800">
                                                બિનખેતી (NA) માટે કાનૂની સહાય
                                            </h3>
                                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                Legal Assistance for Non-Agricultural (NA) Land
                                            </p>
                                            <div class="pt-2 text-sm text-slate-700 font-semibold space-y-0.5">
                                                <p class="text-base font-black text-blue-950">Advocate Prakash Solanki</p>
                                                <p class="text-xs text-slate-500 font-medium">અમદાવાદ • Ahmedabad</p>
                                            </div>
                                        </div>

                                        <div class="flex-shrink-0 pt-2 sm:pt-0">
                                            <a href="tel:7861029433" class="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all text-sm w-full sm:w-auto no-underline">
                                                <span class="text-base">📞</span>
                                                <span class="font-sans font-black tracking-wide">7861029433</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `
                    });
                    setLoading(false);
                }
                return;
            }

            try {
                if (typeof window.apiFetch === 'function') {
                    const r = await window.apiFetch(`/api/pages/${cleanSlug}`);
                    if (r && r.ok) {
                        const data = await r.json();
                        if (isMounted) {
                            if (data && typeof data === 'object' && !Array.isArray(data) && data.title) {
                                if (cleanSlug === 'contact') {
                                    setPage({
                                        ...data,
                                        title: data.title || 'સંપર્ક માહિતી (Contact DraftSetu)',
                                        content: renderContactContent(data.content)
                                    });
                                } else {
                                    setPage(data);
                                }
                            } else {
                                if (cleanSlug === 'contact') {
                                    setPage({
                                        title: 'સંપર્ક માહિતી (Contact DraftSetu)',
                                        content: renderContactContent('')
                                    });
                                } else {
                                    setPage(null);
                                }
                            }
                        }
                    } else {
                        if (isMounted) {
                            if (cleanSlug === 'contact') {
                                setPage({
                                    title: 'સંપર્ક માહિતી (Contact DraftSetu)',
                                    content: renderContactContent('')
                                });
                            } else {
                                setPage(null);
                            }
                        }
                    }
                } else {
                    if (isMounted) {
                        if (cleanSlug === 'contact') {
                            setPage({
                                title: 'સંપર્ક માહિતી (Contact DraftSetu)',
                                content: renderContactContent('')
                            });
                        } else {
                            setPage(null);
                        }
                    }
                }
            } catch (err) {
                if (isMounted) {
                    if (cleanSlug === 'contact') {
                        setPage({
                            title: 'સંપર્ક માહિતી (Contact DraftSetu)',
                            content: renderContactContent('')
                        });
                    } else {
                        setPage(null);
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPage();

        return () => {
            isMounted = false;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-gujarati">
                <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">માહિતી લોડ થઈ રહી છે...</p>
                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-gujarati">
                <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
                    <div className="text-center bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm max-w-sm w-full">
                        <div className="text-5xl mb-4">🔍</div>
                        <h3 className="text-lg font-black text-slate-800">પાનું મળ્યું નથી</h3>
                        <p className="text-xs text-slate-400 mt-1">આ સરનામે કોઈ માહિતી ઉપલબ્ધ નથી.</p>
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                &larr; પાછા જાઓ
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate && onNavigate('home')}
                                className="px-5 py-2.5 bg-blue-900 text-white hover:bg-blue-800 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer"
                            >
                                મુખ્ય પૃષ્ઠ
                            </button>
                        </div>
                    </div>
                </div>
                <Footer onNavigate={onNavigate} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50 font-gujarati">
            <div className="flex-1 max-w-5xl mx-auto w-full py-8 md:py-12 px-4 md:px-6 space-y-6">

                {/* Navigation Breadcrumb, Share & Back Bar */}
                <div className="flex flex-wrap gap-3 justify-between items-center no-print bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        <button
                            type="button"
                            onClick={() => onNavigate && onNavigate('home')}
                            className="hover:text-blue-900 transition flex items-center gap-1 cursor-pointer"
                        >
                            <span>🏠</span>
                            <span>મુખ્ય પૃષ્ઠ</span>
                        </button>
                        <span>&rarr;</span>
                        <span className="text-slate-700 font-black truncate max-w-[160px] sm:max-w-md">{page.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShare}
                            id="btn-share-page"
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-900 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:shadow transition active:scale-95 cursor-pointer"
                            title="Share link"
                        >
                            <span>🔗</span>
                            <span>શેર કરો</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleWhatsAppShare}
                            id="btn-whatsapp-share"
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl shadow-2xs hover:shadow transition active:scale-95 cursor-pointer"
                            title="Share on WhatsApp"
                        >
                            <span>💬</span>
                            <span>WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex items-center gap-1.5 text-xs font-black text-blue-900 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl shadow-2xs hover:shadow transition active:scale-95 cursor-pointer"
                        >
                            <span>&larr;</span>
                            <span>પાછા જાઓ</span>
                        </button>
                    </div>
                </div>

                {/* Main Article Container */}
                <article className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-10 shadow-sm space-y-8 animate-fade-in">
                    <header className="border-b border-slate-100 pb-6">
                        <h1 className="text-2xl md:text-3xl font-black text-blue-900 tracking-tight leading-tight">
                            {page.title}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">
                            ડ્રાફ્ટસેતુ પ્લેટફોર્મ માર્ગદર્શિકા • કાનૂની માહિતી પત્રક
                        </p>
                    </header>

                    {/* Rich HTML Content */}
                    <div
                        className="prose max-w-none text-slate-600 leading-relaxed font-semibold text-sm md:text-base space-y-4"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />
                </article>

                {/* Document Footer Disclaimer */}
                <div className="text-center text-[10px] text-slate-400 font-semibold no-print py-4">
                    આ પૃષ્ઠ પરની માહિતી છેલ્લે ૨૦ મે ૨૦૨૬ ના રોજ અપડેટ કરવામાં આવી હતી. કાયદાકીય ફેરફારો માટે સત્તાવાર ગેઝેટ જુઓ.
                </div>

            </div>

            {/* Custom Copy Toast */}
            {copyToast && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in border border-slate-700">
                    <span>📋</span>
                    <span>લિંક કૉપિ થઈ ગઈ છે! (Link copied to clipboard)</span>
                </div>
            )}

            {/* Reusable Site Footer */}
            <Footer onNavigate={onNavigate} />
        </div>
    );
};

// Global backward compatibility
window.StaticPageView = StaticPageView;
export default StaticPageView;

