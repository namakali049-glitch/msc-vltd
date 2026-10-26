import './chat.js';
import './quiz.js';
import './battle.js';
import './inventory.js';
import './audio.js';
import './realm.js';
import './shop.js';

// ==========================================
// 1. CẤU HÌNH FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get, update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBn3CGkftYVVl1wr9fY8OhBAd8LKzUSyE",
  authDomain: "msc-vltd.firebaseapp.com",
  databaseURL: "https://msc-vltd-default-rtdb.firebaseio.com",
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

window.firebaseDB = database;

// ==========================================
// 2. BIẾN TOÀN CỤC & CHỈ SỐ NHÂN VẬT
// ==========================================
let currentUser = null;
let lifetimeMana = 0; 
let sessionMana = 0;  
let playerLinhThach = 0;

let inventory = {};
let learnedSkills = [];
window.learnedSkills = learnedSkills;
let battleRecord = { maxSurvivalSec: 0, maxKills: 0 };
let masteredWordsA1 = [];
let masteredWordsB1 = [];

window.currentUser = currentUser;
window.inventory = inventory;
window.battleRecord = battleRecord;
window.masteredWordsA1 = masteredWordsA1;
window.masteredWordsB1 = masteredWordsB1;
window.lifetimeMana = lifetimeMana;
window.playerLinhThach = playerLinhThach;

// --- CỜ KHÓA DỮ LIỆU ĐỂ CHỐNG RESET TÀI KHOẢN ---
let isDataLoaded = false;
window.isDataLoaded = false;

let playerStats = {
    str: 1, vit: 1, agi: 1, spi: 1,
    freePoints: 0,
    rewardedTiers: [],
    version: "v0.6_FINAL"
};
window.playerStats = playerStats;
window.stats = playerStats;

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
    if (!Array.isArray(playerStats.rewardedTiers)) playerStats.rewardedTiers = [];
    let hasReward = false;
    
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const currentRealmData = window.getRealmData ? window.getRealmData(lifetimeMana, countA1, countB1) : { rank: "Phàm Nhân" };
    const currentRank = currentRealmData.rank;

    if (window.MINOR_REALM_REWARDS) {
        window.MINOR_REALM_REWARDS.forEach(tier => {
            let canReward = (lifetimeMana >= tier.mana);
            if (tier.mana >= 12000 && currentRank && currentRank.includes("Trúc Cơ (Bình Cảnh)")) canReward = false;
            if (tier.mana >= 50000 && currentRank && currentRank.includes("Kim Đan (Bình Cảnh)")) canReward = false;

            if (canReward && !playerStats.rewardedTiers.includes(tier.id)) {
                playerStats.freePoints += tier.points;
                playerStats.rewardedTiers.push(tier.id);
                hasReward = true;
                if (window.playLootSound) window.playLootSound();
                alert(`🎉 Chúc mừng đạo hữu bước vào [${tier.name}]!\nĐược ban thưởng +${tier.points} Điểm Tiềm Năng.`);
            }
        });
    }
    if (hasReward) syncManaToDatabase();
}

function recalcStats() {
    checkMinorRealmRewards();

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(lifetimeMana, countA1, countB1) : { major: "Phàm Nhân" };

    maxHp = playerStats.vit * 10; 

    if (window.currentHp === undefined || window.currentHp > maxHp) {
        window.currentHp = maxHp;
    } 
    if (window.currentHp < 0) {
        window.currentHp = 0;
    }
    currentHp = window.currentHp;

    let maxLinhLuc = 0;
    if (realmData.major !== "Phàm Nhân") {
        maxLinhLuc = playerStats.spi * 10;
    }
    window.maxLinhLuc = maxLinhLuc;

    if (window.currentLinhLuc === undefined || window.currentLinhLuc > maxLinhLuc) {
        window.currentLinhLuc = maxLinhLuc;
    }

    thanThuc = maxLinhLuc;
    window.thanThuc = thanThuc;
    str = playerStats.str;
    swordDamage = playerStats.str * 10;
    agi = playerStats.agi;

    window.maxHp = maxHp;
    window.currentHp = currentHp;
    window.str = str;
    window.swordDamage = swordDamage;
    window.agi = agi;
    window.lifetimeMana = lifetimeMana;
}
window.recalcStats = recalcStats;

window.getSwordCount = function() {
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    const major = realmData.major;

    // Phàm nhân không có linh lực để ngự kiếm
    if (major === "Phàm Nhân") return 0;

    const spi = window.playerStats ? window.playerStats.spi : 1;
    
    // CÔNG THỨC MỚI: Mặc định có 1 thanh, cứ đạt mốc 10 điểm Tinh Thần sẽ được +1 thanh
    let calculatedSwords = Math.floor(spi / 10) + 1; 

    // Giới hạn trần phi kiếm theo từng đại cảnh giới
    let maxSwords = 1;
    if (major === "Luyện Khí Kỳ") maxSwords = 3;
    else if (major === "Trúc Cơ Kỳ") maxSwords = 5;
    else if (major === "Kim Đan Kỳ") maxSwords = 6;
    else if (major === "Nguyên Anh Kỳ") maxSwords = 7;
    else maxSwords = 7; 

    return Math.min(calculatedSwords, maxSwords);
};

window.setLifetimeMana = function(targetMana) {
    lifetimeMana = Math.max(0, targetMana);
    window.lifetimeMana = lifetimeMana;
    recalcStats();
    updateCharacterUI();
    syncManaToDatabase();
};

window.addLifetimeMana = function(amount) {
    const oldMana = window.lifetimeMana !== undefined ? window.lifetimeMana : lifetimeMana;
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;

    let targetMana = oldMana + amount;
    
    if (!window.isAdmin && countA1 < 600 && oldMana <= 12000 && targetMana > 12000) {
        targetMana = 12000;
    } else if (!window.isAdmin && countB1 < 2667 && oldMana <= 50000 && targetMana > 50000) {
        targetMana = 50000;
    }

    lifetimeMana = targetMana;
    window.lifetimeMana = lifetimeMana;
    
    recalcStats();
    updateCharacterUI();
    syncManaToDatabase();
    
    if (window.checkAndTriggerBreakthrough) window.checkAndTriggerBreakthrough(oldMana, lifetimeMana);
    return lifetimeMana;
};

window.closeBreakthroughModal = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('breakthroughModal');
    if (modal) modal.style.display = 'none';
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
    if (spiEff) spiEff.innerText = `(+${playerStats.spi * 10} Linh Lực)`;

    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.innerText = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : "Đạo Hữu";

    const manaEl = document.getElementById('profileMana');
    if (manaEl) manaEl.innerText = `${lifetimeMana} Linh Khí`;

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    
    const realmFunc = window.calculateRealm || (() => "Phàm Nhân");
    const realm = realmFunc(lifetimeMana, countA1, countB1);
    const realmEl = document.getElementById('profileRealm');
    if (realmEl) realmEl.innerText = realm;

    const badge = document.getElementById('profileRealmBadge');
    if (badge) badge.innerText = realm;

    const profileAvatar = document.getElementById('profileAvatar');
    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan-ngoi-thien.png");
    if (profileAvatar) profileAvatar.src = avatarFunc(lifetimeMana);

    const swordsTxt = document.getElementById('profileSwords');
    const swordCountFunc = window.getSwordCount || (() => 0);
    if (swordsTxt) swordsTxt.innerText = `${swordCountFunc(thanThuc)} Thanh`;

    const masteryA1 = document.getElementById('profileMasteryA1');
    const masteryB1 = document.getElementById('profileMasteryB1');
    if (masteryA1) masteryA1.innerText = `${countA1} / 900 từ (${Math.round((countA1 / 900) * 100)}%)`;
    if (masteryB1) masteryB1.innerText = `${countB1} / 4000 từ (${Math.round((countB1 / 4000) * 100)}%)`;

    // HUD thông tin Động Phủ
    const stageNameEl = document.getElementById('stageName');
    const stageRealmEl = document.getElementById('stageRealm');
    const stageAvatarEl = document.getElementById('stageAvatar');
    if (stageNameEl) stageNameEl.innerText = nameEl ? nameEl.innerText : "Đạo Hữu";
    if (stageRealmEl) stageRealmEl.innerText = realm;
    if (stageAvatarEl) stageAvatarEl.src = profileAvatar ? profileAvatar.src : avatarFunc(lifetimeMana);

    // Cập nhật Thanh Tiến Độ
    if (typeof window.getRealmProgress === 'function') {
        const currentMana = window.lifetimeMana !== undefined ? window.lifetimeMana : (lifetimeMana || 0);
        const prog = window.getRealmProgress(currentMana);
        
        const expLabel = document.getElementById('realmExpLabel');
        const expText = document.getElementById('realmExpText');
        const expFill = document.getElementById('realmExpFill');

        if (expLabel) {
            expLabel.innerText = prog.isMax ? "Đỉnh Phong Tiên Đạo" : `${prog.currentTier} ➔ ${prog.nextTier}`;
        }
        if (expText) {
            expText.innerText = prog.isMax ? "Viên Mãn" : `${prog.currentTotal} / ${prog.tierMax} LK (${Math.floor(prog.percent)}%)`;
        }
        if (expFill) {
            expFill.style.width = `${prog.percent}%`;
        }
    }

    if (typeof window.initIdleParams === 'function') {
        window.initIdleParams();
    }
} 
window.updateCharacterUI = updateCharacterUI;

// ==========================================
// 4. CHUYỂN MÀN HÌNH & XÁC THỰC FIREBASE
// ==========================================
window.goHome = function() {
    if (window.playClickSound) window.playClickSound();
    recalcStats();
    updateCharacterUI();
    if (typeof window.initIdleParams === 'function') {
        window.initIdleParams();
    }
    window.switchScreen('start-screen');
};

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
        str: stats.str, vit: stats.vit, agi: stats.agi, spi: stats.spi,
        freePoints: 0, rewardedTiers: [], version: "v0.6_FINAL"
    };
}

// ==========================================
// HỆ THỐNG LƯU VÀ TẢI DỮ LIỆU ĐÃ VÁ LỖI (CHUYỂN SANG MÙA 2)
// ==========================================
async function syncManaToDatabase() {
    if (!currentUser || !isDataLoaded) return; 
    
    try {
        // ĐỔI ĐƯỜNG DẪN TỪ 'users/' THÀNH 'users_v2/'
        const userRef = ref(database, 'users_v2/' + currentUser.uid);
        
        const currentTotalMana = window.lifetimeMana !== undefined ? window.lifetimeMana : lifetimeMana;
        const currentStats = window.playerStats || playerStats;
        const currentA1 = window.masteredWordsA1 || masteredWordsA1;
        const currentB1 = window.masteredWordsB1 || masteredWordsB1;
        
        await update(userRef, {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            mana: currentTotalMana,
            linhThach: window.playerLinhThach || 0,
            currentHp: window.currentHp !== undefined ? window.currentHp : 100,
            
            currentLinhLuc: window.currentLinhLuc !== undefined ? window.currentLinhLuc : 100,
            tuLinhBuff: window.tuLinhBuff || 0,
            itemUsageHistory: window.itemUsageHistory || {},
            
            inventory: window.inventory || {},
            learnedSkills: window.learnedSkills || [], 
            stats: currentStats,
            masteredA1: currentA1,
            masteredB1: currentB1,
            battleRecord: window.battleRecord || battleRecord,
            lastUpdated: Date.now()
        });
    } catch(e) { console.error("Lỗi đồng bộ Firebase:", e); }
}
window.syncManaToDatabase = syncManaToDatabase;

async function loadUserLifetimeMana(uid) {
    try {
        // ĐỔI ĐƯỜNG DẪN TỪ 'users/' THÀNH 'users_v2/'
        const userRef = ref(database, 'users_v2/' + uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const val = snapshot.val();
            
            lifetimeMana = Number(val.mana) || 0;
            window.lifetimeMana = lifetimeMana;
            
            window.playerLinhThach = Number(val.linhThach) || 0;
            const ltEl = document.getElementById('ui-linh-thach-main');
            if (ltEl) ltEl.innerText = window.playerLinhThach;

            window.currentHp = val.currentHp !== undefined ? Math.max(val.currentHp, 1) : 100;
            
            window.currentLinhLuc = val.currentLinhLuc !== undefined ? val.currentLinhLuc : 100;
            window.tuLinhBuff = val.tuLinhBuff || 0;
            window.itemUsageHistory = val.itemUsageHistory || {};

            inventory = val.inventory || {};
            window.inventory = inventory;
            window.learnedSkills = val.learnedSkills || [];
            
            battleRecord = val.battleRecord || { maxSurvivalSec: 0, maxKills: 0 };
            window.battleRecord = battleRecord;
            
            masteredWordsA1 = parseFirebaseArray(val.masteredA1);
            masteredWordsB1 = parseFirebaseArray(val.masteredB1);
            window.masteredWordsA1 = masteredWordsA1;
            window.masteredWordsB1 = masteredWordsB1;

            if (!val.stats || val.stats.version !== "v0.6_FINAL") {
                playerStats = generateRandomBaseStats();
                window.playerStats = playerStats;
                window.stats = playerStats;
                await update(userRef, { stats: playerStats });
            } else {
                playerStats = val.stats;
                window.playerStats = playerStats;
                window.stats = playerStats;
            }

            isDataLoaded = true;
            window.isDataLoaded = true;

            const lastUpdated = val.lastUpdated || Date.now();
            setTimeout(() => {
                if (window.processOfflineProgress) {
                    window.processOfflineProgress(lastUpdated);
                }
            }, 600);
        } else {
            isDataLoaded = true;
            window.isDataLoaded = true;
        }
    } catch(e) { 
        console.error("Lỗi tải data:", e);
    }
    
    recalcStats();
    updateCharacterUI();
    if (typeof window.initIdleParams === 'function') window.initIdleParams();
}

// ==========================================
// CÁC HÀM XÁC THỰC
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        window.currentUser = user;
        window.isAdmin = (user.email === "namakali049@gmail.com"); 

        const nameEl = document.getElementById('userDisplayName');
        if (nameEl) nameEl.innerText = user.displayName || user.email.split('@')[0];
        
        await loadUserLifetimeMana(user.uid);
        
        updateCharacterUI();
        if (typeof window.initIdleParams === 'function') {
            window.initIdleParams();
        }
        switchScreen('start-screen');
    } else {
        currentUser = null;
        window.currentUser = null;
        lifetimeMana = 0;
        masteredWordsA1 = [];
        masteredWordsB1 = [];
        inventory = {};
        window.inventory = inventory;
        
        switchScreen('auth-screen');
        checkAutoShowAnnouncement();
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
        window.playerStats = playerStats;
        window.stats = playerStats;
        
        // ĐỔI ĐƯỜNG DẪN TỪ 'users/' THÀNH 'users_v2/'
        await set(ref(database, 'users_v2/' + userCred.user.uid), { 
            name: displayName, 
            mana: 0, 
            linhThach: 0,
            inventory: {},
            stats: playerStats,
            battleRecord: { maxSurvivalSec: 0, maxKills: 0, lastUpdated: Date.now() },
            masteredA1: [], masteredB1: [], joinedAt: Date.now()
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
        
        // ĐỔI ĐƯỜNG DẪN TỪ 'users/' THÀNH 'users_v2/'
        const userRef = ref(database, 'users_v2/' + result.user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            playerStats = generateRandomBaseStats();
            window.playerStats = playerStats;
            window.stats = playerStats;
            await set(userRef, { 
                name: result.user.displayName || "Đạo Hữu", 
                mana: 0, 
                linhThach: 0,
                inventory: {}, 
                stats: playerStats,
                masteredA1: [], masteredB1: [], joinedAt: Date.now()
            });
        }
    } catch(e) { console.error("Chi tiết lỗi đăng nhập:", e); }
};

window.handleLogout = function() { 
    if (window.playClickSound) window.playClickSound();
    lifetimeMana = 0; sessionMana = 0;
    masteredWordsA1 = []; masteredWordsB1 = []; inventory = {};
    battleRecord = { maxSurvivalSec: 0, maxKills: 0 };
    playerStats = { str: 1, vit: 1, agi: 1, spi: 1, freePoints: 0, rewardedTiers: [], version: "v0.6_FINAL" };
    
    window.lifetimeMana = 0; window.masteredWordsA1 = []; window.masteredWordsB1 = [];
    window.inventory = inventory; window.battleRecord = battleRecord;
    window.playerStats = playerStats; window.stats = playerStats;
    isDataLoaded = false;
    window.isDataLoaded = false;
    
    signOut(auth); 
};

// ==========================================
// 5. HỒ SƠ & BẢNG XẾP HẠNG
// ==========================================
window.showProfile = function() {
    if (window.playClickSound) window.playClickSound();
    if (!currentUser) return;
    recalcStats();
    switchScreen('profile-screen');
    updateCharacterUI();
};

let currentLeaderboardTab = 'mana';
let cachedLeaderboardData = [];

window.switchLeaderboardTab = function(tab) {
    if (window.playClickSound) window.playClickSound();
    currentLeaderboardTab = tab;

    document.querySelectorAll('.lb-big-tab').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById('lb-tab-' + tab);
    if (activeTab) activeTab.classList.add('active');
    
    const listEl = document.getElementById('lb-list');
    if (!listEl) return;
    listEl.innerHTML = "";
    
    if (!cachedLeaderboardData || cachedLeaderboardData.length === 0) {
        listEl.innerHTML = "<li style='justify-content:center; color:#94a3b8;'>Chưa có cao thủ nào!</li>";
        return;
    }

    let sorted = [...cachedLeaderboardData];
    const descText = document.getElementById('lb-desc-text');
    
    if (tab === 'mana') {
        sorted.sort((a, b) => b.mana - a.mana);
        if (descText) descText.innerText = "Bảng xếp hạng tổng Tu Vi";
    } else {
        sorted.sort((a, b) => {
            const aTime = a.battleRecord?.maxSurvivalSec || 0;
            const bTime = b.battleRecord?.maxSurvivalSec || 0;
            if (bTime !== aTime) return bTime - aTime;
            return (b.battleRecord?.maxKills || 0) - (a.battleRecord?.maxKills || 0);
        });
        if (descText) descText.innerText = "Kỷ lục sinh tồn Bí Cảnh xuất sắc nhất";
    }
    
    const formatTime = window.formatTime || ((s) => `${String(Math.floor(s/60)).padStart(2, '0')}:${String(s%60).padStart(2, '0')}`);
    const realmFunc = window.calculateRealm || (() => "Phàm Nhân");
    
    sorted.slice(0, 10).forEach((u, index) => {
        let rankHtml = index < 3 ? ["🥇", "🥈", "🥉"][index] : `<b>${index + 1}.</b>`;
        let scoreHtml = tab === 'mana' 
            ? `<div class="lb-mana">⚡ ${u.mana} Linh Khí</div>`
            : `<div class="lb-score-tag"><span style="color:#38bdf8; font-weight:bold;">⏱️ ${formatTime(u.battleRecord?.maxSurvivalSec || 0)}</span><br><small style="color:#ffa502;">👾 ${u.battleRecord?.maxKills || 0} quái</small></div>`;
        
        let countA1 = u.masteredA1 ? (Array.isArray(u.masteredA1) ? u.masteredA1.length : Object.keys(u.masteredA1).length) : 0;
        let countB1 = u.masteredB1 ? (Array.isArray(u.masteredB1) ? u.masteredB1.length : Object.keys(u.masteredB1).length) : 0;
        const exactRealm = realmFunc(u.mana, countA1, countB1);

        listEl.innerHTML += `
        <li>
            <div class="lb-user-info">
                <span class="lb-rank">${rankHtml}</span>
                <div class="lb-details">
                    <span class="lb-name">${u.name}</span>
                    <span class="realm-badge">${exactRealm}</span>
                </div>
            </div>
            ${scoreHtml}
        </li>`;
    });
};

window.renderLeaderboardList = function() { window.switchLeaderboardTab(currentLeaderboardTab); };

window.showLeaderboard = async function() {
    if (window.playClickSound) window.playClickSound();
    window.switchScreen('leaderboard-screen');
    const listEl = document.getElementById('lb-list');
    if (listEl) listEl.innerHTML = "<p style='color:#94a3b8; text-align:center; padding-top: 20px;'>⏳ Đang kết nối Tiên Đạo Bảng...</p>";
    try {
        // ĐỔI ĐƯỜNG DẪN TỪ 'users' THÀNH 'users_v2' ĐỂ BẢNG XẾP HẠNG CHỈ LẤY DATA MỚI
        const lbRef = ref(window.firebaseDB || database, 'users_v2');
        const snapshot = await get(lbRef);
        if (snapshot.exists()) {
            cachedLeaderboardData = [];
            snapshot.forEach(childSnap => {
                const data = childSnap.val();
                cachedLeaderboardData.push({
                    name: data.name || "Ẩn Danh",
                    mana: Number(data.mana) || 0,
                    battleRecord: data.battleRecord || { maxSurvivalSec: 0, maxKills: 0 },
                    masteredA1: data.masteredA1 || [], masteredB1: data.masteredB1 || []
                });
            });
            window.switchLeaderboardTab(currentLeaderboardTab || 'mana');
        } else {
            if (listEl) listEl.innerHTML = "<p style='color:#94a3b8; text-align:center;'>Chưa có dữ liệu Tiên Đạo Bảng.</p>";
        }
    } catch (e) {
        console.error("Lỗi tải Leaderboard:", e);
        if (listEl) listEl.innerHTML = "<p style='color:#ef4444; text-align:center;'>❌ Mất kết nối tới Database!</p>";
    }
};

window.adminSetMana = function(targetMana) {
    if (!window.isAdmin) return "⛔ Quyền hạn bị từ chối!";
    const oldMana = lifetimeMana;
    lifetimeMana = targetMana; window.lifetimeMana = lifetimeMana;
    recalcStats(); updateCharacterUI(); syncManaToDatabase();
    if (window.checkAndTriggerBreakthrough) window.checkAndTriggerBreakthrough(oldMana, lifetimeMana);
    return `✅ [Admin] Đã thiết lập Tu Vi thành ${targetMana} Linh Khí!`;
};

window.adminAddItems = function(amount = 99) {
    if (!window.isAdmin) return "⛔ Quyền hạn bị từ chối!";
    if (!window.inventory) window.inventory = {};
    window.inventory["hoi_huyet_dan"] = (window.inventory["hoi_huyet_dan"] || 0) + amount;
    window.inventory["tu_linh_dan"] = (window.inventory["tu_linh_dan"] || 0) + amount;
    window.inventory["than_luc_dan"] = (window.inventory["than_luc_dan"] || 0) + amount;
    syncManaToDatabase();
    if (window.renderInventory) window.renderInventory();
    return `✅ [Admin] Đã bơm ${amount} đan dược mới vào túi đồ!`;
};

// ==========================================
// 6. THÔNG BÁO THIÊN ĐẠO & TIỆN ÍCH
// ==========================================
let cachedAnnouncement = null;
let currentFanpageUrl = "https://www.facebook.com/share/1bMhNss7GZ/";

window.openAnnouncementModal = async function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('announcementModal');
    if (modal) modal.style.display = 'flex';
    await fetchAndRenderAnnouncement();
};

window.closeAnnouncementModal = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('announcementModal');
    if (modal) modal.style.display = 'none';
    if (cachedAnnouncement && cachedAnnouncement.version) {
        localStorage.setItem('last_seen_announce_ver', cachedAnnouncement.version);
    }
};

window.goToFanpage = function() {
    if (window.playClickSound) window.playClickSound();
    window.open(currentFanpageUrl, '_blank');
};

async function fetchAndRenderAnnouncement() {
    try {
        const announceRef = ref(window.firebaseDB || database, 'announcement');
        const snapshot = await get(announceRef);
        
        if (snapshot.exists()) {
            cachedAnnouncement = snapshot.val();
            document.getElementById('announceTitle').innerText = cachedAnnouncement.title || "THIÊN ĐẠO THÔNG CÁO";
            document.getElementById('announcePatchNotes').innerText = cachedAnnouncement.patchNotes || "Không có thay đổi mới.";
            document.getElementById('announceGuide').innerText = cachedAnnouncement.gameplayGuide || "Hãy chú ý bế quan tu luyện!";
            if (cachedAnnouncement.fanpageText) document.getElementById('announceFanpageText').innerText = cachedAnnouncement.fanpageText;
            if (cachedAnnouncement.fanpageUrl) currentFanpageUrl = cachedAnnouncement.fanpageUrl;
        }
    } catch (e) {
        console.error("Lỗi tải thông báo Firebase:", e);
    }
}

async function checkAutoShowAnnouncement() {
    try {
        const announceRef = ref(window.firebaseDB || database, 'announcement');
        const snapshot = await get(announceRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const lastSeen = localStorage.getItem('last_seen_announce_ver');
            if (data.version && data.version !== lastSeen) {
                await window.openAnnouncementModal();
            }
        }
    } catch(e) {}
}

window.updateLinhThach = async function(amount) {
    if (!window.currentUser) return;
    window.playerLinhThach += amount;
    const ltEl = document.getElementById('ui-linh-thach-main');
    if (ltEl) ltEl.innerText = window.playerLinhThach;
    
    try {
        const userRef = ref(window.firebaseDB || database, 'users_v2/' + window.currentUser.uid);
        await update(userRef, { linhThach: window.playerLinhThach });
    } catch(e) {}
};

window.learnSkill = function(skillId) {
    if (!window.learnedSkills) window.learnedSkills = [];
    if (!window.learnedSkills.includes(skillId)) {
        window.learnedSkills.push(skillId);
        learnedSkills = window.learnedSkills;
        syncManaToDatabase();
    }
};

// ==========================================
// HỆ THỐNG BẢO VỆ CHỐNG F12
// ==========================================
(function initAntiInspect() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
        localStorage.setItem('admin_dev_mode', 'enabled');
        alert("🔓 Đã mở khóa chế độ Nhà Phát Triển cho thiết bị này!");
    } else if (urlParams.get('dev') === 'false') {
        localStorage.removeItem('admin_dev_mode');
        alert("🔒 Đã khóa lại chế độ kiểm tra!");
    }

    function isDeveloper() {
        const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
        const hasDevKey = localStorage.getItem('admin_dev_mode') === 'enabled';
        const isAdminAccount = Boolean(window.isAdmin);
        return isLocal || hasDevKey || isAdminAccount;
    }

    document.addEventListener('contextmenu', (e) => {
        if (isDeveloper()) return;
        e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (isDeveloper()) return;

        if (e.key === 'F12') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }

        if (e.ctrlKey && e.key.toUpperCase() === 'U') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
})();

window.addEventListener('beforeunload', () => {
    if (window.syncManaToDatabase && window.currentUser && window.isDataLoaded) {
        window.syncManaToDatabase();
    }
});
