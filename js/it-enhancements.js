"use strict";
(() => {
  const search = document.getElementById("term-search");
  if (search) {
    const cards = Array.from(document.querySelectorAll(".term-card"));
    const status = document.getElementById("term-status");
    const empty = document.getElementById("no-terms");
    const filter = () => {
      const query = search.value.trim().toLocaleLowerCase("en-GB");
      let shown = 0;
      cards.forEach(card => {
        const matches = card.textContent.toLocaleLowerCase("en-GB").includes(query);
        card.hidden = !matches;
        if (matches) shown += 1;
      });
      status.textContent = query ? `${shown} of ${cards.length} terms match your search.` : `Showing all ${cards.length} terms. Select a term to read its meaning.`;
      empty.hidden = shown !== 0;
    };
    search.addEventListener("input", filter);
    search.addEventListener("search", filter);
    filter();
  }

  const skills = Array.from(document.querySelectorAll("[data-skill]"));
  if (!skills.length) return;
  const key = "shelleys-it-learning-v1";
  const note = document.getElementById("progress-note");
  const reset = document.getElementById("reset-progress");
  let saved = [];
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(data)) saved = data.filter(value => typeof value === "string");
  } catch (_) {
    note.textContent = "Tick each skill when you feel confident. Progress applies to this visit.";
  }
  const update = () => {
    const completed = skills.filter(input => input.checked);
    document.getElementById("progress-count").textContent = `${completed.length} of ${skills.length} complete`;
    const progress = document.getElementById("learning-progress");
    progress.value = completed.length;
    progress.textContent = `${completed.length} of ${skills.length}`;
    reset.disabled = completed.length === 0;
    skills.forEach(input => input.closest("label").classList.toggle("is-complete", input.checked));
    try {
      localStorage.setItem(key, JSON.stringify(completed.map(input => input.dataset.skill)));
    } catch (_) {
      note.textContent = "Tick each skill when you feel confident. Progress applies to this visit.";
    }
    window.dispatchEvent(new CustomEvent("it:progress-change", { detail: { skills: completed.map(input => input.dataset.skill) } }));
  };
  skills.forEach(input => {
    input.checked = saved.includes(input.dataset.skill);
    input.addEventListener("change", update);
  });
  reset.addEventListener("click", () => {
    skills.forEach(input => { input.checked = false; });
    update();
  });
  update();
})();

/* Filters, lesson review tracking and the topics knowledge check. */
(() => {
  document.querySelectorAll("[data-filter-area]").forEach(area => {
    const controls = area.querySelector("[data-filter-controls]");
    const input = area.querySelector("[data-item-search]");
    const buttons = Array.from(area.querySelectorAll("[data-filter-category]"));
    const items = Array.from(area.querySelectorAll("[data-filter-item]"));
    const status = area.querySelector("[data-filter-status]");
    let category = "all";
    const filter = () => {
      const query = input.value.trim().toLocaleLowerCase("en-GB");
      let shown = 0;
      items.forEach(item => {
        const matchesCategory = category === "all" || (category === "saved" ? item.dataset.saved === "true" : item.dataset.category === category);
        const matches = matchesCategory && item.textContent.toLocaleLowerCase("en-GB").includes(query);
        item.hidden = !matches;
        if (matches) shown += 1;
      });
      buttons.forEach(button => {
        const active = button.dataset.filterCategory === category;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      status.textContent = `${shown} of ${items.length} ${area.dataset.filterNoun} shown.` + (shown === 0 ? " Try a different search or clear the filters." : "");
    };
    controls.hidden = false;
    input.addEventListener("input", filter);
    input.addEventListener("search", filter);
    buttons.forEach(button => button.addEventListener("click", () => { category = button.dataset.filterCategory; filter(); }));
    area.querySelector("[data-filter-reset]").addEventListener("click", () => { category = "all"; input.value = ""; filter(); });
    // Links into a filtered page still reveal their destination.
    const revealHash = () => {
      const id = location.hash.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (target && area.contains(target)) { category = "all"; input.value = ""; filter(); }
    };
    window.addEventListener("hashchange", revealHash);
    filter();
    revealHash();
  });

  const reviews = Array.from(document.querySelectorAll("[data-review-lesson]"));
  if (reviews.length) {
    const key = "shelleys-it-reviewed-v1";
    const note = document.getElementById("review-note");
    const reset = document.getElementById("reset-reviews");
    let saved = [];
    try { const data = JSON.parse(localStorage.getItem(key) || "[]"); if (Array.isArray(data)) saved = data; } catch (_) { note.textContent = "Mark lessons after reviewing them. Progress applies to this visit."; }
    const reviewed = new Set(saved.filter(id => reviews.some(button => button.dataset.reviewLesson === id)));
    const update = () => {
      reviews.forEach(button => {
        const done = reviewed.has(button.dataset.reviewLesson);
        button.hidden = false;
        button.textContent = done ? "Reviewed ✓" : "Mark as reviewed";
        button.setAttribute("aria-pressed", String(done));
        button.classList.toggle("is-reviewed", done);
      });
      document.getElementById("review-total").textContent = `${reviewed.size} of ${reviews.length} lessons reviewed`;
      reset.disabled = reviewed.size === 0;
      try { localStorage.setItem(key, JSON.stringify(Array.from(reviewed))); } catch (_) { note.textContent = "Mark lessons after reviewing them. Progress applies to this visit."; }
      window.dispatchEvent(new CustomEvent("it:progress-change", { detail: { reviews: Array.from(reviewed) } }));
    };
    document.querySelector("[data-lesson-tracker]").hidden = false;
    reviews.forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.reviewLesson;
      reviewed.has(id) ? reviewed.delete(id) : reviewed.add(id);
      update();
    }));
    reset.addEventListener("click", () => { reviewed.clear(); update(); });
    update();
  }

  const quiz = document.getElementById("it-quiz");
  if (quiz) {
    const questions = Array.from(quiz.querySelectorAll(".quiz-question"));
    const result = document.getElementById("quiz-result");
    quiz.addEventListener("submit", event => {
      event.preventDefault();
      let correct = 0;
      const selections = questions.map(question => question.querySelector("input:checked"));
      result.hidden = false;
      if (selections.some(selection => !selection)) {
        result.className = "alert alert-warning mt-3 mb-0";
        result.textContent = "Choose an answer for each question, then try again.";
        return;
      }
      questions.forEach((question, index) => {
        const match = selections[index].value === question.dataset.answer;
        if (match) correct += 1;
        const feedback = question.querySelector(".quiz-feedback");
        feedback.hidden = false;
        feedback.className = `quiz-feedback small mb-0 mt-2 ${match ? "text-success" : "text-danger"}`;
        feedback.textContent = `${match ? "Correct. " : "Review this one. "}${question.dataset.explanation}`;
      });
      result.className = `alert ${correct === questions.length ? "alert-success" : "alert-info"} mt-3 mb-0`;
      result.textContent = `${correct} of ${questions.length} correct. ${correct === questions.length ? "You have understood the essentials!" : "Review the explanations and try again."}`;
      window.dispatchEvent(new CustomEvent("it:progress-change", { detail: { quizScore: correct } }));
    });
    quiz.addEventListener("reset", () => {
      result.hidden = true;
      questions.forEach(question => { const feedback = question.querySelector(".quiz-feedback"); feedback.hidden = true; feedback.textContent = ""; });
    });
  }
})();

/* Shared search and progress, resource bookmarks, practical tasks and IT help. */
(() => {
  const keys = {
    skills: "shelleys-it-learning-v1",
    reviews: "shelleys-it-reviewed-v1",
    saved: "shelleys-it-saved-resources-v1",
    quiz: "shelleys-it-best-quiz-v1"
  };
  const known = {
    skills: ["hardware", "software", "networks", "web"],
    reviews: ["hardware", "software", "networks"],
    saved: ["web", "basics", "science", "practice"]
  };
  let storageAvailable = true;
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch (_) { storageAvailable = false; return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { storageAvailable = false; }
  };
  const validList = (value, type) => Array.isArray(value) ? Array.from(new Set(value.filter(id => known[type].includes(id)))) : [];
  const validScore = value => Number.isInteger(value) && value >= 0 && value <= 3 ? value : null;
  let skills = validList(read(keys.skills, []), "skills");
  let reviews = validList(read(keys.reviews, []), "reviews");
  let saved = new Set(validList(read(keys.saved, []), "saved"));
  let bestScore = validScore(read(keys.quiz, null));

  const updateOverview = () => {
    const checklist = Array.from(document.querySelectorAll("[data-skill]"));
    if (checklist.length) skills = checklist.filter(input => input.checked).map(input => input.dataset.skill);
    document.querySelectorAll("[data-progress-skills]").forEach(output => { output.textContent = `${skills.length} / 4`; });
    document.querySelectorAll("[data-progress-reviews]").forEach(output => { output.textContent = `${reviews.length} / 3`; });
    document.querySelectorAll("[data-progress-saved]").forEach(output => { output.textContent = String(saved.size); });
    document.querySelectorAll("[data-progress-quiz]").forEach(output => { output.textContent = bestScore === null ? "Not tried" : `${bestScore} / 3`; });
    document.querySelectorAll("[data-progress-overview], [data-quiz-best]").forEach(panel => { panel.hidden = false; });
    const resume = document.getElementById("resume-learning");
    if (resume) {
      const next = known.reviews.find(id => !reviews.includes(id));
      if (next) { resume.href = `tutorials.html#${next}`; resume.textContent = reviews.length ? "Continue your next lesson" : "Start with a video"; }
      else if (bestScore !== 3) { resume.href = "topics.html#knowledge-check"; resume.textContent = "Try the knowledge check"; }
      else { resume.href = "index.html#learning-checklist"; resume.textContent = "Review your learning checklist"; }
    }
    if (!storageAvailable) {
      document.querySelectorAll("[data-progress-storage-note]").forEach(note => { note.textContent = "Progress applies to this visit because browser storage is unavailable."; });
    }
  };
  window.addEventListener("it:progress-change", event => {
    const detail = event.detail || {};
    if (detail.skills) skills = validList(detail.skills, "skills");
    if (detail.reviews) reviews = validList(detail.reviews, "reviews");
    if (validScore(detail.quizScore) !== null) {
      bestScore = Math.max(bestScore ?? 0, detail.quizScore);
      write(keys.quiz, bestScore);
    }
    updateOverview();
  });

  const bookmarks = Array.from(document.querySelectorAll("[data-bookmark]"));
  const updateBookmarks = () => {
    bookmarks.forEach(button => {
      const selected = saved.has(button.dataset.bookmark);
      const item = button.closest("[data-filter-item]");
      const title = item.querySelector("h2").textContent;
      button.hidden = false;
      button.textContent = selected ? "Saved ✓" : "Save resource";
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${selected ? "Remove" : "Save"} ${title}${selected ? " from saved resources" : ""}`);
      item.dataset.saved = String(selected);
    });
    const note = document.querySelector("[data-bookmark-note]");
    if (note) note.textContent = `${saved.size} of 4 resources saved. ${storageAvailable ? "Saved in this browser on this device." : "Saved resources apply to this visit."}`;
    updateOverview();
  };
  bookmarks.forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.bookmark;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    write(keys.saved, Array.from(saved));
    updateBookmarks();
    const area = button.closest("[data-filter-area]");
    area.querySelector("[data-item-search]").dispatchEvent(new Event("input"));
    document.getElementById("bookmark-status").textContent = `${saved.size} of 4 resources saved.`;
    if (button.closest("[data-filter-item]").hidden) area.querySelector('[data-filter-category="saved"]').focus();
  }));
  const revealSaved = () => {
    if (location.hash === "#saved-resources") document.querySelector('[data-filter-category="saved"]')?.click();
  };
  window.addEventListener("hashchange", revealSaved);
  window.addEventListener("storage", event => {
    if (event.key !== null && !Object.values(keys).includes(event.key)) return;
    skills = validList(read(keys.skills, []), "skills");
    reviews = validList(read(keys.reviews, []), "reviews");
    saved = new Set(validList(read(keys.saved, []), "saved"));
    bestScore = validScore(read(keys.quiz, null));
    updateBookmarks();
    document.querySelectorAll("[data-item-search]").forEach(input => input.dispatchEvent(new Event("input")));
  });
  updateBookmarks();
  revealSaved();

  const revealDestination = hash => {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, "")); } catch (_) { return; }
    const target = document.getElementById(id);
    if (target?.matches("details.term-card")) {
      const glossarySearch = document.getElementById("term-search");
      glossarySearch.value = "";
      glossarySearch.dispatchEvent(new Event("input"));
      target.open = true;
      target.scrollIntoView({ block: "center" });
    }
  };
  window.addEventListener("hashchange", () => revealDestination(location.hash));
  revealDestination(location.hash);

  const searchModal = document.getElementById("siteSearch");
  const searchInput = document.getElementById("site-search-input");
  const searchIndex = Array.isArray(window.IT_SEARCH_INDEX) ? window.IT_SEARCH_INDEX : [];
  if (searchModal && window.bootstrap && searchIndex.length) {
    const results = document.getElementById("site-search-results");
    const status = document.getElementById("site-search-status");
    const clear = document.getElementById("site-search-clear");
    const normalise = value => value.toLocaleLowerCase("en-GB");
    const render = () => {
      const query = normalise(searchInput.value.trim());
      const words = query.split(/\s+/).filter(Boolean);
      const matches = searchIndex.filter(entry => words.every(word => normalise(`${entry.title} ${entry.description} ${entry.keywords}`).includes(word)));
      if (query) matches.sort((a, b) => {
        const rank = entry => normalise(entry.title) === query ? 0 : normalise(entry.title).startsWith(query) ? 1 : 2;
        return rank(a) - rank(b);
      });
      results.replaceChildren();
      matches.slice(0, 8).forEach(entry => {
        const link = document.createElement("a");
        link.className = "list-group-item list-group-item-action";
        link.href = entry.href;
        const page = document.createElement("span");
        page.className = "search-page";
        page.textContent = entry.page;
        const title = document.createElement("strong");
        title.textContent = entry.title;
        const description = document.createElement("small");
        description.textContent = entry.description;
        link.append(page, title, description);
        link.addEventListener("click", event => {
          const [filename, fragment] = entry.href.split("#");
          let current = location.pathname.split("/").pop() || "index.html";
          if (!current.includes(".")) current += ".html";
          if (filename === current && fragment) {
            event.preventDefault();
            searchModal.addEventListener("hidden.bs.modal", () => {
              location.hash = fragment;
              revealDestination(`#${fragment}`);
              const target = document.getElementById(fragment);
              target?.scrollIntoView({ block: "center" });
            }, { once: true });
            bootstrap.Modal.getOrCreateInstance(searchModal).hide();
          }
        });
        results.append(link);
      });
      status.textContent = query ? `${matches.length} result${matches.length === 1 ? "" : "s"}${matches.length > 8 ? "; showing the first 8" : ""}.` : "Explore a page or enter a search term.";
      document.getElementById("site-search-empty").hidden = matches.length !== 0;
      clear.disabled = searchInput.value === "";
    };
    searchInput.addEventListener("input", render);
    searchInput.addEventListener("search", render);
    clear.addEventListener("click", () => { searchInput.value = ""; render(); searchInput.focus(); });
    searchModal.addEventListener("shown.bs.modal", () => searchInput.focus());
    document.querySelectorAll("[data-site-search-button]").forEach(button => { button.hidden = false; });
    document.addEventListener("keydown", event => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (event.target.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      if (document.querySelector(".modal.show, .offcanvas.show")) return;
      event.preventDefault();
      bootstrap.Modal.getOrCreateInstance(searchModal).show();
    });
    render();
  }

  const tasks = {
    hardware: { title: "Trace a computer’s input and output", prompt: "When you type your name and print it, what provides the input, what processes it, and what provides the output? Write one sentence for each stage.", example: "The keyboard sends the input. The CPU processes the instructions while RAM holds the active data. The printer produces the output on paper." },
    software: { title: "Separate hardware from software", prompt: "Choose two physical parts of a computer and two programs you use. Explain why each belongs to hardware or software.", example: "A keyboard and an SSD are hardware because they are physical components. A web browser and a word processor are software because they are programs that run on the computer." },
    networks: { title: "Explain two ways to connect", prompt: "Describe how a laptop connects to a router using Wi-Fi and how it could connect using Ethernet. What carries the data in each case?", example: "Wi-Fi carries data using radio waves between the laptop and a wireless access point. Ethernet uses a cable. A home router usually connects the local network to the internet." }
  };
  const taskModal = document.getElementById("lessonTask");
  if (taskModal && window.bootstrap) {
    document.querySelectorAll("[data-lesson-task]").forEach(button => { button.hidden = false; });
    taskModal.addEventListener("show.bs.modal", event => {
      const task = tasks[event.relatedTarget?.dataset.lessonTask];
      if (!task) return;
      document.getElementById("task-title").textContent = task.title;
      document.getElementById("task-prompt").textContent = task.prompt;
      document.getElementById("task-example").textContent = task.example;
      bootstrap.Collapse.getOrCreateInstance(document.getElementById("taskAnswer"), { toggle: false }).hide();
      document.getElementById("task-example-toggle").setAttribute("aria-expanded", "false");
    });
  }

  const checks = {
    slow: { title: "Check a slow computer", steps: ["Close applications and browser tabs you are no longer using.", "Open your system’s task manager or activity monitor to see which applications use the most CPU or memory.", "Save your work, then restart the computer and check whether the problem continues."], href: "equipment.html#components" },
    network: { title: "Check your connection", steps: ["Check that Wi-Fi is enabled, flight mode is off, or the Ethernet cable is connected.", "Check that you selected the intended network. Try another website to see whether only one site is unavailable.", "See whether another device can connect. If it can, disconnect and reconnect your own device to the network."], href: "topics.html#networks" },
    audio: { title: "Check your audio", steps: ["Check the device volume, the application volume and whether either is muted.", "Choose the intended speaker or headphones in your audio settings and check the cable or Bluetooth connection.", "Try another application or audio file to see whether the problem affects everything or just one source."], href: "equipment.html#peripherals" },
    display: { title: "Check your monitor", steps: ["Check that the monitor has power and is switched on.", "Check that the display cable is secure at both ends and the monitor is set to the matching input.", "If available, try another display cable or monitor to help identify which part is causing the problem."], href: "equipment.html#peripherals" }
  };
  const symptom = document.getElementById("it-symptom");
  if (symptom) {
    document.querySelector("[data-troubleshooter]").hidden = false;
    symptom.addEventListener("change", () => {
      const check = checks[symptom.value];
      const panel = document.getElementById("troubleshooting-result");
      panel.hidden = !check;
      const status = document.getElementById("troubleshooting-status");
      if (!check) { status.textContent = "Choose a problem to see its checklist."; return; }
      document.getElementById("troubleshooting-heading").textContent = check.title;
      const steps = document.getElementById("troubleshooting-steps");
      steps.replaceChildren();
      check.steps.forEach(text => { const item = document.createElement("li"); item.textContent = text; steps.append(item); });
      document.getElementById("troubleshooting-guide").href = check.href;
      status.textContent = `${check.title}: three checks shown below.`;
    });
  }
})();
