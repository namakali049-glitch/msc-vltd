// ==========================================
// ĐỘNG CƠ BÍ CẢNH TRẢM YÊU (CANVAS 2D) - MÔ-ĐUN ĐỘC LẬP
// ==========================================
let battleAnimationFrame = null;
let battleData = {
    player: { x: 400, y: 300, radius: 24 },
    orbitAngle: 0,
    swords: [],
    enemies: [],
    particles: [],
    textPopups: [], 
    drops: [],
    projectiles: [],
    aimState: { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0 },
    screenShake: 0,
    damageFlash: 0,
    kills: 0,
    frameCount: 0
};

const moveDir = { up: false, down: false, left: false, right: false };
window.analogMove = { x: 0, y: 0 }; 

window.setMoveDir = function(dir, active) {
    if (moveDir.hasOwnProperty(dir)) {
        moveDir[dir] = active;
    }
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveDir.up = true;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDir.down = true;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveDir.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveDir.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveDir.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDir.down = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveDir.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveDir.right = false;
});

const battleAssets = {
    bg: new Image(),
    playerPhamNhan: new Image(),
    playerLuyenKhi: new Image(),
    playerTrucCo: new Image(),
    playerTrucCoTrungKy: new Image(),
    playerTrucCoVienMan: new Image(),
    playerKimDan: new Image(),        
    playerNguyenAnh: new Image(),     
    swordWood: new Image(),
    swordCyan: new Image(),
    swordKimDan: new Image(),         
    swordNguyenAnh: new Image(),      
    enemyGhost: new Image()
    enemyCoDauMa: new Image(),
    enemyBoss: new Image()
};

battleAssets.bg.src = "assets/hac-am-son-dong.png";
battleAssets.playerPhamNhan.src = "assets/pham-nhan.png";
battleAssets.playerLuyenKhi.src = "assets/luyen-khi.png";
battleAssets.playerTrucCo.src = "assets/truc-co.png";
battleAssets.playerTrucCoTrungKy.src = "assets/truc-co-trung-ky.png";
battleAssets.playerTrucCoVienMan.src = "assets/truc-co-vien-man.png";
battleAssets.playerKimDan.src = "assets/kim-dan-ky.png";              
battleAssets.playerNguyenAnh.src = "assets/nguyen-anh-ky.png";          
battleAssets.swordWood.src = "assets/kiem-khi-luyen-khi.png";
battleAssets.swordCyan.src = "assets/kiem-khi-truc-co.png";
battleAssets.swordKimDan.src = "assets/kim-dan-kiem-khi.png";       
battleAssets.swordNguyenAnh.src = "assets/nguyen-anh-kiem-khi.png"; 
battleAssets.enemyGhost.src = "assets/quy-hon.png";
battleAssets.enemyCoDauMa.src = "assets/co-dau-ma.png"; // Ảnh quái mới
battleAssets.enemyBoss.src = "assets/boss.png";         // Ảnh Boss mới
function getBattleCharacterSkin() {
    const mana = window.lifetimeMana || 0;
    if (mana >= 50000) return battleAssets.playerNguyenAnh;
    if (mana >= 12000) return battleAssets.playerKimDan;
    if (mana >= 4000) return battleAssets.playerTrucCoVienMan;
    if (mana >= 1500) return battleAssets.playerTrucCoTrungKy;
    if (mana >= 600) return battleAssets.playerTrucCo;
    if (mana >= 20) return battleAssets.playerLuyenKhi;
    return battleAssets.playerPhamNhan;
}

function getBattleSwordSkin() {
    const mana = window.lifetimeMana || 0;
    if (mana >= 50000) return battleAssets.swordNguyenAnh; 
    if (mana >= 12000) return battleAssets.swordKimDan;    
    if (mana >= 600) return battleAssets.swordCyan; // Đã sửa thành 600 (Trúc Cơ Sơ Kỳ)
    return battleAssets.swordWood;                         
}
const battleCanvas = document.getElementById('gameCanvas');
const battleCtx = battleCanvas ? battleCanvas.getContext('2d') : null;

function resizeBattleCanvas() {
    if (!battleCanvas) return;
    battleCanvas.width = window.innerWidth;
    battleCanvas.height = window.innerHeight;
    
    if (battleCtx) {
        // Tắt tính năng làm mờ để giữ viền pixel sắc nét
        battleCtx.imageSmoothingEnabled = false;
    }
    // Ép trình duyệt render theo khối pixel
    battleCanvas.style.imageRendering = "pixelated"; 
}

window.startBattle = function() {
    if (window.playClickSound) window.playClickSound();
    if (window.recalcStats) window.recalcStats();

    const realmFunc = window.calculateRealm || (typeof calculateRealm === 'function' ? calculateRealm : null);
    const realm = realmFunc ? realmFunc(window.lifetimeMana || 0) : "Phàm Nhân";
    if (realm === "Phàm Nhân") {
        alert("⚠️ Đạo hữu hiện tại là Phàm Nhân, chưa ngưng tụ đủ Linh Lực nên không thể ngự kiếm!\n\nHãy vào Động Phủ vận khí 10 chu thiên để đạt 20 Linh Lực (Luyện Khí Sơ Kỳ).");
        return;
    }

    if (window.switchScreen) window.switchScreen('battle-screen');
    
    const invBtn = document.querySelector('.fixed-inventory-btn');
    const topBar = document.querySelector('.fixed-top-right-bar');
    if (invBtn) invBtn.style.display = 'none';
    if (topBar) topBar.style.display = 'none';
    resizeBattleCanvas();
    
    const swordCountFunc = window.getSwordCount || (typeof getSwordCount === 'function' ? getSwordCount : () => 1);
    const count = swordCountFunc(window.thanThuc || 0);
    const dmg = window.swordDamage || 10;
    battleData.swords = Array.from({ length: count }, () => ({
        active: true,
        durability: dmg,
        maxDurability: dmg
    }));

    battleData.enemies = [];
    battleData.particles = [];
    battleData.textPopups = [];
    battleData.drops = [];
    battleData.projectiles = [];
    battleData.aimState = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dirX: 0, dirY: 0 };

    const skillWrap = document.getElementById('skillControlWrapper');
    const hasSkill = window.learnedSkills && window.learnedSkills.includes('skill_ngu_kiem');
    if (skillWrap) {
        skillWrap.style.display = hasSkill ? 'flex' : 'none';
    }
    
    initControls();

    battleData.kills = 0;
    battleData.orbitAngle = 0;
    battleData.frameCount = 0;
    battleData.screenShake = 0;
    battleData.damageFlash = 0;
    battleData.clearedPopup = false; 
    battleData.isExiting = false;    
    moveDir.up = moveDir.down = moveDir.left = moveDir.right = false;
    window.analogMove = { x: 0, y: 0 };
    
    battleData.player.x = battleCanvas.width / 2;
    battleData.player.y = battleCanvas.height / 2;

    if (window.currentHp === undefined || window.currentHp <= 0) {
        window.currentHp = window.maxHp || 100;
    }

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmName = window.calculateRealm ? window.calculateRealm(window.lifetimeMana || 0, countA1, countB1) : "Luyện Khí";
    const playerName = (window.currentUser && (window.currentUser.displayName || (window.currentUser.email && window.currentUser.email.split('@')[0]))) || "Đạo Hữu";

    const bName = document.getElementById('battleName');
    const bBadge = document.getElementById('battleRealmBadge');
    const bAvatar = document.getElementById('battleAvatar');
    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan-1.png");

    if (bName) bName.innerText = playerName;
    if (bBadge) bBadge.innerText = realmName;
    if (bAvatar) bAvatar.src = avatarFunc(window.lifetimeMana || 0);

    window.currentLinhLuc = window.maxLinhLuc || 0;

    if (battleAnimationFrame) cancelAnimationFrame(battleAnimationFrame);
    battleLoop();
};

window.exitBattle = function(isDeath = false, isVictory = false) {
    if (window.playClickSound) window.playClickSound();
    if (battleAnimationFrame) cancelAnimationFrame(battleAnimationFrame);

    const skillWrap = document.getElementById('skillControlWrapper');
    if (skillWrap) skillWrap.style.display = 'none';
    battleData.aimState.active = false;

    const invBtn = document.querySelector('.fixed-inventory-btn');
    const topBar = document.querySelector('.fixed-top-right-bar');
    if (invBtn) invBtn.style.display = 'block';
    if (topBar) topBar.style.display = 'flex'; 
    moveDir.up = moveDir.down = moveDir.left = moveDir.right = false;
    window.analogMove = { x: 0, y: 0 };

    const survivalSec = Math.floor(battleData.frameCount / 60);
    const formatTimeFunc = window.formatTime || ((s) => `${Math.floor(s/60)}:${s%60}`);

    let recordNotice = "";
    if (window.recordBattleResult) {
        const isNewRecord = window.recordBattleResult(survivalSec, battleData.kills);
        if (isNewRecord) {
            recordNotice = "\n🔥 LẬP KỶ LỤC MỚI TRÊN TIÊN ĐẠO BẢNG!";
        }
    }

    let titleMsg = "🚪 Đạo hữu đã an toàn rút khỏi Bí Cảnh!";
    if (isDeath) titleMsg = "💥 Đạo thể tổn hao nặng nề! Buộc phải rút lui.";
    if (isVictory) titleMsg = "🏆 TUYỆT VỜI! ĐẠO HỮU ĐÃ QUÉT SẠCH BÍ CẢNH!";

    alert(`${titleMsg}\n\n📊 KẾT QUẢ VÁN ĐẤU:\n⏱️ Thời gian sống sót: ${formatTimeFunc(survivalSec)}\n👾 Ma vật đã trảm: ${battleData.kills} con${recordNotice}`);

    if (window.syncManaToDatabase) window.syncManaToDatabase();
    if (window.goHome) window.goHome();
};

function spawnBattleEnemy() {
    if (!battleCanvas) return;
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : battleCanvas.width + 30;
        y = Math.random() * battleCanvas.height;
    } else {
        x = Math.random() * battleCanvas.width;
        y = Math.random() < 0.5 ? -30 : battleCanvas.height + 30;
    }
    battleData.enemies.push({
        x: x, 
        y: y, 
        radius: 18,
        speed: 1.8, // Đồng bộ tuyệt đối: toàn bộ ma vật cùng chung một vận tốc chuẩn 
        hp: 20, 
        maxHp: 20,
        biteCooldown: 0
    });
}

function spawnDeathParticles(x, y, color = "#00d2d3") {
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        battleData.particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: color
        });
    }
}

function battleLoop() {
    if (!battleCtx) return;
    battleData.frameCount++;
    const survivalSec = Math.floor(battleData.frameCount / 60);
    const agi = window.agi || 1;
    const swordDmg = window.swordDamage || 10;
    const maxHp = window.maxHp || 100;

    let shakeX = 0, shakeY = 0;
    if (battleData.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * battleData.screenShake;
        shakeY = (Math.random() - 0.5) * battleData.screenShake;
        battleData.screenShake *= 0.85;
        if (battleData.screenShake < 0.5) battleData.screenShake = 0;
    }

    battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);
    
    battleCtx.save();
    battleCtx.translate(shakeX, shakeY);

    let moveX = window.analogMove.x || 0;
    let moveY = window.analogMove.y || 0;

    if (moveX === 0 && moveY === 0) {
        if (moveDir.up) moveY -= 1;
        if (moveDir.down) moveY += 1;
        if (moveDir.left) moveX -= 1;
        if (moveDir.right) moveX += 1;
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }
    }

    const pSpeed = 4.5 + (agi * 0.05);
    battleData.player.x += moveX * pSpeed;
    battleData.player.y += moveY * pSpeed;

    battleData.player.x = Math.max(35, Math.min(battleCanvas.width - 35, battleData.player.x));
    battleData.player.y = Math.max(45, Math.min(battleCanvas.height - 45, battleData.player.y));

    if (battleAssets.bg.complete && battleAssets.bg.naturalWidth > 0) {
        battleCtx.drawImage(battleAssets.bg, 0, 0, battleCanvas.width, battleCanvas.height);
    } else {
        battleCtx.fillStyle = "#0c1017";
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
    }

    for (let i = battleData.particles.length - 1; i >= 0; i--) {
        const p = battleData.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) {
            battleData.particles.splice(i, 1);
            continue;
        }
        battleCtx.beginPath();
        battleCtx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
        battleCtx.fillStyle = p.color;
        battleCtx.globalAlpha = p.life;
        battleCtx.fill();
        battleCtx.globalAlpha = 1.0;
    }

    for (let i = battleData.textPopups.length - 1; i >= 0; i--) {
        const tp = battleData.textPopups[i];
        tp.y -= 0.8; 
        tp.life -= 1;
        if (tp.life <= 0) {
            battleData.textPopups.splice(i, 1);
            continue;
        }
        battleCtx.save();
        battleCtx.globalAlpha = tp.life / 60;
        battleCtx.fillStyle = tp.color || "#ffd700";
        battleCtx.font = "bold 16px Arial";
        battleCtx.textAlign = "center";
        battleCtx.strokeStyle = "black";
        battleCtx.lineWidth = 2;
        battleCtx.strokeText(tp.text, tp.x, tp.y);
        battleCtx.fillText(tp.text, tp.x, tp.y);
        battleCtx.restore();
    }

    for (let i = battleData.drops.length - 1; i >= 0; i--) {
        const drop = battleData.drops[i];
        drop.life--;
        if (drop.life <= 0) {
            battleData.drops.splice(i, 1);
            continue;
        }

        drop.bob += 0.1;
        const offsetY = Math.sin(drop.bob) * 4;

        battleCtx.save();
        battleCtx.globalAlpha = Math.min(1.0, drop.life / 60); 
        battleCtx.font = "18px Arial";
        battleCtx.textAlign = "center";
        battleCtx.textBaseline = "middle";
        battleCtx.fillText("💎", drop.x, drop.y + offsetY);
        battleCtx.restore();

        const ddist = Math.hypot(battleData.player.x - drop.x, battleData.player.y - drop.y);
        if (ddist < battleData.player.radius + drop.radius + 15) { 
            if (drop.type === 'linh_thach') {
            // Giảm lượng Linh Thạch mỗi khối: Random từ 1 đến tối đa 5 viên
            const amount = 1 + Math.floor(Math.random() * 5); 
            if (window.updateLinhThach) window.updateLinhThach(amount);
                
                battleData.textPopups.push({
                    x: battleData.player.x,
                    y: battleData.player.y - 30,
                    text: `+${amount} 💎`,
                    color: "#22d3ee",
                    life: 60
                });
                if (window.playClickSound) window.playClickSound(); 
            }
            battleData.drops.splice(i, 1);
        }
    }

    if (battleData.aimState && battleData.aimState.active) {
        const adx = battleData.aimState.dirX || 1;
        const ady = battleData.aimState.dirY || 0;
        
        battleCtx.save();
        battleCtx.beginPath();
        battleCtx.setLineDash([8, 6]);
        battleCtx.moveTo(battleData.player.x, battleData.player.y);
        battleCtx.lineTo(battleData.player.x + adx * 220, battleData.player.y + ady * 220);
        battleCtx.strokeStyle = "#22d3ee";
        battleCtx.lineWidth = 3;
        battleCtx.stroke();

        battleCtx.beginPath();
        battleCtx.arc(battleData.player.x + adx * 220, battleData.player.y + ady * 220, 6, 0, Math.PI * 2);
        battleCtx.fillStyle = "#ffd700";
        battleCtx.fill();
        battleCtx.restore();
    }

    // 1. XỬ LÝ SÁT THƯƠNG NGỰ KIẾM THUẬT (KIẾM BAY)
    const pSwordImg = getBattleSwordSkin();
    if (battleData.projectiles) {
        for (let pIdx = battleData.projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = battleData.projectiles[pIdx];
            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.life--;

            battleCtx.save();
            battleCtx.translate(proj.x, proj.y);
            battleCtx.rotate(proj.angle + Math.PI / 2);
           if (pSwordImg.complete && pSwordImg.naturalWidth > 0) {
                // Phóng to kiếm bay lên cỡ 24x64
                battleCtx.drawImage(pSwordImg, -12, -32, 24, 64);
            } else {
                battleCtx.fillStyle = "#ffd700";
                battleCtx.fillRect(-6, -26, 12, 52);
            }
            battleCtx.restore();

            for (let eIdx = battleData.enemies.length - 1; eIdx >= 0; eIdx--) {
                const en = battleData.enemies[eIdx];
                if (!proj.hitList.has(en)) {
                    const dist = Math.hypot(proj.x - en.x, proj.y - en.y);
                    if (dist < en.radius + 18) {
                        proj.hitList.add(en);

                        // Trừ độ bền phi kiếm bay theo lượng HP của quái
                        if (proj.durability >= en.hp) {
                            proj.durability -= en.hp;
                            en.hp = 0;
                        } else {
                            en.hp -= proj.durability;
                            proj.durability = 0;
                        }
                        
                        en.x += Math.cos(proj.angle) * 35;
                        en.y += Math.sin(proj.angle) * 35;
                        spawnDeathParticles(en.x, en.y, "#ffd700");

                        if (en.hp <= 0) {
                            spawnDeathParticles(en.x, en.y, "#00d2d3");
                            battleData.enemies.splice(eIdx, 1);
                            battleData.kills++;

                            // Rớt Linh Thạch
                            if (Math.random() * 100 < 10.0) {
                                battleData.drops.push({
                                    x: en.x, y: en.y, radius: 12, type: 'linh_thach',
                                    life: 600, bob: Math.random() * Math.PI * 2
                                });
                            }

                            // Rớt đan dược (Đã giảm tỷ lệ & xóa đan thuộc tính)
                            if (!window.inventory) window.inventory = {};
                            const roll = Math.random() * 100;
                            let droppedItem = null;

                            // Tỷ lệ mới: Hồi Huyết (0.5%), Hồi Khí (0.5%), Tụ Linh (0.2%)
                            if (roll < 0.5) droppedItem = "hoi_huyet_dan";
                            else if (roll < 1.0) droppedItem = "hoi_khi_dan";
                            else if (roll < 1.2) droppedItem = "tu_linh_dan";

                            if (droppedItem) {
                                window.inventory[droppedItem] = (window.inventory[droppedItem] || 0) + 1;
                                const itemName = window.ITEM_DATABASE ? window.ITEM_DATABASE[droppedItem].name : "Vật phẩm";
                                const itemColor = window.ITEM_DATABASE ? window.ITEM_DATABASE[droppedItem].color : "#ffd700";
                                battleData.textPopups.push({
                                    x: en.x,
                                    y: en.y,
                                    text: `+ ${itemName}`,
                                    color: itemColor,
                                    life: 60
                                });
                            }
                        }

                        if (proj.durability <= 0) break;
                    }
                }
            }

            const outScreen = proj.x < -60 || proj.x > battleCanvas.width + 60 || proj.y < -60 || proj.y > battleCanvas.height + 60;
            if (proj.durability <= 0 || proj.life <= 0 || outScreen) {
                spawnDeathParticles(proj.x, proj.y, "#22d3ee");
                battleData.projectiles.splice(pIdx, 1);
            }
        }
    }

    // Vẽ nhân vật
    const pImg = getBattleCharacterSkin();
    battleCtx.save();
    const bobbingY = Math.sin(battleData.frameCount * 0.12) * 4;
    battleCtx.translate(battleData.player.x, battleData.player.y + bobbingY);

    if (pImg.complete && pImg.naturalWidth > 0) {
        battleCtx.drawImage(pImg, -35, -45, 70, 70);
    } else {
        battleCtx.beginPath();
        battleCtx.arc(0, 0, 22, 0, Math.PI * 2);
        battleCtx.fillStyle = "#ffa502";
        battleCtx.fill();
    }
    battleCtx.restore();

    // 2. XỬ LÝ SÁT THƯƠNG KIẾM HỘ THỂ (KIẾM XOAY)
    let activeSwordCount = 0;
    const orbitRadius = 75;
    const rotSpeed = 0.04 + (agi * 0.0008);
    battleData.orbitAngle += rotSpeed;
    const swordImg = getBattleSwordSkin();

    battleData.swords.forEach((sword, index) => {
        const angle = battleData.orbitAngle + (index * (Math.PI * 2 / battleData.swords.length));
        const sx = battleData.player.x + Math.cos(angle) * orbitRadius;
        const sy = battleData.player.y + Math.sin(angle) * orbitRadius;

        if (sword.active) {
            activeSwordCount++;
            battleCtx.save();
            battleCtx.translate(sx, sy);
            battleCtx.rotate(angle + Math.PI / 2);

            if (swordImg.complete && swordImg.naturalWidth > 0) {
                // Phóng to kiếm xoay lên cỡ 24x64
                battleCtx.drawImage(swordImg, -12, -32, 24, 64);
            } else {
                battleCtx.fillStyle = "#00d2d3";
                battleCtx.fillRect(-5, -20, 10, 40);
            }
            battleCtx.restore();

            for (let i = battleData.enemies.length - 1; i >= 0; i--) {
                const en = battleData.enemies[i];
                if (Math.hypot(sx - en.x, sy - en.y) < en.radius + 15) {
                    
                    const kdx = en.x - battleData.player.x;
                    const kdy = en.y - battleData.player.y;
                    const kdist = Math.hypot(kdx, kdy);
                    if (kdist > 0.001) {
                        en.x += (kdx / kdist) * 25;
                        en.y += (kdy / kdist) * 25;
                    }

                    // Trừ độ bền phi kiếm xoay theo lượng HP của quái
                    if (sword.durability >= en.hp) {
                        sword.durability -= en.hp;
                        en.hp = 0;
                    } else {
                        en.hp -= sword.durability;
                        sword.durability = 0;
                    }

                    if (en.hp <= 0) {
                        spawnDeathParticles(en.x, en.y, "#00d2d3");
                        battleData.enemies.splice(i, 1);
                        battleData.kills++;

                        // Rớt Linh thạch
                        if (Math.random() * 100 < 10.0) {
                            battleData.drops.push({
                                x: en.x, y: en.y, radius: 12, type: 'linh_thach',
                                life: 600, 
                                bob: Math.random() * Math.PI * 2 
                            });
                        }

                        // Rớt đan dược (Đã giảm tỷ lệ & xóa đan thuộc tính)
                        if (!window.inventory) window.inventory = {};
                        const roll = Math.random() * 100;
                        let droppedItem = null;

                        // Tỷ lệ mới: Hồi Huyết (0.5%), Hồi Khí (0.5%), Tụ Linh (0.2%)
                        if (roll < 0.5) droppedItem = "hoi_huyet_dan";
                        else if (roll < 1.0) droppedItem = "hoi_khi_dan";
                        else if (roll < 1.2) droppedItem = "tu_linh_dan";

                        if (droppedItem) {
                            window.inventory[droppedItem] = (window.inventory[droppedItem] || 0) + 1;
                            const itemName = window.ITEM_DATABASE ? window.ITEM_DATABASE[droppedItem].name : "Vật phẩm";
                            const itemColor = window.ITEM_DATABASE ? window.ITEM_DATABASE[droppedItem].color : "#ffd700";
                            battleData.textPopups.push({
                                x: en.x,
                                y: en.y,
                                text: `+ ${itemName}`,
                                color: itemColor,
                                life: 60 
                            });
                        }
                    }

                    if (sword.durability <= 0) {
                        sword.active = false;
                        const cd = Math.max(1000, 3200 - agi * 25);
                        setTimeout(() => {
                            sword.active = true;
                            sword.durability = swordDmg;
                        }, cd);
                        break; 
                    }
                }
            }
        }
    });

    // ===== BẮT ĐẦU LOGIC CHIA ĐỢT QUÁI (WAVES) =====
    let spawnInterval = 0;
    let spawnBatch = 0;

    if (survivalSec >= 150) {
        // Phút 2:30 (150 giây) - Ngừng sinh thêm quái thông thường
        if (!battleData.clearedPopup) {
            battleData.clearedPopup = true;
            for (let i = 0; i < 15; i++) spawnBattleEnemy(); // Tung 15 con đợt cuối cùng
            
            battleData.textPopups.push({
                x: battleCanvas.width / 2,
                y: battleCanvas.height / 3,
                text: "🏆 ĐÃ QUÉT SẠCH! TIÊU DIỆT TÀN DƯ! 🏆",
                color: "#f59e0b",
                life: 180
            });
        } else if (battleData.enemies.length === 0 && !battleData.isExiting) {
            // Đã qua 2p30s và giết sạch tàn dư -> Chiến Thắng
            battleData.isExiting = true;
            setTimeout(() => { window.exitBattle(false, true); }, 1500);
        }
    } else if (survivalSec >= 120) {
        spawnInterval = 60; // Phút 2:00 -> 1 giây/lần
        spawnBatch = 3;     
    } else if (survivalSec >= 90) {
        spawnInterval = 60; // Phút 1:30 -> 1 giây/lần
        spawnBatch = 2;     
    } else if (survivalSec >= 60) {
        spawnInterval = 90; // Phút 1:00 -> 1.5 giây/lần
        spawnBatch = 2;     
    } else if (survivalSec >= 30) {
        spawnInterval = 90; // Giây 30 -> 1.5 giây/lần
        spawnBatch = 1;     
    } else {
        spawnInterval = 150; // Giây 0 đến 30 -> 2.5 giây/lần
        spawnBatch = 1;      
    }

    // Bắt đầu spawn quái (Vẫn giữ trần 45 con để chống giật)
    if (spawnInterval > 0 && battleData.enemies.length < 45 && battleData.frameCount % spawnInterval === 0) {
        for (let b = 0; b < spawnBatch; b++) {
            spawnBattleEnemy();
        }
    }
    // ===== KẾT THÚC LOGIC CHIA ĐỢT QUÁI =====

    for (let i = battleData.enemies.length - 1; i >= 0; i--) {
        const en = battleData.enemies[i];
        if (en.biteCooldown > 0) en.biteCooldown--;

        const dx = battleData.player.x - en.x;
        const dy = battleData.player.y - en.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.001) {
            en.x += (dx / dist) * en.speed;
            en.y += (dy / dist) * en.speed;
        }

        battleCtx.save();
        const ghostWobble = Math.sin(battleData.frameCount * 0.15 + i) * 3;
        battleCtx.translate(en.x, en.y + ghostWobble);
        
        if (battleData.player.x < en.x) battleCtx.scale(-1, 1);

        if (battleAssets.enemyGhost.complete && battleAssets.enemyGhost.naturalWidth > 0) {
            battleCtx.drawImage(battleAssets.enemyGhost, -20, -20, 40, 40);
        } else {
            battleCtx.beginPath();
            battleCtx.arc(0, 0, en.radius, 0, Math.PI * 2);
            battleCtx.fillStyle = "#70a1ff";
            battleCtx.fill();
        }
        battleCtx.restore();

        if (dist < battleData.player.radius + en.radius) {
            if (en.biteCooldown <= 0) {
                let dodge = Math.min(30, agi * 0.5);
                if (Math.random() * 100 >= dodge) {
                    window.currentHp = (window.currentHp || maxHp) - 15;
                    battleData.screenShake = 12;
                    battleData.damageFlash = 6;
                    if (window.playWrongSound) window.playWrongSound();
                }

                spawnDeathParticles(en.x, en.y, "#ff4757");

                const bdx = en.x - battleData.player.x;
                const bdy = en.y - battleData.player.y;
                const bdist = Math.hypot(bdx, bdy);
                if (bdist > 0.001) {
                    en.x += (bdx / bdist) * 20;
                    en.y += (bdy / bdist) * 20;
                }
                en.biteCooldown = 45;

                if ((window.currentHp || 0) <= 0) {
                    battleCtx.restore();
                    window.exitBattle(true);
                    return; // Đã thoát khỏi battleLoop, không gọi requestAnimationFrame ở cuối nữa.
                }
            }
        }
    }

    if (battleData.damageFlash > 0) {
        battleCtx.fillStyle = `rgba(255, 0, 0, ${battleData.damageFlash * 0.06})`;
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
        battleData.damageFlash--;
    }

    battleCtx.restore();

    if (battleData.frameCount % 10 === 0) {
        const curHp = Math.max(0, window.currentHp || 0);
        const hpPercent = Math.min(100, Math.max(0, (curHp / maxHp) * 100));
        const hpFill = document.getElementById('battleHpFill');
        const hpText = document.getElementById('battleHpText');
        if (hpFill) hpFill.style.width = hpPercent + "%";
        if (hpText) hpText.innerText = `❤️ ${curHp}/${maxHp}`;

        const curMana = Math.max(0, window.currentLinhLuc || 0);
        const maxMana = window.maxLinhLuc || 0;
        const manaPercent = maxMana > 0 ? Math.min(100, Math.max(0, (curMana / maxMana) * 100)) : 0;
        const manaFill = document.getElementById('battleManaFill');
        const manaText = document.getElementById('battleManaText');
        if (manaFill) manaFill.style.width = manaPercent + "%";
        if (manaText) manaText.innerText = `🌀 ${curMana}/${maxMana}`;

        const timeEl = document.getElementById('battleTimeText');
        const swordEl = document.getElementById('battleSwordText');
        const killsEl = document.getElementById('battleKillsText');

        const formatTimeFunc = window.formatTime || ((s) => `${Math.floor(s/60)}:${s%60}`);
        if (timeEl) timeEl.innerText = `⏱️ Sinh Tồn: ${formatTimeFunc(survivalSec)}`;
        if (swordEl) swordEl.innerText = `⚔️ Kiếm Khí: ${activeSwordCount}/${battleData.swords.length}`;
        if (killsEl) killsEl.innerText = `👾 Ma Vật Trảm: ${battleData.kills}`;

        // ĐỒNG BỘ SỐ LƯỢNG ĐAN DƯỢC LÊN GIAO DIỆN NÚT BẤM
        const hpCountEl = document.getElementById('quickHpCount');
        const manaCountEl = document.getElementById('quickManaCount');
        if (hpCountEl) hpCountEl.innerText = (window.inventory && window.inventory['hoi_huyet_dan']) || 0;
        if (manaCountEl) manaCountEl.innerText = (window.inventory && window.inventory['hoi_khi_dan']) || 0;
    }
    if ((window.currentHp || 0) <= 0) return;

    battleAnimationFrame = requestAnimationFrame(battleLoop);
}

window.addEventListener('resize', () => {
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen && battleScreen.classList.contains('active')) {
        resizeBattleCanvas();
    }
});

function initControls() {
    const moveZone = document.getElementById('joystickZone');
    const moveBase = document.getElementById('joystickBase');
    const moveStick = document.getElementById('joystickStick');
    
    if (moveZone && moveBase && moveStick) {
        if (!moveZone.dataset.bound) {
            moveZone.dataset.bound = "true";
            let moveTouchId = null;
            let moveStartX = 0, moveStartY = 0;
            const maxMoveDist = 42; 

            moveZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (moveTouchId !== null) return; 
                
                const t = e.changedTouches[0];
                moveTouchId = t.identifier;
                moveStartX = t.clientX; 
                moveStartY = t.clientY;

                moveBase.style.left = t.clientX + 'px';
                moveBase.style.top = t.clientY + 'px';
                moveBase.style.opacity = '1';
                moveStick.style.transform = `translate(0px, 0px)`;
                window.analogMove = { x: 0, y: 0 };
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (moveTouchId === null) return;
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === moveTouchId) {
                        const t = e.touches[i];
                        let dx = t.clientX - moveStartX;
                        let dy = t.clientY - moveStartY;
                        const dist = Math.hypot(dx, dy);
                        if (dist > maxMoveDist) { 
                            dx = (dx / dist) * maxMoveDist; 
                            dy = (dy / dist) * maxMoveDist; 
                        }
                        moveStick.style.transform = `translate(${dx}px, ${dy}px)`;
                        window.analogMove = { x: dx / maxMoveDist, y: dy / maxMoveDist };
                        break;
                    }
                }
            }, { passive: false });

            const endMoveTouch = (e) => {
                if (moveTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === moveTouchId) {
                        moveTouchId = null;
                        moveStick.style.transform = `translate(0px, 0px)`;
                        moveBase.style.opacity = '0';
                        window.analogMove = { x: 0, y: 0 };
                        break;
                    }
                }
            };

            window.addEventListener('touchend', endMoveTouch);
            window.addEventListener('touchcancel', endMoveTouch);
        }
    }

    const skillBase = document.getElementById('skillAimBase');
    const skillStick = document.getElementById('skillAimStick');
    
    if (skillBase && skillStick) {
        if (!skillBase.dataset.bound) {
            skillBase.dataset.bound = "true";
            let skillTouchId = null;
            let skillStartX = 0, skillStartY = 0;
            const maxSkillDist = 45; 

            skillBase.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (skillTouchId !== null) return;
                if (!window.learnedSkills || !window.learnedSkills.includes('skill_ngu_kiem')) return;
                
                const t = e.changedTouches[0];
                skillTouchId = t.identifier;
                skillStartX = t.clientX;
                skillStartY = t.clientY;
                
                battleData.aimState.active = true;
                battleData.aimState.dirX = 0;
                battleData.aimState.dirY = 0;
                skillStick.style.boxShadow = "0 0 20px #ffd700";
                skillStick.style.borderColor = "#ffd700";
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (skillTouchId === null) return;
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === skillTouchId) {
                        const t = e.touches[i];
                        let dx = t.clientX - skillStartX;
                        let dy = t.clientY - skillStartY;
                        const dist = Math.hypot(dx, dy);
                        
                        let stickDx = dx, stickDy = dy;
                        if (dist > maxSkillDist) { 
                            stickDx = (dx / dist) * maxSkillDist; 
                            stickDy = (dy / dist) * maxSkillDist; 
                        }
                        skillStick.style.transform = `translate(${stickDx}px, ${stickDy}px)`;
                        
                        if (dist > 10) { 
                            battleData.aimState.dirX = dx / dist;
                            battleData.aimState.dirY = dy / dist;
                        }
                        break;
                    }
                }
            }, { passive: false });

            const endSkillTouch = (e) => {
                if (skillTouchId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === skillTouchId) {
                        skillTouchId = null;
                        battleData.aimState.active = false;
                        skillStick.style.transform = `translate(0px, 0px)`;
                        skillStick.style.boxShadow = "0 0 12px rgba(34, 211, 238, 0.5)";
                        skillStick.style.borderColor = "#22d3ee";

                        let dx = battleData.aimState.dirX;
                        let dy = battleData.aimState.dirY;

                        if (dx === 0 && dy === 0) {
                            if (battleData.enemies.length > 0) {
                                let nearest = null; 
                                let minDist = Infinity;
                                battleData.enemies.forEach(en => {
                                    const d = Math.hypot(en.x - battleData.player.x, en.y - battleData.player.y);
                                    if (d < minDist) { minDist = d; nearest = en; }
                                });
                                if (nearest) {
                                    const angle = Math.atan2(nearest.y - battleData.player.y, nearest.x - battleData.player.x);
                                    dx = Math.cos(angle); 
                                    dy = Math.sin(angle);
                                } else { dx = 1; dy = 0; }
                            } else { dx = 1; dy = 0; }
                        }

                        launchNguKiem(dx, dy);
                        break;
                    }
                }
            };

            window.addEventListener('touchend', endSkillTouch);
            window.addEventListener('touchcancel', endSkillTouch);

            skillBase.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (!window.learnedSkills || !window.learnedSkills.includes('skill_ngu_kiem')) return;
                battleData.aimState.active = true;
                skillStartX = e.clientX;
                skillStartY = e.clientY;
            });
            window.addEventListener('mousemove', (e) => {
                if (battleData.aimState.active && skillBase.dataset.bound) {
                    let dx = e.clientX - skillStartX;
                    let dy = e.clientY - skillStartY;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 10) {
                        battleData.aimState.dirX = dx / dist;
                        battleData.aimState.dirY = dy / dist;
                    }
                }
            });
            window.addEventListener('mouseup', () => {
                if (battleData.aimState.active && skillBase.dataset.bound) {
                    battleData.aimState.active = false;
                    let dx = battleData.aimState.dirX || 1;
                    let dy = battleData.aimState.dirY || 0;
                    launchNguKiem(dx, dy);
                }
            });
        }
    }
}

function launchNguKiem(targetDirX, targetDirY) {
    if (!battleData.swords || battleData.swords.length === 0) return;
    
    // 1. Kiểm tra phi kiếm hộ thể sẵn sàng
    const availableSword = battleData.swords.find(s => s.active);
    if (!availableSword) {
        battleData.textPopups.push({ 
            x: battleData.player.x, 
            y: battleData.player.y - 40, 
            text: "Cạn Kiếm Khí!", 
            color: "#ef4444", 
            life: 45 
        });
        return;
    }

    // 2. Kiểm tra lượng Linh Lực (Mana) tiêu hao
    const manaCost = 10; // Tiêu hao 10 Linh Lực mỗi lần xuất kiếm
    if ((window.currentLinhLuc || 0) < manaCost) {
        battleData.textPopups.push({ 
            x: battleData.player.x, 
            y: battleData.player.y - 40, 
            text: "Cạn Linh Lực!", 
            color: "#38bdf8", 
            life: 45 
        });
        if (window.playWrongSound) window.playWrongSound();
        return;
    }

    // 3. Trừ Linh Lực
    window.currentLinhLuc -= manaCost;

    availableSword.active = false;
    const agi = window.agi || 1;
    const swordDmg = window.swordDamage || 10;
    const cd = Math.max(1200, 3500 - agi * 25);
    
    const cdOverlay = document.getElementById('skillCooldownOverlay');
    if (cdOverlay) {
        cdOverlay.style.transition = 'none';
        cdOverlay.style.height = '100%';
        setTimeout(() => {
            cdOverlay.style.transition = `height ${cd}ms linear`;
            cdOverlay.style.height = '0%';
        }, 50);
    }

    setTimeout(() => {
        availableSword.active = true;
        availableSword.durability = swordDmg;
    }, cd);

    const angle = Math.atan2(targetDirY, targetDirX);
    battleData.projectiles.push({
        x: battleData.player.x, 
        y: battleData.player.y,
        vx: Math.cos(angle) * 12, 
        vy: Math.sin(angle) * 12, 
        angle: angle,
        damage: swordDmg,     // Sát thương đồng bộ sát thương nhân vật
        durability: swordDmg, // Độ bền đồng bộ sát thương nhân vật
        hitList: new Set(), 
        life: 180
    });
    
    battleData.screenShake = 6;
    if (window.playClickSound) window.playClickSound();
}

// HÀM DÙNG ĐAN DƯỢC NHANH TRONG BÍ CẢNH (Đã sửa lỗi kẹt nút & thêm phản hồi)
window.useItemInBattle = function(itemId) {
    if (window.playClickSound) window.playClickSound();

    // 1. Kiểm tra túi đồ
    const count = (window.inventory && window.inventory[itemId]) || 0;
    if (count <= 0) {
        battleData.textPopups.push({
            x: battleData.player.x,
            y: battleData.player.y - 40,
            text: "Đã hết đan!",
            color: "#94a3b8",
            life: 40
        });
        return;
    }
    
    // 2. Xử lý Hồi Huyết Đan
    if (itemId === 'hoi_huyet_dan') {
        const maxHp = window.maxHp || 100;
        if (window.currentHp >= maxHp) {
            battleData.textPopups.push({
                x: battleData.player.x,
                y: battleData.player.y - 40,
                text: "Khí huyết tràn trề!",
                color: "#4ade80",
                life: 40
            });
            return;
        }
        window.currentHp = Math.min(maxHp, (window.currentHp || 0) + 15);
    } 
    // 3. Xử lý Hồi Khí Đan
    else if (itemId === 'hoi_khi_dan') {
        const maxMana = window.maxLinhLuc || 100;
        if (window.currentLinhLuc >= maxMana) {
            battleData.textPopups.push({
                x: battleData.player.x,
                y: battleData.player.y - 40,
                text: "Linh lực sung mãn!",
                color: "#38bdf8",
                life: 40
            });
            return;
        }
        window.currentLinhLuc = Math.min(maxMana, (window.currentLinhLuc || 0) + 30);
    } else {
        return;
    }
    
    // 4. Trừ số lượng đan dược
    window.inventory[itemId]--;
    if (window.inventory[itemId] <= 0) delete window.inventory[itemId];
    
    // 5. Hiển thị chữ nổi hồi phục
    const itemColor = itemId === 'hoi_huyet_dan' ? '#4ade80' : '#38bdf8';
    battleData.textPopups.push({
        x: battleData.player.x,
        y: battleData.player.y - 40,
        text: itemId === 'hoi_huyet_dan' ? "+15 HP" : "+30 MP",
        color: itemColor,
        life: 45
    });
    
    if (window.syncManaToDatabase) window.syncManaToDatabase();
    
    // 6. Đồng bộ ngay số lượng trên nút
    const hpCountEl = document.getElementById('quickHpCount');
    const manaCountEl = document.getElementById('quickManaCount');
    if (hpCountEl) hpCountEl.innerText = (window.inventory && window.inventory['hoi_huyet_dan']) || 0;
    if (manaCountEl) manaCountEl.innerText = (window.inventory && window.inventory['hoi_khi_dan']) || 0;
};
