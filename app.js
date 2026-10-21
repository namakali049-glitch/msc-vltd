import './battle.js';
import './inventory.js';
import './audio.js';
import './realm.js';
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

// ==========================================
// 2. BIẾN TOÀN CỤC & CHỈ SỐ NHÂN VẬT
// ==========================================
let currentUser = null;
let lifetimeMana = 0; 
let sessionMana = 0;  
let inventory = { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };
window.inventory = inventory;
let masteredWordsA1 = [];
window.masteredWordsA1 = masteredWordsA1;
let masteredWordsB1 = [];
window.masteredWordsB1 = masteredWordsB1;
window.masteredWordsA1 = masteredWordsA1;
window.masteredWordsB1 = masteredWordsB1;
window.lifetimeMana = lifetimeMana;
// 4 ĐẠI THUỘC TÍNH BẢN NGUYÊN (v0.6)
let playerStats = {
    str: 1,
    vit: 1,
    agi: 1,
    spi: 1,
    freePoints: 0,
    rewardedTiers: [],
    version: "v0.6_FINAL"
};

let maxHp = 100;
let currentHp = 100;
let str = 1; 
let agi = 1; 
let thanThuc = 10;
let swordDamage = 10;

let currentLevel = 1;
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 0; 
const expPerQuestion = 10;

let timerInterval = null;
let totalSeconds = 0;
let activeQuestions = []; 
let vocabPool = [];



// ==========================================
// 4. THUỘC TÍNH & GIAO DIỆN NHÂN VẬT
// ==========================================
function checkMinorRealmRewards() {
    if (!Array.isArray(playerStats.rewardedTiers)) {
        playerStats.rewardedTiers = [];
    }

    let hasReward = false;
    MINOR_REALM_REWARDS.forEach(tier => {
        if (lifetimeMana >= tier.mana && !playerStats.rewardedTiers.includes(tier.id)) {
            playerStats.freePoints += tier.points;
            playerStats.rewardedTiers.push(tier.id);
            hasReward = true;
            if (window.playLootSound) window.playLootSound();
            alert(`🎉 Chúc mừng đạo hữu bước vào [${tier.name}]!\nĐược ban thưởng +${tier.points} Điểm Tiềm Năng.`);
        }
    });

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

    // Đồng bộ ra window cho battle.js & các mô-đun khác
    window.maxHp = maxHp;
    window.currentHp = currentHp;
    window.str = str;
    window.swordDamage = swordDamage;
    window.thanThuc = thanThuc;
    window.agi = agi;
    window.lifetimeMana = lifetimeMana;
}
window.recalcStats = recalcStats;
window.formatTime = formatTime;
window.syncManaToDatabase = syncManaToDatabase;

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
    if (swordsTxt) swordsTxt.innerText = `${getSwordCount(thanThuc)} Thanh`;

    const masteryA1 = document.getElementById('profileMasteryA1');
    const masteryB1 = document.getElementById('profileMasteryB1');
    const countA1 = (typeof masteredWordsA1 !== 'undefined' && Array.isArray(masteredWordsA1)) ? masteredWordsA1.length : 0;
    const countB1 = (typeof masteredWordsB1 !== 'undefined' && Array.isArray(masteredWordsB1)) ? masteredWordsB1.length : 0;
    if (masteryA1) masteryA1.innerText = `${countA1} / 900 từ (${Math.round((countA1 / 900) * 100)}%)`;
    if (masteryB1) masteryB1.innerText = `${countB1} / 4000 từ (${Math.round((countB1 / 4000) * 100)}%)`;
}

// ==========================================
// 5. CHUYỂN MÀN HÌNH & XÁC THỰC FIREBASE
// ==========================================
window.switchScreen = function(screenId) {
    window.playClickSound();
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
    window.playClickSound();
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

// Căn cốt Phàm Nhân tổng đúng 10 điểm (Mỗi dòng tối thiểu 1)
function generateRandomBaseStats() {
    let stats = { str: 1, vit: 1, agi: 1, spi: 1 };
    let remaining = 6;
    const keys = ['str', 'vit', 'agi', 'spi'];
    for (let i = 0; i < remaining; i++) {
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
            masteredWordsA1 = parseFirebaseArray(val.masteredA1);
            masteredWordsB1 = parseFirebaseArray(val.masteredB1);

            // Bắt buộc nâng cấp nhân vật cũ lên v0.6_FINAL
            if (!val.stats || val.stats.version !== "v0.6_FINAL") {
                playerStats = generateRandomBaseStats();

                let accumulatedPoints = 0;
                let awardedTiers = [];
                MINOR_REALM_REWARDS.forEach(tier => {
                    if (lifetimeMana >= tier.mana) {
                        accumulatedPoints += tier.points;
                        awardedTiers.push(tier.id);
                    }
                });

                playerStats.freePoints = accumulatedPoints;
                playerStats.rewardedTiers = awardedTiers;

                await update(userRef, { stats: playerStats });
            } else {
                playerStats = val.stats;
            }

            highestAchievedRank = getRealmData(lifetimeMana).major;
        }
    } catch(e) { 
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
            lastUpdated: Date.now()
        });
    } catch(e) { console.error("Lỗi đồng bộ Firebase:", e); }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const nameEl = document.getElementById('userDisplayName');
        if (nameEl) nameEl.innerText = user.displayName || user.email.split('@')[0];
        await loadUserLifetimeMana(user.uid);
        switchScreen('start-screen');
    } else {
        currentUser = null;
        lifetimeMana = 0;
        masteredWordsA1 = [];
        masteredWordsB1 = [];
        switchScreen('auth-screen');
    }
});

window.handleSignup = async function() {
    window.playClickSound();
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
    window.playClickSound();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!email || !password) { alert("Nhập Email và Mật khẩu!"); return; }
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch(e) { alert("Đăng nhập thất bại: " + e.message); }
};

window.handleGoogleLogin = async function() {
    window.playClickSound();
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
    window.playClickSound();
    signOut(auth); 
};

// ==========================================
// 6. HỒ SƠ & BẢNG XẾP HẠNG
// ==========================================
window.showProfile = function() {
    window.playClickSound();
    if (!currentUser) return;
    recalcStats();
    switchScreen('profile-screen');
    
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.innerText = currentUser.displayName || currentUser.email.split('@')[0];
    
    const manaEl = document.getElementById('profileMana');
    if (manaEl) manaEl.innerText = lifetimeMana;
    
    const realm = calculateRealm(lifetimeMana);
    const realmEl = document.getElementById('profileRealm');
    if (realmEl) realmEl.innerText = realm;
    
    const badge = document.getElementById('profileRealmBadge');
    if (badge) badge.innerText = realm;
    
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.src = getAvatarByMana(lifetimeMana);
    
    const hpEl = document.getElementById('profileHp');
    if (hpEl) hpEl.innerText = `${maxHp}/${maxHp}`;
    
    const senseEl = document.getElementById('profileSense');
    if (senseEl) senseEl.innerText = thanThuc;
    
    const swordEl = document.getElementById('profileSwords');
    if (swordEl) swordEl.innerText = `${getSwordCount(thanThuc)} Thanh`;

    updateCharacterUI();
};

window.showLeaderboard = async function() {
    window.playClickSound();
    switchScreen('leaderboard-screen');
    let lbList = document.getElementById('lb-list');
    lbList.innerHTML = '<li>⏳ Đang tải Tiên Đạo Bảng...</li>';
    try {
        const snapshot = await get(ref(database, 'users'));
        if (snapshot.exists()) {
            let records = Object.values(snapshot.val()).sort((a, b) => (b.mana || 0) - (a.mana || 0)).slice(0, 10);
            lbList.innerHTML = '';
            records.forEach((p, idx) => {
                let medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `<b>${idx + 1}.</b>`;
                lbList.innerHTML += `
                    <li>
                        <div class="lb-user-info">
                            <span class="lb-rank">${medal}</span>
                            <div class="lb-details">
                                <span class="lb-name">${p.name}</span>
                                <span class="realm-badge">${calculateRealm(p.mana || 0)}</span>
                            </div>
                        </div>
                        <div class="lb-mana">⚡ ${p.mana || 0} Linh Lực</div>
                    </li>`;
            });
        } else { lbList.innerHTML = '<li>Chưa có cao thủ nào!</li>'; }
    } catch(e) { lbList.innerHTML = '<li>❌ Lỗi tải bảng xếp hạng.</li>'; }
};

window.goHome = function() { 
    window.playClickSound();
    switchScreen('start-screen'); 
};

// ==========================================
// 7. LỐI CHƠI BẾ QUAN
// ==========================================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateQuizSession(pool, numQuestions = 10) {
    let validPool = pool.filter(v => v && v.hanzi && v.meaning && v.hanzi.trim().length > 0 && v.meaning.trim().length > 0);
    const isB1 = window.currentCsvFile && window.currentCsvFile.includes("b1");
    const masteredList = isB1 ? masteredWordsB1 : masteredWordsA1;

    let unlearned = shuffleArray(validPool.filter(v => !masteredList.includes(v.hanzi.trim())));
    let learned = shuffleArray(validPool.filter(v => masteredList.includes(v.hanzi.trim())));

    let selected = [];
    selected.push(...unlearned.slice(0, Math.min(unlearned.length, 8)));
    selected.push(...learned.slice(0, numQuestions - selected.length));

    if (selected.length < numQuestions) {
        let remaining = validPool.filter(v => !selected.includes(v));
        selected.push(...shuffleArray(remaining).slice(0, numQuestions - selected.length));
    }
    selected = shuffleArray(selected);

    let quiz = [];
    selected.forEach(item => {
        let options = [item.meaning];
        let distractors = shuffleArray(validPool.filter(d => d.meaning !== item.meaning));
        for (let i = 0; i < distractors.length && options.length < 4; i++) {
            if (!options.includes(distractors[i].meaning)) {
                options.push(distractors[i].meaning);
            }
        }
        options = shuffleArray(options);
        quiz.push({
            rawVocab: item,
            q: `Đạo hữu hãy cho biết ý nghĩa của từ này:\n\n✨ ${item.hanzi} ✨\n(Phiên âm: ${item.pinyin || ''} | Loại: ${item.type || 'Từ'})`,
            options: options,
            ans: options.indexOf(item.meaning)
        });
    });
    return quiz;
}

function formatTime(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

window.currentCsvFile = "./a1_vocab.csv";
window.difficultyMultiplier = 1;

window.checkAndStartVolume = function(vol) {
    if (vol === 'trung_quyen') {
        const realmData = getRealmData(lifetimeMana);
        if (realmData.major !== "Kim Đan" && realmData.major !== "Nguyên Anh") {
            alert("⚠️ Cảnh giới chưa đủ!\nĐạo hữu cần đột phá lên [Kim Đan Chân Nhân] mới có thể mở khóa Trung Quyển.");
            return;
        }
        window.currentCsvFile = "./b1_vocab.csv";
        window.difficultyMultiplier = 1;
    } else {
        window.currentCsvFile = "./a1_vocab.csv";
        window.difficultyMultiplier = 1;
    }
    
    const hanNguModal = document.getElementById('hanNguModal');
    if (hanNguModal) hanNguModal.style.display = 'none';
    window.startGame();
};

window.startGame = async function() {
    window.playClickSound();
    switchScreen('game-screen'); 
    
    document.getElementById('question').innerText = "⏳ Đang trích xuất Khẩu Quyết...";
    
    await new Promise(resolve => {
        Papa.parse(window.currentCsvFile, {
            download: true, header: true, skipEmptyLines: true,
            complete: res => { vocabPool = res.data; resolve(); },
            error: () => { alert("❌ Lỗi nạp dữ liệu từ vựng! Đảm bảo đã có file " + window.currentCsvFile); resolve(); }
        });
    });

    currentLevel = 1; sessionMana = 0; totalSeconds = 0;
    recalcStats();
    currentHp = maxHp; 
    
    document.getElementById('quizAvatar').src = getAvatarByMana(lifetimeMana);
    document.getElementById('quizName').innerText = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : "Đạo Hữu";
    
    window.sessionThanThuc = thanThuc;
    if (thanThuc > 0) {
        document.getElementById('quizStatLabel').innerText = "Thần Thức";
        document.getElementById('quizStatValue').innerText = `${window.sessionThanThuc}/${thanThuc}`;
    } else {
        document.getElementById('quizStatLabel').innerText = "Sinh Mệnh";
        document.getElementById('quizStatValue').innerText = `${currentHp}/${maxHp}`;
    }

    const hudCount = document.getElementById('sessionMasteryCount');
    const isB1 = window.currentCsvFile && window.currentCsvFile.includes("b1");
    if (hudCount) hudCount.innerText = isB1 ? masteredWordsB1.length : masteredWordsA1.length;

    document.getElementById('timerDisplay').innerText = "00:00";
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        totalSeconds++;
        document.getElementById('timerDisplay').innerText = formatTime(totalSeconds);
    }, 1000);
    
    initLevel();
};

function initLevel() {
    currentLevelExp = 0; currentQuestionIndex = 0;
    activeQuestions = generateQuizSession(vocabPool, 10);
    
    let bonusPerQ = Math.floor(10 + str * 0.2);
    expToLevelUp = Math.floor(activeQuestions.length * 0.8) * bonusPerQ; 
    
    document.getElementById('level').innerText = currentLevel;
    document.getElementById('maxExp').innerText = expToLevelUp;
    document.getElementById('totalScore').innerText = sessionMana;
    loadQuestion();
}

function loadQuestion() {
    if (currentLevel > 4) { endGame(true); return; }
    const qData = activeQuestions[currentQuestionIndex];
    document.getElementById('counter').innerText = `Câu hỏi: ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
    document.getElementById('question').innerText = qData.q;
    
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';
    document.getElementById('message').innerText = '';
    document.getElementById('nextBtn').style.display = 'none';

    qData.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn'; btn.innerText = opt;
        btn.onclick = () => {
            window.playClickSound();
            checkAnswer(index, qData.ans, btn);
        };
        optionsDiv.appendChild(btn);
    });
    
    let expPercent = Math.min(100, (currentLevelExp / expToLevelUp) * 100);
    document.getElementById('expFill').style.width = expPercent + "%";
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = sessionMana;
}

function checkAnswer(selectedIndex, correctIndex, btnElement) {
    const buttons = document.querySelectorAll('#options .option-btn');
    buttons.forEach(b => b.onclick = null); 
    
    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        playCorrectSound();
        
        let bonusMana = Math.floor(10 + str * 0.2); 
        currentHp = Math.min(maxHp, currentHp + 2);

        const currentData = getRealmData(lifetimeMana);
        const isHighRealm = (currentData.major === "Kim Đan" || currentData.major === "Nguyên Anh");
        const isFarmingLowQuyen = (!window.currentCsvFile || window.currentCsvFile.includes("a1"));

        if (isHighRealm && isFarmingLowQuyen) {
            bonusMana = Math.max(1, Math.floor(bonusMana * 0.1));
        }
        
        let lootMessage = "";
        if (Math.random() < 0.15) {
            const items = ["Hồi Xuân Đan", "Tụ Linh Đan", "Tẩy Tủy Đan"];
            const droppedItem = items[Math.floor(Math.random() * items.length)];
            inventory[droppedItem] = (inventory[droppedItem] || 0) + 1;
            lootMessage = `<br>🎁 <b style="color:#ffa502">Kỳ Ngộ!</b> Nhặt được [<b>${droppedItem}</b>]!`;
            playLootSound();
        }

        const currentQ = activeQuestions[currentQuestionIndex];
        const isB1 = window.currentCsvFile && window.currentCsvFile.includes("b1");
        let isNewWord = false;

        if (currentQ && currentQ.rawVocab) {
            const word = currentQ.rawVocab.hanzi.trim();
            if (isB1) {
                if (!masteredWordsB1.includes(word)) {
                    masteredWordsB1.push(word);
                    isNewWord = true;
                }
            } else {
                if (!masteredWordsA1.includes(word)) {
                    masteredWordsA1.push(word);
                    isNewWord = true;
                }
            }
        }

        const masteryHUD = document.getElementById('sessionMasteryCount');
        if (masteryHUD) masteryHUD.innerText = isB1 ? masteredWordsB1.length : masteredWordsA1.length;

        let newWordNotice = isNewWord ? `<br>🌟 <b style="color:#4ade80;">Lĩnh ngộ khẩu quyết mới: [${currentQ.rawVocab.hanzi}]!</b>` : '';
        document.getElementById('message').innerHTML = `✅ Đáp đúng! +${bonusMana} Linh Lực${newWordNotice}${lootMessage}`;
        document.getElementById('message').style.color = "#2ed573";
        
        currentLevelExp += bonusMana;
        sessionMana += bonusMana;
        lifetimeMana += bonusMana;
        
        updateCharacterUI();
        syncManaToDatabase();
        checkAndTriggerBreakthrough();
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        playWrongSound();
        
        let dodgeRate = Math.min(30, agi * 0.5); 
        if (Math.random() * 100 < dodgeRate) {
            document.getElementById('message').innerText = "⚡ Thân pháp siêu phàm! Né thành công chướng ngại!";
            document.getElementById('message').style.color = "#70a1ff";
        } else {
            if (thanThuc > 0) {
                let damage = Math.ceil(thanThuc / 3);
                window.sessionThanThuc -= damage;
                if (window.sessionThanThuc < 0) window.sessionThanThuc = 0;
                
                document.getElementById('quizStatValue').innerText = `${window.sessionThanThuc}/${thanThuc}`;
                document.getElementById('message').innerText = `❌ Sai lầm! Hư tổn ${damage} Thần Thức!`;
                document.getElementById('message').style.color = "#ff4757";
                
                if (window.sessionThanThuc <= 0) {
                    setTimeout(() => { alert("💥 Thần Thức cạn kiệt! Đạo hữu đã Tẩu Hỏa Nhập Ma."); endGame(false); }, 500);
                    return;
                }
            } else {
                let damage = Math.ceil(maxHp / 3);
                currentHp -= damage;
                if (currentHp < 0) currentHp = 0;
                
                document.getElementById('quizStatValue').innerText = `${currentHp}/${maxHp}`;
                document.getElementById('message').innerText = `❌ Mất ${damage} Sinh Mệnh!`;
                document.getElementById('message').style.color = "#ff4757";
                
                if (currentHp <= 0) {
                    setTimeout(() => { alert("💥 Sinh Mệnh cạn kiệt! Bị đẩy khỏi Tàng Kinh Các."); endGame(false); }, 500);
                    return;
                }
            }
        }
    }
    
    let expPercent = Math.min(100, (currentLevelExp / expToLevelUp) * 100);
    document.getElementById('expFill').style.width = expPercent + "%";
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = sessionMana;
    document.getElementById('nextBtn').style.display = 'block';
}

window.nextQuestion = function() {
    window.playClickSound();
    currentQuestionIndex++;
    if (currentQuestionIndex >= activeQuestions.length) {
        if (currentLevelExp >= expToLevelUp) {
            currentLevel++;
            if (currentLevel <= 4) { alert(`🎉 Đột phá thành công sang Tầng ${currentLevel}!`); initLevel(); return; }
        } else {
            alert(`😢 Linh lực không đủ. Mời Đạo Hữu làm lại.`);
            endGame(false); return;
        }
    }
    loadQuestion();
};

window.stopCultivationEarly = function() {
    window.playClickSound();
    if(confirm("Đạo hữu muốn xuất quan sớm? Linh Lực lĩnh ngộ vẫn sẽ được giữ lại!")) {
        endGame(true, true);
    }
};

function endGame(win, earlyExit = false) {
    clearInterval(timerInterval);
    let title = win ? (earlyExit ? "🚪 Đã Xuất Quan Sớm" : "🏆 Bế Quan Viên Mãn!") : "💥 Tẩu Hỏa Nhập Ma!";
    let titleColor = win ? (earlyExit ? "#38bdf8" : "#2ed573") : "#ff4757";
    
    document.getElementById('question').innerHTML = 
        `<span style="color:${titleColor}; font-size:1.3rem;"><b>${title}</b></span><br><br>
        🎯 Nhận: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>
        💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana}</span>`;
    
    document.getElementById('options').innerHTML = "";
    document.getElementById('counter').innerText = "";
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('message').innerText = "";
    
    let btn = document.createElement('button');
    btn.className = "btn-main mt-10"; btn.innerText = "Trở Về Động Phủ 🏯";
    btn.onclick = goHome;
    document.getElementById('options').appendChild(btn);
}

// ==========================================
// 8. TÚI TRỮ VẬT & HIỆU ỨNG VẬT PHẨM
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


