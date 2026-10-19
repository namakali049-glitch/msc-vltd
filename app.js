// ==========================================
// FIREBASE MODULE CONFIGURATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    push, 
    get 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Khởi tạo Firebase với API Key chuẩn của dự án msc-vltd
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

let currentUser = null;
let currentLevel = 1;
let totalScore = 0; // Linh lực tích lũy
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 0; 
const expPerQuestion = 10;

let timerInterval = null;
let totalSeconds = 0;
let activeQuestions = []; 

// Chuyển tab Đăng nhập / Đăng ký
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
}

// Theo dõi trạng thái xác thực người dùng
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const name = user.displayName || user.email.split('@')[0];
        document.getElementById('userDisplayName').innerText = name;
        switchScreen('start-screen');
    } else {
        currentUser = null;
        switchScreen('auth-screen');
    }
});

// Xử lý Đăng ký
window.handleSignup = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();

    if (!email || !password || !displayName) { alert("Vui lòng điền đầy đủ thông tin!"); return; }
    if (password.length < 6) { alert("Mật khẩu phải từ 6 ký tự trở lên!"); return; }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });
        alert("Đăng ký tài khoản tu tiên thành công!");
    } catch (error) { alert("Đăng ký thất bại: " + error.message); }
}

// Xử lý Đăng nhập
window.handleLogin = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) { alert("Vui lòng nhập Email và Mật khẩu!"); return; }
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert("Đăng nhập thất bại: Tài khoản hoặc mật khẩu không chính xác!"); }
}

// Đăng nhập Google
window.handleGoogleLogin = async function() {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Đăng nhập Google thất bại: " + error.message); }
}

// Đăng xuất
window.handleLogout = function() { signOut(auth); }

// Hàm quy đổi Cảnh Giới Tu Tiên dựa trên Linh Lực
function calculateRealm(mana) {
    if (mana < 50) return "Phàm Nhân";
    if (mana < 150) return "Luyện Khí Sơ Kỳ";
    if (mana < 300) return "Luyện Khí Trung Kỳ";
    if (mana < 600) return "Luyện Khí Hậu Kỳ";
    if (mana < 1000) return "Luyện Khí Đại Viên Mãn";
    return "Trúc Cơ Sơ Kỳ";
}

// Hiển thị Hồ sơ Nhân vật
window.showProfile = async function() {
    if (!currentUser) {
        alert("Đạo hữu vui lòng đăng nhập để xem thông tin!");
        return;
    }
    
    switchScreen('profile-screen');
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('profileName').innerText = name;
    
    const scoresRef = ref(database, 'leaderboard');
    try {
        const snapshot = await get(scoresRef);
        let myMaxScore = 0;
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.values(data).forEach(record => {
                if (record.uid === currentUser.uid && record.score > myMaxScore) {
                    myMaxScore = record.score;
                }
            });
        }
        
        document.getElementById('profileMana').innerText = myMaxScore;
        document.getElementById('profileRealm').innerText = calculateRealm(myMaxScore);
        
    } catch (error) {
        document.getElementById('profileMana').innerText = totalScore; 
        document.getElementById('profileRealm').innerText = calculateRealm(totalScore);
    }
}

function formatTime(seconds) {
    let m = String(Math.floor(seconds / 60)).padStart(2, '0');
    let s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function shuffleArray(array) {
    let curId = array.length;
    while (0 !== curId) {
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
    }
    return array;
}

window.switchScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

window.goHome = function() { switchScreen('start-screen'); }

function saveScore() {
    if (!currentUser) return;
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    const scoresRef = ref(database, 'leaderboard');
    push(scoresRef, { uid: currentUser.uid, name: name, score: totalScore, time: totalSeconds, timestamp: Date.now() });
}

window.showLeaderboard = async function() {
    switchScreen('leaderboard-screen');
    let lbList = document.getElementById('lb-list');
    lbList.innerHTML = '<li>⏳ Đang tải Tiên Đạo Bảng...</li>';

    try {
        const scoresRef = ref(database, 'leaderboard');
        const snapshot = await get(scoresRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            let records = Object.values(data);
            records.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time - b.time;
            });

            let uniqueRecords = [];
            let seenUsers = new Set();
            for (let r of records) {
                if (!seenUsers.has(r.uid || r.name)) {
                    seenUsers.add(r.uid || r.name);
                    uniqueRecords.push(r);
                }
            }

            let top10 = uniqueRecords.slice(0, 10);
            lbList.innerHTML = '';
            top10.forEach((player, index) => {
                let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `<b>${index+1}.</b>`;
                let timeStr = formatTime(player.time || 0);
                lbList.innerHTML += `
                    <li>
                        <span>${medal}</span><span class="lb-name">${player.name}</span> 
                        <div class="lb-stats"><span style="color:#ff6b81;">${player.score} Linh Lực</span><span class="lb-time">⏱️ ${timeStr}</span></div>
                    </li>`;
            });
        } else { lbList.innerHTML = '<li>Chưa có danh sách tu tiên giả!</li>'; }
    } catch (error) {
        lbList.innerHTML = '<li>❌ Tải Tiên Đạo Bảng thất bại.</li>';
    }
}

window.startGame = function() {
    currentLevel = 1; totalScore = 0; totalSeconds = 0;
    document.getElementById('timerDisplay').innerText = "00:00";
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        totalSeconds++;
        document.getElementById('timerDisplay').innerText = formatTime(totalSeconds);
    }, 1000);
    initLevel();
    switchScreen('game-screen');
}

function initLevel() {
    currentLevelExp = 0; currentQuestionIndex = 0;
    activeQuestions = shuffleArray(JSON.parse(JSON.stringify(db[currentLevel])));
    expToLevelUp = Math.floor(activeQuestions.length * 0.8) * expPerQuestion;
    document.getElementById('level').innerText = currentLevel;
    document.getElementById('maxExp').innerText = expToLevelUp;
    document.getElementById('totalScore').innerText = totalScore;
    loadQuestion();
}

function endGame(win) {
    clearInterval(timerInterval);
    saveScore();
    let finalTime = formatTime(totalSeconds);
    if (win) {
        document.getElementById('question').innerHTML = `🏆 <b>Chúc mừng Đạo Hữu Đột Phá Màn Tu Luyện!</b><br><br>🎯 Tổng Linh Lực: <span style="color:#eccc68;">${totalScore}</span><br>⏱️ Thời gian: <span style="color:#7bed9f;">${finalTime}</span>`;
    } else {
        document.getElementById('question').innerHTML = `😢 <b>Tu luyện thất bại! Tăng cường tích lũy linh lực.</b><br><br>🎯 Tổng Linh Lực: <span style="color:#ff6b81;">${totalScore}</span><br>⏱️ Thời gian: <span style="color:#747d8c;">${finalTime}</span>`;
    }
    document.getElementById('options').innerHTML = "";
    document.getElementById('counter').innerText = "";
    let returnBtn = document.createElement('button');
    returnBtn.className = "primary-btn";
    returnBtn.innerText = "Xem Tiên Đạo Bảng 🏆";
    returnBtn.style.marginTop = "20px";
    returnBtn.onclick = showLeaderboard;
    document.getElementById('options').appendChild(returnBtn);
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('message').innerText = "";
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
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, qData.ans, btn);
        optionsDiv.appendChild(btn);
    });
    
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = totalScore;
}

function checkAnswer(selectedIndex, correctIndex, btnElement) {
    const buttons = document.querySelectorAll('.options .option-btn');
    buttons.forEach(b => b.onclick = null); 
    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        document.getElementById('message').innerText = "✅ Đáp đúng! +" + expPerQuestion + " Linh Lực";
        document.getElementById('message').style.color = "#ffa502";
        currentLevelExp += expPerQuestion;
        totalScore += expPerQuestion;
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        document.getElementById('message').innerText = "❌ Chưa chính xác! Linh lực không tăng.";
        document.getElementById('message').style.color = "#ff4757";
    }
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = totalScore;
    document.getElementById('nextBtn').style.display = 'block';
}

window.nextQuestion = function() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= activeQuestions.length) {
        if (currentLevelExp >= expToLevelUp) {
            currentLevel++;
            if (currentLevel <= 4) { alert(`🎉 Đột phá thành công sang Cấp Tu Luyện ${currentLevel}!`); initLevel(); return; }
        } else {
            alert(`😢 Linh lực không đủ (Cần ${expToLevelUp} Linh Lực để vượt cấp).`);
            endGame(false); return;
        }
    }
    loadQuestion();
}
