import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { RequestsPage } from '../pages/RequestsPage.jsx';
import { CreateRequestPage } from '../pages/CreateRequestPage.jsx';
import { RequestDetailsPage } from '../pages/RequestDetailsPage.jsx';
import { NotificationsPage } from '../pages/NotificationsPage.jsx';
import { AnalyticsPage } from '../pages/AnalyticsPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { BuildingsPage } from '../pages/manage/BuildingsPage.jsx';
import { FloorsPage } from '../pages/manage/FloorsPage.jsx';
import { RoomsPage } from '../pages/manage/RoomsPage.jsx';
import { DepartmentsPage } from '../pages/manage/DepartmentsPage.jsx';

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/requests', element: <RequestsPage /> },
      { path: '/requests/new', element: <CreateRequestPage /> },
      { path: '/requests/:requestId', element: <RequestDetailsPage /> },
      { path: '/manage/buildings', element: <BuildingsPage /> },
      { path: '/manage/floors', element: <FloorsPage /> },
      { path: '/manage/rooms', element: <RoomsPage /> },
      { path: '/manage/departments', element: <DepartmentsPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
