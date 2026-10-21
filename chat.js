// ==========================================
// HỆ THỐNG TRUYỀN ÂM THẾ GIỚI (WORLD CHAT)
// ==========================================
import { 
    getDatabase, 
    ref, 
    push, 
    query, 
    limitToLast, 
    onChildAdded, 
    get, 
    remove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let database = null;
let chatRef = null;

// Hàm hỗ trợ lấy tham chiếu Database an toàn
function getChatRef() {
    if (!database) {
        database = getDatabase(); // Lúc này app.js đã initializeApp xong
        chatRef = ref(database, 'chats');
    }
    return chatRef;
}

let isChatListenerAttached = false;

// 1. MỞ KHUNG CHAT & NẠP TIN NHẮN
window.openWorldChat = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('chatModal');
    if (modal) modal.style.display = 'flex';

    const input = document.getElementById('chatInput');
    const counter = document.getElementById('chatCharCount');
    if (input && counter) {
        input.oninput = () => {
            counter.innerText = `${input.value.length}/100 ký tự`;
        };
    }

    if (!isChatListenerAttached) {
        attachChatListener();
        isChatListenerAttached = true;
    }
    scrollChatToBottom();
};

window.closeWorldChat = function() {
    if (window.playClickSound) window.playClickSound();
    const modal = document.getElementById('chatModal');
    if (modal) modal.style.display = 'none';
};

// 2. LẮNG NGHE TIN NHẮN (TỐI ĐA 50 TIN GẦN NHẤT)
function attachChatListener() {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    box.innerHTML = '';

    const chatQuery = query(getChatRef(), limitToLast(50));
    onChildAdded(chatQuery, (snapshot) => {
        const msg = snapshot.val();
        renderMessageItem(msg);
        scrollChatToBottom();
    });
}

function renderMessageItem(msg) {
    const box = document.getElementById('chatMessages');
    if (!box) return;

    const div = document.createElement('div');
    div.className = 'chat-msg-item';
    div.innerHTML = `
        <span class="chat-badge">${msg.realm || 'Phàm Nhân'}</span>
        <span class="chat-sender">${escapeHtml(msg.sender)}:</span>
        <span class="chat-text">${escapeHtml(msg.text)}</span>
    `;
    box.appendChild(div);
}

function scrollChatToBottom() {
    const box = document.getElementById('chatMessages');
    if (box) {
        setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
    }
}

// 3. GỬI TIN NHẮN & TỰ ĐỘNG XÓA TIN NHẮN THỪA TRÊN SERVER
window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    if (text.length > 100) {
        alert("⚠️ Nội dung truyền âm không được vượt quá 100 ký tự!");
        return;
    }

    const senderName = (window.currentUser && (window.currentUser.displayName || (window.currentUser.email && window.currentUser.email.split('@')[0]))) || "Đạo Hữu Ẩn Danh";
    const realmFunc = window.calculateRealm || (() => "Phàm Nhân");
    const currentRealm = realmFunc(window.lifetimeMana || 0);

    input.value = '';
    const counter = document.getElementById('chatCharCount');
    if (counter) counter.innerText = "0/100 ký tự";

    if (window.playClickSound) window.playClickSound();

    try {
        await push(chatRef, {
            sender: senderName,
            realm: currentRealm,
            text: text,
            timestamp: Date.now()
        });

        cleanOldMessages();
    } catch (e) {
        console.error("Lỗi gửi tin nhắn:", e);
        alert("❌ Lỗi truyền âm, đạo hữu vui lòng thử lại!");
    }
};

async function cleanOldMessages() {
    try {
        const snapshot = await get(chatRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const keys = Object.keys(data);
            if (keys.length > 50) {
                keys.sort((a, b) => (data[a].timestamp || 0) - (data[b].timestamp || 0));
                const deleteCount = keys.length - 50;
                for (let i = 0; i < deleteCount; i++) {
                    await remove(ref(database, 'chats/' + keys[i]));
                }
            }
        }
    } catch(e) {
        // Bỏ qua lỗi dọn dẹp để không gián đoạn giao diện chat
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
