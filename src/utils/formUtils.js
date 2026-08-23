
const processFieldValue = (name, val) => {
    if (val === null || val === undefined) return '';
    const sVal = String(val);
    const lowerName = name.toLowerCase();

    // Aadhaar variables
    if (lowerName === 'aadhaar' || lowerName === 'buyer_aadhaar' || lowerName === 'seller_aadhaar') {
        return sVal;
    }

    // PAN variables
    if (lowerName === 'pan' || lowerName === 'buyer_pan' || lowerName === 'seller_pan') {
        return sVal.toUpperCase();
    }

    // Mobile variables
    if (lowerName === 'mobile' || lowerName === 'phone') {
        return sVal.replace(/\D/g, '').slice(0, 10);
    }

    // Amount variable
    if (lowerName === 'amount') {
        let clean = sVal.replace(/,/g, '').replace(/[^\d.]/g, '');
        const parts = clean.split('.');
        if (parts.length > 2) {
            clean = parts[0] + '.' + parts.slice(1).join('');
        }
        if (clean === '') return '';

        const decParts = clean.split('.');
        let integerPart = decParts[0];
        const decimalPart = decParts.length > 1 ? '.' + decParts[1] : '';

        const lastThree = integerPart.substring(integerPart.length - 3);
        const otherNumbers = integerPart.substring(0, integerPart.length - 3);
        if (otherNumbers !== '') {
            const formattedOthers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
            return formattedOthers + ',' + lastThree + decimalPart;
        } else {
            return lastThree + decimalPart;
        }
    }

    return val;
};

const getFieldType = (variableName, fallbackType = 'text') => {
    const lowerName = variableName.toLowerCase();

    if (lowerName === 'extra_paragraphs_text' || lowerName === 'para.text') {
        return 'textarea';
    }

    if (lowerName.includes('date') || lowerName.includes('dob')) {
        return 'date';
    }

    if (lowerName.includes('address')) {
        return 'textarea';
    }

    return fallbackType;
};

const validateField = (name, val) => {
    if (val === null || val === undefined || val === '') {
        return null;
    }
    const sVal = String(val);
    const lowerName = name.toLowerCase();

    // Mobile check
    if (lowerName === 'mobile' || lowerName === 'phone') {
        if (sVal.length !== 10) {
            return "અમાન્ય મોબાઈલ નંબર: ૧૦ અંક હોવા જોઈએ (Invalid Mobile: must be 10 digits)";
        }
    }

    // Date check
    if (lowerName.includes('date') || lowerName.includes('dob')) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(sVal)) {
            const parts = sVal.split("-");
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
                return "અમાન્ય તારીખ (Invalid Date)";
            }
            return null;
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(sVal)) {
            const parts = sVal.split("/");
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
                return "અમાન્ય તારીખ (Invalid Date)";
            }
            return null;
        }
        return "અમાન્ય તારીખ: કૃપા કરીને સાચી તારીખ DD/MM/YYYY ફોર્મેટમાં લખો (Invalid date: please use DD/MM/YYYY format)";
    }

    return null;
};

const REPEATER_TITLES = {
    BUYERS: { gu: 'ખરીદનારાઓ (Buyers)', icon: '👥' },
    SELLERS: { gu: 'વેચનારાઓ (Sellers)', icon: '👥' },
    WITNESSES: { gu: 'સાક્ષીઓ (Witnesses)', icon: '✍️' },
    LAND_RECORDS: { gu: 'જમીન વિગતો / રેકોર્ડ્સ (Land Records)', icon: '🏗️' },
    PAYMENTS: { gu: 'ચુકવણી વિગતો / હપ્તાઓ (Payments)', icon: '💰' },
    HEIRS: { gu: 'વારસદારો (Heirs)', icon: '👪' },
    APPLICANTS: { gu: 'અરજદારો (Applicants)', icon: '📝' }
};

const REPEATER_FIELD_LABELS = {
    name: 'નામ (Name)',
    address: 'સરનામું (Address)',
    pan: 'પાન કાર્ડ (PAN)',
    aadhaar: 'આધાર નંબર (Aadhaar)',
    mobile: 'મોબાઈલ (Mobile)',
    phone: 'ફોન (Phone)',
    amount: 'રકમ (Amount)',
    date: 'તારીખ (Date)',
    index: 'ક્રમ (No.)'
};

const getRepeaterTitle = (name) => {
    const key = name.toUpperCase();
    if (REPEATER_TITLES[key]) {
        return REPEATER_TITLES[key];
    }
    return { gu: name.replace(/_/g, ' ').toUpperCase(), icon: '📋' };
};

// Global backward compatibility
window.processFieldValue = processFieldValue;
window.getFieldType = getFieldType;
window.validateField = validateField;
window.REPEATER_TITLES = REPEATER_TITLES;
window.REPEATER_FIELD_LABELS = REPEATER_FIELD_LABELS;
window.getRepeaterTitle = getRepeaterTitle;
