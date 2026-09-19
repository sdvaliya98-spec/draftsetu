"""
DraftSetu Backend Slug & URL Utility
====================================
Deterministic, stable, and independent URL slug generation for templates.
Matches frontend src/utils/slugUtils.js 1-to-1.
"""
import re

GUJARATI_WORD_MAP = {
    'વેચાણ': 'vechan',
    'ખેતીની': 'khetini',
    'જમીનનો': 'jaminno',
    'જમીન': 'jamin',
    'દસ્તાવેજ': 'dastavej',
    'બાનાખતનો': 'banakhatno',
    'બાનાખત': 'banakhat',
    'કરાર': 'karar',
    'કબજા': 'kabja',
    'વગર': 'vagar',
    'સાથે': 'sathe',
    'અઘાટ': 'aghat',
    'દુકાન': 'dukan',
    'વહેંચણીનું': 'vehnchninu',
    'સોગંદનામું': 'sogandnamu',
    'હયાતીમાં': 'hayati-ma',
    'પેઢીનામું': 'pedhinamu',
    'પેઢીનામાં': 'pedhinama',
    'હક્ક': 'hakk',
    'દાખલ': 'dakhal',
    'કરવા': 'karva',
    'અંગેનું': 'angenu',
    'અંગે': 'ange',
    'બીનખેડુત': 'binkhedut',
    'એનએ': 'na',
    'વીલ': 'will',
    'યાને': 'yane',
    'વસીયત': 'vasiyat',
    'નામું': 'namu',
    'પેપર': 'paper',
    'નોટીસ': 'notice',
    'રીલીઝનો': 'release-no',
    'રીલીઝ': 'release',
    'લેખ': 'lekh',
    'એફિડેવિટ': 'affidavit',
    'નોટરી': 'notary',
    'વારસાઈ': 'varasai',
    'દેવ': 'dev',
    'વાટિકા': 'vatika'
}

GUJARATI_CHAR_MAP = {
    'અ': 'a', 'આ': 'aa', 'ઇ': 'i', 'ઈ': 'ee', 'ઉ': 'u', 'ઊ': 'oo',
    'ઋ': 'ru', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
    'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'ng',
    'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'z', 'ઞ': 'ny',
    'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
    'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
    'પ': 'p', 'ફ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
    'ય': 'y', 'ર': 'r', 'લ': 'l', 'ળ': 'l', 'વ': 'v',
    'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
    'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u',
    'ૃ': 'ru', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
    'ં': 'n', 'ઃ': 'h', '્': '',
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
}

def transliterate_gujarati(text: str) -> str:
    if not text:
        return ''
    s = str(text).strip()
    for guj, eng in GUJARATI_WORD_MAP.items():
        s = s.replace(guj, f" {eng} ")
    
    result = []
    for ch in s:
        if ch in GUJARATI_CHAR_MAP:
            result.append(GUJARATI_CHAR_MAP[ch])
        else:
            result.append(ch)
    return ''.join(result)

def get_template_id_suffix(template_id: str) -> str:
    if not template_id:
        return ''
    clean_id = str(template_id).strip().lower()
    if clean_id.startswith('tpl_'):
        return clean_id[4:]
    return clean_id

def get_template_slug(name: str, template_id: str) -> str:
    id_suffix = get_template_id_suffix(template_id)
    transliterated = transliterate_gujarati(name or '')
    
    clean_slug = re.sub(r'[^a-z0-9]+', '-', transliterated.lower()).strip('-')
    
    if clean_slug and id_suffix:
        return f"{clean_slug}-{id_suffix}"
    if clean_slug:
        return clean_slug
    if id_suffix:
        return f"template-{id_suffix}"
    return 'template'
