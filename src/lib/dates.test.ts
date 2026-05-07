import { monthKey, monthKeyFromTimMonthId, monthRange, monthLabel } from './dates';

test('monthKey resiste a timezone', () => {
  expect(monthKey('2026-01-01')).toBe('2026-01');
  expect(monthKey('2026-01-01T00:00:00.000Z')).toBe('2026-01');
});

test('monthKey from short format', () => {
  expect(monthKey('2026-01')).toBe('2026-01');
});

test('TIM_MONTH_ID 202601 → 2026-01', () => {
  expect(monthKeyFromTimMonthId(202601)).toBe('2026-01');
  expect(monthKeyFromTimMonthId('202601')).toBe('2026-01');
});

test('monthRange contígua atravessa virada de ano', () => {
  expect(monthRange('2025-11', '2026-02')).toEqual([
    '2025-11', '2025-12', '2026-01', '2026-02',
  ]);
});

test('monthLabel returns pt-BR format', () => {
  const label = monthLabel('2026-01');
  expect(label).toMatch(/jan/i);
  expect(label).toContain('2026');
});