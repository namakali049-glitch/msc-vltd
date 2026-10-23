window.kiemTraDotPha = function() {
    const mana = window.lifetimeMana || 0;
    const countA1 = Array.isArray(window.masteredWordsA1) ? window.masteredWordsA1.length : 0;
    const countB1 = Array.isArray(window.masteredWordsB1) ? window.masteredWordsB1.length : 0;

    let status = {
        currentMana: mana,
        a1: countA1,
        b1: countB1,
        isCapped: false,
        canLevelUp: false,
        message: "Đang trong giai đoạn tích lũy tu vi, chưa chạm ngưỡng bình cảnh."
    };

    // Kiểm tra ngưỡng Trúc Cơ Viên Mãn (11.999 LK) -> Đột phá Kim Đan
    if (mana >= 11999 && mana < 12000) {
        status.isCapped = true;
        if (countA1 >= 600 || window.isAdmin) {
            status.canLevelUp = true;
            status.message = "✅ Đạo tâm thông minh! Sẵn sàng đột phá lên [Kim Đan Kỳ].";
        } else {
            status.message = `❌ Kẹt Bình Cảnh! Yêu cầu 600 từ A1 (Hiện có: ${countA1}/600).`;
        }
    } 
    // Kiểm tra ngưỡng Kim Đan Viên Mãn (49.999 LK) -> Đột phá Nguyên Anh
    else if (mana >= 49999 && mana < 50000) {
        status.isCapped = true;
        if (countB1 >= 2667 || window.isAdmin) {
            status.canLevelUp = true;
            status.message = "✅ Nguyên Anh thành hình! Sẵn sàng đột phá lên [Nguyên Anh Kỳ].";
        } else {
            status.message = `❌ Kẹt Bình Cảnh! Yêu cầu 2667 từ B1 (Hiện có: ${countB1}/2667).`;
        }
    }

    console.table(status);
    return status;
};
