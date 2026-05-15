import re
import shutil
import sqlite3
from pathlib import Path

import pandas as pd

from dataset_config import DOMAIN_DATASETS, MASTER_DB_DIR, BACKEND_DIR


PROJECT_ROOT = BACKEND_DIR.parent
WEBSITE_DATASET_DIR = PROJECT_ROOT / "website" / "data" / "datasets"


def clean_column_name(column_name: str) -> str:
    """
    Converts messy CSV column names into SQL-friendly names.
    Example:
    'Date Received' -> 'date_received'
    'consumer_disputed?' -> 'consumer_disputed'
    """
    cleaned = str(column_name).strip().lower()
    cleaned = cleaned.replace("%", "percent")
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "_", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    cleaned = cleaned.strip("_")

    if not cleaned:
        cleaned = "column"

    if cleaned[0].isdigit():
        cleaned = f"col_{cleaned}"

    return cleaned


def make_unique_columns(columns):
    seen = {}
    new_columns = []

    for column in columns:
        base = clean_column_name(column)

        if base not in seen:
            seen[base] = 1
            new_columns.append(base)
        else:
            seen[base] += 1
            new_columns.append(f"{base}_{seen[base]}")

    return new_columns


def load_csv_to_sqlite(dataset_id: str, config: dict, chunksize: int = 25000):
    source_csv = Path(config["source_csv"])
    db_file = Path(config["db_file"])
    table_name = config["table"]

    if not source_csv.exists():
        print(f"[SKIP] Missing CSV for {dataset_id}: {source_csv}")
        return False

    db_file.parent.mkdir(parents=True, exist_ok=True)

    if db_file.exists():
        db_file.unlink()

    print(f"\nLoading {dataset_id}")
    print(f"Source CSV: {source_csv}")
    print(f"SQLite DB:  {db_file}")
    print(f"Table:      {table_name}")

    conn = sqlite3.connect(db_file)

    total_rows = 0
    first_chunk = True

    for chunk in pd.read_csv(source_csv, chunksize=chunksize, low_memory=False):
        chunk.columns = make_unique_columns(chunk.columns)

        # Convert all object columns to string-safe values while preserving nulls.
        for col in chunk.columns:
            if chunk[col].dtype == "object":
                chunk[col] = chunk[col].astype("string")

        if_exists = "replace" if first_chunk else "append"

        chunk.to_sql(
            table_name,
            conn,
            if_exists=if_exists,
            index=False,
        )

        total_rows += len(chunk)
        first_chunk = False
        print(f"  loaded rows: {total_rows}")

    create_basic_indexes(conn, table_name, dataset_id)

    conn.commit()
    conn.close()

    print(f"[DONE] {dataset_id}: {total_rows} rows loaded.")
    return True


def create_basic_indexes(conn, table_name: str, dataset_id: str):
    cursor = conn.cursor()

    try:
        if dataset_id == "nyc_shootings":
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_boro ON {table_name} (boro);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_year ON {table_name} (occur_year);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_precinct ON {table_name} (precinct);")

        elif dataset_id == "consumer_complaints":
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_product ON {table_name} (product);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_company ON {table_name} (company);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_state ON {table_name} (state);")

        elif dataset_id == "heart_health":
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_state ON {table_name} (state);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_sex ON {table_name} (sex);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_age ON {table_name} (agecategory);")

        elif dataset_id == "student_grades":
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_schoolyear ON {table_name} (schoolyear);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_class_type ON {table_name} (classtype);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_school ON {table_name} (schoolname);")

        elif dataset_id == "online_retail":
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_invoice ON {table_name} (invoiceno);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_customer ON {table_name} (customerid);")

        elif dataset_id == "pharma_sales_hourly":
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_year ON {table_name} (year);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_month ON {table_name} (month);")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table_name}_hour ON {table_name} (hour);")

    except sqlite3.Error as e:
        print(f"[WARN] Could not create some indexes for {table_name}: {e}")


def copy_csv_to_website(dataset_id: str, config: dict):
    source_csv = Path(config["source_csv"])

    if not source_csv.exists():
        print(f"[SKIP] Could not copy missing CSV for {dataset_id}: {source_csv}")
        return False

    frontend_path = WEBSITE_DATASET_DIR / config["frontend_csv_path"]
    frontend_path.parent.mkdir(parents=True, exist_ok=True)

    shutil.copy(source_csv, frontend_path)

    print(f"[COPY] {dataset_id} CSV copied to: {frontend_path}")
    return True


def main():
    MASTER_DB_DIR.mkdir(parents=True, exist_ok=True)
    WEBSITE_DATASET_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading domain datasets...")
    print(f"Master DB directory: {MASTER_DB_DIR}")
    print(f"Website dataset directory: {WEBSITE_DATASET_DIR}")

    for dataset_id, config in DOMAIN_DATASETS.items():
        loaded = load_csv_to_sqlite(dataset_id, config)

        if loaded:
            copy_csv_to_website(dataset_id, config)

    print("\nAll available datasets processed.")


if __name__ == "__main__":
    main()