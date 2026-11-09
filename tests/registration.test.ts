import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Auth and Firestore to ensure no writes occur
vi.mock('../src/services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test_uid_123',
      email: 'student@bvm.edu.in',
      getIdToken: vi.fn().mockResolvedValue('mock_id_token_xyz')
    },
    onAuthStateChanged: vi.fn()
  },
  db: {},
  testFirestoreConnection: vi.fn()
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn()
}));

import { dataService } from '../src/services/dataService';
import * as firestore from 'firebase/firestore';

describe('WP3: Registration Client Integrity (No fake success)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dataService, 'isUserRegisteredForEvent').mockResolvedValue(false);
    vi.spyOn(dataService, 'getEventBySlug').mockResolvedValue({
      id: 'zerocode',
      slug: 'zerocode',
      title: 'ZeroCode',
      registration_open: true,
      registered_count: 5,
      capacity: 50,
      bvm_fee: 50,
      external_fee: 70
    } as any);
  });

  it('rejects with safe message when server returns HTML 500 error', async () => {
    // Mock fetch returning HTML 500 error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token < in JSON at position 0'))
    } as any);

    await expect(
      dataService.createRegistration({
        event_slug: 'zerocode',
        full_name: 'Test Student',
        email: 'student@bvm.edu.in',
        phone_number: '9876543210',
        college: 'BVM Engineering College',
        branch: 'Electronics',
        academic_year: '1st Year' as any,
        enrollment_number: '26EL101'
      })
    ).rejects.toThrow('Registration service is unavailable. Nothing was saved. Please try again.');

    // Assert that client-side Firestore setDoc was NEVER called
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it('rejects with server error text when server returns JSON 400 error', async () => {
    // Mock fetch returning JSON 400
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Competition capacity has been reached.' })
    } as any);

    await expect(
      dataService.createRegistration({
        event_slug: 'zerocode',
        full_name: 'Test Student',
        email: 'student@bvm.edu.in',
        phone_number: '9876543210',
        college: 'BVM Engineering College',
        branch: 'Electronics',
        academic_year: '1st Year' as any,
        enrollment_number: '26EL101'
      })
    ).rejects.toThrow('Competition capacity has been reached.');

    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it('succeeds and returns record only when server returns 200 with registration', async () => {
    const mockRecord = {
      id: 'test_uid_123_zerocode',
      competition_id: 'ZER-A7K29B',
      user_id: 'test_uid_123',
      event_slug: 'zerocode',
      full_name: 'Test Student',
      registration_status: 'Confirmed',
      calculated_fee: 50
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        registration: mockRecord
      })
    } as any);

    const result = await dataService.createRegistration({
      event_slug: 'zerocode',
      full_name: 'Test Student',
      email: 'student@bvm.edu.in',
      phone_number: '9876543210',
      college: 'BVM Engineering College',
      branch: 'Electronics',
      academic_year: '1st Year' as any,
      enrollment_number: '26EL101'
    });

    expect(result).toEqual(mockRecord);
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });
});
