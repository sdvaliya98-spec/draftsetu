
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
    ArrowLeftIcon
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

// ─── User Management ──────────────────────────────────────────────────────────
const UserManagement = ({ currentAdminUsername, refreshTrigger }) => {
    const [users, setUsers] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [page, setPage] = React.useState(1);
    const PAGE_SIZE = 20;

    const [search, setSearch] = React.useState('');
    const [sort, setSort] = React.useState('newest');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Debounce search so we don't fire on every keystroke
    const searchRef = React.useRef(null);
    const debouncedSearch = React.useRef(search);

    const loadUsers = React.useCallback(async (searchVal, sortVal, pageVal) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                search: searchVal || '',
                sort: sortVal || 'newest',
                page: pageVal || 1,
                page_size: PAGE_SIZE
            });
            const res = await window.apiFetch(`/api/admin/users?${params}`);
            const data = await res.json();
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setTotalPages(data.total_pages || 1);
            setPage(data.page || 1);
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load & refresh trigger watch
    React.useEffect(() => {
        loadUsers(search, sort, page);
    }, [refreshTrigger]);

    // Debounced search effect
    const [deleteTargetUser, setDeleteTargetUser] = React.useState(null);
    const [isDeletingUser, setIsDeletingUser] = React.useState(false);

    React.useEffect(() => {
        if (searchRef.current) clearTimeout(searchRef.current);
        searchRef.current = setTimeout(() => {
            loadUsers(search, sort, 1);
        }, 350);
        return () => clearTimeout(searchRef.current);
    }, [search]);

    const handleSort = (newSort) => {
        setSort(newSort);
        loadUsers(search, newSort, 1);
    };

    const handlePage = (newPage) => {
        loadUsers(search, sort, newPage);
    };

    const handleToggleStatus = async (userId, currentActive, username) => {
        const actionStr = currentActive ? 'disable' : 'enable';
        const confirmMsg = `Are you sure you want to ${actionStr} user '${username}'?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await window.apiFetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                body: { is_active: !currentActive }
            });
            if (res.ok) {
                // Update local state
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive, status: !currentActive ? 'Active' : 'Disabled' } : u));
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.detail || `Failed to ${actionStr} user.`);
            }
        } catch (err) {
            alert(`Failed to ${actionStr} user: ` + err.message);
        }
    };

    const handlePermanentDeleteUser = async () => {
        if (!deleteTargetUser) return;
        setIsDeletingUser(true);
        try {
            const res = await window.apiFetch(`/api/admin/users/${deleteTargetUser.id}`, {
                method: 'DELETE'
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setDeleteTargetUser(null);
                loadUsers(search, sort, page);
            } else {
                alert(data.detail || 'Failed to permanently delete user.');
            }
        } catch (err) {
            alert('Failed to permanently delete user: ' + err.message);
        } finally {
            setIsDeletingUser(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        } catch { return '—'; }
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-modal">

            {/* Header */}
            <div className="flex items-end justify-between px-2">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">User Registry</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Status Control · {total} registered account{total !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => loadUsers(search, sort, page)}
                    className="p-3 bg-white text-slate-400 hover:text-slate-700 border border-slate-200 rounded-2xl transition hover:shadow-md active:scale-95 flex items-center justify-center font-bold text-xs gap-1 font-sans"
                >
                    🔄 REFRESH
                </button>
            </div>

            {/* Controls: Search + Sort */}
            <div className="flex flex-col sm:flex-row gap-3 px-1">
                {/* Search */}
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm pointer-events-none">🔍</span>
                    <input
                        id="user-search-input"
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by username…"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-lg leading-none"
                        >&times;</button>
                    )}
                </div>

                {/* Sort */}
                <div className="flex gap-2">
                    {[['newest', '🕐 Newest'], ['oldest', '🕐 Oldest'], ['most_docs', '📄 Most Docs']].map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => handleSort(val)}
                            className={`px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                                sort === val
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Users…</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-16 px-6">
                        <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-6 max-w-md w-full flex gap-4 items-start shadow-sm">
                            <span className="text-3xl">⚠️</span>
                            <div>
                                <h4 className="font-black text-rose-800 text-sm mb-1">Error Loading Users</h4>
                                <p className="text-xs text-rose-600 font-semibold leading-relaxed mb-4">{error}</p>
                                <button onClick={() => loadUsers(search, sort, page)} className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-md transition-all active:scale-95">Retry</button>
                            </div>
                        </div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-300 grayscale opacity-50">
                        <div className="text-8xl mb-6">👥</div>
                        <p className="font-black uppercase tracking-widest text-sm">
                            {search ? 'No users match your search' : 'No users registered yet'}
                        </p>
                    </div>
                ) : (
                    <div className="premium-card bg-white border border-slate-200/60 overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[56px_1fr_110px_140px_80px_90px_160px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</span>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-slate-50">
                            {users.map((u, idx) => (
                                <div
                                    key={u.id}
                                    className="grid grid-cols-[56px_1fr_110px_140px_80px_90px_160px] gap-4 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors group animate-modal"
                                    style={{ animationDelay: `${idx * 0.03}s` }}
                                >
                                    {/* ID */}
                                    <span className="text-xs font-black text-slate-300 font-mono">#{u.id}</span>

                                    {/* Username */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                                            u.is_admin ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {u.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-sm text-slate-700 truncate group-hover:text-slate-900 transition">{u.username}</span>
                                    </div>

                                    {/* Role */}
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full w-fit ${
                                        u.is_admin
                                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                                    }`}>
                                        {u.is_admin ? '🛡 Admin' : '👤 User'}
                                    </span>

                                    {/* Joined date */}
                                    <span className="text-xs font-bold text-slate-400 font-mono">{formatDate(u.created_at)}</span>

                                    {/* Doc count */}
                                    <div className="flex items-center justify-center">
                                        <span className={`text-sm font-black font-mono px-3 py-1 rounded-xl ${
                                            u.doc_count > 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-300'
                                        }`}>
                                            {u.doc_count}
                                        </span>
                                    </div>

                                    {/* Status */}
                                    <div className="flex items-center justify-center">
                                        {u.is_active ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                                Disabled
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-center gap-1.5">
                                        {u.username !== currentAdminUsername ? (
                                            <>
                                                <button
                                                    onClick={() => handleToggleStatus(u.id, u.is_active, u.username)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                        u.is_active
                                                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white shadow-sm'
                                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm'
                                                    }`}
                                                    title={u.is_active ? 'Disable user account' : 'Enable user account'}
                                                >
                                                    {u.is_active ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTargetUser(u)}
                                                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm flex items-center gap-1"
                                                    title="Permanently Delete User from Database"
                                                >
                                                    <TrashIcon size={12} />
                                                    <span>Delete</span>
                                                </button>
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-slate-100 text-slate-400 rounded-lg border border-slate-200">
                                                Logged In
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Permanent Delete Confirmation Modal */}
            {deleteTargetUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-sans" onClick={() => !isDeletingUser && setDeleteTargetUser(null)}>
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-modal border border-slate-100" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
                                ⚠️
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Permanent User Deletion</h3>
                                <p className="text-xs text-rose-600 font-black uppercase tracking-widest mt-1">Warning: Irreversible Action</p>
                            </div>
                            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2">
                                <p className="font-bold">
                                    Are you sure you want to permanently delete user <span className="font-black text-rose-700 font-mono">"{deleteTargetUser.username}"</span> (ID: #{deleteTargetUser.id})?
                                </p>
                                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1">
                                    <li>The user account will be permanently deleted from the database.</li>
                                    <li>Associated wallet and credit balances will be removed.</li>
                                    <li>User document submissions and files will be deleted.</li>
                                    <li>This action <span className="font-black text-rose-600">CANNOT BE UNDONE</span>.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
                            <button
                                disabled={isDeletingUser}
                                onClick={() => setDeleteTargetUser(null)}
                                className="px-5 py-2.5 border border-slate-200 rounded-xl font-black text-xs text-slate-500 hover:bg-white transition-all uppercase tracking-widest disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isDeletingUser}
                                onClick={handlePermanentDeleteUser}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeletingUser ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon size={14} />
                                        <span>Delete Permanently</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {!loading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between px-2 flex-shrink-0">
                    <span className="text-xs font-bold text-slate-400">
                        Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} users
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePage(page - 1)}
                            disabled={page <= 1}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                        >
                            <ArrowLeftIcon size={12} /> Prev
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let p;
                            if (totalPages <= 7) p = i + 1;
                            else if (page <= 4) p = i + 1;
                            else if (page >= totalPages - 3) p = totalPages - 6 + i;
                            else p = page - 3 + i;
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePage(p)}
                                    className={`w-9 h-9 text-xs font-black rounded-xl transition-all ${
                                        p === page
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                                            : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePage(page + 1)}
                            disabled={page >= totalPages}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                        >
                            Next <ArrowRightIcon size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── All Documents Panel (Admin View) ───────────────────────────────────────
const AllDocumentsPanel = ({ refreshTrigger }) => {
    const DOC_PAGE_SIZE = 20;
    const [docs, setDocs] = React.useState([]);
    const [total, setTotal] = React.useState(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [page, setPage] = React.useState(1);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [search, setSearch] = React.useState('');
    const [searchInput, setSearchInput] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [previewDoc, setPreviewDoc] = React.useState(null);
    const [userDetailDoc, setUserDetailDoc] = React.useState(null);   // doc row whose user we want

    const fetchDocs = React.useCallback(async (pg, srch, sts) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: pg,
                page_size: DOC_PAGE_SIZE,
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
    }, []);

    React.useEffect(() => {
        fetchDocs(page, search, statusFilter);
    }, [page, search, statusFilter, refreshTrigger]);

    const handleSearch = () => {
        setPage(1);
        setSearch(searchInput.trim());
    };

    const handleStatusChange = (val) => {
        setPage(1);
        setStatusFilter(val);
    };

    const handlePage = (p) => {
        if (p >= 1 && p <= totalPages) setPage(p);
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
            {!loading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between flex-shrink-0">
                    <span className="text-xs font-bold text-slate-400">
                        Showing {((page - 1) * DOC_PAGE_SIZE) + 1}–{Math.min(page * DOC_PAGE_SIZE, total)} of {total} documents
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1">
                            <ArrowLeftIcon size={12} /> Prev
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let p;
                            if (totalPages <= 7) p = i + 1;
                            else if (page <= 4) p = i + 1;
                            else if (page >= totalPages - 3) p = totalPages - 6 + i;
                            else p = page - 3 + i;
                            return (
                                <button key={p} onClick={() => handlePage(p)}
                                    className={`w-9 h-9 text-xs font-black rounded-xl transition-all ${
                                        p === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}>{p}</button>
                            );
                        })}
                        <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1">
                            Next <ArrowRightIcon size={12} />
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
        { id: 'menu', icon: <MenuIcon />, label: 'Menu Builder' },
        { id: 'pages', icon: <FileTextIcon />, label: 'Static Pages' },
        { id: 'logs', icon: <FileTextIcon />, label: 'Activity Logs' },
        { id: 'storage', icon: <DatabaseIcon />, label: 'Storage Analytics' },
        { id: 'template-analytics', icon: <VariableIcon />, label: 'Template Analytics' },
        { id: 'template-health', icon: <VariableIcon />, label: 'Template Health' },
        { id: 'wallets', icon: <DatabaseIcon />, label: 'Wallet Management' },
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

            <div className="flex-1 overflow-hidden p-10 bg-slate-50/50">
                <div className="max-w-6xl mx-auto h-full">
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
