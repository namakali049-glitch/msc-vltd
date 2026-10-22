// ==========================================
// HỆ THỐNG CẢNH GIỚI & ĐỘT PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.highestAchievedRank = "Phàm Nhân";

// 1. Hàm tính toán chỉ số Cảnh Giới tổng hợp (Nguồn chân lý duy nhất)
window.getRealmData = function(mana, customA1 = null, customB1 = null) {
    const listA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1 : [];
    const listB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1 : [];
    
    // Nếu có truyền số lượng (từ Leaderboard) thì dùng, không thì lấy của bản thân
    const countA1 = customA1 !== null ? customA1 : listA1.length;
    const countB1 = customB1 !== null ? customB1 : listB1.length;

    if (mana < 150) return { rank: "Phàm Nhân", major: "Phàm Nhân", hp: 100, thanThuc: 0, swords: 0 };
    if (mana < 400) return { rank: "Luyện Khí Sơ Kỳ", major: "Luyện Khí Kỳ", hp: 250, thanThuc: 100, swords: 1 };
    if (mana < 800) return { rank: "Luyện Khí Trung Kỳ", major: "Luyện Khí Kỳ", hp: 400, thanThuc: 200, swords: 2 };
    if (mana < 1500) return { rank: "Luyện Khí Hậu Kỳ", major: "Luyện Khí Kỳ", hp: 550, thanThuc: 300, swords: 3 };
    if (mana < 2500) return { rank: "Trúc Cơ Sơ Kỳ", major: "Trúc Cơ Kỳ", hp: 700, thanThuc: 400, swords: 3 };
    if (mana < 4000) return { rank: "Trúc Cơ Trung Kỳ", major: "Trúc Cơ Kỳ", hp: 850, thanThuc: 500, swords: 4 };
    
    // NGUYÊN TẮC BÌNH CẢNH TRÚC CƠ: Bắt buộc >= 600 từ A1
    if (mana < 8000 || countA1 < 600) {
        let isBottleneck = (mana >= 8000 && countA1 < 600);
        return { 
            rank: isBottleneck ? "Trúc Cơ Hậu Kỳ (Bình Cảnh)" : "Trúc Cơ Hậu Kỳ", 
            major: "Trúc Cơ Kỳ", 
            hp: 1000, 
            thanThuc: 600, 
            swords: 5 
        };
    }
    
    if (mana < 15000) return { rank: "Kim Đan Sơ Kỳ", major: "Kim Đan Kỳ", hp: 2000, thanThuc: 800, swords: 5 };
    if (mana < 20000) return { rank: "Kim Đan Trung Kỳ", major: "Kim Đan Kỳ", hp: 2500, thanThuc: 1000, swords: 5 };
    
    // NGUYÊN TẮC BÌNH CẢNH KIM ĐAN: Bắt buộc >= 2667 từ B1
    if (mana < 25000 || countB1 < 2667) {
        let isBottleneck = (mana >= 25000 && countB1 < 2667);
        return { 
            rank: isBottleneck ? "Kim Đan Hậu Kỳ (Bình Cảnh)" : "Kim Đan Hậu Kỳ", 
            major: "Kim Đan Kỳ", 
            hp: 3000, 
            thanThuc: 1200, 
            swords: 5 
        };
    }
    
    return { rank: "Nguyên Anh Chân Quân", major: "Nguyên Anh Kỳ", hp: 8000, thanThuc: 3000, swords: 5 };
};

// 2. Hàm lấy chuỗi tên Cảnh Giới (Tái sử dụng hàm trên)
window.calculateRealm = function(mana, countA1 = null, countB1 = null) {
    return window.getRealmData(mana, countA1, countB1).rank;
};
