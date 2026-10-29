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

    const avatarFunc = window.getAvatarByMana || (() => "assets/pham-nhan.png");
    if (qAvatar) qAvatar.src = avatarFunc(window.lifetimeMana || 0);

    // Cập nhật 2 thanh Máu và Mana
    window.updateQuizHUD();

    

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

// 3. THUẬT TOÁN RÚT THẺ THÔNG MINH ĐÃ FIX LỖI TRÙNG LẶP VÀ SAI ĐÁP ÁN
function processVocabData() {
    const isA1 = window.currentCsvFile.includes("a1");
    let masteredList = isA1 ? (window.masteredWordsA1 || []) : (window.masteredWordsB1 || []);
    if (!Array.isArray(masteredList)) masteredList = Object.keys(masteredList);

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

    // Tạo đề bài với 1 đáp án đúng và 3 đáp án nhiễu KHÔNG TRÙNG LẶP
    drawPool.forEach(word => {
        // Lọc ra tập hợp các từ nhiễu tiềm năng (Loại trừ từ hiện tại)
        let potentialDistractors = vocabPool.filter(w => w.hanzi !== word.hanzi);
        shuffleArray(potentialDistractors);
        
        let options = [word];
        let usedMeanings = new Set();
        usedMeanings.add(word.meaning);

        // Bốc chính xác 3 từ nhiễu không trùng nghĩa với nhau và không trùng nghĩa với đáp án
        for (let distractor of potentialDistractors) {
            if (options.length >= 4) break;
            if (!usedMeanings.has(distractor.meaning)) {
                options.push(distractor);
                usedMeanings.add(distractor.meaning);
            }
        }

        // Xáo trộn 4 đáp án (Fisher-Yates)
        shuffleArray(options);

        // Cố định vị trí của đáp án đúng SAU KHI ĐÃ XÁO TRỘN
        let ansIdx = options.findIndex(opt => opt.hanzi === word.hanzi);
        
        activeQuestions.push({
            q: word.hanzi,
            pinyin: word.pinyin,
            fullWord: word,
            options: options.map(opt => opt.meaning), // Đảm bảo index mảng options khớp với ansIdx
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
        
        // 1. Ghi nhận từ vựng vĩnh viễn (Chỉ khai báo isA1 duy nhất 1 lần ở đây)
        const isA1 = window.currentCsvFile.includes("a1");
        if (isA1) {
            if (!window.masteredWordsA1.includes(qData.q)) window.masteredWordsA1.push(qData.q);
        } else {
            if (!window.masteredWordsB1.includes(qData.q)) window.masteredWordsB1.push(qData.q);
        }

        // 2. Thưởng Linh Thạch theo Quyển & Cảnh Giới
        const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân" };
        const major = realmData.major;
        
        let bonusLT = 0;
        let warningMsg = "";

        if (isA1) {
            // Học Hạ Quyển
            if (major === "Kim Đan Kỳ" || major === "Nguyên Anh Kỳ") {
                bonusLT = 0;
                warningMsg = "<br><span style='color:#f59e0b;'>⚠️ Đạo tâm quá cao! Đọc sách vỡ lòng không thu được Linh Thạch.</span>";
            } else {
                bonusLT = 1;
            }
        } else {
            // Học Trung Quyển
            if (major === "Phàm Nhân" || major === "Luyện Khí Kỳ" || major === "Trúc Cơ Kỳ") {
                bonusLT = 0;
                warningMsg = "<br><span style='color:#ef4444;'>⚠️ Cảnh giới chưa đủ! Ép học Trung Quyển không thu được Linh Thạch.</span>";
            } else {
                bonusLT = 2; // Nhận 2 viên cho Trung Quyển
            }
        }
        
        // Hiệu ứng Tụ Linh Đan (X2 Linh Thạch)
        let buffMsg = "";
        if (bonusLT > 0 && window.tuLinhBuff && window.tuLinhBuff > 0) {
            bonusLT *= 2;
            window.tuLinhBuff--;
            buffMsg = `<br><span style='color:#c084fc;'>✨ Tụ Linh Đan kích hoạt! x2 Linh Thạch (Còn ${window.tuLinhBuff} câu)</span>`;
        } else if (window.tuLinhBuff && window.tuLinhBuff > 0) {
            window.tuLinhBuff--; // Vẫn trừ số lần buff dù không nhận được tiền
        }

        if (bonusLT > 0) {
            if (window.updateLinhThach) window.updateLinhThach(bonusLT);
        }

        // 3. Hồi lượng nhỏ HP khi trả lời đúng
        window.currentHp = Math.min(window.maxHp || 100, (window.currentHp || 100) + 2);

        let rewardText = bonusLT > 0 ? `Nhận được ${bonusLT} 💎.` : `Không nhận được Linh Thạch.`;
        msgDiv.innerHTML = `<span style='color:#22d3ee;'>✅ Đốn Ngộ! ${rewardText}</span>${warningMsg}${buffMsg}`;
        window.updateQuizHUD();
        if (window.syncManaToDatabase) window.syncManaToDatabase();
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
