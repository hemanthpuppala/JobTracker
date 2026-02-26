#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "==> Building frontend..."
cd frontend
npm run build
cd ..

echo "==> Activating venv..."
source venv/bin/activate

echo "==> Starting ResumeForge on http://localhost:13952"
echo "    Point resumeforge.hemanthpuppala.com -> localhost:13952"
python3 -m backend.main
