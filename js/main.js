import { UNSPLASH_KEY, fetchUnsplashImage, fetchWikipediaDescription } from './api.js';
import { initializeAppData } from './dataLoader.js';
import { searchJSON } from './datahandler.js';

let mainData;
let validLocations;

// === MAIN INITIALIZATION ===
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Load Data Globally
    const appData = await initializeAppData();
    if(appData.initialized) {
        mainData = appData.travelData;
        validLocations = appData.citiesCountries;
        console.log("App data initialized");
    } else {
        console.error("App data failed to initialize");
        return;
    }

    // 2. Detect Page
    const path = window.location.pathname;

    if (path.includes('explore.html')) {
        // --- EXPLORE PAGE ---
        renderExplorePage();
    
    } else if (path.includes('results.html')) {
        // --- RESULTS PAGE ---
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        
        if (searchParam) {
            const queryText = document.getElementById('query-text');
            if(queryText) queryText.textContent = `"${searchParam}"`;
            performSearch(searchParam);
        }

    } else {
        // --- HOME PAGE ---
        setupSearchListener();
        
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        
        if (searchParam) {
            const searchInput = document.getElementById('search-input');
            if(searchInput) searchInput.value = searchParam;
            performSearch(searchParam);
        } else {
            renderDefaultDestinations();
        }
    }
});

// =========================================
// 🔍 SEARCH LOGIC (Shared)
// =========================================

async function performSearch(keyword) {
    const gridContainer = document.getElementById('destination-grid');
    if(!gridContainer) return;

    gridContainer.innerHTML = '<p class="loader">Searching...</p>';

    const searchResult = await searchJSON(keyword, mainData);

    if (!searchResult || searchResult.results.length === 0) {
        gridContainer.innerHTML = '<p class="loader">No results found.</p>';
        return;
    }

    displaySearchResults(searchResult.results, searchResult.type);
}

function setupSearchListener() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (!searchBtn || !searchInput) return;
    
    searchBtn.addEventListener('click', () => handleHomeSearch(searchInput));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHomeSearch(searchInput);
    });
}

function handleHomeSearch(inputElement) {
    const keyword = inputElement.value.trim();
    if (!keyword) {
        alert('Please enter a search keyword');
        return;
    }
    performSearch(keyword);
}

async function displaySearchResults(results, type) {
    const gridContainer = document.getElementById('destination-grid');
    gridContainer.innerHTML = '';

    // Helper to process data
    const processCard = async (item) => {
        // 1. Fetch Image
        const imageUrl = await fetchUnsplashImage(item.name);
        
        // 2. Fetch Real Description from Wikipedia
        const wikiDesc = await fetchWikipediaDescription(item.name);
        let description = wikiDesc;

        // 3. Fallback if Wikipedia has no data
        if (!description) {
            if (type === 'country') {
                description = `Explore the beautiful city of ${item.name} in ${item.country}.`;
            } else {
                description = `Located in ${item.city}, ${item.country}`;
            }
        }

        return {
            title: item.name,
            description: description,
            imageUrl: imageUrl
        };
    };

    const allCardsData = await Promise.all(results.map(processCard));

    allCardsData.forEach(data => {
        createCard(gridContainer, data.title, data.description, data.imageUrl);
    });
}

/**
 * Creates a standard card that links to DETAILS.HTML
 */
function createCard(container, title, desc, imgUrl) {
    const card = document.createElement('div');
    card.className = 'card';

    const cardContent = `
        <img src="${imgUrl}" alt="${title}" loading="lazy" style="object-fit: cover; height: 200px; width: 100%;">
        <div class="body">
            <h3>${title}</h3>
            <p>${desc || 'Discover this amazing destination.'}</p>
            <a href="details.html?destination=${encodeURIComponent(title)}" class="view-more-btn">View More</a>
        </div>
    `;
    card.innerHTML = cardContent;
    container.appendChild(card);
}

// =========================================
// 🌍 EXPLORE PAGE LOGIC
// =========================================

async function renderExplorePage() {
    if (!mainData) return;

    // A. Countries
    const countriesContainer = document.getElementById('explore-countries');
    if(countriesContainer) {
        countriesContainer.innerHTML = '';
        const countriesList = Object.keys(mainData).slice(0, 10);
        for (const country of countriesList) {
            const subCities = Object.keys(mainData[country].cities).slice(0, 3); 
            const imageUrl = await fetchUnsplashImage(country);
            
            createExploreCard(countriesContainer, {
                title: country,
                image: imageUrl,
                listItems: subCities,
                btnText: `Explore ${country}`,
                link: `results.html?search=${encodeURIComponent(country)}`
            });
        }
    }

    // B. Cities
    const citiesContainer = document.getElementById('explore-cities');
    if(citiesContainer) {
        citiesContainer.innerHTML = '';
        let cityCount = 0;
        outerLoop: for (const country in mainData) {
            for (const city in mainData[country].cities) {
                if (cityCount >= 10) break outerLoop;
                const places = mainData[country].cities[city].slice(0, 3);
                const imageUrl = await fetchUnsplashImage(city);

                createExploreCard(citiesContainer, {
                    title: city,
                    image: imageUrl,
                    listItems: places,
                    btnText: `Visit ${city}`,
                    link: `results.html?search=${encodeURIComponent(city)}`
                });
                cityCount++;
            }
        }
    }

    // C. Places
    const placesContainer = document.getElementById('explore-places');
    if(placesContainer) {
        placesContainer.innerHTML = '';
        let placeCount = 0;
        outerLoopPlaces: for (const country in mainData) {
            for (const city in mainData[country].cities) {
                const places = mainData[country].cities[city];
                for (const place of places) {
                    if (placeCount >= 10) break outerLoopPlaces;
                    const imageUrl = await fetchUnsplashImage(place);
                    
                    createExploreCard(placesContainer, {
                        title: place,
                        image: imageUrl,
                        listItems: [`${city}, ${country}`],
                        btnText: 'View Details',
                        link: `details.html?destination=${encodeURIComponent(place)}`
                    });
                    placeCount++;
                }
            }
        }
    }
}

function createExploreCard(container, data) {
    const card = document.createElement('div');
    card.className = 'explore-card';
    const listHTML = data.listItems.map(item => `<li>${item}</li>`).join('');

    card.innerHTML = `
        <div class="card-image-container">
            <img src="${data.image}" alt="${data.title}" loading="lazy">
            <div class="card-overlay-title">${data.title}</div>
        </div>
        <div class="card-content">
            <ul class="sub-list">${listHTML}</ul>
            <a href="${data.link}" class="action-btn">${data.btnText}</a>
        </div>
    `;
    container.appendChild(card);
}

// =========================================
// 🏠 DEFAULT HOME RENDER
// =========================================

async function renderDefaultDestinations(){
    const gridContainer = document.getElementById('destination-grid');
    if (!gridContainer) return; 

    try{
        const defaultCities = ['Paris', 'Tokyo', 'New York', 'Rio de Janeiro', 'Barcelona', 'Cairo'];
        gridContainer.innerHTML = '';
        
        const allCards = await Promise.all(
            defaultCities.map(async (city) =>{
                const imageUrl = await fetchUnsplashImage(city);
                const description = await fetchWikipediaDescription(city);
                return { city, imageUrl, description };
            })
        );
        
        allCards.forEach(({ city, imageUrl, description }) => {
            createCard(gridContainer, city, description, imageUrl);
        });

    } catch (error){
        console.error('Failed to load default destinations:', error);
        gridContainer.innerHTML = '<p>Error loading destinations.</p>';
    }
}