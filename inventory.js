// ==========================================
// HỆ THỐNG TÚI TRỮ VẬT (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.tuLinhBuff = window.tuLinhBuff || 0; 
window.itemUsageHistory = window.itemUsageHistory || {}; 

window.ITEM_DATABASE = {
    "hoi_huyet_dan": { name: "Hồi Huyết Đan", rarity: "Thường", color: "#a3e635", desc: "Hồi phục 15 HP.", use: function() { window.currentHp = Math.min(window.maxHp || 100, (window.currentHp || 0) + 15); return "Đã hồi 15 HP!"; } },
    "hoi_khi_dan": { name: "Hồi Khí Đan", rarity: "Thường", color: "#38bdf8", desc: "Hồi phục 30 Linh Lực.", use: function() { window.currentLinhLuc = Math.min(window.maxLinhLuc || 100, (window.currentLinhLuc || 0) + 30); return "Đã hồi 30 Linh Lực!"; } },
    "tu_linh_dan": { name: "Tụ Linh Đan", rarity: "Hiếm", color: "#c084fc", desc: "x2 Linh Khí thu được trong 50 câu tới.", use: function() { window.tuLinhBuff = (window.tuLinhBuff || 0) + 50; return "Kích hoạt x2 Linh Khí!"; } },
    "than_luc_dan": { name: "Thần Lực Đan", attr: "str", rarity: "Siêu Siêu Hiếm", color: "#f87171", desc: "Tăng 1 Sức Mạnh. (Tối đa 5 viên/Cảnh giới)" },
    "khi_huyet_dan": { name: "Khí Huyết Đan", attr: "vit", rarity: "Siêu Siêu Hiếm", color: "#4ade80", desc: "Tăng 1 Khí Huyết. (Tối đa 5 viên/Cảnh giới)" },
    "linh_man_dan": { name: "Linh Mẫn Đan", attr: "agi", rarity: "Siêu Siêu Hiếm", color: "#fbbf24", desc: "Tăng 1 Nhanh Nhẹn. (Tối đa 5 viên/Cảnh giới)" },
    "tinh_than_dan": { name: "Tỉnh Thần Đan", attr: "spi", rarity: "Siêu Siêu Hiếm", color: "#818cf8", desc: "Tăng 1 Tinh Thần. (Tối đa 5 viên/Cảnh giới)" }
};

window.openInventory = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'flex';
    window.renderInventory();
};

window.closeInventory = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'none';
};

window.renderInventory = function() {
    const list = document.getElementById('inventoryList');
    if (!list) return;
    list.innerHTML = "";
    if (!window.inventory) window.inventory = {};

    for (let key in window.inventory) {
        if (!window.ITEM_DATABASE[key]) delete window.inventory[key];
    }
    
    const keys = Object.keys(window.inventory);
    if (keys.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:14px;'>Túi trữ vật trống rỗng...</p>";
        return;
    }

    keys.forEach(key => {
        const amount = window.inventory[key];
        const itemData = window.ITEM_DATABASE[key];
        if (amount <= 0) return; 
        const itemBox = document.createElement('div');
        itemBox.style.cssText = "background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #334155; display: flex; flex-direction: column; gap: 6px;";
        itemBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: ${itemData.color}; font-weight: bold;">${itemData.name} (x${amount})</span>
                <span style="font-size: 11px; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; color:${itemData.color}">${itemData.rarity}</span>
            </div>
            <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">${itemData.desc}</div>
            <button onclick="window.useItem('${key}')" style="align-self: flex-end; background: #3b82f6; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 4px;">Sử Dụng</button>
        `;
        list.appendChild(itemBox);
    });
};

window.useItem = function(itemId) {
    if (!window.inventory || !window.inventory[itemId] || window.inventory[itemId] <= 0) return;
    const item = window.ITEM_DATABASE[itemId];
    
    if (item.attr) {
        const realmData = window.getRealmData(window.lifetimeMana || 0);
        const currentMajor = realmData.major; 
        window.itemUsageHistory[currentMajor] = window.itemUsageHistory[currentMajor] || {};
        const usedCount = window.itemUsageHistory[currentMajor][itemId] || 0;
        
        if (usedCount >= 5) {
            alert(`⚠️ Cảnh giới [${currentMajor}] thân thể đã bão hòa, không thể hấp thụ thêm ${item.name}!`);
            return;
        }
        
        // Phải cộng trực tiếp vào playerStats để hàm recalcStats() không ghi đè mất
        window.playerStats[item.attr] = (window.playerStats[item.attr] || 1) + 1;
        window[item.attr] = window.playerStats[item.attr];
        window.itemUsageHistory[currentMajor][itemId] = usedCount + 1;
        alert(`🌟 Hấp thụ thành công! Tăng 1 điểm ${item.name.split(" ")[0]}.`);
        if (window.recalcStats) window.recalcStats();
        if (window.updateCharacterUI) window.updateCharacterUI();
    } else {
        const msg = item.use();
        alert(`✨ ${msg}`);
        if (window.updateQuizHUD) window.updateQuizHUD();
    }

    window.inventory[itemId]--;
    if (window.inventory[itemId] <= 0) delete window.inventory[itemId];
    window.renderInventory();
};
