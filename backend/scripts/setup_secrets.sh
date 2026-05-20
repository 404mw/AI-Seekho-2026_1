#!/usr/bin/env bash
# Script to automate setting up environment secrets in Google Secret Manager
set -euo pipefail

# Configuration
PROJECT_ID="ai-seekho-2026-493917"

# Move to the backend/ directory (parent of scripts/)
cd "$(dirname "$0")/.."

# Locate .env file
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found in $(pwd)"
  exit 1
fi

echo "Setting active GCP project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# List of secrets we want to import from .env
SECRETS=(
  "DATABASE_URL"
  "SUPABASE_URL"
  "SUPABASE_JWT_SECRET"
  "GEMINI_API_KEY"
  "GEMINI_MODEL"
  "GOOGLE_MAPS_API_KEY"
)

# Helper function to create or update a secret
set_secret() {
  local name="$1"
  local value="$2"
  
  if [ -z "$value" ]; then
    echo "Warning: Secret $name is empty in .env. Skipping."
    return
  fi

  # Check if secret exists in GCP Secret Manager
  if ! gcloud secrets describe "$name" &>/dev/null; then
    echo "Creating secret: $name"
    gcloud secrets create "$name" --replication-policy="automatic"
  else
    echo "Secret already exists: $name"
  fi

  # Add the secret value as a new version
  echo -n "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
  echo "Successfully uploaded value for secret: $name"
}

echo "Parsing .env file for secrets..."
while IFS= read -r line || [ -n "$line" ]; do
  # Clean line endings (CRLF to LF)
  line=$(echo "$line" | tr -d '\r')

  # Skip comments and empty lines
  if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
    continue
  fi
  
  # Parse key and value (split on first '=')
  if [[ "$line" == *"="* ]]; then
    key="${line%%=*}"
    value="${line#*=}"
    
    # Trim leading/trailing whitespace from key
    key=$(echo "$key" | xargs)
    
    # Strip surrounding quotes if present
    value="${value#\"}"
    value="${value%\"}"
    value="${value#\'}"
    value="${value%\'}"
    
    # Check if this key is in our secrets list
    for secret in "${SECRETS[@]}"; do
      if [ "$secret" == "$key" ]; then
        set_secret "$key" "$value"
      fi
    done
  fi
done < "$ENV_FILE"

echo "============================================="
echo "All secrets successfully uploaded to Secret Manager!"
echo "============================================="
