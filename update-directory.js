const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // We'll use csv-parser to read the CSV file

// Config
const ANIMATIONS_DIR = 'animations';
const TEMPLATE_PATH = 'directory-template.html'; 
const OUTPUT_PATH = 'directory.html';
const VIDEO_CSV_PATH = 'animation_files.csv';

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

// Parse the CSV file to create a mapping of filenames to video URLs
async function getVideoUrlMapping() {
  return new Promise((resolve, reject) => {
    const results = {};
    
    // Check if the CSV file exists
    if (!fs.existsSync(VIDEO_CSV_PATH)) {
      console.log(`Video CSV file ${VIDEO_CSV_PATH} not found. Continuing without video links.`);
      return resolve(results);
    }
    
    fs.createReadStream(VIDEO_CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        // Extract filename without extension and map to web address
        const filename = path.basename(data['File Name'], path.extname(data['File Name']));
        results[filename] = data['Web Address'];
      })
      .on('end', () => {
        console.log(`Loaded ${Object.keys(results).length} video mappings from CSV`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

// Main function
async function updateDirectory() {
  console.log('Scanning animations directory...');
  
  // Read the template file
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  
  // Get video URL mapping from CSV
  const videoUrlMap = await getVideoUrlMapping();
  
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
            <div class="project-header">
                <h2>${projectFolder}</h2>
                <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="animations">`;
    
    // Add each animation
    for (const animFile of animationFiles) {
      const animName = path.basename(animFile, '.json');
      const animTitle = getTitleFromFilename(animName);
      const previewId = `preview-${projectFolder}-${animName}`;
      const animPath = `animations/${projectFolder}/${animName}.json`;
      
      // Check if there's a matching video file in the CSV
      const hasVideo = videoUrlMap.hasOwnProperty(animName);
      const videoUrl = hasVideo ? videoUrlMap[animName] : '';
      
      projectCardsHtml += `
                <div class="animation-item">
                    <div class="preview" id="${previewId}" data-animation-path="${animPath}"></div>
                    <div class="animation-details">
                        <a href="./index.html?animation=${animName}&project=${projectFolder}" target="_blank" class="animation-name">${animTitle}</a>
                        <div class="action-buttons">
                            <button class="copy-link" data-animation="${animName}" data-project="${projectFolder}" title="Copy link to animation">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                                </svg>
                            </button>`;
      
      // Add video link arrow if there's a matching video
      if (hasVideo) {
        projectCardsHtml += `
                            <a href="${videoUrl}" target="_blank" class="video-link" title="View video">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                                </svg>
                            </a>`;
      }
      
      projectCardsHtml += `
                        </div>
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