const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameState = "start";

let score = 0;
let highScore = Number(localStorage.getItem("highScore")) || 0;

document.getElementById("score").textContent = score;
document.getElementById("highScore").textContent = highScore;

// Blocca il salto subito dopo l'avvio con SPAZIO
let startJumpLock = false;

// Serve per dare il punto finale una sola volta
let goalCollected = false;

// ==========================
// IMMAGINI
// ==========================

const charactersImg = new Image();
charactersImg.src = "assets/characters.png";

const coinImg = new Image();
coinImg.src = "assets/coin_gold.png";

const tilesetImg = new Image();
tilesetImg.src = "assets/tileset.png";

// ==========================
// INPUT
// ==========================

let keys = {};

document.addEventListener("keydown", function (e) {
  keys[e.code] = true;

  if (e.code === "Space" && gameState === "start") {
    gameState = "playing";

    // Evita che lo stesso SPAZIO usato per iniziare faccia anche saltare
    startJumpLock = true;
    keys["Space"] = false;
    return;
  }

  if ((e.code === "KeyR" || e.code === "Space") && gameState === "gameover") {
    resetGame();
    gameState = "playing";

    if (e.code === "Space") {
      startJumpLock = true;
      keys["Space"] = false;
    }
  }

  if (e.code === "KeyR" && gameState === "win") {
    resetGame();
    gameState = "playing";
  }
});

document.addEventListener("keyup", function (e) {
  keys[e.code] = false;

  if (e.code === "Space") {
    startJumpLock = false;
  }
});

// ==========================
// PLAYER
// ==========================

const player = {
  x: 100,
  y: 300,
  width: 60,
  height: 60,
  speed: 4.6,
  velY: 0,
  jumpPower: -13.2,
  gravity: 0.5,
  grounded: false,
  facingRight: true,
  frame: 0,
  frameTimer: 0,
  isClimbing: false,
  climbSpeed: 3.2
};

// ==========================
// CAMERA E MONDO
// ==========================

const camera = { x: 0 };

const world = {
  width: 2650,
  height: canvas.height
};

// ==========================
// PIATTAFORME
// ==========================

const basePlatforms = [
  { x: 0, y: 390, width: 720, height: 64 },
  { x: 790, y: 390, width: 520, height: 64 },
  { x: 1380, y: 350, width: 300, height: 64 },
  { x: 1740, y: 390, width: 380, height: 64 },
  { x: 2180, y: 390, width: 320, height: 64 }
];

const upperPlatforms = [
  { x: 250, y: 295, width: 145, height: 26 },
  { x: 930, y: 300, width: 150, height: 26 },
  { x: 1435, y: 245, width: 150, height: 26 },
  { x: 1810, y: 285, width: 145, height: 26 },
  { x: 2130, y: 305, width: 125, height: 26 }
];

const platforms = [...basePlatforms, ...upperPlatforms];

// ==========================
// STRUTTURE DECORATIVE
// ==========================

const structureBlocks = [
  { x: 290, y: 295, width: 70, height: 95 },
  { x: 965, y: 300, width: 75, height: 90 },
  { x: 1475, y: 245, width: 70, height: 145 },
  { x: 1845, y: 285, width: 72, height: 105 },
  { x: 2170, y: 305, width: 48, height: 85 }
];

// ==========================
// SCALE
// ==========================

const ladders = [
  { x: 315, y: 295, width: 24, height: 95 },
  { x: 990, y: 300, width: 24, height: 90 },
  { x: 1498, y: 245, width: 24, height: 105 },
  { x: 1868, y: 285, width: 24, height: 105 },
  { x: 2182, y: 305, width: 24, height: 85 }
];

// ==========================
// MONETE
// ==========================

let coins = [
  { x: 180, y: 340, size: 32, collected: false },
  { x: 305, y: 245, size: 32, collected: false },
  { x: 850, y: 340, size: 32, collected: false },
  { x: 985, y: 250, size: 32, collected: false },
  { x: 1488, y: 195, size: 32, collected: false },
  { x: 1395, y: 295, size: 32, collected: false },
  { x: 1860, y: 235, size: 32, collected: false },
  { x: 2180, y: 255, size: 32, collected: false },
  { x: 2300, y: 340, size: 32, collected: false }
];

let coinFrame = 0;
let coinFrameTimer = 0;

// ==========================
// NEMICI
// ==========================

let enemies = [
  {
    x: 540,
    y: 336,
    width: 54,
    height: 54,
    speed: 1.2,
    minX: 470,
    maxX: 580,
    direction: 1,
    frame: 0,
    frameTimer: 0
  },
  {
    x: 1180,
    y: 336,
    width: 54,
    height: 54,
    speed: 1.25,
    minX: 1100,
    maxX: 1260,
    direction: 1,
    frame: 0,
    frameTimer: 0
  },
  {
    x: 1560,
    y: 296,
    width: 54,
    height: 54,
    speed: 1.2,
    minX: 1480,
    maxX: 1630,
    direction: 1,
    frame: 0,
    frameTimer: 0
  },
  {
    x: 2290,
    y: 336,
    width: 54,
    height: 54,
    speed: 1.35,
    minX: 2240,
    maxX: 2355,
    direction: 1,
    frame: 0,
    frameTimer: 0
  }
];

// ==========================
// OSTACOLI
// ==========================

let obstacles = [
  { type: "runeStone", x: 170, y: 358, width: 30, height: 32 },
  { type: "spike", x: 600, y: 365, width: 44, height: 25 },

  { type: "crystal", x: 1120, y: 354, width: 28, height: 36 },
  { type: "spike", x: 1210, y: 365, width: 44, height: 25 },

  { type: "box", x: 1395, y: 318, width: 32, height: 32 },
  { type: "spike", x: 1615, y: 325, width: 44, height: 25 },

  { type: "crystal", x: 1965, y: 354, width: 28, height: 36 },
  { type: "spike", x: 2035, y: 365, width: 44, height: 25 },

  { type: "box", x: 2245, y: 358, width: 32, height: 32 },
  { type: "spike", x: 2370, y: 365, width: 44, height: 25 }
];

// ==========================
// TRAGUARDO
// ==========================

const goal = {
  x: 2500,
  y: 345,
  width: 70,
  height: 85
};

// ==========================
// SCENA
// ==========================

const fireflies = [
  { x: 110, y: 250, size: 2.0, speed: 0.020, phase: 0.2 },
  { x: 240, y: 285, size: 2.5, speed: 0.018, phase: 0.8 },
  { x: 390, y: 245, size: 2.2, speed: 0.025, phase: 1.3 },
  { x: 520, y: 275, size: 2.1, speed: 0.019, phase: 2.1 },
  { x: 710, y: 235, size: 2.4, speed: 0.017, phase: 1.7 }
];

let sceneTick = 0;

// ==========================
// COLLISIONI
// ==========================

function rectCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function getBoxSolids() {
  return obstacles
    .filter(obstacle => obstacle.type === "box")
    .map(box => ({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    }));
}

function getSolids() {
  return [...platforms, ...getBoxSolids()];
}

function getLadderTouchingPlayer() {
  for (let i = 0; i < ladders.length; i++) {
    const ladder = ladders[i];

    const ladderZone = {
      x: ladder.x - 26,
      y: ladder.y - 70,
      width: ladder.width + 52,
      height: ladder.height + 90
    };

    if (rectCollision(player, ladderZone)) {
      return ladder;
    }
  }

  return null;
}

function isPlayerAtTopOfLadder(ladder) {
  const playerCenterX = player.x + player.width / 2;
  const ladderCenterX = ladder.x + ladder.width / 2;
  const distanceX = Math.abs(playerCenterX - ladderCenterX);
  const playerBottom = player.y + player.height;

  return (
    distanceX < 42 &&
    playerBottom <= ladder.y + 12 &&
    playerBottom >= ladder.y - 28
  );
}

function enemyCollision(player, enemy) {
  const paddingX = 18;
  const paddingY = 16;

  const enemyHitbox = {
    x: enemy.x + paddingX,
    y: enemy.y + paddingY,
    width: enemy.width - paddingX * 2,
    height: enemy.height - paddingY * 2
  };

  return rectCollision(player, enemyHitbox);
}

function obstacleCollision(player, obstacle) {
  if (obstacle.type === "box" || obstacle.type === "runeStone") return false;

  let obstacleHitbox;

  if (obstacle.type === "spike") {
    obstacleHitbox = {
      x: obstacle.x + 10,
      y: obstacle.y + 8,
      width: obstacle.width - 20,
      height: obstacle.height - 8
    };
  } else if (obstacle.type === "crystal") {
    obstacleHitbox = {
      x: obstacle.x + 6,
      y: obstacle.y + 6,
      width: obstacle.width - 12,
      height: obstacle.height - 8
    };
  }

  return rectCollision(player, obstacleHitbox);
}

function coinCollision(player, coin) {
  return (
    player.x < coin.x + coin.size &&
    player.x + player.width > coin.x &&
    player.y < coin.y + coin.size &&
    player.y + player.height > coin.y
  );
}

// ==========================
// RESET
// ==========================

function resetGame() {
  score = 0;
  document.getElementById("score").textContent = score;

  player.x = 100;
  player.y = 300;
  player.velY = 0;
  player.grounded = false;
  player.frame = 0;
  player.frameTimer = 0;
  player.facingRight = true;
  player.isClimbing = false;

  goalCollected = false;
  startJumpLock = false;
  keys["Space"] = false;

  camera.x = 0;

  coins.forEach(function (coin) {
    coin.collected = false;
  });

  enemies = [
    {
      x: 540,
      y: 336,
      width: 54,
      height: 54,
      speed: 1.2,
      minX: 470,
      maxX: 580,
      direction: 1,
      frame: 0,
      frameTimer: 0
    },
    {
      x: 1180,
      y: 336,
      width: 54,
      height: 54,
      speed: 1.25,
      minX: 1100,
      maxX: 1260,
      direction: 1,
      frame: 0,
      frameTimer: 0
    },
    {
      x: 1560,
      y: 296,
      width: 54,
      height: 54,
      speed: 1.2,
      minX: 1480,
      maxX: 1630,
      direction: 1,
      frame: 0,
      frameTimer: 0
    },
    {
      x: 2290,
      y: 336,
      width: 54,
      height: 54,
      speed: 1.35,
      minX: 2240,
      maxX: 2355,
      direction: 1,
      frame: 0,
      frameTimer: 0
    }
  ];
}

// ==========================
// COLLISIONE PIATTAFORME
// ==========================

function handlePlatformCollisions() {
  player.grounded = false;

  const solids = getSolids();

  solids.forEach(function (solid) {
    if (rectCollision(player, solid)) {
      if (player.velY >= 0 && player.y + player.height - player.velY <= solid.y + 8) {
        player.y = solid.y - player.height;
        player.velY = 0;
        player.grounded = true;
      } else if (player.velY < 0 && player.y - player.velY >= solid.y + solid.height - 8) {
        player.y = solid.y + solid.height;
        player.velY = 0;
      }
    }
  });
}

function handleHorizontalCollisions(moveX) {
  if (moveX === 0) return;

  const solids = getSolids();

  solids.forEach(function (solid) {
    if (rectCollision(player, solid)) {
      if (moveX > 0) {
        player.x = solid.x - player.width;
      } else if (moveX < 0) {
        player.x = solid.x + solid.width;
      }
    }
  });
}

// ==========================
// UPDATE
// ==========================

function update() {
  if (gameState !== "playing") return;

  sceneTick++;

  let moveX = 0;

  if (keys["ArrowLeft"]) {
    moveX -= player.speed;
    player.facingRight = false;
  }

  if (keys["ArrowRight"]) {
    moveX += player.speed;
    player.facingRight = true;
  }

  player.x += moveX;

  if (!player.isClimbing) {
    handleHorizontalCollisions(moveX);
  }

  const ladder = getLadderTouchingPlayer();

  if (ladder && (keys["ArrowUp"] || keys["ArrowDown"])) {
    player.isClimbing = true;

    if (keys["ArrowDown"] && isPlayerAtTopOfLadder(ladder)) {
      player.x = ladder.x + ladder.width / 2 - player.width / 2;
      player.y = ladder.y - player.height + 10;
      player.grounded = false;
      player.velY = 0;
    }
  }

  if (player.isClimbing && ladder) {
    const targetX = ladder.x + ladder.width / 2 - player.width / 2;
    player.x += (targetX - player.x) * 0.25;

    player.velY = 0;
    player.grounded = false;

    if (keys["ArrowUp"]) {
      player.y -= player.climbSpeed;
    }

    if (keys["ArrowDown"]) {
      player.y += player.climbSpeed;
    }

    if (keys["ArrowUp"] && player.y + player.height <= ladder.y + 5) {
      player.y = ladder.y - player.height;
      player.isClimbing = false;
      player.grounded = true;
      player.velY = 0;
    }

    if (player.y + player.height >= ladder.y + ladder.height) {
      player.y = ladder.y + ladder.height - player.height;
      player.isClimbing = false;
      player.grounded = true;
      player.velY = 0;
    }

    if (keys["Space"] && !startJumpLock) {
      player.isClimbing = false;
      player.velY = player.jumpPower * 0.9;
      player.grounded = false;
    }
  } else {
    player.isClimbing = false;
  }

  if (!player.isClimbing) {
    if (keys["Space"] && player.grounded && !startJumpLock) {
      player.velY = player.jumpPower;
      player.grounded = false;
    }

    player.velY += player.gravity;
    player.y += player.velY;

    handlePlatformCollisions();
  }

  player.x = Math.max(0, Math.min(world.width - player.width, player.x));

  if (player.y > canvas.height + 140) {
    gameOver();
  }

  coins.forEach(function (coin) {
    if (!coin.collected && coinCollision(player, coin)) {
      coin.collected = true;
      score++;
      document.getElementById("score").textContent = score;
    }
  });

  coinFrameTimer++;

  if (coinFrameTimer > 6) {
    coinFrame = (coinFrame + 1) % 8;
    coinFrameTimer = 0;
  }

  enemies.forEach(function (enemy) {
    const previousX = enemy.x;

    enemy.x += enemy.speed * enemy.direction;

    if (enemy.x < enemy.minX || enemy.x > enemy.maxX) {
      enemy.x = previousX;
      enemy.direction *= -1;
    }

    const enemySolids = [...getBoxSolids()];

    enemySolids.forEach(function (solid) {
      const enemyBox = {
        x: enemy.x + 8,
        y: enemy.y + 8,
        width: enemy.width - 16,
        height: enemy.height - 8
      };

      if (rectCollision(enemyBox, solid)) {
        enemy.x = previousX - enemy.direction * 6;
        enemy.direction *= -1;
      }
    });

    enemy.frameTimer++;

    if (enemy.frameTimer > 12) {
      enemy.frame = (enemy.frame + 1) % 4;
      enemy.frameTimer = 0;
    }

    if (enemyCollision(player, enemy)) {
      gameOver();
    }
  });

  obstacles.forEach(function (obstacle) {
    if (obstacleCollision(player, obstacle)) {
      gameOver();
    }
  });

  // Traguardo finale: aggiunge 1 punto una sola volta e porta il totale massimo a 10
  if (rectCollision(player, goal) && !goalCollected) {
    goalCollected = true;
    score++;
    document.getElementById("score").textContent = score;

    gameState = "win";
    saveHighScore();
  }

  camera.x = player.x - canvas.width / 2 + player.width / 2;
  camera.x = Math.max(0, Math.min(world.width - canvas.width, camera.x));

  if (player.isClimbing) {
    player.frameTimer++;

    if (player.frameTimer > 10) {
      player.frame = (player.frame + 1) % 2;
      player.frameTimer = 0;
    }
  } else if (keys["ArrowLeft"] || keys["ArrowRight"]) {
    player.frameTimer++;

    if (player.frameTimer > 8) {
      player.frame = (player.frame + 1) % 4;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
  }
}

// ==========================
// SFONDO
// ==========================

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#4b9b8d");
  gradient.addColorStop(0.55, "#63aa9c");
  gradient.addColorStop(1, "#21404e");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawPixelSun();
  drawSoftFog();
  drawPixelMountains();
  drawLargeDarkTrees();
  drawWaterLayer();
  drawFireflies();
}

function drawPixelSun() {
  ctx.save();

  ctx.fillStyle = "rgba(255, 226, 138, 0.22)";
  ctx.beginPath();
  ctx.arc(690, 78, 56, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f4d875";
  ctx.beginPath();
  ctx.arc(690, 78, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSoftFog() {
  ctx.save();
  ctx.fillStyle = "rgba(214, 234, 214, 0.12)";

  for (let i = 0; i < 12; i++) {
    const x = i * 95 - (camera.x * 0.08) % 95;
    const y = 315 + Math.sin(i) * 12;

    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.arc(x + 28, y - 8, 34, 0, Math.PI * 2);
    ctx.arc(x + 60, y, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPixelMountains() {
  ctx.fillStyle = "rgba(32, 54, 64, 0.48)";

  for (let i = 0; i < 8; i++) {
    const x = i * 185 - (camera.x * 0.18) % 185;

    ctx.beginPath();
    ctx.moveTo(x - 30, 390);
    ctx.lineTo(x + 70, 220);
    ctx.lineTo(x + 170, 390);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(22, 38, 48, 0.36)";

  for (let i = 0; i < 8; i++) {
    const x = i * 240 - (camera.x * 0.12) % 240;

    ctx.beginPath();
    ctx.moveTo(x, 390);
    ctx.lineTo(x + 65, 270);
    ctx.lineTo(x + 130, 390);
    ctx.closePath();
    ctx.fill();
  }
}

function drawLargeDarkTrees() {
  if (!tilesetImg.complete) return;

  const trees = [
    { x: 80, y: 105, w: 130, h: 250, alpha: 0.45 },
    { x: 430, y: 130, w: 105, h: 220, alpha: 0.32 },
    { x: 835, y: 115, w: 120, h: 240, alpha: 0.38 },
    { x: 1280, y: 125, w: 115, h: 230, alpha: 0.34 },
    { x: 1740, y: 118, w: 120, h: 240, alpha: 0.35 }
  ];

  ctx.save();

  trees.forEach(function (tree) {
    ctx.globalAlpha = tree.alpha;

    ctx.drawImage(
      tilesetImg,
      0, 0, 80, 128,
      tree.x - camera.x * 0.16,
      tree.y,
      tree.w,
      tree.h
    );
  });

  ctx.restore();
}

function drawWaterLayer() {
  const waterY = 405;

  ctx.save();

  ctx.fillStyle = "rgba(38, 156, 183, 0.55)";
  ctx.fillRect(0, waterY, canvas.width, canvas.height - waterY);

  ctx.fillStyle = "rgba(127, 221, 235, 0.55)";

  for (let x = 0; x < canvas.width; x += 28) {
    const y = waterY + Math.sin((x + sceneTick) * 0.04) * 3;
    ctx.fillRect(x, y, 18, 3);
  }

  ctx.fillStyle = "rgba(10, 54, 76, 0.35)";

  for (let x = 0; x < canvas.width; x += 46) {
    ctx.fillRect(x, waterY + 18, 26, 4);
  }

  ctx.restore();
}

function drawFireflies() {
  ctx.save();

  fireflies.forEach(function (f) {
    const px = f.x - camera.x * 0.1;
    const py = f.y + Math.sin(sceneTick * f.speed + f.phase) * 8;
    const glow = 0.4 + 0.3 * Math.sin(sceneTick * f.speed * 1.7 + f.phase);

    ctx.fillStyle = `rgba(255, 233, 120, ${0.28 + glow})`;
    ctx.beginPath();
    ctx.arc(px, py, f.size + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 245, 180, 0.95)";
    ctx.beginPath();
    ctx.arc(px, py, f.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// ==========================
// SCRITTA INIZIALE
// ==========================

function drawIntroBackgroundText() {
  const alpha = Math.max(0, 1 - camera.x / 380);
  if (alpha <= 0) return;

  ctx.save();

  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = "#f6d56b";
  ctx.font = "bold 26px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const textX = 95 - camera.x * 0.15;
  const textY = 155;

  ctx.fillText("The forest awakens...", textX, textY);

  ctx.globalAlpha = alpha * 0.45;
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px Arial";
  ctx.fillText("Collect the lost coins and escape the enchanted woods.", textX, textY + 32);

  ctx.restore();
}

// ==========================
// PORTALE SOLO IN GAMEPLAY
// ==========================

function drawSpawnPortal() {
  const alpha = Math.max(0, 1 - camera.x / 460);
  if (alpha <= 0) return;

  const x = 70 - camera.x;
  const y = 348;
  const pulse = Math.sin(sceneTick * 0.08) * 3;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = "rgba(111, 70, 255, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, 34 + pulse, 46 + pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#24133c";
  ctx.beginPath();
  ctx.ellipse(x, y, 24, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#744cff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x, y, 24, 36, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#bca7ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 15 + pulse * 0.4, 26 + pulse * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#8a6cff";
  for (let i = 0; i < 7; i++) {
    const px = x + Math.sin(sceneTick * 0.04 + i) * 28;
    const py = y - 30 + i * 10 + Math.cos(sceneTick * 0.05 + i) * 4;

    ctx.fillRect(px, py, 3, 3);
  }

  ctx.restore();
}

// ==========================
// DISEGNO STRUTTURE / PIATTAFORME
// ==========================

function drawPlatform(platform) {
  const screenX = platform.x - camera.x;

  ctx.fillStyle = "#211933";
  ctx.fillRect(screenX, platform.y + 14, platform.width, platform.height - 14);

  ctx.fillStyle = "#d45a2e";
  ctx.fillRect(screenX, platform.y, platform.width, 10);

  ctx.fillStyle = "#ff8a3d";
  for (let x = 0; x < platform.width; x += 20) {
    ctx.fillRect(screenX + x, platform.y, 12, 5);
  }

  ctx.fillStyle = "#8b2f35";
  for (let x = 8; x < platform.width; x += 24) {
    ctx.fillRect(screenX + x, platform.y + 8, 14, 6);
  }

  ctx.fillStyle = "#2fbf5b";
  ctx.fillRect(screenX, platform.y - 4, platform.width, 5);

  ctx.fillStyle = "#67e077";
  for (let x = 0; x < platform.width; x += 26) {
    ctx.fillRect(screenX + x + 4, platform.y - 8, 4, 8);
    ctx.fillRect(screenX + x + 10, platform.y - 6, 3, 6);
  }

  ctx.fillStyle = "#38224c";
  for (let x = 0; x < platform.width; x += 34) {
    ctx.fillRect(screenX + x + 10, platform.y + 28, 16, 4);
    ctx.fillRect(screenX + x + 20, platform.y + 45, 9, 3);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(screenX, platform.y + 14, 5, platform.height - 14);
}

function drawStructureBlocks() {
  structureBlocks.forEach(function (block) {
    const screenX = block.x - camera.x;

    ctx.fillStyle = "#211933";
    ctx.fillRect(screenX, block.y, block.width, block.height);

    ctx.fillStyle = "#38224c";
    for (let y = 12; y < block.height; y += 20) {
      ctx.fillRect(screenX + 10, block.y + y, block.width - 20, 4);
    }

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(screenX + block.width - 8, block.y, 8, block.height);
  });
}

function drawLadders() {
  ladders.forEach(function (ladder) {
    const screenX = ladder.x - camera.x;

    ctx.fillStyle = "#8c5d32";
    ctx.fillRect(screenX, ladder.y, 4, ladder.height);
    ctx.fillRect(screenX + ladder.width - 4, ladder.y, 4, ladder.height);

    ctx.fillStyle = "#c99353";

    for (let y = 8; y < ladder.height; y += 14) {
      ctx.fillRect(screenX + 3, ladder.y + y, ladder.width - 6, 4);
    }
  });
}

// ==========================
// OSTACOLI
// ==========================

function drawObstacle(obstacle) {
  if (obstacle.type === "spike") {
    drawSpike(obstacle);
  } else if (obstacle.type === "crystal") {
    drawCrystal(obstacle);
  } else if (obstacle.type === "box") {
    drawCursedBox(obstacle);
  } else if (obstacle.type === "runeStone") {
    drawRuneStone(obstacle);
  }
}

function drawSpike(obstacle) {
  const screenX = obstacle.x - camera.x;

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(screenX + 2, obstacle.y + obstacle.height - 3, obstacle.width, 6);

  ctx.fillStyle = "#140f20";

  ctx.beginPath();
  ctx.moveTo(screenX, obstacle.y + obstacle.height);
  ctx.lineTo(screenX + obstacle.width * 0.28, obstacle.y);
  ctx.lineTo(screenX + obstacle.width * 0.55, obstacle.y + obstacle.height);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(screenX + obstacle.width * 0.38, obstacle.y + obstacle.height);
  ctx.lineTo(screenX + obstacle.width * 0.72, obstacle.y + 2);
  ctx.lineTo(screenX + obstacle.width, obstacle.y + obstacle.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#734cff";
  ctx.globalAlpha = 0.55;

  ctx.beginPath();
  ctx.moveTo(screenX + 8, obstacle.y + obstacle.height - 4);
  ctx.lineTo(screenX + obstacle.width * 0.28, obstacle.y + 8);
  ctx.lineTo(screenX + 17, obstacle.y + obstacle.height - 4);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawCrystal(obstacle) {
  const screenX = obstacle.x - camera.x;

  const x = screenX;
  const y = obstacle.y;
  const w = obstacle.width;
  const h = obstacle.height;

  ctx.fillStyle = "rgba(130, 90, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6d4cff";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h * 0.45);
  ctx.lineTo(x + w * 0.65, y + h);
  ctx.lineTo(x + w * 0.35, y + h);
  ctx.lineTo(x, y + h * 0.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#34216f";
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h * 0.45);
  ctx.lineTo(x + w * 0.65, y + h);
  ctx.lineTo(x + w / 2, y + h * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#cfc3ff";
  ctx.fillRect(x + w * 0.32, y + 8, 4, 14);
}

function drawCursedBox(obstacle) {
  const screenX = obstacle.x - camera.x;

  const x = screenX;
  const y = obstacle.y;
  const w = obstacle.width;
  const h = obstacle.height;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 3, y + h - 2, w, 5);

  ctx.fillStyle = "#532b25";
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "#9a4a34";
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

  ctx.fillStyle = "#2a1620";
  ctx.fillRect(x, y, w, 4);
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillRect(x, y, 4, h);
  ctx.fillRect(x + w - 4, y, 4, h);

  ctx.fillStyle = "#15101f";
  ctx.fillRect(x + 8, y + 10, 16, 10);

  ctx.fillStyle = "#ffd866";
  ctx.beginPath();
  ctx.arc(x + 16, y + 15, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1620";
  ctx.fillRect(x + 7, y + 24, 18, 3);
}

function drawRuneStone(obstacle) {
  const screenX = obstacle.x - camera.x;

  const x = screenX;
  const y = obstacle.y;
  const w = obstacle.width;
  const h = obstacle.height;

  ctx.save();

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(x + 3, y + h - 3, w, 5);

  ctx.fillStyle = "#2f3148";
  ctx.beginPath();
  ctx.moveTo(x + 5, y + h);
  ctx.lineTo(x + 2, y + 10);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w - 2, y + 10);
  ctx.lineTo(x + w - 5, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#151525";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(116, 76, 255, 0.28)";
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#bca7ff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 8);
  ctx.lineTo(x + w / 2, y + h - 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 10);
  ctx.lineTo(x + w / 2 - 7, y + 20);
  ctx.lineTo(x + w / 2, y + 26);
  ctx.lineTo(x + w / 2 + 7, y + 20);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#8a6cff";
  ctx.fillRect(x + 7, y + 9, 3, 3);
  ctx.fillRect(x + w - 10, y + 17, 3, 3);
  ctx.fillRect(x + 9, y + h - 12, 3, 3);

  ctx.restore();
}

// ==========================
// PLAYER / NEMICI / MONETE
// ==========================

function drawPlayer() {
  const screenX = player.x - camera.x;
  const spriteWidth = 32;
  const spriteHeight = 32;
  const row = 2;
  const frame = player.frame;
  const sx = frame * spriteWidth;
  const sy = row * spriteHeight;

  if (charactersImg.complete && charactersImg.naturalWidth > 0) {
    ctx.save();

    if (!player.facingRight) {
      ctx.scale(-1, 1);

      ctx.drawImage(
        charactersImg,
        sx,
        sy,
        spriteWidth,
        spriteHeight,
        -screenX - player.width,
        player.y,
        player.width,
        player.height
      );
    } else {
      ctx.drawImage(
        charactersImg,
        sx,
        sy,
        spriteWidth,
        spriteHeight,
        screenX,
        player.y,
        player.width,
        player.height
      );
    }

    ctx.restore();
  } else {
    ctx.fillStyle = "#2fbf5b";
    ctx.fillRect(screenX + 12, player.y + 10, player.width - 24, player.height - 14);

    ctx.fillStyle = "#16351f";
    ctx.fillRect(screenX + 18, player.y + 4, player.width - 36, 12);

    ctx.fillStyle = "#ffd866";
    ctx.fillRect(screenX + 23, player.y + 25, 14, 8);

    ctx.fillStyle = "#111";
    ctx.fillRect(screenX + 18, player.y + 50, 8, 10);
    ctx.fillRect(screenX + 34, player.y + 50, 8, 10);
  }
}

function drawEnemy(enemy) {
  const screenX = enemy.x - camera.x;
  const spriteWidth = 32;
  const spriteHeight = 32;
  const row = 0;
  const frame = enemy.frame;
  const sx = frame * spriteWidth;
  const sy = row * spriteHeight;

  if (charactersImg.complete && charactersImg.naturalWidth > 0) {
    ctx.save();

    if (enemy.direction < 0) {
      ctx.scale(-1, 1);

      ctx.drawImage(
        charactersImg,
        sx,
        sy,
        spriteWidth,
        spriteHeight,
        -screenX - enemy.width,
        enemy.y,
        enemy.width,
        enemy.height
      );
    } else {
      ctx.drawImage(
        charactersImg,
        sx,
        sy,
        spriteWidth,
        spriteHeight,
        screenX,
        enemy.y,
        enemy.width,
        enemy.height
      );
    }

    ctx.restore();
  } else {
    ctx.fillStyle = "orange";
    ctx.fillRect(screenX, enemy.y, enemy.width, enemy.height);
  }
}

function drawCoin(coin) {
  const screenX = coin.x - camera.x;
  const spriteWidth = 32;
  const spriteHeight = 32;
  const sx = coinFrame * spriteWidth;
  const sy = 0;

  if (coinImg.complete && coinImg.naturalWidth > 0) {
    ctx.drawImage(
      coinImg,
      sx,
      sy,
      spriteWidth,
      spriteHeight,
      screenX,
      coin.y,
      coin.size,
      coin.size
    );
  } else {
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.arc(
      screenX + coin.size / 2,
      coin.y + coin.size / 2,
      coin.size / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

// ==========================
// TRAGUARDO
// ==========================

function drawGoal() {
  const screenX = goal.x - camera.x;

  ctx.fillStyle = "#5b3924";
  ctx.fillRect(screenX + 18, goal.y - 45, 8, 85);

  ctx.fillStyle = "#ffd866";
  ctx.fillRect(screenX + 26, goal.y - 45, 42, 26);

  ctx.fillStyle = "#d4a017";
  ctx.fillRect(screenX + 26, goal.y - 45, 42, 5);

  ctx.fillStyle = "#3d5f2a";
  ctx.fillRect(screenX + 5, goal.y + 35, 45, 8);
}

// ==========================
// DRAW
// ==========================

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();

  if (gameState === "start") {
    drawTitleScreen();
    return;
  }

  if (gameState === "gameover") {
    drawGameOver();
    return;
  }

  if (gameState === "win") {
    drawWinScreen();
    return;
  }

  drawIntroBackgroundText();
  drawSpawnPortal();

  drawStructureBlocks();
  platforms.forEach(drawPlatform);
  drawLadders();

  coins.forEach(function (coin) {
    if (!coin.collected) {
      drawCoin(coin);
    }
  });

  obstacles.forEach(drawObstacle);
  enemies.forEach(drawEnemy);

  drawGoal();
  drawPlayer();
}

// ==========================
// SCHERMATE
// ==========================

function drawTitleScreen() {
  drawBackground();

  ctx.fillStyle = "rgba(5, 10, 18, 0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffd866";
  ctx.font = "38px Arial";
  ctx.fillText("Forest Coin Adventure", 205, 180);

  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText("Premi SPAZIO per iniziare", 280, 240);

  ctx.font = "16px Arial";
  ctx.fillText(
    "Raccogli le monete, usa le scale, evita i nemici e raggiungi il traguardo.",
    165,
    288
  );
}

function drawGameOver() {
  drawBackground();

  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff6c6c";
  ctx.font = "48px Arial";
  ctx.fillText("GAME OVER", 260, 185);

  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText("Punteggio: " + score, 335, 245);

  ctx.font = "18px Arial";
  ctx.fillText("Premi R o SPAZIO per ricominciare", 265, 295);
}

function drawWinScreen() {
  drawBackground();

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffd866";
  ctx.font = "48px Arial";
  ctx.fillText("HAI VINTO!", 280, 185);

  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText("Punteggio finale: " + score, 300, 245);

  ctx.font = "18px Arial";
  ctx.fillText("Premi R per giocare di nuovo", 290, 295);
}

function gameOver() {
  gameState = "gameover";
  saveHighScore();
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    document.getElementById("highScore").textContent = highScore;
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();