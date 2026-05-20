#!/usr/bin/env bash
# Script to automate deployment of AI-Seekho backend to Google Cloud Run
set -euo pipefail

# Configuration
PROJECT_ID="ai-seekho-2026-493917"
REGION="asia-south1"
SERVICE_NAME="ai-seekho-backend"
REPO_NAME="ai-seekho-repo"

# Move to the backend/ directory (parent of scripts/)
cd "$(dirname "$0")/.."

echo "Setting active GCP project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"

echo "Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# Check if Artifact Registry repository exists, and create it if not
echo "Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &>/dev/null; then
  echo "Creating Artifact Registry repository '$REPO_NAME' in region '$REGION'..."
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for AI-Seekho services"
else
  echo "Artifact Registry repository already exists."
fi

# Retrieve GCP Project Number for IAM permissions binding
echo "Retrieving project number..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
COMPUTE_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant Secret Manager Secret Accessor role to the default Compute service account (used by Cloud Run)
echo "Ensuring Cloud Run has access to Secret Manager..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

# Build image using Cloud Build (remote container build)
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
echo "Submitting build to Google Cloud Build (Image tag: $IMAGE_TAG)..."
gcloud builds submit --tag "$IMAGE_TAG" .

# Deploy the image to Google Cloud Run
echo "Deploying to Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_JWT_SECRET=SUPABASE_JWT_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,GEMINI_MODEL=GEMINI_MODEL:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest"

echo "============================================="
echo "Deployment completed successfully!"
echo "Service URL can be found in the output above."
echo "============================================="
