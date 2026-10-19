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
    set, 
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// ==========================================
// BIẾN TOÀN CỤC (STATE MANAGEMENT)
// ==========================================
let currentUser = null;
let lifetimeMana = 0; // Đan Điền: Tổng Linh lực vĩnh viễn trọn đời
let sessionMana = 0;  // Linh lực kiếm được trong ván bế quan hiện tại

let currentLevel = 1;
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 0; 
const expPerQuestion = 10;

let timerInterval = null;
let totalSeconds = 0;
let activeQuestions = []; 
let vocabPool = []; // Chứa toàn bộ từ vựng nạp từ CSV

// ==========================================
// XÁC THỰC & HỒ SƠ NGƯỜI CHƠI
// ==========================================

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
        if (snapshot.exists() && snapshot.val().mana) {
            lifetimeMana = snapshot.val().mana;
        } else {
            lifetimeMana = 0;
        }
    } catch (error) {
        console.error("Lỗi khi tải Đan Điền:", error);
        lifetimeMana = 0;
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const name = user.displayName || user.email.split('@')[0];
        document.getElementById('userDisplayName').innerText = name;
        
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

    if (!email || !password || !displayName) { alert("Vui lòng điền đầy đủ thông tin!"); return; }
    if (password.length < 6) { alert("Mật khẩu phải từ 6 ký tự trở lên!"); return; }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });
        
        await set(ref(database, 'users/' + userCredential.user.uid), {
            name: displayName,
            mana: 0,
            joinedAt: Date.now()
        });
        
        alert("Đăng ký tài khoản tu tiên thành công!");
    } catch (error) { alert("Đăng ký thất bại: " + error.message); }
};

window.handleLogin = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) { alert("Vui lòng nhập Email và Mật khẩu!"); return; }
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert("Đăng nhập thất bại: Tài khoản hoặc mật khẩu không chính xác!"); }
};

window.handleGoogleLogin = async function() {
    try { 
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = ref(database, 'users/' + result.user.uid);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, {
                name: result.user.displayName || "Đạo Hữu Vô Danh",
                mana: 0,
                joinedAt: Date.now()
            });
        }
    } catch (error) { alert("Đăng nhập Google thất bại: " + error.message); }
};

window.handleLogout = function() { signOut(auth); };

// ==========================================
// HỆ THỐNG CẢNH GIỚI & LƯU TRỮ TỨC THỜI
// ==========================================

function calculateRealm(mana) {
    if (mana < 50) return "Phàm Nhân";
    if (mana < 150) return "Luyện Khí Sơ Kỳ";
    if (mana < 300) return "Luyện Khí Trung Kỳ";
    if (mana < 600) return "Luyện Khí Hậu Kỳ";
    if (mana < 1500) return "Luyện Khí Đại Viên Mãn";
    return "Trúc Cơ Sơ Kỳ";
}

// ==========================================
// 🌟 1. TỐI ƯU HÀM LƯU TỨC THỜI (Chỉ lưu vào Đan Điền)
// ==========================================
async function syncManaToDatabase() {
    if (!currentUser) return;
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    
    try {
        // Chỉ cần lưu duy nhất vào nhánh 'users' (Đan Điền) là đủ
        await set(ref(database, 'users/' + currentUser.uid), {
            name: name,
            mana: lifetimeMana,
            lastUpdated: Date.now()
        });
    } catch (error) {
        console.error("Lỗi cập nhật Đan Điền:", error);
    }
}

// ==========================================
// 🌟 2. BẢNG XẾP HẠNG (Đọc trực tiếp từ Đan Điền để lấy Tổng tu vi)
// ==========================================
window.showLeaderboard = async function() {
    switchScreen('leaderboard-screen');
    let lbList = document.getElementById('lb-list');
    lbList.innerHTML = '<li>⏳ Đang tải Tiên Đạo Bảng...</li>';

    try {
        // Thay vì lấy từ leaderboard cũ, ta lấy thẳng từ nhánh 'users'
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            let records = Object.values(data);
            
            // Sắp xếp: Ai có TỔNG LINH LỰC (mana) cao nhất sẽ đứng đầu
            records.sort((a, b) => (b.mana || 0) - (a.mana || 0));
            let top10 = records.slice(0, 10);
            
            lbList.innerHTML = '';
            top10.forEach((player, index) => {
                let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `<b>${index + 1}.</b>`;
                
                // Tính cảnh giới dựa trên tổng linh lực (mana)
                let realm = calculateRealm(player.mana || 0);

                lbList.innerHTML += `
                    <li>
                        <div class="lb-user-info">
                            <span class="lb-rank">${medal}</span>
                            <div class="lb-details">
                                <span class="lb-name">${player.name}</span>
                                <span class="lb-realm-badge">${realm}</span>
                            </div>
                        </div>
                        <div class="lb-stats">
                            <span class="lb-mana">⚡ ${player.mana || 0} Tổng Linh Lực</span>
                        </div>
                    </li>`;
            });
        } else { 
            lbList.innerHTML = '<li>Chưa có danh sách tu tiên giả!</li>'; 
        }
    } catch (error) {
        lbList.innerHTML = '<li>❌ Tải Tiên Đạo Bảng thất bại.</li>';
    }
};
// ==========================================
// CƠ CHẾ RÚT THẺ VÀ TẠO CÂU HỎI TỰ ĐỘNG
// ==========================================

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
};

window.goHome = function() { switchScreen('start-screen'); };

function generateQuizSession(pool, numQuestions = 10) {
    let shuffledPool = shuffleArray([...pool]);
    let selectedVocabs = shuffledPool.slice(0, numQuestions);
    let quizQuestions = [];

    selectedVocabs.forEach(vocab => {
        let options = [vocab.meaning]; 
        while (options.length < 4) {
            let randomWrongVocab = pool[Math.floor(Math.random() * pool.length)];
            if (randomWrongVocab && randomWrongVocab.meaning && !options.includes(randomWrongVocab.meaning)) {
                options.push(randomWrongVocab.meaning);
            }
        }
        options = shuffleArray(options);
        let correctIndex = options.indexOf(vocab.meaning);

        quizQuestions.push({
            q: `Đạo hữu hãy cho biết ý nghĩa của từ này:\n\n✨ ${vocab.hanzi} ✨\n(Phiên âm: ${vocab.pinyin} | Loại: ${vocab.type})`,
            options: options,
            ans: correctIndex
        });
    });
    return quizQuestions;
}

window.startGame = async function() {
    switchScreen('game-screen'); 
    
    if (vocabPool.length === 0) {
        document.getElementById('question').innerText = "⏳ Đang mở Tàng Kinh Các, nạp từ vựng...";
        document.getElementById('options').innerHTML = ""; 
        document.getElementById('nextBtn').style.display = 'none';
        
        await new Promise((resolve) => {
            Papa.parse("./a1_vocab.csv", {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    vocabPool = results.data;
                    console.log("Đã tải kho từ vựng:", vocabPool.length, "từ");
                    resolve();
                },
                error: function(err) {
                    alert("❌ Lỗi tải Kinh Thư (Không tìm thấy file CSV).");
                    resolve();
                }
            });
        });
    }

    currentLevel = 1; 
    sessionMana = 0; 
    totalSeconds = 0;
    
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

async function endGame(win) {
    clearInterval(timerInterval);
    
    let finalTime = formatTime(totalSeconds);
    if (win) {
        document.getElementById('question').innerHTML = `🏆 <b>Chúc mừng Đạo Hữu Đột Phá!</b><br><br>🎯 Thu thập: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana} Linh Lực</span><br>⏱️ Thời gian: <span style="color:#7bed9f;">${finalTime}</span>`;
    } else {
        document.getElementById('question').innerHTML = `😢 <b>Tu luyện thất bại!</b><br><br>🎯 Thu thập: <span style="color:#eccc68;">+${sessionMana} Linh Lực</span><br>💎 Tổng Tu Vi: <span style="color:#00d2d3;">${lifetimeMana} Linh Lực</span><br>⏱️ Thời gian: <span style="color:#747d8c;">${finalTime}</span>`;
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
    document.getElementById('totalScore').innerText = sessionMana;
}

function checkAnswer(selectedIndex, correctIndex, btnElement) {
    const buttons = document.querySelectorAll('.options .option-btn');
    buttons.forEach(b => b.onclick = null); 
    
    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        document.getElementById('message').innerText = "✅ Đáp đúng! +" + expPerQuestion + " Linh Lực";
        document.getElementById('message').style.color = "#ffa502";
        
        currentLevelExp += expPerQuestion;
        sessionMana += expPerQuestion;
        lifetimeMana += expPerQuestion; 
        
        // 🌟 Đồng bộ ngay lập tức lên Đan Điền Firebase
        syncManaToDatabase();
    } else {
        btnElement.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        document.getElementById('message').innerText = "❌ Chưa chính xác! Linh khí tiêu tán.";
        document.getElementById('message').style.color = "#ff4757";
    }
    
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
            alert(`😢 Linh lực không đủ (Cần tối thiểu ${expToLevelUp} để vượt ải). Mời Đạo Hữu làm lại.`);
            endGame(false); return;
        }
    }
    loadQuestion();
};
