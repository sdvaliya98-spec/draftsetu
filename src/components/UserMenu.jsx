import React from 'react';

const UserMenuNode = ({ item, level = 0, onNavigate }) => {
    const [open, setOpen] = React.useState(level < 1);
    const hasChildren = item.children && item.children.length > 0;
    const handleClick = () => {
        if (hasChildren) setOpen(o => !o);
        else if (item.url) onNavigate(item.url);
    };
    return (
        <div>
            <div onClick={handleClick} style={{ paddingLeft: `${10 + level * 14}px` }}
                className={`flex items-center gap-2 py-2 pr-3 cursor-pointer rounded-lg transition-all duration-150
                    hover:bg-blue-50 hover:text-blue-700 select-none
                    ${level === 0 ? 'font-semibold text-gray-700 text-sm' : 'text-gray-500 text-sm'}`}>
                <span className="text-base leading-none flex-shrink-0">{item.icon || '📄'}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {hasChildren && (
                    <span className="text-[10px] text-gray-300 flex-shrink-0"
                        style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
                )}
            </div>
            {hasChildren && open && (
                <div className="border-l border-gray-100 ml-4">
                    {item.children.map(c => <UserMenuNode key={c.id} item={c} level={level + 1} onNavigate={onNavigate} />)}
                </div>
            )}
        </div>
    );
};

const UserMenuSidebar = ({ menuItems, isOpen, onToggle, onNavigate }) => {
    if (!isOpen) return (
        <div className="w-10 min-w-[40px] h-full bg-white border-r border-gray-200 flex flex-col items-center pt-3 no-print flex-shrink-0">
            <button onClick={onToggle} title="Open Menu"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-lg transition"
                type="button"
            >☰</button>
        </div>
    );
    return (
        <div className="w-56 min-w-[224px] h-full bg-white border-r border-gray-200 flex flex-col no-print flex-shrink-0 shadow-sm">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                <span className="font-bold text-gray-700 text-xs tracking-widest uppercase">Navigation</span>
                <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 text-lg leading-none transition" type="button">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-1 custom-scrollbar">
                {menuItems.length === 0
                    ? <div className="text-xs text-gray-400 text-center py-10">No menu items</div>
                    : menuItems.map(item => <UserMenuNode key={item.id} item={item} level={0} onNavigate={onNavigate} />)
                }
            </div>
        </div>
    );
};

const UserMenu = UserMenuSidebar;

// Global exports - expose the actual defined components
window.UserMenuSidebar = UserMenuSidebar;
window.UserMenuNode = UserMenuNode;
// Backward-compat alias in case any code references window.UserMenu
window.UserMenu = UserMenuSidebar;

export { UserMenuSidebar, UserMenuNode, UserMenu };
export default UserMenuSidebar;

