// ==========================================
// HỆ THỐNG TÚI TRỮ VẬT (MÔ-ĐUN ĐỘC LẬP)
// ==========================================
window.openInventory = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'flex';
    updateInventoryUI();
};

window.closeInventory = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('inventoryModal');
    if (modal) modal.style.display = 'none';
};

function updateInventoryUI() {
    const invList = document.getElementById('inventoryList');
    if (!invList) return;
    invList.innerHTML = '';
    
    const itemEffects = {
        "Hồi Xuân Đan": "Hồi phục ngay 30 Sinh Mệnh.",
        "Tụ Linh Đan": "Sử dụng nhận ngay +50 Linh Lực.",
        "Tẩy Tủy Đan": "Sinh Mệnh phục hồi hoàn toàn."
    };

    let hasItems = false;
    const inv = window.inventory || {};
    for (let item in inv) {
        if (inv[item] > 0) {
            hasItems = true;
            invList.innerHTML += `
            <div class="item-card">
                <div class="item-card-info">
                    <h4>${item} (x${inv[item]})</h4>
                    <p>${itemEffects[item]}</p>
                </div>
                <button class="btn-main" style="width:auto; padding:6px 14px;" onclick="useItem('${item}')">Dùng</button>
            </div>`;
        }
    }
    if (!hasItems) {
        invList.innerHTML = '<p style="color:#aaa; font-size:14px; padding:10px 0;">Túi đồ trống không!</p>';
    }
}
window.updateInventoryUI = updateInventoryUI;

window.useItem = function(item) {
    if (window.playClickSound) window.playClickSound();
    const inv = window.inventory;
    if (inv && inv[item] > 0) {
        inv[item]--;
        if (window.applyItemEffect) {
            window.applyItemEffect(item);
        }
        updateInventoryUI();
    }
};
