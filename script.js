var worldWidth;
var worldHeight;
var birds = [];

var camX = 0;
var camY = 0;
var cmouseX = 0;
var cmouseY = 0;

var worldPadding = 100;
var worldPaddingFact = 0.0001;

var sepDist = 50;
var sepFact = 0.00005;

var cohDist = 200;
var cohFact = 0.0001;

var aliDist = 100;
var aliFact = 0.1;

var birdSpeed = 2;
var birdSpeedOff = 0.1;

var chunkSize = Math.max(sepDist, cohDist, aliDist);
var chunks = [];
var chunksWidth;
var chunksHeight;

// var mouseEffectDist = 150;
// var mouseEffectFact = 0.05;

var effects = [];

function myMod(n, m) {
  return ((n % m) + m) % m;
}

function xToOnScr(x) {
  return myMod(x-camX, worldWidth);
}

function yToOnScr(y) {
  return myMod(y-camY, worldHeight);
}

function updateChunkCount() {
  chunksWidth = ceil(worldWidth/chunkSize);
  chunksHeight = ceil(worldHeight/chunkSize);
  for (var x = 0; x < chunksWidth; x++) {
    chunks.push([])
    for (var y = 0; y < chunksHeight; y++) {
      chunks[x].push([])
    }
  }
  updateChunks();
}

function removeBirdFromChunk(birdI, chx, chy) {
  var chunk = chunks[myMod(chx,chunksWidth)][myMod(chy,chunksHeight)];
  var indexToRem = chunk.indexOf(birdI);
  chunk.splice(indexToRem, 1);
}

function addBirdToChunk(birdI, chx, chy) {
  var chunk = chunks[myMod(chx,chunksWidth)][myMod(chy,chunksHeight)];
  chunk.push(birdI);
}

function updateChunk(birdI) {
  var bird = birds[birdI];
  var newBirdChunkPos = {
    x:floor((bird.pos.x/chunkSize)-0.5),
    y:floor((bird.pos.y/chunkSize)-0.5)
  };
  if (bird.chunkPos === undefined || bird.chunkPos.x != newBirdChunkPos.x || bird.chunkPos.y != newBirdChunkPos.y) {
    if (bird.chunkPos !== undefined) {
      removeBirdFromChunk(birdI, bird.chunkPos.x,   bird.chunkPos.y);
      removeBirdFromChunk(birdI, bird.chunkPos.x+1, bird.chunkPos.y);
      removeBirdFromChunk(birdI, bird.chunkPos.x,   bird.chunkPos.y+1);
      removeBirdFromChunk(birdI, bird.chunkPos.x+1, bird.chunkPos.y+1);
    }
    addBirdToChunk(birdI, newBirdChunkPos.x,   newBirdChunkPos.y);
    addBirdToChunk(birdI, newBirdChunkPos.x+1, newBirdChunkPos.y);
    addBirdToChunk(birdI, newBirdChunkPos.x,   newBirdChunkPos.y+1);
    addBirdToChunk(birdI, newBirdChunkPos.x+1, newBirdChunkPos.y+1);
    bird.chunkPos = {
      x: newBirdChunkPos.x,
      y: newBirdChunkPos.y
    };
  }
}

function getBirdsInChunk(pos) {
  var chx = myMod(floor(pos.x/chunkSize),chunksWidth);
  var chy = myMod(floor(pos.y/chunkSize),chunksHeight);
  var localBirds = [];
  for (var i = 0; i < chunks[chx][chy].length; i++) {
    localBirds.push(birds[chunks[chx][chy][i]]);
  }
  return localBirds;
}

function updateChunks() {
  for (var i = 0; i < birds.length; i++) {
    updateChunk(i);
  }
}

class Effect {
  constructor(pos, maxDist, strengthFormula, updatePosFunct) {
    this.pos = pos;
    this.maxDist = maxDist;
    this.strengthFormula = strengthFormula;
    this.updatePosFunct = updatePosFunct
  }
  updatePos() {
    this.updatePosFunct(this.pos);
  }
  getVec(bird) {
    var relPos = createVector(myMod(bird.pos.x-this.pos.x+worldWidth /2,worldWidth )-worldWidth/2,
                              myMod(bird.pos.y-this.pos.y+worldHeight/2,worldHeight)-worldHeight/2)
    var nowDist = relPos.mag()
    if (nowDist < this.maxDist ) {
      var vec = this.pos.copy().sub(bird.pos).mult(-1);
      return vec.mult(this.strengthFormula(nowDist));
    } else {
      return createVector(0,0);
    }
  }
}

class Bird {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.acc = createVector();
    this.speed = birdSpeed + random(-birdSpeedOff, birdSpeedOff);
    this.chunkPos = undefined;
  }
  accel() {
    this.acc.set(0,0);

    var sepVec = createVector();
    var sepCount = 0;
    var cohVec = createVector();
    var cohCount = 0;
    var aliVec = createVector();
    var aliCount = 0;
    var localBirds = getBirdsInChunk(this.pos);
    for (var i = 0; i < localBirds.length; i++) {
      var nowDist = this.pos.dist(localBirds[i].pos);
      if (nowDist === 0) {
        continue
      }

      if (nowDist < sepDist) {
        var nowSepVec = p5.Vector.sub(localBirds[i].pos,this.pos);
        nowSepVec.setMag(-sq(sepDist-nowDist));
        sepVec.add(nowSepVec)
        sepCount ++;
      }

      if (nowDist < cohDist) {
        cohVec.add(p5.Vector.sub(localBirds[i].pos,this.pos));
        cohCount ++;
      }

      if (nowDist < aliDist) {
        aliVec.add(localBirds[i].vel);
        aliCount ++;
      }
    }

    for (var i = 0; i < effects.length; i++) {
      this.acc.add(effects[i].getVec(this));
    }

    // if (sepCount > 0) {
    //   sepVec.div(sepCount);
    // }
    sepVec.mult(sepFact);
    this.acc.add(sepVec);

    if (cohCount > 0) {
      cohVec.div(cohCount);
    }
    cohVec.mult(cohFact);
    this.acc.add(cohVec);

    if (aliCount > 0) {
      aliVec.div(aliCount);
    }
    aliVec.mult(aliFact);
    this.acc.add(aliVec);

    // if (this.pos.x < worldPadding) {
    //   this.acc.add(createVector(sq(worldPaddingFact-this.pos.x)*worldPaddingFact,0))
    // } else if (this.pos.x > worldWidth-worldPadding) {
    //   this.acc.add(createVector(-sq(this.pos.x-(worldWidth-worldPaddingFact))*worldPaddingFact,0))
    // }
    // if (this.pos.y < worldPadding) {
    //   this.acc.add(createVector(0,sq(worldPaddingFact-this.pos.y)*worldPaddingFact))
    // } else if (this.pos.y > worldHeight-worldPadding) {
    //   this.acc.add(createVector(0,-sq(this.pos.y-(worldHeight-worldPaddingFact))*worldPaddingFact))
    // }

    this.pos.set(myMod(this.pos.x, worldWidth), myMod(this.pos.y, worldHeight));

    this.vel.add(this.acc);
    // this.vel.lerp(this.vel.copy().setMag(this.speed), 0.1);
    this.vel.setMag(this.speed);
  }
  move() {
    this.pos.add(this.vel);
  }
  draw() {
    // fill(0)
    // ellipse(this.pos.x, this.pos.y, 10,10);
    push();
    translate(xToOnScr(this.pos.x), yToOnScr(this.pos.y));
    rotate(degrees(this.vel.heading()));
    // translate(-this.pos.x, -this.pos.y);
    fill(0);
    noStroke();
    triangle(-10,-5,-10,5,10,0);
    pop();
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  worldWidth = width;
  worldHeight = height;

  for (var i = 0; i < 250; i++) {
    birds.push(new Bird(random(width), random(height), random(-180, 180)))
  }

  effects.push(new Effect(createVector(0,0), 100, function(dist){return 0.5/dist}, function(pos){pos.set(cmouseX, cmouseY)}))
  // effects.push(new Effect(createVector(0,0), 300,
  //                         function(dist){return -0.05/dist},
  //                         function(pos){
  //                           pos.set(noise((frameCount/1000)+2378)*width, noise((frameCount/1000)+485634)*height)
  //                         }));
  // effects.push(new Effect(createVector(0,0), 300,
  //                         function(dist){return -0.05/dist},
  //                         function(pos){
  //                           pos.set(noise((frameCount/1000)+345)*width, noise((frameCount/1000)+34534)*height)
  //                         }));

  document.addEventListener('contextmenu', event => event.preventDefault());

  updateChunkCount()
}

function mousePressed() {
  if (mouseButton === LEFT) {
    effects.push(new Effect(createVector(cmouseX, cmouseY), 100, function(dist){return 0.5/dist}, function(pos){}))
  } else {
    for (var i = 1; i < effects.length; i++) {
      if (dist(cmouseX, cmouseY, effects[i].pos.x, effects[i].pos.y) < effects[i].maxDist/2) {
        effects.splice(i,1);
        i -= 1;
      }
    }
  }
  return false;
}

function mouseDragged() {
  camX -= mouseX-pmouseX;
  camY -= mouseY-pmouseY;
}

function windowResized() {
  createCanvas(windowWidth, windowHeight);
  worldWidth = width;
  worldHeight = height;
  updateChunkCount()
}

function draw() {
  background(255);

  cmouseX = myMod(camX+mouseX, worldWidth);
  cmouseY = myMod(camY+mouseY, worldHeight);

  // translate(width/2, height/2);
  // rotate(-degrees(birds[0].vel.heading())-90);
  // translate(-birds[0].pos.x, -birds[0].pos.y);

  noFill();
  stroke(0);
  rectMode(CORNERS)
  rect(0,0,worldWidth,worldHeight);

  for (var i = 0; i < effects.length; i++) {
    effects[i].updatePos();
    if (effects[i].maxDist !== Infinity) {
      fill(200);
      ellipse(xToOnScr(effects[i].pos.x), yToOnScr(effects[i].pos.y), effects[i].maxDist, effects[i].maxDist)
    }
  }

  for (var i = 0; i < birds.length; i++) {
    birds[i].accel();
  }

  for (var i = 0; i < birds.length; i++) {
    birds[i].move();
    birds[i].draw();
  }

  updateChunks();
  // for (var x = 0; x < chunksWidth; x++) {
  //   for (var y = 0; y < chunksHeight; y++) {
  //     if (chunks[x][y].includes(0)) {
  //       rectMode(CORNER);
  //       noFill()
  //       stroke(0);
  //       strokeWeight(5);
  //       rect(x*chunkSize, y*chunkSize,chunkSize,chunkSize);
  //     }
  //   }
  // }
  // noStroke();
  // fill(255,0,0,200);
  // rectMode(CENTER);
  // rect(birds[0].pos.x, birds[0].pos.y, 10, 10);
}
