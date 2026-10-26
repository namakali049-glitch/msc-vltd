// ==========================================
// ĐỘNG CƠ ĐỘNG PHỦ IDLE (v0.8.3.6)
// ==========================================
let idleState = {
    isActive: false,
    progress: 0,
    cycleDuration: 3000, 
    rewardMana: 2,
    mode: 'manual', 
    lastFrameTime: 0,
    isBottleneck: false,
    glowColor: 'rgba(56, 189, 248, 0.5)'
};

let idleReqId = null;

// Cấu hình chu thiên và tỷ lệ đột phá theo đại cảnh giới
const IDLE_CONFIG = {
    "Phàm Nhân": { mode: 'manual', duration: 3000, reward: 2, glow: 'rgba(200, 200, 200, 0.3)', rate: 100 },
    "Luyện Khí": { mode: 'auto', duration: 10000, reward: 5, glow: 'rgba(136, 255, 204, 0.6)', rate: 100 },
    "Trúc Cơ": { mode: 'auto', duration: 60000, reward: 10, glow: 'rgba(51, 153, 255, 0.6)', rate: 70 },
    "Kim Đan": { mode: 'auto', duration: 180000, reward: 25, glow: 'rgba(255, 204, 0, 0.7)', rate: 35 },
    "Nguyên Anh": { mode: 'auto', duration: 300000, reward: 60, glow: 'rgba(204, 51, 255, 0.8)', rate: 10 }
};

function getAvatarBaseName(major) {
    if (major.includes("Phàm Nhân")) return "pham-nhan";
    if (major.includes("Luyện Khí")) return "luyen-khi";
    if (major.includes("Trúc Cơ")) return "truc-co";
    if (major.includes("Kim Đan")) return "kim-dan";
    if (major.includes("Nguyên Anh")) return "nguyen-anh";
    return "pham-nhan";
}

function initIdleParams() {
    const realmFunc = window.getRealmData || (() => ({ rank: "Phàm Nhân", major: "Phàm Nhân" }));
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    
    const realmData = realmFunc(window.lifetimeMana || 0, countA1, countB1);
    const majorKey = realmData.major.replace(" Kỳ", ""); 
    const config = IDLE_CONFIG[majorKey] || IDLE_CONFIG["Phàm Nhân"];

    idleState.mode = config.mode;
    idleState.cycleDuration = config.duration;
    idleState.rewardMana = config.reward;
    idleState.glowColor = config.glow;
    
    const baseName = getAvatarBaseName(majorKey);
const staticEl = document.getElementById('idleAvatarStatic');
const activeEl = document.getElementById('idleAvatarActive');

// Chỉ gán lại src khi cảnh giới thay đổi để tránh chớp nháy và mất hiệu ứng chuyển cảnh
if (staticEl && (!staticEl.src || !staticEl.src.includes(`${baseName}-ngoi-thien`))) {
    staticEl.src = `assets/${baseName}-ngoi-thien.png`;
}
if (activeEl && (!activeEl.src || !activeEl.src.includes(`${baseName}-tu-luyen`))) {
    activeEl.src = `assets/${baseName}-tu-luyen.png`;
}
    document.documentElement.style.setProperty('--glow-color', idleState.glowColor);

    checkBottleneck(realmData.rank);
}
window.initIdleParams = initIdleParams;

function checkBottleneck(rankStr) {
    const btn = document.getElementById('btnCultivate');
    const status = document.getElementById('idleStatusText');
    if (!btn || !status) return;
    
    if (rankStr && rankStr.includes("Bình Cảnh")) {
        idleState.isBottleneck = true;
        stopCultivation();
        btn.innerText = "Đột Phá";
        btn.classList.add('btn-breakthrough');
        btn.onclick = attemptBreakthrough;
        status.innerHTML = `<span style="color:#ef4444;">Đã chạm Bình Cảnh! Cần Đột Phá để tiếp tục.</span>`;
    } else {
        idleState.isBottleneck = false;
        btn.classList.remove('btn-breakthrough');
        btn.onclick = toggleCultivation;
        // Chỉ đặt lại chữ khi nhân vật đang KHÔNG trong trạng thái tu luyện
        if (!idleState.isActive) {
            btn.innerText = idleState.mode === 'manual' ? "Vận Khí" : "Nhập Định";
            status.innerHTML = idleState.mode === 'manual' ? "Nhấp để thổ nạp 1 chu thiên" : "Sẵn sàng nhập định";
        }
    }
}
window.toggleCultivation = function() {
    if (window.playClickSound) window.playClickSound();
    if (idleState.isBottleneck) return;

    if (idleState.isActive) {
        stopCultivation();
    } else {
        startCultivation();
    }
};

function startCultivation() {
    initIdleParams();
    idleState.isActive = true;
    idleState.progress = 0;
    idleState.lastFrameTime = performance.now();
    
    const avatarBox = document.getElementById('idleAvatarBox');
    if (avatarBox) avatarBox.classList.add('is-cultivating');
    
    const btn = document.getElementById('btnCultivate');
    const status = document.getElementById('idleStatusText');
    
    if (idleState.mode === 'manual') {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Đang Vận Khí...";
        }
        if (status) status.innerText = "Đang dẫn khí nhập thể...";
    } else {
        if (btn) btn.innerText = "Ngừng Tu";
        if (status) status.innerHTML = `<span style="color:#4ade80;">Đang tự động vận chuyển Chu Thiên...</span>`;
    }

    if (idleReqId) cancelAnimationFrame(idleReqId);
    idleReqId = requestAnimationFrame(idleLoop);
}

function stopCultivation() {
    idleState.isActive = false;
    idleState.progress = 0;
    if (idleReqId) cancelAnimationFrame(idleReqId);
    
    const avatarBox = document.getElementById('idleAvatarBox');
    if (avatarBox) avatarBox.classList.remove('is-cultivating');

    const fill = document.getElementById('chuThienFill');
    if (fill) fill.style.transform = `scaleX(0)`;
    
    const btn = document.getElementById('btnCultivate');
    if (btn) {
        btn.disabled = false;
        if (!idleState.isBottleneck) {
            btn.innerText = idleState.mode === 'manual' ? "Vận Khí" : "Nhập Định";
        }
    }

    const status = document.getElementById('idleStatusText');
    if (status && !idleState.isBottleneck) {
        status.innerText = "Đã ngừng tu luyện.";
    }
}

function idleLoop(timestamp) {
    if (!idleState.isActive) return;
    
    const dt = timestamp - idleState.lastFrameTime;
    idleState.lastFrameTime = timestamp;
    
    let currentDuration = idleState.cycleDuration;
// Đã gỡ bỏ lỗi buff Tụ Linh Đan nhầm sang chế độ Idle

    idleState.progress += dt;
    let ratio = Math.min(1, idleState.progress / currentDuration);
    
    const fill = document.getElementById('chuThienFill');
    if (fill) fill.style.transform = `scaleX(${ratio})`;

    if (idleState.progress >= currentDuration) {
        completeCycle();
    } else {
        idleReqId = requestAnimationFrame(idleLoop);
    }
}

function completeCycle() {
    if (window.addLifetimeMana) {
        window.addLifetimeMana(idleState.rewardMana);
    }
    
    spawnFloatingText(`+${idleState.rewardMana} LK`, '#4ade80');
    initIdleParams();
    
    if (idleState.mode === 'manual' || idleState.isBottleneck) {
        stopCultivation();
    } else {
        idleState.progress = 0;
        idleReqId = requestAnimationFrame(idleLoop);
    }
}

function attemptBreakthrough() {
    if (window.playClickSound) window.playClickSound();
    
    const realmFunc = window.getRealmData || (() => ({ major: "Phàm Nhân" }));
    const realmData = realmFunc(window.lifetimeMana || 0);
    const majorKey = realmData.major.replace(" Kỳ", ""); 
    const baseRate = IDLE_CONFIG[majorKey] ? IDLE_CONFIG[majorKey].rate : 50;

    const confirmed = confirm(
        `⚡ ĐỘT PHÁ CẢNH GIỚI ⚡\n\n` +
        `• Cảnh giới hiện tại: ${realmData.rank || realmData.major}\n` +
        `• Tỷ lệ thành công: ${baseRate}%\n` +
        `• Thất bại sẽ tẩu hỏa nhập ma, tổn thất 25% tổng Tu Vi.\n\n` +
        `Đạo hữu có chắc chắn muốn trùng kích bình cảnh?`
    );

    if (confirmed) {
        const roll = Math.random() * 100;
        if (roll <= baseRate) {
            if (window.addLifetimeMana) window.addLifetimeMana(1);
            alert("🎉 ĐỘT PHÁ THÀNH CÔNG!\nĐạo hữu đã phá tan gông cùm, đăng lâm tầng cảnh giới mới!");
            initIdleParams();
        } else {
            if (window.playWrongSound) window.playWrongSound();
            const currentTotal = window.lifetimeMana || 0;
            const penalty = Math.floor(currentTotal * 0.25);
            if (window.setLifetimeMana) {
    window.setLifetimeMana(currentTotal - penalty);
} else {
    window.lifetimeMana = Math.max(0, currentTotal - penalty);
}
            
            alert(`💥 ĐỘT PHÁ THẤT BẠI!\nTâm ma phản phệ khiến kinh mạch đứt đoạn, đánh mất ${penalty} Linh Khí.`);
            
            if (window.recalcStats) window.recalcStats();
            if (window.updateCharacterUI) window.updateCharacterUI();
            if (window.syncManaToDatabase) window.syncManaToDatabase();
            initIdleParams();
        }
    }
}

function spawnFloatingText(text, color) {
    const box = document.getElementById('idleAvatarBox');
    if (!box) return;

    const el = document.createElement('div');
    el.innerText = text;
    el.style.cssText = `
        position: absolute;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: ${color};
        font-size: 1rem;
        font-weight: bold;
        text-shadow: 0 0 6px #000, 0 0 10px ${color};
        pointer-events: none;
        z-index: 25;
        transition: transform 0.8s ease-out, opacity 0.8s ease-out;
        opacity: 1;
    `;
    box.appendChild(el);
    
    requestAnimationFrame(() => {
        el.style.transform = "translate(-50%, -100px)";
        el.style.opacity = "0";
    });
    
    setTimeout(() => el.remove(), 850);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initIdleParams, 300);
});
window.initIdleParams = initIdleParams;
if (typeof toggleCultivation === 'function') window.toggleCultivation = toggleCultivation;
// Gắn IDLE_CONFIG vào window để app.js có thể đọc được
window.IDLE_CONFIG = IDLE_CONFIG;

// Hàm xử lý tu luyện ngoại tuyến
window.processOfflineProgress = function(lastUpdated) {
    if (!lastUpdated) return;
    const elapsedMs = Date.now() - lastUpdated;
    
    // Yêu cầu vắng mặt tối thiểu 1 phút (60000ms) mới tính offline
    if (elapsedMs < 60000) return; 

    const realmFunc = window.getRealmData || (() => ({ rank: "Phàm Nhân", major: "Phàm Nhân" }));
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;

    const realmData = realmFunc(window.lifetimeMana || 0, countA1, countB1);
    const majorKey = realmData.major.replace(" Kỳ", "");
    const config = window.IDLE_CONFIG[majorKey];

    // Chỉ cộng dồn nếu ở trạng thái tự động tu luyện (Từ Luyện Khí trở lên)
    if (config && config.mode === 'auto') {
        const cycles = Math.floor(elapsedMs / config.duration);
        const offlineMana = cycles * config.reward;

        if (offlineMana > 0) {
            // Tính toán chuỗi thời gian hiển thị
            const elapsedSec = Math.floor(elapsedMs / 1000);
            let timeStr = elapsedSec > 3600 
                ? `${Math.floor(elapsedSec/3600)} giờ ${Math.floor((elapsedSec%3600)/60)} phút` 
                : `${Math.floor(elapsedSec/60)} phút`;

            // Gọi addLifetimeMana để hệ thống tự động kiểm tra và chặn Bình Cảnh
            const oldMana = window.lifetimeMana || 0;
            window.addLifetimeMana(offlineMana);
            const actualGained = (window.lifetimeMana || 0) - oldMana;

            // Hiển thị thông báo khi đăng nhập
            setTimeout(() => {
                if (actualGained > 0) {
                    if (window.playLootSound) window.playLootSound();
                    alert(`🌙 BẾ QUAN NGOẠI TUYẾN 🌙\n\nĐạo hữu đã tĩnh tu trong Động Phủ suốt ${timeStr}.\nTự động vận chuyển ${cycles} chu thiên.\n\n✨ Hấp thu được: +${actualGained} Linh Khí!`);
                } else {
                    alert(`🌙 BẾ QUAN NGOẠI TUYẾN 🌙\n\nĐạo hữu đã tĩnh tu suốt ${timeStr} nhưng do chạm Bình Cảnh nên không thể hấp thu thêm Linh Khí.\n\nNhanh chóng Đột Phá để khai thông kinh mạch!`);
                }
            }, 1200);
        }
    }
};
