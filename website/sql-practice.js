const API_BASE = "http://localhost:8000";

let currentSessionId = localStorage.getItem("cassug_sql_session_id") || null;

const datasetSelect = document.getElementById("datasetSelect");
const refreshDatasetsBtn = document.getElementById("refreshDatasetsBtn");
const startSessionBtn = document.getElementById("startSessionBtn");
const resetSessionBtn = document.getElementById("resetSessionBtn");
const runSqlBtn = document.getElementById("runSqlBtn");
const loadExampleBtn = document.getElementById("loadExampleBtn");
const clearSqlBtn = document.getElementById("clearSqlBtn");

const sessionStatus = document.getElementById("sessionStatus");
const schemaBox = document.getElementById("schemaBox");
const sqlEditor = document.getElementById("sqlEditor");
const sqlMessage = document.getElementById("sqlMessage");
const resultsTable = document.getElementById("resultsTable");


const EXAMPLE_QUERIES = {
  nyc_shootings: `SELECT
  boro,
  COUNT(*) AS total_incidents
FROM shootings
GROUP BY boro
ORDER BY total_incidents DESC;`,

  consumer_complaints: `SELECT
  product,
  COUNT(*) AS total_complaints
FROM consumer_complaints
GROUP BY product
ORDER BY total_complaints DESC
LIMIT 10;`,

  heart_health: `SELECT
  hadheartattack,
  COUNT(*) AS total_people
FROM heart_health
GROUP BY hadheartattack
ORDER BY total_people DESC;`,

  pharma_sales_hourly: `SELECT
  year,
  month,
  SUM(n02be) AS total_n02be_sales
FROM pharma_sales_hourly
GROUP BY year, month
ORDER BY year, month;`,

  student_grades: `SELECT
  classtype,
  ROUND(AVG(gradepercentage), 2) AS avg_grade
FROM student_grades
GROUP BY classtype
ORDER BY avg_grade DESC;`,

  online_retail: `SELECT
  customerid,
  ROUND(SUM(quantity * unitprice), 2) AS total_sales
FROM online_retail
WHERE customerid IS NOT NULL
GROUP BY customerid
ORDER BY total_sales DESC
LIMIT 10;`
};


function updateSessionStatus() {
  if (currentSessionId) {
    sessionStatus.textContent = `Active session: ${currentSessionId}`;
  } else {
    sessionStatus.textContent = "No SQL session started yet.";
  }
}


function groupDatasetsByDomain(datasets) {
  const grouped = {};

  datasets.forEach((dataset) => {
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
  sqlMessage.textContent = "Loading datasets...";

  try {
    const response = await fetch(`${API_BASE}/api/datasets`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load datasets.");
    }

    if (!data.datasets || data.datasets.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No datasets added yet";
      datasetSelect.appendChild(option);

      sqlMessage.textContent = "No datasets are configured yet.";
      return;
    }

    const grouped = groupDatasetsByDomain(data.datasets);

    Object.keys(grouped).sort().forEach((domain) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = domain;

      grouped[domain].forEach((dataset) => {
        const option = document.createElement("option");
        option.value = dataset.id;

        const status = dataset.database_exists ? "" : " (DB missing)";
        option.textContent = `${dataset.name}${status}`;

        optgroup.appendChild(option);
      });

      datasetSelect.appendChild(optgroup);
    });

    sqlMessage.textContent = "Datasets loaded. Choose a dataset and start a SQL session.";

  } catch (error) {
    sqlMessage.textContent = `Error loading datasets: ${error.message}`;
  }
}


async function startSession() {
  const dataset = datasetSelect.value;

  if (!dataset) {
    sqlMessage.textContent = "No dataset selected. Add datasets first.";
    return;
  }

  sqlMessage.textContent = "Starting SQL session...";

  try {
    const response = await fetch(`${API_BASE}/api/start-sql-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ dataset })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not start SQL session.");
    }

    currentSessionId = data.session_id;
    localStorage.setItem("cassug_sql_session_id", currentSessionId);

    updateSessionStatus();
    sqlMessage.textContent = data.message;

    await loadSchema();

  } catch (error) {
    sqlMessage.textContent = `Error: ${error.message}`;
  }
}


async function resetSession() {
  if (!currentSessionId) {
    sqlMessage.textContent = "Start a SQL session first.";
    return;
  }

  const confirmed = confirm("Reset your temporary database copy back to the original dataset?");
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/reset-sql-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ session_id: currentSessionId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not reset session.");
    }

    sqlMessage.textContent = data.message;
    resultsTable.innerHTML = "";

    await loadSchema();

  } catch (error) {
    sqlMessage.textContent = `Error: ${error.message}`;
  }
}


async function loadSchema() {
  if (!currentSessionId) {
    schemaBox.textContent = "Start a session to view schema.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/schema/${currentSessionId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Could not load schema.");
    }

    schemaBox.innerHTML = "";

    if (!data.schema || data.schema.length === 0) {
      schemaBox.textContent = "No schema available.";
      return;
    }

    data.schema.forEach((table) => {
      const tableDiv = document.createElement("div");
      tableDiv.className = "lab-schema-table";

      const title = document.createElement("h4");
      title.textContent = table.table;
      tableDiv.appendChild(title);

      const list = document.createElement("ul");

      table.columns.forEach((column) => {
        const item = document.createElement("li");
        const pk = column.primary_key ? " PK" : "";
        item.textContent = `${column.name} ${column.type}${pk}`;
        list.appendChild(item);
      });

      tableDiv.appendChild(list);
      schemaBox.appendChild(tableDiv);
    });

  } catch (error) {
    schemaBox.textContent = `Error: ${error.message}`;
  }
}


async function runSql() {
  if (!currentSessionId) {
    sqlMessage.textContent = "Start a SQL session first.";
    return;
  }

  const query = sqlEditor.value.trim();

  if (!query) {
    sqlMessage.textContent = "Write a SQL query first.";
    return;
  }

  sqlMessage.textContent = "Running SQL...";
  resultsTable.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE}/api/run-sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session_id: currentSessionId,
        query
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "SQL failed.");
    }

    sqlMessage.textContent = `${data.message}\nRows changed: ${data.changes}`;

    renderTable(data.columns, data.rows);

    await loadSchema();

  } catch (error) {
    sqlMessage.textContent = `Error: ${error.message}`;
  }
}


function renderTable(columns, rows) {
  resultsTable.innerHTML = "";

  if (!columns || columns.length === 0) {
    resultsTable.innerHTML =
      "<p>No result table returned. The SQL may have changed your temporary database copy.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "lab-results-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  columns.forEach((column) => {
    const th = document.createElement("th");
    th.textContent = column;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach((row) => {
    const tr = document.createElement("tr");

    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value === null ? "NULL" : value;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  resultsTable.appendChild(table);
}


function loadExample() {
  const selectedDataset = datasetSelect.value;

  if (EXAMPLE_QUERIES[selectedDataset]) {
    sqlEditor.value = EXAMPLE_QUERIES[selectedDataset];
  } else {
    sqlEditor.value = `SELECT *
FROM table_name
LIMIT 10;`;
  }
}


function clearSql() {
  sqlEditor.value = "";
  resultsTable.innerHTML = "";
  sqlMessage.textContent = "Editor cleared.";
}


refreshDatasetsBtn.addEventListener("click", loadDatasets);
startSessionBtn.addEventListener("click", startSession);
resetSessionBtn.addEventListener("click", resetSession);
runSqlBtn.addEventListener("click", runSql);
loadExampleBtn.addEventListener("click", loadExample);
clearSqlBtn.addEventListener("click", clearSql);

updateSessionStatus();
loadDatasets();

if (currentSessionId) {
  loadSchema();
}