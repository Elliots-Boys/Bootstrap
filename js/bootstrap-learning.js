"use strict";
/* Bootstrap learning components; the original site scripts remain intact. */
(() => {
  if (!window.bootstrap) return;
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const toastElement = document.getElementById("itFeedbackToast");
  const notice = message => {
    if (!toastElement) return;
    document.getElementById("it-toast-message").textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 3500 }).show();
  };

  const sectionNav = document.getElementById("sectionNav");
  if (sectionNav) {
    const createSpy = () => {
      const dockHeight = sectionNav.closest(".section-dock").offsetHeight;
      return bootstrap.ScrollSpy.getOrCreateInstance(document.body, {
        target: sectionNav,
        rootMargin: `-${dockHeight + 16}px 0px -${Math.max(0, innerHeight - dockHeight - 116)}px`,
        threshold: [0],
        smoothScroll: false
      });
    };
    let spy = createSpy();
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { spy.dispose(); spy = createSpy(); }, 150);
    });
    const markCurrent = () => sectionNav.querySelectorAll("a").forEach(link => {
      if (link.classList.contains("active")) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    document.body.addEventListener("activate.bs.scrollspy", markCurrent);
    document.addEventListener("shown.bs.tab", () => spy.refresh());
    document.addEventListener("shown.bs.collapse", () => spy.refresh());
    document.addEventListener("hidden.bs.collapse", () => spy.refresh());
    document.addEventListener("click", event => {
      if (event.target.closest("[data-filter-category], [data-filter-reset]")) requestAnimationFrame(() => spy.refresh());
    });
    document.addEventListener("input", event => {
      if (event.target.matches("[data-item-search]")) requestAnimationFrame(() => spy.refresh());
    });
    window.addEventListener("load", () => spy.refresh(), { once: true });
  }

  const tips = Array.from(document.querySelectorAll("[data-page-tip]"));
  const closeTips = () => tips.forEach(button => bootstrap.Popover.getInstance(button)?.hide());
  tips.forEach(button => {
    button.hidden = false;
    bootstrap.Popover.getOrCreateInstance(button, { trigger: "click", placement: "bottom", container: "body", html: false });
    button.addEventListener("shown.bs.popover", () => button.setAttribute("aria-expanded", "true"));
    button.addEventListener("hidden.bs.popover", () => button.setAttribute("aria-expanded", "false"));
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeTips(); });
  document.addEventListener("click", event => {
    if (!event.target.closest("[data-page-tip], .popover")) closeTips();
    const review = event.target.closest("[data-review-lesson]");
    if (review) notice(review.getAttribute("aria-pressed") === "true" ? "Lesson added to your reviewed list." : "Lesson removed from your reviewed list.");
    const bookmark = event.target.closest("[data-bookmark]");
    if (bookmark) {
      const visiting = document.querySelector("[data-bookmark-note]")?.textContent.includes("this visit");
      notice(bookmark.getAttribute("aria-pressed") === "true" ? `Resource saved${visiting ? " for this visit" : " on this device"}.` : "Resource removed from your saved list.");
    }
  });
  document.addEventListener("show.bs.modal", closeTips);
  document.addEventListener("show.bs.offcanvas", closeTips);
  document.addEventListener("change", event => {
    if (event.target.matches("[data-skill]")) {
      const visiting = document.getElementById("progress-note")?.textContent.includes("this visit");
      notice(`Learning checklist updated${visiting ? " for this visit" : " on this device"}.`);
    }
  });

  // Notes are kept separately for each of the three existing video lessons.
  const notebook = document.getElementById("lessonNotebook");
  if (notebook) {
    const key = "shelleys-it-notes-v1";
    const lessonNames = {
      hardware: "CPU, memory, input and output",
      software: "Hardware and software",
      networks: "Wires, cables and Wi-Fi"
    };
    const raw = read(key, {});
    const notes = Object.create(null);
    Object.keys(lessonNames).forEach(id => {
      if (raw && typeof raw[id] === "string") notes[id] = raw[id].slice(0, 1200);
    });
    const field = document.getElementById("lesson-note");
    const status = document.getElementById("note-status");
    const buttons = Array.from(document.querySelectorAll("[data-note-lesson]"));
    let current = null;
    let dirty = false;
    let timer;
    const updateButtons = () => buttons.forEach(button => {
      button.hidden = false;
      const hasNote = Boolean(notes[button.dataset.noteLesson]?.trim());
      button.textContent = hasNote ? "Your lesson notes" : "Lesson notes";
      button.classList.toggle("has-notes", hasNote);
    });
    const count = () => {
      document.getElementById("note-count").textContent = `${field.value.length} / 1200 characters`;
      document.getElementById("clear-lesson-note").disabled = !field.value;
    };
    const saveNote = announce => {
      clearTimeout(timer);
      if (!current) return;
      const text = field.value.slice(0, 1200);
      if (text) notes[current] = text;
      else delete notes[current];
      const persisted = write(key, notes);
      dirty = false;
      status.textContent = persisted ? "Notes saved in this browser on this device." : "Notes kept for this visit because browser storage is unavailable.";
      count();
      updateButtons();
      if (announce) notice(persisted ? "Your lesson notes are saved on this device." : "Your lesson notes are kept for this visit.");
    };
    notebook.addEventListener("show.bs.offcanvas", event => {
      const id = event.relatedTarget?.dataset.noteLesson;
      if (!Object.hasOwn(lessonNames, id)) return;
      if (dirty) saveNote(false);
      current = id;
      document.getElementById("notebook-lesson-title").textContent = lessonNames[id];
      field.value = notes[id] || "";
      dirty = false;
      status.textContent = "Notes save as you type, or use Save notes when you are ready.";
      count();
    });
    notebook.addEventListener("hide.bs.offcanvas", () => { if (dirty) saveNote(false); });
    field.addEventListener("input", () => {
      dirty = true;
      count();
      status.textContent = "Saving your notes…";
      clearTimeout(timer);
      timer = setTimeout(() => saveNote(false), 500);
    });
    document.getElementById("lesson-notes-form").addEventListener("submit", event => { event.preventDefault(); saveNote(true); });
    document.getElementById("clear-lesson-note").addEventListener("click", () => {
      field.value = "";
      dirty = true;
      saveNote(false);
      notice("This lesson note has been cleared.");
    });
    window.addEventListener("pagehide", () => { if (dirty) saveNote(false); });
    updateButtons();
  }

  // Bootstrap collapse handles individual cards; this control operates the group.
  const reveal = document.getElementById("reveal-revision");
  if (reveal) {
    const answers = Array.from(document.querySelectorAll(".revision-answer"));
    const updateReveal = () => {
      const allOpen = answers.every(answer => answer.classList.contains("show"));
      reveal.textContent = allOpen ? "Hide all answers" : "Reveal all answers";
      reveal.setAttribute("aria-expanded", String(allOpen));
    };
    reveal.hidden = false;
    answers.forEach(answer => {
      answer.addEventListener("shown.bs.collapse", updateReveal);
      answer.addEventListener("hidden.bs.collapse", updateReveal);
    });
    reveal.addEventListener("click", () => {
      const hide = answers.every(answer => answer.classList.contains("show"));
      answers.forEach(answer => bootstrap.Collapse.getOrCreateInstance(answer, { toggle: false })[hide ? "hide" : "show"]());
    });
  }

  const planner = document.querySelector("[data-study-planner]");
  if (planner) {
    const key = "shelleys-it-study-plan-v1";
    const form = document.getElementById("study-plan-form");
    const goal = document.getElementById("study-goal");
    const duration = document.getElementById("study-duration");
    const output = document.getElementById("study-plan-output");
    const status = document.getElementById("study-plan-status");
    const reset = document.getElementById("reset-study-plan");
    const routes = {
      hardware: { title: "Computer hardware", steps: [
        ["Read the component guide", "Explain what the CPU, RAM and storage each do.", "equipment.html#components"],
        ["Watch and try the hardware task", "Follow input, processing and output, then try the practical task.", "tutorials.html#hardware"],
        ["Check your understanding", "Answer the knowledge check and review any explanation you need.", "topics.html#knowledge-check"]
      ] },
      web: { title: "HTML and CSS", steps: [
        ["Read the web guide", "Compare the HTML, CSS and example output tabs.", "topics.html#coding"],
        ["Create a small page", "Build a page about one IT topic with a heading, paragraph and link.", "index.html#mini-projects"],
        ["Review your web skills", "Use the checklist when you can explain how HTML and CSS work together.", "index.html#learning-checklist"]
      ] },
      networks: { title: "Networks and connections", steps: [
        ["Read the networking guide", "Explain the difference between Wi-Fi, Ethernet and the internet.", "topics.html#networks"],
        ["Watch the connections lesson", "Try the practical task and write a short explanation in your lesson notes.", "tutorials.html#networks"],
        ["Try the troubleshooting helper", "Choose a connection problem and explain why each check could help.", "equipment.html#troubleshooting"]
      ] },
      science: { title: "Computer science basics", steps: [
        ["Find an introductory resource", "Use the CS50 resource card to choose an introductory lecture or exercise.", "resources.html#resource-science"],
        ["Review the computing foundations", "Watch a lesson and record one idea in your own words.", "tutorials.html#software"],
        ["Recall the essentials", "Try the revision cards before revealing their answers.", "topics.html#revision-cards"]
      ] }
    };
    let plan = null;
    let completed = new Set();
    const updateProgress = persist => {
      const count = completed.size;
      document.getElementById("study-plan-total").textContent = `${count} of 3 steps complete`;
      const progress = document.getElementById("study-plan-progress");
      progress.setAttribute("aria-valuenow", String(count));
      progress.querySelector(".progress-bar").style.width = `${count / 3 * 100}%`;
      output.querySelectorAll("[data-plan-step]").forEach(input => input.closest("li").classList.toggle("step-complete", input.checked));
      if (persist) {
        const saved = write(key, { ...plan, completed: Array.from(completed) });
        status.textContent = saved ? "Your plan and completed steps are saved on this device." : "Your plan applies to this visit because browser storage is unavailable.";
      }
    };
    const render = () => {
      const route = routes[plan.goal];
      output.hidden = false;
      reset.disabled = false;
      document.getElementById("study-plan-heading").textContent = `${plan.duration}-minute plan: ${route.title}`;
      const list = document.getElementById("study-plan-steps");
      list.replaceChildren();
      route.steps.forEach(([title, description, href], index) => {
        const item = document.createElement("li");
        item.className = "list-group-item study-step";
        const number = document.createElement("span");
        number.className = "study-step-number";
        number.textContent = String(index + 1).padStart(2, "0");
        number.setAttribute("aria-hidden", "true");
        const content = document.createElement("div");
        content.className = "flex-grow-1";
        const row = document.createElement("div");
        row.className = "form-check";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "form-check-input";
        input.id = `study-step-${index}`;
        input.dataset.planStep = String(index);
        input.checked = completed.has(index);
        const label = document.createElement("label");
        label.className = "form-check-label fw-semibold";
        label.htmlFor = input.id;
        label.textContent = title;
        row.append(input, label);
        const detail = document.createElement("p");
        detail.className = "small text-secondary my-2";
        detail.textContent = description;
        const link = document.createElement("a");
        link.href = href;
        link.className = "small fw-semibold";
        link.textContent = "Open this activity →";
        const timing = document.createElement("span");
        timing.className = "badge rounded-pill text-bg-light align-self-start";
        timing.textContent = `${plan.duration / 3} min`;
        content.append(row, detail, link);
        item.append(number, content, timing);
        list.append(item);
        input.addEventListener("change", () => {
          input.checked ? completed.add(index) : completed.delete(index);
          updateProgress(true);
        });
      });
      updateProgress(false);
    };
    form.addEventListener("submit", event => {
      event.preventDefault();
      form.classList.add("was-validated");
      if (!form.checkValidity() || !Object.hasOwn(routes, goal.value)) {
        goal.setAttribute("aria-invalid", "true");
        status.textContent = "Choose a learning focus to create your plan.";
        goal.focus();
        return;
      }
      goal.removeAttribute("aria-invalid");
      plan = { goal: goal.value, duration: Number(duration.value) === 30 ? 30 : 15 };
      completed = new Set();
      render();
      updateProgress(true);
      notice("Your study plan is ready. Tick each step after completing it.");
    });
    goal.addEventListener("change", () => { if (goal.value) goal.removeAttribute("aria-invalid"); });
    reset.addEventListener("click", () => {
      plan = null;
      completed.clear();
      write(key, null);
      form.reset();
      form.classList.remove("was-validated");
      goal.removeAttribute("aria-invalid");
      output.hidden = true;
      reset.disabled = true;
      status.textContent = "Your plan has been cleared. Choose a focus to start another session.";
      notice("Your study plan has been cleared.");
    });
    const saved = read(key, null);
    if (saved && Object.hasOwn(routes, saved.goal) && [15, 30].includes(saved.duration)) {
      plan = { goal: saved.goal, duration: saved.duration };
      completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(value => Number.isInteger(value) && value >= 0 && value < 3) : []);
      goal.value = plan.goal;
      duration.value = String(plan.duration);
      render();
      status.textContent = "Your saved study plan is ready to continue.";
    }
    planner.hidden = false;
  }

  const comparison = document.querySelector("[data-component-compare]");
  if (comparison) {
    const components = {
      cpu: { title: "CPU", purpose: "Carries out a wide range of instructions and calculations.", works: "Works with RAM and other components through the motherboard.", example: "Runs instructions for an application as you edit a document.", remember: "A processor does a different job from memory or file storage." },
      ram: { title: "RAM", purpose: "Temporarily holds data and programs that are in use.", works: "Gives the processor access to active data.", example: "Holds working data while your browser tabs and applications are open.", remember: "Working data is normally lost when power is switched off. Save files to storage." },
      ssd: { title: "SSD", purpose: "Keeps files, applications and the operating system in persistent storage.", works: "Provides stored data that can be loaded into RAM for use.", example: "Keeps your coursework file after you save it and shut down.", remember: "Storage capacity and RAM capacity describe different resources." },
      gpu: { title: "GPU", purpose: "Processes graphics and other tasks suited to many parallel calculations.", works: "Works with the CPU, memory and display system.", example: "Processes graphics for a game or a 3D scene.", remember: "Graphics may be integrated into a processor or provided by a separate card." }
    };
    const first = document.getElementById("compare-first");
    const second = document.getElementById("compare-second");
    const table = document.getElementById("component-comparison");
    const warning = document.getElementById("comparison-warning");
    const update = () => {
      const duplicate = first.value === second.value;
      warning.hidden = !duplicate;
      table.hidden = duplicate;
      second.classList.toggle("is-invalid", duplicate);
      if (duplicate) { second.setAttribute("aria-invalid", "true"); return; }
      second.removeAttribute("aria-invalid");
      const a = components[first.value];
      const b = components[second.value];
      if (!a || !b) return;
      document.getElementById("compare-first-title").textContent = a.title;
      document.getElementById("compare-second-title").textContent = b.title;
      const body = document.getElementById("component-comparison-body");
      body.replaceChildren();
      [["Main job", "purpose"], ["Works with", "works"], ["Everyday example", "example"], ["Keep in mind", "remember"]].forEach(([label, field]) => {
        const row = document.createElement("tr");
        const heading = document.createElement("th");
        heading.scope = "row";
        heading.textContent = label;
        const left = document.createElement("td");
        left.textContent = a[field];
        const right = document.createElement("td");
        right.textContent = b[field];
        row.append(heading, left, right);
        body.append(row);
      });
      document.getElementById("comparison-status").textContent = `Comparing ${a.title} and ${b.title}. Four rows of roles and examples are shown below.`;
    };
    first.addEventListener("change", update);
    second.addEventListener("change", update);
    comparison.hidden = false;
    update();
  }
})();
