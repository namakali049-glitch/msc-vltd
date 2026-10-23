// ==========================================
// HỆ THỐNG CẢNH GIỚI & ĐỘT PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.highestAchievedRank = "Phàm Nhân";

// 1. Hàm tính toán chỉ số Cảnh Giới tổng hợp (Nguồn chân lý duy nhất)
window.getRealmData = function(mana, customA1 = null, customB1 = null) {
    const listA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1 : [];
    const listB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1 : [];
    
    // Ép kiểu Number an toàn tuyệt đối, nếu không hợp lệ sẽ về 0
    let countA1 = customA1 !== null ? Number(customA1) : listA1.length;
    if (isNaN(countA1)) countA1 = 0;

    let countB1 = customB1 !== null ? Number(customB1) : listB1.length;
    if (isNaN(countB1)) countB1 = 0;

    if (mana < 150) return { rank: "Phàm Nhân", major: "Phàm Nhân", swords: 0 };
    if (mana < 400) return { rank: "Luyện Khí Sơ Kỳ", major: "Luyện Khí Kỳ", swords: 1 };
    if (mana < 800) return { rank: "Luyện Khí Trung Kỳ", major: "Luyện Khí Kỳ", swords: 2 };
    if (mana < 1500) return { rank: "Luyện Khí Hậu Kỳ", major: "Luyện Khí Kỳ", swords: 3 };
    if (mana < 2500) return { rank: "Trúc Cơ Sơ Kỳ", major: "Trúc Cơ Kỳ", swords: 3 };
    if (mana < 4000) return { rank: "Trúc Cơ Trung Kỳ", major: "Trúc Cơ Kỳ", swords: 4 };
    
    // BẮT BUỘC >= 600 TỪ A1: Dù có 1.000.000 Linh Lực vẫn bị giam ở Trúc Cơ (Bình Cảnh)
    if (mana < 8000 || countA1 < 600) {
        let isBottleneck = (mana >= 8000 && countA1 < 600);
        return { 
            rank: isBottleneck ? "Trúc Cơ (Bình Cảnh)" : "Trúc Cơ Hậu Kỳ", 
            major: "Trúc Cơ Kỳ", 
            swords: 5 
        };
    }
    
    if (mana < 15000) return { rank: "Kim Đan Sơ Kỳ", major: "Kim Đan Kỳ", swords: 5 };
    if (mana < 20000) return { rank: "Kim Đan Trung Kỳ", major: "Kim Đan Kỳ", swords: 5 };
    
    // BẮT BUỘC >= 2667 TỪ B1: Chưa đủ từ thì vĩnh viễn không thể xưng Nguyên Anh
    if (mana < 25000 || countB1 < 2667) {
        let isBottleneck = (mana >= 25000 && countB1 < 2667);
        return { 
            rank: isBottleneck ? "Kim Đan (Bình Cảnh)" : "Kim Đan Hậu Kỳ", 
            major: "Kim Đan Kỳ", 
            swords: 5 
        };
    }
    
    return { rank: "Nguyên Anh Chân Quân", major: "Nguyên Anh Kỳ", swords: 5 };
};

// 1. Danh mục phần thưởng Điểm Tiềm Năng các tiểu cảnh giới
window.MINOR_REALM_REWARDS = [
    { id: "LK_1", name: "Luyện Khí Sơ Kỳ", mana: 150, points: 10 },
    { id: "LK_2", name: "Luyện Khí Trung Kỳ", mana: 400, points: 10 },
    { id: "LK_3", name: "Luyện Khí Hậu Kỳ", mana: 800, points: 10 },
    { id: "TC_1", name: "Trúc Cơ Sơ Kỳ", mana: 1500, points: 15 },
    { id: "TC_2", name: "Trúc Cơ Trung Kỳ", mana: 2500, points: 15 },
    { id: "TC_3", name: "Trúc Cơ Hậu Kỳ", mana: 4000, points: 15 },
    { id: "KD_1", name: "Kim Đan Sơ Kỳ", mana: 8000, points: 25 },
    { id: "KD_2", name: "Kim Đan Trung Kỳ", mana: 15000, points: 25 },
    { id: "KD_3", name: "Kim Đan Hậu Kỳ", mana: 20000, points: 25 },
    { id: "NA_1", name: "Nguyên Anh Chân Quân", mana: 25000, points: 35 }
];

// 2. Thuật toán ngự kiếm theo Thần Thức: 1 + floor((Thần Thức - 100) / 50)
window.getSwordCount = function(thanThuc) {
    if (!thanThuc || thanThuc < 100) return 0;
    const calculated = 1 + Math.floor((thanThuc - 100) / 50);
    return Math.min(5, calculated);
};

// 3. Tiến hóa ngoại trang Avatar theo mốc Linh Lực (Đồng bộ 100% với Bí Cảnh)
window.getAvatarByMana = function(mana) {
    if (mana < 150) return "assets/pham-nhan.png"; // Yêu cầu có file pham-nhan.png dạng pixel
    if (mana < 1500) return "assets/luyen-khi.png";
    if (mana < 2500) return "assets/truc-co.png";
    if (mana < 4000) return "assets/truc-co-trung-ky.png";
    return "assets/truc-co-vien-man.png";
};

// 4. Kích hoạt Modal Thiên Đạo Chúc Phúc khi vượt đại cảnh giới
window.checkAndTriggerBreakthrough = function(oldMana, newMana) {
    const oldRealm = window.getRealmData(oldMana);
    const newRealm = window.getRealmData(newMana);
    if (newRealm.major !== oldRealm.major && newRealm.major !== "Phàm Nhân") {
        const modal = document.getElementById('breakthroughModal');
        const realmEl = document.getElementById('breakthroughRealm');
        const descEl = document.getElementById('breakthroughDesc');
        const bonusEl = document.getElementById('breakthroughBonus');
        if (modal && realmEl) {
            realmEl.innerText = newRealm.rank;
            if (descEl) descEl.innerText = `Chúc mừng đạo hữu phá vỡ gông cùm, đăng lâm ${newRealm.major}!`;
            if (bonusEl) bonusEl.innerText = `Sinh Mệnh cơ bản: ${newRealm.hp} | Thần Thức cơ bản: ${newRealm.thanThuc}`;
            modal.style.display = 'flex';
            if (window.playLootSound) window.playLootSound();
        }
    }
};
// 2. Hàm lấy chuỗi tên Cảnh Giới (Tái sử dụng hàm trên)
window.calculateRealm = function(mana, countA1 = null, countB1 = null) {
    return window.getRealmData(mana, countA1, countB1).rank;
};
