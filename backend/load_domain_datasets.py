import os
import re
import shutil
import sqlite3
from pathlib import Path

import pandas as pd


# ============================================================
# Dataset configuration
#
# Local computer:
#   Uses backend/dataset_config.py
#   Reads full datasets from backend/data/source/
#
# Render:
#   Uses backend/dataset_config_render.py
#   Reads sample datasets from backend/data/sample_source/
#
# Render mode is enabled by setting:
#   RENDER=true
# ============================================================

if os.getenv("RENDER") == "true":
    from dataset_config_render import DOMAIN_DATASETS
else:
    from dataset_config import DOMAIN_DATASETS


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
WEBSITE_DATASETS_DIR = PROJECT_DIR / "website" / "data" / "datasets"

WEBSITE_DATASETS_DIR.mkdir(parents=True, exist_ok=True)


def clean_column_name(column_name: str) -> str:
    """
    Convert CSV column names into SQL-friendly column names.

    Example:
    "Total Sales" -> "total_sales"
    "Price/Unit" -> "price_unit"
    """
    cleaned = str(column_name).strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "_", cleaned)
    cleaned = cleaned.strip("_")

    if not cleaned:
        cleaned = "column"

    if cleaned[0].isdigit():
        cleaned = f"col_{cleaned}"

    return cleaned


def make_unique_columns(columns):
    """
    SQLite does not like duplicate column names.
    This makes duplicate cleaned names unique.
    """
    seen = {}
    unique_columns = []

    for column in columns:
        cleaned = clean_column_name(column)

        if cleaned not in seen:
            seen[cleaned] = 0
            unique_columns.append(cleaned)
        else:
            seen[cleaned] += 1
            unique_columns.append(f"{cleaned}_{seen[cleaned]}")

    return unique_columns


def copy_csv_to_frontend(dataset_id: str, source_csv: Path, frontend_csv_path: str):
    """
    Copies the source CSV into website/data/datasets/...
    so browser-based Python, visualization, and ML pages can load it.
    """
    if not frontend_csv_path:
        print(f"  No frontend_csv_path configured for {dataset_id}. Skipping frontend copy.")
        return

    destination_path = WEBSITE_DATASETS_DIR / frontend_csv_path
    destination_path.parent.mkdir(parents=True, exist_ok=True)

    shutil.copy2(source_csv, destination_path)

    print(f"  Copied frontend CSV:")
    print(f"    {destination_path}")


def load_csv_to_sqlite(dataset_id: str, config: dict):
    """
    Loads one CSV file into one SQLite database file.
    """
    source_csv = Path(config["source_csv"])
    db_file = Path(config["db_file"])
    table_name = config["table"]
    frontend_csv_path = config.get("frontend_csv_path", "")

    print("\n" + "=" * 80)
    print(f"Dataset ID: {dataset_id}")
    print(f"Name: {config.get('name', dataset_id)}")
    print(f"Domain: {config.get('domain', 'Other')}")
    print(f"Source CSV: {source_csv}")
    print(f"SQLite DB: {db_file}")
    print(f"Table: {table_name}")

    if not source_csv.exists():
        print(f"  SKIPPED: Source CSV not found: {source_csv}")
        return False

    db_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        print("  Reading CSV...")
        df = pd.read_csv(source_csv, low_memory=False)

        original_columns = list(df.columns)
        df.columns = make_unique_columns(df.columns)

        print(f"  Rows read: {len(df):,}")
        print(f"  Columns read: {len(df.columns):,}")

        if original_columns != list(df.columns):
            print("  Cleaned column names for SQLite.")

        print("  Writing SQLite database...")
        conn = sqlite3.connect(db_file)

        df.to_sql(
            table_name,
            conn,
            if_exists="replace",
            index=False,
        )

        cursor = conn.cursor()

        cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
        row_count = cursor.fetchone()[0]

        conn.commit()
        conn.close()

        print(f"  SQLite table created: {table_name}")
        print(f"  SQLite rows loaded: {row_count:,}")

        copy_csv_to_frontend(dataset_id, source_csv, frontend_csv_path)

        return True

    except Exception as e:
        print(f"  ERROR loading {dataset_id}: {e}")
        return False


def main():
    print("CASSUG Domain Dataset Loader")
    print("=" * 80)

    render_mode = os.getenv("RENDER") == "true"

    if render_mode:
        print("Mode: Render / hosted sample datasets")
        print("Using: backend/dataset_config_render.py")
    else:
        print("Mode: Local / full datasets")
        print("Using: backend/dataset_config.py")

    print(f"Website datasets directory: {WEBSITE_DATASETS_DIR}")

    success_count = 0
    skipped_or_failed_count = 0

    for dataset_id, config in DOMAIN_DATASETS.items():
        success = load_csv_to_sqlite(dataset_id, config)

        if success:
            success_count += 1
        else:
            skipped_or_failed_count += 1

    print("\n" + "=" * 80)
    print("Load complete.")
    print(f"Successful datasets: {success_count}")
    print(f"Skipped or failed datasets: {skipped_or_failed_count}")
    print("=" * 80)


if __name__ == "__main__":
    main()