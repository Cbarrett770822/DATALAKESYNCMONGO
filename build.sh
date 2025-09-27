#!/bin/bash

# Create placeholder logo files
echo "Creating placeholder logo files..."
node public/create-placeholder-logos.js

# Build the application
echo "Building the application..."
npm run build

echo "Build completed successfully!"
