"use strict";

const STORAGE_KEYS = {
  currentWorkout: "gymAiLogboek.currentWorkout.v1",
  history: "gymAiLogboek.history.v1"
};

const LEVEL_RANK = { beginner: 0, gemiddeld: 1, gevorderd: 2 };
const TRACKING_TYPES = new Set(["strength", "cardio"]);

function strengthExercise(id, name, category, locations, minimumLevel, defaultSets, defaultRepetitions, defaultWeight = 0, progressionGroup = "", progressionLevel = "") {
  return {
    id,
    name,
    trackingType: "strength",
    category,
    locations,
    minimumLevel,
    defaultSets,
    defaultRepetitions,
    defaultWeight,
    defaultMinutes: 0,
    ...(progressionGroup ? { progressionGroup, progressionLevel } : {})
  };
}

function cardioExercise(id, name, locations, minimumLevel = "beginner", defaultSets = 1, defaultMinutes = 15) {
  return {
    id,
    name,
    trackingType: "cardio",
    category: "cardio",
    locations,
    minimumLevel,
    defaultSets,
    defaultRepetitions: 0,
    defaultWeight: 0,
    defaultMinutes
  };
}

// Alle oefeningen staan op één plek. De generator, zoekfunctie en standaardwaarden
// lezen uit deze database, zodat oefeningseigenschappen niet op meerdere plekken uiteenlopen.
const EXERCISE_DATABASE = [
  strengthExercise("bodyweight-squat", "Bodyweight Squat", "legs", ["beide"], "beginner", 3, 12),
  strengthExercise("goblet-squat", "Goblet Squat", "fullBody", ["thuis", "sportschool"], "beginner", 3, 10),
  strengthExercise("back-squat", "Back Squat", "legs", ["sportschool"], "gemiddeld", 3, 8),
  strengthExercise("glute-bridge", "Glute Bridge", "legs", ["beide"], "beginner", 3, 14),
  strengthExercise("hip-thrust", "Hip Thrust", "legs", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("reverse-lunge", "Reverse Lunge (per been)", "legs", ["beide"], "beginner", 3, 10),
  strengthExercise("walking-lunge", "Walking Lunge (per been)", "legs", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("lateral-lunge", "Lateral Lunge (per been)", "legs", ["beide"], "beginner", 3, 10),
  strengthExercise("bulgarian-split-squat", "Bulgarian Split Squat (per been)", "legs", ["beide"], "gemiddeld", 3, 8),
  strengthExercise("single-leg-rdl", "Single-leg Romanian Deadlift", "legs", ["beide"], "gemiddeld", 3, 10),
  strengthExercise("romanian-deadlift", "Romanian Deadlift", "fullBody", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("leg-press", "Leg Press", "legs", ["sportschool"], "beginner", 3, 10),
  strengthExercise("leg-curl", "Leg Curl", "legs", ["sportschool"], "beginner", 3, 12),
  strengthExercise("leg-extension", "Leg Extension", "legs", ["sportschool"], "beginner", 3, 12),
  strengthExercise("calf-raise", "Calf Raise", "legs", ["beide"], "beginner", 3, 16),
  strengthExercise("standing-calf-raise", "Standing Calf Raise", "legs", ["sportschool"], "beginner", 3, 14),
  strengthExercise("wall-sit", "Wall Sit", "legs", ["beide"], "beginner", 3, 12),

  strengthExercise("incline-push-up", "Incline Push-up", "push", ["beide"], "beginner", 3, 12, 0, "push-up", "beginner"),
  strengthExercise("knee-push-up", "Knee Push-up", "push", ["beide"], "beginner", 3, 12, 0, "push-up", "beginner"),
  strengthExercise("push-up", "Push-up", "push", ["beide"], "gemiddeld", 3, 10, 0, "push-up", "gemiddeld"),
  strengthExercise("diamond-push-up", "Diamond Push-up", "push", ["beide"], "gevorderd", 4, 8, 0, "push-up", "gevorderd"),
  strengthExercise("decline-push-up", "Decline Push-up", "push", ["beide"], "gevorderd", 4, 8, 0, "push-up", "gevorderd"),
  strengthExercise("pike-push-up", "Pike Push-up", "push", ["beide"], "gemiddeld", 3, 8),
  strengthExercise("bench-dip", "Bench Dip", "push", ["beide"], "beginner", 3, 10),
  strengthExercise("bench-press", "Bench Press", "push", ["sportschool"], "gemiddeld", 3, 8),
  strengthExercise("chest-press", "Chest Press", "push", ["sportschool"], "beginner", 3, 10),
  strengthExercise("dumbbell-shoulder-press", "Dumbbell Shoulder Press", "push", ["sportschool"], "beginner", 3, 10),
  strengthExercise("incline-dumbbell-press", "Incline Dumbbell Press", "push", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("cable-chest-fly", "Cable Chest Fly", "push", ["sportschool"], "beginner", 3, 12),
  strengthExercise("lateral-raise", "Lateral Raise", "push", ["sportschool"], "beginner", 3, 12),
  strengthExercise("triceps-pushdown", "Triceps Pushdown", "push", ["sportschool"], "beginner", 3, 12),
  strengthExercise("overhead-triceps-extension", "Overhead Triceps Extension", "push", ["sportschool"], "beginner", 3, 12),
  strengthExercise("shoulder-tap", "Shoulder Tap (per kant)", "core", ["beide"], "beginner", 3, 12),
  strengthExercise("plank-up-down", "Plank Up-down", "core", ["beide"], "gemiddeld", 3, 10),

  strengthExercise("assisted-pull-up", "Assisted Pull-up", "calisthenics", ["sportschool"], "beginner", 3, 8, 0, "pull-up", "beginner"),
  strengthExercise("pull-up", "Pull-up", "calisthenics", ["beide"], "gevorderd", 4, 8, 0, "pull-up", "gevorderd"),
  strengthExercise("assisted-dip", "Assisted Dip", "calisthenics", ["sportschool"], "beginner", 3, 8, 0, "dip", "beginner"),
  strengthExercise("dip", "Dip", "calisthenics", ["beide"], "gevorderd", 4, 8, 0, "dip", "gevorderd"),
  strengthExercise("lat-pulldown", "Lat Pulldown", "pull", ["sportschool"], "beginner", 3, 10),
  strengthExercise("seated-row", "Seated Row", "pull", ["sportschool"], "beginner", 3, 10),
  strengthExercise("seated-cable-row", "Seated Cable Row", "pull", ["sportschool"], "beginner", 3, 10),
  strengthExercise("one-arm-dumbbell-row", "One-arm Dumbbell Row", "pull", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("backpack-row", "Rugzak Row (per arm)", "pull", ["thuis"], "beginner", 3, 12),
  strengthExercise("superman-pull", "Superman Pull", "pull", ["thuis"], "beginner", 3, 12),
  strengthExercise("reverse-snow-angel", "Reverse Snow Angel", "pull", ["thuis"], "beginner", 3, 12),
  strengthExercise("prone-y-raise", "Prone Y Raise", "pull", ["thuis"], "beginner", 3, 10),
  strengthExercise("bird-dog", "Bird Dog (per kant)", "core", ["beide"], "beginner", 3, 10),
  strengthExercise("towel-biceps-curl", "Handdoek Biceps Curl", "pull", ["thuis"], "beginner", 3, 12),
  strengthExercise("face-pull", "Face Pull", "pull", ["sportschool"], "beginner", 3, 12),
  strengthExercise("rear-delt-fly", "Rear Delt Fly", "pull", ["sportschool"], "beginner", 3, 12),
  strengthExercise("dumbbell-curl", "Dumbbell Curl", "pull", ["sportschool"], "beginner", 3, 12),
  strengthExercise("hammer-curl", "Hammer Curl", "pull", ["sportschool"], "beginner", 3, 10),
  strengthExercise("straight-arm-pulldown", "Straight-arm Pulldown", "pull", ["sportschool"], "gemiddeld", 3, 12),

  strengthExercise("box-squat", "Box Squat", "legs", ["beide"], "beginner", 3, 10, 0, "pistol-squat", "beginner"),
  strengthExercise("assisted-squat", "Assisted Squat", "legs", ["beide"], "beginner", 3, 10, 0, "pistol-squat", "beginner"),
  strengthExercise("pistol-squat-bench", "Pistol Squat naar bank (per been)", "calisthenics", ["beide"], "gemiddeld", 3, 8, 0, "pistol-squat", "gemiddeld"),
  strengthExercise("pistol-squat", "Pistol Squat (per been)", "calisthenics", ["beide"], "gevorderd", 4, 6, 0, "pistol-squat", "gevorderd"),
  strengthExercise("hanging-knee-raise", "Hanging Knee Raise", "core", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("inverted-row", "Inverted Row", "calisthenics", ["sportschool"], "gemiddeld", 3, 10),
  strengthExercise("scapular-pull-up", "Scapular Pull-up", "calisthenics", ["beide"], "gemiddeld", 3, 10),
  strengthExercise("l-sit-knee-tuck", "L-sit Knee Tuck", "core", ["beide"], "gemiddeld", 3, 10),
  strengthExercise("hollow-body-crunch", "Hollow Body Crunch", "core", ["beide"], "beginner", 3, 12),
  strengthExercise("bear-crawl", "Bear Crawl (passen)", "calisthenics", ["beide"], "beginner", 3, 16),
  strengthExercise("mountain-climber", "Mountain Climber (per kant)", "cardio", ["beide"], "beginner", 3, 16),
  strengthExercise("dead-bug", "Dead Bug (per kant)", "core", ["beide"], "beginner", 3, 10),
  strengthExercise("superman", "Superman", "fullBody", ["thuis"], "beginner", 3, 12),
  strengthExercise("cable-pallof-press", "Cable Pallof Press (per kant)", "core", ["sportschool"], "beginner", 3, 10),

  cardioExercise("treadmill", "Loopband", ["sportschool"]),
  cardioExercise("exercise-bike", "Hometrainer", ["beide"]),
  cardioExercise("rowing-machine", "Roeimachine", ["sportschool"]),
  cardioExercise("cross-trainer", "Crosstrainer", ["sportschool"]),
  cardioExercise("stairmaster", "Stairmaster", ["sportschool"], "gemiddeld", 1, 10),
  cardioExercise("walking", "Wandelen", ["beide"]),
  cardioExercise("running", "Hardlopen", ["beide"], "gemiddeld"),
  cardioExercise("cycling", "Fietsen", ["beide"])
];

const EXERCISE_BY_ID = new Map(EXERCISE_DATABASE.map((exercise) => [exercise.id, exercise]));

const GENERATOR_BLUEPRINTS = {
  fullBody: {
    thuis: ["bodyweight-squat", "@push-up", "glute-bridge", "reverse-lunge", "superman", "dead-bug", "pike-push-up", "mountain-climber"],
    sportschool: ["goblet-squat", "chest-press", "lat-pulldown", "romanian-deadlift", "seated-row", "dumbbell-shoulder-press", "leg-curl", "cable-pallof-press"]
  },
  push: {
    thuis: ["@push-up", "pike-push-up", "bench-dip", "shoulder-tap", "plank-up-down", "incline-push-up", "knee-push-up", "diamond-push-up"],
    sportschool: ["bench-press", "dumbbell-shoulder-press", "incline-dumbbell-press", "cable-chest-fly", "lateral-raise", "triceps-pushdown", "chest-press", "overhead-triceps-extension"]
  },
  pull: {
    thuis: ["backpack-row", "superman-pull", "reverse-snow-angel", "prone-y-raise", "bird-dog", "towel-biceps-curl", "superman", "scapular-pull-up"],
    sportschool: ["lat-pulldown", "seated-cable-row", "one-arm-dumbbell-row", "face-pull", "rear-delt-fly", "dumbbell-curl", "straight-arm-pulldown", "hammer-curl"]
  },
  benen: {
    thuis: ["bodyweight-squat", "reverse-lunge", "glute-bridge", "bulgarian-split-squat", "single-leg-rdl", "calf-raise", "wall-sit", "lateral-lunge"],
    sportschool: ["back-squat", "romanian-deadlift", "leg-press", "walking-lunge", "leg-curl", "leg-extension", "standing-calf-raise", "hip-thrust"]
  },
  calisthenics: {
    thuis: ["@push-up", "bodyweight-squat", "@pistol-squat", "pike-push-up", "hollow-body-crunch", "bear-crawl", "glute-bridge", "mountain-climber"],
    sportschool: ["@pull-up", "@dip", "@push-up", "hanging-knee-raise", "inverted-row", "@pistol-squat", "scapular-pull-up", "l-sit-knee-tuck"]
  },
  cardio: {
    thuis: ["walking", "exercise-bike", "cycling", "running"],
    sportschool: ["treadmill", "exercise-bike", "rowing-machine", "cross-trainer", "stairmaster"]
  }
};

const GENERATOR_OPTION_LABELS = {
  level: { beginner: "Beginner", gemiddeld: "Gemiddeld", gevorderd: "Gevorderd" },
  location: { thuis: "Thuis", sportschool: "Sportschool" },
  trainingType: { fullBody: "Full body", push: "Push", pull: "Pull", benen: "Benen", calisthenics: "Calisthenics", cardio: "Cardio" },
  duration: { 20: "20 minuten", 30: "30 minuten", 45: "45 minuten", 60: "60 minuten" }
};

// Vrije tekst wordt per categorie herkend. Meerdere treffers binnen één categorie
// worden als conflict gemeld, zodat de generator niet stilzwijgend een keuze gokt.
const GENERATOR_PATTERNS = {
  level: [
    { value: "beginner", pattern: /\b(?:beginner|beginnend(?:e)?|starter|novice)\b/i },
    { value: "gemiddeld", pattern: /\b(?:gemiddeld(?:e)?|intermediate)\b/i },
    { value: "gevorderd", pattern: /\b(?:gevorderd(?:e)?|advanced|ervaren)\b/i }
  ],
  location: [
    { value: "thuis", pattern: /\b(?:thuis|home)\b/i },
    { value: "sportschool", pattern: /\b(?:sportschool|gym|fitnesscentrum|fitness)\b/i }
  ],
  trainingType: [
    { value: "fullBody", pattern: /\b(?:full[\s-]*body|fullbody|hele\s+lichaam)\b/i },
    { value: "push", pattern: /\bpush(?![\s-]*up\b)(?:\s+day|training)?\b/i },
    { value: "pull", pattern: /\bpull(?![\s-]*up\b)(?:\s+day|training)?\b/i },
    { value: "benen", pattern: /\b(?:benen(?:training)?|leg\s*day|legs|lower[\s-]*body)\b/i },
    { value: "calisthenics", pattern: /\b(?:calisthenics|bodyweight|lichaamsgewicht)\b/i },
    { value: "cardio", pattern: /\b(?:cardio|conditie|duurtraining)\b/i }
  ],
  duration: [
    { value: "20", pattern: /\b20\s*(?:min(?:uut|uten)?|m)\b/i },
    { value: "30", pattern: /\b(?:30\s*(?:min(?:uut|uten)?|m)|half\s+uur)\b/i },
    { value: "45", pattern: /\b45\s*(?:min(?:uut|uten)?|m)\b/i },
    { value: "60", pattern: /\b(?:60\s*(?:min(?:uut|uten)?|m)|(?:een|1)\s+uur)\b/i }
  ]
};

const GENERATOR_REPLACEMENT_PATTERNS = {
  level: /\b(?:beginner|beginnend(?:e)?|starter|novice|gemiddeld(?:e)?|intermediate|gevorderd(?:e)?|advanced|ervaren)\b/gi,
  location: /\b(?:thuis|home|sportschool|gym|fitnesscentrum|fitness)\b/gi,
  trainingType: /\b(?:full[\s-]*body|fullbody|hele\s+lichaam|push(?![\s-]*up\b)(?:\s+day|training)?|pull(?![\s-]*up\b)(?:\s+day|training)?|benen(?:training)?|leg\s*day|legs|lower[\s-]*body|calisthenics|bodyweight|lichaamsgewicht|cardio|conditie|duurtraining)\b/gi,
  duration: /\b\d{1,3}\s*(?:min(?:uut|uten)?|m)\b|\b(?:20|30|45|60)\b|(?:\b(?:half|een|1)|\u00e9\u00e9n)\s+uur\b/gi
};

const GENERATOR_TIME_SETTINGS = {
  20: { exerciseCount: 3, setModifier: -1 },
  30: { exerciseCount: 4, setModifier: 0 },
  45: { exerciseCount: 5, setModifier: 0 },
  60: { exerciseCount: 6, setModifier: 1 }
};

const GENERATOR_LEVEL_SETTINGS = {
  beginner: { exerciseModifier: 0, baseSets: 3, repetitionModifier: -2 },
  gemiddeld: { exerciseModifier: 1, baseSets: 3, repetitionModifier: 0 },
  gevorderd: { exerciseModifier: 1, baseSets: 4, repetitionModifier: 2 }
};

const CARDIO_TIME_SETTINGS = {
  20: { exerciseCount: 1 },
  30: { exerciseCount: 2 },
  45: { exerciseCount: 2 },
  60: { exerciseCount: 3 }
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

function resolveTrackingType(exercise) {
  return String(exercise?.trackingType || "").trim() === "cardio" ? "cardio" : "strength";
}

// Oude actieve trainingen en geschiedenis kunnen loadType bevatten of trackingType missen.
// Alle oude loadType-varianten worden kracht; bestaande setwaarden, notities en statussen blijven staan.
function migrateStoredWorkout(workout) {
  if (!workout || typeof workout !== "object" || !Array.isArray(workout.exercises)) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const trackingType = resolveTrackingType(exercise);
      const { loadType: _legacyLoadType, ...exerciseWithoutLegacyType } = exercise;
      const completedSets = Array.isArray(exercise.completedSets) ? exercise.completedSets : [];
      return {
        ...exerciseWithoutLegacyType,
        trackingType,
        plannedRepetitions: trackingType === "strength" ? numberOrZero(exercise.plannedRepetitions) : 0,
        plannedWeight: trackingType === "strength" ? numberOrZero(exercise.plannedWeight) : 0,
        plannedMinutes: trackingType === "cardio" ? numberOrZero(exercise.plannedMinutes) : 0,
        completedSets: completedSets.map((set) => trackingType === "cardio"
          ? { ...set, minutes: numberOrZero(set.minutes), completed: Boolean(set.completed) }
          : { ...set, weight: numberOrZero(set.weight), repetitions: numberOrZero(set.repetitions), completed: Boolean(set.completed) })
      };
    })
  };
}

const state = {
  currentWorkout: migrateStoredWorkout(loadFromStorage(STORAGE_KEYS.currentWorkout, null)),
  history: loadFromStorage(STORAGE_KEYS.history, []).map(migrateStoredWorkout)
};

const examplePlan = {
  workoutName: "Push Day",
  date: new Date().toISOString().slice(0, 10),
  exercises: [
    { name: "Bench Press", trackingType: "strength", plannedSets: 3, plannedRepetitions: 8, plannedWeight: 60 },
    { name: "Shoulder Press", trackingType: "strength", plannedSets: 3, plannedRepetitions: 10, plannedWeight: 20 },
    { name: "Triceps Extension", trackingType: "strength", plannedSets: 3, plannedRepetitions: 12, plannedWeight: 15 }
  ]
};

let generatedPlan = null;
let generatedPreferences = null;
let proposalVariant = 0;
let proposalSearchState = null;

const elements = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  saveStatus: document.querySelector("#saveStatus"),
  generatorInput: document.querySelector("#generatorInput"),
  generatorSuggestions: document.querySelector("#generatorSuggestions"),
  generatorMessage: document.querySelector("#generatorMessage"),
  proposalPreview: document.querySelector("#proposalPreview"),
  proposalTitle: document.querySelector("#proposalTitle"),
  proposalMeta: document.querySelector("#proposalMeta"),
  proposalExerciseList: document.querySelector("#proposalExerciseList"),
  addProposalExerciseButton: document.querySelector("#addProposalExerciseButton"),
  addExerciseSearch: document.querySelector("#addExerciseSearch"),
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

const missingElements = Object.entries(elements)
  .filter(([, value]) => !value || (value instanceof NodeList && value.length === 0))
  .map(([name]) => name);
if (missingElements.length) throw new Error(`Ontbrekende HTML-elementen: ${missingElements.join(", ")}`);

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.currentWorkout, JSON.stringify(state.currentWorkout));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
    showSaveStatus("Opgeslagen");
    return true;
  } catch (error) {
    console.error("Kon gegevens niet opslaan:", error);
    showSaveStatus("Opslaan mislukt", true);
    return false;
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

function normalizeGeneratorText(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeExerciseText(value) {
  return normalizeGeneratorText(value).replace(/[-–—]/g, " ").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeExerciseSearchText(value) {
  return normalizeExerciseText(value).replace(/\broeien\b/g, "roei");
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

function getGeneratorMatches(input, category) {
  const normalizedInput = normalizeGeneratorText(input);
  return GENERATOR_PATTERNS[category].filter((option) => option.pattern.test(normalizedInput)).map((option) => option.value);
}

function parseGeneratorInput(input) {
  const trimmedInput = String(input).trim();
  const categories = Object.keys(GENERATOR_PATTERNS);
  const matches = Object.fromEntries(categories.map((category) => [category, getGeneratorMatches(trimmedInput, category)]));
  const preferences = {};
  const missing = [];
  const conflicts = [];

  categories.forEach((category) => {
    if (matches[category].length === 1) preferences[category] = matches[category][0];
    if (matches[category].length === 0) missing.push(category);
    if (matches[category].length > 1) conflicts.push(category);
  });

  const unsupportedDurations = [...normalizeGeneratorText(trimmedInput).matchAll(/\b(\d{1,3})\s*(?:min(?:uut|uten)?|m)\b/g)]
    .map((match) => Number(match[1]))
    .filter((duration) => !GENERATOR_TIME_SETTINGS[duration]);

  return {
    isEmpty: !trimmedInput,
    isValid: Boolean(trimmedInput) && missing.length === 0 && conflicts.length === 0 && unsupportedDurations.length === 0,
    preferences,
    matches,
    missing,
    conflicts,
    unsupportedDurations: [...new Set(unsupportedDurations)]
  };
}

function generatorOptionLabel(category, value) {
  return GENERATOR_OPTION_LABELS[category][value];
}

function describeGeneratorInputError(result) {
  if (result.isEmpty) return "Beschrijf eerst je training, bijvoorbeeld: Beginner, thuis, full body, 30 minuten.";

  const errors = [];
  const categoryNames = { level: "niveau", location: "locatie", trainingType: "trainingstype", duration: "tijdsduur" };
  const categoryExamples = {
    level: "Beginner, Gemiddeld of Gevorderd",
    location: "Thuis of Sportschool",
    trainingType: "Full body, Push, Pull, Benen, Calisthenics of Cardio",
    duration: "20, 30, 45 of 60 minuten"
  };

  result.conflicts.forEach((category) => {
    const found = result.matches[category].map((value) => generatorOptionLabel(category, value)).join(" en ");
    errors.push(`Kies één ${categoryNames[category]} (gevonden: ${found})`);
  });
  if (result.unsupportedDurations.length) {
    errors.push(`Tijdsduur ${result.unsupportedDurations.join(" of ")} minuten wordt niet ondersteund; kies 20, 30, 45 of 60 minuten`);
  }
  result.missing
    .filter((category) => category !== "duration" || result.unsupportedDurations.length === 0)
    .forEach((category) => errors.push(`Voeg ${categoryNames[category]} toe (${categoryExamples[category]})`));
  return `Je invoer is nog onduidelijk. ${errors.join(". ")}.`;
}

function replaceGeneratorOption(input, category, value) {
  const label = generatorOptionLabel(category, value);
  let hasReplacedOption = false;
  let updatedInput = String(input).replace(GENERATOR_REPLACEMENT_PATTERNS[category], () => {
    if (hasReplacedOption) return "";
    hasReplacedOption = true;
    return label;
  });
  updatedInput = updatedInput
    .replace(/\s+([,;])/g, "$1")
    .replace(/([,;])\s*([,;])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,;\s]+|[,;\s]+$/g, "")
    .trim();
  return hasReplacedOption ? updatedInput : [updatedInput, label].filter(Boolean).join(", ");
}

function updateGeneratorSuggestionStates() {
  const result = parseGeneratorInput(elements.generatorInput.value);
  elements.generatorSuggestions.querySelectorAll("[data-option-category]").forEach((button) => {
    button.setAttribute("aria-pressed", String(result.matches[button.dataset.optionCategory].includes(button.dataset.optionValue)));
  });
}

function getLocalDateString() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function getDatabaseExercise(id) {
  return EXERCISE_BY_ID.get(id);
}

function exerciseMatchesLocation(exercise, location) {
  return exercise.locations.includes("beide") || exercise.locations.includes(location);
}

// Progressiegroepen leveren precies één variant. Pull-up en dip blijven voor
// beginner/gemiddeld geassisteerd; de overige groepen hebben een eigen variant per niveau.
function resolveProgressionExercise(group, level, variant, location) {
  const requestedLevel = ["pull-up", "dip"].includes(group) && level !== "gevorderd" ? "beginner" : level;
  let candidates = EXERCISE_DATABASE.filter((exercise) => exercise.progressionGroup === group && exercise.progressionLevel === requestedLevel);
  const locationCandidates = candidates.filter((exercise) => exerciseMatchesLocation(exercise, location));
  if (locationCandidates.length) candidates = locationCandidates;
  if (!candidates.length) throw new Error(`Geen progressievariant gevonden voor ${group}.`);
  return candidates[variant % candidates.length];
}

function rotateBlueprint(blueprint, variant) {
  if (!variant || blueprint.length <= 2) return blueprint;
  const anchors = blueprint.slice(0, 2);
  const alternatives = blueprint.slice(2);
  const offset = variant % alternatives.length;
  return [...anchors, ...alternatives.slice(offset), ...alternatives.slice(0, offset)];
}

// Trainingstype en locatie kiezen de lijst met database-id's. Tokens met @ worden
// via het gekozen niveau naar één veilige progressievariant vertaald.
function selectDatabaseExercises(preferences, variant = 0) {
  return rotateBlueprint(GENERATOR_BLUEPRINTS[preferences.trainingType][preferences.location], variant)
    .map((entry) => entry.startsWith("@")
      ? resolveProgressionExercise(entry.slice(1), preferences.level, variant, preferences.location)
      : getDatabaseExercise(entry))
    .filter((exercise, index, list) => exercise && list.findIndex((candidate) => candidate.id === exercise.id) === index);
}

function findPromptWeightOverrides(input, exercises) {
  const normalizedInput = normalizeExerciseText(input);
  const positions = exercises
    .map((exercise) => ({ exercise, index: normalizedInput.indexOf(normalizeExerciseText(exercise.name)) }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index);
  const overrides = new Map();
  positions.forEach((mention, index) => {
    const segment = normalizedInput.slice(mention.index, positions[index + 1]?.index ?? normalizedInput.length);
    const weightMatch = segment.match(/\b(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gram)?|kilos|kilogrammen|plaat|platen|plate|plates)\b/);
    if (weightMatch) overrides.set(mention.exercise.id, Number(weightMatch[1].replace(",", ".")));
  });
  return overrides;
}

function createPlanExerciseFromDatabase(exercise, overrides = {}) {
  const trackingType = exercise.trackingType;
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    trackingType,
    plannedSets: overrides.plannedSets ?? exercise.defaultSets,
    plannedRepetitions: trackingType === "strength" ? (overrides.plannedRepetitions ?? exercise.defaultRepetitions) : 0,
    plannedWeight: trackingType === "strength" ? (overrides.plannedWeight ?? exercise.defaultWeight) : 0,
    plannedMinutes: trackingType === "cardio" ? (overrides.plannedMinutes ?? exercise.defaultMinutes) : 0
  };
}

// Tijd bepaalt het aantal oefeningen en een setcorrectie; niveau bepaalt daarnaast
// sets en herhalingen. Cardio verdeelt de beschikbare minuten over oefeningen en intervallen.
function createGeneratedPlan(preferences, variant = 0, generatorInput = "") {
  const selectedExercises = selectDatabaseExercises(preferences, variant);
  const typeLabel = generatorOptionLabel("trainingType", preferences.trainingType);
  const locationLabel = generatorOptionLabel("location", preferences.location).toLowerCase();
  const levelLabel = generatorOptionLabel("level", preferences.level).toLowerCase();
  let exercises;

  if (preferences.trainingType === "cardio") {
    const exerciseCount = Math.min(selectedExercises.length, CARDIO_TIME_SETTINGS[preferences.duration].exerciseCount);
    const intervalCount = preferences.level === "gevorderd" && Number(preferences.duration) >= 30
      ? 2
      : preferences.level === "gemiddeld" && Number(preferences.duration) >= 45 ? 2 : 1;
    const minutesPerInterval = Math.max(5, Math.floor(Number(preferences.duration) / (exerciseCount * intervalCount)));
    exercises = selectedExercises.slice(0, exerciseCount).map((exercise) => createPlanExerciseFromDatabase(exercise, {
      plannedSets: intervalCount,
      plannedMinutes: minutesPerInterval
    }));
  } else {
    const timeSettings = GENERATOR_TIME_SETTINGS[preferences.duration];
    const levelSettings = GENERATOR_LEVEL_SETTINGS[preferences.level];
    const exerciseCount = Math.min(selectedExercises.length, timeSettings.exerciseCount + levelSettings.exerciseModifier);
    const plannedSets = Math.max(2, Math.min(4, levelSettings.baseSets + timeSettings.setModifier));
    const weightOverrides = findPromptWeightOverrides(generatorInput, selectedExercises);
    exercises = selectedExercises.slice(0, exerciseCount).map((exercise) => createPlanExerciseFromDatabase(exercise, {
      plannedSets,
      plannedRepetitions: Math.max(5, Math.min(20, exercise.defaultRepetitions + levelSettings.repetitionModifier)),
      plannedWeight: weightOverrides.get(exercise.id) ?? exercise.defaultWeight
    }));
  }

  return {
    workoutName: `${typeLabel} ${locationLabel} - ${levelLabel} (${preferences.duration} min)`,
    date: getLocalDateString(),
    exercises
  };
}

function clearProposalPreview() {
  generatedPlan = null;
  generatedPreferences = null;
  proposalVariant = 0;
  proposalSearchState = null;
  elements.proposalPreview.classList.add("hidden");
  elements.proposalExerciseList.innerHTML = "";
  elements.addExerciseSearch.innerHTML = "";
  elements.addExerciseSearch.classList.add("hidden");
}

function trackingTypeLabel(trackingType) {
  return trackingType === "cardio" ? "Cardio" : "Kracht";
}

function scoreSearchResult(exercise, query, preferences) {
  const normalizedName = normalizeExerciseText(exercise.name);
  const normalizedQuery = normalizeExerciseSearchText(query);
  const preferredCategory = preferences.trainingType === "benen" ? "legs" : preferences.trainingType;
  let score = 0;
  if (!normalizedQuery) score += 1;
  if (normalizedName === normalizedQuery) score += 200;
  else if (normalizedName.startsWith(normalizedQuery)) score += 120;
  else if (normalizedName.includes(normalizedQuery)) score += 80;
  if (exerciseMatchesLocation(exercise, preferences.location)) score += 35;
  if (exercise.category === preferredCategory || (preferredCategory === "fullBody" && ["fullBody", "push", "pull", "legs", "core"].includes(exercise.category))) score += 25;
  if (exercise.trackingType === (preferences.trainingType === "cardio" ? "cardio" : "strength")) score += 20;
  if (LEVEL_RANK[exercise.minimumLevel] <= LEVEL_RANK[preferences.level]) score += 15;
  if (exercise.minimumLevel === preferences.level) score += 5;
  return score;
}

// Zoeken gebeurt over de volledige centrale database. Naamtreffers komen eerst;
// daarna wegen passende locatie, trainingscategorie en niveau mee in de volgorde.
function searchExerciseDatabase(query, preferences = generatedPreferences) {
  const normalizedQuery = normalizeExerciseSearchText(query);
  return EXERCISE_DATABASE
    .filter((exercise) => !normalizedQuery || normalizeExerciseText(exercise.name).includes(normalizedQuery))
    .map((exercise) => ({ exercise, score: scoreSearchResult(exercise, normalizedQuery, preferences) }))
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, "nl"))
    .slice(0, 12)
    .map(({ exercise }) => exercise);
}

function exerciseSearchMarkup(mode, exerciseIndex, query = "") {
  const results = searchExerciseDatabase(query);
  return `
    <div class="exercise-search-panel" data-search-mode="${mode}" ${exerciseIndex === null ? "" : `data-exercise-index="${exerciseIndex}"`}>
      <div class="exercise-search-heading">
        <strong>${mode === "add" ? "Oefening toevoegen" : "Oefening vervangen"}</strong>
        <button type="button" class="icon-button" data-proposal-action="close-search" aria-label="Zoeken sluiten">&times;</button>
      </div>
      <label>Zoek op naam
        <input type="search" data-exercise-search value="${escapeHtml(query)}" placeholder="Bijvoorbeeld: pull-up of loopband" autocomplete="off">
      </label>
      <div class="exercise-search-results" role="listbox">
        ${exerciseSearchResultsMarkup(results, mode, exerciseIndex)}
      </div>
    </div>
  `;
}

function exerciseSearchResultsMarkup(results, mode, exerciseIndex) {
  if (!results.length) return '<p class="muted search-empty">Geen oefeningen gevonden. Probeer een deel van de naam.</p>';
  return results.map((exercise) => `
    <button type="button" class="exercise-search-result" role="option" data-proposal-action="select-exercise" data-search-mode="${mode}" data-exercise-id="${exercise.id}" ${exerciseIndex === null ? "" : `data-exercise-index="${exerciseIndex}"`}>
      <span>${escapeHtml(exercise.name)}</span>
      <small>${trackingTypeLabel(exercise.trackingType)} · ${escapeHtml(generatorOptionLabel("level", exercise.minimumLevel))} · ${escapeHtml(exercise.locations.map((location) => location === "beide" ? "Thuis & sportschool" : generatorOptionLabel("location", location)).join(", "))}</small>
    </button>
  `).join("");
}

function proposalExerciseMarkup(exercise, exerciseIndex) {
  const trackingType = resolveTrackingType(exercise);
  const searchIsOpen = proposalSearchState?.mode === "replace" && proposalSearchState.exerciseIndex === exerciseIndex;
  return `
    <li class="proposal-exercise-card" data-proposal-index="${exerciseIndex}">
      <div class="proposal-card-heading">
        <span class="tracking-badge ${trackingType}">${trackingTypeLabel(trackingType)}</span>
        <div class="proposal-card-actions">
          <button type="button" class="button secondary compact-button" data-proposal-action="replace" data-exercise-index="${exerciseIndex}">Vervang oefening</button>
          <button type="button" class="button danger ghost compact-button" data-proposal-action="delete" data-exercise-index="${exerciseIndex}">Verwijder oefening</button>
        </div>
      </div>
      <div class="proposal-fields">
        <label class="field-wide">Naam
          <input type="text" data-proposal-field="name" data-exercise-index="${exerciseIndex}" value="${escapeHtml(exercise.name)}">
        </label>
        <label>Trainingstype
          <select data-proposal-field="trackingType" data-exercise-index="${exerciseIndex}">
            <option value="strength" ${trackingType === "strength" ? "selected" : ""}>Kracht</option>
            <option value="cardio" ${trackingType === "cardio" ? "selected" : ""}>Cardio</option>
          </select>
        </label>
        <label>${trackingType === "cardio" ? "Intervallen" : "Sets"}
          <input type="number" min="1" max="20" step="1" inputmode="numeric" data-proposal-field="plannedSets" data-exercise-index="${exerciseIndex}" value="${exercise.plannedSets}">
        </label>
        ${trackingType === "strength" ? `
          <label>Herhalingen
            <input type="number" min="0" step="1" inputmode="numeric" data-proposal-field="plannedRepetitions" data-exercise-index="${exerciseIndex}" value="${exercise.plannedRepetitions}">
          </label>
          <label>Gepland gewicht (Kg)
            <input type="number" min="0" step="0.5" inputmode="decimal" data-proposal-field="plannedWeight" data-exercise-index="${exerciseIndex}" value="${exercise.plannedWeight}">
          </label>
        ` : `
          <label>Minuten per interval
            <input type="number" min="0" step="1" inputmode="numeric" data-proposal-field="plannedMinutes" data-exercise-index="${exerciseIndex}" value="${exercise.plannedMinutes}">
          </label>
        `}
      </div>
      ${searchIsOpen ? exerciseSearchMarkup("replace", exerciseIndex, proposalSearchState.query) : ""}
    </li>
  `;
}

function renderProposal() {
  elements.proposalTitle.textContent = generatedPlan.workoutName;
  elements.proposalMeta.textContent = [
    generatorOptionLabel("level", generatedPreferences.level),
    generatorOptionLabel("location", generatedPreferences.location),
    generatorOptionLabel("trainingType", generatedPreferences.trainingType),
    `${generatedPreferences.duration} minuten`,
    `${generatedPlan.exercises.length} oefeningen`
  ].join(" · ");
  elements.proposalExerciseList.innerHTML = generatedPlan.exercises.map(proposalExerciseMarkup).join("");

  const addSearchIsOpen = proposalSearchState?.mode === "add";
  elements.addExerciseSearch.classList.toggle("hidden", !addSearchIsOpen);
  elements.addExerciseSearch.innerHTML = addSearchIsOpen ? exerciseSearchMarkup("add", null, proposalSearchState.query) : "";
  elements.proposalPreview.classList.remove("hidden");
}

function generateProposalFromInput(useNextVariant = false) {
  const result = parseGeneratorInput(elements.generatorInput.value);
  if (!result.isValid) {
    clearProposalPreview();
    elements.generatorInput.setAttribute("aria-invalid", "true");
    showMessage(elements.generatorMessage, describeGeneratorInputError(result), "error");
    elements.generatorInput.focus();
    return;
  }

  proposalVariant = useNextVariant ? proposalVariant + 1 : 0;
  generatedPreferences = result.preferences;
  generatedPlan = createGeneratedPlan(generatedPreferences, proposalVariant, elements.generatorInput.value);
  proposalSearchState = null;

  try {
    validatePlan(generatedPlan);
    renderProposal();
    elements.generatorInput.removeAttribute("aria-invalid");
    showMessage(elements.generatorMessage, "Voorstel klaar. Je kunt iedere oefening aanpassen, vervangen, toevoegen of verwijderen.", "success");
    elements.proposalPreview.focus();
  } catch (error) {
    clearProposalPreview();
    showMessage(elements.generatorMessage, `Voorstel maken mislukt: ${error.message}`, "error");
  }
}

function updateProposalField(input) {
  if (!generatedPlan) return;
  const exercise = generatedPlan.exercises[Number(input.dataset.exerciseIndex)];
  if (!exercise) return;
  const field = input.dataset.proposalField;

  if (field === "name") {
    exercise.name = input.value;
    return;
  }
  if (field === "trackingType") {
    exercise.trackingType = input.value;
    if (input.value === "cardio") {
      exercise.plannedRepetitions = 0;
      exercise.plannedWeight = 0;
      exercise.plannedMinutes = Math.max(0, numberOrZero(exercise.plannedMinutes) || 15);
    } else {
      exercise.plannedRepetitions = Math.max(0, numberOrZero(exercise.plannedRepetitions) || 10);
      exercise.plannedWeight = Math.max(0, numberOrZero(exercise.plannedWeight));
      exercise.plannedMinutes = 0;
    }
    renderProposal();
    return;
  }
  exercise[field] = Math.max(0, numberOrZero(input.value));
}

function selectProposalExercise(exerciseId, mode, exerciseIndex) {
  const databaseExercise = getDatabaseExercise(exerciseId);
  if (!databaseExercise || !generatedPlan) return;
  const planExercise = createPlanExerciseFromDatabase(databaseExercise);
  if (mode === "replace") generatedPlan.exercises[exerciseIndex] = planExercise;
  else generatedPlan.exercises.push(planExercise);
  proposalSearchState = null;
  renderProposal();
  showMessage(elements.generatorMessage, mode === "replace" ? "Oefening vervangen. Controleer de standaardwaarden." : "Oefening toegevoegd. Controleer de standaardwaarden.", "success");
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
    if (!exercise || typeof exercise !== "object") throw new Error(`Oefening ${index + 1} is geen geldig object.`);
    if (!String(exercise.name || "").trim()) throw new Error(`Oefening ${index + 1} heeft geen naam.`);
    if (exercise.trackingType !== undefined && !TRACKING_TYPES.has(String(exercise.trackingType).trim())) {
      throw new Error(`trackingType van ${exercise.name} moet strength of cardio zijn.`);
    }
    if (!Number.isInteger(Number(exercise.plannedSets)) || Number(exercise.plannedSets) < 1 || Number(exercise.plannedSets) > 20) {
      throw new Error(`plannedSets van ${exercise.name} moet tussen 1 en 20 zijn.`);
    }

    if (resolveTrackingType(exercise) === "cardio") {
      if (!Number.isFinite(Number(exercise.plannedMinutes)) || Number(exercise.plannedMinutes) < 0) {
        throw new Error(`plannedMinutes van ${exercise.name} moet een getal van 0 of hoger zijn.`);
      }
    } else {
      if (!Number.isFinite(Number(exercise.plannedRepetitions)) || Number(exercise.plannedRepetitions) < 0) {
        throw new Error(`plannedRepetitions van ${exercise.name} moet een getal van 0 of hoger zijn.`);
      }
      if (!Number.isFinite(Number(exercise.plannedWeight)) || Number(exercise.plannedWeight) < 0) {
        throw new Error(`plannedWeight van ${exercise.name} moet een getal van 0 of hoger zijn.`);
      }
    }
  });
}

function findExerciseByName(name) {
  const normalizedName = normalizeExerciseText(name);
  return EXERCISE_DATABASE.find((exercise) => normalizeExerciseText(exercise.name) === normalizedName);
}

function createWorkoutFromPlan(plan) {
  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    workoutName: String(plan.workoutName).trim(),
    date: plan.date || getLocalDateString(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    notes: "",
    exercises: plan.exercises.map((exercise) => {
      const trackingType = resolveTrackingType(exercise);
      const plannedSets = Number(exercise.plannedSets);
      const plannedRepetitions = trackingType === "strength" ? numberOrZero(exercise.plannedRepetitions) : 0;
      const plannedWeight = trackingType === "strength" ? numberOrZero(exercise.plannedWeight) : 0;
      const plannedMinutes = trackingType === "cardio" ? numberOrZero(exercise.plannedMinutes) : 0;
      const databaseExercise = getDatabaseExercise(exercise.exerciseId) || findExerciseByName(exercise.name);
      return {
        ...(databaseExercise ? { exerciseId: databaseExercise.id } : {}),
        name: String(exercise.name).trim(),
        trackingType,
        plannedSets,
        plannedRepetitions,
        plannedWeight,
        plannedMinutes,
        difficulty: "normal",
        notes: "",
        completedSets: Array.from({ length: plannedSets }, () => trackingType === "cardio"
          ? { minutes: plannedMinutes, completed: false }
          : { weight: plannedWeight, repetitions: plannedRepetitions, completed: false })
      };
    })
  };
}

// Zowel import als het bewerkte voorstel lopen door dezelfde route: valideren,
// omzetten, bevestigen bij vervanging, opslaan, renderen en de trainingsweergave openen.
function loadPlanAsActiveWorkout(plan) {
  validatePlan(plan);
  if (state.currentWorkout && !confirm("Er is al een actieve training. Wil je deze vervangen?")) return false;

  const previousWorkout = state.currentWorkout;
  state.currentWorkout = createWorkoutFromPlan(plan);
  if (!saveState()) {
    state.currentWorkout = previousWorkout;
    try {
      localStorage.setItem(STORAGE_KEYS.currentWorkout, JSON.stringify(previousWorkout));
    } catch (restoreError) {
      console.error("Kon de vorige actieve training niet herstellen:", restoreError);
    }
    throw new Error("De training kon niet lokaal worden opgeslagen. Controleer de browseropslag en probeer opnieuw.");
  }
  renderWorkout();
  switchView("workoutView");
  return true;
}

function formatNumber(value) {
  return Number(numberOrZero(value).toFixed(2)).toString();
}

function plural(value, singular, pluralValue) {
  return Number(value) === 1 ? singular : pluralValue;
}

function formatPlannedExercise(exercise) {
  if (resolveTrackingType(exercise) === "cardio") {
    return `${exercise.plannedSets} ${plural(exercise.plannedSets, "interval", "intervallen")} × ${formatNumber(exercise.plannedMinutes)} minuten`;
  }
  return `${exercise.plannedSets} ${plural(exercise.plannedSets, "set", "sets")} × ${formatNumber(exercise.plannedRepetitions)} herhalingen @ ${formatNumber(exercise.plannedWeight)} kg`;
}

function extraRowIsModified(exercise, setIndex) {
  const set = exercise.completedSets[setIndex];
  if (!set || set.completed) return Boolean(set?.completed);
  const previous = exercise.completedSets[setIndex - 1];
  if (resolveTrackingType(exercise) === "cardio") {
    return numberOrZero(set.minutes) !== numberOrZero(previous?.minutes ?? exercise.plannedMinutes);
  }
  return numberOrZero(set.weight) !== numberOrZero(previous?.weight ?? exercise.plannedWeight)
    || numberOrZero(set.repetitions) !== numberOrZero(previous?.repetitions ?? exercise.plannedRepetitions);
}

function addExtraRow(exercise) {
  const previous = exercise.completedSets.at(-1);
  if (resolveTrackingType(exercise) === "cardio") {
    exercise.completedSets.push({ minutes: numberOrZero(previous?.minutes ?? exercise.plannedMinutes), completed: false });
  } else {
    exercise.completedSets.push({
      weight: numberOrZero(previous?.weight ?? exercise.plannedWeight),
      repetitions: numberOrZero(previous?.repetitions ?? exercise.plannedRepetitions),
      completed: false
    });
  }
}

function extraRowLabel(trackingType, setIndex, plannedSets) {
  if (setIndex < plannedSets) return String(setIndex + 1);
  const extraNumber = setIndex - plannedSets + 1;
  return `${setIndex + 1}<span class="extra-row-label">Extra ${trackingType === "cardio" ? "interval" : "set"}${extraNumber > 1 ? ` ${extraNumber}` : ""}</span>`;
}

function strengthRowsMarkup(exercise) {
  return exercise.completedSets.map((set, setIndex) => {
    const isExtra = setIndex >= Number(exercise.plannedSets);
    return `
      <tr class="${isExtra ? "extra-row" : ""}">
        <td class="set-number">
          ${extraRowLabel("strength", setIndex, Number(exercise.plannedSets))}
          ${isExtra ? `<button type="button" class="remove-extra-button" data-row-action="remove-extra" data-set-index="${setIndex}" aria-label="Extra set verwijderen">Verwijder</button>` : ""}
        </td>
        <td><input type="number" min="0" step="0.5" inputmode="decimal" data-field="weight" data-set-index="${setIndex}" value="${formatNumber(set.weight)}" aria-label="Kg voor set ${setIndex + 1}"></td>
        <td><input type="number" min="0" step="1" inputmode="numeric" data-field="repetitions" data-set-index="${setIndex}" value="${formatNumber(set.repetitions)}" aria-label="Herhalingen voor set ${setIndex + 1}"></td>
        <td><input type="checkbox" data-field="completed" data-set-index="${setIndex}" ${set.completed ? "checked" : ""} aria-label="Set ${setIndex + 1} afgerond"></td>
      </tr>
    `;
  }).join("");
}

function cardioRowsMarkup(exercise) {
  return exercise.completedSets.map((set, setIndex) => {
    const isExtra = setIndex >= Number(exercise.plannedSets);
    return `
      <tr class="${isExtra ? "extra-row" : ""}">
        <td class="set-number">
          ${extraRowLabel("cardio", setIndex, Number(exercise.plannedSets))}
          ${isExtra ? `<button type="button" class="remove-extra-button" data-row-action="remove-extra" data-set-index="${setIndex}" aria-label="Extra interval verwijderen">Verwijder</button>` : ""}
        </td>
        <td><input type="number" min="0" step="1" inputmode="numeric" data-field="minutes" data-set-index="${setIndex}" value="${formatNumber(set.minutes)}" aria-label="Minuten voor interval ${setIndex + 1}"></td>
        <td><input type="checkbox" data-field="completed" data-set-index="${setIndex}" ${set.completed ? "checked" : ""} aria-label="Interval ${setIndex + 1} afgerond"></td>
      </tr>
    `;
  }).join("");
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
    const trackingType = resolveTrackingType(exercise);
    const allCompleted = exercise.completedSets.length > 0 && exercise.completedSets.every((set) => set.completed);
    return `
      <article class="exercise-card ${allCompleted ? "completed" : ""}" data-exercise-index="${exerciseIndex}">
        <header class="exercise-header">
          <div>
            <span class="tracking-badge ${trackingType}">${trackingTypeLabel(trackingType)}</span>
            <h3>${escapeHtml(exercise.name)}</h3>
          </div>
          <p class="muted">Gepland: ${escapeHtml(formatPlannedExercise(exercise))}</p>
        </header>
        <div class="exercise-body">
          ${trackingType === "cardio" ? `
            <table class="set-table cardio-table">
              <thead><tr><th>Interval</th><th>Minuten</th><th>Klaar</th></tr></thead>
              <tbody>${cardioRowsMarkup(exercise)}</tbody>
            </table>
            <button type="button" class="button secondary add-row-button" data-exercise-action="add-row">+ Interval toevoegen</button>
          ` : `
            <table class="set-table strength-table">
              <thead><tr><th>Set</th><th>Kg</th><th>Herhalingen</th><th>Klaar</th></tr></thead>
              <tbody>${strengthRowsMarkup(exercise)}</tbody>
            </table>
            <button type="button" class="button secondary add-row-button" data-exercise-action="add-row">+ Set toevoegen</button>
          `}
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
    const completedCount = workout.exercises.reduce((total, exercise) => total + exercise.completedSets.filter((set) => set.completed).length, 0);
    return `
      <article class="history-item">
        <h3>${escapeHtml(workout.workoutName)}</h3>
        <p class="history-meta">${escapeHtml(formatDate(workout.date))} · ${completedCount} afgeronde sets/intervallen · ${workout.exercises.length} oefeningen</p>
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
  const lines = [`Training: ${workout.workoutName}`, `Datum: ${workout.date}`, ""];
  workout.exercises.forEach((exercise) => {
    const trackingType = resolveTrackingType(exercise);
    lines.push(exercise.name);
    lines.push(`Gepland: ${formatPlannedExercise(exercise)}`);
    lines.push(`Werkelijk uitgevoerd: ${exercise.completedSets.length} ${trackingType === "cardio" ? plural(exercise.completedSets.length, "interval", "intervallen") : plural(exercise.completedSets.length, "set", "sets")}`);
    lines.push("Uitgevoerd:");
    exercise.completedSets.forEach((set, index) => {
      const isExtra = index >= Number(exercise.plannedSets);
      const label = isExtra ? (trackingType === "cardio" ? `Extra interval ${index + 1}` : `Extra set ${index + 1}`) : (trackingType === "cardio" ? `Interval ${index + 1}` : `Set ${index + 1}`);
      const status = set.completed ? "" : " (niet afgerond)";
      if (trackingType === "cardio") lines.push(`- ${label}: ${formatNumber(set.minutes)} minuten${status}`);
      else lines.push(`- ${label}: ${formatNumber(set.repetitions)} herhalingen @ ${formatNumber(set.weight)} kg${status}`);
    });
    lines.push(`Moeilijkheid: ${difficultyLabel(exercise.difficulty)}`);
    if (exercise.notes) lines.push(`Notitie: ${exercise.notes}`);
    lines.push("");
  });
  if (workout.notes) lines.push(`Algemene notitie: ${workout.notes}`);
  lines.push("", "Geef feedback op de uitvoering en stel waar passend de volgende belasting, herhalingen of duur voor.");
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
    if (messageElement) showMessage(messageElement, "Samenvatting gekopieerd. Je kunt deze nu in een AI-chat plakken.", "success");
    else alert("Samenvatting gekopieerd. Je kunt deze nu in een AI-chat plakken.");
  } catch (error) {
    console.error(error);
    if (messageElement) showMessage(messageElement, "Kopiëren lukte niet. Gebruik JSON downloaden als alternatief.", "error");
    else alert("Kopiëren lukte niet. Download de JSON als alternatief.");
  }
}

function safeFilename(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "training";
}

// Navigatie
elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.go)));

// Generator en suggesties
elements.generatorInput.addEventListener("input", () => {
  if (generatedPlan) clearProposalPreview();
  elements.generatorInput.removeAttribute("aria-invalid");
  showMessage(elements.generatorMessage, "");
  updateGeneratorSuggestionStates();
});

elements.generatorSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-category]");
  if (!button) return;
  elements.generatorInput.value = replaceGeneratorOption(elements.generatorInput.value, button.dataset.optionCategory, button.dataset.optionValue);
  elements.generatorInput.dispatchEvent(new Event("input", { bubbles: true }));
  elements.generatorInput.focus();
});

document.querySelector("#generateProposalButton").addEventListener("click", () => generateProposalFromInput(false));
document.querySelector("#regenerateProposalButton").addEventListener("click", () => generateProposalFromInput(true));

elements.addProposalExerciseButton.addEventListener("click", () => {
  if (!generatedPlan) return;
  proposalSearchState = { mode: "add", exerciseIndex: null, query: "" };
  renderProposal();
  elements.addExerciseSearch.querySelector("[data-exercise-search]")?.focus();
});

elements.proposalPreview.addEventListener("input", (event) => {
  const proposalField = event.target.closest("[data-proposal-field]");
  if (proposalField) {
    updateProposalField(proposalField);
    return;
  }
  const searchInput = event.target.closest("[data-exercise-search]");
  if (!searchInput || !proposalSearchState) return;
  proposalSearchState.query = searchInput.value;
  const resultsElement = searchInput.closest(".exercise-search-panel").querySelector(".exercise-search-results");
  resultsElement.innerHTML = exerciseSearchResultsMarkup(
    searchExerciseDatabase(searchInput.value),
    proposalSearchState.mode,
    proposalSearchState.exerciseIndex
  );
});

elements.proposalPreview.addEventListener("click", (event) => {
  const button = event.target.closest("[data-proposal-action]");
  if (!button || !generatedPlan) return;
  const action = button.dataset.proposalAction;
  const exerciseIndex = button.dataset.exerciseIndex === undefined ? null : Number(button.dataset.exerciseIndex);

  if (action === "replace") {
    proposalSearchState = { mode: "replace", exerciseIndex, query: "" };
    renderProposal();
    elements.proposalExerciseList.querySelector(`[data-proposal-index="${exerciseIndex}"] [data-exercise-search]`)?.focus();
  }
  if (action === "close-search") {
    proposalSearchState = null;
    renderProposal();
  }
  if (action === "select-exercise") {
    selectProposalExercise(button.dataset.exerciseId, button.dataset.searchMode, exerciseIndex);
  }
  if (action === "delete") {
    if (generatedPlan.exercises.length === 1) {
      showMessage(elements.generatorMessage, "Een training moet minimaal één oefening bevatten.", "error");
      return;
    }
    if (!confirm(`Oefening “${generatedPlan.exercises[exerciseIndex].name}” uit het voorstel verwijderen?`)) return;
    generatedPlan.exercises.splice(exerciseIndex, 1);
    proposalSearchState = null;
    renderProposal();
    showMessage(elements.generatorMessage, "Oefening verwijderd.", "success");
  }
});

document.querySelector("#useProposalButton").addEventListener("click", () => {
  if (!generatedPlan) {
    showMessage(elements.generatorMessage, "Maak eerst een geldig trainingsvoorstel.", "error");
    return;
  }
  try {
    if (!loadPlanAsActiveWorkout(generatedPlan)) {
      showMessage(elements.generatorMessage, "Je actieve training is niet vervangen.");
      return;
    }
    showMessage(elements.workoutMessage, "Het bewerkte trainingsvoorstel is geladen en automatisch opgeslagen.", "success");
  } catch (error) {
    showMessage(elements.generatorMessage, `Training laden mislukt: ${error.message}`, "error");
  }
});

// Handmatige JSON-import gebruikt dezelfde validatePlan- en laadroute.
document.querySelector("#loadExampleButton").addEventListener("click", () => {
  elements.planInput.value = JSON.stringify(examplePlan, null, 2);
  showMessage(elements.importMessage, "Voorbeeld geladen. Klik nu op ‘Plan importeren’.", "success");
});

document.querySelector("#importButton").addEventListener("click", () => {
  try {
    const plan = JSON.parse(elements.planInput.value);
    if (!loadPlanAsActiveWorkout(plan)) {
      showMessage(elements.importMessage, "Importeren geannuleerd; de actieve training is niet vervangen.");
      return;
    }
    showMessage(elements.importMessage, "Plan geïmporteerd en opgeslagen.", "success");
  } catch (error) {
    showMessage(elements.importMessage, `Importeren mislukt: ${error.message}`, "error");
  }
});

// Actieve training: kracht en cardio delen opslag en status, maar hebben eigen rijvelden.
elements.exerciseList.addEventListener("input", (event) => {
  if (!state.currentWorkout) return;
  const card = event.target.closest("[data-exercise-index]");
  if (!card) return;
  const exercise = state.currentWorkout.exercises[Number(card.dataset.exerciseIndex)];

  if (event.target.dataset.exerciseField) {
    exercise[event.target.dataset.exerciseField] = event.target.value;
  } else if (event.target.dataset.field) {
    const set = exercise.completedSets[Number(event.target.dataset.setIndex)];
    set[event.target.dataset.field] = event.target.type === "checkbox" ? event.target.checked : Math.max(0, numberOrZero(event.target.value));
  }
  saveState();
  if (event.target.type === "checkbox") renderWorkout();
});

elements.exerciseList.addEventListener("click", (event) => {
  if (!state.currentWorkout) return;
  const card = event.target.closest("[data-exercise-index]");
  if (!card) return;
  const exercise = state.currentWorkout.exercises[Number(card.dataset.exerciseIndex)];
  const addButton = event.target.closest("[data-exercise-action='add-row']");
  if (addButton) {
    addExtraRow(exercise);
    saveState();
    renderWorkout();
    return;
  }
  const removeButton = event.target.closest("[data-row-action='remove-extra']");
  if (!removeButton) return;
  const setIndex = Number(removeButton.dataset.setIndex);
  if (setIndex < Number(exercise.plannedSets)) return;
  const kind = resolveTrackingType(exercise) === "cardio" ? "interval" : "set";
  if (extraRowIsModified(exercise, setIndex) && !confirm(`Deze extra ${kind} is aangepast of afgevinkt. Toch verwijderen?`)) return;
  exercise.completedSets.splice(setIndex, 1);
  saveState();
  renderWorkout();
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
  const completedRows = state.currentWorkout.exercises.reduce((count, exercise) => count + exercise.completedSets.filter((set) => set.completed).length, 0);
  if (completedRows === 0 && !confirm("Er zijn nog geen sets of intervallen afgevinkt. Toch afronden?")) return;
  state.currentWorkout.finishedAt = new Date().toISOString();
  const finishedWorkout = typeof structuredClone === "function" ? structuredClone(state.currentWorkout) : JSON.parse(JSON.stringify(state.currentWorkout));
  state.history.unshift(finishedWorkout);
  state.currentWorkout = null;
  saveState();
  renderWorkout();
  renderHistory();
  switchView("historyView");
});

elements.historyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-action]");
  if (!button) return;
  const index = Number(button.dataset.historyIndex);
  const workout = state.history[index];
  if (!workout) return;
  if (button.dataset.historyAction === "copy") copyText(workoutToAiText(workout));
  if (button.dataset.historyAction === "download") downloadJson(workout, `${safeFilename(workout.workoutName)}-${workout.date}.json`);
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(console.error));
}

// Kleine read-only testhaak voor de lokale acceptatietests; de app zelf gebruikt dezelfde functies.
window.GymAITestApi = Object.freeze({
  EXERCISE_DATABASE,
  parseGeneratorInput,
  createGeneratedPlan,
  searchExerciseDatabase,
  validatePlan,
  createWorkoutFromPlan,
  migrateStoredWorkout,
  resolveTrackingType,
  addExtraRow,
  extraRowIsModified,
  workoutToAiText,
  formatPlannedExercise
});

renderWorkout();
renderHistory();
updateGeneratorSuggestionStates();
showSaveStatus("Automatisch opslaan actief");
