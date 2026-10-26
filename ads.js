// ads.js - Quản lý Quảng Cáo Nhận Thưởng qua Direct Link
window.AdsManager = {
    // Dán link Monetag bạn vừa copy vào giữa 2 dấu ngoặc kép bên dưới:
    directLinkUrl: "https://uplcm.com/4/12128333",

    // Hàm gọi hiển thị quảng cáo nhận thưởng
    showRewarded: function(rewardCallback) {
        if (!this.directLinkUrl || this.directLinkUrl.includes("DÁN_LINK")) {
            alert("Chưa cấu hình link quảng cáo!");
            return;
        }

        // 1. Mở trang quảng cáo sang tab mới
        window.open(this.directLinkUrl, '_blank');

        // 2. Tạo giao diện chờ 6 giây ở tab game chính
        const overlay = document.createElement('div');
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;font-family:sans-serif;";
        
        let timeLeft = 6;
        overlay.innerHTML = `
            <div style="background:#1e293b;padding:24px;border-radius:12px;border:2px solid #eab308;text-align:center;max-width:320px;box-shadow:0 0 20px rgba(234,179,8,0.3);">
                <h3 style="color:#facc15;margin-bottom:8px;font-size:18px;">🎬 THIÊN ĐẠO CHIẾU CƠ</h3>
                <p style="font-size:13px;color:#cbd5e1;line-height:1.5;">Đang khám phá cơ duyên tại tab mới.<br>Vui lòng chờ để nhận thưởng:</p>
                <div id="ad-countdown" style="font-size:32px;font-weight:bold;margin:16px 0;color:#38bdf8;">${timeLeft}s</div>
                <button id="btn-claim-ad" style="background:#475569;color:#94a3b8;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:not-allowed;" disabled>Đang liên kết...</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const timer = setInterval(() => {
            timeLeft--;
            const countElem = document.getElementById('ad-countdown');
            if (countElem) countElem.innerText = `${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                const btn = document.getElementById('btn-claim-ad');
                if (btn) {
                    btn.disabled = false;
                    btn.style.background = "#22c55e";
                    btn.style.color = "#ffffff";
                    btn.style.cursor = "pointer";
                    btn.innerText = "Lĩnh Thưởng & Tiếp Tục";
                    btn.onclick = () => {
                        document.body.removeChild(overlay);
                        if (typeof rewardCallback === 'function') {
                            rewardCallback();
                        }
                    };
                }
            }
        }, 1000);
    }
};
