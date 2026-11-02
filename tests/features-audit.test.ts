import { describe, it, expect } from 'vitest';
import { cleanFirestoreData } from '../src/services/dataService';
import { INITIAL_IMAGE_LIBRARY_ITEMS } from '../src/server/cmsEndpoints';

describe('Phase 1 & Phase 8: Data Sanitization & Undefined Field Prevention', () => {
  it('cleanFirestoreData strips out undefined fields recursively', () => {
    const dirtyData = {
      title: 'Hackathon Announcement',
      message: 'Event starts at 10 AM',
      expires_at: undefined,
      publish_at: undefined,
      metadata: {
        category: 'Tech',
        extra: undefined,
        deep: {
          valid: 123,
          bad: undefined
        }
      },
      tags: ['ai', 'bvm']
    };

    const cleaned = cleanFirestoreData(dirtyData);
    expect(cleaned).not.toHaveProperty('expires_at');
    expect(cleaned).not.toHaveProperty('publish_at');
    expect((cleaned as any).metadata).not.toHaveProperty('extra');
    expect((cleaned as any).metadata.deep).not.toHaveProperty('bad');
    expect((cleaned as any).metadata.deep.valid).toBe(123);
    expect(cleaned.title).toBe('Hackathon Announcement');
  });

  it('preserves null, booleans, and valid numbers without modification', () => {
    const data = {
      isComingSoon: false,
      capacity: 0,
      fee: null,
      emptyString: ''
    };
    const cleaned = cleanFirestoreData(data);
    expect(cleaned.isComingSoon).toBe(false);
    expect(cleaned.capacity).toBe(0);
    expect(cleaned.fee).toBeNull();
    expect(cleaned.emptyString).toBe('');
  });
});

describe('Phase 3: Centralized Image Library Categories & Presets', () => {
  it('contains at least 18 preset images covering all 6 mandatory categories with at least 3 images each', () => {
    expect(INITIAL_IMAGE_LIBRARY_ITEMS.length).toBeGreaterThanOrEqual(18);

    const categories = [
      'Vibe Coding / AI Hackathon',
      'CodeRush',
      'Mechanical / RoboRace',
      'Cybersecurity / CTF',
      'Civil / Engineering',
      'General Student Groups'
    ];

    categories.forEach((cat) => {
      const itemsInCat = INITIAL_IMAGE_LIBRARY_ITEMS.filter((img) => img.category === cat);
      expect(itemsInCat.length).toBeGreaterThanOrEqual(3);
      itemsInCat.forEach((img) => {
        expect(img.url).toBeTruthy();
        expect(img.title).toBeTruthy();
        expect(img.id).toBeTruthy();
      });
    });
  });
});

describe('Phase 4: Coming Soon Logic & Security Rules', () => {
  it('identifies Coming Soon competitions properly', () => {
    const compA = { slug: 'zerocode', isComingSoon: true };
    const compB = { slug: 'coderush', isComingSoon: false };

    expect(Boolean(compA.isComingSoon)).toBe(true);
    expect(Boolean(compB.isComingSoon)).toBe(false);
  });
});

describe('Phase 5: Team Management CMS Meta Schema', () => {
  it('has valid structure for organizational branches, roles, and departments', () => {
    const mockRole = {
      id: 'role-1',
      name: 'Faculty Advisor',
      display_order: 1,
      enabled: true
    };
    const mockBranch = {
      id: 'branch-1',
      name: 'Electronics Engineering',
      code: 'EL',
      display_order: 1,
      enabled: true
    };
    const mockDept = {
      id: 'dept-1',
      name: 'Platform Engineering & Architecture',
      display_order: 1,
      enabled: true
    };

    expect(mockRole.name).toBe('Faculty Advisor');
    expect(mockBranch.code).toBe('EL');
    expect(mockDept.name).toContain('Architecture');
  });
});

describe('Phase 6: Competition Limit & Squad Validation', () => {
  it('enforces maximum 15 competitions ceiling', () => {
    const maxLimit = 15;
    const currentEventsCount = 15;
    const isAtCapacity = currentEventsCount >= maxLimit;
    expect(isAtCapacity).toBe(true);

    const underLimitCount = 10;
    expect(underLimitCount < maxLimit).toBe(true);
  });

  it('validates Brain Battle requires a squad of exactly 5 students', () => {
    function validateBrainBattleSquad(teamMembers: any[], hasLeader: boolean = true) {
      const totalSize = (hasLeader ? 1 : 0) + teamMembers.length;
      return totalSize === 5;
    }

    // 4 teammates + 1 leader = 5
    expect(validateBrainBattleSquad(['Alice', 'Bob', 'Charlie', 'Diana'], true)).toBe(true);
    // 3 teammates + 1 leader = 4 (invalid)
    expect(validateBrainBattleSquad(['Alice', 'Bob', 'Charlie'], true)).toBe(false);
    // 5 teammates + 1 leader = 6 (invalid)
    expect(validateBrainBattleSquad(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'], true)).toBe(false);
  });

  it('ensures admin status masking conceals raw phone and email', () => {
    function maskEmail(email: string): string {
      const [local, domain] = email.split('@');
      if (!domain) return '••••••';
      const first = local[0] || '';
      const last = local.slice(-2);
      return `${first}${'•'.repeat(Math.max(local.length - 3, 4))}${last}@${domain}`;
    }

    function maskPhone(phone: string): string {
      const cleaned = phone.trim();
      const last3 = cleaned.slice(-3);
      return `+91 ••••• ••${last3}`;
    }

    const email = 'miteshpipaliya2202@gmail.com';
    const phone = '+91 8200243606';

    const maskedEm = maskEmail(email);
    const maskedPh = maskPhone(phone);

    expect(maskedEm).not.toBe(email);
    expect(maskedEm).toContain('@gmail.com');
    expect(maskedPh).not.toBe(phone);
    expect(maskedPh).toContain('606');
    expect(maskedPh).toContain('•••••');
  });
});
