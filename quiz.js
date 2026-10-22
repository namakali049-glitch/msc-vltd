// ==========================================
// ĐỘNG CƠ BẾ QUAN KHAI PHÁ (MÔ-ĐUN ĐỘC LẬP) - VÁ LỖI VÀ TỐI ƯU
// ==========================================

let activeQuestions = [];
let currentQuestionIndex = 0;
let wrongCount = 0;
let vocabPool = [];
let quizSessionTimer = null;
let sessionSeconds = 0;

// Các biến phục vụ thanh tiến trình
let currentLevel = 1;
let currentLevelExp = 0; 
let expToLevelUp = 0; 

// Tiện ích: Xáo trộn mảng (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Tiện ích: Format thời gian
window.formatTime = function(totalSecs) {
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// 1. CHỌN QUYỂN & CẢNH BÁO
window.checkAndStartVolume = function(vol) {
    if (window.playClickSound) window.playClickSound();

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    
    if (vol === 'trung_quyen') {
        if (realmData.major !== "Kim Đan" && realmData.major !== "Nguyên Anh") {
            alert("⚠️ Cảnh giới chưa đủ!\nĐạo hữu cần phá vỡ Bình Cảnh, đột phá lên [Kim Đan Chân Nhân] mới có thể mở khóa Trung Quyển.");
            return;
        }
        window.currentCsvFile = "b1_vocab.csv";
    } else {
        if (realmData.major === "Kim Đan" || realmData.major === "Nguyên Anh") {
            alert("⚠️ CẢNH BÁO THIÊN ĐẠO:\nĐạo hữu đã đạt cảnh giới cao. Tiếp tục tu luyện Hạ Quyển sẽ bị giáng phạt giảm 90% Linh Lực nhận được!");
        }
        window.currentCsvFile = "a1_vocab.csv";
    }
    
    const hanNguModal = document.getElementById('hanNguModal');
    if (hanNguModal) hanNguModal.style.display = 'none';
    window.startGame();
};

// 2. KHỞI CHẠY BẾ QUAN
window.startGame = function() {
    window.switchScreen('game-screen');
    currentQuestionIndex = 0;
    wrongCount = 0;
    window.sessionMana = 0;
    sessionSeconds = 0;
    currentLevel = 1;
    currentLevelExp = 0;
    
    document.getElementById('totalScore').innerText = window.sessionMana;
    document.getElementById('timerDisplay').innerText = "00:00";
    document.getElementById('message').innerHTML = "Đang kết nối thần thức vào Tàng Kinh Các...";
    document.getElementById('options').innerHTML = "";
    document.getElementById('nextBtn').style.display = "none";

    // Đồng bộ chỉ số trước khi chơi
    if (window.recalcStats) window.recalcStats();
    
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana, countA1, countB1) : { major: "Phàm Nhân" };
    
    window.sessionThanThuc = window.thanThuc || 0;
    
    document.getElementById('quizStatLabel').innerText = realmData.major === "Phàm Nhân" ? "Sinh Mệnh" : "Thần Thức";
    document.getElementById('quizStatValue').innerText = realmData.major === "Phàm Nhân" ? `${window.currentHp}/${window.maxHp}` : `${window.sessionThanThuc}/${window.thanThuc}`;
    
    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.jpg");
    document.getElementById('quizAvatar').src = avatarFunc(window.lifetimeMana || 0);

    const userName = (window.currentUser && (window.currentUser.displayName || (window.currentUser.email && window.currentUser.email.split('@')[0]))) || "Đạo Hữu";
    document.getElementById('quizName').innerText = userName;

    if (quizSessionTimer) clearInterval(quizSessionTimer);
    quizSessionTimer = setInterval(() => {
        sessionSeconds++;
        document.getElementById('timerDisplay').innerText = window.formatTime(sessionSeconds);
    }, 1000);

    Papa.parse(window.currentCsvFile, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            vocabPool = results.data.filter(row => row.hanzi && row.meaning && row.hanzi.trim() !== "");
            initLevel();
        },
        error: function(err) {
            document.getElementById('message').innerHTML = "❌ Lỗi đọc ngọc giản: " + err.message;
        }
    });
};

function initLevel() {
    currentLevelExp = 0; 
    currentQuestionIndex = 0;
    processVocabData();

    const str = window.str || 1;
    let bonusPerQ = Math.floor(10 + str * 0.2);
    expToLevelUp = Math.floor(activeQuestions.length * 0.8) * bonusPerQ; 
    
    document.getElementById('level').innerText = currentLevel;
    document.getElementById('maxExp').innerText = expToLevelUp;
    document.getElementById('exp').innerText = "0";
    document.getElementById('expFill').style.width = "0%";
}

// 3. THUẬT TOÁN RÚT THẺ TỐI ƯU HIỆU SUẤT
function processVocabData() {
    const isA1 = window.currentCsvFile.includes("a1");
    let masteredList = isA1 ? (window.masteredWordsA1 || []) : (window.masteredWordsB1 || []);

    const learned = vocabPool.filter(w => masteredList.includes(w.hanzi));
    const unlearned = vocabPool.filter(w => !masteredList.includes(w.hanzi));

    shuffleArray(learned);
    shuffleArray(unlearned);

    let drawPool = [];
    const unlearnedToDraw = Math.min(8, unlearned.length);
    drawPool = drawPool.concat(unlearned.slice(0, unlearnedToDraw));
    
    const needed = 10 - drawPool.length;
    drawPool = drawPool.concat(learned.slice(0, needed));

    shuffleArray(drawPool);
    activeQuestions = [];

    // TỐI ƯU: Chọn ngẫu nhiên đáp án nhiễu bằng Set thay vì filter và shuffle cả mảng 4000 từ
    drawPool.forEach(word => {
        let optionsSet = new Set();
        optionsSet.add(word);
        
        let attempts = 0;
        while(optionsSet.size < 4 && attempts < 50) {
            let randomWord = vocabPool[Math.floor(Math.random() * vocabPool.length)];
            if(randomWord.meaning !== word.meaning) {
                optionsSet.add(randomWord);
            }
            attempts++;
        }
        
        let optionsArr = Array.from(optionsSet);
        shuffleArray(optionsArr);
        let ansIdx = optionsArr.findIndex(opt => opt.hanzi === word.hanzi);
        
        activeQuestions.push({
            q: `Đạo hữu hãy cho biết ý nghĩa của từ này:\n\n✨ ${word.hanzi} ✨\n(Phiên âm: ${word.pinyin || ''} | Loại: ${word.type || 'Từ'})`,
            fullWord: word,
            options: optionsArr.map(opt => opt.meaning),
            ans: ansIdx
        });
    });

    if (activeQuestions.length > 0) {
        showQuestion();
    } else {
        document.getElementById('message').innerHTML = "Đã tu luyện trọn vẹn bổn kinh thư này!";
        stopCultivationEarly();
    }
}

// 4. HIỂN THỊ CÂU HỎI
function showQuestion() {
    if (currentLevel > 4) { endGame(true); return; }
    const qData = activeQuestions[currentQuestionIndex];
    document.getElementById('counter').innerText = `Câu hỏi: ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
    document.getElementById('question').innerText = qData.q;
    document.getElementById('message').innerHTML = "";
    document.getElementById('nextBtn').style.display = "none";

    const optsDiv = document.getElementById('options');
    optsDiv.innerHTML = "";
    qData.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => window.checkAnswer(idx, btn);
        optsDiv.appendChild(btn);
    });
}

// 5. KIỂM TRA ĐÁP ÁN & CƠ CHẾ LOGIC
window.checkAnswer = function(selectedIdx, btnElement) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);

    const qData = activeQuestions[currentQuestionIndex];
    const isCorrect = (selectedIdx === qData.ans);
    const msgDiv = document.getElementById('message');

    if (isCorrect) {
        btnElement.classList.add('correct');
        if (window.playCorrectSound) window.playCorrectSound();
        
        // Ghi nhận từ vựng trước
        const wordHanzi = qData.fullWord.hanzi.trim();
        let isNewWord = false;
        const isA1 = window.currentCsvFile.includes("a1");

        if (isA1) {
            if (!window.masteredWordsA1.includes(wordHanzi)) {
                window.masteredWordsA1.push(wordHanzi);
                isNewWord = true;
            }
        } else {
            if (!window.masteredWordsB1.includes(wordHanzi)) {
                window.masteredWordsB1.push(wordHanzi);
                isNewWord = true;
            }
        }

        const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
        const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
        
        let bonusMana = Math.floor(10 + (window.str || 1) * 0.2); 
        
        const currentData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
        const isHighRealm = (currentData.major === "Kim Đan" || currentData.major === "Nguyên Anh");
        
        if (isHighRealm && isA1) {
            bonusMana = Math.max(1, Math.floor(bonusMana * 0.1));
        }

        // KHÓA BÌNH CẢNH (Chỉ chặn cộng Mana, KHÔNG CHẶN TỪ VỰNG MỚI)
        let currentMana = window.lifetimeMana || 0;
        let canGainMana = true;
        let bottleneckMsg = "";

        if (countA1 < 600 && currentMana >= 7999) {
            canGainMana = false;
            bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Đạo cơ bất ổn! Cần lĩnh ngộ đủ 600 từ A1 mới có thể ngưng tụ thêm Linh Lực.</span>";
        } else if (countB1 < 2667 && currentMana >= 24999) {
            canGainMana = false;
            bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Bình Cảnh tột cùng! Cần lĩnh ngộ đủ 2667 từ B1 mới đột phá Nguyên Anh.</span>";
        }

        if (canGainMana) {
            // Ngăn chặn vượt mốc nếu đang cày mà chạm trần (Ví dụ: Từ 7990 + 10 = 8000 -> Ép về 7999)
            if (countA1 < 600 && currentMana + bonusMana >= 8000) {
                bonusMana = 7999 - currentMana;
                bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Đã chạm đỉnh Trúc Cơ! Hãy học thêm từ vựng để phá cảnh.</span>";
            }
            if (countB1 < 2667 && currentMana + bonusMana >= 25000) {
                bonusMana = 24999 - currentMana;
                bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Đã chạm đỉnh Kim Đan! Hãy học thêm từ vựng để phá cảnh.</span>";
            }

            if (bonusMana > 0) {
                window.sessionMana += bonusMana;
                currentLevelExp += bonusMana;
                if (window.addLifetimeMana) window.addLifetimeMana(bonusMana);
            }
        }
        
        window.currentHp = Math.min(window.maxHp || 100, (window.currentHp || 100) + 2);

        // Cơ chế rớt đồ
        let lootMsg = "";
        if (Math.random() < 0.15 && window.inventory) {
            const items = ["Hồi Xuân Đan", "Tụ Linh Đan", "Tẩy Tủy Đan"];
            const dropped = items[Math.floor(Math.random() * items.length)];
            window.inventory[dropped] = (window.inventory[dropped] || 0) + 1;
            lootMsg = `<br><span style='color:#ffd700;'>🎁 Nhặt được: ${dropped}</span>`;
            if (window.playLootSound) window.playLootSound();
        }

        let newWordNotice = isNewWord ? `<br>🌟 <b style="color:#4ade80;">Lĩnh ngộ khẩu quyết mới: [${wordHanzi}]!</b>` : '';
        let gainText = (canGainMana && bonusMana > 0) ? `+${bonusMana} Linh Lực.` : `Chỉ ngộ đạo, không tăng tu vi.`;
        msgDiv.innerHTML = `<span style='color:#4ade80;'>✅ Đáp đúng! ${gainText}</span>${newWordNotice}${bottleneckMsg}${lootMsg}`;

    } else {
        // Trả lời sai
        btnElement.classList.add('wrong');
        btns[qData.ans].classList.add('correct');
        wrongCount++;
        
        let dodgeRate = Math.min(30, (window.agi || 1) * 0.5);
        let isDodged = (Math.random() * 100) < dodgeRate;
        
        if (isDodged) {
            msgDiv.innerHTML = "🌀 <span style='color:#38bdf8;'>Thân pháp linh hoạt! Đạo hữu đã né được Tâm Ma phản phệ.</span>";
        } else {
            if (window.playWrongSound) window.playWrongSound();
            const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân", hp: 100 };
            
            let dmg = 0;
            let statName = "";
            if (realmData.major === "Phàm Nhân") {
                dmg = Math.ceil((window.maxHp || 100) / 3);
                window.currentHp -= dmg;
                statName = "Sinh Mệnh";
            } else {
                const maxThanThuc = realmData.thanThuc + ((window.playerStats?.spi || 1) * 10);
                dmg = Math.ceil(maxThanThuc / 3);
                window.sessionThanThuc -= dmg; 
                statName = "Thần Thức";
            }
            
            msgDiv.innerHTML = `💥 <span style='color:#ef4444;'>Tâm Ma Xâm Nhập! Tổn thất ${dmg} ${statName}.</span>`;

            if (window.currentHp <= 0 || window.sessionThanThuc <= 0 || wrongCount >= 3) {
                if (window.currentHp < 0) window.currentHp = 0;
                if (window.sessionThanThuc < 0) window.sessionThanThuc = 0;
                
                msgDiv.innerHTML += "<br><br>💀 <b>TẨU HỎA NHẬP MA! Đạo thể suy kiệt, bị văng khỏi Tàng Kinh Các.</b>";
                document.getElementById('nextBtn').style.display = "none";
                updateMiniHUD(realmData.major);
                setTimeout(() => { stopCultivationEarly(); }, 2500);
                return;
            }
        }
    }
    
    // Cập nhật thanh UI mini
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const rData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    updateMiniHUD(rData.major);
    
    let expPercent = Math.min(100, (currentLevelExp / expToLevelUp) * 100);
    document.getElementById('expFill').style.width = expPercent + "%";
    document.getElementById('exp').innerText = currentLevelExp;
    document.getElementById('totalScore').innerText = window.sessionMana;

    document.getElementById('nextBtn').style.display = "inline-block";
};

function updateMiniHUD(majorRealm) {
    if (majorRealm === "Phàm Nhân") {
        document.getElementById('quizStatValue').innerText = `${Math.max(0, window.currentHp)}/${window.maxHp}`;
    } else {
        document.getElementById('quizStatValue').innerText = `${Math.max(0, window.sessionThanThuc)}/${window.thanThuc}`;
    }
}

// 6. CHUYỂN CÂU HỎI
window.nextQuestion = function() {
    if (window.playClickSound) window.playClickSound();
    currentQuestionIndex++;
    if (currentQuestionIndex < activeQuestions.length) {
        showQuestion();
    } else {
        if (currentLevelExp >= expToLevelUp) {
            currentLevel++;
            if (currentLevel > 4) {
                endGame(true, false);
                return;
            }
            alert(`🎉 Đột phá thành công sang Tầng ${currentLevel}!`); 
            initLevel(); 
        } else {
            alert(`😢 Linh lực không đủ để qua Tầng. Bế quan kết thúc.`);
            endGame(false, false); 
        }
    }
};

// 7. XUẤT QUAN (THOÁT SỚM)
window.stopCultivationEarly = function() {
    if (window.playClickSound) window.playClickSound();
    if(confirm("Đạo hữu muốn xuất quan sớm? Linh Lực lĩnh ngộ vẫn sẽ được giữ lại!")) {
        endGame(true, true);
    }
};

function endGame(win, earlyExit = false) {
    if (quizSessionTimer) clearInterval(quizSessionTimer);
    let title = win ? (earlyExit ? "🚪 Đã Xuất Quan Sớm" : "🏆 Bế Quan Viên Mãn!") : "💥 Tẩu Hỏa Nhập Ma!";
    let titleColor = win ? (earlyExit ? "#38bdf8" : "#2ed573") : "#ff4757";
    
    document.getElementById('question').innerHTML = 
        `<span style="color:${titleColor}; font-size:1.3rem;"><b>${title}</b></span><br><br>
        🎯 Nhận: <span style="color:#eccc68;">+${window.sessionMana} Linh Lực</span><br>
        💎 Tổng Tu Vi: <span style="color:#00d2d3;">${window.lifetimeMana || 0}</span>`;
    
    document.getElementById('options').innerHTML = "";
    document.getElementById('counter').innerText = "";
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('message').innerText = "";
    
    let btn = document.createElement('button');
    btn.className = "btn-main mt-10"; btn.innerText = "Trở Về Động Phủ 🏯";
    btn.onclick = () => {
        if (window.syncManaToDatabase) window.syncManaToDatabase();
        if (window.recalcStats) window.recalcStats();
        if (window.updateCharacterUI) window.updateCharacterUI();
        if (window.goHome) window.goHome();
    };
    document.getElementById('options').appendChild(btn);
}
