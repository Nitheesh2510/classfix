import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, Settings, UserCircle2 } from 'lucide-react';
import { ROLE_META } from '../../constants/index.js';
import { useAppStore } from '../../hooks/useAppStore.js';
import { initialsOf } from '../../utils/format.js';

export function Header({ onOpenNav, unreadCount }) {
  const { user, role, signOut } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const term = search.trim();
    navigate(term ? `/requests?search=${encodeURIComponent(term)}` : '/requests');
    setSearch('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenNav}
        className="cf-btn-ghost px-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <form onSubmit={submitSearch} className="relative min-w-0 flex-1 sm:max-w-md" role="search">
        <label htmlFor="global-search" className="sr-only">
          Search requests by ID, title or room
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id="global-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search CF-1001, fans, room 204…"
          className="cf-input pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Link
          to="/notifications"
          className="relative rounded-lg p-2 text-navy-700 hover:bg-slate-100"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">
              {initialsOf(user?.name)}
            </span>
            <span className="hidden text-left md:block">
              <span className="block text-xs font-semibold leading-tight text-navy-900">
                {user?.name}
              </span>
              <span className="block text-[11px] leading-tight text-slate-500">
                {ROLE_META[role]?.shortLabel ?? role}
              </span>
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-panel"
            >
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-sm font-medium text-navy-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{user?.email}</p>
              </div>

              <MenuLink to="/profile" icon={UserCircle2} onClick={() => setMenuOpen(false)}>
                Profile
              </MenuLink>
              <MenuLink to="/profile#security" icon={Settings} onClick={() => setMenuOpen(false)}>
                Change password
              </MenuLink>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                  navigate('/');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy-800 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function MenuLink({ to, icon: Icon, children, onClick }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-navy-800 hover:bg-slate-50"
    >
      <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      {children}
    </Link>
  );
}
