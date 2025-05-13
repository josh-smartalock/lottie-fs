// lottie-loader.js - Shared JavaScript for loading animations

/**
 * Load a Lottie animation from a JSON file
 * @param {string} containerID - The ID of the HTML element to load the animation into
 * @param {string} animationPath - Path to the JSON animation file
 * @param {object} options - Additional options for the animation
 */
function loadLottieAnimation(containerID, animationPath, options = {}) {
    // Default options
    const defaultOptions = {
        loop: true,
        autoplay: true,
        rendererSettings: {
            filterSize: {
                width: '200%',
                height: '200%',
                x: '-50%',
                y: '-50%'
            }
        }
    };
    
    // Merge options
    const animOptions = { ...defaultOptions, ...options };
    
    // Get container element
    const container = document.getElementById(containerID);
    if (!container) {
        console.error(`Container element with ID "${containerID}" not found`);
        return;
    }
    
    // Load the animation
    fetch(animationPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load animation: ${response.statusText}`);
            }
            return response.json();
        })
        .then(animationData => {
            lottie.loadAnimation({
                container: container,
                renderer: 'svg',
                loop: animOptions.loop,
                autoplay: animOptions.autoplay,
                animationData,
                rendererSettings: animOptions.rendererSettings
            });
        })
        .catch(error => {
            container.innerHTML = `<p>Error loading animation: ${error.message}</p>`;
            console.error('Animation loading error:', error);
        });
}

/**
 * Get URL parameters for loading animations
 * @returns {object} Object containing the parsed URL parameters
 */
function getLottieParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        animation: params.get('animation'),
        project: params.get('project')
    };
}

/**
 * Create the URL for a specific animation
 * @param {string} animation - Animation name
 * @param {string} project - Project name (optional)
 * @returns {string} Full URL to the animation
 */
function createLottieUrl(animation, project = null) {
    const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
    
    if (project) {
        return `${baseUrl}/lottie/?animation=${animation}&project=${project}`;
    } else {
        return `${baseUrl}/lottie/?animation=${animation}`;
    }
}
