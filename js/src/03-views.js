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
      <div class="notice" style="margin-top:24px">${svg("info")}<span>Совет: сначала слушайте запись с закрытыми глазами, потом повторяйте вслух, и только затем смотрите на перевод. Так слух привыкает к настоящему ритму дари.</span></div>
    </div>`;
  };

  const renderPack = (id) => {
    const pack = DATA.vocab.packs.find((x) => x.id === id);
    if (!pack) return notFound("Набор слов не найден");
    remember({ label: `Словарь · ${pack.title}`, title: pack.title, subtitle: `${pack.cards.length} слов с аудио`, href: `#/vocab/${pack.id}`, mark: pack.icon });
    if (ui.flashPack !== pack.id) {
      ui.flashPack = pack.id;
      ui.flashIndex = 0;
      ui.flashFlipped = false;
    }
    const index = clamp(ui.flashIndex, 0, pack.cards.length - 1);
    const card = pack.cards[index];
    const known = packKnown(pack);
    const pct = Math.round((known / Math.max(1, pack.cards.length)) * 100);
    const isKnown = Boolean(state.words[`${pack.id}:${index}`]);
    ui.flashIndex = index;

    const flash = `<div class="flash-wrap">
      <div class="flash-progress"><span>${index + 1} / ${pack.cards.length}</span><div class="progress-track"><div class="progress-fill" style="width:${((index + 1) / pack.cards.length) * 100}%"></div></div><span>${known} ${plural(known, ["слово", "слова", "слов"])} знакомо</span></div>
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
      <div class="flash-bottom"><span>${pct}% набора знакомо</span><span>${pack.audioCount} аудиозаписей</span></div>
    </div>`;

    const list = `<div class="word-list">
      ${pack.cards.map((word, i) => {
        const key = `${pack.id}:${i}`;
        const wordKnown = Boolean(state.words[key]);
        return `<div class="word-row ${wordKnown ? "known" : ""}">
          <span class="idx">${pad(i + 1)}</span>
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
          ${card.audio ? `<button class="btn btn-primary" type="button" data-play-all="pack:${esc(pack.id)}">${svg("play")} Слушать набор</button>` : ""}
        </div>
      </div>
      <div class="flash-toolbar">
        <div class="view-switch">
          <button class="${ui.packView === "cards" ? "active" : ""}" type="button" data-pack-view="cards">${svg("cards")} Карточки</button>
          <button class="${ui.packView === "list" ? "active" : ""}" type="button" data-pack-view="list">${svg("list")} Список</button>
        </div>
        <div class="progress-inline" style="min-width:220px"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>
      </div>
      ${ui.packView === "list" ? list : flash}
      <div class="notice" style="margin-top:24px">${svg("headphones")}<span>${pack.id === "numbers" ? "Числа дари пишутся восточными цифрами, а звучат почти как персидские. Обратите внимание на «و» (о) между десятками и единицами." : "Аудио записано носителями: сначала слово на английском, затем дари. Повторяйте вслед за диктором, не боясь ошибиться."}</span></div>
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
            <div class="info"><strong>Запись ${i + 1}</strong><span>${esc(file.name)}</span></div>
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
      ${folders.length ? `<div class="folder-list">${folders.slice(0, 40).map((x) => `<a class="folder-item" href="#/library/${esc(x.node.id)}">
        <span class="folder-icon">${svg("folder")}</span><div><strong>${esc(x.node.name)}</strong><small>${esc(x.path)}</small></div>
      </a>`).join("")}</div>` : ""}
      ${files.length ? `<div class="file-list">${files.slice(0, 200).map((x) => libFileRow(x.file, x.path)).join("")}</div>` : ""}
      ${!folders.length && !files.length ? `<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте часть названия файла или папки.</p></div>` : ""}`;
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
      content = `${searchBar}
      <div class="breadcrumbs"><a href="#/library">Аудиотека</a><span>/</span>${trailLinks}</div>
      ${folders.length ? `<div class="section-head" style="margin-top:8px"><div><h2>Папки</h2><p>${folders.length} ${plural(folders.length, ["папка", "папки", "папок"])}</p></div></div>
      <div class="folder-list">
        ${folders.map((folder) => `<a class="folder-item" href="#/library/${esc(folder.id)}">
          <span class="folder-icon">${svg("folder")}</span>
          <div><strong>${esc(folder.name)}</strong><small>${libCounts(folder)}</small></div>
        </a>`).join("")}
      </div>` : ""}
      ${files.length ? `<div class="section-head"><div><h2>Файлы</h2><p>${files.length} ${plural(files.length, ["файл", "файла", "файлов"])} · аудио слушается здесь, скрипты открываются на нужной странице</p></div></div>
      <div class="file-list">${files.map((file) => libFileRow(file, "")).join("")}</div>` : ""}
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
        <div><span class="eyebrow">Архив · ${total.libraryCollections} ${plural(total.libraryCollections, ["раздел", "раздела", "разделов"])}</span><h1>Аудиотека</h1><p>${fmt(total.libraryFiles)} ${plural(total.libraryFiles, ["файл", "файла", "файлов"])}, ${fmt(total.libraryAudio)} аудио и ${fmt(total.libraryPdfs)} PDF во всех папках исходного Drive. ${fmt(total.linkedAudio)} ${plural(total.linkedAudio, ["запись", "записи", "записей"])} получили прямые ссылки на скрипты и задания — на нужной странице общего PDF.</p></div>
        <div class="page-head-actions"><a class="btn btn-ghost" href="${esc(DATA.meta.driveFolderUrl)}" target="_blank" rel="noopener">${svg("external")} Открыть архив</a></div>
      </div>
      <div class="lib-toolbar">
        <div class="search-input-wrap">${svg("search")}<input class="search-input" id="library-search" type="search" placeholder="Искать по всей аудиотеке…" value="${esc(ui.libQuery)}" autocomplete="off"></div>
        <span class="small muted">${fmt(total.libraryFiles)} ${plural(total.libraryFiles, ["файл", "файла", "файлов"])} · ${total.libraryCollections} ${plural(total.libraryCollections, ["раздел", "раздела", "разделов"])}</span>
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
  const renderTextbook = (num) => {
    const book = TEXTBOOKS[num];
    if (!book) return notFound();
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
        <div class="about-card"><h3>${svg("info")} Технически</h3><p>Статический сайт без сервера и сборки: HTML, CSS и JavaScript. Алфавит, словарь и 206 аудиодорожек сорока уроков сохранены локально. Полное дерево архива — 2 387 файлов, включая 2 091 аудио и 238 PDF — доступно в аудиотеке; записи открываются через Google Drive, а скрипты и задания — на нужной странице общего PDF.</p></div>
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
    else if (section === "textbook-2" || section === "textbook") html = renderTextbook(2);
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
    const pack = DATA.vocab.packs.find((x) => x.id === packId);
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
    if (target.closest("[data-pack-view]")) {
      ui.packView = target.closest("[data-pack-view]").dataset.packView;
      renderRoute({ scroll: false });
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

    if (target.closest("[data-flash-prev]")) {
      const pack = DATA.vocab.packs.find((x) => x.id === ui.flashPack);
      if (pack) { ui.flashIndex = (ui.flashIndex - 1 + pack.cards.length) % pack.cards.length; ui.flashFlipped = false; renderRoute({ scroll: false }); }
      return;
    }
    if (target.closest("[data-flash-next]")) {
      const pack = DATA.vocab.packs.find((x) => x.id === ui.flashPack);
      if (pack) { ui.flashIndex = (ui.flashIndex + 1) % pack.cards.length; ui.flashFlipped = false; renderRoute({ scroll: false }); }
      return;
    }
    if (target.closest("[data-flash-flip]")) {
      ui.flashFlipped = !ui.flashFlipped;
      const card = $(".flashcard");
      if (card) card.classList.toggle("flipped", ui.flashFlipped);
      return;
    }
    if (target.closest("[data-flash-know]")) {
      const pack = DATA.vocab.packs.find((x) => x.id === ui.flashPack);
      if (pack) {
        const key = `${pack.id}:${ui.flashIndex}`;
        const wasKnown = Boolean(state.words[key]);
        setWord(pack.id, ui.flashIndex, true);
        if (!wasKnown) toast("Слово отмечено · +2 XP");
        ui.flashIndex = (ui.flashIndex + 1) % pack.cards.length;
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
