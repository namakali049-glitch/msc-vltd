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
    textPopups: [], // Thêm mảng chứa hiệu ứng chữ nổi khi rớt đồ
    screenShake: 0,
    damageFlash: 0,
    kills: 0,
    frameCount: 0
};

const moveDir = { up: false, down: false, left: false, right: false };

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
};

// Đã gộp gọn các khai báo đường dẫn ảnh, xóa bỏ các dòng trùng lặp
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

function getBattleCharacterSkin() {
    const mana = window.lifetimeMana || 0;
    if (mana >= 50000) return battleAssets.playerNguyenAnh;
    if (mana >= 12000) return battleAssets.playerKimDan;
    if (mana >= 4000) return battleAssets.playerTrucCoVienMan;
    if (mana >= 2500) return battleAssets.playerTrucCoTrungKy;
    if (mana >= 1000) return battleAssets.playerTrucCo;
    if (mana >= 150) return battleAssets.playerLuyenKhi;
    return battleAssets.playerPhamNhan;
}

function getBattleSwordSkin() {
    const mana = window.lifetimeMana || 0;
    if (mana >= 50000) return battleAssets.swordNguyenAnh; // Kiếm sét Cửu Tiêu
    if (mana >= 12000) return battleAssets.swordKimDan;    // Kiếm lửa Xích Kim
    if (mana >= 4000) return battleAssets.swordCyan;       // Kiếm khí Trúc Cơ
    return battleAssets.swordWood;                         // Mộc kiếm / Kiếm khí Luyện Khí
}

const battleCanvas = document.getElementById('gameCanvas');
const battleCtx = battleCanvas ? battleCanvas.getContext('2d') : null;

function resizeBattleCanvas() {
    if (!battleCanvas) return;
    battleCanvas.width = window.innerWidth;
    battleCanvas.height = window.innerHeight;
    if (battleCtx) {
        battleCtx.imageSmoothingEnabled = false;
    }
}

window.startBattle = function() {
    if (window.playClickSound) window.playClickSound();
    if (window.recalcStats) window.recalcStats();

    const realmFunc = window.calculateRealm || (typeof calculateRealm === 'function' ? calculateRealm : null);
    const realm = realmFunc ? realmFunc(window.lifetimeMana || 0) : "Phàm Nhân";
    if (realm === "Phàm Nhân") {
        alert("⚠️ Đạo hữu hiện tại là Phàm Nhân, chưa ngưng tụ đủ Linh Lực nên không thể ngự kiếm!\n\nHãy vào 'Bế Quan Khai Phá' để tích lũy Linh Lực đạt mốc 150 (Luyện Khí Sơ Kỳ).");
        return;
    }

    if (window.switchScreen) window.switchScreen('battle-screen');
    
    const invBtn = document.querySelector('.fixed-inventory-btn');
    const audioBtn = document.getElementById('audioToggleBtn');
    if (invBtn) invBtn.style.display = 'none';
    if (audioBtn) audioBtn.style.display = 'none';

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
    battleData.kills = 0;
    battleData.orbitAngle = 0;
    battleData.frameCount = 0;
    battleData.screenShake = 0;
    battleData.damageFlash = 0;
    moveDir.up = moveDir.down = moveDir.left = moveDir.right = false;
    
    battleData.player.x = battleCanvas.width / 2;
    battleData.player.y = battleCanvas.height / 2;
    window.currentHp = window.maxHp || 100;

    // CẬP NHẬT TÊN, CẢNH GIỚI VÀ PHỤC HỒI LINH LỰC KHI VÀO BÍ CẢNH
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmName = window.calculateRealm ? window.calculateRealm(window.lifetimeMana || 0, countA1, countB1) : "Luyện Khí";
    const playerName = (window.currentUser && (window.currentUser.displayName || (window.currentUser.email && window.currentUser.email.split('@')[0]))) || "Đạo Hữu";

    const bName = document.getElementById('battleName');
    const bBadge = document.getElementById('battleRealmBadge');
    const bAvatar = document.getElementById('battleAvatar');
    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.jpg");

    if (bName) bName.innerText = playerName;
    if (bBadge) bBadge.innerText = realmName;
    if (bAvatar) bAvatar.src = avatarFunc(window.lifetimeMana || 0);

    window.currentLinhLuc = window.maxLinhLuc || 0;

    if (battleAnimationFrame) cancelAnimationFrame(battleAnimationFrame);
    battleLoop();
};

window.exitBattle = function(isDeath = false) {
    if (window.playClickSound) window.playClickSound();
    if (battleAnimationFrame) cancelAnimationFrame(battleAnimationFrame);
    
    const invBtn = document.querySelector('.fixed-inventory-btn');
    const audioBtn = document.getElementById('audioToggleBtn');
    if (invBtn) invBtn.style.display = 'block';
    if (audioBtn) audioBtn.style.display = 'block';

    moveDir.up = moveDir.down = moveDir.left = moveDir.right = false;
    
    const survivalSec = Math.floor(battleData.frameCount / 60);
    const formatTimeFunc = window.formatTime || ((s) => `${Math.floor(s/60)}:${s%60}`);

    // Chỉ ghi nhận ván đấu nếu vượt qua kỷ lục tốt nhất cũ (KHÔNG CỘNG DỒN)
    let recordNotice = "";
    if (window.recordBattleResult) {
        const isNewRecord = window.recordBattleResult(survivalSec, battleData.kills);
        if (isNewRecord) {
            recordNotice = "\n🔥 LẬP KỶ LỤC MỚI TRÊN TIÊN ĐẠO BẢNG!";
        }
    }

    const titleMsg = isDeath 
        ? "💥 Đạo thể tổn hao nặng nề! Buộc phải rút lui." 
        : "🚪 Đạo hữu đã an toàn rút khỏi Bí Cảnh!";

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
        speed: 1.1 + Math.random() * 0.7,
        hp: 30,
        maxHp: 30,
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

    battleCtx.save();
    battleCtx.translate(shakeX, shakeY);
    battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);

    // Di chuyển nhân vật
    let moveX = 0;
    let moveY = 0;
    if (moveDir.up) moveY -= 1;
    if (moveDir.down) moveY += 1;
    if (moveDir.left) moveX -= 1;
    if (moveDir.right) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
    }

    const pSpeed = 4.5 + (agi * 0.05);
    battleData.player.x += moveX * pSpeed;
    battleData.player.y += moveY * pSpeed;

    battleData.player.x = Math.max(35, Math.min(battleCanvas.width - 35, battleData.player.x));
    battleData.player.y = Math.max(45, Math.min(battleCanvas.height - 45, battleData.player.y));

    // Vẽ Background
    if (battleAssets.bg.complete && battleAssets.bg.naturalWidth > 0) {
        battleCtx.drawImage(battleAssets.bg, 0, 0, battleCanvas.width, battleCanvas.height);
    } else {
        battleCtx.fillStyle = "#0c1017";
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
    }

    // Vẽ Particles (Hiệu ứng chém)
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

    // Vẽ Text Popups (Thông báo nhặt đồ)
    for (let i = battleData.textPopups.length - 1; i >= 0; i--) {
        const tp = battleData.textPopups[i];
        tp.y -= 0.8; // Bay lên trên
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
        // Viền chữ
        battleCtx.strokeStyle = "black";
        battleCtx.lineWidth = 2;
        battleCtx.strokeText(tp.text, tp.x, tp.y);
        battleCtx.fillText(tp.text, tp.x, tp.y);
        battleCtx.restore();
    }

    // Vẽ Nhân Vật
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

    // Vẽ & Xử lý Kiếm Khí (Va chạm)
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
                battleCtx.drawImage(swordImg, -9, -24, 18, 48);
            } else {
                battleCtx.fillStyle = "#00d2d3";
                battleCtx.fillRect(-3, -15, 6, 30);
            }
            battleCtx.restore();

            // Va chạm với Quái
            for (let i = battleData.enemies.length - 1; i >= 0; i--) {
                const en = battleData.enemies[i];
                if (Math.hypot(sx - en.x, sy - en.y) < en.radius + 15) {
                    
                    // Knockback
                    const kdx = en.x - battleData.player.x;
                    const kdy = en.y - battleData.player.y;
                    const kdist = Math.hypot(kdx, kdy);
                    if (kdist > 0.001) {
                        en.x += (kdx / kdist) * 25;
                        en.y += (kdy / kdist) * 25;
                    }

                    // Trừ HP
                    if (sword.durability >= en.hp) {
                        sword.durability -= en.hp;
                        en.hp = 0;
                    } else {
                        en.hp -= sword.durability;
                        sword.durability = 0;
                    }

                    // Quái chết
                    if (en.hp <= 0) {
                        spawnDeathParticles(en.x, en.y, "#00d2d3");
                        battleData.enemies.splice(i, 1);
                        battleData.kills++;

                        // HỆ THỐNG RỚT ĐỒ MỚI 
                        if (!window.inventory) window.inventory = {};
                        const roll = Math.random() * 100; 
                        
                        let droppedItem = null;
                        if (roll < 1.0) droppedItem = "hoi_huyet_dan";                 
                        else if (roll < 2.0) droppedItem = "hoi_khi_dan";              
                        else if (roll < 2.5) droppedItem = "tu_linh_dan";              
                        else if (roll < 2.6) droppedItem = "than_luc_dan";             
                        else if (roll < 2.7) droppedItem = "khi_huyet_dan";            
                        else if (roll < 2.8) droppedItem = "linh_man_dan";             
                        else if (roll < 2.9) droppedItem = "tinh_than_dan";            

                        if (droppedItem) {
                            window.inventory[droppedItem] = (window.inventory[droppedItem] || 0) + 1;
                            const itemName = window.ITEM_DATABASE ? window.ITEM_DATABASE[droppedItem].name : "Vật phẩm";
                            const itemColor = window.ITEM_DATABASE ? window.ITEM_DATABASE[droppedItem].color : "#ffd700";
                            
                            // Tạo hiệu ứng chữ nổi báo nhặt đồ
                            battleData.textPopups.push({
                                x: en.x,
                                y: en.y,
                                text: `+ ${itemName}`,
                                color: itemColor,
                                life: 60 // Tồn tại trong 60 frames (~1s)
                            });
                        }
                    }

                    // Kích hoạt hồi chiêu cho kiếm nếu hỏng
                    if (sword.durability <= 0) {
                        sword.active = false;
                        const cd = Math.max(1000, 3200 - agi * 25);
                        setTimeout(() => {
                            sword.active = true;
                            sword.durability = swordDmg;
                        }, cd);
                        break; // Thoát vòng lặp quái vì kiếm đã gãy
                    }
                }
            }
        }
    });

    // Spawn quái vật
    const spawnInterval = Math.max(12, 60 - Math.floor(survivalSec / 15) * 5);
    const spawnBatch = 1 + Math.floor(survivalSec / 45);

    if (battleData.enemies.length < 65 && battleData.frameCount % spawnInterval === 0) {
        for (let b = 0; b < spawnBatch; b++) {
            spawnBattleEnemy();
        }
    }

    // Cập nhật vị trí và hành vi quái vật
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

        // Xử lý quái cắn nhân vật
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
                    return;
                }
            }
        }
    }

    // Hiệu ứng chớp máu khi dính đòn
    if (battleData.damageFlash > 0) {
        battleCtx.fillStyle = `rgba(255, 0, 0, ${battleData.damageFlash * 0.06})`;
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
        battleData.damageFlash--;
    }

    battleCtx.restore();

    // CẬP NHẬT THANH MÁU ĐỘNG (HP)
    const curHp = Math.max(0, window.currentHp || 0);
    const hpPercent = Math.min(100, Math.max(0, (curHp / maxHp) * 100));
    const hpFill = document.getElementById('battleHpFill');
    const hpText = document.getElementById('battleHpText');
    if (hpFill) hpFill.style.width = hpPercent + "%";
    if (hpText) hpText.innerText = `❤️ ${curHp}/${maxHp}`;

    // CẬP NHẬT THANH MANA ĐỘNG (LINH LỰC)
    const curMana = Math.max(0, window.currentLinhLuc || 0);
    const maxMana = window.maxLinhLuc || 0;
    const manaPercent = maxMana > 0 ? Math.min(100, Math.max(0, (curMana / maxMana) * 100)) : 0;
    const manaFill = document.getElementById('battleManaFill');
    const manaText = document.getElementById('battleManaText');
    if (manaFill) manaFill.style.width = manaPercent + "%";
    if (manaText) manaText.innerText = `🌀 ${curMana}/${maxMana}`;

    // THÔNG TIN SINH TỒN VÀ TRẢM YÊU
    const timeEl = document.getElementById('battleTimeText');
    const swordEl = document.getElementById('battleSwordText');
    const killsEl = document.getElementById('battleKillsText');

    const formatTimeFunc = window.formatTime || ((s) => `${Math.floor(s/60)}:${s%60}`);
    if (timeEl) timeEl.innerText = `⏱️ Sinh Tồn: ${formatTimeFunc(survivalSec)}`;
    if (swordEl) swordEl.innerText = `⚔️ Kiếm Khí: ${activeSwordCount}/${battleData.swords.length}`;
    if (killsEl) killsEl.innerText = `👾 Ma Vật Trảm: ${battleData.kills}`;

    battleAnimationFrame = requestAnimationFrame(battleLoop);
}

window.addEventListener('resize', () => {
    const battleScreen = document.getElementById('battle-screen');
    if (battleScreen && battleScreen.classList.contains('active')) {
        resizeBattleCanvas();
    }
});
