// @ts-check
/*
 * PAY//AGENT site script.
 * - Mobile navigation toggle
 * - Home: replay of the SIMULATED terminal flow
 * - Playground: deterministic, in-browser policy simulation
 * Nothing here connects a wallet, requests a signature or sends a network request.
 */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /** @returns {boolean} */
  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, prefersReducedMotion() ? 0 : ms);
    });
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!(toggle instanceof HTMLButtonElement) || !nav) return;
    var navEl = nav;
    var btn = toggle;
    function close() {
      navEl.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }
    btn.addEventListener("click", function () {
      var open = navEl.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navEl.classList.contains("is-open")) {
        close();
        btn.focus();
      }
    });
  }

  /* ---------------- Home terminal replay ---------------- */
  function initReplay() {
    var button = document.querySelector("[data-replay]");
    if (!(button instanceof HTMLButtonElement)) return;
    var target = document.getElementById(button.getAttribute("data-replay") || "");
    if (!target) return;
    var pre = target;
    var btn = button;
    var lines = Array.prototype.slice.call(pre.querySelectorAll(".line"));
    var running = false;
    btn.addEventListener("click", async function () {
      if (running) return;
      running = true;
      btn.disabled = true;
      lines.forEach(function (/** @type {HTMLElement} */ l) {
        l.hidden = true;
      });
      for (var i = 0; i < lines.length; i++) {
        await wait(260);
        lines[i].hidden = false;
      }
      btn.disabled = false;
      running = false;
      btn.focus();
    });
  }

  /* ---------------- Playground ---------------- */

  /** @typedef {{ id: string, name: string, price: number, network: string, asset: string, payee: string }} Service */

  /** EXAMPLE services. Names, prices and payees are illustrative only. */
  /** @type {Record<string, Service>} */
  var SERVICES = {
    search: { id: "search", name: "Web search API", price: 0.002, network: "eip155:84532", asset: "USDC", payee: "payee:example-search" },
    inference: { id: "inference", name: "Image model inference", price: 0.04, network: "eip155:84532", asset: "USDC", payee: "payee:example-vision" },
    dataset: { id: "dataset", name: "Dataset slice export", price: 1.5, network: "eip155:84532", asset: "USDC", payee: "payee:example-data" }
  };

  var NETWORK_LABELS = /** @type {Record<string, string>} */ ({
    "eip155:84532": "Base Sepolia testnet (eip155:84532)",
    "eip155:8453": "Base (eip155:8453)",
    "eip155:1": "Ethereum (eip155:1)"
  });

  var STAGES = ["request", "challenge", "policy", "authorize", "retry", "result"];

  /**
   * @typedef {Object} Scenario
   * @property {string} service
   * @property {number} cap
   * @property {number} budget
   * @property {number} spent
   * @property {number} escalateAt
   * @property {number} maxAge
   * @property {string[]} networks
   * @property {boolean} payeeAllowlist
   * @property {number} quoteAge
   * @property {string} quotedNetwork
   * @property {boolean} injectedPayee
   * @property {boolean} replay
   */

  /** @type {Record<string, Partial<Scenario>>} */
  var PRESETS = {
    within: { service: "search", cap: 0.1, budget: 5, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "as-listed", injectedPayee: false, replay: false },
    cap: { service: "dataset", cap: 0.1, budget: 5, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "as-listed", injectedPayee: false, replay: false },
    budget: { service: "inference", cap: 0.1, budget: 5, spent: 4.98, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "as-listed", injectedPayee: false, replay: false },
    expired: { service: "search", cap: 0.1, budget: 5, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 95, quotedNetwork: "as-listed", injectedPayee: false, replay: false },
    network: { service: "search", cap: 0.1, budget: 5, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "eip155:1", injectedPayee: false, replay: false },
    injection: { service: "inference", cap: 0.1, budget: 5, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "as-listed", injectedPayee: true, replay: false },
    replay: { service: "search", cap: 0.1, budget: 5, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "as-listed", injectedPayee: false, replay: true },
    escalate: { service: "dataset", cap: 2, budget: 10, spent: 1.2, escalateAt: 1, maxAge: 60, networks: ["eip155:84532"], payeeAllowlist: true, quoteAge: 4, quotedNetwork: "as-listed", injectedPayee: false, replay: false }
  };

  /**
   * Amounts are compared in integer micro-units so 0.1 + 0.2 style float drift cannot flip a verdict.
   * @param {number} n
   */
  function micro(n) {
    return Math.round(n * 1e6);
  }

  /** @param {number} n */
  function money(n) {
    var s = n.toFixed(n < 0.01 && n !== 0 ? 3 : 2);
    return s + " USDC";
  }

  /**
   * @typedef {{ id: string, label: string, pass: boolean, code: string, detail: string }} CheckResult
   * @typedef {{ decision: "allow" | "deny" | "escalate", checks: CheckResult[], quote: { network: string, asset: string, payee: string, price: number, nonce: string } }} Evaluation
   * @typedef {{ scenario: Scenario, evaluation: Evaluation }} SimulationRun
   */

  /**
   * The deterministic policy engine. Same input, same output. No I/O.
   * @param {Scenario} sc
   * @param {Set<string>} usedNonces
   * @param {string} lastNonce
   * @returns {Evaluation}
   */
  function evaluate(sc, usedNonces, lastNonce) {
    var svc = SERVICES[sc.service] || SERVICES.search;
    var quote = {
      network: sc.quotedNetwork === "as-listed" ? svc.network : sc.quotedNetwork,
      asset: svc.asset,
      payee: sc.injectedPayee ? "payee:unlisted-injected" : svc.payee,
      price: svc.price,
      nonce: sc.replay && lastNonce ? lastNonce : "nonce-" + svc.id + "-" + (usedNonces.size + 1)
    };
    var allowedPayees = Object.keys(SERVICES).map(function (k) {
      return SERVICES[k].payee;
    });
    /** @type {CheckResult[]} */
    var checks = [
      {
        id: "network",
        label: "Network allowlist",
        pass: sc.networks.indexOf(quote.network) !== -1,
        code: "PA_NETWORK_NOT_ALLOWED",
        detail: "Challenge asks for " + (NETWORK_LABELS[quote.network] || quote.network) + "."
      },
      {
        id: "asset",
        label: "Asset allowlist",
        pass: quote.asset === "USDC",
        code: "PA_ASSET_NOT_ALLOWED",
        detail: "Challenge asks for " + quote.asset + "."
      },
      {
        id: "payee",
        label: "Payee allowlist",
        pass: !sc.payeeAllowlist || allowedPayees.indexOf(quote.payee) !== -1,
        code: "PA_PAYEE_NOT_ALLOWED",
        detail: sc.payeeAllowlist ? "Pay to " + quote.payee + "." : "Payee allowlist is off: any payee passes."
      },
      {
        id: "cap",
        label: "Per-request cap",
        pass: micro(quote.price) <= micro(sc.cap),
        code: "PA_OVER_REQUEST_CAP",
        detail: money(quote.price) + " against a cap of " + money(sc.cap) + "."
      },
      {
        id: "budget",
        label: "Rolling 24h budget",
        pass: micro(sc.spent) + micro(quote.price) <= micro(sc.budget),
        code: "PA_OVER_BUDGET",
        detail: money(sc.spent) + " spent + " + money(quote.price) + " against " + money(sc.budget) + "."
      },
      {
        id: "expiry",
        label: "Quote expiry",
        pass: sc.quoteAge <= sc.maxAge,
        code: "PA_QUOTE_EXPIRED",
        detail: "Quote is " + sc.quoteAge + "s old; limit " + sc.maxAge + "s."
      },
      {
        id: "replay",
        label: "Replay protection",
        pass: !usedNonces.has(quote.nonce),
        code: "PA_REPLAY_DETECTED",
        detail: usedNonces.has(quote.nonce) ? quote.nonce + " was already used." : quote.nonce + " is unused."
      }
    ];
    var failed = checks.some(function (c) {
      return !c.pass;
    });
    /** @type {"allow" | "deny" | "escalate"} */
    var decision = failed ? "deny" : micro(quote.price) >= micro(sc.escalateAt) ? "escalate" : "allow";
    return { decision: decision, checks: checks, quote: quote };
  }

  function initPlayground() {
    var form = document.getElementById("pg-form");
    if (!(form instanceof HTMLFormElement)) return;
    var formEl = form;
    var logEl = /** @type {HTMLElement} */ (document.getElementById("pg-log"));
    var outcomeEl = /** @type {HTMLElement} */ (document.getElementById("pg-outcome"));
    var checksEl = /** @type {HTMLElement} */ (document.getElementById("pg-checks"));
    var runBtn = /** @type {HTMLButtonElement} */ (document.getElementById("pg-run"));
    var stepBtn = /** @type {HTMLButtonElement} */ (document.getElementById("pg-step"));
    var resetBtn = /** @type {HTMLButtonElement} */ (document.getElementById("pg-reset"));
    var presetBtns = Array.prototype.slice.call(document.querySelectorAll("[data-preset]"));

    // Seed one already-used nonce so the replay scenario has something to replay on a first run.
    var SEED_NONCE = "nonce-previous-0001";
    /** @type {Set<string>} */
    var usedNonces = new Set([SEED_NONCE]);
    var lastNonce = SEED_NONCE;
    /** @type {SimulationRun | null} */
    var current = null;
    var stageIndex = -1;
    var busy = false;

    /** @param {string} name */
    function field(name) {
      var el = formEl.elements.namedItem(name);
      return /** @type {HTMLInputElement | HTMLSelectElement} */ (el);
    }

    /** @param {string} name */
    function num(name) {
      var v = parseFloat(field(name).value);
      return isFinite(v) && v >= 0 ? v : 0;
    }

    /** @returns {Scenario} */
    function read() {
      var nets = Array.prototype.slice
        .call(formEl.querySelectorAll('input[name="networks"]:checked'))
        .map(function (/** @type {HTMLInputElement} */ i) {
          return i.value;
        });
      return {
        service: field("service").value,
        cap: num("cap"),
        budget: num("budget"),
        spent: num("spent"),
        escalateAt: num("escalateAt"),
        maxAge: num("maxAge"),
        networks: nets,
        payeeAllowlist: /** @type {HTMLInputElement} */ (field("payeeAllowlist")).checked,
        quoteAge: num("quoteAge"),
        quotedNetwork: field("quotedNetwork").value,
        injectedPayee: /** @type {HTMLInputElement} */ (field("injectedPayee")).checked,
        replay: /** @type {HTMLInputElement} */ (field("replay")).checked
      };
    }

    /** @param {Partial<Scenario>} p */
    function apply(p) {
      Object.keys(p).forEach(function (k) {
        var v = /** @type {any} */ (p)[k];
        if (k === "networks") {
          formEl.querySelectorAll('input[name="networks"]').forEach(function (el) {
            var i = /** @type {HTMLInputElement} */ (el);
            i.checked = v.indexOf(i.value) !== -1;
          });
          return;
        }
        var el = field(k);
        if (!el) return;
        if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = !!v;
        else el.value = String(v);
      });
    }

    /**
     * @param {string} stage
     * @param {"idle" | "active" | "pass" | "fail" | "skip"} state
     * @param {string} text
     */
    function setStage(stage, state, text) {
      var el = document.querySelector('.stage[data-stage="' + stage + '"]');
      if (!el) return;
      el.setAttribute("data-state", state);
      var s = el.querySelector(".stage-state");
      if (s) s.textContent = text;
    }

    function clearStages() {
      STAGES.forEach(function (s) {
        setStage(s, "idle", "waiting");
      });
    }

    /**
     * @param {string} text
     * @param {string} [cls]
     */
    function log(text, cls) {
      var span = document.createElement("span");
      if (cls) span.className = cls;
      span.textContent = text + "\n";
      logEl.appendChild(span);
      logEl.scrollTop = logEl.scrollHeight;
    }

    /**
     * @param {"pass" | "fail" | "hold" | ""} result
     * @param {string} title
     * @param {string} body
     */
    function setOutcome(result, title, body) {
      outcomeEl.setAttribute("data-result", result);
      outcomeEl.innerHTML = "";
      var h = document.createElement("h3");
      h.textContent = title;
      var p = document.createElement("p");
      p.textContent = body;
      outcomeEl.appendChild(h);
      outcomeEl.appendChild(p);
    }

    /** @param {CheckResult[]} checks */
    function renderChecks(checks) {
      checksEl.innerHTML = "";
      checks.forEach(function (c) {
        var li = document.createElement("li");
        var v = document.createElement("span");
        v.className = "verdict " + (c.pass ? "pass" : "fail");
        v.textContent = c.pass ? "PASS" : "DENY";
        var t = document.createElement("span");
        t.innerHTML = "";
        var strong = document.createElement("strong");
        strong.textContent = c.label + ". ";
        t.appendChild(strong);
        t.appendChild(document.createTextNode(c.detail + (c.pass ? "" : " Code " + c.code + ".")));
        li.appendChild(v);
        li.appendChild(t);
        checksEl.appendChild(li);
      });
    }

    function begin() {
      var sc = read();
      current = { scenario: sc, evaluation: evaluate(sc, usedNonces, lastNonce) };
      stageIndex = -1;
      logEl.textContent = "";
      checksEl.innerHTML = "";
      clearStages();
      setOutcome("", "Running", "Simulation in progress. Nothing leaves this page.");
      log("# SIMULATED run. No wallet, no signature, no funds.", "t-dim");
    }

    /** Advance one stage. Returns false when the run is finished. */
    function advance() {
      if (!current) begin();
      var run = /** @type {SimulationRun} */ (current);
      var ev = run.evaluation;
      var sc = run.scenario;
      var svc = SERVICES[sc.service] || SERVICES.search;
      stageIndex++;
      var stage = STAGES[stageIndex];
      if (!stage) return false;

      if (stage === "request") {
        setStage("request", "pass", "sent");
        log("$ agent fetch GET /v1/" + svc.id + "   (EXAMPLE service: " + svc.name + ")");
        return true;
      }
      if (stage === "challenge") {
        setStage("challenge", "pass", "402 received");
        log("< HTTP/1.1 402 Payment Required", "t-warn");
        log("  scheme=exact  network=" + ev.quote.network + "  asset=" + ev.quote.asset);
        log("  amount=" + money(ev.quote.price) + "  payTo=" + ev.quote.payee);
        log("  quote age=" + sc.quoteAge + "s  nonce=" + ev.quote.nonce, "t-dim");
        return true;
      }
      if (stage === "policy") {
        renderChecks(ev.checks);
        ev.checks.forEach(function (c) {
          log("  policy." + c.id + " " + (c.pass ? "PASS" : "DENY " + c.code), c.pass ? "t-ok" : "t-bad");
        });
        if (ev.decision === "deny") {
          setStage("policy", "fail", "denied");
          return true;
        }
        if (ev.decision === "escalate") {
          setStage("policy", "pass", "needs approval");
          log("  policy.escalation HOLD " + money(ev.quote.price) + " is at or above " + money(sc.escalateAt), "t-warn");
          return true;
        }
        setStage("policy", "pass", "allowed");
        return true;
      }
      if (stage === "authorize") {
        if (ev.decision === "deny") {
          setStage("authorize", "skip", "not attempted");
          log("  authorization skipped: policy denied", "t-dim");
          return true;
        }
        if (ev.decision === "escalate") {
          setStage("authorize", "skip", "held for human");
          log("  authorization held: code PA_ESCALATION_REQUIRED", "t-warn");
          return true;
        }
        setStage("authorize", "pass", "simulated");
        log("  authorization created (SIMULATED, nothing signed)", "t-ok");
        return true;
      }
      if (stage === "retry") {
        if (ev.decision !== "allow") {
          setStage("retry", "skip", "not sent");
          return true;
        }
        setStage("retry", "pass", "sent");
        log("$ agent retry GET /v1/" + svc.id + "  + payment header (SIMULATED)");
        return true;
      }
      if (stage === "result") {
        finish(ev, sc);
        return true;
      }
      return false;
    }

    /**
     * @param {Evaluation} ev
     * @param {Scenario} sc
     */
    function finish(ev, sc) {
      if (ev.decision === "allow") {
        setStage("result", "pass", "200 OK");
        usedNonces.add(ev.quote.nonce);
        lastNonce = ev.quote.nonce;
        var newSpent = (micro(sc.spent) + micro(ev.quote.price)) / 1e6;
        field("spent").value = String(newSpent);
        log("< HTTP/1.1 200 OK", "t-ok");
        log('  receipt { "status": "SIMULATED", "amount": "' + ev.quote.price + '", "nonce": "' + ev.quote.nonce + '" }', "t-dim");
        setOutcome(
          "pass",
          "Allowed and recorded (SIMULATED)",
          "Every check passed, so the simulated agent paid " + money(ev.quote.price) + " and got its result. Spent in window is now " + money(newSpent) + ". Run again to watch the budget fill, or turn on the replay option to reuse this nonce."
        );
      } else if (ev.decision === "escalate") {
        setStage("result", "skip", "awaiting human");
        log("  result: no payment. A human approver decides.", "t-warn");
        setOutcome(
          "hold",
          "Held for approval",
          "Policy passed, but " + money(ev.quote.price) + " is at or above the approval threshold of " + money(sc.escalateAt) + ". A real deployment would notify an approver and wait. The simulation stops here and no payment happens."
        );
      } else {
        setStage("result", "fail", "blocked");
        var failed = ev.checks.filter(function (c) {
          return !c.pass;
        });
        log("  result: blocked before any payment. " + failed.map(function (c) { return c.code; }).join(", "), "t-bad");
        setOutcome(
          "fail",
          "Blocked before payment",
          "Failed: " + failed.map(function (c) { return c.label + " (" + c.code + ")"; }).join("; ") + ". The agent receives an error it can report, and no authorization was created."
        );
      }
      log("# end of SIMULATED run", "t-dim");
      current = null;
      stageIndex = -1;
    }

    function setBusy(/** @type {boolean} */ b) {
      busy = b;
      formEl.querySelectorAll("input, select, button").forEach(function (el) {
        /** @type {HTMLInputElement | HTMLSelectElement | HTMLButtonElement} */ (el).disabled = b;
      });
    }

    runBtn.addEventListener("click", async function () {
      if (busy) return;
      setBusy(true);
      if (!current) begin();
      while (current) {
        var s = STAGES[stageIndex + 1];
        if (s) setStage(s, "active", "running");
        await wait(380);
        advance();
      }
      setBusy(false);
    });

    stepBtn.addEventListener("click", function () {
      if (busy) return;
      advance();
    });

    resetBtn.addEventListener("click", function () {
      if (busy) return;
      usedNonces.clear();
      usedNonces.add(SEED_NONCE);
      lastNonce = SEED_NONCE;
      current = null;
      stageIndex = -1;
      apply(PRESETS.within);
      markPreset("within");
      clearStages();
      logEl.textContent = "# SIMULATED. Choose a scenario, then run it.\n";
      checksEl.innerHTML = "";
      setOutcome("", "Ready", "Pick a scenario or edit the policy, then run the simulation.");
    });

    /** @param {string} name */
    function markPreset(name) {
      presetBtns.forEach(function (/** @type {HTMLElement} */ b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-preset") === name ? "true" : "false");
      });
    }

    presetBtns.forEach(function (/** @type {HTMLElement} */ b) {
      b.addEventListener("click", function () {
        if (busy) return;
        var name = b.getAttribute("data-preset") || "within";
        apply(PRESETS[name]);
        markPreset(name);
        current = null;
        stageIndex = -1;
        clearStages();
        setOutcome("", "Scenario loaded", "Run the simulation or step through it one stage at a time.");
      });
    });

    // Any manual edit invalidates a half-finished run.
    formEl.addEventListener("input", function () {
      if (busy) return;
      markPreset("");
      if (current) {
        current = null;
        stageIndex = -1;
        clearStages();
        setOutcome("", "Policy changed", "The partial run was discarded. Run again to apply the new settings.");
      }
    });

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      runBtn.click();
    });
  }

  // Expose the pure engine for scripts/check.mjs and the browser console. It has no side effects.
  /** @type {any} */ (window).PayAgentSim = { evaluate: evaluate, SERVICES: SERVICES, PRESETS: PRESETS };

  initNav();
  initReplay();
  initPlayground();
})();
