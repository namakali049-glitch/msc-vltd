// --- DỮ LIỆU NGƯỜI CHƠI (Tạm thời lưu ở biến local) ---
let player = {
  exp: 0,
  maxExp: 1000,
  rank: "Luyện Khí Kỳ"
};

// --- NGÂN HÀNG TỪ VỰNG ---
const vocabularies = [
  { word: "Heaven", options: ["Thiên Cung", "Địa Ngục", "Trần Gian", "Tu La"], correct: "Thiên Cung" },
  { word: "Sword", options: ["Đao", "Kiếm", "Thương", "Cung"], correct: "Kiếm" },
  { word: "Soul", options: ["Thể xác", "Linh hồn", "Vũ khí", "Pháp bảo"], correct: "Linh hồn" },
  { word: "Immortal", options: ["Người phàm", "Yêu quái", "Bất tử / Tiên nhân", "Ma tôn"], correct: "Bất tử / Tiên nhân" }
];

// --- CẤU HÌNH TU LUYỆN ---
const CONFIG = {
  TOTAL_TIME: 120,    // Bế quan 120 giây (2 phút)
  MAX_WRONG: 3,       // Tối đa 3 mạng (Tâm ma)
  EXP_PER_CORRECT: 50 // 50 điểm Tu vi cho mỗi câu đúng
};

let cultState = {
  timer: null,
  timeLeft: 0,
  wrongCount: 0,
  correctCount: 0,
  totalExpGained: 0,
  isActive: false,
  currentQuestion: null
};

// --- KHỞI TẠO GAME ---
window.onload = function initGame() {
  updatePlayerUI();
  // Yêu cầu khóa xoay ngang tự động nếu điện thoại hỗ trợ API
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(e => console.log("Không thể ép xoay ngang: ", e));
  }
};

function updatePlayerUI() {
  document.getElementById('player-exp').textContent = player.exp;
  document.getElementById('player-max-exp').textContent = player.maxExp;
  document.getElementById('player-rank').textContent = player.rank;
}

// --- BẮT ĐẦU BẾ QUAN ---
function openCultivation() {
  document.getElementById('main-lobby').classList.add('hidden');
  document.getElementById('cultivation-screen').classList.remove('hidden');

  // Khôi phục trạng thái
  cultState.isActive = true;
  cultState.timeLeft = CONFIG.TOTAL_TIME;
  cultState.wrongCount = 0;
  cultState.correctCount = 0;
  cultState.totalExpGained = 0;

  updateLivesUI();
  updateTimerUI();
  
  // Bật đồng hồ
  clearInterval(cultState.timer);
  cultState.timer = setInterval(() => {
    cultState.timeLeft--;
    updateTimerUI();
    if (cultState.timeLeft <= 0) {
      stopCultivation('timeout');
    }
  }, 1000);

  loadNextQuestion();
}

function updateTimerUI() {
  const min = Math.floor(cultState.timeLeft / 60);
  const sec = cultState.timeLeft % 60;
  document.getElementById('cultivation-timer').textContent = 
    `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function updateLivesUI() {
  const hearts = document.querySelectorAll('.life-icon');
  hearts.forEach((heart, idx) => {
    if (idx < CONFIG.MAX_WRONG - cultState.wrongCount) {
      heart.classList.remove('lost');
    } else {
      heart.classList.add('lost');
    }
  });
}

// --- XỬ LÝ CÂU HỎI ---
function loadNextQuestion() {
  if (!cultState.isActive) return;

  // Chọn ngẫu nhiên 1 câu hỏi
  const randomIndex = Math.floor(Math.random() * vocabularies.length);
  cultState.currentQuestion = vocabularies[randomIndex];

  document.getElementById('quiz-question').textContent = `Nghĩa của từ: "${cultState.currentQuestion.word}"?`;

  const optionsBox = document.getElementById('quiz-options');
  optionsBox.innerHTML = '';

  // Xáo trộn 4 đáp án để tránh thuộc lòng vị trí
  const shuffledOptions = [...cultState.currentQuestion.options].sort(() => Math.random() - 0.5);

  shuffledOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.onclick = () => checkAnswer(opt);
    optionsBox.appendChild(btn);
  });
}

function checkAnswer(selectedWord) {
  if (!cultState.isActive) return;

  if (selectedWord === cultState.currentQuestion.correct) {
    // Trả lời đúng
    cultState.correctCount++;
    cultState.totalExpGained += CONFIG.EXP_PER_CORRECT;
    loadNextQuestion();
  } else {
    // Trả lời sai (Tâm ma xâm nhập)
    cultState.wrongCount++;
    updateLivesUI();
    
    if (cultState.wrongCount >= CONFIG.MAX_WRONG) {
      stopCultivation('wrong_limit');
    } else {
      loadNextQuestion();
    }
  }
}

// --- DỪNG BẾ QUAN (TỔNG KẾT) ---
function stopCultivation(reason) {
  if (!cultState.isActive) return;
  cultState.isActive = false;
  clearInterval(cultState.timer);

  // Cộng dồn Tu vi
  player.exp += cultState.totalExpGained;
  
  // Logic đột phá cảnh giới (Ví dụ cơ bản)
  if (player.exp >= player.maxExp) {
    player.exp = player.exp - player.maxExp;
    player.maxExp = Math.floor(player.maxExp * 1.5);
    player.rank = "Trúc Cơ Kỳ"; 
  }
  updatePlayerUI();

  // Xác định lý do dừng để hiển thị bảng thông báo
  const title = document.getElementById('summary-title');
  const reasonText = document.getElementById('summary-reason');
  
  if (reason === 'wrong_limit') {
    title.textContent = "💥 Tẩu Hỏa Nhập Ma!";
    title.style.color = "#ff4d4d";
    reasonText.textContent = "Đạo hữu chọn sai 3 lần, tâm trí bất định, buộc phải xuất quan.";
  } else if (reason === 'timeout') {
    title.textContent = "⌛ Mãn Hạn Bế Quan!";
    title.style.color = "#ffd700";
    reasonText.textContent = "Thời hạn tịnh tu đã kết thúc, chân khí tự động quy về đan điền.";
  } else {
    title.textContent = "🚪 Chủ Động Xuất Quan";
    title.style.color = "#00ffcc";
    reasonText.textContent = "Đạo hữu đã chủ động thu công, kết thúc quá trình tu luyện.";
  }

  // Nạp kết quả vào Modal
  document.getElementById('summary-correct').textContent = cultState.correctCount;
  document.getElementById('summary-exp').textContent = `+${cultState.totalExpGained}`;
  document.getElementById('cultivation-summary-modal').classList.remove('hidden');
}

// --- ĐÓNG BẢNG TỔNG KẾT ---
function closeCultivationModal() {
  document.getElementById('cultivation-summary-modal').classList.add('hidden');
  document.getElementById('cultivation-screen').classList.add('hidden');
  document.getElementById('main-lobby').classList.remove('hidden');
}
