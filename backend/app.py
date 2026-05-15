import os
import json
import re
import sqlite3
import shutil
import uuid
import time
from pathlib import Path
from datetime import datetime

import requests
from docx import Document
from pydantic import BaseModel
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ORIGINAL CASSUG WEBSITE / GITHUB DOCX CONFIGURATION
# ============================================================

GITHUB_OWNER = "EdwardPollack"
GITHUB_REPO = "CASSUG"
GITHUB_FOLDER = "MeetingNotes"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBSITE_DIR = os.path.join(BASE_DIR, "website")
DATA_DIR = os.path.join(WEBSITE_DIR, "data")


def get_github_api_url():
    return f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/contents/{GITHUB_FOLDER}"


def extract_date(filename):
    match = re.search(r"^CASSUG Meeting Notes_(\d{8})\.docx$", filename)
    return datetime.strptime(match.group(1), "%m%d%Y") if match else datetime.min


def get_latest_docx_file():
    response = requests.get(get_github_api_url(), timeout=30)
    response.raise_for_status()
    files = response.json()

    docx_files = [
        f for f in files
        if f.get("name", "").startswith("CASSUG Meeting Notes_")
        and f.get("name", "").endswith(".docx")
        and extract_date(f.get("name", "")) != datetime.min
    ]

    if not docx_files:
        raise Exception("No valid CASSUG Meeting Notes DOCX files found.")

    return sorted(docx_files, key=lambda f: extract_date(f["name"]), reverse=True)[0]


def write_json(filename, data):
    os.makedirs(DATA_DIR, exist_ok=True)

    with open(os.path.join(DATA_DIR, filename), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_static_sponsors():
    return [
        {
            "title": "Troy Web Consulting",
            "description": "Sponsor 2025-2026. Address: 135 Mohawk St, Cohoes, New York 12047",
            "mapEmbed": "https://www.google.com/maps?q=135%20Mohawk%20St%20Cohoes%20New%20York%2012047&output=embed",
            "links": [
                {
                    "label": "Main Website",
                    "url": "https://www.troyweb.com/work",
                    "highlight": True,
                },
                {
                    "label": "Open Positions",
                    "url": "https://careers.troyweb.com/",
                    "highlight": True,
                },
                {
                    "label": "Google Maps Navigation",
                    "url": "https://www.google.com/maps/search/?api=1&query=135%20Mohawk%20St%20Cohoes%20New%20York%2012047",
                    "highlight": True,
                },
            ],
        },
        {
            "title": "New England SQL Server User Group",
            "description": "Sponsor 2024-2026",
            "links": [
                {
                    "label": "Meetup Page",
                    "url": "https://www.meetup.com/nesqlug/",
                    "highlight": True,
                }
            ],
        },
    ]


def paragraph_has_bold(paragraph):
    text = paragraph.text.strip()

    if not text:
        return False

    bold_text = "".join(run.text for run in paragraph.runs if run.bold).strip()

    if not bold_text:
        return False

    return len(bold_text) >= max(3, int(len(text) * 0.5))


def get_paragraph_text_and_links(paragraph):
    text = paragraph.text.strip()
    links = []
    rels = paragraph.part.rels

    for hyperlink in paragraph._element.xpath(".//w:hyperlink"):
        rel_id = hyperlink.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )

        if rel_id and rel_id in rels:
            url = rels[rel_id].target_ref
            label = "".join(node.text for node in hyperlink.xpath(".//w:t") if node.text)

            links.append(
                {
                    "label": label or "Open Link",
                    "url": url,
                    "highlight": True,
                }
            )

    return {
        "text": text,
        "links": links,
        "is_bold": paragraph_has_bold(paragraph),
    }


def get_links_from_text(text):
    links = []

    for url in re.findall(r"https?://\S+", text):
        links.append(
            {
                "label": "Open Link",
                "url": url.rstrip(".,)"),
                "highlight": True,
            }
        )

    return links


def unique_links(links):
    unique = []
    seen = set()

    for link in links:
        url = link.get("url")
        if url and url not in seen:
            unique.append(link)
            seen.add(url)

    return unique


def make_item(text, embedded_links=None):
    embedded_links = embedded_links or []
    title = text.split(":", 1)[0].strip() if ":" in text else text.strip()

    links = unique_links(get_links_from_text(text) + embedded_links)

    item = {
        "title": title[:100],
        "description": text.strip(),
    }

    if links:
        item["links"] = links

    return item


def make_group_item(title, rows):
    description_lines = []
    links = []

    for row in rows:
        line = row["text"].strip()

        if line:
            description_lines.append(line)

        links.extend(get_links_from_text(line))
        links.extend(row.get("links", []))

    item = {
        "title": title[:100],
        "description": " ".join(description_lines).strip(),
    }

    final_links = unique_links(links)

    if final_links:
        item["links"] = final_links

    return item


def skip_sponsor_text(line):
    lower = line.lower()

    skip = [
        "thank you to our wonderful sponsors",
        "troy web consulting",
        "new england sql server user group",
        "if you know of other companies",
        "sponsoring us",
    ]

    return any(s in lower for s in skip)


def is_announcement_heading(line):
    lower = line.lower().strip()

    headings = [
        "new location",
        "speakers",
        "speakers!",
        "speakers for cassug",
        "speakers for cassug!",
        "cassug special events",
        "day of data albany",
        "sql saturday albany",
        "cookout",
        "holiday party",
    ]

    if any(lower.startswith(h) for h in headings):
        return True

    if len(line) <= 60 and not line.startswith("http") and not line.endswith("."):
        if line.endswith("!") or line.endswith("?"):
            return True

    return False


def group_announcement_rows(rows):
    grouped = []
    current = []
    current_title = ""

    for row in rows:
        line = row["text"].strip()

        if not line or skip_sponsor_text(line):
            continue

        if is_announcement_heading(line):
            if current:
                grouped.append(make_group_item(current_title, current))

            current = [row]
            current_title = line.split(":", 1)[0].strip()
        else:
            if not current:
                current = [row]
                current_title = line.split(":", 1)[0].strip()
            else:
                current.append(row)

    if current:
        grouped.append(make_group_item(current_title, current))

    return grouped


def is_month_line(line):
    return re.match(
        r"^(January|February|March|April|May|June|July|August|September|October|November|December):",
        line,
        re.IGNORECASE,
    )


def extract_first_link(text, embedded_links=None):
    embedded_links = embedded_links or []

    if embedded_links:
        return embedded_links[0]["url"]

    match = re.search(r"https?://\S+", text)

    if match:
        return match.group(0).rstrip(".,)")

    return ""


def parse_meeting_header(line):
    result = {
        "month": "",
        "date": "",
        "time": "",
        "location": "",
        "description": line,
    }

    if ":" in line:
        result["month"] = line.split(":", 1)[0].strip()

    date_match = re.search(
        r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?)",
        line,
        re.IGNORECASE,
    )

    if date_match:
        result["date"] = f"{date_match.group(1)}, {date_match.group(2)}"

    time_match = re.search(r"at\s+(\d{1,2}(?::\d{2})?)", line, re.IGNORECASE)

    if time_match:
        result["time"] = time_match.group(1).strip()

    location_match = re.search(r"@\s+(.+)$", line)

    if location_match:
        result["location"] = location_match.group(1).strip()

    return result


def parse_speaker_topic(line):
    cleaned = re.sub(r"\s+", " ", line).strip()
    cleaned = cleaned.replace(" presents:", ":", 1)

    if ":" in cleaned:
        speaker, topic = cleaned.split(":", 1)
        return speaker.strip(), topic.strip()

    return "", cleaned


def finalize_meetings(meetings):
    for meeting in meetings:
        meeting["links"] = unique_links(meeting.get("links", []))

        if not meeting["links"] and meeting.get("link"):
            meeting["links"] = [
                {
                    "label": "Meetup / Register",
                    "url": meeting["link"],
                    "highlight": True,
                }
            ]

        parts = []

        if meeting.get("date"):
            parts.append(f"Date: {meeting['date']}")

        if meeting.get("time"):
            parts.append(f"Time: {meeting['time']}")

        if meeting.get("location"):
            parts.append(f"Location: {meeting['location']}")

        if meeting.get("speaker"):
            parts.append(f"Speaker: {meeting['speaker']}")

        if meeting.get("topic"):
            parts.append(f"Topic: {meeting['topic']}")

        meeting["description"] = " | ".join(parts) if parts else meeting.get("raw_text", "")

    return meetings


def is_section_heading(line):
    headings = {
        "sponsors",
        "cassug upcoming meetings",
        "upcoming free virtual events/user groups",
        "virtual user groups",
        "upcoming free in-person events",
        "upcoming paid in-person events",
        "more events",
        "job opportunities",
        "cassug today",
        "resources",
    }

    return line.lower().strip() in headings


def group_event_rows_by_bold(rows):
    grouped = []
    current = []
    current_title = ""

    for row in rows:
        line = row["text"].strip()

        if not line:
            continue

        if row.get("is_bold") and not is_section_heading(line):
            if current:
                grouped.append(make_group_item(current_title, current))

            current = [row]
            current_title = line.split(":", 1)[0].strip()
        else:
            if not current:
                current = [row]
                current_title = line.split(":", 1)[0].strip()
            else:
                current.append(row)

    if current:
        grouped.append(make_group_item(current_title, current))

    return grouped


def parse_docx(docx_path, source_file_name):
    doc = Document(docx_path)

    rows = [
        get_paragraph_text_and_links(p)
        for p in doc.paragraphs
        if p.text.strip()
    ]

    announcement_rows = []
    meetings = []
    virtual_event_rows = []
    virtual_user_group_rows = []
    in_person_event_rows = []
    paid_event_rows = []
    jobs = []
    archive = []

    section = ""
    current_meeting = None

    section_headers = {
        "cassug upcoming meetings": "meetings",
        "upcoming free virtual events/user groups": "virtual_events",
        "virtual user groups": "virtual_user_groups",
        "upcoming free in-person events": "in_person_events",
        "upcoming paid in-person events": "paid_events",
        "job opportunities": "jobs",
        "cassug today": "archive",
    }

    for row in rows:
        line = row["text"]
        embedded_links = row["links"]
        lower = line.lower().strip()

        if lower == "sponsors":
            section = "announcements"
            current_meeting = None
            continue

        if lower in section_headers:
            section = section_headers[lower]
            current_meeting = None
            continue

        if section == "announcements":
            announcement_rows.append(row)
            continue

        if section == "meetings":
            if is_month_line(line):
                parsed = parse_meeting_header(line)

                current_meeting = {
                    "title": f"{parsed['month']} Meeting",
                    "month": parsed["month"],
                    "date": parsed["date"],
                    "time": parsed["time"],
                    "location": parsed["location"],
                    "speaker": "",
                    "topic": "",
                    "raw_text": line,
                    "description": line,
                    "link": "",
                    "links": [],
                }

                if embedded_links:
                    current_meeting["links"].extend(embedded_links)
                    current_meeting["link"] = embedded_links[0]["url"]

                meetings.append(current_meeting)

            elif current_meeting:
                found_link = extract_first_link(line, embedded_links)

                if found_link:
                    current_meeting["link"] = found_link
                    current_meeting["links"].append(
                        {
                            "label": "Meetup / Register",
                            "url": found_link,
                            "highlight": True,
                        }
                    )
                else:
                    speaker, topic = parse_speaker_topic(line)

                    if speaker and not current_meeting["speaker"]:
                        current_meeting["speaker"] = speaker

                    if topic:
                        if not current_meeting["topic"]:
                            current_meeting["topic"] = topic
                        else:
                            current_meeting["topic"] += " " + topic

                if embedded_links:
                    current_meeting["links"].extend(embedded_links)

            continue

        if section == "virtual_events":
            virtual_event_rows.append(row)
            continue

        if section == "virtual_user_groups":
            virtual_user_group_rows.append(row)
            continue

        if section == "in_person_events":
            in_person_event_rows.append(row)
            continue

        if section == "paid_events":
            paid_event_rows.append(row)
            continue

        item = make_item(line, embedded_links)

        if section == "jobs":
            jobs.append(item)

        elif section == "archive":
            archive.append(item)

    announcements = group_announcement_rows(announcement_rows)
    meetings = finalize_meetings(meetings)

    virtual_events = group_event_rows_by_bold(virtual_event_rows)
    virtual_user_groups = group_event_rows_by_bold(virtual_user_group_rows)
    in_person_events = group_event_rows_by_bold(in_person_event_rows)
    paid_events = group_event_rows_by_bold(paid_event_rows)

    archive.insert(
        0,
        {
            "title": "Latest Meeting Notes Source",
            "description": f"Website updated from {source_file_name}",
        },
    )

    write_json("sponsors.json", get_static_sponsors())
    write_json("announcements.json", announcements)
    write_json("meetings.json", meetings)
    write_json("virtual-events.json", virtual_events)
    write_json("virtual-user-groups.json", virtual_user_groups)
    write_json("in-person-events.json", in_person_events)
    write_json("paid-events.json", paid_events)
    write_json("jobs.json", jobs)
    write_json("archive.json", archive)


# ============================================================
# ORIGINAL WEBSITE API ROUTES
# ============================================================

@app.get("/")
def home():
    return FileResponse(os.path.join(WEBSITE_DIR, "index.html"))


@app.get("/latest-docx")
def latest_docx():
    latest_file = get_latest_docx_file()

    return {
        "latest_file": latest_file["name"],
        "date_found": extract_date(latest_file["name"]).strftime("%m%d%Y"),
        "download_url": latest_file["download_url"],
    }


@app.get("/sync-github-docx")
def sync_github_docx():
    latest_file = get_latest_docx_file()

    file_name = latest_file["name"]
    download_url = latest_file["download_url"]

    tmp_dir = "/tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    docx_path = os.path.join(tmp_dir, "latest-meeting-notes.docx")

    response = requests.get(download_url, timeout=30)
    response.raise_for_status()

    with open(docx_path, "wb") as f:
        f.write(response.content)

    parse_docx(docx_path, file_name)

    return {
        "message": "Website JSON files updated from latest GitHub DOCX",
        "latest_file": file_name,
        "date_found": extract_date(file_name).strftime("%m%d%Y"),
        "source": download_url,
    }


@app.get("/live-jobs")
def live_jobs(
    keyword: str = Query("SQL Server"),
    location: str = Query("Albany, NY"),
):
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key or "PUT_YOUR" in app_id or "PUT_YOUR" in app_key:
        return {
            "jobs": [],
            "message": "Adzuna API keys are missing. Add ADZUNA_APP_ID and ADZUNA_APP_KEY in docker-compose.yml or Render environment variables.",
        }

    url = "https://api.adzuna.com/v1/api/jobs/us/search/1"

    params = {
        "app_id": app_id.strip().replace('"', ""),
        "app_key": app_key.strip().replace('"', ""),
        "what": keyword,
        "where": location,
        "results_per_page": 10,
        "sort_by": "date",
        "content-type": "application/json",
    }

    try:
        response = requests.get(url, params=params, timeout=30)

        if response.status_code != 200:
            return {
                "jobs": [],
                "message": f"Adzuna API error {response.status_code}: {response.text[:300]}",
            }

        data = response.json()
        jobs = []

        for job in data.get("results", []):
            jobs.append(
                {
                    "title": job.get("title", "No title"),
                    "company": job.get("company", {}).get("display_name", "Unknown company"),
                    "location": job.get("location", {}).get("display_name", location),
                    "description": job.get("description", "")[:300],
                    "link": job.get("redirect_url", ""),
                    "source": "Adzuna",
                }
            )

        return {
            "jobs": jobs,
            "keyword": keyword,
            "location": location,
        }

    except Exception as e:
        return {
            "jobs": [],
            "message": f"Could not load jobs: {str(e)}",
        }


# ============================================================
# CASSUG LEARNING LAB API
# SQL practice sessions using temporary SQLite database copies.
# The original master database files stay untouched.
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent
MASTER_DB_DIR = BACKEND_DIR / "data" / "databases" / "master"
SESSION_DB_DIR = BACKEND_DIR / "data" / "databases" / "sessions"

MASTER_DB_DIR.mkdir(parents=True, exist_ok=True)
SESSION_DB_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# DATASETS CONFIGURATION
# These datasets are grouped by domain for SQL and Python practice.
# SQLite database files are created by:
# python load_domain_datasets.py
# ============================================================

DATASETS = {
    "nyc_shootings": {
        "domain": "Public Safety",
        "name": "NYC Shootings Dataset",
        "description": (
            "Practice SQL and Python using shooting incident data from 2006 to present. "
            "Includes borough, date, time, precinct, location classification, latitude, and longitude."
        ),
        "db_file": MASTER_DB_DIR / "nyc_shootings.db",
        "tables": ["shootings"],
        "frontend_csv_path": "nyc_shootings/Shootings_(2006-Present)_20260315.csv",
    },

    "crime_reports": {
        "domain": "Public Safety",
        "name": "Crime Reports Dataset",
        "description": (
            "Practice public safety analytics using crime report data with crime type, report date, "
            "neighborhood, reporting area, and location fields."
        ),
        "db_file": MASTER_DB_DIR / "crime_reports.db",
        "tables": ["crime_reports"],
        "frontend_csv_path": "crime_reports/Crime_Reports_20240701.csv",
    },

    "consumer_complaints": {
        "domain": "Finance",
        "name": "Consumer Complaints Dataset",
        "description": (
            "Practice finance analytics using consumer complaint records. "
            "Includes product, issue, company, state, response, dispute status, and complaint ID."
        ),
        "db_file": MASTER_DB_DIR / "consumer_complaints.db",
        "tables": ["consumer_complaints"],
        "frontend_csv_path": "consumer_complaints/consumer_complaints.csv",
    },

    "finance_economics": {
        "domain": "Finance",
        "name": "Finance and Economics Dataset",
        "description": (
            "Practice finance and economics analytics using market, inflation, unemployment, GDP, "
            "interest rate, commodities, confidence, and spending indicators."
        ),
        "db_file": MASTER_DB_DIR / "finance_economics.db",
        "tables": ["finance_economics"],
        "frontend_csv_path": "finance_economics/finance_economics_dataset.csv",
    },

    "heart_health": {
        "domain": "Healthcare",
        "name": "Heart Health Survey Dataset",
        "description": (
            "Practice healthcare analytics using heart health survey data, lifestyle fields, "
            "BMI, sleep, smoking, diabetes, and health indicators."
        ),
        "db_file": MASTER_DB_DIR / "heart_health.db",
        "tables": ["heart_health"],
        "frontend_csv_path": "heart_health/heart_2022_with_nans.csv",
    },

    "pharma_sales_hourly": {
        "domain": "Healthcare",
        "name": "Pharmaceutical Sales Hourly Dataset",
        "description": (
            "Practice healthcare time-series analytics using hourly pharmaceutical sales categories."
        ),
        "db_file": MASTER_DB_DIR / "pharma_sales_hourly.db",
        "tables": ["pharma_sales_hourly"],
        "frontend_csv_path": "pharma_sales_hourly/saleshourly.csv",
    },

    "student_grades": {
        "domain": "Education",
        "name": "Student Grades and Programs Dataset",
        "description": (
            "Practice education analytics using student grades, class type, school year, "
            "grade level, and student program indicators."
        ),
        "db_file": MASTER_DB_DIR / "student_grades.db",
        "tables": ["student_grades"],
        "frontend_csv_path": "student_grades/StudentGradesAndPrograms.csv",
    },

    "education_career_success": {
        "domain": "Education",
        "name": "Education Career Success Dataset",
        "description": (
            "Practice education and career outcome analytics using GPA, field of study, internships, "
            "projects, certifications, job offers, starting salary, satisfaction, and job level."
        ),
        "db_file": MASTER_DB_DIR / "education_career_success.db",
        "tables": ["education_career_success"],
        "frontend_csv_path": "education_career_success/education_career_success - Copy.csv",
    },

    "online_retail": {
        "domain": "Retail / Business",
        "name": "Online Retail Dataset",
        "description": (
            "Practice retail and business analytics using invoices, quantity, unit price, and customer ID."
        ),
        "db_file": MASTER_DB_DIR / "online_retail.db",
        "tables": ["online_retail"],
        "frontend_csv_path": "online_retail/Online Retail.csv",
    },

    "adidas_sales": {
        "domain": "Retail / Business",
        "name": "Adidas US Sales Dataset",
        "description": (
            "Practice retail and business analytics using sales by retailer, region, state, city, "
            "product, price, units sold, total sales, operating profit, margin, and sales method."
        ),
        "db_file": MASTER_DB_DIR / "adidas_sales.db",
        "tables": ["adidas_sales"],
        "frontend_csv_path": "adidas_sales/Adidas US Sales Datasets.csv",
    },
}


class StartSessionRequest(BaseModel):
    dataset: str


class RunSqlRequest(BaseModel):
    session_id: str
    query: str


class ResetSessionRequest(BaseModel):
    session_id: str


def cleanup_old_sessions(max_age_seconds: int = 60 * 60 * 2):
    now = time.time()

    for file_path in SESSION_DB_DIR.glob("*.db"):
        try:
            age = now - file_path.stat().st_mtime
            if age > max_age_seconds:
                file_path.unlink()
        except OSError:
            pass


def get_session_db_path(session_id: str) -> Path:
    safe_session_id = (
        session_id
        .replace("/", "")
        .replace("\\", "")
        .replace("..", "")
        .strip()
    )

    return SESSION_DB_DIR / f"{safe_session_id}.db"


def get_dataset_by_session(session_id: str) -> str:
    db_path = get_session_db_path(session_id)

    if not db_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please start a new SQL practice session."
        )

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT dataset FROM __session_metadata LIMIT 1;")
        row = cursor.fetchone()

        conn.close()

        if not row:
            raise HTTPException(
                status_code=400,
                detail="Session metadata missing."
            )

        return row[0]

    except sqlite3.Error:
        raise HTTPException(
            status_code=400,
            detail="Could not read session metadata."
        )


@app.get("/api/learning-lab/status")
def learning_lab_status():
    dataset_file_status = {}

    for key, value in DATASETS.items():
        db_file = value["db_file"]
        dataset_file_status[key] = {
            "domain": value.get("domain", "Other"),
            "name": value["name"],
            "db_file": str(db_file),
            "exists": db_file.exists(),
            "frontend_csv_path": value.get("frontend_csv_path", ""),
        }

    return {
        "status": "running",
        "message": "CASSUG Learning Lab API is active.",
        "dataset_count": len(DATASETS),
        "datasets_configured": list(DATASETS.keys()),
        "dataset_file_status": dataset_file_status,
    }


@app.get("/api/datasets")
def list_datasets():
    """
    Returns the datasets available for SQL and Python practice.
    """
    result = []

    for key, value in DATASETS.items():
        result.append(
            {
                "id": key,
                "domain": value.get("domain", "Other"),
                "name": value["name"],
                "description": value["description"],
                "tables": value["tables"],
                "database_exists": value["db_file"].exists(),
                "frontend_csv_path": value.get("frontend_csv_path", ""),
            }
        )

    return {"datasets": result}


@app.post("/api/start-sql-session")
def start_sql_session(request: StartSessionRequest):
    cleanup_old_sessions()

    if request.dataset not in DATASETS:
        raise HTTPException(
            status_code=400,
            detail="Unknown dataset."
        )

    master_db = DATASETS[request.dataset]["db_file"]

    if not master_db.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Master database file not found: {master_db}",
        )

    session_id = str(uuid.uuid4())
    session_db = get_session_db_path(session_id)

    try:
        shutil.copy(master_db, session_db)

        conn = sqlite3.connect(session_db)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS __session_metadata (
                dataset TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        cursor.execute("DELETE FROM __session_metadata;")

        cursor.execute(
            "INSERT INTO __session_metadata (dataset) VALUES (?);",
            (request.dataset,),
        )

        conn.commit()
        conn.close()

        return {
            "session_id": session_id,
            "dataset": request.dataset,
            "message": (
                "SQL practice session started. "
                "You are working on a temporary database copy."
            ),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reset-sql-session")
def reset_sql_session(request: ResetSessionRequest):
    dataset = get_dataset_by_session(request.session_id)

    if dataset not in DATASETS:
        raise HTTPException(
            status_code=400,
            detail="Dataset is no longer configured."
        )

    master_db = DATASETS[dataset]["db_file"]
    session_db = get_session_db_path(request.session_id)

    try:
        shutil.copy(master_db, session_db)

        conn = sqlite3.connect(session_db)
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS __session_metadata (
                dataset TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        cursor.execute("DELETE FROM __session_metadata;")

        cursor.execute(
            "INSERT INTO __session_metadata (dataset) VALUES (?);",
            (dataset,),
        )

        conn.commit()
        conn.close()

        return {
            "message": (
                "Session reset. Your temporary database copy has been restored "
                "from the original master database."
            ),
            "session_id": request.session_id,
            "dataset": dataset,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run-sql")
def run_sql(request: RunSqlRequest):
    cleanup_old_sessions()

    db_path = get_session_db_path(request.session_id)

    if not db_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please start a new SQL practice session."
        )

    query = request.query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="SQL query cannot be empty."
        )

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        before_changes = conn.total_changes

        cursor.executescript(query)

        after_changes = conn.total_changes
        conn.commit()

        statements = [part.strip() for part in query.split(";") if part.strip()]
        last_statement = statements[-1] if statements else ""

        result = {
            "message": "SQL executed successfully on your temporary database copy.",
            "changes": after_changes - before_changes,
            "columns": [],
            "rows": [],
            "row_limit": 100,
        }

        if (
            last_statement.upper().startswith("SELECT")
            or last_statement.upper().startswith("WITH")
        ):
            cursor.execute(last_statement)
            rows = cursor.fetchmany(100)

            columns = (
                [description[0] for description in cursor.description]
                if cursor.description
                else []
            )

            result["columns"] = columns
            result["rows"] = [list(row) for row in rows]

        conn.close()
        return result

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=400,
            detail=f"SQL error: {str(e)}"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schema/{session_id}")
def get_schema(session_id: str):
    db_path = get_session_db_path(session_id)

    if not db_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type='table'
            AND name NOT LIKE 'sqlite_%'
            AND name != '__session_metadata'
            ORDER BY name;
            """
        )

        tables = [row[0] for row in cursor.fetchall()]
        schema = []

        for table in tables:
            safe_table_name = table.replace('"', '""')

            cursor.execute(f'PRAGMA table_info("{safe_table_name}");')
            columns = cursor.fetchall()

            schema.append(
                {
                    "table": table,
                    "columns": [
                        {
                            "name": column[1],
                            "type": column[2],
                            "not_null": bool(column[3]),
                            "primary_key": bool(column[5]),
                        }
                        for column in columns
                    ],
                }
            )

        conn.close()

        return {"schema": schema}

    except sqlite3.Error as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ============================================================
# STATIC FILE MOUNTS AND FRONTEND ROUTES
# Keep these near the bottom.
# The catch-all route must stay after the /api routes.
# ============================================================

os.makedirs(os.path.join(WEBSITE_DIR, "data"), exist_ok=True)
os.makedirs(os.path.join(WEBSITE_DIR, "images"), exist_ok=True)

app.mount("/data", StaticFiles(directory=os.path.join(WEBSITE_DIR, "data")), name="data")
app.mount("/images", StaticFiles(directory=os.path.join(WEBSITE_DIR, "images")), name="images")


@app.get("/style.css")
def style_css():
    return FileResponse(os.path.join(WEBSITE_DIR, "style.css"))


@app.get("/app.js")
def app_js():
    return FileResponse(os.path.join(WEBSITE_DIR, "app.js"))


@app.get("/{full_path:path}")
def serve_frontend(full_path: str):
    requested_file = os.path.join(WEBSITE_DIR, full_path)

    if os.path.isfile(requested_file):
        return FileResponse(requested_file)

    return FileResponse(os.path.join(WEBSITE_DIR, "index.html"))


@app.on_event("startup")
def startup_event():
    try:
        print("Auto-syncing latest GitHub DOCX on startup...")
        sync_github_docx()
        print("Auto-sync complete.")
    except Exception as e:
        print("Auto-sync failed:", e)