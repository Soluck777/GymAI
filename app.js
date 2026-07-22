"use strict";

const STORAGE_KEYS = {
  currentWorkout: "gymAiLogboek.currentWorkout.v1",
  history: "gymAiLogboek.history.v1"
};

const state = {
  currentWorkout: loadFromStorage(STORAGE_KEYS.currentWorkout, null),
  history: loadFromStorage(STORAGE_KEYS.history, [])
};

const examplePlan = {
  workoutName: "Push Day",
  date: new Date().toISOString().slice(0, 10),
  exercises: [
    { name: "Bench Press", plannedSets: 3, plannedRepetitions: 8, plannedWeight: 60 },
    { name: "Shoulder Press", plannedSets: 3, plannedRepetitions: 10, plannedWeight: 20 },
    { name: "Triceps Extension", plannedSets: 3, plannedRepetitions: 12, plannedWeight: 15 }
  ]
};

const elements = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  saveStatus: document.querySelector("#saveStatus"),
  planInput: document.querySelector("#planInput"),
  importMessage: document.querySelector("#importMessage"),
  workoutMessage: document.querySelector("#workoutMessage"),
  emptyWorkout: document.querySelector("#emptyWorkout"),
  workoutContent: document.querySelector("#workoutContent"),
  workoutTitle: document.querySelector("#workoutTitle"),
  workoutDate: document.querySelector("#workoutDate"),
  workoutNotes: document.querySelector("#workoutNotes"),
  exerciseList: document.querySelector("#exerciseList"),
  historyList: document.querySelector("#historyList")
};

function loadFromStorage(key, fallbackValue) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch (error) {
    console.error("Kon opgeslagen gegevens niet lezen:", error);
    return fallbackValue;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.currentWorkout, JSON.stringify(state.currentWorkout));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
    showSaveStatus("Opgeslagen");
  } catch (error) {
    console.error("Kon gegevens niet opslaan:", error);
    showSaveStatus("Opslaan mislukt", true);
  }
}

let saveStatusTimer;
function showSaveStatus(text, isError = false) {
  clearTimeout(saveStatusTimer);
  elements.saveStatus.textContent = text;
  elements.saveStatus.style.color = isError ? "#f87171" : "#9ca3af";
  saveStatusTimer = setTimeout(() => {
    elements.saveStatus.textContent = "Automatisch opslaan actief";
    elements.saveStatus.style.color = "#9ca3af";
  }, 1800);
}

function showMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function switchView(viewId) {
  elements.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validatePlan(plan) {
  if (!plan || typeof plan !== "object") throw new Error("Het plan is geen geldig object.");
  if (!String(plan.workoutName || "").trim()) throw new Error("workoutName ontbreekt.");
  if (!Array.isArray(plan.exercises) || plan.exercises.length === 0) throw new Error("exercises moet minimaal één oefening bevatten.");

  plan.exercises.forEach((exercise, index) => {
    if (!String(exercise.name || "").trim()) throw new Error(`Oefening ${index + 1} heeft geen naam.`);
    if (!Number.isInteger(Number(exercise.plannedSets)) || Number(exercise.plannedSets) < 1 || Number(exercise.plannedSets) > 20) {
      throw new Error(`plannedSets van ${exercise.name} moet tussen 1 en 20 zijn.`);
    }
  });
}

function createWorkoutFromPlan(plan) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    workoutName: String(plan.workoutName).trim(),
    date: plan.date || new Date().toISOString().slice(0, 10),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    notes: "",
    exercises: plan.exercises.map((exercise) => ({
      name: String(exercise.name).trim(),
      plannedSets: Number(exercise.plannedSets),
      plannedRepetitions: numberOrZero(exercise.plannedRepetitions),
      plannedWeight: numberOrZero(exercise.plannedWeight),
      difficulty: "normal",
      notes: "",
      completedSets: Array.from({ length: Number(exercise.plannedSets) }, () => ({
        repetitions: numberOrZero(exercise.plannedRepetitions),
        weight: numberOrZero(exercise.plannedWeight),
        completed: false
      }))
    }))
  };
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderWorkout() {
  const workout = state.currentWorkout;
  const hasWorkout = Boolean(workout);
  elements.emptyWorkout.classList.toggle("hidden", hasWorkout);
  elements.workoutContent.classList.toggle("hidden", !hasWorkout);

  if (!hasWorkout) return;

  elements.workoutTitle.textContent = workout.workoutName;
  elements.workoutDate.textContent = formatDate(workout.date);
  elements.workoutNotes.value = workout.notes || "";

  elements.exerciseList.innerHTML = workout.exercises.map((exercise, exerciseIndex) => {
    const allCompleted = exercise.completedSets.every((set) => set.completed);
    const plannedText = `${exercise.plannedSets} × ${exercise.plannedRepetitions || "-"} @ ${exercise.plannedWeight || "-"} kg`;

    return `
      <article class="exercise-card ${allCompleted ? "completed" : ""}" data-exercise-index="${exerciseIndex}">
        <header class="exercise-header">
          <h3>${escapeHtml(exercise.name)}</h3>
          <p class="muted">Gepland: ${escapeHtml(plannedText)}</p>
        </header>
        <div class="exercise-body">
          <table class="set-table">
            <thead>
              <tr><th>Set</th><th>Kg</th><th>Herhalingen</th><th>Klaar</th></tr>
            </thead>
            <tbody>
              ${exercise.completedSets.map((set, setIndex) => `
                <tr>
                  <td class="set-number">${setIndex + 1}</td>
                  <td><input type="number" min="0" step="0.5" inputmode="decimal" data-field="weight" data-set-index="${setIndex}" value="${set.weight}"></td>
                  <td><input type="number" min="0" step="1" inputmode="numeric" data-field="repetitions" data-set-index="${setIndex}" value="${set.repetitions}"></td>
                  <td><input type="checkbox" data-field="completed" data-set-index="${setIndex}" ${set.completed ? "checked" : ""} aria-label="Set ${setIndex + 1} afgerond"></td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="exercise-options">
            <label>Moeilijkheid
              <select data-exercise-field="difficulty">
                <option value="easy" ${exercise.difficulty === "easy" ? "selected" : ""}>Makkelijk</option>
                <option value="normal" ${exercise.difficulty === "normal" ? "selected" : ""}>Normaal</option>
                <option value="hard" ${exercise.difficulty === "hard" ? "selected" : ""}>Zwaar</option>
                <option value="failed" ${exercise.difficulty === "failed" ? "selected" : ""}>Niet gehaald</option>
              </select>
            </label>
            <label>Notitie
              <input type="text" data-exercise-field="notes" value="${escapeHtml(exercise.notes || "")}" placeholder="Bijvoorbeeld: techniek voelde goed">
            </label>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = '<p class="muted">Nog geen afgeronde trainingen.</p>';
    return;
  }

  elements.historyList.innerHTML = state.history.map((workout, index) => {
    const setCount = workout.exercises.reduce((total, exercise) => total + exercise.completedSets.filter((set) => set.completed).length, 0);
    return `
      <article class="history-item">
        <h3>${escapeHtml(workout.workoutName)}</h3>
        <p class="history-meta">${escapeHtml(formatDate(workout.date))} · ${setCount} afgeronde sets · ${workout.exercises.length} oefeningen</p>
        <div class="history-actions">
          <button class="button secondary" data-history-action="copy" data-history-index="${index}">Kopieer voor AI</button>
          <button class="button secondary" data-history-action="download" data-history-index="${index}">JSON</button>
          <button class="button danger ghost" data-history-action="delete" data-history-index="${index}">Verwijder</button>
        </div>
      </article>
    `;
  }).join("");
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(date.getTime()) ? dateString : new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(date);
}

function workoutToAiText(workout) {
  const lines = [
    `Training: ${workout.workoutName}`,
    `Datum: ${workout.date}`,
    ""
  ];

  workout.exercises.forEach((exercise) => {
    lines.push(exercise.name);
    lines.push(`Gepland: ${exercise.plannedSets} sets × ${exercise.plannedRepetitions || "-"} herhalingen @ ${exercise.plannedWeight || "-"} kg`);
    lines.push("Uitgevoerd:");
    exercise.completedSets.forEach((set, index) => {
      lines.push(`- Set ${index + 1}: ${set.repetitions} herhalingen @ ${set.weight} kg (${set.completed ? "afgerond" : "niet afgerond"})`);
    });
    lines.push(`Moeilijkheid: ${difficultyLabel(exercise.difficulty)}`);
    if (exercise.notes) lines.push(`Notitie: ${exercise.notes}`);
    lines.push("");
  });

  if (workout.notes) lines.push(`Algemene notitie: ${workout.notes}`);
  lines.push("", "Geef feedback op de uitvoering en stel waar passend het volgende trainingsgewicht of aantal herhalingen voor.");
  return lines.join("\n");
}

function difficultyLabel(value) {
  return ({ easy: "makkelijk", normal: "normaal", hard: "zwaar", failed: "niet gehaald" })[value] || value;
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text, messageElement = null) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Terugvaloptie voor lokaal openen via file:// of oudere browsers.
      const temporaryTextArea = document.createElement("textarea");
      temporaryTextArea.value = text;
      temporaryTextArea.style.position = "fixed";
      temporaryTextArea.style.opacity = "0";
      document.body.appendChild(temporaryTextArea);
      temporaryTextArea.select();
      const copied = document.execCommand("copy");
      temporaryTextArea.remove();
      if (!copied) throw new Error("De browser blokkeerde kopiëren.");
    }

    if (messageElement) {
      showMessage(messageElement, "Samenvatting gekopieerd. Je kunt deze nu in een AI-chat plakken.", "success");
    } else {
      alert("Samenvatting gekopieerd. Je kunt deze nu in een AI-chat plakken.");
    }
  } catch (error) {
    console.error(error);
    if (messageElement) {
      showMessage(messageElement, "Kopiëren lukte niet. Gebruik JSON downloaden als alternatief.", "error");
    } else {
      alert("Kopiëren lukte niet. Download de JSON als alternatief.");
    }
  }
}

function safeFilename(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "training";
}

// Navigatie
elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.go)));

// Importeren
document.querySelector("#loadExampleButton").addEventListener("click", () => {
  elements.planInput.value = JSON.stringify(examplePlan, null, 2);
  showMessage(elements.importMessage, "Voorbeeld geladen. Klik nu op ‘Plan importeren’.", "success");
});

document.querySelector("#importButton").addEventListener("click", () => {
  try {
    const plan = JSON.parse(elements.planInput.value);
    validatePlan(plan);
    state.currentWorkout = createWorkoutFromPlan(plan);
    saveState();
    renderWorkout();
    showMessage(elements.importMessage, "Plan geïmporteerd en opgeslagen.", "success");
    switchView("workoutView");
  } catch (error) {
    showMessage(elements.importMessage, `Importeren mislukt: ${error.message}`, "error");
  }
});

// Invoer tijdens de training
elements.exerciseList.addEventListener("input", (event) => {
  if (!state.currentWorkout) return;
  const card = event.target.closest("[data-exercise-index]");
  if (!card) return;
  const exercise = state.currentWorkout.exercises[Number(card.dataset.exerciseIndex)];

  if (event.target.dataset.exerciseField) {
    exercise[event.target.dataset.exerciseField] = event.target.value;
  } else if (event.target.dataset.field) {
    const set = exercise.completedSets[Number(event.target.dataset.setIndex)];
    set[event.target.dataset.field] = event.target.type === "checkbox" ? event.target.checked : numberOrZero(event.target.value);
  }

  saveState();
  if (event.target.type === "checkbox") renderWorkout();
});

elements.exerciseList.addEventListener("change", (event) => {
  event.target.dispatchEvent(new Event("input", { bubbles: true }));
});

elements.workoutNotes.addEventListener("input", () => {
  if (!state.currentWorkout) return;
  state.currentWorkout.notes = elements.workoutNotes.value;
  saveState();
});

document.querySelector("#resetWorkoutButton").addEventListener("click", () => {
  if (!state.currentWorkout || !confirm("Weet je zeker dat je de actieve training wilt wissen?")) return;
  state.currentWorkout = null;
  saveState();
  renderWorkout();
  switchView("importView");
});

document.querySelector("#exportJsonButton").addEventListener("click", () => {
  if (!state.currentWorkout) return;
  downloadJson(state.currentWorkout, `${safeFilename(state.currentWorkout.workoutName)}-${state.currentWorkout.date}.json`);
  showMessage(elements.workoutMessage, "JSON-bestand gedownload.", "success");
});

document.querySelector("#copyTextButton").addEventListener("click", () => {
  if (state.currentWorkout) copyText(workoutToAiText(state.currentWorkout));
});

document.querySelector("#finishWorkoutButton").addEventListener("click", () => {
  if (!state.currentWorkout) return;
  const completedSets = state.currentWorkout.exercises.reduce((count, exercise) => count + exercise.completedSets.filter((set) => set.completed).length, 0);
  if (completedSets === 0 && !confirm("Er zijn nog geen sets afgevinkt. Toch afronden?")) return;

  state.currentWorkout.finishedAt = new Date().toISOString();
  const finishedWorkout = typeof structuredClone === "function"
    ? structuredClone(state.currentWorkout)
    : JSON.parse(JSON.stringify(state.currentWorkout));
  state.history.unshift(finishedWorkout);
  state.currentWorkout = null;
  saveState();
  renderWorkout();
  renderHistory();
  switchView("historyView");
});

// Geschiedenis
elements.historyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-action]");
  if (!button) return;
  const index = Number(button.dataset.historyIndex);
  const workout = state.history[index];
  if (!workout) return;

  if (button.dataset.historyAction === "copy") {
    copyText(workoutToAiText(workout));
  }
  if (button.dataset.historyAction === "download") {
    downloadJson(workout, `${safeFilename(workout.workoutName)}-${workout.date}.json`);
  }
  if (button.dataset.historyAction === "delete" && confirm("Deze afgeronde training verwijderen?")) {
    state.history.splice(index, 1);
    saveState();
    renderHistory();
  }
});

document.querySelector("#exportHistoryButton").addEventListener("click", () => {
  if (!state.history.length) return alert("Er is nog geen geschiedenis om te exporteren.");
  downloadJson({ exportedAt: new Date().toISOString(), workouts: state.history }, "gym-ai-trainingsgeschiedenis.json");
});

// Offline ondersteuning via service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(console.error));
}

renderWorkout();
renderHistory();
showSaveStatus("Automatisch opslaan actief");
