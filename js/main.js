import { UNSPLASH_KEY, fetchUnsplashImage, fetchWikipediaDescription } from './api.js';
import { initializeAppData } from './dataLoader.js';
import { searchJSON } from './datahandler.js';

let mainData;
let validLocations;
let locationsLoadedPromise;

document.addEventListener('DOMContentLoaded', async () => {
    const appData = await initializeAppData();
    if(appData.initialized) {
        mainData = appData.travelData;
        validLocations = appData.citiesCountries;
        console.log("App data initialized");
    } else {
        console.error("App data failed to initialize");
        showGridStatus('Error loading application data. Please try again later.', 'error');
    }

    const searchCity = sessionStorage.getItem('searchCity');
    if (searchCity) {
        document.getElementById('search-input').value = searchCity;
        sessionStorage.removeItem('searchCity');
        handleSearch();
    } else {
        renderDefaultDestinations();
    }
    setupSearchListener();
});


let currentUnsplashController = null;
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
 * @function renderDefaultDestinations 
 * Loads and displays 6 popular destinations from Unsplash on page load
 */
async function renderDefaultDestinations(){
    const gridContainer = document.getElementById('destination-grid');

    if (!gridContainer){
        console.error("Error: Could not find element with id 'destination-grid'");
        return; 
    }

    try{
        const defaultCities = ['Paris', 'Tokyo', 'New York', 'Rio de Janeiro', 'Barcelona', 'Cairo'];
        
        gridContainer.innerHTML = '';
        
        // Fetch images for each default city
        const allCards = await Promise.all(
            defaultCities.map(async (city) =>{
                const imageUrl = await fetchUnsplashImage(city);
                const description = await fetchWikipediaDescription(city);
                return { city, imageUrl, description };
            })
        );
        
        allCards.forEach(({ city, imageUrl, description }) => {
            const card = document.createElement('div');
            card.className = 'card';

            const cardContent = `
                <img src="${imageUrl}" alt="${city}" loading="lazy" style="object-fit: cover; height: 200px; width: 100%;">
                <div class="body">
                    <h3>${city}</h3>
                    <p>${description || 'Discover this amazing destination.'}</p>
                    <a href="details.html?destination=${encodeURIComponent(city)}" class="view-more-btn">View More</a>
                </div>
            `;
            card.innerHTML = cardContent;
            gridContainer.appendChild(card);
        });

    } 
    catch (error){
        console.error('Failed to load default destinations:', error);
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
 * Main search handler: validates input, fetches Unsplash data with descriptions
 */
async function handleSearch(){
    const searchInput = document.getElementById('search-input');
    const keyword = searchInput.value.trim();
    
    if (!keyword){
        showGridStatus('Please enter a search keyword', 'warning');
        return;
    }
    
    showGridStatus('Searching…', 'info');

    const searchResult = await searchJSON(keyword, mainData);

    if (!searchResult || searchResult.results.length === 0) {
        showGridStatus('No results found for your search.', 'info');
        return;
    }

    displaySearchResults(searchResult.results, searchResult.type);
}

async function displaySearchResults(results, type) {
    const gridContainer = document.getElementById('destination-grid');
    gridContainer.innerHTML = '';

    if (type === 'country') {
        const allCardsData = await Promise.all(
            results.map(async (city) => {
                const imageUrl = await fetchUnsplashImage(city.name);
                const description = await fetchWikipediaDescription(city.name);
                return {
                    title: city.name,
                    description: description || `A beautiful city in ${city.country}.`,
                    imageUrl: imageUrl,
                };
            })
        );

        allCardsData.forEach(cardData => {
            const card = document.createElement('div');
            card.className = 'card';

            const cardContent = `
                <img src="${cardData.imageUrl}" alt="${cardData.title}" loading="lazy" style="object-fit: cover; height: 200px; width: 100%;">
                <div class="body">
                    <h3>${cardData.title}</h3>
                    <p>${cardData.description}</p>
                    <a href="details.html?destination=${encodeURIComponent(cardData.title)}" class="view-more-btn">View More</a>
                </div>
            `;
            card.innerHTML = cardContent;
            gridContainer.appendChild(card);
        });
    } else {
        const allCardsData = await Promise.all(
            results.map(async (place) => {
                const imageUrl = await fetchUnsplashImage(place.name);
                return {
                    title: place.name,
                    description: place.description,
                    imageUrl: imageUrl,
                };
            })
        );

        allCardsData.forEach(cardData => {
            const card = document.createElement('div');
            card.className = 'card';

            const cardContent = `
                <img src="${cardData.imageUrl}" alt="${cardData.title}" loading="lazy" style="object-fit: cover; height: 200px; width: 100%;">
                <div class="body">
                    <h3>${cardData.title}</h3>
                    <p>${cardData.description}</p>
                    <a href="details.html?destination=${encodeURIComponent(cardData.title)}" class="view-more-btn">View More</a>
                </div>
            `;
            card.innerHTML = cardContent;
            gridContainer.appendChild(card);
        });
    }
}