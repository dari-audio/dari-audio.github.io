  /* ---------- Главная ---------- */
  const wordOfDay = () => {
    const pool = allCards().filter((item) => item.card.audio);
    if (!pool.length) return null;
    const index = Math.floor(Date.now() / 86400000) % pool.length;
    return pool[index];
  };

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
    const word = wordOfDay();
    const rec = continueItem();
    const week = weekData();
    const weekMax = Math.max(1, ...week.map((x) => x.value));
    const weekTotal = week.reduce((sum, x) => sum + x.value, 0);
    const weekActive = week.filter((x) => x.value > 0).length;
    const recMark = rec.mark || "→";

    return `<div class="page">
      <div class="hero">
        <div class="hero-copy">
          <div class="hero-kicker"><span class="dot"></span>${esc(dateLabel())} · курс аудирования</div>
          <h1>Слушайте. Повторяйте. <em>Говорите.</em></h1>
          <p>Дари из живого архива DLIFLC: ${total.letters} ${plural(total.letters, ["буква", "буквы", "букв"])}, ${total.lessons} полных уроков, ${total.vocabWords} словарных карточек с произношением и ${fmt(DATA.meta.archiveAudio)} ${plural(DATA.meta.archiveAudio, ["запись", "записи", "записей"])} в архиве. Всё объяснено по-русски.</p>
          <div class="hero-actions">
            <a class="btn btn-gold btn-lg" href="${esc(rec.href)}">${svg("play")} Продолжить обучение</a>
            <a class="btn btn-ghost btn-lg" href="#/alphabet">Смотреть алфавит</a>
          </div>
        </div>
        <div class="hero-art">
          ${word ? `<div class="word-card">
            <div class="word-card-top"><span>Слово дня</span><span class="badge badge-gold">${esc(word.pack.title)}</span></div>
            <div class="word-dari">${esc(word.card.dari)}</div>
            <div class="word-translit">${esc(word.card.translit)}</div>
            <div class="word-ru">${esc(word.card.ru)}</div>
            <div class="word-card-bottom">
              <span>${word.card.numeral ? `Число ${esc(word.card.numeral)}` : "Нажмите, чтобы услышать"}</span>
              ${word.card.audio ? `<button class="word-play" type="button" data-play-src="${esc(word.card.audio)}" data-title="${esc(word.card.dari)}" data-subtitle="${esc(word.card.translit + " — " + word.card.ru)}" aria-label="Прослушать слово">${svg("play")}</button>` : ""}
            </div>
          </div>` : ""}
        </div>
      </div>

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
        <div><h2>Куда двигаться</h2><p>Четыре части курса работают вместе: звук, текст, слова и проверка.</p></div>
        <a class="section-link" href="#/lessons">Все уроки →</a>
      </div>
      <div class="routes-grid">
        <a class="route-card" href="#/alphabet" data-letter="ا">
          <span class="route-icon">${svg("alphabet")}</span>
          <h3>Алфавит</h3><p>33 буквы, формы и звучание</p>
          <div class="route-meta"><span>${lKnown} из ${total.letters} изучено</span><small>${introDone()} вводных уроков</small></div>
        </a>
        <a class="route-card" href="#/lessons" data-letter="د">
          <span class="route-icon">${svg("book")}</span>
          <h3>40 уроков</h3><p>Полный курс с аудио и PDF</p>
          <div class="route-meta"><span>${lDone} из ${total.lessons} пройдено</span><small>${fmt(DATA.lessons.reduce((s, x) => s + x.tracks.length, 0))} треков</small></div>
        </a>
        <a class="route-card" href="#/vocab" data-letter="و">
          <span class="route-icon">${svg("cards")}</span>
          <h3>Словарь</h3><p>Карточки с живым произношением</p>
          <div class="route-meta"><span>${wDone} из ${total.vocabWords} слов</span><small>${total.trainers} тренажёров</small></div>
        </a>
        <a class="route-card" href="#/practice" data-letter="پ">
          <span class="route-icon">${svg("target")}</span>
          <h3>Практика</h3><p>Проверьте слух и память</p>
          <div class="route-meta"><span>4 режима</span><small>+5 XP за ответ</small></div>
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
    return `
      <div class="letter-modal-top">
        <div class="letter-modal-char">${esc(letter.char)}</div>
        <div class="letter-modal-copy">
          <span class="eyebrow">Буква · группа ${esc(letter.lesson)}</span>
          <h2>${esc(letter.name)}</h2>
          <div class="latin">${esc(letter.latin)}</div>
          <p>${esc(letter.sound)}</p>
        </div>
      </div>
      <div class="modal-section"><h3>Четыре формы</h3><div class="forms-grid">${forms}</div></div>
      <div class="modal-section"><h3>Примеры</h3><div class="example-grid">${examples}</div></div>
      <div class="tip-box"><strong>Подсказка.</strong> ${esc(letter.tip)}</div>
      ${audioButtons ? `<div class="modal-section"><h3>Аудиоурок</h3><div class="modal-actions" style="margin:0;padding:0;border:0">${audioButtons}</div></div>` : ""}
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
