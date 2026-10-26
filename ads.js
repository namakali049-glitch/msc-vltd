// ads.js - Phiên bản tự nguyện: Có nút từ chối / bỏ qua
window.AdsManager = {
    directLinkUrl: "https://uplcm.com/4/12128333",

    // Nhận thêm callback `cancelCallback` khi người chơi từ chối xem
    showRewarded: function(rewardCallback, cancelCallback) {
        if (!this.directLinkUrl) return;

        let timer = null;

        const overlay = document.createElement('div');
        overlay.id = "ad-overlay-container";
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:16px;box-sizing:border-box;";
        
        overlay.innerHTML = `
            <div style="background:#0f172a;border:2px solid #eab308;border-radius:12px;padding:24px;max-width:320px;width:100%;text-align:center;box-shadow:0 0 25px rgba(234,179,8,0.4);color:#fff;position:relative;">
                <!-- Nút tắt nhanh góc trên bên phải -->
                <button id="btn-close-ad-x" style="position:absolute;top:10px;right:12px;background:none;border:none;color:#94a3b8;font-size:20px;font-weight:bold;cursor:pointer;padding:4px 8px;line-height:1;">✕</button>

                <h3 style="color:#facc15;margin:0 0 10px 0;font-size:18px;">🎬 THIÊN ĐẠO CHIẾU CƠ</h3>
                <p id="ad-desc" style="font-size:13px;color:#cbd5e1;line-height:1.5;margin-bottom:16px;">
                    Đạo hữu có muốn quan sát thiên cơ sang tab mới để nhận thêm phần thưởng?
                </p>
                <div id="ad-timer-box" style="display:none;font-size:32px;font-weight:bold;margin:12px 0;color:#38bdf8;">6s</div>
                
                <div id="ad-actions" style="display:flex;flex-direction:column;gap:10px;">
                    <button id="btn-trigger-ad" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(245,158,11,0.4);width:100%;">
                        🚀 Khám Phá Cơ Duyên
                    </button>
                    <button id="btn-dismiss-ad" style="background:#334155;color:#94a3b8;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;width:100%;">
                        Bỏ Qua (Không xem)
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Hàm dọn dẹp popup khi hủy
        const handleCancel = () => {
            if (timer) clearInterval(timer);
            overlay.remove();
            if (typeof cancelCallback === 'function') {
                cancelCallback();
            }
        };

        // Gán sự kiện cho các nút từ chối
        document.getElementById('btn-close-ad-x').onclick = handleCancel;
        document.getElementById('btn-dismiss-ad').onclick = handleCancel;

        // Khi người chơi đồng ý xem quảng cáo
        document.getElementById('btn-trigger-ad').onclick = () => {
            window.open(this.directLinkUrl, '_blank');

            // Ẩn nút xem và nút bỏ qua, chuyển sang trạng thái đếm ngược
            document.getElementById('btn-trigger-ad').style.display = 'none';
            document.getElementById('btn-dismiss-ad').style.display = 'none';
            document.getElementById('ad-desc').innerText = "Đang khám phá cơ duyên tại tab mới...\nVui lòng chờ để lĩnh thưởng:";
            
            const timerBox = document.getElementById('ad-timer-box');
            timerBox.style.display = 'block';

            let timeLeft = 6;
            timer = setInterval(() => {
                timeLeft--;
                timerBox.innerText = `${timeLeft}s`;

                if (timeLeft <= 0) {
                    clearInterval(timer);
                    // Ẩn nút ✕ khi đã hoàn thành thời gian chờ
                    const btnCloseX = document.getElementById('btn-close-ad-x');
                    if (btnCloseX) btnCloseX.style.display = 'none';

                    document.getElementById('ad-actions').innerHTML = `
                        <button id="btn-finish-ad" style="background:#22c55e;color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(34,197,94,0.4);width:100%;">
                            ✨ Lĩnh Thưởng & Tiếp Tục
                        </button>
                    `;
                    document.getElementById('btn-finish-ad').onclick = () => {
                        overlay.remove();
                        if (typeof rewardCallback === 'function') {
                            rewardCallback();
                        }
                    };
                }
            }, 1000);
        };
    }
};
