import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { INSTITUTION_NAME, ROLE_META } from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { ApiError, api } from '../services/api.js';
import { useToast } from '../hooks/useToast.js';
import { initialsOf } from '../utils/format.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Field, TextInput } from '../components/common/Field.jsx';

export function ProfilePage() {
  const { state, user, role } = useAppStore();
  const toast = useToast();

  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const department = state.departments.find((item) => item.id === user?.departmentId);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.next.length < 8) {
      setError('Your new password must be at least eight characters.');
      return;
    }
    if (form.next !== form.confirm) {
      setError('The two new passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await api.changePassword(form.current, form.next);
      toast.success('Password updated.');
      setForm({ current: '', next: '', confirm: '' });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not change your password just now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Profile and settings"
        description="Your account details and password."
        breadcrumbs={[{ label: 'ClassFix', to: '/dashboard' }, { label: 'Profile & Settings' }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="cf-card p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 text-lg font-semibold text-white">
              {initialsOf(user?.name)}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-navy-900">{user?.name}</h2>
              <p className="text-sm text-slate-600">{user?.title}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Role" value={ROLE_META[role]?.label ?? role} />
            <Detail label="Institution" value={INSTITUTION_NAME} />
            <Detail label="Class" value={user?.className ?? 'Not applicable'} />
            <Detail label="Email" value={user?.email} />
            <Detail label="Department" value={department?.name ?? 'Not applicable'} />
            <Detail label="Account ID" value={user?.id} />
          </dl>

          <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Names, roles and departments are managed by an administrator. You can change your own
            password here.
          </p>
        </section>

        <section id="security" className="cf-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Change password
          </h2>

          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <Field label="Current password" required>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={form.current}
                  onChange={(event) => setForm({ ...form, current: event.target.value })}
                />
              )}
            </Field>
            <Field label="New password" required hint="At least eight characters.">
              {({ id }) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={form.next}
                  onChange={(event) => setForm({ ...form, next: event.target.value })}
                />
              )}
            </Field>
            <Field label="Confirm new password" required>
              {({ id }) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(event) => setForm({ ...form, confirm: event.target.value })}
                />
              )}
            </Field>

            {error ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="cf-btn-primary w-full"
              disabled={busy || !form.current || !form.next}
            >
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>

      <section className="cf-card mt-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
          What you can see
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Visibility is decided by the server, not by this interface. Signing in as a different role
          changes what the API returns.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Requests visible" value={state.requests.length} />
          <Stat label="Rooms" value={state.rooms.length} />
          <Stat label="Departments" value={state.departments.length} />
          <Stat label="Notifications" value={state.notifications.length} />
        </dl>

        <p className="mt-4 text-xs text-slate-500">
          {role === 'student'
            ? 'As a student you see the requests you reported. Faculty and officials see the whole queue.'
            : 'As staff you see every request that has entered the workflow.'}
        </p>
      </section>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-navy-900">{value ?? '—'}</dd>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-navy-900">{value}</dd>
    </div>
  );
}
