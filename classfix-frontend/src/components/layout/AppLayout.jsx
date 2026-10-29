import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../hooks/useAppStore.js';
import { Header } from './Header.jsx';
import { MobileSidebar, Sidebar } from './Sidebar.jsx';

/** Shell for every signed-in page: sidebar, header and the routed content. */
export function AppLayout() {
  const { isSignedIn, status, role, unreadCount } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // While a stored token is being checked, hold the layout rather than
  // bouncing the user to the login page and back.
  if (status === 'restoring') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading ClassFix…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        unreadCount={unreadCount}
      />
      <MobileSidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        role={role}
        unreadCount={unreadCount}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenNav={() => setNavOpen(true)} unreadCount={unreadCount} />
        <main className="flex-1 px-3 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-500">
          ClassFix — the people, rooms and requests in this instance are sample records loaded by
          the seed script.
        </footer>
      </div>
    </div>
  );
}
