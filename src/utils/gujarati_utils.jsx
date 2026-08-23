// Utility functions for Gujarati Legal Document Generator

const gujarati99 = ["શૂન્ય", "એક", "બે", "ત્રણ", "ચાર", "પાંચ", "છ", "સાત", "આઠ", "નવ", "દસ",
    "અગિયાર", "બાર", "તેર", "ચૌદ", "પંદર", "સોળ", "સત્તર", "અઢાર", "ઓગણીસ", "વીસ",
    "એકવીસ", "બાવીસ", "તેવીસ", "ચોવીસ", "પચ્ચીસ", "છવ્વીસ", "સત્તાવીસ", "અઠ્ઠાવીસ", "ઓગણત્રીસ", "ત્રીસ",
    "એકત્રીસ", "બત્રીસ", "તેત્રીસ", "ચોત્રીસ", "પાંત્રીસ", "છત્રીસ", "સાડત્રીસ", "આડત્રીસ", "ઓગણચાલીસ", "ચાલીસ",
    "એકતાલીસ", "બેતાલીસ", "તેતાલીસ", "ચુંમાલીસ", "પિસ્તાલીસ", "છેતાલીસ", "સુડતાલીસ", "અડતાલીસ", "ઓગણપચાસ", "પચાસ",
    "એકાવન", "બાવન", "તેરપન", "ચોપન", "પંચાવન", "છપ્પન", "સત્તાવન", "અઠ્ઠાવન", "ઓગણસાઠ", "સાઠ",
    "એકસઠ", "બાસઠ", "ત્રેસઠ", "ચોસઠ", "પાંસઠ", "છાસઠ", "સડસઠ", "અડસઠ", "અગણોસિત્તેર", "સિત્તેર",
    "એકોતેર", "બોતેર", "તોતેર", "ચુમોતેર", "પંચોતેર", "છોતેર", "સિત્યોતેર", "ઇઠ્યોતેર", "ઓગણાએંસી", "એંસી",
    "એક્યાસી", "બ્યાસી", "ત્યાસી", "ચોર્યાસી", "પંચાસી", "છ્યાસી", "સત્યાસી", "ઇઠ્યાસી", "નેવ્યાસી", "નેવું",
    "એકાણું", "બાણું", "ત્રાણું", "ચોરાણું", "પંચાણું", "છન્નું", "સત્તાણું", "અઠ્ઠાણું", "નવ્વાણું"];

const formatCurrency = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
};

const numberToGujaratiWords = (amount) => {
    if (!amount) return "";
    let n = parseInt(amount.toString().replace(/,/g, ''), 10);
    if (isNaN(n) || n < 0) return "";
    if (n === 0) return gujarati99[0];
    let words = "";
    if (Math.floor(n / 10000000) > 0) {
        words += gujarati99[Math.floor(n / 10000000)] + " કરોડ ";
        n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
        words += gujarati99[Math.floor(n / 100000)] + " લાખ ";
        n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
        words += gujarati99[Math.floor(n / 1000)] + " હજાર ";
        n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
        words += gujarati99[Math.floor(n / 100)] + " સો ";
        n %= 100;
    }
    if (n > 0) {
        words += gujarati99[n] + " ";
    }
    return words.trim();
};

const extractVariables = (content) => {
    if (!content) return [];
    const matches = [];
    const parts = content.split('{{');
    // Start from 1 because index 0 is text before the first {{
    for (let i = 1; i < parts.length; i++) {
        const endIdx = parts[i].indexOf('}}');
        if (endIdx !== -1) {
            const rawVar = parts[i].substring(0, endIdx);
            // Strip any HTML tags that might be inside
            const cleanVar = rawVar.replace(/<[^>]*>?/gm, '').trim();
            if (cleanVar && !matches.includes(cleanVar)) {
                matches.push(cleanVar);
            }
        }
    }
    return matches;
};

function formatIndiaDateTime(dateString) {
    if (!dateString) return "-";

    let dateStr = dateString;
    if (typeof dateStr === 'string') {
        dateStr = dateStr.replace(' ', 'T');
        if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
            dateStr = dateStr + 'Z';
        }
    }

    return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    }).replace("am", "AM").replace("pm", "PM");
}

const formatDateDDMMYYYY = (value) => {
    if (!value) return "";
    const str = String(value).trim();
    // 1. Matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const parts = str.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // 2. Matches YYYY-MM-DD followed by space/T and time
    if (/^\d{4}-\d{2}-\d{2}[ T].*$/.test(str)) {
        const datePart = str.substring(0, 10);
        const parts = datePart.split("-");
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
};

const formatDateForDisplay = (val) => {
    return formatDateDDMMYYYY(val);
};

const formatDateForStorage = (val) => {
    if (!val) return "";
    const str = String(val).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const parts = str.split("/");
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return str;
};

const formatDateForDocument = (val) => {
    return formatDateDDMMYYYY(val);
};

const formatPreviewDate = (value) => {
    return formatDateDDMMYYYY(value);
};

// Backwards compatibility
window.gujarati99 = gujarati99;
window.formatCurrency = formatCurrency;
window.numberToGujaratiWords = numberToGujaratiWords;
window.extractVariables = extractVariables;
window.formatIndiaDateTime = formatIndiaDateTime;
window.formatDateForDisplay = formatDateForDisplay;
window.formatDateForStorage = formatDateForStorage;
window.formatDateForDocument = formatDateForDocument;
window.formatPreviewDate = formatPreviewDate;
window.formatDateDDMMYYYY = formatDateDDMMYYYY;

