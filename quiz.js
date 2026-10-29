// ==========================================
// ĐỘNG CƠ BẾ QUAN KHAI PHÁ (MÔ-ĐUN ĐỘC LẬP) - BẢN HOÀN THIỆN
// Tích hợp: Endless Mode, Smart Shuffle, Thượng Quyển
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

// 1. CHỌN QUYỂN & CẢNH BÁO THIÊN ĐẠO
window.checkAndStartVolume = function(vol) {
    if (window.playClickSound) window.playClickSound();

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    const major = realmData.major;
    
    if (vol === 'thuong_quyen') {
        if (["Phàm Nhân", "Luyện Khí Kỳ", "Trúc Cơ Kỳ", "Kim Đan Kỳ", "Nguyên Anh Kỳ"].includes(major)) {
            alert("⚠️ CẢNH BÁO THIÊN ĐẠO:\nCảnh giới hiện tại quá thấp để lĩnh ngộ Thượng Quyển. Đạo hữu vẫn có thể xem để mở mang kiến thức, nhưng sẽ KHÔNG thu được Linh Thạch!");
        }
        window.currentCsvFile = "c1_vocab.csv";
    } 
    else if (vol === 'trung_quyen') {
        window.currentCsvFile = "b1_vocab.csv";
    } 
    else {
        if (["Kim Đan Kỳ", "Nguyên Anh Kỳ", "Hóa Thần Kỳ", "Độ Kiếp Kỳ"].includes(major)) {
            alert("⚠️ CẢNH BÁO THIÊN ĐẠO:\nĐạo hữu đã đạt cảnh giới cao. Tiếp tục tu luyện Hạ Quyển sẽ không thu được Linh Thạch!");
        }
        window.currentCsvFile = "a1_vocab.csv";
    }
    
    const hanNguModal = document.getElementById('hanNguModal');
    if (hanNguModal) hanNguModal.style.display = 'none';
    
// HỆ THỐNG POPUP CƠ DUYÊN (CHỐNG CHẶN QUẢNG CÁO)
window.showCoDuyenPopup = function(title, desc, onAccept, onSkip) {
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
    overlay.innerHTML = `
        <div style="background:#0f172a;border:2px solid #eab308;border-radius:12px;padding:24px;max-width:320px;width:100%;text-align:center;box-shadow:0 0 25px rgba(234,179,8,0.4);color:#fff;">
            <h3 style="color:#facc15;margin:0 0 10px 0;font-size:18px;">🎬 ${title}</h3>
            <p style="font-size:13px;color:#cbd5e1;line-height:1.5;margin-bottom:16px;white-space:pre-line;">${desc}</p>
            <div id="coduyen-timer-box" style="display:none;font-size:32px;font-weight:bold;margin:12px 0;color:#38bdf8;">6s</div>
            <div id="coduyen-actions" style="display:flex;flex-direction:column;gap:10px;">
                <button id="btn-trigger-coduyen" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;">🚀 Khám Phá Cơ Duyên</button>
                <button id="btn-dismiss-coduyen" style="background:#334155;color:#94a3b8;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;">Bỏ Qua (Không xem)</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-dismiss-coduyen').onclick = () => {
        overlay.remove();
        if (onSkip) onSkip();
    };

    document.getElementById('btn-trigger-coduyen').onclick = () => {
        window.open("https://uplcm.com/4/12128333", '_blank');
        document.getElementById('btn-trigger-coduyen').style.display = 'none';
        document.getElementById('btn-dismiss-coduyen').style.display = 'none';
        
        const timerBox = document.getElementById('coduyen-timer-box');
        timerBox.style.display = 'block';
        let timeLeft = 6;
        
        const timer = setInterval(() => {
            timeLeft--;
            timerBox.innerText = timeLeft + "s";
            if (timeLeft <= 0) {
                clearInterval(timer);
                document.getElementById('coduyen-actions').innerHTML = `<button id="btn-finish-coduyen" style="background:#22c55e;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;width:100%;">✨ Lĩnh Thưởng & Tiếp Tục</button>`;
                document.getElementById('btn-finish-coduyen').onclick = () => {
                    overlay.remove();
                    if (onAccept) onAccept();
                };
            }
        }, 1000);
    };
};

// 1. CHỌN QUYỂN & CẢNH BÁO THIÊN ĐẠO
window.checkAndStartVolume = function(vol) {
    if (window.playClickSound) window.playClickSound();

    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0, countA1, countB1) : { major: "Phàm Nhân" };
    const major = realmData.major;
    
    let isEligible = true; // Biến kiểm tra đủ điều kiện nhận Linh Thạch

    if (vol === 'thuong_quyen') {
        if (["Phàm Nhân", "Luyện Khí Kỳ", "Trúc Cơ Kỳ", "Kim Đan Kỳ", "Nguyên Anh Kỳ"].includes(major)) {
            alert("⚠️ CẢNH BÁO THIÊN ĐẠO:\nCảnh giới hiện tại quá thấp để lĩnh ngộ Thượng Quyển. Đạo hữu vẫn có thể xem để mở mang kiến thức, nhưng sẽ KHÔNG thu được Linh Thạch!");
            isEligible = false;
        }
        window.currentCsvFile = "c1_vocab.csv";
    } 
    else if (vol === 'trung_quyen') {
        if (["Phàm Nhân", "Luyện Khí Kỳ", "Trúc Cơ Kỳ", "Hóa Thần Kỳ", "Độ Kiếp Kỳ"].includes(major)) {
            isEligible = false; // Phàm nhân/Trúc Cơ quá yếu hoặc Hóa thần quá mạnh -> Không nhận thưởng
        }
        window.currentCsvFile = "b1_vocab.csv";
    } 
    else {
        if (["Kim Đan Kỳ", "Nguyên Anh Kỳ", "Hóa Thần Kỳ", "Độ Kiếp Kỳ"].includes(major)) {
            alert("⚠️ CẢNH BÁO THIÊN ĐẠO:\nĐạo hữu đã đạt cảnh giới cao. Tiếp tục tu luyện Hạ Quyển sẽ không thu được Linh Thạch!");
            isEligible = false;
        }
        window.currentCsvFile = "a1_vocab.csv";
    }
    
    const hanNguModal = document.getElementById('hanNguModal');
    if (hanNguModal) hanNguModal.style.display = 'none';

    // NẾU ĐỦ ĐIỀU KIỆN NHẬN THƯỞNG -> HIỆN BẢNG HỎI
    if (isEligible && window.showCoDuyenPopup) {
        window.showCoDuyenPopup(
            "THIÊN ĐẠO CHIẾU CƠ",
            "Đạo hữu đủ điều kiện nhận Linh Thạch trong Tàng Kinh Các.\nCó muốn quan sát thiên cơ để nhận [Tụ Linh Phù] (x2 Linh Thạch trong 20 câu) không?",
            () => { // Bấm Chấp nhận
                window.tuLinhBuff = (window.tuLinhBuff || 0) + 20;
                alert("✨ Thiên Đạo Ban Phước!\n\nĐạo hữu nhận được trạng thái [Tụ Linh]: x2 Linh Thạch thu được trong 20 câu tiếp theo.");
                window.startGame();
            },
            () => { // Bấm Bỏ qua
                window.startGame();
            }
        );
    } else {
        window.startGame(); // Chơi luôn không hỏi
    }
};
// 2. KHỞI CHẠY BẾ QUAN (ENDLESS MODE)
window.startGame = function() {
    window.switchScreen('game-screen');
    currentQuestionIndex = 0;
    wrongCount = 0;
    window.sessionMana = 0;
    sessionSeconds = 0;
    window.totalQuizAnswered = 0; // Bộ đếm tổng số câu vô tận

    document.getElementById('message').innerHTML = "Đang kết nối thần thức vào Tàng Kinh Các...";
    document.getElementById('options').innerHTML = "";
    document.getElementById('nextBtn').style.display = "none";

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

    window.updateQuizHUD();

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

// 3. THUẬT TOÁN RÚT THẺ THÔNG MINH (CHỐNG TRÙNG LẶP & SAI VỊ TRÍ)
function processVocabData() {
    let masteredList = [];
    if (window.currentCsvFile.includes("a1")) {
        masteredList = window.masteredWordsA1 || [];
    } else if (window.currentCsvFile.includes("b1")) {
        masteredList = window.masteredWordsB1 || [];
    } else {
        masteredList = window.masteredWordsC1 || []; // Thượng quyển
    }

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
        let potentialDistractors = vocabPool.filter(w => w.hanzi !== word.hanzi);
        shuffleArray(potentialDistractors);
        
        let options = [word];
        let usedMeanings = new Set();
        usedMeanings.add(word.meaning);

        for (let distractor of potentialDistractors) {
            if (options.length >= 4) break;
            if (!usedMeanings.has(distractor.meaning)) {
                options.push(distractor);
                usedMeanings.add(distractor.meaning);
            }
        }

        shuffleArray(options);

        // Cố định vị trí của đáp án đúng SAU KHI ĐÃ XÁO TRỘN
        let ansIdx = options.findIndex(opt => opt.hanzi === word.hanzi);
        
        activeQuestions.push({
            q: word.hanzi,
            pinyin: word.pinyin,
            fullWord: word,
            options: options.map(opt => opt.meaning),
            ans: ansIdx
        });
    });

    if (activeQuestions.length > 0) {
        currentQuestionIndex = 0; // Đặt lại index mỗi đợt 10 câu
        showQuestion();
    } else {
        document.getElementById('message').innerHTML = "Đã tu luyện trọn vẹn bổn kinh thư này!";
        stopCultivationEarly();
    }
}

// 4. HIỂN THỊ CÂU HỎI
function showQuestion() {
    const qData = activeQuestions[currentQuestionIndex];
    // Hiển thị vô tận
    document.getElementById('counter').innerText = `Tu luyện: Câu thứ ${window.totalQuizAnswered + 1}`;
    
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
        
        // Ghi nhận từ vựng vĩnh viễn
        if (window.currentCsvFile.includes("a1")) {
            if (!window.masteredWordsA1.includes(qData.q)) window.masteredWordsA1.push(qData.q);
        } else if (window.currentCsvFile.includes("b1")) {
            if (!window.masteredWordsB1.includes(qData.q)) window.masteredWordsB1.push(qData.q);
        } else {
            if (!window.masteredWordsC1) window.masteredWordsC1 = [];
            if (!window.masteredWordsC1.includes(qData.q)) window.masteredWordsC1.push(qData.q);
        }

        const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân" };
        const major = realmData.major;
        
        let bonusLT = 0;
        let warningMsg = "";

        // ----- QUY LUẬT THIÊN ĐẠO THƯỞNG PHẠT -----
        if (window.currentCsvFile.includes("a1")) { 
            if (["Kim Đan Kỳ", "Nguyên Anh Kỳ", "Hóa Thần Kỳ", "Độ Kiếp Kỳ"].includes(major)) {
                bonusLT = 0;
                warningMsg = "<br><span style='color:#f59e0b;'>⚠️ Đạo tâm quá cao! Đọc sách vỡ lòng không thu được Linh Thạch.</span>";
            } else {
                bonusLT = 1;
            }
        } 
        else if (window.currentCsvFile.includes("b1")) { 
            if (["Phàm Nhân", "Luyện Khí Kỳ", "Trúc Cơ Kỳ"].includes(major)) {
                bonusLT = 0;
                warningMsg = "<br><span style='color:#ef4444;'>⚠️ Cảnh giới chưa đủ! Ép học Trung Quyển không thu được Linh Thạch.</span>";
            } else if (["Hóa Thần Kỳ", "Độ Kiếp Kỳ"].includes(major)) {
                bonusLT = 0;
                warningMsg = "<br><span style='color:#f59e0b;'>⚠️ Đạo tâm quá cao! Học Trung Quyển không còn thu được Linh Thạch.</span>";
            } else {
                bonusLT = 2;
            }
        } 
        else { 
            if (["Hóa Thần Kỳ", "Độ Kiếp Kỳ"].includes(major)) {
                bonusLT = 3; 
            } else {
                bonusLT = 0;
                warningMsg = "<br><span style='color:#ef4444;'>⚠️ Tu vi chưa tới Hóa Thần! Xem Thượng Quyển không ngộ ra được Linh Thạch.</span>";
            }
        }
        
        // Hiệu ứng Tụ Linh Đan
        let buffMsg = "";
        if (bonusLT > 0 && window.tuLinhBuff && window.tuLinhBuff > 0) {
            bonusLT *= 2;
            window.tuLinhBuff--;
            buffMsg = `<br><span style='color:#c084fc;'>✨ Tụ Linh Đan kích hoạt! x2 Linh Thạch (Còn ${window.tuLinhBuff} câu)</span>`;
        } else if (window.tuLinhBuff && window.tuLinhBuff > 0) {
            window.tuLinhBuff--; 
        }

        if (bonusLT > 0) {
            if (window.updateLinhThach) window.updateLinhThach(bonusLT);
        }

        // Hồi lượng nhỏ HP khi trả lời đúng
        window.currentHp = Math.min(window.maxHp || 100, (window.currentHp || 100) + 2);

        let rewardText = bonusLT > 0 ? `Nhận được ${bonusLT} 💎.` : `Không nhận được Linh Thạch.`;
        msgDiv.innerHTML = `<span style='color:#22d3ee;'>✅ Đốn Ngộ! ${rewardText}</span>${warningMsg}${buffMsg}`;
        window.updateQuizHUD();
        if (window.syncManaToDatabase) window.syncManaToDatabase();
    } else {
        // Trả lời sai - Phạt Tâm Ma Phản Phệ
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
                dmg = Math.ceil((window.maxLinhLuc || 10) / 3);
                window.currentLinhLuc = Math.max(0, (window.currentLinhLuc || 0) - dmg);
                statName = "Linh Lực";
            }

            msgDiv.innerHTML = `💥 <span style='color:#ef4444;'>Tâm Ma Xâm Nhập! Tổn thất ${dmg} ${statName}.</span>`;
            window.updateQuizHUD();

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

// 6. CHUYỂN CÂU HỎI (CHUỖI VÔ TẬN)
window.nextQuestion = function() {
    if (window.playClickSound) window.playClickSound();
    
    currentQuestionIndex++;
    window.totalQuizAnswered++; 

    if (currentQuestionIndex < activeQuestions.length) {
        showQuestion();
    } else {
        // Tự động load đợt tiếp theo thay vì thoát
        document.getElementById('message').innerHTML = "🌟 <span style='color:#ffd700;'>Đang ngưng tụ thêm bích họa...</span>";
        document.getElementById('options').innerHTML = "";
        document.getElementById('nextBtn').style.display = "none";
        
        setTimeout(() => {
            processVocabData(); 
        }, 500);
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
