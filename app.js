// --- DANH SÁCH CẢNH GIỚI VÀ CHỈ SỐ ---
const REALMS = [
  {
    rank: "Phàm Nhân",
    maxExp: 150,
    hp: 100,
    atk: 10,
    portrait: "assets/pham-nhan.jpg",
    sprite: "assets/truc-co.png"
  },
  {
    rank: "Luyện Khí Sơ Kỳ",
    maxExp: 400,
    hp: 250,
    atk: 25,
    portrait: "assets/luyen-khi.jpg",
    sprite: "assets/truc-co.png"
  },
  {
    rank: "Luyện Khí Viên Mãn",
    maxExp: 900,
    hp: 500,
    atk: 55,
    portrait: "assets/luyen-khi.jpg",
    sprite: "assets/truc-co.png"
  },
  {
    rank: "Trúc Cơ Sơ Kỳ",
    maxExp: 2000,
    hp: 1000,
    atk: 120,
    portrait: "assets/truc-co.jpg",
    sprite: "assets/truc-co-trung-ky.png"
  },
  {
    rank: "Trúc Cơ Viên Mãn",
    maxExp: 5000,
    hp: 2200,
    atk: 260,
    portrait: "assets/truc-co.jpg",
    sprite: "assets/truc-co-vien-man.png"
  }
];

// --- TRẠNG THÁI NGƯỜI CHƠI ---
let player = {
  realmIndex: 0,
  exp: 0,
  maxExp: REALMS[0].maxExp,
  rank: REALMS[0].rank,
  hp: REALMS[0].hp,
  atk: REALMS[0].atk,
  portrait: REALMS[0].portrait,
  sprite: REALMS[0].sprite
};

// Cấu hình quy tắc bế quan
const CONFIG = {
  TOTAL_TIME: 120,
  MAX_WRONG: 3,
  EXP_PER_CORRECT: 40
};

// Trạng thái phiên tu luyện
let cultState = {
  timer: null,
  timeLeft: 0,
  wrongCount: 0,
  correctCount: 0,
  totalExpGained: 0,
  isActive: false,
  currentQuestion: null,
  isAnswering: false
};

// Kho từ vựng
let vocabularies = [];

// Quản lý âm thanh
let bgmAudio = null;
let isAudioMuted = false;

// --- KHỞI CHẠY GAME ---
window.addEventListener('DOMContentLoaded', async () => {
  loadPlayerData();
  updatePlayerUI();
  initAudioSystem();
  await loadVocabulariesFromCSV();

  // Đăng ký Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn("Lỗi đăng ký Service Worker:", err);
    });
  }

  // Khóa xoay ngang nếu trình duyệt hỗ trợ
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
});

// --- LƯU TRỮ VÀ NẠP DỮ LIỆU ---
function savePlayerData() {
  localStorage.setItem('vltd_save_v1', JSON.stringify(player));
}

function loadPlayerData() {
  const saved = localStorage.getItem('vltd_save_v1');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      player = { ...player, ...data };
      // Đảm bảo chỉ số khớp với cảnh giới hiện tại
      const currentConfig = REALMS[player.realmIndex] || REALMS[0];
      player.rank = currentConfig.rank;
      player.maxExp = currentConfig.maxExp;
      player.hp = currentConfig.hp;
      player.atk = currentConfig.atk;
      player.portrait = currentConfig.portrait;
      player.sprite = currentConfig.sprite;
    } catch (e) {
      console.warn("Lỗi phân tích save game, sử dụng dữ liệu mặc định:", e);
    }
  }
}

function updatePlayerUI() {
  document.getElementById('player-exp').textContent = player.exp;
  document.getElementById('player-max-exp').textContent = player.maxExp;
  document.getElementById('player-rank').textContent = player.rank;
  document.getElementById('player-hp').textContent = player.hp;
  document.getElementById('player-atk').textContent = player.atk;

  const avatarEl = document.getElementById('player-avatar');
  if (avatarEl && player.portrait) {
    avatarEl.src = player.portrait;
  }

  const expPercent = Math.min(100, Math.floor((player.exp / player.maxExp) * 100));
  const bar = document.getElementById('player-exp-bar');
  if (bar) bar.style.width = `${expPercent}%`;
}

// --- NẠP DỮ LIỆU TỪ VỰNG TỪ CSV ---
async function loadVocabulariesFromCSV() {
  try {
    const res = await fetch('./a1_vocab.csv');
    if (!res.ok) throw new Error("Không thể fetch a1_vocab.csv");
    const text = await res.text();
    const lines = text.trim().split('\n');

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 6) {
        const [hanzi, pinyin, meaning, opt1, opt2, opt3] = parts;
        parsed.push({
          hanzi,
          pinyin,
          correct: meaning,
          options: [meaning, opt1, opt2, opt3]
        });
      }
    }

    if (parsed.length > 0) {
      vocabularies = parsed;
      return;
    }
  } catch (err) {
    console.warn("Nạp CSV thất bại, chuyển sang kho từ vựng dự phòng:", err);
  }

  // Danh sách dự phòng nếu không đọc được tệp CSV
  vocabularies = [
    { hanzi: "修仙", pinyin: "Xiūxiān", correct: "Tu tiên", options: ["Tu tiên", "Luyện kiếm", "Bế quan", "Hóa thần"] },
    { hanzi: "灵气", pinyin: "Língqì", correct: "Linh khí", options: ["Linh khí", "Chân hỏa", "Yêu khí", "Ma niệm"] },
    { hanzi: "突破", pinyin: "Tūpò", correct: "Đột phá", options: ["Đột phá", "Thất bại", "Nhập ma", "Xuất quan"] },
    { hanzi: "丹田", pinyin: "Dāntián", correct: "Đan điền", options: ["Đan điền", "Kinh mạch", "Thần thức", "Tâm hải"] }
  ];
}

// --- HỆ THỐNG ÂM THANH ---
function initAudioSystem() {
  bgmAudio = document.getElementById('bgm-player');
  if (!bgmAudio) return;

  bgmAudio.volume = 0.4;

  const unlockAudio = () => {
    if (!isAudioMuted && bgmAudio.paused) {
      bgmAudio.play().catch(() => {});
    }
    window.removeEventListener('pointerdown', unlockAudio);
  };

  window.addEventListener('pointerdown', unlockAudio);
}

function toggleBGM() {
  if (!bgmAudio) return;
  const btn = document.getElementById('audio-toggle-btn');

  if (bgmAudio.paused) {
    bgmAudio.play().then(() => {
      isAudioMuted = false;
      btn.classList.remove('muted');
      btn.textContent = '🎵';
    }).catch(() => {});
  } else {
    bgmAudio.pause();
    isAudioMuted = true;
    btn.classList.add('muted');
    btn.textContent = '🔇';
  }
}

// --- BẮT ĐẦU BẾ QUAN ---
function openCultivation() {
  if (vocabularies.length === 0) {
    alert("Khẩu quyết chưa sẵn sàng, vui lòng thử lại sau giây lát!");
    return;
  }

  document.getElementById('main-lobby').classList.add('hidden');
  document.getElementById('cultivation-screen').classList.remove('hidden');

  // Khởi tạo lại trạng thái
  cultState.isActive = true;
  cultState.isAnswering = false;
  cultState.timeLeft = CONFIG.TOTAL_TIME;
  cultState.wrongCount = 0;
  cultState.correctCount = 0;
  cultState.totalExpGained = 0;

  // Cập nhật sprite tu luyện tương ứng với cảnh giới hiện tại
  const spriteEl = document.getElementById('cultivation-sprite');
  if (spriteEl && player.sprite) {
    spriteEl.src = player.sprite;
  }

  updateLivesUI();
  updateTimerUI();

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

// --- ĐIỀU PHỐI CÂU HỎI & ĐÁP ÁN ---
function loadNextQuestion() {
  if (!cultState.isActive) return;
  cultState.isAnswering = false;

  const randomIndex = Math.floor(Math.random() * vocabularies.length);
  cultState.currentQuestion = vocabularies[randomIndex];

  document.getElementById('quiz-hanzi').textContent = cultState.currentQuestion.hanzi;
  document.getElementById('quiz-pinyin').textContent = cultState.currentQuestion.pinyin;

  const optionsBox = document.getElementById('quiz-options');
  optionsBox.innerHTML = '';

  // Trộn đáp án ngẫu nhiên
  const shuffledOptions = [...cultState.currentQuestion.options].sort(() => Math.random() - 0.5);

  shuffledOptions.forEach((optText) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = optText;
    btn.onclick = () => checkAnswer(optText, btn);
    optionsBox.appendChild(btn);
  });
}

function checkAnswer(selectedMeaning, clickedBtn) {
  if (!cultState.isActive || cultState.isAnswering) return;
  cultState.isAnswering = true;

  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach((b) => (b.style.pointerEvents = 'none'));

  const isCorrect = selectedMeaning === cultState.currentQuestion.correct;

  if (isCorrect) {
    clickedBtn.classList.add('btn-correct');
    cultState.correctCount++;
    cultState.totalExpGained += CONFIG.EXP_PER_CORRECT;
  } else {
    clickedBtn.classList.add('btn-wrong');
    // Làm sáng đáp án đúng để người chơi đối chiếu
    allBtns.forEach((b) => {
      if (b.textContent === cultState.currentQuestion.correct) {
        b.classList.add('btn-correct');
      }
    });

    cultState.wrongCount++;
    updateLivesUI();
  }

  setTimeout(() => {
    if (cultState.wrongCount >= CONFIG.MAX_WRONG) {
      stopCultivation('wrong_limit');
    } else if (cultState.isActive) {
      loadNextQuestion();
    }
  }, 450);
}

// --- DỪNG BẾ QUAN & TÍNH ĐỘT PHÁ ---
function stopCultivation(reason) {
  if (!cultState.isActive) return;
  cultState.isActive = false;
  clearInterval(cultState.timer);

  // Cộng dồn Tu vi
  player.exp += cultState.totalExpGained;

  // Kiểm tra Đột phá cảnh giới
  let hasBreakthrough = false;
  while (player.realmIndex < REALMS.length - 1 && player.exp >= player.maxExp) {
    player.exp -= player.maxExp;
    player.realmIndex++;

    const nextRealm = REALMS[player.realmIndex];
    player.rank = nextRealm.rank;
    player.maxExp = nextRealm.maxExp;
    player.hp = nextRealm.hp;
    player.atk = nextRealm.atk;
    player.portrait = nextRealm.portrait;
    player.sprite = nextRealm.sprite;
    hasBreakthrough = true;
  }

  savePlayerData();
  updatePlayerUI();

  // Cấu hình nội dung thông báo
  const title = document.getElementById('summary-title');
  const reasonText = document.getElementById('summary-reason');
  const breakthroughNotice = document.getElementById('breakthrough-notice');

  if (reason === 'wrong_limit') {
    title.textContent = "💥 Tẩu Hỏa Nhập Ma!";
    title.style.color = "#ef4444";
    reasonText.textContent = "Đạo hữu chọn sai 3 lần, tâm ma quấy nhiễu, buộc phải xuất quan tĩnh dưỡng.";
  } else if (reason === 'timeout') {
    title.textContent = "⌛ Mãn Hạn Bế Quan!";
    title.style.color = "#ffd700";
    reasonText.textContent = "Thời hạn tịnh tu đã dứt, chân khí tự động quy về đan điền.";
  } else {
    title.textContent = "🚪 Chủ Động Xuất Quan";
    title.style.color = "#38bdf8";
    reasonText.textContent = "Đạo hữu đã chủ động thu công, bảo toàn toàn bộ tu vi lĩnh ngộ.";
  }

  document.getElementById('summary-correct').textContent = cultState.correctCount;
  document.getElementById('summary-exp').textContent = `+${cultState.totalExpGained}`;

  if (hasBreakthrough) {
    breakthroughNotice.classList.remove('hidden');
    breakthroughNotice.textContent = `✨ Chúc mừng Đạo hữu đã đột phá lên ${player.rank}! ✨`;
  } else {
    breakthroughNotice.classList.add('hidden');
  }

  document.getElementById('cultivation-summary-modal').classList.remove('hidden');
}

// --- ĐÓNG BẢNG TỔNG KẾT ---
function closeCultivationModal() {
  document.getElementById('cultivation-summary-modal').classList.add('hidden');
  document.getElementById('cultivation-screen').classList.add('hidden');
  document.getElementById('main-lobby').classList.remove('hidden');
}
