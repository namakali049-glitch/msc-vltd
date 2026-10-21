// ==========================================
// APP.JS - LÕI ĐIỀU HÀNH HỆ THỐNG (MAIN THREAD)
// Phiên bản: v0.6_FINAL (Đã fix lỗi Scope & Firebase Hoisting)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get, update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 1. CẤU HÌNH FIREBASE 
// (Đạo hữu hãy điền Config của mình vào đây)
// ==========================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Gắn database vào window để các module khác (như chat.js) dùng chung
window.firebaseDB = db; 

// ==========================================
// 2. TẢI CÁC MODULE PHỤ THUỘC BẰNG DYNAMIC IMPORT
// (Bắt buộc chạy SAU KHI Firebase khởi tạo xong để tránh crash)
// ==========================================
Promise.all([
    import('./realm.js'),
    import('./inventory.js'),
    import('./quiz.js'),
    import('./battle.js'),
    import('./chat.js')
]).then(() => {
    console.log("✅ Các bí tịch phụ trợ đã được nạp thành công!");
}).catch(err => {
    console.warn("⚠️ Bỏ qua nạp module nếu một số file chưa tồn tại:", err);
});

// ==========================================
// 3. KHỞI TẠO BIẾN TRẠNG THÁI NGƯỜI CHƠI (GLOBAL)
// ==========================================
window.currentUser = null;
window.lifetimeMana = 0;
window.inventory = {};
window.stats = { str: 1, vit: 1, agi: 1, spi: 1, freePoints: 10, rewardedTiers: [] };
window.masteredWordsA1 = [];
window.masteredWordsB1 = [];
window.battleRecord = { maxSurvivalSec: 0, maxKills: 0 };

window.maxHp = 100;
window.currentHp = 100;
window.swordDamage = 10;
window.thanThuc = 0;

let cachedLeaderboardData = null;

// ==========================================
// 4. HỆ THỐNG ÂM THANH CƠ BẢN
// ==========================================
const sfx = {
    click: new Audio('assets/click.mp3'),
    correct: new Audio('assets/correct.mp3'),
    wrong: new Audio('assets/wrong.mp3'),
    loot: new Audio('assets/loot.mp3')
};

window.playClickSound = () => sfx.click.play().catch(()=>{});
window.playCorrectSound = () => sfx.correct.play().catch(()=>{});
window.playWrongSound = () => sfx.wrong.play().catch(()=>{});
window.playLootSound = () => sfx.loot.play().catch(()=>{});

window.toggleBGM = function() {
    window.playClickSound();
    const bgm = document.getElementById('bgmAudio');
    const btn = document.getElementById('audioToggleBtn');
    if (bgm.paused) {
        bgm.play().catch(()=>{});
        btn.innerText = "🎵 Nhạc: Bật";
        btn.classList.remove('muted');
    } else {
        bgm.pause();
        btn.innerText = "🔇 Nhạc: Tắt";
        btn.classList.add('muted');
    }
};

// ==========================================
// 5. ĐIỀU HƯỚNG MÀN HÌNH & GIAO DIỆN
// ==========================================
window.switchScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
};

window.goHome = function() {
    window.playClickSound();
    window.recalcStats();
    window.updateCharacterUI();
    window.switchScreen('start-screen');
};

// ==========================================
// 6. XÁC THỰC NGƯỜI DÙNG (AUTHENTICATION)
// ==========================================
window.switchAuthTab = function(tab) {
    window.playClickSound();
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('displayNameGroup').style.display = (tab === 'signup') ? 'block' : 'none';
};

window.handleLogin = async function() {
    window.playClickSound();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const isSignup = document.getElementById('tab-signup').classList.contains('active');
    
    if (!email || !password) return alert("Vui lòng điền đủ Tiên thư và Mật khẩu!");

    try {
        if (isSignup) {
            const displayName = document.getElementById('authDisplayName').value.trim() || "Đạo Hữu";
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: displayName });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error(error);
        alert("❌ Lỗi: " + error.message);
    }
};

window.handleGoogleLogin = async function() {
    window.playClickSound();
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        alert("❌ Lỗi đăng nhập Google: " + error.message);
    }
};

window.handleLogout = async function() {
    window.playClickSound();
    if (confirm("Đạo hữu muốn xuất quan quy ẩn?")) {
        await signOut(auth);
        window.switchScreen('auth-screen');
    }
};

// ==========================================
// 7. TẢI & LƯU DỮ LIỆU ĐỒNG BỘ LÊN SERVER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        document.getElementById('userDisplayName').innerText = user.displayName || user.email.split('@')[0];
        await loadUserData(user.uid);
        window.switchScreen('start-screen');
    } else {
        window.currentUser = null;
        window.switchScreen('auth-screen');
    }
});

async function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        window.lifetimeMana = data.mana || 0;
        window.inventory = data.inventory || {};
        window.stats = data.stats || { str: 1, vit: 1, agi: 1, spi: 1, freePoints: 10, rewardedTiers: [] };
        window.masteredWordsA1 = data.masteredA1 || [];
        window.masteredWordsB1 = data.masteredB1 || [];
        window.battleRecord = data.battleRecord || { maxSurvivalSec: 0, maxKills: 0 };
    } else {
        // Tân thủ bắt đầu
        window.lifetimeMana = 0;
        window.inventory = {};
        window.stats = { str: 1, vit: 1, agi: 1, spi: 1, freePoints: 10, rewardedTiers: [] };
        window.masteredWordsA1 = [];
        window.masteredWordsB1 = [];
        window.battleRecord = { maxSurvivalSec: 0, maxKills: 0 };
        await window.syncManaToDatabase();
    }
    
    // Tích hợp logic update Túi Trữ Vật nếu module inventory đã load
    if (window.updateInventoryUI) window.updateInventoryUI();
    window.recalcStats();
    window.updateCharacterUI();
    // ĐỒNG BỘ CẢNH GIỚI VÀO CUỐI HÀM loadUserData
    if (window.getRealmData) {
        window.highestAchievedRank = window.getRealmData(window.lifetimeMana).major;
    }
}

window.syncManaToDatabase = async function() {
    if (!window.currentUser) return;
    try {
        const userRef = ref(db, 'users/' + window.currentUser.uid);
        await update(userRef, {
            name: window.currentUser.displayName || window.currentUser.email.split('@')[0],
            mana: window.lifetimeMana,
            inventory: window.inventory,
            stats: window.stats,
            masteredA1: window.masteredWordsA1,
            masteredB1: window.masteredWordsB1,
            battleRecord: window.battleRecord
        });
    } catch (e) {
        console.error("Lỗi đồng bộ mảng:", e);
    }
};

// ==========================================
// 8. LOGIC CHỈ SỐ & ĐIỂM TIỀM NĂNG
// ==========================================
window.recalcStats = function() {
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana) : { hp: 100, thanThuc: 0 };
    
    // Khí Huyết = HP cơ bản của Cảnh giới + (VIT * 10)
    window.maxHp = realmData.hp + (window.stats.vit * 10);
    window.currentHp = window.maxHp;
    
    // Sức Mạnh = Damage Kiếm
    window.swordDamage = window.stats.str * 10;
    
    // Thần Thức = Thần thức Cảnh giới + (SPI * 10)
    window.thanThuc = realmData.thanThuc > 0 ? realmData.thanThuc + (window.stats.spi * 10) : 0;
    
    // Nhanh nhẹn dùng trực tiếp qua window.stats.agi
    window.agi = window.stats.agi;
    window.str = window.stats.str;
};

window.allocateStat = function(statName) {
    window.playClickSound();
    if (window.stats.freePoints > 0) {
        window.stats[statName]++;
        window.stats.freePoints--;
        window.recalcStats();
        window.updateCharacterUI();
        window.syncManaToDatabase();
    } else {
        alert("⚠️ Không đủ Điểm Tiềm Năng!");
    }
};

window.updateCharacterUI = function() {
    document.getElementById('profileFreePoints').innerText = window.stats.freePoints;
    document.getElementById('profileStr').innerText = window.stats.str;
    document.getElementById('profileVit').innerText = window.stats.vit;
    document.getElementById('profileAgi').innerText = window.stats.agi;
    document.getElementById('profileSpi').innerText = window.stats.spi;
    
    document.getElementById('profileStrEffect').innerText = `(${window.stats.str * 10} Sát thương)`;
    document.getElementById('profileVitEffect').innerText = `(+${window.stats.vit * 10} Máu)`;
    document.getElementById('profileAgiEffect').innerText = `(+${window.stats.agi * 10} Thân pháp)`;
    document.getElementById('profileSpiEffect').innerText = `(+${window.stats.spi * 10} Thần thức)`;

    document.getElementById('profileName').innerText = window.currentUser ? (window.currentUser.displayName || window.currentUser.email.split('@')[0]) : "Đạo Hữu";
    document.getElementById('profileMana').innerText = window.lifetimeMana;
    
    if (window.calculateRealm && window.getAvatarByMana) {
        document.getElementById('profileRealm').innerText = window.calculateRealm(window.lifetimeMana);
        document.getElementById('profileRealmBadge').innerText = window.calculateRealm(window.lifetimeMana);
        document.getElementById('profileAvatar').src = window.getAvatarByMana(window.lifetimeMana);
    }
    
    if (window.getSwordCount) {
        document.getElementById('profileSwords').innerText = `${window.getSwordCount(window.thanThuc)} Thanh`;
    }

    document.getElementById('profileMasteryA1').innerText = `${window.masteredWordsA1.length} / 600 từ`;
    document.getElementById('profileMasteryB1').innerText = `${window.masteredWordsB1.length} / 2667 từ`;
};

window.showProfile = function() {
    window.playClickSound();
    window.recalcStats();
    window.updateCharacterUI();
    window.switchScreen('profile-screen');
};

// Nhận thưởng Điểm tiềm năng khi tăng tiểu cảnh giới
window.addLifetimeMana = function(amount

// ==========================================
// 9. TIÊN ĐẠO BẢNG (LEADERBOARD)
// ==========================================
window.showLeaderboard = async function() {
    window.playClickSound();
    window.switchScreen('leaderboard-screen');
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = "<p style='color:#94a3b8; text-align:center; padding-top: 20px;'>⏳ Đang kết nối Tiên Đạo Bảng...</p>";
    
    try {
        const lbRef = ref(db, 'users');
        const snapshot = await get(lbRef);
        if (snapshot.exists()) {
            cachedLeaderboardData = [];
            snapshot.forEach(childSnap => {
                const data = childSnap.val();
                cachedLeaderboardData.push({
                    name: data.name || "Ẩn Danh",
                    mana: data.mana || 0,
                    battleRecord: data.battleRecord || { maxSurvivalSec: 0, maxKills: 0 }
                });
            });
            window.switchLeaderboardTab('mana');
        } else {
            listEl.innerHTML = "<p style='color:#94a3b8; text-align:center;'>Chưa có dữ liệu Tiên Đạo Bảng.</p>";
        }
    } catch (e) {
        console.error(e);
        listEl.innerHTML = "<p style='color:#ef4444; text-align:center;'>❌ Mất kết nối tới Database!</p>";
    }
};

window.switchLeaderboardTab = function(tab) {
    window.playClickSound();
    document.querySelectorAll('.lb-big-tab').forEach(btn => btn.classList.remove('active'));
    document.getElementById('lb-tab-' + tab).classList.add('active');
    
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = "";
    
    if (!cachedLeaderboardData) return;
    let sorted = [...cachedLeaderboardData];
    
    if (tab === 'mana') {
        sorted.sort((a, b) => b.mana - a.mana);
        document.getElementById('lb-desc-text').innerText = "Bảng xếp hạng tổng Tu Vi";
    } else {
        sorted.sort((a, b) => {
            const aTime = a.battleRecord.maxSurvivalSec || 0;
            const bTime = b.battleRecord.maxSurvivalSec || 0;
            if (bTime !== aTime) return bTime - aTime;
            return (b.battleRecord.maxKills || 0) - (a.battleRecord.maxKills || 0);
        });
        document.getElementById('lb-desc-text').innerText = "Kỷ lục sinh tồn Bí Cảnh xuất sắc nhất";
    }
    
    const getRealmFunc = window.calculateRealm || (() => "Phàm Nhân");
    const formatTime = window.formatTime || ((s) => s + "s");
    
    sorted.slice(0, 50).forEach((u, index) => {
        let rankHtml = index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`;
        let scoreHtml = tab === 'mana' 
            ? `<div class="lb-score-tag"><span class="lb-mana">${u.mana}</span> Linh Lực</div>`
            : `<div class="lb-score-tag"><span class="lb-mana">${formatTime(u.battleRecord.maxSurvivalSec)}</span><br><span style="font-size:0.7rem; color:#f87171">${u.battleRecord.maxKills} Trảm</span></div>`;
        
        listEl.innerHTML += `
        <li>
            <div class="lb-user-info">
                <span style="font-weight:bold; width:25px; text-align:center; color: #ffd700;">${rankHtml}</span>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="color:#e2e8f0;">${u.name}</span>
                    <span class="realm-badge">${getRealmFunc(u.mana)}</span>
                </div>
            </div>
            ${scoreHtml}
        </li>`;
    });
};

// ==========================================
// 10. GHI NHẬN KỶ LỤC BÍ CẢNH
// ==========================================
window.recordBattleResult = function(survivalSec, kills) {
    let isNewRecord = false;
    const curRec = window.battleRecord;
    
    // Ưu tiên 1: Thời gian sống sót lâu hơn
    // Ưu tiên 2: Cùng thời gian nhưng diệt nhiều quái hơn
    if (survivalSec > curRec.maxSurvivalSec || (survivalSec === curRec.maxSurvivalSec && kills > curRec.maxKills)) {
        window.battleRecord = { maxSurvivalSec: survivalSec, maxKills: kills };
        window.syncManaToDatabase();
        isNewRecord = true;
    }
    return isNewRecord; // Trả về true để battle.js thông báo Lập Kỷ Lục
};
