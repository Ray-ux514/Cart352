let particles = [];

const PARTICLE_COUNT = 400;
const FIELD_RADIUS = 230;

let nodeColor = [93, 186, 255];
let occupationName = "SOFTWARE DEVELOPER";

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("simulation-canvas");

  // Get occupation selected on homepage
  const params = new URLSearchParams(window.location.search);
  const selected = params.get("occupation");

  const occupations = {
    designer: {
      name: "GRAPHIC DESIGNER",
      color: [239, 117, 57],
    },
    developer: {
      name: "SOFTWARE DEVELOPER",
      color: [93, 186, 255],
    },
    nurse: {
      name: "REGISTERED NURSE",
      color: [69, 206, 236],
    },
    teacher: {
      name: "TEACHER",
      color: [248, 205, 103],
    },
    electrician: {
      name: "ELECTRICIAN",
      color: [114, 223, 196],
    },
    chef: {
      name: "CHEF",
      color: [255, 100, 150],
    },
  };

  if (selected && occupations[selected]) {
    occupationName = occupations[selected].name;
    nodeColor = occupations[selected].color;
  }

  document.getElementById("occupation-name").textContent = occupationName;

  // Create particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  background(3, 4, 5);

  let cx = width / 2;
  let cy = height / 2;

  // Very subtle outer circle
  noFill();
  stroke(100, 120, 135, 25);
  strokeWeight(0.5);
  circle(cx, cy, FIELD_RADIUS * 2);

  // Draw particles
  for (let particle of particles) {
    particle.update();
    particle.display();
  }

  // Draw central occupation node
  drawJobNode(cx, cy);
}

function drawJobNode(x, y) {
  noStroke();

  // Soft glow
  fill(...nodeColor, 10);
  circle(x, y, 70);

  fill(...nodeColor, 25);
  circle(x, y, 40);

  // Outer ring
  noFill();
  stroke(...nodeColor, 100);
  strokeWeight(1);
  circle(x, y, 24);

  // Central node
  noStroke();
  fill(...nodeColor);
  circle(x, y, 10);

  fill(255);
  circle(x, y, 3);
}

class Particle {
  constructor() {
    this.angle = random(TWO_PI);
    this.radius = random(30, FIELD_RADIUS);

    this.speed = random(0.001, 0.006);
    this.size = random(2, 4.5);

    this.offset = random(TWO_PI);

    this.x = width / 2;
    this.y = height / 2;
  }

  update() {
    let cx = width / 2;
    let cy = height / 2;

    // Continuous orbiting motion
    this.angle += this.speed;

    // Slight natural floating movement
    let floating = sin(frameCount * 0.01 + this.offset) * 8;

    let targetX = cx + cos(this.angle) * (this.radius + floating);

    let targetY = cy + sin(this.angle) * (this.radius + floating);

    // Mouse interaction
    let d = dist(mouseX, mouseY, targetX, targetY);

    if (d < 100 && d > 0) {
      let force = map(d, 20, 100, 5, 0);

      let direction = atan2(targetY - mouseY, targetX - mouseX);

      if (mouseIsPressed) {
        direction += PI;
      }

      targetX += cos(direction) * force;
      targetY += sin(direction) * force;
    }

    // Smooth particle movement
    this.x = lerp(this.x, targetX, 0.12);
    this.y = lerp(this.y, targetY, 0.12);
  }

  display() {
    let opacity = 100 + sin(frameCount * 0.02 + this.offset) * 55;

    noStroke();
    fill(190, 210, 225, opacity);
    circle(this.x, this.y, this.size);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
