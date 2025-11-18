document.addEventListener('DOMContentLoaded', () => {
    renderMockData();
    setupSearchListener();
    locationsLoadedPromise = loadValidLocations();
});

let validLocations = {
    cities: [],
    countries: []
};

let mockDataCache = null;
const wikiCache = new Map();
let currentUnsplashController = null;
let locationsLoadedPromise = null;
let searchTimeout = null;

/**
 * @function debounce
 * Delays function execution to prevent rapid-fire calls (e.g., during search)
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Delay in milliseconds (default: 300ms)
 */
function debounce(fn, wait = 300){
    return (...args) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fn(...args), wait);
    };
}

/**
 * @function showGridStatus
 * Displays a color-coded status message in the destination grid area
 * @param {string} message - Message to display
 * @param {string} type - Type of message: 'info' (gray), 'warning' (orange), 'error' (red), 'success' (green)
 */
function showGridStatus(message, type = 'info') {
    const gridContainer = document.getElementById('destination-grid');
    const colorMap = {
        'info': 'gray',
        'warning': 'orange',
        'error': 'red',
        'success': 'green'
    };
    const color = colorMap[type] || colorMap['info'];
    gridContainer.innerHTML = `<p style="text-align: center; color: ${color}; padding: 40px; font-size: 16px;">${message}</p>`;
}

/**
 * @function loadMockDataCache
 * Caches mock.json data to avoid repeated network fetches
 * Returns cached data on subsequent calls
 */
async function loadMockDataCache(){
    if (mockDataCache) return mockDataCache;
    try{
        const response = await fetch('data/mock.json');
        if (!response.ok) throw new Error('Failed to load mock data');
        mockDataCache = await response.json();
        return mockDataCache;
    } 
    catch (error){
        console.error('Failed to cache mock data:', error);
        mockDataCache = [];
        return mockDataCache;
    }
}

/**
 * @function loadValidLocations
 * Loads cities and countries from JSON file to validate user search input
 */
async function loadValidLocations(){
    try{
        const response = await fetch('data/cities-countries.json');
        if (!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        validLocations = await response.json();
        console.log('Valid locations loaded:', validLocations);
    } 
    catch (error){
        console.error('Failed to load valid locations:', error);
    }
}

/**
 * @function renderMockData 
 * Loads and displays initial mock destination data on page load
 */

async function renderMockData(){

    const gridContainer = document.getElementById('destination-grid');

    if (!gridContainer){
        console.error("Error: Could not find element with id 'destination-grid'");
        return; 
    }

    try{
        const destinations = await loadMockDataCache();

        gridContainer.innerHTML = ''; 

        destinations.forEach(dest => {
            const card = document.createElement('div');
            card.className = 'card';

            const cardContent = `
                <img src="${dest.img}" alt="${dest.name}" loading="lazy">
                <div class="body">
                    <h3>${dest.name}</h3>
                    <p>${dest.desc}</p>
                </div>
            `;
            card.innerHTML = cardContent;
            gridContainer.appendChild(card);
        });

    } 
    catch (error){
        console.error('Failed to fetch mock data:', error);
        showGridStatus('Error loading destinations. Please try again later.', 'error');
    }
}

/**
 * @function setupSearchListener
 * Attaches event listeners to search button and input field for search triggering
 */
function setupSearchListener() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (!searchBtn || !searchInput){
        console.error("Error: Could not find search button or input element");
        return;
    }
    
    // Trigger search on button click or Enter key press
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

/**
 * @function handleSearch
 * Main search handler: validates input, fetches mock + Unsplash data, handles errors
 */
async function handleSearch(){
    const searchInput = document.getElementById('search-input');
    const keyword = searchInput.value.trim();
    const gridContainer = document.getElementById('destination-grid');
    
    if (!keyword){
        showGridStatus('Please enter a search keyword', 'warning');
        return;
    }
    
    if (!/^[a-zA-Z\s\-]+$/.test(keyword)){
        showGridStatus('Please enter a valid city or country name', 'warning');
        return;
    }
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    if (locationsLoadedPromise) await locationsLoadedPromise;

    // Validate keyword is a real city or country
    const isValidLocation = validLocations.cities.some(city => 
        city.toLowerCase() === normalizedKeyword
    ) || validLocations.countries.some(country => 
        country.toLowerCase() === normalizedKeyword
    );
    
    if (!isValidLocation){
        showGridStatus("This isn't a city or a country", 'error');
        searchInput.value = '';
        return;
    }
    
    showGridStatus('Searching…', 'info');
    try{
        if (currentUnsplashController){
            currentUnsplashController.abort();
        }
        currentUnsplashController = new AbortController();
        const signal = currentUnsplashController.signal;
        const mockData = await loadMockDataCache();
        
        // Filter mock data by matching city/country name
        const matchingMockData = mockData.filter(dest => 
            dest.name.toLowerCase() === normalizedKeyword || 
            dest.country.toLowerCase() === normalizedKeyword
        );
        
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&client_id=${UNSPLASH_KEY}&per_page=6`,{ signal }
        );
        
        if (response.status === 429){
            const retryAfter = response.headers.get('Retry-After') || 'a few moments';
            console.warn('Unsplash API rate limit reached');
            showGridStatus(`API limit reached. Try again after ${retryAfter}. Showing related destinations...`, 'warning');
            displayCombinedResults(matchingMockData, [], keyword);
            return;
        }
        
        if (response.status >= 500){
            console.warn('Unsplash API server error:', response.status);
            showGridStatus('Service temporarily unavailable. Showing related destinations...', 'warning');
            displayCombinedResults(matchingMockData, [], keyword);
            return;
        }
        
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const data = await response.json();
        const photos = data.results || [];
        displayCombinedResults(matchingMockData, photos, keyword);
    } 
    catch (error){
        if (error.name === 'AbortError'){
            console.log('Previous search cancelled');
            return;
        }
        
        console.error('Failed to fetch data:', error);
        
        if (error.message.includes('Failed to fetch')) showGridStatus('Network error. Please check your connection.', 'error');
        else showGridStatus('Error searching images. Please try again later.', 'error');
    }
    finally{ currentUnsplashController = null; }
}

/**
 * @function displayCombinedResults
 * Combines mock data + Unsplash results, fetches Wikipedia descriptions, and renders cards
 */
async function displayCombinedResults(mockResults, unsplashPhotos, keyword) {
    const gridContainer = document.getElementById('destination-grid');
    gridContainer.innerHTML = '';
    
    const combinedResults = [];
    mockResults.forEach(dest => {
        combinedResults.push({
            url: dest.img,
            title: dest.name,
            description: dest.desc,
            wikiName: dest.name
        });
    });
    
    unsplashPhotos.slice(0, 6 - combinedResults.length).forEach(photo =>{
        combinedResults.push({
            url: photo.urls.small,
            title: keyword,
            description: 'Photo from Unsplash',
            wikiName: keyword
        });
    });
    
    if (combinedResults.length === 0){
        showGridStatus('No results found for your search.', 'info');
        return;
    }
    
    // Fetch Wikipedia descriptions for all results in parallel (with caching)
    const resultsWithDescriptions = await Promise.all(
        combinedResults.map(async (result) => {
            const wikiDesc = await fetchWikipediaDescription(result.wikiName);
            return{
                ...result,
                description: wikiDesc || result.description
            };
        })
    );
    
    resultsWithDescriptions.forEach(result => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const cardContent = `
            <img src="${result.url}" alt="${result.title}" loading="lazy" style="object-fit: cover; height: 200px; width: 100%;">
            <div class="body">
                <h3>${result.title}</h3>
                <p>${result.description}</p>
            </div>
        `;
        card.innerHTML = cardContent;
        gridContainer.appendChild(card);
    });
}

/**
 * @function fetchWikipediaDescription
 * Fetches destination description from Wikipedia API with caching
 * @param {string} destinationName - Name of the destination to fetch info for
 * @returns {string|null} - Truncated description (150 chars) or null if not found
 */
async function fetchWikipediaDescription(destinationName) {
    try{
        const cacheKey = destinationName.toLowerCase();
        if (wikiCache.has(cacheKey)) return wikiCache.get(cacheKey);
        
        const response = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(destinationName)}`
        );
        
        if (!response.ok){
            console.warn(`Data fetch failed for "${destinationName}": ${response.status}`);
            wikiCache.set(cacheKey, null);
            return null;
        }
        
        const data = await response.json();
        if (data.extract){
            const truncatedDesc = data.extract.length > 150 ? data.extract.substring(0, 150) + '...' : data.extract;
            wikiCache.set(cacheKey, truncatedDesc);
            return truncatedDesc;
        }
        
        wikiCache.set(cacheKey, null);
        return null;
    } 
    catch (error){
        console.error(`Error fetching data for "${destinationName}":`, error);
        return null;
    }
}