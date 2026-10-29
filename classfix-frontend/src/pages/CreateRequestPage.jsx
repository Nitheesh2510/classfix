import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { CATEGORY_LIST, PRIORITY_LIST, PRIORITY, ROLES } from '../constants/index.js';
import { useAppStore } from '../hooks/useAppStore.js';
import { resolveLocation } from '../services/locationService.js';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Field, Select, TextArea, TextInput } from '../components/common/Field.jsx';
import { LocationSelect } from '../components/forms/LocationSelect.jsx';
import { PhotoPicker } from '../components/forms/PhotoPicker.jsx';

const INITIAL = {
  title: '',
  buildingId: '',
  floorId: '',
  roomId: '',
  category: '',
  priority: PRIORITY.MEDIUM,
  description: '',
};

function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Give the request a short title.';
  else if (values.title.trim().length < 6) errors.title = 'Use at least six characters.';

  if (!values.buildingId) errors.buildingId = 'Choose a building.';
  if (!values.floorId) errors.floorId = 'Choose a floor.';
  if (!values.roomId) errors.roomId = 'Choose a room.';
  if (!values.category) errors.category = 'Choose a facility category.';
  if (!values.priority) errors.priority = 'Choose a priority.';

  if (!values.description.trim()) errors.description = 'Describe what is wrong.';
  else if (values.description.trim().length < 15)
    errors.description = 'Add a little more detail — at least fifteen characters.';

  return errors;
}

export function CreateRequestPage() {
  const { state, role, createRequest } = useAppStore();
  const navigate = useNavigate();

  const [values, setValues] = useState(INITIAL);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (patch) => setValues((current) => ({ ...current, ...patch }));

  const location = values.roomId ? resolveLocation(state, values.roomId) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setBusy(true);
    const request = await createRequest({
      title: values.title,
      description: values.description,
      roomId: values.roomId,
      category: values.category,
      priority: values.priority,
      photoFile: photo?.file,
    });
    setBusy(false);

    if (request) navigate(`/requests/${request.id}`);
  };

  const fieldError = (name) => (submitted ? errors[name] : undefined);

  return (
    <>
      <PageHeader
        title="Create a facility request"
        description="Tell us exactly where the problem is so it can be routed to the right department."
        breadcrumbs={[
          { label: 'ClassFix', to: '/dashboard' },
          { label: 'Requests', to: '/requests' },
          { label: 'New request' },
        ]}
      />

      {role !== ROLES.STUDENT ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Requests are normally raised by students or class representatives. You can still submit
            one — it will be recorded under your account.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="cf-card p-4 sm:p-5">
            <h2 className="mb-4 text-sm font-semibold text-navy-900">What is the problem?</h2>

            <div className="space-y-4">
              <Field label="Request title" required error={fieldError('title')}>
                {({ id, describedBy }) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(fieldError('title'))}
                    error={fieldError('title')}
                    value={values.title}
                    maxLength={100}
                    placeholder="e.g. Classroom fans not working"
                    onChange={(event) => set({ title: event.target.value })}
                  />
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Facility category" required error={fieldError('category')}>
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={Boolean(fieldError('category'))}
                      error={fieldError('category')}
                      value={values.category}
                      onChange={(event) => set({ category: event.target.value })}
                      placeholder="Select a category"
                      options={CATEGORY_LIST.map((item) => ({ value: item.id, label: item.label }))}
                    />
                  )}
                </Field>

                <Field
                  label="Priority"
                  required
                  error={fieldError('priority')}
                  hint="Urgent is for anything unsafe."
                >
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={values.priority}
                      onChange={(event) => set({ priority: event.target.value })}
                      options={PRIORITY_LIST.map((item) => ({ value: item.id, label: item.label }))}
                    />
                  )}
                </Field>
              </div>

              <Field
                label="Description"
                required
                error={fieldError('description')}
                hint="What is broken, how long it has been that way, and how it affects classes."
              >
                {({ id, describedBy }) => (
                  <TextArea
                    id={id}
                    rows={5}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(fieldError('description'))}
                    error={fieldError('description')}
                    value={values.description}
                    maxLength={1000}
                    placeholder="Three of the four ceiling fans stopped working last week…"
                    onChange={(event) => set({ description: event.target.value })}
                  />
                )}
              </Field>
            </div>
          </section>

          <section className="cf-card p-4 sm:p-5">
            <h2 className="mb-1 text-sm font-semibold text-navy-900">Where is it?</h2>
            <p className="mb-4 text-xs text-slate-500">
              Choose the building first — floors and rooms are filtered to match.
            </p>

            <LocationSelect
              required
              value={{
                buildingId: values.buildingId,
                floorId: values.floorId,
                roomId: values.roomId,
              }}
              onChange={(next) => set(next)}
              errors={{
                buildingId: fieldError('buildingId'),
                floorId: fieldError('floorId'),
                roomId: fieldError('roomId'),
              }}
            />

            {location ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium text-navy-900">Selected location:</span> {location.path}{' '}
                <span className="text-slate-500">({location.roomTypeLabel})</span>
              </p>
            ) : null}
          </section>

          <section className="cf-card p-4 sm:p-5">
            <PhotoPicker value={photo} onChange={setPhoto} />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="cf-card p-4">
            <h2 className="text-sm font-semibold text-navy-900">What happens next</h2>
            <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
              {[
                'Your request is given an ID such as CF-1018.',
                'Your class advisor reviews and verifies it.',
                'It is forwarded to the right department.',
                'The department records inspections and repairs.',
                'You confirm whether it is actually fixed.',
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[11px] font-semibold text-navy-800">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="cf-card p-4">
            <div className="flex flex-col gap-2">
              <button type="submit" className="cf-btn-primary w-full" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
              <Link to="/requests" className="cf-btn-secondary w-full">
                Cancel
              </Link>
            </div>
            {submitted && Object.keys(errors).length > 0 ? (
              <p className="mt-3 text-xs font-medium text-red-600" role="alert">
                Please correct the highlighted fields before submitting.
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              Your advisor is notified as soon as this is submitted.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
