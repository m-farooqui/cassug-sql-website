const API_BASE = window.location.origin;

let pyodide = null;
let pyodideLoaded = false;
let datasetLoaded = false;
let datasets = [];

const loadPyodideBtn = document.getElementById("loadPyodideBtn");
const checkLibrariesBtn = document.getElementById("checkLibrariesBtn");
const loadDatasetBtn = document.getElementById("loadDatasetBtn");
const refreshDatasetsBtn = document.getElementById("refreshDatasetsBtn");
const runPythonBtn = document.getElementById("runPythonBtn");
const loadPythonExampleBtn = document.getElementById("loadPythonExampleBtn");
const clearPythonBtn = document.getElementById("clearPythonBtn");

const datasetSelect = document.getElementById("datasetSelect");
const datasetDescription = document.getElementById("datasetDescription");
const datasetStatus = document.getElementById("datasetStatus");
const pythonStatus = document.getElementById("pythonStatus");
const pythonEditor = document.getElementById("pythonEditor");
const pythonOutput = document.getElementById("pythonOutput");
const pythonChartOutput = document.getElementById("pythonChartOutput");
const dataPreview = document.getElementById("dataPreview");

const csvUploadInput = document.getElementById("csvUploadInput");
const loadUploadedCsvBtn = document.getElementById("loadUploadedCsvBtn");
const exampleSelect = document.getElementById("exampleSelect");


const DATASET_EXAMPLES = {
  nyc_shootings: `# NYC Shootings dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Incidents by borough:")
if "BORO" in df.columns:
    print(df["BORO"].value_counts())

print()
print("Incidents by year:")
if "OCCUR_DATE_YEAR" in df.columns:
    print(df["OCCUR_DATE_YEAR"].value_counts().sort_index())

print()
print("Top 10 precincts:")
if "PRECINCT" in df.columns:
    print(df["PRECINCT"].value_counts().head(10))`,

  crime_reports: `# Crime Reports dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Columns:")
print(df.columns.tolist())

for col in ["CRIME", "NEIGHBORHOOD", "REPORTING_AREA"]:
    if col in df.columns:
        print()
        print(f"Top values for {col}:")
        print(df[col].value_counts().head(10))`,

  consumer_complaints: `# Consumer Complaints dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

for col in ["PRODUCT", "COMPANY", "STATE", "TIMELY_RESPONSE"]:
    if col in df.columns:
        print()
        print(f"Top values for {col}:")
        print(df[col].value_counts().head(10))`,

  finance_economics: `# Finance and Economics dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Numeric summary:")
print(df.describe())

if "INFLATION_RATE_PERCENT" in df.columns and "UNEMPLOYMENT_RATE_PERCENT" in df.columns:
    print()
    print("Correlation between inflation and unemployment:")
    print(df["INFLATION_RATE_PERCENT"].corr(df["UNEMPLOYMENT_RATE_PERCENT"]))`,

  heart_health: `# Heart Health dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

for col in ["HADHEARTATTACK", "GENERALHEALTH", "AGECATEGORY", "SMOKERSTATUS"]:
    if col in df.columns:
        print()
        print(f"Counts for {col}:")
        print(df[col].value_counts(dropna=False).head(10))

if "BMI" in df.columns:
    print()
    print("Average BMI:")
    print(df["BMI"].mean())`,

  pharma_sales_hourly: `# Pharmaceutical Sales Hourly dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

numeric_cols = df.select_dtypes(include="number").columns.tolist()
print()
print("Numeric columns:")
print(numeric_cols)

if numeric_cols:
    print()
    print("Total sales by numeric column:")
    print(df[numeric_cols].sum().sort_values(ascending=False).head(10))`,

  student_grades: `# Student Grades dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

if "GRADEPERCENTAGE" in df.columns:
    print()
    print("Average grade percentage:")
    print(df["GRADEPERCENTAGE"].mean())

if "CLASSTYPE" in df.columns and "GRADEPERCENTAGE" in df.columns:
    print()
    print("Average grade by class type:")
    print(df.groupby("CLASSTYPE")["GRADEPERCENTAGE"].mean().sort_values(ascending=False))`,

  education_career_success: `# Education Career Success dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

if "FIELD_OF_STUDY" in df.columns and "STARTING_SALARY" in df.columns:
    print()
    print("Average salary by field of study:")
    print(df.groupby("FIELD_OF_STUDY")["STARTING_SALARY"].mean().sort_values(ascending=False).head(10))

if "UNIVERSITY_GPA" in df.columns and "STARTING_SALARY" in df.columns:
    print()
    print("Correlation between GPA and starting salary:")
    print(df["UNIVERSITY_GPA"].corr(df["STARTING_SALARY"]))`,

  online_retail: `# Online Retail dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

if "QUANTITY" in df.columns and "UNITPRICE" in df.columns:
    df["TOTALSALES"] = df["QUANTITY"] * df["UNITPRICE"]

    print()
    print("Total sales:")
    print(df["TOTALSALES"].sum())

    if "CUSTOMERID" in df.columns:
        print()
        print("Top 10 customers by sales:")
        print(df.groupby("CUSTOMERID")["TOTALSALES"].sum().sort_values(ascending=False).head(10))`,

  adidas_sales: `# Adidas US Sales dataset is loaded as df

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

if "TOTAL_SALES" in df.columns:
    print()
    print("Total sales:")
    print(df["TOTAL_SALES"].sum())

if "RETAILER" in df.columns and "TOTAL_SALES" in df.columns:
    print()
    print("Sales by retailer:")
    print(df.groupby("RETAILER")["TOTAL_SALES"].sum().sort_values(ascending=False).head(10))

if "REGION" in df.columns and "OPERATING_PROFIT" in df.columns:
    print()
    print("Profit by region:")
    print(df.groupby("REGION")["OPERATING_PROFIT"].sum().sort_values(ascending=False))`
};


const GENERAL_EXAMPLES = {
  dataset_overview: `# Dataset Overview
# A dataset must be loaded as df first.

print("First 5 rows:")
print(df.head())

print()
print("Shape:")
print(df.shape)

print()
print("Column names:")
print(df.columns.tolist())

print()
print("Data types:")
print(df.dtypes)

print()
print("Numeric summary:")
print(df.describe())`,

  pandas_groupby: `# Pandas GroupBy Summary
# Change category_col and value_col to columns in your dataset.

print("Available columns:")
print(df.columns.tolist())

category_col = df.select_dtypes(exclude="number").columns[0]
numeric_cols = df.select_dtypes(include="number").columns

print()
print("Selected category column:", category_col)

if len(numeric_cols) > 0:
    value_col = numeric_cols[0]
    print("Selected numeric column:", value_col)
    print()
    print(df.groupby(category_col)[value_col].mean().sort_values(ascending=False).head(10))
else:
    print(df[category_col].value_counts().head(10))`,

  missing_values: `# Missing Value Report

missing = df.isna().sum()
missing_percent = (df.isna().mean() * 100).round(2)

report = (
    pd.DataFrame({
        "missing_count": missing,
        "missing_percent": missing_percent
    })
    .sort_values("missing_count", ascending=False)
)

print(report.head(25))`,

  numpy_summary: `# NumPy Numeric Summary

import numpy as np

numeric_df = df.select_dtypes(include="number")

print("Numeric columns:")
print(numeric_df.columns.tolist())

if numeric_df.shape[1] > 0:
    values = numeric_df.dropna().to_numpy()

    print()
    print("Array shape:", values.shape)
    print("Mean:", np.mean(values))
    print("Median:", np.median(values))
    print("Standard deviation:", np.std(values))
    print("Minimum:", np.min(values))
    print("Maximum:", np.max(values))
else:
    print("No numeric columns found.")`,

  scipy_stats: `# SciPy Statistics Example

import scipy.stats as stats

numeric_cols = df.select_dtypes(include="number").columns.tolist()

print("Numeric columns:")
print(numeric_cols)

if len(numeric_cols) >= 1:
    col = numeric_cols[0]
    values = df[col].dropna()

    print()
    print("Selected column:", col)
    print("Mean:", values.mean())
    print("Median:", values.median())
    print("Skewness:", stats.skew(values))
    print("Kurtosis:", stats.kurtosis(values))

    if len(values) > 20:
        result = stats.normaltest(values.sample(min(len(values), 5000), random_state=42))
        print()
        print("Normality test:")
        print(result)
else:
    print("No numeric columns available.")`,

  matplotlib_chart: `# Matplotlib Chart Example
# Chart will appear below if saved to /tmp/python_plot.png

import matplotlib.pyplot as plt

category_cols = df.select_dtypes(exclude="number").columns.tolist()

if len(category_cols) == 0:
    print("No category columns found.")
else:
    col = category_cols[0]
    counts = df[col].value_counts().head(10)

    plt.figure(figsize=(10, 5))
    counts.plot(kind="bar")
    plt.title(f"Top 10 values for {col}")
    plt.xlabel(col)
    plt.ylabel("Count")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig("/tmp/python_plot.png")
    plt.close()

    print("Chart saved to /tmp/python_plot.png")
    print(counts)`,

  seaborn_chart: `# Seaborn Chart Example
# Chart will appear below if saved to /tmp/python_plot.png

import matplotlib.pyplot as plt
import seaborn as sns

category_cols = df.select_dtypes(exclude="number").columns.tolist()
numeric_cols = df.select_dtypes(include="number").columns.tolist()

if len(category_cols) == 0 or len(numeric_cols) == 0:
    print("Need at least one category column and one numeric column.")
else:
    cat = category_cols[0]
    num = numeric_cols[0]

    sample_df = df[[cat, num]].dropna().head(5000)

    plt.figure(figsize=(10, 5))
    sns.barplot(data=sample_df, x=cat, y=num, estimator="mean", errorbar=None)
    plt.title(f"Average {num} by {cat}")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig("/tmp/python_plot.png")
    plt.close()

    print("Chart saved to /tmp/python_plot.png")
    print(sample_df.groupby(cat)[num].mean().sort_values(ascending=False).head(10))`,

  plotly_example: `# Plotly Example
# In this text editor, Plotly chart objects print as HTML/JSON.
# For full interactive Plotly practice, use the Visualization Practice page.

import plotly.express as px

category_cols = df.select_dtypes(exclude="number").columns.tolist()

if len(category_cols) == 0:
    print("No category columns found.")
else:
    col = category_cols[0]
    summary = df[col].value_counts().head(10).reset_index()
    summary.columns = [col, "count"]

    fig = px.bar(summary, x=col, y="count", title=f"Top 10 values for {col}")

    print("Plotly figure created.")
    print("Figure JSON preview:")
    print(fig.to_json()[:1000])`,

  beautifulsoup_example: `# BeautifulSoup HTML Parsing Example
# This uses sample HTML. Public web scraping from the browser is limited by CORS.

from bs4 import BeautifulSoup

html = """
<html>
  <body>
    <h1>Sample Product Page</h1>
    <div class="product">
      <span class="name">SQL Fundamentals Book</span>
      <span class="price">$29.99</span>
    </div>
    <div class="product">
      <span class="name">Python Data Analysis Book</span>
      <span class="price">$34.99</span>
    </div>
  </body>
</html>
"""

soup = BeautifulSoup(html, "html.parser")

products = []

for product in soup.select(".product"):
    name = product.select_one(".name").get_text(strip=True)
    price = product.select_one(".price").get_text(strip=True)
    products.append({"name": name, "price": price})

print(products)`,

  sqlalchemy_example: `# SQLAlchemy In-Memory SQLite Example
# This demonstrates SQLAlchemy syntax using a small in-memory database.

from sqlalchemy import create_engine, text
import pandas as pd

engine = create_engine("sqlite:///:memory:")

sample = pd.DataFrame({
    "category": ["Books", "Books", "Hardware", "Hardware"],
    "product": ["SQL Book", "Python Book", "Keyboard", "Mouse"],
    "price": [29.99, 34.99, 89.99, 24.99]
})

sample.to_sql("products", engine, index=False, if_exists="replace")

query = text("""
SELECT
    category,
    COUNT(*) AS product_count,
    AVG(price) AS avg_price
FROM products
GROUP BY category
ORDER BY avg_price DESC
""")

with engine.connect() as conn:
    result = pd.read_sql(query, conn)

print(result)`,

  sklearn_example: `# scikit-learn Starter Model
# This creates a simple model using numeric columns from the loaded dataset.

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score

numeric_df = df.select_dtypes(include="number").dropna()

if numeric_df.shape[1] < 2:
    print("Need at least two numeric columns for this example.")
else:
    target = numeric_df.columns[-1]
    features = numeric_df.columns[:-1].tolist()

    X = numeric_df[features].head(5000)
    y = numeric_df[target].head(5000)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42
    )

    model = LinearRegression()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    print("Target column:", target)
    print("Feature columns:", features)
    print("MAE:", mean_absolute_error(y_test, predictions))
    print("R2:", r2_score(y_test, predictions))

    print()
    print("Sample predictions:")
    print(pd.DataFrame({
        "actual": y_test.head(10).values,
        "predicted": predictions[:10]
    }))`
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

  pythonStatus.textContent = "Loading Python and libraries. This may take a minute...";
  pythonOutput.textContent = "Loading Pyodide...";

  try {
    pyodide = await loadPyodide();

    pythonOutput.textContent = "Loading core packages: pandas, numpy, scipy, matplotlib, scikit-learn, micropip...";
    await pyodide.loadPackage([
      "pandas",
      "numpy",
      "scipy",
      "matplotlib",
      "scikit-learn",
      "micropip"
    ]);

    pythonOutput.textContent = "Installing extra packages: seaborn, plotly, beautifulsoup4, sqlalchemy...";
    await pyodide.runPythonAsync(`
import micropip
await micropip.install(["seaborn", "plotly", "beautifulsoup4", "sqlalchemy"])
`);

    pyodide.runPython(`
import sys
from io import StringIO

import pandas as pd
import numpy as np
import scipy
import matplotlib
import sklearn
`);

    pyodideLoaded = true;
    pythonStatus.textContent = "Python, analytics, visualization, scraping, SQLAlchemy, and ML libraries loaded.";
    pythonOutput.textContent = "Python is ready. Choose a dataset and click Load Selected Dataset.";

  } catch (error) {
    pythonStatus.textContent = "Failed to load Python libraries.";
    pythonOutput.textContent = `Error: ${error.message}`;
  }
}


async function checkLibraries() {
  if (!pyodideLoaded) {
    pythonOutput.textContent = "Please load Python first.";
    return;
  }

  const code = `
import pandas as pd
import numpy as np
import scipy
import matplotlib
import seaborn as sns
import plotly
from bs4 import BeautifulSoup
import sqlalchemy
import sklearn

print("Library check successful:")
print("pandas:", pd.__version__)
print("numpy:", np.__version__)
print("scipy:", scipy.__version__)
print("matplotlib:", matplotlib.__version__)
print("seaborn:", sns.__version__)
print("plotly:", plotly.__version__)
print("beautifulsoup4: imported")
print("sqlalchemy:", sqlalchemy.__version__)
print("scikit-learn:", sklearn.__version__)
`;

  const result = await pyodide.runPythonAsync(wrapPython(code));
  pythonOutput.textContent = result;
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
import numpy as np

df = pd.read_csv("selected_dataset.csv", low_memory=False)

df.columns = (
    df.columns
    .str.strip()
    .str.upper()
    .str.replace(" ", "_")
    .str.replace("-", "_")
    .str.replace("/", "_")
    .str.replace("?", "")
    .str.replace("(", "")
    .str.replace(")", "")
)

possible_date_columns = [
    "OCCUR_DATE",
    "DATE_RECEIVED",
    "INVOICEDATE",
    "INVOICE_DATE",
    "DATE",
    "DATETIME",
    "REPORT_DATE",
    "DATE_OF_REPORT"
]

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

    const columnsJson = await pyodide.runPythonAsync(`import json; json.dumps(list(df.columns))`);
    const previewJson = await pyodide.runPythonAsync(`df.head(10).fillna("").astype(str).to_json(orient="records")`);

    const columns = JSON.parse(columnsJson);
    const previewRows = JSON.parse(previewJson);

    renderDataPreview(columns, previewRows);
    loadDatasetExample();

  } catch (error) {
    datasetStatus.textContent = "Failed to load dataset.";
    pythonOutput.textContent = `Error: ${error.message}`;
  }
}


async function loadUploadedCsv() {
  if (!pyodideLoaded) {
    pythonOutput.textContent = "Please load Python first.";
    return;
  }

  const file = csvUploadInput.files[0];

  if (!file) {
    pythonOutput.textContent = "Please choose a CSV file first.";
    return;
  }

  datasetStatus.textContent = `Loading uploaded file: ${file.name}`;
  pythonOutput.textContent = `Reading uploaded CSV: ${file.name}`;

  try {
    const csvText = await file.text();

    pyodide.FS.writeFile("uploaded_dataset.csv", csvText);

    const setupCode = `
import pandas as pd
import numpy as np

df = pd.read_csv("uploaded_dataset.csv", low_memory=False)

df.columns = (
    df.columns
    .str.strip()
    .str.upper()
    .str.replace(" ", "_")
    .str.replace("-", "_")
    .str.replace("/", "_")
    .str.replace("?", "")
    .str.replace("(", "")
    .str.replace(")", "")
)

rows, cols = df.shape
print("Uploaded CSV loaded successfully.")
print("File name: ${escapeForPythonString(file.name)}")
print(f"Rows: {rows}")
print(f"Columns: {cols}")
print()
print("Column names:")
print(list(df.columns))
`;

    const result = await pyodide.runPythonAsync(wrapPython(setupCode));

    datasetLoaded = true;
    datasetStatus.textContent = `${file.name} loaded as dataframe: df`;
    pythonOutput.textContent = result;

    const columnsJson = await pyodide.runPythonAsync(`import json; json.dumps(list(df.columns))`);
    const previewJson = await pyodide.runPythonAsync(`df.head(10).fillna("").astype(str).to_json(orient="records")`);

    const columns = JSON.parse(columnsJson);
    const previewRows = JSON.parse(previewJson);

    renderDataPreview(columns, previewRows);
    loadGeneralExample();

  } catch (error) {
    datasetStatus.textContent = "Failed to load uploaded CSV.";
    pythonOutput.textContent = `Error: ${error.message}`;
  }
}


function renderDataPreview(columns, rows) {
  if (!rows || rows.length === 0) {
    dataPreview.innerHTML = "<p>No preview available.</p>";
    return;
  }

  const visibleColumns = columns.slice(0, 12);

  let html = `<table class="lab-results-table"><thead><tr>`;

  visibleColumns.forEach((column) => {
    html += `<th>${escapeHtml(column)}</th>`;
  });

  html += `</tr></thead><tbody>`;

  rows.forEach((row) => {
    html += `<tr>`;

    visibleColumns.forEach((column) => {
      html += `<td>${escapeHtml(row[column])}</td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;

  if (columns.length > 12) {
    html += `<p class="lab-small-note">Showing first 12 columns only.</p>`;
  }

  dataPreview.innerHTML = html;
}


async function runPython() {
  if (!pyodideLoaded) {
    pythonOutput.textContent = "Please load Python first.";
    return;
  }

  const code = pythonEditor.value;

  try {
    clearChartOutput();

    try {
      pyodide.FS.unlink("/tmp/python_plot.png");
    } catch (e) {
      // plot file may not exist yet
    }

    const result = await pyodide.runPythonAsync(wrapPython(code));
    pythonOutput.textContent = result || "Code ran successfully with no text output.";

    renderPythonPlotIfExists();

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


function renderPythonPlotIfExists() {
  try {
    const imageData = pyodide.FS.readFile("/tmp/python_plot.png", { encoding: "binary" });
    const blob = new Blob([imageData], { type: "image/png" });
    const url = URL.createObjectURL(blob);

    pythonChartOutput.innerHTML = `<img src="${url}" alt="Python chart" style="max-width:100%; border-radius: 14px;" />`;
  } catch (error) {
    pythonChartOutput.innerHTML = `<p>No chart file found. To show a Matplotlib or Seaborn chart, save it as <strong>/tmp/python_plot.png</strong>.</p>`;
  }
}


function clearChartOutput() {
  pythonChartOutput.innerHTML = `<p>Chart output cleared.</p>`;
}


function loadPythonExample() {
  const exampleKey = exampleSelect.value;

  if (GENERAL_EXAMPLES[exampleKey]) {
    pythonEditor.value = GENERAL_EXAMPLES[exampleKey];
    return;
  }

  loadGeneralExample();
}


function loadDatasetExample() {
  const selectedDataset = getSelectedDataset();

  if (selectedDataset && DATASET_EXAMPLES[selectedDataset.id]) {
    pythonEditor.value = DATASET_EXAMPLES[selectedDataset.id];
    return;
  }

  loadGeneralExample();
}


function loadGeneralExample() {
  pythonEditor.value = GENERAL_EXAMPLES.dataset_overview;
}


function clearPython() {
  pythonEditor.value = "";
  pythonOutput.textContent = "Editor cleared.";
  dataPreview.innerHTML = "<p>Dataset preview remains available after loading a dataset.</p>";
  clearChartOutput();
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeForPythonString(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", " ");
}


datasetSelect.addEventListener("change", updateDatasetDescription);
refreshDatasetsBtn.addEventListener("click", loadDatasets);
loadPyodideBtn.addEventListener("click", loadPython);
checkLibrariesBtn.addEventListener("click", checkLibraries);
loadDatasetBtn.addEventListener("click", loadSelectedDataset);
loadUploadedCsvBtn.addEventListener("click", loadUploadedCsv);
runPythonBtn.addEventListener("click", runPython);
loadPythonExampleBtn.addEventListener("click", loadPythonExample);
clearPythonBtn.addEventListener("click", clearPython);

loadDatasets();