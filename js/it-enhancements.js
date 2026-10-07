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
