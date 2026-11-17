const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  calculateShielding,
  calculateSale,
  calculateV2A,
  calculateDividendScenario,
} = require("../assets/presentation.js");

const html = readFileSync(join(__dirname, "../presentation.html"), "utf8");
const chapterIds = [...html.matchAll(/id="([^"]+)"\s+data-chapter/g)].map(
  (match) => match[1],
);
const chapterMarkup = (id) =>
  html.slice(html.indexOf(`id="${id}"\n`)).split("</section>")[0];
const quizMarkup = html.slice(
  html.indexOf('id="final-quiz"'),
  html.indexOf('<div class="quiz-controls"'),
);
const quizQuestions = quizMarkup
  .split('<div class="quiz-question" data-quiz-question>')
  .slice(1);
const quizQuestion = (topic) => {
  const matches = quizQuestions.filter((question) =>
    question.includes(`<span class="mono">${topic}</span>`),
  );
  assert.equal(matches.length, 1, `Expected one question for ${topic}`);
  return matches[0];
};
const correctQuizAnswer = (topic) =>
  quizQuestion(topic)
    .match(/data-quiz-answer="correct"[^>]*>([^<]+)<\/button>/)[1]
    .trim();

test("the introductory chapters precede the guide, preserving existing chapter IDs", () => {
  assert.deepEqual(chapterIds, [
    "oversikt",
    "ansvarsfraskrivelse",
    "grunnlaget",
    "hva-er-skattemeldingen",
    "espp",
    "tre-land",
    "skattemeldingen",
    "w8ben",
    "kredittfradrag",
    "skjerming",
    "regnearket",
    "v2a",
    "spareeksempler",
    "utbytte",
    "salg",
    "sjekkliste",
    "quiz",
    "oppsummering",
    "ressurser",
  ]);
  for (const id of ["chapter-nav", "contents-dialog"]) {
    const menu = html.slice(html.indexOf(`id="${id}"`)).split("</nav>")[0];
    assert.deepEqual(
      [...menu.matchAll(/href="#([^"]+)" data-nav/g)].map((match) => match[1]),
      chapterIds,
    );
  }
  assert.match(html, /id="chapter-total">19</);
  assert.match(html, /id="chapter-progress"\s+value="1"\s+max="19"/);
  assert.match(html, /class="edition-tag">01—19</);
  assert.match(chapterMarkup("oversikt"), /data-title="Start"/);
  assert.match(html, /id="chapter-label">Start</);
});

test("both chapter menus group the three basics after Start and the disclaimer", () => {
  const expectedGroups = [
    ["Det grunnleggende", ["grunnlaget", "hva-er-skattemeldingen", "espp"]],
    ["Fra aksjer til skattemelding", chapterIds.slice(5, 13)],
    ["Videre med aksjene", chapterIds.slice(13, 16)],
    ["Test og oppsummering", chapterIds.slice(16)],
  ];
  for (const id of ["chapter-nav", "contents-dialog"]) {
    const menu = html.slice(html.indexOf(`id="${id}"`)).split("</nav>")[0];
    const [ungrouped, ...groups] = menu.split('<p class="nav-group">');
    const links = (markup) =>
      [...markup.matchAll(/href="#([^"]+)" data-nav/g)].map((match) => match[1]);
    assert.deepEqual(links(ungrouped), ["oversikt", "ansvarsfraskrivelse"]);
    assert.deepEqual(
      groups.map((group) => [group.split("</p>")[0], links(group)]),
      expectedGroups,
    );
    const entries = [
      ...menu.matchAll(/<a href="#([^"]+)" data-nav[^>]*>([\s\S]*?)<\/a\s*>/g),
    ];
    entries.forEach(([, chapterId, content], index) => {
      const text = content.replace(/<[^>]+>/g, "").trim();
      const title = chapterMarkup(chapterId).match(/data-title="([^"]+)"/)[1];
      assert.equal(Number(text.slice(0, 2)), index + 1);
      assert.equal(text.slice(2).trim(), title);
    });
  }
  const sectionNumbers = [...html.matchAll(/class="section-number">(\d+) \//g)];
  assert.deepEqual(
    sectionNumbers.map((match) => Number(match[1])),
    chapterIds.map((_, index) => index + 1),
  );
});

test("the share illustration has exactly one cell per share", () => {
  const shares = chapterMarkup("grunnlaget");
  assert.match(shares, /data-title="Hva er en aksje"/);
  assert.match(shares, /id="title-grunnlaget"[^>]*>\s*Hva er en aksje\s*</);
  const grid = shares.split('class="ownership-grid"')[1].split("</div>")[0];
  assert.equal([...grid.matchAll(/<span><\/span>/g)].length, 100);
  assert.match(grid, /aria-label="20 av 100 aksjer er dine: du eier 20 prosent av selskapet"/);
  assert.match(shares, /Én rute = én aksje/);
  assert.match(shares, /20 grønne er dine, de 80 lyse/);
  assert.match(shares, /Aksjekurs × totalt antall aksjer = selskapets markedsverdi/);
  assert.match(shares, /\$300 per aksje og 100 aksjer/);
  assert.match(shares, /\$30 000/);
  assert.match(shares, /\$6 000/);
  assert.match(shares, /A- og B-aksjer/);
  assert.match(shares, /Class A-aksjer/);
  const css = readFileSync(join(__dirname, "../assets/presentation.css"), "utf8");
  assert.match(css, /\.ownership-grid \{[^}]*repeat\(10, 1fr\)/);
  assert.match(css, /\.ownership-grid span:nth-child\(-n \+ 20\)/);
});

test("the share introduction explains dividends, appreciation and shareholder influence", () => {
  const shares = chapterMarkup("grunnlaget");
  assert.match(shares, /Accenture betaler normalt utbytte fire ganger i\s+året/);
  assert.match(shares, /eksempelsatsen \$1,48 per aksje får du \$29,60 per\s+utbetaling for 20 aksjer/);
  assert.match(shares, /<h4>Verdiøkning<\/h4>/);
  assert.doesNotMatch(shares, /<h4>Verdiendring<\/h4>/);
  assert.match(shares, /Først når du selger, realiseres gevinsten/);
  assert.match(shares, /generalforsamlingen/);
  assert.match(shares, /valg av styre/);
  assert.match(shares, /class="share-classes">\s*<h3>A- og B-aksjer<\/h3>/);
  const css = readFileSync(join(__dirname, "../assets/presentation.css"), "utf8");
  assert.match(css, /\.ownership-example \{[^}]*background: var\(--mint\)/);
  assert.match(css, /\.share-classes \{[^}]*background: var\(--blue-wash\)/);
});

test("the tax-return introduction owns the explanation and all six key dates", () => {
  assert.doesNotMatch(chapterMarkup("grunnlaget"), /Viktige datoer|year-timeline/);
  const taxReturn = chapterMarkup("hva-er-skattemeldingen");
  assert.match(taxReturn, /Hva er skattemeldingen\?/);
  for (const topic of ["Inntekter", "Fradrag", "Formue", "Gjeld"]) {
    assert.ok(taxReturn.includes(`<dt>${topic}</dt>`));
  }
  assert.match(taxReturn, /Skattemelding er ikke skatteoppgjør/);
  assert.match(taxReturn, /ditt ansvar at alt er riktig og fullstendig/);
  assert.match(taxReturn, /Utenlandske aksjer hos UBS/);
  assert.match(taxReturn, /Viktige datoer/);
  const timeline = taxReturn.split('class="year-timeline"')[1];
  assert.equal([...timeline.matchAll(/<h4>/g)].length, 6);
  assert.match(timeline, /31\. DESEMBER/);
  assert.match(timeline, /MARS \/ NESTE ÅR/);
  assert.match(timeline, /NORMALT 30\. APRIL/);
  assert.match(timeline, /NORMALT 31\. MAI/);
  assert.match(timeline, /SOMMER–HØST/);
  assert.match(timeline, /AUGUST ELLER SENERE/);
  assert.match(timeline, /ikke det samme\s+som betalingsfristen/);
});

test("the W-8 BEN chapter explains its purpose, UBS flow and typical Norwegian field answers", () => {
  const w8ben = chapterMarkup("w8ben");
  const text = w8ben.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /unngå unødvendig amerikansk skattetrekk på Accenture-utbyttet/);
  assert.match(text, /fylles ut og signeres digitalt inne på UBS sine sider/);
  const steps = w8ben.match(/<ol class="numbered-list">([\s\S]*?)<\/ol>/)[1];
  const secondStep = [...steps.matchAll(/<li>([\s\S]*?)<\/li>/g)][1][1];
  assert.match(secondStep, /dialogvindu/);
  assert.match(text, /Skjemaet leveres til broker, ikke direkte til IRS/);
  const fields = w8ben.match(/<ul class="plain-list">([\s\S]*?)<\/ul>/)[1];
  assert.equal([...fields.matchAll(/<li>/g)].length, 4);
  assert.match(text, /«US tax payer ID»: Svar «nei», eller la feltet stå blankt/);
  assert.match(text, /SSN \(linje 5\): Har du ikke et amerikansk Social Security Number, hopper du over feltet/);
  assert.match(text, /FTIN \(linje 6a\): Utenlandsk skattenummer er normalt ditt norske fødselsnummer/);
  assert.match(text, /«Would you like to claim a tax treaty\?»: Svar «ja» og velg Norge/);
  assert.match(text, /når du har rett til skatteavtalefordelene/);
  assert.match(text, /Norge og USA har en skatteavtale/);
  assert.match(text, /Amerikanske skattepliktige personer skal normalt ikke bruke W-8 BEN/);
  assert.match(text, /ikke en universell W-8 BEN-sats for alle aksjer/);
});

test("the foreign tax credit chapter explains double taxation and both credit caps directly", () => {
  const credit = chapterMarkup("kredittfradrag");
  const text = credit.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /motvirke at samme inntekt beskattes to ganger/);
  assert.match(text, /utenlandsk skatt trekkes fra den norske skatten på inntekten/);
  assert.match(text, /Selv om det trekkes 25 % kildeskatt til Irland/);
  assert.match(text, /øvre grense for kredittfradraget av skatteavtalen/);
  assert.match(text, /avtalen med Irland grensen til 15 % av brutto utbytte/);
  assert.doesNotMatch(text, /Den opprinnelige guiden/);
  assert.match(text, /aldri bruke mer kredittfradrag for året enn den norske skatten på den samme inntekten før kredittfradrag/);
  assert.match(text, /uansett hvor mye skatt du har betalt i utlandet/);
  assert.match(text, /skatt på utbyttet 1 000 kr, er dette også taket for kredittfradraget, selv om Irland har trukket 2 500 kr/);
  assert.match(text, /Full skjerming kan gi null norsk skatt og dermed null kredittfradrag å bruke det året/);
});

test("the credit walkthrough video remains prominent outside collapsible details", () => {
  const credit = chapterMarkup("kredittfradrag");
  const outsideDetails = credit.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");
  const video = outsideDetails.match(
    /<a\s+class="document-link video-link"[\s\S]*?<\/a>/,
  );
  assert.ok(video, "The video must be accessible without expanding details");
  assert.match(video[0], /href="https:\/\/www\.youtube\.com\/watch\?v=VzX4a1A9XNQ"/);
  assert.match(video[0], /data-lucide="circle-play" aria-hidden="true"/);
  assert.match(video[0], /Se video om kredittfradrag/);
  assert.match(video[0], /target="_blank"/);
  assert.match(video[0], /rel="noopener"/);
  assert.match(video[0], /åpnes i ny fane/);
});

test("the V2A chapter restores the processing steps and physical original requirement", () => {
  const v2a = chapterMarkup("v2a");
  const text = v2a.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /V2A er en irsk erklæring for privatpersoner/);
  assert.match(text, /bosatt i Norge trenger du ikke betale denne skatten når vilkårene for fritak er oppfylt/);
  assert.match(text, /25 % til 0 %/);
  const introduction = v2a.slice(0, v2a.indexOf('<div class="two-column">'));
  assert.match(introduction, /<strong>Skjemaet er gyldig i 5 år\.<\/strong>/);
  const steps = v2a.match(/<ol class="numbered-list">([\s\S]*?)<\/ol>/)[1];
  assert.equal([...steps.matchAll(/<li>/g)].length, 6);
  assert.match(steps, /href="https:\/\/ecerts\.globetax\.com\/"/);
  assert.match(text, /tilgangskoden «Accenture»/);
  assert.match(text, /fødselsnummer og kontonummeret ditt hos UBS/);
  assert.match(text, /«Statements and resources» → «Statements»/);
  assert.match(text, /Å få skjemaet prosessert av eCerts koster \$500 per november 2026/);
  assert.match(text, /Kontroller gjeldende pris før du bestiller/);
  assert.match(text, /For Accenture-aksjene våre hos UBS er eCerts eneste tilgjengelige vei til V2A-fritaket/);
  assert.match(text, /Vi kan ikke ordne behandlingen selv og dermed unngå gebyret/);
  assert.doesNotMatch(text, /Originalguiden oppgir et gebyr/);
  assert.doesNotMatch(text, /\$500, fem år og \$6,52 er eksempeltall/);
  assert.match(text, /passordbeskyttet PDF/);
  assert.match(text, /del 1/);
  assert.match(text, /del 2 stemplet og signert av Skatteetaten/);
  assert.match(steps, /href="mailto:int@skatteetaten\.no"/);
  assert.match(text, /postadressen du vil ha originalen sendt i retur til/);
  assert.match(text, /Send originalen fysisk med post til GlobeTax/);
  assert.match(text, /ikke bare som en skannet kopi på e-post/);
  const address = v2a.match(/<address class="postal-address">([\s\S]*?)<\/address>/)[1];
  assert.deepEqual(
    address.split(/<br\s*\/>/).map((line) => line.trim()),
    [
      "Globe Tax Services, Inc.",
      "One New York Plaza, 34th Floor",
      "New York, NY 10004-1936 USA",
      "Attn: eCerts – Accenture",
    ],
  );
  assert.match(text, /kontroller trekket på senere utbytteutbetalinger hos UBS/);
  assert.doesNotMatch(text, /ikke ferdig verifisert/);
});

test("the V2A chapter shows the completed personal timeline and support contact", () => {
  const v2a = chapterMarkup("v2a");
  const outsideDetails = v2a.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");
  const text = outsideDetails.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(v2a, /datetime="2026-09-21">21\. september 2026/);
  assert.match(v2a, /datetime="2026-10-01">1\. oktober 2026/);
  assert.match(text, /sendte jeg originalen til GlobeTax 21\. september 2026/);
  assert.match(text, /1\. oktober 2026 fikk jeg e-post om at skjemaet var mottatt og prosessert/);
  assert.match(text, /ikke en garantert behandlingstid/);
  assert.match(outsideDetails, /href="mailto:eCerts@globetax\.com"/);
  assert.match(text, /fått raske svar på spørsmål/);
  const css = readFileSync(join(__dirname, "../assets/presentation.css"), "utf8");
  assert.match(css, /\.v2a-experience \{[^}]*background: var\(--blue-wash\)/);
  assert.match(css, /\.v2a-experience h3 \{[^}]*font-size: 18px/);
  assert.match(css, /\.v2a-experience p \{[^}]*font-size: 13px/);
});

test("the V2A calculator explains break-even as net savings covering the fee", () => {
  const v2a = chapterMarkup("v2a");
  const outsideDetails = v2a.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");
  const text = outsideDetails.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Vi beregner break-even/);
  assert.match(text, /netto skattebesparelse med V2A skal dekke engangsgebyret/);
  assert.match(text, /samme utbytte uten V2A, etter eventuelt kredittfradrag/);
  assert.match(text, /Ved break-even går du i null etter gebyret/);
  assert.match(text, /Over grensen lønner V2A seg/);
  assert.match(text, /under grensen er besparelsen mindre enn gebyret/);
});

test("the V2A calculator explains 10 versus 25 percentage points before the inputs", () => {
  const v2a = chapterMarkup("v2a");
  const help = v2a.match(
    /<div class="v2a-saving-help" id="v2a-saving-help">([\s\S]*?)<\/div>/,
  );
  assert.ok(help, "The savings explanation must be visible outside details");
  assert.ok(v2a.indexOf(help[0]) < v2a.indexOf('<form id="v2a-form">'));
  const text = help[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /hvor stor del av brutto utbytte du sparer/);
  assert.match(text, /Uten skjerming: 10 prosentpoeng/);
  assert.match(text, /utnytte hele skatteavtalegrensen på 15 % som kredittfradrag/);
  assert.match(text, /25 − 15 = 10 prosentpoeng/);
  assert.match(text, /Full skjerming: 25 prosentpoeng/);
  assert.match(text, /Når skjermingen dekker hele utbyttet, er norsk skatt null/);
  assert.match(text, /25 − 0 = 25 prosentpoeng/);
  assert.match(text, /Ved delvis skjerming kan besparelsen ligge mellom 10 og 25 prosentpoeng/);
  assert.match(
    v2a,
    /<input\s+type="number"\s+name="saving"\s+aria-describedby="v2a-saving-help"/,
  );
});

test("the V2A worked calculation is inside the calculator and collapsed by default", () => {
  const v2a = chapterMarkup("v2a");
  const calculation = v2a.match(
    /<details class="v2a-calculation" id="v2a-calculation">([\s\S]*?)<\/details>/,
  );
  assert.ok(calculation, "The calculation must use a closed native disclosure");
  assert.match(calculation[1], /<summary>Vis utregningen av break-even<\/summary>/);
  assert.ok(v2a.indexOf(calculation[0]) > v2a.indexOf('id="v2a-result"'));
  assert.ok(v2a.indexOf(calculation[0]) < v2a.indexOf('class="math-note v2a-experience"'));
  const text = calculation[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.match(text, /Break-even = engangsgebyr \/ besparelse per aksje, rundet opp til hele aksjer/);
  assert.match(text, /\$6,52 × 5 år × \(10 \/ 100\) = \$3,26/);
  assert.match(text, /\$500 \/ \$3,26 ≈ 153,37 aksjer/);
  assert.match(text, /runder opp til 154 aksjer i gjennomsnitt/);
  for (const id of ["saving", "shares", "rounding"]) {
    assert.match(calculation[1], new RegExp(`id="v2a-calculation-${id}"`));
  }
  assert.match(text, /full skjerming gjelde gjennom hele perioden/);
  assert.match(text, /ser bort fra alternativ refusjon fra Irland/);
  assert.match(text, /senere bruk av fremført kredittfradrag/);
  assert.match(
    v2a,
    /name="years"\s+value="5"\s+min="0"\s+max="5"/,
  );
});

test("the dedicated disclaimer restores the original cautions and invitation to ask", () => {
  const disclaimer = chapterMarkup("ansvarsfraskrivelse");
  assert.match(disclaimer, /Personlig forståelse/);
  assert.match(disclaimer, /Ikke finansiell rådgivning/);
  assert.match(disclaimer, /Skatteetaten går foran/);
  assert.match(disclaimer, /Forfatteren tar ikke ansvar/);
  assert.match(disclaimer, /Tilbakemeldinger er velkomne/);
  assert.match(disclaimer, /Spør underveis/);
  const js = readFileSync(join(__dirname, "../assets/presentation.js"), "utf8");
  const legacy = js.match(/const legacyChapters = \[([\s\S]*?)\];/)[1];
  const mappedIds = [...legacy.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(mappedIds[1], "ansvarsfraskrivelse");
  assert.equal(mappedIds[5], "grunnlaget");
  assert.equal(mappedIds[6], "hva-er-skattemeldingen");
  assert.ok(mappedIds.every((id) => chapterIds.includes(id)));
});

test("all 20 quiz questions have one correct choice, explanations and a valid chapter link", () => {
  assert.equal(quizQuestions.length, 20);
  assert.match(html, /20 spørsmål fra hele guiden/);
  assert.match(html, /id="quiz-position">Spørsmål 1 av 20</);
  assert.match(html, /id="quiz-answered" role="status">0 av 20 besvart</);
  assert.match(html, /id="quiz-progress" value="0" max="20"/);
  for (const question of quizQuestions) {
    assert.equal([...question.matchAll(/data-quiz-answer="/g)].length, 3);
    assert.equal([...question.matchAll(/data-quiz-answer="correct"/g)].length, 1);
    assert.equal([...question.matchAll(/aria-pressed="false"/g)].length, 3);
    assert.match(question, /<h3 tabindex="-1">[^<]+<\/h3>/);
    assert.match(question, /data-quiz-verdict><\/strong>[^<]+<\/p>/);
    const link = question.match(/quiz-topic-link" href="#([^"]+)" data-nav/);
    assert.ok(link && chapterIds.includes(link[1]));
  }
  const headings = quizQuestions.map(
    (question) => question.match(/<h3[^>]*>([^<]+)/)[1],
  );
  assert.equal(new Set(headings).size, quizQuestions.length);
});

test("numeric quiz answers agree with the calculation models", () => {
  const numericAnswer = (topic) =>
    Number(correctQuizAnswer(topic).replace(/\D/g, ""));
  assert.equal(numericAnswer("GRUNNLAGET"), (20 / 100) * 100);
  assert.equal(numericAnswer("ESPP"), 100 * 0.85);
  assert.equal(numericAnswer("ESPP / INNGANGSVERDI"), 85 + 15);
  assert.equal(numericAnswer("FORMUE"), 100 * 200);
  assert.equal(
    numericAnswer("KREDITTFRADRAG"),
    calculateDividendScenario({ dividend: 10000 }).credit,
  );
  assert.equal(
    numericAnswer("SKJERMING / REGN SELV"),
    calculateShielding({ cost: 10000, rate: 3.3, dividend: 100 }).carried,
  );
  const scenario = calculateDividendScenario({
    dividend: 10000,
    shielding: 10000,
  });
  assert.equal(numericAnswer("SPAREEKSEMPLENE"), scenario.net);
  const sale = calculateSale(
    [
      { quantity: 10, cost: 800, shielding: 50 },
      { quantity: 10, cost: 1000, shielding: 50 },
    ],
    12,
    1200,
  );
  assert.equal(numericAnswer("SALG / FIFO"), sale.taxable);
  assert.equal(numericAnswer("SALG / VALUTA"), 100 * 11 - 100 * 10);
  const loss = calculateSale(
    [{ quantity: 1, cost: 1000, shielding: 50 }],
    1,
    900,
  );
  assert.equal(numericAnswer("SALG / TAP OG SKJERMING"), -loss.taxable);
});

test("conceptual quiz answers cover domicile, per-lot history and V2A factors", () => {
  assert.equal(correctQuizAnswer("TRE LAND"), "Irland");
  assert.equal(
    correctQuizAnswer("REGNEARKET"),
    "Hver transje må følges med egne beregninger og historikk, år for år",
  );
  assert.equal(
    correctQuizAnswer("V2A / LØNNSOMHET"),
    "Hvor lenge du skal eie aksjene, om du kjøper flere fremover, og forventet utbytte",
  );
  assert.match(quizQuestion("SPAREEKSEMPLENE"), /full skjerming og W-8 BEN, men ikke V2A/);
});

test("reporting questions distinguish year-end share wealth from sale reporting", () => {
  assert.ok(
    quizQuestions.indexOf(quizQuestion("SJEKKLISTEN / DITT ANSVAR")) <
      quizQuestions.indexOf(quizQuestion("FORMUE")),
  );
  const sold = quizQuestion("FORMUE / SOLGT FØR ÅRSSKIFTET");
  assert.match(sold, /rapportere som aksjeformue 31\.12\./);
  assert.equal(correctQuizAnswer("FORMUE / SOLGT FØR ÅRSSKIFTET"), "Ingen aksjeformue");
  assert.match(sold, /Gevinst\/tap ved salget må likevel rapporteres/);
  assert.match(sold, /kontantformue/);
  const basis = quizQuestion("ESPP / INNGANGSVERDI");
  assert.match(basis, /Rabatten på 15 er allerede lønnsbeskattet/);
  assert.match(basis, /Faktisk investeringsavkastning tar derimot utgangspunkt i de 85 du betalte/);
});

test("shielding first covers dividends and only the remainder carries forward", () => {
  const result = calculateShielding({
    cost: 10000,
    carried: 0,
    rate: 3.3,
    dividend: 100,
  });
  assert.equal(result.annual, 330);
  assert.equal(result.taxable, 0);
  assert.equal(result.carried, 230);
});

test("carried shielding increases the basis and remains available", () => {
  const result = calculateShielding({
    cost: 10000,
    carried: 230,
    rate: 3.3,
    dividend: 400,
  });
  assert.equal(result.basis, 10230);
  assert.ok(Math.abs(result.carried - 167.59) < 0.001);
});

test("a lot sold before year end earns no new annual shielding", () => {
  const result = calculateShielding({
    cost: 10000,
    carried: 167.6,
    rate: 3.3,
    dividend: 100,
    heldAtYearEnd: false,
  });
  assert.equal(result.annual, 0);
  assert.ok(Math.abs(result.carried - 67.6) < 0.001);
});

test("insufficient shielding leaves a taxable dividend", () => {
  const result = calculateShielding({
    cost: 10000,
    carried: 0,
    rate: 2,
    dividend: 500,
  });
  assert.equal(result.taxable, 300);
  assert.equal(result.carried, 0);
});

test("FIFO uses the oldest purchase first and only its shielding", () => {
  const result = calculateSale(
    [
      { quantity: 10, cost: 800, shielding: 50 },
      { quantity: 10, cost: 1000, shielding: 50 },
    ],
    12,
    1200,
  );
  assert.deepEqual(
    result.rows.map((row) => row.sold),
    [10, 2],
  );
  assert.equal(result.taxable, 3800);
});

test("shielding cannot create or increase a capital loss", () => {
  assert.equal(
    calculateSale([{ quantity: 10, cost: 1000, shielding: 500 }], 10, 900)
      .taxable,
    -1000,
  );
  assert.equal(
    calculateSale([{ quantity: 10, cost: 1000, shielding: 500 }], 10, 1100)
      .taxable,
    0,
  );
});

test("unused shielding cannot move between purchase lots", () => {
  const result = calculateSale(
    [
      { quantity: 1, cost: 100, shielding: 500 },
      { quantity: 1, cost: 100, shielding: 0 },
    ],
    2,
    200,
  );
  assert.equal(result.taxable, 100);
});

test("mixed gains and losses apply shielding before the lot results are summed", () => {
  const result = calculateSale(
    [
      { quantity: 10, cost: 800, shielding: 50 },
      { quantity: 10, cost: 1000, shielding: 50 },
    ],
    12,
    900,
  );
  assert.equal(result.rows[0].taxable, 500);
  assert.equal(result.rows[1].taxable, -200);
  assert.equal(result.taxable, 300);
});

test("V2A example rounds up and handles zero expected savings", () => {
  assert.equal(
    calculateV2A({ fee: 500, dividend: 6.52, years: 5, saving: 10 }),
    154,
  );
  assert.equal(
    calculateV2A({ fee: 500, dividend: 0, years: 5, saving: 10 }),
    null,
  );
  const savingPerShare = (6.52 * 5 * 10) / 100;
  assert.ok(153 * savingPerShare < 500);
  assert.ok(154 * savingPerShare >= 500);
  assert.equal((153 * savingPerShare).toFixed(2), "498.78");
  assert.equal((154 * savingPerShare).toFixed(2), "502.04");
});

test("the hypothetical undocumented baseline adds 30 percent US withholding on gross", () => {
  const baseline = calculateDividendScenario({
    dividend: 10000,
    usRate: 30,
    claimCredit: false,
  });
  const documented = calculateDividendScenario({
    dividend: 10000,
    claimCredit: false,
  });
  assert.equal(baseline.gross, 10000);
  assert.equal(baseline.usTax, 3000);
  assert.equal(baseline.foreignTax, 2500);
  assert.equal(baseline.credit, 0);
  assert.ok(Math.abs(baseline.norwegianTax - 3784) < 0.001);
  assert.ok(Math.abs(baseline.totalTax - 9284) < 0.001);
  assert.ok(Math.abs(baseline.net - 716) < 0.001);
  assert.equal(documented.usTax, 0);
  assert.ok(Math.abs(documented.net - baseline.net - 3000) < 0.001);
});

test("dividend scenarios distinguish no claim from treaty-limited credit", () => {
  const baseline = calculateDividendScenario({
    dividend: 10000,
    claimCredit: false,
  });
  const credited = calculateDividendScenario({ dividend: 10000 });
  assert.ok(Math.abs(baseline.net - 3716) < 0.001);
  assert.equal(credited.credit, 1500);
  assert.equal(credited.net, 5216);
  assert.ok(Math.abs(credited.net - baseline.net - 1500) < 0.001);
});

test("80 percent shielding caps current credit at the remaining Norwegian tax", () => {
  const result = calculateDividendScenario({
    dividend: 10000,
    shielding: 8000,
  });
  assert.ok(Math.abs(result.norwegianTax - 756.8) < 0.001);
  assert.equal(result.credit, result.norwegianTax);
  assert.equal(result.domesticAfterCredit, 0);
  assert.equal(result.net, 7500);
});

test("full shielding cannot turn credit into a current cash refund", () => {
  const result = calculateDividendScenario({
    dividend: 10000,
    shielding: 10000,
  });
  assert.equal(result.norwegianTax, 0);
  assert.equal(result.credit, 0);
  assert.equal(result.totalTax, 2500);
  assert.equal(result.net, 7500);
});

test("V2A scenarios remove foreign withholding but not unshielded Norwegian tax", () => {
  const unshielded = calculateDividendScenario({
    dividend: 10000,
    irishRate: 0,
  });
  const shielded = calculateDividendScenario({
    dividend: 10000,
    irishRate: 0,
    shielding: 10000,
  });
  assert.equal(unshielded.credit, 0);
  assert.equal(unshielded.net, 6216);
  assert.equal(shielded.net, 10000);
});

test("scenario shielding is capped at gross income and zero dividends stay zero", () => {
  assert.equal(
    calculateDividendScenario({ dividend: 100, shielding: 200 }).taxable,
    0,
  );
  const result = calculateDividendScenario({ dividend: 0 });
  assert.equal(result.credit, 0);
  assert.equal(result.net, 0);
});

test("the standalone shielding example saves Norwegian tax before foreign credit", () => {
  const result = calculateShielding({
    cost: 140000,
    rate: 3.6,
    dividend: 10000,
  });
  assert.equal(result.annual, 5040);
  assert.equal(result.taxable, 4960);
  assert.equal(Math.round(result.taxable * 0.3784), 1877);
  assert.equal(Math.round(result.used * 0.3784), 1907);
});

test("two dividend lots keep taxable income and unused shielding separate", () => {
  const first = calculateShielding({ cost: 10000, rate: 2, dividend: 500 });
  const second = calculateShielding({ cost: 16500, rate: 2, dividend: 100 });
  assert.equal(first.taxable + second.taxable, 300);
  assert.equal(first.carried + second.carried, 230);
});

test("the full-sale walkthrough and full-shielding V2A example match their models", () => {
  const result = calculateSale(
    [
      { quantity: 10, cost: 800, shielding: 50 },
      { quantity: 10, cost: 1000, shielding: 50 },
    ],
    20,
    1200,
  );
  assert.equal(result.taxable, 5000);
  assert.equal(result.taxable * 0.3784, 1892);
  assert.equal(
    calculateV2A({ fee: 500, dividend: 6.52, years: 5, saving: 25 }),
    62,
  );
});
