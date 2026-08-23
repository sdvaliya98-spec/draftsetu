import json
from datetime import datetime, timezone
from backend.database import SessionLocal, engine
from backend import models

def seed_database():
    db = SessionLocal()
    try:
        # Reset existing menus and static pages to clear old government branding
        print("Clearing old menu items and static pages...")
        db.query(models.MenuItem).delete()
        db.query(models.StaticPage).delete()
        db.commit()
        
        # 1. Seed Menu Items
        print("Seeding new TheLegalSetu menu_items...")
        
        # Structure of menu: (label, url, icon, parent_id, order_index, is_active, type, template_id)
        menus = [
            ("HOME", "home", "🏠", None, 1, True, "page", None),
            ("DOCUMENT SERVICES", "#", "📝", None, 2, True, "dropdown", None),
            ("LEGAL SERVICES", "#", "⚖️", None, 3, True, "dropdown", None),
            ("MY DOCUMENTS", "documents", "📂", None, 4, True, "page", None),
            ("HELP CENTER", "#", "❓", None, 5, True, "dropdown", None),
            ("CONTACT", "page:contact", "📞", None, 6, True, "page", None)
        ]
        
        for label, url, icon, parent_id, order, active, mtype, tpl_id in menus:
            item = models.MenuItem(
                label=label,
                url=url,
                icon=icon,
                parent_id=parent_id,
                order_index=order,
                is_active=active,
                type=mtype,
                template_id=tpl_id
            )
            db.add(item)
        db.commit()
        
        # Fetch parents to set up children correctly
        parent_items = db.query(models.MenuItem).filter(models.MenuItem.parent_id == None).all()
        parents = {p.label: p.id for p in parent_items}
        
        submenus = [
            # Submenus for DOCUMENT SERVICES
            ("વેચાણ દસ્તાવેજ (Sale Deed)", "#", "✍️", parents["DOCUMENT SERVICES"], 1, True, "template", "tpl_8df0793d"),
            ("પેપર નોટીસ (Paper Notice)", "#", "📰", parents["DOCUMENT SERVICES"], 2, True, "template", "user_tpl_1779041103408"),
            ("એફિડેવિટ (Affidavit)", "#", "📄", parents["DOCUMENT SERVICES"], 3, True, "template", "user_tpl_1779333804732"),
            ("હક્ક રીલીઝનો લેખ (Release Deed)", "#", "✒️", parents["DOCUMENT SERVICES"], 4, True, "template", "tpl_737760b1"),
            
            # Submenus for LEGAL SERVICES
            ("બિનખેતી (Non-Agricultural)", "page:non-agricultural", "🏗️", parents["LEGAL SERVICES"], 1, True, "page", None),
            ("હક્ક કમી (Relinquishment)", "page:relinquishment", "❌", parents["LEGAL SERVICES"], 2, True, "page", None),
            ("વારસાઈ (Heirship)", "page:heirship", "👥", parents["LEGAL SERVICES"], 3, True, "page", None),
            
            # Submenus for HELP CENTER
            ("User Guide", "page:user-guide", "📖", parents["HELP CENTER"], 1, True, "page", None),
            ("FAQs", "page:faqs", "💡", parents["HELP CENTER"], 2, True, "page", None),
        ]
        
        for label, url, icon, parent_id, order, active, mtype, tpl_id in submenus:
            item = models.MenuItem(
                label=label,
                url=url,
                icon=icon,
                parent_id=parent_id,
                order_index=order,
                is_active=active,
                type=mtype,
                template_id=tpl_id
            )
            db.add(item)
        db.commit()
        print("TheLegalSetu menu items seeded successfully.")
        
        # 2. Seed Static Pages
        print("Seeding static pages...")
        pages = [
            {
                "slug": "non-agricultural",
                "title": "બિનખેતી (NA) માર્ગદર્શિકા (Non-Agricultural Land Guide)",
                "content": """
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
                    </div>
                """
            },
            {
                "slug": "relinquishment",
                "title": "હક્ક કમી (Right Relinquishment) માર્ગદર્શિકા",
                "content": """
                    <div class="space-y-6">
                        <p class="text-lg text-slate-700">વારસદારો અથવા સંયુક્ત ખાતેદારો સ્વેચ્છાએ જમીન અથવા મિલકતના હક્કમાંથી મુક્ત થવા માંગતા હોય ત્યારે હક્ક કમી કરાર અથવા સોગંદનામું તૈયાર કરવું પડે છે.</p>
                        <h2 class="text-2xl font-bold text-blue-900 border-b pb-2">જરૂરી દસ્તાવેજો અને પ્રક્રિયા</h2>
                        <ul class="list-disc pl-6 space-y-2 text-slate-600">
                            <li>હક્ક છોડનાર પક્ષકારનું સંમતિ સોગંદનામું (Release Affidavit).</li>
                            <li>પક્ષકારોની સહમતી અને સહીઓ સાથેનો રજીસ્ટર્ડ કરાર.</li>
                            <li>ઓળખ અને માલિકી સાબિત કરતા મહેસૂલી રેકોર્ડ્સ.</li>
                            <li>નજીકના નોટરી અથવા સબ-રજીસ્ટ્રાર સમક્ષ વિધિવત નોંધણી.</li>
                        </ul>
                    </div>
                """
            },
            {
                "slug": "heirship",
                "title": "વારસાઈ (Heirship/Succession) માર્ગદર્શિકા",
                "content": """
                    <div class="space-y-6">
                        <p class="text-lg text-slate-700">મિલકતના મૂળ માલિકના અવસાન બાદ તેના કાયદેસરના વારસદારોના નામ સરકારી રેકોર્ડ અને જમીન ખાતામાં દાખલ કરાવવાની કાનૂની પ્રક્રિયા:</p>
                        <h2 class="text-2xl font-bold text-blue-900 border-b pb-2">જરૂરી પુરાવાઓ (Requirements checklist)</h2>
                        <ul class="list-disc pl-6 space-y-2 text-slate-600">
                            <li>મૂળ માલિકનું મરણ પ્રમાણપત્ર (Death Certificate).</li>
                            <li>પેઢીનામું (Pedhinamu / Family Tree Affidavit).</li>
                            <li>તમામ કાયદેસરના વારસદારોના આધાર અને પાન કાર્ડ.</li>
                            <li>રેકોર્ડમાં નામ ચડાવવા માટેનું સત્તાવાર સોગંદનામું.</li>
                        </ul>
                        <div class="p-5 bg-amber-50 border-l-4 border-amber-500 text-amber-900 rounded-r-xl">
                            <p class="font-bold">મહત્વની નોંધ:</p>
                            <p class="text-amber-800 mt-1">અમારા પ્લેટફોર્મ પર પેઢીનામું અને વારસાઈ સોગંદનામું ડ્રાફ્ટ કરવા માટે "એફિડેવિટ" ટેમ્પલેટ સેવાનો ઉપયોગ કરો.</p>
                        </div>
                    </div>
                """
            },
            {
                "slug": "user-guide",
                "title": "વપરાશકર્તા મારગદર્શિકા (DraftSetu User Guide)",
                "content": """
                    <div class="space-y-6">
                        <h2 class="text-2xl font-bold text-blue-900 border-b pb-2">દસ્તાવેજ ડ્રાફ્ટ કેવી રીતે બનાવશો?</h2>
                        <p class="text-slate-700">DraftSetu પ્લેટફોર્મનો ઉપયોગ કરીને કાનૂની દસ્તાવેજો ઓટોમેટેડ બનાવવા માટે નીચેના પગલાં અનુસરો:</p>
                        <div class="space-y-4">
                            <div class="p-4 bg-slate-50 border-l-4 border-blue-600 rounded-r-xl">
                                <h3 class="font-bold text-slate-800">૧. યોગ્ય ટેમ્પલેટ પસંદ કરો</h3>
                                <p class="text-slate-600 text-sm">તમારી જરૂરિયાત અનુસાર "DOCUMENT SERVICES" અથવા "LEGAL SERVICES" માંમાંથી નમૂનો પસંદ કરો.</p>
                            </div>
                            <div class="p-4 bg-slate-50 border-l-4 border-blue-600 rounded-r-xl">
                                <h3 class="font-bold text-slate-800">૨. વિગતો સચોટ ભરો</h3>
                                <p class="text-slate-600 text-sm">ફોર્મમાં દર્શાવેલ વિગતો (જેમ કે પક્ષકારોના નામ, સરનામાં, સર્વે નંબર અને કિંમત) સચોટ રીતે ભરો.</p>
                            </div>
                            <div class="p-4 bg-slate-50 border-l-4 border-blue-600 rounded-r-xl">
                                <h3 class="font-bold text-slate-800">૩. સેવ ડ્રાફ્ટ અને ફાઇનલ લોક</h3>
                                <p class="text-slate-600 text-sm">ડ્રાફ્ટને સુરક્ષિત રાખવા માટે "Save Draft" કરો અને ત્યારબાદ દસ્તાવેજ ફાઇનલ કરીને વર્ડ (.docx) અથવા PDF ફાઇલ ડાઉનલોડ કરો.</p>
                            </div>
                        </div>
                    </div>
                """
            },
            {
                "slug": "faqs",
                "title": "વારંવાર પૂછાતા પ્રશ્નો (FAQs)",
                "content": """
                    <div class="space-y-6">
                        <h2 class="text-2xl font-bold text-blue-900 border-b pb-2">Frequently Asked Questions</h2>
                        <div class="space-y-4">
                            <div class="border-b pb-3">
                                <p class="font-bold text-slate-800">Q: DraftSetu શું સેવા પ્રદાન કરે છે?</p>
                                <p class="text-slate-600 mt-1">A: DraftSetu એ ખાનગી કાનૂની ટેકનોલોજી પ્લેટફોર્મ છે જે દસ્તાવેજોના સચોટ અને ઝડપી ઓટોમેશન માટે વર્ડ ટેમ્પલેટ્સ પૂરા પાડે છે.</p>
                            </div>
                            <div class="border-b pb-3">
                                <p class="font-bold text-slate-800">Q: શું મારા સેવ કરેલા ડ્રાફ્ટ સુરક્ષિત છે?</p>
                                <p class="text-slate-600 mt-1">A: હા, તમારા કાનૂની ડ્રાફ્ટ્સ અત્યંત સુરક્ષિત એન્ક્રિપ્ટેડ કલાઉડ વોલ્ટ (My Documents) માં સેવ રહે છે અને માત્ર તમે જ તે એક્સેસ કરી શકો છો.</p>
                            </div>
                            <div class="border-b pb-3">
                                <p class="font-bold text-slate-800">Q: શું અહીં તૈયાર કરેલા દસ્તાવેજો કાનૂની રીતે માન્ય છે?</p>
                                <p class="text-slate-600 mt-1">A: DraftSetu તમને પ્રમાણિત કાનૂની ડ્રાફ્ટ્સ તૈયાર કરી આપે છે. તેને પૂર્ણ કાનૂની માન્યતા આપવા માટે સબ-રજીસ્ટ્રાર કચેરીએ નોધણી કરાવવી અને સ્ટેમ્પ ડ્યુટી ભરવી અનિવાર્ય છે.</p>
                            </div>
                        </div>
                    </div>
                """
            },
            {
                "slug": "contact",
                "title": "સંપર્ક માહિતી (Contact DraftSetu)",
                "content": """
                    <div class="space-y-6">
                        <h2 class="text-2xl font-bold text-blue-900 border-b pb-2">DraftSetu Customer Support</h2>
                        <p class="text-slate-700">પ્લેટફોર્મ, સબ્સ્ક્રિપ્શન, અથવા કસ્ટમ ટેમ્પલેટ ડિઝાઇન અંગે કોઈ પણ સહાય માટે સંપર્ક કરો:</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div>
                                <h3 class="font-bold text-slate-800 mb-2">📍 કચેરીનું સરનામું</h3>
                                <p class="text-slate-600 text-sm leading-relaxed">
                                    ડ્રાફ્ટસેતુ હેડક્વાર્ટર્સ,<br/>
                                    ૧૦૧, સિગ્નેચર બિલ્ડિંગ, એસ.જી. હાઇવે,<br/>
                                    અમદાવાદ - ૩૮૦૦૫૪, ગુજરાત.
                                </p>
                            </div>
                            <div>
                                <h3 class="font-bold text-slate-800 mb-2">📞 સંપર્ક વિગતો</h3>
                                <p class="text-slate-600 text-sm leading-relaxed">
                                    ઈમેલ: support@draftsetu.com<br/>
                                    હેલ્પલાઈન: +૯૧ ૭૯ ૪ો૧૦ ૬૭૦૦<br/>
                                    સમય: સવારે ૧૦ થી સાંજે ૬ (સોમ-શુક્ર)
                                </p>
                            </div>
                        </div>
                    </div>
                """
            }
        ]
        
        for p in pages:
            page = models.StaticPage(
                title=p["title"],
                slug=p["slug"],
                content=p["content"],
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(page)
            print(f"Page '{p['slug']}' seeded successfully.")
            
        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    seed_database()
