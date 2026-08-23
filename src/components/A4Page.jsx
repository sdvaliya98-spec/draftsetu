
const A4Page = ({ children, header, footer, pageNumber, totalPages, pageSize = 'A4' }) => {
    const dims = {
        'A4': { width: '794px', minHeight: '1123px' },
        'Legal': { width: '816px', minHeight: '1346px' },
        'Letter': { width: '816px', minHeight: '1056px' }
    }[pageSize] || { width: '794px', minHeight: '1123px' };

    return (
        <div 
            className="document-page text-black font-gujarati tracking-wide break-words"
            style={{ width: dims.width, minHeight: dims.minHeight }}
        >
            {header && (
                <div className="page-header ck-content" dangerouslySetInnerHTML={{ __html: header }} />
            )}
            
            <div className="page-content document-body ck-content">
                {children}
            </div>

            {footer && (
                <div className="page-footer ck-content" dangerouslySetInnerHTML={{ __html: footer }} />
            )}

            <div className="text-[10px] text-slate-300 text-right mt-2 no-print font-bold uppercase tracking-widest absolute bottom-4 right-8">
                Page {pageNumber} of {totalPages}
            </div>
        </div>
    );
};

// Global backward compatibility
window.A4Page = A4Page;
