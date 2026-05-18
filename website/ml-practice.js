const API_BASE = window.location.origin;

let pyodide = null;
let pyodideLoaded = false;
let datasetLoaded = false;
let datasets = [];

const datasetSelect = document.getElementById("datasetSelect");
const refreshDatasetsBtn = document.getElementById("refreshDatasetsBtn");
const loadPythonBtn = document.getElementById("loadPythonBtn");
const loadDatasetBtn = document.getElementById("loadDatasetBtn");

const datasetDescription = document.getElementById("datasetDescription");
const pythonStatus = document.getElementById("pythonStatus");
const datasetStatus = document.getElementById("datasetStatus");

const targetColumnSelect = document.getElementById("targetColumnSelect");
const featureColumnsSelect = document.getElementById("featureColumnsSelect");
const problemTypeSelect = document.getElementById("problemTypeSelect");
const modelTypeSelect = document.getElementById("modelTypeSelect");
const testSizeInput = document.getElementById("testSizeInput");
const maxRowsInput = document.getElementById("maxRowsInput");

const loadExampleBtn = document.getElementById("loadExampleBtn");
const trainModelBtn = document.getElementById("trainModelBtn");
const clearOutputBtn = document.getElementById("clearOutputBtn");

const modelMessage = document.getElementById("modelMessage");
const modelOutput = document.getElementById("modelOutput");
const dataPreview = document.getElementById("dataPreview");
const practiceIdeas = document.getElementById("practiceIdeas");


const DATASET_ML_IDEAS = {
  nyc_shootings: [
    "Predict borough using precinct, location description, and location classification.",
    "Predict location classification using borough and precinct.",
    "Practice classification with categorical features.",
    "Create train/test split and compare model accuracy.",
    "Discuss why this dataset may be better for trend analysis than prediction."
  ],
  crime_reports: [
    "Predict crime type using neighborhood, reporting area, and location.",
    "Predict neighborhood using crime type and reporting area.",
    "Practice classification with categorical public safety data.",
    "Compare Decision Tree and Naive Bayes.",
    "Review confusion matrix to see which crime classes are confused."
  ],
  consumer_complaints: [
    "Predict timely response using product, issue, company, state, and submitted method.",
    "Predict product category using issue and company.",
    "Compare classification models.",
    "Evaluate precision, recall, and F1 score.",
    "Discuss class imbalance in complaint response outcomes."
  ],
  finance_economics: [
    "Predict whether close price is higher than open price.",
    "Predict close price using market and economic indicators.",
    "Practice regression with numeric economic features.",
    "Compare linear regression and decision tree regression.",
    "Calculate R² and RMSE."
  ],
  heart_health: [
    "Predict heart attack status using age, BMI, smoking, diabetes, sleep, and general health.",
    "Predict diabetes status using lifestyle and demographic fields.",
    "Practice classification with healthcare survey data.",
    "Evaluate recall because false negatives can matter in health analysis.",
    "Create simple risk profiles from selected features."
  ],
  pharma_sales_hourly: [
    "Predict sales quantity for a drug category.",
    "Predict high-demand vs low-demand hours.",
    "Practice regression with time-series style features.",
    "Use hour, month, and weekday as features.",
    "Compare linear regression and decision tree regression."
  ],
  student_grades: [
    "Predict whether grade percentage is above a threshold.",
    "Predict grade percentage using class type, grade level, school year, and program flags.",
    "Practice regression for grade prediction.",
    "Practice classification by creating grade bands.",
    "Compare program flag effects on prediction."
  ],
  education_career_success: [
    "Predict starting salary using GPA, field of study, internships, projects, and skills.",
    "Predict job level using education and experience features.",
    "Predict whether a student receives multiple job offers.",
    "Practice regression and classification.",
    "Build a career readiness model."
  ],
  online_retail: [
    "Predict high-value customer vs low-value customer.",
    "Predict invoice revenue using quantity and unit price.",
    "Practice regression using sales fields.",
    "Create customer segments before modeling.",
    "Discuss why transaction-level data may need aggregation before ML."
  ],
  adidas_sales: [
    "Predict total sales using retailer, region, product, price, units sold, and sales method.",
    "Predict operating profit using sales and product fields.",
    "Predict sales method using retailer, region, product, and price.",
    "Practice regression and classification.",
    "Compare sales drivers by feature importance."
  ]
};


const DATASET_SUGGESTED_SETUPS = {
  nyc_shootings: {
    problemType: "classification",
    targetCandidates: ["BORO", "boro"],
    featureCandidates: ["PRECINCT", "LOCATION_DESC", "LOC_CLASSFCTN_DESC", "JURISDICTION_CODE"]
  },
  crime_reports: {
    problemType: "classification",
    targetCandidates: ["crime", "CRIME", "Crime"],
    featureCandidates: ["neighborhood", "NEIGHBORHOOD", "reporting_area", "REPORTING_AREA", "location", "LOCATION"]
  },
  consumer_complaints: {
    problemType: "classification",
    targetCandidates: ["timely_response", "TIMELY_RESPONSE", "Timely response?"],
    featureCandidates: ["product", "issue", "company", "state", "submitted_via"]
  },
  finance_economics: {
    problemType: "regression",
    targetCandidates: ["close_price", "CLOSE_PRICE", "Close Price"],
    featureCandidates: ["open_price", "daily_high", "daily_low", "trading_volume", "inflation_rate_percent", "unemployment_rate_percent", "interest_rate_percent"]
  },
  heart_health: {
    problemType: "classification",
    targetCandidates: ["hadheartattack", "HADHEARTATTACK", "HadHeartAttack"],
    featureCandidates: ["sex", "agecategory", "generalhealth", "bmi", "sleephours", "smokerstatus", "haddiabetes", "physicalactivities"]
  },
  pharma_sales_hourly: {
    problemType: "regression",
    targetCandidates: ["n02be", "N02BE"],
    featureCandidates: ["year", "month", "hour", "weekday_name"]
  },
  student_grades: {
    problemType: "regression",
    targetCandidates: ["gradepercentage", "GRADEPERCENTAGE", "gradePercentage"],
    featureCandidates: ["schoolyear", "gradelevel", "classtype", "avid", "sped", "migrant", "ell"]
  },
  education_career_success: {
    problemType: "regression",
    targetCandidates: ["starting_salary", "STARTING_SALARY", "Starting_Salary", "Starting Salary"],
    featureCandidates: ["age", "gender", "high_school_gpa", "sat_score", "university_gpa", "field_of_study", "internships_completed", "projects_completed", "certifications", "soft_skills_score", "networking_score"]
  },
  online_retail: {
    problemType: "regression",
    targetCandidates: ["unitprice", "UNITPRICE", "UnitPrice", "Unit Price"],
    featureCandidates: ["quantity", "customerid"]
  },
  adidas_sales: {
    problemType: "regression",
    targetCandidates: ["total_sales", "TOTAL_SALES", "Total Sales", "Total_Sales"],
    featureCandidates: ["retailer", "region", "state", "city", "product", "price_per_unit", "units_sold", "sales_method"]
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


async function loadPythonEnvironment() {
  if (pyodideLoaded) {
    pythonStatus.textContent = "ML environment is already loaded.";
    return;
  }

  pythonStatus.textContent = "Loading Python ML environment. This can take a minute...";
  modelOutput.textContent = "Loading Pyodide...";

  try {
    pyodide = await loadPyodide();

    modelOutput.textContent = "Loading pandas, numpy, scikit-learn, and matplotlib...";
    await pyodide.loadPackage([
      "pandas",
      "numpy",
      "scikit-learn",
      "matplotlib"
    ]);

    pyodide.runPython(`
import sys
from io import StringIO
`);

    pyodideLoaded = true;
    pythonStatus.textContent = "ML environment loaded successfully.";
    modelOutput.textContent = "ML environment is ready. Load a dataset next.";

  } catch (error) {
    pythonStatus.textContent = "Failed to load ML environment.";
    modelOutput.textContent = `Error: ${error.message}`;
  }
}


async function loadSelectedDataset() {
  if (!pyodideLoaded) {
    modelOutput.textContent = "Please load the ML environment first.";
    return;
  }

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
  modelOutput.textContent = `Fetching CSV file from ${datasetUrl}...`;

  try {
    const response = await fetch(datasetUrl);

    if (!response.ok) {
      throw new Error(`Could not fetch dataset. Status: ${response.status}`);
    }

    const csvText = await response.text();

    pyodide.FS.writeFile("ml_selected_dataset.csv", csvText);

    const setupCode = `
import pandas as pd
import numpy as np

df = pd.read_csv("ml_selected_dataset.csv", low_memory=False)

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

print("Dataset loaded successfully.")
print("Dataset name: ${selectedDataset.name}")
print(f"Rows: {rows}")
print(f"Columns: {cols}")
print()
print("Columns:")
print(list(df.columns))
`;

    const result = await pyodide.runPythonAsync(wrapPython(setupCode));

    datasetLoaded = true;
    datasetStatus.textContent = `${selectedDataset.name} loaded as dataframe: df`;
    modelOutput.textContent = result;

    const columnsJson = await pyodide.runPythonAsync(`import json; json.dumps(list(df.columns))`);
    const previewJson = await pyodide.runPythonAsync(`df.head(10).fillna("").astype(str).to_json(orient="records")`);

    const columns = JSON.parse(columnsJson);
    const previewRows = JSON.parse(previewJson);

    populateColumnDropdowns(columns);
    renderDataPreview(columns, previewRows);
    renderPracticeIdeas();
    loadSuggestedSetup();

  } catch (error) {
    datasetStatus.textContent = "Failed to load dataset.";
    modelOutput.textContent = `Error: ${error.message}`;
  }
}


function populateColumnDropdowns(columns) {
  targetColumnSelect.innerHTML = "";
  featureColumnsSelect.innerHTML = "";

  columns.forEach((column) => {
    const targetOption = document.createElement("option");
    targetOption.value = column;
    targetOption.textContent = column;
    targetColumnSelect.appendChild(targetOption);

    const featureOption = document.createElement("option");
    featureOption.value = column;
    featureOption.textContent = column;
    featureColumnsSelect.appendChild(featureOption);
  });
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


function renderPracticeIdeas() {
  const selectedDataset = getSelectedDataset();

  const ideas = DATASET_ML_IDEAS[selectedDataset?.id] || [
    "Choose a clean target column.",
    "Select a mix of numeric and categorical feature columns.",
    "Start with a small number of features.",
    "Compare classification and regression where appropriate.",
    "Review model metrics before trusting a model."
  ];

  let html = `<ol class="lab-question-list">`;

  ideas.forEach((idea) => {
    html += `<li>${escapeHtml(idea)}</li>`;
  });

  html += `</ol>`;

  practiceIdeas.innerHTML = html;
}


function loadSuggestedSetup() {
  const selectedDataset = getSelectedDataset();

  if (!selectedDataset) {
    return;
  }

  const setup = DATASET_SUGGESTED_SETUPS[selectedDataset.id];

  if (!setup) {
    return;
  }

  problemTypeSelect.value = setup.problemType;
  updateModelOptions();

  const targetColumn = findFirstMatchingOption(targetColumnSelect, setup.targetCandidates);

  if (targetColumn) {
    targetColumnSelect.value = targetColumn;
  }

  const selectedFeatures = findMatchingOptions(featureColumnsSelect, setup.featureCandidates);

  Array.from(featureColumnsSelect.options).forEach((option) => {
    option.selected = selectedFeatures.includes(option.value);
  });

  modelMessage.textContent = "Suggested ML setup loaded. Review the target/features, then click Train Model.";
}


function findFirstMatchingOption(selectElement, candidates) {
  const options = Array.from(selectElement.options);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeColumnName(candidate);

    const found = options.find((option) => normalizeColumnName(option.value) === normalizedCandidate);

    if (found) {
      return found.value;
    }
  }

  return "";
}


function findMatchingOptions(selectElement, candidates) {
  const options = Array.from(selectElement.options);
  const selected = [];

  candidates.forEach((candidate) => {
    const normalizedCandidate = normalizeColumnName(candidate);

    const found = options.find((option) => normalizeColumnName(option.value) === normalizedCandidate);

    if (found) {
      selected.push(found.value);
    }
  });

  return selected;
}


function normalizeColumnName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


function updateModelOptions() {
  const problemType = problemTypeSelect.value;

  modelTypeSelect.innerHTML = "";

  if (problemType === "classification") {
    addModelOption("logistic_regression", "Logistic Regression");
    addModelOption("decision_tree_classifier", "Decision Tree Classifier");
    addModelOption("knn_classifier", "KNN Classifier");
    addModelOption("naive_bayes", "Naive Bayes");
  } else {
    addModelOption("linear_regression", "Linear Regression");
    addModelOption("decision_tree_regressor", "Decision Tree Regressor");
    addModelOption("knn_regressor", "KNN Regressor");
    addModelOption("random_forest_regressor", "Random Forest Regressor");
  }
}


function addModelOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  modelTypeSelect.appendChild(option);
}


async function trainModel() {
  if (!pyodideLoaded) {
    modelOutput.textContent = "Please load the ML environment first.";
    return;
  }

  if (!datasetLoaded) {
    modelOutput.textContent = "Please load a dataset first.";
    return;
  }

  const targetColumn = targetColumnSelect.value;
  const featureColumns = Array.from(featureColumnsSelect.selectedOptions)
    .map((option) => option.value)
    .filter(Boolean);

  const problemType = problemTypeSelect.value;
  const modelType = modelTypeSelect.value;
  const testSize = Number(testSizeInput.value || 0.25);
  const maxRows = Number(maxRowsInput.value || 5000);

  if (!targetColumn) {
    modelOutput.textContent = "Please choose a target column.";
    return;
  }

  if (featureColumns.length === 0) {
    modelOutput.textContent = "Please choose at least one feature column.";
    return;
  }

  if (featureColumns.includes(targetColumn)) {
    modelOutput.textContent = "The target column cannot also be selected as a feature.";
    return;
  }

  modelMessage.textContent = "Training model...";
  modelOutput.textContent = "Preparing data and training model...";

  const featureColumnsPython = JSON.stringify(featureColumns);
  const targetColumnPython = JSON.stringify(targetColumn);

  const trainingCode = `
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.naive_bayes import GaussianNB
from sklearn.ensemble import RandomForestRegressor

feature_columns = ${featureColumnsPython}
target_column = ${targetColumnPython}
problem_type = "${problemType}"
model_type = "${modelType}"
test_size = ${testSize}
max_rows = ${maxRows}

working_df = df[feature_columns + [target_column]].copy()
working_df = working_df.dropna(subset=[target_column])

if len(working_df) > max_rows:
    working_df = working_df.sample(max_rows, random_state=42)

# Convert empty strings to missing values
working_df = working_df.replace("", np.nan)

X = working_df[feature_columns]
y = working_df[target_column]

if problem_type == "regression":
    y = pd.to_numeric(y, errors="coerce")
    valid_mask = y.notna()
    X = X.loc[valid_mask]
    y = y.loc[valid_mask]

if len(X) < 50:
    raise ValueError("Not enough usable rows after cleaning. Try different columns or a larger dataset.")

numeric_features = []
categorical_features = []

for col in feature_columns:
    numeric_version = pd.to_numeric(X[col], errors="coerce")
    numeric_ratio = numeric_version.notna().mean()

    if numeric_ratio >= 0.8:
        X[col] = numeric_version
        numeric_features.append(col)
    else:
        categorical_features.append(col)

numeric_transformer = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ]
)

categorical_transformer = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore"))
    ]
)

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features)
    ]
)

if problem_type == "classification":
    y = y.astype(str)

    if y.nunique() < 2:
        raise ValueError("Target column needs at least two classes for classification.")

    if model_type == "logistic_regression":
        model = LogisticRegression(max_iter=1000)
    elif model_type == "decision_tree_classifier":
        model = DecisionTreeClassifier(max_depth=8, random_state=42)
    elif model_type == "knn_classifier":
        model = KNeighborsClassifier(n_neighbors=5)
    elif model_type == "naive_bayes":
        model = GaussianNB()
    else:
        raise ValueError("Unknown classification model.")

else:
    if model_type == "linear_regression":
        model = LinearRegression()
    elif model_type == "decision_tree_regressor":
        model = DecisionTreeRegressor(max_depth=8, random_state=42)
    elif model_type == "knn_regressor":
        model = KNeighborsRegressor(n_neighbors=5)
    elif model_type == "random_forest_regressor":
        model = RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42)
    else:
        raise ValueError("Unknown regression model.")

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("model", model)
    ]
)

stratify_value = y if problem_type == "classification" and y.nunique() <= 20 else None

try:
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=42,
        stratify=stratify_value
    )
except ValueError:
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=42
    )

pipeline.fit(X_train, y_train)
predictions = pipeline.predict(X_test)

print("Machine Learning Practice Results")
print("---------------------------------")
print(f"Dataset rows used: {len(working_df)}")
print(f"Training rows: {len(X_train)}")
print(f"Testing rows: {len(X_test)}")
print(f"Problem type: {problem_type}")
print(f"Model type: {model_type}")
print(f"Target column: {target_column}")
print(f"Feature columns: {feature_columns}")
print()
print("Feature type detection:")
print(f"Numeric features: {numeric_features}")
print(f"Categorical features: {categorical_features}")
print()

if problem_type == "classification":
    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, average="weighted", zero_division=0)
    recall = recall_score(y_test, predictions, average="weighted", zero_division=0)
    f1 = f1_score(y_test, predictions, average="weighted", zero_division=0)

    print("Classification Metrics")
    print("----------------------")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print()
    print("Confusion Matrix")
    print("----------------")
    print(confusion_matrix(y_test, predictions))
    print()
    print("Classification Report")
    print("---------------------")
    print(classification_report(y_test, predictions, zero_division=0))

else:
    mae = mean_absolute_error(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, predictions)

    print("Regression Metrics")
    print("------------------")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R²:   {r2:.4f}")
    print()

print("Sample Predictions")
print("------------------")
sample = pd.DataFrame({
    "actual": list(y_test[:10]),
    "predicted": list(predictions[:10])
})
print(sample.to_string(index=False))
`;

  try {
    const result = await pyodide.runPythonAsync(wrapPython(trainingCode));
    modelOutput.textContent = result || "Model trained successfully.";
    modelMessage.textContent = "Model training complete.";
  } catch (error) {
    modelOutput.textContent = `Error: ${error.message}`;
    modelMessage.textContent = "Model training failed.";
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


function clearOutput() {
  modelOutput.textContent = "Output cleared.";
  modelMessage.textContent = "Choose a dataset and train a model.";
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
loadPythonBtn.addEventListener("click", loadPythonEnvironment);
loadDatasetBtn.addEventListener("click", loadSelectedDataset);
loadExampleBtn.addEventListener("click", loadSuggestedSetup);
trainModelBtn.addEventListener("click", trainModel);
clearOutputBtn.addEventListener("click", clearOutput);
problemTypeSelect.addEventListener("change", updateModelOptions);

updateModelOptions();
loadDatasets();