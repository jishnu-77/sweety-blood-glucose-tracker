const { validateReadingInput, duplicateSlotMessage } = require('../src/utils/validation');

const TODAY = '2026-06-15';
const valid = { reading_date: '2026-06-15', time_slot: 'morning', glucose_value: 110 };

describe('validateReadingInput', () => {
  test('accepts a valid reading, including a numeric string', () => {
    expect(validateReadingInput(valid, TODAY).errors).toEqual({});
    const result = validateReadingInput({ ...valid, glucose_value: '110' }, TODAY);
    expect(result.errors).toEqual({});
    expect(result.values.glucose_value).toBe(110);
  });

  test.each([undefined, null, '', '   '])('requires a value (%p)', (value) => {
    const { errors } = validateReadingInput({ ...valid, glucose_value: value }, TODAY);
    expect(errors.glucose_value).toBe('Please enter a glucose value.');
  });

  test.each([39, 601, 0, -50, 120.5, '120.5', 'abc', '12a', 1e21, true])(
    'rejects invalid value %p',
    (value) => {
      const { errors } = validateReadingInput({ ...valid, glucose_value: value }, TODAY);
      expect(errors.glucose_value).toBe('Value must be between 40 and 600 mg/dl.');
    }
  );

  test.each([40, 600])('accepts the boundary value %p', (value) => {
    expect(validateReadingInput({ ...valid, glucose_value: value }, TODAY).errors).toEqual({});
  });

  test('rejects a future date but accepts today', () => {
    const future = validateReadingInput({ ...valid, reading_date: '2026-06-16' }, TODAY);
    expect(future.errors.reading_date).toBe('Date cannot be in the future.');
    expect(validateReadingInput({ ...valid, reading_date: TODAY }, TODAY).errors).toEqual({});
  });

  test('rejects missing or malformed dates and unknown slots', () => {
    expect(validateReadingInput({ ...valid, reading_date: '15/06/2026' }, TODAY).errors.reading_date).toBeDefined();
    expect(validateReadingInput({ ...valid, reading_date: undefined }, TODAY).errors.reading_date).toBeDefined();
    expect(validateReadingInput({ ...valid, time_slot: 'midnight' }, TODAY).errors.time_slot).toBeDefined();
    expect(validateReadingInput({ ...valid, time_slot: 'constructor' }, TODAY).errors.time_slot).toBeDefined();
  });

  test('handles a missing body', () => {
    expect(Object.keys(validateReadingInput(undefined, TODAY).errors)).toHaveLength(3);
  });
});

describe('duplicateSlotMessage', () => {
  test('names the slot in the message', () => {
    expect(duplicateSlotMessage('after_breakfast')).toBe(
      'You already have an after breakfast reading for this date.'
    );
    expect(duplicateSlotMessage('morning')).toBe(
      'You already have a morning (fasting) reading for this date.'
    );
  });
});
