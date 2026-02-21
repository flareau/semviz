import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3.30.4/+esm";
import elk from "https://esm.sh/cytoscape-elk@2.3.0";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.6/lib/marked.esm.js";
import { SemR } from "./semr.js";

cytoscape.use(elk);

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

let cy = null;
let lastGraphData = null;

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
  graphBox.style.height = "";
  if (cy) {
    cy.destroy();
    cy = null;
  }
  lastGraphData = null;
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

function renderGraph(graphData) {
  if (cy) {
    cy.destroy();
    cy = null;
  }

  graphBox.innerHTML = "";
  cy = cytoscape({
    container: graphBox,
    elements: [...graphData.nodes, ...graphData.edges],
    wheelSensitivity: 0.15,
    style: [
      {
        selector: "node:not(.subgraph)",
        style: {
          label: "data(label)",
          "font-family": "Helvetica, Arial, sans-serif",
          color: "#0b113a",
          "font-size": "12pt",
          "text-wrap": "wrap",
          "text-max-width": 200,
          "text-valign": "center",
          "text-halign": "center",
          "background-opacity": 0,
          "border-width": 0,
          shape: "rectangle",
          width: "label",
          height: "label",
          padding: "6px",
        },
      },
      {
        selector: "node.subgraph",
        style: {
          label: "data(label)",
          "font-family": "Helvetica, Arial, sans-serif",
          "text-valign": "top",
          "text-halign": "left",
          "text-margin-x": 8,
          "text-margin-y": 8,
          "background-color": "#f5f7ff",
          "background-opacity": 1,
          "border-width": 2,
          "border-color": "#6a83fe",
          color: "#4e64ce",
          "font-size": "12pt",
          shape: "round-rectangle",
          padding: "28px",
        },
      },
      {
        selector: "node.dominant",
        style: {
          "font-weight": 700,
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.8,
          "line-color": "#4a4a4a",
          "target-arrow-color": "#4a4a4a",
          "target-arrow-shape": "triangle",
          "curve-style": "straight",
          label: "data(label)",
          "font-family": "Helvetica, Arial, sans-serif",
          color: "#4a4a4a",
          "font-size": "8pt",
          "text-margin-y": -8,
        },
      },
    ],
    layout: {
      name: "elk",
      nodeDimensionsIncludeLabels: true,
      animate: false,
      fit: true,
      elk: {
        algorithm: "layered",
        "elk.direction": "DOWN",
        "elk.separateConnectedComponents": "true",
        "elk.spacing.nodeNode": "44",
        "elk.spacing.edgeNode": "28",
        "elk.spacing.edgeEdge": "20",
        "elk.spacing.labelNode": "14",
        "elk.spacing.labelEdge": "10",
        "elk.layered.spacing.nodeNodeBetweenLayers": "72",
        "elk.layered.spacing.edgeNodeBetweenLayers": "30",
        "elk.layered.unnecessaryBendpoints": "false",
        "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
        "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        "elk.edgeRouting": "SPLINES",
      },
      padding: 36,
    },
  });

  cy.one("layoutstop", () => {
    const bounds = cy.elements().boundingBox();
    if (!Number.isFinite(bounds.h) || bounds.h <= 0) {
      return;
    }

    // Expand the viewport with the graph so text stays readable instead of over-shrinking.
    const targetHeight = Math.max(420, Math.ceil(bounds.h + 120));
    graphBox.style.height = `${targetHeight}px`;
    cy.resize();
    cy.fit(cy.elements(), 48);
  });
}

async function downloadPng() {
  if (!cy) {
    return;
  }
  const dataUrl = cy.png({ full: true, scale: 2, bg: "#ffffff" });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  download("graph.png", "image/png", buffer);
}

function downloadJson() {
  if (!lastGraphData) {
    return;
  }
  const payload = JSON.stringify(lastGraphData, null, 2);
  download("graph.cytoscape.json", "application/json;charset=utf-8", payload);
}


downloadButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!cy || !lastGraphData) {
      return;
    }
    try {
      const format = button.dataset.format;
      if (format === "png") {
        await downloadPng();
        return;
      }
      if (format === "json") {
        downloadJson();
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

  let graphData;
  let clean;
  try {
    clean = semr.toString();
    graphData = semr.cytoscape(graphOptions());
  } catch {
    showError("Erreur dans la génération du graphe.");
    return;
  }

  normalizedBox.textContent = clean;

  try {
    renderGraph(graphData);
    lastGraphData = graphData;
    setDownloadsEnabled(true);
  } catch {
    showError("Erreur dans la génération du graphe.");
  }
});
