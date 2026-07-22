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
    { name: "Bench Press", plannedSets: 3, plannedRepetitions: 8, plannedWeight: 60, loadType: "weight" },
    { name: "Shoulder Press", plannedSets: 3, plannedRepetitions: 10, plannedWeight: 20, loadType: "weight" },
    { name: "Triceps Extension", plannedSets: 3, plannedRepetitions: 12, plannedWeight: 15, loadType: "weight" }
  ]
};

const GENERATOR_OPTION_LABELS = {
  level: { beginner: "Beginner", gemiddeld: "Gemiddeld", gevorderd: "Gevorderd" },
  location: { thuis: "Thuis", sportschool: "Sportschool" },
  trainingType: {
    fullBody: "Full body",
    push: "Push",
    pull: "Pull",
    benen: "Benen",
    calisthenics: "Calisthenics"
  },
  duration: { 20: "20 minuten", 30: "30 minuten", 45: "45 minuten", 60: "60 minuten" }
};

// Deze patronen herkennen gangbare Nederlandse en Engelse woorden uit vrije invoer.
// Per categorie bewaren we alle treffers, zodat tegenstrijdige keuzes als onduidelijk worden gemeld.
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
    { value: "calisthenics", pattern: /\b(?:calisthenics|bodyweight|lichaamsgewicht)\b/i }
  ],
  duration: [
    { value: "20", pattern: /\b20\s*(?:min(?:uut|uten)?|m)\b/i },
    { value: "30", pattern: /\b(?:30\s*(?:min(?:uut|uten)?|m)|half\s+uur)\b/i },
    { value: "45", pattern: /\b45\s*(?:min(?:uut|uten)?|m)\b/i },
    { value: "60", pattern: /\b(?:60\s*(?:min(?:uut|uten)?|m)|(?:een|1)\s+uur)\b/i }
  ]
};

// Bij een suggestieklik vervangen deze patronen een bestaande keuze uit dezelfde categorie.
const GENERATOR_REPLACEMENT_PATTERNS = {
  level: /\b(?:beginner|beginnend(?:e)?|starter|novice|gemiddeld(?:e)?|intermediate|gevorderd(?:e)?|advanced|ervaren)\b/gi,
  location: /\b(?:thuis|home|sportschool|gym|fitnesscentrum|fitness)\b/gi,
  trainingType: /\b(?:full[\s-]*body|fullbody|hele\s+lichaam|push(?![\s-]*up\b)(?:\s+day|training)?|pull(?![\s-]*up\b)(?:\s+day|training)?|benen(?:training)?|leg\s*day|legs|lower[\s-]*body|calisthenics|bodyweight|lichaamsgewicht)\b/gi,
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

const SUPPORTED_LOAD_TYPES = new Set(["weight", "assistance", "plates", "bodyweight"]);

// Deze namen zijn duidelijk lichaamsgewichtoefeningen wanneer een oud plan geen loadType heeft.
// Assisted-oefeningen worden apart als hulpgewicht behandeld en vallen nooit in deze lijst.
const BODYWEIGHT_EXERCISE_PATTERNS = [
  /\bbodyweight\b/,
  /\bpush up\b/,
  /\bpull up\b/,
  /\b(?:bench )?dip\b/,
  /\bglute bridge\b/,
  /\b(?:reverse|lateral|walking) lunge\b/,
  /\bbulgarian split squat\b/,
  /\bsingle leg romanian deadlift\b/,
  /\bsuperman\b/,
  /\bdead bug\b/,
  /\bmountain climber\b/,
  /\bshoulder tap\b/,
  /\bplank\b/,
  /\breverse snow angel\b/,
  /\bprone [yw] raise\b/,
  /\bbird dog\b/,
  /\bcobra hold\b/,
  /\bscapular\b/,
  /\bcalf raise\b/,
  /\bwall sit\b/,
  /\bhollow body\b/,
  /\bbear crawl\b/,
  /\bhanging knee raise\b/,
  /\binverted row\b/,
  /\bpistol squat\b/,
  /\bl sit\b/
];

// Gecontroleerde sjablonen houden de generator voorspelbaar en volledig offline.
// Elk trainingstype heeft een thuis- en sportschoolvariant. Onbekende belastingen starten op 0
// en worden alleen vanuit de gewone tekstinvoer of het bewerkbare voorstel ingevuld.
const WORKOUT_TEMPLATES = {
  fullBody: {
    thuis: [
      { name: "Bodyweight Squat", repetitions: 12, weight: 0 },
      { name: "Push-up", repetitions: 10, weight: 0 },
      { name: "Glute Bridge", repetitions: 14, weight: 0 },
      { name: "Reverse Lunge (per been)", repetitions: 10, weight: 0 },
      { name: "Superman", repetitions: 12, weight: 0 },
      { name: "Dead Bug (per kant)", repetitions: 10, weight: 0 },
      { name: "Pike Push-up", repetitions: 8, weight: 0 },
      { name: "Mountain Climber (per kant)", repetitions: 16, weight: 0 }
    ],
    sportschool: [
      { name: "Goblet Squat", repetitions: 10, weight: 0 },
      { name: "Chest Press", repetitions: 10, weight: 0 },
      { name: "Lat Pulldown", repetitions: 10, weight: 0 },
      { name: "Romanian Deadlift", repetitions: 10, weight: 0 },
      { name: "Seated Row", repetitions: 10, weight: 0 },
      { name: "Dumbbell Shoulder Press", repetitions: 10, weight: 0 },
      { name: "Leg Curl", repetitions: 12, weight: 0 },
      { name: "Cable Pallof Press (per kant)", repetitions: 10, weight: 0 }
    ]
  },
  push: {
    thuis: [
      { name: "Push-up", repetitions: 10, weight: 0 },
      { name: "Pike Push-up", repetitions: 8, weight: 0 },
      { name: "Incline Push-up", repetitions: 12, weight: 0 },
      { name: "Diamond Push-up", repetitions: 8, weight: 0 },
      { name: "Bench Dip", repetitions: 10, weight: 0 },
      { name: "Shoulder Tap (per kant)", repetitions: 12, weight: 0 },
      { name: "Knee Push-up", repetitions: 14, weight: 0 },
      { name: "Plank Up-down", repetitions: 10, weight: 0 }
    ],
    sportschool: [
      { name: "Bench Press", repetitions: 8, weight: 0 },
      { name: "Dumbbell Shoulder Press", repetitions: 10, weight: 0 },
      { name: "Incline Dumbbell Press", repetitions: 10, weight: 0 },
      { name: "Cable Chest Fly", repetitions: 12, weight: 0 },
      { name: "Lateral Raise", repetitions: 12, weight: 0 },
      { name: "Triceps Pushdown", repetitions: 12, weight: 0 },
      { name: "Chest Press", repetitions: 10, weight: 0 },
      { name: "Overhead Triceps Extension", repetitions: 12, weight: 0 }
    ]
  },
  pull: {
    thuis: [
      { name: "Rugzak Row (per arm)", repetitions: 12, weight: 0 },
      { name: "Superman Pull", repetitions: 12, weight: 0 },
      { name: "Reverse Snow Angel", repetitions: 12, weight: 0 },
      { name: "Prone Y Raise", repetitions: 10, weight: 0 },
      { name: "Bird Dog (per kant)", repetitions: 10, weight: 0 },
      { name: "Handdoek Biceps Curl", repetitions: 12, weight: 0 },
      { name: "Cobra Hold", repetitions: 10, weight: 0 },
      { name: "Scapular Push-up", repetitions: 12, weight: 0 }
    ],
    sportschool: [
      { name: "Lat Pulldown", repetitions: 10, weight: 0 },
      { name: "Seated Cable Row", repetitions: 10, weight: 0 },
      { name: "One-arm Dumbbell Row", repetitions: 10, weight: 0 },
      { name: "Face Pull", repetitions: 12, weight: 0 },
      { name: "Rear Delt Fly", repetitions: 12, weight: 0 },
      { name: "Dumbbell Curl", repetitions: 12, weight: 0 },
      { name: "Straight-arm Pulldown", repetitions: 12, weight: 0 },
      { name: "Hammer Curl", repetitions: 10, weight: 0 }
    ]
  },
  benen: {
    thuis: [
      { name: "Bodyweight Squat", repetitions: 14, weight: 0 },
      { name: "Reverse Lunge (per been)", repetitions: 10, weight: 0 },
      { name: "Glute Bridge", repetitions: 14, weight: 0 },
      { name: "Bulgarian Split Squat (per been)", repetitions: 8, weight: 0 },
      { name: "Single-leg Romanian Deadlift", repetitions: 10, weight: 0 },
      { name: "Calf Raise", repetitions: 16, weight: 0 },
      { name: "Wall Sit", repetitions: 12, weight: 0 },
      { name: "Lateral Lunge (per been)", repetitions: 10, weight: 0 }
    ],
    sportschool: [
      { name: "Back Squat", repetitions: 8, weight: 0 },
      { name: "Romanian Deadlift", repetitions: 10, weight: 0 },
      { name: "Leg Press", repetitions: 10, weight: 0 },
      { name: "Walking Lunge (per been)", repetitions: 10, weight: 0 },
      { name: "Leg Curl", repetitions: 12, weight: 0 },
      { name: "Leg Extension", repetitions: 12, weight: 0 },
      { name: "Standing Calf Raise", repetitions: 14, weight: 0 },
      { name: "Hip Thrust", repetitions: 10, weight: 0 }
    ]
  },
  calisthenics: {
    thuis: [
      { name: "Bodyweight Squat", repetitions: 14, weight: 0 },
      { name: "Push-up", repetitions: 10, weight: 0 },
      { name: "Reverse Lunge (per been)", repetitions: 10, weight: 0 },
      { name: "Pike Push-up", repetitions: 8, weight: 0 },
      { name: "Hollow Body Crunch", repetitions: 12, weight: 0 },
      { name: "Bear Crawl (passen)", repetitions: 16, weight: 0 },
      { name: "Glute Bridge", repetitions: 14, weight: 0 },
      { name: "Mountain Climber (per kant)", repetitions: 16, weight: 0 },
      { name: "Pull-up", repetitions: 8, weight: 0 },
      { name: "Dip", repetitions: 8, weight: 0 }
    ],
    sportschool: [
      { name: "Assisted Pull-up", repetitions: 8, weight: 0 },
      { name: "Assisted Dip", repetitions: 8, weight: 0 },
      { name: "Push-up", repetitions: 12, weight: 0 },
      { name: "Hanging Knee Raise", repetitions: 10, weight: 0 },
      { name: "Inverted Row", repetitions: 10, weight: 0 },
      { name: "Pistol Squat naar bank (per been)", repetitions: 8, weight: 0 },
      { name: "Scapular Pull-up", repetitions: 10, weight: 0 },
      { name: "L-sit Knee Tuck", repetitions: 10, weight: 0 },
      { name: "Pull-up", repetitions: 8, weight: 0 },
      { name: "Dip", repetitions: 8, weight: 0 }
    ]
  }
};

let generatedPlan = null;
let generatedPreferences = null;
let proposalVariant = 0;

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
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeExerciseText(value) {
  return normalizeGeneratorText(value)
    .replace(/[-–—]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// loadType is optioneel voor oude plannen. Assisted-oefeningen zijn altijd hulpgewicht;
// duidelijke lichaamsgewichtoefeningen met gewicht 0 worden automatisch herkend.
function resolveLoadType(exercise) {
  const explicitLoadType = String(exercise.loadType || "").trim();
  if (SUPPORTED_LOAD_TYPES.has(explicitLoadType)) return explicitLoadType;

  const normalizedName = normalizeExerciseText(exercise.name);
  if (/\bassisted\b/.test(normalizedName)) return "assistance";
  if (numberOrZero(exercise.plannedWeight) === 0 && BODYWEIGHT_EXERCISE_PATTERNS.some((pattern) => pattern.test(normalizedName))) {
    return "bodyweight";
  }
  return "weight";
}

function formatLoadValue(loadType, value) {
  const numericValue = Math.max(0, numberOrZero(value));
  if (loadType === "bodyweight") return "lichaamsgewicht";
  if (loadType === "assistance") return numericValue > 0 ? `${numericValue} kg hulpgewicht` : "hulpgewicht zelf invullen";
  if (loadType === "plates") return numericValue > 0 ? `${Math.round(numericValue)} platen` : "aantal platen zelf invullen";
  return numericValue > 0 ? `${numericValue} kg` : "gewicht zelf invullen";
}

function formatPlannedExercise(exercise) {
  return `${exercise.plannedSets} × ${exercise.plannedRepetitions || "-"} met ${formatLoadValue(resolveLoadType(exercise), exercise.plannedWeight)}`;
}

function loadInputLabel(loadType) {
  return ({
    weight: "Gepland gewicht (kg)",
    assistance: "Gepland hulpgewicht (kg)",
    plates: "Gepland aantal platen"
  })[loadType] || "";
}

function loadColumnLabel(loadType) {
  return ({ weight: "Kg", assistance: "Hulpgewicht", plates: "Platen", bodyweight: "Lichaamsgewicht" })[loadType];
}

function getExercisePromptAliases(exerciseName) {
  const normalizedName = normalizeExerciseText(exerciseName);
  const aliases = [normalizedName];
  if (normalizedName.startsWith("bodyweight ")) aliases.push(normalizedName.replace(/^bodyweight\s+/, ""));
  return [...new Set(aliases)].sort((a, b) => b.length - a.length);
}

function isExerciseAliasBoundary(text, start, end) {
  const before = text[start - 1] || " ";
  const after = text[end] || " ";
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
}

function findExerciseMentions(input, templateExercises) {
  const normalizedInput = normalizeExerciseText(input);
  const candidates = [];

  templateExercises.forEach((exercise) => {
    getExercisePromptAliases(exercise.name).forEach((alias) => {
      let index = normalizedInput.indexOf(alias);
      while (index !== -1) {
        const end = index + alias.length;
        if (isExerciseAliasBoundary(normalizedInput, index, end)) {
          candidates.push({ exercise, index, end, aliasLength: alias.length });
        }
        index = normalizedInput.indexOf(alias, index + 1);
      }
    });
  });

  candidates.sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const mentions = [];
  const mentionedNames = new Set();
  candidates.forEach((candidate) => {
    const overlaps = mentions.some((mention) => candidate.index < mention.end && candidate.end > mention.index);
    if (!overlaps && !mentionedNames.has(candidate.exercise.name)) {
      mentions.push(candidate);
      mentionedNames.add(candidate.exercise.name);
    }
  });

  mentions.sort((a, b) => a.index - b.index);
  return mentions.map((mention, index) => {
    const segmentEnd = mentions[index + 1]?.index ?? normalizedInput.length;
    const segment = normalizedInput.slice(mention.index, segmentEnd);
    const defaultLoadType = resolveLoadType({ name: mention.exercise.name, plannedWeight: 0 });
    return { ...mention, loadOverride: parseExerciseLoad(segment, defaultLoadType) };
  });
}

// Alleen de tekst vanaf een genoemde oefening tot de volgende genoemde oefening wordt gelezen.
// Daardoor hoort bijvoorbeeld 45 kg bij Assisted Pull-up en niet ook bij Assisted Dip.
function parseExerciseLoad(segment, defaultLoadType) {
  if (/\b(?:lichaamsgewicht|bodyweight)\b/.test(segment)) {
    return { loadType: "bodyweight", plannedWeight: 0 };
  }

  const platesMatch = segment.match(/\b(\d+)\s*(?:plaat|platen|plate|plates)\b/);
  if (platesMatch) {
    return { loadType: "plates", plannedWeight: Number(platesMatch[1]) };
  }

  const weightMatch = segment.match(/\b(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gram)?|kilos|kilogrammen)\b/);
  const usesAssistance = defaultLoadType === "assistance" || /\b(?:hulpgewicht|hulp|assistance|assisted)\b/.test(segment);
  if (weightMatch) {
    return {
      loadType: usesAssistance ? "assistance" : "weight",
      plannedWeight: Number(weightMatch[1].replace(",", "."))
    };
  }

  return usesAssistance ? { loadType: "assistance", plannedWeight: 0 } : null;
}

function getGeneratorMatches(input, category) {
  const normalizedInput = normalizeGeneratorText(input);
  return GENERATOR_PATTERNS[category]
    .filter((option) => option.pattern.test(normalizedInput))
    .map((option) => option.value);
}

// Vrije invoer wordt per categorie herkend. Ontbrekende of dubbele keuzes leveren
// bewust geen gok op: de gebruiker krijgt dan een concrete melding om de invoer aan te vullen.
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
  if (result.isEmpty) {
    return "Beschrijf eerst je training, bijvoorbeeld: Beginner, thuis, full body, 30 minuten.";
  }

  const errors = [];
  const categoryNames = { level: "niveau", location: "locatie", trainingType: "trainingstype", duration: "tijdsduur" };
  const categoryExamples = {
    level: "Beginner, Gemiddeld of Gevorderd",
    location: "Thuis of Sportschool",
    trainingType: "Full body, Push, Pull, Benen of Calisthenics",
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
    const isSelected = result.matches[button.dataset.optionCategory].includes(button.dataset.optionValue);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function clearProposalPreview() {
  generatedPlan = null;
  generatedPreferences = null;
  proposalVariant = 0;
  elements.proposalPreview.classList.add("hidden");
  elements.proposalExerciseList.innerHTML = "";
}

function getLocalDateString() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
}

// Het trainingstype en de locatie kiezen samen het gecontroleerde sjabloon.
// Bij een alternatief voorstel blijven de twee basisoefeningen staan en roteert de rest.
function selectTemplateExercises(preferences, variant) {
  const template = WORKOUT_TEMPLATES[preferences.trainingType][preferences.location];
  if (!variant) return template;

  const anchors = template.slice(0, 2);
  const alternatives = template.slice(2);
  const offset = variant % alternatives.length;
  return [...anchors, ...alternatives.slice(offset), ...alternatives.slice(0, offset)];
}

// De tijd bepaalt het basisaantal oefeningen en een setcorrectie. Het niveau voegt
// oefeningen, sets en herhalingen toe; vier sets is de bovengrens om het schema haalbaar te houden.
// Expliciet genoemde oefeningen worden naar voren gehaald en krijgen alleen hun eigen herkende belasting.
function createGeneratedPlan(preferences, variant = 0, generatorInput = "") {
  const timeSettings = GENERATOR_TIME_SETTINGS[preferences.duration];
  const levelSettings = GENERATOR_LEVEL_SETTINGS[preferences.level];
  const templateExercises = selectTemplateExercises(preferences, variant);
  const exerciseCount = Math.min(templateExercises.length, timeSettings.exerciseCount + levelSettings.exerciseModifier);
  const plannedSets = Math.max(2, Math.min(4, levelSettings.baseSets + timeSettings.setModifier));
  const typeLabel = generatorOptionLabel("trainingType", preferences.trainingType);
  const locationLabel = generatorOptionLabel("location", preferences.location).toLowerCase();
  const levelLabel = generatorOptionLabel("level", preferences.level).toLowerCase();
  const mentions = findExerciseMentions(generatorInput, WORKOUT_TEMPLATES[preferences.trainingType][preferences.location]);
  const mentionByName = new Map(mentions.map((mention) => [mention.exercise.name, mention]));
  const mentionedExercises = mentions.map((mention) => mention.exercise);
  const orderedExercises = [
    ...mentionedExercises,
    ...templateExercises.filter((exercise) => !mentionByName.has(exercise.name))
  ];

  return {
    workoutName: `${typeLabel} ${locationLabel} - ${levelLabel} (${preferences.duration} min)`,
    date: getLocalDateString(),
    exercises: orderedExercises.slice(0, exerciseCount).map((exercise) => {
      const defaultLoadType = resolveLoadType({ name: exercise.name, plannedWeight: exercise.weight });
      const loadOverride = mentionByName.get(exercise.name)?.loadOverride;
      return {
        name: exercise.name,
        plannedSets,
        plannedRepetitions: Math.max(5, Math.min(20, exercise.repetitions + levelSettings.repetitionModifier)),
        plannedWeight: loadOverride?.plannedWeight ?? exercise.weight,
        loadType: loadOverride?.loadType || defaultLoadType
      };
    })
  };
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

  elements.proposalExerciseList.innerHTML = generatedPlan.exercises.map((exercise, exerciseIndex) => {
    const loadType = resolveLoadType(exercise);
    const showLoadEditor = loadType !== "bodyweight";
    return `
      <li class="proposal-exercise">
        <strong>${escapeHtml(exercise.name)}</strong>
        <span data-proposal-summary-index="${exerciseIndex}">${escapeHtml(formatPlannedExercise(exercise))}</span>
        ${showLoadEditor ? `
          <label class="proposal-load-editor">
            ${escapeHtml(loadInputLabel(loadType))}
            <input type="number" min="0" step="${loadType === "plates" ? "1" : "0.5"}" inputmode="${loadType === "plates" ? "numeric" : "decimal"}" data-proposal-weight-index="${exerciseIndex}" value="${exercise.plannedWeight}">
          </label>
        ` : ""}
      </li>
    `;
  }).join("");

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

  try {
    validatePlan(generatedPlan);
    renderProposal();
    elements.generatorInput.removeAttribute("aria-invalid");
    showMessage(elements.generatorMessage, "Voorstel klaar. Bekijk de oefeningen voordat je de training gebruikt.", "success");
    elements.proposalPreview.focus();
  } catch (error) {
    clearProposalPreview();
    showMessage(elements.generatorMessage, `Voorstel maken mislukt: ${error.message}`, "error");
  }
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
    if (!Number.isInteger(Number(exercise.plannedSets)) || Number(exercise.plannedSets) < 1 || Number(exercise.plannedSets) > 20) {
      throw new Error(`plannedSets van ${exercise.name} moet tussen 1 en 20 zijn.`);
    }
    if (!Number.isFinite(Number(exercise.plannedRepetitions)) || Number(exercise.plannedRepetitions) < 0) {
      throw new Error(`plannedRepetitions van ${exercise.name} moet een getal van 0 of hoger zijn.`);
    }
    if (!Number.isFinite(Number(exercise.plannedWeight)) || Number(exercise.plannedWeight) < 0) {
      throw new Error(`plannedWeight van ${exercise.name} moet een getal van 0 of hoger zijn.`);
    }
    if (exercise.loadType !== undefined && !SUPPORTED_LOAD_TYPES.has(String(exercise.loadType).trim())) {
      throw new Error(`loadType van ${exercise.name} moet weight, assistance, plates of bodyweight zijn.`);
    }
    const loadType = resolveLoadType(exercise);
    if (loadType === "plates" && !Number.isInteger(Number(exercise.plannedWeight))) {
      throw new Error(`plannedWeight van ${exercise.name} moet bij plates een geheel aantal zijn.`);
    }
    if (loadType === "bodyweight" && Number(exercise.plannedWeight) !== 0) {
      throw new Error(`plannedWeight van ${exercise.name} moet bij bodyweight 0 zijn.`);
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
      loadType: resolveLoadType(exercise),
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

// Zowel JSON-import als het lokale voorstel gebruiken exact deze laadroute.
// Zo wordt een plan één keer gevalideerd, omgezet, opgeslagen, gerenderd en actief geopend.
function loadPlanAsActiveWorkout(plan) {
  validatePlan(plan);

  if (state.currentWorkout && !confirm("Er is al een actieve training. Wil je deze vervangen?")) {
    return false;
  }

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
    const loadType = resolveLoadType(exercise);
    const showLoadInput = loadType !== "bodyweight";
    const inputStep = loadType === "plates" ? "1" : "0.5";
    const inputMode = loadType === "plates" ? "numeric" : "decimal";

    return `
      <article class="exercise-card ${allCompleted ? "completed" : ""}" data-exercise-index="${exerciseIndex}">
        <header class="exercise-header">
          <h3>${escapeHtml(exercise.name)}</h3>
          <p class="muted">Gepland: ${escapeHtml(formatPlannedExercise(exercise))}</p>
          ${loadType === "assistance" ? '<p class="load-hint">Meer hulpgewicht = meer ondersteuning</p>' : ""}
        </header>
        <div class="exercise-body">
          <table class="set-table">
            <thead>
              <tr><th>Set</th><th>${escapeHtml(loadColumnLabel(loadType))}</th><th>Herhalingen</th><th>Klaar</th></tr>
            </thead>
            <tbody>
              ${exercise.completedSets.map((set, setIndex) => `
                <tr>
                  <td class="set-number">${setIndex + 1}</td>
                  <td>${showLoadInput
                    ? `<input type="number" min="0" step="${inputStep}" inputmode="${inputMode}" data-field="weight" data-set-index="${setIndex}" value="${set.weight}" aria-label="${escapeHtml(loadColumnLabel(loadType))} voor set ${setIndex + 1}">`
                    : '<span class="bodyweight-value">Lichaamsgewicht</span>'}
                  </td>
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
    const loadType = resolveLoadType(exercise);
    lines.push(exercise.name);
    lines.push(`Gepland: ${formatPlannedExercise(exercise)}`);
    lines.push("Uitgevoerd:");
    exercise.completedSets.forEach((set, index) => {
      lines.push(`- Set ${index + 1}: ${set.repetitions} herhalingen met ${formatLoadValue(loadType, set.weight)} (${set.completed ? "afgerond" : "niet afgerond"})`);
    });
    lines.push(`Moeilijkheid: ${difficultyLabel(exercise.difficulty)}`);
    if (exercise.notes) lines.push(`Notitie: ${exercise.notes}`);
    lines.push("");
  });

  if (workout.notes) lines.push(`Algemene notitie: ${workout.notes}`);
  lines.push("", "Geef feedback op de uitvoering en stel waar passend de volgende belasting of het aantal herhalingen voor.");
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

// Lokaal trainingsvoorstel
elements.generatorInput.addEventListener("input", () => {
  if (generatedPlan) clearProposalPreview();
  elements.generatorInput.removeAttribute("aria-invalid");
  showMessage(elements.generatorMessage, "");
  updateGeneratorSuggestionStates();
});

elements.generatorSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option-category]");
  if (!button) return;

  elements.generatorInput.value = replaceGeneratorOption(
    elements.generatorInput.value,
    button.dataset.optionCategory,
    button.dataset.optionValue
  );
  elements.generatorInput.dispatchEvent(new Event("input", { bubbles: true }));
  elements.generatorInput.focus();
});

// Het voorstel blijft een gewoon planobject. Een wijziging in dit kleine veld past
// direct plannedWeight aan, zodat dezelfde waarde later in iedere geplande set terechtkomt.
elements.proposalExerciseList.addEventListener("input", (event) => {
  const input = event.target.closest("[data-proposal-weight-index]");
  if (!input || !generatedPlan) return;

  const exerciseIndex = Number(input.dataset.proposalWeightIndex);
  const exercise = generatedPlan.exercises[exerciseIndex];
  if (!exercise) return;

  const loadType = resolveLoadType(exercise);
  let plannedWeight = Math.max(0, numberOrZero(input.value));
  if (loadType === "plates") {
    plannedWeight = Math.round(plannedWeight);
    if (input.value !== "") input.value = String(plannedWeight);
  }
  exercise.plannedWeight = plannedWeight;

  const summary = elements.proposalExerciseList.querySelector(`[data-proposal-summary-index="${exerciseIndex}"]`);
  if (summary) summary.textContent = formatPlannedExercise(exercise);
});

document.querySelector("#generateProposalButton").addEventListener("click", () => generateProposalFromInput(false));
document.querySelector("#regenerateProposalButton").addEventListener("click", () => generateProposalFromInput(true));

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
    showMessage(elements.workoutMessage, "Trainingsvoorstel geladen en automatisch opgeslagen.", "success");
  } catch (error) {
    showMessage(elements.generatorMessage, `Training laden mislukt: ${error.message}`, "error");
  }
});

// Importeren
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
    let value = event.target.type === "checkbox" ? event.target.checked : numberOrZero(event.target.value);
    if (event.target.dataset.field === "weight" && resolveLoadType(exercise) === "plates") {
      value = Math.max(0, Math.round(value));
      event.target.value = String(value);
    }
    set[event.target.dataset.field] = value;
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
updateGeneratorSuggestionStates();
showSaveStatus("Automatisch opslaan actief");
