const STORAGE_KEY = "communication-meter-entries-v1";
const THEME_KEY = "communication-meter-theme-v1";
const CACHE_BUST = "communication-meter-v2026-05-29c";

const durationLabels = {
  1: "<1 min",
  3: "1–5 min",
  10: "5–15 min",
  22: "15–30 min",
  45: "30+ min"
};

const presets = [
  { person: "Katz", channel: "Text", minutes: 3, complexity: 3, direction: "Back-and-forth", label: "Katz Text", sub: "3m · moderate" },
  { person: "Katz", channel: "In Person", minutes: 10, complexity: 4, direction: "Back-and-forth", label: "Katz Live", sub: "10m · difficult" },
  { person: "Work", channel: "Email", minutes: 3, complexity: 2, direction: "Received", label: "Work Email", sub: "3m · routine" },
  { person: "Dad", channel: "In Person", minutes: 10, complexity: 3, direction: "Back-and-forth", label: "Dad Check-in", sub: "10m · moderate" }
];

const els = {
  localDateLabel: document.getElementById("localDateLabel"),
  timezoneLabel: document.getElementById("timezoneLabel"),
  batteryValue: document.getElementById("batteryValue"),
  todayCount: document.getElementById("todayCount"),
  todayLoad: document.getElementById("todayLoad"),
  todayMinutes: document.getElementById("todayMinutes"),
  todayDensity: document.getElementById("todayDensity"),
  thresholdStatus: document.getElementById("thresholdStatus"),
  thresholdNote: document.getElementById("thresholdNote"),
  loadBar: document.getElementById("loadBar"),
  form: document.getElementById("entryForm"),
  entryId: document.getElementById("entryId"),
  person: document.getElementById("person"),
  durationBand: document.getElementById("durationBand"),
  complexity: document.getElementById("complexity"),
  direction: document.getElementById("direction"),
  date: document.getElementById("date"),
  time: document.getElementById("time"),
  note: document.getElementById("note"),
  resetBtn: document.getElementById("resetBtn"),
  presetGrid: document.getElementById("presetGrid"),
  personBreakdown: document.getElementById("personBreakdown"),
  channelBreakdown: document.getElementById("channelBreakdown"),
  dateFilter: document.getElementById("dateFilter"),
  entriesList: document.getElementById("entriesList"),
  entryTemplate: document.getElementById("entryTemplate"),
  entryCountLabel: document.getElementById("entryCountLabel"),
  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  clearAllBtn: document.getElementById("clearAllBtn"),
  themeToggle: document.getElementById("themeToggle")
};

let entries = loadEntries();
let selectedChannel = "Text";

initialize();

function initialize() {
  applyTheme();
  setDateTimeDefault();
  renderPresets();
  renderAll();

  document.querySelectorAll("[data-channel]").forEach((button) => {
    button.addEventListener("click", () => setChannel(button.dataset.channel));
  });

  els.form.addEventListener("submit", handleSubmit);
  els.resetBtn.addEventListener("click", resetForm);
  els.dateFilter.addEventListener("change", renderAll);
  els.exportBtn.addEventListener("click", exportData);
  els.importFile.addEventListener("change", importData);
  els.clearAllBtn.addEventListener("click", clearAll);
  els.themeToggle.addEventListener("click", toggleTheme);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(console.error);
    });
  }
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not load entries", error);
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function nowLocalDateKey() {
  return toLocalDateKey(new Date());
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function localDateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(key) {
  const date = localDateFromKey(key);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toLocalDateKey(date);
}

function setDateTimeDefault() {
  const now = new Date();
  els.date.value = toLocalDateKey(now);
  els.time.value = toLocalTime(now);
}

function setChannel(channel) {
  selectedChannel = channel;
  document.querySelectorAll("[data-channel]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.channel === channel);
  });
}

function createEntry(overrides = {}) {
  const now = new Date();
  const minutes = Number(overrides.minutes ?? els.durationBand.value);
  const complexity = Number(overrides.complexity ?? els.complexity.value);
  const dateKey = overrides.dateKey || els.date.value || nowLocalDateKey();
  const time = overrides.time || els.time.value || toLocalTime(now);

  return {
    id: overrides.id || crypto.randomUUID(),
    dateKey,
    time,
    person: (overrides.person ?? els.person.value).trim() || "Unlabeled",
    channel: overrides.channel || selectedChannel,
    minutes,
    durationLabel: durationLabels[minutes] || `${minutes} min`,
    complexity,
    direction: overrides.direction || els.direction.value,
    note: (overrides.note ?? els.note.value).trim(),
    load: minutes * complexity,
    createdAt: overrides.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
  };
}

function handleSubmit(event) {
  event.preventDefault();
  const existingId = els.entryId.value || null;
  const entry = createEntry({ id: existingId || undefined, createdAt: existingId ? entries.find(e => e.id === existingId)?.createdAt : undefined });

  if (existingId) {
    entries = entries.map((item) => item.id === existingId ? entry : item);
    showToast("Interaction updated.");
  } else {
    entries.unshift(entry);
    showToast("Interaction saved.");
  }
  saveEntries();
  resetForm();
  renderAll();
}

function addPreset(preset) {
  const entry = createEntry(preset);
  entries.unshift(entry);
  saveEntries();
  renderAll();
  showToast(`${preset.label} saved.`);
}

function resetForm() {
  els.form.reset();
  els.entryId.value = "";
  setChannel("Text");
  setDateTimeDefault();
}

function getEntriesForFilter() {
  const filter = els.dateFilter.value;
  if (filter === "today") return entries.filter((entry) => entry.dateKey === nowLocalDateKey());
  if (filter === "yesterday") return entries.filter((entry) => entry.dateKey === yesterdayKey());
  return [...entries];
}

function getTodayEntries() {
  return entries.filter((entry) => entry.dateKey === nowLocalDateKey());
}

function summarize(list) {
  return list.reduce((acc, entry) => {
    acc.count += 1;
    acc.load += Number(entry.load || 0);
    acc.minutes += Number(entry.minutes || 0);
    return acc;
  }, { count: 0, load: 0, minutes: 0 });
}

function renderAll() {
  renderToday();
  renderBreakdowns();
  renderEntries();
}

function renderToday() {
  const todayKey = nowLocalDateKey();
  const today = getTodayEntries();
  const totals = summarize(today);
  const hoursElapsed = Math.max(1, (new Date().getHours() + new Date().getMinutes() / 60));
  const density = totals.count / hoursElapsed;
  const battery = Math.max(0, Math.round(100 - (totals.load / 8)));

  els.localDateLabel.textContent = formatDateLabel(todayKey);
  els.timezoneLabel.textContent = `Day boundary uses this device’s local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"}`;
  els.todayCount.textContent = totals.count;
  els.todayLoad.textContent = Math.round(totals.load);
  els.todayMinutes.textContent = Math.round(totals.minutes);
  els.todayDensity.textContent = `${density.toFixed(1)}/hr`;
  els.batteryValue.textContent = `${battery}%`;
  els.loadBar.style.width = `${Math.min(100, totals.load / 8)}%`;

  const status = getThresholdStatus(totals.load, density);
  els.thresholdStatus.textContent = status.title;
  els.thresholdNote.textContent = status.note;
}

function getThresholdStatus(load, density) {
  if (load >= 600 || density >= 5) return { title: "High Traffic", note: "Communication load is likely affecting capacity. Consider reducing inputs." };
  if (load >= 350 || density >= 3) return { title: "Active Load", note: "Communication volume is meaningful today. Watch density and recovery." };
  if (load >= 150 || density >= 1.5) return { title: "Moderate", note: "Communication is present but still within a manageable band." };
  return { title: "Quiet", note: "Communication load is currently light." };
}

function renderPresets() {
  els.presetGrid.innerHTML = "";
  presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-btn";
    button.innerHTML = `<strong>${escapeHTML(preset.label)}</strong><span>${escapeHTML(preset.sub)}</span>`;
    button.addEventListener("click", () => addPreset(preset));
    els.presetGrid.appendChild(button);
  });
}

function renderBreakdowns() {
  const today = getTodayEntries();
  renderBarList(els.personBreakdown, groupBy(today, "person"));
  renderBarList(els.channelBreakdown, groupBy(today, "channel"));
}

function groupBy(list, key) {
  const grouped = new Map();
  list.forEach((entry) => {
    const label = entry[key] || "Unknown";
    const current = grouped.get(label) || { label, count: 0, load: 0 };
    current.count += 1;
    current.load += Number(entry.load || 0);
    grouped.set(label, current);
  });
  return [...grouped.values()].sort((a, b) => b.load - a.load);
}

function renderBarList(container, rows) {
  container.innerHTML = "";
  if (!rows.length) {
    container.innerHTML = `<div class="empty">No entries yet today.</div>`;
    return;
  }
  const max = Math.max(...rows.map((row) => row.load), 1);
  rows.slice(0, 8).forEach((row) => {
    const item = document.createElement("div");
    item.className = "bar-row";
    item.innerHTML = `
      <div class="bar-top"><strong>${escapeHTML(row.label)}</strong><span>${row.count} · ${Math.round(row.load)} load</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (row.load / max) * 100)}%"></div></div>
    `;
    container.appendChild(item);
  });
}

function renderEntries() {
  const list = getEntriesForFilter().sort((a, b) => {
    const aStamp = `${a.dateKey || ""}T${a.time || "00:00"}`;
    const bStamp = `${b.dateKey || ""}T${b.time || "00:00"}`;
    return bStamp.localeCompare(aStamp);
  });

  els.entriesList.innerHTML = "";
  els.entryCountLabel.textContent = `${list.length} ${list.length === 1 ? "entry" : "entries"}${els.dateFilter.value === "all" ? "" : " shown"}`;

  if (!list.length) {
    els.entriesList.innerHTML = `<div class="empty">No interactions logged for this view.</div>`;
    return;
  }

  list.forEach((entry) => {
    const node = els.entryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".entry-title").textContent = `${entry.person} · ${entry.channel}`;
    node.querySelector(".entry-meta").textContent = `${entry.dateKey} ${entry.time || ""} · ${entry.direction} · ${entry.durationLabel || `${entry.minutes} min`} · complexity ${entry.complexity}`;
    const note = node.querySelector(".entry-note");
    note.textContent = entry.note || "";
    note.hidden = !entry.note;
    node.querySelector(".score-pill").textContent = Math.round(entry.load || 0);
    node.querySelector(".edit-entry").addEventListener("click", () => editEntry(entry.id));
    node.querySelector(".duplicate-entry").addEventListener("click", () => duplicateEntry(entry.id));
    node.querySelector(".delete-entry").addEventListener("click", () => deleteEntry(entry.id));
    els.entriesList.appendChild(node);
  });
}

function editEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  els.entryId.value = entry.id;
  els.person.value = entry.person;
  setChannel(entry.channel);
  els.durationBand.value = String(entry.minutes);
  els.complexity.value = String(entry.complexity);
  els.direction.value = entry.direction;
  els.date.value = entry.dateKey || nowLocalDateKey();
  els.time.value = entry.time || toLocalTime(new Date());
  els.note.value = entry.note || "";
  document.querySelector(".quick-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function duplicateEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  const clone = { ...entry, id: crypto.randomUUID(), dateKey: nowLocalDateKey(), time: toLocalTime(new Date()), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  entries.unshift(clone);
  saveEntries();
  renderAll();
  showToast("Interaction duplicated for today.");
}

function deleteEntry(id) {
  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  renderAll();
  showToast("Interaction deleted.");
}

function exportData() {
  const payload = {
    app: "Communication Meter",
    exportedAt: new Date().toISOString(),
    localDateAtExport: nowLocalDateKey(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Local",
    entries
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `communication-meter-export-${nowLocalDateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedEntries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(importedEntries)) throw new Error("No entries array found.");
      entries = importedEntries.map(normalizeImportedEntry);
      saveEntries();
      renderAll();
      showToast("Import complete.");
    } catch (error) {
      showToast("Import failed. Check JSON format.");
      console.error(error);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function normalizeImportedEntry(entry) {
  const minutes = Number(entry.minutes || 1);
  const complexity = Number(entry.complexity || 1);
  return {
    id: entry.id || crypto.randomUUID(),
    dateKey: entry.dateKey || nowLocalDateKey(),
    time: entry.time || "",
    person: entry.person || "Unlabeled",
    channel: entry.channel || "Text",
    minutes,
    durationLabel: entry.durationLabel || durationLabels[minutes] || `${minutes} min`,
    complexity,
    direction: entry.direction || "Back-and-forth",
    note: entry.note || "",
    load: Number(entry.load || minutes * complexity),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    localTimezone: entry.localTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Local"
  };
}

function clearAll() {
  const ok = confirm("Clear all Communication Meter entries from this device?");
  if (!ok) return;
  entries = [];
  saveEntries();
  renderAll();
  showToast("All entries cleared.");
}

function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  document.body.classList.toggle("dark", theme === "dark");
  els.themeToggle.textContent = theme === "dark" ? "◐" : "☼";
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  els.themeToggle.textContent = isDark ? "◐" : "☼";
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}
