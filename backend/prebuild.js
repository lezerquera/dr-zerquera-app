const fs = require('fs');
const path = require('path');

// Paths are relative to the location of this script in `backend/`
const sharedDir = path.join(__dirname, 'src', 'shared');
const typesFileSrc = path.join(__dirname, '..', 'frontend', 'src', 'types.ts');
const typesFileDest = path.join(sharedDir, 'types.ts');

console.log('--- Running Prebuild Script ---');
console.log(`Source types file: ${typesFileSrc}`);
console.log(`Destination directory: ${sharedDir}`);

try {
  // Check if source file exists
  if (!fs.existsSync(typesFileSrc)) {
    console.error(`❌ ERROR: Source file not found at ${typesFileSrc}`);
    console.error('The prebuild script could not find the frontend types file to copy.');
    process.exit(1);
  }
    
  // Create the shared directory if it doesn't exist
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
    console.log(`✅ Directory created: ${sharedDir}`);
  } else {
    console.log(`- Directory already exists: ${sharedDir}`);
  }

  // Copy the types.ts file
  fs.copyFileSync(typesFileSrc, typesFileDest);
  console.log(`✅ File copied successfully to ${typesFileDest}`);

  console.log('--- Prebuild Script Finished ---');

} catch (error) {
  console.error('❌ ERROR during prebuild step:', error);
  process.exit(1);
}
