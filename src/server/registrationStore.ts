import crypto from 'node:crypto';

export class RegistrationStoreError extends Error {
  constructor(
    message: string,
    public readonly code: 'COMPETITION_COMING_SOON' | 'REGISTRATION_CLOSED' | 'COMPETITION_FULL'
  ) {
    super(message);
    this.name = 'RegistrationStoreError';
  }
}

export interface RegistrationCreateResult {
  registration: Record<string, any>;
  alreadyRegistered: boolean;
}

/** Saves exactly one active registration for a verified user/competition pair. */
export async function createRegistrationOnce(
  db: any,
  userId: string,
  eventSlug: string,
  buildRecord: (event: Record<string, any> | null, registrationId: string) => Record<string, any>
): Promise<RegistrationCreateResult> {
  const cleanSlug = eventSlug.toLowerCase().trim();
  const registrationId = `reg_${crypto.createHash('sha256').update(`${userId}:${cleanSlug}`).digest('hex').slice(0, 32)}`;
  const registrationRef = db.collection('registrations').doc(registrationId);
  const eventRef = db.collection('events').doc(cleanSlug);
  const userRegistrations = db.collection('registrations').where('user_id', '==', userId);

  return db.runTransaction(async (transaction: any) => {
    const [registrationSnapshot, existingSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(registrationRef),
      transaction.get(userRegistrations),
      transaction.get(eventRef)
    ]);
    const event = eventSnapshot.exists ? eventSnapshot.data() as Record<string, any> : null;
    const existingDocs = existingSnapshot.docs || [];
    const matchingDocs = existingDocs.filter((snapshot: any) => {
      const data = snapshot.data();
      return (data.event_slug || data.event_id) === cleanSlug;
    });
    const active = matchingDocs.find((snapshot: any) => snapshot.data().registration_status !== 'Cancelled');
    if (active) {
      return {
        registration: { ...active.data(), id: active.data().id || active.id },
        alreadyRegistered: true
      };
    }

    if (event?.isComingSoon === true) {
      throw new RegistrationStoreError('This competition is marked COMING SOON. Registrations are blocked.', 'COMPETITION_COMING_SOON');
    }
    if (event && (event.registration_open === false || event.status === 'Archived' || event.status === 'Completed')) {
      throw new RegistrationStoreError('Registration for this competition is currently closed.', 'REGISTRATION_CLOSED');
    }
    if (event) {
      const capacity = Number(event.capacity) || 60;
      const registeredCount = Number(event.registered_count) || 0;
      if (registeredCount >= capacity) {
        throw new RegistrationStoreError('Competition capacity has been reached.', 'COMPETITION_FULL');
      }
    }

    const cancelled = matchingDocs[0];
    const targetRef = cancelled?.ref || registrationRef;
    const targetId = cancelled?.id || registrationId;
    const record = buildRecord(event, targetId);

    transaction.set(targetRef, record);
    if (eventSnapshot.exists) {
      transaction.update(eventRef, {
        registered_count: (Number(event?.registered_count) || 0) + 1,
        updated_at: record.updated_at
      });
    }

    return { registration: record, alreadyRegistered: false };
  });
}
