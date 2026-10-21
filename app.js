// ==========================================
// APP.JS - LÕI ĐIỀU HÀNH HỆ THỐNG (MAIN THREAD)
// Phiên bản: v0.6_FINAL (Đã chuẩn hóa sạch lỗi)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get, update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 1. CẤU HÌNH FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBBn3CGkftYVVl1wr9fY8OhBAd8LKzUSyE",
    authDomain: "msc-vltd.firebaseapp.com",
    projectId: "msc-vltd",
    storageBucket: "msc-vltd.firebasestorage.app",
    messagingSenderId: "684705162429",
    appId: "1:684705162429:web:2ed8e08891060f61f103d4",
    measurementId: "G-53PPGGS0ZN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Gắn database ra window để chat.js và các module khác dùng chung an toàn
window.firebaseDB = database;

// Nạp các module phụ trợ
import './realm.js';
import './inventory.js';
import './quiz.js';
import './battle.js';
import './chat.js';

// ==========================================
// 2. BIẾN TOÀN CỤC & CHỈ SỐ NHÂN VẬT
// ==========================================
let currentUser = null;
let lifetimeMana = 0; 
let sessionMana = 0;  
let inventory = { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };
let battleRecord = { maxSurvivalSec: 0, maxKills: 0 };
let masteredWordsA1 = [];
let masteredWordsB1 = [];

window.currentUser = currentUser;
window.inventory = inventory;
window.battleRecord = battleRecord;
window.masteredWordsA1 = masteredWordsA1;
window.masteredWordsB1 = masteredWordsB1;
window.lifetimeMana = lifetimeMana;

let playerStats = {
    str: 1,
    vit: 1,
    agi: 1,
    spi: 1,
    freePoints: 0,
    rewardedTiers: [],
    version: "v0.6_FINAL"
};
window.playerStats = playerStats;

let maxHp = 100;
let currentHp = 100;
let str = 1; 
let agi = 1; 
let thanThuc = 10;
let swordDamage = 10;

window.maxHp = maxHp;
window.currentHp = currentHp;
window.str = str;
window.agi = agi;
window.thanThuc = thanThuc;
window.swordDamage = swordDamage;

// ==========================================
// 3. THUỘC TÍNH & GIAO DIỆN NHÂN VẬT
// ==========================================
function checkMinorRealmRewards() {
    if (!Array.isArray(playerStats.rewardedTiers)) {
        playerStats.rewardedTiers = [];
    }

    let hasReward = false;
    if (window.MINOR_REALM_REWARDS) {
        window.MINOR_REALM_REWARDS.forEach(tier => {
            if (lifetimeMana >= tier.mana && !playerStats.rewardedTiers.includes(tier.id)) {
                playerStats.freePoints += tier.points;
                playerStats.rewardedTiers.push(tier.id);
                hasReward = true;
                if (window.playLootSound) window.playLootSound();
                alert(`🎉 Chúc mừng đạo hữu bước vào [${tier.name}]!\nĐược ban thưởng +${tier.points} Điểm Tiềm Năng.`);
            }
        });
    }

    if (hasReward) {
        syncManaToDatabase();
    }
}

function recalcStats() {
    checkMinorRealmRewards();

    maxHp = Math.max(10, playerStats.vit * 10);
    if (currentHp > maxHp || currentHp <= 0) currentHp = maxHp;

    str = playerStats.str;
    swordDamage = playerStats.str * 10;
    thanThuc = playerStats.spi * 10;
    agi = playerStats.agi;

    window.maxHp = maxHp;
    window.currentHp = currentHp;
    window.str = str;
    window.swordDamage = swordDamage;
    window.thanThuc = thanThuc;
    window.agi = agi;
    window.lifetimeMana = lifetimeMana;
}

window.recalcStats = recalcStats;

window.addLifetimeMana = function(amount) {
    lifetimeMana += amount;
    window.lifetimeMana = lifetimeMana;
    recalcStats();
    updateCharacterUI();
    return lifetimeMana;
};

window.recordBattleResult = function(survivalSec, kills) {
    let updated = false;
    if (survivalSec > battleRecord.maxSurvivalSec || 
       (survivalSec === battleRecord.maxSurvivalSec && kills > battleRecord.maxKills)) {
        battleRecord.maxSurvivalSec = survivalSec;
        battleRecord.maxKills = kills;
        battleRecord.lastUpdated = Date.now();
        window.battleRecord = battleRecord;
        updated = true;
    }
    return updated;
};

window.allocateStat = function(statKey) {
    if (playerStats.freePoints <= 0) {
        alert("⚠️ Đạo hữu đã dùng hết điểm tiềm năng! Hãy đột phá tiểu cảnh giới để nhận thêm.");
        return;
    }

    if (playerStats.hasOwnProperty(statKey)) {
        if (window.playClickSound) window.playClickSound();
        playerStats[statKey] += 1;
        playerStats.freePoints -= 1;

        recalcStats();
        updateCharacterUI();
        syncManaToDatabase();
    }
};

function updateCharacterUI() {
    recalcStats();

    const fpEl = document.getElementById('profileFreePoints');
    if (fpEl) fpEl.innerText = playerStats.freePoints;

    const strEl = document.getElementById('profileStr');
    if (strEl) strEl.innerText = playerStats.str;
    const strEff = document.getElementById('profileStrEffect');
    if (strEff) strEff.innerText = `(${playerStats.str * 10} Sát thương)`;

    const vitEl = document.getElementById('profileVit');
    if (vitEl) vitEl.innerText = playerStats.vit;
    const vitEff = document.getElementById('profileVitEffect');
    if (vitEff) vitEff.innerText = `(${playerStats.vit * 10} HP)`;

    const agiEl = document.getElementById('profileAgi');
    if (agiEl) agiEl.innerText = playerStats.agi;
    const agiEff = document.getElementById('profileAgiEffect');
    if (agiEff) agiEff.innerText = `(${playerStats.agi * 10} Thân pháp)`;

    const spiEl = document.getElementById('profileSpi');
    if (spiEl) spiEl.innerText = playerStats.spi;
    const spiEff = document.getElementById('profileSpiEffect');
    if (spiEff) spiEff.innerText = `(${playerStats.spi * 10} Thần thức)`;

    const swordsTxt = document.getElementById('profileSwords');
    const swordCountFunc = window.getSwordCount || (() => 0);
    if (swordsTxt) swordsTxt.innerText = `${swordCountFunc(thanThuc)} Thanh`;

    const masteryA1 = document.getElementById('profileMasteryA1');
    const masteryB1 = document.getElementById('profileMasteryB1');
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    if (masteryA1) masteryA1.innerText = `${countA1} / 900 từ (${Math.round((countA1 / 900) * 100)}%)`;
    if (masteryB1) masteryB1.innerText = `${countB1} / 4000 từ (${Math.round((countB1 / 4000) * 100)}%)`;
}
window.updateCharacterUI = updateCharacterUI;

// ==========================================
// 4. CHUYỂN MÀN HÌNH & XÁC THỰC FIREBASE
// ==========================================
window.switchScreen = function(screenId) {
    if (window.playClickSound) window.playClickSound();
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        if (screenId === 'battle-screen') {
            targetScreen.style.display = 'block';
        } else {
            targetScreen.style.display = 'flex';
        }
    }
};

window.switchAuthTab = function(type) {
    if (window.playClickSound) window.playClickSound();
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.remove('active');
    document.getElementById('displayNameGroup').style.display = 'none';

    if (type === 'login') {
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('authSubmitBtn').innerText = "Bắt đầu Tu Luyện 🚀";
        document.getElementById('authSubmitBtn').onclick = handleLogin;
    } else {
        document.getElementById('tab-signup').classList.add('active');
        document.getElementById('displayNameGroup').style.display = 'block';
        document.getElementById('authSubmitBtn').innerText = "Đăng Ký Tài Khoản 📝";
        document.getElementById('authSubmitBtn').onclick = handleSignup;
    }
};

function parseFirebaseArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return Object.values(data);
    return [];
}

function generateRandomBaseStats() {
    let stats = { str: 1, vit: 1, agi: 1, spi: 1 };
    const keys = ['str', 'vit', 'agi', 'spi'];
    for (let i = 0; i < 6; i++) {
        let randKey = keys[Math.floor(Math.random() * keys.length)];
        stats[randKey] += 1;
    }

    return {
        str: stats.str,
        vit: stats.vit,
        agi: stats.agi,
        spi: stats.spi,
        freePoints: 0,
        rewardedTiers: [],
        version: "v0.6_FINAL"
    };
}

async function loadUserLifetimeMana(uid) {
    try {
        const userRef = ref(database, 'users/' + uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const val = snapshot.val();
            lifetimeMana = val.mana || 0;
            inventory = val.inventory || { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };
            window.inventory = inventory;
            battleRecord = val.battleRecord || { maxSurvivalSec: 0, maxKills: 0 };
            window.battleRecord = battleRecord;
            masteredWordsA1 = parseFirebaseArray(val.masteredA1);
            masteredWordsB1 = parseFirebaseArray(val.masteredB1);
            window.masteredWordsA1 = masteredWordsA1;
            window.masteredWordsB1 = masteredWordsB1;

            if (!val.stats || val.stats.version !== "v0.6_FINAL") {
                playerStats = generateRandomBaseStats();
                
                let accumulatedPoints = 0;
                let awardedTiers = [];
                if (window.MINOR_REALM_REWARDS) {
                    window.MINOR_REALM_REWARDS.forEach(tier => {
                        if (lifetimeMana >= tier.mana) {
                            accumulatedPoints += tier.points;
                            awardedTiers.push(tier.id);
                        }
                    });
                }
                playerStats.freePoints = accumulatedPoints;
                playerStats.rewardedTiers = awardedTiers;

                await update(userRef, { stats: playerStats });
            } else {
                playerStats = val.stats;
            }

            if (window.getRealmData) {
                window.highestAchievedRank = window.getRealmData(lifetimeMana).major;
            }
        }
    } catch(e) { 
        console.error("Lỗi tải data:", e);
        lifetimeMana = 0; 
        masteredWordsA1 = [];
        masteredWordsB1 = [];
        playerStats = generateRandomBaseStats();
    }
    
    recalcStats();
}

async function syncManaToDatabase() {
    if (!currentUser) return;
    try {
        const userRef = ref(database, 'users/' + currentUser.uid);
        await update(userRef, {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            mana: lifetimeMana,
            inventory: inventory,
            stats: playerStats,
            masteredA1: masteredWordsA1,
            masteredB1: masteredWordsB1,
            battleRecord: battleRecord,
            lastUpdated: Date.now()
        });
    } catch(e) { console.error("Lỗi đồng bộ Firebase:", e); }
}
window.syncManaToDatabase = syncManaToDatabase;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        window.currentUser = user;
        const nameEl = document.getElementById('userDisplayName');
        if (nameEl) nameEl.innerText = user.displayName || user.email.split('@')[0];
        await loadUserLifetimeMana(user.uid);
        switchScreen('start-screen');
    } else {
        currentUser = null;
        window.currentUser = null;
        lifetimeMana = 0;
        masteredWordsA1 = [];
        masteredWordsB1 = [];
        switchScreen('auth-screen');
    }
});

window.handleSignup = async function() {
    if (window.playClickSound) window.playClickSound();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();
    if (!email || !password || !displayName) { alert("Vui lòng điền đủ thông tin!"); return; }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: displayName });
        playerStats = generateRandomBaseStats();
        await set(ref(database, 'users/' + userCred.user.uid), { 
            name: displayName, 
            mana: 0, 
            inventory: inventory,
            stats: playerStats,
            masteredA1: [],
            masteredB1: [],
            joinedAt: Date.now()
        });
        alert("Đăng ký thành công!");
    } catch(e) { alert("Lỗi: " + e.message); }
};

window.handleLogin = async function() {
    if (window.playClickSound) window.playClickSound();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!email || !password) { alert("Nhập Email và Mật khẩu!"); return; }
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch(e) { alert("Đăng nhập thất bại: " + e.message); }
};

window.handleGoogleLogin = async function() {
    if (window.playClickSound) window.playClickSound();
    const isEmbedded = /FBAN|FBAV|Instagram|Line|Zalo/i.test(navigator.userAgent);
    if (isEmbedded) {
        alert("⚠️ Bạn đang mở game từ ứng dụng tin nhắn! Vui lòng chọn 'Mở bằng trình duyệt' để tiếp tục.");
        return;
    }

    try { 
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = ref(database, 'users/' + result.user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            playerStats = generateRandomBaseStats();
            await set(userRef, { 
                name: result.user.displayName || "Đạo Hữu", 
                mana: 0, 
                inventory: inventory,
                stats: playerStats,
                masteredA1: [],
                masteredB1: [],
                joinedAt: Date.now()
            });
        }
    } catch(e) { 
        console.error("Chi tiết lỗi đăng nhập:", e);
    }
};

window.handleLogout = function() { 
    if (window.playClickSound) window.playClickSound();
    
    lifetimeMana = 0;
    sessionMana = 0;
    masteredWordsA1 = [];
    masteredWordsB1 = [];
    inventory = { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };
    battleRecord = { maxSurvivalSec: 0, maxKills: 0 };
    playerStats = { str: 1, vit: 1, agi: 1, spi: 1, freePoints: 0, rewardedTiers: [], version: "v0.6_FINAL" };
    
    window.lifetimeMana = 0;
    window.masteredWordsA1 = [];
    window.masteredWordsB1 = [];
    window.inventory = inventory;
    window.battleRecord = battleRecord;
    
    signOut(auth); 
};

// ==========================================
// 5. HỒ SƠ & BẢNG XẾP HẠNG (2 TAB)
// ==========================================
window.showProfile = function() {
    if (window.playClickSound) window.playClickSound();
    if (!currentUser) return;
    recalcStats();
    switchScreen('profile-screen');
    
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.innerText = currentUser.displayName || currentUser.email.split('@')[0];
    
    const manaEl = document.getElementById('profileMana');
    if (manaEl) manaEl.innerText = lifetimeMana;
    
    const realmFunc = window.calculateRealm || (() => "Phàm Nhân");
    const realm = realmFunc(lifetimeMana);
    const realmEl = document.getElementById('profileRealm');
    if (realmEl) realmEl.innerText = realm;
    
    const badge = document.getElementById('profileRealmBadge');
    if (badge) badge.innerText = realm;
    
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.jpg");
    if (profileAvatar) profileAvatar.src = avatarFunc(lifetimeMana);

    updateCharacterUI();
};

let currentLeaderboardTab = 'mana';
let cachedLeaderboardData = [];

window.switchLeaderboardTab = function(tab) {
    if (window.playClickSound) window.playClickSound();
    currentLeaderboardTab = tab;
    
    const tabMana = document.getElementById('lb-tab-mana');
    const tabBattle = document.getElementById('lb-tab-battle');
    const descText = document.getElementById('lb-desc-text');
    
    if (tab === 'mana') {
        if (tabMana) tabMana.classList.add('active');
        if (tabBattle) tabBattle.classList.remove('active');
        if (descText) descText.innerText = "Bảng xếp hạng Linh lực trọn đời";
    } else {
        if (tabBattle) tabBattle.classList.add('active');
        if (tabMana) tabMana.classList.remove('active');
        if (descText) descText.innerText = "Bảng xếp hạng Bí Cảnh (Ván Đấu Tốt Nhất)";
    }
    
    window.renderLeaderboardList();
};

window.renderLeaderboardList = function() {
    const lbList = document.getElementById('lb-list');
    if (!lbList) return;
    
    if (!cachedLeaderboardData || cachedLeaderboardData.length === 0) {
        lbList.innerHTML = '<li style="justify-content:center; color:#94a3b8;">Chưa có cao thủ nào!</li>';
        return;
    }

    lbList.innerHTML = '';
    const formatTimeFunc = window.formatTime || ((s) => `${String(Math.floor(s/60)).padStart(2, '0')}:${String(s%60).padStart(2, '0')}`);
    const realmFunc = window.calculateRealm || (() => "Phàm Nhân");

    if (currentLeaderboardTab === 'mana') {
        let records = [...cachedLeaderboardData]
            .sort((a, b) => (b.mana || 0) - (a.mana || 0))
            .slice(0, 10);

        records.forEach((p, idx) => {
            let medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `<b>${idx + 1}.</b>`;
            lbList.innerHTML += `
                <li>
                    <div class="lb-user-info">
                        <span class="lb-rank">${medal}</span>
                        <div class="lb-details">
                            <span class="lb-name">${p.name || 'Đạo Hữu'}</span>
                            <span class="realm-badge">${realmFunc(p.mana || 0)}</span>
                        </div>
                    </div>
                    <div class="lb-mana">⚡ ${p.mana || 0} Linh Lực</div>
                </li>`;
        });
    } else {
        let records = [...cachedLeaderboardData]
            .filter(p => p.battleRecord && (p.battleRecord.maxSurvivalSec > 0 || p.battleRecord.maxKills > 0))
            .sort((a, b) => {
                const secA = a.battleRecord?.maxSurvivalSec || 0;
                const secB = b.battleRecord?.maxSurvivalSec || 0;
                if (secB !== secA) return secB - secA;
                return (b.battleRecord?.maxKills || 0) - (a.battleRecord?.maxKills || 0);
            })
            .slice(0, 10);

        if (records.length === 0) {
            lbList.innerHTML = '<li style="justify-content:center; color:#94a3b8;">Chưa có chiến tích Bí Cảnh nào được ghi nhận!</li>';
            return;
        }

        records.forEach((p, idx) => {
            let medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `<b>${idx + 1}.</b>`;
            const kills = p.battleRecord?.maxKills || 0;
            const timeStr = formatTimeFunc(p.battleRecord?.maxSurvivalSec || 0);
            lbList.innerHTML += `
                <li>
                    <div class="lb-user-info">
                        <span class="lb-rank">${medal}</span>
                        <div class="lb-details">
                            <span class="lb-name">${p.name || 'Đạo Hữu'}</span>
                            <span class="realm-badge">${realmFunc(p.mana || 0)}</span>
                        </div>
                    </div>
                    <div class="lb-score-tag">
                        <span style="color:#38bdf8; font-weight:bold;">⏱️ ${timeStr}</span><br>
                        <small style="color:#ffa502;">👾 ${kills} quái</small>
                    </div>
                </li>`;
        });
    }
};

window.showLeaderboard = async function() {
    if (window.playClickSound) window.playClickSound();
    switchScreen('leaderboard-screen');
    const lbList = document.getElementById('lb-list');
    if (lbList) lbList.innerHTML = '<li>⏳ Đang tải Tiên Đạo Bảng...</li>';
    
    try {
        const snapshot = await get(ref(database, 'users'));
        if (snapshot.exists()) {
            cachedLeaderboardData = Object.values(snapshot.val());
            window.renderLeaderboardList();
        } else {
            if (lbList) lbList.innerHTML = '<li style="justify-content:center; color:#94a3b8;">Chưa có cao thủ nào!</li>';
        }
    } catch(e) {
        console.error("Lỗi tải Leaderboard:", e);
        if (lbList) lbList.innerHTML = '<li style="justify-content:center; color:#ef4444;">❌ Lỗi kết nối Thiên Giới. Vui lòng thử lại.</li>';
    }
};

window.goHome = function() { 
    if (window.playClickSound) window.playClickSound();
    switchScreen('start-screen'); 
};

// ==========================================
// 6. TÚI TRỮ VẬT & HIỆU ỨNG VẬT PHẨM
// ==========================================
window.applyItemEffect = function(item) {
    if (item === "Hồi Xuân Đan") {
        currentHp = Math.min(maxHp, currentHp + 30);
        alert("💊 Đã dùng Hồi Xuân Đan! Phục hồi 30 Sinh Mệnh.");
    } else if (item === "Tụ Linh Đan") {
        lifetimeMana += 50;
        sessionMana += 50;
        recalcStats();
        alert("✨ Đã dùng Tụ Linh Đan! Tu vi tăng vọt +50 Linh Lực.");
    } else if (item === "Tẩy Tủy Đan") {
        currentHp = maxHp;
        alert("💎 Đã dùng Tẩy Tủy Đan! Đạo thể khôi phục 100% Sinh Mệnh.");
    }
    updateCharacterUI();
    syncManaToDatabase();
};
