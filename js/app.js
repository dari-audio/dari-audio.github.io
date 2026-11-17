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
    const total = DATA.meta.counts;
    const parts = [
      lettersKnown() / total.letters,
      lessonsDone() / total.lessons,
      wordsDone() / Math.max(1, total.vocabWords),
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
    const src = `${path}#${pageNumber > 1 ? `page=${pageNumber}&` : ""}view=FitH`;
    openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>
      <div class="pdf-frame-wrap"><iframe src="${esc(src)}" title="${esc(title)}" loading="lazy"></iframe></div>
      <div class="modal-actions">
        <a class="btn btn-ghost btn-sm" href="${esc(src)}" target="_blank" rel="noopener">${svg("external")} Открыть в новой вкладке</a>
        <a class="btn btn-soft btn-sm" href="${esc(path)}" download>${svg("download")} Скачать PDF</a>
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
    walk(DATA.library, []);
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
    const lDone = lessonsDone();
    const wDone = wordsDone();
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
      "دنیا به کام ابله‌گان است",
      "قطره قطره دریا میشه",
      "حب‌الوطن من‌الایمان"
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
        ${statCard("Уроки", `${lDone}/${total.lessons}`, "пройдено", "book", (lDone / total.lessons) * 100)}
        ${statCard("Слова", `${wDone}/${total.vocabWords}`, "в словаре", "cards", (wDone / Math.max(1, total.vocabWords)) * 100)}
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
          <h3>Словарь</h3><p>Карточки с живым произношением</p>
          <div class="route-meta"><span>${wDone} из ${total.vocabWords} слов</span><small>${total.trainers} тренажёров</small></div>
        </a>
        <a class="route-card" href="#/lessons" data-letter="د">
          <span class="route-icon">${svg("book")}</span>
          <h3>40 уроков</h3><p>Полный курс с аудио и PDF</p>
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
      <div class="tip-box"><strong>Подсказка.</strong> ${esc(letter.tip)}</div>
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

  const renderLessons = () => {
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
          <span class="eyebrow">Основной курс</span>
          <h1>40 уроков</h1>
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
      ${filtered.length ? `<div class="lesson-grid" id="lesson-grid">
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
          <h1>Словарь с голосом</h1>
          <p>${total.vocabWords} карточек в пяти наборах и ${total.trainers} аудиотренажёров. В каждой записи звучит дари — слушайте, повторяйте, отмечайте знакомые слова.</p>
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
        <div><h2>Аудиотренажёры</h2><p>Наборы без перевода: тренируйте слух на тематических подборках из архива.</p></div>
        <span class="small muted">${fmt(DATA.vocab.trainers.reduce((s, t) => s + t.count, 0))} записей</span>
      </div>
      <div class="trainer-grid">
        ${DATA.vocab.trainers.map((trainer) => `<a class="trainer-card" href="#/trainer/${esc(trainer.id)}">
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
    remember({ label: `Словарь · ${pack.title}`, title: pack.title, subtitle: `${pack.cards.length} слов`, href: `#/vocab/${pack.id}`, mark: pack.icon });
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
    ui.flashIndex = index;

    const flash = unknownOrder.length ? `<div class="flash-wrap">
      <div class="flash-progress"><span>${index + 1} / ${unknownOrder.length} осталось</span><div class="progress-track"><div class="progress-fill" style="width:${((index + 1) / unknownOrder.length) * 100}%"></div></div><span>${known} ${plural(known, ["слово", "слова", "слов"])} знакомо</span></div>
      <div class="flashcard-stage">
        <div class="flashcard ${ui.flashFlipped ? "flipped" : ""}" data-flip-card tabindex="0" role="button" aria-label="Перевернуть карточку">
          <div class="flash-face front">
            ${card.numeral ? `<div class="flash-numeral">${esc(card.numeral)}</div>` : ""}
            <div class="flash-dari">${esc(card.dari)}</div>
            <div class="flash-translit">${esc(card.translit)}</div>
            ${card.audio ? `<button class="btn btn-soft btn-sm" type="button" data-play-src="${esc(card.audio)}" data-title="${esc(card.dari)}" data-subtitle="${esc(card.translit + " — " + card.ru)}">${svg("volume")} Слушать</button>` : ""}
            <span class="hint">Нажмите на карточку, чтобы увидеть перевод</span>
          </div>
          <div class="flash-face back">
            <div class="flash-numeral" style="color:var(--gold)">${isKnown ? "знакомое слово" : "перевод"}</div>
            <div class="flash-ru">${esc(card.ru)}</div>
            <div class="flash-translit" style="color:var(--gold)">${esc(card.translit)}</div>
            ${card.note ? `<div class="flash-note">${esc(card.note)}</div>` : ""}
            <span class="hint">Нажмите ещё раз, чтобы вернуться</span>
          </div>
        </div>
      </div>
      <div class="flash-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-flash-prev>${svg("arrowLeft")} Назад</button>
        <button class="btn btn-soft btn-sm" type="button" data-flash-flip>${svg("flip")} Перевод</button>
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
          <span class="translit">${esc(word.translit)}</span>
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
          <span class="eyebrow">Словарь · ${pack.count} слов</span>
          <h1>${esc(pack.title)}</h1>
          <div class="en-title">${esc(pack.subtitle)}</div>
          <p>${esc(pack.description)}</p>
        </div>
        <div class="detail-actions">
          <span class="badge badge-green">${known} из ${pack.cards.length} знакомо</span>
          ${pack.cards.some((word) => word.audio) ? `<button class="btn btn-primary" type="button" data-play-all="pack:${esc(pack.id)}">${svg("play")} Слушать набор</button>` : ""}
        </div>
      </div>
      <div class="flash-toolbar">
        <div class="view-switch">
          <button class="${ui.packView === "cards" ? "active" : ""}" type="button" data-pack-view="cards">${svg("cards")} Карточки</button>
          <button class="${ui.packView === "list" ? "active" : ""}" type="button" data-pack-view="list">${svg("list")} Список</button>
        </div>
        <button class="btn btn-soft btn-sm" type="button" data-shuffle-pack="${esc(pack.id)}">↝ Перемешать</button>
        <div class="progress-inline" style="min-width:220px"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>
      </div>
      ${ui.packView === "list" ? list : flash}
      <div class="notice" style="margin-top:24px">${svg("headphones")}<span>${pack.noAudio ? "В этой подборке нет аудиозаписей. Изучайте слова с помощью карточек и отмечайте знакомые." : pack.id === "numbers" ? "Числа дари пишутся восточными цифрами, а звучат почти как персидские. Обратите внимание на «و» (о) между десятками и единицами." : "Аудио записано носителями: сначала слово на английском, затем дари. Повторяйте вслед за диктором, не боясь ошибиться."}</span></div>
    </div>`;
  };

  const renderTrainer = (id) => {
    const trainer = DATA.vocab.trainers.find((x) => x.id === id);
    if (!trainer) return notFound("Тренажёр не найден");
    remember({ label: "Аудиотренажёр", title: trainer.title, subtitle: `${trainer.count} записей · ${trainer.description}`, href: `#/trainer/${trainer.id}`, mark: "🎧" });
    return `<div class="page">
      <a class="back-link" href="#/vocab">${svg("arrowRight")} Словарь</a>
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
      <div class="panel">
        <div class="panel-head"><div><h2>Записи</h2><p>Файлы идут в порядке исходного архива. Параллельного текста к этому набору в архиве нет — это чистое аудирование.</p></div></div>
        <div class="audio-list">
          ${trainer.audio.map((file, i) => `<div class="audio-row">
            <span class="code">${pad(i + 1)}</span>
            <div class="info"><strong>Запись ${i + 1} · ${esc(file.name)}</strong>${trainer.words && trainer.words[i] ? `<div class="trainer-word" lang="fa" dir="rtl">${esc(trainer.words[i].dari)}</div><span class="trainer-translit" dir="ltr">${esc(trainer.words[i].translit)}</span><span class="trainer-translation">${esc(trainer.words[i].ru)}</span>` : ""}</div>
            <button class="play-round" type="button" data-play-src="${esc(file.path)}" data-queue="trainer:${esc(trainer.id)}" data-qindex="${i}" data-title="Запись ${i + 1}" data-subtitle="${esc(trainer.title)}" aria-label="Слушать">${svg("play")}</button>
          </div>`).join("")}
        </div>
      </div>
      <div class="notice" style="margin-top:18px">${svg("info")}<span>${trainer.id === "commands" ? "В архиве есть частичная расшифровка команд — используйте её как подсказку после прослушивания." : "Слушайте по 5–7 записей за раз и возвращайтесь к ним через день. Повторение важнее скорости."}</span></div>
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
      const pool = uniq(DATA.lessons.flatMap((lesson) => lesson.phrases.map((p) => ({ ...p, lesson: lesson.num }))), (x) => x.dari);
      return sample(pool, Math.min(count, pool.length)).map((phrase) => {
        const wrong = sample(pool.filter((x) => x.dari !== phrase.dari), 3).map((x) => x.dari);
        const options = shuffle([phrase.dari, ...wrong]);
        return {
          prompt: phrase.ru, promptKind: "ru", promptLabel: "Выберите фразу на дари",
          sub: `Урок ${phrase.lesson}`, options: options.map((label) => ({ label })),
          optionDari: true, optionsSingle: true,
          correctIndex: options.indexOf(phrase.dari),
          explanation: `${phrase.dari} · ${phrase.translit}`,
          detail: phrase.ru,
        };
      });
    }
    const source = allCards().filter((item) => item.card.ru && (mode !== "listening" || item.card.audio));
    const pool = uniq(source, (x) => x.card.ru.toLowerCase());
    return sample(pool, Math.min(count, pool.length)).map((item) => {
      const wrong = sample(pool.filter((x) => x.card.ru.toLowerCase() !== item.card.ru.toLowerCase()), 3).map((x) => x.card.ru);
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
    const total = allCards().length;
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
              <span class="practice-note">${total} слов · ${DATA.letters.length} букв · ${DATA.lessons.reduce((s, l) => s + l.phrases.length, 0)} фраз</span>
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
    const description = node.description || root.description || "Материалы архива DLIFLC.";
    return `<div class="page">
      <a class="back-link" href="#/library">${svg("arrowRight")} Все разделы</a>
      <div class="page-head">
        <div><span class="eyebrow">Аудиотека · ${fmt(node.fileCount)} ${plural(node.fileCount, ["файл", "файла", "файлов"])}</span><h1>${esc(node.name)}</h1><p>${esc(description)}</p></div>
        <div class="page-head-actions"><a class="btn btn-ghost btn-sm" href="${esc(driveFolder(node.id))}" target="_blank" rel="noopener">${svg("external")} Открыть в Drive</a></div>
      </div>
      ${content}
      <div class="library-source-note"><span>Аудио и PDF из исходного архива DLIFLC. Записи аудиотеки открываются во встроенном плеере Google Drive, а скрипты и задания — на странице нужной записи.</span><a href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">Исходная папка ${svg("external")}</a></div>
    </div>`;
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
      DATA.library.forEach((root) => {
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
        ${DATA.library.map((root) => `<a class="library-card" href="#/library/${esc(root.id)}" data-count="${root.fileCount}">
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
  const textbook2Collections = Array.from({ length: 23 }, (_, index) => ({
    id: index + 1, title: `Урок ${index + 1}`,
    cards: index === 1 ? [{"dari":"آب‌خیزی","translit":"ābxēzi","ru":"наводнение, половодье"},{"dari":"بارندگی","translit":"bārendagi","ru":"осадки"},{"dari":"بحری","translit":"bahri","ru":"морской"},{"dari":"برف‌باری","translit":"barfbāri","ru":"снегопад"},{"dari":"بری","translit":"barri","ru":"континентальный"},{"dari":"پوشیده","translit":"pōšida","ru":"покрытый"},{"dari":"تونل","translit":"tunal","ru":"тоннель"},{"dari":"جبل","translit":"jabal (jabāl)","ru":"гора"},{"dari":"جلغوزه","translit":"jalğōza","ru":"орех (плод горного кедра)"},{"dari":"جلگه","translit":"jelga","ru":"равнина"},{"dari":"جهیل","translit":"jahil","ru":"озеро"},{"dari":"حبوبات","translit":"hobubāt","ru":"злаки, зерновые"},{"dari":"حصه","translit":"hessa (hesas)","ru":"часть, доля"},{"dari":"خروشان","translit":"xorōšān","ru":"бурный (о реке и т.п.)"},{"dari":"هسته","translit":"xasta","ru":"косточка (плода), орешек"},{"dari":"خفیف","translit":"xafif","ru":"слабый (по интенсивности)"},{"dari":"دامنه","translit":"dāmana","ru":"склон (горы)"},{"dari":"رطوبت","translit":"rotubat","ru":"влажность"},{"dari":"ژاله","translit":"žāla","ru":"град"},{"dari":"سرسبز","translit":"sarsabz","ru":"зеленый (о растительности)"},{"dari":"سلسله","translit":"selsela","ru":"ряд, цепь"},{"dari":"شاداب","translit":"šādāb","ru":"напоенный водой"},{"dari":"صحرا","translit":"sahrā","ru":"пустыня"},{"dari":"طوفان","translit":"tufān","ru":"ураган, буря"},{"dari":"عمیق","translit":"‘amiq","ru":"глубокий"},{"dari":"فلات","translit":"falāt","ru":"плоскогорье, плато"},{"dari":"قلبه کردن","translit":"qolba kardan","ru":"боронить, пахать"},{"dari":"قله","translit":"qolla (qolal)","ru":"вершина (горы)"},{"dari":"کرد","translit":"kord","ru":"грядка, делянка"},{"dari":"گسترش یافتن","translit":"gostareš yāftan","ru":"простираться, расстилаться"},{"dari":"مساحت","translit":"masāhat","ru":"площадь (размер)"},{"dari":"وصل کردن","translit":"wasl kardan","ru":"связывать, соединять"},{"dari":"فرانسه","translit":"Farānsa","ru":"Франция"},{"dari":"سب تروپیکی","translit":"sabtorōpiki","ru":"субтропический"},{"dari":"آبی","translit":"ābi","ru":"поливной"},{"dari":"للمی","translit":"lalmi","ru":"богарный (неполивной)"},{"dari":"بی آب","translit":"bē-āb","ru":"безводный"},{"dari":"جاری شدن","translit":"jāri šodan","ru":"протекать"},{"dari":"شادابی","translit":"šādābi","ru":"свежесть, процветание; обилие"}] : index === 2 ? [{"dari":"اداری","translit":"edāri","ru":"административный"},{"dari":"اکثریت","translit":"aksareyyat","ru":"большинство"},{"dari":"پیرو","translit":"payraw","ru":"последователь"},{"dari":"پیشه","translit":"pēša","ru":"ремесло, профессия"},{"dari":"تخمین","translit":"taxmin","ru":"подсчет (приблизительный)"},{"dari":"تراکم","translit":"tarākom","ru":"скопление; плотность (населения)"},{"dari":"تکلم","translit":"takallom","ru":"разговор, речь (на каком-л. языке)"},{"dari":"جریان","translit":"jeryān, jarayān","ru":"течение, движение"},{"dari":"جریان داشتن","translit":"jeryān dāštan","ru":"протекать, иметь место"},{"dari":"حصار","translit":"hesār","ru":"крепость, форт"},{"dari":"حوالی","translit":"hawāli","ru":"окрестности"},{"dari":"دامن","translit":"dāman","ru":"юбка, подол; подножие"},{"dari":"راسته","translit":"rāstā","ru":"деревня, сельская местность"},{"dari":"رول","translit":"rōl","ru":"роль"},{"dari":"ساختمان","translit":"sāxtomān","ru":"строительство"},{"dari":"فاصله","translit":"fāsela (fawāsel)","ru":"расстояние"},{"dari":"قبر","translit":"qabr","ru":"могила"},{"dari":"قبیله","translit":"qabila (qabāyel)","ru":"племя"},{"dari":"قوم","translit":"qawm (aqwām)","ru":"род, народность"},{"dari":"کول","translit":"kōl","ru":"пруд, водохранилище"},{"dari":"گنبد","translit":"gonbad","ru":"купол"},{"dari":"متعدد","translit":"mota’added","ru":"многочисленный"},{"dari":"محسوب شدن","translit":"mahsub šodan","ru":"считаться (чем-л., кем-л., каким-л.)"},{"dari":"مغاره","translit":"magāra","ru":"пещера"},{"dari":"ملیت","translit":"melleyyat","ru":"национальность"},{"dari":"میدان","translit":"maydān","ru":"площадь, площадка"},{"dari":"روسی","translit":"rusi","ru":"российский"},{"dari":"اتراموی","translit":"tarāmwē","ru":"трамвай"},{"dari":"کول","translit":"kōl","ru":"озеро, водохранилище"},{"dari":"نیپر","translit":"Nēper","ru":"Днепр [имя собственное]"},{"dari":"مسکن","translit":"maskan","ru":"жильё"},{"dari":"سکه","translit":"sek","ru":"сикх"},{"dari":"خراسان","translit":"Xorāsān","ru":"Хорасан [имя собственное]"},{"dari":"خارجی","translit":"xāreji","ru":"иностранный"},{"dari":"اقوام","translit":"aqvām","ru":"народы"}] : index === 3 ? [{"dari":"احداث","translit":"ehdās","ru":"создание, сооружение"},{"dari":"استخراج","translit":"estexrāj","ru":"добыча (полезных ископаемых)"},{"dari":"الماس","translit":"almās","ru":"алмаз"},{"dari":"بایر","translit":"bāyer","ru":"невозделанный, целинный (о земле)"},{"dari":"بهره‌برداری","translit":"bahrabardāri","ru":"эксплуатация (напр. ресурсов)"},{"dari":"پایپ‌لاین","translit":"pāyplayn","ru":"трубопровод"},{"dari":"پیام","translit":"payām","ru":"послание, обращение"},{"dari":"تجربه","translit":"tajroba (tajārob)","ru":"опыт"},{"dari":"تخنیک","translit":"taxnik","ru":"техника"},{"dari":"تفحص","translit":"tafahhos","ru":"поиск, разведка (геологическая)"},{"dari":"تلگرام","translit":"telgerām","ru":"телеграмма"},{"dari":"تولید","translit":"towlid","ru":"производство"},{"dari":"ثروت","translit":"sorwat","ru":"богатство"},{"dari":"جست","translit":"jast","ru":"цинк"},{"dari":"جیولوجست","translit":"jeyālōjest","ru":"геолог"},{"dari":"چشمه","translit":"čašma","ru":"источник, родник"},{"dari":"حجر","translit":"hajar (ahjār)","ru":"камень"},{"dari":"خیلی","translit":"xēlē","ru":"очень"},{"dari":"دلدلزار","translit":"daldarzār","ru":"болото"},{"dari":"ذخیره","translit":"zaxira (zaxāyer)","ru":"запас"},{"dari":"ذوب","translit":"zawb","ru":"плавление, таяние"},{"dari":"زمرد","translit":"zamarod","ru":"изумруд"},{"dari":"ساحل","translit":"sāhel (sawāhel)","ru":"берег"},{"dari":"سرب","translit":"sorb","ru":"свинец"},{"dari":"سرشار","translit":"saršār","ru":"обильный, неисчерпаемый"},{"dari":"شیشه","translit":"šiša","ru":"стекло"},{"dari":"طلا","translit":"telā","ru":"золото"},{"dari":"فلز","translit":"felez","ru":"металл"},{"dari":"فلک","translit":"falak (aflāk)","ru":"небо"},{"dari":"فنی","translit":"fanni","ru":"технический; художественный"},{"dari":"کشف","translit":"kašf","ru":"открытие, обнаружение"},{"dari":"کلید","translit":"kelid","ru":"ключ"},{"dari":"گچ","translit":"gač","ru":"алебастр, гипс"},{"dari":"گران‌بها","translit":"gerānbahā","ru":"драгоценный"},{"dari":"لاجورد","translit":"lājaward","ru":"ляпис-лазурь, лазурит"},{"dari":"ماده","translit":"mādda (mawād)","ru":"вещество"},{"dari":"محروقات","translit":"mahruqāt","ru":"горючее, топливо"},{"dari":"مرمر","translit":"marmar","ru":"мрамор"},{"dari":"مس","translit":"mes","ru":"медь"},{"dari":"مساله","translit":"masāla","ru":"пластмасса"},{"dari":"مطلوب","translit":"matlub","ru":"желательный, надлежащий"},{"dari":"معاونت","translit":"mo’āwenat","ru":"помощь"},{"dari":"ملت","translit":"mellat (melal)","ru":"нация"},{"dari":"ملح","translit":"melh (amlāh)","ru":"соль"},{"dari":"مملو","translit":"mamlu","ru":"полный, наполненный"},{"dari":"منبع","translit":"manba’ (manābe’)","ru":"источник"},{"dari":"نشر","translit":"našr","ru":"опубликование, издание"},{"dari":"نفت","translit":"naft","ru":"нефть"},{"dari":"نقش","translit":"naqš","ru":"роль"},{"dari":"نیازمندی","translit":"neyāzmandi","ru":"нужда, необходимость"},{"dari":"هکذا","translit":"hákazā","ru":"также"},{"dari":"صدور","translit":"sodur","ru":"экспорт"},{"dari":"جرقدق","translit":"Jarqoduq","ru":"Джаркудук (месторождение)"},{"dari":"احداث","translit":"ehdās","ru":"создание, строительство"},{"dari":"علمی","translit":"'elmi","ru":"научный"}] : index === 4 ? [{"dari":"احساس","translit":"ehsās","ru":"чувство, ощущение"},{"dari":"ارسال","translit":"ersāl","ru":"отправка (чего-л.)"},{"dari":"بیچاره","translit":"bēčāra","ru":"несчастный, бедняга"},{"dari":"پیچاندن","translit":"pēčāndan","ru":"завёртывать"},{"dari":"تبصره","translit":"tabsera","ru":"комментарий"},{"dari":"ترویج","translit":"tarwij","ru":"распространение, внедрение"},{"dari":"تسریع","translit":"tasri’","ru":"ускорение"},{"dari":"تسلیم شدن","translit":"taslim šodan","ru":"сдаваться"},{"dari":"تشدید","translit":"tašdid","ru":"усиление, интенсификация"},{"dari":"تصویب","translit":"taswib","ru":"утверждение (документа и т.п.)"},{"dari":"تمدید","translit":"tamdid","ru":"продление"},{"dari":"تنظیم","translit":"tanzim","ru":"упорядочивание, налаживание"},{"dari":"تنویر","translit":"tanwir","ru":"освещение"},{"dari":"توصیه","translit":"tawseya","ru":"совет, рекомендация"},{"dari":"جاپان","translit":"Jāpān","ru":"Япония"},{"dari":"جزیره","translit":"jazira (jazāyer)","ru":"остров"},{"dari":"حمله","translit":"hamla","ru":"нападение, атака"},{"dari":"خاموش","translit":"xāmōš","ru":"тихий, спокойный"},{"dari":"فرار","translit":"farār","ru":"бегство, побег"},{"dari":"قادر بودن","translit":"qāder budan","ru":"быть в состоянии (сделать что-л.)"},{"dari":"قدیفه","translit":"qadifa","ru":"накидка; полотенце (банное)"},{"dari":"قوت","translit":"qowwat, qowwa (qowā)","ru":"сила"},{"dari":"مبالغه","translit":"mobāleğa","ru":"преувеличение"},{"dari":"مبصر","translit":"mobasser","ru":"комментатор"},{"dari":"مجادله","translit":"mojādela","ru":"борьба"},{"dari":"مجرب","translit":"mojarrab","ru":"опытный"},{"dari":"مجلل","translit":"mojallal","ru":"великолепный; торжественный"},{"dari":"مجهز","translit":"mojahhaz","ru":"оснащенный, оборудованный"},{"dari":"محسوس","translit":"mahsus","ru":"ощутимый"},{"dari":"مخالفت","translit":"moxālefat","ru":"несогласие"},{"dari":"مذکور","translit":"mazkur","ru":"вышеупомянутый"},{"dari":"مزروع","translit":"mazru’","ru":"обрабатываемый, возделываемый (о земле)"},{"dari":"مسلک","translit":"maslak (masālek)","ru":"профессия, специальность"},{"dari":"مسئول","translit":"mas’ul","ru":"ответственный"},{"dari":"مشغول","translit":"mašğul","ru":"занятый (чем-л.)"},{"dari":"مضایقه کردن","translit":"mozāyeqa kardan","ru":"жалеть (усилия и т.п.)"},{"dari":"مطالبه","translit":"motāleba","ru":"требование"},{"dari":"مقایسه","translit":"moqāyesa","ru":"сравнение"},{"dari":"مقرره","translit":"moqarrara","ru":"правило, положение (документ)"},{"dari":"مورد","translit":"mawred (mawāred)","ru":"случай; объект (чего-л.)"},{"dari":"مولد","translit":"mowalled","ru":"производитель"},{"dari":"واضح","translit":"wāzeh","ru":"ясный, очевидный"},{"dari":"مقاله","translit":"maqāla","ru":"статья"},{"dari":"رعایت کردن","translit":"re'āyat kardan","ru":"соблюдать"},{"dari":"سالون","translit":"sālōn","ru":"зал"},{"dari":"باشکوه","translit":"bāšokōh","ru":"торжественный, величественный"},{"dari":"قادر","translit":"Qāder","ru":"Кадыр (мужское имя)"},{"dari":"طاهر","translit":"Tāher","ru":"Тахир (мужское имя)"},{"dari":"نشر شدن","translit":"našr šodan","ru":"публиковаться"},{"dari":"تولیدات","translit":"tawlidāt","ru":"продукция, производство"},{"dari":"از","translit":"az","ru":"о, от"},{"dari":"به شدت","translit":"ba šeddat","ru":"упорно, сильно"},{"dari":"تیم","translit":"tēm","ru":"команда"},{"dari":"استراحت","translit":"esterāhat","ru":"отдых"}] : index === 5 ? [{"dari":"ابتدا","translit":"ebtedā","ru":"начало"},{"dari":"ارزنده","translit":"arzenda","ru":"ценный"},{"dari":"اعدام","translit":"e’dām","ru":"казнь"},{"dari":"البته","translit":"albatta","ru":"разумеется, конечно"},{"dari":"انتخاب","translit":"entexāb","ru":"выбор"},{"dari":"آویختن","translit":"āwēxtan","ru":"вешать"},{"dari":"آهسته","translit":"āhesta","ru":"медленный, тихий"},{"dari":"بلندقامت","translit":"bolandqāmat","ru":"высокого роста"},{"dari":"بوت‌دوزی","translit":"butdōzi","ru":"изготовление обуви"},{"dari":"پخسه","translit":"paxsa","ru":"слой глины (при кладке стены)"},{"dari":"پوستینچه","translit":"pōstinča","ru":"меховая куртка"},{"dari":"تزئید","translit":"tazyid","ru":"увеличение"},{"dari":"تصادفاً","translit":"tasādofan","ru":"случайно"},{"dari":"تطبیق","translit":"tatbiq","ru":"выполнение (плана), претворение в жизнь"},{"dari":"تعلق","translit":"ta’alloq","ru":"принадлежность"},{"dari":"تولیدی","translit":"tawlidi","ru":"изготовленный"},{"dari":"تهداب‌گذاری","translit":"tahdābgozāri","ru":"закладка фундамента"},{"dari":"جرم","translit":"jorm","ru":"преступление"},{"dari":"جلاد","translit":"jallād","ru":"палач"},{"dari":"جنسیت","translit":"jenseyyat","ru":"качество (товара)"},{"dari":"چرم","translit":"čarm","ru":"кожа (выделанная)"},{"dari":"چنین","translit":"čonin","ru":"такой"},{"dari":"حاکم","translit":"hākem","ru":"правитель, уездный начальник"},{"dari":"حایز بودن","translit":"hāyez budan","ru":"владеть, иметь"},{"dari":"حجم","translit":"hojm","ru":"объем"},{"dari":"حجار","translit":"hajjār","ru":"каменотес"},{"dari":"حد","translit":"hadd (hodud)","ru":"граница"},{"dari":"حلاج","translit":"hallāj","ru":"чесальщик хлопка"},{"dari":"دار","translit":"dār","ru":"виселица"},{"dari":"دزدی کردن","translit":"dozdi kardan","ru":"красть, обкрадывать"},{"dari":"دسترسی","translit":"dastrasi","ru":"доступ"},{"dari":"دستگاه","translit":"dastgāh","ru":"станок, аппарат, установка"},{"dari":"دستور","translit":"dastur (dasātir)","ru":"распоряжение"},{"dari":"دوام","translit":"dawām","ru":"продолжение; долговечность"},{"dari":"دیزاین","translit":"dizāyn","ru":"рисунок, орнамент"},{"dari":"رنگ‌آمیزی","translit":"rangāmēzi","ru":"покраска"},{"dari":"روند","translit":"rawend","ru":"процесс"},{"dari":"رها کردن","translit":"rahā kardan","ru":"отпускать, освобождать"},{"dari":"سلاح","translit":"selāh (asleha)","ru":"оружие"},{"dari":"سوزان","translit":"sōzān","ru":"обжигающий, палящий"},{"dari":"شامخ","translit":"šāmex","ru":"высокий, величавый"},{"dari":"شکار","translit":"šekār","ru":"охота; добыча"},{"dari":"شیء","translit":"šay’ (ašyā’)","ru":"вещь, изделие"},{"dari":"ضراب","translit":"zarrāb","ru":"чеканщик монет"},{"dari":"ضرابخانه","translit":"zarrābxāna","ru":"монетный двор"},{"dari":"طرح","translit":"tarh","ru":"разработка (плана и т.п.)"},{"dari":"طریق","translit":"tariq (toroq)","ru":"путь"},{"dari":"عاقبت","translit":"‘āqebat (‘awāqeb)","ru":"последствие"},{"dari":"فقدان","translit":"foqdān","ru":"отсутствие"},{"dari":"قاطع","translit":"qāte’","ru":"решительный, категорический"},{"dari":"قاقمه","translit":"qāqma","ru":"армячина"},{"dari":"قالین‌بافی","translit":"qālinbāfi","ru":"ковроткачество"},{"dari":"قرضه","translit":"qarza","ru":"заем, кредит"},{"dari":"قرن","translit":"qarn (qorun)","ru":"век"},{"dari":"قلعه","translit":"qal’a","ru":"крепость, дом (с усадьбой, обнесенной высокой стеной)"},{"dari":"قندسازی","translit":"qandsāzi","ru":"изготовление сахара"},{"dari":"کاشی‌سازی","translit":"kāšisāzi","ru":"изготовление изразцов, кафеля и т.п."},{"dari":"کبک","translit":"kabk","ru":"куропатка"},{"dari":"کرباس","translit":"karbās","ru":"холст"},{"dari":"کلاه‌دوزی","translit":"kolāhdōzi","ru":"шитье шапок"},{"dari":"کیلووات","translit":"kilowāt","ru":"киловатт"},{"dari":"گلیم","translit":"gelim","ru":"палас"},{"dari":"گلیم‌بافی","translit":"gelimbāfi","ru":"изготовление паласов"},{"dari":"گناه","translit":"gonāh","ru":"вина, грех"},{"dari":"گوگردسازی","translit":"gōgerdsāzi","ru":"изготовление спичек"},{"dari":"متمرکز","translit":"motamarkez","ru":"сосредоточенный, сконцентрированный"},{"dari":"محبس","translit":"mahbas (mahābes)","ru":"тюрьма"},{"dari":"محل","translit":"mahall","ru":"место"},{"dari":"مساعدت کردن","translit":"mosā’edat kardan","ru":"способствовать"},{"dari":"منتخب","translit":"montaxab","ru":"выбранный, избранный"},{"dari":"مهمات","translit":"mohemmāt","ru":"боеприпасы"},{"dari":"نازک","translit":"nāzok","ru":"тонкий"},{"dari":"ناله","translit":"nāla","ru":"стон, плач"},{"dari":"نساج","translit":"nassāj","ru":"ткач"},{"dari":"وسیله","translit":"wasila (wasāyel)","ru":"средство"},{"dari":"مساعدت","translit":"mosā'adat","ru":"содействие, помощь"},{"dari":"سالانه","translit":"sālāna","ru":"годовой"},{"dari":"مخابره کردن","translit":"moxābara kardan","ru":"сообщать, направлять"},{"dari":"رسیدن","translit":"residan","ru":"поступать, прибывать"},{"dari":"نغلو","translit":"Nağlō","ru":"Наглу (гидроэлектростанция)"},{"dari":"خصوصی","translit":"xosusi","ru":"частный"},{"dari":"تهیه شدن","translit":"tahiya šodan","ru":"поставляться, готовиться"},{"dari":"تهداب","translit":"tahdāb","ru":"фундамент"},{"dari":"موتررو","translit":"mōtarraw","ru":"автомобильная дорога"},{"dari":"با استفاده از","translit":"bā estefāda az","ru":"с использованием"},{"dari":"تجهیزات","translit":"tajhizāt","ru":"оборудование"},{"dari":"اعمدتاً","translit":"'omdatan","ru":"главным образом"},{"dari":"محبوبیت","translit":"mahbubeyyat","ru":"популярность"}] : index === 6 ? [{"dari":"ارتباط","translit":"ertebāt","ru":"связь, касательство"},{"dari":"آرد","translit":"ārd","ru":"мука"},{"dari":"آسیاب","translit":"āsyā(b)","ru":"мельница"},{"dari":"اعظمی","translit":"a’zami","ru":"максимальный"},{"dari":"آله","translit":"āla","ru":"инструмент, прибор"},{"dari":"اندک","translit":"andak","ru":"мало; малый"},{"dari":"بی‌نیاز","translit":"bēneyāz","ru":"не нуждающийся"},{"dari":"پشمینه","translit":"pašmina","ru":"шерстяная ткань"},{"dari":"ترمیم","translit":"tarmim","ru":"ремонт"},{"dari":"تصفیه","translit":"tasfeya","ru":"очистка"},{"dari":"تن","translit":"tan","ru":"тонна"},{"dari":"توربین","translit":"turbin","ru":"турбина"},{"dari":"تهیه","translit":"taheya","ru":"подготовка; заготовка; изготовление"},{"dari":"چودن","translit":"čōdan","ru":"чугун"},{"dari":"خشت","translit":"xešt","ru":"кирпич"},{"dari":"خوراکه","translit":"xōrāka","ru":"продукты (питания)"},{"dari":"دایمی","translit":"dāyemi","ru":"постоянный"},{"dari":"درخشان","translit":"daraxšān","ru":"блестящий"},{"dari":"دوخت","translit":"dōxt","ru":"шитьё"},{"dari":"دیزل","translit":"dizal","ru":"дизельное топливо"},{"dari":"ساحه","translit":"sāha","ru":"площадь, пространство"},{"dari":"سمنت","translit":"sement","ru":"цемент"},{"dari":"شرکت","translit":"šerkat","ru":"компания, ширکت"},{"dari":"صابون","translit":"sābun","ru":"мыло"},{"dari":"غله","translit":"ğalla","ru":"зерно, злак"},{"dari":"فایده","translit":"fāyeda (fawāyed)","ru":"польза, выгода"},{"dari":"فولاد","translit":"fōlād","ru":"сталь"},{"dari":"کاربامید","translit":"kārbāmid","ru":"карбамид"},{"dari":"کانسرو شده","translit":"kānsarwšoda","ru":"консервированный"},{"dari":"کشمش","translit":"kešmeš","ru":"изюм"},{"dari":"کشمش‌پاکی","translit":"kešmešpāki","ru":"очистка изюма"},{"dari":"کفاشی","translit":"kaffāši","ru":"производство обуви"},{"dari":"کمپل","translit":"kampal","ru":"одеяло"},{"dari":"کوره","translit":"kōra","ru":"печь"},{"dari":"گسترده","translit":"gostorda","ru":"широкий, обширный"},{"dari":"لین","translit":"layn","ru":"линия"},{"dari":"ماشین‌آلات","translit":"māšinālāt","ru":"механизмы"},{"dari":"مجموع","translit":"majmu’","ru":"сумма, совокупность"},{"dari":"مرفوع","translit":"marfu’","ru":"устраненный, утоленный"},{"dari":"مسلخ","translit":"maslax","ru":"скотобойня"},{"dari":"مشروب","translit":"mašrub","ru":"напиток"},{"dari":"میش","translit":"mēš","ru":"овца"},{"dari":"نخ","translit":"nax","ru":"нить, пряжа (хлопчатобумажная)"},{"dari":"واسطه","translit":"wāseta (wasāyet)","ru":"средство, механизм"},{"dari":"برمه کاری شدن","translit":"barmakāri šodan","ru":"бурить(ся)"},{"dari":"مربوطه","translit":"marbuta","ru":"соответствующий"},{"dari":"کارگاه","translit":"kārgāh","ru":"цех"},{"dari":"کانکریت آهندار","translit":"kānkrēt-e āhandār","ru":"железобетон"},{"dari":"چکی","translit":"čeki","ru":"чешский"},{"dari":"قسماً","translit":"qesman","ru":"частично"},{"dari":"ذیل","translit":"zeyl","ru":"следующий, ниже"},{"dari":"فارم","translit":"fārm","ru":"ферма"},{"dari":"پری فابریکیت","translit":"perifābrikēt","ru":"железобетонные блоки"},{"dari":"تیل","translit":"tēl","ru":"нефть, бензин"},{"dari":"تدویر","translit":"tadwir","ru":"бурение"}] : index === 7 ? [{"dari":"ارابه","translit":"arāba","ru":"колесо"},{"dari":"اشترنگ","translit":"eštereng","ru":"руль"},{"dari":"اعتنا","translit":"e’tenā","ru":"внимание"},{"dari":"اکسلیتر","translit":"aksalitar","ru":"акселератор"},{"dari":"انجن","translit":"enjen","ru":"двигатель, мотор"},{"dari":"انصاف","translit":"ensāf","ru":"справедливость"},{"dari":"انگشت","translit":"angošt","ru":"палец"},{"dari":"بادوام","translit":"bādawām","ru":"прочный, долговечный"},{"dari":"بالتی","translit":"bālti","ru":"батарейка"},{"dari":"برک","translit":"berek","ru":"тормоз"},{"dari":"برهم زدن","translit":"barham zadan","ru":"проводить в беспорядок, нарушать (порядок и т.п.)"},{"dari":"بطری","translit":"betri","ru":"аккумулятор"},{"dari":"بند ماندن","translit":"band māndan","ru":"застревать"},{"dari":"بی انصافی","translit":"bēensāf","ru":"бессовестный"},{"dari":"پایپ","translit":"pāyp","ru":"трубка (например, курительная)"},{"dari":"پر","translit":"por","ru":"полный, заполненный"},{"dari":"پلک","translit":"palak","ru":"свеча (автомашины)"},{"dari":"پنچر کردن","translit":"pančar kardan","ru":"проколоть"},{"dari":"پوش","translit":"pōš","ru":"чехол, капот"},{"dari":"تانک","translit":"tānk","ru":"танк; бак, цистерна; бензозаправочная станция"},{"dari":"تایر","translit":"tāyr","ru":"шина, автопокрышка"},{"dari":"تخلف (ات)","translit":"taxallof","ru":"нарушение (правил)"},{"dari":"ترانسپورت","translit":"tarānspōrt","ru":"транспорт"},{"dari":"ترانسفارمر","translit":"tarānsfārmer","ru":"трансформатор"},{"dari":"ترک کردن","translit":"tark kardan","ru":"покидать; прекращать"},{"dari":"تصادفاً","translit":"tasādorān","ru":"случайно"},{"dari":"تکر","translit":"takar","ru":"(разг.) столкновение, удар (друг о друга)"},{"dari":"تنباکو","translit":"tanbākō","ru":"табак"},{"dari":"تولبکس","translit":"tōlbaks","ru":"багажник"},{"dari":"تیوپ","translit":"teyup","ru":"баллон (шины)"},{"dari":"جارو","translit":"jāru","ru":"метла"},{"dari":"جدی","translit":"jeddi","ru":"серьёзный"},{"dari":"جرقه","translit":"jaraqqa","ru":"искра"},{"dari":"جریمه","translit":"jarima","ru":"штраф"},{"dari":"جزا","translit":"jazā","ru":"наказание"},{"dari":"جک","translit":"jak","ru":"штраф"},{"dari":"چارج کردن","translit":"čārj kardan","ru":"заряжать (например, аккумулятор)"},{"dari":"چارراهی","translit":"čārrāhi","ru":"перекрёсток"},{"dari":"چالان کردن","translit":"čālān kardan","ru":"заводить (мотор и т.п.)"},{"dari":"چلم","translit":"čalam","ru":"кальян"},{"dari":"چندان","translit":"čandān","ru":"столько, так много"},{"dari":"خاکستر","translit":"xākestar","ru":"пепел, зола"},{"dari":"خاموش","translit":"xāmōš","ru":"молчащий; погасший"},{"dari":"دواندن","translit":"dawāndan","ru":"погонять; водить (автомашину и т.п.)"},{"dari":"دور خوردن","translit":"dawr xōrdan","ru":"сворачивать, поворачиваться"},{"dari":"رأساً","translit":"ra’san","ru":"прямо, непосредственно"},{"dari":"ردیتر","translit":"raditar","ru":"радиатор"},{"dari":"رهنما","translit":"rahnamā","ru":"проводник, указывающий путь"},{"dari":"رینج","translit":"rēnj","ru":"(гаечный) ключ"},{"dari":"ریورس","translit":"riwars","ru":"задний ход"},{"dari":"ساکت","translit":"sākat","ru":"штепсель"},{"dari":"سوخته","translit":"sōxta","ru":"огарок, окурок"},{"dari":"سویچ","translit":"sowič","ru":"выключатель"},{"dari":"سیت","translit":"sit","ru":"кабина (водителя), сиденье"},{"dari":"سیم","translit":"sim","ru":"проволока, повод; спираль (электронагревательного прибора)"},{"dari":"شارتی","translit":"šārti","ru":"короткое замыкание"},{"dari":"شید","translit":"šēd","ru":"плафон, абажур"},{"dari":"صافی","translit":"sāfi","ru":"тряпка"},{"dari":"ضمناً","translit":"zemnam","ru":"одновременно, тем временем"},{"dari":"طالع","translit":"tāle’","ru":"удача, везенье"},{"dari":"عارضه (عوارض)","translit":"āreza (awārez)","ru":"поломка, неисправность"},{"dari":"عوض کردن","translit":"‘ewaz kardan","ru":"заменять"},{"dari":"غیرت","translit":"ğayrat","ru":"самолюбие; рвение, самоотверженность"},{"dari":"فالتو","translit":"fāltu","ru":"запасной"},{"dari":"قطع کردن","translit":"qat’ kardan","ru":"прерывать, перерезать"},{"dari":"کرین شافت","translit":"kerēnšāft","ru":"коленчатый вал"},{"dari":"کمباد","translit":"kambād","ru":"спущенный (о надувном предмете)"},{"dari":"گروپ","translit":"group","ru":"(электрическая) лампочка"},{"dari":"گریس","translit":"geris","ru":"солидол, солярка"},{"dari":"گل کردن","translit":"gol kardan","ru":"выключать"},{"dari":"گیربکس","translit":"girbaks","ru":"коробка передач"},{"dari":"لوکس","translit":"luks","ru":"шикарный, превосходный"},{"dari":"مبل آیل","translit":"moblāyel","ru":"машинное масло"},{"dari":"منتها","translit":"montahā","ru":"край; только, всего лишь"},{"dari":"مهارت","translit":"mahārat","ru":"мастерство"},{"dari":"میتر","translit":"mitar","ru":"счётчик (электроэнергии)"},{"dari":"میده","translit":"mayda","ru":"мелкий, измельчённый"},{"dari":"ناجوان","translit":"nājawān","ru":"трусливый, непорядочный"},{"dari":"نصب کردن","translit":"nasb kardan","ru":"прикреплять, ввинчивать"},{"dari":"نقض","translit":"naqz","ru":"нарушение (правил и т.п.)"},{"dari":"نمبرپلیت","translit":"nambarpalēt","ru":"номерной знак"},{"dari":"هارن","translit":"hāran","ru":"сигнал, гудок"},{"dari":"هاکی","translit":"hākī","ru":"хоккей на траве"},{"dari":"همراه","translit":"hamrāh","ru":"спутник, сопровождающий"} ,{"dari":"تز دکترا","translit":"tēz-e doktorā","ru":"докторская диссертация"},{"dari":"آریانا","translit":"Ariānā","ru":"«Ариана»"},{"dari":"درز","translit":"darz","ru":"трещина"},{"dari":"راه کسی را گرفتن","translit":"rāh-e kasi rā gereftan","ru":"загородить кому-л. дорогу"},{"dari":"پمپ کردن","translit":"pamp kardan","ru":"накачивать"},{"dari":"محکم گرفتن","translit":"mohkam gereftan","ru":"крепко схватить"},{"dari":"بار کردن","translit":"bār kardan","ru":"грузить"},{"dari":"دور دادن","translit":"dōr dādan","ru":"поворачивать"},{"dari":"کجا","translit":"kojā","ru":"где; какой страны"},{"dari":"باز کردن","translit":"bāz kardan","ru":"открывать, включать"},{"dari":"دیپلوماتیک","translit":"diplomātik","ru":"дипломатический"}] : index === 8 ? [{"dari":"ابلاغ","translit":"eblāğ","ru":"сообщение, уведомление"},{"dari":"اثر","translit":"asar","ru":"след; впечатление"},{"dari":"ارزان","translit":"arzān","ru":"дешёвый"},{"dari":"اقارب","translit":"aqāreb","ru":"родственники (мн.)"},{"dari":"آنگاه","translit":"āngāh","ru":"тогда, после этого"},{"dari":"برآوردن","translit":"barāwardan","ru":"испускать"},{"dari":"بزاز","translit":"bazzāz","ru":"мануфактурщик"},{"dari":"بندر (بنادر)","translit":"bandar (banāder)","ru":"порт"},{"dari":"بنیه (گر)","translit":"banya(gar)","ru":"бакалейщик"},{"dari":"تراشیدن","translit":"tarāšidan","ru":"брить, скоблить"},{"dari":"تنور","translit":"tanōr","ru":"духовка; печь"},{"dari":"چرخ","translit":"čarx","ru":"круг, точильный камень"},{"dari":"حاجت","translit":"hājat","ru":"нужда, необходимость"},{"dari":"حکاک","translit":"hakkāk","ru":"резчик по камню"},{"dari":"خریداری کردن","translit":"xaridāri kardan","ru":"покупать (книжн.)"},{"dari":"خیاط","translit":"xayyāt","ru":"портной"},{"dari":"دلاک","translit":"dallāk","ru":"цирюльник, брадобрей"},{"dari":"دوغ","translit":"dōğ","ru":"пахтанье, прохладительный напиток"},{"dari":"دیوانه","translit":"dēwāna","ru":"сумасшедший; безумец"},{"dari":"رابر","translit":"rābar","ru":"резина"},{"dari":"راندن","translit":"rāndan","ru":"прогонять"},{"dari":"رنج بردن","translit":"ranj bordan","ru":"страдать"},{"dari":"زینت","translit":"zinat","ru":"украшение, убранство"},{"dari":"زیور","translit":"zēwar","ru":"украшение (предмет)"},{"dari":"سامان","translit":"sāmān","ru":"утварь, принадлежности"},{"dari":"سایه","translit":"sāya","ru":"тень"},{"dari":"سودا","translit":"sawdā","ru":"покупка"},{"dari":"سمسار","translit":"simsār","ru":"галантерейщик"},{"dari":"صرف","translit":"sarf","ru":"расходование; приём пищи"},{"dari":"عرضه کردن","translit":"‘arza kardan","ru":"предлагать (на продажу)"},{"dari":"عطار","translit":"‘attār","ru":"парфюмер"},{"dari":"عطر (عطریات)","translit":"‘atr (-eyyāt)","ru":"духи"},{"dari":"فالوده","translit":"fāluda","ru":"фалуда, прохладное лакомство"},{"dari":"فرمایش","translit":"farmāyeš","ru":"заказ"},{"dari":"فیشن","translit":"fēšan","ru":"фасон, мода, роскошь"},{"dari":"قاب","translit":"qāb","ru":"тарелка, блюдо"},{"dari":"قصاب","translit":"qassāb","ru":"мясник"},{"dari":"قناد","translit":"qannād","ru":"кондитер"},{"dari":"قیماق","translit":"qaymāq","ru":"сметана"},{"dari":"کبابی","translit":"kabābi","ru":"продавец шашлыка"},{"dari":"کراچی","translit":"karāči","ru":"ручная тележка"},{"dari":"کور","translit":"kōr","ru":"слепой; слепец"},{"dari":"کوزه","translit":"kōza","ru":"глиняный кувшин"},{"dari":"کیک","translit":"kēk","ru":"кекс, пирожное"},{"dari":"لبنیات","translit":"labaneyyāt","ru":"молочные продукты"},{"dari":"ماست","translit":"māst","ru":"простокваша"},{"dari":"متاع (امتعه)","translit":"matā’ (amte’a)","ru":"товар"},{"dari":"مزدحم","translit":"mozdaham","ru":"заполненный людьми"},{"dari":"مستعمل","translit":"mosta’mal","ru":"подержанный"},{"dari":"مشتری","translit":"moštari","ru":"покупатель, клиент"},{"dari":"مصالح","translit":"masāleh","ru":"специи, приправы (мн.)"},{"dari":"مگس","translit":"magas","ru":"муха"},{"dari":"مناسب","translit":"monāseb","ru":"подходящий"},{"dari":"منداوی","translit":"mandawi","ru":"рынок (по продаже зерна)"},{"dari":"نرخنامه","translit":"nerxnāma","ru":"прейскурант"},{"dari":"نظافت","translit":"nazāfat","ru":"чистота"},{"dari":"سند","translit":"Send","ru":"Инд (река)"},{"dari":"سامان قرطاسیه","translit":"sāmān-e qertāsiya","ru":"канцелярские принадлежности"},{"dari":"پوست","translit":"pōst","ru":"мех, кожа"},{"dari":"دکان سلمانی","translit":"dokān-e salmāni","ru":"парикмахерская"},{"dari":"رئیسه","translit":"ra'isa","ru":"председательница"},{"dari":"تیغ","translit":"tēğ","ru":"бритва"},{"dari":"غرغشت","translit":"Ğarğašt","ru":"Гаргашт"},{"dari":"روشان","translit":"Rōšan","ru":"Рошан"},{"dari":"آمر","translit":"āmer","ru":"командир"},{"dari":"خوراکه فروشی","translit":"xōrāka-foruši","ru":"продуктовый магазин"},{"dari":"گوشت خوک","translit":"gōšt-e xuk","ru":"свинина"},{"dari":"کرم","translit":"karam","ru":"капуста"},{"dari":"زود","translit":"zud","ru":"быстро"},{"dari":"تول کردن","translit":"tōl kardan","ru":"взвешивать"},{"dari":"پاکت","translit":"pāket","ru":"пакет"}] :  index === 9 ? [{"dari":"اتفاق","translit":"ettefāq","ru":"объединение, договоренность"},{"dari":"اجاق","translit":"ojāq","ru":"очаг"},{"dari":"استهزا‌آمیز","translit":"estehzāāmēz","ru":"издевательский"},{"dari":"اعلی","translit":"a’lā","ru":"отличный"},{"dari":"افگندن","translit":"afgandan (afgan)","ru":"бросать"},{"dari":"آگنده","translit":"āganda","ru":"наполненный"},{"dari":"امرار","translit":"emrār","ru":"продление, поддержание"},{"dari":"اندوختن","translit":"andōxtan","ru":"копить"},{"dari":"آه","translit":"āh","ru":"вздох"},{"dari":"بسی","translit":"básā","ru":"много"},{"dari":"بلا","translit":"balā","ru":"беда, несчастье"},{"dari":"بلاوقفه","translit":"belāwaqfa","ru":"безостановочно"},{"dari":"بندوبار","translit":"bandobār","ru":"пожитки"},{"dari":"بوی","translit":"bō(y)","ru":"запах"},{"dari":"بیروبار","translit":"birobār","ru":"сутолока"},{"dari":"بیلر","translit":"bilar","ru":"бочка"},{"dari":"بینوا","translit":"bēnawā","ru":"бедный, обездоленный"},{"dari":"بیهوده","translit":"bēhuda","ru":"напрасный, тщетный"},{"dari":"بیهوش","translit":"bēhuš","ru":"потерявший сознание"},{"dari":"پرخشم","translit":"porxašm","ru":"злобный"},{"dari":"پکه","translit":"paka","ru":"веер"},{"dari":"پوزخند","translit":"pōzxand","ru":"усмешка"},{"dari":"پوشانیدن","translit":"pōšān(i)dan","ru":"покрывать"},{"dari":"پیچ‌وتاب خوردن","translit":"pēčotāb xōrdan","ru":"вертеться, извиваться"},{"dari":"تأیید","translit":"ta’yid","ru":"подтверждение"},{"dari":"ترکیده","translit":"tarkida","ru":"потрескавшийся"},{"dari":"تغییر","translit":"tağyir","ru":"изменение"},{"dari":"تفکر","translit":"tafakkor","ru":"размышление"},{"dari":"تکان دادن","translit":"takān dādan","ru":"махать, качать"},{"dari":"تکله","translit":"takla","ru":"сильный (разг.)"},{"dari":"تندباد","translit":"tondbād","ru":"ураган"},{"dari":"جگره","translit":"jagra","ru":"спор, ссора"},{"dari":"جلو","translit":"jelaw","ru":"перёд"},{"dari":"جمع‌آوری","translit":"jam’āwari","ru":"собирание"},{"dari":"جویدن","translit":"jawidan","ru":"жевать, пережевывать"},{"dari":"چپلی","translit":"čapli","ru":"сандалии (на деревянной подошве)"},{"dari":"چربی","translit":"čarbi","ru":"жир"},{"dari":"چرت","translit":"čort","ru":"размышление"},{"dari":"حس","translit":"hess","ru":"чувство, ощущение"},{"dari":"حمل","translit":"haml","ru":"переноска, перевозка"},{"dari":"خبردار!","translit":"xabardār!","ru":"берегись! (возглас)"},{"dari":"خریدار","translit":"xaridār","ru":"покупатель, клиент"},{"dari":"خشن","translit":"xašen","ru":"грубый"},{"dari":"خم","translit":"xam","ru":"наклоненный"},{"dari":"خنده‌کنان","translit":"xandakonān","ru":"смеясь, сквозь смех"},{"dari":"خواباندن","translit":"xābāndan","ru":"побороть, положить на лопатки"},{"dari":"خوفناک","translit":"xawfnāk","ru":"страшный, ужасный"},{"dari":"خیال","translit":"xeyāl","ru":"воображение, фантазия"},{"dari":"درخشیدن","translit":"daraxšidan","ru":"блестеть, сверкать"},{"dari":"دود","translit":"dud","ru":"дым"},{"dari":"دودزده","translit":"dudzada","ru":"закопченный"},{"dari":"روده","translit":"rōda","ru":"кишка"},{"dari":"روغن‌چکان","translit":"rawğančakān","ru":"истекающий маслом"},{"dari":"ریسمان","translit":"rēsmān","ru":"веревка"},{"dari":"ژنده","translit":"žanda","ru":"изношенный"},{"dari":"سخن","translit":"soxan","ru":"речь, слова"},{"dari":"سرای","translit":"sarāy","ru":"торговый двор"},{"dari":"سررشته کردن","translit":"sarešta kardan","ru":"налаживать"},{"dari":"سروصدا","translit":"sarosadā","ru":"шум и гам"},{"dari":"سستی","translit":"sosti","ru":"слабость"},{"dari":"سور","translit":"sōr","ru":"каракуль (высшего сорта)"},{"dari":"سیخ","translit":"six","ru":"стержень; шампур (для шашлыка)"},{"dari":"شور خوردن","translit":"šōr xōrdan","ru":"двигаться, шевелиться"},{"dari":"ضعف","translit":"zo’f","ru":"слабость"},{"dari":"عابر","translit":"‘āber","ru":"прохожий"},{"dari":"عالم","translit":"‘ālam","ru":"мир (вселенная)"},{"dari":"عصبانی","translit":"‘asabāni","ru":"сердитый, раздраженный"},{"dari":"فروبردن","translit":"forōbordan","ru":"погружать; глотать"},{"dari":"فضا","translit":"fazā","ru":"атмосфера, пространство"},{"dari":"قطعی","translit":"qat’i","ru":"категорический"},{"dari":"کپه","translit":"kappa","ru":"щепотка"},{"dari":"کر","translit":"kar","ru":"глухой"},{"dari":"کشمیره","translit":"kašmira","ru":"кашемир(овый)"},{"dari":"گرد آوردن","translit":"gerd āwardan","ru":"собирать"},{"dari":"گرد آمدن","translit":"gerd āmadan","ru":"собираться"},{"dari":"گویی","translit":"gōyi","ru":"словно, как будто"},{"dari":"لحظه","translit":"lahza","ru":"момент, мгновение"},{"dari":"لرزان","translit":"larzān","ru":"дрожащий"},{"dari":"لوله","translit":"lōla","ru":"трубочка"},{"dari":"مأیوس","translit":"ma’yus","ru":"разочарованный, отчаявшийся"},{"dari":"محزون","translit":"mahzun","ru":"печальный"},{"dari":"مخلوط","translit":"maxlut","ru":"смешанный"},{"dari":"مسرور","translit":"masrur","ru":"радостный"},{"dari":"مضطرب","translit":"moztareb","ru":"взволнованный"},{"dari":"مطبوع","translit":"matbu’","ru":"приятный"},{"dari":"مغروق","translit":"mağruq","ru":"погруженный"},{"dari":"میانه‌سال","translit":"meyānasāl","ru":"средних лет"},{"dari":"ناتوان","translit":"nātawān","ru":"немощный"},{"dari":"ناف","translit":"nāf","ru":"пупок"},{"dari":"نامرتب","translit":"nāmorattab","ru":"беспорядочный"},{"dari":"نصوار","translit":"haswār","ru":"насвар, нас (слабый наркотик для жевания)"},{"dari":"نگریستن","translit":"negaristan (negar)","ru":"смотреть"},{"dari":"وزن","translit":"wazn (awzān)","ru":"вес"},{"dari":"وزیدن","translit":"wazidan","ru":"дуть (о ветре)"},{"dari":"ویران","translit":"wayrān, wayrāna","ru":"разрушенный"},{"dari":"هوش","translit":"huš","ru":"сознание, рассудок"}] : index === 0 ? [{"dari":"ابریشم","translit":"abrēšom","ru":"шёлк"},{"dari":"اردوگاه","translit":"ordugāh","ru":"лагерь"},{"dari":"اوهو","translit":"ōhó","ru":"междометие радости и т.п."},{"dari":"بازی","translit":"bāzi","ru":"игра"},{"dari":"بهانه","translit":"bahāna","ru":"повод, предлог"},{"dari":"پذیرفتن","translit":"paziroftan (pazir)","ru":"принимать, соглашаться"},{"dari":"پشیمان","translit":"pešēmān","ru":"сожалеющий"},{"dari":"تجارت","translit":"tejārat, tajārat","ru":"торговля, коммерция"},{"dari":"تنبان","translit":"tonbān","ru":"шаровары"},{"dari":"توپ‌دنده","translit":"tōpdanda","ru":"афганская национальная игра (типа хоккея на траве)"},{"dari":"جمع کردن","translit":"jam’ kardan","ru":"собирать"},{"dari":"چپن","translit":"čapan","ru":"халат"},{"dari":"چنانچه","translit":"čanānče","ru":"таким образом, что…"},{"dari":"حلال کردن","translit":"halāl kardan","ru":"забивать (животное по мусульманскому обряду)"},{"dari":"خامک‌دوزی","translit":"xāmakdōzi","ru":"вышивание, шитьё (несучёными нитками)"},{"dari":"خستگی","translit":"xastagi","ru":"усталость"},{"dari":"دانس","translit":"dāns","ru":"танец (бальный)"},{"dari":"به درد کسی خوردن","translit":"ba dard-e kas-ē xōrdan","ru":"пригодиться кому-л."},{"dari":"دستمال","translit":"dastmāl","ru":"платок"},{"dari":"روان","translit":"rawān","ru":"плавный, текущий; беглый, бегло"},{"dari":"زردوزی","translit":"zardōzi","ru":"шитьё золотом"},{"dari":"سابق","translit":"sābeq","ru":"прежний"},{"dari":"ساده","translit":"sāda","ru":"простой, бесхитростный"},{"dari":"سالم","translit":"sālem","ru":"здоровый"},{"dari":"سیر","translit":"sayr","ru":"прогулка"},{"dari":"سیر علمی","translit":"sayr-e ‘elmi","ru":"экскурсия"},{"dari":"شرمنده","translit":"šarmenda","ru":"пристыженный"},{"dari":"ضروری","translit":"zaruri","ru":"необходимый"},{"dari":"علاوه","translit":"‘elāwa","ru":"добавление"},{"dari":"قیامت","translit":"qeyāmat","ru":"светопреставление"},{"dari":"کمائی کردن","translit":"kamāyi kardan","ru":"зарабатывать"},{"dari":"موضوع","translit":"mawzō’","ru":"тема, проблема"},{"dari":"میانه","translit":"meyāna","ru":"промежуточный, средний"},{"dari":"نگاه کردن","translit":"negāh kardan","ru":"лит. смотреть, разг. хранить"},{"dari":"نوشیدن","translit":"nōšidan","ru":"пить"},{"dari":"واسکت","translit":"wāskat","ru":"жилет"},{"dari":"واه واه","translit":"wāh-wāh","ru":"междометие восхищения"},{"dari":"وطندار","translit":"watandār","ru":"земляк"},{"dari":"هنر","translit":"honar","ru":"искусство"},{"dari":"یقین","translit":"yaqin","ru":"уверенность"},{"dari":"کریمیا","translit":"Qeremiya","ru":"Крым"},{"dari":"خواستن","translit":"xāstan","ru":"хотеть, просить"},{"dari":"مستوره","translit":"Mastura","ru":"Мастура (женское имя)"},{"dari":"قفقاز","translit":"Qafqāz","ru":"Кавказ"},{"dari":"اقارب","translit":"aqāreb","ru":"родственники"},{"dari":"مؤسسه","translit":"mo'assesa","ru":"учреждение, фирма"},{"dari":"علاوه برآن","translit":"'elāwa bar ān","ru":"кроме того"},{"dari":"کمایی کردن","translit":"kamāyi kardan","ru":"зарабатывать"},{"dari":"آسیای میانه","translit":"Āsyā-ye miyāna","ru":"Средняя Азия"},{"dari":"سمرقند","translit":"Samarqand","ru":"Самарканд"},{"dari":"بخارا","translit":"Boxārā","ru":"Бухара"},{"dari":"خیوه","translit":"Xiva","ru":"Хива"},{"dari":"لذت بردن از چیزی","translit":"lezzat bordan az čiz-ē","ru":"наслаждаться"}] : index === 10 ? [{"dari":"اشکنبه","translit":"eškanba","ru":"потроха"},{"dari":"آشگز","translit":"āšgaz","ru":"скалка"},{"dari":"آفتاب‌پرست","translit":"āftābparast","ru":"подсолнечник"},{"dari":"باقلا","translit":"bāqolā","ru":"бобы"},{"dari":"بره","translit":"barra","ru":"ягненок"},{"dari":"پاس","translit":"pās","ru":"пропуск"},{"dari":"پالک","translit":"pālak","ru":"шпинат"},{"dari":"پودین","translit":"pudin","ru":"пудинг, кисель"},{"dari":"پیچیدن","translit":"pēčidan","ru":"виться, закручиваться"},{"dari":"پیک","translit":"payk","ru":"рюмка"},{"dari":"تابه","translit":"tāba","ru":"противень, большая сковорода"},{"dari":"ترکیب","translit":"tarkib","ru":"состав"},{"dari":"تره","translit":"tara","ru":"змеевидная дыня"},{"dari":"توته","translit":"tōta","ru":"кусочек, осколок"},{"dari":"تیره","translit":"tira","ru":"темный, густой (по цвету)"},{"dari":"جوش","translit":"jōš","ru":"кипение; кипящий, кипяченый (о воде)"},{"dari":"چاشنی","translit":"čāšni","ru":"приправа"},{"dari":"چای‌جوش","translit":"čāyjōš","ru":"чайник (для кипячения воды)"},{"dari":"چرب","translit":"čarb","ru":"жирный (о пище)"},{"dari":"چریدن","translit":"čaridan","ru":"пастись"},{"dari":"چسپیدن","translit":"časpidan","ru":"прилипать"},{"dari":"چمچه","translit":"čamča","ru":"половник"},{"dari":"چوچه","translit":"čōča","ru":"детеныш"},{"dari":"حلقه","translit":"halqa","ru":"кольцо"},{"dari":"حلویات","translit":"hal(a)weyyāt","ru":"сладости"},{"dari":"خلال کردن","translit":"xalāl kardan","ru":"нарезать (ломтями)"},{"dari":"خوابیدن","translit":"xābidan","ru":"ложиться, спать"},{"dari":"دلنخود","translit":"dālnaxōd","ru":"сушеный горошек"},{"dari":"درآوردن","translit":"darāwardan","ru":"вносить, ввергать"},{"dari":"دم کشیدن","translit":"dam kašidan","ru":"париться (о пище), завариваться (о чае)"},{"dari":"دنبه","translit":"donba","ru":"курдюк; баранье сало"},{"dari":"رواش","translit":"rawāš","ru":"ревень"},{"dari":"روزمره","translit":"rōzmarra","ru":"повседневный"},{"dari":"ریشه","translit":"rēša","ru":"корень"},{"dari":"زرچوبه","translit":"zarčōba","ru":"имбирь"},{"dari":"زعفران","translit":"za’farān","ru":"шафран"},{"dari":"زغاله","translit":"zoğāla","ru":"заготовка (из теста)"},{"dari":"زغر","translit":"zeğer","ru":"лен"},{"dari":"ساطور","translit":"sātur","ru":"большой нож, топорик (для рубки мяса)"},{"dari":"ساییدن","translit":"sāyidan","ru":"растирать, тереть"},{"dari":"سپس","translit":"sepas","ru":"затем, потом"},{"dari":"سفره","translit":"sofra","ru":"скатерть (с угощением)"},{"dari":"سیر","translit":"sir","ru":"чеснок"},{"dari":"شبت","translit":"šebet","ru":"укроп"},{"dari":"شرمیدن","translit":"šarmidan","ru":"стыдиться, стесняться"},{"dari":"شلغم","translit":"šalğam","ru":"репа"},{"dari":"طبخ","translit":"tabx","ru":"приготовление (пищи)"},{"dari":"طرز","translit":"tarz","ru":"способ"},{"dari":"طعام (اطعمه)","translit":"ta’ām (at’ema)","ru":"еда, блюдо"},{"dari":"غربال","translit":"ğerbāl","ru":"сито"},{"dari":"غوری","translit":"ğuri","ru":"большое блюдо"},{"dari":"قاق","translit":"qāq","ru":"сухой, сушеный"},{"dari":"قبرغه","translit":"qaborğa","ru":"ребро"},{"dari":"قروت","translit":"qorut","ru":"сушеное кислое молоко (в форме шариков)"},{"dari":"قیمه","translit":"qima","ru":"фарш"},{"dari":"کاک","translit":"kāk","ru":"пробка"},{"dari":"کاک‌پران","translit":"kākparān","ru":"штопор; приспособление для откупоривания бутылок"},{"dari":"کاهو","translit":"kāhu","ru":"салат-латук"},{"dari":"کبوتر","translit":"kabōtar","ru":"голубь"},{"dari":"کدو","translit":"kadu","ru":"тыква"},{"dari":"کدوچه","translit":"kaduča","ru":"кабачок (овощ)"},{"dari":"کرایی","translit":"karāyi","ru":"сковорода"},{"dari":"کف","translit":"kaf","ru":"пена"},{"dari":"کفگیر","translit":"kafgir","ru":"шумовка"},{"dari":"کلوله","translit":"kolōla","ru":"ком, колобок, шарик"},{"dari":"کنجد","translit":"konjed","ru":"кунжут"},{"dari":"گرد","translit":"gerd","ru":"круглый"},{"dari":"گریختن","translit":"gorēxtan","ru":"убегать, спасаться бегством"},{"dari":"گشنیز","translit":"gašniz","ru":"кориандр; петрушка"},{"dari":"گلپی","translit":"golpi","ru":"цветная капуста"},{"dari":"گندنه","translit":"gandana","ru":"лук-порей"},{"dari":"لاندی","translit":"lāndi","ru":"вяленый"},{"dari":"ماش","translit":"māš","ru":"чечевица"},{"dari":"محبوب","translit":"mahbub","ru":"любимый; популярный"},{"dari":"ملی","translit":"moli","ru":"редька"},{"dari":"ملی‌تراشی","translit":"molitarāš","ru":"терка"},{"dari":"ملی‌سرخک","translit":"molicorxak","ru":"редис"},{"dari":"مناصفه","translit":"monāsefa","ru":"разделение пополам"},{"dari":"نارنج","translit":"nārenj","ru":"померанец, грейпфрут"},{"dari":"نام بردن","translit":"nām bordan","ru":"упоминать"},{"dari":"نرم","translit":"narm","ru":"мягкий"},{"dari":"نشایسته","translit":"našāyesta","ru":"крахмал"},{"dari":"نعناع","translit":"na’nā’","ru":"мята"},{"dari":"نی","translit":"nay","ru":"тростник"},{"dari":"هنگام","translit":"hangām","ru":"во время"},{"dari":"کست","translit":"kāset","ru":"кассета"},{"dari":"قطره","translit":"qatra","ru":"капля"},{"dari":"پاکت","translit":"pāket","ru":"конверт"},{"dari":"جیب","translit":"jēb","ru":"карман"},{"dari":"کاسه","translit":"kāsa","ru":"миска"},{"dari":"خمیرمایه","translit":"xamirmāya","ru":"дрожжи"},{"dari":"به ندرت","translit":"ba nodrat","ru":"редко"},{"dari":"دیگ","translit":"dēg","ru":"котёл"},{"dari":"سلاطه","translit":"salāta","ru":"салат"},{"dari":"مواد","translit":"mawād","ru":"содержимое, вещества"},{"dari":"مواد گوشتی","translit":"mawād-e gōšti","ru":"мясные продукты"},{"dari":"نان قاق","translit":"nān-e qāq","ru":"сухари"},{"dari":"هاون","translit":"hāwan","ru":"ступка"},{"dari":"داغ","translit":"dāğ","ru":"раскалённый, горячий"},{"dari":"نوله","translit":"nōla","ru":"носик (чайника)"},{"dari":"قند","translit":"qand","ru":"сахар"},{"dari":"دشلمه کردن","translit":"dašlama kardan","ru":"пить чай вприкуску"}] : [{ dari: "test", translit: "", ru: "тест" }],
  }));
  const textbook2WordKey = (lessonId, wordIndex) => `${lessonId}:${wordIndex}`;
  const textbook2KnownCount = (collection) => collection.cards.filter((_, i) => state.textbook2Words[textbook2WordKey(collection.id, i)]).length;
  const textbook2UnknownOrder = (collection) => (ui.textbook2Orders[collection.id] || collection.cards.map((_, i) => i))
    .filter((i) => !state.textbook2Words[textbook2WordKey(collection.id, i)]);

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
    const knownCount = textbook2KnownCount(collection);
    const currentWordKnown = false;
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
      <div class="flashcard-stage"><div class="flashcard textbook-word-card ${flipped?"flipped":""}" data-textbook-flip tabindex="0" role="button" aria-label="Перевернуть карточку">
      <div class="flash-face front"><div class="flash-dari">${esc(card.dari)}</div><div class="flash-translit">${esc(card.translit)}</div><span class="hint">Нажмите на карточку, чтобы увидеть перевод</span></div>
      <div class="flash-face back"><div class="flash-numeral" style="color:var(--gold)">перевод</div><div class="flash-ru">${esc(card.ru)}</div><div class="flash-translit" style="color:var(--gold)">${esc(card.translit)}</div><span class="hint">Нажмите ещё раз, чтобы вернуться</span></div></div></div>
      <div class="flash-actions"><button class="btn btn-primary btn-sm" type="button" data-textbook2-know="${originalIndex}">${svg("check")} Знаю</button><button class="btn btn-ghost btn-sm" type="button" data-textbook-prev ${index===0?"disabled":""}>${svg("arrowLeft")} Назад</button><button class="btn btn-soft btn-sm" type="button" data-textbook-flip-button>${svg("flip")} Перевод</button><button class="btn btn-ghost btn-sm" type="button" data-textbook-next ${index===unknownOrder.length-1?"disabled":""}>Дальше ${svg("arrowRight")}</button></div></div>` : `<div class="empty-state"><h3>Все слова знакомы!</h3><p>Снимите отметку «Знаю» в списке, чтобы вернуть слово в карточки.</p></div>`;
    return `<div class="page"><a class="back-link" href="#/textbook-2">${svg("arrowRight")} Все коллекции</a>
      <div class="detail-hero" data-letter="📚"><div class="detail-badge" style="font-size:1.8rem">📚</div><div class="detail-hero-copy"><span class="eyebrow">Учебник · курс 2</span><h1>${collection.title}</h1><div class="en-title">Карточки для изучения слов</div><p>Коллекция содержит ${collection.cards.length} слов.</p></div></div>
      <div class="flash-toolbar"><div class="view-switch">
        <button class="${ui.textbook2View === "cards" ? "active" : ""}" type="button" data-textbook-view="cards">${svg("cards")} Карточки</button>
        <button class="${ui.textbook2View === "list" ? "active" : ""}" type="button" data-textbook-view="list">${svg("list")} Список</button>
      </div><button class="btn btn-soft btn-sm" type="button" data-textbook-shuffle="${collection.id}">↝ Перемешать</button></div>
      ${ui.textbook2View === "list" ? list : flash}</div>`;
  };
    const renderPhrasePractice = (lessonNum) => {
    const n=Number(lessonNum);
    const tasks=n===8?[
      {prompt:"Уже слишком поздно",answer:"کار از کار رفته",words:["کار","از","کار","رفته","من","است","بسیار","خانه","کتاب","خوب"]},
      {prompt:"Не надо далеко ходить за примером",answer:"دور نرویم نزدیک",words:["دور","نرویم","نزدیک","مثال","برای","من","امروز","بازار","بسیار"]},
      {prompt:"Я купил пишущую машинку за 20 тыс. афгани",answer:"ماشین تیپ را ۲۰ هزار افغانی خریدم",words:["ماشین","تیپ","را","۲۰","هزار","افغانی","خریدم","کتاب","خوب","امروز"]},
      {prompt:"Почему ты продаешь это мясо?",answer:"این گوشت را چند می‌دهی؟",words:["این","گوشت","را","چند","می‌دهی؟","چرا","خوب","امروز"]},
      {prompt:"Купи перца на два афгани.",answer:"دو افغانی را مرچ بخر",words:["دو","افغانی","را","مرچ","بخر","خانه","کتاب","امروز"]},
      {prompt:"Разменяете сто афгани?",answer:"صد افغانی را میده دارید؟",words:["صد","افغانی","را","میده","دارید؟","چند","خوب","کتاب"]}
    ]:[];
    const done=JSON.parse(localStorage.getItem("phraseDone8")||"[]");
    return `<div class="page phrase-practice"><a class="back-link" href="#/textbook-2">← Все уроки</a><h1>Отработка фраз · Урок ${n}</h1>${tasks.map((t,i)=>`<div class="card phrase-task" style="padding:22px;margin:16px 0"><p class="phrase-prompt">${t.prompt}</p><div data-phrase-answer="${i}" class="phrase-answer" dir="rtl"></div><div class="phrase-bank" dir="rtl">${t.words.slice().sort(()=>Math.random()-.5).map((w,j)=>`<button type="button" class="btn btn-soft phrase-word" data-phrase-word="${i}" data-word="${w}" data-token="${j}">${w}</button>`).join("")}</div><button type="button" class="btn btn-primary" data-phrase-check="${i}" data-phrase-correct="${encodeURIComponent(t.answer)}">Проверить</button> <button type="button" class="btn btn-ghost" data-phrase-reset="${i}">Сброс</button><p class="phrase-feedback" data-phrase-feedback="${i}">${done.includes(i)?"Верно! ✓":""}</p></div>`).join("")||`<div class="card" style="padding:20px">Задания для этого урока скоро появятся.</div>`}</div>`;
  };
  const renderTextbook = (num) => {
    const book = TEXTBOOKS[num];
    if (!book) return notFound();
    if (num === 2) {
      const phraseDone = JSON.parse(localStorage.getItem("phraseDone8") || "[]");
      return `<div class="page textbook-page">
        <div class="page-head"><div><span class="eyebrow">Учебник · курс 2</span><h1>Островский · 2-й год обучения</h1><p>${esc(book.title)}. ${esc(book.note)}</p></div><div class="page-head-actions"><a class="btn btn-ghost" href="${esc(book.path)}" target="_blank" rel="noopener">${svg("external")} Открыть</a><a class="btn btn-primary" href="${esc(book.path)}" download="${esc(book.title)}.pdf">${svg("download")} Скачать · ${book.size}</a></div></div>
        <details class="textbook-section">
          <summary><span><strong>Словарь</strong><small>23 урока · ${textbook2Collections.reduce((sum, item) => sum + item.cards.length, 0)} слов</small></span><span class="textbook-section-toggle">${svg("chevronRight")}</span></summary>
          <div class="pack-grid textbook-collections textbook-vocab-grid">${textbook2Collections.map((collection) => {
            const known = textbook2KnownCount(collection);
            const pct = Math.round(known / Math.max(1, collection.cards.length) * 100);
            return `<a class="pack-card" href="#/textbook-2/lesson-${collection.id}" style="--pack-color:var(--green)">${known === collection.cards.length ? `<span class="pack-badge badge badge-done">${svg("check")} готово</span>` : ""}<span class="pack-icon">📚</span><h3>${collection.title}</h3><div class="pack-sub">${collection.cards.length} слов</div><div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${known}/${collection.cards.length}</span></div></a>`;
          }).join("")}</div>
        </details>
        <details class="textbook-section">
          <summary><span><strong>Отработка фраз</strong><small>Собирайте предложения из слов · 23 урока</small></span><span class="textbook-section-toggle">${svg("chevronRight")}</span></summary>
          <div class="pack-grid textbook-collections textbook-phrase-grid">${Array.from({length:23},(_,i)=>i+1).map(n=>`<a class="pack-card" href="#/textbook-2/phrases-${n}" style="--pack-color:var(--gold)"><span class="pack-icon">🧩</span><h3>Урок ${n}</h3><div class="pack-sub">Отработка фраз</div><div class="pack-foot"><div class="progress-track"><div class="progress-fill" style="width:${n===8?(phraseDone.length/6*100):0}%"></div></div><span>${n===8?phraseDone.length:0}/${n===8?6:0}</span></div></a>`).join("")}</div>
        </details>
        <section class="textbook-pdf-section">
          <div class="textbook-pdf-copy"><strong>Учебник в PDF</strong><span>Просмотрщик загружается только по запросу, чтобы страница открывалась быстрее.</span></div>
          <div class="pdf-frame-wrap textbook-frame" data-pdf-wrap data-pdf-src="${esc(book.path)}" data-pdf-title="${esc(book.title)}"><button class="btn btn-ghost" type="button" data-load-pdf>${svg("bookOpen")} Показать учебник</button></div>
        </section>
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
        <div><span class="eyebrow">О проекте</span><h1>Дари, объяснённый по-русски</h1><p>Этот сайт собирает учебные материалы по дари из открытого архива DLIFLC и превращает их в понятный курс для русскоязычных студентов: алфавит, сорок уроков, словарь с произношением, практика и большая аудиотека.</p>
        <div class="hero-actions" style="margin-top:20px"><a class="btn btn-primary" href="#/lessons">Начать курс ${svg("arrowRight")}</a><a class="btn btn-ghost" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("external")} Исходный архив</a></div></div>
        <div class="about-mark">د</div>
      </div>
      <div class="about-grid">
        <div class="about-card"><h3>${svg("layers")} Что внутри</h3><ul>
          <li>${total.letters} буквы с формами, звучанием и примерами</li>
          <li>${total.intro} вводных урока A–Z</li>
          <li>${total.lessons} полных урока с аудио и PDF</li>
          <li>${total.vocabWords} словарных карточек и ${total.trainers} аудиотренажёров</li>
          <li>${fmt(DATA.meta.archiveAudio)} записей в архиве</li>
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
      box.innerHTML = '<p class="search-hint">Начните вводить запрос — поиск работает по буквам, урокам, словам и всему архиву.</p>';
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
    const packs = DATA.vocab.packs.filter((pack) => [pack.title, pack.subtitle, pack.description].join(" ").toLowerCase().includes(query)).slice(0, 3);
    if (packs.length) {
      groups.push(`<div class="search-group-label">Словарь</div>${packs.map((pack) =>
        searchResult(`data-search-go="#/vocab/${esc(pack.id)}"`, "cards", pack.title, `${pack.cards.length} слов`, "набор", pack.icon)).join("")}`);
    }
    const cards = allCards().filter((item) => [item.card.dari, item.card.translit, item.card.ru].join(" ").toLowerCase().includes(query)).slice(0, 6);
    if (cards.length) {
      groups.push(`<div class="search-group-label">Слова</div>${cards.map((item) =>
        searchResult(`data-search-go="#/vocab/${esc(item.pack.id)}"`, "volume", `${item.card.ru}`, `${item.card.translit} · ${item.pack.title}`, "слово", item.card.dari)).join("")}`);
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
      box.innerHTML = '<p class="search-empty">Ничего не нашлось. Попробуйте имя буквы, номер урока или часть названия файла.</p>';
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
      case "lessons": return { nav: "lessons", title: "40 уроков" };
      case "lesson": return { nav: "lessons", title: `Урок ${parts[1] || ""}` };
      case "vocab": return { nav: "vocab", title: parts[1] ? ((DATA.vocab.packs.find((x) => x.id === parts[1]) || {}).title || "Словарь") : "Словарь" };
      case "trainer": return { nav: "vocab", title: "Аудиотренажёр" };
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

  const renderRoute = (options = {}) => {
    const raw = location.hash.replace(/^#\/?/, "");
    const parts = raw ? raw.split("/").map((part) => decodeURIComponent(part)) : [];
    const section = parts[0] || "home";
    let html = "";
    if (section === "home") html = renderHome();
    else if (section === "alphabet") {
      if (parts[1] === "letter") ui.alphabetTab = "letters";
      html = renderAlphabet();
    } else if (section === "intro") html = renderIntro(parts[1]);
    else if (section === "lessons") html = renderLessons();
    else if (section === "lesson") html = renderLesson(parts[1]);
    else if (section === "vocab") html = parts[1] ? renderPack(parts[1]) : renderVocab();
    else if (section === "trainer") html = renderTrainer(parts[1]);
    else if (section === "practice") html = renderPractice();
    else if (section === "library") html = renderLibrary(parts[1]);
    else if (section === "textbook-1") html = renderTextbook(1);
    else if (section === "textbook-2" || section === "textbook") html = parts[1] && parts[1].startsWith("lesson-") ? renderTextbook2Collection(parts[1].slice(7)) : parts[1] && parts[1].startsWith("phrases-") ? renderPhrasePractice(parts[1].slice(8)) : renderTextbook(2);
    else if (section === "about") html = renderAbout();
    else html = notFound();

    APP.innerHTML = html;
    hydrateIcons(APP);
    updateChrome(section, parts);
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

    if (target.closest("[data-phrase-word]")) { const btn=target.closest("[data-phrase-word]"); const answer=$(`[data-phrase-answer="${btn.dataset.phraseWord}"]`); if(answer){const token=document.createElement("button");token.type="button";token.className="phrase-picked";token.textContent=btn.dataset.word;token.dataset.pickedWord=btn.dataset.word;token.onclick=()=>{token.remove();btn.disabled=false;};answer.append(token);}btn.disabled=true;return;}
    if (target.closest("[data-phrase-reset]")) {const id=target.closest("[data-phrase-reset]").dataset.phraseReset;const answer=$(`[data-phrase-answer="${id}"]`);if(answer)answer.innerHTML="";$$ (`[data-phrase-word="${id}"]`).forEach(btn=>btn.disabled=false);const feedback=$(`[data-phrase-feedback="${id}"]`);if(feedback)feedback.textContent="";return;}
    if (target.closest("[data-phrase-check]")) {const btn=target.closest("[data-phrase-check]");const id=btn.dataset.phraseCheck;const answer=$(`[data-phrase-answer="${id}"]`);const feedback=$(`[data-phrase-feedback="${id}"]`);if(answer&&feedback){const value=Array.from(answer.children).map(x=>x.dataset.pickedWord).join(" ").trim();const correct=value===decodeURIComponent(btn.dataset.phraseCorrect);feedback.textContent=correct?"Верно! ✓":"Пока неверно — попробуйте ещё.";if(correct){const done=JSON.parse(localStorage.getItem("phraseDone8")||"[]");if(!done.includes(Number(id)))done.push(Number(id));localStorage.setItem("phraseDone8",JSON.stringify(done));}}return;}
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
