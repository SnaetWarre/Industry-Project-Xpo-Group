#!/bin/bash
set -e

# Load environment variables
if [ -f "production/.env.production" ]; then
    source production/.env.production
else
    echo "Error: production/.env.production file not found"
    echo "Copy production/.env.example to production/.env.production and fill in your values"
    exit 1
fi

echo "XPO Event Scraper Deployment"
echo "============================"

# Login to Azure
az login

# Login to ACR
az acr login --name $ACR_NAME

# Build and push scraper
echo "Building XPO Scraper..."
docker build \
  -f production/dockerfile \
  -t $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
  .

docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG

# Create or update Container App Job
echo "Updating Container App Job..."

# Check if Container Apps environment exists
if ! az containerapp env show --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "Creating Container Apps environment..."
    az containerapp env create \
        --name $CONTAINER_APP_ENV \
        --resource-group $RESOURCE_GROUP \
        --location westeurope
fi

# Delete existing job if it exists
if az containerapp job show --name $CONTAINER_APP_JOB --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "Deleting existing job..."
    az containerapp job delete \
        --name $CONTAINER_APP_JOB \
        --resource-group $RESOURCE_GROUP \
        --yes
fi

# Get ACR credentials
echo "Getting ACR credentials..."
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Create new scheduled job
echo "Creating scheduled job..."
az containerapp job create \
    --name $CONTAINER_APP_JOB \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_APP_ENV \
    --trigger-type Schedule \
    --cron-expression "$CRON_EXPRESSION" \
    --replica-timeout 7200 \
    --replica-retry-limit 3 \
    --parallelism 1 \
    --replica-completion-count 1 \
    --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
    --registry-server $ACR_NAME.azurecr.io \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --cpu "1.0" \
    --memory "2Gi" \
    --secrets "upload-username=$UPLOAD_SERVICE_USERNAME" "upload-password=$UPLOAD_SERVICE_PASSWORD" \
    --env-vars "API_URL=$API_URL" "UPLOAD_SERVICE_USERNAME=secretref:upload-username" "UPLOAD_SERVICE_PASSWORD=secretref:upload-password" "PYTHONPATH=/app"

echo "✅ Deployment completed!"
echo "Job will run: $CRON_EXPRESSION (Every Saturday 2 AM UTC)"
echo ""
echo "Useful commands:"
echo "  View job: az containerapp job show --name $CONTAINER_APP_JOB --resource-group $RESOURCE_GROUP"
echo "  Run now:  az containerapp job start --name $CONTAINER_APP_JOB --resource-group $RESOURCE_GROUP"
echo "  View logs: az containerapp job logs show --name $CONTAINER_APP_JOB --resource-group $RESOURCE_GROUP"
