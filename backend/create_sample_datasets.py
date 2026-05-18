from pathlib import Path
import shutil
import pandas as pd


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

SOURCE_DIR = BACKEND_DIR / "data" / "source"
SAMPLE_SOURCE_DIR = BACKEND_DIR / "data" / "sample_source"
WEBSITE_SAMPLE_DIR = PROJECT_DIR / "website" / "data" / "sample_datasets"

SAMPLE_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
WEBSITE_SAMPLE_DIR.mkdir(parents=True, exist_ok=True)


DATASET_FILES = {
    "nyc_shootings": {
        "source_file": "Shootings_(2006-Present)_20260315.csv",
        "sample_rows": 20000,
    },
    "crime_reports": {
        "source_file": "Crime_Reports_20240701.csv",
        "sample_rows": 20000,
    },
    "consumer_complaints": {
        "source_file": "consumer_complaints.csv",
        "sample_rows": 25000,
    },
    "finance_economics": {
        "source_file": "finance_economics_dataset.csv",
        "sample_rows": 25000,
    },
    "heart_health": {
        "source_file": "heart_2022_with_nans.csv",
        "sample_rows": 25000,
    },
    "pharma_sales_hourly": {
        "source_file": "saleshourly.csv",
        "sample_rows": 25000,
    },
    "student_grades": {
        "source_file": "StudentGradesAndPrograms.csv",
        "sample_rows": 25000,
    },
    "education_career_success": {
        "source_file": "education_career_success - Copy.csv",
        "sample_rows": 25000,
    },
    "online_retail": {
        "source_file": "Online Retail.csv",
        "sample_rows": 25000,
    },
    "adidas_sales": {
        "source_file": "Adidas US Sales Datasets.csv",
        "sample_rows": 25000,
    },
}


def create_sample_csv(dataset_id: str, source_file: str, sample_rows: int):
    source_path = SOURCE_DIR / source_file

    if not source_path.exists():
        print(f"Missing source file: {source_path}")
        return

    sample_source_path = SAMPLE_SOURCE_DIR / source_file
    website_dataset_dir = WEBSITE_SAMPLE_DIR / dataset_id
    website_dataset_dir.mkdir(parents=True, exist_ok=True)
    website_sample_path = website_dataset_dir / source_file

    print(f"\nProcessing: {source_file}")

    try:
        df = pd.read_csv(source_path, low_memory=False)

        original_rows = len(df)

        if original_rows > sample_rows:
            sample_df = df.sample(n=sample_rows, random_state=42)
        else:
            sample_df = df.copy()

        sample_df.to_csv(sample_source_path, index=False)
        sample_df.to_csv(website_sample_path, index=False)

        print(f"Original rows: {original_rows:,}")
        print(f"Sample rows:   {len(sample_df):,}")
        print(f"Saved backend sample: {sample_source_path}")
        print(f"Saved website sample: {website_sample_path}")

    except Exception as e:
        print(f"Error processing {source_file}: {e}")


def main():
    print("Creating sample datasets for GitHub/Render deployment...")
    print(f"Reading full datasets from: {SOURCE_DIR}")
    print(f"Writing backend samples to: {SAMPLE_SOURCE_DIR}")
    print(f"Writing website samples to: {WEBSITE_SAMPLE_DIR}")

    for dataset_id, config in DATASET_FILES.items():
        create_sample_csv(
            dataset_id=dataset_id,
            source_file=config["source_file"],
            sample_rows=config["sample_rows"],
        )

    print("\nDone creating sample datasets.")


if __name__ == "__main__":
    main()