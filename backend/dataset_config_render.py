from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
MASTER_DB_DIR = BACKEND_DIR / "data" / "databases" / "master"
SOURCE_DIR = BACKEND_DIR / "data" / "sample_source"


DOMAIN_DATASETS = {
    "nyc_shootings": {
        "domain": "Public Safety",
        "name": "NYC Shootings Dataset",
        "description": (
            "Sample version for hosted practice. Includes date, time, borough, precinct, "
            "location information, latitude, and longitude."
        ),
        "source_csv": SOURCE_DIR / "Shootings_(2006-Present)_20260315.csv",
        "db_file": MASTER_DB_DIR / "nyc_shootings.db",
        "table": "shootings",
        "tables": ["shootings"],
        "frontend_csv_path": "nyc_shootings/Shootings_(2006-Present)_20260315.csv",
    },

    "crime_reports": {
        "domain": "Public Safety",
        "name": "Crime Reports Dataset",
        "description": (
            "Sample version for hosted practice. Includes crime type, report date, "
            "neighborhood, reporting area, and location fields."
        ),
        "source_csv": SOURCE_DIR / "Crime_Reports_20240701.csv",
        "db_file": MASTER_DB_DIR / "crime_reports.db",
        "table": "crime_reports",
        "tables": ["crime_reports"],
        "frontend_csv_path": "crime_reports/Crime_Reports_20240701.csv",
    },

    "consumer_complaints": {
        "domain": "Finance",
        "name": "Consumer Complaints Dataset",
        "description": (
            "Sample version for hosted practice. Includes product, issue, company, state, "
            "response, dispute status, and complaint ID."
        ),
        "source_csv": SOURCE_DIR / "consumer_complaints.csv",
        "db_file": MASTER_DB_DIR / "consumer_complaints.db",
        "table": "consumer_complaints",
        "tables": ["consumer_complaints"],
        "frontend_csv_path": "consumer_complaints/consumer_complaints.csv",
    },

    "finance_economics": {
        "domain": "Finance",
        "name": "Finance and Economics Dataset",
        "description": (
            "Sample version for hosted practice. Includes market, inflation, unemployment, "
            "GDP, interest rate, commodities, confidence, and spending indicators."
        ),
        "source_csv": SOURCE_DIR / "finance_economics_dataset.csv",
        "db_file": MASTER_DB_DIR / "finance_economics.db",
        "table": "finance_economics",
        "tables": ["finance_economics"],
        "frontend_csv_path": "finance_economics/finance_economics_dataset.csv",
    },

    "heart_health": {
        "domain": "Healthcare",
        "name": "Heart Health Survey Dataset",
        "description": (
            "Sample version for hosted practice. Includes health survey fields, lifestyle indicators, "
            "BMI, sleep, smoking, diabetes, and heart health indicators."
        ),
        "source_csv": SOURCE_DIR / "heart_2022_with_nans.csv",
        "db_file": MASTER_DB_DIR / "heart_health.db",
        "table": "heart_health",
        "tables": ["heart_health"],
        "frontend_csv_path": "heart_health/heart_2022_with_nans.csv",
    },

    "pharma_sales_hourly": {
        "domain": "Healthcare",
        "name": "Pharmaceutical Sales Hourly Dataset",
        "description": (
            "Sample version for hosted practice. Includes hourly pharmaceutical sales categories."
        ),
        "source_csv": SOURCE_DIR / "saleshourly.csv",
        "db_file": MASTER_DB_DIR / "pharma_sales_hourly.db",
        "table": "pharma_sales_hourly",
        "tables": ["pharma_sales_hourly"],
        "frontend_csv_path": "pharma_sales_hourly/saleshourly.csv",
    },

    "student_grades": {
        "domain": "Education",
        "name": "Student Grades and Programs Dataset",
        "description": (
            "Sample version for hosted practice. Includes student grades, class type, school year, "
            "grade level, and student program indicators."
        ),
        "source_csv": SOURCE_DIR / "StudentGradesAndPrograms.csv",
        "db_file": MASTER_DB_DIR / "student_grades.db",
        "table": "student_grades",
        "tables": ["student_grades"],
        "frontend_csv_path": "student_grades/StudentGradesAndPrograms.csv",
    },

    "education_career_success": {
        "domain": "Education",
        "name": "Education Career Success Dataset",
        "description": (
            "Sample version for hosted practice. Includes GPA, field of study, internships, projects, "
            "certifications, job offers, salary, satisfaction, and job level."
        ),
        "source_csv": SOURCE_DIR / "education_career_success - Copy.csv",
        "db_file": MASTER_DB_DIR / "education_career_success.db",
        "table": "education_career_success",
        "tables": ["education_career_success"],
        "frontend_csv_path": "education_career_success/education_career_success - Copy.csv",
    },

    "online_retail": {
        "domain": "Retail / Business",
        "name": "Online Retail Dataset",
        "description": (
            "Sample version for hosted practice. Includes invoice, quantity, unit price, and customer ID."
        ),
        "source_csv": SOURCE_DIR / "Online Retail.csv",
        "db_file": MASTER_DB_DIR / "online_retail.db",
        "table": "online_retail",
        "tables": ["online_retail"],
        "frontend_csv_path": "online_retail/Online Retail.csv",
    },

    "adidas_sales": {
        "domain": "Retail / Business",
        "name": "Adidas US Sales Dataset",
        "description": (
            "Sample version for hosted practice. Includes sales by retailer, region, state, city, "
            "product, price, units sold, total sales, operating profit, margin, and sales method."
        ),
        "source_csv": SOURCE_DIR / "Adidas US Sales Datasets.csv",
        "db_file": MASTER_DB_DIR / "adidas_sales.db",
        "table": "adidas_sales",
        "tables": ["adidas_sales"],
        "frontend_csv_path": "adidas_sales/Adidas US Sales Datasets.csv",
    },
}