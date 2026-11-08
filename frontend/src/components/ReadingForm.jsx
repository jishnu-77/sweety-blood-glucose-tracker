import { useEffect, useRef, useState } from 'react';
import { TIME_SLOTS } from '../utils/constants';
import { getToday } from '../utils/dates';
import { validateReading } from '../utils/validation';

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

// reading: the reading being edited, or null when adding a new one.
// onSubmit(payload) must save the reading and reject with an ApiError on failure.
// loadDayReadings(date) is optional; it lets the form check the one-per-slot and
// four-per-day rules before sending. The server checks them again either way.
export default function ReadingForm({ reading = null, defaultDate, onSubmit, onCancel, loadDayReadings }) {
  const isEditing = Boolean(reading);
  const [values, setValues] = useState({
    reading_date: reading?.reading_date ?? defaultDate,
    time_slot: reading?.time_slot ?? '',
    glucose_value: reading ? String(reading.glucose_value) : '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const valueInput = useRef(null);

  useEffect(() => {
    if (isEditing) valueInput.current?.focus();
  }, [isEditing]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setFormError('');
  }

  async function findErrors() {
    const options = { today: getToday(), editingId: reading?.id ?? null };
    const basicErrors = validateReading(values, options);
    if (Object.keys(basicErrors).length > 0 || !loadDayReadings) return basicErrors;

    try {
      const existingReadings = await loadDayReadings(values.reading_date);
      return validateReading(values, { ...options, existingReadings });
    } catch {
      return {}; // the server will run these checks if this lookup failed
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const foundErrors = await findErrors();
      setErrors(foundErrors);
      if (Object.keys(foundErrors).length > 0) return;

      await onSubmit({
        reading_date: values.reading_date,
        time_slot: values.time_slot,
        glucose_value: Number(values.glucose_value),
      });
      if (!isEditing) {
        setValues((previous) => ({ ...previous, time_slot: '', glucose_value: '' }));
      }
    } catch (error) {
      const serverErrors = error.errors ?? {};
      setErrors(serverErrors);
      if (Object.keys(serverErrors).length === 0) setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" id="reading-form" aria-labelledby="form-heading">
      <h2 id="form-heading">{isEditing ? 'Edit reading' : 'Add a reading'}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="reading_date">Date</label>
          <input
            id="reading_date"
            name="reading_date"
            type="date"
            max={getToday()}
            value={values.reading_date}
            onChange={handleChange}
            aria-invalid={Boolean(errors.reading_date)}
            aria-describedby={errors.reading_date ? 'reading_date-error' : undefined}
          />
          <FieldError id="reading_date-error" message={errors.reading_date} />
        </div>

        <div className="field">
          <label htmlFor="time_slot">Time slot</label>
          <select
            id="time_slot"
            name="time_slot"
            value={values.time_slot}
            onChange={handleChange}
            aria-invalid={Boolean(errors.time_slot)}
            aria-describedby={errors.time_slot ? 'time_slot-error' : undefined}
          >
            <option value="">Select a time slot</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          <FieldError id="time_slot-error" message={errors.time_slot} />
        </div>

        <div className="field">
          <label htmlFor="glucose_value">Glucose value (mg/dl)</label>
          <input
            id="glucose_value"
            name="glucose_value"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            ref={valueInput}
            value={values.glucose_value}
            onChange={handleChange}
            aria-invalid={Boolean(errors.glucose_value)}
            aria-describedby={errors.glucose_value ? 'glucose_value-error' : undefined}
          />
          <FieldError id="glucose_value-error" message={errors.glucose_value} />
        </div>

        {formError && (
          <p className="message error" role="alert">
            {formError}
          </p>
        )}

        <div className="actions">
          <button type="submit" className="button primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Save reading'}
          </button>
          {isEditing && (
            <button type="button" className="button" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
