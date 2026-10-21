// ==========================================
// HỆ THỐNG CẢNH GIỚI & ĐỘT PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.highestAchievedRank = "Phàm Nhân";

function getRealmData(mana, customA1Count = null, customB1Count = null) {
    const m = Number(mana) || 0;

    // Lấy số từ vựng của người chơi cụ thể, nếu không có thì lấy của người đang xem
    const countA1 = customA1Count !== null 
        ? customA1Count 
        : ((window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0);
    const countB1 = customB1Count !== null 
        ? customB1Count 
        : ((window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0);

    if (m < 150) {
        return { rank: "Phàm Nhân", major: "Phàm Nhân", hp: 100, thanThuc: 0, swords: 0 };
    }
    if (m < 400) {
        return { rank: "Luyện Khí Sơ Kỳ", major: "Luyện Khí", hp: 250, thanThuc: 100, swords: 1 };
    }
    if (m < 800) {
        return { rank: "Luyện Khí Trung Kỳ", major: "Luyện Khí", hp: 400, thanThuc: 200, swords: 2 };
    }
    if (m < 1500) {
        return { rank: "Luyện Khí Hậu Kỳ", major: "Luyện Khí", hp: 550, thanThuc: 300, swords: 3 };
    }
    if (m < 2500) {
        return { rank: "Trúc Cơ Sơ Kỳ", major: "Trúc Cơ", hp: 700, thanThuc: 400, swords: 3 };
    }
    if (m < 4000) {
        return { rank: "Trúc Cơ Trung Kỳ", major: "Trúc Cơ", hp: 850, thanThuc: 500, swords: 4 };
    }
    if (m < 8000 || countA1 < 600) {
        let isBottleneck = (m >= 8000 && countA1 < 600);
        return { 
            rank: isBottleneck ? "Trúc Cơ Hậu Kỳ (Bình Cảnh)" : "Trúc Cơ Hậu Kỳ", 
            major: "Trúc Cơ", 
            hp: 1000, 
            thanThuc: 600, 
            swords: 5 
        };
    }
    if (m < 15000) {
        return { rank: "Kim Đan Sơ Kỳ", major: "Kim Đan", hp: 2000, thanThuc: 800, swords: 5 };
    }
    if (m < 20000) {
        return { rank: "Kim Đan Trung Kỳ", major: "Kim Đan", hp: 2500, thanThuc: 1000, swords: 5 };
    }
    if (m < 25000 || countB1 < 2667) {
        let isBottleneck = (m >= 25000 && countB1 < 2667);
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

function calculateRealm(mana, customA1Count = null, customB1Count = null) {
    return getRealmData(mana, customA1Count, customB1Count).rank;
}

window.getRealmData = getRealmData;
window.calculateRealm = calculateRealm;
