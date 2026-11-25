const canvas = document.getElementById("workforce");
const ctx = canvas.getContext("2d");

const $ = (id) => document.getElementById(id);

const TAU = Math.PI * 2;
const BLUE = "71,159,255";
const WHITE = "240,245,250";

const MAX_PARTICLES = 2200;

let occupations = [];
let activeOccupation = null;
let activeYear = "total";

let particles = [];
let networkPairs = [];
let annualData = [];

let mode = 0;
let unit = 1;

let width = 0;
let height = 0;
let time = 0;

let mouseX = -9999;
let mouseY = -9999;

let totalOpenings = 0;
let totalSeekers = 0;

const figures = [
  {
    title: "FIG 01 / RADIAL DISTRIBUTION",
    description: "Projected labour supply and demand",
  },
  {
    title: "FIG 02 / TEMPORAL DISTRIBUTION",
    description: "Annual projected flows / 2026–2035",
  },
  {
    title: "FIG 03 / OPPORTUNITY NETWORK",
    description: "Illustrative relationships between seekers and openings",
  },
];

// ----------------------------------------
// DATA UTILITIES
// ----------------------------------------

function number(value) {
  const result = Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(result) ? Math.max(0, result) : 0;
}

function format(value) {
  return number(value).toLocaleString("en-CA");
}

function occupationName(occupation) {
  return (
    occupation.officialOccupation || occupation.name || "Unknown occupation"
  );
}

function gaussian() {
  const u = Math.max(Math.random(), 0.00001);
  const v = Math.random();

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

// ----------------------------------------
// LOAD OCCUPATION DATABASE
// ----------------------------------------

async function loadData() {
  try {
    const response = await fetch("./data/occupations.json");
    if (!response.ok) {
      throw new Error("Unable to load occupations.json");
    }

    const data = await response.json();
    const source = data.occupations || data;

    occupations = Object.entries(source).map(([key, value]) => ({
      ...value,
      key: key,
      noc: String(value.id || key),
    }));

    occupations = occupations
      .filter((item) => item && item.noc != null)
      .sort((a, b) => occupationName(a).localeCompare(occupationName(b)));

    if (!occupations.length) {
      throw new Error("No occupation records found");
    }

    const params = new URLSearchParams(location.search);

    const requested = (
      params.get("noc") ||
      params.get("job") ||
      params.get("occupation") ||
      ""
    ).toLowerCase();

    const initial =
      occupations.find((occupation) =>
        [
          occupation.key,
          occupation.name,
          occupation.officialOccupation,
          occupation.noc,
        ].some((value) => String(value || "").toLowerCase() === requested)
      ) ||
      occupations.find((occupation) => String(occupation.noc) === "52120") ||
      occupations[0];

    selectOccupation(initial);
  } catch (error) {
    $("occupation-name").textContent = "Occupation data unavailable";

    $("outlook").textContent =
      "Check occupations.json and run through a local server.";

    console.error(error);
  }
}

// ----------------------------------------
// SEARCH OCCUPATIONS
// ----------------------------------------

function showResults(query = "") {
  const term = query.trim().toLowerCase();

  const matches = occupations.filter((occupation) => {
    const text = [
      occupation.name,
      occupation.officialOccupation,
      occupation.noc,
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(term);
  });

  const results = $("results");

  results.replaceChildren();

  matches.slice(0, 80).forEach((occupation) => {
    const button = document.createElement("button");

    button.className = "result";

    button.textContent = occupationName(occupation);

    const code = document.createElement("small");

    code.textContent = `NOC ${occupation.noc}`;

    button.appendChild(code);

    button.addEventListener("click", () => {
      selectOccupation(occupation);
      results.hidden = true;
    });

    results.appendChild(button);
  });

  if (!matches.length) {
    const message = document.createElement("div");

    message.className = "result";
    message.textContent = "NO MATCHING OCCUPATIONS";

    results.appendChild(message);
  }

  results.hidden = false;
}

$("search").addEventListener("focus", () => {
  $("search").select();
  showResults("");
});

$("search").addEventListener("input", (event) => {
  showResults(event.target.value);
});

$("search").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    $("results").hidden = true;
  }

  if (event.key === "Enter") {
    event.preventDefault();

    const first = $("results").querySelector("button");

    if (first) first.click();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search")) {
    $("results").hidden = true;
  }
});

// ----------------------------------------
// OCCUPATION SELECTION
// ----------------------------------------

function selectOccupation(occupation) {
  activeOccupation = occupation;

  annualData = Object.entries(occupation.annual || {})
    .map(([year, values]) => ({
      ...values,
      year: Number(year),
    }))
    .filter(
      (entry) =>
        entry.year >= 2026 &&
        entry.year <= 2035 &&
        entry.openings != null &&
        entry.seekers != null
    )
    .sort((a, b) => a.year - b.year);

  $("search").value = occupationName(occupation);

  $("occupation-name").textContent = occupationName(occupation);

  $("noc").textContent = `NOC ${occupation.noc}`;

  $("year").replaceChildren(new Option("2026–2035", "total"));

  annualData.forEach((entry) => {
    $("year").appendChild(new Option(entry.year, entry.year));
  });

  if (
    activeYear !== "total" &&
    !annualData.some((entry) => String(entry.year) === activeYear)
  ) {
    activeYear = "total";
  }

  $("year").value = activeYear;

  const job = occupation.key || occupation.name;

  $("ai-link").href =
    "exposure.html?job=" +
    encodeURIComponent(job || occupation.noc) +
    "&noc=" +
    encodeURIComponent(occupation.noc);

  updateStatistics();
}

$("year").addEventListener("change", (event) => {
  activeYear = event.target.value;

  updateStatistics();
});

// ----------------------------------------
// STATISTICS
// ----------------------------------------

function updateStatistics() {
  if (!activeOccupation) return;

  const annual = annualData.find((entry) => String(entry.year) === activeYear);

  totalOpenings = annual
    ? number(annual.openings)
    : number(activeOccupation.projectedOpenings);

  totalSeekers = annual
    ? number(annual.seekers)
    : number(activeOccupation.projectedSeekers);

  $("openings").textContent = format(totalOpenings);
  $("seekers").textContent = format(totalSeekers);

  $("ratio").textContent =
    totalOpenings > 0 ? (totalSeekers / totalOpenings).toFixed(2) : "N/A";

  $("outlook").textContent =
    "2026–2035 OUTLOOK: " + (activeOccupation.outlook || "Not available");

  rebuildParticles();
}

// ----------------------------------------
// VISUALIZATION MODES
// ----------------------------------------

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    mode = Number(button.dataset.mode);

    document.querySelectorAll("[data-mode]").forEach((b) => {
      b.classList.toggle("active", b === button);
    });

    $("figure-number").textContent = figures[mode].title;

    $("figure-description").textContent = figures[mode].description;

    $("tooltip").hidden = true;

    rebuildParticles();
  });
});

// ----------------------------------------
// CANVAS RESIZE
// ----------------------------------------

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();

  const newWidth = Math.round(bounds.width);
  const newHeight = Math.round(bounds.height);

  if (width === newWidth && height === newHeight) {
    return;
  }

  width = newWidth;
  height = newHeight;

  const density = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = width * density;
  canvas.height = height * density;

  ctx.setTransform(density, 0, 0, density, 0, 0);
}

function geometry() {
  const mobile = window.innerWidth <= 800;

  const left = mobile ? 35 : Math.max(width * 0.34, 320);

  const right = width - (mobile ? 35 : width * 0.06);

  const cx = (left + right) / 2;

  const cy = mobile ? height * 0.49 : height * 0.47;

  const radius = Math.min(
    (right - left) * 0.42,
    height * (mobile ? 0.36 : 0.29)
  );

  return { left, right, cx, cy, radius };
}

// ----------------------------------------
// PARTICLE GENERATION
// ----------------------------------------

function createParticle(job, year = null) {
  const g = geometry();

  return {
    job,
    year,
    angle: Math.random() * TAU,
    radius: Math.random(),
    variation: Math.random(),
    gaussian: gaussian(),
    size: Math.random(),
    phase: Math.random() * TAU,
    x: g.cx + gaussian() * 15,
    y: g.cy + gaussian() * 15,
    targetX: g.cx,
    targetY: g.cy,
  };
}

function rebuildParticles() {
  const previous = particles;

  particles = [];
  networkPairs = [];

  if (!activeOccupation) return;

  const timeline = mode === 1;

  const records = timeline
    ? annualData
    : [
        {
          year: activeYear,
          openings: totalOpenings,
          seekers: totalSeekers,
        },
      ];

  const total = records.reduce(
    (sum, record) => sum + number(record.openings) + number(record.seekers),
    0
  );

  unit = Math.max(1, Math.ceil(total / MAX_PARTICLES));

  records.forEach((record) => {
    const openingCount = Math.round(number(record.openings) / unit);

    const seekerCount = Math.round(number(record.seekers) / unit);

    for (let i = 0; i < openingCount; i++) {
      particles.push(createParticle(true, Number(record.year)));
    }

    for (let i = 0; i < seekerCount; i++) {
      particles.push(createParticle(false, Number(record.year)));
    }
  });

  // Preserve positions for smooth transitions.

  particles.forEach((particle, index) => {
    if (previous[index]) {
      particle.x = previous[index].x;
      particle.y = previous[index].y;
    }
  });

  $("scale").textContent =
    `1 DOT ≈ ${format(unit)} PEOPLE OR OPENINGS / ROUNDED` +
    (timeline ? " / ALL AVAILABLE YEARS" : "");

  buildNetwork();
}

// ----------------------------------------
// ILLUSTRATIVE NETWORK
// ----------------------------------------

function buildNetwork() {
  const openings = particles.filter((p) => p.job);
  const seekers = particles.filter((p) => !p.job);

  if (!openings.length) return;

  const step = Math.max(1, Math.ceil(seekers.length / 350));

  for (let i = 0; i < seekers.length; i += step) {
    const opening = openings[Math.floor(Math.random() * openings.length)];

    networkPairs.push({
      seeker: seekers[i],
      opening,
    });
  }
}

// ----------------------------------------
// TIMELINE GEOMETRY
// ----------------------------------------

function timelineGeometry(g) {
  const top = height * 0.25;
  const bottom = height * 0.68;

  const baseline = (top + bottom) / 2;

  const spread = (bottom - top) * 0.45;

  const maximum = Math.max(
    1,
    ...annualData.flatMap((entry) => [
      number(entry.openings),
      number(entry.seekers),
    ])
  );

  const spacing = (g.right - g.left) / Math.max(annualData.length, 1);

  return {
    top,
    bottom,
    baseline,
    spread,
    maximum,
    spacing,
  };
}

// ----------------------------------------
// BACKGROUND GUIDES
// ----------------------------------------

function drawGuides(g) {
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";

  if (mode === 0 || mode === 2) {
    // Fine circular reference guides.

    [0.45, 0.75, 1.08].forEach((scale) => {
      ctx.setLineDash([1, 6]);

      ctx.beginPath();

      ctx.arc(g.cx, g.cy, g.radius * scale, 0, TAU);

      ctx.stroke();
    });

    ctx.setLineDash([]);

    // Small radial measurement marks.

    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * TAU;

      const inner = g.radius * 1.12;
      const outer = inner + (i % 6 === 0 ? 8 : 3);

      ctx.beginPath();

      ctx.moveTo(
        g.cx + Math.cos(angle) * inner,
        g.cy + Math.sin(angle) * inner
      );

      ctx.lineTo(
        g.cx + Math.cos(angle) * outer,
        g.cy + Math.sin(angle) * outer
      );

      ctx.stroke();
    }

    // Centre reference cross.

    ctx.beginPath();

    ctx.moveTo(g.cx - 5, g.cy);
    ctx.lineTo(g.cx + 5, g.cy);

    ctx.moveTo(g.cx, g.cy - 5);
    ctx.lineTo(g.cx, g.cy + 5);

    ctx.stroke();
  }

  if (mode === 1) {
    drawTimelineGuides(g);
  }
}

function drawTimelineGuides(g) {
  const t = timelineGeometry(g);

  ctx.font = "10px monospace";
  ctx.textAlign = "center";

  if (!annualData.length) {
    ctx.fillStyle = "#7b858d";

    ctx.fillText("ANNUAL DATA NOT AVAILABLE", g.cx, g.cy);

    return;
  }

  annualData.forEach((entry, index) => {
    const x = g.left + t.spacing * (index + 0.5);

    const selected = String(entry.year) === activeYear;

    ctx.strokeStyle = selected
      ? "rgba(71,159,255,0.55)"
      : "rgba(255,255,255,0.12)";

    ctx.setLineDash([1, 5]);

    ctx.beginPath();
    ctx.moveTo(x, t.top);
    ctx.lineTo(x, t.bottom);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = selected ? "#479fff" : "#7b858d";

    ctx.fillText(entry.year, x, t.bottom + 22);
  });

  ctx.strokeStyle = "rgba(255,255,255,0.2)";

  ctx.beginPath();

  ctx.moveTo(g.left, t.baseline);
  ctx.lineTo(g.right, t.baseline);

  ctx.stroke();

  ctx.textAlign = "left";

  ctx.fillStyle = "#479fff";

  ctx.fillText("PROJECTED OPENINGS", g.left, t.top - 15);

  ctx.fillStyle = "#eeeeee";

  ctx.fillText("PROJECTED SEEKERS", g.left, t.bottom + 45);

  ctx.fillStyle = "#7b858d";

  ctx.fillText(`MAX ANNUAL FLOW: ${format(t.maximum)}`, g.left, t.top - 32);
}

// ----------------------------------------
// PARTICLE POSITIONS
// ----------------------------------------

function updateParticles(g) {
  const timeline = timelineGeometry(g);

  const yearMap = new Map(
    annualData.map((entry, index) => [Number(entry.year), { entry, index }])
  );

  particles.forEach((p) => {
    // 01 / ORGANIC RADIAL DISTRIBUTION

    if (mode === 0) {
      const angle = p.angle + time * 0.018;

      const density =
        Math.sin(p.angle * 3) * 0.06 + Math.cos(p.angle * 5) * 0.035;

      let r =
        g.radius *
        (0.78 + p.gaussian * 0.11 + density + (p.job ? 0.035 : -0.025));

      // A small proportion of particles form
      // a dispersed outer cloud.

      if (p.variation > 0.94) {
        r = g.radius * (0.98 + p.radius * 0.18);
      }

      r = Math.max(g.radius * 0.42, Math.min(g.radius * 1.18, r));

      p.targetX = g.cx + Math.cos(angle) * r;
      p.targetY = g.cy + Math.sin(angle) * r;
    }

    // 02 / ANNUAL DATA DISTRIBUTION

    if (mode === 1) {
      const record = yearMap.get(p.year);

      if (record) {
        const { entry, index } = record;

        const value = p.job ? number(entry.openings) : number(entry.seekers);

        const extent = (value / timeline.maximum) * timeline.spread;

        const jitter = (p.radius - 0.5) * timeline.spacing * 0.72;

        p.targetX = g.left + timeline.spacing * (index + 0.5) + jitter;

        p.targetY =
          timeline.baseline + (p.job ? -1 : 1) * (4 + p.variation * extent);
      }
    }

    // 03 / OPPORTUNITY NETWORK

    if (mode === 2) {
      const angle = p.angle + time * 0.012;

      const r = p.job
        ? g.radius * (0.18 + p.radius * 0.4)
        : g.radius * (0.55 + p.radius * 0.47);

      p.targetX = g.cx + Math.cos(angle) * r;
      p.targetY = g.cy + Math.sin(angle) * r;
    }

    // Smooth transitions, independent of mouse.

    p.x += (p.targetX - p.x) * 0.055;
    p.y += (p.targetY - p.y) * 0.055;
  });
}

// ----------------------------------------
// NETWORK CONNECTIONS
// ----------------------------------------

function drawNetwork(g) {
  if (mode !== 2) return;

  ctx.lineWidth = 0.45;

  ctx.strokeStyle = "rgba(210,225,240,0.09)";

  ctx.beginPath();

  networkPairs.forEach(({ seeker, opening }) => {
    ctx.moveTo(seeker.x, seeker.y);
    ctx.lineTo(opening.x, opening.y);
  });

  ctx.stroke();

  ctx.strokeStyle = "rgba(71,159,255,0.13)";

  ctx.beginPath();

  particles.forEach((p, index) => {
    if (p.job && index % 5 === 0) {
      ctx.moveTo(g.cx, g.cy);
      ctx.lineTo(p.x, p.y);
    }
  });

  ctx.stroke();
}

// ----------------------------------------
// HOVER INTERACTION
// ----------------------------------------

canvas.addEventListener("pointermove", (event) => {
  const bounds = canvas.getBoundingClientRect();

  mouseX = event.clientX - bounds.left;
  mouseY = event.clientY - bounds.top;
});

canvas.addEventListener("pointerleave", () => {
  mouseX = -9999;
  mouseY = -9999;

  $("tooltip").hidden = true;
});

function drawHover() {
  let nearest = null;
  let distance = 15;

  particles.forEach((p) => {
    const d = Math.hypot(p.x - mouseX, p.y - mouseY);

    if (d < distance) {
      nearest = p;
      distance = d;
    }
  });

  const tooltip = $("tooltip");

  if (!nearest) {
    tooltip.hidden = true;
    return;
  }

  // Highlight nearby particles of the opposite
  // category without changing their positions.

  const nearby = particles
    .filter(
      (p) => p.job !== nearest.job && (mode !== 1 || p.year === nearest.year)
    )
    .map((p) => ({
      particle: p,
      distance: Math.hypot(p.x - nearest.x, p.y - nearest.y),
    }))
    .filter((item) => item.distance < 120)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  nearby.forEach(({ particle, distance }) => {
    const opacity = (1 - distance / 120) * 0.5;

    ctx.strokeStyle = `rgba(71,159,255,${opacity})`;

    ctx.lineWidth = 0.6;

    ctx.beginPath();

    ctx.moveTo(nearest.x, nearest.y);
    ctx.lineTo(particle.x, particle.y);

    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(255,255,255,0.6)";

  ctx.beginPath();
  ctx.arc(nearest.x, nearest.y, 5, 0, TAU);
  ctx.stroke();

  const category = nearest.job ? "PROJECTED OPENINGS" : "PROJECTED SEEKERS";

  const period =
    mode === 1
      ? nearest.year
      : activeYear === "total"
      ? "2026–2035"
      : activeYear;

  tooltip.textContent = `${category} / ${period} / ≈ ${format(unit)} PER DOT`;

  const bounds = canvas.getBoundingClientRect();

  tooltip.hidden = false;

  tooltip.style.left =
    Math.max(
      8,
      Math.min(
        window.innerWidth - tooltip.offsetWidth - 8,
        bounds.left + mouseX + 15
      )
    ) + "px";

  tooltip.style.top =
    Math.max(
      8,
      Math.min(
        window.innerHeight - tooltip.offsetHeight - 8,
        bounds.top + mouseY + 15
      )
    ) + "px";
}

// ----------------------------------------
// PARTICLE RENDERING
// ----------------------------------------

function drawParticles() {
  particles.forEach((p) => {
    const distance = Math.hypot(p.x - mouseX, p.y - mouseY);

    const hovered = distance < 28;

    const selectedYear =
      mode !== 1 || activeYear === "total" || String(p.year) === activeYear;

    let opacity = p.job ? 0.65 + p.size * 0.3 : 0.3 + p.size * 0.55;

    if (!selectedYear) opacity *= 0.3;
    if (hovered) opacity = 1;

    const color = p.job ? BLUE : WHITE;

    const size = p.job ? 0.85 + p.size * 0.75 : 0.55 + p.size * 0.65;

    ctx.fillStyle = `rgba(${color},${opacity})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, TAU);
    ctx.fill();
  });
}

// ----------------------------------------
// ANIMATION LOOP
// ----------------------------------------

function draw() {
  resizeCanvas();

  ctx.fillStyle = "#030405";
  ctx.fillRect(0, 0, width, height);

  time += 0.016;

  const g = geometry();

  drawGuides(g);
  updateParticles(g);
  drawNetwork(g);
  drawParticles();
  drawHover();

  requestAnimationFrame(draw);
}

// ----------------------------------------
// INITIALIZE
// ----------------------------------------

resizeCanvas();
loadData();
draw();
