const API_BASE = "http://localhost:8000";

let pyodide = null;
let pyodideLoaded = false;
let datasetLoaded = false;
let datasets = [];

const loadPyodideBtn = document.getElementById("loadPyodideBtn");
const loadDatasetBtn = document.getElementById("loadDatasetBtn");
const refreshDatasetsBtn = document.getElementById("refreshDatasetsBtn");
const runPythonBtn = document.getElementById("runPythonBtn");
const loadPythonExampleBtn = document.getElementById("loadPythonExampleBtn");
const clearPythonBtn = document.getElementById("clearPythonBtn");

const datasetSelect = document.getElementById("datasetSelect");
const datasetDescription = document.getElementById("datasetDescription");
const pythonStatus = document.getElementById("pythonStatus");
const datasetStatus = document.getElementById("datasetStatus");
const pythonEditor = document.getElementById("pythonEditor");
const pythonOutput = document.getElementById("pythonOutput");


const DATASET_EXAMPLES = {
  nyc_shootings: `# NYC Shootings dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Incidents by borough:")
print(df["BORO"].value_counts())

print()
print("Incidents by year:")
print(df["OCCUR_YEAR"].value_counts().sort_index())

print()
print("Top 10 precincts:")
print(df["PRECINCT"].value_counts().head(10))`,

  consumer_complaints: `# Consumer Complaints dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Complaints by product:")
print(df["PRODUCT"].value_counts().head(10))

print()
print("Top companies by complaints:")
print(df["COMPANY"].value_counts().head(10))

print()
print("Complaints by state:")
print(df["STATE"].value_counts().head(10))`,

  heart_health: `# Heart Health dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Columns:")
print(df.columns.tolist())

print()
print("Heart attack counts:")
if "HADHEARTATTACK" in df.columns:
    print(df["HADHEARTATTACK"].value_counts(dropna=False))

print()
print("Average BMI:")
if "BMI" in df.columns:
    print(df["BMI"].mean())`,

  pharma_sales_hourly: `# Pharmaceutical Sales Hourly dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Columns:")
print(df.columns.tolist())

print()
print("Sales by year:")
if "YEAR" in df.columns:
    print(df.groupby("YEAR").size())

print()
print("Summary statistics:")
print(df.describe())`,

  student_grades: `# Student Grades dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Columns:")
print(df.columns.tolist())

print()
if "GRADEPERCENTAGE" in df.columns:
    print("Average grade percentage:")
    print(df["GRADEPERCENTAGE"].mean())

if "CLASSTYPE" in df.columns and "GRADEPERCENTAGE" in df.columns:
    print()
    print("Average grade by class type:")
    print(df.groupby("CLASSTYPE")["GRADEPERCENTAGE"].mean().sort_values(ascending=False))`,

  online_retail: `# Online Retail dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Columns:")
print(df.columns.tolist())

if "QUANTITY" in df.columns and "UNITPRICE" in df.columns:
    df["TOTALSALES"] = df["QUANTITY"] * df["UNITPRICE"]

    print()
    print("Total sales:")
    print(df["TOTALSALES"].sum())

    if "CUSTOMERID" in df.columns:
        print()
        print("Top 10 customers by sales:")
        print(df.groupby("CUSTOMERID")["TOTALSALES"].sum().sort_values(ascending=False).head(10))`
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
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No datasets available";
      datasetSelect.appendChild(option);
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

        const csvStatus = dataset.frontend_csv_path ? "" : " (CSV missing)";
        option.textContent = `${dataset.name}${csvStatus}`;

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


async function loadPython() {
  if (pyodideLoaded) {
    pythonStatus.textContent = "Python is already loaded.";
    return;
  }

  pythonStatus.textContent = "Loading Python. This can take a few seconds...";
  pythonOutput.textContent = "Loading Pyodide...";

  try {
    pyodide = await loadPyodide();

    pythonOutput.textContent = "Loading pandas package...";
    await pyodide.loadPackage(["pandas"]);

    pyodide.runPython(`
import sys
from io import StringIO
`);

    pyodideLoaded = true;
    pythonStatus.textContent = "Python and pandas loaded successfully.";
    pythonOutput.textContent = "Python is ready. Choose a dataset and click Load Selected Dataset.";

  } catch (error) {
    pythonStatus.textContent = "Failed to load Python.";
    pythonOutput.textContent = `Error: ${error.message}`;
  }
}


async function loadSelectedDataset() {
  if (!pyodideLoaded) {
    pythonOutput.textContent = "Please load Python first.";
    return;
  }

  const selectedDataset = getSelectedDataset();

  if (!selectedDataset) {
    pythonOutput.textContent = "Please choose a dataset first.";
    return;
  }

  if (!selectedDataset.frontend_csv_path) {
    pythonOutput.textContent = "This dataset does not have a frontend CSV path configured.";
    return;
  }

  const datasetUrl = `/data/datasets/${selectedDataset.frontend_csv_path}`;

  datasetStatus.textContent = `Loading ${selectedDataset.name}...`;
  pythonOutput.textContent = `Fetching CSV file from ${datasetUrl}...`;

  try {
    const response = await fetch(datasetUrl);

    if (!response.ok) {
      throw new Error(`Could not fetch dataset. Status: ${response.status}`);
    }

    const csvText = await response.text();

    pyodide.FS.writeFile("selected_dataset.csv", csvText);

    const setupCode = `
import pandas as pd

df = pd.read_csv("selected_dataset.csv", low_memory=False)

# Clean column names for easier Python analysis
df.columns = (
    df.columns
    .str.strip()
    .str.upper()
    .str.replace(" ", "_")
    .str.replace("-", "_")
    .str.replace("/", "_")
    .str.replace("?", "")
)

# Try to create helper date columns if common date fields exist
possible_date_columns = ["OCCUR_DATE", "DATE_RECEIVED", "INVOICEDATE", "DATE", "DATETIME"]

for col in possible_date_columns:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors="coerce")
        df[col + "_YEAR"] = df[col].dt.year
        df[col + "_MONTH"] = df[col].dt.month

rows, cols = df.shape
print("Dataset loaded successfully.")
print("Dataset name: ${selectedDataset.name}")
print(f"Rows: {rows}")
print(f"Columns: {cols}")
print()
print("Column names:")
print(list(df.columns))
`;

    const result = await pyodide.runPythonAsync(wrapPython(setupCode));

    datasetLoaded = true;
    datasetStatus.textContent = `${selectedDataset.name} loaded as dataframe: df`;
    pythonOutput.textContent = result;

    loadDatasetExample();

  } catch (error) {
    datasetStatus.textContent = "Failed to load dataset.";
    pythonOutput.textContent = `Error: ${error.message}`;
  }
}


async function runPython() {
  if (!pyodideLoaded) {
    pythonOutput.textContent = "Please load Python first.";
    return;
  }

  const code = pythonEditor.value;

  try {
    const result = await pyodide.runPythonAsync(wrapPython(code));
    pythonOutput.textContent = result || "Code ran successfully with no output.";
  } catch (error) {
    pythonOutput.textContent = `Error: ${error.message}`;
  }
}


function wrapPython(code) {
  return `
import sys
from io import StringIO

_output = StringIO()
_error = StringIO()

_old_stdout = sys.stdout
_old_stderr = sys.stderr

sys.stdout = _output
sys.stderr = _error

try:
${indentPython(code)}
except Exception as e:
    print("Error:", e)

sys.stdout = _old_stdout
sys.stderr = _old_stderr

_output.getvalue() + _error.getvalue()
`;
}


function indentPython(code) {
  return code
    .split("\n")
    .map(line => "    " + line)
    .join("\n");
}


function loadDatasetExample() {
  const selectedDataset = getSelectedDataset();

  if (selectedDataset && DATASET_EXAMPLES[selectedDataset.id]) {
    pythonEditor.value = DATASET_EXAMPLES[selectedDataset.id];
    return;
  }

  pythonEditor.value = `# Dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Columns:")
print(df.columns.tolist())

print()
print("Missing values:")
print(df.isna().sum())`;
}


function loadPythonExample() {
  if (datasetLoaded) {
    loadDatasetExample();
    return;
  }

  pythonEditor.value = `products = [
    {"product": "SQL Fundamentals Book", "category": "Books", "price": 29.99},
    {"product": "Python Data Analysis Book", "category": "Books", "price": 34.99},
    {"product": "Mechanical Keyboard", "category": "Hardware", "price": 89.99},
]

total_price = sum(item["price"] for item in products)

print("Products:")
for item in products:
    print(item["product"], "-", item["price"])

print()
print("Total price:", round(total_price, 2))
print("Average price:", round(total_price / len(products), 2))`;
}


function clearPython() {
  pythonEditor.value = "";
  pythonOutput.textContent = "Editor cleared.";
}


datasetSelect.addEventListener("change", updateDatasetDescription);
refreshDatasetsBtn.addEventListener("click", loadDatasets);
loadPyodideBtn.addEventListener("click", loadPython);
loadDatasetBtn.addEventListener("click", loadSelectedDataset);
runPythonBtn.addEventListener("click", runPython);
loadPythonExampleBtn.addEventListener("click", loadPythonExample);
clearPythonBtn.addEventListener("click", clearPython);

loadDatasets();