import { describe, it, expect } from 'vitest';
import { formatStudentCount } from '../src/components/common/RegistrationCounter';

describe('Competition Counter Display Mode (WP4 R4)', () => {
  it('formats 0 registrations as "Be the first to register"', () => {
    expect(formatStudentCount(0)).toBe('Be the first to register');
    expect(formatStudentCount(-1)).toBe('Be the first to register');
  });

  it('formats 1 registration with singular "1 student registered"', () => {
    expect(formatStudentCount(1)).toBe('1 student registered');
  });

  it('formats multiple registrations with plural "{N} students registered"', () => {
    expect(formatStudentCount(2)).toBe('2 students registered');
    expect(formatStudentCount(48)).toBe('48 students registered');
    expect(formatStudentCount(120)).toBe('120 students registered');
  });
});
