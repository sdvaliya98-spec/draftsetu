import React from 'react';
import DocumentServicesPage from '../pages/DocumentServicesPage.jsx';

/**
 * DocumentServicesPanel - Full-page Document Services interface.
 * Replaces the previous small modal with a dedicated full-page experience.
 */
const DocumentServicesPanel = ({ isOpen = true, onClose, menuItem, onSelectTemplate, allTemplates = [] }) => {
    if (isOpen === false) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-slate-50 overflow-y-auto flex flex-col font-sans select-none animate-fade-in" id="document-services-panel-container">
            <DocumentServicesPage
                menuItem={menuItem}
                allTemplates={allTemplates}
                onSelectTemplate={(templateId, initialData) => {
                    if (typeof onSelectTemplate === 'function') {
                        onSelectTemplate(templateId, initialData);
                    }
                    if (typeof onClose === 'function') {
                        onClose();
                    }
                }}
                onNavigate={(destination) => {
                    if (destination === 'home' || destination === 'back') {
                        if (typeof onClose === 'function') {
                            onClose();
                        }
                    } else if (typeof window.handleAppNavigate === 'function') {
                        window.handleAppNavigate(destination);
                    }
                }}
            />
        </div>
    );
};

window.DocumentServicesPanel = DocumentServicesPanel;
export default DocumentServicesPanel;
