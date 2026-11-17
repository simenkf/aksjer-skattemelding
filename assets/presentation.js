(() => {
  "use strict";

  const nonNegative = (value) => Math.max(0, Number(value) || 0);

  function calculateShielding({
    cost,
    carried,
    rate,
    dividend,
    heldAtYearEnd = true,
  }) {
    const basis = nonNegative(cost) + nonNegative(carried);
    const annual = heldAtYearEnd ? (basis * nonNegative(rate)) / 100 : 0;
    const available = annual + nonNegative(carried);
    const used = Math.min(nonNegative(dividend), available);
    return {
      basis,
      annual,
      available,
      used,
      taxable: nonNegative(dividend) - used,
      carried: available - used,
    };
  }

  function calculateSale(lots, quantity, price) {
    let remaining = nonNegative(quantity);
    const rows = lots.map((lot) => {
      const sold = Math.min(remaining, nonNegative(lot.quantity));
      remaining -= sold;
      const gain = sold * (nonNegative(price) - nonNegative(lot.cost));
      const shielding = Math.min(
        Math.max(0, gain),
        sold * nonNegative(lot.shielding),
      );
      return { sold, gain, shielding, taxable: gain - shielding };
    });
    return {
      rows,
      taxable: rows.reduce((total, row) => total + row.taxable, 0),
      unfilled: remaining,
    };
  }

  function calculateV2A({ fee, dividend, years, saving }) {
    const savingPerShare =
      (nonNegative(dividend) * nonNegative(years) * nonNegative(saving)) / 100;
    return savingPerShare > 0
      ? Math.ceil(nonNegative(fee) / savingPerShare)
      : null;
  }

  function calculateDividendScenario({
    dividend,
    shielding = 0,
    irishRate = 25,
    usRate = 0,
    norwegianRate = 37.84,
    treatyRate = 15,
    claimCredit = true,
  }) {
    const gross = nonNegative(dividend);
    const taxable = Math.max(0, gross - nonNegative(shielding));
    const foreignTax = (gross * nonNegative(irishRate)) / 100;
    const usTax = (gross * nonNegative(usRate)) / 100;
    const norwegianTax = (taxable * nonNegative(norwegianRate)) / 100;
    const credit = claimCredit
      ? Math.min(
          foreignTax,
          norwegianTax,
          (gross * nonNegative(treatyRate)) / 100,
        )
      : 0;
    const domesticAfterCredit = norwegianTax - credit;
    return {
      gross,
      taxable,
      foreignTax,
      usTax,
      norwegianTax,
      credit,
      domesticAfterCredit,
      totalTax: foreignTax + usTax + domesticAfterCredit,
      net: gross - foreignTax - usTax - domesticAfterCredit,
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      calculateShielding,
      calculateSale,
      calculateV2A,
      calculateDividendScenario,
    };
  }
  if (typeof document === "undefined") return;

  const chapters = [...document.querySelectorAll("[data-chapter]")];
  if (!chapters.length) return;
  const currency = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });
  const preciseDecimal = new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: 6,
  });
  const money = (value) => `${currency.format(value)} kr`;
  const storage = {
    get(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };
  const legacyChapters = [
    "oversikt",
    "ansvarsfraskrivelse",
    "ressurser",
    "ressurser",
    "sjekkliste",
    "grunnlaget",
    "hva-er-skattemeldingen",
    "espp",
    "skattemeldingen",
    "tre-land",
    "w8ben",
    "kredittfradrag",
    "skjerming",
    "skjerming",
    "skjerming",
    "regnearket",
    "v2a",
    "v2a",
    "utbytte",
    "salg",
    "sjekkliste",
  ];
  let reading = storage.get("espp-reading-mode", false) === true;
  let current = 0;

  function chapterFromHash() {
    const hash = location.hash.slice(1);
    const id = /^\d+$/.test(hash) ? legacyChapters[Number(hash) - 1] : hash;
    const index = chapters.findIndex((chapter) => chapter.id === id);
    return index < 0 ? 0 : index;
  }

  function updateNavigation() {
    const chapter = chapters[current];
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const active = link.getAttribute("href") === `#${chapter.id}`;
      if (active) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    document.querySelector("#chapter-current").textContent = String(
      current + 1,
    ).padStart(2, "0");
    document.querySelector("#chapter-total").textContent = String(
      chapters.length,
    ).padStart(2, "0");
    document.querySelector("#chapter-label").textContent =
      chapter.dataset.title;
    document.querySelector("#previous").disabled = current === 0;
    document.querySelector("#next").disabled = current === chapters.length - 1;
    document.querySelector("#next-label").textContent =
      current === chapters.length - 1 ? "Ferdig" : "Neste kapittel";
    const progress = document.querySelector("#chapter-progress");
    progress.value = current + 1;
    progress.max = chapters.length;
    document.title = `${chapter.dataset.title} · Aksjer i skattemeldingen`;
  }

  function go(index, { focus = true, updateHash = true } = {}) {
    current = Math.max(0, Math.min(chapters.length - 1, index));
    chapters.forEach((chapter, position) => {
      chapter.hidden = !reading && position !== current;
    });
    if (updateHash && location.hash !== `#${chapters[current].id}`)
      history.pushState(null, "", `#${chapters[current].id}`);
    updateNavigation();
    document
      .querySelectorAll("dialog[open]")
      .forEach((dialog) => dialog.close());
    if (reading) chapters[current].scrollIntoView({ block: "start" });
    else document.querySelector("main").scrollTo({ top: 0 });
    if (focus)
      chapters[current].querySelector("h1, h2").focus({ preventScroll: true });
  }

  function setReading(value) {
    reading = value;
    document.body.classList.toggle("reading-mode", reading);
    document
      .querySelector("#reading-mode")
      .setAttribute("aria-pressed", String(reading));
    document
      .querySelector("#reading-mode")
      .setAttribute(
        "aria-label",
        reading ? "Bytt til presentasjon" : "Bytt til lesevisning",
      );
    document.querySelector("#reading-label").textContent = reading
      ? "Presentasjon"
      : "Lesevisning";
    storage.set("espp-reading-mode", reading);
    go(current, { focus: false });
  }

  document.addEventListener("click", (event) => {
    const navigation = event.target.closest("a[data-nav]");
    if (navigation) {
      event.preventDefault();
      const index = chapters.findIndex(
        (chapter) => `#${chapter.id}` === navigation.getAttribute("href"),
      );
      if (index >= 0) go(index);
    }
    const opener = event.target.closest("[data-dialog]");
    if (opener) document.getElementById(opener.dataset.dialog)?.showModal();
    if (event.target.closest("[data-close]"))
      event.target.closest("dialog")?.close();
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
  document
    .querySelector("#previous")
    .addEventListener("click", () => go(current - 1));
  document
    .querySelector("#next")
    .addEventListener("click", () => go(current + 1));
  document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector("main").focus();
  });
  document
    .querySelector("#reading-mode")
    .addEventListener("click", () => setReading(!reading));
  document
    .querySelector("#print")
    .addEventListener("click", () => window.print());
  const fullscreen = document.querySelector("#fullscreen");
  fullscreen.hidden = !document.documentElement.requestFullscreen;
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      document.querySelector("#app-status").textContent =
        "Fullskjerm er ikke tilgjengelig i denne nettleseren.";
    }
  });
  document.addEventListener("fullscreenchange", () =>
    fullscreen.setAttribute(
      "aria-pressed",
      String(Boolean(document.fullscreenElement)),
    ),
  );
  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const openDialog = document.querySelector("dialog[open]");
    if (openDialog) {
      if (event.key === "Escape") {
        event.preventDefault();
        openDialog.close();
      }
      return;
    }
    if (
      event.target.closest(
        "input, select, textarea, button, a, summary, [contenteditable]",
      )
    )
      return;
    if (reading) return;
    const direction = {
      ArrowRight: 1,
      PageDown: 1,
      " ": 1,
      ArrowLeft: -1,
      PageUp: -1,
    }[event.key];
    if (direction) {
      event.preventDefault();
      go(current + direction);
    }
    if (event.key === "Home") {
      event.preventDefault();
      go(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      go(chapters.length - 1);
    }
  });
  window.addEventListener("hashchange", () =>
    go(chapterFromHash(), { updateHash: false }),
  );

  const observer = new IntersectionObserver(
    (entries) => {
      if (!reading) return;
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (first, second) => second.intersectionRatio - first.intersectionRatio,
        )[0];
      if (visible) {
        current = chapters.indexOf(visible.target);
        history.replaceState(null, "", `#${chapters[current].id}`);
        updateNavigation();
      }
    },
    {
      root: document.querySelector("main"),
      rootMargin: "-5% 0px -55% 0px",
      threshold: [0, 0.1, 0.5],
    },
  );
  chapters.forEach((chapter) => observer.observe(chapter));

  function renderScenarios() {
    const scenarios = [
      ...document.querySelectorAll("#scenario-results tr"),
    ].map((row) => ({
      row,
      result: calculateDividendScenario({
        dividend: 10000,
        shielding: row.dataset.shielding,
        irishRate: row.dataset.irishRate,
        usRate: row.dataset.usRate,
        claimCredit: row.dataset.claimCredit !== "false",
      }),
    }));
    scenarios.forEach(({ row, result }) => {
      row.querySelectorAll("[data-scenario-field]").forEach((cell) => {
        cell.textContent = money(
          cell.dataset.scenarioField === "saving"
            ? result.net - scenarios[0].result.net
            : result[cell.dataset.scenarioField],
        );
      });
    });
  }

  function renderShielding() {
    const form = document.querySelector("#shielding-form");
    const values = Object.fromEntries(new FormData(form));
    const result = calculateShielding({
      ...values,
      heldAtYearEnd: form.elements.heldAtYearEnd.checked,
    });
    const outputs = {
      "shield-basis": result.basis,
      "shield-annual": result.annual,
      "shield-available": result.available,
      "shield-used": result.used,
      "shield-taxable": result.taxable,
      "shield-carried": result.carried,
    };
    Object.entries(outputs).forEach(([id, value]) => {
      document.getElementById(id).textContent = money(value);
    });
    document.querySelector("#shield-bar-used").value = result.used;
    document.querySelector("#shield-bar-used").max = Math.max(
      1,
      nonNegative(values.dividend),
    );
    document.querySelector("#shield-outcome").textContent =
      result.taxable > 0
        ? "Noe av utbyttet er skattepliktig."
        : "Utbyttet er dekket av skjerming.";
  }
  document
    .querySelector("#shielding-form")
    .addEventListener("input", renderShielding);
  document
    .querySelector("#shielding-form")
    .addEventListener("submit", (event) => event.preventDefault());
  document.querySelectorAll("[data-shield-preset]").forEach((button) =>
    button.addEventListener("click", () => {
      const form = document.querySelector("#shielding-form");
      const presets = {
        surplus: [10000, 0, 3.3, 100],
        taxable: [10000, 0, 2, 500],
        carried: [10000, 230, 3.3, 400],
      };
      ["cost", "carried", "rate", "dividend"].forEach((name, index) => {
        form.elements[name].value = presets[button.dataset.shieldPreset][index];
      });
      form.elements.heldAtYearEnd.checked = true;
      renderShielding();
    }),
  );

  function renderSale() {
    const quantity = Number(document.querySelector("#sale-quantity").value);
    const price = Number(document.querySelector("#sale-price").value);
    const result = calculateSale(
      [
        { quantity: 10, cost: 800, shielding: 50 },
        { quantity: 10, cost: 1000, shielding: 50 },
      ],
      quantity,
      price,
    );
    document.querySelector("#sale-quantity-output").textContent =
      `${quantity} aksjer`;
    document.querySelectorAll("[data-sale-lot]").forEach((element, index) => {
      element.textContent = `${result.rows[index].sold} av 10 solgt`;
      element
        .closest(".sale-lot")
        .classList.toggle("is-sold", result.rows[index].sold > 0);
    });
    document.querySelector("#sale-gain").textContent = money(
      result.rows.reduce((total, row) => total + row.gain, 0),
    );
    document.querySelector("#sale-shield").textContent = money(
      result.rows.reduce((total, row) => total + row.shielding, 0),
    );
    document.querySelector("#sale-taxable").textContent = money(result.taxable);
    document.querySelector("#sale-tax").textContent = money(
      result.taxable * 0.3784,
    );
    document.querySelector("#sale-tax-label").textContent =
      result.taxable < 0
        ? "Eksempel på skatteverdi av tap (37,84 %)"
        : "Eksempel på skatt (37,84 %)";
  }
  document.querySelector("#sale-form").addEventListener("input", renderSale);
  document
    .querySelector("#sale-form")
    .addEventListener("submit", (event) => event.preventDefault());

  function renderV2A() {
    const values = Object.fromEntries(
      new FormData(document.querySelector("#v2a-form")),
    );
    if (nonNegative(values.years) > 5) {
      document.querySelector("#v2a-result").textContent = "Sjekk horisonten";
      document.querySelector("#v2a-result-label").textContent =
        "Velg høyst 5 år, som er skjemaets gyldighet.";
      document.querySelector("#v2a-per-share").textContent = "ikke beregnet";
      document.querySelector("#v2a-calculation-saving").textContent =
        "Velg en horisont på høyst 5 år for å beregne besparelsen.";
      document.querySelector("#v2a-calculation-shares").textContent =
        "En lengre periode krever fornyelse og nytt behandlingsgebyr.";
      document.querySelector("#v2a-calculation-rounding").textContent = "";
      return;
    }
    const result = calculateV2A(values);
    const savingPerShare =
      (nonNegative(values.dividend) *
        nonNegative(values.years) *
        nonNegative(values.saving)) /
      100;
    const formattedSaving = `$${preciseDecimal.format(savingPerShare)}`;
    document.querySelector("#v2a-result").textContent =
      result === null ? "Ingen" : currency.format(result);
    document.querySelector("#v2a-result-label").textContent =
      result === null
        ? "beregnbar lønnsomhetsgrense med disse tallene"
        : "aksjer i gjennomsnitt for å dekke gebyret";
    document.querySelector("#v2a-per-share").textContent =
      formattedSaving;
    document.querySelector("#v2a-calculation-saving").textContent =
      `$${decimal.format(nonNegative(values.dividend))} × ${decimal.format(nonNegative(values.years))} år × (${decimal.format(nonNegative(values.saving))} / 100) = ${formattedSaving}`;
    document.querySelector("#v2a-calculation-shares").textContent =
      result === null
        ? "Ingen beregnbar grense: besparelsen per aksje er null."
        : `$${decimal.format(nonNegative(values.fee))} / ${formattedSaving} ≈ ${decimal.format(nonNegative(values.fee) / savingPerShare)} aksjer`;
    document.querySelector("#v2a-calculation-rounding").textContent =
      result === null
        ? "Uten forventet skattebesparelse kan vi ikke beregne en lønnsomhetsgrense."
        : `Vi bruker urundede tall og runder opp til ${currency.format(result)} aksjer i gjennomsnitt for å dekke gebyret.`;
  }
  document.querySelector("#v2a-form").addEventListener("input", renderV2A);
  document
    .querySelector("#v2a-form")
    .addEventListener("submit", (event) => event.preventDefault());

  const checks = [...document.querySelectorAll("[data-check]")];
  const savedChecks = storage.get("espp-checklist-v1", []);
  function renderChecks() {
    const completed = checks.filter((check) => check.checked).length;
    document.querySelector("#check-count").textContent =
      `${completed} av ${checks.length}`;
    document.querySelector("#check-progress").value = completed;
    document.querySelector("#check-message").textContent =
      completed === checks.length
        ? "Klar for en siste kontroll mot dokumentasjonen din."
        : "Ett punkt av gangen.";
    storage.set(
      "espp-checklist-v1",
      checks
        .filter((check) => check.checked)
        .map((check) => check.dataset.check),
    );
  }
  checks.forEach((check) => {
    check.checked =
      Array.isArray(savedChecks) && savedChecks.includes(check.dataset.check);
    check.addEventListener("change", renderChecks);
  });
  document.querySelector("#reset-checklist").addEventListener("click", () => {
    checks.forEach((check) => {
      check.checked = false;
    });
    renderChecks();
  });

  document.querySelectorAll("[data-answer]").forEach((button) =>
    button.addEventListener("click", () => {
      const question = button.closest(".knowledge-check");
      question
        .querySelectorAll("[data-answer]")
        .forEach((answer) =>
          answer.setAttribute("aria-pressed", String(answer === button)),
        );
      const correct = button.dataset.answer === "correct";
      const feedback = question.querySelector("[data-feedback]");
      feedback.textContent = correct
        ? question.dataset.correct
        : question.dataset.incorrect;
      feedback.classList.toggle("correct", correct);
    }),
  );

  const quiz = document.querySelector("#final-quiz");
  const quizQuestions = [...quiz.querySelectorAll("[data-quiz-question]")];
  const quizAnswers = new Map();
  const quizNext = document.querySelector("#quiz-next");
  const quizPrevious = document.querySelector("#quiz-previous");
  const quizControls = document.querySelector("#quiz-controls");
  const quizResult = document.querySelector("#quiz-result");
  let quizCurrent = 0;

  function renderQuiz({ focus = true } = {}) {
    quizQuestions.forEach((question, index) => {
      question.hidden = index !== quizCurrent;
    });
    quizResult.hidden = true;
    quizControls.hidden = false;
    document.querySelector("#quiz-position").textContent =
      `Spørsmål ${quizCurrent + 1} av ${quizQuestions.length}`;
    document.querySelector("#quiz-answered").textContent =
      `${quizAnswers.size} av ${quizQuestions.length} besvart`;
    const progress = document.querySelector("#quiz-progress");
    progress.value = quizAnswers.size;
    progress.max = quizQuestions.length;
    quizPrevious.disabled = quizCurrent === 0;
    quizNext.disabled = !quizAnswers.has(quizCurrent);
    quizNext.textContent =
      quizCurrent === quizQuestions.length - 1
        ? "Vis totalscore"
        : "Neste spørsmål";
    if (focus) quizQuestions[quizCurrent].querySelector("h3").focus();
  }

  function resetQuiz({ focus = true } = {}) {
    quizAnswers.clear();
    quizCurrent = 0;
    quizQuestions.forEach((question) => {
      question.querySelectorAll("[data-quiz-answer]").forEach((answer) => {
        answer.disabled = false;
        answer.setAttribute("aria-pressed", "false");
        answer.classList.remove("is-correct");
      });
      const feedback = question.querySelector("[data-feedback]");
      feedback.hidden = true;
      feedback.tabIndex = -1;
      feedback.classList.remove("correct");
      question.querySelector("[data-quiz-verdict]").textContent = "";
      question.querySelector(".quiz-topic-link").hidden = true;
    });
    renderQuiz({ focus });
  }

  quiz.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quiz-answer]");
    if (!button || quizAnswers.has(quizCurrent)) return;
    const question = quizQuestions[quizCurrent];
    if (!question.contains(button)) return;
    const correct = button.dataset.quizAnswer === "correct";
    quizAnswers.set(quizCurrent, correct);
    const correctAnswer = question.querySelector('[data-quiz-answer="correct"]');
    question.querySelectorAll("[data-quiz-answer]").forEach((answer) => {
      answer.disabled = true;
      answer.setAttribute("aria-pressed", String(answer === button));
      answer.classList.toggle("is-correct", answer === correctAnswer);
    });
    question.querySelector("[data-quiz-verdict]").textContent = correct
      ? "Riktig. "
      : `Ikke helt. Riktig svar: ${correctAnswer.textContent.trim()}. `;
    const feedback = question.querySelector("[data-feedback]");
    feedback.hidden = false;
    feedback.classList.toggle("correct", correct);
    question.querySelector(".quiz-topic-link").hidden = false;
    renderQuiz({ focus: false });
    feedback.focus();
  });

  quizPrevious.addEventListener("click", () => {
    quizCurrent -= 1;
    renderQuiz();
  });
  quizNext.addEventListener("click", () => {
    if (quizCurrent < quizQuestions.length - 1) {
      quizCurrent += 1;
      renderQuiz();
      return;
    }
    const score = [...quizAnswers.values()].filter(Boolean).length;
    const percent = Math.round((score / quizQuestions.length) * 100);
    document.querySelector("#quiz-score").textContent =
      `${score} av ${quizQuestions.length} riktige (${percent} %)`;
    document.querySelector("#quiz-result-message").textContent =
      score === quizQuestions.length
        ? "Full pott! Ta med deg forståelsen videre til dine egne tall og årets regler."
        : percent >= 80
          ? "God oversikt! Se gjerne gjennom forklaringene på det du bommet på."
          : percent >= 50
            ? "Mye er på plass. Repetér temaene du var usikker på, og prøv gjerne igjen."
            : "Dette er øvelse, ikke en eksamen. Bruk forklaringene og kapittellenkene, og prøv igjen når du er klar.";
    quizQuestions.forEach((question) => {
      question.hidden = true;
    });
    quizControls.hidden = true;
    quizResult.hidden = false;
    document.querySelector("#quiz-position").textContent = "Quizen er fullført";
    document.querySelector("#quiz-score").focus();
  });
  document.querySelector("#quiz-review").addEventListener("click", () => {
    quizCurrent = 0;
    renderQuiz();
  });
  document
    .querySelector("#quiz-restart")
    .addEventListener("click", () => resetQuiz());
  document.querySelector("#quiz-progress-row").hidden = false;
  resetQuiz({ focus: false });

  document
    .querySelector("#glossary-search")
    .addEventListener("input", (event) => {
      const query = event.target.value.trim().toLocaleLowerCase("nb-NO");
      const terms = [...document.querySelectorAll("#glossary-list > div")];
      terms.forEach((term) => {
        term.hidden = !term.textContent
          .toLocaleLowerCase("nb-NO")
          .includes(query);
      });
      document.querySelector("#glossary-empty").hidden = terms.some(
        (term) => !term.hidden,
      );
    });

  document.body.classList.add("is-enhanced");
  current = chapterFromHash();
  setReading(reading);
  renderScenarios();
  renderShielding();
  renderSale();
  renderV2A();
  renderChecks();
  if (globalThis.lucide)
    globalThis.lucide.createIcons({
      attrs: { "aria-hidden": "true", "stroke-width": 1.7 },
    });
})();
