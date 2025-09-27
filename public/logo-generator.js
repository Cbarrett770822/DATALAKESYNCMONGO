// Node.js script to generate logo files
const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to generate a logo
function generateLogo(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#1976d2';
  ctx.fillRect(0, 0, size, size);
  
  // Text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size/4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WMS', size/2, size/2 - size/8);
  ctx.fillText('SYNC', size/2, size/2 + size/8);
  
  return canvas.toBuffer('image/png');
}

// Generate logos
try {
  const logo192 = generateLogo(192);
  fs.writeFileSync('public/logo192.png', logo192);
  console.log('Generated logo192.png');
  
  const logo512 = generateLogo(512);
  fs.writeFileSync('public/logo512.png', logo512);
  console.log('Generated logo512.png');
  
  // Generate favicon (32x32)
  const favicon = generateLogo(32);
  fs.writeFileSync('public/favicon.ico', favicon);
  console.log('Generated favicon.ico');
} catch (error) {
  console.error('Error generating logos:', error);
}
