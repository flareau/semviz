import { Graphviz } from "https://cdn.jsdelivr.net/npm/@hpcc-js/wasm@2.20.0/+esm";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.6/lib/marked.esm.js";
import { SemR } from "./semr.js";

const form = document.querySelector("#convert-form");
const formulaInput = document.querySelector("#formula");
const dominanceInput = document.querySelector("#opt-dominance");
const spacesInput = document.querySelector("#opt-spaces");
const quotesInput = document.querySelector("#opt-quotes");
const showLexnumInput = document.querySelector("#opt-lexnum");
const copyNormalizedButton = document.querySelector("#copy-normalized");
const errorBox = document.querySelector("#error");
const normalizedBox = document.querySelector("#normalized");
const graphBox = document.querySelector("#graph");
const downloadButtons = document.querySelectorAll(".download-btn");
const instructionsContent = document.querySelector("#instructions-content");

const graphvizReady = Graphviz.load();
let lastDot = "";
let lastSvg = "";

async function loadInstructions() {
  if (!instructionsContent) {
    return;
  }
  try {
    const response = await fetch("./instructions.md");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const markdown = await response.text();
    instructionsContent.innerHTML = marked.parse(markdown);
  } catch {
    instructionsContent.textContent = "Impossible de charger les instructions.";
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function resetOutputs() {
  normalizedBox.textContent = "";
  graphBox.innerHTML = "";
  lastDot = "";
  lastSvg = "";
  setDownloadsEnabled(false);
}

function sanitizeFormula(input) {
  const withoutComment = input.split("//")[0];
  const withoutPipe = withoutComment.split("|")[0];
  return withoutPipe.split("=").at(-1);
}

function graphOptions() {
  return {
    dominance: Boolean(dominanceInput?.checked),
    spaces: Boolean(spacesInput?.checked),
    quotes: Boolean(quotesInput?.checked),
    showLexnum: Boolean(showLexnumInput?.checked),
  };
}

function setDownloadsEnabled(enabled) {
  downloadButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

function download(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.dispatchEvent(new MouseEvent("click"));
  link.remove();
  // Delay cleanup so stricter browsers can resolve the download navigation.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyNormalizedFormula() {
  const text = normalizedBox.textContent ?? "";
  if (!text.trim()) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const fallback = document.createElement("textarea");
  fallback.value = text;
  fallback.setAttribute("readonly", "");
  fallback.style.position = "fixed";
  fallback.style.opacity = "0";
  document.body.append(fallback);
  fallback.select();
  document.execCommand("copy");
  fallback.remove();
}

function svgDimensions(svg) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgEl = doc.documentElement;
  const width = Number.parseFloat(svgEl.getAttribute("width"));
  const height = Number.parseFloat(svgEl.getAttribute("height"));
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width, height };
  }
  const viewBox = svgEl.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map((p) => Number.parseFloat(p));
    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      return { width: parts[2], height: parts[3] };
    }
  }
  return { width: 1200, height: 900 };
}

async function svgToPngBlob(svg) {
  const { width, height } = svgDimensions(svg);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(width));
    canvas.height = Math.max(1, Math.ceil(height));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PNG conversion failed"));
        }
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}


async function downloadPng() {
  const blob = await svgToPngBlob(lastSvg);
  const buffer = await blob.arrayBuffer();
  download("graph.png", "image/png", buffer);
}


function downloadDot() {
  download("graph.dot", "text/plain;charset=utf-8", lastDot);
}


downloadButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!lastSvg || !lastDot) {
      return;
    }
    try {
      const format = button.dataset.format;
      if (format === "png") {
        await downloadPng();
        return;
      }
      if (format === "dot") {
        downloadDot();
      }
    } catch {
      showError("Erreur dans le téléchargement du fichier.");
    }
  });
});

if (copyNormalizedButton) {
  copyNormalizedButton.addEventListener("click", async () => {
    try {
      await copyNormalizedFormula();
    } catch {
      showError("Impossible de copier la formule.");
    }
  });
}

void loadInstructions();

[dominanceInput, spacesInput, quotesInput, showLexnumInput].forEach((input) => {
  if (!input) {
    return;
  }
  input.addEventListener("change", () => {
    if (!formulaInput.value.trim()) {
      return;
    }
    form.requestSubmit();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  resetOutputs();

  let semr;
  try {
    const formula = sanitizeFormula(formulaInput.value);
    semr = new SemR(formula);
  } catch {
    showError("Il y a une erreur dans la formule.");
    return;
  }

  let dot;
  let clean;
  try {
    clean = semr.toString();
    dot = semr.graphviz(graphOptions());
  } catch {
    showError("Erreur dans la génération du graphe.");
    return;
  }

  normalizedBox.textContent = clean;

  try {
    const graphviz = await graphvizReady;
    const svg = await graphviz.dot(dot);
    graphBox.innerHTML = svg;
    lastDot = dot;
    lastSvg = svg;
    setDownloadsEnabled(true);
  } catch {
    showError("Erreur dans la génération du graphe.");
  }
});
