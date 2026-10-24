import { CompetitionEvent, TeamMemberProfile, UserProfile, RegistrationRecord } from '../types';

export const INITIAL_EVENTS: CompetitionEvent[] = [
  {
    id: 'evt-zerocode',
    slug: 'zerocode',
    title: 'ZeroCode',
    tagline: 'BUILD WITH IDEAS, NOT JUST CODE.',
    description:
      'ZeroCode challenges participants to transform ideas into functional digital experiences using AI-assisted development. The competition tests creativity, prompt engineering, problem-solving, implementation, and the ability to deliver a working product under constraints.',
    category: 'AI-Assisted Development',
    difficulty: 'All Skill Levels',
    status: 'Published',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '70 Minutes',
    team_size: 'Individual Participation',
    min_team_size: 1,
    max_team_size: 1,
    capacity: 80,
    registered_count: 0,
    fee_per_participant: 50,
    banner_image: '/images/competitions/zerocode.jpg',
    prizes: {
      first_place: '₹2,000 Cash Prize',
      special_rewards: 'Top 7 Participants — Exclusive Surprise Gifts'
    },
    rules: [
      'Duration: 70 minutes strictly timed.',
      'Maximum AI Prompts: 5 prompts per participant recorded for evaluation audit.',
      'Frontend Technologies: Clean HTML, CSS, JavaScript (Vanilla or modern Web standards).',
      'Submission: Working project files with live browser execution demonstration.',
      'All prompts and outputs must be transparently documented in the submission report.',
      'Note: Rules represent proposed draft guidelines awaiting faculty council ratification.'
    ],
    judging_criteria: [
      { label: 'Functionality & Completeness', percentage: 70, description: 'Core functional requirements working seamlessly without browser console errors.' },
      { label: 'User Experience & Visual Polish', percentage: 15, description: 'Design hierarchy, responsive behavior, intuitive UX, and aesthetic quality.' },
      { label: 'Prompt Discipline & Rule Compliance', percentage: 15, description: 'Adherence to prompt limits, prompt engineering craftsmanship, and ethical tool use.' }
    ],
    faq: [
      { question: 'What tools are allowed during ZeroCode?', answer: 'Participants may use approved modern LLM interfaces with session history enabled to track the 5-prompt allowance.' },
      { question: 'Can beginner coders participate?', answer: 'Yes! ZeroCode is specifically architected to test problem deconstruction, prompt clarity, and rapid implementation.' },
      { question: 'Is prior framework knowledge mandatory?', answer: 'No. The focus is on turning a concept into working client-side code using modern standard web technologies.' }
    ]
  },
  {
    id: 'evt-coderush',
    slug: 'coderush',
    title: 'CodeRush',
    tagline: 'TEN PROBLEMS. ONE LEADERBOARD.',
    description:
      'A competitive programming challenge where every participant receives ten algorithmic problems and races to solve them accurately and efficiently under strict time constraints.',
    category: 'Competitive Programming',
    difficulty: 'Competitive',
    status: 'Published',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '2.5 Hours',
    team_size: 'Individual Participation',
    min_team_size: 1,
    max_team_size: 1,
    capacity: 100,
    registered_count: 0,
    fee_per_participant: 50,
    banner_image: '/images/competitions/coderush.jpg',
    prizes: {
      first_place: '₹2,000 Cash Prize',
      special_rewards: 'Top 7 Participants — Exclusive Surprise Gifts'
    },
    rules: [
      'Contestants receive exactly 10 algorithmic problems categorized across Easy (3), Medium (4), and Hard (3).',
      'Supported programming languages: C, C++, Python, and Java (subject to execution judge availability).',
      'Rankings are determined by total score (problems solved) with tie-breaks calculated via total submission penalty minutes.',
      'Strict anti-plagiarism heuristics apply across all source code submissions.',
      'Note: Live competition execution connects to an isolated sandbox judge service upon official contest launch.'
    ],
    judging_criteria: [
      { label: 'Correctness & Test Suite Coverage', percentage: 80, description: 'Passing all hidden test cases including edge boundary conditions.' },
      { label: 'Time & Memory Efficiency', percentage: 20, description: 'Execution within strict CPU and memory limits per problem category.' }
    ],
    tracks_or_format: [
      '3 Easy Warmup Challenges (Arrays, Basic Math, Strings)',
      '4 Medium Algorithmic Puzzles (Greedy, Two Pointers, Trees, Hash Maps)',
      '3 Hard Challenges (Dynamic Programming, Graph Theory, Combinatorics)'
    ],
    faq: [
      { question: 'What languages are supported?', answer: 'C, C++, Java, and Python are natively supported in the evaluation engine.' },
      { question: 'Will there be partial scoring for sub-tasks?', answer: 'Yes, medium and hard problems include test sub-suites with progressive point allocations.' }
    ]
  },
  {
    id: 'evt-pathfinder',
    slug: 'pathfinder',
    title: 'PathFinder',
    tagline: 'NAVIGATE THE CODE LABYRINTH.',
    description:
      'An algorithmic labyrinth challenge where participants develop optimal routing and search strategies under dynamic node constraints, time limits, and obstacles.',
    category: 'Algorithms & Data Structures',
    difficulty: 'Intermediate',
    status: 'Published',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '2 Hours',
    team_size: '1–2 Members per Team',
    min_team_size: 1,
    max_team_size: 2,
    capacity: 60,
    registered_count: 0,
    fee_per_participant: 50,
    banner_image: '/images/competitions/pathfinder.jpg',
    prizes: {
      first_place: '₹2,500 Cash Prize',
      second_place: '₹1,500 Cash Prize',
      special_rewards: 'Top 5 Teams — Certificates of Distinction'
    },
    rules: [
      'Teams of 1 or 2 participants allowed.',
      'Implement routing algorithms traversing graph environments with weighted obstacles.',
      'Memory and latency budgets enforced per test round.',
      'Solutions are evaluated on correctness, time complexity, and node efficiency.'
    ],
    judging_criteria: [
      { label: 'Path Optimality & Cost', percentage: 60, description: 'Shortest path discovered with minimal edge traversal costs.' },
      { label: 'Algorithmic Runtime Efficiency', percentage: 25, description: 'Total execution time across all test mazes.' },
      { label: 'Code Cleanliness & Design', percentage: 15, description: 'Modular architecture and algorithmic clarity.' }
    ],
    faq: [
      { question: 'Can I participate solo in PathFinder?', answer: 'Yes, teams can consist of either 1 or 2 members.' },
      { question: 'What graph algorithms are most relevant?', answer: 'BFS, DFS, Dijkstra, A*, and dynamic programming concepts are highly advantageous.' }
    ]
  },
  {
    id: 'evt-ctf',
    slug: 'ctf',
    title: 'CTF — Capture The Flag',
    tagline: 'THINK LIKE A HACKER. SOLVE LIKE AN ENGINEER.',
    description:
      'A cybersecurity challenge where participants solve carefully designed puzzles, investigate digital clues, and capture hidden flags across multiple specialized domains.',
    category: 'Cybersecurity & Forensics',
    difficulty: 'Intermediate to Advanced',
    status: 'Published',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '3 Hours',
    team_size: '1–2 Participants',
    min_team_size: 1,
    max_team_size: 2,
    capacity: 60,
    registered_count: 0,
    fee_per_participant: 50,
    banner_image: '/images/competitions/ctf.jpg',
    prizes: {
      first_place: '₹2,000 Cash Prize',
      special_rewards: 'Top 7 Participants — Exclusive Surprise Gifts'
    },
    rules: [
      'Ethical participation is mandatory. Attacks against unrelated college infrastructure or external systems are strictly prohibited.',
      'No harassment, flag hoarding, or sharing flags between non-teammate participants.',
      'All challenges run exclusively inside isolated, approved sandbox environments.',
      'Rankings are determined by total valid flags, challenge point values, and timestamp tie-breakers.',
      'Flags follow the standard format: NEXORA{secret_flag_hash}.'
    ],
    judging_criteria: [
      { label: 'Flag Accuracy & Verification', percentage: 80, description: 'Direct cryptographic flag captures verified against the central evaluation server.' },
      { label: 'Speed & Time Penalty', percentage: 20, description: 'First-blood speed bonuses and minimal incorrect submission penalties.' }
    ],
    tracks_or_format: [
      'Web Security & Vulnerability Analysis',
      'Cryptography & Cipher Deconstruction',
      'Digital Forensics & Packet Inspection',
      'Open Source Intelligence (OSINT)',
      'Reverse Engineering & Binary Analysis',
      'General Cybersecurity Logic Puzzles'
    ],
    faq: [
      { question: 'Will there be a live offensive attack network?', answer: 'Challenges operate in isolated jeopardy-style sandboxes without unconstrained cross-team attacks.' },
      { question: 'Do I need advanced Linux experience?', answer: 'Basic command line familiarity and browser developer tools will solve introductory tiers; advanced tiers challenge seasoned enthusiasts.' }
    ]
  },
  {
    id: 'evt-roborace',
    slug: 'roborace',
    title: 'RoboRace',
    tagline: 'PRECISION MEETS VELOCITY.',
    description:
      'An autonomous and remote-controlled robotics sprint where engineered bots navigate treacherous turns, bridges, ramps, and obstacle sectors on a custom-designed arena track.',
    category: 'Robotics & Hardware',
    difficulty: 'Hardware / Robotics',
    status: 'Published',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: 'Arena Heats & Finals',
    team_size: '1–4 Members per Team',
    min_team_size: 1,
    max_team_size: 4,
    capacity: 50,
    registered_count: 0,
    fee_per_participant: 50,
    banner_image: '/images/competitions/roborace.jpg',
    prizes: {
      first_place: '₹3,000 Cash Prize',
      second_place: '₹1,500 Cash Prize',
      special_rewards: 'Best Engineered Chassis Award'
    },
    rules: [
      'Bot chassis dimensions must not exceed 30cm x 30cm x 25cm during starting gate inspection.',
      'Maximum operating voltage: 12V DC onboard power supply.',
      'Track heats: 3 attempts per bot, with the lowest elapsed time determining qualification.',
      'Manual track touches by team pilots incur a 5-second penalty each.'
    ],
    judging_criteria: [
      { label: 'Track Lap Speed & Time', percentage: 70, description: 'Fastest official lap time recorded through gate sensors.' },
      { label: 'Handling & Obstacle Mastery', percentage: 20, description: 'Zero track resets, boundary touches, and obstacle clearance.' },
      { label: 'Chassis Engineering & Durability', percentage: 10, description: 'Structural integrity, cable management, and safety mechanisms.' }
    ],
    faq: [
      { question: 'Can custom microcontrollers (ESP32 / Arduino / Raspberry Pi) be used?', answer: 'Yes, any microcontrollers and motor driver boards complying with the 12V voltage limit are welcome.' },
      { question: 'Is wireless control allowed?', answer: 'Yes, Bluetooth, 2.4GHz RF, and Wi-Fi transceivers are fully supported.' }
    ]
  },
  {
    id: 'evt-brainbattle',
    slug: 'brainbattle',
    title: 'BrainBattle',
    tagline: 'THE ULTIMATE TECHNICAL INTELLECT SHOWDOWN.',
    description:
      'A multi-round high-stakes technical quiz showdown testing collegiate squads across computer systems, electronics, engineering history, logic, and rapid trivia recall.',
    category: 'Technical Quiz & Rapid Recall',
    difficulty: 'Rapid Recall',
    status: 'Published',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '3 Fast-Paced Rounds',
    team_size: 'Exactly 5 Members per Team',
    min_team_size: 5,
    max_team_size: 5,
    capacity: 40,
    registered_count: 0,
    fee_per_participant: 50,
    banner_image: '/images/competitions/brainbattle.jpg',
    prizes: {
      first_place: '₹3,500 Cash Prize',
      second_place: '₹2,000 Cash Prize',
      special_rewards: 'Best Rapid Buzzer Team'
    },
    rules: [
      'Teams must consist of exactly 5 members.',
      'Round 1: Written Prelims (40 multi-disciplinary questions, 30 minutes).',
      'Round 2: Rapid-Fire Audio/Visual Clue Round (Top 8 qualifying teams).',
      'Round 3: Grand Stage Buzzer Round with negative marking for incorrect buzzes.',
      'Faculty quiz master decisions are final and binding.'
    ],
    judging_criteria: [
      { label: 'Cumulative Quiz Score', percentage: 80, description: 'Total points accumulated across all 3 competition tiers.' },
      { label: 'Buzzer Precision & Penalty Discipline', percentage: 20, description: 'High correct-to-incorrect response ratio during stage buzzer rounds.' }
    ],
    faq: [
      { question: 'Can students from different branches form a team of 5?', answer: 'Yes! Cross-departmental multidisciplinary squads are encouraged to cover a broad spectrum of engineering domains.' },
      { question: 'What topics are covered?', answer: 'Core computer science, digital electronics, tech history, science breakthroughs, and logical problem solving.' }
    ]
  }
];

export const FOUNDING_TEAM: TeamMemberProfile[] = [
  {
    id: 'founder-mitesh',
    name: 'Mitesh Pipaliya',
    role: 'Founder — NEXORA',
    department: 'Electronics Engineering',
    institution: 'Birla Vishvakarma Mahavidyalaya (BVM)',
    enrollment_number: '26EL309',
    division: '11',
    avatar_url: '/images/team/mitesh_founder.jpg',
    bio: 'Pioneering student visionary focused on bringing together interdisciplinary creators, developers, and engineers at BVM to build what comes next.',
    is_founder: true,
    is_placeholder: false
  },
  {
    id: 'placeholder-tech-lead',
    name: 'Technical Lead',
    role: 'Technical Lead',
    department: 'Computer / IT Engineering',
    institution: 'BVM Engineering College',
    bio: 'Responsible for leading algorithmic challenges, platform architecture, and developer workshops.',
    is_founder: false,
    is_placeholder: true
  },
  {
    id: 'placeholder-event-lead',
    name: 'Events & Operations Lead',
    role: 'Event Lead',
    department: 'Engineering Stream',
    institution: 'BVM Engineering College',
    bio: 'Spearheading competition logistics, stage coordination, and intercollege student invitations.',
    is_founder: false,
    is_placeholder: true
  },
  {
    id: 'placeholder-design-lead',
    name: 'Design & Media Lead',
    role: 'Design Lead',
    department: 'Engineering Stream',
    institution: 'BVM Engineering College',
    bio: 'Crafting brand aesthetics, visual storytelling, digital interfaces, and platform experience.',
    is_founder: false,
    is_placeholder: true
  },
  {
    id: 'placeholder-community-lead',
    name: 'Community & Outreach Lead',
    role: 'Community Lead',
    department: 'Engineering Stream',
    institution: 'BVM Engineering College',
    bio: 'Building student networks across BVM, GCET, ADIT, and broader Gujarat technical colleges.',
    is_founder: false,
    is_placeholder: true
  },
  {
    id: 'placeholder-faculty-mentor',
    name: 'Faculty Mentor',
    role: 'Faculty Mentor & Advisor',
    department: 'Academic Faculty',
    institution: 'Birla Vishvakarma Mahavidyalaya',
    bio: 'Guiding institutional alignment, academic rigor, and official administrative clearances. (To be formally announced post ratification).',
    is_founder: false,
    is_placeholder: true
  }
];

export const INITIAL_DEMO_USER: UserProfile = {
  id: 'usr-student-demo',
  full_name: 'Mitesh Pipaliya',
  email: 'student.demo@nexora.org',
  college: 'BVM',
  branch: 'Electronics Engineering',
  academic_year: '1st Year',
  enrollment_number: '26EL309',
  division: '11',
  phone_number: '+91 98765 43210',
  avatar_url: '/images/team/mitesh_founder.jpg',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-10-18T10:00:00Z',
  is_admin: true
};

export const INITIAL_REGISTRATIONS: RegistrationRecord[] = [
  {
    id: 'reg-demo-01',
    competition_id: 'ZC-A7K2',
    user_id: 'usr-student-demo',
    event_slug: 'zerocode',
    event_title: 'ZeroCode',
    full_name: 'Mitesh Pipaliya',
    email: 'student.demo@nexora.org',
    phone_number: '+91 98765 43210',
    college: 'BVM',
    branch: 'Electronics Engineering',
    academic_year: '1st Year',
    enrollment_number: '26EL309',
    division: '11',
    participant_count: 1,
    registration_status: 'Confirmed',
    payment_status: 'Unpaid',
    calculated_fee: 50,
    created_at: '2026-10-15T14:32:00Z',
    updated_at: '2026-10-15T14:32:00Z'
  },
  {
    id: 'reg-demo-02',
    competition_id: 'PF-M6R2',
    user_id: 'usr-student-demo',
    event_slug: 'pathfinder',
    event_title: 'PathFinder',
    full_name: 'Mitesh Pipaliya',
    email: 'student.demo@nexora.org',
    phone_number: '+91 98765 43210',
    college: 'BVM',
    branch: 'Electronics Engineering',
    academic_year: '1st Year',
    enrollment_number: '26EL309',
    division: '11',
    team_name: 'Nexora Core Synthetics',
    team_members: ['Mitesh Pipaliya', 'Rohan Patel'],
    team_member_details: [
      { name: 'Mitesh Pipaliya', college: 'BVM', branch: 'Electronics Engineering', enrollment_number: '26EL309' },
      { name: 'Rohan Patel', college: 'BVM', branch: 'Computer Engineering', enrollment_number: '26CP112' }
    ],
    participant_count: 2,
    registration_status: 'Confirmed',
    payment_status: 'Unpaid',
    calculated_fee: 100,
    created_at: '2026-10-16T11:20:00Z',
    updated_at: '2026-10-16T11:20:00Z'
  }
];
