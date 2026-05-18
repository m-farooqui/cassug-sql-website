const API_BASE = "http://localhost:8000";

let datasets = [];
let currentDataset = null;
let currentRows = [];
let currentColumns = [];

const datasetSelect = document.getElementById("datasetSelect");
const refreshDatasetsBtn = document.getElementById("refreshDatasetsBtn");
const loadDatasetBtn = document.getElementById("loadDatasetBtn");

const datasetDescription = document.getElementById("datasetDescription");
const datasetStatus = document.getElementById("datasetStatus");

const chartTypeSelect = document.getElementById("chartTypeSelect");
const xColumnSelect = document.getElementById("xColumnSelect");
const yColumnSelect = document.getElementById("yColumnSelect");
const colorColumnSelect = document.getElementById("colorColumnSelect");
const aggregationSelect = document.getElementById("aggregationSelect");
const limitInput = document.getElementById("limitInput");

const buildChartBtn = document.getElementById("buildChartBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const clearChartBtn = document.getElementById("clearChartBtn");

const chartMessage = document.getElementById("chartMessage");
const chartOutput = document.getElementById("chartOutput");
const dataPreview = document.getElementById("dataPreview");
const practiceIdeas = document.getElementById("practiceIdeas");


const DATASET_VISUAL_IDEAS = {
  nyc_shootings: [
    "Bar chart: incidents by borough",
    "Line chart: incidents by year",
    "Bar chart: top 10 precincts",
    "Map-style practice: latitude and longitude exploration",
    "Table: incidents by borough and location type"
  ],
  crime_reports: [
    "Bar chart: reports by crime type",
    "Bar chart: reports by neighborhood",
    "Line chart: reports by report date",
    "Table: top reporting areas",
    "Filter practice: neighborhood and crime type"
  ],
  consumer_complaints: [
    "Bar chart: complaints by product",
    "Bar chart: top companies by complaints",
    "Bar chart: complaints by state",
    "Line chart: complaints over time",
    "Table: issues by product"
  ],
  finance_economics: [
    "Line chart: close price over time",
    "Line chart: inflation rate over time",
    "Line chart: unemployment rate over time",
    "Scatter plot: inflation vs interest rate",
    "KPI card: latest GDP growth"
  ],
  heart_health: [
    "Bar chart: records by age category",
    "Bar chart: heart attack status",
    "Box plot: BMI by general health",
    "Histogram: sleep hours",
    "Table: health indicators by state"
  ],
  pharma_sales_hourly: [
    "Line chart: sales by month",
    "Bar chart: total sales by drug category",
    "Heatmap: hour by weekday",
    "Line chart: sales by year",
    "Area chart: trend by selected category"
  ],
  student_grades: [
    "Bar chart: average grade by class type",
    "Bar chart: average grade by grade level",
    "Line chart: average grade by school year",
    "Box plot: grade percentage by class type",
    "Table: program flags and average grade"
  ],
  education_career_success: [
    "Bar chart: average salary by field of study",
    "Scatter plot: university GPA vs starting salary",
    "Bar chart: job offers by internships completed",
    "Box plot: salary by job level",
    "KPI card: average starting salary"
  ],
  online_retail: [
    "Bar chart: revenue by customer",
    "Histogram: unit price",
    "Histogram: quantity",
    "Table: top invoices by revenue",
    "KPI card: total revenue"
  ],
  adidas_sales: [
    "Bar chart: total sales by retailer",
    "Bar chart: total sales by region",
    "Bar chart: operating profit by product",
    "Line chart: sales by invoice date",
    "Pie chart: sales by sales method"
  ]
};


const DATASET_EXAMPLES = {
  nyc_shootings: {
    chartType: "bar",
    xCandidates: ["BORO", "boro"],
    yCandidates: [],
    aggregation: "count"
  },
  crime_reports: {
    chartType: "bar",
    xCandidates: ["Crime", "crime", "CRIME"],
    yCandidates: [],
    aggregation: "count"
  },
  consumer_complaints: {
    chartType: "bar",
    xCandidates: ["Product", "product", "PRODUCT"],
    yCandidates: [],
    aggregation: "count"
  },
  finance_economics: {
    chartType: "line",
    xCandidates: ["Date", "date", "DATE"],
    yCandidates: ["Close Price", "close_price", "CLOSE_PRICE", "Close"],
    aggregation: "avg"
  },
  heart_health: {
    chartType: "bar",
    xCandidates: ["GeneralHealth", "GENERALHEALTH", "generalhealth", "General Health"],
    yCandidates: [],
    aggregation: "count"
  },
  pharma_sales_hourly: {
    chartType: "line",
    xCandidates: ["month", "Month", "MONTH"],
    yCandidates: ["N02BE", "n02be"],
    aggregation: "sum"
  },
  student_grades: {
    chartType: "bar",
    xCandidates: ["classType", "ClassType", "CLASSTYPE", "classtype"],
    yCandidates: ["gradePercentage", "GradePercentage", "GRADEPERCENTAGE", "gradepercentage"],
    aggregation: "avg"
  },
  education_career_success: {
    chartType: "bar",
    xCandidates: ["Field_of_Study", "FIELD_OF_STUDY", "field_of_study", "Field of Study"],
    yCandidates: ["Starting_Salary", "STARTING_SALARY", "starting_salary", "Starting Salary"],
    aggregation: "avg"
  },
  online_retail: {
    chartType: "bar",
    xCandidates: ["CustomerID", "CUSTOMERID", "customerid", "Customer ID"],
    yCandidates: ["UnitPrice", "UNITPRICE", "unitprice", "Unit Price"],
    aggregation: "sum"
  },
  adidas_sales: {
    chartType: "bar",
    xCandidates: ["Retailer", "retailer", "RETAILER"],
    yCandidates: ["Total Sales", "TOTAL_SALES", "total_sales", "Total_Sales"],
    aggregation: "sum"
  }
};


function groupDatasetsByDomain(datasetList) {
  const grouped = {};

  datasetList.forEach((dataset) => {
    const domain = dataset.domain || "Other";

    if (!grouped[domain]) {
      grouped[domain] = [];
    }

    grouped[domain].push(dataset);
  });

  return grouped;
}


async function loadDatasets() {
  datasetSelect.innerHTML = "";
  datasetDescription.textContent = "Loading datasets...";

  try {
    const response = await fetch(`${API_BASE}/api/datasets`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load datasets.");
    }

    datasets = data.datasets || [];

    if (datasets.length === 0) {
      datasetSelect.innerHTML = `<option value="">No datasets available</option>`;
      datasetDescription.textContent = "No datasets are configured yet.";
      return;
    }

    const grouped = groupDatasetsByDomain(datasets);

    Object.keys(grouped).sort().forEach((domain) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = domain;

      grouped[domain].forEach((dataset) => {
        const option = document.createElement("option");
        option.value = dataset.id;
        option.textContent = dataset.name;
        optgroup.appendChild(option);
      });

      datasetSelect.appendChild(optgroup);
    });

    updateDatasetDescription();

  } catch (error) {
    datasetDescription.textContent = `Error loading datasets: ${error.message}`;
  }
}


function getSelectedDataset() {
  const selectedId = datasetSelect.value;
  return datasets.find((dataset) => dataset.id === selectedId);
}


function updateDatasetDescription() {
  const selectedDataset = getSelectedDataset();

  if (!selectedDataset) {
    datasetDescription.textContent = "Choose a dataset to view its description.";
    return;
  }

  datasetDescription.textContent = `${selectedDataset.domain}: ${selectedDataset.description}`;
}


async function loadSelectedDataset() {
  const selectedDataset = getSelectedDataset();

  if (!selectedDataset) {
    datasetStatus.textContent = "Please choose a dataset first.";
    return;
  }

  if (!selectedDataset.frontend_csv_path) {
    datasetStatus.textContent = "This dataset does not have a CSV path configured.";
    return;
  }

  const datasetUrl = `/data/datasets/${selectedDataset.frontend_csv_path}`;

  datasetStatus.textContent = `Loading ${selectedDataset.name}...`;
  chartMessage.textContent = `Fetching ${datasetUrl}`;

  try {
    const response = await fetch(datasetUrl);

    if (!response.ok) {
      throw new Error(`Could not fetch CSV. Status: ${response.status}`);
    }

    const csvText = await response.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (parsed.errors && parsed.errors.length > 0) {
      console.warn(parsed.errors);
    }

    currentDataset = selectedDataset;
    currentRows = parsed.data || [];
    currentColumns = parsed.meta.fields || [];

    datasetStatus.textContent = `${selectedDataset.name} loaded. Rows: ${currentRows.length}. Columns: ${currentColumns.length}.`;

    populateColumnDropdowns();
    renderDataPreview();
    renderPracticeIdeas();
    loadSuggestedVisual();

  } catch (error) {
    datasetStatus.textContent = `Error loading dataset: ${error.message}`;
  }
}


function populateColumnDropdowns() {
  xColumnSelect.innerHTML = "";
  yColumnSelect.innerHTML = "";
  colorColumnSelect.innerHTML = `<option value="">None</option>`;

  currentColumns.forEach((column) => {
    const xOption = document.createElement("option");
    xOption.value = column;
    xOption.textContent = column;
    xColumnSelect.appendChild(xOption);

    const yOption = document.createElement("option");
    yOption.value = column;
    yOption.textContent = column;
    yColumnSelect.appendChild(yOption);

    const colorOption = document.createElement("option");
    colorOption.value = column;
    colorOption.textContent = column;
    colorColumnSelect.appendChild(colorOption);
  });
}


function renderDataPreview(maxRows = 10) {
  if (!currentRows.length) {
    dataPreview.innerHTML = "<p>No data loaded.</p>";
    return;
  }

  const rows = currentRows.slice(0, maxRows);
  const columns = currentColumns.slice(0, 12);

  let html = `<table class="lab-results-table"><thead><tr>`;

  columns.forEach((column) => {
    html += `<th>${escapeHtml(column)}</th>`;
  });

  html += `</tr></thead><tbody>`;

  rows.forEach((row) => {
    html += `<tr>`;

    columns.forEach((column) => {
      html += `<td>${escapeHtml(row[column])}</td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;

  if (currentColumns.length > 12) {
    html += `<p class="lab-small-note">Showing first 12 columns only.</p>`;
  }

  dataPreview.innerHTML = html;
}


function renderPracticeIdeas() {
  const ideas = DATASET_VISUAL_IDEAS[currentDataset?.id] || [
    "Create a bar chart using a category column.",
    "Create a line chart using a date column.",
    "Create a KPI card using a numeric column.",
    "Create a table summary.",
    "Try different aggregations: count, sum, average, min, max."
  ];

  let html = `<ol class="lab-question-list">`;

  ideas.forEach((idea) => {
    html += `<li>${escapeHtml(idea)}</li>`;
  });

  html += `</ol>`;

  practiceIdeas.innerHTML = html;
}


function loadSuggestedVisual() {
  if (!currentDataset) {
    return;
  }

  const example = DATASET_EXAMPLES[currentDataset.id];

  if (!example) {
    return;
  }

  chartTypeSelect.value = example.chartType;
  aggregationSelect.value = example.aggregation;

  const xColumn = findFirstMatchingColumn(example.xCandidates);
  const yColumn = findFirstMatchingColumn(example.yCandidates);

  if (xColumn) {
    xColumnSelect.value = xColumn;
  }

  if (yColumn) {
    yColumnSelect.value = yColumn;
  }

  chartMessage.textContent = "Suggested visual loaded. Click Build Visual.";
}


function findFirstMatchingColumn(candidates) {
  if (!candidates || candidates.length === 0) {
    return "";
  }

  const normalizedColumns = currentColumns.map((column) => ({
    original: column,
    normalized: normalizeColumnName(column)
  }));

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeColumnName(candidate);

    const found = normalizedColumns.find((column) => column.normalized === normalizedCandidate);

    if (found) {
      return found.original;
    }
  }

  return "";
}


function normalizeColumnName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


function buildVisual() {
  if (!currentRows.length) {
    chartMessage.textContent = "Load a dataset first.";
    return;
  }

  const chartType = chartTypeSelect.value;
  const xColumn = xColumnSelect.value;
  const yColumn = yColumnSelect.value;
  const colorColumn = colorColumnSelect.value;
  const aggregation = aggregationSelect.value;
  const limit = Number(limitInput.value || 20);

  try {
    if (chartType === "kpi") {
      buildKpi(yColumn, aggregation);
      return;
    }

    if (chartType === "table") {
      buildSummaryTable(xColumn, yColumn, aggregation, limit);
      return;
    }

    if (chartType === "histogram") {
      buildHistogram(xColumn);
      return;
    }

    if (chartType === "box") {
      buildBoxPlot(xColumn, yColumn);
      return;
    }

    if (chartType === "scatter") {
      buildScatter(xColumn, yColumn);
      return;
    }

    if (chartType === "bubble") {
      buildBubble(xColumn, yColumn, colorColumn);
      return;
    }

    if (chartType === "heatmap") {
      buildHeatmap(xColumn, colorColumn || yColumn);
      return;
    }

    const aggregated = aggregateRows(xColumn, yColumn, aggregation, limit);

    if (chartType === "bar") {
      buildBarChart(aggregated, xColumn, yColumn, aggregation);
    } else if (chartType === "horizontal_bar") {
      buildHorizontalBarChart(aggregated, xColumn, yColumn, aggregation);
    } else if (chartType === "line") {
      buildLineChart(aggregated, xColumn, yColumn, aggregation);
    } else if (chartType === "area") {
      buildAreaChart(aggregated, xColumn, yColumn, aggregation);
    } else if (chartType === "pie") {
      buildPieChart(aggregated, xColumn, yColumn, aggregation, false);
    } else if (chartType === "donut") {
      buildPieChart(aggregated, xColumn, yColumn, aggregation, true);
    }

  } catch (error) {
    chartMessage.textContent = `Error building visual: ${error.message}`;
  }
}


function aggregateRows(xColumn, yColumn, aggregation, limit = 20) {
  const grouped = new Map();

  currentRows.forEach((row) => {
    const key = cleanValue(row[xColumn]);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(row);
  });

  let result = [];

  grouped.forEach((rows, key) => {
    let value;

    if (aggregation === "count") {
      value = rows.length;
    } else {
      const numericValues = rows
        .map((row) => toNumber(row[yColumn]))
        .filter((value) => Number.isFinite(value));

      if (numericValues.length === 0) {
        value = 0;
      } else if (aggregation === "sum") {
        value = numericValues.reduce((a, b) => a + b, 0);
      } else if (aggregation === "avg") {
        value = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      } else if (aggregation === "min") {
        value = Math.min(...numericValues);
      } else if (aggregation === "max") {
        value = Math.max(...numericValues);
      }
    }

    result.push({
      label: key,
      value
    });
  });

  result = result
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  return result;
}


function buildBarChart(data, xColumn, yColumn, aggregation) {
  const trace = {
    x: data.map((row) => row.label),
    y: data.map((row) => row.value),
    type: "bar"
  };

  drawPlot([trace], `${formatAggregationLabel(aggregation, yColumn)} by ${xColumn}`, xColumn, formatAggregationLabel(aggregation, yColumn));
}


function buildHorizontalBarChart(data, xColumn, yColumn, aggregation) {
  const trace = {
    x: data.map((row) => row.value),
    y: data.map((row) => row.label),
    type: "bar",
    orientation: "h"
  };

  drawPlot([trace], `${formatAggregationLabel(aggregation, yColumn)} by ${xColumn}`, formatAggregationLabel(aggregation, yColumn), xColumn);
}


function buildLineChart(data, xColumn, yColumn, aggregation) {
  const sorted = [...data].sort((a, b) => String(a.label).localeCompare(String(b.label)));

  const trace = {
    x: sorted.map((row) => row.label),
    y: sorted.map((row) => row.value),
    type: "scatter",
    mode: "lines+markers"
  };

  drawPlot([trace], `${formatAggregationLabel(aggregation, yColumn)} by ${xColumn}`, xColumn, formatAggregationLabel(aggregation, yColumn));
}


function buildAreaChart(data, xColumn, yColumn, aggregation) {
  const sorted = [...data].sort((a, b) => String(a.label).localeCompare(String(b.label)));

  const trace = {
    x: sorted.map((row) => row.label),
    y: sorted.map((row) => row.value),
    type: "scatter",
    mode: "lines",
    fill: "tozeroy"
  };

  drawPlot([trace], `${formatAggregationLabel(aggregation, yColumn)} by ${xColumn}`, xColumn, formatAggregationLabel(aggregation, yColumn));
}


function buildPieChart(data, xColumn, yColumn, aggregation, donut = false) {
  const trace = {
    labels: data.map((row) => row.label),
    values: data.map((row) => row.value),
    type: "pie",
    hole: donut ? 0.45 : 0
  };

  drawPlot([trace], `${formatAggregationLabel(aggregation, yColumn)} by ${xColumn}`, "", "");
}


function buildScatter(xColumn, yColumn) {
  const points = currentRows
    .map((row) => ({
      x: toNumber(row[xColumn]),
      y: toNumber(row[yColumn])
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice(0, 5000);

  const trace = {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    type: "scatter",
    mode: "markers"
  };

  drawPlot([trace], `${yColumn} vs ${xColumn}`, xColumn, yColumn);
}


function buildBubble(xColumn, yColumn, colorColumn) {
  const points = currentRows
    .map((row) => ({
      x: toNumber(row[xColumn]),
      y: toNumber(row[yColumn]),
      label: colorColumn ? cleanValue(row[colorColumn]) : ""
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice(0, 3000);

  const trace = {
    x: points.map((point) => point.x),
    y: points.map((point) => point.y),
    text: points.map((point) => point.label),
    mode: "markers",
    type: "scatter",
    marker: {
      size: 10
    }
  };

  drawPlot([trace], `${yColumn} vs ${xColumn}`, xColumn, yColumn);
}


function buildHistogram(column) {
  const values = currentRows
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined && value !== "");

  const trace = {
    x: values,
    type: "histogram"
  };

  drawPlot([trace], `Histogram of ${column}`, column, "Count");
}


function buildBoxPlot(categoryColumn, valueColumn) {
  const grouped = {};

  currentRows.forEach((row) => {
    const category = cleanValue(row[categoryColumn]);
    const value = toNumber(row[valueColumn]);

    if (!Number.isFinite(value)) {
      return;
    }

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(value);
  });

  const traces = Object.keys(grouped).slice(0, 20).map((category) => ({
    y: grouped[category],
    type: "box",
    name: category
  }));

  drawPlot(traces, `${valueColumn} by ${categoryColumn}`, categoryColumn, valueColumn);
}


function buildHeatmap(xColumn, yColumn) {
  if (!xColumn || !yColumn) {
    chartMessage.textContent = "Heatmap needs an X column and a group/color column.";
    return;
  }

  const matrix = {};
  const xValues = new Set();
  const yValues = new Set();

  currentRows.forEach((row) => {
    const x = cleanValue(row[xColumn]);
    const y = cleanValue(row[yColumn]);

    xValues.add(x);
    yValues.add(y);

    const key = `${x}|||${y}`;
    matrix[key] = (matrix[key] || 0) + 1;
  });

  const xList = Array.from(xValues).slice(0, 30);
  const yList = Array.from(yValues).slice(0, 30);

  const z = yList.map((y) =>
    xList.map((x) => matrix[`${x}|||${y}`] || 0)
  );

  const trace = {
    x: xList,
    y: yList,
    z,
    type: "heatmap"
  };

  drawPlot([trace], `Heatmap: ${yColumn} by ${xColumn}`, xColumn, yColumn);
}


function buildKpi(yColumn, aggregation) {
  let value;

  if (aggregation === "count") {
    value = currentRows.length;
  } else {
    const numericValues = currentRows
      .map((row) => toNumber(row[yColumn]))
      .filter((value) => Number.isFinite(value));

    if (numericValues.length === 0) {
      value = 0;
    } else if (aggregation === "sum") {
      value = numericValues.reduce((a, b) => a + b, 0);
    } else if (aggregation === "avg") {
      value = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    } else if (aggregation === "min") {
      value = Math.min(...numericValues);
    } else if (aggregation === "max") {
      value = Math.max(...numericValues);
    }
  }

  chartOutput.innerHTML = `
    <div class="lab-kpi-card">
      <h3>${escapeHtml(formatAggregationLabel(aggregation, yColumn))}</h3>
      <div class="lab-kpi-value">${formatNumber(value)}</div>
      <p>${escapeHtml(currentDataset?.name || "Selected dataset")}</p>
    </div>
  `;

  chartMessage.textContent = "KPI card created.";
}


function buildSummaryTable(xColumn, yColumn, aggregation, limit) {
  const data = aggregateRows(xColumn, yColumn, aggregation, limit);

  let html = `<table class="lab-results-table"><thead><tr>`;
  html += `<th>${escapeHtml(xColumn)}</th>`;
  html += `<th>${escapeHtml(formatAggregationLabel(aggregation, yColumn))}</th>`;
  html += `</tr></thead><tbody>`;

  data.forEach((row) => {
    html += `<tr>`;
    html += `<td>${escapeHtml(row.label)}</td>`;
    html += `<td>${escapeHtml(formatNumber(row.value))}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;

  chartOutput.innerHTML = html;
  chartMessage.textContent = "Summary table created.";
}


function drawPlot(traces, title, xTitle, yTitle) {
  chartOutput.innerHTML = "";

  const layout = {
    title,
    xaxis: {
      title: xTitle,
      automargin: true
    },
    yaxis: {
      title: yTitle,
      automargin: true
    },
    margin: {
      l: 80,
      r: 40,
      t: 80,
      b: 120
    }
  };

  const config = {
    responsive: true,
    displaylogo: false
  };

  Plotly.newPlot(chartOutput, traces, layout, config);
  chartMessage.textContent = "Visual created.";
}


function clearChart() {
  chartOutput.innerHTML = "<p>Chart cleared.</p>";
  chartMessage.textContent = "Chart cleared.";
}


function cleanValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return String(value);
}


function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  if (typeof value === "number") {
    return value;
  }

  const cleaned = String(value)
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  return Number(cleaned);
}


function formatAggregationLabel(aggregation, yColumn) {
  if (aggregation === "count") {
    return "Count";
  }

  const labels = {
    sum: "Sum",
    avg: "Average",
    min: "Minimum",
    max: "Maximum"
  };

  return `${labels[aggregation] || aggregation} of ${yColumn}`;
}


function formatNumber(value) {
  if (!Number.isFinite(Number(value))) {
    return value;
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


datasetSelect.addEventListener("change", updateDatasetDescription);
refreshDatasetsBtn.addEventListener("click", loadDatasets);
loadDatasetBtn.addEventListener("click", loadSelectedDataset);
buildChartBtn.addEventListener("click", buildVisual);
loadExampleBtn.addEventListener("click", loadSuggestedVisual);
clearChartBtn.addEventListener("click", clearChart);

loadDatasets();