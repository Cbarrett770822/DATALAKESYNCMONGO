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

# Try multiple potential locations for the credentials file
if [ -d "ION_Credentials" ]; then
  echo "Found ION_Credentials in current directory"
  cp -r ION_Credentials/* functions/ION_Credentials/ 2>/dev/null || :
  echo "Copied credentials from current directory"
fi

if [ -d "../ION_Credentials" ]; then
  echo "Found ION_Credentials in parent directory"
  cp -r ../ION_Credentials/* functions/ION_Credentials/ 2>/dev/null || :
  echo "Copied credentials from parent directory"
fi

if [ -f "functions/ION_Credentials/IONAPI_CREDENTIALS.ionapi" ]; then
  echo "Credentials file exists in functions directory"
else
  echo "WARNING: Credentials file not found in any location"
  echo "Creating credentials file from environment variables if available"
  
  # Create credentials file from environment variables if available
  if [ ! -z "$ION_TENANT" ] && [ ! -z "$ION_SAAK" ] && [ ! -z "$ION_SASK" ] && [ ! -z "$ION_CLIENT_ID" ] && [ ! -z "$ION_CLIENT_SECRET" ]; then
    cat > functions/ION_Credentials/IONAPI_CREDENTIALS.ionapi << EOF
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
    echo "Created credentials file from environment variables"
  else
    echo "WARNING: No credentials available. Using hardcoded credentials as fallback."
  fi
fi

echo "Build completed successfully!"
