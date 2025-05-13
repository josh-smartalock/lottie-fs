const fs = require('fs');
const path = require('path');

// Config
const ANIMATIONS_DIR = 'animations';
const TEMPLATE_PATH = 'directory-template.html'; 
const OUTPUT_PATH = 'directory.html';

// Function to get animation titles from filenames
function getTitleFromFilename(filename) {
  // Remove extension
  let title = path.basename(filename, '.json');

  // Insert space before capital letters that follow a lowercase letter
  title = title.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Convert dashes/underscores to spaces
  title = title.replace(/[-_]/g, ' ');

  // Capitalize the first letter of each word
  title = title.replace(/\b\w/g, l => l.toUpperCase());

  return title;
}

// Main function
async function updateDirectory() {
  console.log('Scanning animations directory...');
  
  // Read the template file
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  
  // Get all project folders
  const projectFolders = fs.readdirSync(ANIMATIONS_DIR)
    .filter(item => fs.statSync(path.join(ANIMATIONS_DIR, item)).isDirectory());
  
  console.log(`Found ${projectFolders.length} project folders`);
  
  // Generate project cards HTML
  let projectCardsHtml = '';
  
  for (const projectFolder of projectFolders) {
    console.log(`Processing project: ${projectFolder}`);
    const animationFiles = fs.readdirSync(path.join(ANIMATIONS_DIR, projectFolder))
      .filter(file => file.endsWith('.json'));
    
    if (animationFiles.length === 0) continue;
    
    // Start project card
    projectCardsHtml += `
        <div class="project-card">
            <h2>${projectFolder.charAt(0).toUpperCase() + projectFolder.slice(1)}</h2>
            <div class="animations">`;
    
    // Add each animation
    for (const animFile of animationFiles) {
      const animName = path.basename(animFile, '.json');
      const animTitle = getTitleFromFilename(animName);
      const previewId = `preview-${projectFolder}-${animName}`;
      const animPath = `animations/${projectFolder}/${animName}.json`;
      
      projectCardsHtml += `
                <div class="animation-item">
                    <div class="preview" id="${previewId}" data-animation-path="${animPath}"></div>
                    <div class="animation-details">
                        <a href="./index.html?animation=${animName}&project=${projectFolder}" target="_blank" class="animation-name">${animTitle}</a>
                        <button class="copy-link" data-animation="${animName}" data-project="${projectFolder}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>`;
    }
    
    // Close project card
    projectCardsHtml += `
            </div>
        </div>`;
  }
  
  // Replace placeholders in template
  let outputHtml = template
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', projectCardsHtml);
  
  // Write the output file
  fs.writeFileSync(OUTPUT_PATH, outputHtml);
  
  console.log(`Updated directory.html with ${projectFolders.length} projects`);
}

// Run the update
updateDirectory().catch(console.error);