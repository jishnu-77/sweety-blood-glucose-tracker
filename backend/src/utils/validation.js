const { isValidDate } = require('./dates');

const TIME_SLOTS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};
const MIN_GLUCOSE = 40;
const MAX_GLUCOSE = 600;
const MAX_READINGS_PER_DAY = 4;

const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: `Value must be between ${MIN_GLUCOSE} and ${MAX_GLUCOSE} mg/dl.`,
  futureDate: 'Date cannot be in the future.',
  dayFull: `You can add only ${MAX_READINGS_PER_DAY} readings per day.`,
};

function isValidSlot(slot) {
  return Object.hasOwn(TIME_SLOTS, slot);
}

function duplicateSlotMessage(slot) {
  const name = TIME_SLOTS[slot].toLowerCase();
  const article = /^[aeiou]/.test(name) ? 'an' : 'a';
  return `You already have ${article} ${name} reading for this date.`;
}

function checkGlucoseValue(rawValue) {
  const text = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
  if (text === '') return MESSAGES.valueRequired;
  if (!/^\d+$/.test(text)) return MESSAGES.valueRange;
  const value = Number(text);
  if (value < MIN_GLUCOSE || value > MAX_GLUCOSE) return MESSAGES.valueRange;
  return null;
}

// Checks everything that can be decided from the request alone.
// Rules that need existing readings (duplicate slot, daily limit) are checked in the route.
function validateReadingInput(body, today) {
  const { reading_date: date, time_slot: slot, glucose_value: rawValue } = body || {};
  const errors = {};

  if (!isValidDate(date)) {
    errors.reading_date = 'Please select a valid date.';
  } else if (date > today) {
    errors.reading_date = MESSAGES.futureDate;
  }

  if (!isValidSlot(slot)) {
    errors.time_slot = 'Please select a time slot.';
  }

  const valueError = checkGlucoseValue(rawValue);
  if (valueError) {
    errors.glucose_value = valueError;
  }

  const values = { reading_date: date, time_slot: slot, glucose_value: Number(rawValue) };
  return { errors, values };
}

module.exports = {
  TIME_SLOTS,
  MAX_READINGS_PER_DAY,
  MESSAGES,
  validateReadingInput,
  duplicateSlotMessage,
};
