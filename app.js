const API_URL = "https://script.google.com/macros/s/AKfycbxifDCyKqY9ADKEeXNUo68YyMpn_VRBoENElTlrJxiB52YbTQIMLDMubpq-oI1g_zFgeA/exec";
const config = REGISTRATION_CONFIG;
const byId = (id) => document.getElementById(id);
const form = byId("registrationForm");
const baseFields = ["fullName", "phone", "dateOfBirth", "ghanaCard", "location", "employmentStatus"];
const workFields = ["occupation", "workSector", "incomeRange", "workNearHome"];
const allNames = [...baseFields, "employmentStatusOther", "currentlyWorking", ...workFields, "workSectorOther", "workLocation", "signature"];
const fields = Object.fromEntries(allNames.map((name) => [name, byId(name)]));
const canvas = fields.signature;
const context = canvas.getContext("2d");
let strokes = [];
let activePointer = null;
let submitting = false;
let serviceReady = false;
let requestId = crypto.randomUUID();

function populateSelect(id, options) {
  byId(id).replaceChildren(new Option("Select an option", ""), ...options.map((value) => new Option(value, value)));
}
populateSelect("employmentStatus", config.employmentStatuses);
populateSelect("workSector", config.sectors);
populateSelect("incomeRange", config.incomeRanges);
byId("consentSummary").textContent = config.consentSummary;
byId("consentDeclaration").textContent = config.consentDeclaration;
const introduction = document.createElement("p");
introduction.textContent = config.consentIntroduction;
byId("consentNotice").append(introduction);
config.consentSections.forEach(([title, text]) => {
  const heading = document.createElement("h3"); heading.textContent = title;
  const paragraph = document.createElement("p"); paragraph.textContent = text;
  byId("consentNotice").append(heading, paragraph);
});
function normalizePhone(value) {
  const cleaned = String(value || "").replace(/[\s()-]/g, "");
  if (/^0\d{9}$/.test(cleaned)) return "+233" + cleaned.slice(1);
  if (/^233\d{9}$/.test(cleaned)) return "+" + cleaned;
  return cleaned;
}
function formatPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("233")) digits = "0" + digits.slice(3);
  digits = digits.slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(" ");
}
function normalizeGhanaCard(value) {
  const compact = value.toUpperCase().replace(/[\s-]/g, "");
  const digits = (compact.startsWith("GHA") ? compact.slice(3) : compact).replace(/\D/g, "").slice(0, 10);
  if (!digits) return compact.startsWith("GHA") ? "GHA" : "";
  return "GHA-" + digits.slice(0, 9) + (digits.length > 9 ? "-" + digits.slice(9) : "");
}
function isWorking() {
  return ["Employed", "Self-employed"].includes(fields.employmentStatus.value) ||
    (["Student", "Other"].includes(fields.employmentStatus.value) && fields.currentlyWorking.value === "Yes");
}
function requiredFields() {
  const names = [...baseFields];
  if (fields.employmentStatus.value === "Other") names.push("employmentStatusOther");
  if (["Student", "Other"].includes(fields.employmentStatus.value)) names.push("currentlyWorking");
  if (isWorking()) {
    names.push(...workFields);
    if (fields.workSector.value === "Other") names.push("workSectorOther");
    if (fields.workNearHome.value === "No") names.push("workLocation");
  }
  return [...names, "signature"];
}
function setError(name, message) {
  fields[name].setAttribute("aria-invalid", message ? "true" : "false");
  fields[name].classList.toggle("input-error", Boolean(message));
  byId(name + "Error").textContent = message;
}
function fieldError(name) {
  const value = fields[name].value?.trim() || "";
  if (name === "signature") return strokes.length ? "" : "Draw the participant's signature or mark before submitting.";
  if (name === "phone") return /^\+233\d{9}$/.test(normalizePhone(value)) ? "" : "Enter a valid 10-digit Ghana phone number.";
  if (name === "ghanaCard") return /^GHA-\d{9}-\d$/.test(value) ? "" : "Enter a valid Ghana Card number: GHA-XXXXXXXXX-X.";
  if (name === "dateOfBirth") {
    const date = new Date(value + "T00:00:00Z");
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(date) && date.toISOString().slice(0, 10) === value && value < new Date().toISOString().slice(0, 10) ? "" : "Select a valid date of birth in the past.";
  }
  if (name === "employmentStatus") return config.employmentStatuses.includes(value) ? "" : "Select employment status.";
  if (name === "workSector") return config.sectors.includes(value) ? "" : "Select a work sector.";
  if (name === "incomeRange") return config.incomeRanges.includes(value) ? "" : "Select a monthly salary / income range.";
  if (["workNearHome", "currentlyWorking"].includes(name)) return ["Yes", "No"].includes(value) ? "" : "Select Yes or No.";
  return value.length >= 2 && value.length <= 120 ? "" : "Enter between 2 and 120 characters.";
}
function updateProgress() {
  const names = requiredFields(); const completed = names.filter((name) => !fieldError(name)).length;
  byId("progressText").textContent = `${completed} of ${names.length} fields completed`;
  byId("progressBar").style.width = `${completed / names.length * 100}%`;
}
function updateConditionalFields() {
  byId("employmentStatusOtherField").hidden = fields.employmentStatus.value !== "Other";
  byId("currentlyWorkingField").hidden = !["Student", "Other"].includes(fields.employmentStatus.value);
  byId("workDetails").hidden = !isWorking();
  byId("workSectorOtherField").hidden = fields.workSector.value !== "Other";
  byId("workLocationField").hidden = fields.workNearHome.value !== "No";
  const required = requiredFields();
  allNames.filter((name) => name !== "signature").forEach((name) => {
    fields[name].required = required.includes(name); fields[name].disabled = submitting || !required.includes(name);
    if (!required.includes(name)) setError(name, "");
  });
  updateProgress();
}
function clearStatus() { byId("statusMessage").className = "status-message"; byId("statusMessage").textContent = ""; }
function showError(message) { byId("statusMessage").className = "status-message error"; byId("statusMessage").textContent = message; }
// Fixed internal coordinates preserve signatures during resize and orientation changes.
function drawSignature() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 4; context.lineCap = "round"; context.lineJoin = "round"; context.strokeStyle = "#172033";
  strokes.forEach((stroke) => {
    context.beginPath(); context.moveTo(stroke[0][0], stroke[0][1]);
    if (stroke.length === 1) context.lineTo(stroke[0][0] + 0.1, stroke[0][1]);
    else stroke.slice(1).forEach(([x, y]) => context.lineTo(x, y));
    context.stroke();
  });
}
function clearSignature() {
  if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
  strokes = []; activePointer = null; drawSignature(); setError("signature", ""); updateProgress();
}
function point(event) {
  const box = canvas.getBoundingClientRect();
  return [Math.round(Math.max(0, Math.min(1000, (event.clientX - box.left) / box.width * 1000))),
    Math.round(Math.max(0, Math.min(360, (event.clientY - box.top) / box.height * 360)))];
}
canvas.addEventListener("pointerdown", (event) => {
  if (submitting || !event.isPrimary || event.button !== 0 || activePointer !== null) return;
  if (strokes.length >= 100) { setError("signature", "Clear the signature and sign again."); return; }
  event.preventDefault(); activePointer = event.pointerId; canvas.setPointerCapture(event.pointerId);
  strokes.push([point(event)]); setError("signature", ""); drawSignature(); updateProgress();
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId !== activePointer) return;
  event.preventDefault();
  if (strokes.reduce((total, stroke) => total + stroke.length, 0) < 5000) strokes[strokes.length - 1].push(point(event));
  drawSignature();
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => canvas.addEventListener(type, (event) => {
  if (event.pointerId === activePointer) activePointer = null;
}));
byId("clearSignature").addEventListener("click", clearSignature);
form.addEventListener("input", (event) => {
  if (event.target.id === "phone") fields.phone.value = formatPhone(fields.phone.value);
  if (event.target.id === "ghanaCard") fields.ghanaCard.value = normalizeGhanaCard(fields.ghanaCard.value);
  if (event.target.id === "fullName") {
    if (strokes.length) clearSignature();
    byId("signerName").textContent = fields.fullName.value.trim() || "Enter the participant's full name above";
  }
  if (allNames.includes(event.target.id)) setError(event.target.id, "");
  updateProgress();
});
form.addEventListener("change", (event) => {
  if (event.target.id === "employmentStatus") ["employmentStatusOther", "currentlyWorking", ...workFields, "workSectorOther", "workLocation"].forEach((name) => { fields[name].value = ""; });
  if (event.target.id === "currentlyWorking" && !isWorking()) [...workFields, "workSectorOther", "workLocation"].forEach((name) => { fields[name].value = ""; });
  if (event.target.id === "workSector" && fields.workSector.value !== "Other") fields.workSectorOther.value = "";
  if (event.target.id === "workNearHome" && fields.workNearHome.value !== "No") fields.workLocation.value = "";
  updateConditionalFields();
});
function setSubmitting(value) {
  submitting = value;
  form.querySelectorAll("input, select, button").forEach((field) => { field.disabled = value; });
  canvas.setAttribute("aria-disabled", String(value));
  byId("submitButtonText").textContent = value ? "Submitting…" : "Agree & Submit Registration";
  byId("submitSpinner").classList.toggle("visible", value); updateConditionalFields();
}
function resetForm() {
  form.reset(); clearSignature(); requestId = crypto.randomUUID();
  allNames.forEach((name) => setError(name, ""));
  byId("signerName").textContent = "Enter the participant's full name above";
  byId("fullConsent").open = false; updateConditionalFields();
}
byId("registerAnotherButton").addEventListener("click", () => {
  resetForm(); byId("successCard").hidden = true; form.classList.remove("submitted"); clearStatus(); fields.fullName.focus();
});
const yesterday = new Date(); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
fields.dateOfBirth.max = yesterday.toISOString().slice(0, 10);
async function checkService() {
  serviceReady = false;
  const response = await fetch(API_URL, { signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!response.ok) throw new Error("The registration service is unavailable. Please try again.");
  const result = await response.json();
  if (!result.success || result.apiVersion !== config.apiVersion || result.consentVersion !== config.consentVersion) throw new Error("Registration is awaiting the updated consent service. Please contact the registration administrator.");
  serviceReady = true;
}
form.addEventListener("submit", async (event) => {
  event.preventDefault(); if (submitting || form.classList.contains("submitted")) return;
  clearStatus(); const names = requiredFields(); names.forEach((name) => setError(name, fieldError(name)));
  const invalid = names.find((name) => fieldError(name)); if (invalid) { fields[invalid].focus(); return; }
  const working = isWorking();
  const payload = {
    requestId, fullName: fields.fullName.value.trim(), phone: normalizePhone(fields.phone.value),
    dateOfBirth: fields.dateOfBirth.value, ghanaCard: normalizeGhanaCard(fields.ghanaCard.value),
    location: fields.location.value.trim(),
    employmentStatus: fields.employmentStatus.value, employmentStatusOther: fields.employmentStatusOther.value.trim(), currentlyWorking: working,
    occupation: working ? fields.occupation.value.trim() : "", workSector: working ? fields.workSector.value : "",
    workSectorOther: working ? fields.workSectorOther.value.trim() : "", incomeRange: working ? fields.incomeRange.value : "",
    workNearHome: working ? fields.workNearHome.value : "", workLocation: working && fields.workNearHome.value === "No" ? fields.workLocation.value.trim() : "",
    consent: true, consentVersion: config.consentVersion, signature: { strokes }
  };
  setSubmitting(true);
  try {
    // Old deployments must not silently accept a registration while dropping its signature.
    if (!serviceReady) await checkService();
    const response = await fetch(API_URL, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(60000)
    });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json")) throw new Error("The registration service is unavailable. Please try again.");
    const result = await response.json();
    if (!result.success) {
      if (result.code === "DUPLICATE") throw new Error("This phone number or Ghana Card is already registered. Check the details before trying again.");
      if (result.code === "REQUEST_CHANGED") requestId = crypto.randomUUID();
      throw new Error(result.message || "Unable to save the registration. Please try again.");
    }
    if (result.apiVersion !== config.apiVersion || !result.signatureSaved || !result.recordId) throw new Error("The service did not confirm signature storage. Contact the registration administrator before retrying.");
    resetForm(); form.classList.add("submitted"); byId("successCard").hidden = false; byId("recordId").textContent = result.recordId;
    byId("successCard").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  } catch (error) {
    showError(error.name === "TimeoutError" ? "The request timed out. Your details and signature are still here. Retry to check whether it was saved." : error.message || "Unable to submit. Check your connection and try again.");
  } finally { setSubmitting(false); }
});
updateConditionalFields();
checkService().catch((error) => showError(error.message));
