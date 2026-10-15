/**
 * ResQ Command — Smart Rescue Dashboard
 * Operation: Lost Signal (Official Event Edition)
 *
 * Implements:
 * 1. Six official trekker profiles (TRK-01 to TRK-06) preserving exact data & explicitly marking unknowns.
 * 2. Rescue Teams (Alpha, Bravo, Charlie) with single-assignment locking, en-route status, simulated distance & ETA.
 * 3. Time advancement (+5 min) to simulate field travel.
 * 4. Status transitions (Missing -> Search in Progress -> Located -> Rescued) with confirmation modals.
 * 5. Transparent heuristic scoring considering uncertainty penalties for missing telemetry.
 * 6. Dynamic sector recommendation & incident command timestamped event log.
 */

// --- 1. Official Dataset: 6 Trekkers from Operation: Lost Signal ---
// Reference Time: 09:00 AM (Simulation baseline)
const INITIAL_TREKKERS = [
  {
    id: "TRK-01",
    name: "Aarav Sharma",
    sector: "Sector B-North (Ridge Trail)",
    lastPingTime: "07:15 AM",
    minutesSinceLastPing: 105, // 07:15 AM to 09:00 AM = 105 mins
    age: 28,
    elevation: "Approx. 2,450 m",
    signalQuality: "Weak (1 bar)",
    battery: 14,
    gear: "Thermal tent, emergency whistle, offline GPS",
    situation: "Minor ankle injury reported by radio; companion (Maya Patel) with him.",
    injury: "Minor ankle injury",
    injurySeverity: "Minor",
    hasCompanion: true,
    status: "Missing", // Missing | Search in Progress | Located | Rescued
    assignedTeam: null,
    // Simulated transit parameters
    simulatedDistanceKm: 4.2, // Simulated distance to sector
    isOfficialDataComplete: true
  },
  {
    id: "TRK-02",
    name: "Maya Patel",
    sector: "Sector B-North (Ridge Trail)",
    lastPingTime: "07:18 AM",
    minutesSinceLastPing: 102, // 07:18 AM to 09:00 AM = 102 mins
    age: "Not reported",
    elevation: "Not reported (Likely tandem with TRK-01)",
    signalQuality: "Not reported",
    battery: null, // Unknown
    gear: "Not reported",
    situation: "Traveling tandem with Aarav Sharma along Ridge Trail.",
    injury: "Not reported",
    injurySeverity: "Unknown",
    hasCompanion: true,
    status: "Missing",
    assignedTeam: null,
    simulatedDistanceKm: 4.2,
    isOfficialDataComplete: false
  },
  {
    id: "TRK-03",
    name: "Rohan Varma",
    sector: "Sector C-East (Gorge Creek)",
    lastPingTime: "06:40 AM",
    minutesSinceLastPing: 140, // 06:40 AM to 09:00 AM = 140 mins
    age: "Not reported",
    elevation: "Not reported",
    signalQuality: "Not reported",
    battery: null,
    gear: "Not reported",
    situation: "Last ping registered near lower gorge drainage; deep canyon echo.",
    injury: "Not reported",
    injurySeverity: "Unknown",
    hasCompanion: false,
    status: "Missing",
    assignedTeam: null,
    simulatedDistanceKm: 6.8,
    isOfficialDataComplete: false
  },
  {
    id: "TRK-04",
    name: "Ananya Sen",
    sector: "Sector A-South (Pine Basin)",
    lastPingTime: "08:05 AM",
    minutesSinceLastPing: 55, // 08:05 AM to 09:00 AM = 55 mins
    age: "Not reported",
    elevation: "Not reported",
    signalQuality: "Not reported",
    battery: null,
    gear: "Not reported",
    situation: "Transmitted short telemetry heartbeat from south basin woods.",
    injury: "Not reported",
    injurySeverity: "Unknown",
    hasCompanion: false,
    status: "Missing",
    assignedTeam: null,
    simulatedDistanceKm: 2.5,
    isOfficialDataComplete: false
  },
  {
    id: "TRK-05",
    name: "Vikram Malhotra",
    sector: "Sector D-West (Old Mine Pass)",
    lastPingTime: "05:55 AM",
    minutesSinceLastPing: 185, // 05:55 AM to 09:00 AM = 185 mins (>3 hours)
    age: "Not reported",
    elevation: "Not reported",
    signalQuality: "Not reported",
    battery: null,
    gear: "Not reported",
    situation: "Old mine pass terrain; high rockfall and scree hazard. Telemetry dormant.",
    injury: "Not reported",
    injurySeverity: "Unknown",
    hasCompanion: false,
    status: "Missing",
    assignedTeam: null,
    simulatedDistanceKm: 8.5,
    isOfficialDataComplete: false
  },
  {
    id: "TRK-06",
    name: "Dr. Priyamvada Iyer",
    sector: "Sector A-South (Pine Basin)",
    lastPingTime: "08:12 AM",
    minutesSinceLastPing: 48, // 08:12 AM to 09:00 AM = 48 mins
    age: "Not reported",
    elevation: "Not reported",
    signalQuality: "Not reported",
    battery: null,
    gear: "Not reported",
    situation: "Recent ping registered near ranger station access trail in Pine Basin.",
    injury: "Not reported",
    injurySeverity: "Unknown",
    hasCompanion: false,
    status: "Missing",
    assignedTeam: null,
    simulatedDistanceKm: 2.1,
    isOfficialDataComplete: false
  }
];

// --- 2. Rescue Teams Model ---
const INITIAL_TEAMS = [
  {
    id: "TEAM-ALPHA",
    name: "Team Alpha",
    unitType: "Alpine Search & Dog Unit",
    status: "Available", // Available | En Route | On Scene | Standby
    assignedTrekkerId: null,
    departureTime: null,
    departureSimMinutes: null,
    currentSpeedKmh: 4.0 // Simulated mountain foot speed: 4 km/h
  },
  {
    id: "TEAM-BRAVO",
    name: "Team Bravo",
    unitType: "Paramedic & Mountain Extraction",
    status: "Available",
    assignedTrekkerId: null,
    departureTime: null,
    departureSimMinutes: null,
    currentSpeedKmh: 4.5
  },
  {
    id: "TEAM-CHARLIE",
    name: "Team Charlie",
    unitType: "All-Terrain Vehicle (ATV) & Drone Recon",
    status: "Available",
    assignedTrekkerId: null,
    departureTime: null,
    departureSimMinutes: null,
    currentSpeedKmh: 12.0 // ATV speed: 12 km/h
  }
];

// --- 3. State Management ---
let trekkers = JSON.parse(JSON.stringify(INITIAL_TREKKERS));
let teams = JSON.parse(JSON.stringify(INITIAL_TEAMS));
let currentWeather = "storm";
let searchQuery = "";
let selectedSector = "ALL";
let selectedPriority = "ALL";
let selectedStatus = "ALL";
let activeSort = "scoreDesc";

// Simulation Clock: Starts at 09:00 AM (minutes = 540)
let currentSimMinutes = 540;
let eventLogs = [];

// Modal State
let pendingConfirmation = null;

// --- 4. Weather Weights & Environmental Impacts ---
const WEATHER_CONFIG = {
  storm: {
    name: "Severe Mountain Storm",
    icon: "⛈️",
    scoreWeight: 15,
    speedMultiplier: 0.6, // Ground travel slowed by 40%
    impact: "Severe gale winds (75+ km/h), sub-zero windchill, zero aerial visibility. Ground speed reduced 40%."
  },
  fog: {
    name: "Dense Freezing Fog",
    icon: "🌫️",
    scoreWeight: 10,
    speedMultiplier: 0.75,
    impact: "Visibility below 15 meters, freezing fog condensation, disorienting navigation hazard. Speed slowed 25%."
  },
  rain: {
    name: "Continuous Cold Rain",
    icon: "🌧️",
    scoreWeight: 5,
    speedMultiplier: 0.85,
    impact: "Slick trail surfaces, rising creeks, and saturated thermal gear. Speed slowed 15%."
  },
  clear: {
    name: "Clear Skies / Window",
    icon: "🌤️",
    scoreWeight: 0,
    speedMultiplier: 1.0,
    impact: "Optimal conditions; standard search parties and drone sweeps fully operational at standard speed."
  }
};

// Format Simulation Clock helper
function formatSimClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const padMins = mins < 10 ? `0${mins}` : mins;
  const padHours = displayHours < 10 ? `0${displayHours}` : displayHours;
  return `${padHours}:${padMins} ${ampm}`;
}

// Log an event to the incident log
function logEvent(category, message, details = "") {
  const timestamp = formatSimClock(currentSimMinutes);
  eventLogs.unshift({
    id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    timestamp,
    category,
    message,
    details
  });
  if (eventLogs.length > 50) eventLogs.pop();
  renderEventLog();
}

// --- 5. Heuristic Priority Scoring Engine ---
/**
 * Evaluates trekker priority using documented heuristics.
 * Incorporates an "Uncertainty Penalty" for missing/unknown data so missing info is NOT presumed safe.
 */
function evaluateTrekkerRisk(trekker, weatherKey) {
  let score = 0;
  const reasons = [];
  const tags = [];
  const telemetryWarnings = [];

  // Rescued trekkers are safe
  if (trekker.status === "Rescued") {
    return {
      score: 0,
      priorityLevel: "LOW",
      priorityClass: "badge-low",
      cardBorderClass: "priority-low",
      reasons: ["Trekker safely extracted to medical base. Active hazard mitigated."],
      tags: [{ label: "Rescued / Safe", type: "low-tag" }],
      telemetryWarnings: []
    };
  }

  // Located trekkers have reduced search urgency, focus shifts to medical/evac
  if (trekker.status === "Located") {
    score = 25;
    reasons.push("Trekker visually/verbally located. Search radius locked; extraction ongoing (+25)");
    tags.push({ label: "Located", type: "med-tag" });
  }

  // 1. Injury Factor
  if (trekker.injurySeverity === "Critical") {
    score += 45;
    reasons.push("Critical injury reported requiring urgent life-saving trauma care (+45)");
    tags.push({ label: "Critical Trauma (+45)", type: "high-tag" });
  } else if (trekker.injurySeverity === "Minor") {
    score += 20;
    reasons.push("Minor injury confirmed (ankle/mobility impaired) (+20)");
    tags.push({ label: "Reported Injury (+20)", type: "med-tag" });
  }

  // 2. Battery Factor
  if (trekker.battery !== null && trekker.battery !== undefined) {
    if (trekker.battery <= 10) {
      score += 25;
      reasons.push(`Critical battery at ${trekker.battery}%: beacon failure imminent (+25)`);
      tags.push({ label: `Battery ${trekker.battery}% (+25)`, type: "high-tag" });
      telemetryWarnings.push(`Critical Battery (${trekker.battery}%)`);
    } else if (trekker.battery <= 25) {
      score += 15;
      reasons.push(`Low battery at ${trekker.battery}% (+15)`);
      tags.push({ label: `Battery ${trekker.battery}% (+15)`, type: "med-tag" });
      telemetryWarnings.push(`Low Battery (${trekker.battery}%)`);
    } else if (trekker.battery <= 50) {
      score += 5;
      reasons.push(`Moderate battery level at ${trekker.battery}% (+5)`);
      tags.push({ label: `Battery ${trekker.battery}% (+5)`, type: "low-tag" });
    }
  }

  // 3. Signal Quality Factor
  if (trekker.signalQuality) {
    if (trekker.signalQuality.includes("None") || trekker.signalQuality.includes("Dead")) {
      score += 20;
      reasons.push("Zero signal detected — dead zone isolation (+20)");
      tags.push({ label: "Signal Lost (+20)", type: "high-tag" });
      telemetryWarnings.push("Dead Zone / Signal Lost");
    } else if (trekker.signalQuality.includes("Weak") || trekker.signalQuality.includes("Poor") || trekker.signalQuality.includes("1 bar")) {
      score += 10;
      reasons.push("Weak signal transmission (1 bar) (+10)");
      tags.push({ label: "Signal Weak (+10)", type: "med-tag" });
      telemetryWarnings.push("Weak Signal (1 bar)");
    }
  }

  // 4. Stale Telemetry Factor
  if (trekker.minutesSinceLastPing >= 180) {
    score += 30;
    reasons.push(`Telemetry severely stale (${trekker.minutesSinceLastPing}m since last ping at ${trekker.lastPingTime}) (+30)`);
    tags.push({ label: `Stale ${trekker.minutesSinceLastPing}m (+30)`, type: "high-tag" });
    telemetryWarnings.push(`Critical Telemetry Outage (${trekker.minutesSinceLastPing}m)`);
  } else if (trekker.minutesSinceLastPing >= 120) {
    score += 20;
    reasons.push(`Telemetry stale (${trekker.minutesSinceLastPing}m since ping at ${trekker.lastPingTime}) (+20)`);
    tags.push({ label: `Stale ${trekker.minutesSinceLastPing}m (+20)`, type: "high-tag" });
    telemetryWarnings.push(`Stale Telemetry (${trekker.minutesSinceLastPing}m)`);
  } else if (trekker.minutesSinceLastPing >= 60) {
    score += 10;
    reasons.push(`Telemetry aging (${trekker.minutesSinceLastPing}m since ping at ${trekker.lastPingTime}) (+10)`);
    tags.push({ label: `Ping ${trekker.minutesSinceLastPing}m ago (+10)`, type: "med-tag" });
    telemetryWarnings.push(`Ping >1h ago (${trekker.minutesSinceLastPing}m)`);
  }

  // 5. Telemetry Gaps / Uncertainty Penalty (Official requirement: Unknown data must NOT be presumed safe)
  if (!trekker.isOfficialDataComplete) {
    score += 15;
    reasons.push("Official Telemetry Gap: Battery/Medical status unconfirmed by field station (+15 uncertainty penalty)");
    tags.push({ label: "Uncertainty Penalty (+15)", type: "med-tag" });
    telemetryWarnings.push("Unconfirmed Telemetry (Official Gaps)");
  }

  // 6. Weather Penalty
  const weatherCfg = WEATHER_CONFIG[weatherKey] || WEATHER_CONFIG.storm;
  if (weatherCfg.scoreWeight > 0) {
    score += weatherCfg.scoreWeight;
    reasons.push(`Adverse conditions (${weatherCfg.name}) elevate field exposure (+${weatherCfg.scoreWeight})`);
    tags.push({ label: `Weather: ${weatherCfg.name} (+${weatherCfg.scoreWeight})`, type: "med-tag" });
  }

  // Priority Tier
  let priorityLevel = "LOW";
  let priorityClass = "badge-low";
  let cardBorderClass = "priority-low";

  if (score >= 70) {
    priorityLevel = "HIGH";
    priorityClass = "badge-high";
    cardBorderClass = "priority-high";
  } else if (score >= 40) {
    priorityLevel = "MEDIUM";
    priorityClass = "badge-medium";
    cardBorderClass = "priority-medium";
  }

  return {
    score,
    priorityLevel,
    priorityClass,
    cardBorderClass,
    reasons,
    tags,
    telemetryWarnings
  };
}

// --- 6. DOM Elements ---
const trekkersContainer = document.getElementById("trekkersContainer");
const teamsContainer = document.getElementById("teamsContainer");
const eventLogContainer = document.getElementById("eventLogContainer");
const searchInput = document.getElementById("searchInput");
const sectorFilter = document.getElementById("sectorFilter");
const priorityFilter = document.getElementById("priorityFilter");
const statusFilter = document.getElementById("statusFilter");
const sortBy = document.getElementById("sortBy");
const weatherSelect = document.getElementById("weatherSelect");
const weatherIcon = document.getElementById("weatherIcon");
const weatherImpactText = document.getElementById("weatherImpactText");
const resetBtn = document.getElementById("resetBtn");
const advanceTimeBtn = document.getElementById("advanceTimeBtn");
const simClock = document.getElementById("simClock");
const rulesBtn = document.getElementById("rulesBtn");
const rulesModal = document.getElementById("rulesModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalOkBtn = document.getElementById("modalOkBtn");
const clearLogBtn = document.getElementById("clearLogBtn");
const noResultsMessage = document.getElementById("noResultsMessage");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// Metrics & Banners
const metricTotal = document.getElementById("metricTotal");
const metricHigh = document.getElementById("metricHigh");
const metricMed = document.getElementById("metricMed");
const metricLow = document.getElementById("metricLow");
const metricDispatches = document.getElementById("metricDispatches");
const metricRescued = document.getElementById("metricRescued");
const recommendSectorTitle = document.getElementById("recommendSectorTitle");
const recommendSectorDesc = document.getElementById("recommendSectorDesc");
const sectorRiskScore = document.getElementById("sectorRiskScore");
const availableTeamsCount = document.getElementById("availableTeamsCount");

// Confirmation Modal Elements
const confirmModal = document.getElementById("confirmModal");
const confirmModalTitle = document.getElementById("confirmModalTitle");
const confirmModalMessage = document.getElementById("confirmModalMessage");
const confirmModalDetail = document.getElementById("confirmModalDetail");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");
const proceedConfirmBtn = document.getElementById("proceedConfirmBtn");
const closeConfirmModalBtn = document.getElementById("closeConfirmModalBtn");

// --- 7. Main Dashboard Refresh ---
function updateDashboard() {
  // Update Simulated Clock Display
  simClock.textContent = formatSimClock(currentSimMinutes);

  // Update Weather UI
  const weatherInfo = WEATHER_CONFIG[currentWeather];
  weatherIcon.textContent = weatherInfo.icon;
  weatherImpactText.textContent = weatherInfo.impact;

  // Evaluate All Trekkers
  const evaluatedTrekkers = trekkers.map(t => {
    const risk = evaluateTrekkerRisk(t, currentWeather);
    return { ...t, risk };
  });

  // Calculate Metrics
  const total = evaluatedTrekkers.length;
  const highCount = evaluatedTrekkers.filter(t => t.risk.priorityLevel === "HIGH" && t.status !== "Rescued").length;
  const medCount = evaluatedTrekkers.filter(t => t.risk.priorityLevel === "MEDIUM" && t.status !== "Rescued").length;
  const lowCount = evaluatedTrekkers.filter(t => t.risk.priorityLevel === "LOW" && t.status !== "Rescued").length;
  const dispatchesCount = teams.filter(tm => tm.status === "En Route" || tm.status === "On Scene").length;
  const rescuedCount = evaluatedTrekkers.filter(t => t.status === "Rescued" || t.status === "Located").length;
  const availTeams = teams.filter(tm => tm.status === "Available").length;

  metricTotal.textContent = total;
  metricHigh.textContent = highCount;
  metricMed.textContent = medCount;
  metricLow.textContent = lowCount;
  metricDispatches.textContent = dispatchesCount;
  metricRescued.textContent = rescuedCount;
  availableTeamsCount.textContent = `${availTeams} of ${teams.length} Teams Available`;

  // Compute Recommended Sector Focus
  computeRecommendedSector(evaluatedTrekkers);

  // Render Teams Bar
  renderTeams();

  // Filter & Search Trekkers
  const query = searchQuery.trim().toLowerCase();
  let filtered = evaluatedTrekkers.filter(item => {
    const matchesSearch = !query || (
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.sector.toLowerCase().includes(query) ||
      item.situation.toLowerCase().includes(query) ||
      (item.gear && item.gear.toLowerCase().includes(query))
    );

    const matchesSector = (selectedSector === "ALL") || (item.sector === selectedSector);
    const matchesPriority = (selectedPriority === "ALL") || (item.risk.priorityLevel === selectedPriority);
    const matchesStatus = (selectedStatus === "ALL") || (item.status === selectedStatus);

    return matchesSearch && matchesSector && matchesPriority && matchesStatus;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (activeSort) {
      case "scoreDesc":
        return b.risk.score - a.risk.score;
      case "scoreAsc":
        return a.risk.score - b.risk.score;
      case "staleDesc":
        return b.minutesSinceLastPing - a.minutesSinceLastPing;
      case "batteryAsc":
        return (a.battery ?? 999) - (b.battery ?? 999);
      case "nameAsc":
        return a.name.localeCompare(b.name);
      default:
        return b.risk.score - a.risk.score;
    }
  });

  // Render Trekker Cards
  renderTrekkers(filtered);
}

// --- 8. Recommended Sector Algorithm ---
function computeRecommendedSector(evaluatedList) {
  const activeTrekkers = evaluatedList.filter(t => t.status !== "Rescued");
  const sectorMap = {};

  activeTrekkers.forEach(t => {
    if (!sectorMap[t.sector]) {
      sectorMap[t.sector] = {
        name: t.sector,
        totalScore: 0,
        highPriorityCount: 0,
        trekkers: []
      };
    }
    sectorMap[t.sector].totalScore += t.risk.score;
    if (t.risk.priorityLevel === "HIGH") {
      sectorMap[t.sector].highPriorityCount += 1;
    }
    sectorMap[t.sector].trekkers.push(t.name);
  });

  let topSector = null;
  let highestWeight = -1;

  for (const key in sectorMap) {
    const s = sectorMap[key];
    const compositeWeight = s.totalScore + (s.highPriorityCount * 40);
    if (compositeWeight > highestWeight) {
      highestWeight = compositeWeight;
      topSector = s;
    }
  }

  if (topSector && topSector.totalScore > 0) {
    recommendSectorTitle.textContent = topSector.name;
    sectorRiskScore.textContent = topSector.totalScore;
    recommendSectorDesc.textContent =
      `High Risk Concentration: ${topSector.highPriorityCount} high-priority profile(s) (${topSector.trekkers.join(", ")}). Advised primary search zone for incident command.`;
  } else {
    recommendSectorTitle.textContent = "All Active Threats Controlled";
    sectorRiskScore.textContent = "0";
    recommendSectorDesc.textContent = "All missing personnel in designated sectors are located or extracted.";
  }
}

// --- 9. Render Teams Deployment Panel ---
function renderTeams() {
  teamsContainer.innerHTML = "";

  teams.forEach(team => {
    const card = document.createElement("div");
    card.className = "team-card";

    let statusBadgeClass = "badge-low";
    if (team.status === "En Route") statusBadgeClass = "badge-medium";
    if (team.status === "On Scene") statusBadgeClass = "badge-high";

    const assignedTrekker = team.assignedTrekkerId ? trekkers.find(t => t.id === team.assignedTrekkerId) : null;
    let assignmentHtml = "";

    if (assignedTrekker) {
      // Calculate simulated ETA and distance
      const weatherMult = WEATHER_CONFIG[currentWeather].speedMultiplier;
      const effectiveSpeed = team.currentSpeedKmh * weatherMult;
      const etaMins = effectiveSpeed > 0 ? Math.ceil((assignedTrekker.simulatedDistanceKm / effectiveSpeed) * 60) : 0;

      assignmentHtml = `
        <div class="team-assignment-info">
          <div class="assignment-target">
            <strong>Target:</strong> ${assignedTrekker.name} (${assignedTrekker.id})
          </div>
          <div class="assignment-meta">
            <span>📍 ${assignedTrekker.sector}</span>
            <span>🛣️ Sim. Dist: <strong>${assignedTrekker.simulatedDistanceKm.toFixed(1)} km</strong></span>
            <span>⏱️ Sim. ETA: <strong>${team.status === 'On Scene' ? 'On Scene' : etaMins + ' min'}</strong></span>
          </div>
          <div class="team-actions-row">
            ${team.status === 'Available' ? `
              <button class="btn btn-xs btn-primary mark-enroute-btn" data-team="${team.id}">
                🚀 Mark En Route
              </button>
            ` : ''}
            ${team.status === 'En Route' ? `
              <button class="btn btn-xs btn-warning mark-onscene-btn" data-team="${team.id}">
                🚩 Mark On Scene
              </button>
            ` : ''}
            <button class="btn btn-xs btn-secondary recall-team-btn" data-team="${team.id}">
              ↩️ Unassign / Recall
            </button>
          </div>
        </div>
      `;
    } else {
      assignmentHtml = `
        <div class="team-unassigned">
          <span class="text-dim">Unit is on standby at forward staging base.</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="team-card-header">
        <div>
          <h4 class="team-title">${team.name}</h4>
          <span class="team-type">${team.unitType}</span>
        </div>
        <span class="priority-badge ${statusBadgeClass}">${team.status}</span>
      </div>
      <div class="team-card-body">
        ${assignmentHtml}
      </div>
    `;

    teamsContainer.appendChild(card);
  });

  // Attach event handlers for team controls
  teamsContainer.querySelectorAll(".mark-enroute-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const teamId = btn.getAttribute("data-team");
      const team = teams.find(t => t.id === teamId);
      if (team) {
        team.status = "En Route";
        team.departureTime = formatSimClock(currentSimMinutes);
        team.departureSimMinutes = currentSimMinutes;
        const trekker = trekkers.find(t => t.id === team.assignedTrekkerId);
        if (trekker && trekker.status === "Missing") {
          trekker.status = "Search in Progress";
        }
        logEvent("DISPATCH", `${team.name} departed base En Route to ${trekker ? trekker.name : 'Target'}. Departure time: ${team.departureTime}`);
        updateDashboard();
      }
    });
  });

  teamsContainer.querySelectorAll(".mark-onscene-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const teamId = btn.getAttribute("data-team");
      const team = teams.find(t => t.id === teamId);
      if (team) {
        team.status = "On Scene";
        const trekker = trekkers.find(t => t.id === team.assignedTrekkerId);
        logEvent("ON_SCENE", `${team.name} arrived On Scene in ${trekker ? trekker.sector : 'designated sector'}. Visual search commencing.`);
        updateDashboard();
      }
    });
  });

  teamsContainer.querySelectorAll(".recall-team-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const teamId = btn.getAttribute("data-team");
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const trekker = trekkers.find(t => t.id === team.assignedTrekkerId);
        if (trekker) {
          trekker.assignedTeam = null;
          if (trekker.status === "Search in Progress") trekker.status = "Missing";
        }
        const teamName = team.name;
        team.status = "Available";
        team.assignedTrekkerId = null;
        team.departureTime = null;
        team.departureSimMinutes = null;
        logEvent("STANDBY", `${teamName} assignment cleared. Unit returned to standby availability.`);
        updateDashboard();
      }
    });
  });
}

// --- 10. Render Trekker Cards ---
function renderTrekkers(list) {
  trekkersContainer.innerHTML = "";

  if (list.length === 0) {
    noResultsMessage.classList.remove("hidden");
    return;
  }
  noResultsMessage.classList.add("hidden");

  // Get available teams for the dropdown
  const availableTeams = teams.filter(tm => tm.status === "Available");

  list.forEach(item => {
    const card = document.createElement("article");
    card.className = `trekker-card ${item.risk.cardBorderClass}`;
    card.id = `card-${item.id}`;

    // Battery bar health color
    let batteryDisplay = "Not reported (Unknown)";
    let batteryBarHtml = `<div class="battery-meter"><div class="battery-fill" style="width: 0%; background: var(--text-dim);"></div></div>`;

    if (item.battery !== null && item.battery !== undefined) {
      let batteryColorClass = "healthy";
      if (item.battery <= 15) batteryColorClass = "danger";
      else if (item.battery <= 30) batteryColorClass = "warning";
      batteryDisplay = `${item.battery}%`;
      batteryBarHtml = `
        <div class="battery-meter">
          <div class="battery-fill ${batteryColorClass}" style="width: ${item.battery}%;"></div>
        </div>
      `;
    }

    // Telemetry warning banner
    let alertBannerHtml = "";
    if (item.risk.telemetryWarnings.length > 0 && item.status !== "Rescued") {
      const isCritical = item.risk.priorityLevel === "HIGH";
      alertBannerHtml = `
        <div class="telemetry-alert-bar ${isCritical ? 'critical-alert' : ''}">
          <span>⚠️</span>
          <span><strong>TELEMETRY NOTICE:</strong> ${item.risk.telemetryWarnings.join(" • ")}</span>
        </div>
      `;
    }

    // Team Assignment Control Box
    const assignedTeamObj = item.assignedTeam ? teams.find(tm => tm.id === item.assignedTeam) : null;
    let teamControlHtml = "";

    if (assignedTeamObj) {
      // Calculate simulated ETA
      const weatherMult = WEATHER_CONFIG[currentWeather].speedMultiplier;
      const effectiveSpeed = assignedTeamObj.currentSpeedKmh * weatherMult;
      const etaMins = effectiveSpeed > 0 ? Math.ceil((item.simulatedDistanceKm / effectiveSpeed) * 60) : 0;

      teamControlHtml = `
        <div class="trekker-team-box assigned">
          <div class="team-box-header">
            <span>🛡️ Assigned Unit: <strong>${assignedTeamObj.name}</strong></span>
            <span class="badge-neutral">${assignedTeamObj.status}</span>
          </div>
          <div class="simulated-transit-line">
            <span>🛣️ Sim. Dist: <strong>${item.simulatedDistanceKm.toFixed(1)} km</strong></span>
            <span>⏱️ Sim. ETA: <strong>${assignedTeamObj.status === 'On Scene' ? 'On Scene' : etaMins + ' min'}</strong></span>
          </div>
          ${assignedTeamObj.departureTime ? `<div class="transit-sub">Departed: ${assignedTeamObj.departureTime}</div>` : ''}
        </div>
      `;
    } else if (item.status !== "Rescued") {
      teamControlHtml = `
        <div class="trekker-team-box unassigned">
          <div class="team-assign-wrap">
            <label for="assignSelect-${item.id}">Assign Unit:</label>
            <select id="assignSelect-${item.id}" class="team-assign-select" data-trekker="${item.id}">
              <option value="">-- Select Available Team --</option>
              ${availableTeams.map(tm => `<option value="${tm.id}">${tm.name} (${tm.unitType})</option>`).join("")}
            </select>
            <button class="btn btn-sm btn-primary assign-btn" data-trekker="${item.id}">Assign</button>
          </div>
        </div>
      `;
    }

    // Status Action Buttons
    let statusButtonsHtml = "";
    if (item.status === "Missing" || item.status === "Search in Progress") {
      statusButtonsHtml = `
        <div class="status-action-group">
          <button class="btn btn-sm btn-warning mark-status-btn" data-trekker="${item.id}" data-newstatus="Located">
            📍 Verify Located
          </button>
          <button class="btn btn-sm btn-primary mark-status-btn" data-trekker="${item.id}" data-newstatus="Rescued">
            🚁 Verify Rescued
          </button>
        </div>
      `;
    } else if (item.status === "Located") {
      statusButtonsHtml = `
        <div class="status-action-group">
          <button class="btn btn-sm btn-primary mark-status-btn" data-trekker="${item.id}" data-newstatus="Rescued">
            🚁 Verify Rescued
          </button>
        </div>
      `;
    } else if (item.status === "Rescued") {
      statusButtonsHtml = `
        <div class="status-action-group">
          <span class="badge-low" style="padding: 0.35rem 0.75rem; font-weight:700;">✅ Rescued &amp; Secured</span>
        </div>
      `;
    }

    // Reasons & Tags
    const reasonsHtml = item.risk.reasons.length > 0
      ? item.risk.reasons.map(r => `• ${r}`).join("<br>")
      : "Telemetry stable, no immediate distress factors detected.";

    const tagsHtml = item.risk.tags.map(t => `<span class="score-tag ${t.type}">${t.label}</span>`).join("");

    card.innerHTML = `
      <div class="card-header">
        <div class="card-identity">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span class="trekker-id-tag">${item.id}</span>
            <span class="trekker-status-pill status-${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span>
          </div>
          <h3 class="trekker-name">${item.name}</h3>
          <div class="trekker-sector">
            <span>📍</span> <span>${item.sector}</span>
          </div>
        </div>
        <div class="card-priority-badge-wrap">
          <span class="priority-badge ${item.risk.priorityClass}">${item.risk.priorityLevel} PRIORITY</span>
          <div class="score-display">Score: <strong>${item.risk.score}</strong> pts</div>
        </div>
      </div>

      ${alertBannerHtml}

      <div class="card-body">
        <div class="telemetry-grid">
          <div class="telemetry-item">
            <span class="telemetry-label">Last Ping Time</span>
            <span class="telemetry-val">
              🕒 ${item.lastPingTime}
              <small style="color:var(--text-dim); font-size:0.75rem;">(${item.minutesSinceLastPing}m ago)</small>
            </span>
          </div>

          <div class="telemetry-item">
            <span class="telemetry-label">Signal Quality</span>
            <span class="telemetry-val">
              📶 ${item.signalQuality}
            </span>
          </div>

          <div class="telemetry-item">
            <span class="telemetry-label">Elevation / Terrain</span>
            <span class="telemetry-val" style="font-size:0.8rem;">
              ⛰️ ${item.elevation || 'Not reported'}
            </span>
          </div>

          <div class="telemetry-item">
            <span class="telemetry-label">Age / Medical</span>
            <span class="telemetry-val" style="font-size:0.8rem;">
              👤 ${item.age !== 'Not reported' ? item.age + ' yrs' : 'Not reported'}
            </span>
          </div>

          <div class="telemetry-item" style="grid-column: span 2;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="telemetry-label">Battery Level</span>
              <strong style="font-size:0.85rem; font-family:var(--font-mono);">${batteryDisplay}</strong>
            </div>
            ${batteryBarHtml}
          </div>
        </div>

        <div class="injury-box ${item.injurySeverity !== 'None' && item.injurySeverity !== 'Unknown' ? 'injured' : ''}">
          <div class="injury-header">Reported Situation &amp; Gear:</div>
          <div class="injury-desc">
            ${item.situation}
          </div>
          ${item.gear ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">🎒 Gear: ${item.gear}</div>` : ''}
        </div>

        ${teamControlHtml}
        ${statusButtonsHtml}

        <div class="decision-explanation">
          <div class="explanation-title">
            <span>Decision-Support Rationale</span>
            <span style="font-family:var(--font-mono);">${item.risk.score} PTS</span>
          </div>
          <div class="explanation-text">
            ${reasonsHtml}
          </div>
          <div class="score-tags-list">
            ${tagsHtml}
          </div>
        </div>
      </div>
    `;

    trekkersContainer.appendChild(card);
  });

  // Attach Team Assignment Handler
  trekkersContainer.querySelectorAll(".assign-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const trekkerId = btn.getAttribute("data-trekker");
      const select = document.getElementById(`assignSelect-${trekkerId}`);
      const teamId = select.value;

      if (!teamId) {
        alert("Please select an available rescue unit from the dropdown.");
        return;
      }

      const team = teams.find(t => t.id === teamId);
      const trekker = trekkers.find(t => t.id === trekkerId);

      // Verify single-assignment lock
      if (team.status !== "Available") {
        alert(`Rule Enforcement: ${team.name} is already deployed to another assignment. A team cannot handle multiple active tasks.`);
        return;
      }

      team.status = "Available"; // Assigned to mission, staging at base
      team.assignedTrekkerId = trekker.id;
      trekker.assignedTeam = team.id;

      logEvent("ASSIGNMENT", `Coordinator assigned ${team.name} to missing trekker ${trekker.name} (${trekker.id}) in ${trekker.sector}.`);
      updateDashboard();
    });
  });

  // Attach Status Change Handlers with Required Confirmation
  trekkersContainer.querySelectorAll(".mark-status-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const trekkerId = btn.getAttribute("data-trekker");
      const newStatus = btn.getAttribute("data-newstatus");
      const trekker = trekkers.find(t => t.id === trekkerId);

      if (!trekker) return;

      // Setup Confirmation Modal
      pendingConfirmation = {
        trekkerId,
        newStatus
      };

      confirmModalTitle.textContent = `Confirm Field Status: ${newStatus}`;
      confirmModalMessage.textContent = `Are you sure you want to mark ${trekker.name} (${trekker.id}) as "${newStatus}"?`;
      confirmModalDetail.textContent = newStatus === "Rescued"
        ? `Marking as Rescued will release assigned unit (${trekker.assignedTeam || 'none'}) and log the extraction in the audit trail.`
        : `Marking as Located establishes visual/verbal contact and updates incident command metrics.`;

      confirmModal.classList.remove("hidden");
    });
  });
}

// --- 11. Render Mission Audit Event Log ---
function renderEventLog() {
  if (!eventLogContainer) return;
  if (eventLogs.length === 0) {
    eventLogContainer.innerHTML = `<div class="log-empty">No logged dispatch events yet. Operations will log automatically.</div>`;
    return;
  }

  eventLogContainer.innerHTML = eventLogs.map(item => `
    <div class="log-entry log-cat-${item.category.toLowerCase()}">
      <span class="log-time">[${item.timestamp}]</span>
      <span class="log-cat-badge">${item.category}</span>
      <span class="log-msg">${item.message}</span>
    </div>
  `).join("");
}

// --- 12. Advance Simulation Time (+5 Minutes) ---
function advanceSimulationTime() {
  currentSimMinutes += 5;
  const timeStr = formatSimClock(currentSimMinutes);

  // 1. Advance trekker stale ping timers
  trekkers.forEach(t => {
    t.minutesSinceLastPing += 5;
  });

  // 2. Advance traveling teams (reduce simulated distance)
  let movementLogged = false;
  teams.forEach(team => {
    if (team.status === "En Route" && team.assignedTrekkerId) {
      const trekker = trekkers.find(t => t.id === team.assignedTrekkerId);
      if (trekker && trekker.simulatedDistanceKm > 0) {
        const weatherMult = WEATHER_CONFIG[currentWeather].speedMultiplier;
        const effectiveSpeed = team.currentSpeedKmh * weatherMult;
        // Travel in 5 mins (in km): speed * (5/60)
        const distanceTraveled = (effectiveSpeed * (5 / 60));
        trekker.simulatedDistanceKm = Math.max(0, trekker.simulatedDistanceKm - distanceTraveled);

        if (trekker.simulatedDistanceKm <= 0.1) {
          trekker.simulatedDistanceKm = 0;
          team.status = "On Scene";
          logEvent("ARRIVAL", `SIMULATED ARRIVAL: ${team.name} has reached target destination in ${trekker.sector} for ${trekker.name}.`);
        }
        movementLogged = true;
      }
    }
  });

  logEvent("TIME_ADVANCE", `Simulation clock advanced 5 minutes to ${timeStr}.${movementLogged ? ' En route units progressed.' : ''}`);
  updateDashboard();
}

// --- 13. Event Listeners & Interactive Handlers ---
searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  updateDashboard();
});

sectorFilter.addEventListener("change", (e) => {
  selectedSector = e.target.value;
  updateDashboard();
});

priorityFilter.addEventListener("change", (e) => {
  selectedPriority = e.target.value;
  updateDashboard();
});

statusFilter.addEventListener("change", (e) => {
  selectedStatus = e.target.value;
  updateDashboard();
});

sortBy.addEventListener("change", (e) => {
  activeSort = e.target.value;
  updateDashboard();
});

weatherSelect.addEventListener("change", (e) => {
  currentWeather = e.target.value;
  logEvent("WEATHER_CHANGE", `Weather updated to ${WEATHER_CONFIG[currentWeather].name}. Priority scores and transit speeds recalculated.`);
  updateDashboard();
});

advanceTimeBtn.addEventListener("click", () => {
  advanceSimulationTime();
});

resetBtn.addEventListener("click", () => {
  // Restore initial state
  trekkers = JSON.parse(JSON.stringify(INITIAL_TREKKERS));
  teams = JSON.parse(JSON.stringify(INITIAL_TEAMS));
  currentWeather = "storm";
  searchQuery = "";
  selectedSector = "ALL";
  selectedPriority = "ALL";
  selectedStatus = "ALL";
  activeSort = "scoreDesc";
  currentSimMinutes = 540; // 09:00 AM

  // Reset controls
  searchInput.value = "";
  sectorFilter.value = "ALL";
  priorityFilter.value = "ALL";
  statusFilter.value = "ALL";
  sortBy.value = "scoreDesc";
  weatherSelect.value = "storm";

  eventLogs = [];
  logEvent("SYSTEM_RESET", "Incident scenario restored to initial state (09:00 AM, Severe Mountain Storm).");
  updateDashboard();
});

clearFiltersBtn.addEventListener("click", () => {
  searchQuery = "";
  selectedSector = "ALL";
  selectedPriority = "ALL";
  selectedStatus = "ALL";
  searchInput.value = "";
  sectorFilter.value = "ALL";
  priorityFilter.value = "ALL";
  statusFilter.value = "ALL";
  updateDashboard();
});

clearLogBtn.addEventListener("click", () => {
  eventLogs = [];
  renderEventLog();
});

// Rules Modal
rulesBtn.addEventListener("click", () => {
  rulesModal.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  rulesModal.classList.add("hidden");
});

modalOkBtn.addEventListener("click", () => {
  rulesModal.classList.add("hidden");
});

// Confirmation Modal Handlers
closeConfirmModalBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  pendingConfirmation = null;
});

cancelConfirmBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  pendingConfirmation = null;
});

proceedConfirmBtn.addEventListener("click", () => {
  if (pendingConfirmation) {
    const { trekkerId, newStatus } = pendingConfirmation;
    const trekker = trekkers.find(t => t.id === trekkerId);

    if (trekker) {
      trekker.status = newStatus;

      // If Rescued, release any assigned team
      if (newStatus === "Rescued" && trekker.assignedTeam) {
        const team = teams.find(t => t.id === trekker.assignedTeam);
        if (team) {
          team.status = "Available";
          team.assignedTrekkerId = null;
          team.departureTime = null;
          team.departureSimMinutes = null;
          logEvent("TEAM_RELEASED", `${team.name} released from duty following successful rescue of ${trekker.name}.`);
        }
        trekker.assignedTeam = null;
      }

      logEvent("STATUS_UPDATE", `Verified status change: ${trekker.name} (${trekker.id}) is now marked as ${newStatus}.`);
    }

    confirmModal.classList.add("hidden");
    pendingConfirmation = null;
    updateDashboard();
  }
});

window.addEventListener("click", (e) => {
  if (e.target === rulesModal) {
    rulesModal.classList.add("hidden");
  }
  if (e.target === confirmModal) {
    confirmModal.classList.add("hidden");
    pendingConfirmation = null;
  }
});

// Initial boot
logEvent("SYSTEM_INIT", "ResQ Command initialized. Monitoring 6 official profiles for Operation: Lost Signal.");
updateDashboard();
