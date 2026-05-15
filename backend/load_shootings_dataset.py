import csv
import sqlite3
from pathlib import Path
from datetime import datetime


BASE_DIR = Path(__file__).resolve().parent

SOURCE_CSV = BASE_DIR / "data" / "source" / "Shootings_(2006-Present)_20260315.csv"
MASTER_DB_DIR = BASE_DIR / "data" / "databases" / "master"
DB_PATH = MASTER_DB_DIR / "nyc_shootings.db"


def parse_date(date_value):
    """
    Converts MM/DD/YYYY into YYYY-MM-DD.
    Returns empty string if parsing fails.
    """
    if not date_value:
        return ""

    try:
        return datetime.strptime(date_value.strip(), "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return ""


def get_year(date_value):
    if not date_value:
        return None

    try:
        return datetime.strptime(date_value.strip(), "%m/%d/%Y").year
    except ValueError:
        return None


def get_month(date_value):
    if not date_value:
        return None

    try:
        return datetime.strptime(date_value.strip(), "%m/%d/%Y").month
    except ValueError:
        return None


def to_int(value):
    if value is None or str(value).strip() == "":
        return None

    try:
        return int(float(str(value).strip()))
    except ValueError:
        return None


def to_float(value):
    if value is None or str(value).strip() == "":
        return None

    try:
        return float(str(value).strip())
    except ValueError:
        return None


def clean_text(value):
    if value is None:
        return ""

    return str(value).strip()


def create_database():
    if not SOURCE_CSV.exists():
        raise FileNotFoundError(f"CSV file not found: {SOURCE_CSV}")

    MASTER_DB_DIR.mkdir(parents=True, exist_ok=True)

    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE shootings (
            incident_key INTEGER,
            occur_date TEXT,
            occur_time TEXT,
            occur_datetime TEXT,
            occur_year INTEGER,
            occur_month INTEGER,
            boro TEXT,
            loc_of_occur_desc TEXT,
            precinct INTEGER,
            jurisdiction_code INTEGER,
            loc_classfctn_desc TEXT,
            location_desc TEXT,
            x_coord_cd REAL,
            y_coord_cd REAL,
            latitude REAL,
            longitude REAL
        );
        """
    )

    rows_to_insert = []

    with open(SOURCE_CSV, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            raw_date = clean_text(row.get("OCCUR_DATE"))
            raw_time = clean_text(row.get("OCCUR_TIME"))

            occur_date = parse_date(raw_date)
            occur_year = get_year(raw_date)
            occur_month = get_month(raw_date)

            occur_datetime = ""
            if occur_date and raw_time:
                occur_datetime = f"{occur_date} {raw_time}"

            rows_to_insert.append(
                (
                    to_int(row.get("INCIDENT_KEY")),
                    occur_date,
                    raw_time,
                    occur_datetime,
                    occur_year,
                    occur_month,
                    clean_text(row.get("BORO")),
                    clean_text(row.get("LOC_OF_OCCUR_DESC")),
                    to_int(row.get("PRECINCT")),
                    to_int(row.get("JURISDICTION_CODE")),
                    clean_text(row.get("LOC_CLASSFCTN_DESC")),
                    clean_text(row.get("LOCATION_DESC")),
                    to_float(row.get("X_COORD_CD")),
                    to_float(row.get("Y_COORD_CD")),
                    to_float(row.get("Latitude")),
                    to_float(row.get("Longitude")),
                )
            )

    cursor.executemany(
        """
        INSERT INTO shootings (
            incident_key,
            occur_date,
            occur_time,
            occur_datetime,
            occur_year,
            occur_month,
            boro,
            loc_of_occur_desc,
            precinct,
            jurisdiction_code,
            loc_classfctn_desc,
            location_desc,
            x_coord_cd,
            y_coord_cd,
            latitude,
            longitude
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        rows_to_insert,
    )

    cursor.execute("CREATE INDEX idx_shootings_boro ON shootings (boro);")
    cursor.execute("CREATE INDEX idx_shootings_year ON shootings (occur_year);")
    cursor.execute("CREATE INDEX idx_shootings_month ON shootings (occur_month);")
    cursor.execute("CREATE INDEX idx_shootings_precinct ON shootings (precinct);")
    cursor.execute("CREATE INDEX idx_shootings_date ON shootings (occur_date);")

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM shootings;")
    row_count = cursor.fetchone()[0]

    conn.close()

    print(f"Created database: {DB_PATH}")
    print(f"Rows loaded: {row_count}")


if __name__ == "__main__":
    create_database()