// ==========================================
// 1. CẤU HÌNH FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
    signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, ref, set, get 
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
// 2. BIẾN TOÀN CỤC & CHỈ SỐ RPG
// ==========================================
let currentUser = null;
let lifetimeMana = 0; 
let sessionMana = 0;  
let inventory = { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };

let maxHp = 100;
let currentHp = 100;
let str = 10; 
let agi = 10; 

let currentLevel = 1;
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 80; 
const expPerQuestion = 10;

// CẤU HÌNH MỚI CHO BẾ QUAN TU LUYỆN
const CULTIVATION_TIME_LIMIT = 120; // 2 phút (120 giây)
const MAX_WRONG_TRIES = 3;          // 3 lần sai = Tẩu hỏa nhập ma
let cultivationTimeLeft = CULTIVATION_TIME_LIMIT;
let wrongTries = 0;
let correctCountInRun = 0;
let isCultivationActive = false;

let timerInterval = null;
let activeQuestions = []; 
let vocabPool = [];

// ==========================================
// 3. HỆ THỐNG ÂM THANH TIÊN GIỚI
// ==========================================
let audioCtx = null;
let isBgmPlaying = false;

function getAudioContext() {
    try {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioClass) return null;
        if (!audioCtx) audioCtx = new AudioClass();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
    } catch(e) { return null; }
}

window.playClickSound = function() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.setValueAtTime(350, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.06);
    } catch(e) {}
};

function playCorrectSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + (idx * 0.06);
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.linearRampToValueAtTime(0.001, start + 0.25);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(start); osc.stop(start + 0.28);
        });
    } catch(e) {}
}

function playWrongSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(45, now + 0.28);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.28);
    } catch(e) {}
}

function playLootSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [880, 1174, 1567, 2093].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + (idx * 0.05);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.18, start);
            gain.gain.linearRampToValueAtTime(0.001, start + 0.2);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(start); osc.stop(start + 0.22);
        });
    } catch(e) {}
}

window.toggleBGM = async function() {
    window.playClickSound();
    const bgm = document.getElementById('bgmAudio');
    const btn = document.getElementById('audioToggleBtn') || document.getElementById('btn-music');
    if (!bgm) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') await ctx.resume().catch(() => {});

    if (bgm.paused) {
        try {
            bgm.volume = 0.35;
            await bgm.play();
            isBgmPlaying = true;
            if (btn) {
                btn.innerHTML = "🎵 Nhạc: Bật";
                btn.classList.remove('muted');
            }
        } catch(err) {
            if (btn) btn.innerText = "🔇 Chưa có nhạc";
        }
    } else {
        bgm.pause();
        isBgmPlaying = false;
        if (btn) {
            btn.innerHTML = "🔇 Nhạc: Tắt";
            btn.classList.add('muted');
        }
    }
};

// ==========================================
// 4. TIẾN TRÌNH NHÂN VẬT & AVATAR
// ==========================================
function calculateRealm(mana) {
    if (mana < 150) return "Phàm Nhân";
    if (mana < 300) return "Luyện Khí Sơ Kỳ";
    if (mana < 600) return "Luyện Khí Trung Kỳ";
    if (mana < 1500) return "Luyện Khí Hậu Kỳ";
    return "Trúc Cơ Sơ Kỳ";
}

function getAvatarByMana(mana) {
    if (mana < 150) return "assets/pham-nhan.jpg";
    if (mana < 1500) return "assets/luyen-khi.png";
    if (mana < 3000) return "assets/truc-co-trung-ky.png";
    return "assets/truc-co-vien-man.png";
}

function getBattleCharacterSkin() {
    if (lifetimeMana >= 3000) return battleAssets.playerTrucCoVienMan;
    if (lifetimeMana >= 1500) return battleAssets.playerTrucCoTrungKy;
    return battleAssets.playerLuyenKhi;
}

function getBattleSwordSkin() {
    return lifetimeMana >= 1500 ? battleAssets.swordCyan : battleAssets.swordWood;
}

function setAvatarWithFallback(imgElement, mana) {
    if (!imgElement) return;
    imgElement.src = getAvatarByMana(mana);
    imgElement.onerror = () => {
        if (imgElement.src.endsWith(".jpg")) imgElement.src = imgElement.src.replace(".jpg", ".png");
        else if (imgElement.src.endsWith(".png")) imgElement.src = imgElement.src.replace(".png", ".jpg");
    };
}

function recalcStats() {
    let bonusTier = Math.floor(lifetimeMana / 100);
    maxHp = 100 + (bonusTier * 15);
    str = 10 + (bonusTier * 2);
    agi = 10 + (bonusTier * 2);
}

function updateCharacterUI() {
    let hpPercent = Math.max(0, (currentHp / maxHp) * 100);
    const hpFill = document.getElementById('hpFill') || document.getElementById('hp-bar');
    const hpText = document.getElementById('hpText') || document.getElementById('hp-text');
    const statStr = document.getElementById('statStr') || document.getElementById('stat-str');
    const statAgi = document.getElementById('statAgi') || document.getElementById('stat-agi');

    if (hpFill) hpFill.style.width = hpPercent + "%";
    if (hpText) hpText.innerText = `${currentHp}/${maxHp}`;
    if (statStr) statStr.innerText = str;
    if (statAgi) statAgi.innerText = agi;
    
    const gameAvatar = document.getElementById('gameAvatar');
    if (gameAvatar) setAvatarWithFallback(gameAvatar, lifetimeMana);
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
            targetScreen.style.flexDirection = 'column';
            targetScreen.style.alignItems = 'center';
            targetScreen.style.justifyContent = 'center';
        }
    }
};

window.switchAuthTab = function(type) {
    window.playClickSound();
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const displayNameGroup = document.getElementById('displayNameGroup');
    const authSubmitBtn = document.getElementById('authSubmitBtn');

    if (tabLogin) tabLogin.classList.remove('active');
    if (tabSignup) tabSignup.classList.remove('active');
    if (displayNameGroup) displayNameGroup.style.display = 'none';

    if (type === 'login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (authSubmitBtn) {
            authSubmitBtn.innerText = "Bắt đầu Tu Luyện 🚀";
            authSubmitBtn.onclick = handleLogin;
        }
    } else {
        if (tabSignup) tabSignup.classList.add('active');
        if (displayNameGroup) displayNameGroup.style.display = 'block';
        if (authSubmitBtn) {
            authSubmitBtn.innerText = "Đăng Ký Tài Khoản 📝";
            authSubmitBtn.onclick = handleSignup;
        }
    }
};

async function loadUserLifetimeMana(uid) {
    try {
        const userRef = ref(database, 'users/' + uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            lifetimeMana = snapshot.val().mana || 0;
            inventory = snapshot.val().inventory || { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };
        }
    } catch(e) { lifetimeMana = 0; }
    recalcStats();
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
        await set(ref(database, 'users/' + userCred.user.uid), { 
            name: displayName, mana: 0, inventory: inventory 
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
    try { 
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = ref(database, 'users/' + result.user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, { 
                name: result.user.displayName || "Đạo Hữu", 
                mana: 0, inventory: inventory 
            });
        }
    } catch(e) { alert("Lỗi Google: " + e.message); }
};

window.handleLogout = function() { 
    window.playClickSound();
    signOut(auth); 
};

async function syncManaToDatabase() {
    if (!currentUser) return;
    try {
        await set(ref(database, 'users/' + currentUser.uid), {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            mana: lifetimeMana,
            inventory: inventory,
            lastUpdated: Date.now()
        });
    } catch(e) { console.error("Lỗi đồng bộ:", e); }
}

// ==========================================
// 6. HỒ SƠ & TIÊN ĐẠO BẢNG
// ==========================================
window.showProfile = function() {
    window.playClickSound();
    if (!currentUser) return;
    recalcStats();
    switchScreen('profile-screen');
    document.getElementById('profileName').innerText = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('profileMana').innerText = lifetimeMana;
    document.getElementById('profileRealm').innerText = calculateRealm(lifetimeMana);
    
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) setAvatarWithFallback(profileAvatar, lifetimeMana);
    
    document.getElementById('profileHp').innerText = `${maxHp}/${maxHp}`;
    document.getElementById('profileStr').innerText = str;
    document.getElementById('profileAgi').innerText = agi;
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
// 7. LỐI CHƠI BẾ QUAN (HỌC TỪ VỰNG - ĐẦY ĐỦ 4 TÍNH NĂNG MỚI)
// ==========================================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateQuizSession(pool, numQuestions = 10) {
    let selected = shuffleArray([...pool]).slice(0, numQuestions);
    return selected.map(vocab => {
        let options = [vocab.meaning]; 
        let attempts = 0;
        while (options.length < 4 && attempts < 50 && pool.length > 1) {
            attempts++;
            let rand = pool[Math.floor(Math.random() * pool.length)];
            if (rand && rand.meaning && !options.includes(rand.meaning)) {
                options.push(rand.meaning);
            }
        }
        options = shuffleArray(options);
        return {
            q: `Đạo hữu hãy cho biết ý nghĩa của từ này:\n\n✨ ${vocab.hanzi} ✨\n(Phiên âm: ${vocab.pinyin} | Loại: ${vocab.type})`,
            options: options, 
            ans: options.indexOf(vocab.meaning)
        };
    });
}

function formatTime(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

// CẬP NHẬT GIAO DIỆN TRÁI TIM TÂM MA
function updateHeartsUI() {
    const heartsContainer = document.getElementById('hearts-container') || document.getElementById('cultivation-lives');
    if (!heartsContainer) return;
    const hearts = heartsContainer.querySelectorAll('.heart, .life-icon');
    hearts.forEach((h, idx) => {
        if (idx < MAX_WRONG_TRIES - wrongTries) {
            h.classList.remove('lost');
            h.style.opacity = "1";
            h.style.filter = "none";
        } else {
            h.classList.add('lost');
            h.style.opacity = "0.2";
            h.style.filter = "grayscale(100%)";
        }
    });
}

// CẬP NHẬT ĐỒNG HỒ ĐẾM NGƯỢC
function updateTimerDisplay() {
    const timerElem = document.getElementById('timerDisplay') || document.getElementById('countdown-timer');
    if (timerElem) {
        timerElem.innerText = formatTime(cultivationTimeLeft);
    }
}

// BẮT ĐẦU BẾ QUAN
window.startGame = async function() {
    window.playClickSound();
    switchScreen('game-screen'); 
    
    // Tự động nạp file từ vựng CSV gốc
    if (vocabPool.length === 0) {
        const qElem = document.getElementById('question');
        if (qElem) qElem.innerText = "⏳ Đang mở Tàng Kinh Các...";
        await new Promise(resolve => {
            Papa.parse("./a1_vocab.csv", {
                download: true, header: true, skipEmptyLines: true,
                complete: res => { vocabPool = res.data; resolve(); },
                error: () => { alert("❌ Lỗi nạp dữ liệu từ vựng CSV!"); resolve(); }
            });
        });
    }

    currentLevel = 1; 
    sessionMana = 0; 
    wrongTries = 0;
    correctCountInRun = 0;
    cultivationTimeLeft = CULTIVATION_TIME_LIMIT;
    isCultivationActive = true;

    recalcStats();
    currentHp = maxHp; 
    updateCharacterUI();
    updateHeartsUI();
    updateTimerDisplay();

    // Khởi động đồng hồ đếm ngược từ 02:00 về 00:00
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isCultivationActive) return;
        cultivationTimeLeft--;
        updateTimerDisplay();

        if (cultivationTimeLeft <= 0) {
            stopCultivation('timeout');
        }
    }, 1000);
    
    initLevel();
};

function initLevel() {
    currentLevelExp = 0; 
    currentQuestionIndex = 0;
    activeQuestions = generateQuizSession(vocabPool, 10);
    expToLevelUp = Math.floor(activeQuestions.length * 0.8) * expPerQuestion; 
    
    const lvlEl = document.getElementById('level') || document.getElementById('current-floor');
    const maxExpEl = document.getElementById('maxExp');
    const totalScoreEl = document.getElementById('totalScore') || document.getElementById('run-exp');

    if (lvlEl) lvlEl.innerText = currentLevel;
    if (maxExpEl) maxExpEl.innerText = expToLevelUp;
    if (totalScoreEl) totalScoreEl.innerText = sessionMana;
    
    loadQuestion();
}

function loadQuestion() {
    if (currentLevel > 4) { stopCultivation('completed'); return; }
    if (currentQuestionIndex >= activeQuestions.length) {
        stopCultivation('completed');
        return;
    }

    const qData = activeQuestions[currentQuestionIndex];
    const counterEl = document.getElementById('counter') || document.getElementById('quiz-counter');
    const questionEl = document.getElementById('question');
    const optionsDiv = document.getElementById('options') || document.getElementById('options-container');

    if (counterEl) counterEl.innerText = `Câu hỏi: ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
    if (questionEl) questionEl.innerText = qData.q;
    
    if (optionsDiv) optionsDiv.innerHTML = '';
    const msgEl = document.getElementById('message');
    if (msgEl) msgEl.innerText = '';
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.style.display = 'none';

    qData.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn'; 
        btn.innerText = opt;
        btn.onclick = () => {
            window.playClickSound();
            checkAnswer(index, qData.ans, btn);
        };
        if (optionsDiv) optionsDiv.appendChild(btn);
    });
    
    updateExpUI();
    updateCharacterUI();
}

function updateExpUI() {
    let expPercent = Math.min(100, (currentLevelExp / expToLevelUp) * 100);
    const expFill = document.getElementById('expFill') || document.getElementById('exp-bar');
    const expText = document.getElementById('exp');
    const expTextFull = document.getElementById('exp-text');
    const totalScore = document.getElementById('totalScore') || document.getElementById('run-exp');

    if (expFill) expFill.style.width = expPercent + "%";
    if (expText) expText.innerText = currentLevelExp;
    if (expTextFull) expTextFull.innerText = `${currentLevelExp} / ${expToLevelUp} Linh Lực Yêu Cầu`;
    if (totalScore) totalScore.innerText = sessionMana;
}

function checkAnswer(selectedIndex, correctIndex, btnElement) {
    if (!isCultivationActive) return;
    const buttons = document.querySelectorAll('.options .option-btn, .options-container .option-btn');
    buttons.forEach(b => b.onclick = null); 
    
    if (selectedIndex === correctIndex) {
        // TRẢ LỜI ĐÚNG
        btnElement.classList.add('correct');
        playCorrectSound();
        correctCountInRun++;
        
        let bonusMana = Math.floor(expPerQuestion + (str * 0.2));
        currentHp = Math.min(maxHp, currentHp + 2);
        
        let lootMessage = "";
        if (Math.random() < 0.15) {
            const items = ["Hồi Xuân Đan", "Tụ Linh Đan", "Tẩy Tủy Đan"];
            const droppedItem = items[Math.floor(Math.random() * items.length)];
            inventory[droppedItem] = (inventory[droppedItem] || 0) + 1;
            lootMessage = `<br>🎁 <b style="color:#ffa502">Kỳ Ngộ!</b> Nhặt được [<b>${droppedItem}</b>]!`;
            playLootSound();
        }

        const msg = document.getElementById('message');
        if (msg) {
            msg.innerHTML = `✅ Đáp đúng! +${bonusMana} Linh Lực (STR +${Math.floor(str * 0.2)})${lootMessage}`;
            msg.style.color = "#2ed573";
        }
        
        currentLevelExp += bonusMana;
        sessionMana += bonusMana;
        lifetimeMana += bonusMana; 
        
        recalcStats();
        updateCharacterUI();
        updateExpUI();
        syncManaToDatabase();

        // Tự động chuyển câu sau 0.6s nếu không có nút Next
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'block';
        } else {
            setTimeout(() => { window.nextQuestion(); }, 600);
        }
    } else {
        // TRẢ LỜI SAI (TÍNH TÂM MA - TRỪ MẠNG)
        btnElement.classList.add('wrong');
        if (buttons[correctIndex]) buttons[correctIndex].classList.add('correct');
        playWrongSound();
        
        wrongTries++;
        updateHeartsUI();

        // Kiểm tra điều kiện 3 lần sai
        if (wrongTries >= MAX_WRONG_TRIES) {
            setTimeout(() => { stopCultivation('demon'); }, 600);
            return;
        }

        let dodgeRate = Math.min(30, agi * 0.5); 
        if (Math.random() * 100 < dodgeRate) {
            const msg = document.getElementById('message');
            if (msg) {
                msg.innerText = "⚡ Thân pháp siêu phàm! Né thành công Tâm Ma!";
                msg.style.color = "#70a1ff";
            }
        } else {
            currentHp -= 20;
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.classList.add('damage-flash');
                setTimeout(() => gameScreen.classList.remove('damage-flash'), 400);
            }
            const msg = document.getElementById('message');
            if (msg) {
                msg.innerText = `❌ Tâm Ma Phản Phệ! Mất 20 Sinh Mệnh!`;
                msg.style.color = "#ff4757";
            }
        }
        updateCharacterUI();

        if (currentHp <= 0) {
            setTimeout(() => { stopCultivation('demon'); }, 500);
            return;
        }

        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'block';
        } else {
            setTimeout(() => { window.nextQuestion(); }, 700);
        }
    }
}

window.nextQuestion = function() {
    window.playClickSound();
    currentQuestionIndex++;
    if (currentQuestionIndex >= activeQuestions.length) {
        if (currentLevelExp >= expToLevelUp) {
            currentLevel++;
            if (currentLevel <= 4) { 
                alert(`🎉 Đột phá thành công sang Tầng ${currentLevel}!`); 
                initLevel(); 
                return; 
            } else {
                stopCultivation('completed');
                return;
            }
        } else {
            stopCultivation('failed');
            return;
        }
    }
    loadQuestion();
};

// DỪNG TU LUYỆN (XUẤT QUAN CHỦ ĐỘNG HOẶC HẾT MẠNG / HẾT GIỜ)
window.stopCultivation = function(reason = 'manual') {
    if (!isCultivationActive) return;
    isCultivationActive = false;
    clearInterval(timerInterval);
    syncManaToDatabase();

    const summaryModal = document.getElementById('summary-modal') || document.getElementById('cultivation-summary-modal');
    
    // Nếu có Modal Tổng Kết, nạp thông tin chi tiết vào Modal
    if (summaryModal) {
        const titleEl = document.getElementById('modal-title') || document.getElementById('summary-title');
        const descEl = document.getElementById('modal-desc') || document.getElementById('summary-reason');
        const correctEl = document.getElementById('summary-correct');
        const gainedEl = document.getElementById('summary-gained') || document.getElementById('summary-exp');
        const totalEl = document.getElementById('summary-total');

        if (reason === 'demon') {
            if (titleEl) { titleEl.innerText = "💥 Tẩu Hỏa Nhập Ma!"; titleEl.style.color = "#ef4444"; }
            if (descEl) descEl.innerText = "Đạo hữu tâm trí bất định, chọn sai quá 3 lần, buộc phải ngưng tụ chân khí xuất quan!";
        } else if (reason === 'timeout') {
            if (titleEl) { titleEl.innerText = "⌛ Mãn Hạn Bế Quan!"; titleEl.style.color = "#facc15"; }
            if (descEl) descEl.innerText = "Thời hạn bế quan 2 phút đã kết thúc, chân khí tự động quy về đan điền.";
        } else if (reason === 'completed') {
            if (titleEl) { titleEl.innerText = "🎉 Viên Mãn Xuất Quan!"; titleEl.style.color = "#4ade80"; }
            if (descEl) descEl.innerText = "Chúc mừng đạo hữu đã thông triệt toàn bộ khẩu quyết của đợt tịnh tu này!";
        } else {
            if (titleEl) { titleEl.innerText = "🚪 Chủ Động Xuất Quan"; titleEl.style.color = "#38bdf8"; }
            if (descEl) descEl.innerText = "Đạo hữu chủ động thu công, bảo toàn toàn vẹn số linh lực đã lĩnh ngộ.";
        }

        if (correctEl) correctEl.innerText = `${correctCountInRun} / ${activeQuestions.length}`;
        if (gainedEl) gainedEl.innerText = `+${sessionMana} Linh Lực`;
        if (totalEl) totalEl.innerText = `${currentLevelExp} / ${expToLevelUp}`;

        summaryModal.classList.remove('hidden');
        summaryModal.style.display = 'flex';
    } else {
        // Fallback giao diện cũ nếu chưa nhúng Modal
        endGame(reason !== 'demon');
    }
};

window.closeSummaryModal = function() {
    window.playClickSound();
    const summaryModal = document.getElementById('summary-modal') || document.getElementById('cultivation-summary-modal');
    if (summaryModal) {
        summaryModal.classList.add('hidden');
        summaryModal.style.display = 'none';
    }
    goHome();
};

function endGame(win) {
    clearInterval(timerInterval);
    const qElem = document.getElementById('question');
    if (qElem) {
        qElem.innerHTML = win ? 
            `🏆 <b>Đột Phá Thành Công!</b><br><br>🎯 Nhận: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana}</span>` : 
            `💥 <b>Tẩu Hỏa Nhập Ma!</b><br><br>🎯 Nhận: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana}</span>`;
    }
    
    const options = document.getElementById('options');
    if (options) {
        options.innerHTML = "";
        let btn = document.createElement('button');
        btn.className = "primary-btn"; btn.innerText = "Xem Tiên Đạo Bảng 🏆";
        btn.onclick = showLeaderboard;
        options.appendChild(btn);
    }
    const counter = document.getElementById('counter');
    if (counter) counter.innerText = "";
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.style.display = 'none';
    const message = document.getElementById('message');
    if (message) message.innerText = "";
}

// ==========================================
// 8. TÚI TRỮ VẬT
// ==========================================
window.openInventory = function() {
    window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'block';
    updateInventoryUI();
};

window.closeInventory = function() {
    window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'none';
};

function updateInventoryUI() {
    const invList = document.getElementById('inventoryList');
    if (!invList) return;
    invList.innerHTML = '';
    
    const itemEffects = {
        "Hồi Xuân Đan": "Hồi phục ngay 30 Sinh Mệnh.",
        "Tụ Linh Đan": "Sử dụng nhận ngay +50 Linh Lực.",
        "Tẩy Tủy Đan": "Sinh Mệnh phục hồi hoàn toàn."
    };

    let hasItems = false;
    for (let item in inventory) {
        if (inventory[item] > 0) {
            hasItems = true;
            invList.innerHTML += `
            <div class="item-card">
                <div class="item-card-info">
                    <h4>${item} (x${inventory[item]})</h4>
                    <p>${itemEffects[item]}</p>
                </div>
                <button class="primary-btn" style="background:#3742fa; width:auto; margin:0; padding:8px 15px;" onclick="useItem('${item}')">Dùng</button>
            </div>`;
        }
    }
    if (!hasItems) {
        invList.innerHTML = '<p style="color:#aaa; font-size:14px;">Túi đồ trống không! Hãy trả lời câu hỏi để rớt đan dược.</p>';
    }
}

window.useItem = function(item) {
    window.playClickSound();
    if (inventory[item] > 0) {
        inventory[item]--;
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
        updateInventoryUI();
        updateCharacterUI();
        syncManaToDatabase();
    }
};

// ==========================================
// 9. ĐỘNG CƠ BÍ CẢNH TRẢM YÊU (CANVAS 2D)
// ==========================================
let battleAnimationFrame = null;
let battleData = {
    player: { x: 400, y: 300, radius: 24 },
    orbitAngle: 0,
    swords: [],
    enemies: [],
    particles: [],
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
    playerLuyenKhi: new Image(),
    playerTrucCo: new Image(),
    playerTrucCoTrungKy: new Image(),
    playerTrucCoVienMan: new Image(),
    swordWood: new Image(),
    swordCyan: new Image(),
    enemyGhost: new Image()
};

battleAssets.bg.src = "assets/hac-am-son-dong.png";
battleAssets.playerLuyenKhi.src = "assets/luyen-khi.png";
battleAssets.playerTrucCo.src = "assets/truc-co.png";
battleAssets.playerTrucCoTrungKy.src = "assets/truc-co-trung-ky.png";
battleAssets.playerTrucCoVienMan.src = "assets/truc-co-vien-man.png";
battleAssets.swordWood.src = "assets/kiem-khi-luyen-khi.png";
battleAssets.swordCyan.src = "assets/kiem-khi-truc-co.png";
battleAssets.enemyGhost.src = "assets/quy-hon.png";

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
    window.playClickSound();
    switchScreen('battle-screen');
    
    const invBtn = document.querySelector('.inventory-btn');
    const audioBtn = document.getElementById('audioToggleBtn');
    if (invBtn) invBtn.style.display = 'none';
    if (audioBtn) audioBtn.style.display = 'none';

    resizeBattleCanvas();
    recalcStats();
    
    let count = 2;
    if (lifetimeMana >= 3000) count = 5;
    else if (lifetimeMana >= 1500) count = 4;
    else if (lifetimeMana >= 300) count = 3;

    battleData.swords = Array.from({ length: count }, () => ({ active: true }));
    battleData.enemies = [];
    battleData.particles = [];
    battleData.kills = 0;
    battleData.orbitAngle = 0;
    battleData.frameCount = 0;
    battleData.screenShake = 0;
    battleData.damageFlash = 0;
    moveDir.up = moveDir.down = moveDir.left = moveDir.right = false;
    
    battleData.player.x = battleCanvas.width / 2;
    battleData.player.y = battleCanvas.height / 2;
    currentHp = maxHp;

    if (battleAnimationFrame) cancelAnimationFrame(battleAnimationFrame);
    battleLoop();
};

window.exitBattle = function() {
    window.playClickSound();
    if (battleAnimationFrame) cancelAnimationFrame(battleAnimationFrame);
    
    const invBtn = document.querySelector('.inventory-btn');
    const audioBtn = document.getElementById('audioToggleBtn');
    if (invBtn) invBtn.style.display = 'block';
    if (audioBtn) audioBtn.style.display = 'block';

    moveDir.up = moveDir.down = moveDir.left = moveDir.right = false;
    syncManaToDatabase();
    goHome();
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
        x: x, y: y, radius: 18,
        speed: 1.1 + Math.random() * 0.7,
        hp: 20 + Math.floor(lifetimeMana / 250)
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

    // 1. Vẽ bản đồ sơn động
    if (battleAssets.bg.complete && battleAssets.bg.naturalWidth > 0) {
        battleCtx.drawImage(battleAssets.bg, 0, 0, battleCanvas.width, battleCanvas.height);
    } else {
        battleCtx.fillStyle = "#0c1017";
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
    }

    // 2. Vẽ hạt nổ linh lực
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

    // 3. Vẽ Nhân Vật Chibi
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

    // 4. Vẽ Kiếm Trận Xoay Quanh
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

            for (let i = battleData.enemies.length - 1; i >= 0; i--) {
                const en = battleData.enemies[i];
                if (Math.hypot(sx - en.x, sy - en.y) < en.radius + 15) {
                    en.hp -= (str * 2 + 10);
                    sword.active = false; 

                    const kdx = en.x - battleData.player.x;
                    const kdy = en.y - battleData.player.y;
                    const kdist = Math.hypot(kdx, kdy);
                    if (kdist > 0.001) {
                        en.x += (kdx / kdist) * 20;
                        en.y += (kdy / kdist) * 20;
                    }

                    if (en.hp <= 0) {
                        spawnDeathParticles(en.x, en.y, "#00d2d3");
                        battleData.enemies.splice(i, 1);
                        battleData.kills++;

                        const roll = Math.random();
                        if (roll < 0.15) {
                            inventory["Hồi Xuân Đan"] = (inventory["Hồi Xuân Đan"] || 0) + 1;
                            playLootSound();
                        } else if (roll < 0.20) {
                            inventory["Tụ Linh Đan"] = (inventory["Tụ Linh Đan"] || 0) + 1;
                            playLootSound();
                        }
                    }

                    const cd = Math.max(1000, 3200 - agi * 25);
                    setTimeout(() => { sword.active = true; }, cd);
                    break;
                }
            }
        }
    });

    // 5. Quái vật bám đuổi
    if (battleData.frameCount % 50 === 0) spawnBattleEnemy();

    for (let i = battleData.enemies.length - 1; i >= 0; i--) {
        const en = battleData.enemies[i];
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
            let dodge = Math.min(30, agi * 0.5);
            if (Math.random() * 100 >= dodge) {
                currentHp -= 15;
                battleData.screenShake = 12;
                battleData.damageFlash = 6;
                playWrongSound();
            }
            spawnDeathParticles(en.x, en.y, "#ff4757");
            battleData.enemies.splice(i, 1);

            if (currentHp <= 0) {
                battleCtx.restore();
                alert(`💥 Đạo thể tổn hao nặng nề! Buộc phải rút lui. Đã trảm sát ${battleData.kills} Quái vật.`);
                exitBattle();
                return;
            }
        }
    }

    if (battleData.damageFlash > 0) {
        battleCtx.fillStyle = `rgba(255, 0, 0, ${battleData.damageFlash * 0.06})`;
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
        battleData.damageFlash--;
    }

    battleCtx.restore();

    // 6. Cập nhật HUD trong trận
    const hpEl = document.getElementById('battleHpText');
    const swordEl = document.getElementById('battleSwordText');
    const killsEl = document.getElementById('battleKillsText');
    if (hpEl) hpEl.innerText = `❤️ Sinh Mệnh: ${Math.max(0, currentHp)}/${maxHp}`;
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

function unlockAudioOnInteraction() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    document.removeEventListener('click', unlockAudioOnInteraction);
    document.removeEventListener('keydown', unlockAudioOnInteraction);
}
document.addEventListener('click', unlockAudioOnInteraction);
document.addEventListener('keydown', unlockAudioOnInteraction);
