// ==========================================
// HỆ THỐNG TRÂN BẢO CÁC (CỬA HÀNG) v0.8.3.6
// ==========================================

window.SHOP_CATALOG = {
    dieu_duoc: [
        { id: 'hoi_huyet_dan', name: 'Hồi Huyết Đan', desc: 'Khôi phục 15 HP.', price: 3, currency: 'linh_thach', color: '#a3e635', icon: '💊' },
        { id: 'hoi_khi_dan', name: 'Hồi Khí Đan', desc: 'Khôi phục 30 Linh Lực.', price: 3, currency: 'linh_thach', color: '#38bdf8', icon: '🧪' },
        { id: 'than_luc_dan', name: 'Thần Lực Đan', desc: 'Tăng 1 Sức Mạnh.', price: 150, currency: 'linh_thach', color: '#f87171', icon: '💪' },
        { id: 'khi_huyet_dan', name: 'Khí Huyết Đan', desc: 'Tăng 1 Khí Huyết.', price: 150, currency: 'linh_thach', color: '#4ade80', icon: '❤️' },
        { id: 'linh_man_dan', name: 'Linh Mẫn Đan', desc: 'Tăng 1 Nhanh Nhẹn.', price: 150, currency: 'linh_thach', color: '#fbbf24', icon: '⚡' },
        { id: 'tinh_than_dan', name: 'Tỉnh Thần Đan', desc: 'Tăng 1 Tinh Thần.', price: 150, currency: 'linh_thach', color: '#818cf8', icon: '🌀' }
    ],
    than_ky: [
        { id: 'skill_ngu_kiem', name: 'Ngự Kiếm Thuật', desc: 'Tuyệt kỹ điều khiển phi kiếm bay công kích ma vật.', price: 1200, currency: 'linh_thach', color: '#ffd700', icon: '⚔️' }, // <--- CÓ DẤU PHẨY
        { id: 'skill_loi_chu', name: 'Thiên Lôi Chú', desc: 'Kỹ năng bị động. Mỗi 3 giây giáng sét ngẫu nhiên tiêu diệt ma vật.', price: 2000, currency: 'linh_thach', color: '#a855f7', icon: '⚡' }, // <--- CÓ DẤU PHẨY
        { id: 'skill_bat_quai', name: 'Thái Cực Trận', desc: 'Kỹ năng chủ động (Yêu cầu: Kim Đan Kỳ). Dùng 2/3 Linh Lực tối đa giải phóng sóng xung kích.', price: 200, currency: 'linh_thach', color: '#22d3ee', icon: '☯️' }
    ]
};

window.openShopModal = function() {
// ... phần code bên dưới giữ nguyên
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('shopModal');
    if (modal) modal.style.display = 'flex';
    
    updateShopCurrencies();
    window.renderShop('dieu_duoc');
};

window.closeShopModal = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('shopModal');
    if (modal) modal.style.display = 'none';
};

function updateShopCurrencies() {
    const ltEl = document.getElementById('ui-linh-thach-shop');
    if (ltEl) ltEl.innerText = window.playerLinhThach || 0;
}

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
        let playerWallet = window.playerLinhThach || 0;
        let canAfford = playerWallet >= item.price;
        
        let btnHtml = isPurchased 
            ? `<button class="btn-buy" disabled>Đã Lĩnh Ngộ</button>`
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
    // CHỐT CHẶN: Kiểm tra cảnh giới khi mua Thái Cực Trận
    if (itemId === 'skill_bat_quai') {
        const realmData = window.getRealmData ? window.getRealmData(window.lifetimeMana || 0) : { major: "Phàm Nhân" };
        if (realmData.major !== "Kim Đan Kỳ" && realmData.major !== "Nguyên Anh Kỳ") {
            alert("⚠️ Đạo tâm chưa đủ! Bí kíp này đòi hỏi tu vi tối thiểu Kim Đan Kỳ mới có thể lĩnh ngộ.");
            return;
        }
    }
    let quantity = 1;

    // Tính năng mua số lượng lớn cho Đan Dược
    if (tab === 'dieu_duoc') {
        let input = prompt(`Nhập số lượng muốn mua (Giá: ${price} 💎/viên):`, "1");
        if (input === null) return;
        quantity = parseInt(input);
        if (isNaN(quantity) || quantity <= 0) {
            alert("⚠️ Số lượng không hợp lệ!");
            return;
        }
    }

    let totalCost = price * quantity;
    let playerWallet = window.playerLinhThach || 0;
    
    if (playerWallet < totalCost) {
        alert(`⚠️ Đạo hữu không đủ Linh Thạch! Cần ${totalCost} 💎, nhưng hiện chỉ có ${playerWallet} 💎.`);
        return;
    }

    if (window.playLootSound) window.playLootSound();

    // Trừ Linh Thạch
    window.updateLinhThach(-totalCost);

    // Trao Đan Dược hoặc Lĩnh ngộ Kỹ Năng
    if (tab === 'dieu_duoc') {
        if (!window.inventory) window.inventory = {};
        window.inventory[itemId] = (window.inventory[itemId] || 0) + quantity;
        const itemName = window.ITEM_DATABASE && window.ITEM_DATABASE[itemId] ? window.ITEM_DATABASE[itemId].name : itemId;
        alert(`✨ Giao dịch thành công! Nhận được ${quantity}x ${itemName}.`);
    } else if (tab === 'than_ky') {
        if (window.learnSkill) {
            window.learnSkill(itemId);
            alert("✨ Lĩnh ngộ thành công bí kíp Ngự Kiếm Thuật!");
        }
    }
    
    if (window.syncManaToDatabase) window.syncManaToDatabase();
    updateShopCurrencies();
    window.renderShop(tab);
};
