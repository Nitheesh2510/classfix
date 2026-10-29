import { useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore.js';
import { toDateInputValue } from '../../utils/format.js';
import { Field, Select, TextArea, TextInput } from '../common/Field.jsx';
import { Modal } from '../common/Modal.jsx';

/**
 * Renders the workflow actions the **server** says this user may take.
 *
 * The list comes from GET /api/requests/:id, which filters by role, request
 * status, ownership and department, so the UI cannot offer a button the API
 * would refuse. The server re-checks everything on submit regardless.
 */
export function ActionPanel({ request, actions = [], onApplied }) {
  const { state, applyAction, role } = useAppStore();
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const openAction = async (action) => {
    const needsForm =
      action.requiresReason || action.requiresDepartment || action.allowsDueDate || action.allowsEvidence;

    if (!needsForm) {
      setBusy(true);
      const result = await applyAction(request.id, action.id, {});
      setBusy(false);
      if (result) onApplied?.(result);
      return;
    }

    setActive(action);
    setError('');
    setForm({
      reason: '',
      departmentId: action.requiresDepartment ? (request.departmentId ?? '') : '',
      expectedCompletion: action.allowsDueDate ? toDateInputValue(request.expectedCompletion) : '',
      evidenceLabel: '',
      evidenceNote: '',
    });
  };

  const close = () => {
    setActive(null);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!active) return;

    if (active.requiresReason && !form.reason.trim()) {
      setError('This action cannot be recorded without a reason.');
      return;
    }
    if (active.requiresDepartment && !form.departmentId) {
      setError('Choose the department that should handle this.');
      return;
    }

    const payload = { reason: form.reason || undefined };
    if (active.requiresDepartment) payload.departmentId = form.departmentId;
    if (active.allowsDueDate && form.expectedCompletion) {
      payload.expectedCompletion = form.expectedCompletion;
    }
    if (active.allowsEvidence && (form.evidenceLabel.trim() || form.evidenceNote.trim())) {
      payload.evidence = {
        label: form.evidenceLabel.trim() || undefined,
        note: form.evidenceNote.trim() || undefined,
      };
    }

    setBusy(true);
    const result = await applyAction(request.id, active.id, payload);
    setBusy(false);

    if (result) {
      close();
      onApplied?.(result);
    }
  };

  if (actions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        There is nothing for you to do on this request at its current status. The next step belongs
        to another role.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={buttonClassFor(action, role)}
            disabled={busy}
            onClick={() => openAction(action)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={close}
        title={active?.label ?? ''}
        description={`This will be recorded in the action history for ${request.id}.`}
        footer={
          <>
            <button type="button" className="cf-btn-secondary" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="action-form" className="cf-btn-primary" disabled={busy}>
              {busy ? 'Recording…' : 'Record action'}
            </button>
          </>
        }
      >
        <form id="action-form" onSubmit={submit} className="space-y-4" noValidate>
          {active?.requiresDepartment ? (
            <Field label="Department" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.departmentId}
                  onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                  placeholder="Select a department"
                  options={state.departments
                    .filter((item) => item.active)
                    .map((item) => ({ value: item.id, label: item.name }))}
                />
              )}
            </Field>
          ) : null}

          {active?.requiresReason ? (
            <Field label="Reason" required>
              {({ id }) => (
                <TextArea
                  id={id}
                  rows={4}
                  value={form.reason}
                  maxLength={1000}
                  placeholder="Explain the decision so it is on the record."
                  onChange={(event) => setForm({ ...form, reason: event.target.value })}
                />
              )}
            </Field>
          ) : null}

          {active?.allowsDueDate ? (
            <Field label="Expected completion date" hint="Optional, but it drives overdue tracking.">
              {({ id }) => (
                <TextInput
                  id={id}
                  type="date"
                  value={form.expectedCompletion}
                  onChange={(event) => setForm({ ...form, expectedCompletion: event.target.value })}
                />
              )}
            </Field>
          ) : null}

          {active?.allowsEvidence ? (
            <>
              <Field label="Completion evidence" hint="Recorded as a note on the request.">
                {({ id }) => (
                  <TextInput
                    id={id}
                    value={form.evidenceLabel}
                    maxLength={120}
                    placeholder="e.g. Repair completion note"
                    onChange={(event) => setForm({ ...form, evidenceLabel: event.target.value })}
                  />
                )}
              </Field>
              <Field label="What was done">
                {({ id }) => (
                  <TextArea
                    id={id}
                    rows={3}
                    value={form.evidenceNote}
                    maxLength={1000}
                    placeholder="Two fan motors replaced and tested."
                    onChange={(event) => setForm({ ...form, evidenceNote: event.target.value })}
                  />
                )}
              </Field>
            </>
          ) : null}

          {error ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}

/** Destructive and advancing actions get distinct emphasis. */
function buttonClassFor(action) {
  if (/reject|reopen|hold/.test(action.id)) return 'cf-btn-danger';
  if (/verify|acknowledge|resolve|confirm/.test(action.id)) return 'cf-btn-accent';
  if (/forward|start_work/.test(action.id)) return 'cf-btn-primary';
  return 'cf-btn-secondary';
}
