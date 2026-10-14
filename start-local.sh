#!/usr/bin/env sh
cd "$(dirname "$0")"
echo "Starting local server at http://127.0.0.1:8000"
python3 -m http.server 8000
