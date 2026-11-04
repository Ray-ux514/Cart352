let sphereParticles = [];
let jobNodes = [];

let rotX = -0.12;
let rotY = 0;
let targetRotX = -0.12;
let targetRotY = 0;

let dragging = false;
let dragged = false;
let lastMouseX = 0;
let lastMouseY = 0;

let hoveredNode = null;
let selectedOccupation = "all";

const PARTICLE_COUNT = 2800;
const RADIUS = 245;

const occupations = [
  {
    id: "designer",
    name: "GRAPHIC DESIGNER",
    color: [239, 117, 57],
    lat: 28,
    lon: -125,
  },
  {
    id: "developer",
    name: "SOFTWARE DEVELOPER",
    color: [65, 146, 255],
    lat: 48,
    lon: 25,
  },
  {
    id: "nurse",
    name: "REGISTERED NURSE",
    color: [69, 206, 236],
    lat: 5,
    lon: 80,
  },
  {
    id: "teacher",
    name: "TEACHER",
    color: [248, 205, 103],
    lat: -35,
    lon: 45,
  },
  {
    id: "electrician",
    name: "ELECTRICIAN",
    color: [114, 223, 196],
    lat: -55,
    lon: -110,
  },
  {
    id: "Cheff",
    name: "CHEFF",
    color: [123, 223, 206],
    lat: 15,
    lon: 45,
  },
  {
    id: "Trainer",
    name: "TRAINER",
    color: [23, 203, 106],
    lat: 35,
    lon: 180,
  },
];

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("particle-canvas");
  pixelDensity(1);

  const goldenAngle = PI * (3 - sqrt(5));

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y = 1 - (2 * (i + 0.5)) / PARTICLE_COUNT;
    const ring = sqrt(1 - y * y);
    const angle = i * goldenAngle;

    sphereParticles.push({
      x: cos(angle) * ring * RADIUS,
      y: y * RADIUS,
      z: sin(angle) * ring * RADIUS,
      phase: random(TWO_PI),
      size: random(0.6, 1.4),
    });
  }

  for (let occupation of occupations) {
    const lat = radians(occupation.lat);
    const lon = radians(occupation.lon);

    jobNodes.push({
      ...occupation,
      x: cos(lat) * sin(lon) * RADIUS,
      y: -sin(lat) * RADIUS,
      z: cos(lat) * cos(lon) * RADIUS,
      screenX: 0,
      screenY: 0,
      depth: 0,
    });
  }

  document.getElementById("explore-btn").addEventListener("click", () => {
    window.location.href =
      "simulation.html?occupation=" + encodeURIComponent(selectedOccupation);
  });
}

function getSphereCenter() {
  // Centered on desktop and mobile
  return {
    x: width * 0.5,
    y: height * 0.49,
  };
}

function rotatePoint(x, y, z) {
  const cy = cos(rotY);
  const sy = sin(rotY);

  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;

  const cx = cos(rotX);
  const sx = sin(rotX);

  return {
    x: x1,
    y: y * cx - z1 * sx,
    z: y * sx + z1 * cx,
  };
}

function draw() {
  background(3, 4, 5);

  if (!dragging) {
    targetRotY += 0.0015;
  }

  rotX = lerp(rotX, targetRotX, 0.08);
  rotY = lerp(rotY, targetRotY, 0.08);

  const center = getSphereCenter();
  const sphereScale = min(1, width / 850, height / 760);

  const radius = RADIUS * sphereScale;

  // Outer sphere guide
  noFill();
  stroke(60, 68, 72, 35);
  strokeWeight(1);
  circle(center.x, center.y, radius * 2);

  // Draw particles with depth-based opacity
  noStroke();

  for (let p of sphereParticles) {
    const rotated = rotatePoint(p.x, p.y, p.z);

    const breathe = sin(frameCount * 0.018 + p.phase) * 1.8;

    const depth = map(rotated.z, -RADIUS, RADIUS, 0, 1);

    const alpha = 30 + depth * 140;

    fill(165, 184, 188, alpha);

    circle(
      center.x + rotated.x * sphereScale,
      center.y + rotated.y * sphereScale,
      (p.size + breathe * 0.12) * sphereScale
    );
  }

  hoveredNode = null;
  const renderedNodes = [];

  for (let node of jobNodes) {
    const rotated = rotatePoint(node.x, node.y, node.z);

    node.screenX = center.x + rotated.x * sphereScale;
    node.screenY = center.y + rotated.y * sphereScale;
    node.depth = rotated.z;

    renderedNodes.push(node);
  }

  // Draw rear nodes first, front nodes last
  renderedNodes.sort((a, b) => a.depth - b.depth);

  for (let node of renderedNodes) {
    const front = node.depth > 0;
    const alpha = front ? 220 : 85;

    // Thin connection from centre
    stroke(90, 100, 106, front ? 65 : 25);
    strokeWeight(0.7);
    line(center.x, center.y, node.screenX, node.screenY);

    const isHovered = dist(mouseX, mouseY, node.screenX, node.screenY) < 16;

    if (isHovered && !dragging && front) {
      hoveredNode = node;
    }

    const selected = selectedOccupation === node.id;

    // Outer glow
    noStroke();
    fill(
      node.color[0],
      node.color[1],
      node.color[2],
      selected || isHovered ? 65 : 25
    );
    circle(node.screenX, node.screenY, selected || isHovered ? 35 : 25);

    // Main coloured node
    fill(node.color[0], node.color[1], node.color[2], alpha);
    circle(node.screenX, node.screenY, selected ? 15 : 11);

    // Highlight
    fill(255, 255, 255, front ? 170 : 50);
    circle(node.screenX - 2, node.screenY - 2, 3);

    // Selection ring
    if (selected) {
      noFill();
      stroke(255, 255, 255, 140);
      strokeWeight(0.8);
      circle(node.screenX, node.screenY, 25);
    }
  }

  updateTooltip();
}

function updateTooltip() {
  const tooltip = document.getElementById("node-tooltip");

  if (!hoveredNode) {
    tooltip.classList.add("hidden");
    return;
  }

  tooltip.classList.remove("hidden");

  document.getElementById("tooltip-name").textContent = hoveredNode.name;

  document.getElementById("tooltip-number").textContent =
    "OCCUPATION / " +
    String(occupations.indexOf(hoveredNode) + 1).padStart(2, "0");

  tooltip.style.left = Math.min(mouseX + 20, width - 230) + "px";

  tooltip.style.top = Math.min(mouseY + 20, height - 100) + "px";
}

function mousePressed() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  dragging = true;
  dragged = false;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseDragged() {
  if (!dragging) return;

  const dx = mouseX - lastMouseX;
  const dy = mouseY - lastMouseY;

  if (abs(dx) + abs(dy) > 2) {
    dragged = true;
  }

  targetRotY += dx * 0.006;
  targetRotX += dy * 0.006;

  lastMouseX = mouseX;
  lastMouseY = mouseY;

  return false;
}

function mouseReleased() {
  if (!dragged && hoveredNode) {
    selectedOccupation = hoveredNode.id;

    document.getElementById("selected-name").textContent = hoveredNode.name;

    document.getElementById("selected-code").textContent =
      "MARKET / " + hoveredNode.id.toUpperCase();
  }

  dragging = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
