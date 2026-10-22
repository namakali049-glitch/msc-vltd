// ==========================================
// PHÂN HỆ BẾ QUAN KHAI PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
let currentLevel = 1;
let currentLevelExp = 0; 
let currentQuestionIndex = 0;
let expToLevelUp = 0; 
let sessionMana = 0;
let timerInterval = null;
let totalSeconds = 0;
let activeQuestions = []; 
let vocabPool = [];

window.currentCsvFile = "./a1_vocab.csv";
window.difficultyMultiplier = 1;

function formatTime(sec) {
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
window.formatTime = formatTime;

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
    const masteredList = isB1 ? (window.masteredWordsB1 || []) : (window.masteredWordsA1 || []);

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

window.checkAndStartVolume = function(vol) {
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    
    if (vol === 'trung_quyen') {
        if (realmData.major !== "Kim Đan" && realmData.major !== "Nguyên Anh") {
            alert("⚠️ Cảnh giới chưa đủ!\nĐạo hữu cần phá vỡ Bình Cảnh, đột phá lên [Kim Đan Chân Nhân] mới có thể mở khóa Trung Quyển.");
            return;
        }
        window.currentCsvFile = "./b1_vocab.csv";
        window.difficultyMultiplier = 1;
    } else {
        if (realmData.major === "Kim Đan" || realmData.major === "Nguyên Anh") {
            if (!confirm("⚠️ Đạo hữu đã đạt cảnh giới cao!\nTiếp tục tu luyện Hạ Quyển sẽ bị cơ chế thiên đạo giáng phạt, giảm 90% Linh Lực thu được. Vẫn muốn tiếp tục?")) {
                return; // Người chơi bấm Hủy sẽ không vào quiz nữa
            }
        }
        window.currentCsvFile = "./a1_vocab.csv";
        window.difficultyMultiplier = 1;
    }
    
    const hanNguModal = document.getElementById('hanNguModal');
    if (hanNguModal) hanNguModal.style.display = 'none';
    window.startGame();
};

window.startGame = async function() {
    if (window.playClickSound) window.playClickSound();
    if (window.switchScreen) window.switchScreen('game-screen'); 
    
    document.getElementById('question').innerText = "⏳ Đang trích xuất Khẩu Quyết...";
    
    await new Promise(resolve => {
        Papa.parse(window.currentCsvFile, {
            download: true, header: true, skipEmptyLines: true,
            complete: res => { vocabPool = res.data; resolve(); },
            error: () => { alert("❌ Lỗi nạp dữ liệu từ vựng! Đảm bảo đã có file " + window.currentCsvFile); resolve(); }
        });
    });

    currentLevel = 1; sessionMana = 0; totalSeconds = 0;
    if (window.recalcStats) window.recalcStats();
    window.currentHp = window.maxHp || 100;
    
    const getAvatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.jpg");
    document.getElementById('quizAvatar').src = getAvatarFunc(window.lifetimeMana || 0);
    
    const userName = (window.currentUser && (window.currentUser.displayName || (window.currentUser.email && window.currentUser.email.split('@')[0]))) || "Đạo Hữu";
    document.getElementById('quizName').innerText = userName;
    
    const thanThuc = window.thanThuc || 0;
    const maxHp = window.maxHp || 100;
    window.sessionThanThuc = thanThuc;
    if (thanThuc > 0) {
        document.getElementById('quizStatLabel').innerText = "Thần Thức";
        document.getElementById('quizStatValue').innerText = `${window.sessionThanThuc}/${thanThuc}`;
    } else {
        document.getElementById('quizStatLabel').innerText = "Sinh Mệnh";
        document.getElementById('quizStatValue').innerText = `${window.currentHp}/${maxHp}`;
    }

    const hudCount = document.getElementById('sessionMasteryCount');
    const isB1 = window.currentCsvFile && window.currentCsvFile.includes("b1");
    if (hudCount) hudCount.innerText = isB1 ? (window.masteredWordsB1 || []).length : (window.masteredWordsA1 || []).length;

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
    
    const str = window.str || 1;
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
            if (window.playClickSound) window.playClickSound();
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
    
    const str = window.str || 1;
    const agi = window.agi || 1;
    const thanThuc = window.thanThuc || 0;
    const maxHp = window.maxHp || 100;
    
    if (selectedIndex === correctIndex) {
        btnElement.classList.add('correct');
        if (window.playCorrectSound) window.playCorrectSound();
        
        let bonusMana = Math.floor(10 + str * 0.2); 
        window.currentHp = Math.min(maxHp, (window.currentHp || maxHp) + 2);

        const currentData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân" };
        const isHighRealm = (currentData.major === "Kim Đan" || currentData.major === "Nguyên Anh");
        const isFarmingLowQuyen = (!window.currentCsvFile || window.currentCsvFile.includes("a1"));

        if (isHighRealm && isFarmingLowQuyen) {
            bonusMana = Math.max(1, Math.floor(bonusMana * 0.1));
        }
        
        let lootMessage = "";
        if (Math.random() < 0.15) {
            const items = ["Hồi Xuân Đan", "Tụ Linh Đan", "Tẩy Tủy Đan"];
            const droppedItem = items[Math.floor(Math.random() * items.length)];
            if (window.inventory) {
                window.inventory[droppedItem] = (window.inventory[droppedItem] || 0) + 1;
            }
            lootMessage = `<br>🎁 <b style="color:#ffa502">Kỳ Ngộ!</b> Nhặt được [<b>${droppedItem}</b>]!`;
            if (window.playLootSound) window.playLootSound();
        }

        const currentQ = activeQuestions[currentQuestionIndex];
        const isB1 = window.currentCsvFile && window.currentCsvFile.includes("b1");
        let isNewWord = false;

        if (currentQ && currentQ.rawVocab) {
            const word = currentQ.rawVocab.hanzi.trim();
            if (isB1) {
                if (window.masteredWordsB1 && !window.masteredWordsB1.includes(word)) {
                    window.masteredWordsB1.push(word);
                    isNewWord = true;
                }
            } else {
                if (window.masteredWordsA1 && !window.masteredWordsA1.includes(word)) {
                    window.masteredWordsA1.push(word);
                    isNewWord = true;
                }
            }
        }

        const masteryHUD = document.getElementById('sessionMasteryCount');
        if (masteryHUD) masteryHUD.innerText = isB1 ? (window.masteredWordsB1 || []).length : (window.masteredWordsA1 || []).length;

        let newWordNotice = isNewWord ? `<br>🌟 <b style="color:#4ade80;">Lĩnh ngộ khẩu quyết mới: [${currentQ.rawVocab.hanzi}]!</b>` : '';
        document.getElementById('message').innerHTML = `✅ Đáp đúng! +${bonusMana} Linh Lực${newWordNotice}${lootMessage}`;
        document.getElementById('message').style.color = "#2ed573";
        
        currentLevelExp += bonusMana;
        sessionMana += bonusMana;
        
        if (window.addLifetimeMana) {
            window.addLifetimeMana(bonusMana);
        } else {
            window.lifetimeMana = (window.lifetimeMana || 0) + bonusMana;
        }
        
        if (window.updateCharacterUI) window.updateCharacterUI();
        if (window.syncManaToDatabase) window.syncManaToDatabase();
        if (window.checkAndTriggerBreakthrough) window.checkAndTriggerBreakthrough();
    } else {
        btnElement.classList.add('wrong');
        if (buttons[correctIndex]) buttons[correctIndex].classList.add('correct');
        if (window.playWrongSound) window.playWrongSound();
        
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
                window.currentHp = (window.currentHp || maxHp) - damage;
                if (window.currentHp < 0) window.currentHp = 0;
                
                document.getElementById('quizStatValue').innerText = `${window.currentHp}/${maxHp}`;
                document.getElementById('message').innerText = `❌ Mất ${damage} Sinh Mệnh!`;
                document.getElementById('message').style.color = "#ff4757";
                
                if (window.currentHp <= 0) {
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
    if (window.playClickSound) window.playClickSound();
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
    if (window.playClickSound) window.playClickSound();
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
        💎 Tổng Tu Vi: <span style="color:#00d2d3;">${window.lifetimeMana || 0}</span>`;
    
    document.getElementById('options').innerHTML = "";
    document.getElementById('counter').innerText = "";
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('message').innerText = "";
    
    let btn = document.createElement('button');
    btn.className = "btn-main mt-10"; btn.innerText = "Trở Về Động Phủ 🏯";
    btn.onclick = () => {
        if (window.goHome) window.goHome();
    };
    document.getElementById('options').appendChild(btn);
}
