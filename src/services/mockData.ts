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
    status: 'Proposed',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '70 Minutes',
    team_size: 'Individual Participation',
    capacity: 80,
    registered_count: 24,
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
    id: 'evt-ctf',
    slug: 'ctf',
    title: 'CTF — Capture The Flag',
    tagline: 'THINK LIKE A HACKER. SOLVE LIKE AN ENGINEER.',
    description:
      'A cybersecurity challenge where participants solve carefully designed puzzles, investigate digital clues, and capture hidden flags across multiple specialized domains.',
    category: 'Cybersecurity & Forensics',
    difficulty: 'Intermediate to Advanced',
    status: 'Proposed',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: 'Competition duration will be announced',
    team_size: '1–2 Participants',
    capacity: 60,
    registered_count: 18,
    fee_per_participant: 50,
    banner_image: '/images/competitions/ctf.jpg',
    prizes: {
      first_place: '₹2,000 Cash Prize',
      special_rewards: 'Top 7 Participants — Exclusive Surprise Gifts'
    },
    rules: [
      'Ethical participation is mandatory. Attacks against unrelated college infrastructure or external systems are strictly prohibited and grounds for immediate disqualification.',
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
      { question: 'Will there be a live offensive attack network?', answer: 'In the proposed initial edition, challenges operate in isolated jeopardy-style sandboxes without unconstrained cross-team attacks.' },
      { question: 'Do I need advanced Linux experience?', answer: 'Basic command line familiarity and browser developer tools will solve introductory tiers; advanced tiers challenge seasoned enthusiasts.' }
    ]
  },
  {
    id: 'evt-hackathon',
    slug: 'hackathon',
    title: 'NEXORA Hackathon',
    tagline: 'FROM IDEA TO IMPACT.',
    description:
      'A collaborative innovation challenge where students form multidisciplinary teams, identify real-world problems, and develop working software or hardware prototypes.',
    category: 'Collaborative Innovation',
    difficulty: 'All Skill Levels',
    status: 'Proposed',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: 'Event duration and schedule will be announced.',
    team_size: '1–4 Members per Team',
    capacity: 120,
    registered_count: 42,
    fee_per_participant: 50,
    banner_image: '/images/competitions/hackathon.jpg',
    prizes: {
      first_place: '₹4,000 — 1st Team',
      second_place: '₹2,500 — 2nd Team',
      third_place: '₹1,000 — 3rd Team',
      special_rewards: 'Top 4 Teams — Exclusive Surprise Gifts'
    },
    rules: [
      'Teams must consist of 1 to 4 members. Interdisciplinary cross-branch teams are strongly encouraged.',
      'All code and prototype hardware must be built during the official hackathon window.',
      'Pre-existing libraries, open-source frameworks, and APIs are permitted provided they are properly cited.',
      'Every team must present a working interactive demonstration during the jury evaluation round.',
      'Final submissions require a public GitHub repository link and an executive pitch deck.'
    ],
    judging_criteria: [
      { label: 'Practical Innovation & Impact', percentage: 35, description: 'Relevance to real problems and genuine originality of the proposed approach.' },
      { label: 'Technical Execution & Prototype', percentage: 35, description: 'Quality of the working software or hardware implementation.' },
      { label: 'Viability & Scalability', percentage: 15, description: 'Potential for real-world deployment, sustainability, and cross-domain utility.' },
      { label: 'Presentation & Defense', percentage: 15, description: 'Clarity of the pitch, demonstration of features, and answers during faculty Q&A.' }
    ],
    tracks_or_format: [
      'Artificial Intelligence & Applied Machine Learning',
      'Web & Mobile Next-Gen Applications',
      'Electronics, Embedded Systems & IoT',
      'Robotics & Industrial Automation',
      'Sustainability & Green Campus Technology',
      'Open Student Innovation'
    ],
    faq: [
      { question: 'Can team members be from different branches or colleges?', answer: 'Yes! Cross-departmental and intercollege collaboration is at the core of the NEXORA ethos.' },
      { question: 'Is hardware provided on-site?', answer: 'Basic power and bench facilities are planned. Teams bringing specialized microcontrollers or sensors are supported.' }
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
    status: 'Proposed',
    registration_open: true,
    event_date: 'Proposed Schedule — Post Institutional Approval',
    duration: '2.5 Hours',
    team_size: 'Individual Participation',
    capacity: 100,
    registered_count: 31,
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
      'Note: Live competition execution will connect to an isolated, sandboxed judge service upon official contest launch. Main server does not execute untrusted code.'
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
      { question: 'Why is it named CodeRush rather than CodeChef?', answer: 'CodeChef is an independent brand. CodeRush is NEXORA’s native competitive event inspired by collegiate algorithmic competitions.' },
      { question: 'Will there be partial scoring for sub-tasks?', answer: 'Yes, medium and hard problems will include subtask test suites with progressive point allocations.' }
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
    competition_id: 'HN-M6R2',
    user_id: 'usr-student-demo',
    event_slug: 'hackathon',
    event_title: 'NEXORA Hackathon',
    full_name: 'Mitesh Pipaliya',
    email: 'student.demo@nexora.org',
    phone_number: '+91 98765 43210',
    college: 'BVM',
    branch: 'Electronics Engineering',
    academic_year: '1st Year',
    enrollment_number: '26EL309',
    division: '11',
    team_name: 'Nexora Core Synthetics',
    team_members: ['Mitesh Pipaliya', 'Rohan Patel', 'Ananya Sharma'],
    team_member_details: [
      { name: 'Mitesh Pipaliya', college: 'BVM', branch: 'Electronics Engineering', enrollment_number: '26EL309' },
      { name: 'Rohan Patel', college: 'BVM', branch: 'Computer Engineering', enrollment_number: '26CP112' },
      { name: 'Ananya Sharma', college: 'GCET', branch: 'Information Technology', enrollment_number: '26IT045' }
    ],
    participant_count: 3,
    registration_status: 'Confirmed',
    payment_status: 'Unpaid',
    calculated_fee: 150,
    created_at: '2026-10-16T11:20:00Z',
    updated_at: '2026-10-16T11:20:00Z'
  }
];
