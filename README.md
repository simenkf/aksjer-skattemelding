# Aksjer i skattemeldingen - Accenture ESPP

A Norwegian field guide to Accenture shares and the Norwegian tax return, by Simen Keiland Fondevik. Personal understanding, not professional tax or investment advice.

[Open the live guide](https://simenkf.github.io/aksjer-skattemelding/presentation.html)

## Use locally

Open [presentation.html](presentation.html) in a browser. No installation, build, or server is required. GitHub Pages serves the same files unchanged.

The guide has 19 chapters, presentation and continuous-reading views, a searchable Norwegian/English glossary, interactive shielding/FIFO/V2A examples, seven savings scenarios (including an explicitly hypothetical no-documentation baseline), and a printable version of the entire guide. Start and a dedicated disclaimer precede “Det grunnleggende”: shares (with one grid cell per share, market value, and share classes), the tax return and key dates, and ESPP. A final 20-question multiple-choice quiz covers concepts, calculations, and practical understanding before the TL;DR and sources. The first answer counts; each answer reveals an explanation and a chapter link. The quiz provides a total score, answer review, and restart. Numbered reporting tasks, key dates, and worked examples make it readable without a presenter; longer walkthroughs are expandable. Arrow keys, Page Up/Down, Space, Home, and End navigate in presentation mode when focus is outside a control. Native dialogs support Escape and focus trapping.

The checklist and preferred view are stored locally when browser storage is available. Quiz answers last only until the page is reloaded; quiz answers and calculation inputs are not saved or sent anywhere. There is no analytics script. Fonts are requested from Google Fonts, with local fallbacks; Lucide icons are vendored locally.

## Structure

- [presentation.html](presentation.html): semantic chapter content, forms, glossary, and source links. No inline styles or event handlers.
- [assets/presentation.css](assets/presentation.css): design tokens, shared components, responsive layouts, reduced motion, and print rules.
- [assets/presentation.js](assets/presentation.js): navigation, optional storage, dialogs, quizzes, and four pure example calculations.
- [assets/vendor/lucide.min.js](assets/vendor/lucide.min.js): pinned Lucide 0.468.0, including its license notice.
- [tests/presentation.test.cjs](tests/presentation.test.cjs): calculation and presentation-structure regression tests using Node's built-in test runner.

Reserve red for warnings and important notices, not neutral explanations. The share introduction uses green for the ownership example and blue for the share-class explanation.

Keep chapter IDs stable: they are shareable deep links. Legacy numbered slide links are mapped to the corresponding new chapters. To add a chapter, update the main content, both chapter menus, and the legacy mapping if needed; the runtime derives the chapter total from the document.

## Verification

With Node.js 18 or newer:

```sh
node --test tests/presentation.test.cjs
```

For UI changes, open the HTML directly and check chapter navigation, reader mode, dialogs, examples, checklist persistence, mobile layout, and print preview. Check quiz scoring for correct, incorrect, and mixed answers, locked answers, review, restart, and navigation away and back. Printing includes every quiz question, option, and explanation, regardless of quiz progress. Disabling JavaScript leaves all chapter text and quiz explanations available, but not the interactive calculations or quiz scoring.

## Shielding spreadsheet

Download [the v2 calculator](skjermingsfradrag-kalkulator/skjermingsfradrag-kalkulator-v2.xlsx), [a completed example](skjermingsfradrag-kalkulator/skjermingsfradrag-kalkulator-eksempel.xlsx), or [the manual v1 version](skjermingsfradrag-kalkulator/skjermingsfradrag-kalkulator-v1.xlsx).

Read the workbook's Start sheet. Keep your working copy somewhere permanent and update it each tax year: shielding depends on the history of each purchase lot. The workbook supports shares outside Accenture/ESPP too; verify its assumptions for your holdings.

## Content maintenance

The factual baseline is the original March-May 2026 material, supplemented by the author's V2A processing experience in September-October 2026, not a fresh certification of current tax rules. Rates, fees, program conditions, and processing steps are explicitly dated or labeled as illustrative. Verify them against Skatteetaten, current Accenture/UBS documentation, and the taxpayer's own records before updating the guide.

Chapter 12 restores the eCerts registration and Skatteetaten attestation steps, the physical mailing requirement for the stamped and signed V2A original, and the GlobeTax address and support contact. It states the $500 processing fee as of November 2026 and explains that eCerts is the only available V2A processing route for the Accenture shares held with UBS; processing it yourself is not an alternative to paying the fee. The author mailed the original on 21 September 2026 and received confirmation of receipt and processing on 1 October; this is a personal timeline, not a processing-time guarantee. The profitability calculator explains break-even as the average shareholding whose net tax savings cover the one-off fee.

The V2A introduction states its five-year validity. The calculator models at most that single five-year period and flags longer horizons, since renewal requires another processing fee. A closed-by-default “Vis utregningen av break-even” disclosure inside the calculator shows the formula, substituted inputs, per-share saving, and division rounded up to whole shares. It updates with the inputs, including zero-saving cases; the full-shielding assumptions and exclusions are kept in the same optional explanation.

Before the V2A calculator inputs, the net-savings explanation distinguishes 10 percentage points with a fully used 15% credit from 25 percentage points with full shielding and no usable current credit. Partial shielding can give an intermediate saving. Full shielding must last throughout the modeled period to use 25 throughout; the example excludes Irish refunds and the potential value of carried-forward credit.

In particular, foreign tax credit is limited by both the applicable treaty and Norwegian tax attributable to the income. The restored savings comparison caps current credit at the remaining Norwegian tax: both 80% and full shielding leave NOK 7,500 of a NOK 10,000 gross dividend when Irish withholding is NOK 2,500. Its hypothetical first row assumes 30% US withholding plus 25% Irish withholding, both on gross income, without credit or shielding; this is not verified UBS treatment. Savings are measured against that hypothetical NOK 716 baseline. The comparison states its simplified isolated-income assumptions and excludes fees, withholding refunds, and any value of carried-forward credit. The calculation models and the separate worked examples have regression tests.
