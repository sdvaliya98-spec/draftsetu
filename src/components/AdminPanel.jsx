
import React from 'react';
import './RichTextEditor.jsx';
import './AdminSharedModals.jsx';
import './StorageAnalytics.jsx';
import './TemplateAnalytics.jsx';
import './TemplateHealth.jsx';
import './TemplateAnalyticsDetail.jsx';
import './ActivityLogs.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminWalletPanel from './AdminWalletPanel.jsx';

const {
    LayoutDashboardIcon,
    UserIcon,
    FileTextIcon,
    VariableIcon,
    MenuIcon,
    DatabaseIcon,
    ShieldIcon,
    SettingsIcon,
    PrinterIcon,
    DownloadIcon,
    EditIcon,
    PlusIcon,
    TrashIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    CreditCardIcon
} = window;

// ─── Menu Item Row ────────────────────────────────────────────────────────────
const MenuItemRow = ({ item, level, onEdit, onDelete, onAddChild }) => {
    const [expanded, setExpanded] = React.useState(true);
    const has = item.children && item.children.length > 0;
    return (
        <div className="animate-modal" style={{ animationDelay: `${level * 0.05}s` }}>
            <div className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-white hover:shadow-sm group transition-all border border-transparent hover:border-slate-100"
                style={{ marginLeft: `${level * 24}px` }}>
                <button onClick={() => setExpanded(o => !o)} className={`w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-xs text-slate-400 transition-all ${has ? '' : 'invisible'} ${expanded ? 'rotate-90' : ''}`}>
                    <ArrowRightIcon size={12} />
                </button>
                <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{item.icon || '📄'}</span>
                <span className="flex-1 text-sm font-black text-slate-700">{item.label}</span>
                <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest truncate max-w-[120px] opacity-0 group-hover:opacity-100 transition-all">{item.url}</span>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <button onClick={() => onAddChild(item)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition shadow-sm"><PlusIcon size={14} /></button>
                    <button onClick={() => onEdit(item)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition shadow-sm"><EditIcon size={14} /></button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition shadow-sm"><TrashIcon size={14} /></button>
                </div>
            </div>
            {has && expanded && (
                <div className="border-l-2 border-slate-100 ml-7 mt-1 space-y-1">
                    {item.children.map(c =>
                        <MenuItemRow key={c.id} item={c} level={level + 1} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Menu Item Form Modal ─────────────────────────────────────────────────────
const MenuItemFormModal = ({ item, parentId, allFlatItems, templates, dbTemplates, onSave, onClose }) => {
    const [form, setForm] = React.useState({
        label: item?.label || '', url: item?.url || '#', icon: item?.icon || '📄',
        parent_id: item?.parent_id ?? parentId ?? null, order_index: item?.order_index ?? 0, is_active: item?.is_active ?? true,
        type: item?.type || 'page', template_id: item?.template_id || ''
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const allTemplates = React.useMemo(() => {
        const dbIds = new Set((dbTemplates || []).map(t => t.template_id));
        const filteredLocals = (templates || []).filter(t => !dbIds.has(t.id));
        return [
            ...filteredLocals.map(t => ({ id: t.id, name: t.name })),
            ...(dbTemplates || []).map(t => ({ id: t.template_id, name: t.name }))
        ];
    }, [templates, dbTemplates]);

    React.useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-modal border border-white/20 relative">
                <div className="sticky top-0 z-20 bg-white flex justify-between items-center px-8 py-6 border-b border-slate-100 rounded-t-[32px]">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{item ? 'Edit Node' : 'New System Node'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-800 text-2xl transition-all">&times;</button>
                </div>
                <div className="pt-8 pb-10 px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Row 1: Icon & Label */}
                        <div className="flex gap-4 md:col-span-2">
                            <div className="w-20 flex-shrink-0">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Icon</label>
                                <input value={form.icon} onChange={e => set('icon', e.target.value)} className="w-full text-center text-2xl px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Label *</label>
                                <input value={form.label} onChange={e => set('label', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
                            </div>
                        </div>

                        {/* Row 2: Menu Type */}
                        <div className="col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Menu Type</label>
                            <select 
                                value={form.type} 
                                onChange={e => {
                                    const newType = e.target.value;
                                    setForm(p => ({
                                        ...p,
                                        type: newType,
                                        url: newType === 'template' ? '#' : (newType === 'dropdown' ? '#' : p.url)
                                    }));
                                }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl bg-white text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-600 appearance-none cursor-pointer"
                            >
                                <option value="page">Static Page (page:slug)</option>
                                <option value="template">Template Editor View</option>
                                <option value="external">External / Custom URL</option>
                                <option value="dropdown">Dropdown Group</option>
                            </select>
                        </div>

                        {/* Row 2: Conditional template/URL field */}
                        <div className="col-span-1">
                            {form.type === 'template' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Load Template *</label>
                                    <select 
                                        value={form.template_id} 
                                        onChange={e => set('template_id', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl bg-white text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-600 appearance-none cursor-pointer"
                                    >
                                        <option value="">— Select Template —</option>
                                        {allTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {form.type !== 'template' && form.type !== 'dropdown' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target URL / Slug</label>
                                    <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="page:slug or https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                                </div>
                            )}
                        </div>

                        {/* Row 3: Parent Level */}
                        <div className="col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Parent Level</label>
                            <select value={form.parent_id ?? ''} onChange={e => set('parent_id', e.target.value ? parseInt(e.target.value) : null)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl bg-white text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-600 appearance-none cursor-pointer">
                                <option value="">— Global Root —</option>
                                {allFlatItems.filter(i => i.id !== item?.id).map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                            </select>
                        </div>

                        {/* Row 3: Sequence */}
                        <div className="col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Sequence</label>
                            <input type="number" value={form.order_index} onChange={e => set('order_index', parseInt(e.target.value) || 0)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" />
                        </div>

                        {/* Row 4: Active Status */}
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-3 text-sm font-bold text-slate-600 cursor-pointer group pt-2">
                                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/20 cursor-pointer" />
                                Active Status (Visible to Users)
                            </label>
                        </div>
                    </div>
                </div>
                <div className="sticky bottom-0 z-20 bg-white border-t border-slate-100 flex justify-end gap-3 px-8 py-6 rounded-b-[32px]">
                    <button onClick={onClose} className="px-6 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest">Cancel</button>
                    <button 
                        onClick={() => {
                            if (!form.label.trim()) return;
                            if (form.type === 'template' && !form.template_id) {
                                alert('Please select a template');
                                return;
                            }
                            onSave(form);
                        }} 
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all uppercase tracking-widest btn-premium"
                    >
                        Commit Node
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Menu Builder ─────────────────────────────────────────────────────────────
const MenuBuilder = ({ onMenuUpdate, templates, dbTemplates, refreshTrigger }) => {
    const [tree, setTree] = React.useState([]);
    const [flat, setFlat] = React.useState([]);
    const [editItem, setEditItem] = React.useState(null);
    const [childParentId, setChildParentId] = React.useState(null);
    const [showForm, setShowForm] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    
    const reload = async () => {
        setLoading(true);
        try {
            const [t, f] = await Promise.all([
                window.apiFetch('/api/menu/').then(r => r.json()).catch(() => []),
                window.apiFetch('/api/menu/all/').then(r => r.json()).catch(() => [])
            ]);
            setTree(t); setFlat(f);
        } finally { setLoading(false); }
    };
    
    React.useEffect(() => { reload(); }, [refreshTrigger]);
    
    return (
        <div className="h-full flex flex-col gap-6 animate-modal">
            <div className="flex items-end justify-between px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Menu Architecture</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Hierarchical Navigation & Routing System</p>
                </div>
                <button 
                    onClick={() => { setEditItem(null); setChildParentId(null); setShowForm(true); }} 
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 btn-premium"
                >
                    <PlusIcon size={18} /> Add Root Node
                </button>
            </div>
            
            <div className="flex-1 bg-slate-50/50 rounded-[32px] border border-slate-200/60 overflow-y-auto custom-scrollbar p-6 space-y-2">
                {loading && tree.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Tree...</div>
                ) : tree.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20 grayscale opacity-50">
                        <div className="text-8xl mb-6">📂</div>
                        <p className="font-black uppercase tracking-widest text-sm">Navigation Tree is Empty</p>
                    </div>
                ) : tree.map(item => (
                    <MenuItemRow 
                        key={item.id} 
                        item={item} 
                        level={0}
                        onEdit={i => { setEditItem(i); setChildParentId(null); setShowForm(true); }}
                        onDelete={async (id) => {
                            if (!confirm('Delete this node and all descendants?')) return;
                            await window.apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
                            reload();
                            if (onMenuUpdate) onMenuUpdate();
                        }}
                        onAddChild={i => { setEditItem(null); setChildParentId(i.id); setShowForm(true); }} 
                    />
                ))}
            </div>
            {showForm && (
                <MenuItemFormModal 
                    item={editItem} 
                    parentId={childParentId} 
                    allFlatItems={flat} 
                    templates={templates}
                    dbTemplates={dbTemplates}
                    onSave={async (form) => {
                        const url = editItem ? `/api/menu/${editItem.id}` : '/api/menu/';
                        await window.apiFetch(url, { method: editItem ? 'PUT' : 'POST', body: form });
                        setShowForm(false); reload();
                        if (onMenuUpdate) onMenuUpdate();
                    }} 
                    onClose={() => setShowForm(false)} 
                />
            )}
        </div>
    );
};

// ─── Template Manager ─────────────────────────────────────────────────────────
const TemplateManager = ({ localTemplates, dbTemplates, isLoading, onEditTemplate, onNewTemplate, onDeleteLocalTemplate, onTemplatesUpdate, refreshTrigger }) => {
    const all = React.useMemo(() => [
        ...localTemplates.map(t => ({ ...t, _source: 'local' })),
        ...(dbTemplates || []).map(t => ({ ...t, id: t.template_id, _source: 'db' }))
    ], [localTemplates, dbTemplates]);

    const fileInputRef = React.useRef(null);
    const [replacingTemplateId, setReplacingTemplateId] = React.useState(null);
    const [activeSubTab, setActiveSubTab] = React.useState('active');
    const [archivedTemplates, setArchivedTemplates] = React.useState([]);
    const [isLoadingArchived, setIsLoadingArchived] = React.useState(false);
    const [viewingTemplate, setViewingTemplate] = React.useState(null);

    const loadArchived = React.useCallback(async () => {
        setIsLoadingArchived(true);
        try {
            const res = await window.apiFetch('/api/templates/archived');
            const data = await res.json();
            const mapped = data.map(t => {
                let fields = t.fields || {};
                let fieldOrder = t.fieldOrder || [];
                let variables = t.variables || [];
                try { if (t.fields_json) fields = JSON.parse(t.fields_json); } catch (e) { }
                try { if (t.field_order_json) fieldOrder = JSON.parse(t.field_order_json); } catch (e) { }
                return { ...t, id: t.template_id, _source: 'db', fields, fieldOrder, variables };
            });
            setArchivedTemplates(mapped);
        } catch (err) {
            console.error("Failed to load archived templates", err);
        } finally {
            setIsLoadingArchived(false);
        }
    }, []);

    React.useEffect(() => {
        if (activeSubTab === 'archived') {
            loadArchived();
        }
    }, [activeSubTab, refreshTrigger, loadArchived]);

    React.useEffect(() => {
        if (refreshTrigger && onTemplatesUpdate) {
            onTemplatesUpdate();
        }
    }, [refreshTrigger]);

    const handleArchiveTemplate = async (templateId) => {
        const confirmMsg = "Are you sure you want to archive this template? It will be hidden from users but remain available to admins.";
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await window.apiFetch(`/api/templates/${templateId}/archive`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert("✅ Template archived successfully!");
                if (onTemplatesUpdate) onTemplatesUpdate();
                if (activeSubTab === 'archived') loadArchived();
            } else {
                alert(`Error archiving template: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message || 'Failed to archive template'}`);
        }
    };

    const handleRestoreTemplate = async (templateId) => {
        const confirmMsg = "Are you sure you want to restore this template to active use?";
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await window.apiFetch(`/api/templates/${templateId}/restore`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert("✅ Template restored successfully!");
                if (onTemplatesUpdate) onTemplatesUpdate();
                if (activeSubTab === 'archived') loadArchived();
            } else {
                alert(`Error restoring template: ${data.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message || 'Failed to restore template'}`);
        }
    };

    const triggerReplace = (templateId) => {
        setReplacingTemplateId(templateId);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset file input
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !replacingTemplateId) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await window.apiFetch(`/api/templates/${replacingTemplateId}/replace-docx`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                if (data.variables_changed) {
                    alert("Template variables changed. Forms regenerated.");
                } else {
                    alert("✅ DOCX template replaced successfully!");
                }
                if (onTemplatesUpdate) onTemplatesUpdate();
            } else {
                alert(`Error replacing DOCX: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message || 'Failed to replace DOCX'}`);
        } finally {
            setReplacingTemplateId(null);
        }
    };

    const handleDownloadDocx = async (t) => {
        try {
            const templateId = t.template_id || t.id;
            const res = await window.apiFetch(`/api/templates/${templateId}/download-docx`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = t.file_path || `${t.name}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            alert(`Download failed: ${err.message || 'Unable to download DOCX'}`);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return dateStr;
        }
    };
    
    const displayTemplates = activeSubTab === 'active' ? all : archivedTemplates;
    
    return (
        <div className="h-full flex flex-col gap-6 animate-modal">
            {/* Hidden File Input for Replacement */}
            <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".docx" 
                onChange={handleFileChange} 
            />

            <div className="flex items-end justify-between px-2 flex-shrink-0">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Template Vault</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Managed Document Blueprints & Logic</p>
                </div>
                <button 
                    onClick={onNewTemplate} 
                    className="premium-gradient text-white px-8 py-3 rounded-2xl font-black text-sm hover:shadow-2xl hover:shadow-blue-300 transition-all active:scale-95 flex items-center gap-2 btn-premium"
                >
                    <PlusIcon size={18} /> Deploy New Blueprint
                </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-2 flex-shrink-0">
                <button 
                    onClick={() => setActiveSubTab('active')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                        ${activeSubTab === 'active' ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Active Templates ({all.length})
                </button>
                <button 
                    onClick={() => setActiveSubTab('archived')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                        ${activeSubTab === 'archived' ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                    Archived Templates ({isLoadingArchived ? '...' : archivedTemplates.length})
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {isLoadingArchived && activeSubTab === 'archived' ? (
                    <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">Loading Archives...</div>
                ) : displayTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20 grayscale opacity-50">
                        <div className="text-8xl mb-6">📄</div>
                        <p className="font-black uppercase tracking-widest text-sm">No Templates Found</p>
                    </div>
                ) : displayTemplates.map((t, i) => (
                    <div key={t.id} className="premium-card p-6 flex items-center gap-6 group animate-modal animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="w-16 h-16 rounded-[20px] bg-slate-50 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition duration-300 grayscale group-hover:grayscale-0">
                            {t._source === 'local' ? '🏛️' : '🛠️'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <span className="font-black text-xl text-slate-800 group-hover:text-blue-600 transition truncate max-w-[250px]">{t.name}</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                                    {t.category || 'General'}
                                </span>
                                <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${t._source === 'local' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {t._source === 'local' ? 'Core' : 'Custom'}
                                </span>
                                <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest border shadow-sm ${t.status === 'ARCHIVED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                    {t.status || (t.is_active ? 'ACTIVE' : 'INACTIVE')}
                                </span>
                                <span className="text-[9px] px-2.5 py-1 bg-blue-50 text-blue-500 rounded-full font-black uppercase tracking-widest">
                                    {Object.keys(t.fields || {}).length} Vars
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-tight truncate opacity-80 mt-1 flex flex-wrap gap-x-4">
                                <span><strong>ID:</strong> {t.template_id || t.id || '—'}</span>
                                {t.created_at && <span><strong>Created:</strong> {formatDate(t.created_at)}</span>}
                                {t.updated_at && <span><strong>Updated:</strong> {formatDate(t.updated_at)}</span>}
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 flex-shrink-0">
                            <button onClick={() => setViewingTemplate(t)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black hover:bg-slate-200 transition shadow-sm flex items-center gap-1">
                                <span>🔍</span> View Details
                            </button>

                            {activeSubTab === 'active' && (
                                <button onClick={() => onEditTemplate(t)} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center gap-1">
                                    <span>✏️</span> Edit
                                </button>
                            )}
                            
                            {t.file_path && (
                                <button 
                                    onClick={() => handleDownloadDocx(t)} 
                                    title="Download original editable Word template"
                                    className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-600 hover:text-white transition shadow-sm flex items-center gap-1"
                                >
                                    <span>⬇</span> Download DOCX
                                </button>
                            )}

                            {activeSubTab === 'active' && t._source === 'db' && (
                                <button 
                                    onClick={() => triggerReplace(t.template_id || t.id)} 
                                    className="px-3 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black hover:bg-amber-600 hover:text-white transition shadow-sm flex items-center gap-1"
                                >
                                    <span>🔄</span> Replace DOCX
                                </button>
                            )}

                            {activeSubTab === 'active' && t._source === 'db' && (
                                <button 
                                    onClick={() => handleArchiveTemplate(t.template_id || t.id)} 
                                    className="px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-black hover:bg-amber-600 hover:text-white transition shadow-sm flex items-center gap-1"
                                >
                                    <span>📦</span> Archive
                                </button>
                            )}

                            {activeSubTab === 'archived' && t._source === 'db' && (
                                <button 
                                    onClick={() => handleRestoreTemplate(t.template_id || t.id)} 
                                    className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-600 hover:text-white transition shadow-sm flex items-center gap-1"
                                >
                                    <span>♻️</span> Restore
                                </button>
                            )}

                            {activeSubTab === 'active' && t._source === 'db' && (
                                <button 
                                    onClick={async () => {
                                        if (!confirm('Destroy this blueprint?')) return;
                                        await window.apiFetch(`/api/templates/${t.template_id || t.id}`, { method: 'DELETE' });
                                        if (onTemplatesUpdate) onTemplatesUpdate();
                                    }} 
                                    className="px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-600 hover:text-white transition shadow-sm flex items-center gap-1"
                                >
                                    <span>🗑</span> Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* View Details Modal */}
            {viewingTemplate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[160] p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-modal border border-white/20 relative">
                        <div className="sticky top-0 z-20 bg-white flex justify-between items-center px-8 py-6 border-b border-slate-100 rounded-t-[32px]">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Blueprint Details</h3>
                            <button onClick={() => setViewingTemplate(null)} className="text-slate-400 hover:text-slate-800 text-2xl transition-all">&times;</button>
                        </div>
                        <div className="pt-8 pb-10 px-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Template Name</label>
                                <div className="text-lg font-black text-slate-800">{viewingTemplate.name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Template ID</label>
                                    <div className="text-sm font-mono font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-block">{viewingTemplate.template_id || viewingTemplate.id}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                                    <div className="inline-block mt-0.5">
                                        <span className={`text-[10px] px-2.5 py-1.5 rounded-full font-black uppercase tracking-widest border shadow-sm ${viewingTemplate.status === 'ARCHIVED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            {viewingTemplate.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created At</label>
                                    <div className="text-xs font-bold text-slate-600">{formatDate(viewingTemplate.created_at)}</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Updated</label>
                                    <div className="text-xs font-bold text-slate-600">{formatDate(viewingTemplate.updated_at)}</div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</label>
                                <div className="inline-block mt-0.5">
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-full font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                                        {viewingTemplate.category || 'General'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Structure Variables ({Object.keys(viewingTemplate.fields || {}).length})</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(viewingTemplate.fields || {}).length === 0 ? (
                                        <span className="text-xs font-bold text-slate-400">No variables defined.</span>
                                    ) : (
                                        Object.keys(viewingTemplate.fields).map(key => (
                                            <span key={key} className="text-[10px] font-bold font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-100">
                                                {key}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                            {viewingTemplate.file_path && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Word Blueprint File</label>
                                    <div className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <span>📂 {viewingTemplate.file_path}</span>
                                        <button 
                                            onClick={() => handleDownloadDocx(viewingTemplate)}
                                            className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                                        >
                                            Download
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="sticky bottom-0 z-20 bg-white border-t border-slate-100 flex justify-end px-8 py-6 rounded-b-[32px]">
                            <button onClick={() => setViewingTemplate(null)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 shadow-lg transition-all uppercase tracking-widest">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Static Page Manager ──────────────────────────────────────────────────────
const StaticPageManager = ({ refreshTrigger }) => {
    const [pages, setPages] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState(null);
    const [form, setForm] = React.useState({ title: '', slug: '', content: '', is_active: true });
    
    const reload = async () => {
        setLoading(true);
        try { setPages(await window.apiFetch('/api/pages/').then(r => r.json())); }
        catch { setPages([]); } finally { setLoading(false); }
    };
    
    React.useEffect(() => { reload(); }, [refreshTrigger]);
    
    const autoSlug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    if (editing !== null) return (
        <div className="h-full flex flex-col gap-6 animate-modal">
            <div className="flex items-center gap-4 flex-shrink-0 px-2">
                <button onClick={() => setEditing(null)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition border border-slate-200 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"><ArrowLeftIcon size={14} /> Back</button>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{editing === 'new' ? 'Draft New Page' : 'Modify Content Node'}</h3>
            </div>
            <div className="flex-1 bg-white rounded-[32px] border border-slate-200 p-8 overflow-y-auto custom-scrollbar space-y-8">
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Page Identity (Title)</label>
                        <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); if (editing === 'new') setForm(p => ({ ...p, slug: autoSlug(e.target.value) })); }}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. Terms of Service" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Architecture (Slug)</label>
                        <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" placeholder="terms-of-service" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Page Content (Rich Text / TipTap Editor)</label>
                    <div className="rounded-2xl border-2 border-slate-300 overflow-hidden bg-white shadow-sm min-h-[480px]">
                        <RichTextEditor 
                            key={editing}
                            value={form.content} 
                            onChange={v => setForm(p => ({ ...p, content: v }))} 
                        />
                    </div>
                </div>

                <label className="flex items-center gap-3 text-sm font-bold text-slate-600 cursor-pointer group">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/20 cursor-pointer" />
                    Publish Status (Live for Users)
                </label>
            </div>
            <div className="flex justify-end gap-4 flex-shrink-0 px-2">
                <button onClick={() => setEditing(null)} className="px-8 py-3 border border-slate-200 rounded-2xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest">Discard</button>
                <button onClick={async () => {
                    if (!form.title.trim() || !form.slug.trim()) return alert('Missing required fields');
                    const isNew = editing === 'new';
                    const url = isNew ? '/api/pages/' : `/api/pages/${editing}`;
                    await window.apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: form });
                    setEditing(null); reload();
                }} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all uppercase tracking-widest btn-premium">Deploy Page</button>
            </div>
        </div>
    );
    
    return (
        <div className="h-full flex flex-col gap-6 animate-modal">
            <div className="flex items-end justify-between px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Content Inventory</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Static Informational Page Architecture</p>
                </div>
                <button onClick={() => { setForm({ title: '', slug: '', content: '', is_active: true }); setEditing('new'); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center gap-2 btn-premium">
                    <PlusIcon size={18} /> New Page
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {loading ? <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">Scanning Inventory...</div> : pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20 grayscale opacity-50">
                        <div className="text-8xl mb-6">📃</div>
                        <p className="font-black uppercase tracking-widest text-sm">No Pages in Inventory</p>
                    </div>
                ) : pages.map((p, i) => (
                    <div key={p.slug} className="premium-card p-6 flex items-center gap-6 group animate-modal" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition duration-300">📃</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-black text-lg text-slate-800 group-hover:text-blue-600 transition">{p.title}</span>
                                <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-widest ${p.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {p.is_active ? 'Live' : 'Draft'}
                                </span>
                            </div>
                            <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Endpoint: page:{p.slug}</div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <button onClick={() => { setForm({ title: p.title, slug: p.slug, content: p.content, is_active: p.is_active }); setEditing(p.slug); }} className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition shadow-sm">Edit</button>
                            <button onClick={async () => {
                                if (!confirm('Destroy this page?')) return;
                                await window.apiFetch(`/api/pages/${p.slug}`, { method: 'DELETE' });
                                reload();
                            }} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition shadow-sm"><TrashIcon size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Admin Edit User Modal ──────────────────────────────────────────────────
const EditUserModal = ({ user, onClose, onSaved }) => {
    const [form, setForm] = React.useState({
        full_name: user?.full_name && user.full_name !== '—' ? user.full_name : '',
        email: user?.email && user.email !== '—' ? user.email : '',
        username: user?.username || '',
        mobile_number: user?.mobile_number && user.mobile_number !== '—' ? user.mobile_number : '',
        city: user?.city && user.city !== '—' ? user.city : '',
        is_active: user?.is_active ?? true
    });

    // Document Limit state initialization
    const getInitialLimit = () => {
        if (user?.document_limit === null) return { type: 'unlimited', custom: '' };
        if ([10, 50, 100, 500].includes(user?.document_limit)) return { type: String(user.document_limit), custom: '' };
        if (typeof user?.document_limit === 'number' && user?.document_limit > 0) return { type: 'custom', custom: String(user.document_limit) };
        return { type: '10', custom: '' };
    };

    const initial = getInitialLimit();
    const [docLimitType, setDocLimitType] = React.useState(initial.type);
    const [customDocLimit, setCustomDocLimit] = React.useState(initial.custom);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);

    const set = (k, v) => {
        setForm(prev => ({ ...prev, [k]: v }));
        if (error) setError(null);
    };

    const handleSave = async () => {
        // Validation checks
        const trimmedEmail = form.email ? form.email.trim() : '';
        if (trimmedEmail) {
            const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                setError('Please enter a valid email address format.');
                return;
            }
        }

        const trimmedUsername = form.username ? form.username.trim() : '';
        if (!trimmedUsername) {
            setError('Username cannot be empty.');
            return;
        }
        if (trimmedUsername.length < 3) {
            setError('Username must be at least 3 characters.');
            return;
        }

        const trimmedMobile = form.mobile_number ? form.mobile_number.trim() : '';
        if (trimmedMobile) {
            const digitsOnly = /^\d{10}$/;
            if (!digitsOnly.test(trimmedMobile)) {
                setError('Mobile number must be exactly 10 digits (numbers only).');
                return;
            }
        }

        let finalDocLimit;
        if (docLimitType === 'unlimited') {
            finalDocLimit = null;
        } else if (docLimitType === 'custom') {
            const parsed = parseInt(customDocLimit, 10);
            if (isNaN(parsed) || parsed < 1) {
                setError('Please enter a valid positive integer (at least 1) for the custom document limit.');
                return;
            }
            finalDocLimit = parsed;
        } else {
            finalDocLimit = parseInt(docLimitType, 10);
        }

        setSaving(true);
        setError(null);
        try {
            const payload = {
                full_name: form.full_name ? form.full_name.trim() : '',
                email: trimmedEmail || '',
                username: trimmedUsername,
                mobile_number: trimmedMobile || '',
                city: form.city ? form.city.trim() : '',
                is_active: form.is_active,
                document_limit: finalDocLimit
            };

            const res = await window.apiFetch(`/api/admin/users/${user.id}`, {
                method: 'PUT',
                body: payload
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                onSaved(data);
            } else {
                setError(data.detail || 'Failed to update user profile.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-sans" onClick={() => !saving && onClose()}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-modal border border-slate-100 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                            ✏️
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Edit User Profile</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono font-bold text-slate-400">User #{user.id}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                                    {user.auth_provider || 'local'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="text-slate-400 hover:text-slate-700 text-2xl leading-none transition-colors p-2"
                    >
                        &times;
                    </button>
                </div>

                {/* Body Form */}
                <div className="p-8 overflow-y-auto space-y-5 custom-scrollbar">
                    {/* Document Safety Banner */}
                    <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex gap-3 items-start text-xs text-blue-800">
                        <span className="text-base">🛡</span>
                        <div className="leading-relaxed">
                            <span className="font-black">In-Place Update: </span>
                            Editing this profile updates account metadata in-place. All existing documents, drafts, PDFs, and wallet balances remain permanently attached to User #{user.id}.
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-start text-xs text-rose-700 animate-modal">
                            <span className="text-base">⚠️</span>
                            <div className="font-bold leading-relaxed">{error}</div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* 1. User ID & 2. Auth Provider (Read-Only) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    1. User ID (Read-Only)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        value={`#${user?.id || '—'}`}
                                        className="w-full px-4 py-3 bg-slate-100/90 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 font-mono cursor-not-allowed select-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-500">
                                        Fixed
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    2. Auth Provider (Read-Only)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        value={String(user?.auth_provider || 'local').toUpperCase()}
                                        className="w-full px-4 py-3 bg-slate-100/90 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 font-mono uppercase cursor-not-allowed select-all"
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                        String(user?.auth_provider).toLowerCase() === 'google'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : String(user?.auth_provider).toLowerCase() === 'both'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {String(user?.auth_provider).toLowerCase() === 'google' ? '🌐 Google' : String(user?.auth_provider).toLowerCase() === 'both' ? '🔗 Both' : '🔑 Local'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Full Name */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                3. Full Name
                            </label>
                            <input
                                type="text"
                                value={form.full_name}
                                onChange={e => set('full_name', e.target.value)}
                                placeholder="Enter full name"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>

                        {/* 4. Username */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                4. Username
                            </label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={e => set('username', e.target.value)}
                                placeholder="username"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono"
                            />
                        </div>

                        {/* 5. Email Address */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                5. Email Address
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => set('email', e.target.value)}
                                placeholder="user@example.com"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono"
                            />
                            <p className="text-[11px] text-slate-400 font-medium mt-1 ml-1">
                                Used for account identification, notifications, and password resets.
                            </p>
                        </div>

                        {/* 6. Mobile Number */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                6. Mobile Number
                            </label>
                            <input
                                type="text"
                                value={form.mobile_number}
                                onChange={e => set('mobile_number', e.target.value)}
                                placeholder="10-digit mobile number"
                                maxLength={10}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono"
                            />
                        </div>

                        {/* 7. City */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                7. City
                            </label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={e => set('city', e.target.value)}
                                placeholder="e.g. Ahmedabad"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                        </div>

                        {/* 8. Document Creation Limit */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    8. 📄 Document Creation Limit
                                </label>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                    {docLimitType === 'unlimited' ? 'Unlimited' : `${docLimitType === 'custom' ? (customDocLimit || 'Custom') : docLimitType} Docs`}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <select
                                        value={docLimitType}
                                        onChange={e => {
                                            setDocLimitType(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="10">10 (Normal / Default)</option>
                                        <option value="50">50 (Starter)</option>
                                        <option value="100">100 (Premium)</option>
                                        <option value="500">500 (Pro)</option>
                                        <option value="unlimited">Unlimited</option>
                                        <option value="custom">Custom number...</option>
                                    </select>
                                </div>
                                {docLimitType === 'custom' && (
                                    <div>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={customDocLimit}
                                            onChange={e => {
                                                setCustomDocLimit(e.target.value);
                                                if (error) setError(null);
                                            }}
                                            placeholder="Enter positive integer"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono"
                                        />
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                Controls how many total draft/completed documents this account can hold. Unlimited allows unrestricted document generation.
                            </p>
                        </div>

                        {/* 9. Account Active Status */}
                        <div className="pt-2">
                            <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => set('is_active', e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-slate-700 block">9. Account Active Status</span>
                                    <span className="text-slate-400 font-medium">When active, user can log in and generate documents.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
                    <button
                        disabled={saving}
                        onClick={onClose}
                        className="px-5 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={saving}
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <EditIcon size={14} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── User Management Panel ──────────────────────────────────────────────────
const UserManagement = ({ currentAdminUsername, refreshTrigger }) => {
    const [users, setUsers] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);

    // Filter states
    const [search, setSearch] = React.useState('');
    const [userSearch, setUserSearch] = React.useState('');
    const [emailFilter, setEmailFilter] = React.useState('');
    const [contactFilter, setContactFilter] = React.useState('');
    const [cityFilter, setCityFilter] = React.useState('');
    const [roleFilter, setRoleFilter] = React.useState('all');
    const [sort, setSort] = React.useState('newest');
    const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [togglingId, setTogglingId] = React.useState(null);
    const [editingUser, setEditingUser] = React.useState(null);
    const [userToDelete, setUserToDelete] = React.useState(null);
    const [isSingleDeleting, setIsSingleDeleting] = React.useState(false);

    // Test account detection matching backend conventions
    const isTestAccount = React.useCallback((u) => {
        if (!u) return false;
        const uname = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const fullName = (u.full_name || '').toLowerCase();
        const testKeywords = ['test', 'sample', 'temp', 'demo', 'mock', 'fake', 'dummy', 'pytest'];
        const testDomains = ['@test.local', '@draftsetu.local', '@example.com', '@test.com', '@localhost'];
        if (testKeywords.some(kw => uname.includes(kw) || email.includes(kw) || fullName.includes(kw))) return true;
        if (testDomains.some(dom => email.endsWith(dom))) return true;
        if (/^(loc_|goog_|usr_|u1|u2|adm_|admin_usr_|admin_pag_|admin_test_|sample_usr_|sample_bulk_|reg_usr_|other_admin_|test_)/i.test(uname)) return true;
        return false;
    }, []);

    const isDeletable = React.useCallback((u) => {
        if (!u) return false;
        const activeAdmin = (currentAdminUsername || localStorage.getItem('currentUser') || '').trim();
        if (activeAdmin && u.username && u.username.trim().toLowerCase() === activeAdmin.toLowerCase()) {
            return false;
        }
        if (u.is_admin) return isTestAccount(u);
        return true;
    }, [currentAdminUsername, isTestAccount]);

    // Checkbox selection for test users
    const [selectedUserIds, setSelectedUserIds] = React.useState(new Set());
    const [showBulkDeleteModal, setShowBulkDeleteModal] = React.useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);
    const [isExportingExcel, setIsExportingExcel] = React.useState(false);

    const debounceTimerRef = React.useRef(null);

    const loadUsers = React.useCallback(async (
        searchVal,
        sortVal,
        pageVal,
        roleVal,
        userSearchVal,
        emailVal,
        contactVal,
        cityVal,
        sizeVal
    ) => {
        setLoading(true);
        setError(null);
        try {
            const effectiveSize = sizeVal || pageSize || 20;
            const params = new URLSearchParams({
                search: searchVal || '',
                sort: sortVal || 'newest',
                page: pageVal || 1,
                page_size: effectiveSize,
                role: roleVal || 'all'
            });
            if (userSearchVal && userSearchVal.trim()) params.set('user_search', userSearchVal.trim());
            if (emailVal && emailVal.trim()) params.set('email', emailVal.trim());
            if (contactVal && contactVal.trim()) params.set('mobile', contactVal.trim());
            if (cityVal && cityVal.trim()) params.set('city', cityVal.trim());

            const res = await window.apiFetch(`/api/admin/users?${params}`);
            const data = await res.json();
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
            setPage(data.page || 1);
            setSelectedUserIds(new Set());
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    React.useEffect(() => {
        loadUsers(search, sort, page, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize);
    }, [refreshTrigger]);

    // Debounced search & filter trigger (resets to page 1 on filter/search change)
    React.useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            loadUsers(search, sort, 1, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize);
        }, 300);
        return () => clearTimeout(debounceTimerRef.current);
    }, [search, sort, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize]);

    const isAnyFilterActive = Boolean(
        search ||
        userSearch ||
        emailFilter ||
        contactFilter ||
        cityFilter ||
        roleFilter !== 'all' ||
        sort !== 'newest'
    );

    const handleClearFilters = () => {
        setSearch('');
        setUserSearch('');
        setEmailFilter('');
        setContactFilter('');
        setCityFilter('');
        setRoleFilter('all');
        setSort('newest');
        setPage(1);
        loadUsers('', 'newest', 1, 'all', '', '', '', '', pageSize);
    };

    const handlePageSizeChange = (newSize) => {
        const size = parseInt(newSize, 10);
        setPageSize(size);
        setPage(1);
        loadUsers(search, sort, 1, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, size);
    };

    const handleToggleStatus = async (user) => {
        setTogglingId(user.id);
        try {
            const res = await window.apiFetch(`/api/admin/users/${user.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !user.is_active })
            });
            if (res.ok) {
                const updated = await res.json();
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: updated.is_active } : u));
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'Failed to update user status');
            }
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        } finally {
            setTogglingId(null);
        }
    };

    const handleUserSaved = (updatedUser) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        setEditingUser(null);
    };

    // Single User Deletion Handler
    const handleSingleDelete = async () => {
        if (!userToDelete || isSingleDeleting) return;
        setIsSingleDeleting(true);
        try {
            const res = await window.apiFetch(`/api/admin/users/${userToDelete.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok) {
                const deletedName = userToDelete.username;
                const wasAdmin = userToDelete.is_admin;
                setUserToDelete(null);
                setSelectedUserIds(prev => {
                    const next = new Set(prev);
                    next.delete(userToDelete.id);
                    return next;
                });
                loadUsers(search, sort, page, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize);
                alert(data.message || `User '${deletedName}' (${wasAdmin ? 'Test Admin' : 'User'}) was permanently deleted.`);
            } else {
                alert(data.detail || 'Failed to delete user');
            }
        } catch (err) {
            alert('Error deleting user: ' + err.message);
        } finally {
            setIsSingleDeleting(false);
        }
    };

    // Checkbox Handlers
    const toggleSelectUser = (userId) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const selectableUsers = users.filter(isDeletable);
    const isAllSelected = selectableUsers.length > 0 && selectableUsers.every(u => selectedUserIds.has(u.id));

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(selectableUsers.map(u => u.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUserIds.size === 0 || isBulkDeleting) return;
        setIsBulkDeleting(true);
        try {
            const res = await window.apiFetch('/api/admin/users/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_ids: Array.from(selectedUserIds) })
            });
            const data = await res.json();
            if (res.ok) {
                setShowBulkDeleteModal(false);
                setSelectedUserIds(new Set());
                loadUsers(search, sort, page, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize);
                alert(`Successfully deleted ${data.deleted_count} test user(s).`);
            } else {
                alert(data.detail || 'Failed to delete test users');
            }
        } catch (err) {
            alert('Error deleting test users: ' + err.message);
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            const res = await window.apiFetch('/api/admin/users/export-excel');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.detail || 'Failed to export Excel');
                return;
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `DraftSetu_Users_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Export failed: ' + err.message);
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handlePage = (p) => {
        if (p < 1 || p > totalPages || p === page) return;
        loadUsers(search, sort, p, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize);
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        if (page <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (page >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
        }
        return pages;
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return '—'; }
    };

    // Toggle column sorting
    const toggleSort = (colKey) => {
        if (colKey === 'user') {
            setSort(prev => prev === 'username_asc' ? 'username_desc' : 'username_asc');
        } else if (colKey === 'credits') {
            setSort(prev => prev === 'credits_desc' ? 'credits_asc' : 'credits_desc');
        } else if (colKey === 'docs') {
            setSort(prev => (prev === 'docs_desc' || prev === 'most_docs') ? 'docs_asc' : 'docs_desc');
        } else if (colKey === 'joined') {
            setSort(prev => prev === 'newest' ? 'oldest' : 'newest');
        }
    };

    const renderSortIndicator = (colKey) => {
        if (colKey === 'user') {
            if (sort === 'username_asc') return <span className="text-blue-600 font-black ml-1">↑</span>;
            if (sort === 'username_desc') return <span className="text-blue-600 font-black ml-1">↓</span>;
            return <span className="text-slate-300 ml-1 group-hover:text-slate-500">⇅</span>;
        }
        if (colKey === 'credits') {
            if (sort === 'credits_desc') return <span className="text-blue-600 font-black ml-1">↓</span>;
            if (sort === 'credits_asc') return <span className="text-blue-600 font-black ml-1">↑</span>;
            return <span className="text-slate-300 ml-1 group-hover:text-slate-500">⇅</span>;
        }
        if (colKey === 'docs') {
            if (sort === 'docs_desc' || sort === 'most_docs') return <span className="text-blue-600 font-black ml-1">↓</span>;
            if (sort === 'docs_asc') return <span className="text-blue-600 font-black ml-1">↑</span>;
            return <span className="text-slate-300 ml-1 group-hover:text-slate-500">⇅</span>;
        }
        if (colKey === 'joined') {
            if (sort === 'newest') return <span className="text-blue-600 font-black ml-1">↓</span>;
            if (sort === 'oldest') return <span className="text-blue-600 font-black ml-1">↑</span>;
            return <span className="text-slate-300 ml-1 group-hover:text-slate-500">⇅</span>;
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-4 animate-modal">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">User Management</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                        Registered Accounts, Permissions & Profiles
                    </p>
                </div>
                <div className="flex items-center gap-3 self-stretch sm:self-auto">
                    {/* Excel Download Button */}
                    <button
                        onClick={handleExportExcel}
                        disabled={isExportingExcel || loading}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        title="Download complete user dataset as Excel (.xlsx)"
                    >
                        {isExportingExcel ? '⏳ Exporting...' : '📊 Download Excel'}
                    </button>

                    <button
                        onClick={() => loadUsers(search, sort, page, roleFilter, userSearch, emailFilter, contactFilter, cityFilter, pageSize)}
                        className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                        title="Refresh user list"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Bulk Actions Banner (when 1+ users selected) */}
            {selectedUserIds.size > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-900 shadow-sm mx-1 animate-modal">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🗑️</span>
                        <div>
                            <span className="font-black block">{selectedUserIds.size} user(s) selected</span>
                            <span className="text-rose-700 text-[11px]">Select test users for safe bulk cleanup. Administrator accounts are excluded.</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedUserIds(new Set())}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-slate-600 hover:bg-slate-50 uppercase text-[10px] tracking-wider transition"
                        >
                            Deselect All
                        </button>
                        <button
                            onClick={() => setShowBulkDeleteModal(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2 rounded-xl uppercase tracking-wider text-[10px] shadow-md shadow-rose-200 transition-all flex items-center gap-1.5"
                        >
                            <TrashIcon size={13} />
                            <span>Delete Selected ({selectedUserIds.size})</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Controls: Global Search + Role Filter + Column Filters toggle + Clear Filters */}
            <div className="space-y-3 px-1">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                    {/* Global Search Input */}
                    <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm pointer-events-none">🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Global Search (Name, Username, Email, Mobile, City)..."
                            className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm font-sans"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 text-lg leading-none p-1"
                                title="Clear global search"
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {/* Role Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                        {[
                            ['all', 'All Roles'],
                            ['user', 'Users'],
                            ['admin', 'Admins']
                        ].map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setRoleFilter(val)}
                                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    roleFilter === val
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Advanced Column Filters Toggle Button */}
                    <button
                        onClick={() => setShowAdvancedFilters(prev => !prev)}
                        className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 whitespace-nowrap ${
                            showAdvancedFilters || userSearch || emailFilter || contactFilter || cityFilter
                                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <span>⚙️ Column Filters</span>
                        {(userSearch || emailFilter || contactFilter || cityFilter) && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        )}
                    </button>

                    {/* Clear Filters Button (active when any filter is present) */}
                    {isAnyFilterActive && (
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 animate-modal"
                            title="Reset all search queries, column filters, role filters, and sorting"
                        >
                            <span>✕ Clear Filters</span>
                        </button>
                    )}
                </div>

                {/* Advanced Column Filters Panel (Expandable) */}
                {showAdvancedFilters && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-modal shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                Specific Column Searches & Filters
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                                Search specifically across individual user fields
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* User: Name & Username */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                    User (Name / Username)
                                </label>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    placeholder="Filter by name or username"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-300 focus:border-blue-500 outline-none transition"
                                />
                            </div>

                            {/* Email Filter */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                    Email
                                </label>
                                <input
                                    type="text"
                                    value={emailFilter}
                                    onChange={e => setEmailFilter(e.target.value)}
                                    placeholder="Filter by email"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-300 focus:border-blue-500 outline-none transition font-mono"
                                />
                            </div>

                            {/* Contact Filter */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                    Contact (Mobile)
                                </label>
                                <input
                                    type="text"
                                    value={contactFilter}
                                    onChange={e => setContactFilter(e.target.value)}
                                    placeholder="Filter by mobile"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-300 focus:border-blue-500 outline-none transition font-mono"
                                />
                            </div>

                            {/* City Filter */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={cityFilter}
                                    onChange={e => setCityFilter(e.target.value)}
                                    placeholder="Filter by city"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-300 focus:border-blue-500 outline-none transition"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table Area */}
            <div className="w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/60 rounded-2xl shadow-sm min-h-[360px]">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Users…</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/60 rounded-2xl shadow-sm min-h-[360px] text-slate-300 grayscale opacity-60">
                        <div className="text-8xl mb-6">👥</div>
                        <p className="font-black uppercase tracking-widest text-sm text-slate-500">No matching users found</p>
                        {isAnyFilterActive && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition hover:bg-blue-700"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="premium-card bg-white border border-slate-200/60 overflow-hidden shadow-sm min-h-[460px] flex flex-col">
                        <div className="overflow-x-auto flex-1">
                            {/* Table Header: 1.User 2.Email 3.Contact 4.City 5.Credits 6.Docs 7.Role 8.Joined 9.Actions */}
                            <div className="grid grid-cols-[40px_1.4fr_1.3fr_115px_110px_90px_75px_80px_100px_135px] min-w-[1020px] gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center select-none">
                                {/* Select All Checkbox */}
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                        title="Select all non-admin users on this page"
                                    />
                                </div>

                                {/* 1. User (Sortable) */}
                                <div
                                    onClick={() => toggleSort('user')}
                                    className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition group"
                                    title="Sort by Username / Name"
                                >
                                    <span>User</span>
                                    {renderSortIndicator('user')}
                                </div>

                                {/* 2. Email */}
                                <div>
                                    <span>Email</span>
                                </div>

                                {/* 3. Contact */}
                                <div>
                                    <span>Contact</span>
                                </div>

                                {/* 4. City */}
                                <div>
                                    <span>City</span>
                                </div>

                                {/* 5. Credits (Sortable) */}
                                <div
                                    onClick={() => toggleSort('credits')}
                                    className="text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-700 transition group"
                                    title="Sort by Credit Balance"
                                >
                                    <span>Credits</span>
                                    {renderSortIndicator('credits')}
                                </div>

                                {/* 6. Docs (Sortable) */}
                                <div
                                    onClick={() => toggleSort('docs')}
                                    className="text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-700 transition group"
                                    title="Sort by Document Count"
                                >
                                    <span>Docs</span>
                                    {renderSortIndicator('docs')}
                                </div>

                                {/* 7. Role */}
                                <div className="text-center">
                                    <span>Role</span>
                                </div>

                                {/* 8. Joined (Sortable) */}
                                <div
                                    onClick={() => toggleSort('joined')}
                                    className="text-center flex items-center justify-center gap-1 cursor-pointer hover:text-slate-700 transition group"
                                    title="Sort newest/oldest"
                                >
                                    <span>Joined</span>
                                    {renderSortIndicator('joined')}
                                </div>

                                {/* 9. Actions */}
                                <div className="text-center">
                                    <span>Actions</span>
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-slate-100 min-w-[1020px]">
                                {users.map(u => {
                                    const activeAdmin = (currentAdminUsername || localStorage.getItem('currentUser') || '').trim();
                                    const isSelf = Boolean(activeAdmin && u.username && u.username.trim().toLowerCase() === activeAdmin.toLowerCase());
                                    const deletable = isDeletable(u);
                                    const isSelected = selectedUserIds.has(u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            className={`grid grid-cols-[40px_1.4fr_1.3fr_115px_110px_90px_75px_80px_100px_135px] gap-3 px-6 py-4 items-center transition-colors hover:bg-slate-50/80 ${
                                                isSelected ? 'bg-blue-50/40' : ''
                                            }`}
                                        >
                                            {/* Selection Checkbox */}
                                            <div className="flex items-center justify-center">
                                                {!deletable ? (
                                                    <span className="text-[10px] text-slate-300 font-mono" title={isSelf ? "Your account" : "Admin protected"}>—</span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectUser(u.id)}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                                                    />
                                                )}
                                            </div>

                                            {/* 1. User Identity */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm ${
                                                    u.is_admin
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {(u.full_name || u.username || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-800 text-xs truncate">
                                                            {u.full_name && u.full_name !== '—' ? u.full_name : u.username}
                                                        </span>
                                                        {isSelf && (
                                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                                                            @{u.username}
                                                        </span>
                                                        <span className="text-[9px] text-slate-300 font-mono">
                                                            #{u.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Email */}
                                            <div className="min-w-0">
                                                <span className="text-xs text-slate-700 font-medium block truncate font-mono" title={u.email || ''}>
                                                    {u.email && u.email !== '—' ? u.email : <span className="text-slate-300 italic font-sans">No email</span>}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    {u.auth_provider === 'google' ? '🌐 Google' : '🔑 Password'}
                                                </span>
                                            </div>

                                            {/* 3. Contact */}
                                            <div className="text-xs text-slate-700 font-mono font-bold truncate">
                                                {u.mobile_number && u.mobile_number !== '—' ? u.mobile_number : <span className="text-slate-300 font-sans font-normal">—</span>}
                                            </div>

                                            {/* 4. City */}
                                            <div className="text-xs text-slate-600 font-medium truncate">
                                                {u.city && u.city !== '—' ? u.city : <span className="text-slate-300 font-normal">—</span>}
                                            </div>

                                            {/* 5. Credits / Wallet */}
                                            <div className="text-center">
                                                <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200/80 shadow-xs">
                                                    🪙 {u.credits ?? u.wallet_balance ?? 0}
                                                </span>
                                            </div>

                                            {/* 6. Documents Count & Limit */}
                                            <div className="text-center font-mono font-black text-xs text-slate-700">
                                                <span>{u.documents_count ?? u.doc_count ?? 0}</span>
                                                <span className="text-[10px] text-slate-400 font-normal"> / {u.document_limit === null ? '∞' : (u.document_limit ?? 10)}</span>
                                            </div>

                                            {/* 7. Role */}
                                            <div className="text-center">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                                    u.is_admin
                                                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    {u.is_admin ? 'Admin' : 'User'}
                                                </span>
                                            </div>

                                            {/* 8. Joined */}
                                            <div className="text-center text-[11px] text-slate-500 font-medium">
                                                {formatDate(u.created_at)}
                                            </div>

                                            {/* 9. Actions */}
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => setEditingUser(u)}
                                                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white shadow-xs flex items-center gap-1 active:scale-95"
                                                    title="Edit user details"
                                                >
                                                    <EditIcon size={12} />
                                                    <span>Edit</span>
                                                </button>

                                                {!isSelf && !u.is_admin && (
                                                    <button
                                                        disabled={togglingId === u.id}
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={`px-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border disabled:opacity-50 active:scale-95 ${
                                                            u.is_active
                                                                ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                                                                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                                        }`}
                                                        title={u.is_active ? 'Disable user account' : 'Enable user account'}
                                                    >
                                                        {u.is_active ? 'Disable' : 'Enable'}
                                                    </button>
                                                )}

                                                {deletable && (
                                                    <button
                                                        disabled={isSingleDeleting || isBulkDeleting}
                                                        onClick={() => setUserToDelete(u)}
                                                        className="px-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white shadow-xs flex items-center gap-1 disabled:opacity-50 active:scale-95"
                                                        title={`Permanently delete ${u.is_admin ? 'test admin' : 'user'} account`}
                                                    >
                                                        <TrashIcon size={12} />
                                                        <span>Delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Single Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-sans" onClick={() => !isSingleDeleting && setUserToDelete(null)}>
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-modal border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
                                🗑️
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                    Delete {userToDelete.is_admin ? 'Test Admin' : 'User'} Account
                                </h3>
                                <p className="text-xs text-rose-600 font-black uppercase tracking-widest mt-1">Irreversible Account Deletion</p>
                            </div>
                            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2">
                                <p className="font-bold">
                                    Are you sure you want to permanently delete <span className="font-black text-rose-700">@{userToDelete.username}</span> (#{userToDelete.id})?
                                </p>
                                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                                    <li>User profile, credentials, and account records will be permanently removed.</li>
                                    <li>Associated wallet balance, payment orders, and generated documents will be cleaned up.</li>
                                    {userToDelete.is_admin && (
                                        <li className="font-bold text-rose-700">Account identified as a test administrator account.</li>
                                    )}
                                    <li>This action <span className="font-black text-rose-600">CANNOT BE UNDONE</span>.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
                            <button
                                disabled={isSingleDeleting}
                                onClick={() => setUserToDelete(null)}
                                className="px-5 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isSingleDeleting}
                                onClick={handleSingleDelete}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSingleDeleting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon size={14} />
                                        <span>Delete User</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-sans" onClick={() => !isBulkDeleting && setShowBulkDeleteModal(false)}>
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-modal border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
                                ⚠️
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Confirm Bulk User Deletion</h3>
                                <p className="text-xs text-rose-600 font-black uppercase tracking-widest mt-1">Irreversible Test User Cleanup</p>
                            </div>
                            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2">
                                <p className="font-bold">
                                    Are you sure you want to permanently delete <span className="font-black text-rose-700">{selectedUserIds.size} selected user account(s)</span>?
                                </p>
                                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                                    <li>Selected test user accounts and test administrator accounts will be permanently removed.</li>
                                    <li>Associated test wallet balances and test documents will be cleaned up.</li>
                                    <li>Your logged-in admin account and real administrators are protected.</li>
                                    <li>This action <span className="font-black text-rose-600">CANNOT BE UNDONE</span>.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
                            <button
                                disabled={isBulkDeleting}
                                onClick={() => setShowBulkDeleteModal(false)}
                                className="px-5 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isBulkDeleting}
                                onClick={handleBulkDelete}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isBulkDeleting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon size={14} />
                                        <span>Delete {selectedUserIds.size} Users</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSaved={handleUserSaved}
                />
            )}

            {/* Pagination */}
            {total > 0 && (
                <div className="bg-slate-50 px-5 py-3 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl shadow-xs">
                    {/* Left: Info Label & Page Size Selector */}
                    <div className="flex items-center gap-3.5 flex-wrap">
                        <div className="text-xs font-bold text-slate-500">
                            Showing <span className="font-black text-slate-800">{(page - 1) * pageSize + 1}</span>–<span className="font-black text-slate-800">{Math.min(page * pageSize, total)}</span> of <span className="font-black text-slate-800">{total}</span>
                        </div>
                        <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span>Per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => handlePageSizeChange(e.target.value)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Page Navigation Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <ArrowLeftIcon size={12} />
                            <span>Prev</span>
                        </button>

                        {getPageNumbers().map((p, idx) => {
                            if (p === '...') {
                                return (
                                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-black text-slate-300 select-none">
                                        …
                                    </span>
                                );
                            }
                            const isCurrent = p === page;
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePage(p)}
                                    className={`w-8 h-8 text-xs font-black rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                                        isCurrent
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-xs'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <span>Next</span>
                            <ArrowRightIcon size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Admin Payments & Razorpay Monitoring Panel ─────────────────────────────
const AdminPaymentsPanel = ({ refreshTrigger }) => {
    const [payments, setPayments] = React.useState([]);
    const [metrics, setMetrics] = React.useState({
        total_orders: 0,
        successful_orders: 0,
        failed_orders: 0,
        fulfillment_pending: 0,
        total_revenue_inr: 0
    });
    const [total, setTotal] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);

    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [reconcilingId, setReconcilingId] = React.useState(null);

    const searchRef = React.useRef(null);

    const loadPayments = React.useCallback(async (searchVal, statusVal, pageVal, sizeVal) => {
        setLoading(true);
        setError(null);
        try {
            const currentSize = sizeVal || pageSize;
            const params = new URLSearchParams({
                search: searchVal || '',
                status: statusVal || 'all',
                page: pageVal || 1,
                page_size: currentSize
            });
            const res = await window.apiFetch(`/api/admin/payments?${params}`);
            const data = await res.json();
            setPayments(data.items || []);
            setMetrics(data.metrics || {});
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
            setPage(data.page || 1);
        } catch (err) {
            setError(err.message || 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    React.useEffect(() => {
        loadPayments(search, statusFilter, page, pageSize);
    }, [refreshTrigger]);

    // Debounced search & filter trigger (resets to page 1 on filter/search/pageSize change)
    React.useEffect(() => {
        if (searchRef.current) clearTimeout(searchRef.current);
        searchRef.current = setTimeout(() => {
            loadPayments(search, statusFilter, 1, pageSize);
        }, 300);
        return () => clearTimeout(searchRef.current);
    }, [search, statusFilter, pageSize]);

    const handleStatusFilter = (st) => {
        setStatusFilter(st);
        setPage(1);
        loadPayments(search, st, 1, pageSize);
    };

    const handlePageSizeChange = (newSize) => {
        const size = parseInt(newSize, 10);
        setPageSize(size);
        setPage(1);
        loadPayments(search, statusFilter, 1, size);
    };

    const handlePage = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            loadPayments(search, statusFilter, newPage, pageSize);
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        if (page <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (page >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
        }
        return pages;
    };

    const handleReconcile = async (orderId) => {
        if (!window.confirm(`Fulfill wallet credits for order ${orderId}?`)) return;
        setReconcilingId(orderId);
        try {
            const res = await window.apiFetch(`/api/admin/payments/${orderId}/reconcile`, {
                method: 'POST'
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                alert(data.message || 'Successfully credited user.');
                loadPayments(search, statusFilter, page, pageSize);
            } else {
                alert(data.detail || 'Failed to reconcile payment.');
            }
        } catch (err) {
            alert('Reconciliation failed: ' + err.message);
        } finally {
            setReconcilingId(null);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return '—'; }
    };

    return (
        <div className="flex flex-col gap-4 animate-modal">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Razorpay & Payments</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                        Gateway Verification & Wallet Fulfillment Monitor
                    </p>
                </div>
                <button
                    onClick={() => loadPayments(search, statusFilter, page, pageSize)}
                    className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                    title="Refresh payments"
                >
                    🔄
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 px-1">
                <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total Revenue</span>
                    <span className="text-xl font-black text-slate-800 font-mono mt-1 block">
                        ₹{metrics.total_revenue_inr?.toLocaleString('en-IN') || 0}
                    </span>
                </div>
                <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Successful Payments</span>
                    <span className="text-xl font-black text-emerald-600 font-mono mt-1 block">
                        {metrics.successful_orders || 0}
                    </span>
                </div>
                <div className={`p-3.5 rounded-2xl border shadow-sm ${
                    metrics.fulfillment_pending > 0
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200/60'
                }`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block flex items-center gap-1">
                        {metrics.fulfillment_pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                        Fulfillment Pending
                    </span>
                    <span className="text-xl font-black text-amber-700 font-mono mt-1 block">
                        {metrics.fulfillment_pending || 0}
                    </span>
                </div>
                <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block">Failed / Cancelled</span>
                    <span className="text-xl font-black text-rose-600 font-mono mt-1 block">
                        {metrics.failed_orders || 0}
                    </span>
                </div>
            </div>

            {/* Warning Banner if Fulfillment is Pending */}
            {metrics.fulfillment_pending > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900 shadow-sm mx-1 animate-modal">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <span className="font-black block">Action Required: {metrics.fulfillment_pending} payment(s) captured with pending credit fulfillment.</span>
                            <span className="text-amber-700 text-[11px]">Payment succeeded on Razorpay, but wallet credit was delayed or interrupted. Click "⚡ Fulfill" to credit user.</span>
                        </div>
                    </div>
                    <button
                        onClick={() => handleStatusFilter('fulfillment_pending')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider text-[10px] shadow-sm transition-all shrink-0"
                    >
                        Filter Pending ({metrics.fulfillment_pending})
                    </button>
                </div>
            )}

            {/* Controls: Search + Filter */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center px-1">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm pointer-events-none">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by Order ID, Payment ID, user, email…"
                        className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm font-sans"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 text-lg leading-none p-1">&times;</button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto">
                    {[
                        ['all', 'All Orders'],
                        ['success', '✅ Paid'],
                        ['fulfillment_pending', '⚠️ Pending Credit'],
                        ['created', '⏳ In Progress'],
                        ['failed', '❌ Failed']
                    ].map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => handleStatusFilter(val)}
                            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                statusFilter === val
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table Area */}
            <div className="w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/60 rounded-2xl shadow-sm min-h-[360px]">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Payments…</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/60 rounded-2xl shadow-sm min-h-[360px] text-slate-300 grayscale opacity-60">
                        <div className="text-8xl mb-6">💳</div>
                        <p className="font-black uppercase tracking-widest text-sm text-slate-500">No payment records found</p>
                    </div>
                ) : (
                    <div className="premium-card bg-white border border-slate-200/60 overflow-hidden shadow-sm min-h-[460px] flex flex-col">
                        <div className="overflow-x-auto flex-1">
                            {/* Table Header: Order ID | Payment ID | User | Amount | Gateway Status | Wallet Status | Date | Action */}
                            <div className="grid grid-cols-[1.3fr_1.2fr_1.3fr_110px_120px_140px_130px_90px] min-w-[1020px] gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center select-none">
                                <span>Order ID</span>
                                <span>Payment ID</span>
                                <span>User</span>
                                <span className="text-center">Amount</span>
                                <span className="text-center">Gateway Status</span>
                                <span className="text-center">Wallet Status</span>
                                <span>Date</span>
                                <span className="text-center">Action</span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {payments.map((p, idx) => (
                                    <div
                                        key={p.id}
                                        className="grid grid-cols-[1.3fr_1.2fr_1.3fr_110px_120px_140px_130px_90px] min-w-[1020px] gap-3 px-6 py-3 items-center hover:bg-slate-50/60 transition-colors animate-modal text-xs"
                                        style={{ animationDelay: `${idx * 0.02}s` }}
                                    >
                                        {/* Order ID */}
                                        <div className="min-w-0">
                                            <div className="font-mono font-bold text-slate-800 text-[11px] truncate" title={p.order_id}>
                                                {p.order_id}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold truncate">{p.plan_id}</div>
                                        </div>

                                        {/* Payment ID */}
                                        <div className="font-mono font-semibold text-slate-600 text-[11px] truncate" title={p.payment_id}>
                                            {p.payment_id || '—'}
                                        </div>

                                        {/* User */}
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-800 truncate">@{p.username}</div>
                                            <div className="text-[10px] text-slate-400 truncate" title={p.user_email || ''}>{p.user_email || '—'}</div>
                                        </div>

                                        {/* Amount & Credits */}
                                        <div className="text-center">
                                            <span className="font-black text-slate-800 font-mono block text-xs">₹{p.amount_inr}</span>
                                            <span className="text-[10px] font-bold text-amber-700 font-mono">🪙 {p.credits} cr</span>
                                        </div>

                                        {/* Gateway Status */}
                                        <div className="text-center">
                                            {p.razorpay_payment_status === 'PAID' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    PAID
                                                </span>
                                            ) : p.razorpay_payment_status === 'FAILED' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200" title={p.error_description || p.error_code || ''}>
                                                    FAILED
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                                                    PENDING
                                                </span>
                                            )}
                                        </div>

                                        {/* Wallet Fulfillment Status */}
                                        <div className="text-center">
                                            {p.fulfillment_status === 'CREDITED' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-mono" title={`Tx #${p.wallet_transaction_id}`}>
                                                    🪙 CREDITED
                                                </span>
                                            ) : p.fulfillment_status === 'FULFILLMENT_PENDING' ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300 animate-pulse font-mono font-bold" title="Payment captured on Razorpay but credits not yet added to wallet">
                                                    ⚠️ PENDING
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 font-mono">—</span>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <div className="text-[11px] text-slate-500 font-medium">
                                            {formatDate(p.created_at)}
                                        </div>

                                        {/* Action */}
                                        <div className="text-center">
                                            {p.fulfillment_status === 'FULFILLMENT_PENDING' ? (
                                                <button
                                                    disabled={reconcilingId === p.order_id}
                                                    onClick={() => handleReconcile(p.order_id)}
                                                    className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-1 mx-auto active:scale-95"
                                                    title="Fulfill wallet credit for user"
                                                >
                                                    {reconcilingId === p.order_id ? '...' : '⚡ Fulfill'}
                                                </button>
                                            ) : (
                                                <span className="text-slate-300 text-xs font-mono">—</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {total > 0 && (
                <div className="bg-slate-50 px-5 py-3 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl shadow-xs">
                    {/* Left: Info Label & Page Size Selector */}
                    <div className="flex items-center gap-3.5 flex-wrap">
                        <div className="text-xs font-bold text-slate-500">
                            Showing <span className="font-black text-slate-800">{(page - 1) * pageSize + 1}</span>–<span className="font-black text-slate-800">{Math.min(page * pageSize, total)}</span> of <span className="font-black text-slate-800">{total}</span>
                        </div>
                        <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span>Per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => handlePageSizeChange(e.target.value)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Page Navigation Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <ArrowLeftIcon size={12} />
                            <span>Prev</span>
                        </button>

                        {getPageNumbers().map((p, idx) => {
                            if (p === '...') {
                                return (
                                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-black text-slate-300 select-none">
                                        …
                                    </span>
                                );
                            }
                            const isCurrent = p === page;
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePage(p)}
                                    className={`w-8 h-8 text-xs font-black rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                                        isCurrent
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-xs'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <span>Next</span>
                            <ArrowRightIcon size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── All Documents Panel (Admin View) ───────────────────────────────────────
const AllDocumentsPanel = ({ refreshTrigger }) => {
    const [docs, setDocs] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(20);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [search, setSearch] = React.useState('');
    const [searchInput, setSearchInput] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [previewDoc, setPreviewDoc] = React.useState(null);
    const [userDetailDoc, setUserDetailDoc] = React.useState(null);   // doc row whose user we want

    const fetchDocs = React.useCallback(async (pg, srch, sts, sizeVal) => {
        setLoading(true);
        setError(null);
        try {
            const currentSize = sizeVal || pageSize;
            const params = new URLSearchParams({
                page: pg,
                page_size: currentSize,
                search: srch || '',
                status: sts || 'all',
            });
            const res = await window.apiFetch(`/api/admin/documents?${params}`);
            if (!res.ok) throw new Error('Failed to load documents');
            const data = await res.json();
            setDocs(data.documents || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
        } catch (err) {
            setError(err.message === 'SERVER_OFFLINE'
                ? 'Server is offline. Please start the backend.'
                : err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    React.useEffect(() => {
        fetchDocs(page, search, statusFilter, pageSize);
    }, [page, search, statusFilter, pageSize, refreshTrigger]);

    const handleSearch = () => {
        setPage(1);
        setSearch(searchInput.trim());
    };

    const handleStatusChange = (val) => {
        setPage(1);
        setStatusFilter(val);
    };

    const handlePageSizeChange = (newSize) => {
        const size = parseInt(newSize, 10);
        setPageSize(size);
        setPage(1);
        fetchDocs(1, search, statusFilter, size);
    };

    const handlePage = (p) => {
        if (p >= 1 && p <= totalPages && p !== page) setPage(p);
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        if (page <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (page >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
        }
        return pages;
    };

    const formatDateTime = (iso) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    const getDocPreviewFields = (doc) => {
        try {
            const data = JSON.parse(doc.data_json || '{}');
            return Object.entries(data)
                .filter(([k]) => !['is_final', 'template_id', 'template_name'].includes(k))
                .slice(0, 30);
        } catch { return []; }
    };

    const handleOpenUserDetail = (doc) => {
        if (!doc.user_id) return;
        setUserDetailDoc(doc);
    };

    return (
        <div className="h-full flex flex-col gap-5 animate-modal">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">All Documents</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Every user's drafts and finalized documents</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2">
                    Total: {total} documents
                </span>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-1 min-w-[240px] items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by username or tracking ID..."
                        className="flex-1 text-sm font-semibold text-slate-700 outline-none bg-transparent"
                    />
                    <button
                        onClick={handleSearch}
                        className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                    >Search</button>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-100">
                    {['all', 'draft', 'finalized'].map(s => (
                        <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                statusFilter === s
                                    ? 'bg-white text-blue-600 shadow-md scale-105'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >{s}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-slate-400">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mr-3"></div>
                        Loading...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-48 text-rose-500 font-semibold text-sm">{error}</div>
                ) : docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                        <span className="text-4xl mb-2">📄</span>
                        <p className="text-xs font-bold uppercase tracking-widest">No documents found</p>
                    </div>
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="py-3 px-4 text-left">User</th>
                                <th className="py-3 px-4 text-left">Template Name</th>
                                <th className="py-3 px-4 text-left">Tracking ID</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-left">Created</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {docs.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                                    {/* User */}
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                                                {(doc.username || '?')[0].toUpperCase()}
                                            </span>
                                            {doc.username}
                                        </span>
                                    </td>
                                    {/* Template Name */}
                                    <td className="py-3 px-4">
                                        <span className="text-xs font-semibold text-slate-700 max-w-[200px] truncate block" title={doc.template_name}>
                                            {doc.template_name}
                                        </span>
                                        {doc.template_id && doc.template_id !== '—' && doc.template_id !== doc.template_name && (
                                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate max-w-[200px]">{doc.template_id}</span>
                                        )}
                                    </td>
                                    {/* Tracking ID */}
                                    <td className="py-3 px-4">
                                        <span className="font-mono text-xs font-bold text-slate-600">{doc.tracking_id}</span>
                                    </td>
                                    {/* Status */}
                                    <td className="py-3 px-4 text-center">
                                        {doc.is_locked ? (
                                            doc.pdf_ready
                                                ? <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">✅ Finalized</span>
                                                : doc.pdf_generation_in_progress
                                                    ? <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200 animate-pulse">⏳ Generating PDF</span>
                                                    : <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200">⚠️ PDF Failed</span>
                                        ) : (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200 uppercase">Draft</span>
                                        )}
                                    </td>
                                    {/* Created */}
                                    <td className="py-3 px-4">
                                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">{formatDateTime(doc.created_at)}</span>
                                    </td>
                                    {/* Actions */}
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1.5 justify-center">
                                            <button
                                                onClick={() => setPreviewDoc(doc)}
                                                title="Preview document data"
                                                className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl font-bold transition border-0 cursor-pointer"
                                            >👁 Preview</button>
                                            <button
                                                onClick={() => handleOpenUserDetail(doc)}
                                                title="View user profile"
                                                className="inline-flex items-center gap-1 text-[11px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-1.5 rounded-xl font-bold transition cursor-pointer"
                                            >👤 User</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {total > 0 && (
                <div className="bg-slate-50 px-5 py-3 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl shadow-xs flex-shrink-0">
                    {/* Left: Info Label & Page Size Selector */}
                    <div className="flex items-center gap-3.5 flex-wrap">
                        <div className="text-xs font-bold text-slate-500">
                            Showing <span className="font-black text-slate-800">{(page - 1) * pageSize + 1}</span>–<span className="font-black text-slate-800">{Math.min(page * pageSize, total)}</span> of <span className="font-black text-slate-800">{total}</span>
                        </div>
                        <div className="h-3.5 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                            <span>Per page:</span>
                            <select
                                value={pageSize}
                                onChange={e => handlePageSizeChange(e.target.value)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer shadow-xs"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Right: Page Navigation Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <ArrowLeftIcon size={12} />
                            <span>Prev</span>
                        </button>

                        {getPageNumbers().map((p, idx) => {
                            if (p === '...') {
                                return (
                                    <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-black text-slate-300 select-none">
                                        …
                                    </span>
                                );
                            }
                            const isCurrent = p === page;
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePage(p)}
                                    className={`w-8 h-8 text-xs font-black rounded-xl transition-all flex items-center justify-center active:scale-95 ${
                                        isCurrent
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-xs'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 active:scale-95 shadow-xs"
                        >
                            <span>Next</span>
                            <ArrowRightIcon size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Document Preview Modal (shared) ─────────────────────────── */}
            <window.AdminDocumentPreviewModal
                previewDoc={previewDoc}
                onClose={() => setPreviewDoc(null)}
            />

            {/* ── User Details Modal (shared) ─────────────────────────────────── */}
            <window.AdminUserDetailModal
                userDetailDoc={userDetailDoc}
                onClose={() => setUserDetailDoc(null)}
            />
        </div>
    );
};

// ─── Custom Icons ────────────────────────────────────────────────────────────
const RefreshIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);

const LogOutIcon = ({ size = 16 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const AdminPanel = ({ onClose, currentUser, templates, dbTemplates, onEditTemplate, onNewTemplate, onDeleteLocalTemplate, onMenuUpdate, onTemplatesUpdate }) => {
    const [tab, setTab] = React.useState('dashboard');
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    const TABS = [
        { id: 'dashboard', icon: <LayoutDashboardIcon />, label: 'Dashboard' },
        { id: 'users', icon: <UserIcon />, label: 'Users' },
        { id: 'all-documents', icon: <FileTextIcon />, label: 'All Documents' },
        { id: 'templates', icon: <VariableIcon />, label: 'Templates' },
        { id: 'payments', icon: <CreditCardIcon />, label: 'Payments' },
        { id: 'wallets', icon: <DatabaseIcon />, label: 'Wallet Management' },
        { id: 'menu', icon: <MenuIcon />, label: 'Menu Builder' },
        { id: 'pages', icon: <FileTextIcon />, label: 'Static Pages' },
        { id: 'logs', icon: <FileTextIcon />, label: 'Activity Logs' },
        { id: 'storage', icon: <DatabaseIcon />, label: 'Storage Analytics' },
        { id: 'template-analytics', icon: <VariableIcon />, label: 'Template Analytics' },
        { id: 'template-health', icon: <VariableIcon />, label: 'Template Health' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900 animate-modal">
            <div className="bg-white border-b border-slate-100 flex items-center flex-shrink-0 h-20 shadow-xl z-10 px-8">
                <div className="flex items-center gap-4 border-r border-slate-100 pr-8 h-10 mr-8 shrink-0">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <ShieldIcon size={20} />
                    </div>
                    <span className="text-xl font-black text-slate-800 tracking-tight">DraftSetu Admin</span>
                </div>
                
                <div className="flex-1 min-w-0 mx-4 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none flex items-center">
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        {TABS.map(t => (
                            <button 
                                key={t.id} 
                                onClick={() => setTab(t.id)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0
                                    ${tab === t.id ? 'bg-white text-blue-600 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                    <button 
                        onClick={handleRefresh}
                        className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-2xl transition-all border border-slate-200 uppercase tracking-widest shrink-0"
                    >
                        <RefreshIcon size={14} /> Refresh
                    </button>
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 text-xs font-black text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-5 py-3 rounded-2xl hover:shadow-md active:scale-95 transition-all uppercase tracking-widest btn-premium shrink-0"
                    >
                        <LogOutIcon size={14} /> Exit Admin
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 bg-slate-50/50 custom-scrollbar">
                <div className="max-w-6xl mx-auto min-h-full flex flex-col pb-8">
                    {tab === 'dashboard' && <AdminDashboard refreshTrigger={refreshTrigger} />}
                    {tab === 'users' && <UserManagement currentAdminUsername={currentUser} refreshTrigger={refreshTrigger} />}
                    {tab === 'all-documents' && <AllDocumentsPanel refreshTrigger={refreshTrigger} />}
                    {tab === 'templates' && (
                        <TemplateManager 
                            localTemplates={templates} 
                            dbTemplates={dbTemplates} 
                            onEditTemplate={onEditTemplate} 
                            onNewTemplate={onNewTemplate} 
                            onDeleteLocalTemplate={onDeleteLocalTemplate} 
                            onTemplatesUpdate={onTemplatesUpdate} 
                            refreshTrigger={refreshTrigger}
                        />
                    )}
                    {tab === 'payments' && <AdminPaymentsPanel refreshTrigger={refreshTrigger} />}
                    {tab === 'menu' && (
                        <MenuBuilder 
                            onMenuUpdate={onMenuUpdate} 
                            templates={templates} 
                            dbTemplates={dbTemplates} 
                            refreshTrigger={refreshTrigger}
                        />
                    )}
                    {tab === 'pages' && <StaticPageManager refreshTrigger={refreshTrigger} />}
                    {tab === 'logs' && <window.ActivityLogs refreshTrigger={refreshTrigger} />}
                    {tab === 'storage' && <window.StorageAnalytics refreshTrigger={refreshTrigger} />}
                    {tab === 'template-analytics' && <window.TemplateAnalytics refreshTrigger={refreshTrigger} />}
                    {tab === 'template-health' && <window.TemplateHealth refreshTrigger={refreshTrigger} />}
                    {tab === 'wallets' && (
                        <window.AdminWalletPanel 
                            token={localStorage.getItem('authToken')} 
                            refreshTrigger={refreshTrigger}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Global backward compatibility
window.AdminPanel = AdminPanel;
export default AdminPanel;
