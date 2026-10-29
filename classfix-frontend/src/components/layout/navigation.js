import {
  BarChart3,
  Bell,
  Building2,
  DoorOpen,
  FilePlus2,
  Layers,
  LayoutDashboard,
  ListChecks,
  Users2,
  UserCog,
} from 'lucide-react';
import { ROLES } from '../../constants/index.js';

/**
 * Sidebar navigation. `roles` limits an item to certain demo roles; omitting it
 * shows the item to everyone.
 */
export const NAV_SECTIONS = [
  {
    id: 'main',
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/requests', label: 'All Requests', icon: ListChecks },
      { to: '/requests/new', label: 'New Request', icon: FilePlus2, roles: [ROLES.STUDENT] },
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'unread' },
      { to: '/analytics', label: 'Reports & Analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'facilities',
    label: 'Facility records',
    items: [
      { to: '/manage/buildings', label: 'Buildings', icon: Building2 },
      { to: '/manage/floors', label: 'Floors', icon: Layers },
      { to: '/manage/rooms', label: 'Rooms', icon: DoorOpen },
      { to: '/manage/departments', label: 'Departments', icon: Users2 },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [{ to: '/profile', label: 'Profile & Settings', icon: UserCog }],
  },
];

export function navItemsForRole(role) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
