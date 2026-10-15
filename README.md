# RESCUE OPS — Search & Rescue Decision Support System
### TECHUTSAV 1.0 "Build in the Box" Hackathon — Challenge: Operation: Lost Signal

<p align="center">
  <img src="assets/rescueops-banner.jpg" alt="RESCUE OPS — Search & Rescue Decision Support System" width="100%" style="border-radius: 8px;">
</p>

**Repository:** [https://github.com/sanskardhumal220-sys/rescueOps](https://github.com/sanskardhumal220-sys/rescueOps)  
**Live Local Execution:** Local static web dashboard (Zero external runtime dependencies, no backend, no paid/external APIs).

---

## 1. Project Overview

**RESCUE OPS** is an emergency decision-support dashboard engineered for a Search and Rescue (SAR) Incident Coordinator facing severe resource constraints. Built specifically for the **TECHUTSAV 1.0 "Build in the Box" Hackathon** under the **"Operation: Lost Signal"** challenge, the system assists coordinators in:
1. Prioritizing which missing trekkers require immediate intervention using a deterministic, documented risk scoring algorithm.
2. Identifying the primary geographic sector requiring concentrated search team deployment.
3. Managing real-time field unit availability, assigning teams under strict single-mission constraints, and tracking simulated travel progress.
4. Dynamically adapting operational risk scores and travel ETAs when weather conditions shift or simulation time elapses.
5. Providing full transparency into *why* every decision or priority level was assigned, preventing "black-box" automation.

---

## 2. Problem Statement

Following a sudden flash storm in an alpine forest reserve, six trekkers have gone missing across four distinct mountain sectors:
- **Deteriorating Environmental Conditions:** Gale winds, freezing fog, and sub-zero temperatures drastically shorten physiological survival windows.
- **Unreliable Telemetry:** High ridges and deep gorges produce severe RF attenuation, radio shadows, and cell dead zones. Location pings are delayed, intermittent, or missing.
- **Depleting Equipment:** Emergency beacons and mobile batteries are critical; once batteries die, locating lost personnel becomes exponentially harder.
- **Severe Resource Constraints:** The rescue station commands only three field response units (Alpine Search, Paramedic Extraction, and ATV/Drone Recon), with limited daylight and medical supplies.
- **The Information Dilemma:** In real-world emergency triage, **missing information must never be assumed as safety**. A system must balance verified physiological trauma against the uncertainty of unconfirmed telemetry.

---

## 3. Proposed Solution

RESCUE OPS implements an in-browser decision-support platform built on plain **HTML5, CSS3, and vanilla ES6+ JavaScript**:
- **Deterministic Heuristic Triage:** Evaluates each missing person across five weighted survival dimensions: reported medical trauma, battery depletion, signal reception, telemetry staleness, and an explicit **Uncertainty Penalty** for unconfirmed data.
- **Clustered Sector Priority Engine:** Aggregates risk points and counts of critical personnel per mountain sector to recommend the single most urgent dispatch zone.
- **Resource Management & Single-Task Lock:** Prevents field units from handling multiple active missions simultaneously, tracking status transitions from `Available` &rarr; `En Route` &rarr; `On Scene`.
- **Dynamic Environmental & Temporal Simulation:** Evaluates the cascading effects of active weather (Severe Storm, Freezing Fog, Rain, Clear Skies) on risk scores and travel speeds, coupled with a `+5 Min Travel` stepper.
- **Audited Workflow Protection:** Requires explicit coordinator confirmation before marking individuals as `Located` or `Rescued`, automatically releasing field teams upon confirmed extraction, and recording every operational action in a timestamped audit log.

---

## 4. Key Features

| Category | Implemented Feature | Source Code Reference |
| :--- | :--- | :--- |
| **Field Registry** | Official 6-trekker registry displaying ID, Name, Sector, Last Ping, Battery Bar, Signal, Elevation, Age, and Medical Status. | `INITIAL_TREKKERS` in `script.js` |
| **Heuristic Scoring** | Transparent 0–100+ point triage calculation categorizing personnel into **HIGH** ($\ge 70$), **MEDIUM** ($40-69$), or **LOW** ($< 40$) priority. | `evaluateTrekkerRisk()` in `script.js` |
| **Decision Explanations** | Every card itemizes point additions (e.g. `Critical Battery at 14% (+15)`, `Uncertainty Penalty (+15)`). | Card `.decision-explanation` in `script.js` |
| **Sector Recommendation** | Algorithmic focus banner identifying the primary sector needing immediate attention based on cumulative risk density. | `computeRecommendedSector()` in `script.js` |
| **Unit Management** | Manages **Team Alpha**, **Team Bravo**, and **Team Charlie** with single-assignment locking. | `INITIAL_TEAMS` & `renderTeams()` in `script.js` |
| **Travel Simulation** | Simulates transit distance (`km`) and dynamic ETA based on team speed and weather multipliers. | `renderTeams()` & `advanceSimulationTime()` in `script.js` |
| **Time Stepper** | `+5 Min Travel` advances simulation clock, ages telemetry staleness, advances traveling units, and logs arrivals. | `advanceSimulationTime()` in `script.js` |
| **Weather Simulator** | Toggles between 4 conditions, updating risk points, warning banners, and ground speed multipliers in real time. | `WEATHER_CONFIG` in `script.js` |
| **Status Safeguards** | Modals prevent accidental status changes to `Located` or `Rescued`, auto-releasing assigned units on rescue. | `confirmModal` in `index.html` & `script.js` |
| **Search & Filters** | Real-time text search, sector filter, priority filter, status filter, and multi-factor sorting. | Event listeners in `script.js` |
| **Incident Audit Log** | Timestamped chronological log recording dispatches, time advances, arrivals, and weather shifts. | `logEvent()` & `renderEventLog()` in `script.js` |
| **Scenario Reset** | Restores initial 09:00 AM baseline, storm weather, trekker states, and team availability in one click. | `resetBtn` listener in `script.js` |

---

## 5. System Architecture and Design Rationale

### Architectural Overview
```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESCUE OPS ARCHITECTURE                         │
│                                                                        │
│   ┌───────────────────────────┐      ┌──────────────────────────────┐  │
│   │   index.html (Semantic)   │      │   style.css (Design System)  │  │
│   │  - Header & SVG Wordmark  │      │  - Light theme palette       │  │
│   │  - Metric Counters        │      │  - Card elevations & borders │  │
│   │  - Focus Recommendation   │      │  - Responsive grid & flexbox │  │
│   │  - Registry & Modals      │      │  - Priority triage colors    │  │
│   └─────────────┬─────────────┘      └──────────────┬───────────────┘  │
│                 │                                   │                  │
│                 ▼                                   ▼                  │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                      script.js (Core Engine)                    │  │
│   │  ┌───────────────────────┐       ┌───────────────────────────┐  │  │
│   │  │   State Model         │       │   Evaluation Engine       │  │  │
│   │  │  - trekkers[]         │◄─────►│  - evaluateTrekkerRisk()  │  │  │
│   │  │  - teams[]            │       │  - computeSector()        │  │  │
│   │  │  - currentWeather     │       │  - advanceSimulation()    │  │  │
│   │  │  - currentSimMinutes  │       │  - renderTrekkers()       │  │  │
│   │  └───────────────────────┘       └───────────────────────────┘  │  │
│   │                 ▲                               ▲               │  │
│   │                 │                               │               │  │
│   │                 ▼                               ▼               │  │
│   │     Event Handlers & Filters         Incident Audit Log         │  │
│   └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Design Rationale:
1. **Zero External Runtime Dependencies:** In an emergency or hackathon sandbox, internet access may be restricted. Plain HTML5, CSS, and vanilla JavaScript ensure instant local startup without `npm install`, Node runtimes, CDN link failures, or external API latency.
2. **Deterministic Heuristic Rules over Opaque AI:** Triage coordinators cannot rely on stochastic machine learning predictions when lives are at risk. Every point in the calculation is explainable and verifiable.
3. **Single Dashboard Ergonomics:** Emergency coordinators need situational awareness at a glance. Splitting operations across multiple views increases cognitive load; an integrated single-page interface groups sector focus, team status, registry cards, and audit logs onto one responsive screen.
4. **Light Theme High-Contrast Design System:** Optimized for field command monitors under variable daylight, utilizing the palette specified in the guidelines:
   - Primary Background: `#F8FAFC` | Surface Cards: `#FFFFFF`
   - Primary Action Blue: `#2563EB` | Operational Teal: `#0D9488`
   - High Contrast Slate Text: `#1E293B` | Borders: `#E2E8F0`
   - Triage Signals: Red `#DC2626` (Critical), Amber `#D97706` (Warning), Green `#16A34A` (Safe).

---

## 6. Risk Scoring and Decision-Making Methodology

### Mathematical Risk Formulation
For any given trekker $i$ under weather condition $W$, the Rescue Priority Score is computed as:
$$\text{Score}(i, W) = S_{\text{injury}}(i) + S_{\text{battery}}(i) + S_{\text{signal}}(i) + S_{\text{stale}}(i) + S_{\text{uncertainty}}(i) + S_{\text{weather}}(W)$$

*(Note: If a trekker's status is `Rescued`, their score is automatically set to `0` / Safe).*

### Scoring Weight Breakdown

| Factor | Evaluated Condition | Points | Rationale |
| :--- | :--- | :---: | :--- |
| **Reported Injury** | Critical Trauma<br>Minor / Impaired (e.g. Aarav's ankle)<br>No injury reported / Unknown | **+45**<br>**+20**<br>+0 | Direct threat to human physiology and field survivability. |
| **Battery Depletion** | $\le 10\%$ Battery<br>$11\% - 25\%$ Battery (Aarav at 14%)<br>$26\% - 50\%$ Battery<br>Unreported / Unknown | **+25**<br>**+15**<br>**+5**<br>+0 | Imminent failure of transponder beacon, flashlight, and phone. |
| **Signal Quality** | Dead Zone / Lost<br>Weak / Poor (1 bar)<br>Unreported / Unknown | **+20**<br>**+10**<br>+0 | Inability to establish voice verification or transmit coordinates. |
| **Telemetry Staleness** | Ping $> 180$ mins ago (Vikram Malhotra: 05:55 AM)<br>Ping $120 - 180$ mins ago (Rohan Varma: 06:40 AM)<br>Ping $60 - 120$ mins ago (Aarav, Maya)<br>Ping $< 60$ mins ago (Ananya, Priyamvada) | **+30**<br>**+20**<br>**+10**<br>+0 | Search radius expands quadratically over elapsed travel time. |
| **Uncertainty Penalty** | Profiles with unconfirmed telemetry (Maya, Rohan, Ananya, Vikram, Priyamvada) | **+15** | **Precautionary Safety Principle:** Lack of data must never be treated as proof of safety. |
| **Weather Severity** | Severe Mountain Storm<br>Dense Freezing Fog<br>Continuous Cold Rain<br>Clear Skies | **+15**<br>**+10**<br>**+5**<br>+0 | Ambient environmental threat accelerates hypothermia and grounds airborne sweeps. |

### Classification Tiers:
- 🔴 **HIGH Priority ($\ge 70$ pts):** Immediate emergency team dispatch advised.
- 🟡 **MEDIUM Priority ($40 - 69$ pts):** Elevated danger, drone recon, or satellite relay check.
- 🟢 **LOW Priority ($< 40$ pts):** Monitored check-ins or safe shelter.

### Sector Recommendation Formula:
Sectors are evaluated using a composite vulnerability weight:
$$\text{Sector Weight} = \sum_{\text{trekkers}} \text{Score} + (\text{Count}_{\text{HIGH}} \times 40)$$
The sector with the highest composite weight is automatically presented in the primary recommendation banner.

---

## 7. Setup and Local Execution Instructions

### Prerequisites:
- Any standard web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).
- No Node.js build steps, no package managers, and no database configuration required.

### Step-by-Step Instructions:
1. **Clone or Download Repository:**
   ```bash
   git clone https://github.com/sanskardhumal220-sys/rescueOps.git
   cd rescueOps
   ```
2. **Run Locally:**
   - **Method A (Direct File Execution):** Double-click [index.html](file:///e:/build%20in%20the%20box/index.html) to open directly in your web browser.
   - **Method B (Local Static Web Server):**
     ```bash
     python -m http.server 5500
     ```
     Open `http://localhost:5500` in your web browser.

---

## 8. Assumptions, Sample Data, and Simulation Parameters

### Official Trekker Profiles (Preserved from Challenge Data)
All six profiles preserve official event parameters. Incomplete information is explicitly rendered as **"Not reported (Unknown)"** and is never fabricated:

| ID | Name | Sector | Last Ping | Verified Elevation | Verified Signal | Verified Battery | Verified Age | Reported Situation & Gear |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TRK-01** | **Aarav Sharma** | Sector B-North (Ridge Trail) | 07:15 AM | ~2,450 m | Weak (1 bar) | 14% | 28 | Minor ankle injury reported; companion with him. Gear: Thermal tent, emergency whistle, offline GPS. |
| **TRK-02** | **Maya Patel** | Sector B-North (Ridge Trail) | 07:18 AM | *Not reported* | *Not reported* | *Not reported* | *Not reported* | Traveling tandem with Aarav Sharma along Ridge Trail. |
| **TRK-03** | **Rohan Varma** | Sector C-East (Gorge Creek) | 06:40 AM | *Not reported* | *Not reported* | *Not reported* | *Not reported* | Last ping registered near lower gorge drainage; deep canyon echo. |
| **TRK-04** | **Ananya Sen** | Sector A-South (Pine Basin) | 08:05 AM | *Not reported* | *Not reported* | *Not reported* | *Not reported* | Transmitted short telemetry heartbeat from south basin woods. |
| **TRK-05** | **Vikram Malhotra** | Sector D-West (Old Mine Pass) | 05:55 AM | *Not reported* | *Not reported* | *Not reported* | *Not reported* | Old mine pass terrain; high rockfall and scree hazard. Telemetry dormant. |
| **TRK-06** | **Dr. Priyamvada Iyer** | Sector A-South (Pine Basin) | 08:12 AM | *Not reported* | *Not reported* | *Not reported* | *Not reported* | Recent ping near ranger station access trail in Pine Basin. |

### Simulated Parameters (Explicitly Distinguished from Real Data)
1. **Simulation Mission Clock:** Initialized at `09:00 AM` (minutes = 540) to serve as a baseline for the event timestamps (05:55 AM to 08:12 AM).
2. **Rescue Units:**
   - **Team Alpha:** Alpine Search & Dog Unit (Base foot speed: 4.0 km/h)
   - **Team Bravo:** Paramedic & Mountain Extraction (Base foot speed: 4.5 km/h)
   - **Team Charlie:** ATV & Drone Recon Unit (Base speed: 12.0 km/h)
3. **Simulated Transit Distances:** Sectors have modeled travel distances from the forward operating base (Sector A: ~2.1–2.5 km, Sector B: ~4.2 km, Sector C: ~6.8 km, Sector D: ~8.5 km). These are **simulated decision-support approximations**, not real GPS survey coordinates.
4. **Weather Speed Penalties:** Severe Storm (travel speed $\times 0.60$), Freezing Fog ($\times 0.75$), Cold Rain ($\times 0.85$), Clear Skies ($\times 1.00$).

---

## 9. Known Limitations and Edge Cases

1. **In-Memory Browser Persistence:** All simulated state (assignments, time advances, and event logs) lives in browser memory. Reloading the page or closing the tab resets the simulation to initial conditions (by design for quick hackathon demonstrations).
2. **Simplified Linear Transit Model:** Team travel calculations assume average radial transit speeds toward sector waypoints. Real-world alpine navigation involves elevation gradients, switchbacks, and localized topography barriers.
3. **Discrete 5-Minute Time Stepping:** The simulation advances in discrete 5-minute increments via the manual stepper button rather than a real-time continuous background tick, ensuring coordinators have full control during evaluations.
4. **Browser Icon Caching:** When updating custom favicon assets, certain browsers may cache old tab icons until a hard reload (`Ctrl + F5`) is executed.
5. **Decision Support Disclaimer:** This system generates automated priority recommendations based on deterministic heuristics. It is intended to assist human incident coordinators and does not replace certified incident command judgment.
