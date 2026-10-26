// ==========================================
// HỆ THỐNG TRÂN BẢO CÁC (CỬA HÀNG)
// ==========================================

window.SHOP_CATALOG = {
    dieu_duoc: [
        { id: 'hoi_huyet_dan', name: 'Hồi Huyết Đan', desc: 'Khôi phục 15 HP.', price: 50, color: '#a3e635', icon: '💊' },
        { id: 'hoi_khi_dan', name: 'Hồi Khí Đan', desc: 'Khôi phục 30 Linh Lực.', price: 50, color: '#38bdf8', icon: '🧪' }
    ],
    than_ky: [
        { id: 'skill_ngu_kiem', name: 'Ngự Kiếm Thuật', desc: 'Tuyệt kỹ điều khiển phi kiếm. (Kéo thả định hướng)', price: 1000, color: '#ffd700', icon: '⚔️' }
    ]
};

window.openShopModal = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('shopModal');
    if (modal) modal.style.display = 'flex';
    
    const ltEl = document.getElementById('ui-linh-thach-shop');
    if (ltEl) ltEl.innerText = window.playerLinhThach || 0;
    
    window.renderShop('dieu_duoc');
};

window.closeShopModal = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('shopModal');
    if (modal) modal.style.display = 'none';
};

window.renderShop = function(tab) {
    if (window.playClickSound) window.playClickSound();
    
    document.querySelectorAll('.shop-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = tab === 'dieu_duoc' ? document.getElementById('shop-tab-duoc') : document.getElementById('shop-tab-ky');
    if (activeBtn) activeBtn.classList.add('active');

    const contentBox = document.getElementById('shopContent');
    contentBox.innerHTML = '';

    const items = window.SHOP_CATALOG[tab] || [];
    const learnedSkills = window.learnedSkills || [];

    items.forEach(item => {
        let isPurchased = tab === 'than_ky' && learnedSkills.includes(item.id);
        let canAfford = (window.playerLinhThach || 0) >= item.price;
        
        let btnHtml = isPurchased 
            ? `<button class="btn-buy" disabled>Đã Học</button>`
            : `<button class="btn-buy" ${!canAfford ? 'disabled' : ''} onclick="buyShopItem('${tab}', '${item.id}', ${item.price})">
                 ${item.price} 💎
               </button>`;

        contentBox.innerHTML += `
            <div class="shop-item">
                <div class="shop-item-info">
                    <h4 style="color: ${item.color}">${item.icon} ${item.name}</h4>
                    <p>${item.desc}</p>
                </div>
                ${btnHtml}
            </div>
        `;
    });
};

window.buyShopItem = function(tab, itemId, price) {
    if ((window.playerLinhThach || 0) < price) {
        alert("⚠️ Không đủ Linh Thạch!");
        return;
    }

    if (window.playLootSound) window.playLootSound();
    window.updateLinhThach(-price); // Trừ tiền

    if (tab === 'dieu_duoc') {
        if (!window.inventory) window.inventory = {};
        window.inventory[itemId] = (window.inventory[itemId] || 0) + 1;
        alert(`Giao dịch thành công! Nhận được ${itemId}.`);
    } else if (tab === 'than_ky') {
        if (!window.learnedSkills) window.learnedSkills = [];
        if (!window.learnedSkills.includes(itemId)) {
            window.learnedSkills.push(itemId);
            alert("✨ Lĩnh ngộ thành công bí kíp!");
        }
    }
    
    // Lưu lại Firebase
    if (window.syncManaToDatabase) window.syncManaToDatabase();
    
    // Cập nhật lại UI shop
    window.renderShop(tab);
    const ltEl = document.getElementById('ui-linh-thach-shop');
    if (ltEl) ltEl.innerText = window.playerLinhThach || 0;
};
