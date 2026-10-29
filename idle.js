// ==========================================
// ĐỘNG CƠ ĐỘNG PHỦ IDLE (v0.8.3.7)
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

    // Chỉ gán lại src khi cảnh giới thay đổi để tránh chớp nháy
    if (staticEl && (!staticEl.src || !staticEl.src.includes(`${baseName}-ngoi-thien`))) {
        staticEl.src = `assets/${baseName}-ngoi-thien.png`;
    }
    if (activeEl && (!activeEl.src || !activeEl.src.includes(`${baseName}-tu-luyen`))) {
        activeEl.src = `assets/${baseName}-tu-luyen.png`;
    }
    document.documentElement.style.setProperty('--glow-color', idleState.glowColor);

    checkBottleneck(realmData.rank);
}

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
        if (!idleState.isActive) {
            btn.innerText = idleState.mode === 'manual' ? "Vận Khí" : "Nhập Định";
            status.innerHTML = idleState.mode === 'manual' ? "Nhấp để thổ nạp 1 chu thiên" : "Sẵn sàng nhập định";
        }
    }
}

function toggleCultivation() {
    if (window.playClickSound) window.playClickSound();
    if (idleState.isBottleneck) return;

    if (idleState.isActive) {
        stopCultivation();
    } else {
        startCultivation();
    }
}

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
    
    const realmFunc = window.getRealmData || (() => ({ major: "Phàm Nhân", rank: "Phàm Nhân" }));
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;
    const currentMana = window.lifetimeMana || 0;
    const realmData = realmFunc(currentMana, countA1, countB1);

    // XÉT TỪ VỰNG TRƯỚC
    if (realmData.rank && realmData.rank.includes("Trúc Cơ (Bình Cảnh)") && countA1 < 600) {
        alert(`📜 TÂM THÁI CHƯA ĐỦ!\n\nCần nắm vững ít nhất 600 từ vựng A1 tại Tàng Kinh Các (Hiện tại: ${countA1}/600 từ).`);
        return;
    }
    if (realmData.rank && realmData.rank.includes("Kim Đan (Bình Cảnh)") && countB1 < 2667) {
        alert(`📜 TÂM THÁI CHƯA ĐỦ!\n\nCần nắm vững ít nhất 2667 từ vựng B1 tại Tàng Kinh Các (Hiện tại: ${countB1}/2667 từ).`);
        return;
    }

    const majorKey = realmData.major.replace(" Kỳ", ""); 
    const baseRate = IDLE_CONFIG[majorKey] ? IDLE_CONFIG[majorKey].rate : 50;

    const confirmed = confirm(
        `⚡ ĐỘT PHÁ CẢNH GIỚI ⚡\n\n• Cảnh giới hiện tại: ${realmData.rank || realmData.major}\n• Tỷ lệ thành công: ${baseRate}%\n• Thất bại tổn thất 25% Tu Vi.\n\nĐạo hữu có chắc chắn trùng kích?`
    );

    if (confirmed) {
        const roll = Math.random() * 100;
        if (roll <= baseRate) {
            // Thành công: Cộng thẳng 50 và truyền cờ 'true' báo hiệu đột phá hợp lệ
            if (window.addLifetimeMana) window.addLifetimeMana(50, true);
            
            alert("🎉 ĐỘT PHÁ THÀNH CÔNG!\n\nĐạo hữu đã phá tan gông cùm kinh mạch!");
            initIdleParams();
            if (window.updateCharacterUI) window.updateCharacterUI();
        } else {
            const penalty = Math.floor(currentMana * 0.25);
            const remainingMana = Math.max(0, currentMana - penalty);
            if (window.setLifetimeMana) window.setLifetimeMana(remainingMana);
            else window.lifetimeMana = remainingMana;
            
            alert(`💥 ĐỘT PHÁ THẤT BẠI!\n\nTổn thất ${penalty} Linh Khí.`);
            
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

// Khởi chạy khi tài nguyên trang sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initIdleParams, 300);
});

// Xuất các hàm ra phạm vi toàn cục
window.initIdleParams = initIdleParams;
window.toggleCultivation = toggleCultivation;
window.IDLE_CONFIG = IDLE_CONFIG;

// Hàm xử lý tu luyện ngoại tuyến (Tối ưu chống chặn Pop-up)
window.processOfflineProgress = function(lastUpdated) {
    if (!lastUpdated) return;
    const elapsedMs = Date.now() - lastUpdated;
    if (elapsedMs < 60000) return; 

    const realmFunc = window.getRealmData || (() => ({ rank: "Phàm Nhân", major: "Phàm Nhân" }));
    const countA1 = (window.masteredWordsA1 && Array.isArray(window.masteredWordsA1)) ? window.masteredWordsA1.length : 0;
    const countB1 = (window.masteredWordsB1 && Array.isArray(window.masteredWordsB1)) ? window.masteredWordsB1.length : 0;

    const realmData = realmFunc(window.lifetimeMana || 0, countA1, countB1);
    const majorKey = realmData.major.replace(" Kỳ", "");
    const config = window.IDLE_CONFIG[majorKey];

    if (config && config.mode === 'auto') {
        const cycles = Math.floor(elapsedMs / config.duration);
        const offlineMana = cycles * config.reward;

        if (offlineMana > 0) {
            const elapsedSec = Math.floor(elapsedMs / 1000);
            let timeStr = elapsedSec > 3600 
                ? `${Math.floor(elapsedSec / 3600)} giờ ${Math.floor((elapsedSec % 3600) / 60)} phút` 
                : `${Math.floor(elapsedSec / 60)} phút`;

            const oldMana = window.lifetimeMana || 0;
            window.addLifetimeMana(offlineMana);
            const actualGained = (window.lifetimeMana || 0) - oldMana;

            setTimeout(() => {
                if (actualGained <= 0) {
                    alert(`🌙 BẾ QUAN NGOẠI TUYẾN 🌙\n\nĐạo hữu đã tĩnh tu suốt ${timeStr} nhưng do chạm Bình Cảnh nên không thể hấp thu thêm Linh Khí.\n\nNhanh chóng Đột Phá để tiếp tục!`);
                    return;
                }

                if (window.playLootSound) window.playLootSound();

                // Tạo Modal nhận thưởng HTML trực tiếp trên màn hình
                const popup = document.createElement('div');
                popup.id = "offline-reward-modal";
                popup.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:16px;box-sizing:border-box;";
                popup.innerHTML = `
                    <div style="background:#0f172a;border:2px solid #eab308;border-radius:12px;padding:24px;max-width:340px;width:100%;text-align:center;box-shadow:0 0 25px rgba(234,179,8,0.3);color:#fff;">
                        <div style="font-size:28px;margin-bottom:8px;">🌙</div>
                        <h3 style="color:#facc15;margin:0 0 12px 0;font-size:20px;">BẾ QUAN NGOẠI TUYẾN</h3>
                        <p style="font-size:14px;color:#cbd5e1;line-height:1.5;margin-bottom:16px;">
                            Đạo hữu đã tĩnh tu <b>${timeStr}</b>.<br>
                            Vận chuyển thành công <b>${cycles}</b> chu thiên.<br>
                            Hấp thu được: <b style="color:#4ade80;">+${actualGained} Linh Khí</b>
                        </p>
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <button id="btn-claim-x2" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;border:none;padding:12px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;box-shadow:0 4px 10px rgba(245,158,11,0.4);">
                                🎬 Xem Cơ Duyên (x2 = +${actualGained * 2} LK)
                            </button>
                            <button id="btn-claim-normal" style="background:#334155;color:#cbd5e1;border:none;padding:10px;border-radius:8px;cursor:pointer;font-size:13px;">
                                Thu Nhận Bình Thường
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(popup);

                // Nút x2: Click chuột trực tiếp sẽ vượt qua bộ lọc chặn Pop-up của trình duyệt
                document.getElementById('btn-claim-x2').onclick = () => {
                    popup.remove();
                    if (window.AdsManager) {
                        window.AdsManager.showRewarded(() => {
                            window.addLifetimeMana(actualGained);
                            alert(`🎉 ĐẠI NGỘ THIÊN CƠ!\n\nĐạo hữu đã nhận thêm +${actualGained} Linh Khí bế quan!`);
                        });
                    }
                };

                // Nút đóng bình thường
                document.getElementById('btn-claim-normal').onclick = () => {
                    popup.remove();
                };

            }, 1200);
        }
    }
};
