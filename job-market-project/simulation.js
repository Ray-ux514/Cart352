let particles = [];
let nodes = [];

const PARTICLE_COUNT = 450;

const occupations = [
  { id: "designer", name: "GRAPHIC DESIGNER", color: [239, 117, 57] },
  { id: "developer", name: "SOFTWARE DEVELOPER", color: [65, 146, 255] },
  { id: "nurse", name: "REGISTERED NURSE", color: [69, 206, 236] },
  { id: "teacher", name: "TEACHER", color: [248, 205, 103] },
  { id: "electrician", name: "ELECTRICIAN", color: [114, 223, 196] },
  { id: "chef", name: "CHEF", color: [255, 100, 150] },
];

let activeOccupation = "all";

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("simulation-canvas");

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("occupation");

  if (occupations.some((o) => o.id === requested)) {
    activeOccupation = requested;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  for (let occupation of occupations) {
    if (activeOccupation === "all" || activeOccupation === occupation.id) {
      nodes.push(new JobNode(occupation));
    }
  }

  document.getElementById("active-occupation").textContent =
    activeOccupation === "all"
      ? "ALL OCCUPATIONS"
      : occupations.find((o) => o.id === activeOccupation).name;

  document.getElementById("agent-count").textContent =
    PARTICLE_COUNT + " ACTIVE PARTICLES";
}

function draw() {
  background(3, 4, 5, 65);

  // Draw floating nodes
  for (let node of nodes) {
    node.update();
    node.display();
  }

  // Draw particle field
  for (let particle of particles) {
    particle.update();
    particle.display();
  }
}

class JobNode {
  constructor(occupation) {
    this.name = occupation.name;
    this.color = occupation.color;

    this.pos = createVector(
      random(width * 0.25, width * 0.85),
      random(height * 0.2, height * 0.8)
    );

    this.vel = p5.Vector.random2D().mult(0.5);
    this.phase = random(TWO_PI);
    this.radius = 7;
  }

  update() {
    // Smooth orbital wandering
    this.vel.add(
      createVector(
        sin(frameCount * 0.008 + this.phase) * 0.015,
        cos(frameCount * 0.01 + this.phase) * 0.015
      )
    );

    this.vel.limit(0.7);
    this.pos.add(this.vel);

    // Bounce at edges
    if (this.pos.x < 80 || this.pos.x > width - 80) {
      this.vel.x *= -1;
      this.pos.x = constrain(this.pos.x, 80, width - 80);
    }

    if (this.pos.y < 80 || this.pos.y > height - 80) {
      this.vel.y *= -1;
      this.pos.y = constrain(this.pos.y, 80, height - 80);
    }
  }

  display() {
    const pulse = sin(frameCount * 0.04 + this.phase) * 4;

    noStroke();

    // Outer glow
    fill(...this.color, 12);
    circle(this.pos.x, this.pos.y, 65 + pulse);

    fill(...this.color, 35);
    circle(this.pos.x, this.pos.y, 30 + pulse);

    // Core node
    fill(...this.color, 220);
    circle(this.pos.x, this.pos.y, this.radius * 2);

    fill(255, 230);
    circle(this.pos.x, this.pos.y, 3);
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(0.2, 1));
    this.acc = createVector(0, 0);

    this.size = random(1, 2.5);
    this.speed = random(0.7, 1.7);
    this.phase = random(TWO_PI);
  }

  update() {
    // Find nearest occupation node
    let nearest = null;
    let shortest = Infinity;

    for (let node of nodes) {
      let d = p5.Vector.dist(this.pos, node.pos);

      if (d < shortest) {
        shortest = d;
        nearest = node;
      }
    }

    // Gentle attraction to occupation nodes
    if (nearest && shortest > 25) {
      let force = p5.Vector.sub(nearest.pos, this.pos);
      force.setMag(0.012);
      this.acc.add(force);
    }

    // Orbit instead of directly colliding
    if (nearest && shortest < 140 && shortest > 5) {
      let direction = p5.Vector.sub(nearest.pos, this.pos);
      let tangent = createVector(-direction.y, direction.x);
      tangent.setMag(0.025);
      this.acc.add(tangent);
    }

    // Mouse interaction
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      let mouse = createVector(mouseX, mouseY);
      let d = p5.Vector.dist(this.pos, mouse);

      if (d < 150 && d > 0) {
        let force = p5.Vector.sub(mouse, this.pos);

        if (mouseIsPressed) {
          force.setMag(0.12);
        } else {
          force.mult(-1);
          force.setMag(0.15);
        }

        this.acc.add(force);
      }
    }

    // Random natural movement
    this.acc.add(p5.Vector.random2D().mult(0.025));

    this.vel.add(this.acc);
    this.vel.limit(this.speed);
    this.vel.mult(0.99);

    this.pos.add(this.vel);
    this.acc.mult(0);

    // Wrap around screen
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }

  display() {
    let brightness = 90 + sin(frameCount * 0.025 + this.phase) * 45;

    noStroke();
    fill(170, 195, 210, brightness);
    circle(this.pos.x, this.pos.y, this.size);

    // Connections to nearby job nodes
    for (let node of nodes) {
      let d = p5.Vector.dist(this.pos, node.pos);

      if (d < 85) {
        stroke(...node.color, map(d, 0, 85, 75, 0));

        strokeWeight(0.5);

        line(this.pos.x, this.pos.y, node.pos.x, node.pos.y);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
