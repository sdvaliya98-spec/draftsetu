import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
function maskAadhaar(value = "") {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length !== 12) {
        return value;
    }

    return `XXXX XXXX ${cleaned.slice(-4)}`;
}

window.maskAadhaar = maskAadhaar;
