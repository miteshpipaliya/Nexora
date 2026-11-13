import type { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { isSafeImageLibraryUrl } from './imageValidation';
import { toFiniteNumber } from '../shared/lib/numberUtils';

export interface CmsEndpointsDependencies {
  apiRouter: Router;
  requireElevatedAdmin: (req: Request, res: Response, next: NextFunction) => void;
  getAdminFirestore: () => Promise<any>;
  recordAudit: (eventType: string, details: string) => void;
}

// 18 Curated High Quality Presets across 6 Categories (>=3 per category)
export const INITIAL_IMAGE_LIBRARY_ITEMS = [
  // 1. Vibe Coding / AI Hackathon (3)
  {
    id: 'img-vibe-1',
    title: 'ZeroCode Prompt Engineering Arena',
    category: 'Vibe Coding / AI Hackathon',
    url: '/images/competitions/zerocode.jpg',
    file_name: 'zerocode.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-01').toISOString()
  },
  {
    id: 'img-vibe-2',
    title: 'Generative AI Sprint & Synthesis',
    category: 'Vibe Coding / AI Hackathon',
    url: '/assets/images/hackathon_event_1792342290154.jpg',
    file_name: 'hackathon_event.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-02').toISOString()
  },
  {
    id: 'img-vibe-3',
    title: 'Rapid AI Prototype Collaborative',
    category: 'Vibe Coding / AI Hackathon',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    file_name: 'ai_rapid_prototype.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-03').toISOString()
  },

  // 2. CodeRush (3)
  {
    id: 'img-code-1',
    title: 'CodeRush Algorithmic Velocity',
    category: 'CodeRush',
    url: '/images/competitions/coderush.jpg',
    file_name: 'coderush.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-04').toISOString()
  },
  {
    id: 'img-code-2',
    title: 'High-Performance Terminal & Logic',
    category: 'CodeRush',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    file_name: 'syntax_terminal.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-05').toISOString()
  },
  {
    id: 'img-code-3',
    title: 'Competitive Algorithmic Duel',
    category: 'CodeRush',
    url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    file_name: 'competitive_duel.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-06').toISOString()
  },

  // 3. Mechanical / RoboRace (3)
  {
    id: 'img-mech-1',
    title: 'RoboRace Autonomous Arena',
    category: 'Mechanical / RoboRace',
    url: '/images/competitions/roborace.jpg',
    file_name: 'roborace.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-07').toISOString()
  },
  {
    id: 'img-mech-2',
    title: 'Autonomous Robotics Platform & Chassis',
    category: 'Mechanical / RoboRace',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
    file_name: 'robotics_chassis.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-08').toISOString()
  },
  {
    id: 'img-mech-3',
    title: 'Precision Actuators & Mechatronics',
    category: 'Mechanical / RoboRace',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    file_name: 'actuators_engineering.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-09').toISOString()
  },

  // 4. Cybersecurity / CTF (3)
  {
    id: 'img-cyber-1',
    title: 'Capture The Flag War Room',
    category: 'Cybersecurity / CTF',
    url: '/images/competitions/ctf.jpg',
    file_name: 'ctf.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-10').toISOString()
  },
  {
    id: 'img-cyber-2',
    title: 'Network Defense & Cryptographic Analysis',
    category: 'Cybersecurity / CTF',
    url: '/assets/images/ctf_cyber_event_1792342289673.jpg',
    file_name: 'ctf_cyber_event.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-11').toISOString()
  },
  {
    id: 'img-cyber-3',
    title: 'Security Operations & Incident Matrix',
    category: 'Cybersecurity / CTF',
    url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    file_name: 'security_matrix.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-12').toISOString()
  },

  // 5. Civil / Engineering (3)
  {
    id: 'img-civil-1',
    title: 'PathFinder Structural Labyrinth',
    category: 'Civil / Engineering',
    url: '/images/competitions/pathfinder.jpg',
    file_name: 'pathfinder.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-13').toISOString()
  },
  {
    id: 'img-civil-2',
    title: 'CAD Modeling & Structural Architecture',
    category: 'Civil / Engineering',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
    file_name: 'cad_architecture.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-14').toISOString()
  },
  {
    id: 'img-civil-3',
    title: 'Infrastructure & Geotechnical Analysis',
    category: 'Civil / Engineering',
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
    file_name: 'infrastructure_analysis.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-15').toISOString()
  },

  // 6. General Student Groups (3)
  {
    id: 'img-group-1',
    title: 'BrainBattle Intercollege Quiz Showdown',
    category: 'General Student Groups',
    url: '/images/competitions/brainbattle.jpg',
    file_name: 'brainbattle.jpg',
    dimensions: '1920x1080',
    is_system_preset: true,
    created_at: new Date('2026-10-16').toISOString()
  },
  {
    id: 'img-group-2',
    title: 'Cross-Discipline Student Brainstorm',
    category: 'General Student Groups',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    file_name: 'student_brainstorm.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-17').toISOString()
  },
  {
    id: 'img-group-3',
    title: 'University Technology Community Assembly',
    category: 'General Student Groups',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    file_name: 'tech_assembly.jpg',
    dimensions: '1200x800',
    is_system_preset: true,
    created_at: new Date('2026-10-18').toISOString()
  }
];

// Default Team Metadata
export const DEFAULT_TEAM_META = {
  roles: [
    { id: 'role-founder', name: 'Founder & Lead Architect', display_order: 1, enabled: true, description: 'Initiative founder and visionary' },
    { id: 'role-faculty', name: 'Faculty Member', display_order: 2, enabled: true, description: 'Faculty coordinator or mentor' },
    { id: 'role-tech-ops', name: 'Technical Operations Head', display_order: 3, enabled: true, description: 'Arena infrastructure and competition systems' },
    { id: 'role-eng-lead', name: 'Full-Stack Engineering Lead', display_order: 4, enabled: true, description: 'Web platform and API development' },
    { id: 'role-event-coord', name: 'Event Coordinator', display_order: 5, enabled: true, description: 'Logistics and judging desk' },
    { id: 'role-creative-dir', name: 'Design & Creative Director', display_order: 6, enabled: true, description: 'Brand identity and UI/UX' },
    { id: 'role-outreach-head', name: 'Public Relations & Outreach Head', display_order: 7, enabled: true, description: 'Intercollege partnerships and sponsorships' },
    { id: 'role-volunteer', name: 'Member or Volunteer', display_order: 8, enabled: true, description: 'Active student contributor or volunteer' }
  ],
  branches: [
    { id: 'branch-el', name: 'Electronics Engineering', code: 'EL', display_order: 1, enabled: true },
    { id: 'branch-cp', name: 'Computer Engineering', code: 'CP', display_order: 2, enabled: true },
    { id: 'branch-it', name: 'Information Technology', code: 'IT', display_order: 3, enabled: true },
    { id: 'branch-me', name: 'Mechanical Engineering', code: 'ME', display_order: 4, enabled: true },
    { id: 'branch-ce', name: 'Civil Engineering', code: 'CE', display_order: 5, enabled: true },
    { id: 'branch-ee', name: 'Electrical Engineering', code: 'EE', display_order: 6, enabled: true },
    { id: 'branch-ec', name: 'Electronics & Communication', code: 'EC', display_order: 7, enabled: true },
    { id: 'branch-pe', name: 'Production Engineering', code: 'PE', display_order: 8, enabled: true }
  ],
  divisions: [
    { id: 'div-a', name: 'Division A', display_order: 1 },
    { id: 'div-b', name: 'Division B', display_order: 2 },
    { id: 'div-c', name: 'Division C', display_order: 3 }
  ],
  departments: [
    { id: 'dept-exec', name: 'Founding Executive Desk', display_order: 1, enabled: true, description: 'Strategic leadership and faculty coordination' },
    { id: 'dept-platform', name: 'Platform Engineering & Architecture', display_order: 2, enabled: true, description: 'Core software, cloud, and real-time state' },
    { id: 'dept-ops', name: 'Competition Operations & Logistics', display_order: 3, enabled: true, description: 'Physical and virtual arena coordination' },
    { id: 'dept-creative', name: 'Design & Media Communications', display_order: 4, enabled: true, description: 'Visual storytelling, badges, and video' },
    { id: 'dept-sponsorship', name: 'Student Outreach & Partnerships', display_order: 5, enabled: true, description: 'Campus relations and industry alliances' }
  ]
};

export const DEFAULT_TEAM_MEMBERS = [
  {
    id: 'member-founder',
    name: 'Mitesh Pipaliya',
    role_name: 'Founder & Lead Architect',
    academic_branch_name: 'Electronics Engineering',
    division: 'Division A',
    department_name: 'Founding Executive Desk',
    bio: 'Pioneering NEXORA as a student-led innovation ecosystem connecting BVM engineers with regional tech talent. Driving technical direction, challenge formulation, and cross-discipline collaboration.',
    avatar_url: '/images/team/mitesh_founder.jpg',
    enrollment_number: '23EL001',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    display_order: 1,
    is_featured: true,
    is_founder: true,
    enabled: true,
    created_at: new Date('2026-10-01').toISOString(),
    updated_at: new Date('2026-10-01').toISOString()
  }
];

// Helper: Sanitize object for Firestore to guarantee no undefined fields are passed
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

export function registerCmsEndpoints({
  apiRouter,
  requireElevatedAdmin,
  getAdminFirestore,
  recordAudit
}: CmsEndpointsDependencies) {

  // ========================================================
  // 1. COMPETITIONS CRUD (SERVER-SIDE FIRESTORE GUARANTEE)
  // ========================================================

  apiRouter.post('/admin/competitions', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.title || !data.title.trim()) {
        res.status(400).json({ error: 'Competition title is required.' });
        return;
      }

      let slug = (data.slug || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      if (!slug) {
        slug = data.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }

      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      // Enforce hard ceiling of 15 competitions
      const eventsSnap = await db.collection('events').get();
      if (eventsSnap.size >= 15) {
        res.status(409).json({
          error: 'Maximum competition limit reached (15/15 competitions). Archive or delete an existing competition to create a new one.',
          limit: 15,
          current: eventsSnap.size
        });
        return;
      }

      // Check collision
      const existing = await db.collection('events').doc(slug).get();
      if (existing.exists) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }

      const now = new Date().toISOString();
      const competitionDoc = sanitizeForFirestore({
        id: slug,
        slug,
        title: data.title.trim(),
        tagline: data.tagline?.trim() || 'Engineered for Excellence',
        description: data.description?.trim() || data.short_description?.trim() || 'Join NEXORA for this flagship competition.',
        short_description: data.short_description?.trim() || data.description?.trim() || 'Flagship technical challenge.',
        full_description: data.full_description?.trim() || data.description?.trim() || 'Complete competition specifications.',
        category: data.category || 'AI-Assisted Development',
        difficulty: data.difficulty || 'All Skill Levels',
        status: data.status || 'Published',
        registration_open: data.registration_open !== false,
        is_published: data.status === 'Published',
        isComingSoon: Boolean(data.isComingSoon),
        show_capacity: data.show_capacity !== false,
        capacity: toFiniteNumber(data.capacity, 60),
        registered_count: toFiniteNumber(data.registered_count, 0),
        fee_per_participant: toFiniteNumber(data.fee_per_participant, 50),
        banner_image: data.banner_image || data.cover_image || '/images/competitions/zerocode.jpg',
        cover_image: data.cover_image || data.banner_image || '/images/competitions/zerocode.jpg',
        event_date: data.event_date || 'TBA',
        registration_deadline: data.registration_deadline || 'TBA',
        venue: data.venue || 'BVM Engineering College, Vallabh Vidyanagar',
        duration: data.duration || '6 Hours',
        team_size: data.team_size || '1–4 Participants',
        min_team_size: toFiniteNumber(data.min_team_size, 1),
        max_team_size: toFiniteNumber(data.max_team_size, 4),
        eligibility: data.eligibility || 'Open to all engineering students.',
        prizes: data.prizes || {
          first_place: '₹2,000 Cash Prize',
          second_place: '₹1,000 Cash Prize',
          special_rewards: 'Certificates of Merit'
        },
        rules: data.rules?.length ? data.rules : ['Standard ethical engineering competition rules apply.'],
        judging_criteria: data.judging_criteria?.length ? data.judging_criteria : [
          { label: 'Technical Execution', percentage: 50, description: 'Code architecture and engineering' }
        ],
        faq: data.faq?.length ? data.faq : [
          { question: 'Who can participate?', answer: 'All engineering students across recognized colleges.' }
        ],
        created_at: now,
        updated_at: now
      });

      await db.collection('events').doc(slug).set(competitionDoc);
      recordAudit('COMPETITION_CREATED', `Created competition: ${competitionDoc.title} (${slug})`);

      res.json({ success: true, competition: competitionDoc });
    } catch (err: any) {
      console.error('[API CREATE COMPETITION ERROR]', err);
      res.status(500).json({ error: 'Failed to save competition to database.' });
    }
  });

  apiRouter.put('/admin/competitions/:slug', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const data = req.body;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      const updateData = sanitizeForFirestore({
        ...data,
        slug,
        isComingSoon: Boolean(data.isComingSoon),
        ...(data.show_capacity !== undefined ? { show_capacity: Boolean(data.show_capacity) } : {}),
        updated_at: new Date().toISOString()
      });

      await db.collection('events').doc(slug).set(updateData, { merge: true });
      recordAudit('COMPETITION_UPDATED', `Updated competition: ${data.title || slug}`);

      res.json({ success: true, slug, competition: updateData });
    } catch (err: any) {
      console.error('[API UPDATE COMPETITION ERROR]', err);
      res.status(500).json({ error: 'Failed to update competition.' });
    }
  });

  apiRouter.delete('/admin/competitions/:slug', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      await db.collection('events').doc(slug).delete();
      recordAudit('COMPETITION_DELETED', `Deleted competition: ${slug}`);

      res.json({ success: true, deletedSlug: slug });
    } catch (err: any) {
      console.error('[API DELETE COMPETITION ERROR]', err);
      res.status(500).json({ error: 'Failed to delete competition.' });
    }
  });

  // ========================================================
  // 2. BROADCAST NOTIFICATIONS CRUD (PHASE 8)
  // ========================================================

  apiRouter.post('/admin/notifications', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.title || !data.title.trim()) {
        res.status(400).json({ error: 'Notification title is required.' });
        return;
      }
      if (!data.message || !data.message.trim()) {
        res.status(400).json({ error: 'Notification message is required.' });
        return;
      }

      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      const id = data.id || `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();

      const notifDoc: Record<string, any> = {
        id,
        title: data.title.trim(),
        message: data.message.trim(),
        category: data.category || 'Announcement',
        priority: data.priority || 'Normal',
        audience: data.audience || 'all',
        status: data.status || 'Published',
        created_at: now
      };

      // Handle strictly optional fields without passing undefined
      if (data.link_url && typeof data.link_url === 'string' && data.link_url.trim()) {
        notifDoc.link_url = data.link_url.trim();
      }
      if (data.link_text && typeof data.link_text === 'string' && data.link_text.trim()) {
        notifDoc.link_text = data.link_text.trim();
      }
      if (data.image_url && typeof data.image_url === 'string' && data.image_url.trim()) {
        notifDoc.image_url = data.image_url.trim();
      }
      if (data.publish_at && typeof data.publish_at === 'string' && data.publish_at.trim()) {
        notifDoc.publish_at = data.publish_at.trim();
      }
      if (data.expires_at && typeof data.expires_at === 'string' && data.expires_at.trim()) {
        notifDoc.expires_at = data.expires_at.trim();
      }

      await db.collection('notifications').doc(id).set(sanitizeForFirestore(notifDoc));
      recordAudit('NOTIFICATION_PUBLISHED', `Broadcast announcement: ${notifDoc.title}`);

      res.json({ success: true, notification: notifDoc });
    } catch (err: any) {
      console.error('[API PUBLISH NOTIFICATION ERROR]', err);
      res.status(500).json({ error: 'Failed to publish broadcast notification.' });
    }
  });

  apiRouter.put('/admin/notifications/:id', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      const notifDoc: Record<string, any> = {
        id,
        title: data.title?.trim() || '',
        message: data.message?.trim() || '',
        category: data.category || 'Announcement',
        priority: data.priority || 'Normal',
        audience: data.audience || 'all',
        status: data.status || 'Published',
        updated_at: new Date().toISOString()
      };

      if (data.link_url?.trim()) notifDoc.link_url = data.link_url.trim();
      if (data.link_text?.trim()) notifDoc.link_text = data.link_text.trim();
      if (data.image_url?.trim()) notifDoc.image_url = data.image_url.trim();
      if (data.publish_at?.trim()) notifDoc.publish_at = data.publish_at.trim();
      if (data.expires_at?.trim()) notifDoc.expires_at = data.expires_at.trim();

      await db.collection('notifications').doc(id).set(sanitizeForFirestore(notifDoc), { merge: true });
      recordAudit('NOTIFICATION_UPDATED', `Updated broadcast announcement: ${notifDoc.title || id}`);

      res.json({ success: true, id, notification: notifDoc });
    } catch (err: any) {
      console.error('[API UPDATE NOTIFICATION ERROR]', err);
      res.status(500).json({ error: 'Failed to update notification.' });
    }
  });

  apiRouter.delete('/admin/notifications/:id', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      await db.collection('notifications').doc(id).delete();
      recordAudit('NOTIFICATION_DELETED', `Deleted broadcast announcement: ${id}`);

      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('[API DELETE NOTIFICATION ERROR]', err);
      res.status(500).json({ error: 'Failed to delete notification.' });
    }
  });

  // ========================================================
  // 3. IMAGE LIBRARY CRUD (PHASE 3)
  // ========================================================

  apiRouter.get('/admin/images', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const db = await getAdminFirestore();
      if (!db) {
        res.json({ success: true, images: INITIAL_IMAGE_LIBRARY_ITEMS });
        return;
      }

      const snap = await db.collection('imageLibrary').get();
      if (snap.empty) {
        // Seed initial 18 images into Firestore
        const batch = db.batch();
        for (const img of INITIAL_IMAGE_LIBRARY_ITEMS) {
          const docRef = db.collection('imageLibrary').doc(img.id);
          batch.set(docRef, sanitizeForFirestore(img));
        }
        await batch.commit();
        res.json({ success: true, images: INITIAL_IMAGE_LIBRARY_ITEMS });
        return;
      }

      const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      res.json({ success: true, images: items });
    } catch (err: any) {
      console.error('[API GET IMAGES ERROR]', err);
      res.json({ success: true, images: INITIAL_IMAGE_LIBRARY_ITEMS });
    }
  });

  apiRouter.post('/admin/images', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!isSafeImageLibraryUrl(data?.url)) {
        res.status(400).json({ error: 'Use a valid HTTPS image URL, public asset path, or verified PNG/JPEG/WebP data URL.' });
        return;
      }

      const id = data.id || `img_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const imgDoc = sanitizeForFirestore({
        id,
        title: data.title?.trim() || 'Uploaded Image',
        category: data.category || 'General Student Groups',
        url: data.url.trim(),
        file_name: data.file_name || 'uploaded_image.jpg',
        file_size: data.file_size || 0,
        dimensions: data.dimensions || '1200x800',
        uploaded_by: 'NEXORA Admin Desk',
        is_system_preset: Boolean(data.is_system_preset),
        created_at: new Date().toISOString()
      });

      const db = await getAdminFirestore();
      if (db) {
        await db.collection('imageLibrary').doc(id).set(imgDoc);
      }
      recordAudit('IMAGE_LIBRARY_ADDED', `Added image to library: ${imgDoc.title} (${imgDoc.category})`);

      res.json({ success: true, image: imgDoc });
    } catch (err: any) {
      console.error('[API ADD IMAGE ERROR]', err);
      res.status(500).json({ error: 'Failed to save image to library.' });
    }
  });

  // Safe delete with in-use check
  apiRouter.delete('/admin/images/:id', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await getAdminFirestore();
      if (!db) {
        res.json({ success: true, deletedId: id });
        return;
      }

      const docSnap = await db.collection('imageLibrary').doc(id).get();
      if (!docSnap.exists) {
        res.status(404).json({ error: 'Image not found in library.' });
        return;
      }

      const imgData = docSnap.data();
      const targetUrl = imgData.url;

      // 1. Check in competitions
      const eventsSnap = await db.collection('events').get();
      const inUseCompetition = eventsSnap.docs.find((d: any) => {
        const ev = d.data();
        return ev.cover_image === targetUrl || ev.banner_image === targetUrl;
      });

      if (inUseCompetition) {
        res.status(409).json({
          error: `Cannot delete image: it is currently used as the cover/banner for competition "${inUseCompetition.data().title}".`,
          inUse: true,
          usedBy: inUseCompetition.data().title
        });
        return;
      }

      // 2. Check in team members
      const teamSnap = await db.collection('teamMembers').get();
      const inUseMember = teamSnap.docs.find((d: any) => {
        const m = d.data();
        return m.avatar_url === targetUrl;
      });

      if (inUseMember) {
        res.status(409).json({
          error: `Cannot delete image: it is currently assigned as the avatar for team member "${inUseMember.data().name}".`,
          inUse: true,
          usedBy: inUseMember.data().name
        });
        return;
      }

      await db.collection('imageLibrary').doc(id).delete();
      recordAudit('IMAGE_LIBRARY_DELETED', `Deleted image: ${imgData.title || id}`);

      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('[API DELETE IMAGE ERROR]', err);
      res.status(500).json({ error: 'Failed to delete image.' });
    }
  });

  // ========================================================
  // 4. TEAM CMS CRUD (PHASE 5)
  // ========================================================

  apiRouter.get('/admin/team/meta', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const db = await getAdminFirestore();
      if (!db) {
        res.json({ success: true, meta: DEFAULT_TEAM_META });
        return;
      }

      const docSnap = await db.collection('teamConfig').doc('meta').get();
      if (!docSnap.exists) {
        await db.collection('teamConfig').doc('meta').set(sanitizeForFirestore(DEFAULT_TEAM_META));
        res.json({ success: true, meta: DEFAULT_TEAM_META });
        return;
      }

      res.json({ success: true, meta: docSnap.data() });
    } catch (err: any) {
      console.error('[API GET TEAM META ERROR]', err);
      res.json({ success: true, meta: DEFAULT_TEAM_META });
    }
  });

  apiRouter.post('/admin/team/meta', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { roles, branches, divisions, departments } = req.body;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      const updatedMeta = sanitizeForFirestore({
        roles: roles || DEFAULT_TEAM_META.roles,
        branches: branches || DEFAULT_TEAM_META.branches,
        divisions: divisions || DEFAULT_TEAM_META.divisions,
        departments: departments || DEFAULT_TEAM_META.departments,
        updated_at: new Date().toISOString()
      });

      await db.collection('teamConfig').doc('meta').set(updatedMeta);
      recordAudit('TEAM_META_UPDATED', 'Updated team organizational metadata (roles/branches/departments/divisions)');

      res.json({ success: true, meta: updatedMeta });
    } catch (err: any) {
      console.error('[API UPDATE TEAM META ERROR]', err);
      res.status(500).json({ error: 'Failed to save team metadata.' });
    }
  });

  apiRouter.get('/admin/team/members', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const db = await getAdminFirestore();
      if (!db) {
        res.json({ success: true, members: DEFAULT_TEAM_MEMBERS });
        return;
      }

      const snap = await db.collection('teamMembers').get();
      if (snap.empty) {
        for (const m of DEFAULT_TEAM_MEMBERS) {
          await db.collection('teamMembers').doc(m.id).set(sanitizeForFirestore(m));
        }
        res.json({ success: true, members: DEFAULT_TEAM_MEMBERS });
        return;
      }

      const members = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      members.sort((a: any, b: any) => (a.display_order || 999) - (b.display_order || 999));

      res.json({ success: true, members });
    } catch (err: any) {
      console.error('[API GET TEAM MEMBERS ERROR]', err);
      res.json({ success: true, members: DEFAULT_TEAM_MEMBERS });
    }
  });

  apiRouter.post('/admin/team/members', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.name || !data.name.trim()) {
        res.status(400).json({ error: 'Member name is required.' });
        return;
      }

      const id = data.id || `member_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();

      const memberDoc = sanitizeForFirestore({
        id,
        name: data.name.trim(),
        role_name: data.role_name || 'Executive Member',
        academic_branch_name: data.academic_branch_name || 'Engineering',
        division: data.division || 'Division A',
        department_name: data.department_name || 'Technical Operations',
        bio: data.is_founder === true ? (data.bio?.trim() || '') : '',
        avatar_url: data.avatar_url?.trim() || '/images/team/mitesh_founder.jpg',
        enrollment_number: data.enrollment_number?.trim() || '',
        institution: data.institution?.trim() || 'Birla Vishvakarma Mahavidyalaya',
        social_links: data.social_links || {},
        display_order: toFiniteNumber(data.display_order, 99),
        is_featured: Boolean(data.is_featured),
        is_founder: Boolean(data.is_founder),
        enabled: data.enabled !== false,
        visibility_approved: data.is_founder === true || data.visibility_approved === true,
        created_at: now,
        updated_at: now
      });

      const db = await getAdminFirestore();
      if (db) {
        await db.collection('teamMembers').doc(id).set(memberDoc);
      }
      recordAudit('TEAM_MEMBER_CREATED', `Created team member: ${memberDoc.name} (${memberDoc.role_name})`);

      res.json({ success: true, member: memberDoc });
    } catch (err: any) {
      console.error('[API CREATE TEAM MEMBER ERROR]', err);
      res.status(500).json({ error: 'Failed to save team member.' });
    }
  });

  apiRouter.put('/admin/team/members/:id', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      const updateDoc = sanitizeForFirestore({
        ...data,
        id,
        updated_at: new Date().toISOString()
      });

      await db.collection('teamMembers').doc(id).set(updateDoc, { merge: true });
      recordAudit('TEAM_MEMBER_UPDATED', `Updated team member: ${data.name || id}`);

      res.json({ success: true, id, member: updateDoc });
    } catch (err: any) {
      console.error('[API UPDATE TEAM MEMBER ERROR]', err);
      res.status(500).json({ error: 'Failed to update team member.' });
    }
  });

  apiRouter.delete('/admin/team/members/:id', requireElevatedAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await getAdminFirestore();
      if (!db) {
        res.status(503).json({ error: 'Database service is currently unreachable.' });
        return;
      }

      await db.collection('teamMembers').doc(id).delete();
      recordAudit('TEAM_MEMBER_DELETED', `Deleted team member: ${id}`);

      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error('[API DELETE TEAM MEMBER ERROR]', err);
      res.status(500).json({ error: 'Failed to delete team member.' });
    }
  });

  // Public roster is opt-in for every non-founder. Legacy non-founder records
  // are PRIVATE until an administrator explicitly approves publication.
  apiRouter.get('/team/public', async (_req: Request, res: Response) => {
    const founderFallback = DEFAULT_TEAM_MEMBERS.filter((member: any) => member.is_founder);
    const fallback = { success: true, members: founderFallback, meta: DEFAULT_TEAM_META };
    try {
      const db = await getAdminFirestore();
      res.setHeader('Cache-Control', 'no-store');
      if (!db) return void res.json(fallback);
      const [membersSnap, metaSnap] = await Promise.all([
        db.collection('teamMembers').get(),
        db.collection('teamConfig').doc('meta').get()
      ]);
      const meta = metaSnap.exists ? metaSnap.data() : DEFAULT_TEAM_META;
      const members = membersSnap.empty ? founderFallback : membersSnap.docs
        .map((snapshot: any) => ({ id: snapshot.id, ...snapshot.data() }))
        .filter((member: any) => member.enabled !== false &&
          (member.is_founder === true || member.visibility_approved === true) &&
          typeof member.name === 'string' && member.name.trim().length > 0)
        .map((member: any) => ({
          id: String(member.id),
          name: String(member.name).slice(0, 120),
          role_name: String(member.role_name || '').slice(0, 100),
          department_name: String(member.department_name || '').slice(0, 140),
          division: String(member.division || '').slice(0, 40),
          enrollment_number: member.is_founder || member.visibility_approved === true
            ? String(member.enrollment_number || '').slice(0, 60) : '',
          bio: member.is_founder ? String(member.bio || '').slice(0, 1800) : '',
          avatar_url: typeof member.avatar_url === 'string' ? member.avatar_url : '',
          display_order: toFiniteNumber(member.display_order, 99),
          is_founder: member.is_founder === true,
          is_faculty: String(member.role_key || '').startsWith('faculty_'),
          enabled: true,
        }));
      members.sort((a: any, b: any) =>
        Number(b.is_founder) - Number(a.is_founder) ||
        a.display_order - b.display_order ||
        a.name.localeCompare(b.name)
      );
      res.json({ success: true, members, meta });
    } catch (error) {
      console.warn('[TEAM PUBLIC] Roster unavailable:', error);
      res.json(fallback);
    }
  });
}
