import React from 'react';
import LegalPageLayout from '../components/LegalPageLayout.jsx';

/**
 * TermsOfServicePage — Dedicated hard-coded Terms of Service for DraftSetu
 * Includes complete bilingual (English + Gujarati) coverage of all 21 required sections.
 */
const TermsOfServicePage = ({ onNavigate }) => {
    const tocItems = [
        { id: 'sec-1', titleEn: '1. Acceptance of Terms', titleGu: '૧. સેવાની શરતોની સ્વીકૃતિ' },
        { id: 'sec-2', titleEn: '2. Description of DraftSetu Platform', titleGu: '૨. ડ્રાફ્ટસેતુ પ્લેટફોર્મનું વર્ણન' },
        { id: 'sec-3', titleEn: '3. User Accounts & Security', titleGu: '૩. વપરાશકર્તા એકાઉન્ટ અને સુરક્ષા' },
        { id: 'sec-4', titleEn: '4. User Responsibilities & Conduct', titleGu: '૪. વપરાશકર્તાની કાનૂની જવાબદારીઓ' },
        { id: 'sec-5', titleEn: '5. Accuracy of User-Supplied Data', titleGu: '૫. દાખલ કરેલ માહિતીની ચોકસાઈ' },
        { id: 'sec-6', titleEn: '6. Document Generation & Blueprint Tools', titleGu: '૬. દસ્તાવેજ જનરેશન અને બ્લુપ્રિન્ટ સાધનો' },
        { id: 'sec-7', titleEn: '7. Mandatory Legal Disclaimer', titleGu: '૭. અતિ મહત્વપૂર્ણ કાનૂની ડિસ્ક્લેમર' },
        { id: 'sec-8', titleEn: '8. Final Lock Feature & Verification', titleGu: '૮. અંતિમ લૉક (Final Lock) ફીચર અને ચકાસણી' },
        { id: 'sec-9', titleEn: '9. Credits, Payments & Orders', titleGu: '૯. વોલેટ ક્રેડિટ્સ, ચુકવણીઓ અને ઓર્ડર્સ' },
        { id: 'sec-10', titleEn: '10. Prohibited Uses & Conduct', titleGu: '૧૦. પ્રતિબંધિત પ્રવૃત્તિઓ અને ઉપયોગ' },
        { id: 'sec-11', titleEn: '11. Intellectual Property Rights', titleGu: '૧૧. બૌદ્ધિક સંપદા અધિકાર' },
        { id: 'sec-12', titleEn: '12. User-Provided Content Ownership', titleGu: '૧૨. વપરાશકર્તા સામગ્રીની માલિકી' },
        { id: 'sec-13', titleEn: '13. Privacy & Data Handling Reference', titleGu: '૧૩. ગોપનીયતા નીતિ સંદર્ભ' },
        { id: 'sec-14', titleEn: '14. Service Availability & Maintenance', titleGu: '૧૪. સેવાની ઉપલબ્ધતા અને મેન્ટેનન્સ' },
        { id: 'sec-15', titleEn: '15. Disclaimer of Warranties', titleGu: '૧૫. વોરંટીઓનો અસ્વીકાર (&quot;As-Is&quot; સેવા)' },
        { id: 'sec-16', titleEn: '16. Limitation of Liability', titleGu: '૧૬. કાનૂની જવાબદારીની મર્યાદા' },
        { id: 'sec-17', titleEn: '17. Account Suspension & Termination', titleGu: '૧૭. એકાઉન્ટ સસ્પેન્શન અને ટર્મિનેશન' },
        { id: 'sec-18', titleEn: '18. Amendments to Terms', titleGu: '૧૮. શરતોમાં સુધારાઓ' },
        { id: 'sec-19', titleEn: '19. Governing Law & Jurisdiction', titleGu: '૧૯. લાગુ કાયદો અને ન્યાયિક અધિકારક્ષેત્ર' },
        { id: 'sec-20', titleEn: '20. Support & Contact Information', titleGu: '૨૦. સપોર્ટ અને સંપર્ક વિગતો' },
        { id: 'sec-21', titleEn: '21. Effective Date & Acknowledgement', titleGu: '૨૧. અમલીકરણ તારીખ અને અંતિમ સ્વીકૃતિ' }
    ];

    return (
        <LegalPageLayout
            titleEn="Terms of Service"
            titleGu="સેવાની શરતો (Terms of Service)"
            subtitleEn="Standard terms, conditions, and legal operating framework governing your use of the DraftSetu document automation platform."
            subtitleGu="ડ્રાફ્ટસેતુ પ્લેટફોર્મના ઉપયોગને નિયંત્રિત કરતા પ્રમાણભૂત નિયમો, શરતો અને કાનૂની માળખું."
            effectiveDate="06 September 2026"
            lastUpdated="06 September 2026"
            pageType="Terms of Service"
            seoTitle="Terms of Service | DraftSetu"
            tocItems={tocItems}
            onNavigate={onNavigate}
        >
            {/* Section 1 */}
            <article id="sec-1" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">1</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Acceptance of Terms</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧. સેવાની શરતોની સ્વીકૃતિ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;) and <strong>DraftSetu</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                        </p>
                        <p>
                            By creating an account, accessing, browsing, or utilizing any drafting, template, wallet, or document generation service provided by DraftSetu, you expressly agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must immediately cease accessing and using the Platform.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            આ સેવાની શરતો (&quot;શરતો&quot;) તમારા અને <strong>ડ્રાફ્ટસેતુ</strong> વચ્ચેનો કાયદેસર કરાર છે. પ્લેટફોર્મનો ઉપયોગ કરીને, તમે આ શરતો અને અમારી ગોપનીયતા નીતિ સાથે સંપૂર્ણપણે સંમત થાઓ છો. જો તમે આ શરતો સ્વીકારતા નથી, તો તમારે પ્લેટફોર્મનો ઉપયોગ તાત્કાલિક બંધ કરવો જોઈએ.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 2 */}
            <article id="sec-2" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">2</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Description of DraftSetu Platform</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૨. ડ્રાફ્ટસેતુ પ્લેટફોર્મનું વર્ણન</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            DraftSetu is a web-based document automation software platform designed to assist users in assembling standardized legal document drafts and templates (including Sale Deeds, Deeds of Conveyance, Power of Attorney, Wills, Lease Agreements, Affidavits, and related legal blueprints).
                        </p>
                        <p>
                            The Platform provides template mapping, structured input forms, live document previews, and document generation in DOCX and PDF formats.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ડ્રાફ્ટસેતુ એ પ્રમાણિત કાનૂની દસ્તાવેજો (જેમ કે વેચાણ દસ્તાવેજ, બાનાખત, પાવર ઓફ એટર્ની, વસિયતનામું, ભાડા કરાર, સોગંદનામું વગેરે) તૈયાર કરવા માટેનું એક સોફ્ટવેર પ્લેટફોર્મ છે જે DOCX અને PDF ફોર્મેટમાં ડ્રાફ્ટ જનરેટ કરવાની સુવિધા આપે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 3 */}
            <article id="sec-3" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">3</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">User Accounts & Security</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૩. વપરાશકર્તા એકાઉન્ટ અને સુરક્ષા</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            Users must register an account to access document drafting, credit top-ups, and vault storage. You agree to provide accurate, current, and complete registration information and to maintain the security of your password and credentials.
                        </p>
                        <p>
                            You are solely responsible for all activities, drafting sessions, and transactions that occur under your account. You must notify us immediately of any unauthorized use or security compromise.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            દસ્તાવેજ બનાવવા અને વોલેટ ક્રેડિટ મેળવવા માટે એકાઉન્ટ બનાવવું જરૂરી છે. તમારા ખાતાના પાસવર્ડની સુરક્ષા અને ખાતા હેઠળ થતી તમામ પ્રવૃત્તિઓની સંપૂર્ણ જવાબદારી તમારી પોતાની રહેશે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 4 */}
            <article id="sec-4" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">4</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">User Responsibilities & Conduct</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૪. વપરાશકર્તાની કાનૂની જવાબદારીઓ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            You represent and warrant that you possess the requisite legal capacity under Indian law to enter into this agreement and that you have proper authority and legitimate interest in drafting the documents you create on the Platform.
                        </p>
                        <p>
                            You agree to use DraftSetu solely for lawful purposes and in strict compliance with applicable central, state, and local laws, regulations, and ethical guidelines.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            તમે ખાતરી આપો છો કે તમે કાયદેસર રીતે કરાર કરવા સક્ષમ છો અને ડ્રાફ્ટસેતુનો ઉપયોગ ફક્ત કાયદેસર હેતુઓ માટે અને ભારતીય કાયદા અનુસાર કરશો.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 5 */}
            <article id="sec-5" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">5</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Accuracy of User-Supplied Information</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૫. દાખલ કરેલ માહિતીની ચોકસાઈ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            The Platform automates the population of fields based entirely upon the data you input. You acknowledge and agree that you are solely and exclusively responsible for the factual accuracy, truthfulness, legal correctness, and completeness of all party names, addresses, survey numbers, property boundaries, consideration amounts, and terms entered into document forms.
                        </p>
                        <p>
                            DraftSetu does not independently verify the title of property, legal ownership, authenticity of PAN/Aadhaar numbers, or truthfulness of any facts entered by users.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            દસ્તાવેજમાં દાખલ કરવામાં આવતી તમામ માહિતી (જેમ કે પક્ષકારોના નામ, સરનામાં, સર્વે નંબરો, મિલકતની વિગતો અને રકમ) ની સત્યતા અને ચોકસાઈની સંપૂર્ણ જવાબદારી વપરાશકર્તાની રહેશે. ડ્રાફ્ટસેતુ મિલકતના ટાઇટલ કે વિગતોની આપમેળે ચકાસણી કરતું નથી.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 6 */}
            <article id="sec-6" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">6</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Document Generation & Blueprint Tools</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૬. દસ્તાવેજ જનરેશન અને બ્લુપ્રિન્ટ સાધનો</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            The Platform provides pre-configured standard blueprints that replace template tags with values entered by the user. Document previews and generated files are intended to serve as working drafts to assist you in drafting.
                        </p>
                        <p>
                            DraftSetu makes no representation that any standardized template is universally suitable for every transaction without customized review and tailoring.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            પ્લેટફોર્મ પર ઉપલબ્ધ ટેમ્પલેટ્સ સ્ટાન્ડર્ડ બ્લુપ્રિન્ટ્સ છે જે તમને ડ્રાફ્ટિંગમાં મદદ કરે છે. દરેક વ્યવહાર માટે જરૂરી વિગતો ચકાસીને યોગ્ય સુધારા કરવાની જવાબદારી તમારી છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 7 - CRITICAL LEGAL DISCLAIMER */}
            <article id="sec-7" className="bg-rose-50/70 rounded-3xl border-2 border-rose-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-rose-200 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-sm">7</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-rose-900 font-outfit">Important Legal Disclaimer — Not a Law Firm</h2>
                        <h3 className="text-xs font-bold text-rose-700 font-gujarati">૭. અતિ મહત્વપૂર્ણ કાનૂની ડિસ્ક્લેમર — કાનૂની સલાહ નથી</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-rose-950 leading-relaxed font-medium">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-200 text-rose-900 text-[11px] font-black uppercase tracking-wider">Crucial Notice</span>
                        <p>
                            <strong>DRAFTSETU IS A TECHNOLOGY AND SOFTWARE PLATFORM, NOT A LAW FIRM. DRAFTSETU DOES NOT PROVIDE LEGAL ADVICE, LEGAL OPINIONS, TITLE SEARCHES, ADVOCATE CONSULTATIONS, OR LEGAL REPRESENTATION.</strong>
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 text-rose-900">
                            <li>All documents, blueprints, previews, and generated files produced through DraftSetu are <strong>drafting blueprints and informational templates</strong> only.</li>
                            <li>Use of the Platform does <strong>not</strong> create an advocate-client relationship between you and DraftSetu or any of its operators.</li>
                            <li>Generated documents are <strong>not a substitute</strong> for professional advice, scrutiny, or legal counsel from a qualified advocate, lawyer, or certified legal practitioner.</li>
                            <li><strong>Mandatory Verification:</strong> Users are strictly required to thoroughly review, verify, and confirm all documents, clauses, boundaries, and figures before use, signing, notarization, stamp duty payment, or legal filing before Sub-Registrars, Revenue Offices, Courts, or any government authority.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-white/80 rounded-2xl border border-rose-200 space-y-2 font-gujarati text-rose-900">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ (મહત્વપૂર્ણ)</span>
                        <p>
                            <strong>ડ્રાફ્ટસેતુ એ સોફ્ટવેર અને ટેકનોલોજી પ્લેટફોર્મ છે, કોઈ કાયદાકીય પેઢી (Law Firm) નથી. ડ્રાફ્ટસેતુ કોઈપણ પ્રકારની કાનૂની સલાહ (Legal Advice) આપતું નથી.</strong>
                        </p>
                        <p>
                            તૈયાર થયેલા દસ્તાવેજો માત્ર ડ્રાફ્ટ બ્લુપ્રિન્ટ છે અને તે વકીલશ્રીની કાનૂની સલાહનો વિકલ્પ નથી. દસ્તાવેજ પર સહી કરતા પહેલા, સ્ટેમ્પ ડ્યુટી ભરતા પહેલા અથવા સબ-રજિસ્ટ્રાર કચેરીમાં નોંધણી કરાવતા પહેલા યોગ્ય કાનૂની નિષ્ણાત અથવા વકીલશ્રી દ્વારા તેની ચકાસણી કરાવી લેવી ફરજિયાત છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 8 */}
            <article id="sec-8" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">8</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Final Lock Feature & Document Finalization</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૮. અંતિમ લૉક (Final Lock) ફીચર અને ચકાસણી</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            The Platform includes a <strong>Final Lock (અંતિમ લૉક)</strong> feature that finalizes the document draft and records it as complete in your account.
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li>Executing Final Lock requires explicit confirmation through our custom confirmation modal.</li>
                            <li>Once a document is finalized and locked, it cannot be further modified in the active editor session without generating a new document draft.</li>
                            <li>Users are strictly required to verify all entered information and preview the document thoroughly prior to executing the Final Lock action.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            <strong>અંતિમ લૉક (Final Lock):</strong> આ ફીચર દ્વારા દસ્તાવેજને ફાઇનલ કરવામાં આવે છે. એકવાર દસ્તાવેજ લૉક થયા પછી તેમાં ફેરફાર કરી શકાતો નથી. તેથી અંતિમ લૉક કરતા પહેલા બધી માહિતી કાળજીપૂર્વક ચકાસી લેવી જરૂરી છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 9 */}
            <article id="sec-9" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">9</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Credits, Payments & Orders</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૯. વોલેટ ક્રેડિટ્સ, ચુકવણીઓ અને ઓર્ડર્સ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            Document generation and finalization features operate on a credit-based system.
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li>Credit top-up packages and applicable pricing are displayed transparently in the Wallet Dashboard prior to payment.</li>
                            <li>Payments are processed securely through Razorpay.</li>
                            <li>Purchases and credit allocations are governed by the specific terms and pricing presented at the time of transaction and applicable Indian financial laws.</li>
                            <li>Credits are non-transferable between accounts and can only be redeemed for document automation services on DraftSetu.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            દસ્તાવેજ ડાઉનલોડ કરવા માટે વોલેટ ક્રેડિટ સિસ્ટમ લાગુ પડે છે. ચુકવણી સમયે દર્શાવેલ પેકેજ અને કિંમતો માન્ય રહેશે. ચુકવણી Razorpay દ્વારા સુરક્ષિત રીતે થાય છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 10 */}
            <article id="sec-10" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">10</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Prohibited Uses & Conduct</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૦. પ્રતિબંધિત પ્રવૃત્તિઓ અને ઉપયોગ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>When using DraftSetu, you agree NOT to:</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li>Create forged, counterfeit, fraudulent, misleading, or deceptive documents.</li>
                            <li>Impersonate any person or entity or enter falsified Aadhaar, PAN, or identity records.</li>
                            <li>Attempt to reverse engineer, decompile, crawl, or extract platform source code, APIs, or proprietary blueprint templates.</li>
                            <li>Circumvent or tamper with credit verification, wallet accounting, authentication, or security mechanisms.</li>
                            <li>Interfere with platform operations or introduce malicious software, scripts, or automated scraping bots.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ખોટા, કપટપૂર્ણ કે બનાવટી દસ્તાવેજો બનાવવા, અન્ય વ્યક્તિના નામે ખોટી વિગતો દાખલ કરવી, સિસ્ટમ સાથે છેડછાડ કરવી કે સોફ્ટવેરનું અનધિકૃત કૉપી કરવું સખત પ્રતિબંધિત છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 11 */}
            <article id="sec-11" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">11</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Intellectual Property Rights</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૧. બૌદ્ધિક સંપદા અધિકાર</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            All software code, database architecture, design layouts, logos, trademarks, template engines, and automation workflows comprising DraftSetu are the exclusive intellectual property of <strong>DraftSetu</strong> and are protected under Indian copyright and trademark laws.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ડ્રાફ્ટસેતુ પ્લેટફોર્મ, સોફ્ટવેર કોડ, ડિઝાઇન અને લોગોની તમામ બૌદ્ધિક સંપદા (Intellectual Property) <strong>DraftSetu</strong> ની માલિકીની છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 12 */}
            <article id="sec-12" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">12</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">User-Provided Content Ownership</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૨. વપરાશકર્તા સામગ્રીની માલિકી</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            You retain full ownership and intellectual rights in the specific proprietary data, facts, names, and property details you input into the Platform. You grant DraftSetu a limited, non-exclusive license solely to process and display this data as needed to deliver your document generation services.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            તમે દાખલ કરેલી વિગતો અને માહિતી પર તમારો માલિકી હક રહેશે. અમે તેનો ઉપયોગ માત્ર દસ્તાવેજ તૈયાર કરવા માટે કરીએ છીએ.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 13 */}
            <article id="sec-13" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">13</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Privacy & Data Handling Reference</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૩. ગોપનીયતા નીતિ સંદર્ભ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            Your privacy is paramount to us. Our data collection, usage, and protection practices are detailed comprehensively in our separate <button type="button" onClick={() => onNavigate && onNavigate('/privacy-policy')} className="text-blue-600 font-bold underline cursor-pointer">Privacy Policy</button>, which is incorporated into these Terms by reference.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            અમારી ડેટા સુરક્ષા અને પ્રાઇવસી વ્યવસ્થા વિશે વધુ વિગતો માટે કૃપા કરીને અમારી પ્રાઇવસી પોલિસી જુઓ.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 14 */}
            <article id="sec-14" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">14</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Service Availability & Maintenance</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૪. સેવાની ઉપલબ્ધતા અને મેન્ટેનન્સ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We make reasonable commercial efforts to maintain reliable platform availability. However, we do not guarantee uninterrupted, continuous, or error-free service. Routine maintenance, server upgrades, or unexpected network failures may occasionally cause temporary interruptions.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            અમે પ્લેટફોર્મ સતત ઉપલબ્ધ રહે તે માટે પ્રયત્નશીલ છીએ, પરંતુ તકનીકી સુધારા કે મેન્ટેનન્સ દરમિયાન સેવા અસ્થાયી રૂપે બંધ રહી શકે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 15 */}
            <article id="sec-15" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">15</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Disclaimer of Warranties</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૫. વોરંટીઓનો અસ્વીકાર (&quot;As-Is&quot; સેવા)</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            DRAFTSETU AND ALL TEMPLATES, OUTPUTS, BLUEPRINTS, AND SERVICES ARE PROVIDED ON AN <strong>&quot;AS IS&quot;</strong> AND <strong>&quot;AS AVAILABLE&quot;</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR TRANSACTION, TITLE, OR LEGAL ENFORCEABILITY.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ડ્રાફ્ટસેતુ સેવાઓ અને ટેમ્પલેટ્સ &quot;જેવા છે તેવા&quot; (&quot;As-Is&quot;) ધોરણે પૂરા પાડવામાં આવે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 16 */}
            <article id="sec-16" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">16</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Limitation of Liability</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૬. કાનૂની જવાબદારીની મર્યાદા</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE INDIAN LAW, IN NO EVENT SHALL DRAFTSETU, ITS FOUNDERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS, LEGAL COSTS, REJECTION OF REGISTRATION, OR LOSS OF DATA) ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE PLATFORM.
                        </p>
                        <p>
                            OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE TOTAL FEES PAID BY YOU TO DRAFTSETU FOR THE SPECIFIC SERVICE OR TRANSACTION GIVING RISE TO SUCH CLAIM.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            કાયદા દ્વારા અનુમતિ પ્રાપ્ત મહત્તમ હદ સુધી, ડ્રાફ્ટસેતુ કોઈપણ આડકતરી કે પરિણામી નુકસાની માટે જવાબદાર રહેશે નહીં. અમારી મહત્તમ જવાબદારી સંબંધિત સેવા માટે તમે ચૂકવેલ રકમ સુધી મર્યાદિત રહેશે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 17 */}
            <article id="sec-17" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">17</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Account Suspension & Termination</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૭. એકાઉન્ટ સસ્પેન્શન અને ટર્મિનેશન</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We reserve the right to suspend or terminate your account or access to the Platform at our sole discretion, without prior notice, if you breach these Terms, engage in fraudulent activity, or misuse the document generation tools.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            શરતોનો ભંગ કરવા બદલ અથવા દુરુપયોગ બદલ એકાઉન્ટ સ્થગિત કે સમાપ્ત કરવાનો અધિકાર અમે અનામત રાખીએ છીએ.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 18 */}
            <article id="sec-18" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">18</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Amendments to Terms</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૮. શરતોમાં સુધારાઓ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We reserve the right to revise or update these Terms of Service at any time. Changes become effective immediately upon posting to this page. Continued access or use of DraftSetu after updates constitutes your agreement to the modified terms.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            અમે સમયાંતરે આ શરતોમાં સુધારો કરી શકીએ છીએ, જે આ પૃષ્ઠ પર ઉપલબ્ધ રહેશે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 19 */}
            <article id="sec-19" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">19</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Governing Law & Jurisdiction</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૯. લાગુ કાયદો અને ન્યાયિક અધિકારક્ષેત્ર</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            These Terms shall be governed by the applicable laws of India. The courts having appropriate jurisdiction shall have jurisdiction over disputes arising in connection with these Terms, subject to applicable law.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            આ શરતો ભારતના લાગુ પડતા કાયદાઓ દ્વારા સંચાલિત રહેશે. આ શરતો સંબંધિત કોઈપણ વિવાદ માટે લાગુ કાયદાને આધીન રહી યોગ્ય અધિકારક્ષેત્ર ધરાવતી અદાલતોને અધિકાર રહેશે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 20 */}
            <article id="sec-20" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">20</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Support & Contact Information</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૨૦. સપોર્ટ અને સંપર્ક વિગતો</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            For support inquiries, clarifications on these Terms, or technical assistance, please reach out to us:
                        </p>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 font-mono text-xs">
                            <div><strong>Entity Name:</strong> DraftSetu</div>
                            <div><strong>Platform:</strong> DraftSetu Legal Automation</div>
                            <div><strong>Support Email:</strong> <span className="text-blue-700 font-bold">Contact@draftsetu.in</span></div>
                            <div><strong>Office Address:</strong> [OFFICIAL ADDRESS]</div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            કોઈપણ પૂછપરછ માટે કૃપા કરીને <strong>Contact@draftsetu.in</strong> પર સંપર્ક કરો.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 21 */}
            <article id="sec-21" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">21</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Effective Date & Acknowledgement</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૨૧. અમલીકરણ તારીખ અને અંતિમ સ્વીકૃતિ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            These Terms of Service are effective as of <strong>06 September 2026</strong>. By continuing to access or use DraftSetu, you confirm that you have read, understood, and agreed to be legally bound by these Terms.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            આ સેવાની શરતો <strong>06 September 2026</strong> થી અમલમાં છે.
                        </p>
                    </div>
                </div>
            </article>
        </LegalPageLayout>
    );
};

export default TermsOfServicePage;
