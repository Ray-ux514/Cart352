let data,
  agents = [],
  nodes = [],
  active,
  year = "total";
const fmt = (n) => (n == null ? "N/A" : n.toLocaleString());
function preload() {
  data = loadJSON("data/occupations.json");
}
function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.parent("simulation-canvas");
  pixelDensity(1);
  let input = document.querySelector("#search"),
    results = document.querySelector("#results"),
    select = document.querySelector("#year");
  for (let y = 2026; y <= 2035; y++) select.add(new Option(y, y));
  select.onchange = () => {
    year = select.value;
    rebuild();
  };
  input.oninput = () => {
    let q = input.value.trim().toLowerCase();
    results.replaceChildren();
    let matches = Object.values(data).filter((d) =>
      [d.name, d.nameFr, d.id, ...d.aliases].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
    for (let d of matches) {
      let b = document.createElement("button");
      b.textContent = d.name + " / " + d.id;
      b.onclick = () => {
        choose(d.id);
        results.hidden = true;
      };
      results.append(b);
    }
    if (!matches.length) results.textContent = "No matching occupation";
    results.hidden = false;
  };
  input.onfocus = () => input.oninput();
  input.onkeydown = (e) => {
    if (e.key === "Escape") results.hidden = true;
    if (e.key === "Enter") results.querySelector("button")?.click();
  };
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".search")) results.hidden = true;
  });
  let id = new URLSearchParams(location.search).get("occupation");
  let legacy = {
    all: "00000",
    designer: "52120",
    developer: "21232",
    nurse: "31301",
    teacher: "41220",
    electrician: "72200",
    chef: "62200",
    Cheff: "62200",
  };
  choose(data[id] ? id : legacy[id] || "00000");
}
function choose(id) {
  active = data[id];
  document.querySelector("#ai-link").href =
    "exposure.html?occupation=" + encodeURIComponent(id);
  document.querySelector("#search").value = active.name;
  history.replaceState(null, "", "?occupation=" + id);
  rebuild();
}
function rebuild() {
  let a =
    year === "total"
      ? { openings: active.projectedOpenings, seekers: active.projectedSeekers }
      : active.annual[year];
  let o = a.openings,
    s = a.seekers;
  document.querySelector("#occupation-name").textContent =
    active.name.toUpperCase();
  document.querySelector("#counts").textContent =
    fmt(o) + " OPENINGS / " + fmt(s) + " SEEKERS";
  document.querySelector("#ratio").textContent =
    o > 0 && s != null
      ? (s / o).toFixed(2) + " SEEKERS PER OPENING"
      : "RATIO UNAVAILABLE";
  document.querySelector("#outlook").textContent =
    "2026–2035 OUTLOOK: " + active.outlook;
  agents = [];
  nodes = [];
  if (o == null || s == null || o < 0 || s < 0) {
    document.querySelector("#scale").textContent =
      "Particle data unavailable or negative net flow";
    return;
  }
  let unit = Math.max(1, Math.ceil(Math.max(o, s) / 400));
  let count = (v) => (v === 0 ? 0 : Math.max(1, Math.round(v / unit)));
  document.querySelector("#scale").textContent =
    "1 DOT ≈ " + fmt(unit) + " PEOPLE OR OPENINGS / ROUNDED";
  for (let i = 0; i < count(o); i++) {
    let a = i * 2.39996,
      r = sqrt((i + 0.5) / count(o)) * 0.85;
    nodes.push({ x: cos(a) * r, y: sin(a) * r });
  }
  for (let i = 0; i < count(s); i++)
    agents.push({ x: random(-1, 1), y: random(-1, 1), vx: 0, vy: 0 });
}
function draw() {
  background(3, 4, 5);
  let cx = width * (width < 800 ? 0.5 : 0.62),
    cy = height * (width < 800 ? 0.45 : 0.5),
    r = min(width * 0.32, height * 0.3);
  noFill();
  stroke(60, 68, 72, 55);
  circle(cx, cy, r * 2);
  let loads = nodes.map(() => 0);
  for (let a of agents) {
    let best = null,
      bi = -1,
      d = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i],
        v = (a.x - n.x) ** 2 + (a.y - n.y) ** 2 + loads[i] * 0.08;
      if (v < d) {
        d = v;
        best = n;
        bi = i;
      }
    }
    let fx = 0,
      fy = 0;
    if (best) {
      loads[bi]++;
      fx = (best.x - a.x) * 0.002;
      fy = (best.y - a.y) * 0.002;
    }
    for (let b of agents) {
      if (a === b) continue;
      let dx = a.x - b.x,
        dy = a.y - b.y,
        q = dx * dx + dy * dy;
      if (q > 0 && q < 0.004) {
        fx += (dx * 0.000025) / (q + 0.001);
        fy += (dy * 0.000025) / (q + 0.001);
      }
    }
    let dx = (mouseX - cx) / r - a.x,
      dy = (mouseY - cy) / r - a.y,
      q = dx * dx + dy * dy;
    if (q < 0.15) {
      let sign =
        mouseIsPressed && document.activeElement?.tagName !== "INPUT" ? 1 : -1;
      fx += (dx * 0.0015 * sign) / (q + 0.03);
      fy += (dy * 0.0015 * sign) / (q + 0.03);
    }
    a.vx = (a.vx + fx + random(-0.0003, 0.0003)) * 0.92;
    a.vy = (a.vy + fy + random(-0.0003, 0.0003)) * 0.92;
    a.x = constrain(a.x + a.vx, -1.2, 1.2);
    a.y = constrain(a.y + a.vy, -1.2, 1.2);
  }
  noStroke();
  for (let n of nodes) {
    fill(71, 159, 255, 35);
    circle(cx + n.x * r, cy + n.y * r, 12);
    fill(71, 159, 255, 210);
    circle(cx + n.x * r, cy + n.y * r, 4);
  }
  for (let a of agents) {
    fill(220, 235, 235, 180);
    circle(cx + a.x * r, cy + a.y * r, 2.5);
  }
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
