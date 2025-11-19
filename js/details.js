
document.addEventListener('DOMContentLoaded', () => {
    loadDestinationDetails();
});

/**
 * @function loadDestinationDetails
 * Parses the URL query parameter for destination name and displays details
 */
async function loadDestinationDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const destinationName = urlParams.get('destination');

    if (!destinationName) {
        displayError('No destination specified.');
        return;
    }

    try {
        // First, try to find in mock data
        const response = await fetch('data/mock.json');
        if (!response.ok) throw new Error('Failed to load destination data');
        const destinations = await response.json();

        let destination = destinations.find(dest =>
            dest.name.toLowerCase() === destinationName.toLowerCase()
        );

        if (!destination) {
            // If not in mock data, create a dynamic destination for search results
            destination = {
                name: destinationName,
                country: 'Unknown',
                desc: 'Description not available.',
                img: 'assets/0.jpg' // Placeholder image
            };
        }

        // Fetch Wikipedia description for more details
        const wikiDesc = await fetchWikipediaDescription(destinationName);
        if (wikiDesc) {
            destination.desc = wikiDesc;
        }

        displayDestinationDetails(destination);
    } catch (error) {
        console.error('Error loading destination details:', error);
        displayError('Error loading destination details. Please try again later.');
    }
}

/**
 * @function displayDestinationDetails
 * Renders the destination details in the page
 * @param {Object} destination - Destination object with name, desc, img, etc.
 */
function displayDestinationDetails(destination) {
    // Update title
    const titleElement = document.querySelector('.details-title');
    if (titleElement) {
        titleElement.textContent = destination.name;
    }

    // Update gallery images (use the same image for all since we have only one)
    const galleryImgs = document.querySelectorAll('.gallery-grid img');
    galleryImgs.forEach(img => {
        img.src = destination.img;
        img.alt = `${destination.name} view`;
    });

    // Update description
    const descElement = document.querySelector('.details-content p');
    if (descElement) {
        descElement.textContent = destination.desc;
    }

    // Update map placeholder (could be enhanced later with actual map)
    const mapElement = document.querySelector('.map-placeholder p');
    if (mapElement) {
        mapElement.textContent = `Map of ${destination.name}`;
    }
}

/**
 * @function displayError
 * Displays an error message in the details container
 * @param {string} message - Error message to display
 */
function displayError(message) {
    const titleElement = document.querySelector('.details-title');
    if (titleElement) {
        titleElement.textContent = 'Error';
    }
    const descElement = document.querySelector('.details-content p');
    if (descElement) {
        descElement.textContent = message;
    }
}

/**
 * @function fetchWikipediaDescription
 * Fetches destination description from Wikipedia API with caching
 * @param {string} destinationName - Name of the destination to fetch info for
 * @returns {string|null} - Full description or null if not found
 */
async function fetchWikipediaDescription(destinationName) {
    try {
        const cacheKey = destinationName.toLowerCase();
        if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey);

        const response = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(destinationName)}`
        );

        if (!response.ok) {
            console.warn(`Data fetch failed for "${destinationName}": ${response.status}`);
            wikiCache.set(cacheKey, null);
            return null;
        }

        const data = await response.json();
        if (data.extract) {
            wikiCache.set(cacheKey, data.extract);
            return data.extract;
        }

        wikiCache.set(cacheKey, null);
        return null;
    }
    catch (error) {
        console.error(`Error fetching data for "${destinationName}":`, error);
        return null;
    }
}
console.log("Hello DETAILS");
