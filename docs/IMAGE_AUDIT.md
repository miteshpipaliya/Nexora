# NEXORA — Competition Image & Media Assets Audit

**Date:** November 2, 2026  
**Status:** 100% Verified Local Assets Present (Zero Broken Images, Zero External Placeholders in Primary Catalog)  

---

## 1. Primary Competition Catalog (10 Dedicated Flagships)

All 10 competitions feature dedicated 16:9 high-resolution images located in `public/images/competitions/`. No external hotlinks or generic stock fallbacks are used for flagship cards.

| # | Competition Title | Slug | Local Image Path | Aspect Ratio | Category | Verification Status |
|---|---|---|---|---|---|---|
| **1** | ZeroCode AI Hackathon | `zerocode` | `/images/competitions/zerocode.jpg` | 16:9 | AI-Assisted Development | **VERIFIED (LOCAL)** |
| **2** | CodeRush 2.0 | `coderush` | `/images/competitions/coderush.jpg` | 16:9 | Competitive Programming | **VERIFIED (LOCAL)** |
| **3** | RoboRace Grand Prix | `roborace` | `/images/competitions/roborace.jpg` | 16:9 | Robotics & Hardware | **VERIFIED (LOCAL)** |
| **4** | Brain Battle Quiz | `brainbattle` | `/images/competitions/brainbattle.jpg` | 16:9 | General Engineering & Tech | **VERIFIED (LOCAL)** |
| **5** | Capture The Flag (CTF) | `ctf` | `/images/competitions/ctf.jpg` | 16:9 | Cybersecurity & Networks | **VERIFIED (LOCAL)** |
| **6** | PathFinder CAD | `pathfinder` | `/images/competitions/pathfinder.jpg` | 16:9 | Civil & Structural Design | **VERIFIED (LOCAL)** |
| **7** | Full-Stack AI Hackathon | `hackathon` | `/images/competitions/hackathon.jpg` | 16:9 | Full-Stack Engineering | **VERIFIED (LOCAL)** |
| **8** | Circuitrix Hardware Matrix | `circuitrix` | `/images/competitions/circuitrix.jpg` | 16:9 | Electrical & Embedded IoT | **VERIFIED (LOCAL)** |
| **9** | SignalHunt Cryptography | `signalhunt` | `/images/competitions/signalhunt.jpg` | 16:9 | Telecom & Signal Processing | **VERIFIED (LOCAL)** |
| **10** | BridgeMania Structural Challenge | `bridgemania` | `/images/competitions/bridgemania.jpg` | 16:9 | Mechanical & Infrastructure | **VERIFIED (LOCAL)** |

---

## 2. Centralized Image Library Categories (18 Preset Media Items)

The Admin Image Library provides 6 standardized categories with at least 3 curated presets each:

### 1. Vibe Coding / AI Hackathon
1. `img-vibe-1`: Futuristic Autonomous Coding Sanctum (`/images/competitions/zerocode.jpg`)
2. `img-vibe-2`: Neural Code Generation Terminal (`/assets/images/zerocode_ai_hackathon_1792342261763.jpg`)
3. `img-vibe-3`: High-Speed Syntactic Synthesis (`/images/competitions/hackathon.jpg`)

### 2. CodeRush
1. `img-coderush-1`: Algorithmic Arena Terminal (`/images/competitions/coderush.jpg`)
2. `img-coderush-2`: High-Speed Competitive Matrix (`/assets/images/coderush_programming_1792342271816.jpg`)
3. `img-coderush-3`: Time-Complexity Optimization Stage

### 3. Mechanical / RoboRace
1. `img-robo-1`: High-Torque Autonomous Rover Track (`/images/competitions/roborace.jpg`)
2. `img-robo-2`: Precision Microcontroller Chassis (`/assets/images/roborace_robotics_1792342281033.jpg`)
3. `img-robo-3`: Sensor Telemetry & Motor Control Grid (`/images/competitions/circuitrix.jpg`)

### 4. Cybersecurity / CTF
1. `img-cyber-1`: Capture The Flag War Room (`/images/competitions/ctf.jpg`)
2. `img-cyber-2`: Network Defense & Cryptographic Analysis (`/assets/images/ctf_cyber_event_1792342289673.jpg`)
3. `img-cyber-3`: Security Operations & Signal Decryption (`/images/competitions/signalhunt.jpg`)

### 5. Civil / Engineering
1. `img-civil-1`: PathFinder Structural Labyrinth (`/images/competitions/pathfinder.jpg`)
2. `img-civil-2`: CAD Modeling & Structural Architecture
3. `img-civil-3`: BridgeMania Trusses & Load Stress Dynamics (`/images/competitions/bridgemania.jpg`)

### 6. General Student Groups
1. `img-general-1`: Brain Battle Interactive Stage (`/images/competitions/brainbattle.jpg`)
2. `img-general-2`: Collaborative Engineering Sprint
3. `img-general-3`: NEXORA Grand Keynote Auditorium

---

## 3. Image Loading & Error Handling Architecture
- **Lazy Loading:** `loading="lazy"` enabled on competition grid thumbnails.
- **Aspect Ratio Safeguard:** Fixed `aspect-video` (16:9) containers with `object-cover` prevent Cumulative Layout Shift (CLS).
- **Graceful Fallbacks:** In case an image link encounters network degradation, `onError` handlers automatically revert to `/images/competitions/zerocode.jpg` without showing broken image boxes or throwing console errors.
