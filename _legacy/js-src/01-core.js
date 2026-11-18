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
