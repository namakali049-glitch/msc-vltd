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
// 2. BIẾN TOÀN CỤC & CHỈ SỐ NHÂN VẬT
// ==========================================
let currentUser = null;
let lifetimeMana = 0; 
let sessionMana = 0;  
let inventory = { "Hồi Xuân Đan": 0, "Tụ Linh Đan": 0, "Tẩy Tủy Đan": 0 };

let maxHp = 100;
let currentHp = 100;
let str = 10; 
let agi = 10; 
let thanThuc = 0; // Thần thức điều khiển phi kiếm 

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
// 3. HỆ THỐNG ÂM THANH
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
    const btn = document.getElementById('audioToggleBtn');
    if (!bgm) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') await ctx.resume().catch(() => {});

    if (bgm.paused) {
        try {
            bgm.volume = 0.35;
            await bgm.play();
            isBgmPlaying = true;
            if (btn) {
                btn.innerText = "🎵 Nhạc: Bật";
                btn.classList.remove('muted');
            }
        } catch(err) {
            if (btn) btn.innerText = "🔇 Chưa có nhạc";
        }
    } else {
        bgm.pause();
        isBgmPlaying = false;
        if (btn) {
            btn.innerText = "🔇 Nhạc: Tắt";
            btn.classList.add('muted');
        }
    }
};

// ==========================================
// 4. TIẾN TRÌNH & HÌNH ẢNH CẢNH GIỚI (CẬP NHẬT MỚI)
// ==========================================
function getRealmData(mana) {
    if (mana < 150) {
        return { rank: "Phàm Nhân", hp: 100, thanThuc: 0 };
    }
    if (mana < 400) {
        return { rank: "Luyện Khí Sơ Kỳ", hp: 250, thanThuc: 100 };
    }
    if (mana < 800) {
        return { rank: "Luyện Khí Trung Kỳ", hp: 400, thanThuc: 200 };
    }
    if (mana < 1500) {
        return { rank: "Luyện Khí Hậu Kỳ", hp: 550, thanThuc: 300 };
    }
    if (mana < 2500) {
        return { rank: "Trúc Cơ Sơ Kỳ", hp: 700, thanThuc: 400 };
    }
    if (mana < 4000) {
        return { rank: "Trúc Cơ Trung Kỳ", hp: 850, thanThuc: 500 };
    }
    return { rank: "Trúc Cơ Hậu Kỳ", hp: 1000, thanThuc: 600 };
}

function calculateRealm(mana) {
    return getRealmData(mana).rank;
}

// Điều kiện điều khiển số lượng phi kiếm theo Thần Thức
function getSwordCount(sense) {
    if (sense >= 600) return 4;
    if (sense >= 400) return 3;
    if (sense >= 300) return 2;
    if (sense >= 100) return 1;
    return 0;
}

function recalcStats() {
    const data = getRealmData(lifetimeMana);
    maxHp = data.hp;
    thanThuc = data.thanThuc;
    if (currentHp > maxHp) currentHp = maxHp;
}

function getAvatarByMana(mana) {
    if (mana < 150) return "assets/pham-nhan.jpg";
    if (mana < 1500) return "assets/luyen-khi.jpg";
    if (mana < 2500) return "assets/truc-co.jpg";
    if (mana < 4000) return "assets/truc-co-trung-ky.png";
    return "assets/truc-co-vien-man.png";
}

function getBattleCharacterSkin() {
    if (lifetimeMana >= 4000) return battleAssets.playerTrucCoVienMan;
    if (lifetimeMana >= 2500) return battleAssets.playerTrucCoTrungKy;
    if (lifetimeMana >= 1500) return battleAssets.playerTrucCo;
    return battleAssets.playerLuyenKhi;
}

function getBattleSwordSkin() {
    return lifetimeMana >= 1500 ? battleAssets.swordCyan : battleAssets.swordWood;
}

function updateCharacterUI() {
    recalcStats();
    const hpTxt = document.getElementById('profileHp');
    const senseTxt = document.getElementById('profileSense');
    const swordsTxt = document.getElementById('profileSwords');
    if (hpTxt) hpTxt.innerText = `${currentHp}/${maxHp}`;
    if (senseTxt) senseTxt.innerText = thanThuc;
    if (swordsTxt) swordsTxt.innerText = `${getSwordCount(thanThuc)} Thanh`;
}
// ==========================================
// 5. CHUYỂN MÀN HÌNH & XÁC THỰC
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
// 6. HỒ SƠ & BẢNG XẾP HẠNG
// ==========================================
window.showProfile = function() {
    window.playClickSound();
    if (!currentUser) return;
    recalcStats();
    switchScreen('profile-screen');
    document.getElementById('profileName').innerText = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('profileMana').innerText = lifetimeMana;
    const realm = calculateRealm(lifetimeMana);
    document.getElementById('profileRealm').innerText = realm;
    const badge = document.getElementById('profileRealmBadge');
    if (badge) badge.innerText = realm;
    
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.src = getAvatarByMana(lifetimeMana);
    
    document.getElementById('profileHp').innerText = `${maxHp}/${maxHp}`;
    const senseEl = document.getElementById('profileSense');
    if (senseEl) senseEl.innerText = thanThuc;
    const swordEl = document.getElementById('profileSwords');
    if (swordEl) swordEl.innerText = `${getSwordCount(thanThuc)} Thanh`;
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
// 7. LỐI CHƠI BẾ QUAN (HỌC TỪ VỰNG GỐC)
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

window.startGame = async function() {
    window.playClickSound();
    switchScreen('game-screen'); 
    if (vocabPool.length === 0) {
        document.getElementById('question').innerText = "⏳ Đang mở Tàng Kinh Các...";
        await new Promise(resolve => {
            Papa.parse("./a1_vocab.csv", {
                download: true, header: true, skipEmptyLines: true,
                complete: res => { vocabPool = res.data; resolve(); },
                error: () => { alert("❌ Lỗi nạp dữ liệu từ vựng CSV!"); resolve(); }
            });
        });
    }

    currentLevel = 1; sessionMana = 0; totalSeconds = 0;
    recalcStats();
    currentHp = maxHp; 
    
    // Nạp Avatar, Tên và Chỉ số cho màn hình Bế Quan
    document.getElementById('quizAvatar').src = getAvatarByMana(lifetimeMana);
    document.getElementById('quizName').innerText = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : "Đạo Hữu";
    
    window.sessionThanThuc = thanThuc; // Lưu thần thức hiện tại
    if (thanThuc > 0) {
        document.getElementById('quizStatLabel').innerText = "Thần Thức";
        document.getElementById('quizStatValue').innerText = window.sessionThanThuc;
    } else {
        // Nếu là Phàm Nhân (0 Thần thức), hệ thống tự đổi sang hiển thị Sinh Mệnh
        document.getElementById('quizStatLabel').innerText = "Sinh Mệnh";
        document.getElementById('quizStatValue').innerText = currentHp;
    }

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
    expToLevelUp = Math.floor(activeQuestions.length * 0.8) * expPerQuestion; 
    
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
    const buttons = document.querySelectorAll('.options-container .option-btn');
    buttons.forEach(b => b.onclick = null); 
    
    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        playCorrectSound();
        
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

        document.getElementById('message').innerHTML = `✅ Đáp đúng! +${bonusMana} Linh Lực (STR +${Math.floor(str * 0.2)})${lootMessage}`;
        document.getElementById('message').style.color = "#2ed573";
        
        currentLevelExp += bonusMana;
        sessionMana += bonusMana;
        lifetimeMana += bonusMana; 
        
        recalcStats();
        syncManaToDatabase();
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        playWrongSound();
        
        let dodgeRate = Math.min(30, agi * 0.5); 
        if (Math.random() * 100 < dodgeRate) {
            document.getElementById('message').innerText = "⚡ Thân pháp siêu phàm! Né thành công chướng ngại!";
            document.getElementById('message').style.color = "#70a1ff";
        } else {
            // CƠ CHẾ TRỪ 1/3 (Thần Thức hoặc Sinh Mệnh)
            if (thanThuc > 0) {
                // Tu sĩ: Trừ 1/3 Thần Thức hiện có
                let damage = Math.ceil(window.sessionThanThuc / 3);
                if (damage < 1) damage = 1;
                window.sessionThanThuc -= damage;
                
                document.getElementById('quizStatValue').innerText = window.sessionThanThuc;
                document.getElementById('message').innerText = `❌ Sai lầm! Hư tổn ${damage} Thần Thức!`;
                document.getElementById('message').style.color = "#ff4757";
                
                if (window.sessionThanThuc <= 0) {
                    setTimeout(() => { alert("💥 Thần Thức cạn kiệt! Đạo hữu đã Tẩu Hỏa Nhập Ma, buộc phải xuất quan."); endGame(false); }, 500);
                    return;
                }
            } else {
                // Phàm Nhân: Trừ 1/3 Sinh Mệnh hiện có
                let damage = Math.ceil(currentHp / 3);
                currentHp -= damage;
                
                document.getElementById('quizStatValue').innerText = currentHp;
                document.getElementById('message').innerText = `❌ Khí huyết đảo nghịch! Mất ${damage} Sinh Mệnh!`;
                document.getElementById('message').style.color = "#ff4757";
                
                if (currentHp <= 0) {
                    setTimeout(() => { alert("💥 Sinh Mệnh cạn kiệt! Ngất xỉu và bị đẩy khỏi Tàng Kinh Các."); endGame(false); }, 500);
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
            alert(`😢 Linh lực không đủ (Cần tối thiểu ${expToLevelUp}). Mời Đạo Hữu làm lại.`);
            endGame(false); return;
        }
    }
    loadQuestion();
};

// Hàm xuất quan sớm (Tạm dừng)
window.stopCultivationEarly = function() {
    window.playClickSound();
    if(confirm("Đạo hữu muốn xuất quan sớm?\nLinh Lực đã lĩnh ngộ trong lần này vẫn sẽ được giữ lại!")) {
        endGame(true, true); // Gọi endGame với trạng thái thắng (true) và xuất quan sớm (true)
    }
};

function endGame(win, earlyExit = false) {
    clearInterval(timerInterval);
    
    // Đổi tiêu đề và màu sắc tùy trạng thái
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
// 8. TÚI TRỮ VẬT
// ==========================================
window.openInventory = function() {
    window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'flex';
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
                <button class="btn-main" style="width:auto; padding:6px 14px;" onclick="useItem('${item}')">Dùng</button>
            </div>`;
        }
    }
    if (!hasItems) {
        invList.innerHTML = '<p style="color:#aaa; font-size:14px; padding:10px 0;">Túi đồ trống không! Hãy trả lời câu hỏi để rớt đan dược.</p>';
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
    recalcStats();

    // 1. Chặn Phàm Nhân không được bước vào Bí Cảnh
    if (thanThuc < 100 || calculateRealm(lifetimeMana) === "Phàm Nhân") {
        alert("⚠️ Đạo hữu hiện tại là Phàm Nhân, chưa ngưng tụ Thần Thức nên không thể ngự kiếm!\n\nHãy vào 'Bế Quan Khai Phá' để tích lũy Linh Lực đạt mốc 150 (Luyện Khí Sơ Kỳ).");
        return;
    }

    switchScreen('battle-screen');
    
    const invBtn = document.querySelector('.fixed-inventory-btn');
    const audioBtn = document.getElementById('audioToggleBtn');
    if (invBtn) invBtn.style.display = 'none';
    if (audioBtn) audioBtn.style.display = 'none';

    resizeBattleCanvas();
    
    // 2. Cấp chính xác số lượng phi kiếm xoay quanh thân dựa trên Thần Thức
    const count = getSwordCount(thanThuc);
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
    
    const invBtn = document.querySelector('.fixed-inventory-btn');
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

    // Vẽ nền hắc ám sơn động
    if (battleAssets.bg.complete && battleAssets.bg.naturalWidth > 0) {
        battleCtx.drawImage(battleAssets.bg, 0, 0, battleCanvas.width, battleCanvas.height);
    } else {
        battleCtx.fillStyle = "#0c1017";
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
    }

    // Hiệu ứng nổ hạt linh lực
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

    // Nhân vật chibi
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

    // Kiếm khí xoay tròn
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

    // Quỷ hồn bám đuổi
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

    // Cập nhật số liệu HUD
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
// ==========================================
// ĐIỀU KHIỂN TÀNG KINH CÁC
// ==========================================
window.openLibraryModal = function() {
    window.playClickSound();
    const modal = document.getElementById('libraryModal');
    if (modal) modal.style.display = 'flex';
};

window.closeLibraryModal = function() {
    window.playClickSound();
    const modal = document.getElementById('libraryModal');
    if (modal) modal.style.display = 'none';
};

window.chooseLibraryOption = function(type) {
    window.playClickSound();
    if (type === 'han_ngu') {
        // Đóng modal Tàng Kinh Các và bắt đầu tu luyện Hán Ngữ Chân Giải như cũ
        window.closeLibraryModal();
        window.startGame();
    } else if (type === 'anh_ngu') {
        // Thông báo khi bấm vào Anh Ngữ Công
        alert("🔒 Cấm chế phong ấn!\n\nĐiển tịch 'Anh Ngữ Công' hiện chưa khai mở. Đạo hữu hãy chuyên tâm lĩnh ngộ 'Hán Ngữ Chân Giải' để nâng cao tu vi!");
    }
};
