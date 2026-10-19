// ==========================================
// CẤU HÌNH API GOOGLE SHEETS
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCOLr_d_PHUrY1RjKeyT8-oeTMEus5UHUeFWiAch0AuHqwQorOO3ghVMmc-6x5RBiy5Q/exec";

let currentPlayer = "";
let currentLevel = 1;
let totalScore = 0;      
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 0; 
const expPerQuestion = 10;

// Timer Variables
let timerInterval = null;
let totalSeconds = 0;

let activeQuestions = []; 

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

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function goHome() {
    switchScreen('start-screen');
}

// --- Data Saving ---
function saveScore() {
    if (!currentPlayer) return;
    
    // Lưu vào Google Sheets Cloud
    fetch(`${SCRIPT_URL}?action=add&name=${encodeURIComponent(currentPlayer)}&score=${totalScore}&time=${totalSeconds}`)
        .then(response => console.log("Đã lưu điểm và thời gian lên Cloud!"))
        .catch(error => console.error("Lỗi lưu:", error));

    // Lưu vào LocalStorage làm bản sao lưu
    let lb = JSON.parse(localStorage.getItem('tocfl_leaderboard')) || [];
    let existing = lb.find(p => p.name === currentPlayer);
    
    if (existing) {
        if (totalScore > existing.score || (totalScore === existing.score && totalSeconds < existing.time)) {
            existing.score = totalScore;
            existing.time = totalSeconds;
        }
    } else {
        lb.push({ name: currentPlayer, score: totalScore, time: totalSeconds });
    }
    
    lb.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
    });
    lb = lb.slice(0, 10); 
    localStorage.setItem('tocfl_leaderboard', JSON.stringify(lb));
}

function renderLeaderboard(lbData) {
    let lbList = document.getElementById('lb-list');
    lbList.innerHTML = '';
    if (lbData.length === 0) {
        lbList.innerHTML = '<li>目前還沒有紀錄喔！</li>';
    } else {
        lbData.forEach((player, index) => {
            let medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `<b>${index+1}.</b>`;
            let timeStr = formatTime(player.time || 0);
            lbList.innerHTML += `
                <li>
                    <span>${medal}</span>
                    <span class="lb-name">${player.name}</span> 
                    <div class="lb-stats">
                        <span style="color:#ff6b81;">${player.score} 分</span>
                        <span class="lb-time">⏱️ ${timeStr}</span>
                    </div>
                </li>`;
        });
    }
}

function showLeaderboard() {
    switchScreen('leaderboard-screen');
    let lbList = document.getElementById('lb-list');
    
    lbList.innerHTML = '<li>⏳ 正在從伺服器讀取資料...</li>';
    
    // Kéo dữ liệu từ Google Sheets
    fetch(`${SCRIPT_URL}?action=read`)
        .then(response => response.json())
        .then(lb => {
            renderLeaderboard(lb);
        })
        .catch(error => {
            lbList.innerHTML = '<li>❌ 連線失敗！請稍後再試。</li>';
            console.error(error);
        });
}

// --- Game Logic ---
function startGame() {
    let nameInput = document.getElementById('playerName').value.trim();
    if (nameInput === "") {
        alert("請輸入你的名字才能開始遊戲喔！");
        return;
    }
    currentPlayer = nameInput;
    
    currentLevel = 1;
    totalScore = 0;
    totalSeconds = 0;
    
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
    currentLevelExp = 0;
    currentQuestionIndex = 0;
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
        document.getElementById('question').innerHTML = `🏆 <b>恭喜大師！</b><br><br>你已突破最高難度。<br><br>🎯 總分：<span style="color:#eccc68;">${totalScore}</span> 分<br>⏱️ 時間：<span style="color:#7bed9f;">${finalTime}</span>`;
    } else {
        document.getElementById('question').innerHTML = `😢 <b>挑戰失敗！</b><br><br>🎯 總分：<span style="color:#ff6b81;">${totalScore}</span> 分<br>⏱️ 時間：<span style="color:#747d8c;">${finalTime}</span><br><br>請多加練習再回來挑戰吧！`;
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
    if(currentLevel > 4) {
        endGame(true);
        return;
    }

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

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= activeQuestions.length) {
        if (currentLevelExp >= expToLevelUp) {
            currentLevel++;
            if (currentLevel <= 4) {
                alert(`🎉 太棒了！你已成功晉級到 等級 ${currentLevel}！`);
                initLevel();
                return; 
            }
        } else {
            alert(`😢 很遺憾！你在這關只獲得 ${currentLevelExp} 分 (需要 ${expToLevelUp} 分)。挑戰結束！`);
            endGame(false);
            return;
        }
    }
    
    loadQuestion();
}
