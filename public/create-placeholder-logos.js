// Simple script to create placeholder logo files
const fs = require('fs');

// Base64 encoded 1x1 transparent pixel PNG
const transparentPixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Function to write a base64 string to a file
function writeBase64ToFile(base64String, filePath) {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/png;base64,/, '');
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Write buffer to file
  fs.writeFileSync(filePath, buffer);
  console.log(`Created ${filePath}`);
}

// Create placeholder logo files
writeBase64ToFile(transparentPixelPng, 'public/logo192.png');
writeBase64ToFile(transparentPixelPng, 'public/logo512.png');
writeBase64ToFile(transparentPixelPng, 'public/favicon.ico');

console.log('Placeholder logo files created successfully!');
