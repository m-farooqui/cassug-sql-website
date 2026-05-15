import csv
import os
import time
from pathlib import Path
from datetime import datetime

import psycopg2


BASE_DIR = Path(__file__).resolve().parent

SOURCE_CSV = BASE_DIR / "data" / "source" / "Shootings_(2006-Present)_20260315.csv"


POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "analytics")
POSTGRES_USER = os.getenv("POSTGRES_USER", "analytics_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "analytics_password")


def clean_text(value):
    if value is None:
        return None

    cleaned = str(value).strip()

    if cleaned == "":
        return None

    return cleaned


def to_int(value):
    cleaned = clean_text(value)

    if cleaned is None:
        return None

    try:
        return int(float(cleaned))
    except ValueError:
        return None


def to_float(value):
    cleaned = clean_text(value)

    if cleaned is None:
        return None

    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_date(value):
    cleaned = clean_text(value)

    if cleaned is None:
        return None

    try:
        return datetime.strptime(cleaned, "%m/%d/%Y").date()
    except ValueError:
        return None


def parse_time(value):
    cleaned = clean_text(value)

    if cleaned is None:
        return None

    return cleaned


def wait_for_postgres(max_attempts=30, delay_seconds=2):
    for attempt in range(1, max_attempts + 1):
        try:
            conn = psycopg2.connect(
                host=POSTGRES_HOST,
                port=POSTGRES_PORT,
                dbname=POSTGRES_DB,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
            )
            conn.close()
            print("Connected to Postgres.")
            return
        except psycopg2.OperationalError:
            print(f"Waiting for Postgres... attempt {attempt}/{max_attempts}")
            time.sleep(delay_seconds)

    raise RuntimeError("Could not connect to Postgres.")


def create_table(cursor):
    cursor.execute(
        """
        DROP TABLE IF EXISTS shootings;

        CREATE TABLE shootings (
            incident_key BIGINT,
            occur_date DATE,
            occur_time TEXT,
            occur_year INTEGER,
            occur_month INTEGER,
            boro TEXT,
            loc_of_occur_desc TEXT,
            precinct INTEGER,
            jurisdiction_code INTEGER,
            loc_classfctn_desc TEXT,
            location_desc TEXT,
            x_coord_cd DOUBLE PRECISION,
            y_coord_cd DOUBLE PRECISION,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION
        );
        """
    )


def load_data(cursor):
    if not SOURCE_CSV.exists():
        raise FileNotFoundError(f"CSV not found: {SOURCE_CSV}")

    rows = []

    with open(SOURCE_CSV, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            occur_date = parse_date(row.get("OCCUR_DATE"))

            occur_year = occur_date.year if occur_date else None
            occur_month = occur_date.month if occur_date else None

            rows.append(
                (
                    to_int(row.get("INCIDENT_KEY")),
                    occur_date,
                    parse_time(row.get("OCCUR_TIME")),
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

    insert_sql = """
        INSERT INTO shootings (
            incident_key,
            occur_date,
            occur_time,
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
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """

    cursor.executemany(insert_sql, rows)

    return len(rows)


def create_indexes(cursor):
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shootings_boro ON shootings (boro);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shootings_year ON shootings (occur_year);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shootings_month ON shootings (occur_month);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shootings_precinct ON shootings (precinct);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shootings_date ON shootings (occur_date);")


def main():
    wait_for_postgres()

    conn = psycopg2.connect(
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
    )

    cursor = conn.cursor()

    print("Creating shootings table...")
    create_table(cursor)

    print("Loading NYC shootings CSV into Postgres...")
    row_count = load_data(cursor)

    print("Creating indexes...")
    create_indexes(cursor)

    conn.commit()

    cursor.close()
    conn.close()

    print(f"Done. Loaded {row_count} rows into Postgres table: shootings")


if __name__ == "__main__":
    main()