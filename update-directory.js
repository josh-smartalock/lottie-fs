const fs = require('fs');
const path = require('path');

// Config
const ANIMATIONS_DIR = 'animations';
const TEMPLATE_PATH = 'directory-template.html'; // We'll create this in step 2
const OUTPUT_PATH = 'directory.html';

// Function to get animation titles from filenames (optional enhancement)
function getTitleFromFilename(filename) {
  // Remove extension and convert dashes/underscores to spaces
  return path.basename(filename, '.json')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
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
  let durationCalculatorJs = '';
  let previewLoaderJs = '';
  
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
      const durationId = `duration-${projectFolder}-${animName}`;
      
      projectCardsHtml += `
                <div class="animation-item" data-animation="${animName}" data-project="${projectFolder}">
                    <div class="preview" id="${previewId}"><div></div></div>
                    <div class="animation-details">
                        <a href="./index.html?animation=${animName}&project=${projectFolder}" target="_blank">${animTitle}</a>
                        <span class="duration" id="${durationId}">...</span>
                        <button class="copy-link" data-animation="${animName}" data-project="${projectFolder}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>`;
      
      // Add to preview loading JavaScript - now using the hover-based loading
      previewLoaderJs += `  setupHoverAnimation('animations/${projectFolder}/${animName}.json', '${previewId}');\n`;
      
      // Add to duration calculation JavaScript
      durationCalculatorJs += `  displayAnimationLength('animations/${projectFolder}/${animName}.json', '${durationId}');\n`;
    }
    
    // Close project card
    projectCardsHtml += `
            </div>
        </div>`;
  }
  
  // Create the hover animation function to include in the script
  const hoverAnimationFunction = `
        // Function to set up hover-based animation loading
        function setupHoverAnimation(jsonPath, containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Container not found: ${containerId}`);
                return;
            }
            
            const parentItem = container.closest('.animation-item');
            if (!parentItem) {
                console.error(`Parent animation item not found for: ${containerId}`);
                return;
            }
            
            let animation = null;
            
            // Add a loading indicator
            const containerInner = container.querySelector('div');
            if (!containerInner) {
                console.error(`Inner container div not found for: ${containerId}`);
                return;
            }
            containerInner.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#999;">Loading...</div>';
            
            // Load the animation with better error handling
            fetch(jsonPath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${jsonPath}: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(animationData => {
                    try {
                        // Clear the loading indicator
                        containerInner.innerHTML = '';
                        
                        // Create the animation immediately but paused
                        animation = lottie.loadAnimation({
                            container: containerInner,
                            renderer: 'svg',
                            loop: true,
                            autoplay: false, // Don't autoplay
                            animationData,
                            rendererSettings: {
                                preserveAspectRatio: 'xMidYMid slice'
                            }
                        });
                        
                        // Stop at first frame to display static image
                        animation.goToAndStop(0, true);
                        
                        // Add events to handle animation errors
                        animation.addEventListener('error', (error) => {
                            console.error(`Animation error for ${jsonPath}:`, error);
                            containerInner.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#999;">Error</div>';
                        });
                        
                        console.log(`Successfully loaded preview for: ${jsonPath}`);
                    } catch (error) {
                        console.error(`Error initializing animation for ${jsonPath}:`, error);
                        containerInner.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#999;">Error</div>';
                    }
                })
                .catch(error => {
                    console.error(`Error loading animation data for ${jsonPath}:`, error);
                    containerInner.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#999;">Error</div>';
                });
            
            // Set up hover events with error handling
            parentItem.addEventListener('mouseenter', function() {
                if (animation) {
                    try {
                        animation.play();
                    } catch (error) {
                        console.error(`Error playing animation for ${jsonPath}:`, error);
                    }
                }
            });
            
            parentItem.addEventListener('mouseleave', function() {
                if (animation) {
                    try {
                        animation.pause();
                    } catch (error) {
                        console.error(`Error pausing animation for ${jsonPath}:`, error);
                    }
                }
            });
        }
    `;
  
  // Replace placeholders in template
  let outputHtml = template
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', projectCardsHtml)
    .replace('/* DURATION_CALCULATOR_PLACEHOLDER */', durationCalculatorJs);
  
  // Insert hover animation function and calls before the closing script tag
  outputHtml = outputHtml.replace(
    '        });',
    `        ${hoverAnimationFunction}
            
            // Set up all hover animations
            ${previewLoaderJs}
        });`
  );
  
  // Write the output file
  fs.writeFileSync(OUTPUT_PATH, outputHtml);
  
  console.log(`Updated directory.html with ${projectFolders.length} projects`);
}

// Run the update
updateDirectory().catch(console.error);