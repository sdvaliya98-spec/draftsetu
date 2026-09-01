import React from 'react';
import ReactDOM from 'react-dom/client';

window.React = React;
window.ReactDOM = ReactDOM;

// Shim React internal symbols for Recharts / UMD libraries if needed
try {
    if (!React.ForwardRef) React.ForwardRef = Symbol.for('react.forward_ref');
    if (!React.Memo) React.Memo = Symbol.for('react.memo');
    if (!React.Fragment) React.Fragment = Symbol.for('react.fragment');
    if (!React.Portal) React.Portal = Symbol.for('react.portal');
    if (!React.Profiler) React.Profiler = Symbol.for('react.profiler');
    if (!React.StrictMode) React.StrictMode = Symbol.for('react.strict_mode');
    if (!React.Suspense) React.Suspense = Symbol.for('react.suspense');
    if (!React.ContextProvider) React.ContextProvider = Symbol.for('react.provider');
    if (!React.ContextConsumer) React.ContextConsumer = Symbol.for('react.context');
} catch (e) {
    console.warn('[initGlobals] React compat shim failed:', e.message);
}

window.useState = React.useState;
window.useEffect = React.useEffect;
window.useRef = React.useRef;
window.useMemo = React.useMemo;
window.useCallback = React.useCallback;
window.useContext = React.useContext;
window.useReducer = React.useReducer;
