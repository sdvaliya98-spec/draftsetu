import React from 'react';
import LegalPageLayout from '../components/LegalPageLayout.jsx';

/**
 * PrivacyPolicyPage — Dedicated hard-coded Privacy Policy for DraftSetu
 * Includes complete bilingual (English + Gujarati) coverage of all 17 required sections.
 */
const PrivacyPolicyPage = ({ onNavigate }) => {
    const tocItems = [
        { id: 'sec-1', titleEn: '1. Introduction', titleGu: '૧. પ્રસ્તાવના' },
        { id: 'sec-2', titleEn: '2. Information We Collect', titleGu: '૨. એકત્રિત કરવામાં આવતી માહિતી' },
        { id: 'sec-3', titleEn: '3. How We Use Information', titleGu: '૩. માહિતીનો ઉપયોગ' },
        { id: 'sec-4', titleEn: '4. Account & Authentication', titleGu: '૪. એકાઉન્ટ અને પ્રમાણીકરણ' },
        { id: 'sec-5', titleEn: '5. Google Sign-In Authentication', titleGu: '૫. ગૂગલ સાઇન-ઇન સેવા' },
        { id: 'sec-6', titleEn: '6. Document Generation & Drafting Data', titleGu: '૬. દસ્તાવેજ ડ્રાફ્ટિંગ અને ડેટા પ્રક્રિયા' },
        { id: 'sec-7', titleEn: '7. Payments, Orders & Wallet Credits', titleGu: '૭. ચુકવણીઓ, ઓર્ડર અને વોલેટ ક્રેડિટ્સ' },
        { id: 'sec-8', titleEn: '8. Data Security & Storage Safeguards', titleGu: '૮. ડેટા સુરક્ષા વ્યવસ્થા' },
        { id: 'sec-9', titleEn: '9. Cookies & Browser Local Storage', titleGu: '૯. કૂકીઝ અને બ્રાઉઝર લોકલ સ્ટોરેજ' },
        { id: 'sec-10', titleEn: '10. Data Retention Policy', titleGu: '૧૦. ડેટા સંગ્રહ અને જાળવણી સમયગાળો' },
        { id: 'sec-11', titleEn: '11. Data & Account Deletion Requests', titleGu: '૧૧. એકાઉન્ટ અને ડેટા કાઢી નાખવાની વિનંતી' },
        { id: 'sec-12', titleEn: '12. Third-Party Service Providers', titleGu: '૧૨. તૃતીય-પક્ષ સેવાઓ' },
        { id: 'sec-13', titleEn: '13. User Rights & Privacy Choices', titleGu: '૧૩. વપરાશકર્તાના કાનૂની અધિકારો' },
        { id: 'sec-14', titleEn: '14. Children’s Privacy (Age Limit)', titleGu: '૧૪. બાળકોની ગોપનીયતા (વય મર્યાદા)' },
        { id: 'sec-15', titleEn: '15. Amendments to This Policy', titleGu: '૧૫. ગોપનીયતા નીતિમાં સુધારાઓ' },
        { id: 'sec-16', titleEn: '16. Grievance Redressal & Contact', titleGu: '૧૬. ફરિયાદ નિવારણ અને સંપર્ક' },
        { id: 'sec-17', titleEn: '17. Effective Date & Acknowledgement', titleGu: '૧૭. અમલીકરણ તારીખ અને સ્વીકૃતિ' }
    ];

    return (
        <LegalPageLayout
            titleEn="Privacy Policy"
            titleGu="ગોપનીયતા નીતિ (Privacy Policy)"
            subtitleEn="How DraftSetu collects, protects, uses, and manages your personal and legal document drafting information."
            subtitleGu="ડ્રાફ્ટસેતુ પ્લેટફોર્મ પર તમારી વ્યક્તિગત માહિતી અને દસ્તાવેજ ડેટાનું રક્ષણ, ઉપયોગ અને વ્યવસ્થાપન કેવી રીતે કરવામાં આવે છે તેની વિગતવાર નીતિ."
            effectiveDate="06 September 2026"
            lastUpdated="06 September 2026"
            pageType="Privacy Policy"
            seoTitle="Privacy Policy | DraftSetu"
            tocItems={tocItems}
            onNavigate={onNavigate}
        >
            {/* Section 1 */}
            <article id="sec-1" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">1</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Introduction</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧. પ્રસ્તાવના</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            Welcome to <strong>DraftSetu</strong> (&quot;Platform&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). We are committed to protecting the privacy, confidentiality, and security of individuals who access or use our legal document automation and blueprint generation software services.
                        </p>
                        <p>
                            This Privacy Policy explains what personal data and drafting information we collect, why we collect it, how it is handled and secured, and your choices and rights regarding your personal information. By registering an account, accessing the Platform, or generating documents through DraftSetu, you acknowledge the data handling practices described in this document.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            <strong>ડ્રાફ્ટસેતુ</strong> (&quot;પ્લેટફોર્મ&quot; અથવા &quot;અમે&quot;) પર તમારું સ્વાગત છે. અમે અમારા કાનૂની દસ્તાવેજ ઓટોમેશન અને બ્લુપ્રિન્ટ જનરેશન સોફ્ટવેરનો ઉપયોગ કરતા તમામ વપરાશકર્તાઓની વ્યક્તિગત માહિતી, ગોપનીયતા અને સુરક્ષાનું રક્ષણ કરવા માટે સંપૂર્ણપણે કટિબદ્ધ છીએ.
                        </p>
                        <p>
                            આ પ્રાઇવસી પોલિસી સ્પષ્ટ કરે છે કે અમે કઈ માહિતી એકત્રિત કરીએ છીએ, તેનો ઉપયોગ કેવી રીતે થાય છે, તેનો સંગ્રહ કેવી રીતે કરવામાં આવે છે અને તમારી માહિતી અંગે તમારા અધિકારો શું છે. ડ્રાફ્ટસેતુનો ઉપયોગ કરીને, તમે આ પોલિસીમાં દર્શાવેલ નિયમો સ્વીકારો છો.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 2 */}
            <article id="sec-2" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">2</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Information We Collect</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૨. એકત્રિત કરવામાં આવતી માહિતી</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>We collect information in the following categories to provide functional document automation services:</p>
                        <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                            <li><strong>Account & Profile Information:</strong> Full name, username, email address, mobile phone number, birth date, city, and secure hashed password.</li>
                            <li><strong>Document Drafting Inputs:</strong> Specific data fields entered into document drafting forms to populate templates, which may include buyer/seller names, father/husband names, residential addresses, PAN identifiers, Aadhaar numbers, land/property survey numbers, TP/FP numbers, sub-registrar jurisdiction, consideration amounts, and execution dates.</li>
                            <li><strong>Transaction & Wallet Records:</strong> Credit purchase records, order identifiers, transaction amounts, credit consumption telemetry, and payment reference numbers.</li>
                            <li><strong>Technical & Telemetry Data:</strong> IP address, browser type and version, operating system, session timestamps, and operational error logs for service diagnostics.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>અમે સેવા પ્રદાન કરવા માટે નીચે મુજબની વિગતો મેળવીએ છીએ:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong>ખાતાની વિગતો:</strong> પૂરું નામ, યુઝરનેમ, ઈમેલ, મોબાઈલ નંબર, જન્મ તારીખ, શહેર અને સુરક્ષિત હેશ પાસવર્ડ.</li>
                            <li><strong>દસ્તાવેજ ડેટા:</strong> ખરીદનાર-વેચનારના નામ, સરનામાં, પાન નંબર, આધાર વિગત, સર્વે/ટીપી નંબર, મિલકતની વિગતો, અવેજ રકમ અને લખાણની તારીખો.</li>
                            <li><strong>ચુકવણી અને વોલેટ રેકોર્ડ્સ:</strong> ક્રેડિટ ખરીદી, ઓર્ડર આઈડી, ટ્રાન્ઝેક્શન આઈડી અને ક્રેડિટ વપરાશની વિગતો.</li>
                            <li><strong>તકનીકી માહિતી:</strong> આઈપી (IP) એડ્રેસ, બ્રાઉઝર વિગતો અને સુરક્ષા લોગ્સ.</li>
                        </ul>
                    </div>
                </div>
            </article>

            {/* Section 3 */}
            <article id="sec-3" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">3</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">How We Use Information</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૩. માહિતીનો ઉપયોગ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>We use the collected information exclusively for legitimate service operations, including:</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li>Populating dynamic fields in selected legal document templates and generating DOCX and PDF files.</li>
                            <li>Managing user authentication, sessions, profile updates, and password recovery.</li>
                            <li>Calculating and deducting wallet credits based on document template requirements.</li>
                            <li>Providing user draft storage (&quot;My Documents Vault&quot;) and maintaining draft recovery states.</li>
                            <li>Ensuring platform security, fraud prevention, abuse detection, and system maintenance.</li>
                            <li>DraftSetu does <strong>not</strong> sell, rent, or trade your personal or document data to third-party advertisers.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>અમે એકત્રિત કરેલી માહિતીનો ઉપયોગ નીચે મુજબ કરીએ છીએ:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>તમે પસંદ કરેલ ટેમ્પલેટમાં વિગતો ભરીને કાનૂની ડ્રાફ્ટ (DOCX અને PDF) તૈયાર કરવા.</li>
                            <li>એકાઉન્ટ લોગિન, પ્રોફાઇલ અપડેટ અને પાસવર્ડ રીસેટ કરવા.</li>
                            <li>વોલેટ ક્રેડિટની ગણતરી અને કપાત કરવા.</li>
                            <li>&quot;મારું દસ્તાવેજ ફોલ્ડર&quot; (Vault) માં ડ્રાફ્ટ સુરક્ષિત રાખવા.</li>
                            <li>ડ્રાફ્ટસેતુ તમારી અંગત માહિતી અથવા દસ્તાવેજનો ડેટા કોઈપણ તૃતીય પક્ષને વેચતું કે ભાડે આપતું નથી.</li>
                        </ul>
                    </div>
                </div>
            </article>

            {/* Section 4 */}
            <article id="sec-4" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">4</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Account Registration and Authentication</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૪. એકાઉન્ટ અને પ્રમાણીકરણ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            To access document generation features and save drafts, users must create an account. Passwords are encrypted using industry-standard cryptographic hashing algorithms (e.g. bcrypt/argon2) before storage. Plain-text passwords are never stored in our database and are never visible to our administrators.
                        </p>
                        <p>
                            Users are responsible for safeguarding their login credentials and maintaining the confidentiality of their account password.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            દસ્તાવેજ બનાવવા અને સાચવવા માટે એકાઉન્ટ જરૂરી છે. પાસવર્ડને મજબૂત એન્ક્રિપ્શન (Hashing) પદ્ધતિ દ્વારા સંગ્રહિત કરવામાં આવે છે. સાદો પાસવર્ડ ક્યારેય ડેટાબેઝમાં સંગ્રહિત થતો નથી કે કોઈ એડમિન જોઈ શકતા નથી.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 5 */}
            <article id="sec-5" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">5</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Google Sign-In Authentication</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૫. ગૂગલ સાઇન-ઇન સેવા</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            If you choose to authenticate using Google Sign-In (Google Identity Services), we receive basic profile information shared by Google, including your verified email address and full name.
                        </p>
                        <p>
                            DraftSetu does <strong>not</strong> receive or store your Google account password or gain access to your private Google Drive, Gmail, or other Google services. Authentication tokens issued by Google are verified securely on our backend solely to authenticate your identity.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            જો તમે ગૂગલ સાઇન-ઇનનો ઉપયોગ કરો છો, તો અમને ફક્ત તમારું ઈમેલ અને નામ મળે છે. ડ્રાફ્ટસેતુ તમારા ગૂગલ પાસવર્ડ કે અન્ય અંગત ડેટાની ઍક્સેસ મેળવતું નથી.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 6 */}
            <article id="sec-6" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">6</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Document Drafting and Generation Data</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૬. દસ્તાવેજ ડ્રાફ્ટિંગ અને ડેટા પ્રક્રિયા</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            When drafting documents (such as Sale Deeds, Agreement to Sell, Power of Attorney, Wills, Lease Agreements, Affidavits, and other blueprints), the information you type into form fields is processed to assemble the document output in DOCX format and render live PDF previews.
                        </p>
                        <p>
                            You retain ownership of the factual content and particulars you enter into your documents. DraftSetu processes this information strictly to carry out your document generation commands.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            દસ્તાવેજ બનાવતી વખતે તમે જે માહિતી ફોર્મમાં દાખલ કરો છો તેનો ઉપયોગ ફક્ત DOCX ફાઇલ બનાવવા અને PDF પ્રિવ્યૂ દર્શાવવા માટે થાય છે. તમારા દસ્તાવેજના ડેટા પર તમારો સંપૂર્ણ અધિકાર રહે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 7 */}
            <article id="sec-7" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">7</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Payments, Orders & Wallet Credits</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૭. ચુકવણીઓ, ઓર્ડર અને વોલેટ ક્રેડિટ્સ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            Online payments on DraftSetu are securely processed via <strong>Razorpay</strong>, an authorized, PCI-DSS compliant payment aggregator.
                        </p>
                        <p>
                            <strong>Important Security Clarification:</strong> DraftSetu does <strong>not</strong> collect, store, or have access to your full debit/credit card numbers, CVVs, expiry dates, NetBanking passwords, or UPI PINs. All sensitive payment interactions occur directly within Razorpay&apos;s encrypted payment interface. We receive and store only transaction confirmation records (Order ID, Payment ID, amount paid, and timestamp) to allocate wallet credits to your account.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ચુકવણી પ્રક્રિયા <strong>Razorpay</strong> પેમેન્ટ ગેટવે દ્વારા સુરક્ષિત રીતે થાય છે. ડ્રાફ્ટસેતુ તમારા ક્રેડિટ/ડેબિટ કાર્ડ નંબર, CVV કે UPI પિન સંગ્રહિત કરતું નથી. અમે ફક્ત વોલેટમાં ક્રેડિટ ઉમેરવા માટે પેમેન્ટ કન્ફર્મેશન (Order ID અને Payment ID) સાચવીએ છીએ.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 8 */}
            <article id="sec-8" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">8</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Data Security & Storage Safeguards</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૮. ડેટા સુરક્ષા વ્યવસ્થા</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We employ reasonable and customary technical, administrative, and physical security measures to safeguard user information against unauthorized access, loss, alteration, or disclosure. These measures include:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li>TLS/HTTPS encryption for data in transit across all client-server interactions.</li>
                            <li>Cryptographic password hashing and token-based authentication session controls.</li>
                            <li>Role-based administrative access controls with activity logging.</li>
                            <li>Automated periodic database backups.</li>
                        </ul>
                        <p className="text-xs text-slate-500 italic">
                            Note: While we implement industry-standard safeguards, no electronic transmission over the internet or data storage mechanism can be guaranteed to be 100% immune from security threats. Users are encouraged to maintain unique passwords and practice responsible device security.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            તમારી માહિતી સુરક્ષિત રાખવા માટે અમે TLS/HTTPS એન્ક્રિપ્શન, પાસવર્ડ હેશિંગ, ટોકન-આધારિત લોગિન અને ડેટાબેઝ બેકઅપ જેવી સુરક્ષા વ્યવસ્થાઓનો ઉપયોગ કરીએ છીએ.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 9 */}
            <article id="sec-9" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">9</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Cookies & Browser Local Storage</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૯. કૂકીઝ અને બ્રાઉઝર લોકલ સ્ટોરેજ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            DraftSetu utilizes browser <code>localStorage</code> and <code>sessionStorage</code> primarily to maintain your active login session, preserve temporary form inputs in case of unexpected browser refreshes (Session Recovery), and remember user interface preferences.
                        </p>
                        <p>
                            We do not use tracking cookies for cross-site behavioral advertising or tracking you across external websites.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ડ્રાફ્ટસેતુ બ્રાઉઝર લોકલ સ્ટોરેજનો ઉપયોગ લોગિન સેશન ચાલુ રાખવા અને અચાનક પેજ રિફ્રેશ થાય તો તમારા ફોર્મનો ડેટા સાચવી રાખવા (રિકવરી) માટે કરે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 10 */}
            <article id="sec-10" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">10</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Data Retention Policy</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૦. ડેટા સંગ્રહ અને જાળવણી સમયગાળો</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We retain user profile data and saved document drafts in your vault for as long as your account remains active. Transaction and payment logs are retained as required by financial, tax, and accounting compliance obligations under Indian law.
                        </p>
                        <p>
                            Temporary document previews and conversion artifacts are automatically purged periodically in accordance with server maintenance schedules.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            તમારા ડ્રાફ્ટ્સ જ્યાં સુધી તમારું એકાઉન્ટ સક્રિય રહે ત્યાં સુધી સાચવવામાં આવે છે. કામચલાઉ ફાઇલો સર્વર મેન્ટેનન્સ દરમિયાન આપમેળે સાફ કરવામાં આવે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 11 */}
            <article id="sec-11" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">11</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Data & Account Deletion Requests</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૧. એકાઉન્ટ અને ડેટા કાઢી નાખવાની વિનંતી</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            Users have the right to request deletion of their account and associated drafting records at any time. You can initiate a deletion request by contacting our support team at <strong>Contact@draftsetu.in</strong> from your registered email address.
                        </p>
                        <p>
                            Upon verification, your profile and saved drafts will be permanently deleted from our primary operational database, except where retention is mandated by applicable statutory accounting or tax laws.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            જો તમે તમારું એકાઉન્ટ અથવા ડ્રાફ્ટ ડેટા કાયમ માટે કાઢી નાખવા માંગતા હો, તો તમે અમારા સપોર્ટ ઈમેલ <strong>Contact@draftsetu.in</strong> પર સંપર્ક કરી શકો છો.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 12 */}
            <article id="sec-12" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">12</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Third-Party Service Providers</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૨. તૃતીય-પક્ષ સેવાઓ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We engage selected third-party service providers to facilitate essential platform capabilities:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li><strong>Razorpay:</strong> For secure payment gateway processing and transaction verification.</li>
                            <li><strong>Google Identity Services:</strong> For optional OAuth 2.0 single sign-on authentication.</li>
                            <li><strong>Cloud & Server Infrastructure:</strong> For hosting server software and secure database storage.</li>
                        </ul>
                        <p>
                            These third parties have access only to the minimal information necessary to perform their specialized functions and are governed by their respective privacy policies and contractual security standards.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            અમે ચુકવણી માટે Razorpay, લોગિન માટે Google OAuth અને સર્વર ઇન્ફ્રાસ્ટ્રક્ચર સેવાઓનો ઉપયોગ કરીએ છીએ, જે પોતપોતાની સુરક્ષા નીતિઓ હેઠળ કાર્ય કરે છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 13 */}
            <article id="sec-13" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">13</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">User Rights & Privacy Choices</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૩. વપરાશકર્તાના કાનૂની અધિકારો</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>Under applicable Indian data protection frameworks, you hold the following rights regarding your personal data:</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                            <li><strong>Right of Access:</strong> You can review your profile information and saved drafts directly from the Platform.</li>
                            <li><strong>Right to Rectification:</strong> You can update inaccurate profile information (such as mobile number, city, or name) via the Profile settings.</li>
                            <li><strong>Right to Erasure:</strong> You can delete individual drafts from your vault or request account deletion.</li>
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            તમને તમારી માહિતી જોવાનો, પ્રોફાઇલમાં સુધારો કરવાનો અને બિનજરૂરી ડ્રાફ્ટ કાઢી નાખવાનો સંપૂર્ણ અધિકાર છે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 14 */}
            <article id="sec-14" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">14</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Children’s Privacy (Age Limit)</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૪. બાળકોની ગોપનીયતા (વય મર્યાદા)</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            DraftSetu is a professional legal document drafting tool designed exclusively for adults (18 years of age or older) who are legally competent to enter into contracts under the Indian Contract Act, 1872. We do not knowingly solicit or collect personal information from individuals under 18 years of age.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            ડ્રાફ્ટસેતુ ૧૮ વર્ષ કે તેથી વધુ ઉંમરના પુખ્ત વ્યક્તિઓ માટે છે જે કાયદેસર રીતે કરાર કરવા સક્ષમ છે. અમે ૧૮ વર્ષથી નાની ઉંમરના બાળકોની માહિતી એકત્રિત કરતા નથી.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 15 */}
            <article id="sec-15" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">15</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Amendments to This Policy</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૫. ગોપનીયતા નીતિમાં સુધારાઓ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            We may periodically update this Privacy Policy to reflect technological improvements, statutory updates, or operational changes. When updates are published, the revised version will be posted on this page with an updated &quot;Last Updated&quot; and &quot;Effective Date&quot; indicator. Continued use of the Platform after changes are posted constitutes acceptance of the revised terms.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            અમે સમયાંતરે આ પ્રાઇવસી પોલિસીમાં ફેરફાર કરી શકીએ છીએ. સુધારેલી નીતિ આ પૃષ્ઠ પર ઉપલબ્ધ રહેશે.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 16 */}
            <article id="sec-16" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">16</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Grievance Redressal & Contact Information</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૬. ફરિયાદ નિવારણ અને સંપર્ક</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            If you have questions, feedback, or privacy concerns, please contact our designated Grievance Officer:
                        </p>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 font-mono text-xs">
                            <div><strong>Entity Name:</strong> DraftSetu</div>
                            <div><strong>Platform:</strong> DraftSetu Legal Automation</div>
                            <div><strong>Support & Grievance Email:</strong> <span className="text-blue-700 font-bold">Contact@draftsetu.in</span></div>
                            <div><strong>Office Address:</strong> [OFFICIAL ADDRESS]</div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            કોઈપણ પ્રશ્ન કે ફરિયાદ માટે કૃપા કરીને <strong>Contact@draftsetu.in</strong> પર અમારો સંપર્ક કરો.
                        </p>
                    </div>
                </div>
            </article>

            {/* Section 17 */}
            <article id="sec-17" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">17</span>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 font-outfit">Effective Date & Acknowledgement</h2>
                        <h3 className="text-xs font-bold text-slate-500 font-gujarati">૧૭. અમલીકરણ તારીખ અને સ્વીકૃતિ</h3>
                    </div>
                </div>

                <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">English</span>
                        <p>
                            This Privacy Policy is effective as of <strong>06 September 2026</strong> and applies to all active users, registered accounts, and document sessions created on DraftSetu.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 font-gujarati text-slate-700">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">ગુજરાતી સંસ્કરણ</span>
                        <p>
                            આ પોલિસી <strong>06 September 2026</strong> થી અમલમાં છે અને ડ્રાફ્ટસેતુના તમામ સક્રિય વપરાશકર્તાઓને લાગુ પડે છે.
                        </p>
                    </div>
                </div>
            </article>
        </LegalPageLayout>
    );
};

export default PrivacyPolicyPage;
