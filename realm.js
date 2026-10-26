// ==========================================
// HỆ THỐNG CẢNH GIỚI & ĐỘT PHÁ (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.highestAchievedRank = "Phàm Nhân";

// 1. Nguồn chân lý duy nhất tính toán Cảnh Giới
window.getRealmData = function(mana, customA1 = null, customB1 = null) {
    const listA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1 : [];
    const listB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1 : [];
    
    const countA1 = customA1 !== null ? customA1 : listA1.length;
    const countB1 = customB1 !== null ? customB1 : listB1.length;

    // PHÀM NHÂN & LUYỆN KHÍ
    if (mana < 20) return { rank: "Phàm Nhân", major: "Phàm Nhân", swords: 0 };
    if (mana < 100) return { rank: "Luyện Khí Sơ Kỳ", major: "Luyện Khí Kỳ", swords: 1 };
    if (mana < 300) return { rank: "Luyện Khí Trung Kỳ", major: "Luyện Khí Kỳ", swords: 2 };
    if (mana < 600) return { rank: "Luyện Khí Hậu Kỳ", major: "Luyện Khí Kỳ", swords: 3 };
    
    // TRÚC CƠ
    if (mana < 1500) return { rank: "Trúc Cơ Sơ Kỳ", major: "Trúc Cơ Kỳ", swords: 4 };
    if (mana < 4000) return { rank: "Trúc Cơ Trung Kỳ", major: "Trúc Cơ Kỳ", swords: 5 };
    if (mana < 12000) return { rank: "Trúc Cơ Hậu Kỳ", major: "Trúc Cơ Kỳ", swords: 5 };
    
    // BÌNH CẢNH TRÚC CƠ: Chặn ở mốc 12.000 nếu chưa đủ từ vựng
    if (!window.isAdmin && countA1 < 600) {
        return { rank: "Trúc Cơ (Bình Cảnh)", major: "Trúc Cơ Kỳ", swords: 5 };
    }
    
    // KIM ĐAN
    if (mana < 22000) return { rank: "Kim Đan Sơ Kỳ", major: "Kim Đan Kỳ", swords: 6 };
    if (mana < 35000) return { rank: "Kim Đan Trung Kỳ", major: "Kim Đan Kỳ", swords: 6 };
    if (mana < 50000) return { rank: "Kim Đan Hậu Kỳ", major: "Kim Đan Kỳ", swords: 7 };
    
    // BÌNH CẢNH KIM ĐAN: Chặn ở mốc 50.000 nếu chưa đủ từ vựng
    if (!window.isAdmin && countB1 < 2667) {
        return { rank: "Kim Đan (Bình Cảnh)", major: "Kim Đan Kỳ", swords: 7 };
    }
    
    // NGUYÊN ANH
    if (mana < 65000) return { rank: "Nguyên Anh Sơ Kỳ", major: "Nguyên Anh Kỳ", swords: 7 };
    if (mana < 85000) return { rank: "Nguyên Anh Trung Kỳ", major: "Nguyên Anh Kỳ", swords: 8 };
    
    return { rank: "Nguyên Anh Hậu Kỳ", major: "Nguyên Anh Kỳ", swords: 8 };
};

// 2. Danh mục phần thưởng Điểm Tiềm Năng khớp từng tiểu cảnh giới
window.MINOR_REALM_REWARDS = [
    { id: "LK_1", name: "Luyện Khí Sơ Kỳ", mana: 20, points: 10 },
    { id: "LK_2", name: "Luyện Khí Trung Kỳ", mana: 100, points: 10 },
    { id: "LK_3", name: "Luyện Khí Hậu Kỳ", mana: 300, points: 10 },
    { id: "TC_1", name: "Trúc Cơ Sơ Kỳ", mana: 600, points: 15 },
    { id: "TC_2", name: "Trúc Cơ Trung Kỳ", mana: 1500, points: 15 },
    { id: "TC_3", name: "Trúc Cơ Hậu Kỳ", mana: 4000, points: 15 },
    { id: "KD_1", name: "Kim Đan Sơ Kỳ", mana: 12000, points: 25 },
    { id: "KD_2", name: "Kim Đan Trung Kỳ", mana: 22000, points: 25 },
    { id: "KD_3", name: "Kim Đan Hậu Kỳ", mana: 35000, points: 25 },
    { id: "NA_1", name: "Nguyên Anh Chân Quân", mana: 50000, points: 35 }
];

// 3. Tiến hóa ngoại trang Avatar theo mốc Linh Lực mới
window.getAvatarByMana = function(mana) {
    if (mana < 20) return "assets/pham-nhan-ngoi-thien.png";
    if (mana < 600) return "assets/luyen-khi-ngoi-thien.png";
    if (mana < 12000) return "assets/truc-co-ngoi-thien.png";
    if (mana < 50000) return "assets/kim-dan-ngoi-thien.png";
    return "assets/nguyen-anh-ngoi-thien.png";
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
// Danh sách các ngưỡng tiến độ cảnh giới (Kinh nghiệm yêu cầu tăng dần)
window.REALM_PROGRESS_TIERS = [
    { name: "Phàm Nhân", min: 0, max: 20, next: "Luyện Khí Sơ Kỳ" },
    { name: "Luyện Khí Sơ Kỳ", min: 20, max: 100, next: "Luyện Khí Trung Kỳ" },
    { name: "Luyện Khí Trung Kỳ", min: 100, max: 300, next: "Luyện Khí Hậu Kỳ" },
    { name: "Luyện Khí Hậu Kỳ", min: 300, max: 600, next: "Trúc Cơ Sơ Kỳ" },
    { name: "Trúc Cơ Sơ Kỳ", min: 600, max: 1500, next: "Trúc Cơ Trung Kỳ" },
    { name: "Trúc Cơ Trung Kỳ", min: 1500, max: 4000, next: "Trúc Cơ Hậu Kỳ" },
    { name: "Trúc Cơ Hậu Kỳ", min: 4000, max: 12000, next: "Kim Đan Sơ Kỳ" }, // Sửa ở đây
    { name: "Kim Đan Sơ Kỳ", min: 12000, max: 22000, next: "Kim Đan Trung Kỳ" },
    { name: "Kim Đan Trung Kỳ", min: 22000, max: 35000, next: "Kim Đan Hậu Kỳ" },
    { name: "Kim Đan Hậu Kỳ", min: 35000, max: 50000, next: "Nguyên Anh Sơ Kỳ" }, // Sửa ở đây
    { name: "Nguyên Anh Sơ Kỳ", min: 50000, max: 65000, next: "Nguyên Anh Trung Kỳ" },
    { name: "Nguyên Anh Trung Kỳ", min: 65000, max: 85000, next: "Nguyên Anh Hậu Kỳ" },
    { name: "Nguyên Anh Hậu Kỳ", min: 85000, max: 100000, next: "Đỉnh Phong" }
];

window.getRealmProgress = function(mana) {
    const currentMana = Number(mana) || 0;
    const tiers = window.REALM_PROGRESS_TIERS;
    for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i];
        if (currentMana < t.max) {
            const currentInTier = currentMana - t.min;
            const neededInTier = t.max - t.min;
            const percent = Math.min(100, Math.max(0, (currentInTier / neededInTier) * 100));
            return {
                currentTier: t.name,
                nextTier: t.next,
                currentInTier: currentInTier,
                neededInTier: neededInTier,
                currentTotal: currentMana, // Khai báo thêm Tổng Tu Vi
                tierMax: t.max,            // Khai báo thêm Mốc Tu Vi cấp tiếp theo
                percent: percent,
                isMax: false
            };
        }
    }
    return {
        currentTier: "Nguyên Anh Hậu Kỳ",
        nextTier: "Đỉnh Phong",
        currentInTier: 15000,
        neededInTier: 15000,
        currentTotal: currentMana,
        tierMax: currentMana,
        percent: 100,
        isMax: true
    };
};
