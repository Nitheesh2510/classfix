import { Link } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import { ROLES, ROLE_META } from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { StudentDashboard } from '../components/dashboard/StudentDashboard.jsx';
import { FacultyDashboard } from '../components/dashboard/FacultyDashboard.jsx';
import { OfficialDashboard } from '../components/dashboard/OfficialDashboard.jsx';

const DASHBOARDS = {
  [ROLES.STUDENT]: StudentDashboard,
  [ROLES.FACULTY]: FacultyDashboard,
  [ROLES.OFFICIAL]: OfficialDashboard,
};

const DESCRIPTIONS = {
  [ROLES.STUDENT]: 'Everything your class has reported, and what happened to it.',
  [ROLES.FACULTY]: 'Reports waiting on your verification, and how your classrooms are improving.',
  [ROLES.OFFICIAL]: 'Work assigned to your department, with inspection and completion tracking.',
};

export function DashboardPage() {
  const { role, user } = useAppStore();
  const Dashboard = DASHBOARDS[role];

  return (
    <>
      <PageHeader
        title={`${ROLE_META[role]?.shortLabel} dashboard`}
        description={DESCRIPTIONS[role]}
        breadcrumbs={[{ label: 'ClassFix' }, { label: 'Dashboard' }]}
        actions={
          <>
            <span className="hidden text-xs text-slate-500 sm:block">Signed in as {user?.name}</span>
            {role === ROLES.STUDENT ? (
              <Link to="/requests/new" className="cf-btn-primary">
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                New request
              </Link>
            ) : null}
          </>
        }
      />
      <Dashboard />
    </>
  );
}
