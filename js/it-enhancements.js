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
        const matches = (category === "all" || item.dataset.category === category) && item.textContent.toLocaleLowerCase("en-GB").includes(query);
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
    });
    quiz.addEventListener("reset", () => {
      result.hidden = true;
      questions.forEach(question => { const feedback = question.querySelector(".quiz-feedback"); feedback.hidden = true; feedback.textContent = ""; });
    });
  }
})();
