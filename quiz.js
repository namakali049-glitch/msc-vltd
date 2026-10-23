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

// HÀM CẬP NHẬT THANH MÁU VÀ THANH MANA (LINH LỰC) BẾ QUAN
window.updateQuizHUD = function() {
    const curHp = Math.max(0, window.currentHp || 0);
    const maxHp = window.maxHp || 10;
    const hpPercent = Math.min(100, Math.max(0, (curHp / maxHp) * 100));

    const hpFill = document.getElementById('quizHpFill');
    const hpText = document.getElementById('quizHpText');
    if (hpFill) hpFill.style.width = hpPercent + "%";
    if (hpText) hpText.innerText = `❤️ ${curHp}/${maxHp}`;

    const curMana = Math.max(0, window.currentLinhLuc || 0);
    const maxMana = window.maxLinhLuc || 0;
    const manaPercent = maxMana > 0 ? Math.min(100, Math.max(0, (curMana / maxMana) * 100)) : 0;

    const manaFill = document.getElementById('quizManaFill');
    const manaText = document.getElementById('quizManaText');
    if (manaFill) manaFill.style.width = manaPercent + "%";
    if (manaText) manaText.innerText = `🌀 ${curMana}/${maxMana}`;
};

// 1. CHỌN QUYỂN & CẢNH BÁO
window.checkAndStartVolume = function(vol) {
    if (window.playClickSound) window.playClickSound();

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    
    if (vol === 'trung_quyen') {
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

    // Cập nhật Tên, Cảnh giới, Avatar vào HUD Bế Quan
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmName = window.calculateRealm ? window.calculateRealm(window.lifetimeMana || 0, countA1, countB1) : "Phàm Nhân";
    const playerName = (window.currentUser && (window.currentUser.displayName || (window.currentUser.email && window.currentUser.email.split('@')[0]))) || "Đạo Hữu";

    const qName = document.getElementById('quizName');
    const qBadge = document.getElementById('quizRealmBadge');
    const qAvatar = document.getElementById('quizAvatar');
    if (qName) qName.innerText = playerName;
    if (qBadge) qBadge.innerText = realmName;

    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.jpg");
    if (qAvatar) qAvatar.src = avatarFunc(window.lifetimeMana || 0);

    // Cập nhật 2 thanh Máu và Mana
    window.updateQuizHUD();

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
            pinyin: word.pinyin,
            fullWord: word,
            options: options.map(opt => opt.meaning), // Chỉ hiển thị nghĩa tiếng Việt
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
    
    // Hiển thị chữ Hán lớn kèm Pinyin đặt ngay phía dưới
    document.getElementById('question').innerHTML = `
        <div class="quiz-hanzi">${qData.q}</div>
        <div class="quiz-pinyin">[ ${qData.pinyin || ''} ]</div>
    `;
    
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

        // 5.2. HỆ THỐNG PHẠT CHÉO CẢNH GIỚI VÀ CÔNG PHÁP
        const currentData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
        const isHighRealm = (currentData.major === "Kim Đan Kỳ" || currentData.major === "Nguyên Anh Kỳ");
        const isLowRealm = !isHighRealm; // Phàm Nhân, Luyện Khí, Trúc Cơ
        
        let penaltyMsg = "";

        // Trúc Cơ trở xuống học Trung Quyển (B1)
        if (isLowRealm && !isA1) {
            bonusMana = Math.max(1, Math.floor(bonusMana * 0.1));
            penaltyMsg = "<br><span style='color:#fbbf24; font-size:0.85rem;'>⚠️ Đạo hạnh chưa đủ, cưỡng ép tu luyện Trung Quyển khiến linh khí tiêu tán!</span>";
        } 
        // Kim Đan trở lên quay lại học Hạ Quyển (A1)
        else if (isHighRealm && isA1) {
            bonusMana = Math.max(1, Math.floor(bonusMana * 0.1));
            penaltyMsg = "<br><span style='color:#fbbf24; font-size:0.85rem;'>⚠️ Cảnh giới quá cao, tu luyện Hạ Quyển không còn nhiều tác dụng!</span>";
        }

        // 5.3. KHÓA BÌNH CẢNH (Khống chế trần Linh Lực)
        let currentMana = window.lifetimeMana || 0;
        let canGainMana = true;
        let bottleneckMsg = "";

        if (!window.isAdmin && countA1 < 600 && currentMana + bonusMana >= 12000) {
            bonusMana = Math.max(0, 11999 - currentMana);
            if (bonusMana === 0) {
                canGainMana = false;
                bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Kẹt Bình Cảnh! Cần lĩnh ngộ đủ 600 từ A1 để đột phá.</span>";
            }
        } else if (!window.isAdmin && countB1 < 2667 && currentMana + bonusMana >= 50000) {
            bonusMana = Math.max(0, 49999 - currentMana);
            if (bonusMana === 0) {
                canGainMana = false;
                bottleneckMsg = "<br><span style='color:#ef4444; font-weight:bold;'>⚠️ Kẹt Bình Cảnh! Cần lĩnh ngộ đủ 2667 từ B1 để đột phá.</span>";
            }
        }

        if (canGainMana && bonusMana > 0) {
            window.sessionMana += bonusMana;
            if (window.addLifetimeMana) window.addLifetimeMana(bonusMana);
            document.getElementById('totalScore').innerText = window.sessionMana;
            
            // Hồi HP
            window.currentHp = Math.min(window.maxHp || 100, (window.currentHp || 100) + 2);
        }

        // 5.4. HIỆU ỨNG TỤ LINH ĐAN (x2 Linh Khí)
        let buffMsg = "";
        if (window.tuLinhBuff && window.tuLinhBuff > 0) {
            bonusMana *= 2;
            window.tuLinhBuff--;
            buffMsg = `<br><span style='color:#c084fc;'>✨ Tụ Linh Đan kích hoạt! x2 Linh Khí (Còn ${window.tuLinhBuff} câu)</span>`;
        }

        msgDiv.innerHTML = `<span style='color:#4ade80;'>✅ Đốn Ngộ! +${bonusMana} Linh Khí.</span>${penaltyMsg}${bottleneckMsg}${buffMsg}`;
        window.updateQuizHUD();

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
            const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân" };
            let dmg = 0;
            let statName = "";

            if (realmData.major === "Phàm Nhân") {
                dmg = Math.ceil((window.maxHp || 10) / 3);
                window.currentHp = Math.max(0, (window.currentHp || 10) - dmg);
                statName = "Sinh Mệnh";
            } else {
                // Tu sĩ: Trừ trực tiếp vào Linh Lực (Thanh Mana)
                dmg = Math.ceil((window.maxLinhLuc || 10) / 3);
                window.currentLinhLuc = Math.max(0, (window.currentLinhLuc || 0) - dmg);
                statName = "Linh Lực";
            }

            msgDiv.innerHTML = `💥 <span style='color:#ef4444;'>Tâm Ma Xâm Nhập! Tổn thất ${dmg} ${statName}.</span>`;
            window.updateQuizHUD();

            // Hết máu hoặc hết Linh Lực hoặc sai 3 lần => Tẩu Hỏa Nhập Ma
            const isOutOfEnergy = (realmData.major === "Phàm Nhân" && window.currentHp <= 0) || 
                                  (realmData.major !== "Phàm Nhân" && window.currentLinhLuc <= 0);

            if (isOutOfEnergy || wrongCount >= 3) {
                msgDiv.innerHTML += "<br><br>💀 <b>TẨU HỎA NHẬP MA! Đạo thể suy kiệt, bị văng khỏi Tàng Kinh Các.</b>";
                document.getElementById('nextBtn').style.display = "none";
                setTimeout(() => { stopCultivationEarly(); }, 2500);
                return;
            }
        }
    }
    window.updateQuizHUD();
    
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
