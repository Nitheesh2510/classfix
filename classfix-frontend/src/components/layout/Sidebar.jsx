import { NavLink } from 'react-router-dom';
import { ChevronLeft, PanelLeftClose, X } from 'lucide-react';
import { APP_NAME, INSTITUTION_NAME } from '../../constants/index.js';
import { cn } from '../../utils/format.js';
import { navItemsForRole } from './navigation.js';

function BrandMark({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-sm font-bold text-teal-300">
        CF
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{APP_NAME}</span>
          <span className="block truncate text-[11px] text-navy-300">{INSTITUTION_NAME}</span>
        </span>
      ) : null}
    </div>
  );
}

function NavItems({ role, collapsed, unreadCount, onNavigate }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4" aria-label="Main">
      {navItemsForRole(role).map((section) => (
        <div key={section.id}>
          {!collapsed ? (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
              {section.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        collapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-navy-700 text-white'
                          : 'text-navy-200 hover:bg-navy-800 hover:text-white',
                      )
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                    {item.badge === 'unread' && unreadCount > 0 ? (
                      collapsed ? (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-teal-400"
                          aria-label={`${unreadCount} unread`}
                        />
                      ) : (
                        <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-semibold text-navy-950">
                          {unreadCount}
                        </span>
                      )
                    ) : null}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Fixed sidebar for desktop; collapsible to an icon rail. */
export function Sidebar({ role, collapsed, onToggleCollapse, unreadCount }) {
  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-navy-900 lg:flex',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-navy-800 px-3">
        <BrandMark collapsed={collapsed} />
      </div>

      <NavItems role={role} collapsed={collapsed} unreadCount={unreadCount} />

      <div className="border-t border-navy-800 p-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white',
            collapsed && 'justify-center px-2',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/** Slide-over navigation drawer for small screens. */
export function MobileSidebar({ open, onClose, role, unreadCount }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-navy-950/50"
      />
      <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-navy-900 shadow-panel">
        <div className="flex h-14 items-center justify-between border-b border-navy-800 px-3">
          <BrandMark collapsed={false} />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-navy-300 hover:bg-navy-800 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <NavItems role={role} collapsed={false} unreadCount={unreadCount} onNavigate={onClose} />
      </div>
    </div>
  );
}
