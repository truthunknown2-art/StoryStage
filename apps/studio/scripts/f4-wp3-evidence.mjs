/* global console, document, getComputedStyle, process */
/* F4-WP3 reproducible browser evidence. Exercises the real Product v1
 * Projects -> Create -> Studio -> Assets & Rigs route at 1440x900 and
 * captures the scene-scoped request-pack preview, drop-intent pending,
 * candidate metadata review, missing source/license validation, wrong-format
 * and duplicate errors, explicit confirmation, the confirmed local candidate
 * disclaimer, cancellation with unchanged prior state, and one visible
 * keyboard-focus state. Listeners are attached before navigation; every
 * screenshot and the machine-readable report are SHA-256 hashed. */
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const loadPackage = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
const pnpmStore = path.join(REPO_ROOT, "node_modules", ".pnpm");
const playwrightStores = fs
  .readdirSync(pnpmStore)
  .filter((entry) => entry.startsWith("playwright-core@"));
if (playwrightStores.length !== 1)
  throw new Error(
    `Expected exactly one installed playwright-core, found ${playwrightStores.length}`,
  );
const pw = loadPackage(
  path.join(pnpmStore, playwrightStores[0], "node_modules", "playwright-core"),
);

const BASE = "http://127.0.0.1:5173/";
const OUT = path.join(
  REPO_ROOT,
  "reports",
  "agent-handoffs",
  "2026-07-22-kimi-f4-wp3-image-request-import-ux",
  "screenshots",
);
const SAMPLE_SCRIPT = [
  "Lila lives in a quiet village at the edge of a deep, whispering forest.",
  "One evening, she finds a small lantern glowing under the roots of an old tree.",
  "The light flickers, and a soft rustle in the bushes makes her pause.",
  "Summoning her courage, Lila picks up the lantern and follows the glow.",
].join("\n\n");
const CONFIRMED_TRUTH =
  "Only a session-local descriptive candidate record now exists";

const sha256File = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const report = {
  task: "F4-WP3-IMAGE-REQUEST-IMPORT-UX",
  base: BASE,
  capturedAt: new Date().toISOString(),
  viewport: "1440x900",
  checks: [],
  consoleIssues: [],
  pageErrors: [],
  screenshots: [],
};
const rec = (name, pass, details) =>
  report.checks.push({ name, pass, details });

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowElements = [];
    document.querySelectorAll("body *").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (
        rect.width > 0 &&
        (rect.right > doc.clientWidth + 1 || rect.left < -1)
      )
        overflowElements.push({
          tag: element.tagName.toLowerCase(),
          cls:
            typeof element.className === "string"
              ? element.className.slice(0, 80)
              : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
    });
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowElements: overflowElements.slice(0, 10),
    };
  });
}

async function assertNoOverflow(page, name) {
  const value = await measure(page);
  rec(
    `${name}: no horizontal document overflow`,
    value.scrollWidth <= value.clientWidth &&
      value.overflowElements.length === 0,
    value,
  );
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  report.screenshots.push({
    file: `screenshots/${name}.png`,
    sha256: sha256File(file),
  });
}

const panelText = (page) =>
  page.locator("[data-testid='pv1-request']").textContent();
const countsText = (page) =>
  page.locator(".pv1-requirement-counts").textContent();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const consoleIssues = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error")
      consoleIssues.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) =>
    pageErrors.push(`pageerror: ${error.message}`),
  );

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New project" }).first().click();
  await page.getByRole("button", { name: /Paste a script/ }).click();
  await page.getByRole("textbox", { name: "Script" }).fill(SAMPLE_SCRIPT);
  await page.getByRole("button", { name: "Create proposal" }).click();
  await page.getByRole("article", { name: "Review proposal" }).waitFor();
  await page.getByRole("button", { name: /Enter Studio/ }).click();
  await page.waitForSelector("[data-testid='pv1-studio']");
  await page.getByRole("button", { name: "Assets & Rigs" }).click();
  await page.waitForSelector("[data-testid='pv1-assets']");
  await page.getByLabel("Scene filter").selectOption("scene-3");

  // Keyboard focus: the new Request-image-pack control is reachable by Tab
  // with a visible outline and a unique accessible name.
  const requestButton = page.getByRole("button", {
    name: "Request image pack for Dot in Scene 3 · Berry Patch",
  });
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await requestButton.evaluate(
        (element) => document.activeElement === element,
      )
    )
      break;
  }
  const focus = await requestButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      ariaLabel: element.getAttribute("aria-label"),
      ariaExpanded: element.getAttribute("aria-expanded"),
    };
  });
  rec(
    "keyboard focus: Request-image-pack control is reachable with visible focus and unique identity",
    focus.active &&
      Number.parseFloat(focus.outlineWidth) >= 2 &&
      focus.outlineStyle === "solid" &&
      focus.ariaLabel.includes("Dot") &&
      focus.ariaLabel.includes("Scene 3") &&
      focus.ariaExpanded === "false",
    focus,
  );
  await requestButton.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await shot(page, "wp3-1440x900-request-button-focus");

  // Scene-scoped request-pack preview: selected scene, requirement, category,
  // and current blocker stay visible beside the pack.
  await requestButton.press("Enter");
  await page.waitForSelector("[data-testid='pv1-request']");
  let text = await panelText(page);
  rec(
    "request-pack preview: scene/category/blocker context, readonly prompt, references, expected views/layers, and truth notes",
    text.includes("Scene 3 · Berry Patch") &&
      text.includes("Characters") &&
      text.includes("Current blocker:") &&
      text.includes("Dot — local planning record") &&
      text.includes("Scene 3 · Berry Patch — bounded demo scene") &&
      text.includes("Front view") &&
      text.includes("Three-quarter view") &&
      text.includes("Full character on one transparent plane") &&
      text.includes("planning document only") &&
      text.includes("no reference file, bytes, or content-addressed artifact"),
    { text: text.slice(0, 1200) },
  );
  const prompt = await page
    .locator("[data-testid='pv1-request'] textarea")
    .evaluate((element) => ({
      readOnly: element.readOnly,
      length: element.value.length,
      containsName: element.value.includes("Dot"),
    }));
  rec(
    "request prompt is creator-selectable readonly text with no copy claim",
    prompt.readOnly && prompt.length > 80 && prompt.containsName,
    prompt,
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await assertNoOverflow(page, "request-pack preview");
  await shot(page, "wp3-1440x900-request-pack-preview");

  // Drop intent is recorded honestly; no bytes can be read.
  const countsBefore = await countsText(page);
  await page.getByRole("button", { name: "Declare drop intent" }).click();
  text = await panelText(page);
  rec(
    "drop intent pending: honest no-byte statement and declared demo candidates",
    text.includes("Drop intent recorded") &&
      text.includes("cannot read dropped bytes") &&
      text.includes("Dot front view") &&
      text.includes("Dot view sheet") &&
      text.includes("Dot notes export"),
    { text: text.slice(-800) },
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-drop-intent-pending");

  // Candidate metadata review.
  await page.getByRole("button", { name: /Dot view sheet/ }).click();
  text = await panelText(page);
  rec(
    "metadata review: proposed name, declared format, reference association, and expected-view coverage before confirmation",
    text.includes("Reviewing candidate metadata") &&
      text.includes("Proposed name") &&
      text.includes("Declared format") &&
      text.includes("declared demo metadata, not media sniffing") &&
      text.includes("Reference association") &&
      text.includes("Covers every expected view"),
    { text: text.slice(-1000) },
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-candidate-metadata-review");

  // Missing source: focus and association move to the readable error.
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  const missingSource = await page.evaluate(() => {
    const input = document.getElementById("pv1-source-req-s3-dot");
    return {
      alert: document.querySelector(".pv1-request-alert")?.textContent ?? "",
      focused: document.activeElement === input,
      invalid: input?.getAttribute("aria-invalid"),
    };
  });
  rec(
    "missing source validation: readable alert, aria-invalid, focus on the field, no candidate created",
    missingSource.alert.includes("Source is required") &&
      missingSource.alert.includes("No candidate was created") &&
      missingSource.focused &&
      missingSource.invalid === "true" &&
      (await panelText(page)).includes(
        "Local candidate records for this requirement (0)",
      ),
    missingSource,
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-missing-source");

  // Missing license follows the same fail-closed path.
  await page
    .getByLabel("Source (required)")
    .fill("Painted in my own tool");
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  const missingLicense = await page.evaluate(() => {
    const input = document.getElementById("pv1-license-req-s3-dot");
    return {
      alert: document.querySelector(".pv1-request-alert")?.textContent ?? "",
      focused: document.activeElement === input,
      invalid: input?.getAttribute("aria-invalid"),
    };
  });
  rec(
    "missing license validation: readable alert, aria-invalid, focus on the field",
    missingLicense.alert.includes("License or rights are required") &&
      missingLicense.focused &&
      missingLicense.invalid === "true",
    missingLicense,
  );
  await shot(page, "wp3-1440x900-missing-license");

  // Explicit confirmation review, then the confirmed local-record disclaimer.
  await page.getByLabel("License / rights (required)").fill("I own the result");
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  text = await panelText(page);
  const confirmState = await page.evaluate(() => {
    const confirm = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Confirm local candidate record",
    );
    return {
      disabled: confirm?.disabled ?? null,
      sourceDisabled: document.getElementById("pv1-source-req-s3-dot")
        ?.disabled,
    };
  });
  rec(
    "confirmation review: explicit boundary with locked metadata and an enabled confirm only because truth is valid",
    text.includes("Awaiting explicit confirmation") &&
      text.includes("not an import, upload, generation, review, approval") &&
      confirmState.disabled === false &&
      confirmState.sourceDisabled === true,
    confirmState,
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-confirmation-review");

  await page
    .getByRole("button", { name: "Confirm local candidate record" })
    .click();
  text = await panelText(page);
  const countsAfterConfirm = await countsText(page);
  rec(
    "confirmed: exact local-record disclaimer, review list grows, readiness and counts unchanged",
    text.includes(CONFIRMED_TRUTH) &&
      text.includes("No file was imported, uploaded, generated") &&
      text.includes("Local candidate records for this requirement (1)") &&
      countsAfterConfirm === countsBefore,
    { countsBefore, countsAfterConfirm, text: text.slice(-900) },
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-confirmed-local-record");

  // Duplicate: reopening and choosing the same fixture identity collides
  // deterministically; no second record is created.
  await page.getByRole("button", { name: "Close panel" }).click();
  await page
    .getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    })
    .click();
  await page
    .getByRole("button", { name: "Choose a declared demo candidate" })
    .click();
  await page.getByRole("button", { name: /Dot view sheet/ }).click();
  text = await panelText(page);
  rec(
    "duplicate: deterministic fixture identity collision, no second record",
    text.includes("deterministic fixture identity collision") &&
      text.includes("No second record was created") &&
      text.includes("Local candidate records for this requirement (1)"),
    { text: text.slice(-700) },
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-duplicate");

  // Wrong format: declared metadata, not sniffing.
  await page.getByRole("button", { name: "Start over" }).click();
  await page
    .getByRole("button", { name: "Choose a declared demo candidate" })
    .click();
  await page.getByRole("button", { name: /Dot notes export/ }).click();
  await page
    .getByLabel("Source (required)")
    .fill("My notes app");
  await page.getByLabel("License / rights (required)").fill("Mine");
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  text = await panelText(page);
  rec(
    "wrong format: declared demo metadata reason, not media sniffing, no candidate created",
    text.includes('"txt"') &&
      text.includes("not media sniffing") &&
      text.includes("No candidate was created") &&
      text.includes("Local candidate records for this requirement (1)"),
    { text: text.slice(-700) },
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-wrong-format");

  // Cancellation returns to the stable prior state with unchanged counts.
  await page.getByRole("button", { name: "Cancel import" }).click();
  text = await panelText(page);
  const countsAfterCancel = await countsText(page);
  rec(
    "cancellation: explicit cancelled state, prior readiness and counts unchanged",
    text.includes("Import cancelled") &&
      text.includes("readiness, and counts are unchanged") &&
      countsAfterCancel === countsBefore,
    { countsBefore, countsAfterCancel, text: text.slice(-400) },
  );
  await page
    .locator("[data-testid='pv1-request']")
    .scrollIntoViewIfNeeded();
  await shot(page, "wp3-1440x900-cancelled-unchanged");

  // Scope change closes the panel; no hidden candidate is retained.
  await page.getByRole("button", { name: "Close panel" }).click();
  await page
    .getByRole("button", {
      name: "Request image pack for Dot in Scene 3 · Berry Patch",
    })
    .click();
  await page
    .getByRole("button", { name: "Choose a declared demo candidate" })
    .click();
  await page.getByLabel("Scene filter").selectOption("scene-7");
  const rebound = await page.evaluate(() => ({
    panelOpen: document.querySelector("[data-testid='pv1-request']") !== null,
    scope:
      document.querySelector("[data-testid='pv1-requirements'] h2")
        ?.textContent ?? "",
  }));
  rec(
    "scope change: panel closes and never retains a candidate from another scope",
    rebound.panelOpen === false && rebound.scope === "Scene 7 · Sunflower Field",
    rebound,
  );

  // Truth boundaries: no credential fields and no real-file, generation,
  // upload, approval, or production-success claims anywhere in the workspace.
  const truth = await page.evaluate(() => {
    const workspace = document.querySelector("[data-testid='pv1-assets']");
    const text = workspace?.textContent ?? "";
    return {
      passwordFields:
        workspace?.querySelectorAll("input[type='password']").length ?? -1,
      fileInputs:
        workspace?.querySelectorAll("input[type='file']").length ?? -1,
      apiKey: /api\s*key|access\s*token|password/i.test(text),
      generated: text.includes("Image generated"),
      imported: text.includes("File imported"),
      uploaded: text.includes("Uploaded"),
      approved: text.includes("Approved"),
      productionReady: text.includes("Production ready"),
      clipboardClaim: text.includes("Copied to your clipboard"),
      openedSite: text.includes("Opened in your browser"),
    };
  });
  rec(
    "truth boundaries: no credential fields and no real-file, generation, upload, approval, or production-success claims",
    truth.passwordFields === 0 &&
      truth.fileInputs === 0 &&
      !truth.apiKey &&
      !truth.generated &&
      !truth.imported &&
      !truth.uploaded &&
      !truth.approved &&
      !truth.productionReady &&
      !truth.clipboardClaim &&
      !truth.openedSite,
    truth,
  );
  await assertNoOverflow(page, "final state");

  report.consoleIssues = consoleIssues;
  report.pageErrors = pageErrors;
  await context.close();
  await browser.close();

  const reportFile = path.join(OUT, "clickthrough-report.json");
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  const failed = report.checks.filter((check) => !check.pass);
  if (consoleIssues.length > 0)
    failed.push({ name: `console issues ${JSON.stringify(consoleIssues)}` });
  if (pageErrors.length > 0)
    failed.push({ name: `page errors ${JSON.stringify(pageErrors)}` });
  console.log(`report: ${reportFile}`);
  console.log(`report sha256: ${sha256File(reportFile)}`);
  if (failed.length > 0) {
    console.log(`FAILED CHECKS (${failed.length}):`);
    failed.forEach((failure) => console.log(` - ${failure.name}`));
    process.exit(1);
  }
  console.log(
    `ALL ${report.checks.length} CHECKS PASSED, zero console warnings/errors, zero page errors`,
  );
})().catch((error) => {
  console.error("EVIDENCE FAILED", error);
  process.exit(1);
});
