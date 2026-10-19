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

const firebaseConfig = {
    apiKey: "AIzaSyBBn3CGkftYVVl1wr9fY8OhBAd8LKzUSyE",
    authDomain: "msc-vltd.firebaseapp.com",
    projectId: "msc-vltd",
    storageBucket: "msc-vltd.firebasestorage.app",
    messagingSenderId: "684705162429",
    appId: "1:684705162429:web:2ed8e08891060f61f103d4",
    measurementId: "G-53PPGGS0ZN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let currentLevel = 1;
let totalScore = 0;      
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 0; 
const expPerQuestion = 10;

let timerInterval = null;
let totalSeconds = 0;
let activeQuestions = []; 

window.switchAuthTab = function(type) {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.remove('active');
    document.getElementById('displayNameGroup').style.display = 'none';

    if (type === 'login') {
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('authSubmitBtn').innerText = "登入 🚀";
        document.getElementById('authSubmitBtn').onclick = handleLogin;
    } else {
        document.getElementById('tab-signup').classList.add('active');
        document.getElementById('displayNameGroup').style.display = 'block';
        document.getElementById('authSubmitBtn').innerText = "註冊帳號 📝";
        document.getElementById('authSubmitBtn').onclick = handleSignup;
    }
}

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

window.handleSignup = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();

    if (!email || !password || !displayName) { alert("請填寫所有欄位！"); return; }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });
        alert("註冊成功！");
    } catch (error) { alert("註冊失敗: " + error.message); }
}

window.handleLogin = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) { alert("請輸入 Email 與密碼！"); return; }
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert("登入失敗: 帳號或密碼錯誤！"); }
}

window.handleGoogleLogin = async function() {
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error) { alert("Google 登入失敗: " + error.message); }
}

window.handleLogout = function() { signOut(auth); }

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
    lbList.innerHTML = '<li>⏳ 正在載入全球排行榜...</li>';

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
                        <div class="lb-stats"><span style="color:#ff6b81;">${player.score} 分</span><span class="lb-time">⏱️ ${timeStr}</span></div>
                    </li>`;
            });
        } else { lbList.innerHTML = '<li>目前還沒有紀錄喔！</li>'; }
    } catch (error) {
        lbList.innerHTML = '<li>❌ 排行榜載入失敗。</li>';
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
        document.getElementById('question').innerHTML = `🏆 <b>恭喜大師！</b><br><br>🎯 總分：<span style="color:#eccc68;">${totalScore}</span><br>⏱️ 時間：<span style="color:#7bed9f;">${finalTime}</span>`;
    } else {
        document.getElementById('question').innerHTML = `😢 <b>挑戰失敗！</b><br><br>🎯 總分：<span style="color:#ff6b81;">${totalScore}</span><br>⏱️ 時間：<span style="color:#747d8c;">${finalTime}</span>`;
    }
    document.getElementById('options').innerHTML = "";
    document.getElementById('counter').innerText = "";
    let returnBtn = document.createElement('button');
    returnBtn.className = "primary-btn";
    returnBtn.innerText = "查看排行榜 🏆";
    returnBtn.style.marginTop = "20px";
    returnBtn.onclick = showLeaderboard;
    document.getElementById('options').appendChild(returnBtn);
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('message').innerText = "";
}

function loadQuestion() {
    if(currentLevel > 4) { endGame(true); return; }
    const qData = activeQuestions[currentQuestionIndex];
    document.getElementById('counter').innerText = `題目: ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
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
        document.getElementById('message').innerText = "✅ 答對了！ +" + expPerQuestion + " 分";
        document.getElementById('message').style.color = "#ffa502";
        currentLevelExp += expPerQuestion;
        totalScore += expPerQuestion;
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        document.getElementById('message').innerText = "❌ 答錯了！黃色才是正確答案。";
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
            if (currentLevel <= 4) { alert(`🎉 晉級 等級 ${currentLevel}！`); initLevel(); return; }
        } else {
            alert(`😢 分數不足 (需要 ${expToLevelUp} 分)。`);
            endGame(false); return;
        }
    }
    loadQuestion();
}
