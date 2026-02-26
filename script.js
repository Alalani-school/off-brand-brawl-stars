// 1. UI SETUP

document.body.innerHTML = `

    <style>

        body { margin: 0; background: #0b0e11; color: white; font-family: 'Arial Black', sans-serif; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }

        #menu { text-align: center; background: rgba(0,0,0,0.9); padding: 25px; border-radius: 30px; border: 6px solid #ffcc00; z-index: 10; width: 850px; box-shadow: 0 0 50px #000; }

        .brawler-grid { display: flex; gap: 8px; justify-content: center; margin: 15px 0; flex-wrap: wrap; }

        .card { background: #2c3e50; padding: 10px; border-radius: 15px; cursor: pointer; border: 4px solid transparent; width: 115px; transition: 0.1s; font-size: 13px; }

        .card:hover { transform: scale(1.1); background: #34495e; }

        .card.selected { border-color: #00ff00; background: #1b4d3e; box-shadow: 0 0 20px #00ff00; }

        .btn { background: #ffcc00; color: #000; padding: 15px 50px; border: none; font-size: 24px; cursor: pointer; border-radius: 12px; font-weight: bold; margin-top: 15px; }

        #hud { position: absolute; top: 25px; display: none; gap: 40px; font-size: 24px; z-index: 5; background: rgba(0,0,0,0.85); padding: 12px 30px; border-radius: 25px; border: 3px solid #555; }

        #exit-btn { position: absolute; top: 25px; right: 25px; display: none; background: #e74c3c; color: white; border: none; padding: 12px 25px; font-size: 18px; border-radius: 10px; cursor: pointer; font-weight: bold; z-index: 100; }

        canvas { border: 12px solid #1a1a1a; background: #3a7d44; display: none; border-radius: 25px; box-shadow: 0 0 80px #000; cursor: crosshair; }

    </style>

    <div id="menu">

        <h1 style="color:#ffcc00; font-size: 40px; margin: 0;">BRAWLER SELECT</h1>

        <div class="brawler-grid" id="grid"></div>

        <button class="btn" id="startBtn" onclick="startGame()" style="opacity: 0.5; pointer-events: none;">BATTLE!</button>

    </div>

    <button id="exit-btn" onclick="backToMenu()">MENU ☰</button>

    <div id="hud">

        <div id="p-hp" style="color:#2ecc71">HP: --</div>

        <div id="streak-ui" style="color:#f1c40f">WINS: 0</div>

        <div id="super-ui" style="color:#e74c3c">SUPER: 0%</div>

    </div>

    <canvas id="gameCanvas" width="950" height="600"></canvas>

`;

 

const brawlers = [{n:'Shelly', i:'🤠'}, {n:'Primo', i:'🥊'}, {n:'Colt', i:'🔫'}, {n:'Poco', i:'🎸'}, {n:'Edgar', i:'🧣'}, {n:'Crow', i:'🐦'}, {n:'Mortis', i:'🦇'}, {n:'Piper', i:'☂️'}, {n:'Spike', i:'🌵'}, {n:'Emz', i:'🤳'}];

brawlers.forEach(b => {

    const d = document.createElement('div'); d.className = 'card'; d.innerHTML = `<h3>${b.i} ${b.n}</h3>`;

    d.onclick = () => selectBrawler(b.n, d); document.getElementById('grid').appendChild(d);

});

 

const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');

let gameState = "MENU", winStreak = 0, selectedClass = null, animationId = null;

let projectiles = [], enemyProjectiles = [], staticZones = [], walls = [], keys = {};

let floatingTexts = [], slashes = [], screenShake = 0, mouseX = 0, mouseY = 0;

 

let player = { x: 150, y: 300, r: 26, ammo: 3, reload: 0, super: 0, isJumping: false, jumpProg: 0, hitFlash: 0, spd: 4.5 };

let bot = { x: 800, y: 300, r: 26, hp: 50, maxHp: 50, moveTimer: 0, shootTimer: 0, targetX: 800, targetY: 300, hitFlash: 0 };

 

const rnd = (min, max) => Math.random() * (max - min) + min;

 

window.selectBrawler = (name, el) => {

    selectedClass = name;

    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));

    el.classList.add('selected');

    document.getElementById('startBtn').style.opacity = "1";

    document.getElementById('startBtn').style.pointerEvents = "auto";

};

 

window.startGame = () => {

    gameState = "PLAYING";

    document.getElementById('menu').style.display = "none";

    canvas.style.display = "block";

    document.getElementById('hud').style.display = "flex";

    document.getElementById('exit-btn').style.display = "block";

   

    const stats = {

        Shelly: { hp: 100, spd: 4.6, clr: '#3498db', dmg: 7, rel: 45, chrg: 7 },

        Primo:  { hp: 240, spd: 4.4, clr: '#f39c12', dmg: 16, rel: 35, chrg: 9 },

        Colt:   { hp: 80,  spd: 5.6, clr: '#e74c3c', dmg: 5,  rel: 55, chrg: 4 },

        Poco:   { hp: 120, spd: 4.8, clr: '#9b59b6', dmg: 5.5, rel: 55, chrg: 8 },

        Edgar:  { hp: 95,  spd: 5.8, clr: '#34495e', dmg: 13, rel: 22, chrg: 11 },

        Crow:   { hp: 75,  spd: 5.8, clr: '#2c3e50', dmg: 4,  rel: 42, chrg: 6 },

        Mortis: { hp: 170, spd: 5.5, clr: '#8e44ad', dmg: 14, rel: 60, chrg: 20 },

        Piper:  { hp: 70,  spd: 4.6, clr: '#3498db', dmg: 14, rel: 70, chrg: 25 },

        Spike:  { hp: 75,  spd: 4.6, clr: '#27ae60', dmg: 11, rel: 55, chrg: 12 },

        Emz:    { hp: 110, spd: 4.6, clr: '#a29bfe', dmg: 3.7, rel: 50, chrg: 10 }

    }[selectedClass];

   

    Object.assign(player, { ...stats, maxHp: stats.hp, super: 0 });

    walls = [{x: 220, y: 180, w: 60, h: 140}, {x: 670, y: 280, w: 60, h: 140}, {x: 445, y: 60, w: 60, h: 180}, {x: 445, y: 360, w: 60, h: 180}];

    resetRound();

    gameLoop();

};

 

function resetRound() {

    player.x = 150; player.y = 300; player.hp = player.maxHp;

    bot.hp = bot.maxHp = 50 + (winStreak * 25); bot.x = 800; bot.y = 300;

    projectiles = []; enemyProjectiles = []; staticZones = []; slashes = [];

}

 

window.backToMenu = () => {

    gameState = "MENU"; winStreak = 0;

    cancelAnimationFrame(animationId);

    document.getElementById('menu').style.display = "block";

    canvas.style.display = "none"; document.getElementById('hud').style.display = "none";

    document.getElementById('exit-btn').style.display = "none";

};

 

canvas.onmousemove = (e) => { const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; };

 

canvas.onclick = () => {

    if (player.ammo <= 0 || player.isJumping || gameState !== "PLAYING") return;

    const ang = Math.atan2(mouseY - player.y, mouseX - player.x);

   

    if (['Primo', 'Edgar'].includes(selectedClass)) { performMelee(ang); }

    else if (selectedClass === 'Mortis') {

        let nx = player.x + Math.cos(ang) * 115, ny = player.y + Math.sin(ang) * 115;

        if (!checkWall(nx, ny, 20)) { player.x = nx; player.y = ny; }

        if (Math.hypot(player.x - bot.x, player.y - bot.y) < 85) hitEnemy(player.dmg);

        slashes.push({x: player.x, y: player.y, ang: ang, life: 10, r: 60, clr: 'rgba(255,255,255,0.4)'});

    }

    else if (selectedClass === 'Emz') {

        for(let i=1; i<=3; i++) {

            const cloudX = player.x + Math.cos(ang)*(i*60);

            const cloudY = player.y + Math.sin(ang)*(i*60);

            if (!checkWall(cloudX, cloudY, 15)) {

                setTimeout(() => {

                    staticZones.push({ x: cloudX, y: cloudY, r: 55, clr: 'rgba(162, 155, 254, 0.7)', life: 30, dmg: player.dmg, isSpray: true });

                }, i*40);

            } else { break; }

        }

    }

    else if (selectedClass === 'Poco') { for(let i=-0.6; i<=0.6; i+=0.15) spawnBullet(player.x, player.y, ang+i, 10, '#d1ff00', player.dmg, 28, 18); }

    else if (selectedClass === 'Spike') spawnBullet(player.x, player.y, ang, 14, '#27ae60', player.dmg, 45, 18, {isSpike: true});

    else if (selectedClass === 'Shelly') { for(let i=-0.4; i<=0.4; i+=0.2) spawnBullet(player.x, player.y, ang+i, 13, '#ff0', player.dmg, 25, 8); }

    else if (selectedClass === 'Colt') { for(let i=0; i<6; i++) setTimeout(() => spawnBullet(player.x, player.y, ang, 18, '#fff', player.dmg, 50, 7), i*80); }

    else if (selectedClass === 'Crow') { for(let i=-0.25; i<=0.25; i+=0.25) spawnBullet(player.x, player.y, ang+i, 15, '#e74c3c', player.dmg, 35, 7, {isCrow: true}); }

    else if (selectedClass === 'Piper') spawnBullet(player.x, player.y, ang, 24, '#fff', player.dmg, 60, 6, {isPiper: true});

 

    player.ammo--; player.reload = player.rel;

};

 

function performMelee(ang) {

    const range = 110;

    slashes.push({x: player.x, y: player.y, ang: ang, life: 12, r: range, clr: 'rgba(255,0,0,0.3)'});

    const dist = Math.hypot(player.x - bot.x, player.y - bot.y);

    const angToBot = Math.atan2(bot.y - player.y, bot.x - player.x);

    let diff = Math.abs(ang - angToBot);

    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

    if (dist < range + 20 && diff < 1.1) { hitEnemy(player.dmg); }

}

 

function hitEnemy(dmg) {

    bot.hp -= dmg; bot.hitFlash = 6;

    player.super = Math.min(100, player.super + player.chrg);

    createFloatingText(bot.x, bot.y - 40, dmg.toFixed(1), "#ff0");

    screenShake = Math.max(screenShake, dmg * 0.4);

}

 

function triggerSuper() {

    if (player.super < 100 || player.isJumping || gameState !== "PLAYING") return;

    const ang = Math.atan2(mouseY - player.y, mouseX - player.x);

    player.super = 0;

    screenShake = 15;

   

    if (selectedClass === 'Emz') {

        staticZones.push({ x: player.x, y: player.y, r: 230, clr: 'rgba(108, 92, 231, 0.4)', life: 200, dmg: 4, followPlayer: true });

    }

    else if (selectedClass === 'Mortis') {

        spawnBullet(player.x, player.y, ang, 12, '#a29bfe', 30, 60, 35, {isMortisSuper: true});

    }

    else if (selectedClass === 'Poco') {

        for(let i=-1.2; i<=1.2; i+=0.2) spawnBullet(player.x, player.y, ang+i, 9, '#00ff00', 0, 40, 30, {isHeal: true});

        player.hp = Math.min(player.maxHp, player.hp + 50);

    }

    else if (['Piper', 'Crow', 'Edgar', 'Primo'].includes(selectedClass)) {

        player.isJumping = true; player.jumpProg = 0;

        const sX = player.x, sY = player.y, tX = Math.max(60, Math.min(890, mouseX)), tY = Math.max(60, Math.min(540, mouseY));

       

        // PIPER BOMB DROP

        if(selectedClass === 'Piper') {

             for(let i=0; i<4; i++) {

                setTimeout(() => {

                    staticZones.push({ x: sX + rnd(-30,30), y: sY + rnd(-30,30), r: 80, clr: '#000', life: 40, dmg: 25, isBomb: true });

                }, i*50);

             }

        }

 

        let jInt = setInterval(() => {

            player.jumpProg += 0.04;

            player.x = sX + (tX - sX) * player.jumpProg; player.y = sY + (tY - sY) * player.jumpProg;

            if (player.jumpProg >= 1) {

                clearInterval(jInt); player.isJumping = false; screenShake = 25;

               

                // ANTI-WALL GLITCH LOGIC

                if(checkWall(player.x, player.y, player.r)) {

                    let safe = findSafeSpot(player.x, player.y);

                    player.x = safe.x; player.y = safe.y;

                }

 

                if (selectedClass === 'Primo') { if (Math.hypot(player.x-bot.x, player.y-bot.y)<140) hitEnemy(50); }

            }

        }, 20);

    }

    else if (selectedClass === 'Shelly') { for(let i=-1; i<=1; i+=0.12) spawnBullet(player.x, player.y, ang+i, 16, '#f0f', 15, 38, 12); }

}

 

function findSafeSpot(x, y) {

    let dist = 10;

    while(dist < 200) {

        for(let a=0; a<Math.PI*2; a+=Math.PI/4) {

            let tx = x + Math.cos(a)*dist, ty = y + Math.sin(a)*dist;

            if(!checkWall(tx, ty, 26)) return {x: tx, y: ty};

        }

        dist += 15;

    }

    return {x: 150, y: 300}; // Emergency reset to start

}

 

function spawnBullet(x, y, ang, spd, clr, dmg, life, size=8, extra={}) {

    projectiles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, clr, dmg, life, size, startX: x, startY: y, ...extra });

}

 

function gameLoop() {

    if (gameState !== "PLAYING") return;

    update(); draw();

    animationId = requestAnimationFrame(gameLoop);

}

 

function update() {

    if (selectedClass === 'Edgar') player.super = Math.min(100, player.super + 0.08);

    const angToP = Math.atan2(player.y - bot.y, player.x - bot.x);

    if (--bot.moveTimer <= 0) {

        bot.targetX = Math.max(60, Math.min(890, player.x + rnd(-250, 250)));

        bot.targetY = Math.max(60, Math.min(540, player.y + rnd(-250, 250)));

        bot.moveTimer = 35;

    }

    let bvx = (bot.targetX - bot.x)*0.045, bvy = (bot.targetY - bot.y)*0.045;

    if (!checkWall(bot.x + bvx, bot.y, bot.r)) bot.x += bvx;

    if (!checkWall(bot.x, bot.y + bvy, bot.r)) bot.y += bvy;

   

    if (++bot.shootTimer > 95) { enemyProjectiles.push({ x: bot.x, y: bot.y, vx: Math.cos(angToP)*8, vy: Math.sin(angToP)*8, clr: '#f44', dmg: 8, life: 60, size: 10 }); bot.shootTimer = 0; }

   

    if (!player.isJumping) {

        let nx = player.x, ny = player.y;

        if (keys['w'] || keys['arrowup']) ny -= player.spd;

        if (keys['s'] || keys['arrowdown']) ny += player.spd;

        if (keys['a'] || keys['arrowleft']) nx -= player.spd;

        if (keys['d'] || keys['arrowright']) nx += player.spd;

        if (!checkWall(nx, player.y, player.r) && nx > 30 && nx < 920) player.x = nx;

        if (!checkWall(player.x, ny, player.r) && ny > 30 && ny < 570) player.y = ny;

    }

   

    if (player.ammo < 3 && --player.reload <= 0) { player.ammo++; player.reload = player.rel; }

   

    staticZones.forEach(z => {

        if (z.followPlayer) { z.x = player.x; z.y = player.y; }

        if(Math.hypot(bot.x-z.x, bot.y-z.y) < z.r) {

            if(z.isBomb && z.life === 1) hitEnemy(z.dmg); // Piper Super Explodes

            else if (!z.isBomb && z.life % 15 === 0) hitEnemy(z.dmg);

        }

        z.life--;

    });

    staticZones = staticZones.filter(z => z.life > 0);

    handleProjectiles(projectiles, bot, true);

    handleProjectiles(enemyProjectiles, player, false);

    if (bot.hp <= 0) { winStreak++; resetRound(); screenShake = 20; }

    if (player.hp <= 0) { backToMenu(); }

}

 

function handleProjectiles(list, target, isP) {

    for(let i=list.length-1; i>=0; i--) {

        let b = list[i]; b.x += b.vx; b.y += b.vy; b.life--;

        if (checkWall(b.x, b.y, b.size)) { list.splice(i, 1); continue; }

        if (Math.hypot(b.x - target.x, b.y - target.y) < target.r + b.size && !player.isJumping) {

            if (b.isHeal) { player.hp = Math.min(player.maxHp, player.hp + 8); }

            else if (b.isMortisSuper) {

                hitEnemy(b.dmg);

                player.hp = Math.min(player.maxHp, player.hp + b.dmg);

            }

            else {

                if (isP) hitEnemy(b.dmg);

                else { target.hp -= b.dmg; target.hitFlash = 6; screenShake = 4; }

                createFloatingText(target.x, target.y - 40, b.dmg.toFixed(1), isP ? "#ff0" : "#f44");

            }

            if (!b.isMortisSuper) list.splice(i, 1);

        } else if (b.life <= 0) {

            if (b.isSpike) { for(let j=0; j<Math.PI*2; j+=Math.PI/3) spawnBullet(b.x, b.y, j, 11, '#27ae60', b.dmg*0.6, 25, 10); }

            list.splice(i, 1);

        }

    }

}

 

function checkWall(x, y, r) { return walls.some(w => x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h); }

 

function draw() {

    ctx.save(); if (screenShake > 0) { ctx.translate(rnd(-screenShake, screenShake), rnd(-screenShake, screenShake)); screenShake *= 0.88; }

    ctx.clearRect(-100, -100, canvas.width+200, canvas.height+200);

    staticZones.forEach(z => {

        ctx.fillStyle = z.isBomb ? (z.life < 10 ? "white" : "red") : z.clr;

        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();

    });

    walls.forEach(w => { ctx.fillStyle = '#636e72'; ctx.fillRect(w.x, w.y, w.w, w.h); });

    slashes.forEach((s, i) => { ctx.strokeStyle = s.clr; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, s.ang - 0.8, s.ang + 0.8); ctx.stroke(); s.life--; if (s.life <= 0) slashes.splice(i, 1); });

    projectiles.concat(enemyProjectiles).forEach(b => {

        ctx.fillStyle = b.clr;

        ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); ctx.fill();

    });

    const icons = {Shelly:'🤠',Primo:'🥊',Colt:'🔫',Poco:'🎸',Edgar:'🧣',Crow:'🐦',Mortis:'🦇',Piper:'☂️',Spike:'🌵',Emz:'🤳'};

    drawEnt(bot.x, bot.y, bot.hitFlash > 0 ? "white" : "#555", bot.hp, bot.maxHp, "🤖", 1);

    drawEnt(player.x, player.y, player.hitFlash > 0 ? "white" : player.clr, player.hp, player.maxHp, icons[selectedClass], player.isJumping ? 2.2 : 1);

    floatingTexts.forEach((t, i) => { t.y += t.vy; t.life--; ctx.fillStyle = t.clr; ctx.font="bold 24px Arial"; ctx.fillText(t.text, t.x, t.y); if (t.life <= 0) floatingTexts.splice(i, 1); });

    ctx.restore();

    if (bot.hitFlash > 0) bot.hitFlash--;

    document.getElementById('p-hp').innerText = `HP: ${Math.round(player.hp)}`;

    document.getElementById('streak-ui').innerText = `WINS: ${winStreak}`;

    document.getElementById('super-ui').innerText = `SUPER: ${Math.floor(player.super)}%`;

}

 

function createFloatingText(x, y, text, clr) { floatingTexts.push({ x, y, text, clr, life: 40, vy: -2 }); }

 

function drawEnt(x, y, clr, hp, max, ico, sc) {

    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);

    ctx.fillStyle = clr; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = "white"; ctx.font = "24px Arial"; ctx.fillText(ico, -14, 10); ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(x-35, y-55, 70, 10);

    ctx.fillStyle = hp/max > 0.3 ? "#2ecc71" : "#e74c3c"; ctx.fillRect(x-35, y-55, Math.max(0, (hp/max)*70), 10);
}
window.onkeydown = (e) => {

    keys[e.key.toLowerCase()] = true;

    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); triggerSuper(); }

};

window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;
