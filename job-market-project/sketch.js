let agents = [];
let opportunities = [];
let selectedOccupation = "all";

const occupationSettings = {
  all: {
    name: "All Occupations",
    agents: 110,
    jobs: 7,
    description:
      "Explore a simulated network of people searching for employment opportunities.",
  },
  designer: {
    name: "Graphic Designer",
    agents: 100,
    jobs: 3,
    description:
      "Explore how competition and opportunity can be visualized within creative professions.",
  },
  developer: {
    name: "Software Developer",
    agents: 120,
    jobs: 6,
    description:
      "Explore the relationship between technological change, workers, and employment opportunities.",
  },
  nurse: {
    name: "Registered Nurse",
    agents: 75,
    jobs: 9,
    description:
      "Explore a simulated labour market with more available opportunities.",
  },
  teacher: {
    name: "Teacher",
    agents: 85,
    jobs: 6,
    description:
      "Explore the movement of job seekers toward available teaching positions.",
  },
  electrician: {
    name: "Electrician",
    agents: 65,
    jobs: 8,
    description:
      "Explore how skilled-trade opportunities influence the movement of job seekers.",
  },
};

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("particle-canvas");
  pixelDensity(1);

  createMarket("all");

  document.getElementById("occupation").addEventListener("change", (e) => {
    selectedOccupation = e.target.value;
    createMarket(selectedOccupation);
  });

  document.getElementById("explore-btn").addEventListener("click", () => {
    const data = occupationSettings[selectedOccupation];
    document.getElementById("panel-title").textContent = data.name;
    document.getElementById("panel-description").textContent = data.description;
    document.getElementById("info-panel").classList.remove("hidden");
  });

  document.getElementById("close-panel").addEventListener("click", () => {
    document.getElementById("info-panel").classList.add("hidden");
  });
}

function createMarket(occupation) {
  agents = [];
  opportunities = [];

  const settings = occupationSettings[occupation];

  for (let i = 0; i < settings.jobs; i++) {
    opportunities.push(new Opportunity());
  }

  for (let i = 0; i < settings.agents; i++) {
    agents.push(new Agent());
  }

  document.getElementById("particle-count").textContent =
    agents.length + " ACTIVE AGENTS";
}

function draw() {
  background(8, 14, 23);

  // Subtle grid
  stroke(40, 62, 76, 45);
  strokeWeight(1);

  for (let x = 0; x < width; x += 65) {
    line(x, 0, x, height);
  }

  for (let y = 0; y < height; y += 65) {
    line(0, y, width, y);
  }

  for (let job of opportunities) {
    job.display();
  }

  for (let agent of agents) {
    agent.update();
    agent.display();
  }
}

class Opportunity {
  constructor() {
    this.pos = createVector(
      random(width * 0.35, width * 0.95),
      random(height * 0.12, height * 0.88)
    );
    this.radius = random(8, 16);
    this.phase = random(TWO_PI);
  }

  display() {
    let pulse = sin(frameCount * 0.035 + this.phase) * 4;

    noStroke();

    fill(139, 217, 196, 12);
    circle(this.pos.x, this.pos.y, 85 + pulse);

    fill(139, 217, 196, 25);
    circle(this.pos.x, this.pos.y, 45 + pulse);

    fill(139, 217, 196, 190);
    circle(this.pos.x, this.pos.y, this.radius * 2);

    fill(230, 255, 248);
    circle(this.pos.x, this.pos.y, 5);
  }
}

class Agent {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(0.3, 1.2));
    this.acc = createVector(0, 0);
    this.maxSpeed = random(1.1, 2);
    this.size = random(2, 4.5);
  }

  update() {
    let nearest = null;
    let shortestDistance = Infinity;

    for (let job of opportunities) {
      let d = p5.Vector.dist(this.pos, job.pos);
      if (d < shortestDistance) {
        shortestDistance = d;
        nearest = job;
      }
    }

    // Attraction to the nearest job opportunity
    if (nearest) {
      let attraction = p5.Vector.sub(nearest.pos, this.pos);
      attraction.setMag(0.025);
      this.acc.add(attraction);
    }

    // Mouse repulsion
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      let mouse = createVector(mouseX, mouseY);
      let distance = p5.Vector.dist(this.pos, mouse);

      if (distance < 130 && distance > 0) {
        let repel = p5.Vector.sub(this.pos, mouse);
        repel.setMag(map(distance, 0, 130, 0.35, 0));
        this.acc.add(repel);
      }
    }

    // Random wandering creates less predictable movement
    this.acc.add(p5.Vector.random2D().mult(0.035));

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.vel.mult(0.985);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // Wrap around screen edges
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  display() {
    noStroke();
    fill(148, 179, 215, 165);
    circle(this.pos.x, this.pos.y, this.size);

    // Connection to nearby opportunities
    for (let job of opportunities) {
      let d = p5.Vector.dist(this.pos, job.pos);

      if (d < 115) {
        stroke(139, 217, 196, map(d, 0, 115, 80, 0));
        strokeWeight(0.6);
        line(this.pos.x, this.pos.y, job.pos.x, job.pos.y);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createMarket(selectedOccupation);
}
