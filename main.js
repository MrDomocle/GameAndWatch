const cnv = document.getElementById('cnv');
const ctx = cnv.getContext('2d');
let dpr = 6;
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.imageSmoothingEnabled = false;

function zoom(zin) {
  dpr = Math.max(4, dpr += zin);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let mpos = [-1, -1];
let mdown = 0;
const inputEmpty = () => ({
  up: false,
  right: false,
  down: false,
  left: false,
  a: false,
  b: false,
  start: false,
  select: false,
});
const inputKeys = ['up', 'right', 'down', 'left', 'a', 'b', 'start', 'select'];
const keyboardMap = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  Enter: 'start',
  Backspace: 'select',
  z: 'b',
  x: 'a',
  ' ': 'a',
};
let input = inputEmpty();
let hit = inputEmpty();
let drawFuncs = [];

function highlightPoint(sx, sy, horiz) {
  drawFuncs.push(() => {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = horiz ? '#0f0' : '#f00';
    ctx.fillRect(sx, sy, 1, 1);
    ctx.restore();
  });
}

function highlightTile(tx, ty, horiz) {
  tx *= 16;
  ty *= 16;
  const n = 0.5 + 0.5/4;
  drawFuncs.push(() => {
    ctx.save();
    ctx.beginPath();
    if (horiz) {
      ctx.moveTo(tx + n, ty + n);
      ctx.lineTo(tx + n, ty + n + 15);
      ctx.moveTo(tx + n + 15, ty + n);
      ctx.lineTo(tx + n + 15, ty + n + 15);
    } else {
      ctx.moveTo(tx + n, ty + n);
      ctx.lineTo(tx + n + 15, ty + n);
      ctx.moveTo(tx + n, ty + n + 15);
      ctx.lineTo(tx + n + 15, ty + n + 15);
    }
    ctx.strokeStyle = horiz ? '#0f0' : '#f00';
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    ctx.restore();
  });
}


// MARK:  Graphics
const brickImg = document.getElementById("brickImg");
const marioImg = {
  bn: document.getElementById("m-bn"),
  bj: document.getElementById("m-bj"),
  bskid: document.getElementById("m-bskid"),
  brun0: document.getElementById("m-brun0"),
  brun1: document.getElementById("m-brun1"),
  brun2: document.getElementById("m-brun2"),
};
const runFrameSpeed = 1; // divided by speed to get ticks to next walk frame
let currSprite = "bn";
let spriteAnimTime = 0;
let spriteAnimSpeed = 8;
let lookDir = 1;

function drawScreen({
  playerX,
  playerY,
  leftEdgeOffset,
  rightEdgeOffset,
  heightOffset,
}) {
  ctx.beginPath();
  ctx.fillStyle = "cornflowerblue";
  ctx.rect(0,0,256,192);
  ctx.fill();
  for (let y = 0; y < world.length; y++) {
    const row = world[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const isSolid = ch === '#';
      if (isSolid) {
        ctx.drawImage(brickImg, x*16, y*16);
      }
    }
  }
  console.log(lookDir);
  if (lookDir < 0) {
    ctx.save();
    ctx.translate(Math.floor(playerX)+16, Math.floor(playerY));
    ctx.scale(-1,1);
    ctx.drawImage(marioImg[currSprite], 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(marioImg[currSprite], Math.floor(playerX), Math.floor(playerY));
  }

  for (const f of drawFuncs) {
    f();
  }
  ctx.beginPath();
  ctx.rect(mpos[0] * 16, mpos[1] * 16, 16, 16);
  ctx.stroke();
}

function start() {
  let frameCount = 0;
  let nextFrame = Date.now();
  const run = () => {
    const now = Date.now();
    let i = 0;
    while (nextFrame < now) {
      drawFuncs = [];
      tick();
      hit = inputEmpty();
      frameCount++;
      nextFrame += 1000 / targetFPS;
      i++;
      if (i >= 4) {
        // too slow :-(
        nextFrame = Date.now();
      }
    }
    setTimeout(run, 0);
  }
  run();
}

// MARK: Control
function onKey(key, down){
  const k = keyboardMap[key];
  if (k) {
    if (!input[k] && down) {
      hit[k] = true;
    }
    input[k] = down;
    return true;
  }
  return false;
}

function onKeyDown(e){
  if (onKey(e.key, true)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function onKeyUp(e){
  if (onKey(e.key, false)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function onBlur(){
  input = inputEmpty();
  hit = inputEmpty();
}

function mousePos(e) {
  const rect = cnv.getBoundingClientRect();
  return [
    Math.floor((e.clientX - rect.left) / (8 * dpr)),
    Math.floor((e.clientY - rect.top) / (8 * dpr))
  ];
}

function onMouseMove(e, hitDown, isOut) {
  mpos = isOut ? [-1, -1] : mousePos(e);
  const get = () => world[mpos[1]][mpos[0]];
  const set = (v) => world[mpos[1]][mpos[0]] = v;
  if (hitDown) {
    mdown = get() === '#' ? 1 : 2;
  }
  if (mdown) {
    set(mdown === 1 ? ' ' : '#');
  }
}

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', onBlur);
cnv.addEventListener('mousemove', (e) => {
  onMouseMove(e, false, false);
});
cnv.addEventListener('mouseout', (e) => {
  mdown = 0;
  onMouseMove(e, false, true);
});
cnv.addEventListener('mousedown', (e) => {
  onMouseMove(e, true, false);
});
cnv.addEventListener('mouseup', (e) => {
  mdown = 0;
  onMouseMove(e, false, false);
});

//
// MARK: Main code
//

var targetFPS = 60;

let playerX = 20;
let playerY = 32;
let playerDX = 0;
let playerDY = 0;
let playerInAir = false;
let playerIsBig = true;
let playerIsDucking = false;

const GRAVITY_SLOW = 1;
const GRAVITY_FAST = 5;
const JUMP_FORCE = [-3.5, -3.625, -3.75, -4];

const world = `
################
                
                
                
                
                
                
                
                
                
                
               x
`.trim().split('\n').map(n => n.split(''));

const tileCollisionOffsets = {
  big: {
    downLeft: {
      // Not small or ducking moving downward - Left half
      vert: [
        { x: 0x04, y: 0x20 },  // Ground left
        { x: 0x0B, y: 0x20 },  // Ground right
      ],
      horiz: [
        { x: 0x0E, y: 0x1B },  // In-front lower
        { x: 0x0E, y: 0x0E },  // In-front upper
      ],
    },
    downRight: {
      // Not small or ducking moving downward - Right half
      vert: [
        { x: 0x04, y: 0x20 },  // Ground left
        { x: 0x0B, y: 0x20 },  // Ground right
      ],
      horiz: [
        { x: 0x01, y: 0x1B },  // In-front lower
        { x: 0x01, y: 0x0E },  // In-front upper
      ],
    },
    upLeft: {
      // Not small or ducking moving upward - Left half
      vert: [
        { x: 0x08, y: 0x06 },  // Ground left
        { x: 0x08, y: 0x06 },  // Ground right
      ],
      horiz: [
        { x: 0x0E, y: 0x1B },  // In-front lower
        { x: 0x0E, y: 0x0E },  // In-front upper
      ],
    },
    upRight: {
      // Not small or ducking moving upward - Right half
      vert: [
        { x: 0x08, y: 0x06 },  // Ground left
        { x: 0x08, y: 0x06 },  // Ground right
      ],
      horiz: [
        { x: 0x01, y: 0x1B },  // In-front lower
        { x: 0x01, y: 0x0E },  // In-front upper
      ],
    },
  },
  small: {
    downLeft: {
      // Small or ducking moving downward - Left half
      vert: [
        { x: 0x04, y: 0x20 },  // Ground left
        { x: 0x0B, y: 0x20 },  // Ground right
      ],
      horiz: [
        { x: 0x0D, y: 0x1B },  // In-front lower
        { x: 0x0D, y: 0x14 },  // In-front upper
      ],
    },
    downRight: {
      // Small or ducking moving downward - Right half
      vert: [
        { x: 0x04, y: 0x20 },  // Ground left
        { x: 0x0B, y: 0x20 },  // Ground right
      ],
      horiz: [
        { x: 0x02, y: 0x1B },  // In-front lower
        { x: 0x02, y: 0x14 },  // In-front upper
      ],
    },
    upLeft: {
      // Small or ducking moving upward - Left half
      vert: [
        { x: 0x08, y: 0x10 },  // Ground left
        { x: 0x08, y: 0x10 },  // Ground right
      ],
      horiz: [
        { x: 0x0D, y: 0x1B },  // In-front lower
        { x: 0x0D, y: 0x14 },  // In-front upper
      ],
    },
    upRight: {
      // Small or ducking moving upward - Right half
      vert: [
        { x: 0x08, y: 0x10 },  // Ground left
        { x: 0x08, y: 0x10 },  // Ground right
      ],
      horiz: [
        { x: 0x02, y: 0x1B },  // In-front lower
        { x: 0x02, y: 0x14 },  // In-front upper
      ],
    },
  }
};

function mod16(n) {
  // `n % 16` doesn't work well for negative numbers, so calculate euclidian mod instead:
  return n - Math.floor(n / 16) * 16;
}
// MARK: tick
function tick() {
  if (hit.start) {
    playerIsBig = !playerIsBig;
  }

  if (!playerIsBig) {
    // disable any ducking
    playerIsDucking = false;
  } else if (!playerInAir) {
    // set player ducking if they hit ONLY down
    playerIsDucking =
      !input.left &&
      !input.right &&
      !input.up &&
      input.down;
  }

  let heightOffset = !playerIsBig || playerIsDucking
    ? 20
    : 10;
  const tileAbove = getTileFromPlayer({ x: 8, y: heightOffset }, false);

  const lowClearance = tileAbove && !playerInAir;
  if (lowClearance) {
    // player is stuck in wall
    playerDX = 0;
    playerX++;
  }

  // advance player
  playerX += Math.max(-4, Math.min(4, playerDX));
  if (playerInAir) {
    playerY += Math.min(4, playerDY);
  }

  // handle horizontal movement
  const topSpeed = input.b ? 2.5 : 1.5;
  const accelFric = playerIsBig ? 14 : 10;
  const accelSkid = 32;
  const accelNormal = 14;
  const hitDir = input.left ? -1 : input.right ? 1 : 0;
  if (hitDir != 0 && !playerInAir) lookDir = hitDir;

  const absDX = Math.abs(playerDX)

  if (absDX > 0 && !playerInAir) {
    spriteAnimTime++;
    currSprite = (playerIsBig ? "b" : "s") + "run";
    currSprite += ( spriteAnimTime >> (3 - Math.floor(absDX)) ) % 3;
  } else if (absDX == 0) {
    spriteAnimTime = 0;
    currSprite = (playerIsBig ? "b" : "s") + "n";
  }

  if (hitDir === 0) {
    if (!playerInAir) {
      if (playerDX < 0) {
        playerDX += accelFric / 256;
        if (playerDX > 0) {
          playerDX = 0;
        }
      } else if (playerDX > 0) {
        playerDX -= accelFric / 256;
        if (playerDX < 0) {
          playerDX = 0;
        }
      }
    }
  } else {
    if (
      (playerDX > 0 && hitDir < 0) ||
      (playerDX < 0 && hitDir > 0)
    ) {
      // player is voluntarily slowing down (skidding), so let them!
      playerDX += hitDir * accelSkid / 256;
      if (!playerInAir) currSprite = (playerIsBig ? "b" : "s") + "skid";

    } else if (absDX < topSpeed) {
      playerDX += hitDir * accelNormal / 256;
    } else if (absDX > topSpeed) {
      if (!playerInAir) {
        playerDX -= hitDir * accelFric / 256;
      }
    }
  }

  // handle vertical movement
  if (hit.a && !playerInAir) {
    const dx = Math.floor(Math.abs(playerDX));
    playerDY = JUMP_FORCE[dx];
    playerInAir = true;
    currSprite = (playerIsBig ? "b" : "s") + "j";
  }
  if (playerInAir) {
    if (playerDY < -2 && input.a) {
      playerDY += GRAVITY_SLOW / 16;
    } else {
      playerDY += GRAVITY_FAST / 16;
    }
  }

  // collision detection setup
  const playerIsMovingUp = playerDY < 0;
  const playerIsLeftHalf = mod16(playerX) < 8;
  const colOffsets = !playerIsBig || playerIsDucking
    ? tileCollisionOffsets.small
    : tileCollisionOffsets.big;
  const { vert: tVert, horiz: tHoriz } = playerIsMovingUp
    ? (
      playerIsLeftHalf
      ? colOffsets.upLeft
      : colOffsets.upRight
    ) : (
      playerIsLeftHalf
      ? colOffsets.downLeft
      : colOffsets.downRight
    );

  const solidVert1 = getTileFromPlayer(tVert[0], false);
  const solidVert2 = getTileFromPlayer(tVert[1], false);
  const solidVert = solidVert1 || solidVert2;

  const solidHoriz1 = getTileFromPlayer(tHoriz[0], true);
  const solidHoriz2 = getTileFromPlayer(tHoriz[1], true);
  const solidHoriz = solidHoriz1 || solidHoriz2;

  // horizontal collision detection
  const leftEdgeOffset = playerIsBig ? 2 : 3;
  const rightEdgeOffset = playerIsBig ? 14 : 13;
  if (solidHoriz && !lowClearance) {
    const dir = playerIsLeftHalf ? -1 : 1;
    const edx = playerIsLeftHalf
      ? leftEdgeOffset
      : rightEdgeOffset;
    const edgeX = playerX + edx;
    const localX = mod16(edgeX);
    if (Math.floor(localX) !== 0) {
      // eject player from wall
      playerX += dir;
      if (
        (playerDX < 0 && dir === 1) ||
        (playerDX >= 0 && dir === -1)
      ) {
        playerDX = 0;
      }
    }
  }

  // vertical collision detection
  if (playerDY >= 0 || !playerInAir) {
    if (solidVert) {
      // on solid ground
      const localY = mod16(Math.floor(playerY));
      if (localY < 6) {
        // snap to ground
        if (localY === 1) {
          playerY--;
        } else if (localY !== 0) {
          playerY -= 2;
        }
        playerInAir = false;
        playerDY = 0;
      }
    } else if (!playerInAir) {
      // walked off ledge, so now in air
      playerDY = 0;
      playerInAir = true;
    }
  } else {
    // moving up or in air
    heightOffset = tVert[0].y;
    if (solidVert) { // hit head on something
      playerDY = GRAVITY_SLOW / 16;
    }
  }

  // edge
  if (playerX >= 16*(world[0].length+1)) {
    playerX = -16;
  }
  if (playerX < -16) {
    playerX = 16*(world[0].length+1);
  }

  drawScreen({
    playerX,
    playerY,
    leftEdgeOffset,
    rightEdgeOffset,
    heightOffset,
  });
}

function getTileFromPlayer({ x: dx, y: dy }, horiz) {
  const sx = Math.floor(playerX) + dx;
  const sy = Math.floor(playerY) + dy;
  highlightPoint(sx, sy, horiz);
  const tx = Math.floor(sx / 16);
  let ty = Math.floor(sy / 16);
  if (ty < 0) {
    ty = 0;
  } else if (ty >= world.length-2) {
    return true;
  }
  const row = world[ty];
  if (tx < 0 || tx >= row.length) {
    return false;
  }
  //highlightTile(tx, ty, horiz);
  return row[tx] === '#';
}

start();