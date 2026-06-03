#!/bin/bash
set -e
mkdir -p netlify/functions/backend
cp -r huh/backend/* netlify/functions/backend/
cd app/app && npm run build
