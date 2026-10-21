// ==========================================
// HỆ THỐNG CẢNH GIỚI & ĐỘT PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.highestAchievedRank = "Phàm Nhân";

function getRealmData(mana) {
    const listA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) 
        ? window.masteredWordsA1 
        : ((typeof masteredWordsA1 !== 'undefined' && Array.isArray(masteredWordsA1)) ? masteredWordsA1 : []);
    const listB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) 
        ? window.masteredWordsB1 
        : ((typeof masteredWordsB1 !== 'undefined' && Array.isArray(masteredWordsB1)) ? masteredWordsB1 : []);
    const countA1 = listA1.length;
    const countB1 = listB1.length;

    if (mana < 150) {
        return { rank: "Phàm Nhân", major: "Phàm Nhân", hp: 100, thanThuc: 0, swords: 0 };
    }
    if (mana < 400) {
        return { rank: "Luyện Khí Sơ Kỳ", major: "Luyện Khí", hp: 250, thanThuc: 100, swords: 1 };
    }
    if (mana < 800) {
        return { rank: "Luyện Khí Trung Kỳ", major: "Luyện Khí", hp: 400, thanThuc: 200, swords: 2 };
    }
    if (mana < 1500) {
        return { rank: "Luyện Khí Hậu Kỳ", major: "Luyện Khí", hp: 550, thanThuc: 300, swords: 3 };
    }
    if (mana < 2500) {
        return { rank: "Trúc Cơ Sơ Kỳ", major: "Trúc Cơ", hp: 700, thanThuc: 400, swords: 3 };
    }
    if (mana < 4000) {
        return { rank: "Trúc Cơ Trung Kỳ", major: "Trúc Cơ", hp: 850, thanThuc: 500, swords: 4 };
    }
    if (mana < 8000 || countA1 < 600) {
        let isBottleneck = (mana >= 8000 && countA1 < 600);
        return { 
            rank: isBottleneck ? "Trúc Cơ Hậu Kỳ (Bình Cảnh)" : "Trúc Cơ Hậu Kỳ", 
            major: "Trúc Cơ", 
            hp: 1000, 
            thanThuc: 600, 
            swords: 5 
        };
    }
    if (mana < 15000) {
        return { rank: "Kim Đan Sơ Kỳ", major: "Kim Đan", hp: 2000, thanThuc: 800, swords: 5 };
    }
    if (mana < 20000) {
        return { rank: "Kim Đan Trung Kỳ", major: "Kim Đan", hp: 2500, thanThuc: 1000, swords: 5 };
    }
    if (mana < 25000 || countB1 < 2667) {
        let isBottleneck = (mana >= 25000 && countB1 < 2667);
        return { 
            rank: isBottleneck ? "Kim Đan Hậu Kỳ (Bình Cảnh)" : "Kim Đan Hậu Kỳ", 
            major: "Kim Đan", 
            hp: 3000, 
            thanThuc: 1200, 
            swords: 5 
        };
    }
    return { rank: "Nguyên Anh Chân Quân", major: "Nguyên Anh", hp: 8000, thanThuc: 3000, swords: 5 };
}

function calculateRealm(mana) {
    return getRealmData(mana).rank;
}

function getSwordCount(sense) {
    if (sense < 100) return 0;
    return 1 + Math.floor((sense - 100) / 50);
}

const MINOR_REALM_REWARDS = [
    { id: "LK_1", mana: 150, points: 10, name: "Luyện Khí Sơ Kỳ" },
    { id: "LK_2", mana: 400, points: 10, name: "Luyện Khí Trung Kỳ" },
    { id: "LK_3", mana: 800, points: 10, name: "Luyện Khí Hậu Kỳ" },
    { id: "TC_1", mana: 1500, points: 15, name: "Trúc Cơ Sơ Kỳ" },
    { id: "TC_2", mana: 2500, points: 15, name: "Trúc Cơ Trung Kỳ" },
    { id: "TC_3", mana: 4000, points: 15, name: "Trúc Cơ Hậu Kỳ" },
    { id: "KD_1", mana: 8000, points: 25, name: "Kim Đan Sơ Kỳ" },
    { id: "KD_2", mana: 15000, points: 25, name: "Kim Đan Trung Kỳ" },
    { id: "KD_3", mana: 20000, points: 25, name: "Kim Đan Hậu Kỳ" },
    { id: "NA_1", mana: 25000, points: 35, name: "Nguyên Anh Sơ Kỳ" },
    { id: "NA_2", mana: 35000, points: 35, name: "Nguyên Anh Trung Kỳ" },
    { id: "NA_3", mana: 50000, points: 35, name: "Nguyên Anh Hậu Kỳ" }
];

function getAvatarByMana(mana) {
    if (mana < 150) return "assets/pham-nhan.jpg";
    if (mana < 1500) return "assets/luyen-khi.jpg";
    if (mana < 2500) return "assets/truc-co.jpg";
    if (mana < 4000) return "assets/truc-co-trung-ky.png";
    return "assets/truc-co-vien-man.png";
}

const BREAKTHROUGH_NOTICES = {
    "Luyện Khí": {
        title: "Chúc mừng đạo hữu đột phá Luyện Khí kỳ!",
        desc: "Tu sĩ dẫn xuất thiên địa linh khí tẩm bổ tự thân kỳ kinh bát mạch.",
        bonus: "⚔️ Tối đa điều khiển: 3 Thanh Phi Kiếm"
    },
    "Trúc Cơ": {
        title: "Chúc mừng đạo hữu đột phá Trúc Cơ kỳ!",
        desc: "Dùng linh khí đả thông toàn bộ kinh mạch tiến hành đúc lại căn cơ.",
        bonus: "⚔️ Tối đa điều khiển: 5 Thanh Phi Kiếm (Mở khóa kiếm khí thanh sắc)"
    },
    "Kim Đan": {
        title: "Chúc mừng đạo hữu đột phá Kim Đan cảnh!",
        desc: "Lĩnh ngộ 2/3 khẩu quyết Hạ Quyển, kết thành kim đan viên mãn!",
        bonus: "⚔️ Uy áp Chân Nhân: Mở khóa điển tịch Trung Quyển B1"
    },
    "Nguyên Anh": {
        title: "Chúc mừng đạo hữu phá đan thành anh, chứng đạo Chân Quân!",
        desc: "Tham ngộ 2/3 điển tịch Trung Quyển, hóa đan thành anh!",
        bonus: "🌌 Pháp tướng thông thiên: Thần thông đại thành!"
    }
};

function checkAndTriggerBreakthrough(manaInput) {
    const mana = (typeof manaInput === 'number') 
        ? manaInput 
        : (typeof lifetimeMana !== 'undefined' ? lifetimeMana : (window.lifetimeMana || 0));
    const currentData = getRealmData(mana);
    const majorRank = currentData.major;

    const rankTiers = ["Phàm Nhân", "Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh"];
    const currentRank = window.highestAchievedRank || "Phàm Nhân";
    const oldTierIndex = rankTiers.indexOf(currentRank);
    const newTierIndex = rankTiers.indexOf(majorRank);

    if (newTierIndex > oldTierIndex && BREAKTHROUGH_NOTICES[majorRank]) {
        window.highestAchievedRank = majorRank;
        const info = BREAKTHROUGH_NOTICES[majorRank];

        const titleEl = document.getElementById('breakthroughTitle');
        const realmEl = document.getElementById('breakthroughRealm');
        const descEl = document.getElementById('breakthroughDesc');
        const bonusEl = document.getElementById('breakthroughBonus');
        const modal = document.getElementById('breakthroughModal');

        if (titleEl) titleEl.innerText = info.title;
        if (realmEl) realmEl.innerText = currentData.rank;
        if (descEl) descEl.innerText = info.desc;
        if (bonusEl) bonusEl.innerHTML = info.bonus;
        if (modal) modal.style.display = 'flex';
    }
}

window.closeBreakthroughModal = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('breakthroughModal');
    if (modal) modal.style.display = 'none';
};

// Đăng ký toàn bộ ra phạm vi window để app.js và HTML gọi an toàn
window.getRealmData = getRealmData;
window.calculateRealm = calculateRealm;
window.getSwordCount = getSwordCount;
window.MINOR_REALM_REWARDS = MINOR_REALM_REWARDS;
window.getAvatarByMana = getAvatarByMana;
window.BREAKTHROUGH_NOTICES = BREAKTHROUGH_NOTICES;
window.checkAndTriggerBreakthrough = checkAndTriggerBreakthrough;
