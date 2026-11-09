/**
 * NEXORA Competition Seed Script (scripts/seed-events.ts)
 * 
 * Usage:
 *   npx tsx scripts/seed-events.ts
 * 
 * Seeds the standard 4 NEXORA competitions into Cloud Firestore.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function initAdmin(): App {
  const apps = getApps();
  if (apps.length > 0 && apps[0]) {
    return apps[0];
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(sa)
      });
    } catch {}
  }

  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    return initializeApp({
      credential: cert(sa)
    });
  }

  return initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b'
  });
}

const SEED_COMPETITIONS = [
  {
    id: 'zerocode',
    slug: 'zerocode',
    title: 'ZeroCode: AI-Assisted Frontend Development',
    category: 'AI & Rapid Engineering',
    tagline: '70 Minutes. 5 AI Prompts. Pure Web Execution.',
    description: 'Build production-ready web interfaces with guided AI prompting within a strictly controlled execution sandbox.',
    date: '2026-03-15',
    time: '10:00 AM - 12:30 PM IST',
    venue: 'Computer Center Lab 1, BVM Engineering College',
    team_size: 'Solo',
    min_team_size: 1,
    max_team_size: 1,
    registration_fee: 50,
    capacity: 60,
    registered_count: 0,
    registration_open: true,
    banner_url: '/images/competitions/zerocode_hero.png',
    status: 'Upcoming',
    rules: [
      'Participants may only use the authorized AI sandbox editor provided on the contest terminal.',
      'A maximum of 5 AI prompts may be submitted during the 70-minute sprint.',
      'Scoring: 70% functionality and accuracy, 15% visual fidelity, 15% prompt economy.',
      'External browsing, USB drives, or personal internet connections are strictly prohibited.'
    ],
    prizes: {
      first_place: '₹5,000 + Certificate of Excellence',
      second_place: '₹3,000 + Certificate of Merit',
      third_place: '₹1,500 + Certificate of Merit',
      ranked_prizes: [
        { rank: 1, title: 'Champion', amount: 5000, certificate: true, enabled: true },
        { rank: 2, title: '1st Runner-Up', amount: 3000, certificate: true, enabled: true },
        { rank: 3, title: '2nd Runner-Up', amount: 1500, certificate: true, enabled: true },
        { rank: 4, title: 'Consolation 4th', amount: 500, certificate: true, enabled: true },
        { rank: 5, title: 'Consolation 5th', amount: 500, certificate: true, enabled: true }
      ]
    }
  },
  {
    id: 'ctf',
    slug: 'ctf',
    title: 'Capture The Flag: Cybersecurity & Digital Forensics',
    category: 'Offensive Security & Defense',
    tagline: 'Decrypt. Exploit. Defend. Capture the Flag.',
    description: 'Engage in a 3-hour jeopardy-style cybersecurity challenge spanning cryptography, reverse engineering, and web vulnerability analysis.',
    date: '2026-03-16',
    time: '02:00 PM - 05:30 PM IST',
    venue: 'Cyber Security Lab, BVM Engineering College',
    team_size: '1-2 Members',
    min_team_size: 1,
    max_team_size: 2,
    registration_fee: 50,
    capacity: 40,
    registered_count: 0,
    registration_open: true,
    banner_url: '/images/competitions/ctf_hero.png',
    status: 'Upcoming',
    rules: [
      'Jeopardy scoring with dynamic point decay based on total challenge solves.',
      'Flag format is strictly NXR{flag_content_here}.',
      'Attacking competition infrastructure or fellow participant workstations will lead to immediate disqualification.',
      'Collaboration between different teams is strictly forbidden.'
    ],
    prizes: {
      first_place: '₹6,000 + Trophy + Certificate of Excellence',
      second_place: '₹3,500 + Certificate of Merit',
      third_place: '₹2,000 + Certificate of Merit',
      ranked_prizes: [
        { rank: 1, title: '1st Place Winner', amount: 6000, certificate: true, enabled: true },
        { rank: 2, title: '2nd Place Winner', amount: 3500, certificate: true, enabled: true },
        { rank: 3, title: '3rd Place Winner', amount: 2000, certificate: true, enabled: true }
      ]
    }
  },
  {
    id: 'hackathon',
    slug: 'hackathon',
    title: 'NEXORA Hackathon: From Idea to Impact',
    category: 'Full-Stack Innovation',
    tagline: '24 Hours to Build Solutions That Matter.',
    description: 'Transform multidisciplinary ideas into working prototypes addressing Healthcare, Clean Tech, Smart Governance, and AI Agents.',
    date: '2026-03-22',
    time: '09:00 AM (24 Hours Sprint)',
    venue: 'BVM Auditorium & Innovation Workshop',
    team_size: '2-4 Members',
    min_team_size: 2,
    max_team_size: 4,
    registration_fee: 50,
    capacity: 30,
    registered_count: 0,
    registration_open: true,
    banner_url: '/images/competitions/hackathon_hero.png',
    status: 'Upcoming',
    rules: [
      'All code must be authored during the 24-hour hackathon sprint; pre-existing codebases are prohibited.',
      'Open-source libraries and public APIs are permitted provided they are disclosed during registration.',
      'Teams must deliver a working 3-minute demo and a 2-minute Q&A before faculty judges.',
      'Judging criteria: Innovation (30%), Technical Execution (30%), Feasibility (20%), Pitch (20%).'
    ],
    prizes: {
      first_place: '₹12,000 + Incubation Support + Trophy',
      second_place: '₹7,000 + Certificate of Merit',
      third_place: '₹4,000 + Certificate of Merit',
      ranked_prizes: [
        { rank: 1, title: 'Grand Winner', amount: 12000, certificate: true, enabled: true },
        { rank: 2, title: 'First Runner Up', amount: 7000, certificate: true, enabled: true },
        { rank: 3, title: 'Second Runner Up', amount: 4000, certificate: true, enabled: true }
      ]
    }
  },
  {
    id: 'coderush',
    slug: 'coderush',
    title: 'CodeRush: Algorithmic Programming',
    category: 'Algorithms & Data Structures',
    tagline: 'Speed. Logic. Algorithmic Mastery.',
    description: 'Tackle 10 tiered algorithmic challenges testing memory complexity, optimal data structures, and edge-case resilience.',
    date: '2026-03-25',
    time: '11:00 AM - 01:30 PM IST',
    venue: 'IT Department Server Hall, BVM',
    team_size: 'Solo',
    min_team_size: 1,
    max_team_size: 1,
    registration_fee: 50,
    capacity: 80,
    registered_count: 0,
    registration_open: true,
    banner_url: '/images/competitions/coderush_hero.png',
    status: 'Upcoming',
    rules: [
      'Supported languages: C, C++, Python 3, Java 21.',
      'Time limits: 1.0s for compiled languages, 3.0s for interpreted languages.',
      'Wrong submissions incur a 10-minute penalty applied only upon a correct solve.',
      'Plagiarism or code similarity >70% results in immediate exclusion.'
    ],
    prizes: {
      first_place: '₹5,000 + Certificate of Excellence',
      second_place: '₹3,000 + Certificate of Merit',
      third_place: '₹1,500 + Certificate of Merit',
      ranked_prizes: [
        { rank: 1, title: 'Champion Coder', amount: 5000, certificate: true, enabled: true },
        { rank: 2, title: 'Runner-Up Coder', amount: 3000, certificate: true, enabled: true },
        { rank: 3, title: 'Third Place Coder', amount: 1500, certificate: true, enabled: true }
      ]
    }
  }
];

async function seed() {
  try {
    const app = initAdmin();
    const db = getFirestore(app);
    console.log('Seeding competitions into Firestore events collection...');

    for (const comp of SEED_COMPETITIONS) {
      const ref = db.collection('events').doc(comp.slug);
      const existing = await ref.get();
      if (!existing.exists) {
        await ref.set(comp);
        console.log(`+ Created event: ${comp.title} (${comp.slug})`);
      } else {
        await ref.set(comp, { merge: true });
        console.log(`* Updated event: ${comp.title} (${comp.slug})`);
      }
    }

    console.log('Seed completed successfully!');
  } catch (err: any) {
    console.error('Seeding error:', err.message || err);
  }
}

seed();
