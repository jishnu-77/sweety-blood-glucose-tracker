import { MIN_GLUCOSE, MAX_GLUCOSE, MAX_READINGS_PER_DAY, TIME_SLOTS, getSlotLabel } from './constants';

export const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: `Value must be between ${MIN_GLUCOSE} and ${MAX_GLUCOSE} mg/dl.`,
  futureDate: 'Date cannot be in the future.',
  dayFull: `You can add only ${MAX_READINGS_PER_DAY} readings per day.`,
};

export function duplicateSlotMessage(slotValue) {
  const name = getSlotLabel(slotValue).toLowerCase();
  const article = /^[aeiou]/.test(name) ? 'an' : 'a';
  return `You already have ${article} ${name} reading for this date.`;
}

function checkGlucoseValue(rawValue) {
  const text = String(rawValue ?? '').trim();
  if (text === '') return MESSAGES.valueRequired;
  if (!/^\d+$/.test(text)) return MESSAGES.valueRange;
  const value = Number(text);
  if (value < MIN_GLUCOSE || value > MAX_GLUCOSE) return MESSAGES.valueRange;
  return null;
}

// Returns { fieldName: message } (empty when valid). Field names match the API.
// existingReadings are the readings already saved for values.reading_date; when given,
// the daily limit and duplicate-slot rules are checked too. editingId keeps an edited
// reading from being counted against itself.
export function validateReading(values, { today, existingReadings = null, editingId = null }) {
  const errors = {};

  if (!values.reading_date) {
    errors.reading_date = 'Please select a date.';
  } else if (values.reading_date > today) {
    errors.reading_date = MESSAGES.futureDate;
  }

  if (!TIME_SLOTS.some((slot) => slot.value === values.time_slot)) {
    errors.time_slot = 'Please select a time slot.';
  }

  const valueError = checkGlucoseValue(values.glucose_value);
  if (valueError) errors.glucose_value = valueError;

  if (existingReadings && !errors.reading_date) {
    const others = existingReadings.filter((reading) => reading.id !== editingId);
    if (others.length >= MAX_READINGS_PER_DAY) {
      errors.reading_date = MESSAGES.dayFull;
    } else if (!errors.time_slot && others.some((reading) => reading.time_slot === values.time_slot)) {
      errors.time_slot = duplicateSlotMessage(values.time_slot);
    }
  }

  return errors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Please enter your name.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Please enter a valid email address.';
  if (password.length < 8 || password.length > 72) {
    errors.password = 'Password must be between 8 and 72 characters.';
  }
  return errors;
}
