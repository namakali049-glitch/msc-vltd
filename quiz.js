// ==========================================
// ĐỘNG CƠ BẾ QUAN KHAI PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================

let activeQuestions = [];
let currentQuestionIndex = 0;
let wrongCount = 0;
let vocabPool = [];
let quizSessionTimer = null;
let sessionSeconds = 0;

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
        if (realmData.major !== "Kim Đan Kỳ" && realmData.major !== "Nguyên Anh Kỳ") {
            alert("⚠️ Cảnh giới chưa đủ!\nĐạo hữu cần phá vỡ Bình Cảnh, đột phá lên [Kim Đan Chân Nhân] mới có thể mở khóa Trung Quyển.");
            return;
        }
        window.currentCsvFile = "b1_vocab.csv";
    } else {
        if (realmData.major === "Kim Đan Kỳ" || realmData.major === "Nguyên Anh Kỳ") {
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
    
    document.getElementById('totalScore').innerText = window.sessionMana;
    document.getElementById('timerDisplay').innerText = "00:00";
    document.getElementById('message').innerHTML = "Đang kết nối thần thức vào Tàng Kinh Các...";
    document.getElementById('options').innerHTML = "";
    document.getElementById('nextBtn').style.display = "none";

    // Cập nhật UI thanh trạng thái nhân vật
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana, window.masteredWordsA1?.length || 0, window.masteredWordsB1?.length || 0) : { major: "Phàm Nhân" };
    document.getElementById('quizStatLabel').innerText = realmData.major === "Phàm Nhân" ? "Sinh Mệnh" : "Thần Thức";
    document.getElementById('quizStatValue').innerText = realmData.major === "Phàm Nhân" ? `${window.currentHp}/${window.maxHp}` : window.thanThuc;
    
    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.jpg");
    document.getElementById('quizAvatar').src = avatarFunc(window.lifetimeMana || 0);

    if (quizSessionTimer) clearInterval(quizSessionTimer);
    quizSessionTimer = setInterval(() => {
        sessionSeconds++;
        document.getElementById('timerDisplay').innerText = window.formatTime(sessionSeconds);
    }, 1000);

    // Dùng PapaParse đọc file CSV
    Papa.parse(window.currentCsvFile, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            vocabPool = results.data.filter(row => row.hanzi && row.meaning);
            processVocabData();
        },
        error: function(err) {
            document.getElementById('message').innerHTML = "❌ Lỗi đọc ngọc giản: " + err.message;
        }
    });
};

// 3. THUẬT TOÁN RÚT THẺ THÔNG MINH (8 TỪ MỚI - 2 TỪ CŨ)
function processVocabData() {
    const isA1 = window.currentCsvFile.includes("a1");
    let masteredList = isA1 ? (window.masteredWordsA1 || []) : (window.masteredWordsB1 || []);
    if (!Array.isArray(masteredList)) masteredList = Object.keys(masteredList);

    const learned = vocabPool.filter(w => masteredList.includes(w.hanzi));
    const unlearned = vocabPool.filter(w => !masteredList.includes(w.hanzi));

    shuffleArray(learned);
    shuffleArray(unlearned);

    let drawPool = [];
    // Ưu tiên bốc tối đa 8 từ chưa thuộc
    const unlearnedToDraw = Math.min(8, unlearned.length);
    drawPool = drawPool.concat(unlearned.slice(0, unlearnedToDraw));
    
    // Bổ sung từ đã thuộc cho đủ 10 câu
    const needed = 10 - drawPool.length;
    drawPool = drawPool.concat(learned.slice(0, needed));

    shuffleArray(drawPool);
    activeQuestions = [];

    // Tạo đề bài với 1 đáp án đúng và 3 đáp án nhiễu
    drawPool.forEach(word => {
        let distractors = vocabPool.filter(w => w.hanzi !== word.hanzi);
        shuffleArray(distractors);
        let options = [word, distractors[0], distractors[1], distractors[2]];
        shuffleArray(options);

        let ansIdx = options.findIndex(opt => opt.hanzi === word.hanzi);
        
        activeQuestions.push({
            q: word.hanzi,
            fullWord: word,
            options: options.map(opt => `[${opt.pinyin}] ${opt.meaning}`),
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
    // Khóa các nút sau khi chọn
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);

    const qData = activeQuestions[currentQuestionIndex];
    const isCorrect = (selectedIdx === qData.ans);
    const msgDiv = document.getElementById('message');

    if (isCorrect) {
        btnElement.classList.add('correct');
        if (window.playCorrectSound) window.playCorrectSound();
        
        // 5.1. Xác định số từ vựng độc bản & Tính toán phần thưởng
        const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
        const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
        
        let bonusMana = Math.floor(10 + (window.str || 1) * 0.2); 
        const isA1 = window.currentCsvFile.includes("a1");

        // Ghi nhận từ vựng
        if (isA1) {
            if (!window.masteredWordsA1.includes(qData.q)) window.masteredWordsA1.push(qData.q);
        } else {
            if (!window.masteredWordsB1.includes(qData.q)) window.masteredWordsB1.push(qData.q);
        }

        // 5.2. Phạt EXP nếu Cảnh giới cao học Hạ Quyển
        const currentData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
        const isHighRealm = (currentData.major === "Kim Đan Kỳ" || currentData.major === "Nguyên Anh Kỳ");
        
        if (isHighRealm && isA1) {
            bonusMana = Math.max(1, Math.floor(bonusMana * 0.1));
        }

        // 5.3. KHÓA BÌNH CẢNH (Khống chế trần Linh Lực)
        let currentMana = window.lifetimeMana || 0;
        let canGainMana = true;
        let bottleneckMsg = "";

        if (countA1 < 600 && currentMana + bonusMana >= 8000) {
            bonusMana = Math.max(0, 7999 - currentMana);
            if (bonusMana === 0) {
                canGainMana = false;
                bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Kẹt Bình Cảnh! Cần lĩnh ngộ đủ 600 từ A1 để tích lũy thêm.</span>";
            }
        } else if (countB1 < 2667 && currentMana + bonusMana >= 25000) {
            bonusMana = Math.max(0, 24999 - currentMana);
            if (bonusMana === 0) {
                canGainMana = false;
                bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Kẹt Bình Cảnh! Cần lĩnh ngộ đủ 2667 từ B1 để tích lũy thêm.</span>";
            }
        }

        if (canGainMana && bonusMana > 0) {
            window.sessionMana += bonusMana;
            if (window.addLifetimeMana) window.addLifetimeMana(bonusMana);
            document.getElementById('totalScore').innerText = window.sessionMana;
            
            // Hồi HP
            window.currentHp = Math.min(window.maxHp || 100, (window.currentHp || 100) + 2);
        }

        // 5.4. Cơ chế rớt đồ (15%)
        let lootMsg = "";
        if (Math.random() < 0.15 && window.inventory) {
            const items = ["Hồi Xuân Đan", "Tụ Linh Đan", "Tẩy Tủy Đan"];
            const dropped = items[Math.floor(Math.random() * items.length)];
            window.inventory[dropped] = (window.inventory[dropped] || 0) + 1;
            lootMsg = `<br><span style='color:#ffd700;'>🎁 Nhặt được: ${dropped}</span>`;
            if (window.playLootSound) window.playLootSound();
        }

        msgDiv.innerHTML = `<span style='color:#4ade80;'>✅ Đốn Ngộ! +${bonusMana} Linh Lực.</span>${bottleneckMsg}${lootMsg}`;

    } else {
        // 5.5. Trả lời sai - Phạt Tâm Ma Phản Phệ
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
                // Tính Thần thức tối đa để trừ
                const maxThanThuc = realmData.thanThuc + ((window.playerStats?.spi || 1) * 10);
                dmg = Math.ceil(maxThanThuc / 3);
                window.currentHp -= dmg; // Quy đổi sát thương thần thức vào HP để hiển thị dễ hiểu
                statName = "Thần Thức";
            }
            
            msgDiv.innerHTML = `💥 <span style='color:#ef4444;'>Tâm Ma Xâm Nhập! Tổn thất ${dmg} ${statName}.</span>`;

            // Kiểm tra Tẩu Hỏa Nhập Ma
            if (window.currentHp <= 0 || wrongCount >= 3) {
                window.currentHp = 0;
                msgDiv.innerHTML += "<br><br>💀 <b>TẨU HỎA NHẬP MA! Đạo thể suy kiệt, bị văng khỏi Tàng Kinh Các.</b>";
                document.getElementById('nextBtn').style.display = "none";
                setTimeout(() => { stopCultivationEarly(); }, 2500);
                return;
            }
        }
    }
    
    // Cập nhật thanh UI mini
    const realmDataUpdate = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân" };
    document.getElementById('quizStatValue').innerText = realmDataUpdate.major === "Phàm Nhân" ? `${Math.max(0, window.currentHp)}/${window.maxHp}` : window.thanThuc;
    
    document.getElementById('nextBtn').style.display = "inline-block";
};

// 6. CHUYỂN CÂU HỎI
window.nextQuestion = function() {
    if (window.playClickSound) window.playClickSound();
    currentQuestionIndex++;
    if (currentQuestionIndex < activeQuestions.length) {
        showQuestion();
    } else {
        document.getElementById('message').innerHTML = "🌟 <span style='color:#ffd700;'>Hoàn thành chu kỳ chu thiên! Củng cố tu vi thành công.</span>";
        document.getElementById('options').innerHTML = "";
        document.getElementById('nextBtn').style.display = "none";
        
        setTimeout(() => {
            stopCultivationEarly();
        }, 2000);
    }
};

// 7. XUẤT QUAN (THOÁT SỚM)
window.stopCultivationEarly = function() {
    if (window.playClickSound) window.playClickSound();
    if (quizSessionTimer) clearInterval(quizSessionTimer);
    
    if (window.syncManaToDatabase) window.syncManaToDatabase();
    if (window.recalcStats) window.recalcStats();
    if (window.updateCharacterUI) window.updateCharacterUI();
    
    window.goHome();
};
