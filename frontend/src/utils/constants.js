export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (fasting)' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
];

export const MIN_GLUCOSE = 40;
export const MAX_GLUCOSE = 600;
export const MAX_READINGS_PER_DAY = 4;

export function getSlotLabel(slotValue) {
  return TIME_SLOTS.find((slot) => slot.value === slotValue)?.label ?? slotValue;
}
