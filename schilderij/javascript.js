let particles = [];
let flow;
let pgTrails;      // trails layer (2D)
let settings = {
  particleCount: 1200,
  fieldRes: 22,
  speed: 1.1,
  trailFade: 20,    // alpha fade per frame on trails (0-255 low means long trails)
  fpsSmoothing: 0.05
};

let paused = false;
let lastTime = 0;
let fps = 60;
let palette;
let t = 0; // global time

function setup(){
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  pixelDensity(max(1, floor(displayDensity())));

  // offscreen layer for trails
  pgTrails = createGraphics(width, height);
  pgTrails.pixelDensity(1);
  pgTrails.colorMode(HSB,360,100,100,1);

  // create flow field
  flow = new FlowField(settings.fieldRes);

  // palette
  palette = new Palette();

  // particles
  for(let i=0;i<settings.particleCount;i++) particles.push(new Particle());

  lastTime = millis();
}

function draw(){
  if(!paused){
    let now = millis();
    let dt = (now-lastTime)/1000;
    lastTime = now;
    t += dt;

    // update flow
    flow.update(t*0.2);

    // fade trails slightly (draw a transparent rectangle)
    pgTrails.push();
    pgTrails.noStroke();
    pgTrails.fill(0,0,0, map(settings.trailFade,0,255,0,0.06));
    pgTrails.rect(0,0,pgTrails.width, pgTrails.height);
    pgTrails.pop();

    // update particles
    for(let p of particles){
      p.follow(flow);
      p.update(dt);
      p.edges();
      p.show(pgTrails);
    }
  }

  // background subtle gradient
  background(6, 6, 4);
  drawBackgroundGradient();

  // draw trails on top
  push();
  blendMode(ADD);
  image(pgTrails,0,0);
  pop();

  // overlay subtle vignette
  drawVignette();

  // update stats
  fps += (frameRate() - fps) * settings.fpsSmoothing;
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  pgTrails.resizeCanvas(windowWidth, windowHeight);
}

// ---------------------------
// FlowField class
// ---------------------------
class FlowField{
  constructor(res){
    this.res = res; // cell size
    this.cols = ceil(width/this.res)+1;
    this.rows = ceil(height/this.res)+1;
    this.vectors = new Array(this.cols*this.rows).fill().map(()=>createVector());
    this.scale = 0.0016; // noise scale
  }
  update(time){
    let i=0;
    for(let x=0;x<this.cols;x++){
      for(let y=0;y<this.rows;y++){
        let px = x*this.res;
        let py = y*this.res;
        let n = fbm(px*this.scale, py*this.scale, time*0.12);
        let angle = TAU * n * 1.6 + cos(time*0.05 + n*10.0);
        let v = p5.Vector.fromAngle(angle);
        v.setMag(1);
        this.vectors[i++] = v;
      }
    }
  }
  lookup(pos){
    let col = constrain(floor(pos.x/this.res),0,this.cols-1);
    let row = constrain(floor(pos.y/this.res),0,this.rows-1);
    let idx = col + row*this.cols;
    return this.vectors[idx] ? this.vectors[idx].copy() : createVector(0,0);
  }
}

// ---------------------------
// Particle class
// ---------------------------
class Particle{
  constructor(){
    this.pos = createVector(random(width), random(height));
    this.prev = this.pos.copy();
    this.vel = createVector(0,0);
    this.acc = createVector(0,0);
    this.maxSpeed = random(0.6, 2.6) * settings.speed;
    this.size = random(0.8, 3.6);
    this.hue = (palette.baseHue + random(-30,30) + random(0,30)) % 360;
    this.life = random(20, 200);
  }
  follow(field){
    let desired = field.lookup(this.pos);
    desired.mult(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(0.08 + this.size*0.003);
    this.applyForce(steer);

    if(mouseIsPressed){
      let m = createVector(mouseX, mouseY);
      let dir = p5.Vector.sub(m, this.pos);
      let d = dir.mag();
      if(d>1){
        dir.normalize();
        let strength = map(d,0,width,0.35,0.002);
        dir.mult(strength);
        this.applyForce(dir);
      }
    }
  }
  applyForce(f){ this.acc.add(f); }
  update(dt){
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.prev = this.pos.copy();
    this.pos.add(this.vel.copy().mult(dt*60));
    this.acc.mult(0);
    this.life -= dt*10;
    if(this.life<0) this.reset();
  }
  reset(){
    this.pos.set(random(width), random(height));
    this.prev = this.pos.copy();
    this.vel.mult(0);
    this.life = random(20, 200);
  }
  edges(){
    let wrapped = false;
    if(this.pos.x<0){this.pos.x = width; this.prev.x = this.pos.x; wrapped = true}
    if(this.pos.x>width){this.pos.x = 0; this.prev.x = this.pos.x; wrapped=true}
    if(this.pos.y<0){this.pos.y = height; this.prev.y = this.pos.y; wrapped=true}
    if(this.pos.y>height){this.pos.y = 0; this.prev.y = this.pos.y; wrapped=true}
    if(wrapped) this.vel.mult(0.5);
  }
  show(pg){
    pg.push();
    pg.strokeWeight(this.size);
    let s = constrain(this.vel.mag()/this.maxSpeed, 0.1, 1);
    let alpha = map(s,0,1,0.08,0.7);
    pg.stroke(this.hue, 80, 100, alpha);
    pg.line(this.prev.x,this.prev.y,this.pos.x,this.pos.y);
    pg.pop();
  }
}

// ---------------------------
// Utility: palette & helpers
// ---------------------------
class Palette{
  constructor(){
    this.baseHue = random(200, 260); // bluish
  }
}

function fbm(x,y,z){
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for(let i=0;i<5;i++){
    sum += amp * noise(x*freq, y*freq, z*freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return sum;
}

function drawBackgroundGradient(){
  push();
  noFill();
  for(let i=0;i<60;i++){
    let a = map(i,0,60,0.004,0.0008);
    fill(222, 30, 6, a);
    rectMode(CENTER);
    rect(width/2, height/2, width * (1 + i*0.01), height * (1 + i*0.01));
  }
  pop();
}

function drawVignette(){
  push();
  noFill();
  let g = 0.35;
  fill(0,0,0,g);
  rect(0,0,width,height);
  pop();
}

function clearTrails(){
  pgTrails.clear();
}

function togglePause(){
  paused = !paused;
}

function keyPressed(){
  if(key==='p' || key==='P') togglePause();
  if(key==='c' || key==='C') clearTrails();
}

function mouseWheel(e){
  let delta = e.delta;
  if(keyIsDown(CONTROL) || keyIsDown(17) || keyIsDown(META)) delta *= 0.2;
  flow.scale = constrain(flow.scale + delta * 0.000002, 0.0004, 0.01);
}
