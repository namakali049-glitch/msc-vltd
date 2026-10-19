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

// Hàm tải Đan Điền từ Firebase khi người chơi đăng nhập
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

// Theo dõi trạng thái đăng nhập
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const name = user.displayName || user.email.split('@')[0];
        document.getElementById('userDisplayName').innerText = name;
        
        // Nạp tu vi (Linh lực) cũ từ Database
        await loadUserLifetimeMana(user.uid);
        
        switchScreen('start-screen');
    } else {
        currentUser = null;
        lifetimeMana = 0;
        switchScreen('auth-screen');
    }
});

// Đăng ký
window.handleSignup = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();

    if (!email || !password || !displayName) { alert("Vui lòng điền đầy đủ thông tin!"); return; }
    if (password.length < 6) { alert("Mật khẩu phải từ 6 ký tự trở lên!"); return; }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });
        
        // Khởi tạo Đan Điền cho tân thủ
        await set(ref(database, 'users/' + userCredential.user.uid), {
            name: displayName,
            mana: 0,
            joinedAt: Date.now()
        });
        
        alert("Đăng ký tài khoản tu tiên thành công!");
    } catch (error) { alert("Đăng ký thất bại: " + error.message); }
};

// Đăng nhập
window.handleLogin = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();

    if (!email || !password) { alert("Vui lòng nhập Email và Mật khẩu!"); return; }
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (error) { alert("Đăng nhập thất bại: Tài khoản hoặc mật khẩu không chính xác!"); }
};

// Đăng nhập Google
window.handleGoogleLogin = async function() {
    try { 
        const result = await signInWithPopup(auth, googleProvider);
        // Tự động kiểm tra và tạo Đan Điền nếu là người mới
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

// Đăng xuất
window.handleLogout = function() { signOut(auth); };

// ==========================================
// HỆ THỐNG CẢNH GIỚI & LƯU TRỮ
// ==========================================

// Quy đổi tổng Linh Lực sang Cảnh Giới
function calculateRealm(mana) {
    if (mana < 50) return "Phàm Nhân";
    if (mana < 150) return "Luyện Khí Sơ Kỳ";
    if (mana < 300) return "Luyện Khí Trung Kỳ";
    if (mana < 600) return "Luyện Khí Hậu Kỳ";
    if (mana < 1500) return "Luyện Khí Đại Viên Mãn";
    return "Trúc Cơ Sơ Kỳ";
}

// Lưu Linh lực cộng dồn vĩnh viễn sau mỗi ván bế quan
async function saveScore() {
    if (!currentUser) return;
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    
    // 1. Cộng dồn linh lực ván này vào tổng
    lifetimeMana += sessionMana;

    try {
        // 2. Cập nhật Đan Điền cá nhân (users/uid)
        await set(ref(database, 'users/' + currentUser.uid), {
            name: name,
            mana: lifetimeMana,
            lastUpdated: Date.now()
        });

        // 3. Cập nhật Tiên Đạo Bảng (Dùng set để mỗi user chỉ có 1 record)
        await set(ref(database, 'leaderboard/' + currentUser.uid), {
            uid: currentUser.uid,
            name: name,
            score: lifetimeMana,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật Đan Điền:", error);
    }
}

// Màn hình hồ sơ nhân vật (Hiện thị tổng tu vi)
window.showProfile = function() {
    if (!currentUser) { alert("Đạo hữu vui lòng đăng nhập để xem thông tin!"); return; }
    
    switchScreen('profile-screen');
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('profileName').innerText = name;
    
    // Trực tiếp lấy từ biến lifetimeMana cực kỳ nhanh chóng
    document.getElementById('profileMana').innerText = lifetimeMana;
    document.getElementById('profileRealm').innerText = calculateRealm(lifetimeMana);
};

// Tiên Đạo Bảng (Xếp hạng theo tổng Linh lực vĩnh viễn)
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
            
            // Sắp xếp: Ai có nhiều tổng Linh lực nhất đứng đầu
            records.sort((a, b) => b.score - a.score);
            let top10 = records.slice(0, 10);
            
            lbList.innerHTML = '';
            top10.forEach((player, index) => {
                let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `<b>${index + 1}.</b>`;
                let realm = calculateRealm(player.score || 0);

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
                            <span class="lb-mana">⚡ ${player.score} Tổng Linh Lực</span>
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

// Bắt đầu game (Fix lỗi UI Loading & Catch file CSV)
window.startGame = async function() {
    switchScreen('game-screen'); // Chuyển màn hình trước để hiển thị chữ Loading
    
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
    sessionMana = 0; // Đặt lại linh lực của riêng ván này
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
    activeQuestions = generate
