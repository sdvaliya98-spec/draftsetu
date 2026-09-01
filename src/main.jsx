import './initGlobals.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../app.jsx';
import '../style.css';
import '../constants.jsx';

// Core utilities attached to window and available globally
import './utils/maskAadhaar.js';
import './utils/gujarati_utils.jsx';
import './utils/draftCacheManager.js';
import './utils/formUtils.js';
import './services/sessionManager.js';

// Core components attached to window / imports
import './components/Icons.jsx';
import './components/A4Page.jsx';
import './components/InputField.jsx';
import './components/HybridDropdownField.jsx';
import './components/NestedRepeater.jsx';
import './components/PartyManager.jsx';
import './components/DynamicFormRenderer.jsx';
import './components/UserMenu.jsx';
import './components/AuthModal.jsx';
import './components/GovHeader.jsx';
import './pages/HomePage.jsx';
import './pages/StaticPageView.jsx';

// Mount App
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
