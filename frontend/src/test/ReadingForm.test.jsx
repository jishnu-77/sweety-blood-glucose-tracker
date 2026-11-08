import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ReadingForm from '../components/ReadingForm';
import { ApiError } from '../api/client';
import { getToday } from '../utils/dates';

const today = getToday();

function renderForm(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue({});
  render(<ReadingForm defaultDate={today} onSubmit={onSubmit} onCancel={vi.fn()} {...props} />);
  return { onSubmit, user: userEvent.setup() };
}

const valueInput = () => screen.getByLabelText(/glucose value/i);
const slotSelect = () => screen.getByLabelText(/time slot/i);
const submitButton = () => screen.getByRole('button', { name: /save reading/i });

describe('ReadingForm validation', () => {
  test('shows the required-value message and does not submit when the value is empty', async () => {
    const { onSubmit, user } = renderForm();
    await user.selectOptions(slotSelect(), 'morning');
    await user.click(submitButton());

    expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('treats a value of only spaces as missing', async () => {
    const { onSubmit, user } = renderForm();
    await user.selectOptions(slotSelect(), 'morning');
    await user.type(valueInput(), '   ');
    await user.click(submitButton());

    expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test.each(['39', '601', '0', '-80', '120.5', 'abc', '12abc'])(
    'rejects the invalid glucose value "%s"',
    async (value) => {
      const { onSubmit, user } = renderForm();
      await user.selectOptions(slotSelect(), 'morning');
      await user.type(valueInput(), value);
      await user.click(submitButton());

      expect(await screen.findByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
      expect(valueInput()).toHaveAttribute('aria-invalid', 'true');
      expect(onSubmit).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['40', 40],
    ['600', 600],
  ])('accepts the boundary value %s', async (text, number) => {
    const { onSubmit, user } = renderForm();
    await user.selectOptions(slotSelect(), 'after_lunch');
    await user.type(valueInput(), text);
    await user.click(submitButton());

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        reading_date: today,
        time_slot: 'after_lunch',
        glucose_value: number,
      })
    );
  });

  test('asks for a time slot', async () => {
    const { onSubmit, user } = renderForm();
    await user.type(valueInput(), '110');
    await user.click(submitButton());

    expect(await screen.findByText('Please select a time slot.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('rejects a future date', async () => {
    const { onSubmit, user } = renderForm();
    const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: tomorrow } });
    await user.selectOptions(slotSelect(), 'morning');
    await user.type(valueInput(), '110');
    await user.click(submitButton());

    expect(await screen.findByText('Date cannot be in the future.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('clears a field error as soon as the user edits that field', async () => {
    const { user } = renderForm();
    await user.selectOptions(slotSelect(), 'morning');
    await user.click(submitButton());
    expect(await screen.findByText('Please enter a glucose value.')).toBeInTheDocument();

    await user.type(valueInput(), '1');
    expect(screen.queryByText('Please enter a glucose value.')).not.toBeInTheDocument();
  });
});

describe('ReadingForm day rules', () => {
  test('blocks a second reading for the same slot', async () => {
    const loadDayReadings = vi.fn().mockResolvedValue([{ id: 1, time_slot: 'after_breakfast' }]);
    const { onSubmit, user } = renderForm({ loadDayReadings });
    await user.selectOptions(slotSelect(), 'after_breakfast');
    await user.type(valueInput(), '140');
    await user.click(submitButton());

    expect(
      await screen.findByText('You already have an after breakfast reading for this date.')
    ).toBeInTheDocument();
    expect(loadDayReadings).toHaveBeenCalledWith(today);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('blocks a fifth reading on a day that already has four', async () => {
    const full = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'].map((slot, id) => ({ id, time_slot: slot }));
    const { onSubmit, user } = renderForm({ loadDayReadings: vi.fn().mockResolvedValue(full) });
    await user.selectOptions(slotSelect(), 'morning');
    await user.type(valueInput(), '100');
    await user.click(submitButton());

    expect(await screen.findByText('You can add only 4 readings per day.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('editing a reading does not count it as its own duplicate', async () => {
    const existing = { id: 7, reading_date: today, time_slot: 'morning', glucose_value: 100 };
    const loadDayReadings = vi.fn().mockResolvedValue([existing]);
    const { onSubmit, user } = renderForm({ reading: existing, loadDayReadings });

    await user.clear(valueInput());
    await user.type(valueInput(), '125');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ reading_date: today, time_slot: 'morning', glucose_value: 125 })
    );
  });

  test('still submits when the day lookup fails, leaving the check to the server', async () => {
    const loadDayReadings = vi.fn().mockRejectedValue(new Error('offline'));
    const { onSubmit, user } = renderForm({ loadDayReadings });
    await user.selectOptions(slotSelect(), 'morning');
    await user.type(valueInput(), '110');
    await user.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});

describe('ReadingForm saving', () => {
  test('shows field errors returned by the server', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, 'dup', { time_slot: 'You already have a morning (fasting) reading for this date.' })
    );
    const { user } = renderForm({ onSubmit });
    await user.selectOptions(slotSelect(), 'morning');
    await user.type(valueInput(), '110');
    await user.click(submitButton());

    expect(
      await screen.findByText('You already have a morning (fasting) reading for this date.')
    ).toBeInTheDocument();
  });

  test('shows a general error when the server cannot be reached', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(0, 'Cannot reach the server. Check your connection and try again.'));
    const { user } = renderForm({ onSubmit });
    await user.selectOptions(slotSelect(), 'morning');
    await user.type(valueInput(), '110');
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });

  test('clears the slot and value after adding, but keeps the date', async () => {
    const { user } = renderForm();
    await user.selectOptions(slotSelect(), 'after_dinner');
    await user.type(valueInput(), '130');
    await user.click(submitButton());

    await waitFor(() => expect(valueInput()).toHaveValue(''));
    expect(slotSelect()).toHaveValue('');
    expect(screen.getByLabelText('Date')).toHaveValue(today);
  });

  test('is prefilled when editing and can be cancelled', async () => {
    const onCancel = vi.fn();
    const { user } = renderForm({
      reading: { id: 3, reading_date: '2026-01-05', time_slot: 'after_lunch', glucose_value: 152 },
      onCancel,
    });

    expect(screen.getByRole('heading', { name: 'Edit reading' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2026-01-05');
    expect(slotSelect()).toHaveValue('after_lunch');
    expect(valueInput()).toHaveValue('152');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
