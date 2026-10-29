import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { APP_NAME, INSTITUTION_NAME } from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { Field, TextInput } from '../components/common/Field.jsx';

/** Demo accounts, shown so the project can be opened without a seed lookup. */
const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'aarthi@example-college.demo' },
  { role: 'Faculty', email: 'meera@example-college.demo' },
  { role: 'Official', email: 'ravi@example-college.demo' },
];
const DEMO_PASSWORD = 'classfix123';

export function LoginPage() {
  const { signIn, signUp, isSignedIn, status } = useAppStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', name: '', className: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isSignedIn) navigate('/dashboard', { replace: true });
  }, [isSignedIn, navigate]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    const result =
      mode === 'signin'
        ? await signIn(form.email, form.password)
        : await signUp({
            name: form.name,
            email: form.email,
            password: form.password,
            className: form.className || undefined,
          });

    setBusy(false);
    if (result.ok) navigate('/dashboard');
    else setError(result.message);
  };

  const fillDemoAccount = (email) => {
    setMode('signin');
    setError('');
    set({ email, password: DEMO_PASSWORD });
  };

  if (status === 'restoring') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900">
        <p className="text-sm text-navy-200">Restoring your session…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-4 py-10 lg:flex-row lg:items-stretch">
        {/* Introduction */}
        <div className="flex max-w-md flex-col justify-center text-center lg:text-left">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/15 text-lg font-bold text-teal-300 lg:mx-0">
            CF
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-navy-200">
            Classroom facility requests, verification and accountability for {INSTITUTION_NAME}.
          </p>
          <p className="mt-4 text-sm text-navy-300">
            Every request carries a unique ID, an exact room location, a current status and a
            complete record of who did what, so nothing gets lost between a report and a repair.
          </p>

          <div className="mt-6 rounded-card border border-navy-700 bg-navy-800/60 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">
              Demo accounts
            </p>
            <p className="mt-1 text-xs text-navy-400">
              Password for all three: <code className="text-navy-200">{DEMO_PASSWORD}</code>
            </p>
            <ul className="mt-3 space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email}>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount(account.email)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-xs text-navy-200 hover:bg-navy-700"
                  >
                    <span className="font-medium text-white">{account.role}</span>
                    <span className="truncate text-navy-300">{account.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm">
          <div className="rounded-card bg-white p-6 shadow-panel">
            <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { id: 'signin', label: 'Sign in' },
                { id: 'signup', label: 'Create account' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setError('');
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === tab.id ? 'bg-white text-navy-900 shadow-card' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === 'signup' ? (
                <>
                  <Field label="Full name" required>
                    {({ id }) => (
                      <TextInput
                        id={id}
                        value={form.name}
                        autoComplete="name"
                        onChange={(event) => set({ name: event.target.value })}
                      />
                    )}
                  </Field>
                  <Field label="Class" hint="For example: CSE — 3rd Year, Section A">
                    {({ id }) => (
                      <TextInput
                        id={id}
                        value={form.className}
                        onChange={(event) => set({ className: event.target.value })}
                      />
                    )}
                  </Field>
                </>
              ) : null}

              <Field label="Email" required>
                {({ id }) => (
                  <TextInput
                    id={id}
                    type="email"
                    value={form.email}
                    autoComplete="email"
                    placeholder="you@example-college.demo"
                    onChange={(event) => set({ email: event.target.value })}
                  />
                )}
              </Field>

              <Field
                label="Password"
                required
                hint={mode === 'signup' ? 'At least eight characters.' : undefined}
              >
                {({ id }) => (
                  <TextInput
                    id={id}
                    type="password"
                    value={form.password}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    onChange={(event) => set({ password: event.target.value })}
                  />
                )}
              </Field>

              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="cf-btn-primary w-full" disabled={busy}>
                {mode === 'signin' ? (
                  <>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    {busy ? 'Signing in…' : 'Sign in'}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    {busy ? 'Creating account…' : 'Create student account'}
                  </>
                )}
              </button>
            </form>

            {mode === 'signup' ? (
              <p className="mt-4 text-xs text-slate-500">
                Self-registration creates a student account. Faculty and official accounts are
                created by an administrator.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
