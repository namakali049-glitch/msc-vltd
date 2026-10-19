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

// Chỉ số nhân vật
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
// 3. TÍNH TOÁN CẢNH GIỚI & AVATAR
// ==========================================
function calculateRealm(mana) {
    if (mana < 150) return "Phàm Nhân";
    if (mana < 300) return "Luyện Khí Sơ Kỳ";
    if (mana < 600) return "Luyện Khí Trung Kỳ";
    if (mana < 1500) return "Luyện Khí Hậu Kỳ";
    return "Trúc Cơ Sơ Kỳ";
}

function getAvatarByMana(mana) {
    if (mana < 150) {
        return "./assets/pham-nhan.jpg";
    } else if (mana < 1500) {
        return "./assets/luyen-khi.png";
    } else {
        return "./assets/truc-co.png";
    }
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
    if (gameAvatar) gameAvatar.src = getAvatarByMana(lifetimeMana);
}

// ==========================================
// 4. XÁC THỰC & FIREBASE SYNC
// ==========================================
window.switchScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if(targetScreen) targetScreen.classList.add('active');
};

window.switchAuthTab = function(type) {
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
        lifetimeMana = (snapshot.exists() && snapshot.val().mana) ? snapshot.val().mana : 0;
    } catch (error) { lifetimeMana = 0; }
    recalcStats();
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('userDisplayName').innerText = user.displayName || user.email.split('@')[0];
        await loadUserLifetimeMana(user.uid);
        switchScreen('start-screen');
    } else {
        currentUser = null;
        lifetimeMana = 0;
        switchScreen('auth-screen');
    }
});

window.handleSignup = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();
    if (!email || !password || !displayName) { alert("Vui lòng điền đủ!"); return; }
    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: displayName });
        await set(ref(database, 'users/' + userCred.user.uid), { name: displayName, mana: 0 });
        alert("Đăng ký thành công!");
    } catch (e) { alert("Lỗi: " + e.message); }
};

window.handleLogin = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    if (!email || !password) { alert("Nhập Email và Mật khẩu!"); return; }
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (e) { alert("Đăng nhập thất bại!"); }
};

window.handleGoogleLogin = async function() {
    try { 
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = ref(database, 'users/' + result.user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, { name: result.user.displayName || "Đạo Hữu", mana: 0 });
        }
    } catch (e) { alert("Lỗi Google: " + e.message); }
};

window.handleLogout = function() { signOut(auth); };

async function syncManaToDatabase() {
    if (!currentUser) return;
    try {
        await set(ref(database, 'users/' + currentUser.uid), {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            mana: lifetimeMana,
            lastUpdated: Date.now()
        });
    } catch (e) { console.error("Lỗi đồng bộ:", e); }
}

// ==========================================
// 5. HỒ SƠ & BẢNG XẾP HẠNG
// ==========================================
window.showProfile = function() {
    if (!currentUser) return;
    recalcStats();
    switchScreen('profile-screen');
    document.getElementById('profileName').innerText = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('profileMana').innerText = lifetimeMana;
    document.getElementById('profileRealm').innerText = calculateRealm(lifetimeMana);
    
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) profileAvatar.src = getAvatarByMana(lifetimeMana);
    
    document.getElementById('profileHp').innerText = `${maxHp}/${maxHp}`;
    document.getElementById('profileStr').innerText = str;
    document.getElementById('profileAgi').innerText = agi;
};

window.showLeaderboard = async function() {
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

window.goHome = function() { switchScreen('start-screen'); };

// ==========================================
// 6. GAMEPLAY & COMBAT
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
        while (options.length < 4) {
            let rand = pool[Math.floor(Math.random() * pool.length)];
            if (rand && rand.meaning && !options.includes(rand.meaning)) options.push(rand.meaning);
        }
        options = shuffleArray(options);
        return {
            q: `Đạo hữu hãy cho biết ý nghĩa của từ này:\n\n✨ ${vocab.hanzi} ✨\n(Phiên âm: ${vocab.pinyin} | Loại: ${vocab.type})`,
            options: options, ans: options.indexOf(vocab.meaning)
        };
    });
}

function formatTime(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

window.startGame = async function() {
    switchScreen('game-screen'); 
    if (vocabPool.length === 0) {
        document.getElementById('question').innerText = "⏳ Đang mở Tàng Kinh Các...";
        await new Promise(resolve => {
            Papa.parse("./a1_vocab.csv", {
                download: true, header: true, skipEmptyLines: true,
                complete: res => { vocabPool = res.data; resolve(); },
                error: () => { alert("❌ Lỗi tải CSV!"); resolve(); }
            });
        });
    }

    currentLevel = 1; sessionMana = 0; totalSeconds = 0;
    recalcStats();
    currentHp = maxHp; // Bơm đầy máu
    updateCharacterUI();

    document.getElementById('timerDisplay').innerText = "00:00";
    if(timerInterval) clearInterval(timerInterval);
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
    if(currentLevel > 4) { endGame(true); return; }
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
        btn.onclick = () => checkAnswer(index, qData.ans, btn);
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
        let bonusMana = Math.floor(expPerQuestion + (str * 0.2));
        currentHp = Math.min(maxHp, currentHp + 2); // Hồi 2 máu
        
        document.getElementById('message').innerText = `✅ Đáp đúng! +${bonusMana} Linh Lực (Sức mạnh +${Math.floor(str * 0.2)})`;
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
        
        let dodgeRate = Math.min(30, agi * 0.5); 
        if (Math.random() * 100 < dodgeRate) {
            document.getElementById('message').innerText = "⚡ Thân pháp siêu phàm! Né thành công Tâm Ma!";
            document.getElementById('message').style.color = "#70a1ff";
        } else {
            currentHp -= 20;
            const gameScreen = document.getElementById('game-screen');
            gameScreen.classList.add('damage-flash');
            setTimeout(() => gameScreen.classList.remove('damage-flash'), 400);

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
