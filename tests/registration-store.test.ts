import { describe, expect, it } from 'vitest';
import { createRegistrationOnce, RegistrationStoreError } from '../src/server/registrationStore';

function fakeFirestore() {
  const records = new Map<string, Record<string, any>>();
  let transactionQueue = Promise.resolve();
  const collection = (name: string) => ({
    name,
    doc: (id: string) => ({ key: `${name}/${id}`, id, collection: name }),
    where: (field: string, operator: string, value: unknown) => ({ name, field, operator, value })
  });
  const db = {
    collection,
    runTransaction: async (operation: (transaction: any) => Promise<unknown>) => {
      const previous = transactionQueue;
      let release!: () => void;
      transactionQueue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const writes: Array<{ type: 'set' | 'update'; key: string; data: Record<string, any> }> = [];
      const transaction = {
        get: async (ref: any) => {
          if (ref.field) {
            const docs = [...records.entries()]
              .filter(([key, data]) => key.startsWith(`${ref.name}/`) && data[ref.field] === ref.value)
              .map(([key, data]) => ({ id: key.split('/').at(-1), ref: { key }, data: () => data }));
            return { docs };
          }
          const value = records.get(ref.key);
          return { exists: Boolean(value), id: ref.id, ref, data: () => value };
        },
        set: (ref: { key: string }, data: Record<string, any>) => writes.push({ type: 'set', key: ref.key, data }),
        update: (ref: { key: string }, data: Record<string, any>) => writes.push({ type: 'update', key: ref.key, data })
      };
      try {
        const result = await operation(transaction);
        for (const write of writes) {
          if (write.type === 'set') records.set(write.key, write.data);
          else records.set(write.key, { ...records.get(write.key), ...write.data });
        }
        return result;
      } finally {
        release();
      }
    }
  };
  return { db, records };
}

function inputRecord(event: Record<string, any> | null, id: string) {
  return {
    id,
    user_id: 'student-1',
    event_slug: 'zerocode',
    event_title: event?.title || 'ZeroCode',
    competition_id: event?.id || 'zerocode',
    registration_status: 'Confirmed',
    created_at: '2026-11-04T00:00:00.000Z',
    updated_at: '2026-11-04T00:00:00.000Z'
  };
}

describe('competition registration persistence', () => {
  it('returns the existing registration for repeat and concurrent submissions', async () => {
    const { db, records } = fakeFirestore();
    records.set('events/zerocode', { id: 'ZC-A7K2', title: 'ZeroCode', registered_count: 0, capacity: 10 });

    const [first, second] = await Promise.all([
      createRegistrationOnce(db, 'student-1', 'zerocode', inputRecord),
      createRegistrationOnce(db, 'student-1', 'zerocode', inputRecord)
    ]);

    expect(first.registration.id).toBe(second.registration.id);
    expect([first.alreadyRegistered, second.alreadyRegistered].filter(Boolean)).toHaveLength(1);
    expect([...records.keys()].filter((key) => key.startsWith('registrations/'))).toHaveLength(1);
    expect(records.get('events/zerocode')?.registered_count).toBe(1);
  });

  it('recognizes a prior registration with a legacy random document ID', async () => {
    const { db, records } = fakeFirestore();
    records.set('registrations/old-random-id', {
      id: 'old-random-id', user_id: 'student-1', event_slug: 'zerocode', registration_status: 'Confirmed'
    });
    const result = await createRegistrationOnce(db, 'student-1', 'zerocode', inputRecord);
    expect(result.alreadyRegistered).toBe(true);
    expect(result.registration.id).toBe('old-random-id');
    expect([...records.keys()].filter((key) => key.startsWith('registrations/'))).toHaveLength(1);
  });

  it('reactivates a cancelled legacy record instead of adding another document', async () => {
    const { db, records } = fakeFirestore();
    records.set('registrations/old-random-id', {
      id: 'old-random-id', user_id: 'student-1', event_slug: 'zerocode', registration_status: 'Cancelled'
    });
    records.set('events/zerocode', { id: 'ZC-A7K2', title: 'ZeroCode', registered_count: 0, capacity: 10 });
    const result = await createRegistrationOnce(db, 'student-1', 'zerocode', inputRecord);
    expect(result.registration.id).toBe('old-random-id');
    expect(result.registration.registration_status).toBe('Confirmed');
    expect([...records.keys()].filter((key) => key.startsWith('registrations/'))).toHaveLength(1);
    expect(records.get('events/zerocode')?.registered_count).toBe(1);
  });

  it('keeps user registrations separate and enforces capacity inside the transaction', async () => {
    const { db, records } = fakeFirestore();
    records.set('events/zerocode', { id: 'ZC-A7K2', title: 'ZeroCode', registered_count: 1, capacity: 1 });
    await expect(createRegistrationOnce(db, 'student-2', 'zerocode', inputRecord))
      .rejects.toBeInstanceOf(RegistrationStoreError);
    expect([...records.keys()].filter((key) => key.startsWith('registrations/'))).toHaveLength(0);
  });
});
