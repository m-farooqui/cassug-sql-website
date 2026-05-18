#!/usr/bin/env bash
set -e

echo "Starting Render setup..."

echo "Creating dataset folders..."
mkdir -p backend/data/databases/master
mkdir -p backend/data/databases/sessions
mkdir -p website/data/datasets

echo "Copying sample datasets into frontend dataset folder..."
cp -r website/data/sample_datasets/* website/data/datasets/ || true

echo "Loading sample datasets into SQLite databases..."
cd backend
python load_domain_datasets.py

echo "Starting FastAPI..."
uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}