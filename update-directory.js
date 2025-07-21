const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Read CSV file

// Config
const ANIMATIONS_DIR = 'animations';
const TEMPLATE_PATH = 'directory-template.html'; 
const OUTPUT_PATH = 'directory.html';
const VIDEO_CSV_PATH = 'animation_files.csv';

// Get animation titles from filenames
function getTitleFromFilename(filename) {
  // Filename formatting various
  let title = path.basename(filename, '.json');
  title = title.replace(/([a-z])([A-Z])/g, '$1 $2');
  title = title.replace(/[-_]/g, ' ');
  title = title.replace(/\b\w/g, l => l.toUpperCase());

  return title;
}

// Recursively find all JSON files in a directory structure
function findAllJsonFiles(dirPath, basePath = '') {
  const results = [];
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const relativePath = basePath ? path.join(basePath, item) : item;
    
    if (fs.statSync(itemPath).isDirectory()) {
      // Recursively search subdirectories
      results.push(...findAllJsonFiles(itemPath, relativePath));
    } else if (item.endsWith('.json')) {
      results.push({
        filename: item,
        relativePath: relativePath,
        fullPath: itemPath,
        directory: basePath || '.'
      });
    }
  }
  
  return results;
}

// Organize animations by their directory structure
function organizeAnimationsByDirectory(animations) {
  const organized = {};
  
  for (const anim of animations) {
    const dir = anim.directory;
    if (!organized[dir]) {
      organized[dir] = [];
    }
    organized[dir].push(anim);
  }
  
  return organized;
}

// Create a hierarchical structure for nested folders
function createHierarchicalStructure(organized) {
  const hierarchy = {};
  
  for (const [dirPath, animations] of Object.entries(organized)) {
    if (dirPath === '.') {
      // Root level animations
      hierarchy['Root'] = animations;
      continue;
    }
    
    const pathParts = dirPath.split(path.sep);
    let current = hierarchy;
    
    // Build nested structure
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        if (i === pathParts.length - 1) {
          // Last part - add animations
          current[part] = animations;
        } else {
          // Intermediate part - create nested object
          current[part] = {};
        }
      }
      current = current[part];
    }
  }
  
  return hierarchy;
}

// Generate HTML for a nested structure
function generateNestedHTML(structure, parentPath = '', videoUrlMap = {}, level = 0) {
  let html = '';
  
  for (const [name, content] of Object.entries(structure)) {
    if (Array.isArray(content)) {
      // This is a folder with animations
      const currentPath = parentPath ? `${parentPath}/${name}` : name;
      const displayName = name === 'Root' ? 'Root Animations' : name;
      
      html += `
        <div class="project-card" style="margin-left: ${level * 20}px;">
            <div class="project-header">
                <h2>${displayName}</h2>
                <svg class="toggle-icon">
                    <use href="#icon-toggle"></use>
                </svg>
            </div>
            <div class="animations">`;
      
      // Add each animation in this folder
      for (const anim of content) {
        const animName = path.basename(anim.filename, '.json');
        const animTitle = getTitleFromFilename(animName);
        const previewId = `preview-${currentPath.replace(/[\/\\]/g, '-')}-${animName}`;
        const animPath = `animations/${anim.relativePath}`;
        const encodedRelativePath = anim.relativePath.split('/').map(encodeURIComponent).join('/');
        const jsonUrl = `https://josh-smartalock.github.io/lottie-fs/animations/${encodedRelativePath}`;
        
        // For URL parameters, we need the project path (excluding the filename)
        const projectPath = anim.directory === '.' ? '' : anim.directory;
        
        // Check if there's a matching video file in the CSV
        const hasVideo = videoUrlMap.hasOwnProperty(animName);
        const videoUrl = hasVideo ? videoUrlMap[animName] : '';
        
        html += `
                <div class="animation-item">
                    <div class="preview" id="${previewId}" data-animation-path="${animPath}"></div>
                    <div class="animation-details">
                        <a href="./index.html?animation=${animName}${projectPath ? `&project=${encodeURIComponent(projectPath)}` : ''}" target="_blank" class="animation-name">${animTitle}</a>
                        <div class="action-buttons">
                            <button class="copy-link" data-animation="${animName}" data-project="${projectPath}" title="Copy link to animation">
                                <svg class="icon">
                                    <use href="#icon-copy-link"></use>
                                </svg>
                            </button>
                            <button class="copy-json-link" data-json-url="${jsonUrl}" title="Copy direct JSON link">
                                <svg class="icon">
                                    <use href="#icon-json"></use>
                                </svg>
                            </button>`;
        
        // Add video link arrow if there's a matching video
        if (hasVideo) {
          html += `
                            <a href="${videoUrl}" target="_blank" class="video-link" title="View video">
                                <svg class="icon">
                                    <use href="#icon-video"></use>
                                </svg>
                            </a>`;
        }
        
        html += `
                        </div>
                    </div>
                </div>`;
      }
      
      html += `
            </div>
        </div>`;
    } else {
      // This is a nested folder structure
      html += generateNestedHTML(content, parentPath ? `${parentPath}/${name}` : name, videoUrlMap, level + 1);
    }
  }
  
  return html;
}

// Match filenames to video URLs
async function getVideoUrlMapping() {
  return new Promise((resolve, reject) => {
    const results = {};
    
    // Check CSV file 
    if (!fs.existsSync(VIDEO_CSV_PATH)) {
      console.log(`Video CSV file ${VIDEO_CSV_PATH} not found. Continuing without video links.`);
      return resolve(results);
    }
    
    fs.createReadStream(VIDEO_CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        // Extract filename and map to url
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
  
  // Find all JSON files recursively
  const allAnimations = findAllJsonFiles(ANIMATIONS_DIR);
  console.log(`Found ${allAnimations.length} animation files total`);
  
  if (allAnimations.length === 0) {
    console.log('No animations found');
    return;
  }
  
  // Organize animations by directory
  const organizedAnimations = organizeAnimationsByDirectory(allAnimations);
  
  // Create hierarchical structure
  const hierarchy = createHierarchicalStructure(organizedAnimations);
  
  // Generate HTML for the nested structure
  const projectCardsHtml = generateNestedHTML(hierarchy, '', videoUrlMap);
  
  // Replace placeholders in template
  let outputHtml = template
    .replace('<!-- PROJECT_CARDS_PLACEHOLDER -->', projectCardsHtml);
  
  // Write the output file
  fs.writeFileSync(OUTPUT_PATH, outputHtml);
  
  const totalProjects = Object.keys(organizedAnimations).length;
  console.log(`Updated directory.html with ${totalProjects} project folders and ${allAnimations.length} animations`);
  
  // Log the structure for debugging
  console.log('\nDirectory structure:');
  for (const [dir, animations] of Object.entries(organizedAnimations)) {
    console.log(`  ${dir}: ${animations.length} animations`);
  }
}

// Run the update
updateDirectory().catch(console.error);