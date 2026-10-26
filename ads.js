// ads.js - Phiên bản tối ưu chống chặn mở Tab
window.AdsManager = {
    directLinkUrl: "https://uplcm.com/4/12128333",

    showRewarded: function(rewardCallback) {
        if (!this.directLinkUrl) return;

        // Tạo khung hiển thị
        const overlay = document.createElement('div');
        overlay.id = "ad-overlay-container";
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:16px;box-sizing:border-box;";
        
        overlay.innerHTML = `
            <div style="background:#0f172a;border:2px solid #eab308;border-radius:12px;padding:24px;max-width:320px;width:100%;text-align:center;box-shadow:0 0 25px rgba(234,179,8,0.4);color:#fff;">
                <h3 style="color:#facc15;margin:0 0 10px 0;font-size:18px;">🎬 THIÊN ĐẠO CHIẾU CƠ</h3>
                <p id="ad-desc" style="font-size:13px;color:#cbd5e1;line-height:1.5;margin-bottom:16px;">
                    Nhấp vào nút bên dưới để khai mở cơ duyên sang tab mới và nhận thưởng:
                </p>
                <div id="ad-timer-box" style="display:none;font-size:32px;font-weight:bold;margin:12px 0;color:#38bdf8;">6s</div>
                <div id="ad-actions">
                    <button id="btn-trigger-ad" style="background:linear-gradient(135deg, #f59e0b, #d97706);color:#fff;border:none;padding:12px 20px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(245,158,11,0.4);width:100%;">
                        🚀 Khám Phá Cơ Duyên
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Bấm nút này là cú click chuột thật của người dùng -> Trình duyệt sẽ cho phép mở tab 100%
        document.getElementById('btn-trigger-ad').onclick = () => {
            window.open(this.directLinkUrl, '_blank');

            // Đổi giao diện sang đếm ngược chờ nhận thưởng
            document.getElementById('btn-trigger-ad').style.display = 'none';
            document.getElementById('ad-desc').innerText = "Đang chiêm nghiệm thiên cơ tại tab mới...\nVui lòng chờ để nhận thưởng:";
            const timerBox = document.getElementById('ad-timer-box');
            timerBox.style.display = 'block';

            let timeLeft = 6;
            const timer = setInterval(() => {
                timeLeft--;
                timerBox.innerText = `${timeLeft}s`;

                if (timeLeft <= 0) {
                    clearInterval(timer);
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
