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
let expToLevelUp = 0; 
const expPerQuestion = 10;

let timerInterval = null;
let totalSeconds = 0;
let activeQuestions = []; 
let vocabPool = [];

// ==========================================
// 3. HỆ THỐNG ÂM THANH TIÊN GIỚI (WEB AUDIO API AN TOÀN)
// ==========================================
let audioCtx = null;
let isAudioMuted = false;

function getAudioContext() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    } catch(e) {
        return null;
    }
}

window.playClickSound = function() {
    if (isAudioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
};

function playCorrectSound() {
    if (isAudioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.value = freq;
            const startTime = ctx.currentTime + (idx * 0.06);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    } catch(e) {}
}

function playWrongSound() {
    if (isAudioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
    } catch(e) {}
}

function playLootSound() {
    if (isAudioMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        [880, 1174, 1760].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            const start = ctx.currentTime + (idx * 0.07);
            gain.gain.setValueAtTime(0.18, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.2);
        });
    } catch(e) {}
}

window.toggleBGM = function() {
    playClickSound();
    const bgm = document.getElementById('bgmAudio');
    const btn = document.getElementById('audioToggleBtn');
    if (!bgm) return;
    
    getAudioContext();
    if (bgm.paused) {
        bgm.volume = 0.35;
        bgm.play().then(() => {
            isAudioMuted = false;
            if (btn) { btn.innerText = "🎵 Nhạc: Bật"; btn.classList.remove('muted'); }
        }).catch(e => console.log("Trình duyệt chặn autoplay:", e));
    } else {
        bgm.pause();
        isAudioMuted = true;
        if (btn) { btn.innerText = "🔇 Nhạc: Tắt"; btn.classList.add('muted'); }
    }
};

// ==========================================
// 4. TÍNH TOÁN CẢNH GIỚI & AVATAR
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
    return "assets/truc-co.png";
}

function setAvatarWithFallback(imgElement, mana) {
    if (!imgElement) return;
    const initialPath = getAvatarByMana(mana);
    imgElement.src = initialPath;
    imgElement.onerror = () => {
        if (imgElement.src.endsWith(".jpg")) {
            imgElement.src = imgElement.src.replace(".jpg", ".png");
        } else if (imgElement.src.endsWith(".png")) {
            imgElement.src = imgElement.src.replace(".png", ".jpg");
        }
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
    if (document.getElementById('hpFill')) document.getElementById('hpFill').style.width = hpPercent + "%";
    if (document.getElementById('hpText')) document.getElementById('hpText').innerText = `${currentHp}/${maxHp}`;
    if (document.getElementById('statStr')) document.getElementById('statStr').innerText = str;
    if (document.getElementById('statAgi')) document.getElementById('statAgi').innerText = agi;
    
    const gameAvatar = document.getElementById('gameAvatar');
    if (gameAvatar) setAvatarWithFallback(gameAvatar, lifetimeMana);
}

// ==========================================
// 5. XÁC THỰC & FIREBASE SYNC
// ==========================================
window.switchScreen = function(screenId) {
    playClickSound();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
};

window.switchAuthTab = function(type) {
    playClickSound();
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
    } catch (error) { 
        lifetimeMana = 0; 
    }
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
    playClickSound();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();
    if (!email || !password || !displayName) { alert("Vui lòng điền đủ!"); return; }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: displayName });
        await set(ref(database, 'users/' + userCred.user.uid), { 
            name: displayName, 
            mana: 0,
            inventory: inventory 
        });
        alert("Đăng ký thành công!");
    } catch (e) { alert("Lỗi: " + e.message); }
};

window.handleLogin = async function() {
    playClickSound();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!email || !password) { alert("Nhập Email và Mật khẩu!"); return; }
    try { 
        await signInWithEmailAndPassword(auth, email, password); 
    } catch (e) { 
        alert("Đăng nhập thất bại: " + e.message); 
    }
};

window.handleGoogleLogin = async function() {
    playClickSound();
    try { 
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = ref(database, 'users/' + result.user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, { 
                name: result.user.displayName || "Đạo Hữu", 
                mana: 0,
                inventory: inventory 
            });
        }
    } catch (e) { alert("Lỗi Google: " + e.message); }
};

window.handleLogout = function() { 
    playClickSound();
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
    } catch (e) { console.error("Lỗi đồng bộ:", e); }
}

// ==========================================
// 6. HỒ SƠ & BẢNG XẾP HẠNG
// ==========================================
window.showProfile = function() {
    playClickSound();
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
    playClickSound();
    switchScreen('leaderboard-screen');
    let lbList = document.getElementById('lb-list');
    lbList.innerHTML = '<li>⏳ Đang tải Tiên Đạo Bảng...</li>';
    try {
        const snapshot = await get(ref(database, 'users'));
        if (snapshot.exists()) {
            let records = Object.values(snapshot.val()).sort((a, b) => (b.mana || 0) - (a.mana || 0)).slice(0, 10);
            lbList.innerHTML = '';
            records.forEach((player, index) => {
                let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `<b>${index + 1}.</b>`;
                lbList.innerHTML += `
                    <li>
                        <div class="lb-user-info">
                            <span class="lb-rank">${medal}</span>
                            <div class="lb-details">
                                <span class="lb-name">${player.name}</span>
                                <span class="realm-badge">${calculateRealm(player.mana || 0)}</span>
                            </div>
                        </div>
                        <div class="lb-mana">⚡ ${player.mana || 0} Linh Lực</div>
                    </li>`;
            });
        } else { lbList.innerHTML = '<li>Chưa có cao thủ nào!</li>'; }
    } catch (e) { lbList.innerHTML = '<li>❌ Lỗi tải bảng xếp hạng.</li>'; }
};

window.goHome = function() { 
    playClickSound();
    switchScreen('start-screen'); 
};

// ==========================================
// 7. GAMEPLAY & COMBAT
// ==========================================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateQuizSession(pool, numQuestions = 10) {
    let selected = shuffleArray([...pool]).slice(0, numQuestions);
    return selected.map(vocab => {
        let options = [vocab.meaning]; 
        let attempts = 0;
        // Chốt an toàn chống treo vòng lặp (attempts < 50)
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
    playClickSound();
    switchScreen('game-screen'); 
    if (vocabPool.length === 0) {
        document.getElementById('question').innerText = "⏳ Đang mở Tàng Kinh Các...";
        await new Promise(resolve => {
            Papa.parse("./a1_vocab.csv", {
                download: true, header: true, skipEmptyLines: true,
                complete: res => { vocabPool = res.data; resolve(); },
                error: () => { alert("❌ Lỗi tải CSV từ vựng!"); resolve(); }
            });
        });
    }

    currentLevel = 1; sessionMana = 0; totalSeconds = 0;
    recalcStats();
    currentHp = maxHp; 
    updateCharacterUI();

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
            playClickSound();
            checkAnswer(index, qData.ans, btn);
        };
        optionsDiv.appendChild(btn);
    });
    
    let expPercent = Math.min(100, (currentLevelExp / expToLevelUp) * 100);
    document.getElementById('expFill').style.width = expPercent + "%";
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = sessionMana;
    updateCharacterUI();
}

function checkAnswer(selectedIndex, correctIndex, btnElement) {
    const buttons = document.querySelectorAll('.options .option-btn');
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
        updateCharacterUI();
        syncManaToDatabase();
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        playWrongSound();
        
        let dodgeRate = Math.min(30, agi * 0.5); 
        if (Math.random() * 100 < dodgeRate) {
            document.getElementById('message').innerText = "⚡ Thân pháp siêu phàm! Né thành công Tâm Ma!";
            document.getElementById('message').style.color = "#70a1ff";
        } else {
            currentHp -= 20;
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen) {
                gameScreen.classList.add('damage-flash');
                setTimeout(() => gameScreen.classList.remove('damage-flash'), 400);
            }

            document.getElementById('message').innerText = `❌ Tâm Ma Phản Phệ! Mất 20 Sinh Mệnh!`;
            document.getElementById('message').style.color = "#ff4757";
        }
        updateCharacterUI();

        if (currentHp <= 0) {
            setTimeout(() => { alert("💥 Sinh Mệnh cạn kiệt! Đạo hữu đã Tẩu Hỏa Nhập Ma."); endGame(false); }, 500);
            return;
        }
    }
    
    let expPercent = Math.min(100, (currentLevelExp / expToLevelUp) * 100);
    document.getElementById('expFill').style.width = expPercent + "%";
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = sessionMana;
    document.getElementById('nextBtn').style.display = 'block';
}

window.nextQuestion = function() {
    playClickSound();
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

function endGame(win) {
    clearInterval(timerInterval);
    document.getElementById('question').innerHTML = win ? 
        `🏆 <b>Đột Phá Thành Công!</b><br><br>🎯 Nhận: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana}</span>` : 
        `💥 <b>Tẩu Hỏa Nhập Ma!</b><br><br>🎯 Nhận: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana}</span>`;
    
    document.getElementById('options').innerHTML = "";
    document.getElementById('counter').innerText = "";
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('message').innerText = "";
    
    let btn = document.createElement('button');
    btn.className = "primary-btn"; btn.innerText = "Xem Tiên Đạo Bảng 🏆";
    btn.onclick = showLeaderboard;
    document.getElementById('options').appendChild(btn);
}

// ==========================================
// 8. HỆ THỐNG TÚI TRỮ VẬT (ITEM BAG)
// ==========================================
window.openInventory = function() {
    playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'block';
    updateInventoryUI();
};

window.closeInventory = function() {
    playClickSound();
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
    playClickSound();
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

// Kích hoạt phát nhạc ở cú click đầu tiên
function initAudioOnFirstUserGesture() {
    getAudioContext();
    const bgm = document.getElementById('bgmAudio');
    if (bgm && bgm.paused && !isAudioMuted) {
        bgm.volume = 0.35;
        bgm.play().catch(() => {});
    }
    document.removeEventListener('click', initAudioOnFirstUserGesture);
}
document.addEventListener('click', initAudioOnFirstUserGesture);
