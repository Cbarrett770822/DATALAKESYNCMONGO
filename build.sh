#!/bin/bash

# Create placeholder logo files
echo "Creating placeholder logo files..."
node public/create-placeholder-logos.js

# Create ION_Credentials directory if it doesn't exist
echo "Setting up ION credentials..."
mkdir -p ION_Credentials

# Check if we have credentials in environment variables
if [ ! -z "$ION_TENANT" ] && [ ! -z "$ION_SAAK" ] && [ ! -z "$ION_SASK" ] && [ ! -z "$ION_CLIENT_ID" ] && [ ! -z "$ION_CLIENT_SECRET" ]; then
  echo "Creating credentials file from environment variables..."
  cat > ION_Credentials/IONAPI_CREDENTIALS.ionapi << EOF
{
  "ti": "$ION_TENANT",
  "saak": "$ION_SAAK",
  "sask": "$ION_SASK",
  "ci": "$ION_CLIENT_ID",
  "cs": "$ION_CLIENT_SECRET",
  "iu": "${ION_API_URL:-https://mingle-ionapi.inforcloudsuite.com}",
  "pu": "${ION_SSO_URL:-https://mingle-sso.inforcloudsuite.com:443/$ION_TENANT/as/}"
}
EOF
  echo "Credentials file created successfully."
else
  echo "Warning: ION credentials not found in environment variables."
  echo "Please make sure to set them in the Netlify environment or provide a credentials file."
fi

# Build the application
echo "Building the application..."
npm run build

# Copy credentials file to functions directory
echo "Copying credentials to functions directory..."
mkdir -p functions/ION_Credentials
cp -r ION_Credentials/* functions/ION_Credentials/ 2>/dev/null || :

echo "Build completed successfully!"
