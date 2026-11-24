/* ============================================================
   Дари · Аудирование — приложение
   Vanilla JS, hash-роутинг, прогресс в localStorage.
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.DARI_DATA;
  const APP = document.getElementById("app");
  const STORAGE_KEY = "dari-progress-v1";

  if (!DATA) {
    APP.innerHTML = '<div class="page"><div class="empty-state"><h3>Не удалось загрузить данные</h3><p>Проверьте файл js/data.js.</p></div></div>';
    return;
  }

  /* ---------- Утилиты ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (value) =>
    String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
  const pad = (n) => String(n).padStart(2, "0");
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const uniq = (arr, key = (x) => x) => {
    const seen = new Set();
    return arr.filter((item) => {
      const value = key(item);
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  };
  const shuffle = (arr) => {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const sample = (arr, count) => shuffle(arr).slice(0, count);
  const basename = (path) => String(path || "").split("/").pop() || "";
  const stripExt = (name) => String(name || "").replace(/\.[^.]+$/, "");
  const isArabic = (text) => /[\u0600-\u06FF]/.test(String(text || ""));
  const plural = (n, forms) => {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  };
  const dateLabel = () => {
    const text = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const solarDateLabel = () => new Intl.DateTimeFormat("fa-AF-u-ca-persian", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 5) return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  };
  const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayDiff = (a, b) => {
    if (!a || !b) return Infinity;
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
  };
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${pad(s)}`;
  };
  const fileExt = (name) => (String(name).split(".").pop() || "").toLowerCase();
  const AUDIO_EXT = ["mp3", "wav", "m4a", "ogg", "aac", "flac", "opus"];
  const isAudio = (name) => AUDIO_EXT.includes(fileExt(name));
  const isPdf = (name) => fileExt(name) === "pdf";
  const driveDownload = (id) => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download`;
  const drivePdf = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  const drivePreview = (id) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  const docPdf = (id) => `https://docs.google.com/document/d/${encodeURIComponent(id)}/preview`;
  const driveFolder = (id) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;

  /* ---------- Иконки ---------- */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    alphabet: '<path d="M4 5.5h6.5A3.5 3.5 0 0 1 14 9v11a2.5 2.5 0 0 0-2.5-2.5H4z"/><path d="M20 5.5h-2.5A3.5 3.5 0 0 0 14 9v11a2.5 2.5 0 0 1 2.5-2.5H20z"/><path d="M7 9.5h3M7 12.5h3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    cards: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    wave: '<path d="M3 12h2M7 7v10M11 3v18M15 7v10M19 10v4M22 12h-1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z"/>',
    back10: '<path d="M11 7 4 12l7 5z"/><path d="M20 7l-7 5 7 5z"/>',
    forward10: '<path d="M13 7l7 5-7 5z"/><path d="M4 7l7 5-7 5z"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    arrowLeft: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19v2h16v-2"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-6.7 0-2.6-1.4-4.7-3.4-6.5-.8 1.6-2 2.6-3.2 3.2.2-3.5-1-6.1-3-8.5.2 3.3-1.3 5.1-2.8 7.1a9.8 9.8 0 0 0-1.6 4.7C5 19.2 8 22 12 22Z"/>',
    sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v3M17.5 17.5h3M5 4v3M3.5 5.5h3"/>',
    headphones: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.5M3 12h.5M3 18h.5"/>',
    rotate: '<path d="M3 12a9 9 0 0 1 15-6.7M21 3v6h-6"/><path d="M21 12a9 9 0 0 1-15 6.7M3 21v-6h6"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    shield: '<path d="M12 3 5 6v6c0 4.5 2.8 7.7 7 9 4.2-1.3 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    bookOpen: '<path d="M3 5h7a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 5h-3a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7"/>',
    star: '<path d="m12 3.5 2.6 5.6 6 .8-4.4 4.3 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.9l6-.8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    heart: '<path d="M20.8 5.9a5 5 0 0 0-7.1 0L12 7.6l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8A5 5 0 0 0 20.8 5.9Z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
    quote: '<path d="M9 7H5v5h4v5H5M19 7h-4v5h4v5h-4"/>',
    flip: '<path d="M3 12a9 9 0 0 1 15-6.7M21 3v6h-6"/><path d="M21 12a9 9 0 0 1-15 6.7M3 21v-6h6"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
  };
  const svg = (name) => {
    const body = ICONS[name] || ICONS.file;
    const filled = name === "play" || name === "pause" || name === "back10" || name === "forward10";
    return `<svg class="icon${filled ? " icon-filled" : ""}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  };
  const hydrateIcons = (root = document) => {
    $$("[data-icon]", root).forEach((el) => {
      if (el.dataset.iconDone === "1") return;
      el.innerHTML = svg(el.dataset.icon);
      el.dataset.iconDone = "1";
    });
  };

  /* ---------- Состояние ---------- */
  const freshState = () => ({
    version: 1,
    xp: 0,
    streak: 0,
    lastVisit: null,
    days: {},
    letters: {},
    intro: {},
    lessons: {},
    semesterTwoLessons: {},
    words: {},
    textbook2Words: {},
    introWords: {},
    awarded: {},
    recent: [],
    quizBest: {},
  });
  let state = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      state = Object.assign(freshState(), saved);
      state.letters = state.letters || {};
      state.intro = state.intro || {};
      state.lessons = state.lessons || {};
      state.semesterTwoLessons = state.semesterTwoLessons || {};
      state.words = state.words || {};
      state.textbook2Words = state.textbook2Words || {};
      state.introWords = state.introWords || {};
      state.awarded = state.awarded || {};
      state.recent = state.recent || [];
      state.days = state.days || {};
      state.quizBest = state.quizBest || {};
    }
  } catch (error) {
    state = freshState();
  }

  const saveState = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* приватный режим — просто продолжаем без сохранения */
    }
  };

  const initDay = () => {
    const today = dayKey();
    if (state.lastVisit !== today) {
      const diff = dayDiff(state.lastVisit, today);
      if (!state.lastVisit) state.streak = 1;
      else if (diff === 1) state.streak = (state.streak || 0) + 1;
      else if (diff > 1) state.streak = 1;
      state.lastVisit = today;
    }
    if (!state.days[today]) state.days[today] = 0;
    saveState();
  };

  const addXp = (amount) => {
    const value = Number(amount) || 0;
    const today = dayKey();
    state.xp = (state.xp || 0) + value;
    state.days[today] = (state.days[today] || 0) + value;
    saveState();
  };

  const awardOnce = (key, amount) => {
    if (state.awarded[key]) return false;
    state.awarded[key] = true;
    addXp(amount);
    return true;
  };

  const lettersKnown = () => Object.keys(state.letters).length;
  const lessonsDone = () => Object.keys(state.lessons).length;
  const introDone = () => Object.keys(state.intro).length;

  let cardCache = null;
  const allCards = () => {
    if (cardCache) return cardCache;
    cardCache = [];
    DATA.vocab.packs.forEach((pack) => {
      pack.cards.forEach((card, index) => {
        cardCache.push({ pack, card, index, key: `${pack.id}:${index}` });
      });
    });
    return cardCache;
  };
  const wordsDone = () => allCards().filter((item) => state.words[item.key]).length;
  const packKnown = (pack) => pack.cards.filter((_, index) => state.words[`${pack.id}:${index}`]).length;
  const overallProgress = () => {
    const parts = [
      lettersKnown() / DATA.meta.counts.letters,
      allLessonsDone() / Math.max(1, allLessonsTotal()),
      allWordCardsDone() / Math.max(1, allWordCardsTotal()),
    ];
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
  };

  const remember = (item) => {
    state.recent = [{ ...item, at: Date.now() }, ...state.recent.filter((x) => x.href !== item.href)].slice(0, 6);
    saveState();
  };

  /* ---------- UI-состояние ---------- */
  const ui = {
    alphabetTab: "letters",
    letterGroup: "all",
    lessonTag: "all",
    lessonQuery: "",
    semesterTwoQuery: "",
    semesterTwoTag: "all",
    libQuery: "",
    packView: "cards",
    flashIndex: 0,
    flashPack: null,
    flashFlipped: false,
    practiceMode: "words",
    practiceCount: 10,
    textbook2View: "cards",
    textbook2Orders: {},
    packOrders: {},
    packRussianFirst: {},
    textbook2RussianFirst: {},
    phraseIndex: 0,
    phraseView: "cards",
    phraseLesson: null,
  };

  /* ---------- Плеер ---------- */
  const audio = new Audio();
  audio.preload = "metadata";
  const player = document.getElementById("player");
  const playerTitle = document.getElementById("player-title");
  const playerSubtitle = document.getElementById("player-subtitle");
  const playerCurrent = document.getElementById("player-current");
  const playerDuration = document.getElementById("player-duration");
  const playerSeek = document.getElementById("player-seek");
  const playerBar = document.getElementById("player-progress-bar");
  let playerQueue = [];
  let playerIndex = -1;
  let playerItem = null;

  const setPlayerToggle = (playing) => {
    $$("[data-player-toggle] .player-toggle-icon, .player-toggle .player-toggle-icon").forEach((el) => {
      el.innerHTML = svg(playing ? "pause" : "play");
    });
    const main = $(".player-toggle");
    if (main) main.innerHTML = svg(playing ? "pause" : "play");
  };

  const showPlayer = (item) => {
    player.hidden = false;
    document.body.classList.add("has-player");
    playerTitle.textContent = item.title || "Аудио";
    playerSubtitle.textContent = item.subtitle || "";
    playerCurrent.textContent = "0:00";
    playerDuration.textContent = "0:00";
    playerSeek.value = "0";
    if (playerBar) playerBar.style.width = "0%";
    player.classList.add("loading");
  };

  const playItem = (item, queue = [], index = -1) => {
    if (!item || !item.src) return;
    if (playerItem && playerItem.src === item.src) {
      if (audio.paused) {
        audio.play().catch(() => toast("Не удалось запустить запись", "info"));
      } else {
        audio.pause();
      }
      return;
    }
    playerItem = item;
    playerQueue = queue || [];
    playerIndex = index;
    showPlayer(item);
    audio.src = item.src;
    audio.play().catch(() => {
      player.classList.remove("loading");
      toast("Запись не открылась. Проверьте соединение и попробуйте ещё раз.", "info");
    });
  };

  const playQueue = (queue, index = 0) => {
    if (!queue.length) return;
    const i = clamp(index, 0, queue.length - 1);
    playItem(queue[i], queue, i);
  };

  const queueItems = (key) => {
    if (!key) return [];
    if (key === "alphabet") {
      return DATA.alphabetAudio.map((item) => ({
        src: item.path,
        title: item.title,
        subtitle: "Аудиокурс алфавита",
      }));
    }
    if (key.startsWith("intro:")) {
      const intro = DATA.intro.find((x) => x.id === key.slice(6));
      if (!intro) return [];
      return intro.audioFiles.map((src) => ({
        src,
        title: stripExt(basename(src)),
        subtitle: `Вводный урок ${intro.id} · ${intro.title}`,
      }));
    }
    if (key.startsWith("lesson:")) {
      const num = Number(key.slice(7));
      const lesson = DATA.lessons.find((x) => x.num === num);
      if (!lesson) return [];
      return lesson.tracks.map((track) => ({
        src: track.src,
        title: `${track.code} · ${track.label}`,
        subtitle: `Урок ${num} · ${lesson.titleRu}`,
      }));
    }
    if (key.startsWith("trainer:")) {
      const trainer = DATA.vocab.trainers.find((x) => x.id === key.slice(8));
      if (!trainer) return [];
      return trainer.audio.map((file, i) => ({
        src: file.path,
        title: `Запись ${i + 1}`,
        subtitle: trainer.title,
      }));
    }
    if (key.startsWith("pack:")) {
      const pack = DATA.vocab.packs.find((x) => x.id === key.slice(5));
      if (!pack) return [];
      return pack.cards.filter((c) => c.audio).map((card) => ({
        src: card.audio,
        title: card.dari,
        subtitle: `${card.translit || ""}${card.ru ? " — " + card.ru : ""}`,
      }));
    }
    return [];
  };

  audio.addEventListener("play", () => {
    setPlayerToggle(true);
    player.classList.remove("loading");
  });
  audio.addEventListener("pause", () => setPlayerToggle(false));
  audio.addEventListener("waiting", () => player.classList.add("loading"));
  audio.addEventListener("playing", () => player.classList.remove("loading"));
  audio.addEventListener("loadedmetadata", () => {
    playerDuration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    const duration = audio.duration;
    if (Number.isFinite(duration) && duration > 0) {
      const pct = (audio.currentTime / duration) * 100;
      playerSeek.value = String(Math.round(pct * 10));
      playerCurrent.textContent = formatTime(audio.currentTime);
      playerDuration.textContent = formatTime(duration);
      if (playerBar) playerBar.style.width = `${pct}%`;
    }
  });
  audio.addEventListener("ended", () => {
    player.classList.remove("loading");
    if (playerQueue.length && playerIndex >= 0 && playerIndex + 1 < playerQueue.length) {
      playQueue(playerQueue, playerIndex + 1);
    } else {
      setPlayerToggle(false);
      playerCurrent.textContent = "0:00";
      playerSeek.value = "0";
      if (playerBar) playerBar.style.width = "0%";
    }
  });
  audio.addEventListener("error", () => {
    player.classList.remove("loading");
    setPlayerToggle(false);
    toast("Не удалось воспроизвести запись. Проверьте соединение и попробуйте ещё раз.", "info");
  });

  playerSeek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(playerSeek.value) / 1000) * audio.duration;
      if (playerBar) playerBar.style.width = `${(Number(playerSeek.value) / 10)}%`;
    }
  });

  /* ---------- Тосты и модальные окна ---------- */
  const toast = (message, iconName = "check") => {
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `${svg(iconName)}<span>${esc(message)}</span>`;
    root.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 320);
    }, 2900);
  };

  const modalRoot = document.getElementById("modal-root");
  let modalOnClose = null;
  let modalReturnFocus = null;
  const openModal = (content, options = {}) => {
    const wide = options.wide ? " modal-wide" : options.small ? " modal-sm" : "";
    modalReturnFocus = document.activeElement;
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal${wide}" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(options.label || "Окно")}">
          <button class="icon-button modal-close" type="button" data-close-modal aria-label="Закрыть">${svg("close")}</button>
          <div class="modal-body">${content}</div>
        </div>
      </div>`;
    document.body.classList.add("modal-open");
    modalOnClose = options.onClose || null;
    hydrateIcons(modalRoot);
    setTimeout(() => {
      const panel = $(".modal", modalRoot);
      if (panel) panel.focus({ preventScroll: true });
    }, 30);
  };
  const closeModal = (options = {}) => {
    const had = modalRoot.innerHTML.trim().length > 0;
    const returnFocus = modalReturnFocus;
    modalReturnFocus = null;
    modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
    if (typeof modalOnClose === "function") modalOnClose();
    modalOnClose = null;
    if (had && options.syncHash !== false && location.hash.startsWith("#/alphabet/letter/")) {
      history.replaceState(null, "", "#/alphabet");
    }
    if (returnFocus && returnFocus.isConnected) {
      setTimeout(() => returnFocus.focus({ preventScroll: true }), 0);
    }
  };

  const openLocalPdf = (path, title, subtitle = "", page = 1) => {
    const pageNumber = Math.max(1, Number(page) || 1);
    // Encode spaces and non-ASCII characters in archive filenames before using them as URLs.
    const fileUrl = encodeURI(path).replace(/#/g, "%23");
    const src = `${fileUrl}#${pageNumber > 1 ? `page=${pageNumber}&` : ""}view=FitH`;
    openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
      <div class="pdf-frame-wrap"><iframe src="${esc(src)}" title="${esc(title)}" loading="eager"></iframe></div>
      <div class="modal-actions">
        <a class="btn btn-ghost btn-sm" href="${esc(src)}" target="_blank" rel="noopener">${svg("external")} Открыть в новой вкладке</a>
        <a class="btn btn-soft btn-sm" href="${esc(fileUrl)}" download>${svg("download")} Скачать PDF</a>
      </div>`, { wide: true, label: title });
  };
  const openDrivePdf = (id, title, subtitle = "", page = 1) => {
    const pageNumber = Math.max(1, Number(page) || 1);
    const src = `${drivePdf(id)}${pageNumber > 1 ? `#page=${pageNumber}` : ""}`;
    openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
      <div class="pdf-frame-wrap"><iframe src="${esc(src)}" title="${esc(title)}" loading="lazy" allow="autoplay"></iframe></div>
      <div class="modal-actions">
        <a class="btn btn-ghost btn-sm" href="${esc(driveFolder(DATA.meta.driveFolderId))}" target="_blank" rel="noopener">${svg("external")} Открыть архив в Drive</a>
        <a class="btn btn-soft btn-sm" href="${esc(driveDownload(id))}" target="_blank" rel="noopener">${svg("download")} Скачать файл</a>
      </div>`, { wide: true, label: title });
  };
  const openDocPreview = (id, title) => {
    openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2><p>Описание архива и как им пользоваться</p></div>
      <div class="pdf-frame-wrap"><iframe src="${esc(docPdf(id))}" title="${esc(title)}" loading="lazy"></iframe></div>
      <div class="modal-actions">
        <a class="btn btn-ghost btn-sm" href="https://docs.google.com/document/d/${encodeURIComponent(id)}/edit" target="_blank" rel="noopener">${svg("external")} Открыть документ</a>
      </div>`, { wide: true, label: title });
  };
  const openDriveAudio = (id, title, subtitle = "") => {
    openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
      <div class="drive-audio-wrap"><iframe src="${esc(drivePreview(id))}" title="${esc(title)}" loading="eager" allow="autoplay; encrypted-media"></iframe></div>
      <p class="tiny muted" style="margin-top:10px">Плеер открывается из Google Drive и может загружаться 10–20 секунд. Нажмите «Воспроизвести» внутри окна. Если запись не загрузилась, откройте файл в новой вкладке.</p>
      <div class="modal-actions">
        <a class="btn btn-ghost btn-sm" href="${esc(drivePreview(id))}" target="_blank" rel="noopener">${svg("external")} Открыть в Drive</a>
        <a class="btn btn-soft btn-sm" href="${esc(driveDownload(id))}" target="_blank" rel="noopener">${svg("download")} Скачать аудио</a>
      </div>`, { wide: true, label: title });
  };

  /* ---------- Библиотека: индексы ---------- */
  let libIndexCache = null;
  const libIndex = () => {
    if (libIndexCache) return libIndexCache;
    const map = new Map();
    const walk = (nodes, trail) => {
      nodes.forEach((node) => {
        const nextTrail = trail.concat(node);
        map.set(node.id, { node, trail: nextTrail });
        walk(node.folders || [], nextTrail);
      });
    };
    walk(DATA.library, []);
    libIndexCache = map;
    return map;
  };
  const findLib = (id) => libIndex().get(id) || null;
  const libCountCache = new Map();
  const libFileCount = (node) => {
    if (libCountCache.has(node.id)) return libCountCache.get(node.id);
    const total = (node.files || []).length + (node.folders || []).reduce((sum, child) => sum + libFileCount(child), 0);
    libCountCache.set(node.id, total);
    return total;
  };

  let libSearchIndex = null;
  const getLibSearchIndex = () => {
    if (libSearchIndex) return libSearchIndex;
    const files = [];
    const folders = [];
    const walk = (nodes, trail) => {
      nodes.forEach((node) => {
        const nextTrail = trail.concat(node.name);
        folders.push({ node, path: nextTrail.join(" / ") });
        (node.files || []).forEach((file) => files.push({ file, path: nextTrail.join(" / ") }));
        walk(node.folders || [], nextTrail);
      });
    };
    walk([...(DATA.library || []), DATA.semesterTwo, DATA.semesterOneSupplementary, DATA.semesterOneTeacher].filter(Boolean), []);
    (DATA.rootFiles || []).forEach((file) => files.push({ file, path: "Корень аудиотеки" }));
    libSearchIndex = { files, folders };
    return libSearchIndex;
  };
  /* ---------- Главная ---------- */
  const continueItem = () => {
    if (state.recent.length) {
      const rec = state.recent[0];
      return { ...rec, eyebrow: "Продолжить с места", action: "Открыть" };
    }
    if (lettersKnown() < DATA.letters.length) {
      return {
        href: "#/alphabet", mark: "ا", eyebrow: "Начать с основ",
        title: "Алфавит дари", subtitle: "33 буквы, четыре формы и звучание. Начните с алифа — или сразу с любого урока.",
        action: "К алфавиту", meta: `${lettersKnown()} из ${DATA.letters.length} изучено`,
      };
    }
    if (lessonsDone() < DATA.lessons.length) {
      const next = DATA.lessons.find((lesson) => !state.lessons[lesson.num]) || DATA.lessons[0];
      return {
        href: `#/lesson/${next.num}`, mark: String(next.num), eyebrow: "Следующий урок",
        title: `${next.num}. ${next.titleRu}`, subtitle: next.summaryRu || "Аудирование, лексика и грамматика урока.",
        action: "Начать урок", meta: `${next.tracks.length} аудио · PDF`,
      };
    }
    return {
      href: "#/practice", mark: "✓", eyebrow: "Закрепить",
      title: "Пора проверить себя", subtitle: "Вы прошли алфавит и все сорок уроков. Осталось удержать материал в памяти.",
      action: "К практике", meta: "4 режима тренировки",
    };
  };

  const weekData = () => {
    const items = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = dayKey(d);
      items.push({
        key,
        label: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d),
        value: Number(state.days[key] || 0),
        today: i === 0,
      });
    }
    return items;
  };

  const statCard = (label, value, suffix, iconName, pct) => `
    <div class="stat-card">
      <div class="stat-top"><span>${esc(label)}</span>${svg(iconName)}</div>
      <div class="stat-value">${esc(value)}${suffix ? `<small>${esc(suffix)}</small>` : ""}</div>
      ${pct == null ? "" : `<div class="progress-track"><div class="progress-fill" style="width:${clamp(pct, 0, 100)}%"></div></div>`}
    </div>`;

  const renderHome = () => {
    const total = DATA.meta.counts;
    const lKnown = lettersKnown();
    const lDone = allLessonsDone();
    const allLessons = allLessonsTotal();
    const allWordsTotal = allWordCardsTotal();
    const wDone = allWordCardsDone();
    const rec = continueItem();
    const week = weekData();
    const weekMax = Math.max(1, ...week.map((x) => x.value));
    const weekTotal = week.reduce((sum, x) => sum + x.value, 0);
    const weekActive = week.filter((x) => x.value > 0).length;
    const recMark = rec.mark || "→";
    const dailyProverbs = [
      "خدا گفت که تو حرکت کن که من برکت کنم",
      "بیک گل بهار نمیشود",
      "پایت را برابر گلیمت دراز کن",
      "پنج انگشت برادر است برابر نیست",
      "مار گزیده از ریسمان دراز میترسد",
      "برادر با برادر حسابش برابر",
      "دیوار ها موش دارند و موش گوش",
      "زیر کاسه حتما نیم کاسه است",
      "انسان جایزالخطاست",
      "هر که ناموخت از گذشت روزگار\nنیز ناموزد زهیچ آموزگار",
      "عجاله کار شیطان است",
      "جویانده یابده",
      "کس نخارد پشت من\nجز ناخن انگشت من",
      "دنیا به کام ابلهان است",
      "قطره قطره دریا میشه",
      "حب‌الوطن من‌الایمان",
      "سیر از حال گرسنه خبر ندارد",
      "مزد آن گرفت جان برادر\nکه کار کرد",
      "حلوا حلوا گفتن\nشیرین نمی‌شود",
      "فلفل مبین که ریز است\nبشکن ببین که تیز است",
      "خواستن توانستن",
      "یک روز دیدی دوست\nدیگر برادر",
      "پارسال دوست، امسال آشنا",
      "آفتاب به یک انگشت پنهان نمی‌شود",
      "با نیک شینی نیک شوی\nبا دیگ شینی سیاه شوی",
      "و آن کس که تخم وفا را سبز نکرد در مزرعه دل\nزردرویی کشد در وقت درو",
      "تا تنور گرم است\nنان را باید پخت"
    ];
    const dailyProverb = dailyProverbs[Math.floor(Math.random() * dailyProverbs.length)];

    return `<div class="page">
      <div class="hero">
        <div class="hero-copy">
          <div class="hero-kicker"><span class="dot"></span>${esc(dateLabel())} <span class="solar-date" lang="fa-AF" dir="rtl">${esc(solarDateLabel())}</span> · курс аудирования</div>
          <h1>Учебные аудирования языка дари</h1>
          <p>Сайт находится в разработке</p>
          <div class="hero-actions">
            <a class="btn btn-gold btn-lg" href="${esc(rec.href)}">${svg("play")} Продолжить обучение</a>
            <a class="btn btn-ghost btn-lg" href="#/alphabet">Смотреть алфавит</a>
          </div>
        </div>

      </div>

      <section class="proverb-card" aria-labelledby="proverb-title">
        <div class="proverb-heading">
          <h2 id="proverb-title" lang="ru">Пословица дня</h2>
          <span lang="fa" dir="rtl">ضرب‌المثل روز</span>
        </div>
        <p class="proverb-text" lang="fa" dir="rtl">${esc(dailyProverb)}</p>
      </section>

      <div class="stats-grid">
        ${statCard("Буквы", `${lKnown}/${total.letters}`, "изучено", "alphabet", (lKnown / total.letters) * 100)}
        ${statCard("Уроки", `${lDone}/${allLessons}`, "пройдено", "book", (lDone / allLessons) * 100)}
        ${statCard("Слова", `${wDone}/${allWordsTotal}`, "изучено в карточках", "cards", (wDone / Math.max(1, allWordsTotal)) * 100)}
        ${statCard("Серия", String(state.streak || 0), plural(state.streak || 0, ["день", "дня", "дней"]), "flame", null)}
      </div>

      <div class="home-grid">
        <div class="continue-card">
          <div>
            <div class="continue-label">${svg("clock")} ${esc(rec.eyebrow)}</div>
            <h2>${esc(rec.title)}</h2>
            <p>${esc(rec.subtitle || "")}</p>
          </div>
          <div class="continue-bottom">
            <span class="continue-thumb">${esc(recMark)}</span>
            <a class="btn btn-primary" href="${esc(rec.href)}">${esc(rec.action || "Продолжить")} ${svg("arrowRight")}</a>
            <span class="small muted">${esc(rec.meta || `${fmt(state.xp)} XP всего`)}</span>
          </div>
        </div>
        <div class="week-card">
          <div class="week-head"><h3>Эта неделя</h3><span>${weekActive} ${plural(weekActive, ["день", "дня", "дней"])} практики</span></div>
          <div class="week-bars">
            ${week.map((day) => `<div class="week-bar ${day.today ? "today" : ""} ${day.value ? "has-xp" : ""}">
              <span>${day.value ? fmt(day.value) : ""}</span>
              <i style="height:${Math.max(6, Math.round((day.value / weekMax) * 100))}%"></i>
              <small>${esc(day.label)}</small>
            </div>`).join("")}
          </div>
          <div class="week-foot"><span>Заработано XP</span><strong>${fmt(weekTotal)}</strong></div>
        </div>
      </div>



      <div class="section-head">
        <div><h2>Разделы сайта</h2><p>Выберите учебный курс или материал для занятий.</p></div>
      </div>
      <div class="routes-grid">
        <a class="route-card" href="#/textbook-1" data-letter="📘">
          <span class="route-icon">${svg("bookOpen")}</span>
          <h3>Учебник: курс 1</h3><p>Первый курс учебника</p>
        </a>
        <a class="route-card" href="#/textbook-2" data-letter="📗">
          <span class="route-icon">${svg("bookOpen")}</span>
          <h3>Учебник: курс 2</h3><p>Второй курс и карточки по урокам</p>
        </a>
        <a class="route-card" href="#/alphabet" data-letter="ا">
          <span class="route-icon">${svg("alphabet")}</span>
          <h3>Алфавит</h3><p>33 буквы, формы и звучание</p>
          <div class="route-meta"><span>${lKnown} из ${total.letters} изучено</span><small>${introDone()} вводных уроков</small></div>
        </a>
        <a class="route-card" href="#/vocab" data-letter="و">
          <span class="route-icon">${svg("cards")}</span>
          <h3>Базовая лексика</h3><p>Карточки с живым произношением</p>
          <div class="route-meta"><span>${wDone} из ${total.vocabWords} слов</span><small>${total.trainers} тренажёров</small></div>
        </a>
        <a class="route-card" href="#/lessons" data-letter="د">
          <span class="route-icon">${svg("book")}</span>
          <h3>Доп.курс</h3><p>Два семестра с уроками и учебными материалами</p>
          <div class="route-meta"><span>${lDone} из ${total.lessons} пройдено</span><small>${fmt(DATA.lessons.reduce((s, x) => s + x.tracks.length, 0))} треков</small></div>
        </a>
        <a class="route-card" href="#/practice" data-letter="پ">
          <span class="route-icon">${svg("target")}</span>
          <h3>Практика</h3><p>Проверьте слух и память</p>
          <div class="route-meta"><span>4 режима</span><small>+5 XP за ответ</small></div>
        </a>
        <a class="route-card" href="#/library" data-letter="🎧">
          <span class="route-icon">${svg("wave")}</span>
          <h3>Аудиотека</h3><p>Аудиозаписи и дополнительные материалы</p>
        </a>
        <a class="route-card" href="#/about" data-letter="د">
          <span class="route-icon">${svg("info")}</span>
          <h3>О проекте</h3><p>О курсе и учебных материалах</p>
        </a>
      </div>

      <div class="section-head">
        <div><h2>Алфавит под рукой</h2><p>${lKnown} из ${total.letters} букв уже отмечено. Нажмите на любую, чтобы увидеть формы и примеры.</p></div>
        <a class="section-link" href="#/alphabet">Открыть алфавит →</a>
      </div>
      <div class="alphabet-strip">
        ${DATA.letters.map((letter) => `<a class="letter-mini ${state.letters[letter.id] ? "known" : ""}" href="#/alphabet/letter/${esc(letter.id)}" title="${esc(letter.name)}">
          <span class="dari">${esc(letter.char)}</span><small>${esc(letter.name)}</small>
        </a>`).join("")}
      </div>
    </div>`;
  };

  /* ---------- Алфавит ---------- */
  const renderAlphabet = () => {
    let content = "";
    if (ui.alphabetTab === "intro") content = renderIntroTab();
    else if (ui.alphabetTab === "materials") content = renderMaterialsTab();
    else if (ui.alphabetTab === "teacher") content = renderTeacherTab();
    else if (ui.alphabetTab === "beginner") content = renderAlphabetBeginnerArchive();
    else content = renderLettersTab();
    const total = DATA.meta.counts;

    return `<div class="page">
      <div class="page-head">
        <div>
          <span class="eyebrow">Фонетика</span>
          <h1>Алфавит дари</h1>
          <p>${total.letters} буквы, четыре формы и звучание. Каждая буква привязана к вводному уроку, аудиозаписи и конспекту.</p>
        </div>
        <div class="page-head-actions">
          <button class="btn btn-primary" type="button" data-play-all="alphabet">${svg("play")} Слушать аудиокурс</button>
        </div>
      </div>
      <div class="tabs" role="tablist">
        <button class="tab ${ui.alphabetTab === "letters" ? "active" : ""}" type="button" data-alpha-tab="letters" role="tab" aria-selected="${ui.alphabetTab === "letters"}">Буквы <small>${total.letters}</small></button>
        <button class="tab ${ui.alphabetTab === "intro" ? "active" : ""}" type="button" data-alpha-tab="intro" role="tab" aria-selected="${ui.alphabetTab === "intro"}">Уроки A–Z <small>${total.intro}</small></button>
        <button class="tab ${ui.alphabetTab === "materials" ? "active" : ""}" type="button" data-alpha-tab="materials" role="tab" aria-selected="${ui.alphabetTab === "materials"}">Аудио и PDF <small>${total.alphabetPdfs + DATA.alphabetAudio.length}</small></button>
        <button class="tab ${ui.alphabetTab === "teacher" ? "active" : ""}" type="button" data-alpha-tab="teacher" role="tab" aria-selected="${ui.alphabetTab === "teacher"}">Для учителя <small>${(DATA.alphabetTeacherPdfs || []).length}</small></button>
        <button class="tab ${ui.alphabetTab === "beginner" ? "active" : ""}" type="button" data-alpha-tab="beginner" role="tab" aria-selected="${ui.alphabetTab === "beginner"}">2. Beginner&#39;s Dari (учебник + аудио) <small>77</small></button>
      </div>
      ${content}
    </div>`;
  };

  const renderLettersTab = () => {
    const groups = uniq(DATA.letters.map((x) => x.lesson));
    const filtered = ui.letterGroup === "all" ? DATA.letters : DATA.letters.filter((x) => x.lesson === ui.letterGroup);
    const known = lettersKnown();
    const pct = Math.round((known / DATA.letters.length) * 100);
    return `
      <div class="alphabet-toolbar">
        <div class="progress-summary">
          <strong>${known} из ${DATA.letters.length}</strong>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>
        <div class="chip-row">
          <button class="chip ${ui.letterGroup === "all" ? "active" : ""}" type="button" data-letter-group="all">Все буквы</button>
          ${groups.map((group) => {
            const count = DATA.letters.filter((x) => x.lesson === group).length;
            return `<button class="chip ${ui.letterGroup === group ? "active" : ""}" type="button" data-letter-group="${esc(group)}">Группа ${esc(group)} · ${count}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="letter-grid">
        ${filtered.map((letter) => `<a class="letter-card ${state.letters[letter.id] ? "known" : ""}" href="#/alphabet/letter/${esc(letter.id)}" aria-label="Буква ${esc(letter.name)}">
          <span class="lesson-tag">${esc(letter.lesson)}</span>
          <span class="known-mark">${svg("check")}</span>
          <span class="dari">${esc(letter.char)}</span>
          <strong>${esc(letter.name)}</strong>
          <small>${esc(letter.latin)}</small>
        </a>`).join("")}
      </div>`;
  };

  const renderIntroTab = () => {
    const known = introDone();
    const pct = Math.round((known / DATA.intro.length) * 100);
    return `
      <div class="alphabet-toolbar">
        <div class="progress-summary">
          <strong>${known} из ${DATA.intro.length}</strong>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span>${pct}%</span>
        </div>
        <span class="small muted">Пять первых уроков вводят буквы, остальные — темы и лексику.</span>
      </div>
      <div class="intro-grid">
        ${DATA.intro.map((item) => {
          const done = Boolean(state.intro[item.id]);
          return `<a class="intro-card ${done ? "done" : ""}" href="#/intro/${esc(item.id)}">
            <div class="intro-card-top">
              <span class="intro-letter">${esc(item.id)}</span>
              ${done ? `<span class="badge badge-done">${svg("check")} пройден</span>` : `<span class="badge badge-ghost">${item.audioFiles.length ? item.audioFiles.length + " аудио" : "PDF"}</span>`}
            </div>
            <div><h3>${esc(item.title)}</h3><div class="subtitle">${esc(item.subtitle || "")}</div></div>
            <p>${esc(item.summary || "")}</p>
            <div class="intro-card-bottom"><span>${item.words.length} слов · ${item.letters.length ? `${item.letters.length} букв` : "практика"}</span><span>${svg("arrowRight")}</span></div>
          </a>`;
        }).join("")}
      </div>`;
  };

  const renderMaterialsTab = () => `
    <div class="materials-grid">
      <div class="material-panel">
        <div class="panel-head"><div><h3>Аудиокурс алфавита</h3><p>${DATA.alphabetAudio.length} записей: буквы, приветствия, домашние задания и повторение.</p></div><button class="btn btn-soft btn-sm" type="button" data-play-all="alphabet">${svg("play")} Слушать всё</button></div>
        <div class="track-list">
          ${DATA.alphabetAudio.map((item, i) => `<div class="track-row">
            <span class="track-num">${item.number != null ? pad(item.number) : "★"}</span>
            <div class="track-info"><strong>${esc(item.title)}</strong><span>${esc(basename(item.path))}</span></div>
            <button class="track-play" type="button" data-play-src="${esc(item.path)}" data-queue="alphabet" data-qindex="${i}" data-title="${esc(item.title)}" data-subtitle="Аудиокурс алфавита" aria-label="Слушать">${svg("play")}</button>
          </div>`).join("")}
        </div>
      </div>
      <div class="material-panel">
        <div class="panel-head"><div><h3>Конспекты и задания</h3><p>${DATA.alphabetPdfs.length} PDF из архива: уроки, письмо, домашние задания и глоссарий.</p></div></div>
        <div class="pdf-list">
          ${DATA.alphabetPdfs.map((pdf) => `<button class="pdf-row" type="button" data-pdf-local="${esc(pdf.path)}" data-pdf-title="${esc(pdf.title)}">
            <span class="pdf-icon">PDF</span>
            <span><strong>${esc(pdf.title)}</strong><span>${esc(pdf.name)}</span></span>
            <span class="open-arrow">${svg("external")}</span>
          </button>`).join("")}
        </div>
      </div>
    </div>`;

  const renderTeacherTab = () => `
    <div class="material-panel">
      <div class="panel-head"><div><h2>Материалы для учителя</h2><p>${(DATA.alphabetTeacherPdfs || []).length} PDF · Dari A–Z Teacher Copy.</p></div></div>
      <div class="pdf-list">
        ${(DATA.alphabetTeacherPdfs || []).map((pdf) => `<button class="pdf-row" type="button" data-lib-pdf="${esc(pdf.id)}" data-page="1" data-title="${esc(pdf.name.replace(/\.pdf$/i, ""))}" data-subtitle="Для учителя · Dari A–Z Teacher Copy">
          <span class="pdf-icon">PDF</span>
          <span><strong>${esc(pdf.name.replace(/\.pdf$/i, ""))}</strong><span>Материал для учителя</span></span>
          <span class="open-arrow">${svg("external")}</span>
        </button>`).join("")}
      </div>
    </div>`;

  const renderLetterModal = (letter) => {
    const known = Boolean(state.letters[letter.id]);
    const examples = letter.examples.map((ex) => `<div class="example-card">
      <div class="dari">${esc(ex.dari)}</div>
      <div class="translit">${esc(ex.translit)}</div>
      <div class="ru">${esc(ex.ru)}</div>
    </div>`).join("");
    const forms = [
      ["isolated", "Изолированная"], ["initial", "Начальная"], ["medial", "Срединная"], ["final", "Конечная"],
    ].map(([key, label]) => `<div class="form-cell"><span class="dari">${esc(letter.forms[key])}</span><span>${label}</span></div>`).join("");
    const audioButtons = (letter.audioFiles || []).map((src, i) => `<button class="btn btn-soft btn-sm" type="button" data-play-src="${esc(src)}" data-queue="intro:${esc(letter.lesson)}" data-qindex="${i}" data-title="${esc(stripExt(basename(src)))}" data-subtitle="Буква ${esc(letter.name)}">${svg("play")} ${esc(stripExt(basename(src)))}</button>`).join("");
    const archiveAudioButton = letter.archiveAudioId ? `<button class="btn btn-soft btn-sm" type="button" data-lib-play="${esc(letter.archiveAudioId)}" data-title="Звук буквы ${esc(letter.char)}" data-subtitle="Архив · ${esc(letter.name)}">${svg("play")} Звук буквы (${esc(letter.char)})</button>` : "";
    return `
      <div class="letter-modal-top">
        <div class="letter-modal-char">${esc(letter.char)}</div>
        <div class="letter-modal-copy">
          <span class="eyebrow">Буква · группа ${esc(letter.lesson)}</span>
          <h2>${esc(letter.name)}</h2>
          <div class="latin">${esc(letter.latin)}</div>
        </div>
      </div>
      <div class="modal-section"><h3>Четыре формы</h3><div class="forms-grid">${forms}</div></div>
      <div class="modal-section"><h3>Примеры</h3><div class="example-grid">${examples}</div></div>
      ${audioButtons || archiveAudioButton ? `<div class="modal-section"><h3>Аудиоурок</h3><div class="modal-actions" style="margin:0;padding:0;border:0">${audioButtons}${archiveAudioButton}</div></div>` : ""}
      <div class="modal-actions">
        <button class="btn ${known ? "btn-soft" : "btn-primary"}" type="button" data-letter-toggle="${esc(letter.id)}" aria-pressed="${known}">${known ? svg("check") + " Изучена" : "Отметить изученной"}</button>
        <a class="btn btn-ghost" href="#/intro/${esc(letter.lesson)}">Вводный урок ${esc(letter.lesson)} ${svg("arrowRight")}</a>
        ${letter.pdfPath ? `<button class="btn btn-ghost" type="button" data-pdf-local="${esc(letter.pdfPath)}" data-pdf-title="Урок ${esc(letter.lesson)} · ${esc(letter.introTitle || "")}">${svg("file")} Конспект PDF</button>` : ""}
      </div>`;
  };

  /* ---------- Вводный урок ---------- */
  const pdfPanel = (path, title, subtitle = "") => `
    <div class="panel">
      <div class="panel-head"><div><h2>Конспект урока</h2><p>${esc(subtitle || "PDF из архива — можно читать прямо здесь.")}</p></div><button class="text-button" type="button" data-pdf-local="${esc(path)}" data-pdf-title="${esc(title)}">Открыть в окне ${svg("external")}</button></div>
      <div class="pdf-frame-wrap" data-pdf-wrap data-pdf-src="${esc(path)}" data-pdf-title="${esc(title)}">
        <div class="pdf-placeholder">
          <span class="pdf-big">PDF</span>
          <strong>${esc(title)}</strong>
          <p>Подгрузим документ по кнопке — так страница открывается быстрее.</p>
          <button class="btn btn-primary btn-sm" type="button" data-load-pdf>${svg("file")} Показать PDF</button>
        </div>
      </div>
    </div>`;

  const renderIntro = (id) => {
    const item = DATA.intro.find((x) => x.id === id);
    if (!item) return notFound("Вводный урок не найден");
    const done = Boolean(state.intro[item.id]);
    remember({ label: `Вводный урок ${item.id}`, title: item.title, subtitle: item.subtitle || "Алфавит и первые темы", href: `#/intro/${item.id}`, mark: item.id });
    const knownWords = item.words.filter((_, i) => state.introWords[`${item.id}:${i}`]).length;
    const letters = item.letters.map((lid) => DATA.letters.find((x) => x.id === lid)).filter(Boolean);

    return `<div class="page">
      <a class="back-link" href="#/alphabet">${svg("arrowRight")} Назад к алфавиту</a>
      <div class="detail-hero" data-letter="${esc(item.id)}">
        <div class="detail-badge">${esc(item.id)}</div>
        <div class="detail-hero-copy">
          <span class="eyebrow">Вводный урок</span>
          <h1>${esc(item.title)}</h1>
          <div class="en-title">${esc(item.subtitle || "")}</div>
          <p>${esc(item.summary || "")}</p>
        </div>
        <div class="detail-actions">
          <button class="btn ${done ? "btn-soft" : "btn-primary"}" type="button" data-toggle-intro="${esc(item.id)}">${done ? svg("check") + " Пройден" : "Отметить пройденным"}</button>
          ${item.pdfPath ? `<button class="btn btn-ghost" type="button" data-pdf-local="${esc(item.pdfPath)}" data-pdf-title="${esc(item.title)}">${svg("file")} PDF</button>` : ""}
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <div class="panel">
            <div class="panel-head"><div><h2>Аудио урока</h2><p>${item.audioFiles.length ? "Слушайте целиком или переходите между записями." : "К этому уроку в архиве нет отдельных аудиофайлов."}</p></div>${item.audioFiles.length ? `<button class="btn btn-soft btn-sm" type="button" data-play-all="intro:${esc(item.id)}">${svg("play")} Слушать всё</button>` : ""}</div>
            ${item.audioFiles.length ? `<div class="audio-list">${item.audioFiles.map((src, i) => `<div class="audio-row">
              <span class="code">${pad(i + 1)}</span>
              <div class="info"><strong>${esc(stripExt(basename(src)))}</strong><span>Аудиозапись урока</span></div>
              <button class="play-round" type="button" data-play-src="${esc(src)}" data-queue="intro:${esc(item.id)}" data-qindex="${i}" data-title="${esc(stripExt(basename(src)))}" data-subtitle="Вводный урок ${esc(item.id)}" aria-label="Слушать">${svg("play")}</button>
            </div>`).join("")}</div>` : `<div class="notice notice-warn">${svg("info")} <span>Аудио к этому уроку отсутствует в исходном архиве. Используйте PDF и словарь ниже — эти же темы повторяются в полном курсе.</span></div>`}
          </div>

          <div class="panel">
            <div class="panel-head"><div><h2>Слова урока</h2><p>${knownWords} из ${item.words.length} отмечено как знакомые.</p></div></div>
            <div class="word-grid">
              ${item.words.map((word, i) => {
                const key = `${item.id}:${i}`;
                const known = Boolean(state.introWords[key]);
                return `<div class="word-card-sm ${known ? "known" : ""}">
                  <div class="word"><div class="dari">${esc(word.dari)}</div><div class="translit">${esc(word.translit)}</div><div class="ru">${esc(word.ru)}</div></div>
                  <button class="know-dot" type="button" data-intro-word="${esc(key)}" aria-label="Отметить слово" aria-pressed="${known}">${svg("check")}</button>
                </div>`;
              }).join("")}
            </div>
          </div>

          ${item.pdfPath ? pdfPanel(item.pdfPath, `Урок ${item.id} · ${item.title}`, `${item.words.length} слов · ${letters.length ? letters.length + " букв" : "тематическая лексика"}`) : ""}

          <div class="complete-banner ${done ? "done" : ""}">
            <div><strong>${done ? "Урок пройден" : "Готовы закрыть урок?"}</strong><span>${done ? "Отметка сохранена в вашем прогрессе." : "Отметьте его, чтобы вернуться к нему позже и видеть общий прогресс."}</span></div>
            <button class="btn ${done ? "btn-ghost" : "btn-primary"} btn-sm" type="button" data-toggle-intro="${esc(item.id)}">${done ? "Снять отметку" : "Завершить урок"}</button>
          </div>
        </div>

        <aside class="detail-side">
          <div class="panel">
            <h3>Буквы урока</h3>
            ${letters.length ? `<div class="word-list">${letters.map((letter) => `<a class="track-row" href="#/alphabet/letter/${esc(letter.id)}">
              <span class="dari" style="font-size:1.55rem;line-height:1.6">${esc(letter.char)}</span>
              <div class="track-info"><strong>${esc(letter.name)}</strong><span>${esc(letter.latin)}</span></div>
              <span class="open-arrow">${svg("chevronRight")}</span>
            </a>`).join("")}</div>` : `<p class="small muted">Это тематический урок: новых букв нет, закрепляем лексику и слух.</p>`}
          </div>
          <div class="panel">
            <h3>Материалы</h3>
            <div class="progress-inline" style="margin-bottom:12px"><span>Слова</span><div class="progress-track"><div class="progress-fill" style="width:${(knownWords / Math.max(1, item.words.length)) * 100}%"></div></div><span>${knownWords}/${item.words.length}</span></div>
            <p class="small muted">Аудио: ${item.audioFiles.length} · PDF: ${item.pdfPath ? "да" : "нет"} · Слов: ${item.words.length}</p>
            <a class="source-link" style="margin-top:14px" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("folder")} Исходный архив <span>Drive ${svg("external")}</span></a>
          </div>
        </aside>
      </div>
    </div>`;
  };

  /* ---------- Уроки ---------- */
  const lessonMatches = (lesson, query) => {
    if (!query) return true;
    const haystack = [lesson.num, lesson.titleRu, lesson.titleEn, lesson.summaryRu, lesson.grammarRu, ...(lesson.tags || [])].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  };

  const findSemesterTwoEntry = (id) => {
    const root = DATA.semesterTwo;
    if (!root) return null;
    if (!id || id === root.id) return { node: root, trail: [root] };
    const walk = (node, trail) => {
      for (const child of node.folders || []) {
        const next = trail.concat(child);
        if (child.id === id) return { node: child, trail: next };
        const found = walk(child, next);
        if (found) return found;
      }
      return null;
    };
    return walk(root, [root]);
  };

  const findSemesterOneTeacherEntry = (id) => {
    const roots = [DATA.semesterOneSupplementary, DATA.semesterOneTeacher].filter(Boolean);
    for (const root of roots) {
      if (!id || id === root.id) return { node: root, trail: [root] };
      const walk = (node, trail) => {
        for (const child of node.folders || []) {
          const next = trail.concat(child);
          if (child.id === id) return { node: child, trail: next };
          const found = walk(child, next);
          if (found) return found;
        }
        return null;
      };
      const found = walk(root, [root]);
      if (found) return found;
    }
    return null;
  };

  const semesterTwoCategory = (theme) => {
    const text = (theme.title + " " + theme.summary).toLowerCase();
    if (/семь|свад|брак|сват|женщин|дет|гостеприим/.test(text)) return "Семья и общество";
    if (/географ|провинц|климат|погод|регион|границ|маршрут|путешеств|транспорт|самолёт/.test(text)) return "География и путешествия";
    if (/банк|работ|руковод|сотрудник|рын|торгов|покуп|продаж|эконом|компан|инвестиц|строительств|инфраструктур/.test(text)) return "Работа и экономика";
    if (/государ|президент|правитель|полит|истор|лидер|моджахед|племен|меньшинств|образован|школ/.test(text)) return "Общество и история";
    if (/кино|спорт|навруз|культур|питани|еда|гадани|снов/.test(text)) return "Культура и досуг";
    if (/телефон|связ|телеком|электрон|компьютер|технолог/.test(text)) return "Технологии";
    return "Повседневная жизнь";
  };
  const SEMESTER_TWO_PDF_IDS = ["1Jn9YyFf9FYte44OUVDZCPCLpEP0kfPg6","1cc_RUOl7lzKf9eZd0n9LNqNlqJKf829V","1g4bimxXTx2yjrxinRCpTTOdElDxjptfv","175d6m7mcHe3Rm4e83PIVBruQrPlXxO7x","137JAVtB02ngRLg1PAo8XrFE9IVT8fhkH","1NQa-5KL9fWaSq6amtzLLOnfg43FPdVj-","1U-vl2zNUp--9du_uLNIn05u7oulXk_RO","1_LQICAtnAimVmYJlPW8Im54qkqP7bYK9","15OHFD5nXXzBAiFJUx5zFbn9Wds1KRD5_","1RHT1FMrqoZ3SMik15itsquITNd_-YiIi","1HwImA_GKhpxSGzaC-aiqcxOwAhjnBCPy","1kgszz8v7wjDa5Hc_aUfPCA0bzTK1K5fa","1ERGt9xuoM-nu8uEQ7o1KRco54rRezz5f","1T--plZH9QasvU-3DKrAbvA8nVygf_lhe","1FpiXyk88NFrQHr9Uq6I1-pPjthjM3qv-","1nL5_1yaC8ktBKsstWapKJaTwBvJub5_E","1I4BpWWVUNS6JPH0I5tZ5qu5qi0TRsqaR","1eqGRe0ecIFnH4fo1_IxONG4o5w4qY2_n","1q4KI5YUB6yFsyqYZ3Mv4BU9jEp9VwErT","1_FoY3zyNxiWsA03sax1Yg7sYVAexanf-","17FNj5DPfnycd5J7GubrIZQUNq6HX1SmT","1OkY9mr3OVSifm-Q0h3yFQKSho2PyVu33","1TGMU3ybcUqEgEM3MnJPVmlhk7_T3GjiD","1PUYFIfdTaVRrvQqp_ARfI75oeS8cVwyO","1NmjIvBBDr3yxGhzODxkYz1_4Jn4vKwQK","1QisDwBU3mkmF2jhClEKerX_9e_dvUzpn","1_tGE-xA1ol547A2NvfIbZ-ydajs4ePrd","1jPmgfboXIyXJYnGgttATW0_VM5jScU2s","1vMbXQ89wfhT2looFWnNXdOga53VsCo-A","1oocjORacWADF07_oGTEU7OB_x9qk-mdk","1omEgfEx6Es-_v49A5WpnRpWIt8deKj0A","1CbRBlH_hge3veAe3RPMKyUvOz47mU_aa","18QyMpYZuzXfDmuN9aMHddzlEtCyXiULF","17by_wYS6B8cHVWndrgg5a2tjB6xqL1Bn","11kATiTke5_1iq83AloF548HcZxi2ji2Q","1ff16Tpnd3Bi5_o5bl2bO83nGfdfXd-RJ","1DdQcGOlnUte85a-70XF4_52IZ2wna4Ub","1LoK1yDmKBexW3RoQJlEoPg_yGXTAxMi7","1jcExr9mlunxge_weABqy30kt5fAIVAkN","16FmTZsXDEF43GfJQ93ve9dxVuQtWXvgK"];

  const renderSemesterTwoLesson = (num) => {
    const unit = (DATA.studentUnits || []).find((item) => item.num === Number(num));
    const folder = (DATA.semesterTwo.folders || []).find((item) => item.id === `virtual-lesson-${pad(num)}`);
    if (!unit || !folder) return notFound("Урок второго семестра не найден");
    const tracks = (folder.files || []).filter((file) => isAudio(file.name));
    const done = Boolean(state.semesterTwoLessons[num]);
    const prev = (DATA.studentUnits || []).find((item) => item.num === Number(num) - 1);
    const next = (DATA.studentUnits || []).find((item) => item.num === Number(num) + 1);
    const category = semesterTwoCategory(unit);
    remember({ label: `Семестр 2 · Урок ${num}`, title: `${num}. ${unit.title}`, subtitle: unit.summary, href: `#/lessons/semester-2/lesson/${num}`, mark: String(num) });
    return `<div class="page">
      <a class="back-link" href="#/lessons/semester-2">${svg("arrowRight")} Все уроки · Семестр 2</a>
      <div class="detail-hero" data-letter="${num}">
        <div class="detail-badge num">${pad(num)}</div>
        <div class="detail-hero-copy">
          <span class="eyebrow">Полный урок · Семестр 2 · ${esc(category)}</span>
          <h1>${esc(unit.title)}</h1>
          <div class="en-title">STUDENT BOOK · UNIT ${pad(num)}</div>
          <p>${esc(unit.summary)}</p>
        </div>
        <div class="detail-actions">
          <button class="btn ${done ? "btn-soft" : "btn-primary"}" type="button" data-toggle-semester-two-lesson="${num}">${done ? svg("check") + " Пройден" : "Отметить пройденным"}</button>
          <span class="badge badge-ghost">${tracks.length} аудио</span>
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <div class="panel">
            <div class="panel-head"><div><h2>Аудио урока</h2><p>${tracks.length} аудиозаписей из материалов Student Book · Семестр 2.</p></div>${tracks.length ? `<button class="btn btn-soft btn-sm" type="button" data-play-all-semester-two="${num}">${svg("play")} Слушать всё</button>` : ""}</div>
            ${tracks.length ? `<div class="audio-list">${tracks.map((file, i) => `<div class="audio-row">
              <span class="code">${String(i + 1).padStart(2, "0")}</span>
              <div class="info"><strong>${esc(stripExt(file.name))}</strong><span>Урок ${num} · аудиоматериал</span></div>
              <button class="play-round" type="button" data-lib-play="${esc(file.id)}" data-title="${esc(stripExt(file.name))}" data-subtitle="Семестр 2 · Урок ${num}" aria-label="Слушать">${svg("play")}</button>
            </div>`).join("")}</div>` : `<div class="notice notice-warn">${svg("info")} <span>Аудиозаписи для этого урока пока не найдены.</span></div>`}
            <p class="tiny muted" style="margin-top:10px">Записи открываются во встроенном аудиоплеере.</p>
          </div>
          <div class="panel"><h2>Грамматика и тема</h2><div class="grammar-box" style="margin-top:12px"><strong>Тема урока</strong><p>${esc(unit.summary)}</p></div></div>
          <div class="panel">
            <div class="panel-head"><div><h2>Учебник · Student Book</h2><p>PDF урока ${num} · читайте прямо на сайте.</p></div>
              <div class="panel-head-actions"><a class="btn btn-ghost btn-sm" href="https://drive.google.com/file/d/${SEMESTER_TWO_PDF_IDS[Number(num) - 1]}/view" target="_blank" rel="noopener">${svg("external")} Открыть в Drive</a><a class="btn btn-soft btn-sm" href="${driveDownload(SEMESTER_TWO_PDF_IDS[Number(num) - 1])}" target="_blank" rel="noopener">${svg("download")} Скачать</a></div>
            </div>
            <div class="pdf-frame-wrap textbook-frame"><iframe src="${drivePdf(SEMESTER_TWO_PDF_IDS[Number(num) - 1])}" title="Семестр 2 · Урок ${num} · PDF" allow="autoplay" loading="lazy"></iframe></div>
          </div>
          <div class="complete-banner ${done ? "done" : ""}">
            <div><strong>${done ? "Урок пройден" : "Урок можно считать пройденным?"}</strong><span>${done ? "Отметка сохранена в вашем прогрессе." : "Прослушайте записи и отметьте урок — так удобнее видеть, что осталось."}</span></div>
            <button class="btn ${done ? "btn-ghost" : "btn-primary"} btn-sm" type="button" data-toggle-semester-two-lesson="${num}">${done ? "Снять отметку" : "Завершить урок"}</button>
          </div>
          <div class="lesson-nav">
            ${prev ? `<a href="#/lessons/semester-2/lesson/${prev.num}"><span>← Урок ${prev.num}</span><strong>${esc(prev.title)}</strong></a>` : "<span></span>"}
            ${next ? `<a class="next" href="#/lessons/semester-2/lesson/${next.num}"><span>Урок ${next.num} →</span><strong>${esc(next.title)}</strong></a>` : "<span></span>"}
          </div>
        </div>
        <aside class="detail-side">
          <div class="panel"><h3>Паспорт урока</h3><div class="audio-list">
            <div class="track-row"><span class="track-num">${tracks.length}</span><div class="track-info"><strong>аудиозаписей</strong><span>аудиоматериалы Student Book</span></div></div>
            <div class="track-row"><span class="track-num">PDF</span><div class="track-info"><strong>учебник</strong><span>Встроенный просмотр Google Drive</span></div></div>
            <div class="track-row"><span class="track-num">${num}</span><div class="track-info"><strong>номер урока</strong><span>Student Book · Семестр 2</span></div></div>
          </div></div>
          <div class="panel"><h3>Темы</h3><div class="tag-row"><span class="badge badge-green">${esc(category)}</span><span class="badge badge-green">Student Book</span></div></div>
          <div class="panel"><h3>Продолжить</h3><p class="small muted">${next ? `Следующий — урок ${next.num} «${esc(next.title)}».` : "Это последний урок второго семестра."}</p><a class="btn btn-soft btn-sm" style="margin-top:12px" href="${next ? `#/lessons/semester-2/lesson/${next.num}` : "#/lessons/semester-2"}">${next ? "Следующий урок" : "К урокам"} ${svg("arrowRight")}</a></div>
        </aside>
      </div>
    </div>`;
  };

  const renderSemesterTwo = (id) => {
    const entry = findSemesterTwoEntry(id);
    if (!entry) return notFound("Материалы семестра не найдены");
    return renderLibraryNode(entry)
      .replaceAll("#/library/", "#/lessons/semester-2/")
      .replaceAll("#/library", "#/lessons")
      .replaceAll("Аудиотека", "Доп.курс")
      .replaceAll("Все разделы", "К семестрам")
      .replaceAll("Аудио и PDF из исходного архива DLIFLC.", "Учебные аудио и PDF второго семестра.");
  };

  const renderLessons = (semester, itemId, subItemId) => {
    if (semester === "semester-1") return itemId ? renderSemesterOne(itemId) : renderSemesterOne();
    if (semester === "semester-2") return itemId === "lesson" ? renderSemesterTwoLesson(subItemId) : renderSemesterTwo(itemId);
    return `<div class="page">
      <div class="page-head"><div><span class="eyebrow">Дополнительный курс</span><h1>Доп.курс</h1><p>Выберите семестр, чтобы открыть уроки и учебные материалы.</p></div></div>
      <div class="routes-grid semester-grid">
        <a class="route-card semester-card" href="#/lessons/semester-1" data-letter="📘">
          <span class="route-icon">${svg("bookOpen")}</span><h3>Семестр 1</h3><p>40 тематических уроков с аудио, PDF и грамматическими пояснениями.</p><div class="route-meta"><span>${DATA.lessons.length} уроков</span><small>Открыть семестр →</small></div>
        </a>
        <a class="route-card semester-card" href="#/lessons/semester-2" data-letter="📗">
          <span class="route-icon">${svg("folder")}</span><h3>Семестр 2</h3><p>Студенческие материалы, аудио, учебники и карточки.</p><div class="route-meta"><span>Учебные материалы</span><small>Открыть семестр →</small></div>
        </a>
      </div>
    </div>`;
  };

  const renderSemesterOne = (itemId) => {
    if (itemId) {
      const entry = findSemesterOneTeacherEntry(itemId);
      if (!entry) return notFound("Материалы преподавателя не найдены");
      return renderLibraryNode(entry)
        .replaceAll("#/library/", "#/lessons/semester-1/")
        .replaceAll("#/library", "#/lessons/semester-1")
        .replaceAll("Аудиотека", "Доп.курс")
        .replaceAll("Все разделы", "К семестрам");
    }
    const tagCounts = new Map();
    DATA.lessons.forEach((lesson) => lesson.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
    const topTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru")).slice(0, 8).map((x) => x[0]);
    const query = ui.lessonQuery.trim();
    const filtered = DATA.lessons.filter((lesson) =>
      (ui.lessonTag === "all" || lesson.tags.includes(ui.lessonTag)) && lessonMatches(lesson, query));
    const done = lessonsDone();
    const next = DATA.lessons.find((lesson) => !state.lessons[lesson.num]);

    return `<div class="page">
      <div class="page-head">
        <div>
          <span class="eyebrow">Дополнительный курс</span>
          <h1>Семестр 1</h1>
          <p>От знакомства и кабульского быта до медицины, армии и путешествий. В каждом уроке — аудиозаписи, конспект и разбор грамматики по-русски.</p>
        </div>
        <div class="page-head-actions">
          <span class="badge badge-green">Пройдено ${done} из ${DATA.lessons.length}</span>
          ${next ? `<a class="btn btn-primary" href="#/lesson/${next.num}">${svg("play")} Урок ${next.num}</a>` : ""}
        </div>
      </div>
      <div class="lesson-toolbar">
        <div class="search-input-wrap">${svg("search")}<input class="search-input" id="lesson-search" type="search" placeholder="Найти урок или тему…" value="${esc(ui.lessonQuery)}" autocomplete="off"></div>
        <div class="chip-row">
          <button class="chip ${ui.lessonTag === "all" ? "active" : ""}" type="button" data-lesson-tag="all">Все</button>
          ${topTags.map((tag) => `<button class="chip ${ui.lessonTag === tag ? "active" : ""}" type="button" data-lesson-tag="${esc(tag)}">${esc(tag)}</button>`).join("")}
        </div>
        <span class="small muted" id="lesson-count">${filtered.length} из ${DATA.lessons.length}</span>
      </div>
      ${filtered.length ? `<div class="lesson-grid semester-one-grid" id="lesson-grid">
        ${filtered.map((lesson) => {
          const complete = Boolean(state.lessons[lesson.num]);
          return `<a class="lesson-card ${complete ? "done" : ""}" href="#/lesson/${lesson.num}" data-num="${lesson.num}">
            ${complete ? `<span class="done-flag badge badge-done">${svg("check")} пройден</span>` : ""}
            <div class="lesson-top"><div class="lesson-num">${lesson.num}<small>УРОК</small></div><span class="badge badge-ghost">${lesson.tracks.length} ${plural(lesson.tracks.length, ["аудио", "аудио", "аудио"])}</span></div>
            <h3>${esc(lesson.titleRu)}</h3>
            <div class="en">${esc(lesson.titleEn)}</div>
            <p class="summary">${esc(lesson.summaryRu)}</p>
            <div class="tag-row">${lesson.tags.slice(0, 3).map((tag) => `<span class="badge">${esc(tag)}</span>`).join("")}</div>
            <div class="lesson-card-bottom"><span class="meta"><span>${svg("wave")} ${lesson.tracks.length}</span><span>${svg("file")} PDF</span></span><span>Открыть ${svg("arrowRight")}</span></div>
          </a>`;
        }).join("")}
      </div>` : `<div class="empty-state"><h3>Ничего не нашлось</h3><p>Попробуйте другой запрос или сбросьте фильтр темы.</p><button class="btn btn-soft btn-sm" type="button" data-clear-lesson-filter>Сбросить фильтры</button></div>`}
      ${DATA.semesterOneSupplementary ? `<div class="section-head" style="margin-top:28px"><div><h2>Дополнительные материалы</h2><p>Глоссарии и аудиозаписи повторения по блокам из четырёх уроков</p></div></div><div class="folder-list"><a class="folder-item" href="#/lessons/semester-1/${esc(DATA.semesterOneSupplementary.id)}"><span class="folder-icon">${svg("folder")}</span><div><strong>${esc(DATA.semesterOneSupplementary.name)}</strong><small>${DATA.semesterOneSupplementary.fileCount || 0} файлов · ${DATA.semesterOneSupplementary.folderCount || 0} блоков</small></div></a></div>` : ""}
      ${DATA.semesterOneTeacher ? `<div class="section-head" style="margin-top:28px"><div><h2>Материалы преподавателя</h2><p>Дополнительные версии уроков и учебные файлы</p></div></div><div class="folder-list"><a class="folder-item" href="#/lessons/semester-1/${esc(DATA.semesterOneTeacher.id)}"><span class="folder-icon">${svg("folder")}</span><div><strong>${esc(DATA.semesterOneTeacher.name)}</strong><small>${DATA.semesterOneTeacher.fileCount || 0} файлов · ${DATA.semesterOneTeacher.folderCount || 0} папок</small></div></a></div>` : ""}
    </div>`;
  };

  const renderLesson = (num) => {
    const lesson = DATA.lessons.find((x) => x.num === Number(num));
    if (!lesson) return notFound("Урок не найден");
    const done = Boolean(state.lessons[lesson.num]);
    remember({ label: `Урок ${lesson.num}`, title: `${lesson.num}. ${lesson.titleRu}`, subtitle: lesson.summaryRu, href: `#/lesson/${lesson.num}`, mark: String(lesson.num) });
    const prev = DATA.lessons.find((x) => x.num === lesson.num - 1);
    const next = DATA.lessons.find((x) => x.num === lesson.num + 1);

    return `<div class="page">
      <a class="back-link" href="#/lessons">${svg("arrowRight")} Все уроки</a>
      <div class="detail-hero" data-letter="${lesson.num}">
        <div class="detail-badge num">${lesson.num}</div>
        <div class="detail-hero-copy">
          <span class="eyebrow">Полный урок · ${esc(lesson.tags.slice(0, 2).join(" · "))}</span>
          <h1>${esc(lesson.titleRu)}</h1>
          <div class="en-title">${esc(lesson.titleEn)}</div>
          <p>${esc(lesson.summaryRu)}</p>
        </div>
        <div class="detail-actions">
          <button class="btn ${done ? "btn-soft" : "btn-primary"}" type="button" data-toggle-lesson="${lesson.num}">${done ? svg("check") + " Пройден" : "Отметить пройденным"}</button>
          <button class="btn btn-ghost" type="button" data-pdf-local="${esc(lesson.pdf)}" data-pdf-title="Урок ${lesson.num} · ${esc(lesson.titleRu)}">${svg("file")} PDF</button>
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <div class="panel">
            <div class="panel-head"><div><h2>Аудио урока</h2><p>${lesson.tracks.length ? `${lesson.tracks.length} ${plural(lesson.tracks.length, ["запись", "записи", "записей"])}: словарь, рассказ, домашнее задание и упражнения.` : "В исходном архиве у этого урока нет аудиофайлов — остаётся PDF."}</p></div>${lesson.tracks.length ? `<button class="btn btn-soft btn-sm" type="button" data-play-all="lesson:${lesson.num}">${svg("play")} Слушать всё</button>` : ""}</div>
            ${lesson.tracks.length ? `<div class="audio-list">
              ${lesson.tracks.map((track, i) => `<div class="audio-row">
                <span class="code">${esc(track.code)}</span>
                <div class="info"><strong>${esc(track.label)}</strong><span>${esc(track.description)}</span></div>
                <button class="play-round" type="button" data-play-src="${esc(track.src)}" data-queue="lesson:${lesson.num}" data-qindex="${i}" data-title="${esc(track.code + " · " + track.label)}" data-subtitle="Урок ${lesson.num} · ${esc(lesson.titleRu)}" aria-label="Слушать">${svg("play")}</button>
              </div>`).join("")}
            </div>` : `<div class="notice notice-warn">${svg("info")} <span>Аудио к уроку отсутствует в архиве. Конспект PDF полностью доступен ниже.</span></div>`}
            ${lesson.tracks.length ? `<p class="tiny muted" style="margin-top:10px">Аудио урока сохранено локально — воспроизведение не зависит от Google Drive.</p>` : ""}
          </div>

          <div class="panel">
            <h2>Грамматика и тема</h2>
            <div class="grammar-box" style="margin-top:12px"><strong>Что разбираем</strong><p>${esc(lesson.grammarRu || "Грамматические комментарии смотрите в конспекте урока.")}</p></div>
          </div>

          ${lesson.phrases.length ? `<div class="panel">
            <div class="panel-head"><div><h2>Ключевые фразы</h2><p>Маленький набор, с которого можно начать говорить уже сегодня.</p></div></div>
            <div class="phrase-list">
              ${lesson.phrases.map((phrase) => `<div class="phrase-card">
                <div class="phrase-dari"><span class="dari">${esc(phrase.dari)}</span><span class="translit">${esc(phrase.translit)}</span></div>
                <div class="ru">${esc(phrase.ru)}</div>
              </div>`).join("")}
            </div>
          </div>` : ""}

          ${pdfPanel(lesson.pdf, `Урок ${lesson.num} · ${lesson.titleRu}`, `${lesson.pdfName} · ${lesson.tracks.length} аудиозаписей`)}

          <div class="complete-banner ${done ? "done" : ""}">
            <div><strong>${done ? "Урок пройден" : "Урок можно считать пройденным?"}</strong><span>${done ? "Отметка сохранена в вашем прогрессе." : "Прослушайте записи и отметьте урок — так удобнее видеть, что осталось."}</span></div>
            <button class="btn ${done ? "btn-ghost" : "btn-primary"} btn-sm" type="button" data-toggle-lesson="${lesson.num}">${done ? "Снять отметку" : "Завершить урок"}</button>
          </div>

          <div class="lesson-nav">
            ${prev ? `<a href="#/lesson/${prev.num}"><span>← Урок ${prev.num}</span><strong>${esc(prev.titleRu)}</strong></a>` : "<span></span>"}
            ${next ? `<a class="next" href="#/lesson/${next.num}"><span>Урок ${next.num} →</span><strong>${esc(next.titleRu)}</strong></a>` : "<span></span>"}
          </div>
        </div>

        <aside class="detail-side">
          <div class="panel">
            <h3>Паспорт урока</h3>
            <div class="audio-list">
              <div class="track-row"><span class="track-num">${lesson.tracks.length}</span><div class="track-info"><strong>аудиозаписей</strong><span>словарь · рассказ · задания</span></div></div>
              <div class="track-row"><span class="track-num">PDF</span><div class="track-info"><strong>конспект урока</strong><span>${esc(lesson.pdfName)}</span></div></div>
              <div class="track-row"><span class="track-num">${lesson.phrases.length}</span><div class="track-info"><strong>ключевых фраз</strong><span>с переводом и транслитерацией</span></div></div>
            </div>
          </div>
          <div class="panel">
            <h3>Темы</h3>
            <div class="tag-row">${lesson.tags.map((tag) => `<span class="badge badge-green">${esc(tag)}</span>`).join("")}</div>
            <a class="source-link" style="margin-top:16px" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("folder")} Материалы в Drive <span>${svg("external")}</span></a>
          </div>
          <div class="panel">
            <h3>Продолжить</h3>
            <p class="small muted">${next ? `Следующий — урок ${next.num} «${esc(next.titleRu)}».` : "Это последний урок курса. Самое время перейти к практике."}</p>
            <a class="btn btn-soft btn-sm" style="margin-top:12px" href="${next ? `#/lesson/${next.num}` : "#/practice"}">${next ? "Следующий урок" : "К практике"} ${svg("arrowRight")}</a>
          </div>
        </aside>
      </div>
    </div>`;
  };
  /* ---------- Словарь ---------- */
  const renderVocab = () => {
    const total = DATA.meta.counts;
    return `<div class="page">
      <div class="page-head">
        <div>
          <span class="eyebrow">Лексика</span>
          <h1>Базовая лексика</h1>
          <p>${total.vocabWords} карточек в наборах с озвучкой. Слушайте произношение на дари, переворачивайте карточки и отмечайте знакомые слова.</p>
        </div>
        <div class="page-head-actions"><span class="badge badge-green">${wordsDone()} из ${total.vocabWords} слов</span></div>
      </div>
      <div class="pack-grid">
        ${DATA.vocab.packs.map((pack) => {
          const known = packKnown(pack);
          const pct = Math.round((known / Math.max(1, pack.cards.length)) * 100);
          return `<a class="pack-card" href="#/vocab/${esc(pack.id)}" style="--pack-color:${esc(pack.accent)}">
            <span class="pack-badge badge ${known === pack.cards.length ? "badge-done" : "badge-ghost"}">${known === pack.cards.length ? svg("check") + " готово" : pct + "%"}</span>
            <span class="pack-icon">${esc(pack.icon)}</span>
            <h3>${esc(pack.title)}</h3>
            <div class="pack-sub">${esc(pack.subtitle)}</div>
            <p>${esc(pack.description)}</p>
            <div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${known}/${pack.cards.length}</span></div>
          </a>`;
        }).join("")}
      </div>

      <div class="section-head">
        <div><h2>Аудиотренажёры</h2><p>Наборы аудиозаписей, для которых ещё предстоит подготовить транскрипты.</p></div>
        <span class="small muted">${fmt(DATA.vocab.trainers.filter((t) => t.id !== "greetings").reduce((s, t) => s + t.count, 0))} записей</span>
      </div>
      <div class="vocab-transcript-warning notice notice-warn" role="alert" aria-live="polite">
        <span class="vocab-transcript-warning-icon">${svg("info")}</span>
        <div>
          <strong>Важно: для новых карточек нужны транскрипты</strong>
          <p>Чтобы превратить эти аудионаборы в карточки и добавить их в раздел «Словарь с голосом», сначала необходимо подготовить транскрипты — текстовую запись произносимых слов.</p>
        </div>
      </div>
      <div class="trainer-grid">
        ${DATA.vocab.trainers.filter((trainer) => trainer.id !== "greetings").map((trainer) => `<a class="trainer-card" href="#/trainer/${esc(trainer.id)}">
          <span class="trainer-icon">${svg("headphones")}</span>
          <div><h4>${esc(trainer.title)}</h4><p>${esc(trainer.description)}</p></div>
          <span class="count">${trainer.count}</span>
        </a>`).join("")}
      </div>
      <div class="section-head">
        <div><h2>Слова без озвучки</h2><p>Тематические подборки для изучения по карточкам — без аудиозаписей.</p></div>
        <span class="small muted">${(DATA.vocab.noAudioPacks || []).reduce((sum, pack) => sum + pack.cards.length, 0)} слов</span>
      </div>
      <div class="pack-grid">
        ${(DATA.vocab.noAudioPacks || []).map((pack) => {
          const known = packKnown(pack);
          const pct = Math.round((known / Math.max(1, pack.cards.length)) * 100);
          return `<a class="pack-card" href="#/vocab/${esc(pack.id)}" style="--pack-color:${esc(pack.accent)}">
            <span class="pack-badge badge ${known === pack.cards.length ? "badge-done" : "badge-ghost"}">${known === pack.cards.length ? svg("check") + " готово" : pct + "%"}</span>
            <span class="pack-icon">${esc(pack.icon)}</span>
            <h3>${esc(pack.title)}</h3>
            <div class="pack-sub">${esc(pack.subtitle)}</div>
            <p>${esc(pack.description)}</p>
            <div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${known}/${pack.cards.length}</span></div>
          </a>`;
        }).join("")}
      </div>

      <div class="notice" style="margin-top:24px">${svg("info")}<span>Совет: сначала слушайте запись с закрытыми глазами, потом повторяйте вслух, и только затем смотрите на перевод. Так слух привыкает к настоящему ритму дари.</span></div>
    </div>`;
  };

  const renderPack = (id) => {
    const pack = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])].find((x) => x.id === id);
    if (!pack) return notFound("Набор слов не найден");
    remember({ label: `Базовая лексика · ${pack.title}`, title: pack.title, subtitle: `${pack.cards.length} слов`, href: `#/vocab/${pack.id}`, mark: pack.icon });
    if (ui.flashPack !== pack.id) {
      ui.flashPack = pack.id;
      ui.flashIndex = 0;
      ui.flashFlipped = false;
    }
    if (!Array.isArray(ui.packOrders[pack.id]) || ui.packOrders[pack.id].length !== pack.cards.length) {
      ui.packOrders[pack.id] = pack.cards.map((_, i) => i);
    }
    const unknownOrder = ui.packOrders[pack.id].filter((originalIndex) => !state.words[`${pack.id}:${originalIndex}`]);
    const index = clamp(ui.flashIndex, 0, Math.max(0, unknownOrder.length - 1));
    const originalIndex = unknownOrder[index];
    const card = originalIndex == null ? null : pack.cards[originalIndex];
    const known = packKnown(pack);
    const pct = Math.round((known / Math.max(1, pack.cards.length)) * 100);
    const isKnown = originalIndex == null ? false : Boolean(state.words[`${pack.id}:${originalIndex}`]);
    const russianFirst = Boolean(ui.packRussianFirst[pack.id]);
    ui.flashIndex = index;

    const flash = unknownOrder.length ? `<div class="flash-wrap">
      <div class="flash-progress"><span>${index + 1} / ${unknownOrder.length} осталось</span><div class="progress-track"><div class="progress-fill" style="width:${((index + 1) / unknownOrder.length) * 100}%"></div></div><span>${known} ${plural(known, ["слово", "слова", "слов"])} знакомо</span></div>
      <div class="flashcard-stage">
        <div class="flashcard ${ui.flashFlipped ? "flipped" : ""} ${russianFirst ? "russian-first" : ""}" data-flip-card tabindex="0" role="button" aria-label="Перевернуть карточку">
          <div class="flash-face front">
            ${russianFirst ? `<div class="flash-numeral" style="color:var(--gold)">${isKnown ? "знакомое слово" : "перевод"}</div><div class="flash-ru">${esc(card.ru)}</div>${card.note ? `<div class="flash-note">${esc(card.note)}</div>` : ""}` : `${card.numeral ? `<div class="flash-numeral">${esc(card.numeral)}</div>` : ""}<div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${card.translit ? esc(card.translit) : ""}</div>${card.audio ? `<button class="btn btn-soft btn-sm" type="button" data-play-src="${esc(card.audio)}" data-title="${esc(card.dari)}" data-subtitle="${esc(card.translit ? card.translit + " — " + card.ru : card.ru)}">${svg("volume")} Слушать</button>` : ""}`}
            <span class="hint">Нажмите на карточку, чтобы увидеть ${russianFirst ? "дари" : "перевод"}</span>
          </div>
          <div class="flash-face back">
            ${russianFirst ? `${card.numeral ? `<div class="flash-numeral">${esc(card.numeral)}</div>` : ""}<div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${card.translit ? esc(card.translit) : ""}</div>${card.audio ? `<button class="btn btn-soft btn-sm" type="button" data-play-src="${esc(card.audio)}" data-title="${esc(card.dari)}" data-subtitle="${esc(card.translit ? card.translit + " — " + card.ru : card.ru)}">${svg("volume")} Слушать</button>` : ""}` : `<div class="flash-numeral" style="color:var(--gold)">${isKnown ? "знакомое слово" : "перевод"}</div><div class="flash-ru">${esc(card.ru)}</div>${card.translit ? `<div class="flash-translit" style="color:var(--gold)">${esc(card.translit)}</div>` : ""}${card.note ? `<div class="flash-note">${esc(card.note)}</div>` : ""}`}
            <span class="hint">Нажмите ещё раз, чтобы вернуться</span>
          </div>
        </div>
      </div>
      <div class="flash-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-flash-prev>${svg("arrowLeft")} Назад</button>
        <button class="btn btn-soft btn-sm" type="button" data-flash-flip>${svg("flip")} ${russianFirst ? "Дари" : "Перевод"}</button>
        <button class="btn ${isKnown ? "btn-soft" : "btn-primary"} btn-sm" type="button" data-flash-know>${svg("check")} ${isKnown ? "Уже знаю" : "Знаю"}</button>
        <button class="btn btn-ghost btn-sm" type="button" data-flash-next>Дальше ${svg("arrowRight")}</button>
      </div>
      <div class="flash-bottom"><span>${pct}% набора знакомо</span><span>${pack.noAudio ? "Без озвучки" : `${pack.audioCount} аудиозаписей`}</span></div>
    </div>` : `<div class="empty-state"><h3>Все слова знакомы!</h3><p>Снимите отметку «Знаю» в списке, чтобы вернуть слово в карточки.</p></div>`;

    const list = `<div class="word-list">
      ${pack.cards.map((word, displayIndex) => {
        const originalIndex = displayIndex;
        const key = `${pack.id}:${originalIndex}`;
        const wordKnown = Boolean(state.words[key]);
        return `<div class="word-row ${wordKnown ? "known" : ""}">
          <span class="idx">${pad(displayIndex + 1)}</span>
          ${word.numeral ? `<span class="idx" style="width:auto;color:var(--terra)">${esc(word.numeral)}</span>` : ""}
          <span class="dari">${esc(word.dari)}</span>
          ${word.translit ? `<span class="translit">${esc(word.translit)}</span>` : ""}
          <span class="ru">${esc(word.ru)}${word.note ? `<span class="note"> · ${esc(word.note)}</span>` : ""}</span>
          <span class="actions">
            ${word.audio ? `<button class="play-round" type="button" data-play-src="${esc(word.audio)}" data-title="${esc(word.dari)}" data-subtitle="${esc(word.ru)}" aria-label="Слушать">${svg("play")}</button>` : ""}
            <button class="know-dot" type="button" data-word-toggle="${esc(key)}" aria-label="Отметить слово" aria-pressed="${wordKnown}">${svg("check")}</button>
          </span>
        </div>`;
      }).join("")}
    </div>`;

    return `<div class="page">
      <a class="back-link" href="#/vocab">${svg("arrowRight")} Все наборы</a>
      <div class="detail-hero" data-letter="${esc(pack.icon)}">
        <div class="detail-badge" style="font-size:1.8rem">${esc(pack.icon)}</div>
        <div class="detail-hero-copy">
          <span class="eyebrow">Базовая лексика · ${pack.count} слов</span>
          <h1>${esc(pack.title)}</h1>
          <div class="en-title">${esc(pack.subtitle)}</div>
          <p>${esc(pack.description)}</p>
        </div>
        <div class="detail-actions">
          <span class="badge badge-green">${known} из ${pack.cards.length} знакомо</span>
          ${pack.cards.some((word) => word.audio) ? `<button class="btn btn-primary" type="button" data-play-all="pack:${esc(pack.id)}">${svg("play")} Слушать набор</button>` : ""}
        </div>
      </div>
      ${pack.script ? `<div class="notice" style="margin-top:18px">${svg("file")}<span>Скрипт к набору: <a class="text-button" href="https://docs.google.com/document/d/${esc(pack.script.id)}/edit" target="_blank" rel="noopener">${esc(pack.script.name)} · открыть документ</a></span></div>` : ""}
      <div class="flash-toolbar">
        <div class="view-switch">
          <button class="${ui.packView === "cards" ? "active" : ""}" type="button" data-pack-view="cards">${svg("cards")} Карточки</button>
          <button class="${ui.packView === "list" ? "active" : ""}" type="button" data-pack-view="list">${svg("list")} Список</button>
        </div>
        <button class="btn btn-soft btn-sm" type="button" data-pack-direction="${esc(pack.id)}">${russianFirst ? "Сначала: русский" : "Сначала: дари"}</button>
        <button class="btn btn-soft btn-sm" type="button" data-shuffle-pack="${esc(pack.id)}">↝ Перемешать</button>
        <div class="progress-inline" style="min-width:220px"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>
      </div>
      ${ui.packView === "list" ? list : flash}
      <div class="notice" style="margin-top:24px">${svg("headphones")}<span>${pack.noAudio ? "В этой подборке нет аудиозаписей. Изучайте слова с помощью карточек и отмечайте знакомые." : pack.id === "numbers" ? "Числа дари пишутся восточными цифрами, а звучат почти как персидские. Обратите внимание на «و» (о) между десятками и единицами." : "Аудио записано носителями: сначала слово на английском, затем дари. Повторяйте вслед за диктором, не боясь ошибиться."}</span></div>
    </div>`;
  };

  const renderTrainer = (id) => {
    if (id === "greetings") return renderPack("greetings");
    const trainer = DATA.vocab.trainers.find((x) => x.id === id);
    if (!trainer) return notFound("Тренажёр не найден");
    remember({ label: "Аудиотренажёр", title: trainer.title, subtitle: `${trainer.count} записей · ${trainer.description}`, href: `#/trainer/${trainer.id}`, mark: "🎧" });
    const hasWords = Array.isArray(trainer.words) && trainer.words.length === trainer.audio.length;
    return `<div class="page">
      <a class="back-link" href="#/vocab">${svg("arrowRight")} Базовая лексика</a>
      <div class="detail-hero" data-letter="🎧">
        <div class="detail-badge" style="font-size:1.7rem">${svg("headphones")}</div>
        <div class="detail-hero-copy">
          <span class="eyebrow">Аудиотренажёр · ${trainer.count} записей</span>
          <h1>${esc(trainer.title)}</h1>
          <div class="en-title">${esc(trainer.category)}</div>
          <p>${esc(trainer.description)}</p>
        </div>
        <div class="detail-actions"><button class="btn btn-primary" type="button" data-play-all="trainer:${esc(trainer.id)}">${svg("play")} Слушать всё</button></div>
      </div>
      <div class="flash-toolbar">
        <div class="section-head" style="margin:0"><div><h2>${hasWords ? "Фразы и аудио" : "Аудиозаписи"}</h2><p>${hasWords ? "Читайте перевод, слушайте запись и повторяйте вслух." : "Слушайте записи и повторяйте вслух."}</p></div></div>
        <span class="badge badge-green">${trainer.audio.length} записей</span>
      </div>
      <div class="word-list">
        ${trainer.audio.map((file, i) => {
          const word = hasWords ? trainer.words[i] : null;
          return `<div class="word-row">
            <span class="idx">${pad(i + 1)}</span>
            ${word ? `<span class="dari" lang="fa" dir="rtl">${esc(word.dari)}</span><span class="ru">${esc(word.ru)}</span>` : `<span class="ru">${esc(file.name)}</span>`}
            <span class="actions"><button class="play-round" type="button" data-play-src="${esc(file.path)}" data-queue="trainer:${esc(trainer.id)}" data-qindex="${i}" data-title="Запись ${i + 1}" data-subtitle="${esc(trainer.title)}" aria-label="Слушать запись ${i + 1}">${svg("play")}</button></span>
          </div>`;
        }).join("")}
      </div>
      ${trainer.script ? `<div class="notice" style="margin-top:18px">${svg("file")}<span>Скрипт к аудиозаписям: <a class="text-button" href="https://docs.google.com/document/d/${esc(trainer.script.id)}/edit" target="_blank" rel="noopener">${esc(trainer.script.name)} · открыть документ</a></span></div>` : ""}
      <div class="notice" style="margin-top:18px">${svg("info")}<span>${hasWords ? "Сначала попробуйте понять фразу на слух, затем сверьтесь с переводом. Прослушивайте запись несколько раз и повторяйте за диктором." : "Слушайте по 5–7 записей за раз и возвращайтесь к ним через день. Повторение важнее скорости."}</span></div>
    </div>`;
  };

  /* ---------- Практика ---------- */
  const PRACTICE_MODES = {
    words: { title: "Слова", desc: "Дари → русский перевод", icon: "cards" },
    listening: { title: "Аудирование", desc: "Услышать и понять слово", icon: "headphones" },
    letters: { title: "Буквы", desc: "Узнать букву по написанию", icon: "alphabet" },
    phrases: { title: "Фразы", desc: "Русский → фраза на дари", icon: "quote" },
  };
  let quiz = null;

  const practiceWordPool = () => {
    const cards = [
      ...allCards(),
      ...(DATA.vocab.noAudioPacks || []).flatMap((pack) => pack.cards.map((card, index) => ({ pack, card, index, key: `${pack.id}:${index}` }))),
      ...textbook2Collections.flatMap((collection) => collection.cards.map((card, index) => ({
        pack: { title: `Учебник 2 · Урок ${collection.id} · Словарь` }, card, index, key: `textbook2:${collection.id}:${index}`,
      }))),
      ...textbook2TaskCollections.flatMap((collection) => collection.cards.map((card, index) => ({
        pack: { title: `Учебник 2 · Урок ${collection.lessonId} · Слова из заданий` }, card, index, key: `textbook2-task:${collection.lessonId}:${index}`,
      }))),
    ].filter((item) => item.card && item.card.dari && item.card.ru);
    return uniq(cards, (item) => `${item.card.dari.trim().toLowerCase()}|${item.card.ru.trim().toLowerCase()}`);
  };

  const practicePhrasePool = () => {
    const mainCourse = DATA.lessons.flatMap((lesson) => (lesson.phrases || []).map((phrase) => ({
      ...phrase, lesson: lesson.num, courseLabel: "Основной курс",
    })));
    const textbookCourse = Object.entries(textbook2PhraseTasksByLesson).flatMap(([lesson, tasks]) => tasks.map((task) => ({
      dari: task.answer, ru: task.prompt, translit: "", lesson: Number(lesson), courseLabel: "Учебник 2",
    })));
    return uniq([...mainCourse, ...textbookCourse].filter((phrase) => phrase.dari && phrase.ru),
      (phrase) => `${phrase.dari.trim().toLowerCase()}|${phrase.ru.trim().toLowerCase()}`);
  };

  const makeQuestions = (mode, count) => {
    if (mode === "letters") {
      const pool = uniq(DATA.letters, (x) => x.name);
      return sample(pool, Math.min(count, pool.length)).map((letter) => {
        const wrong = sample(pool.filter((x) => x.name !== letter.name), 3).map((x) => x.name);
        const options = shuffle([letter.name, ...wrong]);
        return {
          prompt: letter.char, promptKind: "dari", promptLabel: "Как называется эта буква?",
          sub: `Группа ${letter.lesson}`, options: options.map((label) => ({ label })),
          correctIndex: options.indexOf(letter.name),
          explanation: `${letter.name} · ${letter.latin}`,
          detail: letter.sound,
        };
      });
    }
    if (mode === "phrases") {
      const pool = practicePhrasePool();
      return sample(pool, Math.min(count, pool.length)).map((phrase) => {
        const wrong = sample(pool.filter((x) => x.dari !== phrase.dari), 3).map((x) => x.dari);
        const options = shuffle([phrase.dari, ...wrong]);
        return {
          prompt: phrase.ru, promptKind: "ru", promptLabel: "Выберите фразу на дари",
          sub: `${phrase.courseLabel} · урок ${phrase.lesson}`, options: options.map((label) => ({ label })),
          optionDari: true, optionsSingle: true,
          correctIndex: options.indexOf(phrase.dari),
          explanation: phrase.translit ? `${phrase.dari} · ${phrase.translit}` : phrase.dari,
          detail: phrase.ru,
        };
      });
    }
    const source = practiceWordPool().filter((item) => mode !== "listening" || item.card.audio);
    const pool = source;
    return sample(pool, Math.min(count, pool.length)).map((item) => {
      const wrong = sample(uniq(pool.filter((x) => x.card.ru.toLowerCase() !== item.card.ru.toLowerCase()), (x) => x.card.ru.toLowerCase()), 3).map((x) => x.card.ru);
      const options = shuffle([item.card.ru, ...wrong]);
      return {
        prompt: item.card.dari, promptKind: "dari",
        promptLabel: mode === "listening" ? "Прослушайте и выберите перевод" : "Переведите на русский",
        sub: mode === "listening" ? "Нажмите «Слушать» и выберите слово" : item.card.translit,
        audio: item.card.audio,
        hidePrompt: mode === "listening",
        options: options.map((label) => ({ label })),
        correctIndex: options.indexOf(item.card.ru),
        explanation: `${item.card.dari} · ${item.card.translit}`,
        detail: `Набор «${item.pack.title}»`,
      };
    });
  };

  const startQuiz = () => {
    const mode = ui.practiceMode;
    const count = Number(ui.practiceCount) || 10;
    const questions = makeQuestions(mode, count);
    if (!questions.length) {
      toast("Для этого режима пока недостаточно данных", "info");
      return;
    }
    quiz = { mode, count: questions.length, questions, index: 0, score: 0, xp: 0, answered: false, selected: null, finished: false };
    renderRoute({ scroll: false });
  };

  const answerQuiz = (choice) => {
    if (!quiz || quiz.answered || quiz.finished) return;
    const q = quiz.questions[quiz.index];
    quiz.selected = Number(choice);
    quiz.answered = true;
    if (quiz.selected === q.correctIndex) {
      quiz.score += 1;
      quiz.xp += 5;
      addXp(5);
    }
    renderRoute({ scroll: false });
  };

  const nextQuestion = () => {
    if (!quiz || !quiz.answered) return;
    if (quiz.index + 1 >= quiz.questions.length) {
      quiz.finished = true;
      const accuracy = Math.round((quiz.score / quiz.questions.length) * 100);
      const best = state.quizBest[quiz.mode] || { best: 0, attempts: 0 };
      state.quizBest[quiz.mode] = { best: Math.max(best.best || 0, accuracy), attempts: (best.attempts || 0) + 1 };
      saveState();
    } else {
      quiz.index += 1;
      quiz.answered = false;
      quiz.selected = null;
    }
    renderRoute({ scroll: false });
  };

  const renderPractice = () => {
    if (quiz) {
      if (quiz.finished) return renderQuizResult();
      return renderQuiz();
    }
    const total = practiceWordPool().length;
    const phraseTotal = practicePhrasePool().length;
    return `<div class="page">
      <div class="page-head">
        <div><span class="eyebrow">Проверка</span><h1>Практика</h1><p>Короткая тренировка на слух, память и узнавание. Каждый правильный ответ приносит 5 XP, а ошибки просто показывают, что повторить.</p></div>
      </div>
      <div class="practice-layout">
        <div class="practice-setup">
          <div class="panel">
            <div class="panel-head"><div><h2>Что тренируем?</h2><p>Выберите режим — вопросы собираются случайно из всего курса.</p></div></div>
            <div class="mode-grid">
              ${Object.entries(PRACTICE_MODES).map(([id, mode]) => `<button class="mode-card ${ui.practiceMode === id ? "selected" : ""}" type="button" data-mode="${id}">
                <span class="mode-icon">${svg(mode.icon)}</span>
                <span><h3>${mode.title}</h3><p>${mode.desc}</p></span>
                <span class="mode-check"></span>
              </button>`).join("")}
            </div>
            <div class="practice-options" style="margin-top:22px">
              <label>Вопросов:
                <select class="select" id="practice-count">
                  ${[5, 10, 15].map((n) => `<option value="${n}" ${Number(ui.practiceCount) === n ? "selected" : ""}>${n}</option>`).join("")}
                </select>
              </label>
              <button class="btn btn-primary btn-lg" type="button" data-start-quiz>${svg("play")} Начать тренировку</button>
              <span class="practice-note">${total} слов · ${DATA.letters.length} букв · ${phraseTotal} фраз</span>
            </div>
          </div>
          <div class="panel">
            <h3>Ваши результаты</h3>
            <div class="about-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">
              ${Object.entries(PRACTICE_MODES).map(([id, mode]) => {
                const best = state.quizBest[id];
                return `<div class="word-card-sm" style="display:block"><div class="translit">${mode.title}</div><div class="dari" style="font-size:1.35rem;font-family:var(--serif);direction:ltr">${best ? best.best + "%" : "—"}</div><div class="ru">${best ? `${best.attempts} ${plural(best.attempts, ["попытка", "попытки", "попыток"])}` : "ещё не было"}</div></div>`;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  };

  const renderQuiz = () => {
    const q = quiz.questions[quiz.index];
    const progress = ((quiz.index + (quiz.answered ? 1 : 0)) / quiz.questions.length) * 100;
    const letters = ["A", "B", "C", "D"];
    return `<div class="page">
      <div class="practice-layout">
        <div class="quiz-shell">
          <div class="quiz-top">
            <span>Вопрос ${quiz.index + 1} из ${quiz.questions.length}</span>
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <span class="quiz-score">${svg("star")} ${quiz.score}</span>
            <button class="text-button" type="button" data-quiz-setup>Выйти</button>
          </div>
          <div class="quiz-prompt">
            <div class="prompt-label">${esc(q.promptLabel)}</div>
            ${q.hidePrompt
              ? `<div class="quiz-audio">${q.audio ? `<button class="btn btn-primary btn-lg" type="button" data-play-src="${esc(q.audio)}" data-title="Аудирование" data-subtitle="Прослушайте слово и выберите перевод">${svg("volume")} Слушать запись</button>` : ""}</div>`
              : `<div class="quiz-word ${q.promptKind === "ru" ? "ru" : ""}">${esc(q.prompt)}</div>`}
            ${q.sub ? `<div class="quiz-sub">${esc(q.sub)}</div>` : ""}
          </div>
          <div class="quiz-options ${q.optionsSingle ? "single" : ""}">
            ${q.options.map((option, i) => {
              let cls = "";
              if (quiz.answered) {
                if (i === q.correctIndex) cls = "correct";
                else if (i === quiz.selected) cls = "wrong";
              }
              return `<button class="quiz-option ${cls}" type="button" data-answer="${i}" ${quiz.answered ? "disabled" : ""}>
                <span class="key">${letters[i] || i + 1}</span>
                ${q.optionDari ? `<span class="option-dari dari">${esc(option.label)}</span>` : `<span>${esc(option.label)}</span>`}
              </button>`;
            }).join("")}
          </div>
          ${quiz.answered ? `<div class="quiz-feedback ${quiz.selected === q.correctIndex ? "good" : "bad"}">
            <div><strong>${quiz.selected === q.correctIndex ? "Верно! +5 XP" : "Пока не совпало"}</strong><span>${esc(q.explanation)}${q.detail ? ` · ${esc(q.detail)}` : ""}</span></div>
            <button class="btn ${quiz.selected === q.correctIndex ? "btn-primary" : "btn-terra"} btn-sm" type="button" data-quiz-next>${quiz.index + 1 >= quiz.questions.length ? "Результат" : "Дальше"} ${svg("arrowRight")}</button>
          </div>` : ""}
        </div>
      </div>
    </div>`;
  };

  const renderQuizResult = () => {
    const accuracy = Math.round((quiz.score / quiz.questions.length) * 100);
    const best = state.quizBest[quiz.mode] || { best: accuracy, attempts: 1 };
    const message = accuracy >= 90 ? "Отличный слух и память!" : accuracy >= 60 ? "Хороший результат — ещё немного повторения." : "Материал только начинает укладываться. Повторите и попробуйте снова.";
    return `<div class="page">
      <div class="practice-layout">
        <div class="quiz-shell">
          <div class="quiz-result">
            <div class="result-ring" style="--score:${accuracy}"><div><strong>${accuracy}%</strong><span>результат</span></div></div>
            <h2>${message}</h2>
            <p>${PRACTICE_MODES[quiz.mode].title} · ${quiz.questions.length} ${plural(quiz.questions.length, ["вопрос", "вопроса", "вопросов"])}</p>
            <div class="result-stats">
              <div><strong>${quiz.score}/${quiz.questions.length}</strong><small>верно</small></div>
              <div><strong>+${quiz.xp}</strong><small>XP за тренировку</small></div>
              <div><strong>${best.best}%</strong><small>лучший результат</small></div>
            </div>
            <div class="result-actions">
              <button class="btn btn-primary" type="button" data-quiz-again>${svg("rotate")} Ещё раз</button>
              <button class="btn btn-ghost" type="button" data-quiz-setup>Другой режим</button>
              <a class="btn btn-ghost" href="#/vocab">В словарь ${svg("arrowRight")}</a>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  };

  /* ---------- Аудиотека ---------- */
  const libRoleLabel = (role) => role === "tasks" ? "Задания" : role === "scripts" ? "Скрипт" : "PDF";
  const libCounts = (node) => {
    const parts = [`${fmt(node.fileCount)} ${plural(node.fileCount, ["файл", "файла", "файлов"])}`];
    if (node.audioCount) parts.push(`${fmt(node.audioCount)} аудио`);
    if (node.pdfCount) parts.push(`${fmt(node.pdfCount)} PDF`);
    if (node.folderCount) parts.push(`${fmt(node.folderCount)} ${plural(node.folderCount, ["папка", "папки", "папок"])}`);
    return parts.join(" · ");
  };
  const libResourceChip = (res) => {
    const label = libRoleLabel(res.role);
    const subtitle = `${label} · страница ${res.page}`;
    return res.local
      ? `<button class="res-chip" type="button" data-lib-pdf-local="${esc(res.local)}" data-page="${res.page}" data-title="${esc(res.name)}" data-subtitle="${esc(subtitle)}">${svg("file")}<span>${esc(label)} · стр. ${res.page}</span></button>`
      : `<button class="res-chip" type="button" data-lib-pdf="${esc(res.id)}" data-page="${res.page}" data-title="${esc(res.name)}" data-subtitle="${esc(subtitle)}">${svg("file")}<span>${esc(label)}</span></button>`;
  };
  const libFileRow = (file, path = "") => {
    const ext = fileExt(file.name);
    const audioFile = isAudio(file.name);
    const pdfFile = isPdf(file.name);
    const kindClass = audioFile ? "audio" : pdfFile ? "pdf" : "";
    const typeLabel = ext ? ext.toUpperCase() : "FILE";
    const resources = file.resources || [];
    const pdfLocal = pdfFile && file.local ? file.local : "";
    let subtitle;
    if (audioFile) {
      subtitle = path || "Аудиозапись";
      if (resources.length) subtitle += ` · ${resources.length} ${plural(resources.length, ["материал", "материала", "материалов"])}`;
    } else if (pdfFile) {
      subtitle = file.pages
        ? `${libRoleLabel(file.role)} · ${fmt(file.pages)} стр.${file.local ? " · сохранён локально" : ""}`
        : (path || "PDF-документ");
    } else {
      subtitle = path || "Файл";
    }
    const pdfSubtitle = file.pages ? `${libRoleLabel(file.role)} · ${fmt(file.pages)} стр.` : "PDF";
    return `<div class="file-row">
      <span class="file-icon ${kindClass}">${esc(typeLabel)}</span>
      <div class="file-info"><strong>${esc(file.name)}</strong><span>${esc(subtitle)}</span>
        ${resources.length ? `<div class="file-resources">${resources.map(libResourceChip).join("")}</div>` : ""}
      </div>
      <div class="file-actions">
        ${audioFile ? `<button class="btn-icon" type="button" data-lib-play="${esc(file.id)}" data-title="${esc(stripExt(file.name))}" data-subtitle="${esc(path || "Аудиотека")}" aria-label="Слушать">${svg("play")}</button>` : ""}
        ${pdfFile ? (pdfLocal
          ? `<button class="btn-icon" type="button" data-lib-pdf-local="${esc(pdfLocal)}" data-page="1" data-title="${esc(stripExt(file.name))}" data-subtitle="${esc(pdfSubtitle)}" aria-label="Открыть PDF">${svg("eye")}</button>`
          : `<button class="btn-icon" type="button" data-lib-pdf="${esc(file.id)}" data-page="1" data-title="${esc(stripExt(file.name))}" data-subtitle="${esc(pdfSubtitle)}" aria-label="Открыть PDF">${svg("eye")}</button>`) : ""}
        <a class="btn-icon" href="${esc(driveDownload(file.id))}" target="_blank" rel="noopener" aria-label="Скачать файл">${svg("download")}</a>
      </div>
    </div>`;
  };

  const collectLibMatches = (rootNode, query) => {
    const q = query.toLowerCase();
    const folders = [];
    const files = [];
    const walk = (node, path) => {
      (node.folders || []).forEach((child) => {
        const childPath = path ? `${path} / ${child.name}` : child.name;
        if (child.name.toLowerCase().includes(q)) folders.push({ node: child, path: childPath });
        walk(child, childPath);
      });
      (node.files || []).forEach((file) => {
        if (file.name.toLowerCase().includes(q)) files.push({ file, path });
      });
    };
    walk(rootNode, rootNode.name);
    return { folders, files };
  };

  const renderLibSearch = (rootNode, query) => {
    const { folders, files } = collectLibMatches(rootNode, query);
    return `<div class="lib-toolbar"><span class="small muted">Найдено: ${folders.length} ${plural(folders.length, ["папка", "папки", "папок"])}, ${files.length} ${plural(files.length, ["файл", "файла", "файлов"])}</span></div>
      ${(node.id === "1JUH2TPsx14k-XkgvoJPY13_16pcwALIB" ? (renderStoryGroups(files) || { otherFiles: files }).otherFiles : files).length ? `<div class="section-head"><div><h2>${node.id === "1JUH2TPsx14k-XkgvoJPY13_16pcwALIB" ? "Скрипты" : "Файлы"}</h2><p>${(node.id === "1JUH2TPsx14k-XkgvoJPY13_16pcwALIB" ? (renderStoryGroups(files) || { otherFiles: files }).otherFiles : files).length} ${plural((node.id === "1JUH2TPsx14k-XkgvoJPY13_16pcwALIB" ? (renderStoryGroups(files) || { otherFiles: files }).otherFiles : files).length, ["файл", "файла", "файлов"])} · аудио слушается здесь, скрипты открываются на нужной странице</p></div></div>
      <div class="file-list">${(node.id === "1JUH2TPsx14k-XkgvoJPY13_16pcwALIB" ? (renderStoryGroups(files) || { otherFiles: files }).otherFiles : files).map((file) => libFileRow(file, "")).join("")}</div>` : ""}
      ${folders.length ? `<div class="folder-list">${folders.slice(0, 40).map((x) => `<a class="folder-item" href="#/library/${esc(x.node.id)}">
        <span class="folder-icon">${svg("folder")}</span><div><strong>${esc(x.node.name)}</strong><small>${esc(x.path)}</small></div>
      </a>`).join("")}</div>` : ""}
      ${files.length ? `<div class="file-list">${files.slice(0, 200).map((x) => libFileRow(x.file, x.path)).join("")}</div>` : ""}
      ${!folders.length && !files.length ? `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте часть названия файла или папки.</p></div>` : ""}`;
  };

  const renderStoryGroups = (files) => {
    const stories = new Map();
    const otherFiles = [];
    files.forEach((file) => {
      const match = file.name.match(/^Story\s+(\d+)-(\d+)\.mp3$/i);
      if (!match) { otherFiles.push(file); return; }
      const storyNo = Number(match[1]);
      const partNo = Number(match[2]);
      if (!stories.has(storyNo)) stories.set(storyNo, []);
      stories.get(storyNo).push({ file, partNo });
    });
    if (!stories.size) return null;
    const html = [...stories.entries()].sort((a, b) => a[0] - b[0]).map(([storyNo, parts]) => {
      parts.sort((a, b) => a.partNo - b.partNo);
      return `<section class="story-group">
        <div class="section-head story-group-head"><div><h2>Рассказ ${storyNo}</h2><p>${parts.length} ${plural(parts.length, ["часть", "части", "частей"])}</p></div></div>
        <div class="file-list story-parts">${parts.map(({ file }) => libFileRow(file, `Рассказ ${storyNo}`)).join("")}</div>
      </section>`;
    }).join("");
    return { html, otherFiles };
  };

  const renderLibraryNode = (entry) => {
    const node = entry.node;
    const root = entry.trail[0];
    const query = ui.libQuery.trim();
    const trailLinks = entry.trail.map((item, i) => i === entry.trail.length - 1
      ? `<span>${esc(item.name)}</span>`
      : `<a href="#/library/${esc(item.id)}">${esc(item.name)}</a><span>/</span>`).join("");
    const searchBar = `<div class="lib-toolbar">
      <div class="search-input-wrap">${svg("search")}<input class="search-input" id="library-search" type="search" placeholder="Искать в этой папке…" value="${esc(ui.libQuery)}" autocomplete="off"></div>
      <span class="small muted">${libCounts(node)}</span>
    </div>`;
    let content;
    if (query) {
      content = searchBar + renderLibSearch(node, query);
    } else {
      const folders = node.folders || [];
      const files = node.files || [];
      const isStoryFolder = node.id === "1JUH2TPsx14k-XkgvoJPY13_16pcwALIB";
      const storyGroups = isStoryFolder ? renderStoryGroups(files) : null;
      const scriptFiles = isStoryFolder ? (storyGroups || { otherFiles: files }).otherFiles : files;
      const scriptsSection = scriptFiles.length ? `<div class="section-head"><div><h2>${isStoryFolder ? "Скрипты" : "Файлы"}</h2><p>${scriptFiles.length} ${plural(scriptFiles.length, ["файл", "файла", "файлов"])} · аудио слушается здесь, скрипты открываются на нужной странице</p></div></div>
      <div class="file-list">${scriptFiles.map((file) => libFileRow(file, "")).join("")}</div>` : "";
      if (node.id === "1BcaMzJKr5Bl3vGdpC3V6DAQdQq3YAmpE") {
        const units = folders.filter((folder) => /^virtual-lesson-\d+$/.test(folder.id)).sort((a, b) => Number(a.id.slice(-2)) - Number(b.id.slice(-2)));
        const teacherFolders = folders.filter((folder) => folder.id === "1kYzBjg4-XJXI2ZO9BhxgJRGt4tZ3HCdX");
        const cardFolders = folders.filter((folder) => !/^virtual-lesson-\d+$/.test(folder.id) && folder.id !== "1kYzBjg4-XJXI2ZO9BhxgJRGt4tZ3HCdX");
        const themes = DATA.studentUnits || [];
        const semesterQuery = ui.semesterTwoQuery.trim().toLowerCase();
        const semesterTags = ["Семья и общество", "География и путешествия", "Работа и экономика", "Общество и история", "Культура и досуг", "Технологии", "Повседневная жизнь"];
        const filteredUnits = units.filter((folder) => {
          const num = Number(folder.id.slice(-2));
          const theme = themes.find((item) => item.num === num) || { title: "", summary: "" };
          return (ui.semesterTwoTag === "all" || semesterTwoCategory(theme) === ui.semesterTwoTag) &&
            (!semesterQuery || (num + " " + theme.title + " " + theme.summary).toLowerCase().includes(semesterQuery));
        });
        const bookFiles = files.filter((file) => isPdf(file.name));
        const otherFiles = files.filter((file) => !isPdf(file.name));
        content = `<div class="breadcrumbs"><a href="#/library">Аудиотека</a><span>/</span>${trailLinks}</div>
        <div class="lesson-toolbar">
          <div class="search-input-wrap">${svg("search")}<input class="search-input" id="semester-two-search" type="search" placeholder="Найти урок или тему…" value="${esc(ui.semesterTwoQuery)}" autocomplete="off"></div>
          <div class="chip-row">
            <button class="chip ${ui.semesterTwoTag === "all" ? "active" : ""}" type="button" data-semester-two-tag="all">Все</button>
            ${semesterTags.map((tag) => `<button class="chip ${ui.semesterTwoTag === tag ? "active" : ""}" type="button" data-semester-two-tag="${esc(tag)}">${esc(tag)}</button>`).join("")}
          </div>
          <span class="small muted">${filteredUnits.length} из ${units.length}</span>
        </div>
        <div class="lesson-grid student-unit-grid">
          ${filteredUnits.map((folder) => {
            const num = Number(folder.id.slice(-2));
            const theme = themes.find((item) => item.num === num) || { title: "Тема урока", summary: "Откройте материалы этого учебного блока." };
            const audioCount = (folder.files || []).filter((file) => isAudio(file.name)).length;
            const complete = Boolean(state.semesterTwoLessons[num]);
            return `<a class="lesson-card student-unit-card ${complete ? "done" : ""}" href="#/lessons/semester-2/lesson/${num}" data-num="${num}">
              ${complete ? `<span class="done-flag badge badge-done">${svg("check")} пройден</span>` : ""}
              <div class="lesson-top"><div class="lesson-num">${String(num).padStart(2, "0")}<small>УРОК</small></div><span class="badge ${complete ? "badge-done" : "badge-ghost"}">${complete ? svg("check") + " пройден" : audioCount + " аудио"}</span></div>
              <h3>${esc(theme.title)}</h3>
              <div class="en">STUDENT BOOK · SEMESTER 2</div>
              <p class="summary">${esc(theme.summary)}</p>
              <div class="lesson-card-bottom"><span class="meta"><span>${svg("wave")} ${audioCount}</span><span>${svg("file")} ${(folder.files || []).length} файлов</span></span><span>Открыть ${svg("arrowRight")}</span></div>
            </a>`;
          }).join("")}
        </div>
        ${!filteredUnits.length ? `<div class="empty-state"><h3>Ничего не нашлось</h3><p>Попробуйте изменить запрос или категорию.</p><button class="btn btn-soft btn-sm" type="button" data-clear-semester-two-filter>Сбросить фильтры</button></div>` : ""}
        ${teacherFolders.length ? `<div class="section-head"><div><h2>Материалы преподавателя</h2><p>Дополнительные учебные тома для уроков 1–40</p></div></div><div class="folder-list">${teacherFolders.map((folder) => `<a class="folder-item" href="#/lessons/semester-2/${esc(folder.id)}"><span class="folder-icon">${svg("folder")}</span><div><strong>${esc(folder.name)}</strong><small>${(folder.files || []).length} PDF</small></div></a>`).join("")}</div>` : ""}
        ${cardFolders.length ? `<div class="section-head"><div><h2>Карточки</h2><p>Исходные папки карточек сохранены без изменений</p></div></div>
        <div class="folder-list">${cardFolders.map((folder) => { const pdfCount = (folder.files || []).filter((file) => isPdf(file.name)).length; return `<a class="folder-item" href="#/library/${esc(folder.id)}"><span class="folder-icon">${svg("folder")}</span><div><strong>${esc(folder.name)}</strong><small>${pdfCount} ${plural(pdfCount, ["PDF", "PDF", "PDF"])}</small></div></a>`; }).join("")}</div>` : ""}
        ${otherFiles.length ? `<div class="file-list">${otherFiles.map((file) => libFileRow(file, "")).join("")}</div>` : ""}
        <div class="section-head"><div><h2>Учебники · Семестр 2</h2><p>Два студенческих тома с исходными материалами курса</p></div></div>
        ${bookFiles.length ? `<div class="file-list">${bookFiles.map((file) => libFileRow(file, "Student Copy · Семестр 2")).join("")}</div>` : ""}`;
      } else {
        content = `${searchBar}
      <div class="breadcrumbs"><a href="#/library">Аудиотека</a><span>/</span>${trailLinks}</div>
      ${isStoryFolder ? scriptsSection : ""}
      ${folders.length ? `<div class="section-head" style="margin-top:8px"><div><h2>Папки</h2><p>${folders.length} ${plural(folders.length, ["папка", "папки", "папок"])}</p></div></div>
      <div class="folder-list">
        ${folders.map((folder) => `<a class="folder-item" href="#/library/${esc(folder.id)}">
          <span class="folder-icon">${svg("folder")}</span>
          <div><strong>${esc(folder.name)}</strong><small>${libCounts(folder)}</small></div>
        </a>`).join("")}
      </div>` : ""}
      ${storyGroups ? storyGroups.html : ""}
      ${!isStoryFolder ? scriptsSection : ""}
      ${!folders.length && !files.length ? `<div class="empty-state"><h3>Папка пуста</h3><p>Здесь пока нет файлов.</p></div>` : ""}`;
      }
    }
    const description = node.description || root.description || "Материалы архива DLIFLC.";
    return `<div class="page">
      <a class="back-link" href="#/library">${svg("arrowRight")} Все разделы</a>
      <div class="page-head">
        <div><span class="eyebrow">Аудиотека · ${fmt(node.fileCount)} ${plural(node.fileCount, ["файл", "файла", "файлов"])}</span><h1>${esc(node.name)}</h1>${node.id === "1BcaMzJKr5Bl3vGdpC3V6DAQdQq3YAmpE" ? "" : `<p>${esc(description)}</p>`}</div>
        <div class="page-head-actions"><a class="btn btn-ghost btn-sm" href="${esc(driveFolder(node.id))}" target="_blank" rel="noopener">${svg("external")} Открыть в Drive</a></div>
      </div>
      ${content}
      <div class="library-source-note"><span>Аудио и PDF из исходного архива DLIFLC. Записи аудиотеки открываются во встроенном плеере Google Drive, а скрипты и задания — на странице нужной записи.</span><a href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">Исходная папка ${svg("external")}</a></div>
    </div>`;
  };

  const renderAlphabetBeginnerArchive = () => {
    const entry = findLib("1Hu_boes9lHIgzUj2NLaSeDQsAy_hxkAy");
    if (!entry) return notFound("Beginner's Dari materials not found");
    return renderLibraryNode(entry)
      .replaceAll("#/library/1Hu_boes9lHIgzUj2NLaSeDQsAy_hxkAy", "#/alphabet/archive/1Hu_boes9lHIgzUj2NLaSeDQsAy_hxkAy")
      .replaceAll("#/library", "#/alphabet")
      .replaceAll("Все разделы", "К алфавиту")
      .replaceAll("Аудиотека ·", "Алфавит ·");
  };

  const renderLibrary = (id) => {
    if (id) {
      const entry = findLib(id);
      if (!entry) return notFound("Папка не найдена");
      return renderLibraryNode(entry);
    }
    const total = DATA.meta.counts;
    const query = ui.libQuery.trim();
    let searchContent = "";
    if (query) {
      const allFolders = [];
      const allFiles = [];
      DATA.library.filter((root) => root.id !== "1Hu_boes9lHIgzUj2NLaSeDQsAy_hxkAy").forEach((root) => {
        const found = collectLibMatches(root, query);
        allFolders.push(...found.folders);
        allFiles.push(...found.files);
      });
      searchContent = `<div class="lib-toolbar"><span class="small muted">Поиск по всей аудиотеке: ${allFolders.length} ${plural(allFolders.length, ["папка", "папки", "папок"])}, ${allFiles.length} ${plural(allFiles.length, ["файл", "файла", "файлов"])}</span></div>
        ${allFolders.length ? `<div class="folder-list">${allFolders.slice(0, 40).map((x) => `<a class="folder-item" href="#/library/${esc(x.node.id)}"><span class="folder-icon">${svg("folder")}</span><div><strong>${esc(x.node.name)}</strong><small>${esc(x.path)}</small></div></a>`).join("")}</div>` : ""}
        ${allFiles.length ? `<div class="file-list">${allFiles.slice(0, 200).map((x) => libFileRow(x.file, x.path)).join("")}</div>` : ""}
        ${!allFolders.length && !allFiles.length ? `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте другое название.</p></div>` : ""}`;
    }
    return `<div class="page">
      <div class="page-head">
        <div><span class="eyebrow">Архив · ${total.libraryCollections} разделов</span><h1>Аудиотека</h1><p>${fmt(total.libraryFiles)} ${plural(total.libraryFiles, ["файл", "файла", "файлов"])}, ${fmt(total.libraryAudio)} аудио и ${fmt(total.libraryPdfs)} PDF во всех папках исходного Drive. ${fmt(total.linkedAudio)} ${plural(total.linkedAudio, ["запись", "записи", "записей"])} получили прямые ссылки на скрипты и задания — на нужной странице общего PDF.</p></div>
        <div class="page-head-actions"><a class="btn btn-ghost" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("external")} Открыть архив</a></div>
      </div>
      <div class="lib-toolbar">
        <div class="search-input-wrap">${svg("search")}<input class="search-input" id="library-search" type="search" placeholder="Искать по всей аудиотеке…" value="${esc(ui.libQuery)}" autocomplete="off"></div>
        <span class="small muted">${fmt(total.libraryFiles)} ${plural(total.libraryFiles, ["файл", "файла", "файлов"])} · ${total.libraryCollections} разделов</span>
      </div>
      ${query ? searchContent : `<div class="library-grid">
        ${DATA.library.filter((root) => root.id !== "1Hu_boes9lHIgzUj2NLaSeDQsAy_hxkAy").map((root) => `<a class="library-card" href="#/library/${esc(root.id)}" data-count="${root.fileCount}">
          <span class="folder-mark">${svg("folder")}</span>
          <h3>${esc(root.name)}</h3>
          <p>${esc(root.description)}</p>
          <div class="lib-meta"><span><strong>${fmt(root.fileCount)}</strong> ${plural(root.fileCount, ["файл", "файла", "файлов"])}</span><span><strong>${fmt(root.audioCount)}</strong> аудио</span><span><strong>${fmt(root.pdfCount)}</strong> PDF</span><span>${root.folderCount} ${plural(root.folderCount, ["папка", "папки", "папок"])}</span></div>
        </a>`).join("")}
      </div>
      <div class="section-head"><div><h2>Дополнительно</h2><p>Учебник и описание архива из корня Drive.</p></div></div>
      <div class="folder-list">
        ${DATA.rootFiles.map((file) => {
          const isDoc = file.type && file.type.startsWith("gdoc");
          return isDoc
            ? `<button class="folder-item" type="button" data-lib-doc="${esc(file.id)}" data-title="${esc(file.name)}" style="text-align:left"><span class="folder-icon">${svg("file")}</span><div><strong>${esc(file.name)}</strong><small>Google Docs · описание архива</small></div></button>`
            : `<button class="folder-item" type="button" data-lib-pdf="${esc(file.id)}" data-title="${esc(file.name)}" data-subtitle="Учебник дари" style="text-align:left"><span class="folder-icon">${svg("book")}</span><div><strong>${esc(file.name)}</strong><small>PDF · учебник</small></div></button>`;
        }).join("")}
      </div>`}
      <div class="library-source-note"><span>Файлы остаются в исходном Google Drive. Сайт только помогает найти нужное, слушать без скачивания и открывать скрипты на нужной странице.</span><a href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">Исходная папка ${svg("external")}</a></div>
    </div>`;
  };

  /* ---------- Учебники ---------- */
  const TEXTBOOKS = {
    1: {
      title: "Островский. Учебник для 1-го года обучения",
      driveId: "13UrEI64QzwuwY1PA_2cnlk3bg-JPBSM8",
      size: "305 МБ",
      note: "Файл большой, поэтому открывается через просмотрщик Google Drive — первые страницы могут подгружаться несколько секунд.",
    },
    2: {
      title: "Островский. Учебные материалы для 2-го года обучения",
      path: "assets/pdfs/textbook/ostrovsky-year-2.pdf",
      pages: 744,
      size: "47 МБ",
      note: "PDF на 744 страницы — читайте прямо на сайте, откройте в новой вкладке или скачайте себе.",
    },
  };
  const textbook2LessonDescriptions = {"1":"«Первое сентября». «Каникулы». «Мулла Насреддин и конец света»","2":"«Афганистан (ч.1)»","3":"«Афганистан (ч.2)». Провинции","4":"Аффиксы. Перевод прилагательных. «Природные ресурсы»","5":"Арабизмы. Арабский артикль. Арабские корни. Породы I-IV. «Соревнование»","6":"Профессии. Абстрактные существительные. «Справедливость хакима». «Промышленность Афганистана (ч.1)»","7":"«Промышленность Афганистана (ч.2)»","8":"Европеизмы. Обороты с религиозными понятиями. Машина","9":"Пуштунизмы. Переход прилагательных в существительные. «Слепой». «Базар»","10":"«Кусок хлеба»","11":"Понудительные глаголы. Сложные существительные. «Национальные блюда»","12":"Породы V-VIII, X","13":"Префиксы. Однокоренные антонимы. Наречия. «Лужайка муллы Насреддина». Глаголы","14":"Неправильные арабские корни. Имена орудия. Арабские прилагательные. Афганские имена","15":"Число арабских сущ. Ломаное множественное. Обороты с араб. местоимениями. «Краткий обзор истории Афганистана»","16":"Сложные прилагательные. Уменьшительные суффиксы. Сложные абстрактные сущ. Парные слова. Обороты описания состояния. «Больной»","17":"Отглагольные имена. Причастия. Деепричастия","18":"«Река»","19":"Слова-повторы. «Семья кочевников»","20":"Фонетика разговорного языка","21":"Стилистические различия глаголов. «Платон». Предположительное наклонение. Замечания о устной речи. «Мальчик дехканин»","22":"Усилительные частицы разговорного языка. «Мальчик дехканин»","23":"Стилистическая разница синонимов. «Гольчахра»"};
  const textbook2TaskCollections = [{ id: 1007, lessonId: 7, title: "Урок 7 · Слова из заданий", cards: [
  {
    "dari": "زردالو",
    "translit": "zardālū",
    "ru": "абрикос"
  },
  {
    "dari": "سردسیر",
    "translit": "sardsēr",
    "ru": "холодная местность"
  },
  {
    "dari": "آب بازی",
    "translit": "āb-bāzi",
    "ru": "водная забава, игра в воде"
  },
  {
    "dari": "ضراب خانه",
    "translit": "zarrāb-xāna",
    "ru": "монетный двор"
  },
  {
    "dari": "رهگذر",
    "translit": "rah-gozar",
    "ru": "прохожий"
  },
  {
    "dari": "شیریخ",
    "translit": "šīrīx",
    "ru": "афганское мороженое шир-ях"
  },
  {
    "dari": "نوروز",
    "translit": "nawrōz",
    "ru": "Навруз"
  },
  {
    "dari": "زحمتکش",
    "translit": "zahmat-kaš",
    "ru": "труженик"
  },
  {
    "dari": "کارخانه",
    "translit": "kār-xāna",
    "ru": "завод, фабрика"
  },
  {
    "dari": "مرغابی",
    "translit": "morğābi",
    "ru": "утка"
  },
  {
    "dari": "شیرخوار",
    "translit": "šīr-xwār",
    "ru": "грудной ребёнок, младенец"
  },
  {
    "dari": "دوشنبه",
    "translit": "dōšanba",
    "ru": "понедельник"
  },
  {
    "dari": "روبرو",
    "translit": "rō-ba-rō",
    "ru": "прямо, напротив"
  },
  {
    "dari": "کتابخانه",
    "translit": "ketāb-xāna",
    "ru": "библиотека"
  },
  {
    "dari": "سراپا",
    "translit": "sarāpā",
    "ru": "весь, целиком"
  },
  {
    "dari": "عکس العمل",
    "translit": "'aks-ol-'amal",
    "ru": "реакция"
  },
  {
    "dari": "ریش سفید",
    "translit": "rēš-safēd",
    "ru": "старейшина, аксакал"
  },
  {
    "dari": "گاومیش",
    "translit": "gāw-mēš",
    "ru": "буйвол"
  },
  {
    "dari": "برگریزان",
    "translit": "barg-rēzān",
    "ru": "листопад"
  },
  {
    "dari": "چارمغز",
    "translit": "čār-mağz",
    "ru": "грецкий орех"
  },
  {
    "dari": "رسم الخط",
    "translit": "rasm-ol-xat",
    "ru": "правописание"
  },
  {
    "dari": "پسمانی",
    "translit": "pasmāni",
    "ru": "остаток, отходы"
  },
  {
    "dari": "پدرکلان",
    "translit": "padar-kalān",
    "ru": "дед"
  },
  {
    "dari": "سرزمین",
    "translit": "sar-zamīn",
    "ru": "страна, земля"
  },
  {
    "dari": "آرام جویی",
    "translit": "ārām-jūyi",
    "ru": "поиск покоя (?)"
  },
  {
    "dari": "برف کوچ",
    "translit": "barf-kōč",
    "ru": "снежная лавина"
  },
  {
    "dari": "تیزرفتار",
    "translit": "tēzraftār",
    "ru": "быстроходный"
  },
  {
    "dari": "گوگرد سازی",
    "translit": "gōgard-sāzi",
    "ru": "производство спичек (серы)"
  },
  {
    "dari": "پیشرفت",
    "translit": "pēšraft",
    "ru": "прогресс"
  },
  {
    "dari": "دورادور",
    "translit": "dūr-ā-dūr",
    "ru": "вокруг, со всех сторон"
  },
  {
    "dari": "بلندقامت",
    "translit": "boland-qāmat",
    "ru": "высокий (о человеке)"
  },
  {
    "dari": "بالاپوش",
    "translit": "bālā-pōš",
    "ru": "верхняя одежда, пальто"
  },
  {
    "dari": "مال التجاره",
    "translit": "māl-ot-tejāra",
    "ru": "товар"
  },
  {
    "dari": "صنایع دستی",
    "translit": "sanāye'-e dasti",
    "ru": "кустарный промысел"
  },
  {
    "dari": "صنایع ماشینی",
    "translit": "sanāye'-e māšīni",
    "ru": "машиностроение"
  },
  {
    "dari": "صنایع خفیفه",
    "translit": "sanāye'-e xafīfa",
    "ru": "лёгкая промышленность"
  },
  {
    "dari": "صنعت نساجی",
    "translit": "san'at-e nassāji",
    "ru": "текстильная промышленность"
  },
  {
    "dari": "صنعت دوخت",
    "translit": "san'at-e dōxt",
    "ru": "швейная промышленность"
  },
  {
    "dari": "صنعت چرمگری",
    "translit": "san'at-e čarmgari",
    "ru": "кожевенная промышленность"
  },
  {
    "dari": "صنعت کفاشی",
    "translit": "san'at-e kaffāši",
    "ru": "обувная промышленность"
  },
  {
    "dari": "صنعت تولید خوراکه",
    "translit": "san'at-e tawlīd-e xōrāka",
    "ru": "пищевая промышленность"
  },
  {
    "dari": "صنعت تهیه آرد",
    "translit": "san'at-e tahiyya-ye ārd",
    "ru": "мукомольная промышленность"
  },
  {
    "dari": "صنعت نانیزی",
    "translit": "san'at-e nānizi",
    "ru": "хлебопекарная промышленность"
  },
  {
    "dari": "صنعت گوشت و شیر",
    "translit": "san'at-e gōšt-o-šīr",
    "ru": "мясомолочная промышленность"
  },
  {
    "dari": "صنعت شیرینی پزی",
    "translit": "san'at-e širīni-pazi",
    "ru": "кондитерская промышленность"
  },
  {
    "dari": "صنعت شکر",
    "translit": "san'at-e šakar",
    "ru": "сахарная промышленность"
  },
  {
    "dari": "صنعت تولید روغن نباتی",
    "translit": "san'at-e tawlīd-e rōğan-e nabāti",
    "ru": "производство растительного масла"
  },
  {
    "dari": "صنعت کشمش پاکی",
    "translit": "san'at-e kešmeš-pāki",
    "ru": "обработка изюма"
  },
  {
    "dari": "صنعت مواد خوراکه کنسروشده",
    "translit": "san'at-e mawād-e xōrāka-ye konserwašuda",
    "ru": "консервная промышленность"
  },
  {
    "dari": "صنعت مشروبات",
    "translit": "san'at-e mašrūbāt",
    "ru": "производство напитков"
  },
  {
    "dari": "صنعت یخ سازی",
    "translit": "san'at-e yax-sāzi",
    "ru": "производство льда"
  },
  {
    "dari": "صنایع ثقیله",
    "translit": "sanāye'-e saqīla",
    "ru": "тяжёлая промышленность"
  },
  {
    "dari": "صنایع معدنی",
    "translit": "sanāye'-e ma'dani",
    "ru": "горнодобывающая промышленность"
  },
  {
    "dari": "صنعت آهن",
    "translit": "san'at-e āhan",
    "ru": "чёрная металлургия"
  },
  {
    "dari": "صنعت زغال",
    "translit": "san'at-e zoğāl",
    "ru": "угольная промышленность"
  },
  {
    "dari": "صنعت مس",
    "translit": "san'at-e mes",
    "ru": "медная промышленность"
  },
  {
    "dari": "صنعت گاز",
    "translit": "san'at-e gāz",
    "ru": "газовая промышленность"
  },
  {
    "dari": "صنعت نفت",
    "translit": "san'at-e naft",
    "ru": "нефтяная промышленность"
  },
  {
    "dari": "صنایع انرژی برق",
    "translit": "sanāye'-e enerži-ye barq",
    "ru": "электроэнергетика"
  },
  {
    "dari": "صنایع ماشین سازی",
    "translit": "sanāye'-e māšīn-sāzi",
    "ru": "машиностроение"
  },
  {
    "dari": "صنعت فلزکاری",
    "translit": "san'at-e felezkāri",
    "ru": "металлообработка"
  },
  {
    "dari": "صنایع تولید مواد تعمیراتی",
    "translit": "sanāye'-e tawlīd-e mawād-e ta'mīrāti",
    "ru": "производство стройматериалов"
  },
  {
    "dari": "صنعت چوب",
    "translit": "san'at-e čōb",
    "ru": "деревообработка"
  },
  {
    "dari": "صنعت موبل سازی",
    "translit": "san'at-e mōbel-sāzi",
    "ru": "мебельная промышленность"
  },
  {
    "dari": "صنعت پولی گرافی",
    "translit": "san'at-e pūlī-grāfi",
    "ru": "полиграфическая промышленность"
  },
  {
    "dari": "صنایع کیمیاوی",
    "translit": "sanāye'-e kīmiyāwi",
    "ru": "химическая промышленность"
  },
  {
    "dari": "فابریکه نساجی",
    "translit": "fābrīka-ye nassāji",
    "ru": "текстильная фабрика"
  },
  {
    "dari": "فابریکه پشمینه بافی",
    "translit": "fābrīka-ye pašmīna-bāfi",
    "ru": "шерстоткацкая фабрика"
  },
  {
    "dari": "فابریکه چرمگری",
    "translit": "fābrīka-ye čarmgari",
    "ru": "кожевенный завод"
  },
  {
    "dari": "فابریکه بوت دوزی",
    "translit": "fābrīka-ye bōt-dōzi",
    "ru": "обувная фабрика"
  },
  {
    "dari": "سیلو",
    "translit": "sēlō",
    "ru": "элеватор, силос"
  },
  {
    "dari": "آسیاب",
    "translit": "āsyāb",
    "ru": "мельница"
  },
  {
    "dari": "مسلخ",
    "translit": "maslax",
    "ru": "бойня"
  },
  {
    "dari": "فابریکه قندسازی",
    "translit": "fābrīka-ye qand-sāzi",
    "ru": "сахарный завод"
  },
  {
    "dari": "فابریکه ذوب آهن",
    "translit": "fābrīka-ye zōb-e āhan",
    "ru": "металлургический завод"
  },
  {
    "dari": "فابریکه تصفیه نفت",
    "translit": "fābrīka-ye tasfiya-ye naft",
    "ru": "нефтеперерабатывающий завод"
  },
  {
    "dari": "فابریکه سمنت سازی",
    "translit": "fābrīka-ye sement-sāzi",
    "ru": "цементный завод"
  },
  {
    "dari": "دستگاه خشت پزی",
    "translit": "dastgāh-e xešt-pazi",
    "ru": "кирпичный завод"
  },
  {
    "dari": "فابریکه حجاری",
    "translit": "fābrīka-ye hajjāri",
    "ru": "камнеобрабатывающий завод"
  },
  {
    "dari": "دستگاه کاشی سازی",
    "translit": "dastgāh-e kāšī-sāzi",
    "ru": "производство кафеля/плитки/изразцов"
  },
  {
    "dari": "متعدد",
    "translit": "mota'added",
    "ru": "многочисленный"
  },
  {
    "dari": "احجار",
    "translit": "ahjār",
    "ru": "камни (мн.)"
  },
  {
    "dari": "احتیاجات",
    "translit": "ehtiyājāt",
    "ru": "потребности"
  },
  {
    "dari": "مذکور",
    "translit": "mazkūr",
    "ru": "упомянутый"
  },
  {
    "dari": "رشد یافتن",
    "translit": "rošd yāftan",
    "ru": "расти, развиваться"
  },
  {
    "dari": "دربر گرفتن",
    "translit": "dar-bar gereftan",
    "ru": "охватывать, включать"
  },
  {
    "dari": "به ... بالغ شدن",
    "translit": "ba ... bāleğ šodan",
    "ru": "достигать (величины)"
  },
  {
    "dari": "ارزشمند",
    "translit": "arzešmand",
    "ru": "ценный"
  },
  {
    "dari": "اندک",
    "translit": "andak",
    "ru": "немногий, небольшой"
  },
  {
    "dari": "تا اندازه یی",
    "translit": "tā andāza-ē",
    "ru": "до некоторой степени"
  },
  {
    "dari": "مروج بودن",
    "translit": "morawwej būdan",
    "ru": "быть распространителем"
  },
  {
    "dari": "اعمار کردن",
    "translit": "e'mār kardan",
    "ru": "сооружать, строить"
  },
  {
    "dari": "تورید کردن",
    "translit": "tawrīd kardan",
    "ru": "импортировать"
  },
  {
    "dari": "وجود داشتن",
    "translit": "wojūd dāštan",
    "ru": "существовать"
  },
  {
    "dari": "رول زیاد داشتن",
    "translit": "rol-e ziyād dāštan",
    "ru": "играть большую роль"
  },
  {
    "dari": "اضافه از ...",
    "translit": "ezāfa az ...",
    "ru": "свыше, больше чем…"
  },
  {
    "dari": "مواد خوراکی",
    "translit": "mawād-e xōrāki",
    "ru": "пищевые продукты"
  },
  {
    "dari": "پیمانه گسترده",
    "translit": "paymāna-ye goštarda",
    "ru": "широкий размах"
  },
  {
    "dari": "انواع البسه",
    "translit": "anwā'-e albasa",
    "ru": "виды одежды"
  },
  {
    "dari": "به مصرف رسیدن",
    "translit": "ba masraf rasīdan",
    "ru": "расходоваться, потребляться"
  },
  {
    "dari": "مشتمل بر ... بودن",
    "translit": "moštamel bar ... būdan",
    "ru": "содержать в себе…"
  },
  {
    "dari": "مواد محروقاتی",
    "translit": "mawād-e mahruqāti",
    "ru": "горючие материалы"
  },
  {
    "dari": "صنعت کفاشی",
    "translit": "san'at-e kaffāši",
    "ru": "обувная промышленность"
  },
  {
    "dari": "اشیاى مورد ضرورت",
    "translit": "ašyā-ye mawred-e zarūrat",
    "ru": "необходимые предметы"
  },
  {
    "dari": "از قدیم الایام",
    "translit": "az qadīm-ol-ayyām",
    "ru": "с давних времён"
  },
  {
    "dari": "معاونت فنی",
    "translit": "mo'āwanat-e fannī",
    "ru": "техническая помощь"
  },
  {
    "dari": "در حال حاضر",
    "translit": "dar hāl-e hāzer",
    "ru": "в настоящее время"
  }
] }];

  const textbook2TaskCollection8 = { id: 1008, lessonId: 8, title: "Урок 8 · Слова из заданий", cards: [
  {
    "dari": "سکتور",
    "translit": "sektor",
    "ru": "сектор"
  },
  {
    "dari": "بانک",
    "translit": "bānk",
    "ru": "банк"
  },
  {
    "dari": "پلان",
    "translit": "plān",
    "ru": "план"
  },
  {
    "dari": "جنرال",
    "translit": "jenrāl",
    "ru": "генерал"
  },
  {
    "dari": "افسر",
    "translit": "afsar",
    "ru": "офицер"
  },
  {
    "dari": "فير",
    "translit": "fayr",
    "ru": "огонь из оружи"
  },
  {
    "dari": "سينما",
    "translit": "sīnemā",
    "ru": "кино"
  },
  {
    "dari": "تياتر",
    "translit": "teyātr",
    "ru": "театр"
  },
  {
    "dari": "کلوپ",
    "translit": "klup",
    "ru": "клуб"
  },
  {
    "dari": "هوتل",
    "translit": "hōtel",
    "ru": "отель"
  },
  {
    "dari": "رستوران",
    "translit": "restōrān",
    "ru": "ресторан"
  },
  {
    "dari": "موزيم",
    "translit": "mōzēm",
    "ru": "музей"
  },
  {
    "dari": "پارک",
    "translit": "pārk",
    "ru": "парк"
  },
  {
    "dari": "کنسرت",
    "translit": "konsert",
    "ru": "концерт"
  },
  {
    "dari": "فلم",
    "translit": "film",
    "ru": "фильм"
  },
  {
    "dari": "تابلو",
    "translit": "tāblō",
    "ru": "картина; вывеска; табло"
  },
  {
    "dari": "دانس",
    "translit": "dāns",
    "ru": "танец"
  },
  {
    "dari": "اکتور",
    "translit": "aktōr",
    "ru": "актёр"
  },
  {
    "dari": "تکت",
    "translit": "teket",
    "ru": "билет"
  },
  {
    "dari": "ليسه",
    "translit": "līsa",
    "ru": "лицей"
  },
  {
    "dari": "فاکولته",
    "translit": "fākulta",
    "ru": "факультет"
  },
  {
    "dari": "کانکور",
    "translit": "kānkor",
    "ru": "конкурс (вступительный экзамен)"
  },
  {
    "dari": "نمره",
    "translit": "nomra",
    "ru": "оценка, балл"
  },
  {
    "dari": "بورس",
    "translit": "bōrs",
    "ru": "стипендия"
  },
  {
    "dari": "دکتورا",
    "translit": "doktōrā",
    "ru": "докторантура"
  },
  {
    "dari": "فزيک",
    "translit": "fīzīk",
    "ru": "физика"
  },
  {
    "dari": "کيميا",
    "translit": "kīmiyā",
    "ru": "химия"
  },
  {
    "dari": "جيالوجی",
    "translit": "jiyālōji",
    "ru": "геология"
  },
  {
    "dari": "ژورناليزم",
    "translit": "žurnālīzm",
    "ru": "журналистика"
  },
  {
    "dari": "گرامر",
    "translit": "gerāmar",
    "ru": "грамматика"
  },
  {
    "dari": "لابراتوار",
    "translit": "lābrātuwār",
    "ru": "лаборатория"
  },
  {
    "dari": "انجنير",
    "translit": "enjenīr",
    "ru": "инженер"
  },
  {
    "dari": "داکتر",
    "translit": "dāktor",
    "ru": "врач; доктор"
  },
  {
    "dari": "جيالوجست",
    "translit": "jiyālōjist",
    "ru": "геолог"
  },
  {
    "dari": "تخنيکر",
    "translit": "texnīkar",
    "ru": "техник"
  },
  {
    "dari": "تايپست",
    "translit": "tāypist",
    "ru": "машинистка"
  },
  {
    "dari": "ماشين کار",
    "translit": "māšīn-kār",
    "ru": "машинист; механизатор"
  },
  {
    "dari": "دريور",
    "translit": "deriwar",
    "ru": "водитель"
  },
  {
    "dari": "کلينر",
    "translit": "kelīnar",
    "ru": "помощник водителя"
  },
  {
    "dari": "پرسونل",
    "translit": "personal",
    "ru": "персонал"
  },
  {
    "dari": "فابريکه",
    "translit": "fābrīka",
    "ru": "фабрика"
  },
  {
    "dari": "پروژه",
    "translit": "porōža",
    "ru": "проект"
  },
  {
    "dari": "تخنيک",
    "translit": "texnīk",
    "ru": "техника"
  },
  {
    "dari": "ماشين",
    "translit": "māšīn",
    "ru": "машина, механизм"
  },
  {
    "dari": "سمنت",
    "translit": "sement",
    "ru": "цемент"
  },
  {
    "dari": "کانکريت",
    "translit": "kānkrīt",
    "ru": "бетон"
  },
  {
    "dari": "اسفالت",
    "translit": "asfālt",
    "ru": "асфальт"
  },
  {
    "dari": "تونل",
    "translit": "tōnel",
    "ru": "туннель"
  },
  {
    "dari": "پايپلين",
    "translit": "pāyp-layn",
    "ru": "трубопровод"
  },
  {
    "dari": "کانال",
    "translit": "kānāl",
    "ru": "канал"
  },
  {
    "dari": "راديو",
    "translit": "rādyō",
    "ru": "радио"
  },
  {
    "dari": "تلويزيون",
    "translit": "telewizyōn",
    "ru": "телевидение"
  },
  {
    "dari": "پسته",
    "translit": "posta",
    "ru": "почта"
  },
  {
    "dari": "تيلفون",
    "translit": "tēlefōn",
    "ru": "телефон"
  },
  {
    "dari": "تلگرام",
    "translit": "telegrām",
    "ru": "телеграмма"
  },
  {
    "dari": "لين",
    "translit": "layn",
    "ru": "линия"
  },
  {
    "dari": "انرزی",
    "translit": "enerži",
    "ru": "энергия"
  },
  {
    "dari": "متر",
    "translit": "metr",
    "ru": "метр"
  },
  {
    "dari": "کيلومتر",
    "translit": "kīlōmetr",
    "ru": "километр"
  },
  {
    "dari": "سانتی متر",
    "translit": "sāntī-metr",
    "ru": "сантиметр"
  },
  {
    "dari": "ملی متر",
    "translit": "millī-metr",
    "ru": "миллиметр"
  },
  {
    "dari": "انيج",
    "translit": "eneč",
    "ru": "дюйм"
  },
  {
    "dari": "کيلو (کيلو گرام)",
    "translit": "kīlō (kīlō-grām)",
    "ru": "килограмм"
  },
  {
    "dari": "گرام",
    "translit": "grām",
    "ru": "грамм"
  },
  {
    "dari": "تن",
    "translit": "tan",
    "ru": "тонна"
  },
  {
    "dari": "سپورت",
    "translit": "spōrt",
    "ru": "спорт"
  },
  {
    "dari": "فتبال",
    "translit": "futbāl",
    "ru": "футбол"
  },
  {
    "dari": "واليبال",
    "translit": "wālībāl",
    "ru": "волейбол"
  },
  {
    "dari": "هاکی",
    "translit": "hāki",
    "ru": "хоккей (на траве)"
  },
  {
    "dari": "سکی",
    "translit": "skī",
    "ru": "лыжи"
  },
  {
    "dari": "تيم",
    "translit": "tīm",
    "ru": "команда"
  },
  {
    "dari": "ستاديوم",
    "translit": "stādyōm",
    "ru": "стадион"
  },
  {
    "dari": "جمنازيم",
    "translit": "jemnāzīm",
    "ru": "спортзал, гимназия"
  },
  {
    "dari": "دريشی",
    "translit": "drēši",
    "ru": "костюм"
  },
  {
    "dari": "جاکت",
    "translit": "jāket",
    "ru": "пиджак, куртка"
  },
  {
    "dari": "پطلون",
    "translit": "patlōn",
    "ru": "брюки"
  },
  {
    "dari": "واسکت",
    "translit": "wāsket",
    "ru": "жилет"
  },
  {
    "dari": "نکتايی",
    "translit": "nektāyi",
    "ru": "галстук"
  },
  {
    "dari": "بوت",
    "translit": "bōt",
    "ru": "ботинок, сапог"
  },
  {
    "dari": "آدرس",
    "translit": "ādres",
    "ru": "адрес"
  },
  {
    "dari": "بلاک",
    "translit": "blāk",
    "ru": "квартал, блок"
  },
  {
    "dari": "اپارتمان",
    "translit": "āpārtemān",
    "ru": "квартира"
  },
  {
    "dari": "سالون",
    "translit": "sālōn",
    "ru": "салон, гостиная"
  },
  {
    "dari": "موبل",
    "translit": "mōbel",
    "ru": "мебель"
  },
  {
    "dari": "ميز",
    "translit": "mēz",
    "ru": "стол"
  },
  {
    "dari": "کوج",
    "translit": "kōč",
    "ru": "кушетка, диван (разг.)"
  },
  {
    "dari": "الماری",
    "translit": "almāri",
    "ru": "шкаф"
  },
  {
    "dari": "قنديل",
    "translit": "qandīl",
    "ru": "лампа, светильник"
  },
  {
    "dari": "سماوار",
    "translit": "samāwār",
    "ru": "самовар"
  },
  {
    "dari": "بوتل",
    "translit": "bōtal",
    "ru": "бутылка"
  },
  {
    "dari": "کيلاس",
    "translit": "gilās",
    "ru": "стакан"
  },
  {
    "dari": "پياله",
    "translit": "piyāla",
    "ru": "чашка"
  },
  {
    "dari": "جاينک",
    "translit": "čāynak",
    "ru": "чайник"
  },
  {
    "dari": "پتنوس",
    "translit": "patnōs",
    "ru": "поднос"
  },
  {
    "dari": "ساسج",
    "translit": "sāsej",
    "ru": "сосиска"
  },
  {
    "dari": "جاکليت",
    "translit": "čāklēt",
    "ru": "конфеты"
  },
  {
    "dari": "فانتا",
    "translit": "fāntā",
    "ru": "фанта"
  },
  {
    "dari": "ساندويج",
    "translit": "sāndwīč",
    "ru": "сэндвич"
  },
  {
    "dari": "برق",
    "translit": "barq",
    "ru": "электричество"
  },
  {
    "dari": "سويچ",
    "translit": "sowič",
    "ru": "выключатель"
  },
  {
    "dari": "ساکت",
    "translit": "sākat",
    "ru": "штепсель; розетка"
  },
  {
    "dari": "فيوز",
    "translit": "fiyuz",
    "ru": "предохранитель, пробка"
  },
  {
    "dari": "ميتر",
    "translit": "mītar",
    "ru": "счётчик (электроэнергии)"
  },
  {
    "dari": "ترانسفارمر",
    "translit": "tarānsfārmar",
    "ru": "трансформатор"
  },
  {
    "dari": "سيم",
    "translit": "sīm",
    "ru": "провод"
  },
  {
    "dari": "شارتی",
    "translit": "šārti",
    "ru": "короткое замыкание"
  },
  {
    "dari": "بالتی",
    "translit": "bālti",
    "ru": "батарейка"
  },
  {
    "dari": "گروپ",
    "translit": "grūp",
    "ru": "(электрическая) лампочка"
  },
  {
    "dari": "شيد",
    "translit": "šēd",
    "ru": "плафон, абажур"
  },
  {
    "dari": "اجاق (بخاری) برقی",
    "translit": "ojāq (boxāri)-e barqi",
    "ru": "электрическая печь, обогреватель"
  },
  {
    "dari": "يخچال",
    "translit": "yaxčāl",
    "ru": "холодильник"
  },
  {
    "dari": "بادپکه",
    "translit": "bād-paka",
    "ru": "вентилятор"
  },
  {
    "dari": "اتوی برقی",
    "translit": "otū-ye barqi",
    "ru": "электрический утюг"
  },
  {
    "dari": "جاروی برقی",
    "translit": "jāru-ye barqi",
    "ru": "пылесос"
  },
  {
    "dari": "زنگ برقی",
    "translit": "zang-e barqi",
    "ru": "электрический звонок"
  },
  {
    "dari": "سويچ کردن",
    "translit": "sowiچ kardan",
    "ru": "включать (выключатель)"
  },
  {
    "dari": "خاموش (گل) کردن",
    "translit": "xāmōš (gol) kardan",
    "ru": "выключать"
  },
  {
    "dari": "سگرت",
    "translit": "segaret",
    "ru": "сигарета"
  },
  {
    "dari": "پايپ",
    "translit": "pāyp",
    "ru": "трубка (курительная)"
  },
  {
    "dari": "جلم",
    "translit": "čalam",
    "ru": "кальян"
  },
  {
    "dari": "تنباکو",
    "translit": "tanbākō",
    "ru": "табак"
  },
  {
    "dari": "سگرت دانی",
    "translit": "segaret-dāni",
    "ru": "портсигар"
  },
  {
    "dari": "خاکستردانی",
    "translit": "xākestar-dāni",
    "ru": "пепельница"
  },
  {
    "dari": "گوگرد",
    "translit": "gōgard",
    "ru": "спички (букв. сера)"
  },
  {
    "dari": "سگرت لايتر",
    "translit": "segaret-lāytar",
    "ru": "зажигалка"
  },
  {
    "dari": "خاکستر",
    "translit": "xākestar",
    "ru": "пепел, зола"
  },
  {
    "dari": "سوخته سگرت",
    "translit": "sōxta-ye segaret",
    "ru": "окурок"
  },
  {
    "dari": "سگرت (پايپ، جلم) کشيدن",
    "translit": "segaret (pāyp, čalam) kešīdan",
    "ru": "курить сигарету (трубку, кальян)"
  },
  {
    "dari": "سگرت دردان",
    "translit": "segaret dardān",
    "ru": "мундштук, держатель для сигареты"
  },
  {
    "dari": "ترانسپورت",
    "translit": "tarānspōrt",
    "ru": "транспорт"
  },
  {
    "dari": "موتر",
    "translit": "mōtar",
    "ru": "автомобиль, машина"
  },
  {
    "dari": "(موتر) تيزرفتار",
    "translit": "(mōtar-e) tēzraftār",
    "ru": "легковой (быстрый) автомобиль"
  },
  {
    "dari": "(موتر) لاری",
    "translit": "(mōtar-e) lāri",
    "ru": "грузовик"
  },
  {
    "dari": "(موتر) سرويس (بس)",
    "translit": "(mōtar-e) servīs (bas)",
    "ru": "автобус"
  },
  {
    "dari": "بس برقی",
    "translit": "bas-e barqi",
    "ru": "троллейбус"
  },
  {
    "dari": "(موتر) تکسی",
    "translit": "(mōtar-e) taksī",
    "ru": "такси"
  },
  {
    "dari": "موتر تانک",
    "translit": "mōtar-e tānk",
    "ru": "бензовоз, цистерна"
  },
  {
    "dari": "دريور (موتروان)",
    "translit": "drāyvar (mōtarwān)",
    "ru": "водитель"
  },
  {
    "dari": "تکسی وان",
    "translit": "taksī-wān",
    "ru": "таксист"
  },
  {
    "dari": "ترافيک",
    "translit": "terāfīk",
    "ru": "уличное движение"
  },
  {
    "dari": "مأمور ترافيک",
    "translit": "ma'mūr-e terāfīk",
    "ru": "регулировщик"
  },
  {
    "dari": "ايستگاه",
    "translit": "īstgāh",
    "ru": "остановка"
  },
  {
    "dari": "جراغ راهنما",
    "translit": "čerāğ-e rāhnamā",
    "ru": "светофор (букв. путеводный свет)"
  },
  {
    "dari": "علامه ترافيکی",
    "translit": "'alāma-ye trāfīki",
    "ru": "дорожный знак"
  },
  {
    "dari": "مقررات ترافيکی",
    "translit": "maqarrarāt-e trāfīki",
    "ru": "правила дорожного движения"
  },
  {
    "dari": "حادثه ترافيکی",
    "translit": "hādese-ye trāfīki",
    "ru": "дорожно-транспортное происшествие"
  },
  {
    "dari": "اشترنک",
    "translit": "eštereng",
    "ru": "руль"
  },
  {
    "dari": "هارن",
    "translit": "hāran",
    "ru": "гудок, сигнал"
  },
  {
    "dari": "سلف",
    "translit": "self",
    "ru": "стартер"
  },
  {
    "dari": "اکسليتر",
    "translit": "aksalitar",
    "ru": "акселератор"
  },
  {
    "dari": "برک",
    "translit": "berek",
    "ru": "тормоз"
  },
  {
    "dari": "کلج",
    "translit": "klač",
    "ru": "сцепление"
  },
  {
    "dari": "ريورس",
    "translit": "riwars",
    "ru": "задний ход"
  },
  {
    "dari": "سيت",
    "translit": "sīt",
    "ru": "сиденье"
  },
  {
    "dari": "بادی",
    "translit": "bādi",
    "ru": "кузов"
  },
  {
    "dari": "تولبکس",
    "translit": "tōlbaks",
    "ru": "багажник"
  },
  {
    "dari": "نمبرپليت",
    "translit": "nambarpalēt",
    "ru": "номерной знак"
  },
  {
    "dari": "رديتر",
    "translit": "radītar",
    "ru": "радиатор"
  },
  {
    "dari": "پوش رديتر",
    "translit": "pōš-e radītar",
    "ru": "крышка радиатора"
  },
  {
    "dari": "انجن (ماشين)",
    "translit": "enjen (māšīn)",
    "ru": "двигатель, мотор"
  },
  {
    "dari": "پلک",
    "translit": "palak",
    "ru": "свеча зажигания"
  },
  {
    "dari": "گيربکس",
    "translit": "gīrbaks",
    "ru": "коробка передач"
  },
  {
    "dari": "بطرى",
    "translit": "betrī",
    "ru": "аккумулятор"
  },
  {
    "dari": "تانک تيل",
    "translit": "tānk-e tayl",
    "ru": "топливный бак"
  },
  {
    "dari": "کرين شافت",
    "translit": "kerēnšāft",
    "ru": "коленчатый вал"
  },
  {
    "dari": "ارابه",
    "translit": "arāba",
    "ru": "колесо"
  },
  {
    "dari": "تاير",
    "translit": "tāyr",
    "ru": "шина, автопокрышка"
  },
  {
    "dari": "تيوپ",
    "translit": "teyup",
    "ru": "камера (шины)"
  },
  {
    "dari": "پرزه جات فالتو",
    "translit": "porza-jāt-e fāltu",
    "ru": "запасные части"
  },
  {
    "dari": "تيل",
    "translit": "tayl",
    "ru": "масло (моторное)"
  },
  {
    "dari": "گريس",
    "translit": "grīs",
    "ru": "солидол"
  },
  {
    "dari": "ديزل",
    "translit": "dīzel",
    "ru": "дизельное топливо"
  },
  {
    "dari": "موبل آيل",
    "translit": "mōbl-āyel",
    "ru": "машинное масло"
  },
  {
    "dari": "(موتر را) چالان کردن",
    "translit": "(mōtar-rā) čālān kardan",
    "ru": "заводить машину"
  },
  {
    "dari": "حرکت کردن",
    "translit": "harakat kardan",
    "ru": "двигаться, трогаться"
  },
  {
    "dari": "هارن زدن",
    "translit": "hāran zadan",
    "ru": "сигналить"
  },
  {
    "dari": "دور خوردن",
    "translit": "dawr xōrdan",
    "ru": "поворачивать"
  },
  {
    "dari": "توقف کردن",
    "translit": "tawaqqof kardan",
    "ru": "останавливаться"
  },
  {
    "dari": "(موتر را) تکر دادن",
    "translit": "(mōtar-rā) takar dādan",
    "ru": "толкать машину; сталкивать"
  },
  {
    "dari": "تيل انداختن",
    "translit": "tayl andāxtan",
    "ru": "заправиться (о машине)"
  },
  {
    "dari": "(کسی را) جريمه کردن",
    "translit": "(kas-ē-rā) jarīma kardan",
    "ru": "штрафовать кого-л."
  },
  {
    "dari": "(از کسی) خبر گرفتن",
    "translit": "(az kas-ē) xabar gereftan",
    "ru": "справляться о ком-л., навещать"
  },
  {
    "dari": "فراموش کردن",
    "translit": "farāmōš kardan",
    "ru": "забывать"
  },
  {
    "dari": "زير موتر شدن",
    "translit": "zēr-e mōtar šodan",
    "ru": "попасть под машину"
  },
  {
    "dari": "طالع داشتن",
    "translit": "tāle' dāštan",
    "ru": "иметь удачу, везение"
  },
  {
    "dari": "چارج کردن",
    "translit": "čārj kardan",
    "ru": "заряжать (аккумулятор)"
  },
  {
    "dari": "(سگرت را) ترک کردن",
    "translit": "(segaret-rā) tark kardan",
    "ru": "бросать (курить)"
  },
  {
    "dari": "چالان کردن",
    "translit": "čālān kardan",
    "ru": "заводить (мотор)"
  },
  {
    "dari": "(در موتر) بالا شدن",
    "translit": "(dar mōtar) bālā šodan",
    "ru": "садиться в машину"
  },
  {
    "dari": "راه کسی را گرفتن",
    "translit": "rāh-e kas-ē-rā gereftan",
    "ru": "преграждать кому-л. дорогу"
  },
  {
    "dari": "بند کردن",
    "translit": "band kardan",
    "ru": "закрывать; останавливать"
  },
  {
    "dari": "جدی گفتن",
    "translit": "jeddī goftan",
    "ru": "говорить серьёзно"
  },
  {
    "dari": "کمباد شدن",
    "translit": "kambād šodan",
    "ru": "спуститься (о шине)"
  },
  {
    "dari": "باور کردن",
    "translit": "bāwar kardan",
    "ru": "верить"
  },
  {
    "dari": "پنجری گرفتن",
    "translit": "pančarī gereftan",
    "ru": "проколоть шину"
  },
  {
    "dari": "(به چیزی) اعتنا کردن",
    "translit": "(ba čīz-ē) e'tinā kardan",
    "ru": "обращать внимание на что-л."
  },
  {
    "dari": "(به جایی) مراجعه کردن",
    "translit": "(ba jāy-ē) morāje'a kardan",
    "ru": "обращаться куда-л."
  },
  {
    "dari": "(از راه) پس شدن",
    "translit": "(az rāh) pas šodan",
    "ru": "сойти с дороги, уступить дорогу"
  },
  {
    "dari": "سفر کردن",
    "translit": "safar kardan",
    "ru": "путешествовать"
  },
  {
    "dari": "پر کردن",
    "translit": "por kardan",
    "ru": "наполнять; заправлять"
  },
  {
    "dari": "عوض کردن",
    "translit": "'ewaz kardan",
    "ru": "менять"
  },
  {
    "dari": "کلچ گرفتن",
    "translit": "klač gereftan",
    "ru": "выжимать сцепление"
  },
  {
    "dari": "مصرف کردن",
    "translit": "masraf kardan",
    "ru": "расходовать, потреблять"
  },
  {
    "dari": "راست گفتن",
    "translit": "rāst goftan",
    "ru": "говорить правду"
  },
  {
    "dari": "دريشی کردن",
    "translit": "drēši kardan",
    "ru": "надевать костюм"
  },
  {
    "dari": "(با کسی) همراه شدن",
    "translit": "(bā kas-ē) hamrāh šodan",
    "ru": "сопровождать кого-л., присоединяться"
  },
  {
    "dari": "(چیزی را) صافی زدن",
    "translit": "(čīz-ē-rā) sāfī zadan",
    "ru": "протирать тряпкой"
  },
  {
    "dari": "درز گرفتن",
    "translit": "dazz gereftan",
    "ru": "заделывать щель, шов"
  },
  {
    "dari": "مطمئن بودن",
    "translit": "motma'en būdan",
    "ru": "быть уверенным"
  },
  {
    "dari": "عجله داشتن",
    "translit": "'ajala dāštan",
    "ru": "спешить"
  },
  {
    "dari": "برک گرفتن",
    "translit": "berek gereftan",
    "ru": "тормозить"
  },
  {
    "dari": "(چیزی را) برهم زدن",
    "translit": "(čīz-ē-rā) barham zadan",
    "ru": "нарушать, расстраивать"
  },
  {
    "dari": "معذرت خواستن",
    "translit": "ma'zerat xāstan",
    "ru": "извиняться"
  },
  {
    "dari": "(در راه) بند ماندن",
    "translit": "(dar rāh) band māndan",
    "ru": "застрять в пути"
  },
  {
    "dari": "(برق را) خاموش کردن = گل کردن",
    "translit": "(barq-rā) xāmōš kardan = gol kardan",
    "ru": "выключать свет"
  },
  {
    "dari": "سر جلو بودن",
    "translit": "sar-e jelaw būdan",
    "ru": "быть впереди, возглавлять"
  },
  {
    "dari": "موتر دواندن",
    "translit": "mōtar dawāndan",
    "ru": "водить машину"
  },
  {
    "dari": "پايپ کشيدن",
    "translit": "pāyp kešīdan",
    "ru": "курить трубку"
  },
  {
    "dari": "(کسی را) جزا دادن",
    "translit": "(kas-ē-rā) jazā dādan",
    "ru": "наказывать кого-л."
  },
  {
    "dari": "پنجر شدن",
    "translit": "pančar šodan",
    "ru": "получить прокол (о шине)"
  },
  {
    "dari": "(بالای کسی) حق داشتن",
    "translit": "(bālā-ye kas-ē) haq dāštan",
    "ru": "иметь право на кого-л.; иметь преимущество"
  },
  {
    "dari": "اکسليتر گرفتن",
    "translit": "aksalitar gereftan",
    "ru": "нажимать на акселератор"
  },
  {
    "dari": "جارو کردن",
    "translit": "jāru kardan",
    "ru": "подметать"
  },
  {
    "dari": "(چیزی را) نقض کردن = (از چیزی) تخلف کردن",
    "translit": "(čīz-ē-rā) naqz kardan = (az čīz-ē) taxallof kardan",
    "ru": "нарушать что-л."
  },
  {
    "dari": "از کار افتادن",
    "translit": "az kār oftādan",
    "ru": "выходить из строя"
  },
  {
    "dari": "نصب کردن",
    "translit": "nasb kardan",
    "ru": "устанавливать, прикреплять"
  },
  {
    "dari": "افگار شدن",
    "translit": "afgār šodan",
    "ru": "пострадать, получить повреждение"
  },
  {
    "dari": "زنگ زدن",
    "translit": "zang zadan",
    "ru": "звонить; ржаветь"
  },
  {
    "dari": "(به چیزی) توجه کردن",
    "translit": "(ba čīz-ē) tawajjoh kardan",
    "ru": "обращать внимание"
  },
  {
    "dari": "(به چیزی) عادت داشتن",
    "translit": "(ba čīz-ē) 'ādat dāštan",
    "ru": "привыкать к чему-л."
  },
  {
    "dari": "معاينه کردن",
    "translit": "mo'āyena kardan",
    "ru": "осматривать"
  },
  {
    "dari": "(از موتر) پايين شدن",
    "translit": "(az mōtar) pāyīn šodan",
    "ru": "выходить из машины"
  },
  {
    "dari": "راه دادن",
    "translit": "rāh dādan",
    "ru": "пропускать; уступать дорогу"
  },
  {
    "dari": "(به چیزی) ضرورت داشتن = (چیزی را) کار داشتن",
    "translit": "(ba čīz-ē) zarūrat dāštan = (čīz-ē-rā) kār dāštan",
    "ru": "нуждаться в чём-л."
  },
  {
    "dari": "(کسی را) زحمت دادن",
    "translit": "(kas-ē-rā) zahmat dādan",
    "ru": "утруждать кого-л."
  },
  {
    "dari": "خالی کردن",
    "translit": "xālī kardan",
    "ru": "освобождать, опустошать"
  },
  {
    "dari": "برک زدن",
    "translit": "berek zadan",
    "ru": "тормозить"
  },
  {
    "dari": "شکر کردن",
    "translit": "šukr kardan",
    "ru": "благодарить"
  },
  {
    "dari": "منتظر کسی شدن",
    "translit": "montazer-e kas-ē šodan",
    "ru": "ждать кого-л."
  },
  {
    "dari": "سلف زدن",
    "translit": "self zadan",
    "ru": "включать стартер"
  },
  {
    "dari": "(چیزی را) جدی گرفتن",
    "translit": "(čīz-ē-rā) jeddī gereftan",
    "ru": "относиться к чему-л. серьёзно"
  },
  {
    "dari": "(کسی را) تنها گذاشتن",
    "translit": "(kas-ē-rā) tanhā gozāštan",
    "ru": "оставлять кого-л. одного"
  },
  {
    "dari": "غم خوردن",
    "translit": "ğam xōrdan",
    "ru": "горевать, печалиться"
  },
  {
    "dari": "(پول را) میده کردن",
    "translit": "(pūl-rā) mayda kardan",
    "ru": "разменивать деньги"
  },
  {
    "dari": "انانس کردن",
    "translit": "anāns kardan",
    "ru": "объявлять; рекламировать"
  },
  {
    "dari": "پیسه",
    "translit": "paysa",
    "ru": "деньги (разг.)"
  },
  {
    "dari": "روپیه",
    "translit": "rūpiya",
    "ru": "рупия"
  },
  {
    "dari": "قیمت",
    "translit": "qīmat",
    "ru": "цена; дорогой, в разговорной речи также прилагательное «дорогой»"
  },
  {
    "dari": "گران",
    "translit": "gerān",
    "ru": "дорогой"
  },
  {
    "dari": "نوت",
    "translit": "nōt",
    "ru": "банкнота, ассигнация"
  },
  {
    "dari": "سکه",
    "translit": "seka",
    "ru": "монета"
  },
  {
    "dari": "پول سیاه",
    "translit": "pūl-e seyāh",
    "ru": "мелкие деньги, мелочь, сдача"
  },
  {
    "dari": "شانزده پولی",
    "translit": "šānzdah-pūli",
    "ru": "¼ афгани (25 пуль)"
  },
  {
    "dari": "قران",
    "translit": "qerān",
    "ru": "пол-афгани"
  },
  {
    "dari": "یک روپیگی",
    "translit": "yag-rūpagi",
    "ru": "1 афгани"
  },
  {
    "dari": "دو روپیگی",
    "translit": "dō-rūpagi",
    "ru": "2 афгани"
  },
  {
    "dari": "سه روپیگی",
    "translit": "sē-rūpagi",
    "ru": "3 афгани"
  },
  {
    "dari": "دهی",
    "translit": "dahī",
    "ru": "десятка"
  },
  {
    "dari": "ده روپیگی",
    "translit": "dah-rūpagi",
    "ru": "десять афгани"
  },
  {
    "dari": "صد روپیگی",
    "translit": "sad-rūpagi",
    "ru": "сотня"
  },
  {
    "dari": "دست راست",
    "translit": "dast-e rāst",
    "ru": "направо, справа"
  },
  {
    "dari": "دست چپ",
    "translit": "dast-e čap",
    "ru": "налево, слева"
  },
  {
    "dari": "رو به رو",
    "translit": "rō-ba-rō",
    "ru": "прямо"
  },
  {
    "dari": "به ... نارسیده",
    "translit": "ba ... nārasīda",
    "ru": "не доезжая до…"
  },
  {
    "dari": "بالا",
    "translit": "bālā",
    "ru": "в гору"
  },
  {
    "dari": "پايين",
    "translit": "pāyīn",
    "ru": "под гору"
  },
  {
    "dari": "پیراهن و تنبان",
    "translit": "pērāhan-o-tonbān",
    "ru": "рубаха и шаровары"
  },
  {
    "dari": "پریدن",
    "translit": "parīdan",
    "ru": "лететь, улетать"
  },
  {
    "dari": "رنگش پرید",
    "translit": "rang-aš parīd",
    "ru": "Он побледнел"
  },
  {
    "dari": "فیوز پرید",
    "translit": "fiyuz parīd",
    "ru": "Перегорел предохранитель"
  },
  {
    "dari": "سوختن",
    "translit": "sōxtan",
    "ru": "гореть; обжигать; перегорать"
  },
  {
    "dari": "دستم سوخت",
    "translit": "dast-am sōxt",
    "ru": "Я обжёг руку"
  },
  {
    "dari": "سیم اجاق سوخت",
    "translit": "sīm-e ojāq sōxt",
    "ru": "Перегорела спираль обогревателя"
  },
  {
    "dari": "دلم برای او سوخت",
    "translit": "del-am barāye ō sōxt",
    "ru": "Мне стало его жаль"
  },
  {
    "dari": "کار داشتن",
    "translit": "kār dāštan",
    "ru": "нуждаться"
  },
  {
    "dari": "پنسل کار داری؟",
    "translit": "pensel kār dārī?",
    "ru": "Тебе нужен карандаш?"
  },
  {
    "dari": "خاک به سرم!",
    "translit": "xāk ba sar-am!",
    "ru": "Горе мне!"
  }
] };
  textbook2TaskCollections.push(textbook2TaskCollection8);

  const textbook2TaskCollection9 = { id: 1009, lessonId: 9, title: "Урок 9 · Слова из заданий", cards: [{"dari":"سند","translit":"Send","ru":"Инд (река)"},{"dari":"سامان قرطاسیه","translit":"sāmān-e qertāsiya","ru":"канцелярские принадлежности"},{"dari":"پوست","translit":"pōst","ru":"мех, кожа"},{"dari":"دکان سلمانی","translit":"dokān-e salmāni","ru":"парикмахерская"},{"dari":"رئیسه","translit":"ra'isa","ru":"председательница"},{"dari":"تیغ","translit":"tēğ","ru":"бритва"},{"dari":"غرغشت","translit":"Ğarğašt","ru":"Гаргашт"},{"dari":"روشان","translit":"Rōšan","ru":"Рошан"},{"dari":"آمر","translit":"āmer","ru":"командир"},{"dari":"خوراکه فروشی","translit":"xōrāka-foruši","ru":"продуктовый магазин"},{"dari":"گوشت خوک","translit":"gōšt-e xuk","ru":"свинина"},{"dari":"کرم","translit":"karam","ru":"капуста"},{"dari":"زود","translit":"zud","ru":"быстро"},{"dari":"تول کردن","translit":"tōl kardan","ru":"взвешивать"},{"dari":"پاکت","translit":"pāket","ru":"пакет"},{"dari":"ولسوالی","translit":"woloswâli","ru":"уезд"},{"dari":"پوهنتون","translit":"pôhantun","ru":"университет"},{"dari":"دگروال","translit":"dagarwâl","ru":"полковник"},{"dari":"کندک","translit":"kandak","ru":"батальон"},{"dari":"اتن","translit":"atan","ru":"атан (афганский групповой танец)"},{"dari":"جرگه","translit":"jerga","ru":"джирга (племенной совет)"},{"dari":"توریالی","translit":"Tôryâlay","ru":"Торьялай (букв. — «храбрый»)"},{"dari":"زرغونه","translit":"Zarğuna","ru":"Загруна (букв. — «зелёная», «свежая»)"},{"dari":"هیواد","translit":"Hêwâd","ru":"название газеты (букв. — «страна», «родина»)"},{"dari":"ژوندون","translit":"Žwandun","ru":"название журнала (букв. — «жизнь»)"},{"dari":"پوهنځی / پوهنحی","translit":"pôhanzay","ru":"институт, факультет"},{"dari":"څارندوی","translit":"sârandoy","ru":"милиция, милиционер"},{"dari":"جگرن","translit":"jagran","ru":"майор"},{"dari":"ښاروالی / شاروالی","translit":"šârwâli","ru":"муниципалитет, мэрия"},{"dari":"ښاروال / شاروال","translit":"šârwâl","ru":"мэр"},{"dari":"لوی درستیز","translit":"lôy darastiz","ru":"начальник генштаба"},{"dari":"ستر محکمه","translit":"stára mahkamá","ru":"Верховный суд"},{"dari":"حربی پوهنتون","translit":"harbi pôhantun","ru":"военная академия"},{"dari":"کابل ننداری","translit":"Kâbol nandârê","ru":"название Кабульского театра (букв. — «кабульские зрелища»)"},{"dari":"د افغانستان بانک","translit":"da Afğânestân bânk","ru":"название центрального банка Афганистана"},{"dari":"انصاری واټ","translit":"Ansâri wât","ru":"проспект Ансари"},{"dari":"سپوژمی رستوران","translit":"Spôžmay rastôrân","ru":"ресторан «Спожмай» (букв. — «луна»)"},{"dari":"خیرخانه مینه","translit":"Xayrxâna mêna","ru":"район Хайрхана"},{"dari":"سپین زر شرکت","translit":"Spinzar šerkat","ru":"компания «Спинзар» (букв. — «белое золото»)"},{"dari":"باختر آژانس","translit":"Bâxtar âžâns","ru":"агентство Бахтар"},{"dari":"ملی بس","translit":"Melli bas","ru":"название городской транспортной компании"},{"dari":"شیرخان بندر","translit":"Šêrxân bandar","ru":"порт Ширхан"},{"dari":"بریدمن","translit":"bridman","ru":"лейтенант"},{"dari":"لومړی بریدمن","translit":"lumray bridman","ru":"старший лейтенант"},{"dari":"حارنوال / څارنوال","translit":"saranwâl","ru":"прокурор"},{"dari":"درملتون","translit":"darmaltun","ru":"аптека"},{"dari":"پوهاند","translit":"puhând","ru":"профессор"},{"dari":"جمعیت افغانی سره میاشت","translit":"sara myašt","ru":"Афганское общество Красного Полумесяца"},{"dari":"ښاري پلورنځی","translit":"šâri polôranzay","ru":"городской магазин (букв.)"},{"dari":"زمری","translit":"Z(e)maray","ru":"мужское имя собственное (букв. — «лев»)"},{"dari":"زلمینه","translit":"Zalmina","ru":"женское имя собственное (букв. — «молодая»)"},{"dari":"هندوستانى","translit":"hendustāni","ru":"индиец; индийский"},{"dari":"آذربايجانى","translit":"āzarbāyjāni","ru":"азербайджанец; азербайджанский"},{"dari":"مصرى","translit":"mesrī","ru":"египтянин; египетский"},{"dari":"جاپانى","translit":"jāpāni","ru":"японец; японский"},{"dari":"امريكايى","translit":"amrīkāyi","ru":"американец; американский"},{"dari":"اروپايى","translit":"urūpāyi","ru":"европеец; европейский"},{"dari":"هراتى","translit":"herāti","ru":"гератец; гератский"},{"dari":"مزارى","translit":"mazāri","ru":"мазариец (из Мазари-Шарифа)"},{"dari":"لغمانى","translit":"lağmāni","ru":"лагманец (из Лагмана)"},{"dari":"شهرى","translit":"šahrī","ru":"горожанин; городской"},{"dari":"دهاتى (روستايى)","translit":"dehāti (rōstāyi)","ru":"деревенский, сельский"},{"dari":"خارجى","translit":"xārejī","ru":"внешний; иностранец"},{"dari":"داخلى","translit":"dāxelī","ru":"внутренний"},{"dari":"دانشمند","translit":"dānešmand","ru":"учёный"},{"dari":"هنرمند","translit":"honarmand","ru":"художник, деятель искусства"},{"dari":"حزبى","translit":"hezbī","ru":"партийный; член партии"},{"dari":"کوچی","translit":"kōči","ru":"кочевник"},{"dari":"کبابى","translit":"kabābi","ru":"продавец шашлыка"},{"dari":"برقى","translit":"barqī","ru":"электрик"},{"dari":"جوالى","translit":"jawāli","ru":"грузчик"},{"dari":"کور","translit":"kōr","ru":"слепой"},{"dari":"سگرتى","translit":"segaretī","ru":"курящий, курильщик"},{"dari":"پير","translit":"pīr","ru":"старый; старик"},{"dari":"ديوانه","translit":"dēwāna","ru":"сумасшедший"},{"dari":"شرابى","translit":"šarābi","ru":"пьяница"},{"dari":"شکارى","translit":"šekāri","ru":"охотничье ружьё"},{"dari":"قره قلى","translit":"qara-qōli","ru":"каракуль"},{"dari":"بارانى","translit":"bārāni","ru":"плащ, дождевик"},{"dari":"پوستين","translit":"pōstīn","ru":"шуба, дублёнка"},{"dari":"حلبى","translit":"halabi","ru":"жесть; жестяная посуда"},{"dari":"بلديه","translit":"baladiya","ru":"муниципалитет (власти)"},{"dari":"اعلاميه","translit":"e'lāmiya","ru":"объявление, листовка"},{"dari":"ابلاغيه","translit":"eblāğiya","ru":"уведомление, извещение"},{"dari":"ليليه","translit":"lēliya","ru":"общежитие"},{"dari":"قرطاسيه","translit":"qirtāsiya","ru":"канцелярские товары, бумага"},{"dari":"عتيقه","translit":"'atīqa","ru":"антиквариат, старинная вещь"},{"dari":"نانوايى","translit":"nānwāyi","ru":"пекарня"},{"dari":"قنادى","translit":"qannādi","ru":"кондитерская"},{"dari":"عکاسى","translit":"'akkāsi","ru":"фотомастерская"},{"dari":"ميوه فروشى","translit":"mēwa-forōši","ru":"фруктовая лавка"},{"dari":"خياطى","translit":"xayyāti","ru":"ателье, портняжная мастерская"},{"dari":"ساعت سازى","translit":"sā'at-sāzi","ru":"часовая мастерская"},{"dari":"زرگرى","translit":"zargari","ru":"ювелирная мастерская"},{"dari":"بنيه گرى","translit":"banya-gari","ru":"бакалейная лавка"},{"dari":"سيمسارى","translit":"simsāri","ru":"галантерейная лавка"},{"dari":"قصابى","translit":"qassābi","ru":"мясная лавка"},{"dari":"چرمگرى","translit":"čarm-gari","ru":"кожевенная мастерская"},{"dari":"پوستين دوزى","translit":"pōstīn-dōzi","ru":"мастерская по пошиву шуб"},{"dari":"آرد","translit":"ārd","ru":"мука"},{"dari":"برنج","translit":"berenj","ru":"рис"},{"dari":"نان","translit":"nān","ru":"хлеб"},{"dari":"گوشت گوسفند","translit":"gōšt-e gōsfand","ru":"баранина"},{"dari":"گوشت گاو","translit":"gōšt-e gāv","ru":"говядина"},{"dari":"گوشت گوساله","translit":"gōšt-e gōsāla","ru":"телятина"},{"dari":"روغن نباتى","translit":"rōğan-e nabāti","ru":"растительное масло"},{"dari":"مصالح (مصالح ديگر)","translit":"masāleh (masāleh-e dīgar)","ru":"специи, приправы"},{"dari":"ترکارى","translit":"tarkāri","ru":"овощи, зелень"},{"dari":"نخود","translit":"naxōd","ru":"горох, нут"},{"dari":"ميوه","translit":"mēwa","ru":"фрукты"},{"dari":"کشمش","translit":"kešmeš","ru":"изюм"},{"dari":"جاى","translit":"čāy","ru":"чай"},{"dari":"قند","translit":"qand","ru":"сахар (кусковой)"},{"dari":"کيک","translit":"kēk","ru":"кекс, пирожное"},{"dari":"کلچه","translit":"kolča","ru":"печенье, лепёшка"},{"dari":"شيرينى","translit":"širīni","ru":"сладости"},{"dari":"نقل","translit":"naql","ru":"нуга, сладость"},{"dari":"جاکليت","translit":"čāklēt","ru":"шоколад"},{"dari":"شیريخ","translit":"šarīx","ru":"мороженое"},{"dari":"فالوده","translit":"fāluda","ru":"фалуда (прохладное лакомство)"},{"dari":"لبنيات","translit":"labaneyyāt","ru":"молочные продукты"},{"dari":"شير","translit":"šīr","ru":"молоко"},{"dari":"مسکه","translit":"maska","ru":"сливочное масло"},{"dari":"پنير","translit":"panīr","ru":"сыр"},{"dari":"ماست","translit":"māst","ru":"простокваша"},{"dari":"قيماق","translit":"qaymāq","ru":"сметана, сливки"},{"dari":"دوغ","translit":"dōğ","ru":"айран, пахтанье"},{"dari":"نانوا","translit":"nānwā","ru":"пекарь"},{"dari":"قصاب","translit":"qassāb","ru":"мясник"},{"dari":"قناد","translit":"qannād","ru":"кондитер"},{"dari":"بنيه گر","translit":"banya-gar","ru":"бакалейщик"},{"dari":"شيرفروش","translit":"šīr-forōš","ru":"продавец молока"},{"dari":"سيمسار","translit":"simsār","ru":"галантерейщик"},{"dari":"بزاز (تکه فروش)","translit":"bazzāz (taka-forōš)","ru":"торговец мануфактурой (в розницу)"},{"dari":"گوگردفروش","translit":"gōgard-forōš","ru":"продавец спичек (букв. серы)"},{"dari":"عطار","translit":"'attār","ru":"парфюмер, торговец специями"},{"dari":"اخبارفروش","translit":"axbār-forōš","ru":"продавец газет"},{"dari":"زرگر","translit":"zargar","ru":"ювелир"},{"dari":"مسگر","translit":"misgar","ru":"медник"},{"dari":"حلبى ساز","translit":"halabi-sāz","ru":"жестянщик"},{"dari":"کلال","translit":"kallāl","ru":"гончар"},{"dari":"حکاک","translit":"hakkāk","ru":"резчик по камню"},{"dari":"چرمگر","translit":"čarm-gar","ru":"кожевник"},{"dari":"خياط","translit":"xayyāt","ru":"портной"},{"dari":"پوستين دوز","translit":"pōstīn-dōz","ru":"скорняк, мастер по пошиву шуб"},{"dari":"بوت دوز","translit":"bōt-dōz","ru":"сапожник"},{"dari":"پوست دوز","translit":"pōst-dōz","ru":"мастер по коже"},{"dari":"موچى","translit":"mōči","ru":"сапожник, башмачник"},{"dari":"چرخگر","translit":"čarx-gar","ru":"токарь"},{"dari":"دلاک","translit":"dallāk","ru":"цирюльник, брадобрей"},{"dari":"بازار","translit":"bāzār","ru":"базар, рынок"},{"dari":"مندوى","translit":"mandawi","ru":"рынок (по продаже зерна)"},{"dari":"دکان","translit":"dokān","ru":"лавка, магазин"},{"dari":"مغازه","translit":"mağāza","ru":"магазин"},{"dari":"فروشگاه","translit":"forōš-gāh","ru":"магазин"},{"dari":"ليلام","translit":"lēlām","ru":"аукцион"},{"dari":"رستوران","translit":"restōrān","ru":"ресторан"},{"dari":"سماوار","translit":"samāwār","ru":"самовар; чайная"},{"dari":"دواخانه","translit":"dawā-xāna","ru":"аптека"},{"dari":"دکان کبابى","translit":"dokān-e kabābi","ru":"шашлычная"},{"dari":"دکان سامان برق (راديو)","translit":"dokān-e sāmān-e barq (rādyō)","ru":"магазин электротоваров (радио)"},{"dari":"ورکشاپ","translit":"workšāp","ru":"мастерская"},{"dari":"(دکان) نانوايى","translit":"(dokān-e) nānwāyi","ru":"пекарня"},{"dari":"(دکان) قصابى","translit":"(dokān-e) qassābi","ru":"мясная лавка"},{"dari":"(دکان) قنادى","translit":"(dokān-e) qannādi","ru":"кондитерская"},{"dari":"(دکان) بنيه گرى","translit":"(dokān-e) banya-gari","ru":"бакалейная лавка"},{"dari":"(دکان) ترکارى فروشى","translit":"(dokān-e) tarkāri-forōši","ru":"овощная лавка"},{"dari":"(دکان) ميوه فروشى","translit":"(dokān-e) mēwa-forōši","ru":"фруктовая лавка"},{"dari":"(دکان) بزازى","translit":"(dokān-e) bazzāzi","ru":"мануфактурная лавка"},{"dari":"(دکان) عطارى","translit":"(dokān-e) 'attāri","ru":"лавка специй и парфюмерии"},{"dari":"(دکان) فالوده پزى","translit":"(dokān-e) fāluda-pazi","ru":"лавка фалуды"},{"dari":"(دکان) سيمسارى","translit":"(dokān-e) simsāri","ru":"галантерейная лавка"},{"dari":"(دکان) عتيقه فروشى","translit":"(dokān-e) 'atīqa-forōši","ru":"антикварная лавка"},{"dari":"لباسهاى فيشنى","translit":"lebās-hā-ye fēšani","ru":"модная одежда"},{"dari":"ميوه هاى موسمى","translit":"mēwa-hā-ye mawsimi","ru":"сезонные фрукты"},{"dari":"عادت هميشه گى","translit":"'ādat-e hamēšagi","ru":"постоянная привычка"},{"dari":"قاب مسى","translit":"qāb-e mesī","ru":"медное блюдо"},{"dari":"موزه چرمى","translit":"mōza-ye čarmī","ru":"кожаные сапоги"},{"dari":"اشياى زينتى","translit":"ašyā-ye zīnati","ru":"украшения, предметы роскоши"},{"dari":"بوت رابرى","translit":"bōt-e rāberi","ru":"резиновые сапоги"},{"dari":"امتعه قيمتى","translit":"amte'a-ye qīmati","ru":"ценные товары"},{"dari":"نجار","translit":"najjār","ru":"плотник"},{"dari":"کلينر","translit":"klīnar","ru":"уборщик"},{"dari":"کارگر","translit":"kārgar","ru":"рабочий"},{"dari":"مبصر","translit":"mobasser","ru":"инспектор, надзиратель"},{"dari":"نقاش","translit":"naqqāš","ru":"художник, живописец"},{"dari":"سلمانى","translit":"salmāni","ru":"парикмахер"},{"dari":"ضراب","translit":"zarrāb","ru":"чеканщик монет"},{"dari":"کاتب","translit":"kāteb","ru":"писарь, переписчик"},{"dari":"داکتر","translit":"dāktor","ru":"врач"},{"dari":"آهنگر","translit":"āhangar","ru":"кузнец"},{"dari":"انانسر","translit":"anānsar","ru":"диктор, объявляющий"},{"dari":"ژورناليست","translit":"žurnālist","ru":"журналист"},{"dari":"دکاندار","translit":"dokāndār","ru":"лавочник"},{"dari":"شاعر","translit":"šā'er","ru":"поэт"},{"dari":"گلکار","translit":"gul-kār","ru":"садовник"},{"dari":"گادى وان","translit":"gādi-wān","ru":"извозчик, водитель телеги"},{"dari":"دهقان","translit":"dehqān","ru":"крестьянин"},{"dari":"تايپست","translit":"tāypist","ru":"машинистка"},{"dari":"کراچى وان","translit":"karāči-wān","ru":"извозчик (на арбе)"},{"dari":"کسبه کار","translit":"kasba-kār","ru":"частный торговец, ремесленник"},{"dari":"باغدار","translit":"bāğdār","ru":"садовод"},{"dari":"تاجر","translit":"tājer","ru":"купец"},{"dari":"آشپز","translit":"āšpaz","ru":"повар"},{"dari":"معدنجى","translit":"ma'danji","ru":"шахтёр"},{"dari":"گلفروش","translit":"gul-forōš","ru":"продавец цветов"},{"dari":"مشترى","translit":"moštari","ru":"покупатель"},{"dari":"مأمور","translit":"ma'mūr","ru":"служащий, чиновник"},{"dari":"نساج","translit":"nassāj","ru":"ткач"},{"dari":"معلم","translit":"mo'allem","ru":"учитель"},{"dari":"شکارچى","translit":"šekārči","ru":"охотник"},{"dari":"موتروان","translit":"mōtarwān","ru":"водитель"},{"dari":"دکان ترکارى فروشى","translit":"dokān-e tarkāri-forōši","ru":"овощная лавка"},{"dari":"دکان سيمسارى","translit":"dokān-e simsāri","ru":"галантерейная лавка"},{"dari":"دکان زرگرى","translit":"dokān-e zargari","ru":"ювелирная лавка"},{"dari":"دکان چرمگرى","translit":"dokān-e čarm-gari","ru":"кожевенная мастерская"},{"dari":"دکان قنادى","translit":"dokān-e qannādi","ru":"кондитерская"},{"dari":"دکان بنيه گرى","translit":"dokān-e banya-gari","ru":"бакалейная лавка"},{"dari":"دکان بوت دوزى","translit":"dokān-e bōt-dōzi","ru":"сапожная мастерская"},{"dari":"دکان قرطاسيه فروشى","translit":"dokān-e qirtāsiya-forōši","ru":"канцелярский магазин"},{"dari":"دکان شيرينى فروشى","translit":"dokān-e širīni-forōši","ru":"магазин сладостей"},{"dari":"دکان کيک و کلچه پزى","translit":"dokān-e kēk-o-kolča-pazi","ru":"магазин кексов и печенья"},{"dari":"دکان سلمانى","translit":"dokān-e salmāni","ru":"парикмахерская"},{"dari":"دکان سامان برق","translit":"dokān-e sāmān-e barq","ru":"магазин электротоваров"},{"dari":"دکان حلبى سازى","translit":"dokān-e halabi-sāzi","ru":"жестяная мастерская"},{"dari":"دکان کتابفروشى","translit":"dokān-e ketāb-forōši","ru":"книжный магазин"},{"dari":"دکان خياطى","translit":"dokān-e xayyāti","ru":"ателье"},{"dari":"دکان راديوفروشى","translit":"dokān-e rādyō-forōši","ru":"магазин радиотоваров"},{"dari":"دکان حکاکى","translit":"dokān-e hakkāki","ru":"мастерская резчика"},{"dari":"دکان پوستين دوزى","translit":"dokān-e pōstīn-dōzi","ru":"мастерская шуб"},{"dari":"دکان مسگرى","translit":"dokān-e misgari","ru":"медная мастерская"},{"dari":"دکان قصابى","translit":"dokān-e qassābi","ru":"мясная лавка"},{"dari":"دکان عتيقه فروشى","translit":"dokān-e 'atīqa-forōši","ru":"антикварная лавка"},{"dari":"دکان نجارى","translit":"dokān-e najjāri","ru":"столярная мастерская"},{"dari":"دکان آهنگرى","translit":"dokān-e āhangari","ru":"кузница"},{"dari":"مسلخ","translit":"maslax","ru":"бойня, скотобойня"},{"dari":"دکان کلالى","translit":"dokān-e kallāli","ru":"гончарная мастерская"},{"dari":"دکان کلاهدوزى","translit":"dokān-e kolāh-dōzi","ru":"мастерская головных уборов"},{"dari":"آسياب","translit":"āsyāb","ru":"мельница"},{"dari":"دکان لبنيات فروشى","translit":"dokān-e labaneyyāt-forōši","ru":"молочная лавка"},{"dari":"دکان خشکه شويى","translit":"dokān-e xoška-šōyi","ru":"химчистка"},{"dari":"سينما","translit":"sīnemā","ru":"кинотеатр"},{"dari":"موزيم","translit":"mōzēm","ru":"музей"},{"dari":"موافقت نامه","translit":"mowāfaqat-nāma","ru":"соглашение"},{"dari":"اساس نامه","translit":"asās-nāma","ru":"устав"},{"dari":"معرفى نامه","translit":"mo'arrafī-nāma","ru":"характеристика"},{"dari":"سالنامه","translit":"sāl-nāma","ru":"ежегодник"},{"dari":"نرخنامه","translit":"nerx-nāma","ru":"прейскурант"},{"dari":"قالین فروشى","translit":"qālīn-forōšī","ru":"лавка по продаже ковров"},{"dari":"نان خشک","translit":"nān-e xošk","ru":"сухой хлеб, лепёшка; традиционный плоский пшеничный хлеб"},{"dari":"نان سیلو","translit":"nān-e sēlō","ru":"хлеб с хлебозавода, батон"},{"dari":"حلوا","translit":"halwā","ru":"сладкая манная каша; в дари не «халва» в русском смысле"},{"dari":"حلواى مغزى","translit":"halwā-ye mağzī","ru":"ореховая халва"},{"dari":"سیر","translit":"sēr","ru":"сир (мера веса ≈ 7 кг)"},{"dari":"پاو","translit":"pāw","ru":"фунт (1/16 сира)"}] };
  textbook2TaskCollections.push(textbook2TaskCollection9);

  const textbook2TaskCollection10 = { id: 1010, lessonId: 10, title: "Урок 10 · Слова из заданий", cards: [{"dari":"نیم گرسنه","translit":"nīm-gursna","ru":"полуголодный"},{"dari":"تندباد","translit":"tondbād","ru":"ураган, сильный ветер"},{"dari":"پخته سن","translit":"puxte-san","ru":"в зрелом возрасте (букв. «созревший возраст»)"},{"dari":"پیرمرد","translit":"pīr-mard","ru":"старик"},{"dari":"رفت وآمد","translit":"raft-o-āmad","ru":"хождение, движение туда-сюда"},{"dari":"دوباره","translit":"dōbāra","ru":"снова, опять"},{"dari":"سروصدا","translit":"sar-o-sadā","ru":"шум, гам"},{"dari":"میانه سال","translit":"miyāna-sāl","ru":"средних лет"},{"dari":"سراپا","translit":"sarāpā","ru":"весь, целиком; с головы до ног"},{"dari":"گفتگو","translit":"goftogū","ru":"разговор, беседа"},{"dari":"مالدارى","translit":"māldāri","ru":"скотоводство"},{"dari":"خاک آلوده","translit":"xāk-ālūda","ru":"запылённый, покрытый пылью"},{"dari":"موتردار","translit":"mōtar-dār","ru":"имеющий машину"},{"dari":"بندوبار","translit":"band-o-bār","ru":"пожитки, багаж"},{"dari":"جمع آورى","translit":"jam'-āwari","ru":"собирание, сбор"},{"dari":"پیچ و تاب","translit":"pīč-o-tāb","ru":"извилина, поворот; сложность"},{"dari":"توقف کردن","translit":"tawaqqof kardan","ru":"останавливаться"},{"dari":"احساس کردن","translit":"ehsās kardan","ru":"чувствовать"},{"dari":"پايين شدن","translit":"pāyīn šodan","ru":"спускаться; выходить (из машины)"},{"dari":"آه کشيدن","translit":"āh kešīdan","ru":"вздыхать"},{"dari":"فيصله کردن","translit":"faysala kardan","ru":"решать"},{"dari":"سخن گفتن","translit":"soxan goftan","ru":"говорить, беседовать"},{"dari":"قرار داشتن","translit":"qarār dāštan","ru":"быть расположенным; намереваться"},{"dari":"نگاه کردن","translit":"negāh kardan","ru":"смотреть"},{"dari":"به تن (به سر) داشتن","translit":"ba tan (ba sar) dāštan","ru":"быть одетым в; носить на себе"},{"dari":"مخلوط شدن","translit":"maxlūt šodan","ru":"смешиваться"},{"dari":"ادامه دادن","translit":"edāma dādan","ru":"продолжать"},{"dari":"حمل کردن","translit":"haml kardan","ru":"нести, перевозить"},{"dari":"(از راه) پس شدن","translit":"(az rāh) pas šodan","ru":"сойти с дороги, уступить дорогу"},{"dari":"امرار حيات کردن","translit":"amrār-e hayāt kardan","ru":"существовать, жить"},{"dari":"پکه کردن (زدن)","translit":"paka kardan (zadan)","ru":"обмахивать(ся) веером"},{"dari":"آماده ساختن","translit":"āmāda sāxtan","ru":"готовить, подготавливать"},{"dari":"تکان دادن","translit":"takān dādan","ru":"трясти, качать, двигать"},{"dari":"لوله کردن","translit":"lūla kardan","ru":"свёртывать в трубку"},{"dari":"قهر شدن","translit":"qahr šodan","ru":"обижаться, сердиться"},{"dari":"جلب کردن","translit":"jalb kardan","ru":"привлекать"},{"dari":"به فکر ... بودن (افتادن)","translit":"ba fekr-e ... būdan (oftādan)","ru":"думать о…; задуматься о…"},{"dari":"سلف زدن","translit":"self zadan","ru":"включать стартер"},{"dari":"از دست دادن","translit":"az dast dādan","ru":"терять"},{"dari":"به دست آوردن","translit":"ba dast āwardan","ru":"приобретать, получать"},{"dari":"بيهوش شدن","translit":"bēhōš šodan","ru":"терять сознание"},{"dari":"خيال کردن","translit":"xiyāl kardan","ru":"думать, воображать"},{"dari":"به سر بردن","translit":"ba sar burdan","ru":"проводить (время)"},{"dari":"فعاليت کردن","translit":"fa'āliyat kardan","ru":"заниматься деятельностью"},{"dari":"گفتگو کردن","translit":"goftogū kardan","ru":"беседовать"},{"dari":"جمع آورى کردن","translit":"jam'-āwari kardan","ru":"собирать"},{"dari":"اميد داشتن","translit":"omēd dāštan","ru":"надеяться"},{"dari":"دونیم کردن","translit":"dō-nīm kardan","ru":"делить пополам"},{"dari":"نگاه افگندن","translit":"negāh afgandan","ru":"взглянуть, бросить взгляд"},{"dari":"خم کردن","translit":"xam kardan","ru":"сгибать, наклонять"},{"dari":"به چرت رفتن","translit":"ba čort raftan","ru":"вздремнуть, задремать"},{"dari":"مأيوس شدن","translit":"ma'yūs šodan","ru":"отчаиваться"},{"dari":"حس کردن","translit":"hess kardan","ru":"чувствовать"},{"dari":"جلورفتن","translit":"jelaw raftan","ru":"идти вперёд"},{"dari":"متوجه ... بودن","translit":"motawajjeh-e ... būdan","ru":"быть внимательным к…; сознавать"},{"dari":"مسرور شدن","translit":"masrūr šodan","ru":"радоваться"},{"dari":"کمايى کردن","translit":"kamāyi kardan","ru":"зарабатывать"},{"dari":"اصرار ورزيدن","translit":"esrār warzīdan","ru":"настаивать"},{"dari":"جگره کردن","translit":"jagra kardan","ru":"подбадривать, придавать смелости"},{"dari":"اتفاق کردن","translit":"ettefāq kardan","ru":"случаться; договариваться"},{"dari":"راه رفتن","translit":"rāh raftan","ru":"идти, ходить"},{"dari":"بندوبار بستن","translit":"band-o-bār bastan","ru":"собирать пожитки"},{"dari":"نصوار کشيدن","translit":"naswār kešīdan","ru":"жевать насвар (жевательный табак)"},{"dari":"آگنده ساختن","translit":"āganda sāxtan","ru":"наполнять"},{"dari":"شور خوردن","translit":"šōr xōrdan","ru":"двигаться, шевелиться"},{"dari":"بلند کردن","translit":"boland kardan","ru":"поднимать"},{"dari":"تعارف کردن","translit":"ta'ārof kardan","ru":"предлагать (по обычаю), угощать"},{"dari":"گرد آوردن","translit":"gard āwardan","ru":"собирать"},{"dari":"عصبانى شدن","translit":"asabāni šodan","ru":"нервничать, злиться"},{"dari":"به هوش (به خود) آوردن","translit":"ba hōš (ba xod) āwardan","ru":"приводить в сознание"},{"dari":"زور زدن","translit":"zōr zadan","ru":"напрягаться, тужиться"},{"dari":"اجرا کردن","translit":"ejrā kardan","ru":"исполнять, выполнять"},{"dari":"فراموش کردن","translit":"farāmōš kardan","ru":"забывать"},{"dari":"در صدد ... برآمدن (شدن)","translit":"dar sadad-e ... barāmadan (šodan)","ru":"намереваться, собираться"},{"dari":"هوش کردن","translit":"hōš kardan","ru":"обращать внимание, слушать"},{"dari":"تصميم گرفتن","translit":"tasmīm gereftan","ru":"принимать решение"},{"dari":"مغروق شدن","translit":"mağrūq šodan","ru":"погружаться; заливаться (слезами)"},{"dari":"مضطرب شدن","translit":"moztareb šodan","ru":"волноваться, тревожиться"},{"dari":"تعلق گرفتن","translit":"ta'alloq gereftan","ru":"принадлежать; привязываться"},{"dari":"پیچ وتاب خوردن","translit":"pīč-o-tāb xōrdan","ru":"извиваться, вертеться"},{"dari":"رفت وآمد داشتن","translit":"raft-o-āmad dāštan","ru":"поддерживать отношения, бывать друг у друга (?)"},{"dari":"سرشته کردن","translit":"sarešta kardan","ru":"налаживать"},{"dari":"جزء","translit":"joz'","ru":"часть, деталь, компонент; мн. اجزاء / ajzā'"},{"dari":"جزو","translit":"jozw","ru":"вариант слова جزء"},{"dari":"جز","translit":"joz","ru":"кроме (простой предлог)"},{"dari":"جزء هرات","translit":"joz'-e Herāt","ru":"(составная) часть Герата"},{"dari":"جز هرات","translit":"joz Herāt","ru":"кроме Герата"},{"dari":"در حالیکه","translit":"dar hālē-ke","ru":"в то время как; в состоянии (что…)"},{"dari":"جاى افسوس است که ...","translit":"jāy-e afsōs ast ke ...","ru":"Жаль, что…"},{"dari":"جاى تعجب نبود که ...","translit":"jāy-e ta'ajjub nabūd ke ...","ru":"Было неудивительно, что…"},{"dari":"جاى خوشى است که ...","translit":"jāy-e xošī ast ke ...","ru":"Отрадно, что…"},{"dari":"عالم","translit":"'ālam","ru":"мир"},{"dari":"عالم","translit":"'ālem","ru":"учёный"}] };
  textbook2TaskCollections.push(textbook2TaskCollection10);

  const textbook2TaskCollection11 = { id: 1011, lessonId: 11, title: "Урок 11 · Слова из заданий", cards: [{"dari":"آرد گندم","translit":"ārd-e gandom","ru":"пшеничная мука"},{"dari":"آرد جو","translit":"ārd-e jaw","ru":"ячменная мука"},{"dari":"آرد جواری","translit":"ārd-e jawārī","ru":"кукурузная мука"},{"dari":"آرد سوجی","translit":"ārd-e sōjī","ru":"мука из манной крупы, суджи"},{"dari":"نشایسته","translit":"našāyista","ru":"крахмал"},{"dari":"برنج","translit":"berenj","ru":"рис"},{"dari":"نخود","translit":"naxōd","ru":"горох, нут"},{"dari":"دالنخود","translit":"dālnaxōd","ru":"лущёный горох, сушёный горошек"},{"dari":"لوبیا","translit":"lōbiyā","ru":"фасоль, бобы"},{"dari":"باقلا","translit":"bāqolā","ru":"бобы, конские бобы"},{"dari":"ماش","translit":"māš","ru":"маш, бобы мунг, чечевица"},{"dari":"بادرنگ","translit":"bādrang","ru":"огурец"},{"dari":"کرم","translit":"kalam","ru":"капуста"},{"dari":"گلپی","translit":"golpī","ru":"цветная капуста"},{"dari":"زردک","translit":"zardak","ru":"морковь"},{"dari":"لبلبو","translit":"lablabū","ru":"свёкла"},{"dari":"پیاز","translit":"piyāz","ru":"лук"},{"dari":"گندنه","translit":"gandana","ru":"лук-порей"},{"dari":"ملی","translit":"molī","ru":"редька"},{"dari":"شلغم","translit":"šalğam","ru":"репа"},{"dari":"ملی سرخک","translit":"molī-sorxak","ru":"редис"},{"dari":"کچالو","translit":"kačālū","ru":"картофель"},{"dari":"کدو","translit":"kadū","ru":"тыква"},{"dari":"کدوجه","translit":"kadūča","ru":"кабачок"},{"dari":"تره","translit":"tara","ru":"лук-порей, зелёный лук"},{"dari":"مرچ شیرین","translit":"morč-e šīrīn","ru":"сладкий перец"},{"dari":"شبت","translit":"šebet","ru":"укроп"},{"dari":"گشنیز","translit":"gašnīz","ru":"кориандр; петрушка"},{"dari":"پالک","translit":"pālak","ru":"шпинат"},{"dari":"نعناع","translit":"na'nā'","ru":"мята"},{"dari":"رواش","translit":"rawāš","ru":"ревень"},{"dari":"زعفران","translit":"za'farān","ru":"шафран"},{"dari":"سیر","translit":"sīr","ru":"чеснок"},{"dari":"مرچ سیاه","translit":"mirč-e siyāh","ru":"чёрный перец"},{"dari":"مرچ سرخ","translit":"mirč-e sorx","ru":"красный перец"},{"dari":"هل (هیل)","translit":"hel (hēl)","ru":"кардамон"},{"dari":"زرجوبه","translit":"zarčōba","ru":"имбирь"},{"dari":"میخک","translit":"mēxak","ru":"гвоздика"},{"dari":"زیره","translit":"zīra","ru":"тмин"},{"dari":"دارچینی","translit":"dārčīnī","ru":"корица"},{"dari":"نمک","translit":"namak","ru":"соль"},{"dari":"هسته (خسته)","translit":"hasta (xasta)","ru":"ядро ореха; очищенный орех"},{"dari":"پسته","translit":"pista","ru":"фисташка"},{"dari":"بادام","translit":"bādām","ru":"миндаль"},{"dari":"چارمغز","translit":"čār-mağz","ru":"грецкий орех"},{"dari":"جلغوزه","translit":"jalğōza","ru":"кедровый орех"},{"dari":"روغن جواری","translit":"rōğan-e jawārī","ru":"кукурузное масло"},{"dari":"روغن گل آفتاب پرست","translit":"rōğan-e gul-e āftāb-parast","ru":"подсолнечное масло"},{"dari":"شیر","translit":"šīr","ru":"молоко"},{"dari":"مسکه","translit":"maska","ru":"сливочное масло"},{"dari":"پنیر","translit":"panīr","ru":"сыр"},{"dari":"خام پنیر","translit":"xām-panīr","ru":"творог, свежий сыр"},{"dari":"ماست","translit":"māst","ru":"простокваша, йогурт"},{"dari":"دوغ","translit":"dōğ","ru":"айран, пахтанье"},{"dari":"قیماق","translit":"qaymāq","ru":"сливки, сметана"},{"dari":"قروت","translit":"qorut","ru":"кур(у)т"},{"dari":"تخم مرغ","translit":"toxm-e murğ","ru":"яйцо"},{"dari":"گوشت گوسفند","translit":"gōšt-e gōsfand","ru":"баранина"},{"dari":"گوشت بره","translit":"gōšt-e barra","ru":"ягнятина, мясо ягнёнка"},{"dari":"گوشت گاو","translit":"gōšt-e gāw","ru":"говядина"},{"dari":"گوشت","translit":"gōšt","ru":"мясо"},{"dari":"گوشت گوساله","translit":"gōšt-e gōsāla","ru":"телятина"},{"dari":"گوشت گاومیش","translit":"gōšt-e gāwmēš","ru":"мясо буйвола"},{"dari":"گوشت آهو","translit":"gōšt-e āhū","ru":"мясо газели, оленина"},{"dari":"گوشت مرغ","translit":"gōšt-e murğ","ru":"курятина"},{"dari":"گوشت مرغابی","translit":"gōšt-e murğābī","ru":"утятина"},{"dari":"گوشت قاز","translit":"gōšt-e qāz","ru":"гусятина"},{"dari":"گوشت فیلمرغ","translit":"gōšt-e fīlmurğ","ru":"индюшатина"},{"dari":"گوشت کبک","translit":"gōšt-e kabk","ru":"мясо куропатки"},{"dari":"چای","translit":"čāy","ru":"чай"},{"dari":"قاشق","translit":"qāšoq","ru":"ложка"},{"dari":"پنجه","translit":"panja","ru":"вилка"},{"dari":"کارد","translit":"kārd","ru":"нож"},{"dari":"بشقاب","translit":"bošqāb","ru":"тарелка"},{"dari":"غوری","translit":"ğōrī","ru":"большое блюдо, поднос"},{"dari":"کاسه","translit":"kāsa","ru":"чаша, миска"},{"dari":"پیاله","translit":"piyāla","ru":"пиала, чашка"},{"dari":"گیلاس","translit":"gīlās","ru":"стакан"},{"dari":"پیک","translit":"payk","ru":"рюмка, стопка"},{"dari":"نعلبکی","translit":"na'lbakī","ru":"блюдце"},{"dari":"نمکدانی","translit":"namakdānī","ru":"солонка"},{"dari":"مرچدانی","translit":"mirčdānī","ru":"перечница"},{"dari":"قندانی","translit":"qanddānī","ru":"сахарница"},{"dari":"میوه دانی","translit":"mēwa-dānī","ru":"ваза для фруктов"},{"dari":"کاک پران (کاک کش)","translit":"kāk-parān (kāk-kaš)","ru":"штопор, открывалка"},{"dari":"چای سیاه","translit":"čāy-e siyāh","ru":"чёрный чай"},{"dari":"چای سبز","translit":"čāy-e sabz","ru":"зелёный чай"},{"dari":"چای شیرین","translit":"čāy-e šīrīn","ru":"сладкий чай"},{"dari":"چای تلخ","translit":"čāy-e talx","ru":"чай без сахара"},{"dari":"شیرچای","translit":"šīr-čāy","ru":"чай с молоком"},{"dari":"چای جوش","translit":"čāy-jōš","ru":"чайник для кипячения воды"},{"dari":"چاینک","translit":"čāynak","ru":"заварочный чайник"},{"dari":"دیگ","translit":"dēg","ru":"котёл, кастрюля"},{"dari":"کرایی","translit":"karāyī","ru":"сковорода"},{"dari":"تابه (تاوه)","translit":"tāba (tāwa)","ru":"противень, сковорода"},{"dari":"تنور (تندور)","translit":"tanūr (tandūr)","ru":"тандыр, глиняная печь"},{"dari":"داش","translit":"dāš","ru":"печь, очаг (глинобитный)"},{"dari":"آتشدان","translit":"ātašdān","ru":"очаг, жаровня"},{"dari":"غربال","translit":"ğarbāl","ru":"сито"},{"dari":"آشگز","translit":"āšgaz","ru":"скалка"},{"dari":"ماشین گوشت","translit":"māšīn-e gōšt","ru":"мясорубка"},{"dari":"ساطور","translit":"sātūr","ru":"большой нож, секач"},{"dari":"سیخ کباب","translit":"sīx-e kabāb","ru":"шампур"},{"dari":"تخته","translit":"taxta","ru":"доска, разделочная доска"},{"dari":"چمچه","translit":"čamča","ru":"половник, черпак"},{"dari":"چلو صاف","translit":"čalō-sāf","ru":"дуршлаг для риса"},{"dari":"کفگیر","translit":"kafgīr","ru":"шумовка"},{"dari":"ملی تراش","translit":"molī-tarāš","ru":"тёрка"},{"dari":"چای صاف","translit":"čāy-sāf","ru":"ситечко для чая"}] };
  textbook2TaskCollections.push(textbook2TaskCollection11);

  const textbook2TaskCollection12 = { id: 1012, lessonId: 12, title: "Урок 12 · Слова из заданий", cards: [{"dari":"تبادل","translit":"tabādol","ru":"обмен (М VI)"},{"dari":"تجاوز","translit":"tajāwoz","ru":"посягательство, агрессия; превышение (М VI)"},{"dari":"تکامل","translit":"takāmol","ru":"совершенствование, взаимодополнение (М VI)"},{"dari":"تفاوت","translit":"tafāwot","ru":"разница, различие (М VI)"},{"dari":"تعارف","translit":"ta'ārof","ru":"знакомство; обычай взаимных угощений (М VI)"},{"dari":"تقاعد","translit":"taqā'od","ru":"уход на пенсию (М VI)"},{"dari":"تدارک","translit":"tadārok","ru":"подготовка; принятие мер, исправление (М VI)"},{"dari":"تمایل","translit":"tamāyol","ru":"склонность, тенденция (М VI)"},{"dari":"تفاهم","translit":"tafāhom","ru":"взаимопонимание (М VI)"},{"dari":"تصادم","translit":"tasādom","ru":"столкновение (М VI)"},{"dari":"توافق","translit":"tawāfoq","ru":"договорённость, взаимное согласие (М VI)"},{"dari":"تعاون","translit":"ta'āwon","ru":"взаимопомощь, сотрудничество (М VI)"},{"dari":"متقاعد","translit":"motaqā'ed","ru":"вышедший на пенсию, пенсионер (ДП VI)"},{"dari":"متمایل","translit":"motamāyel","ru":"склонный (к чему-л.) (ДП VI)"},{"dari":"متجاوز","translit":"motajāwez","ru":"посягающий, агрессор; превышающий (ДП VI)"},{"dari":"متفاوت","translit":"motafāwet","ru":"различный, неодинаковый (ДП VI)"},{"dari":"متقابل","translit":"motaqābel","ru":"взаимный, обоюдный (ДП VI)"},{"dari":"انکشاف","translit":"enkešāf","ru":"раскрытие, обнаружение; разоблачение (М VII)"},{"dari":"انقلاب","translit":"enqelāb","ru":"переворот, революция (М VII)"},{"dari":"انحصار","translit":"enhesār","ru":"монополия, ограничение (М VII)"},{"dari":"انزجار","translit":"enzejār","ru":"неприязнь, отвращение (М VII)"},{"dari":"انفجار","translit":"enfejār","ru":"взрыв (М VII)"},{"dari":"انعکاس","translit":"en'ekās","ru":"отражение (М VII)"},{"dari":"انعطاف","translit":"en'etāf","ru":"гибкость, эластичность (М VII)"},{"dari":"منعکس","translit":"mon'akes","ru":"отражённый (СП VII)"},{"dari":"منفجر","translit":"monfajer","ru":"взорвавшийся (СП VII)"},{"dari":"انکشاف یافتن","translit":"enkešāf yāftan","ru":"обнаруживаться, раскрываться"},{"dari":"انکشاف دادن","translit":"enkešāf dādan","ru":"обнаруживать, раскрывать"},{"dari":"منفجر شدن","translit":"monfajer šodan","ru":"взрываться"},{"dari":"منفجر ساختن","translit":"monfajer sāxtan","ru":"взрывать"},{"dari":"انعکاس یافتن = منعکس شدن","translit":"en'ekās yāftan = mon'akes šodan","ru":"отражаться"},{"dari":"انعکاس دادن = منعکس کردن","translit":"en'ekās dādan = mon'akes kardan","ru":"отражать"},{"dari":"اشتباه","translit":"eštebāh","ru":"ошибка; сомнение (М VIII)"},{"dari":"اختیار","translit":"extiyār","ru":"выбор (М VIII)"},{"dari":"احترام","translit":"ehterām","ru":"уважение (М VIII)"},{"dari":"انتخاب","translit":"entexāb","ru":"выбор, избрание (М VIII)"},{"dari":"ارتجاع","translit":"ertejā'","ru":"реакция (политическая) (М VIII)"},{"dari":"انتظار","translit":"entezār","ru":"ожидание (М VIII)"},{"dari":"امتحان","translit":"emtehān","ru":"экзамен, испытание (М VIII)"},{"dari":"افتخار","translit":"eftexār","ru":"честь, гордость (М VIII)"},{"dari":"اعتراض","translit":"e'terāz","ru":"протест, возражение (М VIII)"},{"dari":"انتقال","translit":"enteqāl","ru":"перемещение, переход (М VIII)"},{"dari":"اعتماد","translit":"e'temād","ru":"доверие (М VIII)"},{"dari":"اصلاح","translit":"eslāh","ru":"исправление; реформа (М VIII)"},{"dari":"احتیاج","translit":"ehtiyāj","ru":"нужда, потребность (М VIII)"},{"dari":"ارتفاع","translit":"ertefā'","ru":"высота, подъём (М VIII)"},{"dari":"اضطراب","translit":"ezterāb","ru":"беспокойство, тревога (М VIII)"},{"dari":"ازدواج","translit":"ezdewāj","ru":"брак, супружество; двойственность (М VIII)"},{"dari":"ابتکار","translit":"ebtekār","ru":"инициатива; изобретение (М VIII)"},{"dari":"اشتراک","translit":"ešterāk","ru":"участие; подписка (М VIII)"},{"dari":"انتشار","translit":"entešār","ru":"распространение, публикация (М VIII)"},{"dari":"اختلاف","translit":"extelāf","ru":"разногласие, различие (М VIII)"},{"dari":"اقتصاد","translit":"eqtesād","ru":"экономика; бережливость (М VIII)"},{"dari":"اجتماع","translit":"ejtemā'","ru":"общество, собрание (М VIII)"},{"dari":"اطلاع","translit":"ettelā'","ru":"осведомлённость; сообщение (М VIII)"},{"dari":"منتخب","translit":"montaxab","ru":"избранный (СП VIII)"},{"dari":"مشترک","translit":"moštarak","ru":"совместный, общий (СП VIII)"},{"dari":"مختصر","translit":"moxtasar","ru":"краткий, сокращённый (СП VIII)"},{"dari":"مزدحم","translit":"mozdaham","ru":"переполненный, людный (СП VIII)"},{"dari":"محترم","translit":"mohtaram","ru":"уважаемый (СП VIII)"}] };
  textbook2TaskCollections.push(textbook2TaskCollection12);

  const textbook2TaskCollection13 = { id: 1013, lessonId: 13, title: "Урок 13 · Слова из заданий", cards: [{"dari":"همسن","translit":"ham-sen","ru":"ровесник, одного возраста"},{"dari":"ذینفع","translit":"zī-naf'","ru":"заинтересованное лицо; полезный"},{"dari":"ناپاک","translit":"nā-pāk","ru":"нечистый, порочный"},{"dari":"بااستعداد","translit":"bā-este'dād","ru":"способный, одарённый"},{"dari":"بی پولی","translit":"bē-pūlī","ru":"безденежье, бедность"},{"dari":"با سواد","translit":"bā-sawād","ru":"грамотный, образованный"},{"dari":"ناکام","translit":"nā-kām","ru":"неудачник; неудачный"},{"dari":"ذیعلاقه","translit":"zī-'alāqa","ru":"заинтересованный, имеющий интерес"},{"dari":"همسرحد","translit":"ham-sarhad","ru":"имеющий общую границу, соседний"},{"dari":"همکاری","translit":"ham-kārī","ru":"сотрудничество, взаимодействие"},{"dari":"باحوصله","translit":"bā-hawsala","ru":"терпеливый, выдержанный"},{"dari":"بی سواد","translit":"bē-sawād","ru":"неграмотный"},{"dari":"ناآشنا","translit":"nā-āšnā","ru":"незнакомый"},{"dari":"همشهری","translit":"ham-šahrī","ru":"земляк, житель того же города"},{"dari":"ناممکن","translit":"nā-momken","ru":"невозможный"},{"dari":"لا مذهب","translit":"lā-mazhab","ru":"неверующий, без религии"},{"dari":"بی تجربه","translit":"bē-tajroba","ru":"неопытный"},{"dari":"آزادانه","translit":"āzādāna","ru":"свободно, раскованно"},{"dari":"لطفاً","translit":"lotfan","ru":"пожалуйста"},{"dari":"به تفصیل","translit":"ba tafsīl","ru":"подробно"},{"dari":"مشترکاً","translit":"moštarakan","ru":"совместно, сообща"},{"dari":"دوستانه","translit":"dōstāna","ru":"дружески, по-дружески"},{"dari":"به مشکل","translit":"ba moškel","ru":"с трудом"},{"dari":"زیرکانه","translit":"zīrakāna","ru":"хитро, ловко"},{"dari":"بلاشک","translit":"belā-šak","ru":"несомненно, бесспорно"},{"dari":"به خوبی","translit":"ba xūbī","ru":"хорошо"},{"dari":"چاشتکی","translit":"čāštakī","ru":"утром, спозаранку"},{"dari":"به تلخی","translit":"ba talxī","ru":"горько"},{"dari":"نادرست","translit":"nā-dorost","ru":"неправильно, неверно"},{"dari":"جدیداً","translit":"jadīdan","ru":"недавно, в последнее время"},{"dari":"به اصطلاح","translit":"ba estelāh","ru":"так сказать, в прямом смысле слова"},{"dari":"بر حق","translit":"bar haq","ru":"правый, справедливый"},{"dari":"باخوشی","translit":"bā-xōšī","ru":"с удовольствием, охотно"},{"dari":"عادتاً","translit":"ādatan","ru":"обычно, по привычке"},{"dari":"روزانه","translit":"rōzāna","ru":"ежедневно"},{"dari":"بیجا","translit":"bē-jā","ru":"неуместно, напрасно"},{"dari":"حقیقتاً","translit":"haqīqatan","ru":"действительно, поистине"},{"dari":"به نوبت","translit":"ba nawbat","ru":"по очереди"},{"dari":"تقریباً","translit":"taqrīban","ru":"приблизительно, почти"},{"dari":"با جابکی","translit":"bā jābakī","ru":"ловко, проворно"},{"dari":"قطعاً","translit":"qat'an","ru":"решительно, обязательно"},{"dari":"موفقانه","translit":"mowaffaqāna","ru":"успешно"},{"dari":"خاموشانه","translit":"xāmōšāna","ru":"молча, тихо"},{"dari":"به شدت","translit":"ba šiddat","ru":"сильно, интенсивно"},{"dari":"وسیعاً","translit":"wasī'an","ru":"широко"},{"dari":"بدبختانه","translit":"badbaxtāna","ru":"к несчастью"},{"dari":"علاوه بر","translit":"elāwa bar","ru":"кроме того, вдобавок"},{"dari":"به نرمی","translit":"ba narmī","ru":"мягко"},{"dari":"بی صبرانه","translit":"bē-sabrāna","ru":"нетерпеливо"},{"dari":"تصادفاً","translit":"tasādefan","ru":"случайно"},{"dari":"بی سواد","translit":"bē-sawād","ru":"неграмотный"},{"dari":"با سواد","translit":"bā-sawād","ru":"грамотный"},{"dari":"بدبختی","translit":"badbaxtī","ru":"несчастье"},{"dari":"خوشبختی","translit":"xōšbaxtī","ru":"счастье"},{"dari":"ناهماهنگ","translit":"nā-hamāhang","ru":"несогласованный, нестройный"},{"dari":"هماهنگ","translit":"hamāhang","ru":"согласованный"},{"dari":"بی علاقه","translit":"bē-alāqa","ru":"незаинтересованный, равнодушный"},{"dari":"با علاقه","translit":"bā-alāqa","ru":"с интересом"},{"dari":"حسن تفاهم","translit":"hosn-e tafāhom","ru":"взаимопонимание"},{"dari":"سوء تفاهم","translit":"sū'-e tafāhom","ru":"недоразумение"},{"dari":"کم حرف","translit":"kam-harf","ru":"молчаливый"},{"dari":"پرحرف","translit":"por-harf","ru":"болтливый"},{"dari":"نامعلوم","translit":"nā-ma'lūm","ru":"неизвестный"},{"dari":"معلوم","translit":"ma'lūm","ru":"известный"},{"dari":"پر قیمت","translit":"por-qīmat","ru":"дорогой, ценный"},{"dari":"کم قیمت","translit":"kam-qīmat","ru":"дешёвый"},{"dari":"بدمزه","translit":"bad-maza","ru":"невкусный"},{"dari":"خوشمزه","translit":"xōš-maza","ru":"вкусный"},{"dari":"خوشخلقی","translit":"xōš-xolqī","ru":"приветливость, добрый нрав"},{"dari":"بدخلقی","translit":"bad-xolqī","ru":"дурной нрав"},{"dari":"بی تجربه","translit":"bē-tajroba","ru":"неопытный"},{"dari":"با تجربه","translit":"bā-tajroba","ru":"опытный"},{"dari":"کامیاب","translit":"kāmyāb","ru":"успешный, добившийся цели"},{"dari":"ناکام","translit":"nākām","ru":"неудачливый"},{"dari":"بی اولاد","translit":"bē-awlād","ru":"бездетный"},{"dari":"با اولاد","translit":"bā-awlād","ru":"имеющий детей"},{"dari":"نارضایتی","translit":"nārezāyatī","ru":"недовольство"},{"dari":"رضایت","translit":"rezāyat","ru":"удовлетворённость"},{"dari":"عدم توجه","translit":"adam-e tawajjoh","ru":"невнимание"},{"dari":"توجه","translit":"tawajjoh","ru":"внимание"},{"dari":"پررنگ","translit":"por-rang","ru":"яркий, насыщенный"},{"dari":"کمرنگ","translit":"kam-rang","ru":"бледный"},{"dari":"بی اعتمادی","translit":"bē-e'temādī","ru":"недоверие"},{"dari":"اعتماد","translit":"e'temād","ru":"доверие"},{"dari":"غیر منسلک","translit":"ğayr-e monsalek","ru":"неприсоединившийся, неприсоединённый"},{"dari":"منسلک","translit":"monsalek","ru":"присоединённый"},{"dari":"کمزوری","translit":"kamzōrī","ru":"слабость"},{"dari":"قوت","translit":"qowwat","ru":"сила"},{"dari":"سوء نیت","translit":"sū'-e niyyat","ru":"злой умысел"},{"dari":"حسن نیت","translit":"hosn-e niyyat","ru":"добрые намерения"},{"dari":"ابرآلود","translit":"abr-ālūd","ru":"облачный, пасмурный"},{"dari":"صاف","translit":"sāf","ru":"ясный"},{"dari":"ناامید","translit":"nā-omēd","ru":"безнадёжный, разочарованный"},{"dari":"امیدوار","translit":"omēdwār","ru":"надеющийся"},{"dari":"وفادار","translit":"wafādār","ru":"верный, преданный"},{"dari":"بی وفا","translit":"bē-wafā","ru":"неверный"},{"dari":"عدم مداخله","translit":"adam-e modāxela","ru":"невмешательство"},{"dari":"مداخله","translit":"modāxela","ru":"вмешательство"},{"dari":"ناممکن","translit":"nā-momken","ru":"невозможный"},{"dari":"ممکن","translit":"momken","ru":"возможный"},{"dari":"باحوصله","translit":"bā-hawsala","ru":"терпеливый, выдержанный"},{"dari":"بی حوصله","translit":"bē-hawsala","ru":"нетерпеливый"},{"dari":"کامیابی","translit":"kāmyābī","ru":"успех, достижение цели"},{"dari":"ناکامی","translit":"nākāmī","ru":"неудача"},{"dari":"عدم انسلاک","translit":"adam-e enselāk","ru":"неприсоединение"},{"dari":"انسلاک","translit":"enselāk","ru":"присоединение"}] };
  textbook2TaskCollections.push(textbook2TaskCollection13);


  const textbook2TaskCollection14 = {"id":1014,"lessonId":14,"title":"Урок 14 · Слова из заданий","cards":[{"dari":"مُمِدّ","translit":"momidd","ru":"снабжающий, поставляющий"},{"dari":"مُسْتَحَقّ","translit":"mostahaqq","ru":"заслуженный, причитающийся"},{"dari":"عامّ","translit":"'āmm","ru":"общий, всеобщий"},{"dari":"مُماسّ","translit":"momāss","ru":"соприкасающийся; касательная"},{"dari":"مَشَقَّت","translit":"mašaqqat","ru":"трудность, тягота"},{"dari":"مُنْفَکّ","translit":"monfakk","ru":"отделённый, разъединённый"},{"dari":"دالّ","translit":"dāll","ru":"указывающий, обозначающий"},{"dari":"مُرْتَدّ","translit":"mortadd","ru":"отступник, вероотступник"},{"dari":"مُسْتَقَرّ","translit":"mostaqarr","ru":"устойчивый, постоянный; местопребывание"},{"dari":"مُجِدّ","translit":"mojidd","ru":"усердный, серьёзный"},{"dari":"مُخْتَلّ","translit":"moxtall","ru":"расстроенный, нарушенный"},{"dari":"مَوَدَّت","translit":"mawaddat","ru":"любовь, привязанность"},{"dari":"مُخْتَصّ","translit":"moxtass","ru":"специальный, особый"},{"dari":"مُصرّ","translit":"mossirr","ru":"настойчивый, упорный"},{"dari":"مُشْتَقّ","translit":"moštaqq","ru":"производный; производное слово"},{"dari":"مَصافّ","translit":"masāff","ru":"ряды, боевые порядки"},{"dari":"مُنْحَلّ","translit":"monhall","ru":"распущенный, разложившийся; растворённый"},{"dari":"ممتد","translit":"momtadd","ru":"протяжённый, растянутый"},{"dari":"مستقر","translit":"mostaqarr","ru":"устойчивый, постоянный"},{"dari":"مختص","translit":"moxtass","ru":"специальный, особый"},{"dari":"ممد","translit":"momadd","ru":"протяжённый; снабжённый"},{"dari":"مستقل","translit":"mostaqell","ru":"независимый, самостоятельный"},{"dari":"منحل","translit":"monhall","ru":"распущенный, разложившийся"},{"dari":"مسترد","translit":"mostaradd","ru":"возвращённый, полученный обратно"},{"dari":"منفک","translit":"monfakk","ru":"отделённый, разъединённый"},{"dari":"مختل","translit":"moxtall","ru":"расстроенный, нарушенный"},{"dari":"مستعد","translit":"mosta'edd","ru":"готовый, подготовленный"},{"dari":"مرتد","translit":"mortadd","ru":"отступник, вероотступник"},{"dari":"متضاد","translit":"motazādd","ru":"противоречивый, противоположный"},{"dari":"مستحق","translit":"mostahaqq","ru":"заслуженный, причитающийся"}]};
  textbook2TaskCollections.push(textbook2TaskCollection14);

  const textbook2TaskCollection15 = {"id":1015,"lessonId":15,"title":"Урок 15 · Слова из заданий","cards":[{"dari":"انواع","translit":"anwā'","ru":"виды, типы","singular":"نوع","singularTranslit":"naw'","singularRu":"вид, тип"},{"dari":"افکار","translit":"afkār","ru":"мысли","singular":"فکر","singularTranslit":"fekr","singularRu":"мысль"},{"dari":"اعماق","translit":"a'māq","ru":"глубины","singular":"عمق","singularTranslit":"omq","singularRu":"глубина"},{"dari":"اعضا","translit":"a'zā","ru":"члены; органы","singular":"عضو","singularTranslit":"ozw","singularRu":"член; орган"},{"dari":"اهداف","translit":"ahdāf","ru":"цели","singular":"هدف","singularTranslit":"hadaf","singularRu":"цель"},{"dari":"اوقات","translit":"awqāt","ru":"времена","singular":"وقت","singularTranslit":"waqt","singularRu":"время"},{"dari":"اطفال","translit":"atfāl","ru":"дети","singular":"طفل","singularTranslit":"tefl","singularRu":"ребёнок"},{"dari":"امراض","translit":"amrāz","ru":"болезни","singular":"مرض","singularTranslit":"maraz","singularRu":"болезнь"},{"dari":"آثار","translit":"āsār","ru":"следы; произведения","singular":"اثر","singularTranslit":"asar","singularRu":"след; произведение"},{"dari":"احزاب","translit":"ahzāb","ru":"партии","singular":"حزب","singularTranslit":"hezb","singularRu":"партия"},{"dari":"اوضاع","translit":"awzā'","ru":"положения; обстановка","singular":"وضع","singularTranslit":"waz'","singularRu":"положение, состояние"},{"dari":"اجناس","translit":"ajnās","ru":"товары; роды","singular":"جنس","singularTranslit":"jens","singularRu":"род; товар"},{"dari":"اخبار","translit":"axbār","ru":"новости, известия","singular":"خبر","singularTranslit":"xabar","singularRu":"новость, известие"},{"dari":"اقلام","translit":"aqlām","ru":"ручки, перья","singular":"قلم","singularTranslit":"qalam","singularRu":"ручка, перо"},{"dari":"اجزا","translit":"ajzā","ru":"части, компоненты","singular":"جزء","singularTranslit":"joz'","singularRu":"часть, компонент"},{"dari":"اتباع","translit":"atbā'","ru":"последователи; подданные","singular":"تابع","singularTranslit":"tābe'","singularRu":"последователь; подданный"},{"dari":"صفوف","translit":"sofuf","ru":"ряды","singular":"صف","singularTranslit":"saf","singularRu":"ряд"},{"dari":"قرون","translit":"qorūn","ru":"века","singular":"قرن","singularTranslit":"qarn","singularRu":"век"},{"dari":"سطوح","translit":"sotuh","ru":"поверхности","singular":"سطح","singularTranslit":"sath","singularRu":"поверхность"},{"dari":"دروس","translit":"dorus","ru":"уроки","singular":"درس","singularTranslit":"dars","singularRu":"урок"},{"dari":"صنوف","translit":"sonuf","ru":"разряды, категории; цеха","singular":"صنف","singularTranslit":"senf","singularRu":"разряд, категория; цех"},{"dari":"اصول","translit":"osūl","ru":"основы, принципы","singular":"اصل","singularTranslit":"asl","singularRu":"основа, принцип"},{"dari":"دول","translit":"dowal","ru":"государства","singular":"دولت","singularTranslit":"dawlat","singularRu":"государство"},{"dari":"علل","translit":"elal","ru":"причины; болезни","singular":"علت","singularTranslit":"ellat","singularRu":"причина; болезнь"},{"dari":"شعب","translit":"šo'ab","ru":"народы; ответвления","singular":"شعب","singularTranslit":"ša'b","singularRu":"народ; ответвление"},{"dari":"قلل","translit":"qelal","ru":"вершины","singular":"قله","singularTranslit":"qolla","singularRu":"вершина"},{"dari":"قیم","translit":"qiyam","ru":"ценности","singular":"قیمه","singularTranslit":"qīmat","singularRu":"ценность"},{"dari":"حصص","translit":"hesas","ru":"части; уроки","singular":"حصه","singularTranslit":"hessa","singularRu":"часть, доля; урок"},{"dari":"ملل","translit":"melal","ru":"нации","singular":"ملت","singularTranslit":"mellat","singularRu":"нация"},{"dari":"ازمنه","translit":"azmena","ru":"времена","singular":"زمان","singularTranslit":"zamān","singularRu":"время"},{"dari":"امتعه","translit":"amte'a","ru":"товары, имущество","singular":"متاع","singularTranslit":"matā'","singularRu":"товар, имущество"},{"dari":"البسه","translit":"albeza","ru":"одежда","singular":"لباس","singularTranslit":"lebās","singularRu":"одежда"},{"dari":"اسلحه","translit":"asleha","ru":"оружие","singular":"سلاح","singularTranslit":"selāh","singularRu":"оружие"},{"dari":"اغذیه","translit":"ağziya","ru":"продукты, кушанья","singular":"غذا","singularTranslit":"ğazā","singularRu":"еда, пища"},{"dari":"ادویه","translit":"adwiya","ru":"лекарства","singular":"دوا","singularTranslit":"dawā","singularRu":"лекарство"},{"dari":"نتایج","translit":"natāyej","ru":"результаты","singular":"نتیجه","singularTranslit":"natīja","singularRu":"результат"},{"dari":"جزایر","translit":"jazāyer","ru":"острова","singular":"جزیره","singularTranslit":"jazīra","singularRu":"остров"},{"dari":"دلایل","translit":"dalāyel","ru":"доводы","singular":"دلیل","singularTranslit":"dalīl","singularRu":"довод"},{"dari":"صنایع","translit":"sanāye'","ru":"отрасли промышленности, ремёсла","singular":"صنعت","singularTranslit":"san'at","singularRu":"промышленность, ремесло"},{"dari":"وسایل","translit":"wasāyel","ru":"средства","singular":"وسیله","singularTranslit":"wasīla","singularRu":"средство"},{"dari":"ذخایر","translit":"zaxāyer","ru":"запасы","singular":"ذخیره","singularTranslit":"zaxīra","singularRu":"запас"},{"dari":"تحایف","translit":"tahāyef","ru":"подарки; редкости","singular":"تحفه","singularTranslit":"tohfa","singularRu":"подарок; редкость"},{"dari":"جراید","translit":"jarāyed","ru":"газеты","singular":"جریده","singularTranslit":"jarīda","singularRu":"газета"},{"dari":"دقایق","translit":"daqāyeq","ru":"минуты; тонкости","singular":"دقیقه","singularTranslit":"daqīqa","singularRu":"минута; тонкость"},{"dari":"وظایف","translit":"wazāyef","ru":"обязанности","singular":"وظیفه","singularTranslit":"wazīfa","singularRu":"обязанность"},{"dari":"علایق","translit":"alāyeq","ru":"связи; интересы","singular":"علاقه","singularTranslit":"alāqa","singularRu":"связь; интерес"},{"dari":"نصایح","translit":"nasāyeh","ru":"советы, наставления","singular":"نصیحت","singularTranslit":"nasīhat","singularRu":"совет, наставление"},{"dari":"شرایط","translit":"šarāyet","ru":"условия","singular":"شرط","singularTranslit":"šart","singularRu":"условие"},{"dari":"مطالب","translit":"matāleb","ru":"вопросы, темы","singular":"مطلب","singularTranslit":"matlab","singularRu":"вопрос, тема"},{"dari":"مسالک","translit":"masālek","ru":"пути; убеждения","singular":"مسلک","singularTranslit":"maslak","singularRu":"путь; убеждение"},{"dari":"منازل","translit":"manāzel","ru":"дома","singular":"منزل","singularTranslit":"manzel","singularRu":"дом"},{"dari":"مسائل","translit":"masā'el","ru":"вопросы, задачи","singular":"مسئله","singularTranslit":"mas'ala","singularRu":"вопрос, задача"},{"dari":"ممالک","translit":"mamālek","ru":"страны","singular":"مملکت","singularTranslit":"mamlekat","singularRu":"страна"},{"dari":"مجالس","translit":"majāles","ru":"собрания","singular":"مجلس","singularTranslit":"majles","singularRu":"собрание"},{"dari":"معابد","translit":"ma'ābed","ru":"храмы","singular":"معبد","singularTranslit":"ma'bad","singularRu":"храм"},{"dari":"مقاصد","translit":"maqāsed","ru":"цели","singular":"مقصد","singularTranslit":"maqsad","singularRu":"цель"},{"dari":"مناطق","translit":"manāteq","ru":"районы","singular":"منطقه","singularTranslit":"mantaqa","singularRu":"район"},{"dari":"منابع","translit":"manābe'","ru":"источники","singular":"منبع","singularTranslit":"manba'","singularRu":"источник"},{"dari":"مصارف","translit":"masāref","ru":"расходы","singular":"مصرف","singularTranslit":"masraf","singularRu":"расход"},{"dari":"مناظر","translit":"manāzer","ru":"виды","singular":"منظر","singularTranslit":"manzar","singularRu":"вид"},{"dari":"مجاری","translit":"majāri","ru":"каналы, течения","singular":"مجرا","singularTranslit":"majrā","singularRu":"канал, течение"},{"dari":"مبانی","translit":"mabāni","ru":"основы","singular":"مبنا","singularTranslit":"mabnā","singularRu":"основа"},{"dari":"حضار","translit":"hozār","ru":"присутствующие","singular":"حاضر","singularTranslit":"hāzer","singularRu":"присутствующий"},{"dari":"حجاج","translit":"hojjāj","ru":"паломники","singular":"حاجی","singularTranslit":"hājī","singularRu":"паломник"},{"dari":"تجار","translit":"tojjār","ru":"купцы","singular":"تاجر","singularTranslit":"tājer","singularRu":"купец"},{"dari":"قضات","translit":"qozāt","ru":"судьи","singular":"قاضی","singularTranslit":"qāzī","singularRu":"судья"},{"dari":"حوادث","translit":"hawādes","ru":"происшествия","singular":"حادثه","singularTranslit":"hādise","singularRu":"происшествие"},{"dari":"قواعد","translit":"qawā'ed","ru":"правила","singular":"قاعده","singularTranslit":"qā'ida","singularRu":"правило"},{"dari":"سواحل","translit":"sawāhel","ru":"берега","singular":"ساحل","singularTranslit":"sāhel","singularRu":"берег"},{"dari":"جوانب","translit":"jawāneb","ru":"стороны","singular":"جانب","singularTranslit":"jāneb","singularRu":"сторона"},{"dari":"روابط","translit":"rawābet","ru":"связи","singular":"رابطه","singularTranslit":"rābita","singularRu":"связь"},{"dari":"نوابغ","translit":"nawābeğ","ru":"гении","singular":"نابغه","singularTranslit":"nābeğa","singularRu":"гений"},{"dari":"فواید","translit":"fawāyed","ru":"пользы","singular":"فایده","singularTranslit":"fāyida","singularRu":"польза"},{"dari":"جوامع","translit":"jawāme'","ru":"общества","singular":"جامعه","singularTranslit":"jāmi'a","singularRu":"общество"},{"dari":"مواد","translit":"mawād","ru":"вещества; статьи","singular":"ماده","singularTranslit":"mādda","singularRu":"вещество; статья"},{"dari":"خواص","translit":"xawās","ru":"свойства","singular":"خاصیت","singularTranslit":"xāssiyat","singularRu":"свойство"},{"dari":"نواحی","translit":"nawāhi","ru":"районы, области","singular":"ناحیه","singularTranslit":"nāhiya","singularRu":"район, область"},{"dari":"حواشی","translit":"hawāši","ru":"поля (страницы); окраины","singular":"حاشیه","singularTranslit":"hāšiya","singularRu":"поле; окраина"},{"dari":"قوانین","translit":"qawānīn","ru":"законы","singular":"قانون","singularTranslit":"qānūn","singularRu":"закон"},{"dari":"نوامیس","translit":"nawāmīs","ru":"законы; устои","singular":"ناموس","singularTranslit":"nāmūs","singularRu":"закон; честь, устои"},{"dari":"مشاهیر","translit":"mašāhīr","ru":"знаменитости","singular":"مشهور","singularTranslit":"mašhūr","singularRu":"знаменитый"},{"dari":"مقادیر","translit":"maqādīr","ru":"количества","singular":"مقدار","singularTranslit":"meqdār","singularRu":"количество"},{"dari":"مضامین","translit":"mazāmīn","ru":"содержания, темы","singular":"مضمون","singularTranslit":"mazmūn","singularRu":"содержание, тема"},{"dari":"تصاویر","translit":"tasāwīr","ru":"картины, изображения","singular":"تصویر","singularTranslit":"tasvīr","singularRu":"картина, изображение"},{"dari":"تدابیر","translit":"tadābīr","ru":"меры","singular":"تدبیر","singularTranslit":"tadbīr","singularRu":"мера"},{"dari":"تصامیم","translit":"tasāmīm","ru":"решения","singular":"تصمیم","singularTranslit":"tasmīm","singularRu":"решение"},{"dari":"تواریخ","translit":"tawārīx","ru":"истории; даты","singular":"تاریخ","singularTranslit":"tārīx","singularRu":"история; дата"},{"dari":"وزرا","translit":"vozarā","ru":"министры","singular":"وزیر","singularTranslit":"vazīr","singularRu":"министр"},{"dari":"شهدا","translit":"šohadā","ru":"мученики","singular":"شهید","singularTranslit":"šahīd","singularRu":"мученик"},{"dari":"امرا","translit":"omarā","ru":"эмиры","singular":"امیر","singularTranslit":"amīr","singularRu":"эмир"},{"dari":"فقرا","translit":"foqarā","ru":"бедняки","singular":"فقیر","singularTranslit":"faqīr","singularRu":"бедняк"},{"dari":"زعما","translit":"zo'amā","ru":"лидеры","singular":"زعیم","singularTranslit":"za'īm","singularRu":"лидер"},{"dari":"وکلا","translit":"vokalā","ru":"адвокаты; представители","singular":"وکیل","singularTranslit":"vakīl","singularRu":"адвокат; представитель"},{"dari":"روسا","translit":"ro'asā","ru":"главы","singular":"رئیس","singularTranslit":"ra'īs","singularRu":"глава"},{"dari":"رفقا","translit":"rofqā","ru":"товарищи","singular":"رفیق","singularTranslit":"rafīq","singularRu":"товарищ"},{"dari":"سفرا","translit":"sofarā","ru":"послы","singular":"سفیر","singularTranslit":"safīr","singularRu":"посол"},{"dari":"ضعفا","translit":"zo'afā","ru":"слабые","singular":"ضعیف","singularTranslit":"za'īf","singularRu":"слабый"},{"dari":"ادبا","translit":"odabā","ru":"литераторы","singular":"ادیب","singularTranslit":"adīb","singularRu":"литератор"},{"dari":"اراضی","translit":"arāzī","ru":"земли","singular":"ارض","singularTranslit":"arz","singularRu":"земля"},{"dari":"صحاری","translit":"sahārī","ru":"пустыни","singular":"صحرا","singularTranslit":"sahrā","singularRu":"пустыня"},{"dari":"اسامی","translit":"asāmī","ru":"имена","singular":"اسم","singularTranslit":"esm","singularRu":"имя"},{"dari":"اهالی","translit":"ahālī","ru":"жители","singular":"اهل","singularTranslit":"ahl","singularRu":"житель (собир.)"},{"dari":"قضایا","translit":"qazāyā","ru":"дела, вопросы","singular":"قضیه","singularTranslit":"qazīya","singularRu":"дело, вопрос"},{"dari":"بقایا","translit":"baqāyā","ru":"остатки","singular":"بقیه","singularTranslit":"baqīya","singularRu":"остаток"},{"dari":"طرق","translit":"toroq","ru":"пути","singular":"طریق","singularTranslit":"tarīq","singularRu":"путь"},{"dari":"کتب","translit":"kotob","ru":"книги","singular":"کتاب","singularTranslit":"ketāb","singularRu":"книга"},{"dari":"جبال","translit":"jebāl","ru":"горы","singular":"جبل","singularTranslit":"jabal","singularRu":"гора"},{"dari":"نقاط","translit":"noqāt","ru":"точки","singular":"نقطه","singularTranslit":"noqta","singularRu":"точка"},{"dari":"اطباء","translit":"atebbā","ru":"врачи","singular":"طبیب","singularTranslit":"tabīb","singularRu":"врач"},{"dari":"عناصر","translit":"anāser","ru":"элементы","singular":"عنصر","singularTranslit":"onsor","singularRu":"элемент"},{"dari":"جواهر","translit":"jawāher","ru":"драгоценности; сущности","singular":"جوهر","singularTranslit":"jawhar","singularRu":"драгоценность; сущность"},{"dari":"عساکر","translit":"asāker","ru":"солдаты","singular":"عسکر","singularTranslit":"askar","singularRu":"солдат"},{"dari":"دفاتر","translit":"dafāter","ru":"тетради; конторы","singular":"دفتر","singularTranslit":"daftar","singularRu":"тетрадь; контора"},{"dari":"شیاطین","translit":"šayātīn","ru":"дьяволы","singular":"شیطان","singularTranslit":"šaytān","singularRu":"дьявол"},{"dari":"دهقانین","translit":"dehqānīn","ru":"крестьяне","singular":"دهقان","singularTranslit":"dehqān","singularRu":"крестьянин"},{"dari":"جماهیر","translit":"jamāhīr","ru":"народные массы","singular":"جمهور","singularTranslit":"jomhūr","singularRu":"народ, массы"},{"dari":"سلاطین","translit":"salātīn","ru":"султаны","singular":"سلطان","singularTranslit":"soltān","singularRu":"султан"},{"dari":"فلاسفه","translit":"falāsefa","ru":"философы","singular":"فیلسوف","singularTranslit":"faylasūf","singularRu":"философ"},{"dari":"شعرا","translit":"šo'arā","ru":"поэты","singular":"شاعر","singularTranslit":"šā'er","singularRu":"поэт"},{"dari":"اشعار","translit":"aš'ār","ru":"стихи","singular":"شعر","singularTranslit":"še'r","singularRu":"стихотворение"},{"dari":"معارف","translit":"ma'āref","ru":"знания, просвещение","singular":"معرفت","singularTranslit":"ma'rifat","singularRu":"знание, познание"},{"dari":"معاریف","translit":"ma'ārif","ru":"известные (люди)","singular":"معروف","singularTranslit":"ma'rūf","singularRu":"известный"},{"dari":"علوم","translit":"olūm","ru":"науки","singular":"علم","singularTranslit":"elm","singularRu":"наука"},{"dari":"علایم","translit":"alāyem","ru":"признаки","singular":"علامت","singularTranslit":"alāmat","singularRu":"признак"},{"dari":"علما","translit":"olamā","ru":"учёные","singular":"عالم","singularTranslit":"ālem","singularRu":"учёный"},{"dari":"مکاتیب","translit":"makātīb","ru":"письма","singular":"مکتوب","singularTranslit":"maktūb","singularRu":"письмо"},{"dari":"مکاتب","translit":"makāteb","ru":"школы","singular":"مکتب","singularTranslit":"maktab","singularRu":"школа"},{"dari":"کتب","translit":"kotob","ru":"книги","singular":"کتاب","singularTranslit":"ketāb","singularRu":"книга"},{"dari":"عرایض","translit":"arāyez","ru":"заявления","singular":"عریضه","singularTranslit":"arīza","singularRu":"заявление"},{"dari":"عوارض","translit":"awārez","ru":"неисправности; симптомы","singular":"عارضه","singularTranslit":"āriza","singularRu":"неисправность; симптом"},{"dari":"شهور","translit":"šohūr","ru":"месяцы","singular":"شهر","singularTranslit":"šahr","singularRu":"месяц"},{"dari":"شواهد","translit":"šawāhed","ru":"свидетели","singular":"شاهد","singularTranslit":"šāhed","singularRu":"свидетель"},{"dari":"شهدا","translit":"šohadā","ru":"мученики","singular":"شهید","singularTranslit":"šahīd","singularRu":"мученик"},{"dari":"عمال","translit":"ommāl","ru":"рабочие","singular":"عامل","singularTranslit":"āmel","singularRu":"рабочий"},{"dari":"عوامل","translit":"awāmel","ru":"факторы","singular":"عامل","singularTranslit":"āmel","singularRu":"фактор"},{"dari":"امور","translit":"omūr","ru":"дела","singular":"امر","singularTranslit":"amr","singularRu":"дело"},{"dari":"اوامر","translit":"awāmer","ru":"приказы","singular":"امر","singularTranslit":"amr","singularRu":"приказ"},{"dari":"حقایق","translit":"haqāyeq","ru":"истины","singular":"حقیقت","singularTranslit":"haqīqat","singularRu":"истина"},{"dari":"حقوق","translit":"hoqūq","ru":"права","singular":"حق","singularTranslit":"haq","singularRu":"право"},{"dari":"اصلاح","translit":"eslāh","ru":"исправление, реформа"},{"dari":"اشخاص","translit":"ašxās","ru":"лица, люди; ед. ч. شخص (šaxs)"},{"dari":"اطراف","translit":"atrāf","ru":"стороны, окрестности; ед. ч. طرف (taraf)"},{"dari":"امکان","translit":"emkān","ru":"возможность"},{"dari":"اعصاب","translit":"a'sāb","ru":"нервы; ед. ч. عصب (asab)"},{"dari":"اعزام","translit":"e'zām","ru":"отправка, командирование"},{"dari":"اشکال","translit":"aškāl","ru":"формы; трудности; ед. ч. شکل (šekl)"},{"dari":"احداث","translit":"ehdās","ru":"создание, строительство"},{"dari":"حسود","translit":"hasūd","ru":"завистливый"},{"dari":"علوم","translit":"olūm","ru":"науки"},{"dari":"شروع","translit":"šorū'","ru":"начало"},{"dari":"غیور","translit":"ğayūr","ru":"ревнивый; ревностный"},{"dari":"خطوط","translit":"xotūt","ru":"линии; ед. ч. خط (xat)"},{"dari":"وجود","translit":"vojūd","ru":"существование"},{"dari":"جسور","translit":"jasūr","ru":"смелый, дерзкий"},{"dari":"حصول","translit":"hosūl","ru":"получение, достижение"},{"dari":"غفور","translit":"ğafūr","ru":"всепрощающий"},{"dari":"سلاح","translit":"selāh","ru":"оружие"},{"dari":"جبال","translit":"jebāl","ru":"горы"},{"dari":"عکاس","translit":"akkās","ru":"фотограф"},{"dari":"تجار","translit":"tojjār","ru":"купцы"},{"dari":"متاع","translit":"matā'","ru":"товар, имущество"},{"dari":"سلام","translit":"salām","ru":"приветствие; мир"},{"dari":"لباس","translit":"lebās","ru":"одежда"},{"dari":"عمال","translit":"ommāl","ru":"рабочие"},{"dari":"جمال","translit":"jamāl","ru":"красота"},{"dari":"حجاج","translit":"hojjāj","ru":"паломники"},{"dari":"جراح","translit":"jarrāh","ru":"хирург"},{"dari":"سوال","translit":"sawāl","ru":"вопрос"},{"dari":"علما","translit":"olamā","ru":"учёные"},{"dari":"رفقا","translit":"rofqā","ru":"товарищи"},{"dari":"کبرا","translit":"kobrā","ru":"большая, старшая"},{"dari":"دنیا","translit":"donyā","ru":"мир, вселенная"},{"dari":"وزرا","translit":"vozarā","ru":"министры"},{"dari":"علیا","translit":"olyā","ru":"высокая, высшая"},{"dari":"وسطا","translit":"wostā","ru":"средняя"},{"dari":"زعما","translit":"zo'amā","ru":"лидеры"}]};
  textbook2TaskCollections.push(textbook2TaskCollection15);

  const textbook2TaskCollection2 = { id: 1002, lessonId: 2, title: "Урок 2 · Слова из заданий", cards: [
  {
    "dari": "کوه",
    "translit": "kōh",
    "ru": "гора"
  },
  {
    "dari": "قله",
    "translit": "qolla",
    "ru": "вершина"
  },
  {
    "dari": "تپه",
    "translit": "tapa",
    "ru": "холм"
  },
  {
    "dari": "فلات",
    "translit": "falāt",
    "ru": "плато"
  },
  {
    "dari": "سلسله جبال",
    "translit": "selsela-ye jebāl",
    "ru": "горная цепь"
  },
  {
    "dari": "کوتل",
    "translit": "kōtal",
    "ru": "перевал"
  },
  {
    "dari": "دامنه",
    "translit": "dāmana",
    "ru": "склон, подножие"
  },
  {
    "dari": "دره",
    "translit": "dara",
    "ru": "ущелье, долина"
  },
  {
    "dari": "وادی",
    "translit": "wādi",
    "ru": "долина"
  },
  {
    "dari": "جلگه",
    "translit": "jolga",
    "ru": "равнина"
  },
  {
    "dari": "دشت",
    "translit": "dašt",
    "ru": "степь, равнина"
  },
  {
    "dari": "صحرا",
    "translit": "sahrā",
    "ru": "пустыня"
  },
  {
    "dari": "جوی",
    "translit": "jōy",
    "ru": "ручей, канал"
  },
  {
    "dari": "دریا",
    "translit": "daryā",
    "ru": "река; море"
  },
  {
    "dari": "جهیل",
    "translit": "jahīl",
    "ru": "озеро"
  },
  {
    "dari": "بحیره",
    "translit": "bahīra",
    "ru": "озеро"
  },
  {
    "dari": "بحر",
    "translit": "bahr",
    "ru": "море"
  },
  {
    "dari": "اقلیم",
    "translit": "eqlīm",
    "ru": "климат"
  },
  {
    "dari": "حرارت",
    "translit": "harārat",
    "ru": "температура, жара"
  },
  {
    "dari": "رطوبت",
    "translit": "rotūbat",
    "ru": "влажность"
  },
  {
    "dari": "باد",
    "translit": "bād",
    "ru": "ветер"
  },
  {
    "dari": "طوفان",
    "translit": "tūfān",
    "ru": "буря, ураган"
  },
  {
    "dari": "بارنده گی",
    "translit": "bārandagi",
    "ru": "осадки, дождь"
  },
  {
    "dari": "باران",
    "translit": "bārān",
    "ru": "дождь"
  },
  {
    "dari": "برف",
    "translit": "barf",
    "ru": "снег"
  },
  {
    "dari": "برف باری",
    "translit": "barf-bāri",
    "ru": "снегопад"
  },
  {
    "dari": "ژاله",
    "translit": "žāla",
    "ru": "град"
  },
  {
    "dari": "هندوکش",
    "translit": "Hendukōš",
    "ru": "Гиндукуш"
  },
  {
    "dari": "کوه بابا",
    "translit": "Kōh-e Bābā",
    "ru": "Кух-и-Баба"
  },
  {
    "dari": "سفیده کوه",
    "translit": "Safēd-kōh",
    "ru": "Сафедкох"
  },
  {
    "dari": "کندز",
    "translit": "Kondoz",
    "ru": "Кундуз"
  },
  {
    "dari": "کوکجه",
    "translit": "Kōkča",
    "ru": "Кокча"
  },
  {
    "dari": "آمو",
    "translit": "Āmū",
    "ru": "Амударья"
  },
  {
    "dari": "کابل",
    "translit": "Kābol",
    "ru": "Кабул"
  },
  {
    "dari": "ارغنداب",
    "translit": "Argandāb",
    "ru": "Аргандаб"
  },
  {
    "dari": "هلمند",
    "translit": "Helmand",
    "ru": "Гильменд"
  },
  {
    "dari": "کنر",
    "translit": "Konar",
    "ru": "Кунар"
  },
  {
    "dari": "لوگر",
    "translit": "Lōgar",
    "ru": "Логар"
  },
  {
    "dari": "هیریرود",
    "translit": "Hērīrōd",
    "ru": "Герируд"
  },
  {
    "dari": "مرغاب",
    "translit": "Morğāb",
    "ru": "Мургаб"
  },
  {
    "dari": "فراه رود",
    "translit": "Farāhrōd",
    "ru": "Фарахруд"
  },
  {
    "dari": "پنجشیر",
    "translit": "Panjšēr",
    "ru": "Панджшер"
  },
  {
    "dari": "بند امیر",
    "translit": "Band-e Amīr",
    "ru": "Банд-и-Амир"
  },
  {
    "dari": "پامیر",
    "translit": "Pāmīr",
    "ru": "Памир"
  },
  {
    "dari": "هزاره جات",
    "translit": "Hazārajāt",
    "ru": "Хазараджат"
  },
  {
    "dari": "سیستان",
    "translit": "Sīstān",
    "ru": "Систан"
  }
] };
  textbook2TaskCollections.push(textbook2TaskCollection2);

  const textbook2TaskCollection3 = { id: 1003, lessonId: 3, title: "Урок 3 · Слова из заданий", cards: [
  {
    "dari": "پشتو — پشتون",
    "translit": "pašto — paštūn",
    "ru": "пушту — пуштун"
  },
  {
    "dari": "تاجک — دری",
    "translit": "tājik — darī",
    "ru": "таджик — дари"
  },
  {
    "dari": "هزاره — دری (هزاره گی)",
    "translit": "hazāra — darī (hazāragi)",
    "ru": "хазара — дари (хазараги)"
  },
  {
    "dari": "ازبک — ازبکی",
    "translit": "ozbak — ozbaki",
    "ru": "узбек — узбекский"
  },
  {
    "dari": "ترکمن — ترکمنی",
    "translit": "turkman — turkmani",
    "ru": "туркмен — туркменский"
  },
  {
    "dari": "بلوج — بلوجی",
    "translit": "balūč — balūči",
    "ru": "белудж — белуджский"
  },
  {
    "dari": "قزاق — قزاقی",
    "translit": "qazzāq — qazzāqi",
    "ru": "казах — казахский"
  },
  {
    "dari": "قرغیز — قرغیزی",
    "translit": "qerğīz — qerğīzi",
    "ru": "киргиз — киргизский"
  },
  {
    "dari": "پشه یی — پشه یی",
    "translit": "pašayi — pašayi",
    "ru": "пашаи — пашаи"
  },
  {
    "dari": "نورستان — نورستانی",
    "translit": "nūrestān — nūrestāni",
    "ru": "Нуристан — нуристанский"
  },
  {
    "dari": "پراچی — پراچی",
    "translit": "parāči — parāči",
    "ru": "парачи — парачи"
  },
  {
    "dari": "عرب — عربی",
    "translit": "'arab — 'arabi",
    "ru": "араб — арабский"
  },
  {
    "dari": "هندو — پنجابی، اردو",
    "translit": "hendū — panjābi, urdū",
    "ru": "индус — панджаби, урду"
  },
  {
    "dari": "نفوس",
    "translit": "nufūs",
    "ru": "население"
  },
  {
    "dari": "تراکم نفوس",
    "translit": "tarākum-e nufūs",
    "ru": "плотность населения"
  },
  {
    "dari": "ملیت",
    "translit": "milliyat",
    "ru": "национальность"
  },
  {
    "dari": "قبیله",
    "translit": "qabīla",
    "ru": "племя"
  },
  {
    "dari": "قوم",
    "translit": "qawm",
    "ru": "народ, племя"
  },
  {
    "dari": "اشتغال",
    "translit": "ešteğāl",
    "ru": "занятость"
  },
  {
    "dari": "صنایع",
    "translit": "sanāye'",
    "ru": "отрасли промышленности"
  },
  {
    "dari": "زراعت",
    "translit": "zerā'at",
    "ru": "земледелие"
  },
  {
    "dari": "مال داری",
    "translit": "māldāri",
    "ru": "скотоводство"
  },
  {
    "dari": "باغداری",
    "translit": "bāğdāri",
    "ru": "садоводство"
  },
  {
    "dari": "پیشه",
    "translit": "pēša",
    "ru": "профессия, ремесло"
  },
  {
    "dari": "تجارت",
    "translit": "tejārat",
    "ru": "торговля"
  },
  {
    "dari": "خدمات دولتی",
    "translit": "xadamāt-e dawlati",
    "ru": "государственные услуги"
  },
  {
    "dari": "تحصیل",
    "translit": "tahsīl",
    "ru": "учёба, образование"
  }
] };
  textbook2TaskCollections.push(textbook2TaskCollection3);

  const textbook2TaskCollection4 = { id: 1004, lessonId: 4, title: "Урок 4 · Слова из заданий", cards: [
  {
    "dari": "منابع طبیعی",
    "translit": "manābe'-e tabī'ī",
    "ru": "природные ресурсы"
  },
  {
    "dari": "اقتصاد ملی",
    "translit": "eqtesād-e mellī",
    "ru": "национальная экономика"
  },
  {
    "dari": "ثروت های سرشار",
    "translit": "sarwat-hā-ye saršār",
    "ru": "огромные богатства"
  },
  {
    "dari": "پلان های انکشافی",
    "translit": "plān-hā-ye enkešāfi",
    "ru": "планы развития"
  },
  {
    "dari": "همکاری تخنیکی",
    "translit": "hamkāri-ye texnīki",
    "ru": "техническое сотрудничество"
  },
  {
    "dari": "کشف",
    "translit": "kašf",
    "ru": "открытие, разведка"
  },
  {
    "dari": "تفحصات",
    "translit": "tafahhosāt",
    "ru": "исследования"
  },
  {
    "dari": "استخراج",
    "translit": "estexrāj",
    "ru": "добыча"
  },
  {
    "dari": "بهره برداری",
    "translit": "bahra-bardāri",
    "ru": "эксплуатация, использование"
  },
  {
    "dari": "مواد خام",
    "translit": "mawād-e xām",
    "ru": "сырьё"
  },
  {
    "dari": "مواد معدنی",
    "translit": "mawād-e ma'dani",
    "ru": "полезные ископаемые"
  },
  {
    "dari": "محروقات",
    "translit": "mahruqāt",
    "ru": "горючее, топливо"
  },
  {
    "dari": "فلزات",
    "translit": "felezāt",
    "ru": "металлы"
  },
  {
    "dari": "سنگ های گرانبها",
    "translit": "sang-hā-ye garānbahā",
    "ru": "драгоценные камни"
  },
  {
    "dari": "احجار تعمیراتی",
    "translit": "ahjār-e ta'mīrāti",
    "ru": "строительный камень"
  },
  {
    "dari": "گاز طبیعی",
    "translit": "gāz-e tabī'ī",
    "ru": "природный газ"
  },
  {
    "dari": "زغال سنگ",
    "translit": "zoğāl-sang",
    "ru": "каменный уголь"
  },
  {
    "dari": "نفت",
    "translit": "naft",
    "ru": "нефть"
  },
  {
    "dari": "سنگ آهن",
    "translit": "sang-e āhan",
    "ru": "железная руда"
  },
  {
    "dari": "مس",
    "translit": "mes",
    "ru": "медь"
  },
  {
    "dari": "سرب",
    "translit": "surb",
    "ru": "свинец"
  },
  {
    "dari": "جست",
    "translit": "jast",
    "ru": "цинк"
  },
  {
    "dari": "املاح",
    "translit": "amlāh",
    "ru": "соли"
  },
  {
    "dari": "طلا",
    "translit": "talā",
    "ru": "золото"
  },
  {
    "dari": "نقره",
    "translit": "naqra",
    "ru": "серебро"
  },
  {
    "dari": "الماس",
    "translit": "almās",
    "ru": "алмаз"
  },
  {
    "dari": "زمرد",
    "translit": "zomorrod",
    "ru": "изумруд"
  },
  {
    "dari": "لاجورد",
    "translit": "lājward",
    "ru": "лазурит"
  },
  {
    "dari": "مرمر",
    "translit": "marmar",
    "ru": "мрамор"
  },
  {
    "dari": "گچ",
    "translit": "gač",
    "ru": "гипс"
  },
  {
    "dari": "انرژی برق",
    "translit": "enerži-ye barq",
    "ru": "электроэнергия"
  },
  {
    "dari": "پایپ لاین گاز",
    "translit": "pāyp-lāyn-e gāz",
    "ru": "газопровод"
  },
  {
    "dari": "فابریکه ذوب مس",
    "translit": "fābrīka-ye zōb-e mes",
    "ru": "медеплавильный завод"
  },
  {
    "dari": "فابریکه برق آبی",
    "translit": "fābrīka-ye barq-e ābi",
    "ru": "гидроэлектростанция"
  },
  {
    "dari": "فابریکه برق حرارتی",
    "translit": "fābrīka-ye barq-e harārati",
    "ru": "тепловая электростанция"
  },
  {
    "dari": "زمین های حاصلخیز",
    "translit": "zamīn-hā-ye hāshelxēz",
    "ru": "плодородные земли"
  },
  {
    "dari": "اراضی بایر",
    "translit": "arāzi-ye bāyer",
    "ru": "пустующие земли"
  },
  {
    "dari": "کود کیمیا",
    "translit": "kūd-e kīmiyā",
    "ru": "химические удобрения"
  }
] };
  textbook2TaskCollections.push(textbook2TaskCollection4);



  const textbook2TaskCollection5 = { id: 1005, lessonId: 5, title: "Урок 5 · Слова из заданий", cards: [
  {
    "dari": "شاعر",
    "translit": "šā'er",
    "ru": "поэт (ДП I породы)"
  },
  {
    "dari": "تاجر",
    "translit": "tājer",
    "ru": "купец, торговец (ДП I породы)"
  },
  {
    "dari": "عاید",
    "translit": "āyed",
    "ru": "доход, поступление; возвращающийся (ДП I породы)"
  },
  {
    "dari": "حاصل",
    "translit": "hāsel",
    "ru": "результат; полученный (ДП I породы)"
  },
  {
    "dari": "واضح",
    "translit": "wāzeh",
    "ru": "ясный, очевидный (ДП I породы)"
  },
  {
    "dari": "سالم",
    "translit": "sālem",
    "ru": "здоровый, целый (ДП I породы)"
  },
  {
    "dari": "لازم",
    "translit": "lāzem",
    "ru": "необходимый, нужный (ДП I породы)"
  },
  {
    "dari": "لایق",
    "translit": "lāyeq",
    "ru": "достойный, подходящий (ДП I породы)"
  },
  {
    "dari": "قایل",
    "translit": "qāyel",
    "ru": "говорящий; признающий (ДП I породы)"
  },
  {
    "dari": "حاضر",
    "translit": "hāzer",
    "ru": "присутствующий; готовый (ДП I породы)"
  },
  {
    "dari": "صاحب",
    "translit": "sāheb",
    "ru": "владелец, хозяин (ДП I породы)"
  },
  {
    "dari": "مانع",
    "translit": "māne'",
    "ru": "препятствие; препятствующий (ДП I породы)"
  },
  {
    "dari": "سایر",
    "translit": "sāyer",
    "ru": "прочий, остальной (ДП I породы)"
  },
  {
    "dari": "کاتب",
    "translit": "kāteb",
    "ru": "писец, писатель (ДП I породы)"
  },
  {
    "dari": "واقع",
    "translit": "wāqe'",
    "ru": "действительный; расположенный (ДП I породы)"
  },
  {
    "dari": "جالب",
    "translit": "jāleb",
    "ru": "интересный, привлекательный (ДП I породы)"
  },
  {
    "dari": "آخر",
    "translit": "āxer",
    "ru": "последний; конец (ДП I породы)"
  },
  {
    "dari": "زارع",
    "translit": "zāre'",
    "ru": "земледелец (ДП I породы)"
  },
  {
    "dari": "خارج",
    "translit": "xārej",
    "ru": "внешний; (ДП I породы)"
  },
  {
    "dari": "سابق",
    "translit": "sābeq",
    "ru": "предыдущий, прежний (ДП I породы)"
  },
  {
    "dari": "ساحل",
    "translit": "sāhel",
    "ru": "берег, побережье (ДП I породы)"
  },
  {
    "dari": "داخل",
    "translit": "dāxel",
    "ru": "внутренний; внутри (ДП I породы)"
  },
  {
    "dari": "مصروف",
    "translit": "masrūf",
    "ru": "занятый; израсходованный (СП I породы)"
  },
  {
    "dari": "مربوط",
    "translit": "marbūt",
    "ru": "связанный, относящийся (СП I породы)"
  },
  {
    "dari": "محصول",
    "translit": "mahsūl",
    "ru": "продукт, урожай (СП I породы)"
  },
  {
    "dari": "مطلوب",
    "translit": "matlūb",
    "ru": "желаемый, требуемый (СП I породы)"
  },
  {
    "dari": "معروف",
    "translit": "ma'rūf",
    "ru": "известный, знаменитый (СП I породы)"
  },
  {
    "dari": "محفوظ",
    "translit": "mahfūz",
    "ru": "сохранённый, защищённый (СП I породы)"
  },
  {
    "dari": "معلوم",
    "translit": "ma'lūm",
    "ru": "известный (СП I породы)"
  },
  {
    "dari": "مفقود",
    "translit": "mafqūd",
    "ru": "пропавший, утраченный (СП I породы)"
  },
  {
    "dari": "موجود",
    "translit": "mawjūd",
    "ru": "существующий, имеющийся (СП I породы)"
  },
  {
    "dari": "مکتوب",
    "translit": "maktūb",
    "ru": "письменный; письмо (СП I породы)"
  },
  {
    "dari": "مشهور",
    "translit": "mašhūr",
    "ru": "знаменитый (СП I породы)"
  },
  {
    "dari": "موضوع",
    "translit": "mawzū'",
    "ru": "тема, предмет (СП I породы)"
  },
  {
    "dari": "مضمون",
    "translit": "mazmūn",
    "ru": "содержание, текст (СП I породы)"
  },
  {
    "dari": "مخصوص",
    "translit": "maxsūs",
    "ru": "особый, специальный (СП I породы)"
  },
  {
    "dari": "مأمور",
    "translit": "ma'mūr",
    "ru": "должностное лицо, чиновник (СП I породы)"
  },
  {
    "dari": "مقبول",
    "translit": "maqbūl",
    "ru": "приемлемый, популярный (СП I породы)"
  },
  {
    "dari": "مزروع",
    "translit": "mazrū'",
    "ru": "засеянный, посеянный (СП I породы)"
  },
  {
    "dari": "مسؤول",
    "translit": "mas'ūl",
    "ru": "ответственный (СП I породы)"
  },
  {
    "dari": "مذکور",
    "translit": "mazkūr",
    "ru": "упомянутый (СП I породы)"
  },
  {
    "dari": "معدل",
    "translit": "mo'addal",
    "ru": "средний; умеренный; среднее"
  },
  {
    "dari": "مبدل",
    "translit": "mobaddal",
    "ru": "превращённый, изменённый"
  },
  {
    "dari": "مجهز",
    "translit": "mojahhaz",
    "ru": "оснащённый, оборудованный"
  },
  {
    "dari": "مجلس",
    "translit": "majles",
    "ru": "собрание, совет; заседание"
  },
  {
    "dari": "موفق",
    "translit": "mowaffaq",
    "ru": "успешный, удачливый"
  },
  {
    "dari": "موسم",
    "translit": "mowsem",
    "ru": "сезон"
  },
  {
    "dari": "مولد",
    "translit": "mowlad",
    "ru": "генератор; рождённый"
  },
  {
    "dari": "مکعب",
    "translit": "moka'ab",
    "ru": "куб; кубический"
  },
  {
    "dari": "مقصد",
    "translit": "maqsad",
    "ru": "цель; место назначения"
  },
  {
    "dari": "مبصر",
    "translit": "mobasser",
    "ru": "инспектор, надзиратель"
  },
  {
    "dari": "مسلح",
    "translit": "mosallah",
    "ru": "вооружённый"
  },
  {
    "dari": "منزل",
    "translit": "manzel",
    "ru": "дом, жилище; этаж"
  },
  {
    "dari": "مجرد",
    "translit": "mojarrad",
    "ru": "абстрактный; холостой, одинокий"
  }
] };
  textbook2TaskCollections.push(textbook2TaskCollection5);


  const textbook2TaskCollection6 = { id: 1006, lessonId: 6, title: "Урок 6 · Слова из заданий", cards: [
  {
    "dari": "بزرگی",
    "translit": "bozorgi",
    "ru": "величие, старшинство"
  },
  {
    "dari": "محکمی",
    "translit": "mohkami",
    "ru": "прочность"
  },
  {
    "dari": "مجبوریت",
    "translit": "majbūriyat",
    "ru": "принуждение, необходимость"
  },
  {
    "dari": "سیاهی",
    "translit": "siyāhi",
    "ru": "чернота"
  },
  {
    "dari": "برادری",
    "translit": "barādari",
    "ru": "братство"
  },
  {
    "dari": "گرما",
    "translit": "garmā",
    "ru": "жара"
  },
  {
    "dari": "خیریت",
    "translit": "xayriyat",
    "ru": "благополучие"
  },
  {
    "dari": "آرامی",
    "translit": "ārāmi",
    "ru": "спокойствие"
  },
  {
    "dari": "جوالیگری",
    "translit": "jawāligari",
    "ru": "изготовление мешков"
  },
  {
    "dari": "اصولیت",
    "translit": "osūliyat",
    "ru": "принципиальность"
  },
  {
    "dari": "تنهایی",
    "translit": "tanhāyi",
    "ru": "одиночество"
  },
  {
    "dari": "شکارچیگری",
    "translit": "šekārčigari",
    "ru": "охотничий промысел"
  },
  {
    "dari": "زنده گی",
    "translit": "zendagi",
    "ru": "жизнь"
  },
  {
    "dari": "انسانیت",
    "translit": "ensāniyat",
    "ru": "человечность"
  },
  {
    "dari": "دوری",
    "translit": "dūri",
    "ru": "дальность; разлука"
  },
  {
    "dari": "بیسوادی",
    "translit": "bēsawādi",
    "ru": "неграмотность"
  },
  {
    "dari": "تازه گی",
    "translit": "tāzagi",
    "ru": "свежесть"
  },
  {
    "dari": "نقاشی",
    "translit": "naqqāši",
    "ru": "живопись"
  },
  {
    "dari": "بشریت",
    "translit": "bašariyat",
    "ru": "человечество"
  },
  {
    "dari": "دوستی",
    "translit": "dūsti",
    "ru": "дружба"
  },
  {
    "dari": "امنیت",
    "translit": "amniyat",
    "ru": "безопасность"
  },
  {
    "dari": "غلطی",
    "translit": "ğalati",
    "ru": "ошибка"
  },
  {
    "dari": "آشنایی",
    "translit": "āšnāyi",
    "ru": "знакомство"
  },
  {
    "dari": "رفاهیت",
    "translit": "rafāhiyat",
    "ru": "благосостояние"
  },
  {
    "dari": "برابری",
    "translit": "barābari",
    "ru": "равенство"
  },
  {
    "dari": "دلجسپی",
    "translit": "del-jospei",
    "ru": "привязанность, симпатия"
  },
  {
    "dari": "موقعیت",
    "translit": "mawqe'iyat",
    "ru": "положение"
  },
  {
    "dari": "آماده گی",
    "translit": "āmādagi",
    "ru": "готовность"
  },
  {
    "dari": "هندوگری",
    "translit": "hendūgari",
    "ru": "индуизм, индусские обычаи"
  },
  {
    "dari": "کلالی",
    "translit": "kallāli",
    "ru": "гончарство"
  },
  {
    "dari": "نیرومندی",
    "translit": "nērūmandi",
    "ru": "сила, мощь"
  },
  {
    "dari": "قانونیت",
    "translit": "qānūniyat",
    "ru": "законность"
  },
  {
    "dari": "نزدیکی",
    "translit": "nazdīki",
    "ru": "близость"
  },
  {
    "dari": "موجودیت",
    "translit": "mawjūdiyat",
    "ru": "существование, наличие"
  },
  {
    "dari": "روشنی",
    "translit": "rōšani",
    "ru": "свет, ясность"
  },
  {
    "dari": "موتروانی",
    "translit": "mōtarwāni",
    "ru": "вождение"
  },
  {
    "dari": "فعالیت",
    "translit": "fa'āliyat",
    "ru": "деятельность"
  },
  {
    "dari": "نازکی",
    "translit": "nāzoki",
    "ru": "тонкость, нежность"
  },
  {
    "dari": "ظرفیت",
    "translit": "zarfiyat",
    "ru": "вместимость, потенциал"
  },
  {
    "dari": "خاموشی",
    "translit": "xāmōši",
    "ru": "молчание, тишина"
  },
  {
    "dari": "باغداری",
    "translit": "bāğdāri",
    "ru": "садоводство"
  },
  {
    "dari": "گرسنه گی",
    "translit": "gurusnagi",
    "ru": "голод"
  },
  {
    "dari": "عکاسی",
    "translit": "'akkāsi",
    "ru": "фотография"
  },
  {
    "dari": "پهنا",
    "translit": "pahnā",
    "ru": "ширина"
  },
  {
    "dari": "مزدوری",
    "translit": "mazdūri",
    "ru": "работа по найму"
  },
  {
    "dari": "قابلیت",
    "translit": "qābiliyat",
    "ru": "способность"
  },
  {
    "dari": "زرگری",
    "translit": "zargari",
    "ru": "ювелирное дело"
  },
  {
    "dari": "خسته گی",
    "translit": "xastagi",
    "ru": "усталость"
  },
  {
    "dari": "پیری",
    "translit": "pīri",
    "ru": "старость"
  },
  {
    "dari": "مرکزیت",
    "translit": "markaziyat",
    "ru": "центральность, централизация"
  },
  {
    "dari": "ساده گی",
    "translit": "sādagi",
    "ru": "простота"
  },
  {
    "dari": "موفقیت",
    "translit": "mowaffaqiyat",
    "ru": "успех"
  },
  {
    "dari": "سرسبزی",
    "translit": "sarsabzi",
    "ru": "зелёность, процветание"
  },
  {
    "dari": "شادابی",
    "translit": "šādābi",
    "ru": "свежесть, бодрость"
  },
  {
    "dari": "اکثریت",
    "translit": "aksariyat",
    "ru": "большинство"
  },
  {
    "dari": "شکوفانی",
    "translit": "šokūfāni",
    "ru": "процветание, расцвет"
  },
  {
    "dari": "ملیت",
    "translit": "milliyat",
    "ru": "национальность"
  },
  {
    "dari": "دشواری",
    "translit": "došwāri",
    "ru": "трудность"
  },
  {
    "dari": "نویسنده گی",
    "translit": "nēwisandagi",
    "ru": "писательство"
  },
  {
    "dari": "ممنونیت",
    "translit": "mamnūniyat",
    "ru": "признательность"
  },
  {
    "dari": "کامیابی",
    "translit": "kāmyābi",
    "ru": "успех, достижение"
  },
  {
    "dari": "جدایی",
    "translit": "jodāyi",
    "ru": "разлука"
  },
  {
    "dari": "رسمیت",
    "translit": "rasmīyat",
    "ru": "официальность"
  },
  {
    "dari": "نطاقی",
    "translit": "natāqi",
    "ru": "красноречие, ораторство (уточнить)"
  },
  {
    "dari": "پیروزی",
    "translit": "pērōzi",
    "ru": "победа"
  },
  {
    "dari": "آبادی",
    "translit": "ābādi",
    "ru": "населённый пункт; благоустроенность"
  },
  {
    "dari": "مهربانی",
    "translit": "mehrabāni",
    "ru": "доброта"
  },
  {
    "dari": "ناکامی",
    "translit": "nāکāmi",
    "ru": "неудача"
  },
  {
    "dari": "مدیریت",
    "translit": "modīriyat",
    "ru": "управление"
  },
  {
    "dari": "مریضی",
    "translit": "marīzi",
    "ru": "болезнь"
  },
  {
    "dari": "مصروفیت",
    "translit": "masrūfiyat",
    "ru": "занятость"
  },
  {
    "dari": "مالداری",
    "translit": "māldāri",
    "ru": "скотоводство"
  },
  {
    "dari": "سردی",
    "translit": "sardi",
    "ru": "холод"
  },
  {
    "dari": "نجاری",
    "translit": "najjāri",
    "ru": "плотничество"
  },
  {
    "dari": "فراوانی",
    "translit": "farāwāni",
    "ru": "изобилие"
  },
  {
    "dari": "حاصلخیزی",
    "translit": "hāshelxēzi",
    "ru": "плодородие"
  },
  {
    "dari": "مسؤولیت",
    "translit": "mas'ūliyat",
    "ru": "ответственность"
  },
  {
    "dari": "فلزکاری",
    "translit": "felezkāri",
    "ru": "металлообработка"
  },
  {
    "dari": "قاطع",
    "translit": "qāte'",
    "ru": "решительный, категорический"
  },
  {
    "dari": "کمک های ارزنده",
    "translit": "komak-hā-ye arzanda",
    "ru": "ценная помощь"
  },
  {
    "dari": "کوه های شامخ",
    "translit": "kōh-hā-ye šāmax",
    "ru": "высокие горы"
  },
  {
    "dari": "کشور زراعتی",
    "translit": "kešwar-e zerā'ati",
    "ru": "аграрная страна"
  },
  {
    "dari": "صنایع عصری",
    "translit": "sanāye'-e 'asri",
    "ru": "современная промышленность"
  },
  {
    "dari": "محصولات صنعتی",
    "translit": "mahsūlāt-e san'ati",
    "ru": "промышленная продукция"
  },
  {
    "dari": "حجم تولیدات",
    "translit": "hajm-e tawlīdāt",
    "ru": "объём производства"
  },
  {
    "dari": "تنویر منازل",
    "translit": "tanwīr-e manāzel",
    "ru": "освещение домов"
  },
  {
    "dari": "دریاهای صعب العبور",
    "translit": "daryā-hā-ye sa'b-ol-'obūr",
    "ru": "труднопроходимые реки"
  },
  {
    "dari": "رفع احتیاجات داخلی",
    "translit": "raf'-e ehtiyājāt-e dāxeli",
    "ru": "удовлетворение внутренних потребностей"
  },
  {
    "dari": "ارسال وسایل تخنیکی",
    "translit": "ersāl-e wasāyel-e texnīki",
    "ru": "отправка технических средств"
  },
  {
    "dari": "جنگ جهانی دوم",
    "translit": "jang-e jahāni-ye dawwom",
    "ru": "Вторая мировая война"
  },
  {
    "dari": "منطقه مولد پنبه",
    "translit": "mantiqa-ye mowlod-e panba",
    "ru": "хлопкопроизводящий район"
  },
  {
    "dari": "فقدان مواد خام",
    "translit": "feqdān-e mawād-e xām",
    "ru": "нехватка сырья"
  },
  {
    "dari": "دستگاه برق آبی",
    "translit": "dastgāh-e barq-e ābi",
    "ru": "гидроэлектростанция"
  },
  {
    "dari": "تطبیق پلان های انکشافی",
    "translit": "tatbīq-e plān-hā-ye enkešāfi",
    "ru": "осуществление планов развития"
  },
  {
    "dari": "تاسیس صنایع عصری",
    "translit": "ta'sīs-e sanāye'-e 'asri",
    "ru": "создание современной промышленности"
  },
  {
    "dari": "دسترسی به منابع طبیعی",
    "translit": "dastrasī ba manābe'-e tabī'ī",
    "ru": "доступ к природным ресурсам"
  },
  {
    "dari": "انواع مختلف اسلحه",
    "translit": "anwā'-e moxtalef-e aslaha",
    "ru": "различные виды оружия"
  },
  {
    "dari": "اعطای قرضه های طویل المدت",
    "translit": "a'tā-ye qarza-hā-ye tawīl-ol-moddat",
    "ru": "предоставление долгосрочных кредитов"
  },
  {
    "dari": "از زمان های قدیم",
    "translit": "az zamān-hā-ye qadīm",
    "ru": "с древних времён"
  },
  {
    "dari": "در چوکات سکتور دولتی",
    "translit": "dar čowkāt-e sektor-e dawlati",
    "ru": "в рамках государственного сектора"
  },
  {
    "dari": "به ظرفیت بیست هزار کیلووات",
    "translit": "ba zarfiyat-e bīst hazār kīlōwāt",
    "ru": "мощностью 20 тыс. кВт"
  }
] };
  textbook2TaskCollections.push(textbook2TaskCollection6);

  const textbook2Collections = Array.from({ length: 23 }, (_, index) => ({
    id: index + 1, title: `Урок ${index + 1}`, description: textbook2LessonDescriptions[index + 1] || "",
    cards: index === 13 ? [{"dari":"اتخاذ","translit":"ettexâz","ru":"принятие (решения)"},{"dari":"اتفاق","translit":"ettefâq","ru":"случай, случайность, согласие; происходить, случаться"},{"dari":"اجرا","translit":"ejrâ","ru":"выполнение"},{"dari":"ادیب (ادبا)","translit":"adib (odabâ’)","ru":"литератор"},{"dari":"ارشد","translit":"aršad","ru":"старший"},{"dari":"اسبق","translit":"asbaq","ru":"бывший"},{"dari":"استعفا","translit":"este’fâ’","ru":"отставка"},{"dari":"اسرع","translit":"asra’","ru":"скорейший"},{"dari":"اشد","translit":"ašadd","ru":"сильнейший"},{"dari":"اطاعت","translit":"etâ’at","ru":"подчинение"},{"dari":"اعلی","translit":"a’lâ","ru":"превосходный"},{"dari":"اقامت","translit":"eqâmat","ru":"пребывание"},{"dari":"اقل","translit":"aqall","ru":"наименьший (по количеству)"},{"dari":"امیر (امرا)","translit":"amir (omarâ’)","ru":"эмир, правитель"},{"dari":"اوسط","translit":"awsat","ru":"средний"},{"dari":"اهم","translit":"ahamm","ru":"важнейший"},{"dari":"ایمان","translit":"imân","ru":"вера"},{"dari":"ائتلاف","translit":"e’telâf","ru":"коалиция"},{"dari":"بررسی","translit":"barrasi","ru":"рассмотрение"},{"dari":"تأیید","translit":"ta’yid","ru":"подтверждение"},{"dari":"تام","translit":"tâmm","ru":"полный"},{"dari":"تزلزل","translit":"tazalzol","ru":"колебание"},{"dari":"تضاد","translit":"tazâdd","ru":"противоречие, антагонизм"},{"dari":"تقویه","translit":"taqweya","ru":"усиление, укрепление"},{"dari":"تماس","translit":"tamâs","ru":"контакт, общение"},{"dari":"تمرکز","translit":"tamarkoz","ru":"сосредоточение"},{"dari":"تمنی","translit":"tamannâ","ru":"желание"},{"dari":"توطئه","translit":"tawte’a","ru":"заговор"},{"dari":"ثقیل","translit":"saqil","ru":"тяжёлый"},{"dari":"جرئت","translit":"jor’at","ru":"смелость"},{"dari":"جزء (اجزا)","translit":"joz’ (ajzâ’)","ru":"часть, компонент"},{"dari":"جسور","translit":"jasur","ru":"смелый, храбрый"},{"dari":"جنرال","translit":"janrâl","ru":"генерал"},{"dari":"حاد","translit":"hâdd","ru":"острый, напряжённый"},{"dari":"حسود","translit":"hasud","ru":"завистливый, ревнивый"},{"dari":"خاص","translit":"xâss","ru":"особенный, особый"},{"dari":"خفیف","translit":"xafif","ru":"слабый"},{"dari":"دقیق","translit":"daqiq","ru":"точный"},{"dari":"دگرول","translit":"dagarwâl","ru":"полковник"},{"dari":"ریاست","translit":"reyâsat","ru":"департамент"},{"dari":"سریع","translit":"sari’","ru":"быстрый"},{"dari":"سفلی","translit":"soflâ","ru":"нижний"},{"dari":"سقا","translit":"saqqâ’","ru":"водонос"},{"dari":"صدر اعظم","translit":"sadr-e a’zam","ru":"премьер-министр, канцлер"},{"dari":"ضخیم","translit":"zaxim","ru":"толстый (большой толщины)"},{"dari":"طبیب (اطبا)","translit":"tabib (atebbâ’)","ru":"врач, лекарь"},{"dari":"عام","translit":"‘âmm","ru":"общий, всеобщий"},{"dari":"عظیم","translit":"‘azim","ru":"великий"},{"dari":"علیا","translit":"‘olyâ","ru":"верхний"},{"dari":"عمومی","translit":"‘omumi","ru":"общий, генеральный"},{"dari":"غریب","translit":"ğarib","ru":"бедный, чужой"},{"dari":"فقیر (فقرا)","translit":"faqir (foqarâ’)","ru":"бедный, неимущий"},{"dari":"فلسفه","translit":"falsafa","ru":"философия"},{"dari":"قرائت","translit":"qarâ’at","ru":"чтение, хрестоматия"},{"dari":"قرن (قرون)","translit":"qarn (qorun)","ru":"век"},{"dari":"قلیل","translit":"qalil","ru":"малочисленный"},{"dari":"قوم (اقوام)","translit":"qawm (aqwâm)","ru":"племя, народность"},{"dari":"گزیدن","translit":"gozidan","ru":"выбирать"},{"dari":"مبرهن","translit":"mobarhan","ru":"явный, очевидный"},{"dari":"متزلزل","translit":"motazalzel","ru":"поколебленный"},{"dari":"متضاد","translit":"motazâdd","ru":"антагонистический"},{"dari":"متمرکز","translit":"motamarkez","ru":"сосредоточенный"},{"dari":"محتوی","translit":"mohtawâ","ru":"содержимое, содержание"},{"dari":"محل (محال)","translit":"mahall (mahâll)","ru":"место"},{"dari":"مدار","translit":"madâr","ru":"орбита"},{"dari":"مداقه","translit":"modâqqa","ru":"углублённое изучение"},{"dari":"مدعو","translit":"mad’oww","ru":"приглашённый, гость"},{"dari":"مذاق","translit":"mazâq","ru":"шутка"},{"dari":"مساوی","translit":"mosâwi","ru":"равный"},{"dari":"مستبد","translit":"mostabedd","ru":"деспотичный"},{"dari":"مسترد","translit":"mostaradd","ru":"возвращённый"},{"dari":"مستشار","translit":"mostašâr","ru":"советник"},{"dari":"مستعد","translit":"mosta’edd","ru":"способный"},{"dari":"مستقیم","translit":"mostaqim","ru":"непосредственный"},{"dari":"مسرت","translit":"masarrat","ru":"радость"},{"dari":"مسلسل","translit":"mosalsal","ru":"последовательный, периодический"},{"dari":"مسن","translit":"mosenn","ru":"пожилой"},{"dari":"مسئول","translit":"mas’ul","ru":"ответственный"},{"dari":"مصئون","translit":"mas’un","ru":"находящийся в безопасности, невосприимчивый"},{"dari":"مضر","translit":"mozerr","ru":"вредный"},{"dari":"مضیقه (مضایق)","translit":"maziqa (mazâyeq)","ru":"трудность"},{"dari":"معمار","translit":"me’mâr","ru":"строитель"},{"dari":"مقام (مقامات)","translit":"maqâm (moqâm)","ru":"место, положение"},{"dari":"مقیاس","translit":"meqyâs","ru":"масштаб"},{"dari":"مقیم","translit":"moqim","ru":"проживающий (где-либо)"},{"dari":"مکافات","translit":"mokâfât","ru":"вознаграждение"},{"dari":"ممتد","translit":"momtadd","ru":"продолжительный"},{"dari":"منجر","translit":"monjarr","ru":"приводящий (к чему-либо)"},{"dari":"منشی","translit":"monši","ru":"секретарь"},{"dari":"منوال","translit":"menwâl","ru":"способ"},{"dari":"موظف","translit":"mowazzaf","ru":"обязанный"},{"dari":"مهندس","translit":"mohandes","ru":"архитектор"},{"dari":"میراث","translit":"mirâs","ru":"наследство"},{"dari":"میعاد","translit":"mi’âd","ru":"срок"},{"dari":"میلاد","translit":"milâd","ru":"начало новой эры"},{"dari":"نشریه","translit":"našreyya","ru":"издание, публикация"},{"dari":"وزیر (وزرا)","translit":"wazir (wozarâ’)","ru":"министр"},{"dari":"وسطی","translit":"wostâ","ru":"средний"},{"dari":"وکیل (وکلا)","translit":"wakil (wokalâ’)","ru":"депутат"},{"dari":"هندسه","translit":"handasa","ru":"геометрия"},{"dari":"هیئت","translit":"hay’at","ru":"делегация, группа (людей)"},{"dari":"یونان","translit":"Yunân","ru":"Греция"},{"dari":"رئیس","translit":"ra'is","ru":"глава"},{"dari":"عمومی","translit":"'omumi","ru":"генеральный"},{"dari":"یونان","translit":"Yunān","ru":"Греция"},{"dari":"نشریه","translit":"našriya","ru":"периодическое издание"},{"dari":"عرض","translit":"'arz","ru":"ширина"},{"dari":"پارلمان","translit":"parlomān","ru":"парламент"},{"dari":"سفیر کبیر","translit":"safir-e kabir","ru":"полномочный посол"},{"dari":"بررسی کردن","translit":"barrasi kardan","ru":"рассматривать"}] : index === 12 ? [{"dari":"ابراز کردن","translit":"ebrâz kardan","ru":"выражать (что-либо)"},{"dari":"افتخار","translit":"eftexâr","ru":"слава, почёт"},{"dari":"امحا","translit":"emhâ","ru":"ликвидация"},{"dari":"انسلاک","translit":"enselâk","ru":"присоединение (например, к блоку)"},{"dari":"آهسته","translit":"âhesta","ru":"тихо, медленно"},{"dari":"آهنگ","translit":"âhang","ru":"мелодия, ритм"},{"dari":"بازو","translit":"bâzô","ru":"рука (от плеча до кисти)"},{"dari":"بناچار","translit":"banâčâr","ru":"поневоле"},{"dari":"بیان","translit":"bayân","ru":"изложение, разъяснение"},{"dari":"پیمان","translit":"paymân","ru":"договор, блок"},{"dari":"تبسم","translit":"tabassom","ru":"улыбка"},{"dari":"به تدریج","translit":"be tadrij","ru":"постепенно"},{"dari":"تصادف","translit":"tasâdof","ru":"случайность, случай"},{"dari":"تکان خوردن","translit":"takân xordan","ru":"вздрагивать, сотрясаться"},{"dari":"جای نماز","translit":"jâye namâz","ru":"молитвенный коврик"},{"dari":"جریان","translit":"jaryân","ru":"течение, ход событий"},{"dari":"جستجو","translit":"jostojô","ru":"поиск(и)"},{"dari":"جگرخونی","translit":"jegarxuni","ru":"расстройство, дурное настроение"},{"dari":"جنس (اجناس)","translit":"jens (ajnâs)","ru":"сорт, товар"},{"dari":"جویا شدن","translit":"jôyâ šodan","ru":"разыскивать, расспрашивать"},{"dari":"چابک","translit":"čâbok","ru":"проворный, ловкий"},{"dari":"خلق","translit":"xolq","ru":"характер, настроение"},{"dari":"دزدکی","translit":"dozdaki","ru":"украдкой"},{"dari":"راحت","translit":"râhat","ru":"покой, отдых"},{"dari":"راسته","translit":"râsta","ru":"правильно (не вверх дном, не наизнанку и т. п.)"},{"dari":"زیرک","translit":"zirak","ru":"хитрый, догадливый"},{"dari":"سپاس","translit":"sepâs","ru":"благодарность"},{"dari":"سپس","translit":"sepas","ru":"затем, потом"},{"dari":"سو","translit":"su","ru":"сторона"},{"dari":"سوء","translit":"su’","ru":"зло"},{"dari":"سهو","translit":"sahw","ru":"неумышленный поступок"},{"dari":"شک","translit":"šakk","ru":"сомнение"},{"dari":"صبر","translit":"sabr","ru":"терпение, терпеливость"},{"dari":"ضمناً","translit":"zemnan","ru":"между тем, тем временем"},{"dari":"طلبیدن","translit":"talabidan","ru":"требовать"},{"dari":"عدم","translit":"‘adam","ru":"отсутствие (чего-либо)"},{"dari":"غم خوردن","translit":"ğam xordan","ru":"горевать, расстраиваться"},{"dari":"غم چیزی را خوردن","translit":"ğam-e čizi râ xordan","ru":"заботиться о чём-либо"},{"dari":"قطعاً","translit":"qat’an","ru":"совершенно, категорически"},{"dari":"قواره","translit":"qawâra","ru":"внешность"},{"dari":"متعاقباً","translit":"mota’âqeban","ru":"затем"},{"dari":"مجدداً","translit":"mojaddadan","ru":"вновь"},{"dari":"منسلک","translit":"monsalek","ru":"примкнувший, присоединившийся"},{"dari":"نرم","translit":"narm","ru":"мягкий"},{"dari":"نزاکت","translit":"nazâkat","ru":"деликатность, вежливость"},{"dari":"نشانی","translit":"nešâni","ru":"опознавательный знак, ориентир"},{"dari":"نظامی","translit":"nezâmi","ru":"военный"},{"dari":"نفس کشیدن","translit":"nafas kešidan","ru":"дышать"},{"dari":"نگاه","translit":"negâh","ru":"взгляд"},{"dari":"نیت","translit":"neyyat","ru":"намерение, помысел"},{"dari":"وفا","translit":"wafâ","ru":"верность, преданность"},{"dari":"وقفه","translit":"waqfa","ru":"остановка, перерыв, пауза"},{"dari":"همجواری","translit":"hamjawâri","ru":"соседство"},{"dari":"افتخار کردن","translit":"eftexâr kardan","ru":"гордиться"},{"dari":"دفتر","translit":"daftar","ru":"кабинет"}] : index === 11 ? [{"dari":"ابتکار","translit":"ebtekār","ru":"инициатива"},{"dari":"اجتماع","translit":"ejtemā’","ru":"общественность"},{"dari":"اختلاف","translit":"extelāf","ru":"разногласие, противоречие"},{"dari":"ارتجاع","translit":"ertejā’","ru":"реакция (политическая)"},{"dari":"استثمار","translit":"estesmār","ru":"эксплуатация (социальная)"},{"dari":"استحکام","translit":"estehkām","ru":"прочность, укрепление"},{"dari":"اصطلاح","translit":"estelāh","ru":"термин, выражение"},{"dari":"اضطراب","translit":"ezterāb","ru":"беспокойство, тревога"},{"dari":"اطلاع","translit":"ettelā’","ru":"сообщение, известие"},{"dari":"اعتراض","translit":"e’terāz","ru":"протест, возражение"},{"dari":"اعتماد","translit":"e’temād","ru":"доверие"},{"dari":"افتخار","translit":"eftexār","ru":"честь, гордость"},{"dari":"انتخاب","translit":"entexāb","ru":"выбор"},{"dari":"انتشار","translit":"entešār","ru":"опубликование, распространение"},{"dari":"انحصار","translit":"enhesār","ru":"монополия"},{"dari":"انزجار","translit":"enzejār","ru":"неприязнь, негодование"},{"dari":"انعکاس","translit":"en’ekās","ru":"отражение"},{"dari":"انعطاف","translit":"en’etāf","ru":"гибкость"},{"dari":"انفجار","translit":"enfejār","ru":"взрыв"},{"dari":"بم","translit":"bam","ru":"бомба, граната"},{"dari":"تبادل","translit":"tabādol","ru":"обмен"},{"dari":"تجاوز","translit":"tajāwoz","ru":"посягательство, агрессия"},{"dari":"تحقق","translit":"tahaqqoq","ru":"претворение в жизнь"},{"dari":"تحمل","translit":"tahammol","ru":"терпение, перенесение (трудностей и т.п.)"},{"dari":"تدارک","translit":"tadārok","ru":"приготовление, подготовка"},{"dari":"تذکر","translit":"tazakkor","ru":"упоминание"},{"dari":"تشنج","translit":"tašannoj","ru":"напряженность"},{"dari":"تصادم","translit":"tasādom","ru":"столкновение"},{"dari":"تعادل","translit":"ta’ādol","ru":"равновесие"},{"dari":"تعاون","translit":"ta’āwon","ru":"взаимопомощь"},{"dari":"تعلق","translit":"ta’alloq","ru":"принадлежность"},{"dari":"تفاوت","translit":"tafāwot","ru":"разница, различие"},{"dari":"تفاهم","translit":"tafāhom","ru":"взаимопонимание"},{"dari":"تکامل","translit":"takāmol","ru":"совершенствование"},{"dari":"تمایل","translit":"tamāyol","ru":"наклонность, тенденция"},{"dari":"تمدن","translit":"tamaddon","ru":"цивилизация"},{"dari":"توافق","translit":"tawāfoq","ru":"договоренность, взаимное согласие"},{"dari":"توسل","translit":"tawassol","ru":"прибегание (к чему-л.)"},{"dari":"زور","translit":"zōr","ru":"сила"},{"dari":"متعلق","translit":"mota’alleq","ru":"принадлежащий"},{"dari":"متفاوت","translit":"motafāwet","ru":"различный, неодинаковый"},{"dari":"متمایل","translit":"motamāyel","ru":"склонный (к чему-л.)"},{"dari":"متنوع","translit":"motanawwe’","ru":"разнообразный"},{"dari":"متوسل","translit":"morawassel","ru":"прибегающий (к чему-л.)"},{"dari":"متوقف","translit":"motawaqqef","ru":"останавливающийся"},{"dari":"مرتجع","translit":"mortaje’","ru":"реакционер"},{"dari":"مستحکم","translit":"mostahkam","ru":"прочный"},{"dari":"مستخدم","translit":"mostaxdem","ru":"служащий"},{"dari":"مستعمل","translit":"mosta’mal","ru":"употребленный, использованный"},{"dari":"مستند","translit":"mostanad","ru":"документальный"},{"dari":"مستنطق","translit":"mostanteq","ru":"следователь"},{"dari":"مسلح","translit":"mosallah","ru":"вооруженный"},{"dari":"مطلع","translit":"mottale’","ru":"осведомленный"},{"dari":"معتقد","translit":"mo’taqed","ru":"убежденный (в чем-л.)"},{"dari":"منتخب","translit":"montaxab","ru":"избранный"},{"dari":"منتشر","translit":"montašer","ru":"опубликованный"},{"dari":"منعکس","translit":"mon’akes","ru":"отраженный"},{"dari":"منفجر","translit":"monfajer","ru":"взорвавшийся"},{"dari":"تکامل بخشیدن","translit":"takāmol baxšidan","ru":"развивать"},{"dari":"متوجه بودن","translit":"motavajjeh budan","ru":"быть направленным"},{"dari":"مساعی","translit":"masā'i","ru":"усилия"}] : index === 1 ? [{"dari":"آب‌خیزی","translit":"ābxēzi","ru":"наводнение, половодье"},{"dari":"بارندگی","translit":"bārendagi","ru":"осадки"},{"dari":"بحری","translit":"bahri","ru":"морской"},{"dari":"برف‌باری","translit":"barfbāri","ru":"снегопад"},{"dari":"بری","translit":"barri","ru":"континентальный"},{"dari":"پوشیده","translit":"pōšida","ru":"покрытый"},{"dari":"تونل","translit":"tunal","ru":"тоннель"},{"dari":"جبل","translit":"jabal (jabāl)","ru":"гора"},{"dari":"جلغوزه","translit":"jalğōza","ru":"орех (плод горного кедра)"},{"dari":"جلگه","translit":"jelga","ru":"равнина"},{"dari":"جهیل","translit":"jahil","ru":"озеро"},{"dari":"حبوبات","translit":"hobubāt","ru":"злаки, зерновые"},{"dari":"حصه","translit":"hessa (hesas)","ru":"часть, доля"},{"dari":"خروشان","translit":"xorōšān","ru":"бурный (о реке и т.п.)"},{"dari":"هسته","translit":"xasta","ru":"косточка (плода), орешек"},{"dari":"خفیف","translit":"xafif","ru":"слабый (по интенсивности)"},{"dari":"دامنه","translit":"dāmana","ru":"склон (горы)"},{"dari":"رطوبت","translit":"rotubat","ru":"влажность"},{"dari":"ژاله","translit":"žāla","ru":"град"},{"dari":"سرسبز","translit":"sarsabz","ru":"зеленый (о растительности)"},{"dari":"سلسله","translit":"selsela","ru":"ряд, цепь"},{"dari":"شاداب","translit":"šādāb","ru":"напоенный водой"},{"dari":"صحرا","translit":"sahrā","ru":"пустыня"},{"dari":"طوفان","translit":"tufān","ru":"ураган, буря"},{"dari":"عمیق","translit":"‘amiq","ru":"глубокий"},{"dari":"فلات","translit":"falāt","ru":"плоскогорье, плато"},{"dari":"قلبه کردن","translit":"qolba kardan","ru":"боронить, пахать"},{"dari":"قله","translit":"qolla (qolal)","ru":"вершина (горы)"},{"dari":"کرد","translit":"kord","ru":"грядка, делянка"},{"dari":"گسترش یافتن","translit":"gostareš yāftan","ru":"простираться, расстилаться"},{"dari":"مساحت","translit":"masāhat","ru":"площадь (размер)"},{"dari":"وصل کردن","translit":"wasl kardan","ru":"связывать, соединять"},{"dari":"فرانسه","translit":"Farānsa","ru":"Франция"},{"dari":"سب تروپیکی","translit":"sabtorōpiki","ru":"субтропический"},{"dari":"آبی","translit":"ābi","ru":"поливной"},{"dari":"للمی","translit":"lalmi","ru":"богарный (неполивной)"},{"dari":"بی آب","translit":"bē-āb","ru":"безводный"},{"dari":"جاری شدن","translit":"jāri šodan","ru":"протекать"},{"dari":"شادابی","translit":"šādābi","ru":"свежесть, процветание; обилие"}] : index === 2 ? [{"dari":"اداری","translit":"edāri","ru":"административный"},{"dari":"اکثریت","translit":"aksareyyat","ru":"большинство"},{"dari":"پیرو","translit":"payraw","ru":"последователь"},{"dari":"پیشه","translit":"pēša","ru":"ремесло, профессия"},{"dari":"تخمین","translit":"taxmin","ru":"подсчет (приблизительный)"},{"dari":"تراکم","translit":"tarākom","ru":"скопление; плотность (населения)"},{"dari":"تکلم","translit":"takallom","ru":"разговор, речь (на каком-л. языке)"},{"dari":"جریان","translit":"jeryān, jarayān","ru":"течение, движение"},{"dari":"جریان داشتن","translit":"jeryān dāštan","ru":"протекать, иметь место"},{"dari":"حصار","translit":"hesār","ru":"крепость, форт"},{"dari":"حوالی","translit":"hawāli","ru":"окрестности"},{"dari":"دامن","translit":"dāman","ru":"юбка, подол; подножие"},{"dari":"راسته","translit":"rāstā","ru":"деревня, сельская местность"},{"dari":"رول","translit":"rōl","ru":"роль"},{"dari":"ساختمان","translit":"sāxtomān","ru":"строительство"},{"dari":"فاصله","translit":"fāsela (fawāsel)","ru":"расстояние"},{"dari":"قبر","translit":"qabr","ru":"могила"},{"dari":"قبیله","translit":"qabila (qabāyel)","ru":"племя"},{"dari":"قوم","translit":"qawm (aqwām)","ru":"род, народность"},{"dari":"کول","translit":"kōl","ru":"пруд, водохранилище"},{"dari":"گنبد","translit":"gonbad","ru":"купол"},{"dari":"متعدد","translit":"mota’added","ru":"многочисленный"},{"dari":"محسوب شدن","translit":"mahsub šodan","ru":"считаться (чем-л., кем-л., каким-л.)"},{"dari":"مغاره","translit":"magāra","ru":"пещера"},{"dari":"ملیت","translit":"melleyyat","ru":"национальность"},{"dari":"میدان","translit":"maydān","ru":"площадь, площадка"},{"dari":"روسی","translit":"rusi","ru":"российский"},{"dari":"اتراموی","translit":"tarāmwē","ru":"трамвай"},{"dari":"کول","translit":"kōl","ru":"озеро, водохранилище"},{"dari":"نیپر","translit":"Nēper","ru":"Днепр [имя собственное]"},{"dari":"مسکن","translit":"maskan","ru":"жильё"},{"dari":"سکه","translit":"sek","ru":"сикх"},{"dari":"خراسان","translit":"Xorāsān","ru":"Хорасан [имя собственное]"},{"dari":"خارجی","translit":"xāreji","ru":"иностранный"},{"dari":"اقوام","translit":"aqvām","ru":"народы"}] : index === 3 ? [{"dari":"احداث","translit":"ehdās","ru":"создание, сооружение"},{"dari":"استخراج","translit":"estexrāj","ru":"добыча (полезных ископаемых)"},{"dari":"الماس","translit":"almās","ru":"алмаз"},{"dari":"بایر","translit":"bāyer","ru":"невозделанный, целинный (о земле)"},{"dari":"بهره‌برداری","translit":"bahrabardāri","ru":"эксплуатация (напр. ресурсов)"},{"dari":"پایپ‌لاین","translit":"pāyplayn","ru":"трубопровод"},{"dari":"پیام","translit":"payām","ru":"послание, обращение"},{"dari":"تجربه","translit":"tajroba (tajārob)","ru":"опыт"},{"dari":"تخنیک","translit":"taxnik","ru":"техника"},{"dari":"تفحص","translit":"tafahhos","ru":"поиск, разведка (геологическая)"},{"dari":"تلگرام","translit":"telgerām","ru":"телеграмма"},{"dari":"تولید","translit":"towlid","ru":"производство"},{"dari":"ثروت","translit":"sorwat","ru":"богатство"},{"dari":"جست","translit":"jast","ru":"цинк"},{"dari":"جیولوجست","translit":"jeyālōjest","ru":"геолог"},{"dari":"چشمه","translit":"čašma","ru":"источник, родник"},{"dari":"حجر","translit":"hajar (ahjār)","ru":"камень"},{"dari":"خیلی","translit":"xēlē","ru":"очень"},{"dari":"دلدلزار","translit":"daldarzār","ru":"болото"},{"dari":"ذخیره","translit":"zaxira (zaxāyer)","ru":"запас"},{"dari":"ذوب","translit":"zawb","ru":"плавление, таяние"},{"dari":"زمرد","translit":"zamarod","ru":"изумруд"},{"dari":"ساحل","translit":"sāhel (sawāhel)","ru":"берег"},{"dari":"سرب","translit":"sorb","ru":"свинец"},{"dari":"سرشار","translit":"saršār","ru":"обильный, неисчерпаемый"},{"dari":"شیشه","translit":"šiša","ru":"стекло"},{"dari":"طلا","translit":"telā","ru":"золото"},{"dari":"فلز","translit":"felez","ru":"металл"},{"dari":"فلک","translit":"falak (aflāk)","ru":"небо"},{"dari":"فنی","translit":"fanni","ru":"технический; художественный"},{"dari":"کشف","translit":"kašf","ru":"открытие, обнаружение"},{"dari":"کلید","translit":"kelid","ru":"ключ"},{"dari":"گچ","translit":"gač","ru":"алебастр, гипс"},{"dari":"گران‌بها","translit":"gerānbahā","ru":"драгоценный"},{"dari":"لاجورد","translit":"lājaward","ru":"ляпис-лазурь, лазурит"},{"dari":"ماده","translit":"mādda (mawād)","ru":"вещество"},{"dari":"محروقات","translit":"mahruqāt","ru":"горючее, топливо"},{"dari":"مرمر","translit":"marmar","ru":"мрамор"},{"dari":"مس","translit":"mes","ru":"медь"},{"dari":"مساله","translit":"masāla","ru":"пластмасса"},{"dari":"مطلوب","translit":"matlub","ru":"желательный, надлежащий"},{"dari":"معاونت","translit":"mo’āwenat","ru":"помощь"},{"dari":"ملت","translit":"mellat (melal)","ru":"нация"},{"dari":"ملح","translit":"melh (amlāh)","ru":"соль"},{"dari":"مملو","translit":"mamlu","ru":"полный, наполненный"},{"dari":"منبع","translit":"manba’ (manābe’)","ru":"источник"},{"dari":"نشر","translit":"našr","ru":"опубликование, издание"},{"dari":"نفت","translit":"naft","ru":"нефть"},{"dari":"نقش","translit":"naqš","ru":"роль"},{"dari":"نیازمندی","translit":"neyāzmandi","ru":"нужда, необходимость"},{"dari":"هکذا","translit":"hákazā","ru":"также"},{"dari":"صدور","translit":"sodur","ru":"экспорт"},{"dari":"جرقدق","translit":"Jarqoduq","ru":"Джаркудук (месторождение)"},{"dari":"احداث","translit":"ehdās","ru":"создание, строительство"},{"dari":"علمی","translit":"'elmi","ru":"научный"}] : index === 4 ? [{"dari":"احساس","translit":"ehsās","ru":"чувство, ощущение"},{"dari":"ارسال","translit":"ersāl","ru":"отправка (чего-л.)"},{"dari":"بیچاره","translit":"bēčāra","ru":"несчастный, бедняга"},{"dari":"پیچاندن","translit":"pēčāndan","ru":"завёртывать"},{"dari":"تبصره","translit":"tabsera","ru":"комментарий"},{"dari":"ترویج","translit":"tarwij","ru":"распространение, внедрение"},{"dari":"تسریع","translit":"tasri’","ru":"ускорение"},{"dari":"تسلیم شدن","translit":"taslim šodan","ru":"сдаваться"},{"dari":"تشدید","translit":"tašdid","ru":"усиление, интенсификация"},{"dari":"تصویب","translit":"taswib","ru":"утверждение (документа и т.п.)"},{"dari":"تمدید","translit":"tamdid","ru":"продление"},{"dari":"تنظیم","translit":"tanzim","ru":"упорядочивание, налаживание"},{"dari":"تنویر","translit":"tanwir","ru":"освещение"},{"dari":"توصیه","translit":"tawseya","ru":"совет, рекомендация"},{"dari":"جاپان","translit":"Jāpān","ru":"Япония"},{"dari":"جزیره","translit":"jazira (jazāyer)","ru":"остров"},{"dari":"حمله","translit":"hamla","ru":"нападение, атака"},{"dari":"خاموش","translit":"xāmōš","ru":"тихий, спокойный"},{"dari":"فرار","translit":"farār","ru":"бегство, побег"},{"dari":"قادر بودن","translit":"qāder budan","ru":"быть в состоянии (сделать что-л.)"},{"dari":"قدیفه","translit":"qadifa","ru":"накидка; полотенце (банное)"},{"dari":"قوت","translit":"qowwat, qowwa (qowā)","ru":"сила"},{"dari":"مبالغه","translit":"mobāleğa","ru":"преувеличение"},{"dari":"مبصر","translit":"mobasser","ru":"комментатор"},{"dari":"مجادله","translit":"mojādela","ru":"борьба"},{"dari":"مجرب","translit":"mojarrab","ru":"опытный"},{"dari":"مجلل","translit":"mojallal","ru":"великолепный; торжественный"},{"dari":"مجهز","translit":"mojahhaz","ru":"оснащенный, оборудованный"},{"dari":"محسوس","translit":"mahsus","ru":"ощутимый"},{"dari":"مخالفت","translit":"moxālefat","ru":"несогласие"},{"dari":"مذکور","translit":"mazkur","ru":"вышеупомянутый"},{"dari":"مزروع","translit":"mazru’","ru":"обрабатываемый, возделываемый (о земле)"},{"dari":"مسلک","translit":"maslak (masālek)","ru":"профессия, специальность"},{"dari":"مسئول","translit":"mas’ul","ru":"ответственный"},{"dari":"مشغول","translit":"mašğul","ru":"занятый (чем-л.)"},{"dari":"مضایقه کردن","translit":"mozāyeqa kardan","ru":"жалеть (усилия и т.п.)"},{"dari":"مطالبه","translit":"motāleba","ru":"требование"},{"dari":"مقایسه","translit":"moqāyesa","ru":"сравнение"},{"dari":"مقرره","translit":"moqarrara","ru":"правило, положение (документ)"},{"dari":"مورد","translit":"mawred (mawāred)","ru":"случай; объект (чего-л.)"},{"dari":"مولد","translit":"mowalled","ru":"производитель"},{"dari":"واضح","translit":"wāzeh","ru":"ясный, очевидный"},{"dari":"مقاله","translit":"maqāla","ru":"статья"},{"dari":"رعایت کردن","translit":"re'āyat kardan","ru":"соблюдать"},{"dari":"سالون","translit":"sālōn","ru":"зал"},{"dari":"باشکوه","translit":"bāšokōh","ru":"торжественный, величественный"},{"dari":"قادر","translit":"Qāder","ru":"Кадыр (мужское имя)"},{"dari":"طاهر","translit":"Tāher","ru":"Тахир (мужское имя)"},{"dari":"نشر شدن","translit":"našr šodan","ru":"публиковаться"},{"dari":"تولیدات","translit":"tawlidāt","ru":"продукция, производство"},{"dari":"از","translit":"az","ru":"о, от"},{"dari":"به شدت","translit":"ba šeddat","ru":"упорно, сильно"},{"dari":"تیم","translit":"tēm","ru":"команда"},{"dari":"استراحت","translit":"esterāhat","ru":"отдых"}] : index === 5 ? [{"dari":"ابتدا","translit":"ebtedā","ru":"начало"},{"dari":"ارزنده","translit":"arzenda","ru":"ценный"},{"dari":"اعدام","translit":"e’dām","ru":"казнь"},{"dari":"البته","translit":"albatta","ru":"разумеется, конечно"},{"dari":"انتخاب","translit":"entexāb","ru":"выбор"},{"dari":"آویختن","translit":"āwēxtan","ru":"вешать"},{"dari":"آهسته","translit":"āhesta","ru":"медленный, тихий"},{"dari":"بلندقامت","translit":"bolandqāmat","ru":"высокого роста"},{"dari":"بوت‌دوزی","translit":"butdōzi","ru":"изготовление обуви"},{"dari":"پخسه","translit":"paxsa","ru":"слой глины (при кладке стены)"},{"dari":"پوستینچه","translit":"pōstinča","ru":"меховая куртка"},{"dari":"تزئید","translit":"tazyid","ru":"увеличение"},{"dari":"تصادفاً","translit":"tasādofan","ru":"случайно"},{"dari":"تطبیق","translit":"tatbiq","ru":"выполнение (плана), претворение в жизнь"},{"dari":"تعلق","translit":"ta’alloq","ru":"принадлежность"},{"dari":"تولیدی","translit":"tawlidi","ru":"изготовленный"},{"dari":"تهداب‌گذاری","translit":"tahdābgozāri","ru":"закладка фундамента"},{"dari":"جرم","translit":"jorm","ru":"преступление"},{"dari":"جلاد","translit":"jallād","ru":"палач"},{"dari":"جنسیت","translit":"jenseyyat","ru":"качество (товара)"},{"dari":"چرم","translit":"čarm","ru":"кожа (выделанная)"},{"dari":"چنین","translit":"čonin","ru":"такой"},{"dari":"حاکم","translit":"hākem","ru":"правитель, уездный начальник"},{"dari":"حایز بودن","translit":"hāyez budan","ru":"владеть, иметь"},{"dari":"حجم","translit":"hojm","ru":"объем"},{"dari":"حجار","translit":"hajjār","ru":"каменотес"},{"dari":"حد","translit":"hadd (hodud)","ru":"граница"},{"dari":"حلاج","translit":"hallāj","ru":"чесальщик хлопка"},{"dari":"دار","translit":"dār","ru":"виселица"},{"dari":"دزدی کردن","translit":"dozdi kardan","ru":"красть, обкрадывать"},{"dari":"دسترسی","translit":"dastrasi","ru":"доступ"},{"dari":"دستگاه","translit":"dastgāh","ru":"станок, аппарат, установка"},{"dari":"دستور","translit":"dastur (dasātir)","ru":"распоряжение"},{"dari":"دوام","translit":"dawām","ru":"продолжение; долговечность"},{"dari":"دیزاین","translit":"dizāyn","ru":"рисунок, орнамент"},{"dari":"رنگ‌آمیزی","translit":"rangāmēzi","ru":"покраска"},{"dari":"روند","translit":"rawend","ru":"процесс"},{"dari":"رها کردن","translit":"rahā kardan","ru":"отпускать, освобождать"},{"dari":"سلاح","translit":"selāh (asleha)","ru":"оружие"},{"dari":"سوزان","translit":"sōzān","ru":"обжигающий, палящий"},{"dari":"شامخ","translit":"šāmex","ru":"высокий, величавый"},{"dari":"شکار","translit":"šekār","ru":"охота; добыча"},{"dari":"شیء","translit":"šay’ (ašyā’)","ru":"вещь, изделие"},{"dari":"ضراب","translit":"zarrāb","ru":"чеканщик монет"},{"dari":"ضرابخانه","translit":"zarrābxāna","ru":"монетный двор"},{"dari":"طرح","translit":"tarh","ru":"разработка (плана и т.п.)"},{"dari":"طریق","translit":"tariq (toroq)","ru":"путь"},{"dari":"عاقبت","translit":"‘āqebat (‘awāqeb)","ru":"последствие"},{"dari":"فقدان","translit":"foqdān","ru":"отсутствие"},{"dari":"قاطع","translit":"qāte’","ru":"решительный, категорический"},{"dari":"قاقمه","translit":"qāqma","ru":"армячина"},{"dari":"قالین‌بافی","translit":"qālinbāfi","ru":"ковроткачество"},{"dari":"قرضه","translit":"qarza","ru":"заем, кредит"},{"dari":"قرن","translit":"qarn (qorun)","ru":"век"},{"dari":"قلعه","translit":"qal’a","ru":"крепость, дом (с усадьбой, обнесенной высокой стеной)"},{"dari":"قندسازی","translit":"qandsāzi","ru":"изготовление сахара"},{"dari":"کاشی‌سازی","translit":"kāšisāzi","ru":"изготовление изразцов, кафеля и т.п."},{"dari":"کبک","translit":"kabk","ru":"куропатка"},{"dari":"کرباس","translit":"karbās","ru":"холст"},{"dari":"کلاه‌دوزی","translit":"kolāhdōzi","ru":"шитье шапок"},{"dari":"کیلووات","translit":"kilowāt","ru":"киловатт"},{"dari":"گلیم","translit":"gelim","ru":"палас"},{"dari":"گلیم‌بافی","translit":"gelimbāfi","ru":"изготовление паласов"},{"dari":"گناه","translit":"gonāh","ru":"вина, грех"},{"dari":"گوگردسازی","translit":"gōgerdsāzi","ru":"изготовление спичек"},{"dari":"متمرکز","translit":"motamarkez","ru":"сосредоточенный, сконцентрированный"},{"dari":"محبس","translit":"mahbas (mahābes)","ru":"тюрьма"},{"dari":"محل","translit":"mahall","ru":"место"},{"dari":"مساعدت کردن","translit":"mosā’edat kardan","ru":"способствовать"},{"dari":"منتخب","translit":"montaxab","ru":"выбранный, избранный"},{"dari":"مهمات","translit":"mohemmāt","ru":"боеприпасы"},{"dari":"نازک","translit":"nāzok","ru":"тонкий"},{"dari":"ناله","translit":"nāla","ru":"стон, плач"},{"dari":"نساج","translit":"nassāj","ru":"ткач"},{"dari":"وسیله","translit":"wasila (wasāyel)","ru":"средство"},{"dari":"مساعدت","translit":"mosā'adat","ru":"содействие, помощь"},{"dari":"سالانه","translit":"sālāna","ru":"годовой"},{"dari":"مخابره کردن","translit":"moxābara kardan","ru":"сообщать, направлять"},{"dari":"رسیدن","translit":"residan","ru":"поступать, прибывать"},{"dari":"نغلو","translit":"Nağlō","ru":"Наглу (гидроэлектростанция)"},{"dari":"خصوصی","translit":"xosusi","ru":"частный"},{"dari":"تهیه شدن","translit":"tahiya šodan","ru":"поставляться, готовиться"},{"dari":"تهداب","translit":"tahdāb","ru":"фундамент"},{"dari":"موتررو","translit":"mōtarraw","ru":"автомобильная дорога"},{"dari":"با استفاده از","translit":"bā estefāda az","ru":"с использованием"},{"dari":"تجهیزات","translit":"tajhizāt","ru":"оборудование"},{"dari":"اعمدتاً","translit":"'omdatan","ru":"главным образом"},{"dari":"محبوبیت","translit":"mahbubeyyat","ru":"популярность"}] : index === 6 ? [{"dari":"ارتباط","translit":"ertebāt","ru":"связь, касательство"},{"dari":"آرد","translit":"ārd","ru":"мука"},{"dari":"آسیاب","translit":"āsyā(b)","ru":"мельница"},{"dari":"اعظمی","translit":"a’zami","ru":"максимальный"},{"dari":"آله","translit":"āla","ru":"инструмент, прибор"},{"dari":"اندک","translit":"andak","ru":"мало; малый"},{"dari":"بی‌نیاز","translit":"bēneyāz","ru":"не нуждающийся"},{"dari":"پشمینه","translit":"pašmina","ru":"шерстяная ткань"},{"dari":"ترمیم","translit":"tarmim","ru":"ремонт"},{"dari":"تصفیه","translit":"tasfeya","ru":"очистка"},{"dari":"تن","translit":"tan","ru":"тонна"},{"dari":"توربین","translit":"turbin","ru":"турбина"},{"dari":"تهیه","translit":"taheya","ru":"подготовка; заготовка; изготовление"},{"dari":"چودن","translit":"čōdan","ru":"чугун"},{"dari":"خشت","translit":"xešt","ru":"кирпич"},{"dari":"خوراکه","translit":"xōrāka","ru":"продукты (питания)"},{"dari":"دایمی","translit":"dāyemi","ru":"постоянный"},{"dari":"درخشان","translit":"daraxšān","ru":"блестящий"},{"dari":"دوخت","translit":"dōxt","ru":"шитьё"},{"dari":"دیزل","translit":"dizal","ru":"дизельное топливо"},{"dari":"ساحه","translit":"sāha","ru":"площадь, пространство"},{"dari":"سمنت","translit":"sement","ru":"цемент"},{"dari":"شرکت","translit":"šerkat","ru":"компания, ширکت"},{"dari":"صابون","translit":"sābun","ru":"мыло"},{"dari":"غله","translit":"ğalla","ru":"зерно, злак"},{"dari":"فایده","translit":"fāyeda (fawāyed)","ru":"польза, выгода"},{"dari":"فولاد","translit":"fōlād","ru":"сталь"},{"dari":"کاربامید","translit":"kārbāmid","ru":"карбамид"},{"dari":"کانسرو شده","translit":"kānsarwšoda","ru":"консервированный"},{"dari":"کشمش","translit":"kešmeš","ru":"изюм"},{"dari":"کشمش‌پاکی","translit":"kešmešpāki","ru":"очистка изюма"},{"dari":"کفاشی","translit":"kaffāši","ru":"производство обуви"},{"dari":"کمپل","translit":"kampal","ru":"одеяло"},{"dari":"کوره","translit":"kōra","ru":"печь"},{"dari":"گسترده","translit":"gostorda","ru":"широкий, обширный"},{"dari":"لین","translit":"layn","ru":"линия"},{"dari":"ماشین‌آلات","translit":"māšinālāt","ru":"механизмы"},{"dari":"مجموع","translit":"majmu’","ru":"сумма, совокупность"},{"dari":"مرفوع","translit":"marfu’","ru":"устраненный, утоленный"},{"dari":"مسلخ","translit":"maslax","ru":"скотобойня"},{"dari":"مشروب","translit":"mašrub","ru":"напиток"},{"dari":"میش","translit":"mēš","ru":"овца"},{"dari":"نخ","translit":"nax","ru":"нить, пряжа (хлопчатобумажная)"},{"dari":"واسطه","translit":"wāseta (wasāyet)","ru":"средство, механизм"},{"dari":"برمه کاری شدن","translit":"barmakāri šodan","ru":"бурить(ся)"},{"dari":"مربوطه","translit":"marbuta","ru":"соответствующий"},{"dari":"کارگاه","translit":"kārgāh","ru":"цех"},{"dari":"کانکریت آهندار","translit":"kānkrēt-e āhandār","ru":"железобетон"},{"dari":"چکی","translit":"čeki","ru":"чешский"},{"dari":"قسماً","translit":"qesman","ru":"частично"},{"dari":"ذیل","translit":"zeyl","ru":"следующий, ниже"},{"dari":"فارم","translit":"fārm","ru":"ферма"},{"dari":"پری فابریکیت","translit":"perifābrikēt","ru":"железобетонные блоки"},{"dari":"تیل","translit":"tēl","ru":"нефть, бензин"},{"dari":"تدویر","translit":"tadwir","ru":"бурение"}] : index === 7 ? [{"dari":"ارابه","translit":"arāba","ru":"колесо"},{"dari":"اشترنگ","translit":"eštereng","ru":"руль"},{"dari":"اعتنا","translit":"e’tenā","ru":"внимание"},{"dari":"اکسلیتر","translit":"aksalitar","ru":"акселератор"},{"dari":"انجن","translit":"enjen","ru":"двигатель, мотор"},{"dari":"انصاف","translit":"ensāf","ru":"справедливость"},{"dari":"انگشت","translit":"angošt","ru":"палец"},{"dari":"بادوام","translit":"bādawām","ru":"прочный, долговечный"},{"dari":"بالتی","translit":"bālti","ru":"батарейка"},{"dari":"برک","translit":"berek","ru":"тормоз"},{"dari":"برهم زدن","translit":"barham zadan","ru":"проводить в беспорядок, нарушать (порядок и т.п.)"},{"dari":"بطری","translit":"betri","ru":"аккумулятор"},{"dari":"بند ماندن","translit":"band māndan","ru":"застревать"},{"dari":"بی انصافی","translit":"bēensāf","ru":"бессовестный"},{"dari":"پایپ","translit":"pāyp","ru":"трубка (например, курительная)"},{"dari":"پر","translit":"por","ru":"полный, заполненный"},{"dari":"پلک","translit":"palak","ru":"свеча (автомашины)"},{"dari":"پنچر کردن","translit":"pančar kardan","ru":"проколоть"},{"dari":"پوش","translit":"pōš","ru":"чехол, капот"},{"dari":"تانک","translit":"tānk","ru":"танк; бак, цистерна; бензозаправочная станция"},{"dari":"تایر","translit":"tāyr","ru":"шина, автопокрышка"},{"dari":"تخلف (ات)","translit":"taxallof","ru":"нарушение (правил)"},{"dari":"ترانسپورت","translit":"tarānspōrt","ru":"транспорт"},{"dari":"ترانسفارمر","translit":"tarānsfārmer","ru":"трансформатор"},{"dari":"ترک کردن","translit":"tark kardan","ru":"покидать; прекращать"},{"dari":"تصادفاً","translit":"tasādorān","ru":"случайно"},{"dari":"تکر","translit":"takar","ru":"(разг.) столкновение, удар (друг о друга)"},{"dari":"تنباکو","translit":"tanbākō","ru":"табак"},{"dari":"تولبکس","translit":"tōlbaks","ru":"багажник"},{"dari":"تیوپ","translit":"teyup","ru":"баллон (шины)"},{"dari":"جارو","translit":"jāru","ru":"метла"},{"dari":"جدی","translit":"jeddi","ru":"серьёзный"},{"dari":"جرقه","translit":"jaraqqa","ru":"искра"},{"dari":"جریمه","translit":"jarima","ru":"штраф"},{"dari":"جزا","translit":"jazā","ru":"наказание"},{"dari":"جک","translit":"jak","ru":"штраф"},{"dari":"چارج کردن","translit":"čārj kardan","ru":"заряжать (например, аккумулятор)"},{"dari":"چارراهی","translit":"čārrāhi","ru":"перекрёсток"},{"dari":"چالان کردن","translit":"čālān kardan","ru":"заводить (мотор и т.п.)"},{"dari":"چلم","translit":"čalam","ru":"кальян"},{"dari":"چندان","translit":"čandān","ru":"столько, так много"},{"dari":"خاکستر","translit":"xākestar","ru":"пепел, зола"},{"dari":"خاموش","translit":"xāmōš","ru":"молчащий; погасший"},{"dari":"دواندن","translit":"dawāndan","ru":"погонять; водить (автомашину и т.п.)"},{"dari":"دور خوردن","translit":"dawr xōrdan","ru":"сворачивать, поворачиваться"},{"dari":"رأساً","translit":"ra’san","ru":"прямо, непосредственно"},{"dari":"ردیتر","translit":"raditar","ru":"радиатор"},{"dari":"رهنما","translit":"rahnamā","ru":"проводник, указывающий путь"},{"dari":"رینج","translit":"rēnj","ru":"(гаечный) ключ"},{"dari":"ریورس","translit":"riwars","ru":"задний ход"},{"dari":"ساکت","translit":"sākat","ru":"штепсель"},{"dari":"سوخته","translit":"sōxta","ru":"огарок, окурок"},{"dari":"سویچ","translit":"sowič","ru":"выключатель"},{"dari":"سیت","translit":"sit","ru":"кабина (водителя), сиденье"},{"dari":"سیم","translit":"sim","ru":"проволока, повод; спираль (электронагревательного прибора)"},{"dari":"شارتی","translit":"šārti","ru":"короткое замыкание"},{"dari":"شید","translit":"šēd","ru":"плафон, абажур"},{"dari":"صافی","translit":"sāfi","ru":"тряпка"},{"dari":"ضمناً","translit":"zemnam","ru":"одновременно, тем временем"},{"dari":"طالع","translit":"tāle’","ru":"удача, везенье"},{"dari":"عارضه (عوارض)","translit":"āreza (awārez)","ru":"поломка, неисправность"},{"dari":"عوض کردن","translit":"‘ewaz kardan","ru":"заменять"},{"dari":"غیرت","translit":"ğayrat","ru":"самолюбие; рвение, самоотверженность"},{"dari":"فالتو","translit":"fāltu","ru":"запасной"},{"dari":"قطع کردن","translit":"qat’ kardan","ru":"прерывать, перерезать"},{"dari":"کرین شافت","translit":"kerēnšāft","ru":"коленчатый вал"},{"dari":"کمباد","translit":"kambād","ru":"спущенный (о надувном предмете)"},{"dari":"گروپ","translit":"group","ru":"(электрическая) лампочка"},{"dari":"گریس","translit":"geris","ru":"солидол, солярка"},{"dari":"گل کردن","translit":"gol kardan","ru":"выключать"},{"dari":"گیربکس","translit":"girbaks","ru":"коробка передач"},{"dari":"لوکس","translit":"luks","ru":"шикарный, превосходный"},{"dari":"مبل آیل","translit":"moblāyel","ru":"машинное масло"},{"dari":"منتها","translit":"montahā","ru":"край; только, всего лишь"},{"dari":"مهارت","translit":"mahārat","ru":"мастерство"},{"dari":"میتر","translit":"mitar","ru":"счётчик (электроэнергии)"},{"dari":"میده","translit":"mayda","ru":"мелкий, измельчённый"},{"dari":"ناجوان","translit":"nājawān","ru":"трусливый, непорядочный"},{"dari":"نصب کردن","translit":"nasb kardan","ru":"прикреплять, ввинчивать"},{"dari":"نقض","translit":"naqz","ru":"нарушение (правил и т.п.)"},{"dari":"نمبرپلیت","translit":"nambarpalēt","ru":"номерной знак"},{"dari":"هارن","translit":"hāran","ru":"сигнал, гудок"},{"dari":"هاکی","translit":"hākī","ru":"хоккей на траве"},{"dari":"همراه","translit":"hamrāh","ru":"спутник, сопровождающий"} ,{"dari":"تز دکترا","translit":"tēz-e doktorā","ru":"докторская диссертация"},{"dari":"آریانا","translit":"Ariānā","ru":"«Ариана»"},{"dari":"درز","translit":"darz","ru":"трещина"},{"dari":"راه کسی را گرفتن","translit":"rāh-e kasi rā gereftan","ru":"загородить кому-л. дорогу"},{"dari":"پمپ کردن","translit":"pamp kardan","ru":"накачивать"},{"dari":"محکم گرفتن","translit":"mohkam gereftan","ru":"крепко схватить"},{"dari":"بار کردن","translit":"bār kardan","ru":"грузить"},{"dari":"دور دادن","translit":"dōr dādan","ru":"поворачивать"},{"dari":"کجا","translit":"kojā","ru":"где; какой страны"},{"dari":"باز کردن","translit":"bāz kardan","ru":"открывать, включать"},{"dari":"دیپلوماتیک","translit":"diplomātik","ru":"дипломатический"}] : index === 8 ? [{"dari":"ابلاغ","translit":"eblāğ","ru":"сообщение, уведомление"},{"dari":"اثر","translit":"asar","ru":"след; впечатление"},{"dari":"ارزان","translit":"arzān","ru":"дешёвый"},{"dari":"اقارب","translit":"aqāreb","ru":"родственники (мн.)"},{"dari":"آنگاه","translit":"āngāh","ru":"тогда, после этого"},{"dari":"برآوردن","translit":"barāwardan","ru":"испускать"},{"dari":"بزاز","translit":"bazzāz","ru":"мануфактурщик"},{"dari":"بندر (بنادر)","translit":"bandar (banāder)","ru":"порт"},{"dari":"بنیه (گر)","translit":"banya(gar)","ru":"бакалейщик"},{"dari":"تراشیدن","translit":"tarāšidan","ru":"брить, скоблить"},{"dari":"تنور","translit":"tanōr","ru":"духовка; печь"},{"dari":"چرخ","translit":"čarx","ru":"круг, точильный камень"},{"dari":"حاجت","translit":"hājat","ru":"нужда, необходимость"},{"dari":"حکاک","translit":"hakkāk","ru":"резчик по камню"},{"dari":"خریداری کردن","translit":"xaridāri kardan","ru":"покупать (книжн.)"},{"dari":"خیاط","translit":"xayyāt","ru":"портной"},{"dari":"دلاک","translit":"dallāk","ru":"цирюльник, брадобрей"},{"dari":"دوغ","translit":"dōğ","ru":"пахтанье, прохладительный напиток"},{"dari":"دیوانه","translit":"dēwāna","ru":"сумасшедший; безумец"},{"dari":"رابر","translit":"rābar","ru":"резина"},{"dari":"راندن","translit":"rāndan","ru":"прогонять"},{"dari":"رنج بردن","translit":"ranj bordan","ru":"страдать"},{"dari":"زینت","translit":"zinat","ru":"украшение, убранство"},{"dari":"زیور","translit":"zēwar","ru":"украшение (предмет)"},{"dari":"سامان","translit":"sāmān","ru":"утварь, принадлежности"},{"dari":"سایه","translit":"sāya","ru":"тень"},{"dari":"سودا","translit":"sawdā","ru":"покупка"},{"dari":"سمسار","translit":"simsār","ru":"галантерейщик"},{"dari":"صرف","translit":"sarf","ru":"расходование; приём пищи"},{"dari":"عرضه کردن","translit":"‘arza kardan","ru":"предлагать (на продажу)"},{"dari":"عطار","translit":"‘attār","ru":"парфюмер"},{"dari":"عطر (عطریات)","translit":"‘atr (-eyyāt)","ru":"духи"},{"dari":"فالوده","translit":"fāluda","ru":"фалуда, прохладное лакомство"},{"dari":"فرمایش","translit":"farmāyeš","ru":"заказ"},{"dari":"فیشن","translit":"fēšan","ru":"фасон, мода, роскошь"},{"dari":"قاب","translit":"qāb","ru":"тарелка, блюдо"},{"dari":"قصاب","translit":"qassāb","ru":"мясник"},{"dari":"قناد","translit":"qannād","ru":"кондитер"},{"dari":"قیماق","translit":"qaymāq","ru":"сметана"},{"dari":"کبابی","translit":"kabābi","ru":"продавец шашлыка"},{"dari":"کراچی","translit":"karāči","ru":"ручная тележка"},{"dari":"کور","translit":"kōr","ru":"слепой; слепец"},{"dari":"کوزه","translit":"kōza","ru":"глиняный кувшин"},{"dari":"کیک","translit":"kēk","ru":"кекс, пирожное"},{"dari":"لبنیات","translit":"labaneyyāt","ru":"молочные продукты"},{"dari":"ماست","translit":"māst","ru":"простокваша"},{"dari":"متاع (امتعه)","translit":"matā’ (amte’a)","ru":"товар"},{"dari":"مزدحم","translit":"mozdaham","ru":"заполненный людьми"},{"dari":"مستعمل","translit":"mosta’mal","ru":"подержанный"},{"dari":"مشتری","translit":"moštari","ru":"покупатель, клиент"},{"dari":"مصالح","translit":"masāleh","ru":"специи, приправы (мн.)"},{"dari":"مگس","translit":"magas","ru":"муха"},{"dari":"مناسب","translit":"monāseb","ru":"подходящий"},{"dari":"منداوی","translit":"mandawi","ru":"рынок (по продаже зерна)"},{"dari":"نرخنامه","translit":"nerxnāma","ru":"прейскурант"},{"dari":"نظافت","translit":"nazāfat","ru":"чистота"}] :  index === 9 ? [{"dari":"اتفاق","translit":"ettefāq","ru":"объединение, договоренность"},{"dari":"اجاق","translit":"ojāq","ru":"очаг"},{"dari":"استهزا‌آمیز","translit":"estehzāāmēz","ru":"издевательский"},{"dari":"اعلی","translit":"a’lā","ru":"отличный"},{"dari":"افگندن","translit":"afgandan (afgan)","ru":"бросать"},{"dari":"آگنده","translit":"āganda","ru":"наполненный"},{"dari":"امرار","translit":"emrār","ru":"продление, поддержание"},{"dari":"اندوختن","translit":"andōxtan","ru":"копить"},{"dari":"آه","translit":"āh","ru":"вздох"},{"dari":"بسی","translit":"básā","ru":"много"},{"dari":"بلا","translit":"balā","ru":"беда, несчастье"},{"dari":"بلاوقفه","translit":"belāwaqfa","ru":"безостановочно"},{"dari":"بندوبار","translit":"bandobār","ru":"пожитки"},{"dari":"بوی","translit":"bō(y)","ru":"запах"},{"dari":"بیروبار","translit":"birobār","ru":"сутолока"},{"dari":"بیلر","translit":"bilar","ru":"бочка"},{"dari":"بینوا","translit":"bēnawā","ru":"бедный, обездоленный"},{"dari":"بیهوده","translit":"bēhuda","ru":"напрасный, тщетный"},{"dari":"بیهوش","translit":"bēhuš","ru":"потерявший сознание"},{"dari":"پرخشم","translit":"porxašm","ru":"злобный"},{"dari":"پکه","translit":"paka","ru":"веер"},{"dari":"پوزخند","translit":"pōzxand","ru":"усмешка"},{"dari":"پوشانیدن","translit":"pōšān(i)dan","ru":"покрывать"},{"dari":"پیچ‌وتاب خوردن","translit":"pēčotāb xōrdan","ru":"вертеться, извиваться"},{"dari":"تأیید","translit":"ta’yid","ru":"подтверждение"},{"dari":"ترکیده","translit":"tarkida","ru":"потрескавшийся"},{"dari":"تغییر","translit":"tağyir","ru":"изменение"},{"dari":"تفکر","translit":"tafakkor","ru":"размышление"},{"dari":"تکان دادن","translit":"takān dādan","ru":"махать, качать"},{"dari":"تکله","translit":"takla","ru":"сильный (разг.)"},{"dari":"تندباد","translit":"tondbād","ru":"ураган"},{"dari":"جگره","translit":"jagra","ru":"спор, ссора"},{"dari":"جلو","translit":"jelaw","ru":"перёд"},{"dari":"جمع‌آوری","translit":"jam’āwari","ru":"собирание"},{"dari":"جویدن","translit":"jawidan","ru":"жевать, пережевывать"},{"dari":"چپلی","translit":"čapli","ru":"сандалии (на деревянной подошве)"},{"dari":"چربی","translit":"čarbi","ru":"жир"},{"dari":"چرت","translit":"čort","ru":"размышление"},{"dari":"حس","translit":"hess","ru":"чувство, ощущение"},{"dari":"حمل","translit":"haml","ru":"переноска, перевозка"},{"dari":"خبردار!","translit":"xabardār!","ru":"берегись! (возглас)"},{"dari":"خریدار","translit":"xaridār","ru":"покупатель, клиент"},{"dari":"خشن","translit":"xašen","ru":"грубый"},{"dari":"خم","translit":"xam","ru":"наклоненный"},{"dari":"خنده‌کنان","translit":"xandakonān","ru":"смеясь, сквозь смех"},{"dari":"خواباندن","translit":"xābāndan","ru":"побороть, положить на лопатки"},{"dari":"خوفناک","translit":"xawfnāk","ru":"страшный, ужасный"},{"dari":"خیال","translit":"xeyāl","ru":"воображение, фантазия"},{"dari":"درخشیدن","translit":"daraxšidan","ru":"блестеть, сверкать"},{"dari":"دود","translit":"dud","ru":"дым"},{"dari":"دودزده","translit":"dudzada","ru":"закопченный"},{"dari":"روده","translit":"rōda","ru":"кишка"},{"dari":"روغن‌چکان","translit":"rawğančakān","ru":"истекающий маслом"},{"dari":"ریسمان","translit":"rēsmān","ru":"веревка"},{"dari":"ژنده","translit":"žanda","ru":"изношенный"},{"dari":"سخن","translit":"soxan","ru":"речь, слова"},{"dari":"سرای","translit":"sarāy","ru":"торговый двор"},{"dari":"سررشته کردن","translit":"sarešta kardan","ru":"налаживать"},{"dari":"سروصدا","translit":"sarosadā","ru":"шум и гам"},{"dari":"سستی","translit":"sosti","ru":"слабость"},{"dari":"سور","translit":"sōr","ru":"каракуль (высшего сорта)"},{"dari":"سیخ","translit":"six","ru":"стержень; шампур (для шашлыка)"},{"dari":"شور خوردن","translit":"šōr xōrdan","ru":"двигаться, шевелиться"},{"dari":"ضعف","translit":"zo’f","ru":"слабость"},{"dari":"عابر","translit":"‘āber","ru":"прохожий"},{"dari":"عالم","translit":"‘ālam","ru":"мир (вселенная)"},{"dari":"عصبانی","translit":"‘asabāni","ru":"сердитый, раздраженный"},{"dari":"فروبردن","translit":"forōbordan","ru":"погружать; глотать"},{"dari":"فضا","translit":"fazā","ru":"атмосфера, пространство"},{"dari":"قطعی","translit":"qat’i","ru":"категорический"},{"dari":"کپه","translit":"kappa","ru":"щепотка"},{"dari":"کر","translit":"kar","ru":"глухой"},{"dari":"کشمیره","translit":"kašmira","ru":"кашемир(овый)"},{"dari":"گرد آوردن","translit":"gerd āwardan","ru":"собирать"},{"dari":"گرد آمدن","translit":"gerd āmadan","ru":"собираться"},{"dari":"گویی","translit":"gōyi","ru":"словно, как будто"},{"dari":"لحظه","translit":"lahza","ru":"момент, мгновение"},{"dari":"لرزان","translit":"larzān","ru":"дрожащий"},{"dari":"لوله","translit":"lōla","ru":"трубочка"},{"dari":"مأیوس","translit":"ma’yus","ru":"разочарованный, отчаявшийся"},{"dari":"محزون","translit":"mahzun","ru":"печальный"},{"dari":"مخلوط","translit":"maxlut","ru":"смешанный"},{"dari":"مسرور","translit":"masrur","ru":"радостный"},{"dari":"مضطرب","translit":"moztareb","ru":"взволнованный"},{"dari":"مطبوع","translit":"matbu’","ru":"приятный"},{"dari":"مغروق","translit":"mağruq","ru":"погруженный"},{"dari":"میانه‌سال","translit":"meyānasāl","ru":"средних лет"},{"dari":"ناتوان","translit":"nātawān","ru":"немощный"},{"dari":"ناف","translit":"nāf","ru":"пупок"},{"dari":"نامرتب","translit":"nāmorattab","ru":"беспорядочный"},{"dari":"نصوار","translit":"haswār","ru":"насвар, нас (слабый наркотик для жевания)"},{"dari":"نگریستن","translit":"negaristan (negar)","ru":"смотреть"},{"dari":"وزن","translit":"wazn (awzān)","ru":"вес"},{"dari":"وزیدن","translit":"wazidan","ru":"дуть (о ветре)"},{"dari":"ویران","translit":"wayrān, wayrāna","ru":"разрушенный"},{"dari":"هوش","translit":"huš","ru":"сознание, рассудок"}] : index === 0 ? [{"dari":"ابریشم","translit":"abrēšom","ru":"шёлк"},{"dari":"اردوگاه","translit":"ordugāh","ru":"лагерь"},{"dari":"اوهو","translit":"ōhó","ru":"междометие радости и т.п."},{"dari":"بازی","translit":"bāzi","ru":"игра"},{"dari":"بهانه","translit":"bahāna","ru":"повод, предлог"},{"dari":"پذیرفتن","translit":"paziroftan (pazir)","ru":"принимать, соглашаться"},{"dari":"پشیمان","translit":"pešēmān","ru":"сожалеющий"},{"dari":"تجارت","translit":"tejārat, tajārat","ru":"торговля, коммерция"},{"dari":"تنبان","translit":"tonbān","ru":"шаровары"},{"dari":"توپ‌دنده","translit":"tōpdanda","ru":"афганская национальная игра (типа хоккея на траве)"},{"dari":"جمع کردن","translit":"jam’ kardan","ru":"собирать"},{"dari":"چپن","translit":"čapan","ru":"халат"},{"dari":"چنانچه","translit":"čanānče","ru":"таким образом, что…"},{"dari":"حلال کردن","translit":"halāl kardan","ru":"забивать (животное по мусульманскому обряду)"},{"dari":"خامک‌دوزی","translit":"xāmakdōzi","ru":"вышивание, шитьё (несучёными нитками)"},{"dari":"خستگی","translit":"xastagi","ru":"усталость"},{"dari":"دانس","translit":"dāns","ru":"танец (бальный)"},{"dari":"به درد کسی خوردن","translit":"ba dard-e kas-ē xōrdan","ru":"пригодиться кому-л."},{"dari":"دستمال","translit":"dastmāl","ru":"платок"},{"dari":"روان","translit":"rawān","ru":"плавный, текущий; беглый, бегло"},{"dari":"زردوزی","translit":"zardōzi","ru":"шитьё золотом"},{"dari":"سابق","translit":"sābeq","ru":"прежний"},{"dari":"ساده","translit":"sāda","ru":"простой, бесхитростный"},{"dari":"سالم","translit":"sālem","ru":"здоровый"},{"dari":"سیر","translit":"sayr","ru":"прогулка"},{"dari":"سیر علمی","translit":"sayr-e ‘elmi","ru":"экскурсия"},{"dari":"شرمنده","translit":"šarmenda","ru":"пристыженный"},{"dari":"ضروری","translit":"zaruri","ru":"необходимый"},{"dari":"علاوه","translit":"‘elāwa","ru":"добавление"},{"dari":"قیامت","translit":"qeyāmat","ru":"светопреставление"},{"dari":"کمائی کردن","translit":"kamāyi kardan","ru":"зарабатывать"},{"dari":"موضوع","translit":"mawzō’","ru":"тема, проблема"},{"dari":"میانه","translit":"meyāna","ru":"промежуточный, средний"},{"dari":"نگاه کردن","translit":"negāh kardan","ru":"лит. смотреть, разг. хранить"},{"dari":"نوشیدن","translit":"nōšidan","ru":"пить"},{"dari":"واسکت","translit":"wāskat","ru":"жилет"},{"dari":"واه واه","translit":"wāh-wāh","ru":"междометие восхищения"},{"dari":"وطندار","translit":"watandār","ru":"земляк"},{"dari":"هنر","translit":"honar","ru":"искусство"},{"dari":"یقین","translit":"yaqin","ru":"уверенность"},{"dari":"کریمیا","translit":"Qeremiya","ru":"Крым"},{"dari":"خواستن","translit":"xāstan","ru":"хотеть, просить"},{"dari":"مستوره","translit":"Mastura","ru":"Мастура (женское имя)"},{"dari":"قفقاز","translit":"Qafqāz","ru":"Кавказ"},{"dari":"اقارب","translit":"aqāreb","ru":"родственники"},{"dari":"مؤسسه","translit":"mo'assesa","ru":"учреждение, фирма"},{"dari":"علاوه برآن","translit":"'elāwa bar ān","ru":"кроме того"},{"dari":"کمایی کردن","translit":"kamāyi kardan","ru":"зарабатывать"},{"dari":"آسیای میانه","translit":"Āsyā-ye miyāna","ru":"Средняя Азия"},{"dari":"سمرقند","translit":"Samarqand","ru":"Самарканд"},{"dari":"بخارا","translit":"Boxārā","ru":"Бухара"},{"dari":"خیوه","translit":"Xiva","ru":"Хива"},{"dari":"لذت بردن از چیزی","translit":"lezzat bordan az čiz-ē","ru":"наслаждаться"}] : index === 10 ? [{"dari":"اشکنبه","translit":"eškanba","ru":"потроха"},{"dari":"آشگز","translit":"āšgaz","ru":"скалка"},{"dari":"آفتاب‌پرست","translit":"āftābparast","ru":"подсолнечник"},{"dari":"باقلا","translit":"bāqolā","ru":"бобы"},{"dari":"بره","translit":"barra","ru":"ягненок"},{"dari":"پاس","translit":"pās","ru":"пропуск"},{"dari":"پالک","translit":"pālak","ru":"шпинат"},{"dari":"پودین","translit":"pudin","ru":"пудинг, кисель"},{"dari":"پیچیدن","translit":"pēčidan","ru":"виться, закручиваться"},{"dari":"پیک","translit":"payk","ru":"рюмка"},{"dari":"تابه","translit":"tāba","ru":"противень, большая сковорода"},{"dari":"ترکیب","translit":"tarkib","ru":"состав"},{"dari":"تره","translit":"tara","ru":"змеевидная дыня"},{"dari":"توته","translit":"tōta","ru":"кусочек, осколок"},{"dari":"تیره","translit":"tira","ru":"темный, густой (по цвету)"},{"dari":"جوش","translit":"jōš","ru":"кипение; кипящий, кипяченый (о воде)"},{"dari":"چاشنی","translit":"čāšni","ru":"приправа"},{"dari":"چای‌جوش","translit":"čāyjōš","ru":"чайник (для кипячения воды)"},{"dari":"چرب","translit":"čarb","ru":"жирный (о пище)"},{"dari":"چریدن","translit":"čaridan","ru":"пастись"},{"dari":"چسپیدن","translit":"časpidan","ru":"прилипать"},{"dari":"چمچه","translit":"čamča","ru":"половник"},{"dari":"چوچه","translit":"čōča","ru":"детеныш"},{"dari":"حلقه","translit":"halqa","ru":"кольцо"},{"dari":"حلویات","translit":"hal(a)weyyāt","ru":"сладости"},{"dari":"خلال کردن","translit":"xalāl kardan","ru":"нарезать (ломтями)"},{"dari":"خوابیدن","translit":"xābidan","ru":"ложиться, спать"},{"dari":"دلنخود","translit":"dālnaxōd","ru":"сушеный горошек"},{"dari":"درآوردن","translit":"darāwardan","ru":"вносить, ввергать"},{"dari":"دم کشیدن","translit":"dam kašidan","ru":"париться (о пище), завариваться (о чае)"},{"dari":"دنبه","translit":"donba","ru":"курдюк; баранье сало"},{"dari":"رواش","translit":"rawāš","ru":"ревень"},{"dari":"روزمره","translit":"rōzmarra","ru":"повседневный"},{"dari":"ریشه","translit":"rēša","ru":"корень"},{"dari":"زرچوبه","translit":"zarčōba","ru":"имбирь"},{"dari":"زعفران","translit":"za’farān","ru":"шафран"},{"dari":"زغاله","translit":"zoğāla","ru":"заготовка (из теста)"},{"dari":"زغر","translit":"zeğer","ru":"лен"},{"dari":"ساطور","translit":"sātur","ru":"большой нож, топорик (для рубки мяса)"},{"dari":"ساییدن","translit":"sāyidan","ru":"растирать, тереть"},{"dari":"سپس","translit":"sepas","ru":"затем, потом"},{"dari":"سفره","translit":"sofra","ru":"скатерть (с угощением)"},{"dari":"سیر","translit":"sir","ru":"чеснок"},{"dari":"شبت","translit":"šebet","ru":"укроп"},{"dari":"شرمیدن","translit":"šarmidan","ru":"стыдиться, стесняться"},{"dari":"شلغم","translit":"šalğam","ru":"репа"},{"dari":"طبخ","translit":"tabx","ru":"приготовление (пищи)"},{"dari":"طرز","translit":"tarz","ru":"способ"},{"dari":"طعام (اطعمه)","translit":"ta’ām (at’ema)","ru":"еда, блюдо"},{"dari":"غربال","translit":"ğerbāl","ru":"сито"},{"dari":"غوری","translit":"ğuri","ru":"большое блюдо"},{"dari":"قاق","translit":"qāq","ru":"сухой, сушеный"},{"dari":"قبرغه","translit":"qaborğa","ru":"ребро"},{"dari":"قروت","translit":"qorut","ru":"сушеное кислое молоко (в форме шариков)"},{"dari":"قیمه","translit":"qima","ru":"фарш"},{"dari":"کاک","translit":"kāk","ru":"пробка"},{"dari":"کاک‌پران","translit":"kākparān","ru":"штопор; приспособление для откупоривания бутылок"},{"dari":"کاهو","translit":"kāhu","ru":"салат-латук"},{"dari":"کبوتر","translit":"kabōtar","ru":"голубь"},{"dari":"کدو","translit":"kadu","ru":"тыква"},{"dari":"کدوچه","translit":"kaduča","ru":"кабачок (овощ)"},{"dari":"کرایی","translit":"karāyi","ru":"сковорода"},{"dari":"کف","translit":"kaf","ru":"пена"},{"dari":"کفگیر","translit":"kafgir","ru":"шумовка"},{"dari":"کلوله","translit":"kolōla","ru":"ком, колобок, шарик"},{"dari":"کنجد","translit":"konjed","ru":"кунжут"},{"dari":"گرد","translit":"gerd","ru":"круглый"},{"dari":"گریختن","translit":"gorēxtan","ru":"убегать, спасаться бегством"},{"dari":"گشنیز","translit":"gašniz","ru":"кориандр; петрушка"},{"dari":"گلپی","translit":"golpi","ru":"цветная капуста"},{"dari":"گندنه","translit":"gandana","ru":"лук-порей"},{"dari":"لاندی","translit":"lāndi","ru":"вяленый"},{"dari":"ماش","translit":"māš","ru":"чечевица"},{"dari":"محبوب","translit":"mahbub","ru":"любимый; популярный"},{"dari":"ملی","translit":"moli","ru":"редька"},{"dari":"ملی‌تراشی","translit":"molitarāš","ru":"терка"},{"dari":"ملی‌سرخک","translit":"molicorxak","ru":"редис"},{"dari":"مناصفه","translit":"monāsefa","ru":"разделение пополам"},{"dari":"نارنج","translit":"nārenj","ru":"померанец, грейпфрут"},{"dari":"نام بردن","translit":"nām bordan","ru":"упоминать"},{"dari":"نرم","translit":"narm","ru":"мягкий"},{"dari":"نشایسته","translit":"našāyesta","ru":"крахмал"},{"dari":"نعناع","translit":"na’nā’","ru":"мята"},{"dari":"نی","translit":"nay","ru":"тростник"},{"dari":"هنگام","translit":"hangām","ru":"во время"},{"dari":"کست","translit":"kāset","ru":"кассета"},{"dari":"قطره","translit":"qatra","ru":"капля"},{"dari":"پاکت","translit":"pāket","ru":"конверт"},{"dari":"جیب","translit":"jēb","ru":"карман"},{"dari":"کاسه","translit":"kāsa","ru":"миска"},{"dari":"خمیرمایه","translit":"xamirmāya","ru":"дрожжи"},{"dari":"به ندرت","translit":"ba nodrat","ru":"редко"},{"dari":"دیگ","translit":"dēg","ru":"котёл"},{"dari":"سلاطه","translit":"salāta","ru":"салат"},{"dari":"مواد","translit":"mawād","ru":"содержимое, вещества"},{"dari":"مواد گوشتی","translit":"mawād-e gōšti","ru":"мясные продукты"},{"dari":"نان قاق","translit":"nān-e qāq","ru":"сухари"},{"dari":"هاون","translit":"hāwan","ru":"ступка"},{"dari":"داغ","translit":"dāğ","ru":"раскалённый, горячий"},{"dari":"نوله","translit":"nōla","ru":"носик (чайника)"},{"dari":"قند","translit":"qand","ru":"сахар"},{"dari":"دشلمه کردن","translit":"dašlama kardan","ru":"пить чай вприкуску"}]  : index === 16 ? [{"dari":"روی کار آمدن","translit":"ruy-e kār āmadan","ru":"прийти к власти"},{"dari":"گفت و شنید","translit":"goft-o-šonid","ru":"переговоры"},{"dari":"خیز","translit":"xiz","ru":"прыжок"},{"dari":"دور خوردن","translit":"dōr xordan","ru":"свернуть"},{"dari":"پاره کردن","translit":"pāra kardan","ru":"порвать"},{"dari":"غیرعادلانه","translit":"ğeyr-e 'ādelāna","ru":"несправедливый"},{"dari":"از خارج","translit":"az xārej","ru":"из-за границы"},{"dari":"تلگرام","translit":"telegram","ru":"телеграмма"},{"dari":"از کنار ما","translit":"az kenār-e mā","ru":"мимо нас"},{"dari":"ارسال","translit":"ersâl","ru":"отправка"},{"dari":"اشغال","translit":"ešğâl","ru":"оккупация, захват"},{"dari":"افزایش","translit":"afzâyeš","ru":"увеличение"},{"dari":"اندیشه","translit":"andiša","ru":"мысль, идея"},{"dari":"باشنده","translit":"bâšanda","ru":"житель"},{"dari":"برگریزان","translit":"barg-rizân","ru":"листопад"},{"dari":"بودوباش","translit":"bud-o-bâš","ru":"проживание, быт"},{"dari":"بینا","translit":"binâ","ru":"зрячий"},{"dari":"پاره","translit":"pâra","ru":"кусок, часть"},{"dari":"پخت‌وپز","translit":"poxt-o-paz","ru":"приготовление пищи"},{"dari":"پرس‌وپال","translit":"pors-o-pâl","ru":"расспросы, выяснение"},{"dari":"پوشاک","translit":"pušâk","ru":"одежда"},{"dari":"تصرف","translit":"tasarrof","ru":"захват, овладение"},{"dari":"تلگرام","translit":"telegram","ru":"телеграмма"},{"dari":"توان","translit":"tavân","ru":"сила, способность"},{"dari":"تورید","translit":"tawrid","ru":"импорт, ввоз"},{"dari":"جستن (جو)","translit":"jostan (ju)","ru":"искать"},{"dari":"جستن (جه)","translit":"jostan (ja)","ru":"прыгать"},{"dari":"جنبیدن","translit":"jonbidan","ru":"двигаться"},{"dari":"چاپ","translit":"čâp","ru":"печать"},{"dari":"چارغواک","translit":"čârğavâk","ru":"четырёхугольный"},{"dari":"چشمک","translit":"čašmak","ru":"подмигивание"},{"dari":"چکک","translit":"čakak","ru":"капель"},{"dari":"خرامیدن","translit":"xarâmidan","ru":"шествовать, идти плавно"},{"dari":"خریدار","translit":"xaridâr","ru":"покупатель"},{"dari":"خواهرخوانده","translit":"xâharxwânda","ru":"город-побратим; названая сестра"},{"dari":"خوراک","translit":"xorâk","ru":"пища"},{"dari":"دارایی","translit":"dârâyi","ru":"имущество, собственность"},{"dari":"دانا","translit":"dânâ","ru":"знающий, мудрый"},{"dari":"درآمد","translit":"darâmad","ru":"доход"},{"dari":"درخشیدن","translit":"deraxšidan","ru":"сиять, блестеть"},{"dari":"درخواست","translit":"darxwâst","ru":"просьба, запрос"},{"dari":"در نظر داشت","translit":"dar nazar dâštan","ru":"иметь в виду"},{"dari":"دوخت","translit":"duxt","ru":"шитьё"},{"dari":"دوش","translit":"duš","ru":"вчера"},{"dari":"رفتار","translit":"raftâr","ru":"поведение"},{"dari":"رفت‌وآمد","translit":"raft-o-âmad","ru":"движение, хождение туда и обратно"},{"dari":"روند","translit":"rawand","ru":"процесс, ход"},{"dari":"روی دادن","translit":"ruy dâdan","ru":"происходить"},{"dari":"رویداد","translit":"ruydâd","ru":"событие"},{"dari":"زد و خورد","translit":"zad-o-xord","ru":"столкновение, драка"},{"dari":"زنده","translit":"zenda","ru":"живой"},{"dari":"ساختمان","translit":"sâxtemân","ru":"здание, строение"},{"dari":"سازمان","translit":"sâzmân","ru":"организация"},{"dari":"سلاح (اسلحه)","translit":"salâh (asleha)","ru":"оружие"},{"dari":"شتاب","translit":"šetâb","ru":"скорость, спешка"},{"dari":"شرکت کردن","translit":"šerkat kardan","ru":"участвовать"},{"dari":"شست‌وشو","translit":"šost-o-šu","ru":"стирка, мытьё"},{"dari":"شکفتن (شکوف)","translit":"šekoftan (šekuf)","ru":"цвести, расцветать"},{"dari":"شمردن (شمار)","translit":"šomordan (šomâr)","ru":"считать"},{"dari":"شناخت","translit":"šenâxt","ru":"знание, познание"},{"dari":"طبع","translit":"tab‘","ru":"характер, натура"},{"dari":"غور","translit":"ğor","ru":"размышление, изучение"},{"dari":"فرانسه","translit":"farânsa","ru":"Франция"},{"dari":"فریب","translit":"farib","ru":"обман"},{"dari":"فشرده","translit":"fešorda","ru":"сжатый, краткий"},{"dari":"کردار","translit":"kerdâr","ru":"поступок, действие"},{"dari":"کشتن (کش)","translit":"koštan (koš)","ru":"убивать"},{"dari":"کیفیت","translit":"keyfiyat","ru":"качество"},{"dari":"گردش","translit":"gardeš","ru":"прогулка, движение"},{"dari":"گرفتار","translit":"gereftâr","ru":"попавший в затруднительное положение"},{"dari":"گریز","translit":"gorêz","ru":"бегство, избегание"},{"dari":"گزارش","translit":"gozâreš","ru":"отчёт, доклад"},{"dari":"گفتار","translit":"goftâr","ru":"речь, высказывание"},{"dari":"گفتگو","translit":"goftogu","ru":"разговор, беседа"},{"dari":"لرزیدن","translit":"larzidan","ru":"дрожать"},{"dari":"نماینده‌گی","translit":"namâyandagi","ru":"представительство"},{"dari":"متحد","translit":"mottahed","ru":"объединённый"},{"dari":"متشکل","translit":"motašakkel","ru":"состоящий, сформированный"},{"dari":"مسکن (مساکن)","translit":"maskan (masâken)","ru":"жилище, жильё"},{"dari":"منعقد","translit":"mon‘aqed","ru":"заключённый, сформированный"},{"dari":"ناتوان","translit":"nâtavân","ru":"неспособный, бессильный"},{"dari":"ناخوان","translit":"nâxwân","ru":"неграмотный"},{"dari":"نارس","translit":"nâres","ru":"незрелый"},{"dari":"ناشناس","translit":"nâšenâs","ru":"неизвестный"},{"dari":"نماینده","translit":"namâyanda","ru":"представитель"},{"dari":"واصل","translit":"vâsel","ru":"достигший, прибывший"},{"dari":"یادداشت","translit":"yâddâšt","ru":"заметка, записка"}] : index === 15 ? [{"dari":"احتیاط","translit":"ehtiyât","ru":"осторожность"},{"dari":"استخوان","translit":"ostoxân","ru":"кость"},{"dari":"استفراغ","translit":"estefrâğ","ru":"рвота"},{"dari":"اکسریز","translit":"ekserêz","ru":"рентген"},{"dari":"اگر نه","translit":"agarna","ru":"иначе"},{"dari":"امبولانس","translit":"ambulâns","ru":"скорая помощь"},{"dari":"اندام","translit":"andâm","ru":"фигура, телосложение"},{"dari":"انگشت","translit":"angošt","ru":"палец"},{"dari":"بجلک","translit":"bojolak","ru":"лодыжка"},{"dari":"بدن","translit":"badan","ru":"тело"},{"dari":"برهنه","translit":"berahna","ru":"голый, обнажённый"},{"dari":"بستر","translit":"bestar","ru":"кровать"},{"dari":"بغل","translit":"bağal","ru":"бок, грудь"},{"dari":"بند","translit":"band","ru":"сустав"},{"dari":"بیلک","translit":"bêlak","ru":"лопатка"},{"dari":"پاشنه","translit":"pâšna","ru":"пятка"},{"dari":"پانسمان","translit":"pânsomân","ru":"перевязка, бинтование"},{"dari":"پچق‌","translit":"počok","ru":"приплюснутый, курносый нос"},{"dari":"پرستار","translit":"parastâr","ru":"медсестра, санитар"},{"dari":"پرهیز","translit":"parhêz","ru":"диета, воздержание"},{"dari":"پریدن","translit":"paridan","ru":"летать"},{"dari":"پریده","translit":"parida","ru":"бледный"},{"dari":"پشیمان","translit":"pešaymân","ru":"раскаивающийся, сожалеющий"},{"dari":"پلاستر","translit":"palastar","ru":"пластырь"},{"dari":"پلک","translit":"pelk","ru":"веко"},{"dari":"پندیدن","translit":"pondidan","ru":"опухать"},{"dari":"پولی‌کلینیک","translit":"pôlikelenik","ru":"поликлиника"},{"dari":"پیچکاری","translit":"pêčkâri","ru":"инъекция, укол"},{"dari":"تجویز","translit":"tajwiz","ru":"назначение, предписание"},{"dari":"تخته‌بند","translit":"taxtaband","ru":"шина, лубок"},{"dari":"تداوی","translit":"tadâwi","ru":"лечение"},{"dari":"تسکره","translit":"taskera","ru":"носилки"},{"dari":"تشخیص","translit":"tašxis","ru":"диагноз, диагностика"},{"dari":"تکلیف","translit":"taklif","ru":"недомогание, затруднение"},{"dari":"تکمه","translit":"tokma","ru":"пуговица"},{"dari":"تند","translit":"tond","ru":"острый, пряный"},{"dari":"تهیه","translit":"taheyya","ru":"подготовка, обеспечение"},{"dari":"تیر","translit":"tir","ru":"стрела, выстрел"},{"dari":"تینچر","translit":"tinčar","ru":"йод, настойка"},{"dari":"جراح","translit":"jarrâh","ru":"хирург"},{"dari":"جگر","translit":"jegar","ru":"печень"},{"dari":"چکاندن","translit":"čakândan","ru":"закапывать"},{"dari":"چهره","translit":"čehra","ru":"лицо"},{"dari":"چین","translit":"čin","ru":"морщина"},{"dari":"حرارت‌سنج","translit":"harâratsanj","ru":"термометр"},{"dari":"حمله","translit":"hamla","ru":"приступ, нападение"},{"dari":"حیف","translit":"hayf","ru":"жаль"},{"dari":"خرمایی","translit":"xormâyi","ru":"каштановый (о цвете волос)"},{"dari":"خون","translit":"xun","ru":"кровь"},{"dari":"داخله","translit":"dâxela","ru":"терапевтический, терапевт"},{"dari":"دلبدی","translit":"delbadi","ru":"тошнота"},{"dari":"دندان","translit":"dandân","ru":"зуб"},{"dari":"رتبه","translit":"rotba","ru":"ранг, степень"},{"dari":"رخسار","translit":"roxsâr","ru":"щека"},{"dari":"رسیده‌گی‌","translit":"rasidagi","ru":"уход, забота"},{"dari":"روده","translit":"rôda","ru":"кишечник"},{"dari":"زانو","translit":"zânu","ru":"колено"},{"dari":"زخم","translit":"zaxm","ru":"рана, язва"},{"dari":"زناق","translit":"zenâq","ru":"подбородок"},{"dari":"سرچرخی","translit":"sarčarxi","ru":"головокружение"},{"dari":"سرفه","translit":"sorfa","ru":"кашель"},{"dari":"سوار","translit":"sawâr","ru":"верхом, сидящий верхом"},{"dari":"سینه","translit":"sina","ru":"грудь"},{"dari":"شربت","translit":"šarbat","ru":"сироп, микстура"},{"dari":"شش","translit":"šoš","ru":"лёгкое"},{"dari":"شکستگی","translit":"šekastagi","ru":"перелом"},{"dari":"شکم","translit":"šekam","ru":"живот"},{"dari":"ضعف","translit":"zo’f","ru":"слабость, обморочное состояние"},{"dari":"عاجل","translit":"‘âjel","ru":"срочный, неотложный"},{"dari":"عرق","translit":"‘araq","ru":"пот"},{"dari":"عصب","translit":"‘asab (a’sâb)","ru":"нерв"},{"dari":"عضله","translit":"‘azala","ru":"мышца"},{"dari":"عطسه","translit":"‘atsa","ru":"чихание"},{"dari":"عقل","translit":"‘aql","ru":"разум, интеллект"},{"dari":"عملیات","translit":"‘amaleyyât","ru":"операция"},{"dari":"عینِ...","translit":"‘ayn-e...","ru":"такой же, тот же самый"},{"dari":"غرغره کردن","translit":"ğarğara kardan","ru":"полоскать горло"},{"dari":"فازه","translit":"fâža","ru":"зевать"},{"dari":"فشار","translit":"fešâr","ru":"давление"},{"dari":"قطره","translit":"qatra","ru":"капля"},{"dari":"قطره‌چکان","translit":"qatračakân","ru":"пипетка"},{"dari":"قی","translit":"qay","ru":"рвота"},{"dari":"قی و شکم","translit":"qay-o-šekam","ru":"расстройство желудка"},{"dari":"کدوگک","translit":"kadugak","ru":"медицинская банка"},{"dari":"کش کردن","translit":"kaš kardan","ru":"тянуть"},{"dari":"کمر","translit":"kamar","ru":"поясница, талия"},{"dari":"گردن","translit":"gardan","ru":"шея"},{"dari":"گرده","translit":"gorda","ru":"почка"},{"dari":"گلون","translit":"golun","ru":"горло"},{"dari":"گوشه","translit":"gôša","ru":"угол"},{"dari":"گولی","translit":"gôli","ru":"таблетка"},{"dari":"گیچ","translit":"gič","ru":"головокружительный, испытывающий головокружение"},{"dari":"لای","translit":"lây","ru":"грязь, ил"},{"dari":"لچ","translit":"loč","ru":"голый, обнажённый"},{"dari":"لغزیدن","translit":"lağzidan","ru":"поскользнуться"},{"dari":"ماهیچه","translit":"mâhiča","ru":"мышца, икра"},{"dari":"مثانه","translit":"masâna","ru":"мочевой пузырь"},{"dari":"مرض (امراض)","translit":"maraz (amrâz)","ru":"болезнь (болезни)"},{"dari":"مزاج","translit":"mazâj","ru":"темперамент, состояние"},{"dari":"مسکن","translit":"mosakken","ru":"обезболивающее"},{"dari":"مشکوله","translit":"moškôla","ru":"грелка"},{"dari":"معالجه","translit":"mo’âleja","ru":"лечение"},{"dari":"معاینه","translit":"mo’âyena","ru":"осмотр, обследование"},{"dari":"معده","translit":"me’da","ru":"желудок"},{"dari":"مغز","translit":"mağz","ru":"мозг"},{"dari":"میانه","translit":"meyâna","ru":"середина"},{"dari":"ناخن","translit":"nâxon","ru":"ноготь"},{"dari":"نالیدن","translit":"nâlidan","ru":"стонать"},{"dari":"نبض","translit":"nabz","ru":"пульс"},{"dari":"نرس","translit":"nars","ru":"медсестра"},{"dari":"نرم","translit":"narm","ru":"мягкий"},{"dari":"نسخه","translit":"nosxa","ru":"рецепт"},{"dari":"نفستنگی","translit":"nafastangi","ru":"одышка"},{"dari":"نمبر","translit":"nambar","ru":"номер"},{"dari":"نیک","translit":"nêk","ru":"хороший"},{"dari":"ورم","translit":"waram","ru":"опухоль, отёк"},{"dari":"کرتهـا","translit":"kart-hā","ru":"грядки"},{"dari":"بطرف کسی گرفتن","translit":"ba taraf-e kasi gereftan","ru":"целиться в кого-либо"},{"dari":"فشار خون","translit":"fešâr-e xun","ru":"кровяное давление"},{"dari":"خیاط","translit":"xayyât","ru":"портной"},{"dari":"سنگ گرده","translit":"sang-e gorde","ru":"камень в почке"},{"dari":"حمله","translit":"hamla","ru":"приступ, нападение"},{"dari":"بجا کردن","translit":"bejā kardan","ru":"вправить, поставить на место (вывих)"}] : index === 14 ? [{"dari":"اتکا","translit":"ettekâ","ru":"опора"},{"dari":"اجمالی","translit":"ejmâli","ru":"краткий, беглый"},{"dari":"ارباب","translit":"arbâb","ru":"помещик, хозяин"},{"dari":"ارگان","translit":"orgân","ru":"орган (власти, печатный и т. п.)"},{"dari":"افشا","translit":"efšâ’","ru":"разоблачение"},{"dari":"امپراطوری","translit":"emperâtôri","ru":"империя"},{"dari":"اوج","translit":"awj","ru":"вершина, высшая точка"},{"dari":"باستان = باستانی","translit":"bâstân = bâstâni","ru":"древний, старинный"},{"dari":"برجسته","translit":"barjasta","ru":"выдающийся"},{"dari":"برقراری","translit":"barqarâri","ru":"установление"},{"dari":"بقیه (بقایا)","translit":"baqeya (baqâyâ)","ru":"остаток, пережиток"},{"dari":"بیانگر","translit":"bayângar","ru":"выразитель"},{"dari":"بی‌رحم","translit":"bêrahm","ru":"безжалостный"},{"dari":"بیگانه","translit":"bêgâna","ru":"чужой"},{"dari":"پابرجا","translit":"pâ-bar-jâ","ru":"прочный, устойчивый"},{"dari":"پیام","translit":"payâm","ru":"послание"},{"dari":"پیریزی","translit":"payrêzi","ru":"закладывание (основ и т. п.)"},{"dari":"پیشبرد","translit":"pêšbord","ru":"проведение (мероприятия)"},{"dari":"پیوسته","translit":"paywasta","ru":"постоянно"},{"dari":"تأثیر","translit":"ta’sir","ru":"влияние, впечатление"},{"dari":"تاج","translit":"tâj","ru":"корона"},{"dari":"تبعه (اتباع)","translit":"tab’a (atbâ’)","ru":"гражданин, подданный"},{"dari":"تحتِ ...","translit":"taht-e...","ru":"под (предлог)"},{"dari":"تخت","translit":"taxt","ru":"трон"},{"dari":"تخلیه","translit":"taxleya","ru":"эвакуация; выгрузка"},{"dari":"تدبیر (تدابیر)","translit":"tadbir (tadâbir)","ru":"мероприятие"},{"dari":"ترک","translit":"tark","ru":"остановление, отречение"},{"dari":"تشکیل دادن","translit":"taškil dâdan","ru":"образовывать, формировать"},{"dari":"تظاهرات","translit":"tazâhor","ru":"демонстрация (протеста)"},{"dari":"توفیق یافتن","translit":"tawfiq yâftan","ru":"добиться (чего-либо)"},{"dari":"ثمر","translit":"samar","ru":"плод, результат"},{"dari":"جانب (جوانب)","translit":"janeb (jawâneb)","ru":"сторона"},{"dari":"جبال","translit":"jebâl","ru":"горы"},{"dari":"جوهر (جواهر)","translit":"jawhar (jawâher)","ru":"драгоценный камень"},{"dari":"جیب","translit":"jêb","ru":"карман"},{"dari":"چرخش","translit":"čarxeš","ru":"поворот"},{"dari":"حاد","translit":"hâdd","ru":"острый, обострённый"},{"dari":"حاشیه (حواشی)","translit":"hâšeya (hawâši)","ru":"край, поля"},{"dari":"حکمران","translit":"hokmrân","ru":"правитель"},{"dari":"حیات","translit":"hayât","ru":"жизнь"},{"dari":"خاطره (خاطرات)","translit":"xâtera (xawâter)","ru":"память"},{"dari":"خاندان","translit":"xândân","ru":"династия"},{"dari":"دایر کردن","translit":"dâyer kardan","ru":"созывать, организовывать"},{"dari":"دسیسه (دسایس)","translit":"dasisa (dasâyes)","ru":"происки"},{"dari":"دیار","translit":"deyâr","ru":"страна, край"},{"dari":"ذهنی","translit":"zahni","ru":"субъективный"},{"dari":"رژیم","translit":"režim","ru":"строй, режим"},{"dari":"رشوه","translit":"rešwa","ru":"взятка"},{"dari":"رشوه‌ستانی","translit":"rešwasetâni","ru":"взяточничество"},{"dari":"روزافزون","translit":"rôzafzun","ru":"всё возрастающий"},{"dari":"زادگاه","translit":"zâdgâh","ru":"родина (место рождения)"},{"dari":"سرکوب","translit":"sarkôb","ru":"подавление, усмирение"},{"dari":"سلاح (اسلحه)","translit":"selâh (asleha)","ru":"оружие"},{"dari":"سلطان (سلاطین)","translit":"soltân (salâtin)","ru":"царь, султан"},{"dari":"سلطنت","translit":"saltanat","ru":"монархия"},{"dari":"سقوط","translit":"soqut","ru":"падение, низвержение"},{"dari":"سودخوار","translit":"sôdxâr","ru":"ростовщик"},{"dari":"سیاستمدار","translit":"seyâsatmadâr","ru":"политический деятель"},{"dari":"شاهد (شواهد)","translit":"šâhed (šawâhed)","ru":"свидетельство"},{"dari":"شاهد (شهود)","translit":"šâhed (šohud)","ru":"свидетель"},{"dari":"شجاع","translit":"šojâ’","ru":"смелый, храбрый"},{"dari":"شکست","translit":"šekast","ru":"поражение"},{"dari":"صحرا (صحاری)","translit":"sahrâ (sahâri)","ru":"пустыня"},{"dari":"صرف نظر کردن","translit":"sarf-e nazar kardan","ru":"отказываться"},{"dari":"صورتگر","translit":"suratgar","ru":"художник, портретист"},{"dari":"طبیب (اطبا)","translit":"tabib (atebbâ)","ru":"лекарь, врач"},{"dari":"طریق (طرق)","translit":"tariq (toroq)","ru":"путь"},{"dari":"عارضه (عوارض)","translit":"‘âreza (‘awârez)","ru":"поломка, неисправность"},{"dari":"عامل (عوامل)","translit":"‘âmel (‘awâmel)","ru":"фактор"},{"dari":"عامل (عمال)","translit":"‘âmel (‘ommâl)","ru":"агент"},{"dari":"عرصه","translit":"‘arsa","ru":"сфера (деятельности)"},{"dari":"عقد","translit":"‘aqd","ru":"заключение (договора и т. п.)"},{"dari":"عمق (اعماق)","translit":"‘omq (a’mâq)","ru":"глубина"},{"dari":"عنصر (عناصر)","translit":"‘onsor (‘anâser)","ru":"элемент"},{"dari":"عینی","translit":"‘ayni","ru":"объективный"},{"dari":"غصب","translit":"ğasb","ru":"захват, узурпация"},{"dari":"غیور","translit":"ğayur","ru":"отважный, смелый"},{"dari":"فتح (فتوح)","translit":"fath (fotuh)","ru":"победа, завоевание"},{"dari":"فرد (افراد)","translit":"fard (afrâd)","ru":"человек, индивидуум"},{"dari":"فرزند","translit":"farzand","ru":"сын, потомок"},{"dari":"فساد","translit":"fesâd","ru":"развращённость, коррупция"},{"dari":"فعالیت","translit":"fa’’âleyat","ru":"деятельность"},{"dari":"فن (فنون)","translit":"fann (fonun)","ru":"искусство, мастерство"},{"dari":"فیودالیزم","translit":"fyudâlizm","ru":"феодализм"},{"dari":"قاچاق","translit":"qâčâq","ru":"контрабанда"},{"dari":"قبولاندن","translit":"qabulândan","ru":"навязывать (заставлять принимать)"},{"dari":"قتل","translit":"qatl","ru":"убийство"},{"dari":"قدرت","translit":"qodrat","ru":"власть"},{"dari":"قرارداد","translit":"qarârdâd","ru":"договор"},{"dari":"قوه (قوا)","translit":"qowwa (qowâ)","ru":"сила"},{"dari":"کسب","translit":"kasb","ru":"получение, приобретение"},{"dari":"کنگره","translit":"kongara","ru":"съезд"},{"dari":"کمایی","translit":"kamâyi","ru":"зарабатывать, заслуживать"},{"dari":"گسترش","translit":"gostareš","ru":"распространение"},{"dari":"لاینحل","translit":"lâyanhall","ru":"неразрешимый, нерешённый"},{"dari":"ماحول","translit":"mâhawl","ru":"окружающий"},{"dari":"مایحتاج","translit":"mâyahtâj","ru":"необходимый; предметы необходимости"},{"dari":"مبادله","translit":"mobâdela","ru":"обмен"},{"dari":"متذکره","translit":"motazakkera","ru":"(выше)упомянутый"},{"dari":"محدود","translit":"mahdud","ru":"ограниченный"},{"dari":"محک","translit":"mahakk","ru":"пробный камень"},{"dari":"محیط","translit":"mohit","ru":"среда, окружение, обстановка"},{"dari":"مخابره","translit":"moxâbera","ru":"коммуникация, связь (телеграфная, телефонная и т. п.)"},{"dari":"مذکور","translit":"mazkur","ru":"(выше)упомянутый"},{"dari":"مرام","translit":"marâm","ru":"программа, платформа"},{"dari":"مزید","translit":"mazid","ru":"дальнейший, ещё больший"},{"dari":"مقام","translit":"maqâm","ru":"пост, орган (власти)"},{"dari":"منصوب","translit":"mansub","ru":"назначенный (на должность)"},{"dari":"منعقد","translit":"mon’aqed","ru":"заключённый (о договоре); состоявшийся (о собрании)"},{"dari":"موج (امواج)","translit":"mawj (amwâj)","ru":"волна"},{"dari":"موسوم","translit":"mawsum","ru":"называемый"},{"dari":"موصوف","translit":"mawsuf","ru":"он, упомянутый"},{"dari":"مؤید","translit":"mo’ayyed","ru":"подтверждающий"},{"dari":"مهیا","translit":"mohayyâ","ru":"подготовленный"},{"dari":"نابغه (نوابغ)","translit":"nâbeğa (nawâbeğ)","ru":"гений"},{"dari":"نافذ","translit":"nâfez","ru":"введённый в действие (о законе и т. п.)"},{"dari":"نفوذ","translit":"nofuz","ru":"влияние, авторитет"},{"dari":"نهضت","translit":"nahzat","ru":"движение (политическое)"},{"dari":"واردات","translit":"wâredât","ru":"импорт (предметы импорта)"},{"dari":"وطنپرست","translit":"watanparast","ru":"патриот(ический)"},{"dari":"یورش","translit":"yureš","ru":"нападение"},{"dari":"فیلسوف (فلاسفه)","translit":"faylasuf (falâsefa)","ru":"философ"},{"dari":"ناموس (نوامیس)","translit":"nâmus (nawâmis)","ru":"честь, достоинство"},{"dari":"نصیحت (نصایح)","translit":"nasihat (nasâyeh)","ru":"совет, наставление"},{"dari":"واقعه (وقایع)","translit":"wâqe’a (waqâye’)","ru":"событие"},{"dari":"اجتماعیات","translit":"ejtemā'iyyāt","ru":"общественные науки"},{"dari":"عینی","translit":"'Ayni","ru":"Айни (псевдоним)"},{"dari":"دیورند","translit":"Dēwarand","ru":"Диваранд (псевдоним)"},{"dari":"وطندار","translit":"watandār","ru":"земляк"}] : index === 17 ? [{"dari":"ارسی","translit":"orsi","ru":"окно"},{"dari":"اشاره","translit":"ešâra","ru":"указание, сигнал"},{"dari":"اشک","translit":"ašk","ru":"слеза"},{"dari":"التماس","translit":"eltemâs","ru":"мольба, упрашивание"},{"dari":"اندازه","translit":"andâza","ru":"размер"},{"dari":"اندوه","translit":"andôh","ru":"печаль"},{"dari":"آه","translit":"âh","ru":"вздох"},{"dari":"برخلافِ ...","translit":"bar xelâf-e...","ru":"в отличие от..."},{"dari":"بم","translit":"bam","ru":"бас; низкий (о голосе)"},{"dari":"بندی","translit":"bandi","ru":"заключённый (в тюрьму)"},{"dari":"پاسخ (پاسخ)","translit":"pâsox (pâsex)","ru":"ответ"},{"dari":"پدیدار","translit":"padidâr","ru":"видимый, явный"},{"dari":"پذیرفتن","translit":"paziroftan","ru":"принимать"},{"dari":"پرتو","translit":"partaw","ru":"свет, луч"},{"dari":"پریشان","translit":"parêšân","ru":"взволнованный"},{"dari":"پنهان","translit":"penhân","ru":"скрытый, спрятанный"},{"dari":"پهن","translit":"pahn","ru":"распространять"},{"dari":"پیوست","translit":"paywast","ru":"соединение; соединённый"},{"dari":"تار","translit":"târ","ru":"нить, струна"},{"dari":"تأسف","translit":"ta’assof","ru":"сожаление"},{"dari":"تباه کار","translit":"tabâhkâr","ru":"злодей, преступник"},{"dari":"تپیدن","translit":"tapidan","ru":"трепетать, биться (о сердце)"},{"dari":"تضرع","translit":"tazzaro","ru":"упрашивание, мольба"},{"dari":"تغییر","translit":"tağyir","ru":"изменение"},{"dari":"تف","translit":"tof","ru":"плевок"},{"dari":"تفسیر","translit":"tafsir","ru":"толкование, комментарий"},{"dari":"تکان","translit":"takân","ru":"сотрясение, шевеление"},{"dari":"تمسخر","translit":"tamasxor","ru":"насмешка, ирония"},{"dari":"تناسب","translit":"tanâsob","ru":"пропорция"},{"dari":"تهدید","translit":"tahdid","ru":"угроза"},{"dari":"تیره","translit":"tira","ru":"тёмный"},{"dari":"جاری","translit":"jâri","ru":"текущий"},{"dari":"جریان","translit":"jeryân","ru":"течение"},{"dari":"جلو","translit":"jelaw","ru":"перед"},{"dari":"جویبار","translit":"jôybâr","ru":"ручей, река"},{"dari":"جهت","translit":"jehat","ru":"сторона; причина"},{"dari":"چت","translit":"čat","ru":"потолок"},{"dari":"چلپاسه","translit":"čelpâsa","ru":"ящерица"},{"dari":"حرص","translit":"hers","ru":"жадность, алчность"},{"dari":"حریص","translit":"haris","ru":"жадный, алчный"},{"dari":"حسرت","translit":"hasrat","ru":"скорбь, сожаление"},{"dari":"حکم (احکام)","translit":"hokm (ahkâm)","ru":"приказ, предписание"},{"dari":"حواله","translit":"hawâla","ru":"направлять (документ и т. д.)"},{"dari":"حیرت","translit":"hayrat","ru":"изумление"},{"dari":"حیله","translit":"hila","ru":"хитрость"},{"dari":"خزیدن","translit":"xazidan","ru":"ползти"},{"dari":"خشونت","translit":"xošunat","ru":"грубость, резкость"},{"dari":"خودرو","translit":"xodrô","ru":"дикорастущий"},{"dari":"خورشید","translit":"xoršêd","ru":"солнце"},{"dari":"خوشایند","translit":"xošâyand","ru":"приятный"},{"dari":"خیال","translit":"xeyâl","ru":"мысль, воображение"},{"dari":"خیره","translit":"xira","ru":"пристально смотрящий"},{"dari":"داد","translit":"dâd","ru":"крик, вопль"},{"dari":"درماندن","translit":"darmândan","ru":"уставать; попадать в беду"},{"dari":"دستخط","translit":"dastxatt","ru":"автограф, подпись"},{"dari":"دستمال","translit":"dastmâl","ru":"платок"},{"dari":"دست‌وپاچگی","translit":"dastopâčagi","ru":"растерянность"},{"dari":"دستور","translit":"dastur","ru":"приказ, указание"},{"dari":"دشمن","translit":"došman","ru":"враг, противник"},{"dari":"دعوا","translit":"da’wâ","ru":"ссора, тяжба"},{"dari":"دنبالِ...","translit":"donbâl-e...","ru":"сзади, позади"},{"dari":"دوردست","translit":"durdast","ru":"отдалённый"},{"dari":"دیده","translit":"dida","ru":"глаз (кн.)"},{"dari":"دیوانه","translit":"dêwâna","ru":"безумный, сумасшедший"},{"dari":"دیوانه‌وار","translit":"dêwânawâr","ru":"безумный (о чём-либо)"},{"dari":"ذوق","translit":"zawq","ru":"радость, удовольствие"},{"dari":"ذهن (اذهان)","translit":"zehn (azhân)","ru":"ум, рассудок"},{"dari":"رسمی","translit":"rasmi","ru":"официальный"},{"dari":"رشته","translit":"rešta","ru":"нить, вереница"},{"dari":"رقتبار","translit":"reqqatbâr","ru":"жалкий, плачевный"},{"dari":"رقصیدن","translit":"raqsidan","ru":"танцевать"},{"dari":"رؤیا","translit":"ro’yâ","ru":"сновидение, грёзы"},{"dari":"رها","translit":"rahâ","ru":"выпускать, освобождать"},{"dari":"زشت","translit":"zešt","ru":"некрасивый, безобразный"},{"dari":"زمزمه","translit":"zomzoma","ru":"бормотание"},{"dari":"ساحه","translit":"sâha","ru":"территория"},{"dari":"ساکت","translit":"sâket","ru":"молчащий, тихий"},{"dari":"سبزه","translit":"sabza","ru":"трава, зелень"},{"dari":"سخن","translit":"soxan","ru":"речь, слова"},{"dari":"سراغ","translit":"sorâğ","ru":"поиски"},{"dari":"سرچشمه","translit":"sarčašma","ru":"источник, ключ"},{"dari":"سرش","translit":"sereš","ru":"клей"},{"dari":"سرگذشت","translit":"sargozašt","ru":"происшествие"},{"dari":"سرگردان","translit":"sargardân","ru":"блуждающий"},{"dari":"سرور","translit":"sorur","ru":"радость"},{"dari":"سروصدا","translit":"sarosadâ","ru":"шум и гам"},{"dari":"سوءظن","translit":"su’ezann","ru":"подозрение"},{"dari":"شرعی","translit":"šar’i","ru":"шариатский, соответствующий закону шариата"},{"dari":"شکایت","translit":"šekâyat","ru":"жалоба"},{"dari":"شوق","translit":"šawq","ru":"сильное желание"},{"dari":"شیطان","translit":"šaytân","ru":"дьявол, сатана"},{"dari":"صبحگاهی","translit":"sobhgâhi","ru":"утренний"},{"dari":"صبر","translit":"sabr","ru":"ждать, терпеть"},{"dari":"صخره","translit":"saxra","ru":"скала"},{"dari":"صف (صفوف)","translit":"saff (sofuf)","ru":"ряд, строй (например, солдат)"},{"dari":"طلوع","translit":"tolu’","ru":"восход"},{"dari":"طنین انداختن","translit":"tanin andâxtan","ru":"звучать, раздаваться"},{"dari":"طول","translit":"tul","ru":"длина"},{"dari":"ظالم","translit":"zâlem","ru":"тиран, несправедливый человек"},{"dari":"عارض","translit":"‘ârez","ru":"проситель, истец"},{"dari":"عجیب","translit":"‘ajib","ru":"удивительный"},{"dari":"عصبانی","translit":"‘asabâni","ru":"раздражённый, рассерженный"},{"dari":"عظمت","translit":"‘azamat","ru":"величие"},{"dari":"عظیم","translit":"‘azim","ru":"большой, величественный"},{"dari":"غار","translit":"ğâr","ru":"нора, пещера"},{"dari":"غرور","translit":"ğorur","ru":"гордость, высокомерие"},{"dari":"غصب","translit":"ğasb","ru":"захват, присвоение"},{"dari":"غصه","translit":"ğossa","ru":"горе, печаль"},{"dari":"فشردن (فشار)","translit":"fešordan (fešâr)","ru":"нажимать, сжимать"},{"dari":"فیصله","translit":"faysala","ru":"решение"},{"dari":"قباله","translit":"qabâla","ru":"купчая (документ)"},{"dari":"قسم","translit":"qasam","ru":"клятва; клясться"},{"dari":"قصد","translit":"qasd","ru":"намерение, умысел"},{"dari":"قضیه (قضایا)","translit":"qazeyya (qazâyâ)","ru":"событие, дело (судебное)"},{"dari":"قطار","translit":"qatâr","ru":"ряд; патронная лента"},{"dari":"قله (قلل)","translit":"qolla (qolal)","ru":"вершина (горы)"},{"dari":"قهقهه","translit":"qahqaha","ru":"хохот"},{"dari":"کج","translit":"kaj","ru":"кривой"},{"dari":"کلبه","translit":"kolba","ru":"лачуга"},{"dari":"کله","translit":"kalla","ru":"голова"},{"dari":"کودک","translit":"kôdak","ru":"ребёнок"},{"dari":"گام","translit":"gâm","ru":"шаг"},{"dari":"گربه","translit":"gorba","ru":"кошка (кн.)"},{"dari":"گرد","translit":"gerd","ru":"круглый"},{"dari":"گریختن","translit":"gorêxtan","ru":"убегать"},{"dari":"گز","translit":"gaz","ru":"мера длины (около 1 м)"},{"dari":"گناه","translit":"gonâh","ru":"вина, грех"},{"dari":"لاشه","translit":"lâša","ru":"труп"},{"dari":"لبخند","translit":"labxand","ru":"улыбка"},{"dari":"لحظه","translit":"lahza","ru":"мгновение"},{"dari":"لحن (الحان)","translit":"lahn (alhân)","ru":"тон (речи), интонация"},{"dari":"لخت","translit":"laxt","ru":"мгновение (кн.)"},{"dari":"للمی","translit":"lalmi","ru":"богарный, неполивной"},{"dari":"للمی‌کاری","translit":"lalmikâri","ru":"богарное земледелие"},{"dari":"ماده (مواد)","translit":"mâdda (mawâdd)","ru":"статья (закона и т. п.)"},{"dari":"متهم","translit":"mottaham","ru":"обвиняемый"},{"dari":"مجسم","translit":"mojassam","ru":"воплощённый, олицетворённый"},{"dari":"محبت","translit":"mohabbat","ru":"любовь"},{"dari":"مزور","translit":"mozawwer","ru":"лживый, хитрый"},{"dari":"مصمم","translit":"mosammem","ru":"принявший решение, твёрдый"},{"dari":"مضحک","translit":"moshek","ru":"смешной, забавный"},{"dari":"ملایم","translit":"mlâyem","ru":"мягкий, ласковый"},{"dari":"ناگهان","translit":"nâgahân","ru":"вдруг, неожиданно"},{"dari":"نسیم","translit":"nasim","ru":"лёгкий ветерок"},{"dari":"نفرت","translit":"nefrat","ru":"ненависть, отвращение"},{"dari":"نگهداری","translit":"negahdâri","ru":"присмотр, оберегание"},{"dari":"نگهداشتن","translit":"negahdâštan","ru":"беречь, задерживать"},{"dari":"نمودار","translit":"namudâr","ru":"видимый, появляющийся"},{"dari":"نور","translit":"nur","ru":"свет, луч"},{"dari":"نوکر","translit":"nawkar","ru":"слуга, батрак"},{"dari":"نهادن (نه)","translit":"nehâdan (neh)","ru":"класть, ставить"},{"dari":"نیلگون","translit":"nilgun","ru":"голубой"},{"dari":"واپس","translit":"wâpas","ru":"обратно"},{"dari":"هجوم","translit":"hojum","ru":"нападение, штурм"},{"dari":"همدست","translit":"hamdast","ru":"сообщник"},{"dari":"یکنواخت","translit":"yaknawâxt","ru":"однообразный"},{"dari":"فروریختن","translit":"foru rixtan","ru":"выливаться, разливаться"}] : index === 18 ? [{"dari":"ادا","translit":"adâ","ru":"выполнение, произнесение"},{"dari":"اشاره","translit":"ešâra","ru":"указание, знак"},{"dari":"اشتهار","translit":"eštehâr","ru":"известность, реклама"},{"dari":"آفتابه","translit":"âftâba","ru":"кувшин для омовения"},{"dari":"افگندن","translit":"afgandan","ru":"бросать"},{"dari":"آماسیده","translit":"âmâsida","ru":"распухший"},{"dari":"انگشتر","translit":"angoštar","ru":"перстень, кольцо"},{"dari":"بازیچه","translit":"bâziča","ru":"игрушка"},{"dari":"بانگ","translit":"bâng","ru":"громкий крик"},{"dari":"بلع کردن","translit":"bal’ kardan","ru":"глотать, проглатывать"},{"dari":"بلوط","translit":"balut","ru":"дуб"},{"dari":"بیکس","translit":"bêkas","ru":"одинокий, не имеющий родных"},{"dari":"پاتنت","translit":"pâtent","ru":"патентованный"},{"dari":"پارچه","translit":"pârča","ru":"кусок, обрывок"},{"dari":"پارس","translit":"pârs","ru":"лай"},{"dari":"پرتو","translit":"partaw","ru":"свет, сияние"},{"dari":"پریشان","translit":"parêšân","ru":"разбросанный, взволнованный"},{"dari":"پیش آمدن","translit":"pêš âmadan","ru":"подходить, случаться, происходить"},{"dari":"تجاهل","translit":"tajâhol","ru":"притворство несведущим"},{"dari":"تزریق","translit":"tazriq","ru":"инъекция"},{"dari":"تعیین","translit":"ta’yin","ru":"назначение, определение"},{"dari":"تفتیش","translit":"taftiš","ru":"ревизия, проверка"},{"dari":"تمسخر","translit":"tamasxor","ru":"насмешка, издевательство, ирония"},{"dari":"تند","translit":"tond","ru":"острый (о пище); сильный (о ветре)"},{"dari":"تنک","translit":"tonok","ru":"тонкий, редкий"},{"dari":"تیراسو","translit":"tirâsô","ru":"терасо, облицовочный камень"},{"dari":"جوره","translit":"jôra","ru":"пара"},{"dari":"جویده","translit":"jawida","ru":"невнятно (буквально — жуя)"},{"dari":"چادر","translit":"câdar","ru":"женский головной платок"},{"dari":"چله","translit":"čala","ru":"обручальное кольцо"},{"dari":"چیچک","translit":"čêčak","ru":"оспа"},{"dari":"حامله","translit":"hâmela","ru":"беременная, стельная"},{"dari":"حمایل","translit":"hamâyel","ru":"ожерелье"},{"dari":"خداوند","translit":"xodâwand","ru":"бог"},{"dari":"خرید","translit":"xarid","ru":"покупка"},{"dari":"خریدار","translit":"xaridâr","ru":"покупатель"},{"dari":"خریطه","translit":"xarita","ru":"сумка, мешок"},{"dari":"خلاص شدن","translit":"xalâs šodan","ru":"избавляться"},{"dari":"خوشه","translit":"xôša","ru":"колос, гроздь"},{"dari":"دستار","translit":"dastâr","ru":"чалма"},{"dari":"دسته","translit":"dasta","ru":"группа людей; в путь"},{"dari":"رهسپار شدن / روانه شدن","translit":"rahsepâr šodan / rawâna šodan","ru":"отправиться (в путь)"},{"dari":"زنبور","translit":"zanbôr","ru":"оса"},{"dari":"زهرخند","translit":"zahrxand","ru":"язвительная усмешка"},{"dari":"سحرخیز","translit":"saharxêz","ru":"просыпающийся рано утром"},{"dari":"سلب","translit":"salb","ru":"отнятие, лишение"},{"dari":"شمردن","translit":"šomordan (šomâr)","ru":"считать"},{"dari":"طلبگار","translit":"talabgâr","ru":"сват, претендент, сватающийся"},{"dari":"عدد","translit":"‘adad","ru":"штука (счётное слово)"},{"dari":"عوعو","translit":"‘aw’aw","ru":"лай"},{"dari":"فاتحه","translit":"fâteha","ru":"мусульманские поминки"},{"dari":"فاژه","translit":"fâža","ru":"зевок, зевота"},{"dari":"فرش کردن","translit":"farš kardan","ru":"настилать, мостить, устилать"},{"dari":"قشنگ","translit":"qašang","ru":"красивый"},{"dari":"کثیف","translit":"kasif","ru":"грязный"},{"dari":"کره","translit":"kara","ru":"браслет"},{"dari":"کنده کردن","translit":"kanda kardan","ru":"выбить, выгравировать"},{"dari":"کفایت کردن","translit":"kefâyat kardan","ru":"быть достаточным"},{"dari":"گربه","translit":"gorba","ru":"кошка"},{"dari":"گردنبند","translit":"gardanband","ru":"ожерелье, бусы"},{"dari":"گستردن","translit":"gostordan (gostar)","ru":"расстилать"},{"dari":"گلو","translit":"golô = golun","ru":"горло"},{"dari":"گوشواره","translit":"gôšwâra","ru":"серьга"},{"dari":"لاکت","translit":"lâket","ru":"брошь"},{"dari":"لحاف","translit":"lehâf","ru":"одеяло"},{"dari":"لحظه","translit":"lahza","ru":"миг, мгновение"},{"dari":"لطیف","translit":"latif","ru":"нежный, ласковый, милый"},{"dari":"لعنت","translit":"la’nat","ru":"проклятье"},{"dari":"مایع","translit":"mâye’","ru":"жидкость"},{"dari":"مایه کردن","translit":"mâya kardan","ru":"заквашивать"},{"dari":"متقلب","translit":"motaqalleb","ru":"плут, мошенник"},{"dari":"متوحش","translit":"motawahheš","ru":"испуганный"},{"dari":"محیط","translit":"mohit","ru":"среда, обстановка"},{"dari":"مخمل","translit":"maxmal","ru":"бархат"},{"dari":"مزمن","translit":"mozmen","ru":"хронический"},{"dari":"مگر","translit":"magar","ru":"но (союз)"},{"dari":"موهبت","translit":"mawhebat","ru":"милость, дар, благо"},{"dari":"ناتوان","translit":"nâtawân","ru":"немощный"},{"dari":"نالش","translit":"nâleš","ru":"стон"},{"dari":"نوک","translit":"nôk","ru":"кончик, острие"},{"dari":"نیم‌سیره","translit":"nimsêra","ru":"весом в полсира (3,5 кг)"},{"dari":"وبا","translit":"wabâ","ru":"холера"},{"dari":"صدای عو عو","translit":"sedā-ye 'aw-'aw","ru":"лай"},{"dari":"تا ناوقت ها","translit":"tā nāwaqt-hā","ru":"до позднего времени"},{"dari":"روپیۀ کلمه دار","translit":"rupiya-ye kalema-dār","ru":"банкнота с надписью"},{"dari":"در","translit":"dar","ru":"в, под"},{"dari":"نادانی","translit":"nādāni","ru":"незнание"},{"dari":"به گفت کسی کردن","translit":"ba goft-e kasi kardan","ru":"послушаться кого-л."},{"dari":"دواساز","translit":"dawāsāz","ru":"аптекарь"},{"dari":"کمر","translit":"kamar","ru":"поясница"}] : index === 20 ? [{"dari":"افلاطون","translit":"Eflâtun","ru":"Платон"},{"dari":"آگاه","translit":"âgâh","ru":"сведущий, сознательный"},{"dari":"اوطراق","translit":"ôtrâq","ru":"привал, бивак"},{"dari":"بابا / بابه","translit":"bâba / bâbe","ru":"папа, папаша"},{"dari":"بزرگوار","translit":"bozorgwâr","ru":"великий, уважаемый, великодушный"},{"dari":"بیکاره","translit":"bêkâra","ru":"никчёмный, бездельник"},{"dari":"پری","translit":"pari","ru":"фея"},{"dari":"پسند","translit":"pesand","ru":"одобрение"},{"dari":"پیروز","translit":"pirôz","ru":"победитель"},{"dari":"تالاق","translit":"tâlâq","ru":"макушка"},{"dari":"تنبل","translit":"tanbal","ru":"ленивый, лентяй"},{"dari":"ثنا","translit":"sanâ (asneya)","ru":"хвала"},{"dari":"جاهل","translit":"jâhel","ru":"невежда, невежественный"},{"dari":"جلو","translit":"jelaw","ru":"поводья"},{"dari":"جوهر","translit":"jawhar","ru":"драгоценный"},{"dari":"جواهرات","translit":"jawâher(ât)","ru":"камень"},{"dari":"چپری","translit":"čapari","ru":"шалаш"},{"dari":"چرت","translit":"čort","ru":"размышления"},{"dari":"حدیث","translit":"hadis (ahâdis)","ru":"рассказ, предание"},{"dari":"حریص","translit":"haris","ru":"жадный, алчный"},{"dari":"حکمران","translit":"hokmrân","ru":"правитель"},{"dari":"حکیم","translit":"hakim (hokamâ)","ru":"мудрец"},{"dari":"خم","translit":"xam","ru":"согнутый, склонённый"},{"dari":"خواص","translit":"xawâss","ru":"(мн.) аристократия, знать"},{"dari":"دو زدن","translit":"daw zadan","ru":"ругать, бранить"},{"dari":"ریسمان","translit":"rêsmân","ru":"верёвка"},{"dari":"ستودن","translit":"sotudan (setâ)","ru":"восхвалять, прославлять"},{"dari":"ستوده","translit":"sotuda","ru":"прославленный"},{"dari":"سربراه","translit":"sar-ba-râh","ru":"организованный, устроенный"},{"dari":"سه‌راهی","translit":"sêrâhi","ru":"развилка"},{"dari":"ضایع کردن","translit":"zâye’ kardan","ru":"растрачивать попусту"},{"dari":"طبع","translit":"tab’","ru":"натура, нрав"},{"dari":"ظلم","translit":"zolm","ru":"притеснение, несправедливость, жестокость"},{"dari":"غریب","translit":"ğarib","ru":"бедный, неимущий"},{"dari":"گریستن","translit":"geristan (gery)","ru":"плакать"},{"dari":"لت کردن","translit":"lat kardan","ru":"бить, избивать"},{"dari":"لعل","translit":"la’l","ru":"рубин"},{"dari":"مشق","translit":"mašq","ru":"упражнение, каллиграфия"},{"dari":"نقد","translit":"naqd","ru":"наличный (о деньгах)"},{"dari":"نقل کردن","translit":"naql kardan","ru":"рассказывать, пересказывать"},{"dari":"نی‌قلم","translit":"nayqalam","ru":"тростниковая ручка для каллиграфического письма"},{"dari":"هوشیاری","translit":"hušyâri","ru":"ум, рассудительность"},{"dari":"بالشت","translit":"bālešt","ru":"подушка"}] : index === 21 ? [{"dari":"اشاره","translit":"ešâra","ru":"знак, сигнал"},{"dari":"اشک","translit":"ašk","ru":"слеза"},{"dari":"اعتباری","translit":"e’tebâri","ru":"знатный, богатый"},{"dari":"برپا کردن","translit":"barpâ kardan","ru":"устраивать, организовывать"},{"dari":"بندل","translit":"bandal","ru":"свёрток, пачка"},{"dari":"بیخ","translit":"bêx","ru":"корень, подножье"},{"dari":"پس کردن","translit":"pas kardan","ru":"убирать, отодвигать"},{"dari":"پیغام","translit":"payğâm","ru":"послание, весть"},{"dari":"تار","translit":"târ","ru":"нить"},{"dari":"تشله","translit":"tošla","ru":"бусинка для детской игры"},{"dari":"تکاندن","translit":"takândan","ru":"стряхивать"},{"dari":"چال","translit":"čâl","ru":"уловка"},{"dari":"چتل","translit":"čatal","ru":"грязный"},{"dari":"چکچکه","translit":"čokčoka","ru":"слухи, сплетни"},{"dari":"چنگ","translit":"čang","ru":"лапа, когти"},{"dari":"چیغ","translit":"čêğ","ru":"вопль, визг"},{"dari":"حمام","translit":"hammâm","ru":"баня"},{"dari":"حیف","translit":"hayf","ru":"сожаление"},{"dari":"خروار","translit":"xarwâr","ru":"харвар, мера веса"},{"dari":"خمچه","translit":"xemča","ru":"прутик"},{"dari":"دام","translit":"dâm","ru":"западня, силок"},{"dari":"دانه‌نشان","translit":"dânanešân","ru":"инкрустированный"},{"dari":"دوراندیش","translit":"durandêš","ru":"дальновидный"},{"dari":"دیو","translit":"dêw","ru":"чудовище, бес"},{"dari":"ریزه","translit":"rêza","ru":"мелкий"},{"dari":"زلال","translit":"zolâl","ru":"прозрачный"},{"dari":"زیرخانه","translit":"zêrxâna","ru":"подвал"},{"dari":"ژنده","translit":"žanda","ru":"потрёпанный, рваный (об одежде)"},{"dari":"ساختگی","translit":"sâxtagi","ru":"искусственный, притворный"},{"dari":"ستره","translit":"sotra","ru":"чистый (разг.)"},{"dari":"سچه","translit":"sočča","ru":"настоящий, неподдельный (разг.)"},{"dari":"سربسته","translit":"sarbasta","ru":"запечатанный"},{"dari":"سرچشمه","translit":"sarčašma","ru":"источник"},{"dari":"سرشناس","translit":"saršenâs","ru":"знатный"},{"dari":"سطل","translit":"satl","ru":"ведро"},{"dari":"شعله","translit":"šo’la","ru":"пламя"},{"dari":"شمشیر","translit":"šamšêr","ru":"меч, сабля"},{"dari":"شیطانی کردن","translit":"šaytâni kardan","ru":"ябедничать"},{"dari":"صحنه","translit":"sahna","ru":"сцена"},{"dari":"طوطی","translit":"tôti","ru":"попугай"},{"dari":"ظالم","translit":"zâlem","ru":"жестокий"},{"dari":"عذاب","translit":"‘azâb","ru":"мучение, страдание"},{"dari":"غر کردن","translit":"ğor kardan","ru":"рычать"},{"dari":"غلطان","translit":"ğaltân","ru":"кувырком"},{"dari":"غم‌آور","translit":"ğamâwar","ru":"печальный"},{"dari":"فغان","translit":"feğân","ru":"вопль"},{"dari":"قپ کردن","translit":"qap kardan","ru":"ловить на лету"},{"dari":"قتقتک","translit":"qotqotak","ru":"щекотка"},{"dari":"قفس","translit":"qafas","ru":"клетка"},{"dari":"کش کردن","translit":"kaš kardan","ru":"тянуть"},{"dari":"کلِ","translit":"koll-e...","ru":"все (разг.)"},{"dari":"گرفتار شدن","translit":"gereftâr šodan","ru":"подвергаться чему-либо"},{"dari":"گز","translit":"gaz","ru":"газ, мера длины"},{"dari":"ماچ کردن","translit":"mâč kardan","ru":"целовать"},{"dari":"مراد","translit":"morâd","ru":"цель, желаемое"},{"dari":"مرده","translit":"morda","ru":"покойник, труп"},{"dari":"نازنین","translit":"nâzanin","ru":"милый, прелестный"},{"dari":"قطی","translit":"qoti","ru":"шкатулка"},{"dari":"پلنگ","translit":"palang","ru":"тигр"},{"dari":"پایه","translit":"pāya","ru":"ножка"}] : index === 22 ? [{"dari":"اثنا","translit":"asnâ","ru":"время, момент"},{"dari":"ادا کردن","translit":"adâ kardan","ru":"выполнять, произносить"},{"dari":"آه کشیدن","translit":"âh kašidan","ru":"вздыхать"},{"dari":"برافروخته","translit":"barafrôxta","ru":"зажжённый, рассерженный, взбудораженный"},{"dari":"برگرفتن","translit":"bargereftan","ru":"уносить, переносить"},{"dari":"بوسیدن","translit":"bôsidan","ru":"целовать (книжн.)"},{"dari":"بی‌حال","translit":"bêhâl","ru":"находящийся в бессознательном состоянии"},{"dari":"بی‌فکر","translit":"bêfekr","ru":"неумный, легкомысленный"},{"dari":"پافشاری","translit":"pâfešâri","ru":"настояние"},{"dari":"پست","translit":"past","ru":"низкий"},{"dari":"پلوان","translit":"polwân","ru":"межа"},{"dari":"پله","translit":"palla","ru":"створка, половинка; думать (книжн.)"},{"dari":"پنداشتن","translit":"pendâštan (pendâr)","ru":"полагать, думать (книжн.)"},{"dari":"پوزخند","translit":"pôzxand","ru":"усмешка"},{"dari":"تأکید","translit":"ta’kid","ru":"подтверждение, подчёркивание"},{"dari":"ترسیده","translit":"tarsida","ru":"украдкой, опасливо"},{"dari":"تسلی","translit":"tasalli","ru":"утешение"},{"dari":"تعریف","translit":"ta’rif","ru":"описание, похвала"},{"dari":"تلف شدن","translit":"talaf šodan","ru":"гибнуть, пропадать"},{"dari":"جدیت","translit":"jeddeyat","ru":"серьёзность"},{"dari":"جفت","translit":"joft","ru":"пара"},{"dari":"چرخی","translit":"čarxi","ru":"круглый, вращающийся"},{"dari":"چکاره؟","translit":"čekâra?","ru":"кто по профессии или роду занятий?"},{"dari":"حنجره","translit":"hanjara","ru":"гортань, горло"},{"dari":"حیرت‌زده","translit":"hayratzada","ru":"удивлённый (книжн.)"},{"dari":"خالص","translit":"xâles","ru":"чистый, без примесей"},{"dari":"خباز","translit":"xabbâz","ru":"пекарь"},{"dari":"خلاص","translit":"xalâs","ru":"конец, окончание"},{"dari":"خورجین","translit":"xôrjin","ru":"чересседельная сума"},{"dari":"خیره شدن","translit":"xira šodan","ru":"пристально смотреть"},{"dari":"در","translit":"dar","ru":"дверь (книжн.)"},{"dari":"درک کردن","translit":"dark kardan","ru":"понимать, постигать"},{"dari":"درو","translit":"daraw","ru":"жатва"},{"dari":"دست‌پاچگی","translit":"dastpâčagi","ru":"растерянность"},{"dari":"دشنام","translit":"dašnâm","ru":"ругательство"},{"dari":"دلتنگی","translit":"deltangi","ru":"печаль, тоска"},{"dari":"دلسرد شدن","translit":"delsard šodan","ru":"разочароваться"},{"dari":"ذهن","translit":"zehn","ru":"ум, рассудок"},{"dari":"رایگان","translit":"râygân","ru":"даром, бесплатный"},{"dari":"رکاب","translit":"rekâb","ru":"стремя"},{"dari":"رنجش","translit":"ranješ","ru":"обида"},{"dari":"رول","translit":"rôl","ru":"дорожный каток"},{"dari":"زکام","translit":"zokâm","ru":"насморк"},{"dari":"سپاس","translit":"sepâs","ru":"благодарность"},{"dari":"سرانجام","translit":"saranjâm","ru":"наконец, в конце концов"},{"dari":"سرما","translit":"sarmâ","ru":"холод, мороз"},{"dari":"سوگند","translit":"sawgand","ru":"клятва"},{"dari":"سیرم","translit":"sirom","ru":"сыворотка"},{"dari":"شقیقه","translit":"šaqiqa","ru":"висок"},{"dari":"شگفتی","translit":"šegefti","ru":"удивление"},{"dari":"شوخی","translit":"šôxi","ru":"шутка"},{"dari":"صمیمانه","translit":"samimâna","ru":"искренний"},{"dari":"طعنه","translit":"ta’na","ru":"упрёк, ирония"},{"dari":"عصبانیّت","translit":"‘asabâneyyat","ru":"раздражение, гнев"},{"dari":"غربت","translit":"ğorbat","ru":"бедность"},{"dari":"غرور","translit":"ğorur","ru":"гордость, надменность"},{"dari":"غلط فهمی","translit":"ğalatfahmi","ru":"недоразумение"},{"dari":"فروغ","translit":"forôğ","ru":"блеск"},{"dari":"فشردن","translit":"fešordan (fešâr)","ru":"сжимать"},{"dari":"قریه","translit":"qarya (qorâ)","ru":"деревня"},{"dari":"کاخ","translit":"kâx","ru":"дворец"},{"dari":"کیسه","translit":"kisa","ru":"кулёк, кошелёк, пузырь"},{"dari":"کیفر","translit":"kayfar","ru":"наказание"},{"dari":"گرد","translit":"gard","ru":"пыль"},{"dari":"گویا","translit":"gôyâ, gôyi","ru":"словно"},{"dari":"لبخند","translit":"labxand","ru":"улыбка"},{"dari":"لحظه","translit":"lahza","ru":"момент, мгновение"},{"dari":"لحن","translit":"lahn","ru":"тон речи"},{"dari":"لرزیدن","translit":"larzidan","ru":"дрожать"},{"dari":"مادیان","translit":"mâdyân","ru":"кобыла"},{"dari":"مالش دادن","translit":"mâleš dâdan","ru":"тереть"},{"dari":"مسدود","translit":"masdud","ru":"перекрытый, закрытый"},{"dari":"مشتعل","translit":"mošta’al","ru":"воспламенившийся"},{"dari":"ملتفت شدن","translit":"moltafet šodan","ru":"обратить внимание"},{"dari":"مفت","translit":"moft","ru":"даром, бесплатный"},{"dari":"منجمد","translit":"monjamed","ru":"застывший, замороженный, Ледовитый, затвердевший"},{"dari":"موقف","translit":"mawqef","ru":"позиция (в споре и т. п.)"},{"dari":"ناگهان","translit":"nâgahân","ru":"вдруг, неожиданно"},{"dari":"نفرت","translit":"nafrat","ru":"отвращение, ненависть"},{"dari":"نهفته","translit":"nohofta","ru":"скрытый, таящийся"},{"dari":"وجدان","translit":"wejdân","ru":"совесть"},{"dari":"ورود","translit":"worud","ru":"вход"},{"dari":"وظیفه‌شناسی","translit":"wazifašenâsi","ru":"добросовестность"},{"dari":"هی!","translit":"hay!","ru":"эй!"},{"dari":"هیجان","translit":"hayjân","ru":"волнение, беспокойство"},{"dari":"غرش","translit":"ğorreš","ru":"грохот"},{"dari":"رعد","translit":"ra'd","ru":"гром"}] : [{ dari: "test", translit: "", ru: "тест" }],
  }));
  const textbook2WordKey = (lessonId, wordIndex) => `${lessonId}:${wordIndex}`;

  // Preserve learned marks for Lesson 9 words moved from the dictionary to task vocabulary.
  let textbook2Lesson9ProgressMigrated = false;
  textbook2TaskCollection9.cards.forEach((_, i) => {
    const oldKey = textbook2WordKey(9, i + 56);
    const newKey = textbook2WordKey(1009, i);
    if (state.textbook2Words[oldKey] && !state.textbook2Words[newKey]) {
      state.textbook2Words[newKey] = true;
      textbook2Lesson9ProgressMigrated = true;
    }
    if (Object.prototype.hasOwnProperty.call(state.textbook2Words, oldKey)) {
      delete state.textbook2Words[oldKey];
      textbook2Lesson9ProgressMigrated = true;
    }
  });
  if (textbook2Lesson9ProgressMigrated) saveState();
  const textbook2KnownCount = (collection) => collection.cards.filter((_, i) => state.textbook2Words[textbook2WordKey(collection.id, i)]).length;
  const textbook2TaskCollection = (lessonId) => textbook2TaskCollections.find((item) => item.lessonId === Number(lessonId));
  const textbook2TaskKnownCount = (collection) => collection
    ? collection.cards.filter((_, i) => state.textbook2Words[textbook2WordKey(collection.id, i)]).length
    : 0;
  const textbook2LessonsDone = () => textbook2Collections.filter((collection) => {
    const dictionaryComplete = textbook2KnownCount(collection) === collection.cards.length;
    const taskCollection = textbook2TaskCollection(collection.id);
    const tasksComplete = !taskCollection || textbook2TaskKnownCount(taskCollection) === taskCollection.cards.length;
    const phraseCount = textbook2PhraseCounts[collection.id] || 0;
    const phraseDone = JSON.parse(localStorage.getItem(`phraseDone${collection.id}-v2`) || "[]");
    return dictionaryComplete && tasksComplete && (!phraseCount || phraseDone.length >= phraseCount);
  }).length;
  const allLessonsDone = () => lessonsDone() + Object.keys(state.semesterTwoLessons).length + textbook2LessonsDone();
  const allLessonsTotal = () => DATA.lessons.length + (DATA.studentUnits || []).length + textbook2Collections.length;
  const allWordCardsTotal = () => allCards().length
    + textbook2Collections.reduce((sum, item) => sum + item.cards.length, 0)
    + textbook2TaskCollections.reduce((sum, item) => sum + item.cards.length, 0);
  const allWordCardsDone = () => wordsDone()
    + textbook2Collections.reduce((sum, item) => sum + textbook2KnownCount(item), 0)
    + textbook2TaskCollections.reduce((sum, item) => sum + textbook2TaskKnownCount(item), 0);
  const textbook2UnknownOrder = (collection) => (ui.textbook2Orders[collection.id] || collection.cards.map((_, i) => i))
    .filter((i) => !state.textbook2Words[textbook2WordKey(collection.id, i)]);

  const TEXTBOOK2_PDF_IDS = ["1G4kNaSk5n-7m44FPB9hd4qgpZfmLokHA","1SrLKQQCDvp4GwtwlwaLITpIhvXzK__4P","1lOI8rRUh0mejYQpAyIdS2OyDY8Za6VF6","1CVEcycyOxItRn_y5ULGqceluwCyRn4rB","1N3DMFyMLF5BWG3zDJoS5mQPosKX38fXf","1izk4d95pyQLYQJF_YqeX_uogwnOE2kDx","14pkGER0Q9f-du69MRbE3Q6fiKj528L1e","16XhgTKhYN7dXPN9NqS69mPNm_30EPbxM","1h6NBslX-XxAMSQ_KZ98q9mdjWCka3pg3","1nezHi3k1IBNx4P6WnIoGqry5SwY4YAn2","1kqjScxH_u8v9fzxPvMnoA5PvEyGG7QJo","1AOUqMHZO8MMD6ZH9pTAaM1WXCDht8UMq","1E-z6nUQCcbh6BCjUZ-0bX9IutMvOXPhj","1FTtKEdY8llGI5TPvmfQKV-RPi6T3OQFO","1dtT4ijdEJBAm0vMGDDkSMnUZTKoZU8Bj","1niGLAeW4z273ZkElXm1tX95wHGsz3Zg8","1Zm5OV-wrw_e6623XkJ-JPgOHTuR2-Gw6","1o-3f_IWAICGWYy0RyFg297VryWwyoG-w","1Lr2qDJixoaXzhwKp9CSCMd4NXU3dBoPd","1esF1j4VIjHibId15i_-qX4Uy3-uvtS_x","1TxJhQUIC9VZG_Y63OlnFfwoqDSty7E_s","1rjOVg9PyThZC9ZVzxoVAxJLyqA6Fw2Ea","1Xv5N2XWwi57f13tmhqhWuth9Xp9nfCn7"];

  const renderTextbook2Lesson = (lessonNum) => {
    const collection = textbook2Collections.find((item) => item.id === Number(lessonNum));
    if (!collection) return notFound("Урок не найден");
    const phraseCount = textbook2PhraseCounts[collection.id] || 0;
    const phraseDone = JSON.parse(localStorage.getItem(`phraseDone${collection.id}-v2`) || "[]");
    const known = textbook2KnownCount(collection);
    const taskCollection = textbook2TaskCollection(collection.id);
    const taskKnown = textbook2TaskKnownCount(taskCollection);
    const taskCount = taskCollection ? taskCollection.cards.length : 0;
    const taskPct = taskCount ? Math.round(taskKnown / taskCount * 100) : 0;
    const pct = Math.round((known + taskKnown) / Math.max(1, collection.cards.length + taskCount) * 100);
    const phrasePct = phraseCount ? Math.round(phraseDone.length / phraseCount * 100) : 0;
    return `<div class="page textbook-page">
      <a class="back-link" href="#/textbook-2">${svg("arrowRight")} Все уроки</a>
      <div class="detail-hero" data-letter="${collection.id}">
        <div class="detail-badge num">${collection.id}</div>
        <div class="detail-hero-copy">
          <span class="eyebrow">Островский · 2-й год обучения</span>
          <h1>${collection.title}</h1>
          <div class="en-title">Урок ${collection.id}</div>
          <p>${esc(collection.description || "Материалы урока")}</p>
        </div>
      </div>
      <div class="pack-grid textbook-collections textbook-vocab-grid textbook-lesson-materials">
        <a class="pack-card textbook-material-card" href="https://drive.google.com/file/d/${TEXTBOOK2_PDF_IDS[collection.id - 1]}/view" target="_blank" rel="noopener" style="--pack-color:var(--blue)">
          <span class="pack-icon">📄</span><h3>PDF урока</h3>
          <p class="pack-description">Открыть PDF урока в Google Drive или посмотреть его ниже.</p>
          <div class="pack-sub">PDF · Урок ${collection.id}</div>
        </a>
        <a class="pack-card textbook-material-card" href="#/textbook-2/lesson-${collection.id}/vocab" style="--pack-color:var(--green)">
          <span class="pack-icon">📚</span><h3>Словарь</h3>
          <p class="pack-description">Слова и карточки для изучения.</p>
          <div class="pack-sub">${collection.cards.length} слов</div>
          <div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${known}/${collection.cards.length}</span></div>
        </a>
        <a class="pack-card textbook-material-card" href="#/textbook-2/lesson-${collection.id}/tasks" style="--pack-color:var(--gold)">
          <span class="pack-icon">✍️</span><h3>Слова из заданий</h3>
          <p class="pack-description"><strong style="color:#c62828">Транскрипции сгенерированы ИИ, возможны ошибки.</strong></p>
          <div class="pack-sub">${taskCount ? `${taskCount} слов` : "Подборка скоро появится"}</div>
          <div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${taskPct}%"></div></div><span>${taskKnown}/${taskCount}</span></div>
        </a>
        <a class="pack-card textbook-material-card ${phraseCount && phraseDone.length >= phraseCount ? "done" : ""}" href="#/textbook-2/lesson-${collection.id}/phrases" style="--pack-color:var(--purple)">
          ${phraseCount && phraseDone.length >= phraseCount ? `<span class="done-flag badge badge-done">${svg("check")} пройдено</span>` : ""}
          <span class="pack-icon">🧩</span><h3>Отработка фраз</h3>
          <p class="pack-description">Собирайте предложения из слов.</p>
          <div class="pack-sub">${phraseCount ? `${phraseDone.length}/${phraseCount} выполнено` : "Задания скоро появятся"}</div>
          <div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${phrasePct}%"></div></div><span>${phrasePct}%</span></div>
        </a>
      </div>
      <div class="pdf-frame-wrap textbook-frame"><iframe src="${esc(drivePdf(TEXTBOOK2_PDF_IDS[collection.id - 1]))}" title="PDF · Урок ${collection.id}" loading="lazy" allow="autoplay"></iframe></div>
      <div class="page-head-actions" style="margin-top:14px">
        <a class="btn btn-ghost" href="https://drive.google.com/file/d/${TEXTBOOK2_PDF_IDS[collection.id - 1]}/view" target="_blank" rel="noopener">${svg("external")} Открыть в Drive</a>
        <a class="btn btn-primary" href="${esc(driveDownload(TEXTBOOK2_PDF_IDS[collection.id - 1]))}" target="_blank" rel="noopener">${svg("download")} Скачать PDF</a>
      </div>
    </div>`;
  };

  const renderTextbook2Collection = (lessonNum) => {
    const collection = textbook2Collections.find((item) => item.id === Number(lessonNum));
    if (!collection) return notFound("Коллекция не найдена");
    if (!Array.isArray(ui.textbook2Orders[collection.id]) || ui.textbook2Orders[collection.id].length !== collection.cards.length) {
      ui.textbook2Orders[collection.id] = collection.cards.map((_, i) => i);
    }
    const unknownOrder = textbook2UnknownOrder(collection);
    const index = clamp(ui.textbook2Index || 0, 0, Math.max(0, unknownOrder.length - 1));
    const originalIndex = unknownOrder[index];
    const card = originalIndex == null ? null : collection.cards[originalIndex];
    const flipped = Boolean(ui.textbook2Flipped);
    const russianFirst = Boolean(ui.textbook2RussianFirst[collection.id]);
    const knownCount = textbook2KnownCount(collection);
    const list = `<div class="word-list textbook-word-list">
      ${collection.cards.map((word, i) => {
        const known = Boolean(state.textbook2Words[textbook2WordKey(collection.id, i)]);
        return `<div class="word-row ${known ? "known" : ""}">
          <span class="idx">${pad(i + 1)}</span>
          <span class="dari">${esc(word.dari)}</span>
          <span class="translit">${esc(word.translit || "—")}</span>
          <span class="ru">${esc(word.ru)}</span>
          <button class="know-dot" type="button" data-textbook2-word="${i}" aria-label="${known ? "Убрать отметку «Знаю»" : "Отметить слово как известное"}" aria-pressed="${known}">${svg("check")}</button>
        </div>`;
      }).join("")}
    </div>`;
    const flash = unknownOrder.length ? `<div class="flash-wrap"><div class="flash-progress"><span>${index+1} / ${unknownOrder.length} осталось</span><div class="progress-track"><div class="progress-fill" style="width:${(index+1)/unknownOrder.length*100}%"></div></div><span>${knownCount}/${collection.cards.length} знаю</span></div>
      <div class="flashcard-stage"><div class="flashcard textbook-word-card ${flipped?"flipped":""} ${russianFirst?"russian-first":""}" data-textbook-flip tabindex="0" role="button" aria-label="Перевернуть карточку">
      <div class="flash-face front">${russianFirst ? `<div class="flash-numeral" style="color:var(--gold)">перевод</div><div class="flash-ru">${esc(card.ru)}</div>` : `<div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${esc(card.translit)}</div>`}<span class="hint">Нажмите на карточку, чтобы увидеть ${russianFirst ? "дари" : "перевод"}</span></div>
      <div class="flash-face back">${russianFirst ? `<div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${esc(card.translit)}</div>` : `<div class="flash-numeral" style="color:var(--gold)">перевод</div><div class="flash-ru">${esc(card.ru)}</div>${card.translit ? `<div class="flash-translit" style="color:var(--gold)">${esc(card.translit)}</div>` : ""}`}<span class="hint">Нажмите ещё раз, чтобы вернуться</span></div></div></div>
      <div class="flash-actions"><button class="btn btn-primary btn-sm" type="button" data-textbook2-know="${originalIndex}">${svg("check")} Знаю</button><button class="btn btn-ghost btn-sm" type="button" data-textbook-prev ${index===0?"disabled":""}>${svg("arrowLeft")} Назад</button><button class="btn btn-soft btn-sm" type="button" data-textbook-flip-button>${svg("flip")} ${russianFirst ? "Дари" : "Перевод"}</button><button class="btn btn-ghost btn-sm" type="button" data-textbook-next ${index===unknownOrder.length-1?"disabled":""}>Дальше ${svg("arrowRight")}</button></div></div>` : `<div class="empty-state"><h3>Все слова знакомы!</h3><p>Снимите отметку «Знаю» в списке, чтобы вернуть слово в карточки.</p></div>`;
    return `<div class="page"><a class="back-link" href="#/textbook-2/lesson-${collection.id}">${svg("arrowRight")} К уроку ${collection.id}</a>
      <div class="detail-hero" data-letter="📚"><div class="detail-badge" style="font-size:1.8rem">📚</div><div class="detail-hero-copy"><span class="eyebrow">Урок ${collection.id} · Словарь</span><h1>${collection.title}</h1><div class="en-title">Карточки для изучения слов</div><p>Коллекция содержит ${collection.cards.length} слов.</p></div></div>
      <div class="flash-toolbar"><div class="view-switch">
        <button class="${ui.textbook2View === "cards" ? "active" : ""}" type="button" data-textbook-view="cards">${svg("cards")} Карточки</button>
        <button class="${ui.textbook2View === "list" ? "active" : ""}" type="button" data-textbook-view="list">${svg("list")} Список</button>
      </div><button class="btn btn-soft btn-sm" type="button" data-textbook-direction="${collection.id}">${russianFirst ? "Сначала: русский" : "Сначала: дари"}</button><button class="btn btn-soft btn-sm" type="button" data-textbook-shuffle="${collection.id}">↝ Перемешать</button></div>
      ${ui.textbook2View === "list" ? list : flash}</div>`;
  };
  const renderTextbook2Tasks = (lessonNum) => {
    const lessonId = Number(lessonNum);
    const collection = textbook2TaskCollections.find((item) => item.lessonId === lessonId);
    if (!collection) return notFound("Подборка не найдена");
    const id = collection.id;
    if (!Array.isArray(ui.textbook2Orders[id]) || ui.textbook2Orders[id].length !== collection.cards.length) ui.textbook2Orders[id] = collection.cards.map((_, i) => i);
    const unknownOrder = ui.textbook2Orders[id].filter((i) => !state.textbook2Words[textbook2WordKey(id, i)]);
    const index = clamp(ui.textbook2TaskIndex || 0, 0, Math.max(0, unknownOrder.length - 1));
    const originalIndex = unknownOrder[index];
    const card = originalIndex == null ? null : collection.cards[originalIndex];
    const flipped = Boolean(ui.textbook2TaskFlipped);
    const russianFirst = Boolean(ui.textbook2RussianFirst[id]);
    const knownCount = collection.cards.length - unknownOrder.length;
    const pluralMode = lessonId === 15 && Boolean(card?.singular);
    const list = `<div class="word-list textbook-word-list">${collection.cards.map((word,i)=>{const known=Boolean(state.textbook2Words[textbook2WordKey(id,i)]);return `<div class="word-row ${known?"known":""}"><span class="idx">${pad(i+1)}</span>${word.singular?`<span class="dari">${esc(word.singular)}</span><span class="translit">${esc(word.singularTranslit)}</span><span class="ru">${esc(word.singularRu)}</span><span class="dari">${esc(word.dari)}</span><span class="translit">${esc(word.translit)}</span><span class="ru">${esc(word.ru)}</span>`:`<span class="dari">${esc(word.dari)}</span><span class="translit">${esc(word.translit)}</span><span class="ru">${esc(word.ru)}</span>`}<button class="know-dot" type="button" data-textbook2-task-word="${i}" aria-label="${known?"Убрать отметку «Знаю»":"Отметить слово как известное"}" aria-pressed="${known}">${svg("check")}</button></div>`}).join("")}</div>`;
    const flash = unknownOrder.length ? `<div class="flash-wrap"><div class="flash-progress"><span>${index+1} / ${unknownOrder.length} осталось</span><div class="progress-track"><div class="progress-fill" style="width:${(index+1)/unknownOrder.length*100}%"></div></div><span>${knownCount}/${collection.cards.length} знаю</span></div><div class="flashcard-stage"><div class="flashcard textbook-word-card ${flipped?"flipped":""} ${pluralMode?"plural-pair-card":russianFirst?"russian-first":""}" data-textbook-task-flip tabindex="0" role="button" aria-label="Перевернуть карточку"><div class="flash-face front">${pluralMode?`<div class="flash-numeral" style="color:var(--gold)">единственное число</div><div class="flash-dari">${esc(card.singular)}</div><div class="flash-translit">${esc(card.singularTranslit)}</div><div class="flash-ru">${esc(card.singularRu)}</div>`:russianFirst?`<div class="flash-numeral" style="color:var(--gold)">перевод</div><div class="flash-ru">${esc(card.ru)}</div>`:`<div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${esc(card.translit)}</div>`}<span class="hint">Нажмите на карточку, чтобы увидеть ${pluralMode?"множественное число":russianFirst?"дари":"перевод"}</span></div><div class="flash-face back">${pluralMode?`<div class="flash-numeral" style="color:var(--gold)">множественное число</div><div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${esc(card.translit)}</div><div class="flash-ru">${esc(card.ru)}</div>`:russianFirst?`<div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${esc(card.translit)}</div>`:`<div class="flash-numeral" style="color:var(--gold)">перевод</div><div class="flash-ru">${esc(card.ru)}</div>`}<span class="hint">Нажмите ещё раз, чтобы вернуться</span></div></div></div><div class="flash-actions"><button class="btn btn-primary btn-sm" type="button" data-textbook2-task-know="${originalIndex}">${svg("check")} Знаю</button><button class="btn btn-ghost btn-sm" type="button" data-textbook-task-prev ${index===0?"disabled":""}>${svg("arrowLeft")} Назад</button><button class="btn btn-soft btn-sm" type="button" data-textbook-task-flip-button>${svg("flip")} ${pluralMode?(flipped?"Единственное число":"Множественное число"):russianFirst?"Дари":"Перевод"}</button><button class="btn btn-ghost btn-sm" type="button" data-textbook-task-next ${index===unknownOrder.length-1?"disabled":""}>Дальше ${svg("arrowRight")}</button></div></div>` : `<div class="empty-state"><h3>Все слова знакомы!</h3><p>Снимите отметку «Знаю» в списке, чтобы вернуть слово в карточки.</p></div>`;
    return `<div class="page"><a class="back-link" href="#/textbook-2/lesson-${lessonId}">${svg("arrowRight")} К уроку ${lessonId}</a><div class="detail-hero" data-letter="✍️"><div class="detail-badge" style="font-size:1.8rem">✍️</div><div class="detail-hero-copy"><span class="eyebrow">Урок ${lessonId} · Слова из заданий</span><h1>${collection.title}</h1><div class="en-title">Карточки для изучения слов</div><p>Коллекция содержит ${collection.cards.length} слов.</p></div></div><div class="flash-toolbar"><div class="view-switch"><button class="${ui.textbook2View==="cards"?"active":""}" type="button" data-textbook-view="cards">${svg("cards")} Карточки</button><button class="${ui.textbook2View==="list"?"active":""}" type="button" data-textbook-view="list">${svg("list")} Список</button></div><button class="btn btn-soft btn-sm" type="button" data-textbook-task-direction ${lessonId===15?"hidden":""}>${russianFirst?"Сначала: русский":"Сначала: дари"}</button><button class="btn btn-soft btn-sm" type="button" data-textbook-task-shuffle>↝ Перемешать</button></div>${ui.textbook2View==="list"?list:flash}</div>`;
  };

  const textbook2PhraseCounts = { 8: 24, 9: 3, 10: 4 };
  const textbook2PhraseTasksByLesson = {
      8: [
        {prompt:"Я купил пишущую машинку за 20 тыс. афгани",answer:"ماشین تیپ را ۲۰ هزار افغانی خریدم"},
        {prompt:"Почём ты продаёшь это мясо?",answer:"این گوشت را چند میدهی؟"},
        {prompt:"Купи перца на два афгани",answer:"دو افغانی مرچ را بخر"},
        {prompt:"Разменяете сто афгани?",answer:"صد افغانی را میده دارید؟"},
        {prompt:"Эти яблоки стоят 10 афгани за килограмм",answer:"این سیب کیلو ده افغانی است"},
        {prompt:"Давай оставим эту тему!",answer:"از این موضوع بگذریم"},
        {prompt:"Я притормозил",answer:"من برک گرفتم"},
        {prompt:"Заклейте (заделайте) прокол!",answer:"پنجری را بگیرید!"},
        {prompt:"Они относятся к этому серьёзно",answer:"آنها این موضوع را جدی میگیرند"},
        {prompt:"Смотри, как бы тебя не ударило током!",answer:"هوش کنی که ترا برق نگیرد!"},
        {prompt:"Он побледнел",answer:"رنگش پرید"},
        {prompt:"Я обжёг руку",answer:"دستم سوخت"},
        {prompt:"Перегорела спираль обогревателя",answer:"سیم اجاق سوخت"},
        {prompt:"Мне стало его жаль",answer:"دلم برای او سوخت"},
        {prompt:"Тебе нужен карандаш?",answer:"پنسل کار داری؟"},
        {prompt:"Я тебе покажу!",answer:"من با تو کار دارم!"},
        {prompt:"Я опоздал на урок",answer:"درس بالایم ناوفت شد"},
        {prompt:"Я обязан Ахмеду",answer:"احمد بالای من حق دارد"},
        {prompt:"Надень шапку, а то холодно",answer:"کلاه بپوش که خنک است"},
        {prompt:"Я работал, как вдруг зазвонил телефон",answer:"کار میکردم که زنگ تیلفون آمد"},
        {prompt:"Али попал в аварию? — Да что там в аварию? Он совсем разбил машину!",answer:"علی موتر را تکر داد؟ تکر چی که پارچه پارچه کرد!"},
        {prompt:"Ведь я твой друг!",answer:"آخر من رفیق تو هستم!"},
        {prompt:"Как ты сюда попал?",answer:"تو کجا و اینجا کجا؟"},
        {prompt:"Что стряслось?",answer:"چی ریخته؟ چی پاشیده؟"}
      ],
      9: [
        {prompt:"Вечером, когда я пришёл домой, все уже легли спать",answer:"شام که به خانه آمدم همه خواب کرده بودند"},
        {prompt:"Я редко вижу Заргуну",answer:"من زرغونه را کمتر میبینم"},
        {prompt:"Мне не нравится это печенье",answer:"من این کلچه را خوش ندارم"}
      ],
      10: [
        {prompt:"Шашлычник казался радостным и довольным",answer:"کبابى مسرور و راضى مینمود"},
        {prompt:"Ничего не говоря, Наби принялся за работу",answer:"نبی بدون اینکه چیزی بگوید به کار شروع کرد"},
        {prompt:"Ничего не сказав, Наби принялся за работу",answer:"نبی بدون اینکه چیزی گفته باشد به کار شروع کرد"},
        {prompt:"Переводя текст, я пользовался словарём",answer:"من در حالیکه متن را ترجمه میکردم از قاموس استفاده مینمودم"}
      ]
    };

  const renderPhrasePractice = (lessonNum) => {
    const n = Number(lessonNum);
    const tasksByLesson = textbook2PhraseTasksByLesson;
    const tasks = (tasksByLesson[n] || []).map((task,i)=>({...task,number:i+1}));
    const storageKey = `phraseDone${n}-v2`;
    const done = [...new Set(JSON.parse(localStorage.getItem(storageKey) || "[]").map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < tasks.length))];
    const doneCount = done.length;
    const allDone = doneCount === tasks.length;
    const distractors = ["سرخ","سبز","زرد","آبی","سفید","سیاه","از","به","در","برای","است","بود","خوب","امروز","خانه","کتاب","چرا","چند"];
    if (!tasks.length) return `<div class="page phrase-practice"><a class="back-link" href="#/textbook-2/lesson-${n}">← К уроку ${n}</a><h1>Отработка фраз · Урок ${n}</h1><div class="card" style="padding:20px">Задания для этого урока скоро появятся.</div></div>`;
    if (ui.phraseLesson !== n) { ui.phraseLesson = n; ui.phraseIndex = 0; ui.phraseView = "cards"; }
    const index = clamp(ui.phraseIndex || 0, 0, tasks.length - 1);
    const task = tasks[index];
    const words = task.answer.split(" ");
    const bank = words.concat(distractors.slice(0, Math.max(3, Math.min(5, words.length - 1))));
    const list = `<div class="phrase-list" aria-label="Список предложений">${tasks.map((item,i)=>`<button type="button" class="phrase-list-row ${done.includes(i)?"done":""} ${i===index?"active":""}" data-phrase-list-select="${i}"><span class="phrase-list-number">${String(i+1).padStart(2,"0")}</span><span class="phrase-list-copy"><strong>${esc(item.prompt)}</strong><span dir="rtl">${esc(item.answer)}</span></span><span class="phrase-list-status">${done.includes(i)?"✓":"›"}</span></button>`).join("")}</div>`;
    const card = `<div class="phrase-card card">
      <div class="phrase-card-progress"><span>${doneCount} / ${tasks.length} выполнено</span><div class="progress-track"><div class="progress-fill" style="width:${doneCount/tasks.length*100}%"></div></div><span>${Math.round(doneCount/tasks.length*100)}%</span></div>
      <div class="eyebrow">Карточка ${index+1} · Предложение ${index+1}</div>
      <p class="phrase-prompt">${esc(task.prompt)}</p>
      <div class="phrase-answer-label">Соберите предложение на дари</div>
      <div data-phrase-answer="${index}" class="phrase-answer" dir="rtl"></div>
      <div class="phrase-bank" dir="rtl">${bank.map((w,j)=>({w,j,sort:Math.random()})).sort((a,b)=>a.sort-b.sort).map(({w,j})=>`<button type="button" class="btn btn-soft phrase-word" data-phrase-word="${index}" data-word="${esc(w)}" data-token="${j}">${esc(w)}</button>`).join("")}</div>
      <div class="phrase-card-actions"><button type="button" class="btn btn-primary" data-phrase-check="${index}" data-phrase-lesson="${n}" data-phrase-correct="${encodeURIComponent(task.answer)}">Проверить</button><button type="button" class="btn btn-ghost" data-phrase-reset="${index}">Сброс</button><span class="phrase-feedback" data-phrase-feedback="${index}">${done.includes(index)?"Верно! ✓":""}</span></div>
      <div class="phrase-navigation"><button type="button" class="btn btn-ghost btn-sm" data-phrase-prev ${index===0?"disabled":""}>${svg("arrowLeft")} Назад</button><button type="button" class="btn btn-soft btn-sm" data-phrase-next ${index===tasks.length-1?"disabled":""}>Дальше ${svg("arrowRight")}</button></div>
    </div>`;
    return `<div class="page phrase-practice"><a class="back-link" href="#/textbook-2/lesson-${n}">← К уроку ${n}</a><div class="phrase-page-head"><div><span class="eyebrow">Урок ${n} · Практика</span><h1>Отработка фраз</h1><p>По одному предложению на карточке. Остальные предложения доступны в списке.</p></div></div>
      <div class="phrase-view-switch"><button type="button" class="${ui.phraseView==="cards"?"active":""}" data-phrase-view="cards">Карточка</button><button type="button" class="${ui.phraseView==="list"?"active":""}" data-phrase-view="list">Список предложений <span>${tasks.length}</span></button></div>
      ${ui.phraseView==="list"?list:(allDone?`<div class="phrase-complete card"><div class="phrase-complete-icon">${svg("check")}</div><span class="eyebrow">Урок ${n} · Практика завершена</span><h2>Все предложения выполнены!</h2><p>Вы отметили все ${tasks.length} предложений. Можно повторить их в списке.</p><button type="button" class="btn btn-primary" data-phrase-view="list">Открыть список предложений</button></div>`:card)}
    </div>`;
  };
    const renderTextbook = (num) => {
    const book = TEXTBOOKS[num];
    if (!book) return notFound();
    if (num === 2) {
      return `<div class="page textbook-page">
        <div class="page-head">
          <div><span class="eyebrow">Учебник · курс 2</span><h1>Островский · 2-й год обучения</h1><p>${esc(book.title)}. Выберите урок, чтобы открыть его материалы.</p></div>
        </div>
        <div class="lesson-grid semester-one-grid textbook-lesson-grid">
          ${textbook2Collections.map((collection) => {
            const known = textbook2KnownCount(collection);
            const taskCollection = textbook2TaskCollection(collection.id);
            const taskKnown = textbook2TaskKnownCount(taskCollection);
            const taskCount = taskCollection ? taskCollection.cards.length : 0;
            const totalWords = collection.cards.length + taskCount;
            const totalKnown = known + taskKnown;
            const pct = Math.round(totalKnown / Math.max(1, totalWords) * 100);
            const phraseCount = textbook2PhraseCounts[collection.id] || 0;
            const phraseDone = JSON.parse(localStorage.getItem(`phraseDone${collection.id}-v2`) || "[]");
            const phrasePct = phraseCount ? Math.round(phraseDone.length / phraseCount * 100) : 0;
            const complete = totalWords > 0 && totalKnown === totalWords && (!phraseCount || phraseDone.length >= phraseCount);
            return `<a class="lesson-card textbook-lesson-card ${complete ? "done" : ""}" href="#/textbook-2/lesson-${collection.id}">
              ${complete ? `<span class="done-flag badge badge-done">${svg("check")} пройден</span>` : ""}
              <div class="lesson-top"><div class="lesson-num">${collection.id}<small>УРОК</small></div><span class="badge badge-ghost">${totalWords} слов</span></div>
              <h3>${collection.title}</h3>
              <p class="summary">${esc(collection.description || "")}</p>
              <div class="lesson-card-bottom"><span class="meta"><span>📚 ${known}/${collection.cards.length}</span><span>✍️ ${taskCount ? `${taskKnown}/${taskCount}` : "—"}</span><span>🧩 ${phraseCount ? `${phraseDone.length}/${phraseCount}` : "—"}</span></span><span>Открыть ${svg("arrowRight")}</span></div>
              <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
            </a>`;
          }).join("")}
        </div>
      </div>`;
    }
    const view = book.path ? `${book.path}#view=FitH` : drivePdf(book.driveId);
    const open = book.path || `https://drive.google.com/file/d/${encodeURIComponent(book.driveId)}/view`;
    const download = book.path || driveDownload(book.driveId);
    return `<div class="page">
      <div class="page-head">
        <div>
          <span class="eyebrow">Учебник · курс ${num}</span>
          <h1>Островский · ${num}-й год обучения</h1>
          <p>${esc(book.title)}. ${esc(book.note)}</p>
        </div>
        <div class="page-head-actions">
          <a class="btn btn-ghost" href="${esc(open)}" target="_blank" rel="noopener">${svg("external")} Открыть</a>
          <a class="btn btn-primary" href="${esc(download)}"${book.path ? ` download="${esc(book.title)}.pdf"` : ` target="_blank" rel="noopener"`}>${svg("download")} Скачать · ${book.size}</a>
        </div>
      </div>
      <div class="pdf-frame-wrap textbook-frame"><iframe src="${esc(view)}" title="${esc(book.title)}" allow="autoplay"></iframe></div>
    </div>`;
  };

  /* ---------- О проекте ---------- */
  const renderAbout = () => {
    const total = DATA.meta.counts;
    return `<div class="page">
      <div class="about-hero">
        <div><span class="eyebrow">О проекте</span><h1>Язык дари Афганистана</h1><p>На сайте собраны учебные аудирования по языку дари из открытого доступа и учебники Б.Я.Островского для первых двух лет обучения. Основой сайта послужил Google Диск, ссылки на который встречаются во многих разделах. Диск в сайт был превращён с помощью ИИ-агента. С его же помощью сайт редактируется.</p><p class="about-contact"><span>Вопросы, предложения, готовые текстовые материалы для сайта:</span><span class="about-contact-links"><a href="https://t.me/narsenii" target="_blank" rel="noopener"><svg class="telegram-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#229ED9"/><path fill="#fff" d="M18.9 6.2 16.8 17c-.2.8-.7 1-1.4.6l-3.8-2.8-1.8 1.7c-.2.2-.4.4-.8.4l.3-3.9 7.1-6.4c.3-.3-.1-.4-.5-.1l-8.8 5.5-3.8-1.2c-.8-.3-.8-.8.2-1.2l14.8-5.7c.7-.3 1.3.2 1.1 1.1Z"/></svg>@narsenii</a><a href="mailto:a-novikov03@bk.ru">✉️ a-novikov03@bk.ru</a></span></p>
        <div class="hero-actions" style="margin-top:20px"><a class="btn btn-primary" href="#/lessons">Начать курс ${svg("arrowRight")}</a><a class="btn btn-ghost" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("external")} Исходный архив</a></div></div>
        <div class="about-mark">د</div>
      </div>
      <div class="about-grid">
        <div class="about-card"><h3>${svg("layers")} Что внутри</h3><ul>
          <li>Для начинающих: алфавит и базовая лексика на карточках с озвучкой</li>
          <li>Для изучивших алфавит: уроки A–Z в разделе «Алфавит»</li>
          <li>Для расширяющих свои знания: тренажёры в разделе «Учебник: курс 2» (по учебнику Б.Я. Островского) и 80 занятий для американских военных в разделе «Доп.курс»</li>
          <li>Для продвинутых: 1 300 файлов в разделе «Аудиотека» ждут вашего разбора и расшифровки для добавления на сайт 😁</li>
        </ul></div>
        <div class="about-card"><h3>${svg("target")} Как заниматься</h3><ul>
          <li>Начните с алфавита: 5–10 минут в день</li>
          <li>Пройдите вводные уроки A–E, затем тематические F–Z</li>
          <li>Возьмите один полный урок: слушайте VOC и NAR, читайте PDF</li>
          <li>Закрепляйте словарём и практикой, не гонитесь за количеством</li>
          <li>Возвращайтесь к старым записям через день и через неделю</li>
        </ul></div>
        <div class="about-card"><h3>${svg("headphones")} Почему аудирование</h3><p>Дари — язык с сильной вариативностью произношения. Курс построен вокруг живых записей: сначала вы слышите слово, потом видите его, затем повторяете. PDF и словарь поддерживают слух, а не заменяют его.</p></div>
        <div class="about-card"><h3>${svg("shield")} Прогресс и данные</h3><p>Прогресс хранится только в вашем браузере, в localStorage. Никаких аккаунтов и отправки данных. Очистка данных сайта сбросит отметки — используйте кнопку ниже осознанно.</p></div>
      </div>
      <div class="section-head"><div><h2>Источники</h2><p>Материалы принадлежат их авторам и собраны из открытого архива.</p></div></div>
      <div class="about-grid">
        <div class="about-card"><h3>${svg("folder")} Архив</h3><div class="source-list">
          <a class="source-link" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("folder")} Google Drive с аудио и PDF <span>${svg("external")}</span></a>
          <a class="source-link" href="${esc(DATA.meta.readmeUrl)}" target="_blank" rel="noopener">${svg("file")} README архива <span>${svg("external")}</span></a>
        </div></div>
        <div class="about-card"><h3>${svg("bookOpen")} Материалы</h3><p>DLIFLC Dari Language Course (2005) и дополнительные материалы 2016 года: учебник Островского, Beginner's Dari, Spoken Dari, записи носителей и фольклор. Часть записей имеет исторический возраст и не всегда идеальное качество — это часть работы с реальным языком.</p></div>
        <div class="about-card"><h3>${svg("info")} Технически</h3><p>Статический сайт без сервера и сборки: HTML, CSS и JavaScript. Алфавит, словарь и все 206 аудиозаписей сорока уроков сохранены локально. Файлы большой аудиотеки открываются через встроенный плеер Google Drive. Для PDF нужен браузер с поддержкой встроенного просмотрщика.</p></div>
      </div>
      <div class="danger-zone"><div><strong>Сбросить весь прогресс</strong><span>Буквы, уроки, слова, XP и серия будут удалены без возможности восстановления.</span></div><button class="btn btn-danger btn-sm" type="button" data-reset-progress>${svg("trash")} Сбросить</button></div>
    </div>`;
  };

  const notFound = (message = "Страница не найдена") => `<div class="page"><div class="empty-state"><h3>${esc(message)}</h3><p>Возможно, ссылка устарела. Вернитесь на главную или откройте нужный раздел.</p><a class="btn btn-primary btn-sm" style="margin-top:16px" href="#/home">На главную</a></div></div>`;

  /* ---------- Глобальный поиск ---------- */
  let searchActive = 0;
  const openSearch = () => {
    const overlay = document.getElementById("search-overlay");
    overlay.hidden = false;
    document.body.classList.add("search-open");
    const input = document.getElementById("global-search-input");
    input.value = "";
    renderSearchResults("");
    setTimeout(() => input.focus(), 30);
  };
  const closeSearch = () => {
    const overlay = document.getElementById("search-overlay");
    overlay.hidden = true;
    document.body.classList.remove("search-open");
    const input = document.getElementById("global-search-input");
    input.value = "";
  };
  const searchResult = (attrs, iconName, title, subtitle, type, dari = "") => `
    <button class="search-result" type="button" ${attrs}>
      <span class="search-result-icon">${svg(iconName)}</span>
      ${dari ? `<span class="dari">${esc(dari)}</span>` : ""}
      <span class="search-result-copy"><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></span>
      <span class="search-result-type">${esc(type)}</span>
    </button>`;

  const renderSearchResults = (rawQuery) => {
    const query = rawQuery.trim().toLowerCase();
    const box = document.getElementById("search-results");
    if (query.length < 2) {
      box.innerHTML = '<p class="search-hint">Начните вводить запрос — поиск охватывает курсы, словари, фразы и аудиотеку.</p>';
      return;
    }
    const groups = [];
    const letters = DATA.letters.filter((x) =>
      [x.name, x.char, x.latin, x.sound, x.lesson].join(" ").toLowerCase().includes(query)).slice(0, 5);
    if (letters.length) {
      groups.push(`<div class="search-group-label">Буквы</div>${letters.map((letter) =>
        searchResult(`data-search-go="#/alphabet/letter/${esc(letter.id)}"`, "alphabet", `${letter.name} · группа ${letter.lesson}`, letter.latin, "буква", letter.char)).join("")}`);
    }
    const intro = DATA.intro.filter((x) => [x.id, x.title, x.subtitle, x.summary].join(" ").toLowerCase().includes(query)).slice(0, 4);
    if (intro.length) {
      groups.push(`<div class="search-group-label">Вводные уроки</div>${intro.map((item) =>
        searchResult(`data-search-go="#/intro/${esc(item.id)}"`, "bookOpen", `${item.id} · ${item.title}`, item.subtitle || item.summary, "урок")).join("")}`);
    }
    const lessons = DATA.lessons.filter((lesson) => lessonMatches(lesson, query)).slice(0, 5);
    if (lessons.length) {
      groups.push(`<div class="search-group-label">Уроки</div>${lessons.map((lesson) =>
        searchResult(`data-search-go="#/lesson/${lesson.num}"`, "book", `Урок ${lesson.num} · ${lesson.titleRu}`, lesson.summaryRu, "урок")).join("")}`);
    }
    const allVocabPacks = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])];
    const packs = allVocabPacks.filter((pack) => [pack.title, pack.subtitle, pack.description].join(" ").toLowerCase().includes(query)).slice(0, 5);
    if (packs.length) {
      groups.push(`<div class="search-group-label">Наборы словаря</div>${packs.map((pack) =>
        searchResult(`data-search-go="#/vocab/${esc(pack.id)}"`, "cards", pack.title, `${pack.cards.length} слов`, "набор", pack.icon)).join("")}`);
    }

    const wordResults = [];
    allCards().forEach((item) => wordResults.push({
      card: item.card, href: `#/vocab/${item.pack.id}`, source: item.pack.title,
    }));
    (DATA.vocab.noAudioPacks || []).forEach((pack) => pack.cards.forEach((card) => wordResults.push({
      card, href: `#/vocab/${pack.id}`, source: pack.title,
    })));
    textbook2Collections.forEach((collection) => collection.cards.forEach((card) => wordResults.push({
      card, href: `#/textbook-2/lesson-${collection.id}/vocab`, source: `Учебник 2 · урок ${collection.id}`,
    })));
    textbook2TaskCollections.forEach((collection) => collection.cards.forEach((card) => wordResults.push({
      card, href: `#/textbook-2/lesson-${collection.lessonId}/tasks`, source: `Слова из заданий · урок ${collection.lessonId}`,
    })));
    DATA.intro.forEach((lesson) => (lesson.words || []).forEach((card) => wordResults.push({
      card, href: `#/intro/${lesson.id}`, source: `Вводный урок ${lesson.id}`,
    })));
    const cards = wordResults.filter(({ card }) =>
      [card.dari, card.translit, card.ru].join(" ").toLowerCase().includes(query)).slice(0, 10);
    if (cards.length) {
      groups.push(`<div class="search-group-label">Слова и карточки</div>${cards.map(({ card, href, source }) =>
        searchResult(`data-search-go="${esc(href)}"`, "volume", card.ru, `${card.translit || "без транскрипции"} · ${source}`, "слово", card.dari)).join("")}`);
    }

    const semesterTwoUnits = (DATA.studentUnits || []).filter((unit) =>
      [unit.num, unit.title, unit.summary, unit.source].join(" ").toLowerCase().includes(query)).slice(0, 5);
    if (semesterTwoUnits.length) {
      groups.push(`<div class="search-group-label">Семестр 2 · Student Book</div>${semesterTwoUnits.map((unit) =>
        searchResult(`data-search-go="#/lessons/semester-2/lesson/${unit.num}"`, "book", `Урок ${unit.num} · ${unit.title}`, unit.summary, "урок")).join("")}`);
    }

    const textbookLessons = textbook2Collections.filter((item) =>
      [item.id, item.title, item.description].join(" ").toLowerCase().includes(query)).slice(0, 5);
    if (textbookLessons.length) {
      groups.push(`<div class="search-group-label">Учебник 2 · Островский</div>${textbookLessons.map((item) =>
        searchResult(`data-search-go="#/textbook-2/lesson-${item.id}"`, "bookOpen", item.title, item.description || `Урок ${item.id}`, "урок")).join("")}`);
    }

    const mainPhrases = DATA.lessons.flatMap((lesson) => (lesson.phrases || []).map((phrase) => ({ ...phrase, lesson: lesson.num })));
    const textbookPhrases = Object.entries(textbook2PhraseTasksByLesson).flatMap(([lesson, tasks]) =>
      tasks.map((task) => ({ dari: task.answer, translit: "", ru: task.prompt, lesson: Number(lesson), course: "Учебник 2" })));
    const phrases = [...mainPhrases.map((phrase) => ({ ...phrase, course: "Основной курс" })), ...textbookPhrases]
      .filter((phrase) => [phrase.dari, phrase.translit, phrase.ru].join(" ").toLowerCase().includes(query)).slice(0, 8);
    if (phrases.length) {
      groups.push(`<div class="search-group-label">Фразы и предложения</div>${phrases.map((phrase) => {
        const href = phrase.course === "Учебник 2"
          ? `#/textbook-2/lesson-${phrase.lesson}/phrases`
          : `#/lesson/${phrase.lesson}`;
        return searchResult(`data-search-go="${esc(href)}"`, "bookOpen", phrase.ru,
          `${phrase.translit ? phrase.translit + " · " : ""}${phrase.course} · урок ${phrase.lesson}`, "фраза", phrase.dari);
      }).join("")}`);
    }
    const lib = getLibSearchIndex();
    const files = lib.files.filter((x) => x.file.name.toLowerCase().includes(query)).slice(0, 8);
    if (files.length) {
      groups.push(`<div class="search-group-label">Файлы аудиотеки</div>${files.map(({ file, path }) => {
        const audioFile = isAudio(file.name);
        const pdfFile = isPdf(file.name);
        const attrs = audioFile
          ? `data-search-play="${esc(file.id)}" data-title="${esc(stripExt(file.name))}" data-subtitle="${esc(path)}"`
          : pdfFile
            ? (file.local
              ? `data-search-pdf-local="${esc(file.local)}" data-page="1" data-title="${esc(stripExt(file.name))}" data-subtitle="${esc(path)}"`
              : `data-search-pdf="${esc(file.id)}" data-title="${esc(stripExt(file.name))}" data-subtitle="${esc(path)}"`)
            : `data-search-open="${esc(file.id)}"`;
        return searchResult(attrs, audioFile ? "wave" : pdfFile ? "file" : "download", file.name, path, audioFile ? "аудио" : pdfFile ? "pdf" : "файл");
      }).join("")}`);
    }
    const folders = lib.folders.filter((x) => x.node.name.toLowerCase().includes(query)).slice(0, 5);
    if (folders.length) {
      groups.push(`<div class="search-group-label">Папки</div>${folders.map(({ node, path }) =>
        searchResult(`data-search-go="#/library/${esc(node.id)}"`, "folder", node.name, path, "папка")).join("")}`);
    }
    if (!groups.length) {
      box.innerHTML = '<p class="search-empty">Ничего не нашлось. Попробуйте другое написание или часть слова, фразы, названия урока или файла.</p>';
      return;
    }
    box.innerHTML = groups.join("");
    searchActive = 0;
    const first = $(".search-result", box);
    if (first) first.classList.add("active");
  };
  const moveSearch = (delta) => {
    const items = $$(".search-result", document.getElementById("search-results"));
    if (!items.length) return;
    const current = items[searchActive];
    if (current) current.classList.remove("active");
    searchActive = (searchActive + delta + items.length) % items.length;
    items[searchActive].classList.add("active");
    items[searchActive].scrollIntoView({ block: "nearest" });
  };

  /* ---------- Маршрутизация и обвязка ---------- */
  const routeInfo = (section, parts) => {
    switch (section) {
      case "alphabet": return { nav: "alphabet", title: "Алфавит" };
      case "intro": return { nav: "alphabet", title: `Вводный урок ${parts[1] || ""}` };
      case "lessons": return { nav: "lessons", title: parts[1] === "semester-1" ? "Семестр 1" : parts[1] === "semester-2" ? (parts[2] === "lesson" ? `Урок ${parts[3] || ""} · Семестр 2` : "Семестр 2") : "Доп.курс" };
      case "lesson": return { nav: "lessons", title: `Урок ${parts[1] || ""}` };
      case "vocab": return { nav: "vocab", title: parts[1] ? ((DATA.vocab.packs.find((x) => x.id === parts[1]) || {}).title || "Базовая лексика") : "Базовая лексика" };
      case "trainer": return { nav: "vocab", title: "Аудиотренажёр" };
      case "game": return { nav: "game", title: "Игра" };
      case "practice": return { nav: "practice", title: "Практика" };
      case "library": return { nav: "library", title: "Аудиотека" };
      case "textbook-1": return { nav: "textbook-1", title: "Учебник: курс 1" };
      case "textbook-2": case "textbook": return { nav: "textbook-2", title: "Учебник: курс 2" };
      case "about": return { nav: "about", title: "О проекте" };
      default: return { nav: "home", title: "Главная" };
    }
  };

  const updateChrome = (section, parts) => {
    const info = routeInfo(section, parts);
    $$(".nav-link").forEach((link) => {
      const active = link.dataset.nav === info.nav;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const topbar = document.getElementById("topbar-title");
    if (topbar) topbar.textContent = info.title;
    document.title = `${info.title} · Дари · Аудирование`;
    const streak = document.getElementById("streak-chip");
    if (streak) streak.innerHTML = `${svg("flame")} ${state.streak || 0} ${plural(state.streak || 0, ["день", "дня", "дней"])}`;
    const side = document.getElementById("sidebar-progress");
    if (side) {
      side.innerHTML = `<h4>Общий прогресс <span>${overallProgress()}%</span></h4>
        <div class="progress-track"><div class="progress-fill" style="width:${overallProgress()}%"></div></div>
        <div class="mini-stats">
          <div><strong>${lettersKnown()}</strong><small>букв</small></div>
          <div><strong>${lessonsDone()}</strong><small>уроков</small></div>
          <div><strong>${wordsDone()}</strong><small>слов</small></div>
          <div><strong>${fmt(state.xp)}</strong><small>XP</small></div>
        </div>`;
    }
    hydrateIcons(document);
  };

  const openLetterModal = (id) => {
    const letter = DATA.letters.find((x) => x.id === id);
    if (!letter) {
      toast("Буква не найдена", "info");
      history.replaceState(null, "", "#/alphabet");
      return;
    }
    openModal(renderLetterModal(letter), { label: `Буква ${letter.name}` });
  };


  /* ---------- Игра: география провинций Афганистана ---------- */
  const gameProvinceInfo = {
    badakhshan: { name: "Бадахшан", dari: "بدخشان", capital: "Файзабад", capitalDari: "فیض‌آباد" },
    badghis: { name: "Бадгис", dari: "بادغیس", capital: "Кала-и-Нау", capitalDari: "قلعه‌نو" },
    baghlan: { name: "Баглан", dari: "بغلان", capital: "Пули-Хумри", capitalDari: "پلخمری" },
    balkh: { name: "Балх", dari: "بلخ", capital: "Мазари-Шариф", capitalDari: "مزارشریف" },
    bamyan: { name: "Бамиан", dari: "بامیان", capital: "Бамиан", capitalDari: "بامیان" },
    daykundi: { name: "Дайкунди", dari: "دایکندی", capital: "Нили", capitalDari: "نیلی" },
    farah: { name: "Фарах", dari: "فراه", capital: "Фарах", capitalDari: "فراه" },
    faryab: { name: "Фарьяб", dari: "فاریاب", capital: "Маймана", capitalDari: "میمنه" },
    ghazni: { name: "Газни", dari: "غزنی", capital: "Газни", capitalDari: "غزنی" },
    ghor: { name: "Гор", dari: "غور", capital: "Фирузкух (Чагчаран)", capitalDari: "فیروزکوه" },
    helmand: { name: "Гильменд", dari: "هلمند", capital: "Лашкаргах", capitalDari: "لشکر گاه" },
    herat: { name: "Герат", dari: "هرات", capital: "Герат", capitalDari: "هرات" },
    jawzjan: { name: "Джаузджан", dari: "جوزجان", capital: "Шиберган", capitalDari: "شبرغان" },
    kabul: { name: "Кабул", dari: "کابل", capital: "Кабул", capitalDari: "کابل" },
    kandahar: { name: "Кандагар", dari: "کندهار", capital: "Кандагар", capitalDari: "کندهار" },
    kapisa: { name: "Каписа", dari: "کاپیسا", capital: "Махмуд-Раки", capitalDari: "محمودراقی" },
    khost: { name: "Хост", dari: "خوست", capital: "Хост", capitalDari: "خوست" },
    kunar: { name: "Кунар", dari: "کنر", capital: "Асад-Абад", capitalDari: "اسد آباد" },
    kunduz: { name: "Кундуз", dari: "کندز", capital: "Кундуз", capitalDari: "کندز" },
    laghman: { name: "Лагман", dari: "لغمان", capital: "Мехтарлам", capitalDari: "مهترلام" },
    logar: { name: "Логар", dari: "لوگر", capital: "Пули-Алам", capitalDari: "پل علم" },
    nangarhar: { name: "Нангархар", dari: "ننگرهار", capital: "Джелалабад", capitalDari: "جلال آباد" },
    nimroz: { name: "Нимроз", dari: "نیمروز", capital: "Зарандж", capitalDari: "زرنج" },
    nuristan: { name: "Нуристан", dari: "نورستان", capital: "Парун", capitalDari: "پارون" },
    paktika: { name: "Пактика", dari: "پکتیکا", capital: "Шарана", capitalDari: "شرن" },
    paktya: { name: "Пактия", dari: "پکتیا", capital: "Гардез", capitalDari: "گردیز" },
    panjshir: { name: "Панджшер", dari: "پنجشیر", capital: "Базарак", capitalDari: "بازارک" },
    parwan: { name: "Парван", dari: "پروان", capital: "Чарикар", capitalDari: "چاریکار" },
    samangan: { name: "Саманган", dari: "سمنگان", capital: "Айбак", capitalDari: "ایبک" },
    saripul: { name: "Сари-Пуль", dari: "سرپل", capital: "Сари-Пуль", capitalDari: "سرپل" },
    takhar: { name: "Тахар", dari: "تخار", capital: "Талокан", capitalDari: "تالقان" },
    uruzgan: { name: "Урузган", dari: "اورزگان", capital: "Таринкот", capitalDari: "ترین کوټ" },
    wardak: { name: "Майдан Вардак", dari: "میدان وردک", capital: "Майданшахр", capitalDari: "میدان‌شهر" },
    zabul: { name: "Забуль", dari: "زابل", capital: "Калат", capitalDari: "قلات" }
  };
  const gameProvinceNames = Object.fromEntries(Object.entries(gameProvinceInfo).map(([key, value]) => [key, value.name]));
  gameProvinceNames.daikundi = gameProvinceInfo.daykundi.name;
  gameProvinceNames.hirat = gameProvinceInfo.herat.name;
  gameProvinceNames.jowzjan = gameProvinceInfo.jawzjan.name;
  gameProvinceNames.paktia = gameProvinceInfo.paktya.name;
  gameProvinceNames.panjsher = gameProvinceInfo.panjshir.name;
  gameProvinceNames.sarepul = gameProvinceInfo.saripul.name;
  gameProvinceNames.saripol = gameProvinceInfo.saripul.name;
  gameProvinceNames.oruzgan = gameProvinceInfo.uruzgan.name;
  gameProvinceNames.maidanwardak = gameProvinceInfo.wardak.name;
  const gameKey = (value) => String(value || "").toLowerCase().normalize("NFD")
    .replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]/g, "");
  let gameMapFeatures = null;
  let gameMapLoading = false;
  let gameMapError = "";
  let gameOrder = [];
  let gameIndex = 0;
  let gameCompleted = new Set();
  let gameResultColors = new Map();
  let gameAttemptCount = 0;
  let gameMistakes = 0;
  let gameFeedback = "";
  let gameWrongId = "";
  let gameShowProvinceNames = false;

  const gameFeatureName = (feature) => {
    const props = feature.properties || {};
    const raw = props.PROV_34_NA || props.name || props.NAME_1 || props.shapeName || "";
    const key = gameKey(raw);
    const info = gameProvinceInfo[key] || null;
    return { raw, key, name: info ? info.name : (gameProvinceNames[key] || raw), dari: info ? info.dari : "", capital: info ? info.capital : "", capitalDari: info ? info.capitalDari : "" };
  };
  const gameDisplayFeatureName = (feature) => {
    const base = gameFeatureName(feature);
    const canonicalKey = base.key === "maidanwardak" ? "wardak" : base.key;
    const info = gameProvinceInfo[canonicalKey] || null;
    const labels = {
      herat: { name: "Герат", dari: "هرات" },
      wardak: { name: "Майдан-Вардак", dari: "میدان وردک" },
      helmand: { name: "Гильменд", dari: "هلمند" }
    };
    const label = labels[canonicalKey];
    return label ? { ...base, name: label.name, dari: label.dari } : { ...base, name: info ? info.name : base.name, dari: info ? info.dari : base.dari };
  };
  const gameGeometryRings = (geometry) => {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return [geometry.coordinates];
    if (geometry.type === "MultiPolygon") return geometry.coordinates;
    return [];
  };
  const gameSvgPath = (geometry, project) => gameGeometryRings(geometry).map((polygon) =>
    polygon.map((ring) => ring.map((point, index) => {
      const p = project(point);
      return (index ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }).join(" ") + " Z").join(" ")
  ).join(" ");
  const gameLabelPoint = (geometry) => {
    let best = null, bestArea = 0;
    gameGeometryRings(geometry).forEach((polygon) => {
      const ring = polygon[0] || [];
      if (ring.length < 3) return;
      let area = 0, cx = 0, cy = 0;
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        const cross = a[0] * b[1] - b[0] * a[1];
        area += cross; cx += (a[0] + b[0]) * cross; cy += (a[1] + b[1]) * cross;
      }
      const magnitude = Math.abs(area);
      if (magnitude > bestArea && area) {
        bestArea = magnitude;
        best = [cx / (3 * area), cy / (3 * area)];
      }
    });
    return best;
  };
  const gameProjection = (features) => {
    const coords = [];
    features.forEach((feature) => gameGeometryRings(feature.geometry).forEach((polygon) =>
      polygon.forEach((ring) => ring.forEach((point) => coords.push(point)))));
    const xs = coords.map((p) => p[0]), ys = coords.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = 720, height = 560, pad = 18;
    const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
    const drawW = (maxX - minX) * scale, drawH = (maxY - minY) * scale;
    const ox = (width - drawW) / 2, oy = (height - drawH) / 2;
    return (point) => [ox + (point[0] - minX) * scale, height - oy - (point[1] - minY) * scale];
  };
  const gameShuffle = (items) => {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const gameStart = () => {
    gameOrder = gameShuffle(gameMapFeatures || []);
    gameIndex = 0;
    gameCompleted = new Set();
    gameResultColors = new Map();
    gameAttemptCount = 0;
    gameMistakes = 0;
    gameFeedback = "";
    gameWrongId = "";
  };
  const gameCurrent = () => gameOrder[gameIndex] || null;
  const renderGame = () => {
    const current = gameCurrent();
    const total = gameOrder.length;
    const done = gameCompleted.size;
    let mapMarkup = "";
    if (gameMapFeatures && gameMapFeatures.length) {
      const project = gameProjection(gameMapFeatures);
      mapMarkup = `<svg class="province-map-svg" viewBox="0 0 720 560" role="group" aria-label="Карта провинций Афганистана">
        ${gameMapFeatures.map((feature, index) => {
          const info = gameDisplayFeatureName(feature);
          const id = info.key || String(index);
          const completed = gameCompleted.has(id);
          const resultColor = gameResultColors.get(id) || "";
          const revealed = !completed && current && gameAttemptCount >= 3 && gameFeatureName(current).key === id;
          const wrong = gameWrongId === id;
          const labelPoint = gameShowProvinceNames ? gameLabelPoint(feature.geometry) : null;
          const label = labelPoint ? project(labelPoint) : null;
          return `<g>
            <path class="province-shape${completed ? ` is-correct ${resultColor}` : ""}${revealed ? " is-revealed" : ""}${wrong ? " is-wrong" : ""}" data-game-province="${esc(id)}" d="${gameSvgPath(feature.geometry, project)}" fill-rule="evenodd" tabindex="0" role="button" aria-label="${esc(info.name)}" />
            ${label ? `<text class="province-map-label" x="${label[0].toFixed(1)}" y="${(label[1] - 2).toFixed(1)}" text-anchor="middle" aria-hidden="true"><tspan x="${label[0].toFixed(1)}">${esc(info.name)}</tspan><tspan class="province-map-label-dari" x="${label[0].toFixed(1)}" dy="10" direction="rtl" unicode-bidi="plaintext">${esc(info.dari)}</tspan></text>` : ""}
          </g>`;
        }).join("")}
      </svg>`;
    } else if (gameMapError) {
      mapMarkup = `<div class="game-map-message"><strong>Не удалось загрузить карту</strong><p>${esc(gameMapError)}</p><button class="btn btn-primary" type="button" data-game-retry>Повторить</button></div>`;
    } else {
      mapMarkup = '<div class="game-map-message"><span class="loading-spinner"></span><p>Загружаем карту провинций…</p></div>';
    }
    return `<div class="page game-page">
      <div class="page-head"><div><div class="eyebrow">География · Афганистан</div><h1>Найди провинцию</h1><p>Найди провинцию на карте. Цвет покажет, с какой попытки ты её нашёл.</p></div><div class="game-map-actions"><button class="btn btn-soft" type="button" data-game-map-names aria-pressed="${gameShowProvinceNames}">${gameShowProvinceNames ? "Скрыть названия" : "Показать карту с названиями"}</button></div></div>
      <div class="game-layout">
        <section class="game-board">
          <div class="game-question">
            <div class="game-question-label">Найди на карте</div>
            <div class="game-question-name">${current ? esc(gameDisplayFeatureName(current).name) : (total && done === total ? "Все провинции найдены!" : "Подготовка игры…")}</div>
            ${current ? `<div class="game-question-dari" lang="fa" dir="rtl">${esc(gameDisplayFeatureName(current).dari)}</div>` : ""}
            <div class="game-question-meta">${total ? `Провинция ${Math.min(done + 1, total)} из ${total}` : "34 провинции Афганистана"}</div>
          </div>
          <div class="game-map-wrap">${mapMarkup}</div>
          <div class="game-feedback ${gameFeedback.startsWith("Верно") ? "is-good" : gameFeedback ? "is-error" : ""}" aria-live="polite">${esc(gameFeedback || "Выбери область на карте")}</div>
        </section>
        <aside class="game-side">
          <div class="game-stats"><div><strong>${done}</strong><span>найдено</span></div><div><strong>${gameMistakes}</strong><span>ошибок</span></div></div>
          <div class="game-progress"><div class="progress-track"><div class="progress-fill" style="width:${total ? done / total * 100 : 0}%"></div></div><span>${total ? Math.round(done / total * 100) : 0}%</span></div>
          <p class="game-instruction">С первой попытки — зелёный, со второй — жёлтый, с третьей — оранжевый. После трёх ошибок правильная область подсветится фиолетовым; после выбора она станет красной.</p>
          <button class="btn btn-ghost game-reset" type="button" data-game-reset>${done === total && total ? "Сыграть ещё раз" : "Начать заново"}</button>
          <div class="game-legend"><div class="game-legend-item"><span class="legend-green"></span> С первой попытки</div><div class="game-legend-item"><span class="legend-yellow"></span> Со второй</div><div class="game-legend-item"><span class="legend-orange"></span> С третьей</div><div class="game-legend-item"><span class="legend-purple"></span> Ответ подсказан</div><div class="game-legend-item"><span class="legend-red"></span> После подсказки</div></div>
        </aside>
      </div>
      <section class="province-reference">
        <div class="province-reference-head"><div><div class="eyebrow">Справочник</div><h2>Провинции и их столицы</h2></div><p>Русские названия и написание на дари</p></div>
        <div class="province-reference-grid">
          ${Object.entries(gameProvinceInfo).map(([key, info]) => `<button class="province-flashcard" type="button" data-province-flip aria-pressed="false" aria-label="Провинция ${esc(info.name)}. Нажмите, чтобы увидеть столицу">
            <span class="province-flashcard-inner">
              <span class="province-flashcard-face province-flashcard-front">
                <span class="province-flashcard-kicker">Провинция</span>
                <strong>${esc(info.name)}</strong>
                <b class="province-flashcard-dari" lang="fa" dir="rtl">${esc(info.dari)}</b>
                <span class="province-flashcard-hint">Нажмите, чтобы увидеть столицу</span>
              </span>
              <span class="province-flashcard-face province-flashcard-back">
                <span class="province-flashcard-kicker">Столица</span>
                <strong>${esc(info.capital)}</strong>
                <b lang="fa" dir="rtl">${esc(info.capitalDari)}</b>
                <span class="province-flashcard-hint">Нажмите, чтобы вернуться</span>
              </span>
            </span>
          </button>`).join("")}
        </div>
      </section>
    </div>`;
  };
  const loadGameMap = async () => {
    if (gameMapFeatures || gameMapLoading || gameMapError) return;
    gameMapLoading = true;
    gameMapError = "";
    try {
      const url = "https://services5.arcgis.com/sjP4Ugu5s0dZWLjd/ArcGIS/rest/services/Admin1_Afghanistan/FeatureServer/1/query?where=1%3D1&outFields=PROV_34_NA&returnGeometry=true&outSR=4326&geometryPrecision=4&f=geojson";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Сервер карты ответил с ошибкой.");
      const data = await response.json();
      const features = (data.features || []).filter((feature) => feature.geometry && gameFeatureName(feature).key);
      if (features.length < 30) throw new Error("В данных карты не хватает провинций.");
      gameMapFeatures = features;
      gameStart();
    } catch (error) {
      gameMapError = "Проверь подключение к интернету и попробуй ещё раз.";
    } finally {
      gameMapLoading = false;
      if ((location.hash.replace(/^#\/?/, "").split("/")[0] || "home") === "game") renderRoute({ scroll: false });
    }
  };
  const handleGameProvince = (id) => {
    if (!gameMapFeatures || !gameCurrent() || gameCompleted.size === gameOrder.length) return;
    const current = gameFeatureName(gameCurrent());
    if (id === current.key) {
      const attempts = gameAttemptCount + 1;
      gameResultColors.set(id, attempts === 1 ? "is-first-try" : attempts === 2 ? "is-second-try" : attempts === 3 ? "is-third-try" : "is-after-reveal");
      gameCompleted.add(id);
      gameAttemptCount = 0;
      gameFeedback = "Верно! Отличная работа.";
      gameWrongId = "";
      gameIndex += 1;
      if (gameCompleted.size === gameOrder.length) gameFeedback = "Верно! Ты нашёл все 34 провинции. Отличная работа!";
    } else {
      gameMistakes += 1;
      gameAttemptCount += 1;
      gameWrongId = id;
      gameFeedback = "Пока не так — попробуй ещё раз.";
      renderRoute({ scroll: false });
      setTimeout(() => {
        gameWrongId = "";
        if ((location.hash.replace(/^#\/?/, "").split("/")[0] || "home") === "game") renderRoute({ scroll: false });
      }, 650);
      return;
    }
    renderRoute({ scroll: false });
  };

  const renderRoute = (options = {}) => {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw ? raw.split("/").map((part) => decodeURIComponent(part)) : [];
    const section = parts[0] || "home";
    let html = "";
    if (section === "home") html = renderHome();
    else if (section === "alphabet") {
      if (parts[1] === "letter") ui.alphabetTab = "letters";
      else if (parts[1] === "archive") ui.alphabetTab = "beginner";
      html = renderAlphabet();
    } else if (section === "intro") html = renderIntro(parts[1]);
    else if (section === "lessons") html = renderLessons(parts[1], parts[2], parts[3]);
    else if (section === "lesson") html = renderLesson(parts[1]);
    else if (section === "vocab") html = parts[1] ? renderPack(parts[1]) : renderVocab();
    else if (section === "trainer") html = renderTrainer(parts[1]);
    else if (section === "game") html = renderGame();
    else if (section === "practice") html = renderPractice();
    else if (section === "library") html = renderLibrary(parts[1]);
    else if (section === "textbook-1") html = renderTextbook(1);
    else if (section === "textbook-2" || section === "textbook") html = parts[1] && parts[1].startsWith("lesson-") ? (parts[2] === "vocab" ? renderTextbook2Collection(parts[1].slice(7)) : parts[2] === "phrases" ? renderPhrasePractice(parts[1].slice(7)) : parts[2] === "tasks" ? renderTextbook2Tasks(parts[1].slice(7)) : renderTextbook2Lesson(parts[1].slice(7))) : parts[1] && parts[1].startsWith("phrases-") ? renderPhrasePractice(parts[1].slice(8)) : renderTextbook(2);
    else if (section === "about") html = renderAbout();
    else html = notFound();

    APP.innerHTML = html;
    hydrateIcons(APP);
    updateChrome(section, parts);
    if (section === "game") loadGameMap();
    if (options.scroll !== false) window.scrollTo(0, 0);
    if (section === "alphabet" && parts[1] === "letter" && !options.skipModal) {
      openLetterModal(parts[2]);
    }
  };

  /* ---------- Действия с прогрессом ---------- */
  const toggleLetter = (id) => {
    if (state.letters[id]) {
      delete state.letters[id];
      toast("Отметка снята");
    } else {
      state.letters[id] = Date.now();
      awardOnce(`letter:${id}`, 5);
      toast("Буква изучена · +5 XP");
    }
    saveState();
    renderRoute({ scroll: false, skipModal: true });
    const known = Boolean(state.letters[id]);
    const button = $("[data-letter-toggle]");
    if (button) {
      button.className = `btn ${known ? "btn-soft" : "btn-primary"}`;
      button.innerHTML = known ? `${svg("check")} Изучена` : "Отметить изученной";
      button.setAttribute("aria-pressed", String(known));
    }
  };

  const toggleIntro = (id) => {
    if (state.intro[id]) {
      delete state.intro[id];
      toast("Отметка снята");
    } else {
      state.intro[id] = Date.now();
      awardOnce(`intro:${id}`, 30);
      toast("Вводный урок пройден · +30 XP");
    }
    saveState();
    renderRoute({ scroll: false });
  };

  const toggleLesson = (num) => {
    if (state.lessons[num]) {
      delete state.lessons[num];
      toast("Отметка снята");
    } else {
      state.lessons[num] = Date.now();
      awardOnce(`lesson:${num}`, 60);
      toast("Урок пройден · +60 XP");
    }
    saveState();
    renderRoute({ scroll: false });
  };

  const toggleIntroWord = (key) => {
    if (state.introWords[key]) delete state.introWords[key];
    else state.introWords[key] = Date.now();
    saveState();
    renderRoute({ scroll: false });
  };

  const setWord = (packId, index, value) => {
    const pack = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])].find((x) => x.id === packId);
    const key = `${packId}:${index}`;
    if (!pack || !pack.cards[index]) return;
    if (value) {
      if (!state.words[key]) {
        state.words[key] = Date.now();
        awardOnce(`word:${key}`, 2);
      }
    } else {
      delete state.words[key];
    }
    saveState();
    if (value && packKnown(pack) === pack.cards.length && awardOnce(`pack:${packId}`, 25)) {
      toast(`Набор «${pack.title}» пройден · +25 XP`);
    }
  };

  const toggleWord = (key) => {
    const [packId, indexText] = key.split(":");
    const index = Number(indexText);
    const known = Boolean(state.words[key]);
    setWord(packId, index, !known);
    if (!known) toast("Слово отмечено · +2 XP");
    renderRoute({ scroll: false });
  };

  /* ---------- События ---------- */
  const onClick = (event) => {
    const target = event.target.closest("button, a, [data-flip-card]") || event.target;

    if (event.target.classList && event.target.classList.contains("modal-backdrop")) {
      closeModal();
      return;
    }
    if (event.target.classList && event.target.classList.contains("search-overlay")) {
      closeSearch();
      return;
    }
    if (target.closest("[data-close-modal]")) {
      closeModal();
      return;
    }
    if (target.closest("[data-close-search]")) { closeSearch(); return; }
    if (target.closest("[data-open-search]")) { event.preventDefault(); openSearch(); return; }
    if (target.closest("[data-open-nav]")) { document.body.classList.add("nav-open"); return; }
    if (target.closest("[data-close-nav]")) { document.body.classList.remove("nav-open"); return; }
    const semesterTwoDone = target.closest("[data-toggle-semester-two-lesson]");
    if (semesterTwoDone) {
      const num = Number(semesterTwoDone.dataset.toggleSemesterTwoLesson);
      if (state.semesterTwoLessons[num]) delete state.semesterTwoLessons[num];
      else state.semesterTwoLessons[num] = Date.now();
      saveState();
      renderRoute({ scroll: false });
      return;
    }
    const semesterTwoPlayAll = target.closest("[data-play-all-semester-two]");
    if (semesterTwoPlayAll) {
      const num = Number(semesterTwoPlayAll.dataset.playAllSemesterTwo);
      const folder = (DATA.semesterTwo.folders || []).find((item) => item.id === `virtual-lesson-${pad(num)}`);
      const queue = (folder?.files || []).filter((file) => isAudio(file.name)).map((file) => ({
        src: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.id)}`,
        title: stripExt(file.name),
        subtitle: `Семестр 2 · Урок ${num}`,
      }));
      if (queue.length) playQueue(queue, 0);
      else toast("Для этого урока нет аудио", "info");
      return;
    }
    const semesterTwoTag = target.closest("[data-semester-two-tag]");
    if (semesterTwoTag) { ui.semesterTwoTag = semesterTwoTag.dataset.semesterTwoTag; renderRoute({ scroll: false }); return; }
    if (target.closest("[data-clear-semester-two-filter]")) { ui.semesterTwoTag = "all"; ui.semesterTwoQuery = ""; renderRoute({ scroll: false }); return; }
    if (target.closest(".nav-link")) { document.body.classList.remove("nav-open"); }

    const playButton = target.closest("[data-play-src]");
    if (playButton) {
      event.preventDefault();
      const queueKey = playButton.dataset.queue || "";
      const queue = queueKey ? queueItems(queueKey) : [];
      const qindex = playButton.dataset.qindex != null ? Number(playButton.dataset.qindex) : -1;
      playItem({
        src: playButton.dataset.playSrc,
        title: playButton.dataset.title || "Аудио",
        subtitle: playButton.dataset.subtitle || "",
      }, queue, qindex);
      return;
    }
    const playAll = target.closest("[data-play-all]");
    if (playAll) {
      event.preventDefault();
      const queue = queueItems(playAll.dataset.playAll);
      if (!queue.length) toast("Для этого набора нет аудио", "info");
      else playQueue(queue, 0);
      return;
    }
    if (target.closest("[data-player-toggle]")) {
      if (!audio.src) return;
      if (audio.paused) audio.play().catch(() => toast("Не удалось запустить запись", "info"));
      else audio.pause();
      return;
    }
    if (target.closest("[data-player-rewind]")) { audio.currentTime = Math.max(0, audio.currentTime - 10); return; }
    if (target.closest("[data-player-forward]")) { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); return; }
    if (target.closest("[data-player-close]")) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      playerItem = null;
      playerQueue = [];
      playerIndex = -1;
      player.hidden = true;
      document.body.classList.remove("has-player");
      setPlayerToggle(false);
      return;
    }

    const pdfButton = target.closest("[data-pdf-local]");
    if (pdfButton) {
      event.preventDefault();
      openLocalPdf(pdfButton.dataset.pdfLocal, pdfButton.dataset.pdfTitle || "PDF", "");
      return;
    }
    const loadPdf = target.closest("[data-load-pdf]");
    if (loadPdf) {
      event.preventDefault();
      const wrap = loadPdf.closest("[data-pdf-wrap]");
      if (wrap) {
        wrap.innerHTML = `<iframe src="${esc(wrap.dataset.pdfSrc)}#view=FitH" title="${esc(wrap.dataset.pdfTitle || "PDF")}" loading="lazy"></iframe>`;
      }
      return;
    }

    if (target.closest("[data-lib-play]")) {
      const button = target.closest("[data-lib-play]");
      openDriveAudio(button.dataset.libPlay, button.dataset.title || "Аудио", button.dataset.subtitle || "Аудиотека");
      return;
    }
    if (target.closest("[data-lib-pdf-local]")) {
      const button = target.closest("[data-lib-pdf-local]");
      openLocalPdf(button.dataset.libPdfLocal, button.dataset.title || "PDF", button.dataset.subtitle || "Аудиотека", button.dataset.page);
      return;
    }
    if (target.closest("[data-lib-pdf]")) {
      const button = target.closest("[data-lib-pdf]");
      openDrivePdf(button.dataset.libPdf, button.dataset.title || "PDF", button.dataset.subtitle || "Аудиотека", button.dataset.page);
      return;
    }
    if (target.closest("[data-lib-doc]")) {
      const button = target.closest("[data-lib-doc]");
      openDocPreview(button.dataset.libDoc, button.dataset.title || "Документ");
      return;
    }

    if (target.closest("[data-letter-toggle]")) {
      toggleLetter(target.closest("[data-letter-toggle]").dataset.letterToggle);
      return;
    }
    if (target.closest("[data-toggle-intro]")) { toggleIntro(target.closest("[data-toggle-intro]").dataset.toggleIntro); return; }
    if (target.closest("[data-toggle-lesson]")) { toggleLesson(Number(target.closest("[data-toggle-lesson]").dataset.toggleLesson)); return; }
    if (target.closest("[data-intro-word]")) { toggleIntroWord(target.closest("[data-intro-word]").dataset.introWord); return; }
    if (target.closest("[data-word-toggle]")) { toggleWord(target.closest("[data-word-toggle]").dataset.wordToggle); return; }

    if (target.closest("[data-alpha-tab]")) {
      ui.alphabetTab = target.closest("[data-alpha-tab]").dataset.alphaTab;
      renderRoute({ scroll: false, skipModal: true });
      return;
    }
    if (target.closest("[data-letter-group]")) {
      ui.letterGroup = target.closest("[data-letter-group]").dataset.letterGroup;
      renderRoute({ scroll: false, skipModal: true });
      return;
    }
    if (target.closest("[data-lesson-tag]")) {
      ui.lessonTag = target.closest("[data-lesson-tag]").dataset.lessonTag;
      renderRoute({ scroll: false });
      return;
    }
    if (target.closest("[data-clear-lesson-filter]")) {
      ui.lessonTag = "all";
      ui.lessonQuery = "";
      renderRoute({ scroll: false });
      return;
    }
    if (target.closest("[data-shuffle-pack]")) {
      const packId = target.closest("[data-shuffle-pack]").dataset.shufflePack;
      const pack = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])].find((item) => item.id === packId);
      if (pack) {
        const current = ui.packOrders[packId] || pack.cards.map((_, i) => i);
        let next = shuffle(current);
        if (next.length > 1 && next.every((value, i) => value === current[i])) {
          next.push(next.shift());
        }
        ui.packOrders[packId] = next;
        ui.flashIndex = 0;
        ui.flashFlipped = false;
        ui.packView = "cards";
        renderRoute({ scroll: false });
        toast("Порядок слов перемешан");
      }
      return;
    }

    if (target.closest("[data-pack-view]")) {
      ui.packView = target.closest("[data-pack-view]").dataset.packView;
      renderRoute({ scroll: false });
      return;
    }

    const taskRoute = location.hash.includes("/tasks");
    const taskCollection = textbook2TaskCollections.find((item) => item.lessonId === Number((location.hash.match(/lesson-(\d+)/)||[])[1]));
    if (taskRoute && taskCollection) {
      const taskWord = target.closest("[data-textbook2-task-know], [data-textbook2-task-word]");
      if (taskWord) {
        const index = Number(taskWord.dataset.textbook2TaskKnow ?? taskWord.dataset.textbook2TaskWord);
        const key = textbook2WordKey(taskCollection.id, index);
        if (state.textbook2Words[key]) delete state.textbook2Words[key]; else state.textbook2Words[key] = Date.now();
        saveState(); renderRoute({ scroll: false }); return;
      }
      if (target.closest("[data-textbook-task-flip-button], [data-textbook-task-flip]")) { ui.textbook2TaskFlipped = !ui.textbook2TaskFlipped; renderRoute({ scroll: false }); return; }
      if (target.closest("[data-textbook-task-direction]")) { ui.textbook2RussianFirst[taskCollection.id] = !ui.textbook2RussianFirst[taskCollection.id]; ui.textbook2TaskFlipped = false; renderRoute({ scroll: false }); return; }
      if (target.closest("[data-textbook-task-shuffle]")) {
        const order = taskCollection.cards.map((_,i)=>i);
        for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
        ui.textbook2Orders[taskCollection.id]=order; ui.textbook2TaskIndex=0; ui.textbook2TaskFlipped=false; ui.textbook2View="cards"; renderRoute({scroll:false}); return;
      }
      if (target.closest("[data-textbook-task-prev], [data-textbook-task-next]")) {
        const known = taskCollection.cards.map((_,i)=>i).filter(i=>!state.textbook2Words[textbook2WordKey(taskCollection.id,i)]);
        ui.textbook2TaskIndex=clamp((ui.textbook2TaskIndex||0)+(target.closest("[data-textbook-task-next]")?1:-1),0,Math.max(0,known.length-1));
        ui.textbook2TaskFlipped=false; renderRoute({scroll:false}); return;
      }
    }
    if (target.closest("[data-textbook2-know]") || target.closest("[data-textbook2-word]")) {
      const control = target.closest("[data-textbook2-know], [data-textbook2-word]");
      const lessonId = Number((location.hash.split("/lesson-")[1] || "").split(/[/?]/)[0]);
      const collection = textbook2Collections.find((item) => item.id === lessonId);
      if (collection) {
        const wordIndex = Number(control.dataset.textbook2Know ?? control.dataset.textbook2Word);
        if (Number.isInteger(wordIndex) && wordIndex >= 0 && wordIndex < collection.cards.length) {
          const key = textbook2WordKey(collection.id, wordIndex);
          const wasKnown = Boolean(state.textbook2Words[key]);
          if (wasKnown) delete state.textbook2Words[key];
          else state.textbook2Words[key] = Date.now();
          if (!wasKnown) {
            const remaining = textbook2UnknownOrder(collection);
            ui.textbook2Index = Math.min(ui.textbook2Index || 0, Math.max(0, remaining.length - 1));
          }
          saveState();
          renderRoute({ scroll: false });
        }
      }
      return;
    }

    if (target.closest("[data-textbook-view]")) {
      ui.textbook2View = target.closest("[data-textbook-view]").dataset.textbookView;
      renderRoute({ scroll: false });
      return;
    }
    if (target.closest("[data-textbook-shuffle]")) {
      const collectionId = Number(target.closest("[data-textbook-shuffle]").dataset.textbookShuffle);
      const collection = textbook2Collections.find((item) => item.id === collectionId);
      if (collection) {
        const previous = ui.textbook2Orders[collectionId] || collection.cards.map((_, i) => i);
        const order = previous.slice();
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        if (order.length > 1 && order.every((value, i) => value === previous[i])) order.push(order.shift());
        ui.textbook2Orders[collectionId] = order;
        ui.textbook2Index = 0;
        ui.textbook2Flipped = false;
        ui.textbook2View = "cards";
        renderRoute({ scroll: false });
        toast("Карточки перемешаны");
      }
      return;
    }

    if (target.closest("[data-mode]")) {
      ui.practiceMode = target.closest("[data-mode]").dataset.mode;
      renderRoute({ scroll: false });
      return;
    }
    if (target.closest("[data-start-quiz]")) { startQuiz(); return; }
    if (target.closest("[data-answer]")) { answerQuiz(target.closest("[data-answer]").dataset.answer); return; }
    if (target.closest("[data-quiz-next]")) { nextQuestion(); return; }
    if (target.closest("[data-quiz-again]")) { startQuiz(); return; }
    if (target.closest("[data-quiz-setup]")) { quiz = null; renderRoute({ scroll: false }); return; }

    if (target.closest("[data-phrase-view]")) { ui.phraseView = target.closest("[data-phrase-view]").dataset.phraseView; renderRoute({ scroll: false }); return; }
    if (target.closest("[data-phrase-list-select]")) { ui.phraseIndex = Number(target.closest("[data-phrase-list-select]").dataset.phraseListSelect); ui.phraseView = "cards"; renderRoute({ scroll: false }); return; }
    if (target.closest("[data-phrase-prev], [data-phrase-next]")) { const lesson = Number((location.hash.match(/lesson-(\d+)/) || [])[1]); const max = (textbook2PhraseCounts[lesson] || 24) - 1; ui.phraseIndex = clamp((ui.phraseIndex || 0) + (target.closest("[data-phrase-next]") ? 1 : -1), 0, max); renderRoute({ scroll: false }); return; }
    if (target.closest("[data-phrase-word]")) { const btn=target.closest("[data-phrase-word]"); const answer=$(`[data-phrase-answer="${btn.dataset.phraseWord}"]`); if(answer){const token=document.createElement("button");token.type="button";token.className="phrase-picked";token.textContent=btn.dataset.word;token.dataset.pickedWord=btn.dataset.word;token.onclick=()=>{token.remove();btn.disabled=false;};answer.append(token);}btn.disabled=true;return;}
    if (target.closest("[data-phrase-reset]")) {const id=target.closest("[data-phrase-reset]").dataset.phraseReset;const answer=$(`[data-phrase-answer="${id}"]`);if(answer)answer.innerHTML="";$$ (`[data-phrase-word="${id}"]`).forEach(btn=>btn.disabled=false);const feedback=$(`[data-phrase-feedback="${id}"]`);if(feedback)feedback.textContent="";return;}
    if (target.closest("[data-phrase-check]")) {const btn=target.closest("[data-phrase-check]");const id=btn.dataset.phraseCheck;const answer=$(`[data-phrase-answer="${id}"]`);const feedback=$(`[data-phrase-feedback="${id}"]`);if(answer&&feedback){const value=Array.from(answer.children).map(x=>x.dataset.pickedWord).join(" ").trim();const correct=value===decodeURIComponent(btn.dataset.phraseCorrect);feedback.textContent=correct?"Верно! ✓":"Пока неверно — попробуйте ещё.";if(correct){const lesson=Number(btn.dataset.phraseLesson);const key=`phraseDone${lesson}-v2`;const done=JSON.parse(localStorage.getItem(key)||"[]");if(!done.includes(Number(id)))done.push(Number(id));localStorage.setItem(key,JSON.stringify(done));if(done.length >= (textbook2PhraseCounts[lesson] || Infinity)){renderRoute({scroll:false});}}}return;}
    if (target.closest("[data-textbook-direction]")) {
      const id = Number(target.closest("[data-textbook-direction]").dataset.textbookDirection);
      ui.textbook2RussianFirst[id] = !ui.textbook2RussianFirst[id];
      ui.textbook2Flipped = false;
      renderRoute({ scroll: false });
      return;
    }
    if (target.closest("[data-pack-direction]")) {
      const id = target.closest("[data-pack-direction]").dataset.packDirection;
      ui.packRussianFirst[id] = !ui.packRussianFirst[id];
      ui.flashFlipped = false;
      renderRoute({ scroll: false });
      return;
    }
    if (target.closest("[data-textbook-prev]") || target.closest("[data-textbook-next]")) {
      const current = location.hash.match(/#\/textbook-2\/lesson-(\d+)/);
      const collection = current && textbook2Collections.find((item) => item.id === Number(current[1]));
      if (collection) { const remaining = textbook2UnknownOrder(collection); ui.textbook2Index = clamp((ui.textbook2Index || 0) + (target.closest("[data-textbook-next]") ? 1 : -1), 0, Math.max(0, remaining.length - 1)); ui.textbook2Flipped = false; renderRoute({ scroll: false }); }
      return;
    }
    if (target.closest("[data-textbook-flip-button]") || target.closest("[data-textbook-flip]")) {
      const card = $(".textbook-word-card");
      if (card) { card.classList.toggle("flipped"); ui.textbook2Flipped = card.classList.contains("flipped"); }
      return;
    }

    if (target.closest("[data-textbook-flip]")) {
      if (event.target.closest("button, a")) return;
      target.closest("[data-textbook-flip]").classList.toggle("flipped");
      return;
    }
    if (target.closest("[data-flash-prev]")) {
      const pack = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])].find((x) => x.id === ui.flashPack);
      if (pack) { const remaining = (ui.packOrders[pack.id] || pack.cards.map((_, i) => i)).filter((i) => !state.words[`${pack.id}:${i}`]); ui.flashIndex = clamp(ui.flashIndex - 1, 0, Math.max(0, remaining.length - 1)); ui.flashFlipped = false; renderRoute({ scroll: false }); }
      return;
    }
    if (target.closest("[data-flash-next]")) {
      const pack = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])].find((x) => x.id === ui.flashPack);
      if (pack) { const remaining = (ui.packOrders[pack.id] || pack.cards.map((_, i) => i)).filter((i) => !state.words[`${pack.id}:${i}`]); ui.flashIndex = clamp(ui.flashIndex + 1, 0, Math.max(0, remaining.length - 1)); ui.flashFlipped = false; renderRoute({ scroll: false }); }
      return;
    }
    if (target.closest("[data-flash-flip]")) {
      ui.flashFlipped = !ui.flashFlipped;
      const card = $(".flashcard");
      if (card) card.classList.toggle("flipped", ui.flashFlipped);
      return;
    }
    if (target.closest("[data-flash-know]")) {
      const pack = [...DATA.vocab.packs, ...(DATA.vocab.noAudioPacks || [])].find((x) => x.id === ui.flashPack);
      if (pack) {
        const remaining = (ui.packOrders[pack.id] || pack.cards.map((_, i) => i)).filter((i) => !state.words[`${pack.id}:${i}`]);
        const originalIndex = remaining[ui.flashIndex];
        if (originalIndex == null) { renderRoute({ scroll: false }); return; }
        const key = `${pack.id}:${originalIndex}`;
        const wasKnown = Boolean(state.words[key]);
        setWord(pack.id, originalIndex, true);
        if (!wasKnown) toast("Слово отмечено · +2 XP");
        ui.flashIndex = Math.min(ui.flashIndex, Math.max(0, remaining.length - 2));
        ui.flashFlipped = false;
        renderRoute({ scroll: false });
      }
      return;
    }
    if (target.closest("[data-flip-card]")) {
      if (event.target.closest("button, a")) return;
      ui.flashFlipped = !ui.flashFlipped;
      target.closest("[data-flip-card]").classList.toggle("flipped", ui.flashFlipped);
      return;
    }

    if (target.closest("[data-reset-progress]")) {
      openModal(`<div class="modal-head"><h2>Сбросить прогресс?</h2><p>Это удалит все отметки букв, уроков, слов, XP и серию. Действие нельзя отменить.</p></div>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close-modal>Отмена</button><button class="btn btn-danger" type="button" data-confirm-reset>Да, сбросить</button></div>`, { small: true, label: "Сброс прогресса" });
      return;
    }
    if (target.closest("[data-confirm-reset]")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
      return;
    }

    const result = target.closest(".search-result");
    if (result) {
      if (result.dataset.searchGo) {
        const href = result.dataset.searchGo;
        closeSearch();
        location.hash = href;
        return;
      }
      if (result.dataset.searchPlay) {
        openDriveAudio(result.dataset.searchPlay, result.dataset.title || "Аудио", result.dataset.subtitle || "Аудиотека");
        closeSearch();
        return;
      }
      if (result.dataset.searchPdfLocal) {
        closeSearch();
        openLocalPdf(result.dataset.searchPdfLocal, result.dataset.title || "PDF", result.dataset.subtitle || "Аудиотека", result.dataset.page);
        return;
      }
      if (result.dataset.searchPdf) {
        closeSearch();
        openDrivePdf(result.dataset.searchPdf, result.dataset.title || "PDF", result.dataset.subtitle || "Аудиотека");
        return;
      }
      if (result.dataset.searchOpen) {
        window.open(driveDownload(result.dataset.searchOpen), "_blank", "noopener");
        closeSearch();
        return;
      }
    }
  };

  let libraryTimer = null;
  const restoreFocus = (id, position) => {
    setTimeout(() => {
      const input = document.getElementById(id);
      if (input) {
        input.focus();
        try { input.setSelectionRange(position, position); } catch (error) { /* search inputs поддерживают */ }
      }
    }, 0);
  };

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.id === "global-search-input") {
      renderSearchResults(target.value);
      return;
    }
    if (target.id === "semester-two-search") {
      ui.semesterTwoQuery = target.value;
      const pos = target.selectionStart || target.value.length;
      renderRoute({ scroll: false });
      restoreFocus("semester-two-search", pos);
      return;
    }
    if (target.id === "lesson-search") {
      ui.lessonQuery = target.value;
      const pos = target.selectionStart || target.value.length;
      renderRoute({ scroll: false });
      restoreFocus("lesson-search", pos);
      return;
    }
    if (target.id === "library-search") {
      const value = target.value;
      const pos = target.selectionStart || value.length;
      clearTimeout(libraryTimer);
      libraryTimer = setTimeout(() => {
        ui.libQuery = value;
        renderRoute({ scroll: false });
        restoreFocus("library-search", pos);
      }, 180);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "practice-count") {
      ui.practiceCount = Number(event.target.value) || 10;
    }
  });

  document.addEventListener("keydown", (event) => {
    const overlay = document.getElementById("search-overlay");
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (overlay.hidden) openSearch(); else closeSearch();
      return;
    }
    if (event.key === "/" && overlay.hidden && !event.target.closest("input, textarea, select")) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (!overlay.hidden) {
      if (event.key === "Escape") { event.preventDefault(); closeSearch(); return; }
      if (event.key === "ArrowDown") { event.preventDefault(); moveSearch(1); return; }
      if (event.key === "ArrowUp") { event.preventDefault(); moveSearch(-1); return; }
      if (event.key === "Enter") {
        event.preventDefault();
        const active = $(".search-result.active") || $(".search-result");
        if (active) active.click();
        return;
      }
    }
    if (event.key === "Tab" && overlay.hidden && modalRoot.innerHTML.trim()) {
      const focusable = $$("button, a[href], input, select, textarea, iframe, [tabindex]:not([tabindex='-1'])", modalRoot)
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const panel = $(".modal", modalRoot);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
        return;
      }
    }
    if (event.key === "Escape" && modalRoot.innerHTML.trim()) {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key === "Escape") {
      document.body.classList.remove("nav-open");
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && event.target.closest("[data-flip-card]")) {
      event.preventDefault();
      ui.flashFlipped = !ui.flashFlipped;
      const card = event.target.closest("[data-flip-card]");
      if (card) card.classList.toggle("flipped", ui.flashFlipped);
      return;
    }
    if (quiz && !quiz.finished && !event.target.closest("input, textarea, select")) {
      const q = quiz.questions[quiz.index];
      if (!quiz.answered && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        answerQuiz(Number(event.key) - 1);
        return;
      }
      if (quiz.answered && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        nextQuestion();
        return;
      }
      if (!quiz.answered && q && event.key === "Enter") {
        event.preventDefault();
      }
    }
  });

  document.addEventListener("click", onClick);
  document.addEventListener("click", (event) => {
    const province = event.target.closest("[data-game-province]");
    if (province) {
      handleGameProvince(province.dataset.gameProvince);
      return;
    }
    if (event.target.closest("[data-game-map-names]")) {
      gameShowProvinceNames = !gameShowProvinceNames;
      renderRoute({ scroll: false });
      return;
    }
    const flashcard = event.target.closest("[data-province-flip]");
    if (flashcard) {
      const flipped = flashcard.classList.toggle("is-flipped");
      flashcard.setAttribute("aria-pressed", String(flipped));
      flashcard.setAttribute("aria-label", flipped
        ? "Столица: " + flashcard.querySelector(".province-flashcard-back strong").textContent + ". Нажмите, чтобы вернуться к провинции"
        : "Провинция: " + flashcard.querySelector(".province-flashcard-front strong").textContent + ". Нажмите, чтобы увидеть столицу");
      return;
    }
    if (event.target.closest("[data-game-reset]")) {
      gameStart();
      renderRoute({ scroll: false });
      return;
    }
    if (event.target.closest("[data-game-retry]")) {
      gameMapError = "";
      loadGameMap();
      renderRoute({ scroll: false });
    }
  });
  document.addEventListener("keydown", (event) => {
    const province = event.target.closest("[data-game-province]");
    if (province && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      handleGameProvince(province.dataset.gameProvince);
    }
  });

  window.addEventListener("hashchange", () => {
    const section = (location.hash.replace(/^#\/?/, "").split("/")[0] || "home");
    if (section !== "practice" && quiz) quiz = null;
    closeModal({ syncHash: false });
    closeSearch();
    document.body.classList.remove("nav-open");
    renderRoute({ scroll: true });
  });

  initDay();
  renderRoute({ scroll: false });
  hydrateIcons(document);
})();
