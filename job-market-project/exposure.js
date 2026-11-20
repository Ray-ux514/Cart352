/* =========================================
   01. OCCUPATION DATA
========================================= */

// Demonstration values only.
// Replace with documented research before submission.

const occupations = {
  designer: {
    name: "Graphic designer",
    shares: [45, 35, 20],
  },

  developer: {
    name: "Software developer",
    shares: [40, 45, 15],
  },

  nurse: {
    name: "Registered nurse",
    shares: [10, 30, 60],
  },

  teacher: {
    name: "Teacher",
    shares: [15, 40, 45],
  },

  electrician: {
    name: "Electrician",
    shares: [5, 20, 75],
  },

  chef: {
    name: "Chef",
    shares: [10, 20, 70],
  },
};

/* =========================================
   02. COLOURS AND DATA CATEGORIES
========================================= */

const palette = [
  "#479fff", // Automation potential
  "#e6af69", // AI-assisted tasks
  "#ffffff", // Human-led tasks
];

const labels = ["Automation potential", "AI-assisted tasks", "Human-led tasks"];

/* =========================================
   03. SELECTED OCCUPATION
========================================= */

// Retrieve the selected occupation from the URL.

const params = new URLSearchParams(location.search);

let key = (
  params.get("job") ||
  params.get("occupation") ||
  "designer"
).toLowerCase();

// Support the previous spelling of chef.

if (key === "cheff") {
  key = "chef";
}

// Default to graphic designer if the occupation is invalid.

if (!occupations[key]) {
  key =
    Object.keys(occupations).find(
      (k) => occupations[k].name.toLowerCase() === key
    ) || "designer";
}

/* =========================================
   04. GLOBAL VARIABLES
========================================= */

let agents = [];
let stars = [];
let scaleSize;

/* =========================================
   05. SETUP
========================================= */

function setup() {
  // Create the 3D canvas.

  let c = createCanvas(windowWidth, windowHeight, WEBGL);

  c.parent("scene");

  pixelDensity(1);

  // Populate the occupation dropdown.

  const select = document.getElementById("occupation");

  Object.entries(occupations).forEach(([k, o]) => {
    select.add(new Option(o.name, k));
  });

  select.value = key;

  // Update the visualization when an occupation is selected.

  select.addEventListener("change", () => {
    key = select.value;

    updateProfile();
  });

  // Generate 100 data particles.

  for (let i = 0; i < 100; i++) {
    agents.push(new Agent(i));
  }

  // Generate background stars.

  for (let i = 0; i < 220; i++) {
    stars.push(
      createVector(random(-1100, 1100), random(-850, 850), random(-800, 800))
    );
  }

  // Initialize the occupation data.

  updateProfile();
}

/* =========================================
   06. UPDATE OCCUPATION PROFILE
========================================= */

function updateProfile() {
  const o = occupations[key];

  // Update the occupation title.

  document.getElementById("title").textContent = o.name;

  // Display the AI exposure percentages.

  document.getElementById("stats").innerHTML = o.shares
    .map(
      (v, i) => `
            <div class="stat">
                <b style="color:${palette[i]}">
                    ${v}%
                </b>
                ${labels[i]}
            </div>
        `
    )
    .join("");

  // Preserve the occupation when returning to the simulation.

  document.getElementById("back").href =
    "simulation.html?job=" + encodeURIComponent(key);

  // Assign each particle to an AI exposure category.

  agents.forEach((a, i) => {
    a.group = i < o.shares[0] ? 0 : i < o.shares[0] + o.shares[1] ? 1 : 2;
  });
}

/* =========================================
   07. DRAW LOOP
========================================= */

function draw() {
  background(5, 5, 7);

  // Enable camera rotation and zoom.

  if (mouseY > 0 && mouseY < height && !mouseIsOverControls()) {
    orbitControl(1, 1, 0.8);
  }

  // Scale the visualization according to screen size.

  scaleSize = min(width, height) / 850;

  push();

  scale(scaleSize);

  /* -----------------------------------------
       BACKGROUND STARS
    ----------------------------------------- */

  stroke(130, 140, 160, 100);

  strokeWeight(1.3);

  for (const s of stars) {
    point(s.x, s.y, s.z);
  }

  /* -----------------------------------------
       ROTATING WIREFRAME CUBES
    ----------------------------------------- */

  rotateY(frameCount * 0.002);

  noFill();

  stroke(65, 70, 85, 170);

  strokeWeight(1);

  // Outer cube.

  box(440);

  // Inner cube.

  push();

  scale(0.72);

  box(440);

  pop();

  /* -----------------------------------------
       CENTRAL GEOMETRIC STRUCTURE
    ----------------------------------------- */

  push();

  rotateY(frameCount * 0.003);

  rotateX(0.3);

  stroke(145, 150, 165, 180);

  // Vertices of the central octahedron.

  const v = [
    [0, -95, 0],
    [0, 95, 0],
    [95, 0, 0],
    [0, 0, 95],
    [-95, 0, 0],
    [0, 0, -95],
  ];

  // Connect the vertices with lines.

  for (let i = 2; i < 6; i++) {
    line(...v[0], ...v[i]);

    line(...v[1], ...v[i]);

    line(...v[i], ...v[i === 5 ? 2 : i + 1]);
  }

  pop();

  /* -----------------------------------------
       UPDATE AND DISPLAY PARTICLES
    ----------------------------------------- */

  for (const a of agents) {
    a.step();
  }

  for (const a of agents) {
    a.show();
  }

  pop();
}

/* =========================================
   08. INTERACTION CONTROLS
========================================= */

// Prevent camera interaction when hovering over
// the dropdown or navigation links.

function mouseIsOverControls() {
  return document.querySelector("select:hover, a:hover") !== null;
}

/* =========================================
   09. PARTICLE CLASS
========================================= */

class Agent {
  constructor(i) {
    this.pos = p5.Vector.random3D().mult(random(130, 200));

    this.vel = p5.Vector.random3D();

    this.group = 0;

    this.phase = random(TWO_PI);
  }

  step() {
    // Determine the position of the particle's group.

    const angle = (this.group * TWO_PI) / 3 + frameCount * 0.004;

    // Create a continuously moving attraction point.

    const target = createVector(
      cos(angle) * 145,

      sin(this.phase + frameCount * 0.008) * 65,

      sin(angle) * 145
    );

    // Attraction force towards the target.

    const force = p5.Vector.sub(target, this.pos).mult(0.0015);

    // Prevent particles from overlapping.

    for (const b of agents) {
      if (b === this) continue;

      const d = p5.Vector.sub(this.pos, b.pos);

      const m = d.mag();

      if (m > 0 && m < 22) {
        force.add(d.mult(((22 - m) * 0.009) / m));
      }
    }

    /* -----------------------------------------
           RANDOM MOVEMENT
        ----------------------------------------- */

    // Introduce subtle unpredictable behaviour.

    force.add(p5.Vector.random3D().mult(0.045));

    this.vel.add(force).mult(0.97).limit(2.5);

    this.pos.add(this.vel);
  }

  show() {
    push();

    translate(this.pos.x, this.pos.y, this.pos.z);

    // Retrieve the colour of the particle's category.

    const c = color(palette[this.group]);

    noFill();

    // Outer glow.

    stroke(red(c), green(c), blue(c), 25);

    strokeWeight(12);

    point(0, 0, 0);

    // Inner particle.

    stroke(c);

    strokeWeight(4);

    point(0, 0, 0);

    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
