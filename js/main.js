import { fetchUnsplashImage, fetchWikipediaDescription } from './api.js';
import { initializeAppData } from './dataLoader.js';
import { searchJSON } from './datahandler.js';

// ==================== STATE MANAGEMENT ====================
let mainData;
let validLocations = { cities: [], countries: [] };

// Search State (From Version 1)
let currentUnsplashController = null;
let searchTimeout = null;

// ==================== CURATED LISTS (TOP 10) ====================
const TOP_COUNTRIES = ["France", "Italy", "Japan", "United States", "Egypt", "Spain", "United Kingdom", "Brazil", "Australia", "Greece"];
const TOP_CITIES = ["Paris", "London", "New York", "Tokyo", "Dubai", "Rome", "Barcelona", "Rio de Janeiro", "Bangkok", "Istanbul"];
const TOP_PLACES = [
    "Eiffel Tower", "Great Sphinx of Giza", "Statue of Liberty", "Colosseum", 
    "Taj Mahal", "Great Wall of China", "Machu Picchu", "Burj Khalifa", 
    "Sydney Opera House", "Christ the Redeemer"
];

// ==================== CAROUSEL DATA ====================
const carouselCities = [
    { name: 'Paris', fact: 'The Eiffel Tower was originally intended to be a temporary structure for the 1889 World Fair!' },
    { name: 'Tokyo', fact: 'Tokyo has more Michelin-starred restaurants than any other city in the world!' },
    { name: 'New York', fact: 'Central Park appears in more than 350 movies, making it one of the most filmed locations!' },
    { name: 'Rio de Janeiro', fact: 'Christ the Redeemer statue was struck by lightning and lost a finger in 2014!' },
    { name: 'Barcelona', fact: "Gaudí's Sagrada Familia has been under construction since 1882 and counting!" },
    { name: 'Cairo', fact: 'Cairo has the oldest subway system in Africa, opening in 1987.' }
];

let currentSlide = 0;
let carouselInterval;

// ==================== UTILITIES (From Version 1) ====================

/**
 * Delays function execution to prevent rapid-fire calls
 */
function debounce(fn, wait = 300) {
    return (...args) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fn(...args), wait);
    };
}

/**
 * Displays a color-coded status message in the destination grid area
 */
function showGridStatus(message, type = 'info') {
    const gridContainer = document.getElementById('destination-grid');
    if (!gridContainer) return;

    const colorMap = {
        'info': 'gray',
        'warning': 'orange',
        'error': 'red',
        'success': 'green'
    };
    const color = colorMap[type] || colorMap['info'];
    gridContainer.style.display = 'block'; // Ensure it's visible
    gridContainer.innerHTML = `<p style="text-align: center; color: ${color}; padding: 40px; font-size: 1.2rem; font-weight: 500;">${message}</p>`;
}

// ==================== MAIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Load Data Globally
    const appData = await initializeAppData();
    if(appData.initialized) {
        mainData = appData.travelData;
        validLocations = appData.citiesCountries;
        console.log("App data initialized successfully");
    } else {
        console.error("App data failed to initialize");
        showGridStatus('Failed to load application data. Please refresh.', 'error');
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
        
        setupSearchListener(); // Allow searching from results page header too
        
        if (searchParam) {
            const queryText = document.getElementById('query-text');
            if(queryText) queryText.textContent = `"${searchParam}"`;
            performSearch(searchParam);
        }

    } else {
        // --- HOME PAGE ---
        setupSearchListener();
        setupTrendingPills();
        setupInspireMeButton();
        await initializeCarousel();
        
        // Handle query params on home page if redirected
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        
        if (searchParam) {
            const searchInput = document.getElementById('search-input');
            if(searchInput) searchInput.value = searchParam;
            performSearch(searchParam);
        }
    }
});

// ==================== FEATURE: TRENDING PILLS ====================
function setupTrendingPills() {
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const destination = pill.getAttribute('data-destination');
            window.location.href = `results.html?search=${encodeURIComponent(destination)}`;
        });
    });
}

// ==================== FEATURE: INSPIRE ME BUTTON ====================
function setupInspireMeButton() {
    const inspireBtn = document.getElementById('inspire-btn');
    if (!inspireBtn) return;

    inspireBtn.addEventListener('click', () => {
        if (!mainData) return;

        // Get all cities from mainData
        const allCities = [];
        for (const country in mainData) {
            if (mainData[country].cities) {
                allCities.push(...Object.keys(mainData[country].cities));
            }
        }

        if (allCities.length > 0) {
            // Pick random city
            const randomCity = allCities[Math.floor(Math.random() * allCities.length)];
            
            // Add fun animation before redirect
            inspireBtn.textContent = '✨ Inspiring...';
            inspireBtn.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                window.location.href = `results.html?search=${encodeURIComponent(randomCity)}`;
            }, 500);
        }
    });
}

// ==================== FEATURE: CAROUSEL ====================
async function initializeCarousel() {
    const carouselContent = document.getElementById('carousel-content');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!carouselContent || !indicators) return;

    carouselContent.innerHTML = '';

    // Create slides
    for (let i = 0; i < carouselCities.length; i++) {
        const city = carouselCities[i];
        const imageUrl = await fetchUnsplashImage(city.name);
        
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${i === 0 ? 'active' : ''}`;
        slide.innerHTML = `
            <img src="${imageUrl}" alt="${city.name}" class="carousel-image">
            <div class="carousel-info">
                <h3 class="carousel-title">${city.name}</h3>
                <p class="carousel-fact">💡 ${city.fact}</p>
            </div>
        `;
        carouselContent.appendChild(slide);

        // Create indicator
        const indicator = document.createElement('div');
        indicator.className = `indicator ${i === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToSlide(i));
        indicators.appendChild(indicator);
    }

    // Setup navigation buttons
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (prevBtn) prevBtn.addEventListener('click', () => changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeSlide(1));

    startCarouselAutoPlay();
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;

    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');

    currentSlide = (currentSlide + direction + slides.length) % slides.length;

    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    resetCarouselAutoPlay();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;

    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');

    currentSlide = index;

    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    resetCarouselAutoPlay();
}

function startCarouselAutoPlay() {
    carouselInterval = setInterval(() => {
        changeSlide(1);
    }, 5000);
}

function resetCarouselAutoPlay() {
    clearInterval(carouselInterval);
    startCarouselAutoPlay();
}

// =========================================
// 🔍 SEARCH LOGIC (MERGED & IMPROVED)
// =========================================

function setupSearchListener() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (!searchBtn || !searchInput) return;
    
    // Apply Debounce from Version 1 logic if typing live results, 
    // but since this redirects or performs full search, direct event is fine.
    // However, we apply validation before submission.
    
    searchBtn.addEventListener('click', () => handleHomeSearch(searchInput));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHomeSearch(searchInput);
    });
}

function handleHomeSearch(inputElement) {
    const keyword = inputElement.value.trim();
    if (!keyword) {
        // Using alert here as per Version 2, but could be replaced with status msg
        alert('Please enter a search keyword'); 
        return;
    }
    
    // If we are on home page, perform search here.
    // If on home page and want to redirect:
    const path = window.location.pathname;
    if (!path.includes('results.html')) {
         // Optional: redirect to results page
         // window.location.href = `results.html?search=${encodeURIComponent(keyword)}`;
         // OR perform in-place search (Version 1 style):
         performSearch(keyword);
    } else {
         performSearch(keyword);
    }
}

/**
 * @function performSearch
 * Main search handler: validates input, fetches Data, handles AbortController
 */
async function performSearch(keyword) {
    const gridContainer = document.getElementById('destination-grid');
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const resultsHeading = document.getElementById('results-heading');
    
    if(!gridContainer) return;

    // 1. UI RESET
    if(carouselWrapper) carouselWrapper.style.display = 'none';
    gridContainer.style.display = 'grid'; // Ensure grid layout
    if(resultsHeading) resultsHeading.textContent = `Search Results for "${keyword}"`;
    
    // 2. INPUT VALIDATION (From Version 1)
    if (!keyword) {
        showGridStatus('Please enter a search keyword', 'warning');
        return;
    }

    if (!/^[a-zA-Z\s\-]+$/.test(keyword)) {
        showGridStatus('Please enter a valid city or country name (Letters only)', 'warning');
        return;
    }

    const normalizedKeyword = keyword.toLowerCase().trim();

    // 3. LOGICAL VALIDATION (Using validLocations from JSON)
    // Check if it's a real place before searching internal data
    if (validLocations && validLocations.cities && validLocations.countries) {
        const isValidLocation = validLocations.cities.some(city => 
            city.toLowerCase() === normalizedKeyword
        ) || validLocations.countries.some(country => 
            country.toLowerCase() === normalizedKeyword
        );

        if (!isValidLocation) {
            // It might be a specific place (landmark) inside mainData, so we double check mainData below
            // But if it's garbage text, we warn user.
            // We proceed cautiously.
        }
    }

    showGridStatus('Searching...', 'info');

    try {
        // 4. ABORT CONTROLLER (From Version 1)
        if (currentUnsplashController) {
            currentUnsplashController.abort();
        }
        currentUnsplashController = new AbortController();
        const signal = currentUnsplashController.signal;

        // 5. INTERNAL DATA SEARCH
        const searchResult = await searchJSON(keyword, mainData);

        if (!searchResult || searchResult.results.length === 0) {
            // Fallback: If not in our JSON, check if it's a valid city in lists
            // If it is valid but not in our JSON, show specific message
            const isValidButNoData = validLocations.cities.some(c => c.toLowerCase() === normalizedKeyword);
            
            if (isValidButNoData) {
                showGridStatus(`We recognize "${keyword}", but we don't have detailed travel guides for it yet.`, 'info');
            } else {
                showGridStatus(`No results found for "${keyword}". Try a major city or country.`, 'warning');
            }
            return;
        }

        // 6. RENDER RESULTS
        await displaySearchResults(searchResult.results, searchResult.type, signal);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Search cancelled');
            return;
        }
        console.error('Search error:', error);
        showGridStatus('An error occurred while searching. Please try again.', 'error');
    } finally {
        currentUnsplashController = null;
    }
}

async function displaySearchResults(results, type, signal) {
    const gridContainer = document.getElementById('destination-grid');
    
    // Helper to process data in parallel
    const processCard = async (item) => {
        try {
            // 1. Fetch Image
            const imageUrl = await fetchUnsplashImage(item.name, signal);
            
            // 2. PRIORITY 1: Try Wikipedia Description
            let description = await fetchWikipediaDescription(item.name);

            // 3. PRIORITY 2: If Wiki failed, try JSON 'description' property
            // (This exists for Places in your new JSON, but not usually for Cities/Countries)
            if (!description && item.description) {
                description = item.description;
            }

            // 4. PRIORITY 3: Generic Fallback
            if (!description) {
                if (type === 'country') {
                    description = `Explore the beautiful country of ${item.name}.`;
                } else if (type === 'city') {
                    description = `Explore the beautiful city of ${item.name}, ${item.country}.`;
                } else {
                    description = `Located in ${item.city}, ${item.country}.`;
                }
            }

            return {
                title: item.name,
                description: description,
                imageUrl: imageUrl
            };
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            return null;
        }
    };

    const allCardsData = await Promise.all(results.map(processCard));

    gridContainer.innerHTML = ''; 

    let hasContent = false;
    allCardsData.forEach(data => {
        if(data) {
            createCard(gridContainer, data.title, data.description, data.imageUrl);
            hasContent = true;
        }
    });
}

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

    // A. Top 10 Countries
    const countriesContainer = document.getElementById('explore-countries');
    if(countriesContainer) {
        countriesContainer.innerHTML = '';
        for (const country of TOP_COUNTRIES) {
            if (!mainData[country]) continue;

            const citiesObj = mainData[country].cities;
            const subCities = Object.keys(citiesObj).slice(0, 3); 
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

    // B. Top 10 Cities
    const citiesContainer = document.getElementById('explore-cities');
    if(citiesContainer) {
        citiesContainer.innerHTML = '';
        for (const city of TOP_CITIES) {
            const parentCountry = findCountryForCity(city);
            if (!parentCountry) continue;

            const rawPlaces = mainData[parentCountry].cities[city].slice(0, 3);
            const places = rawPlaces.map(p => (typeof p === 'object' ? p.name : p));
            
            const imageUrl = await fetchUnsplashImage(city);
            createExploreCard(citiesContainer, {
                title: city,
                image: imageUrl,
                listItems: places,
                btnText: `Visit ${city}`,
                link: `results.html?search=${encodeURIComponent(city)}`
            });
        }
    }

    // C. Top 10 Places
    const placesContainer = document.getElementById('explore-places');
    if(placesContainer) {
        placesContainer.innerHTML = '';
        for (const place of TOP_PLACES) {
            const locationInfo = findLocationForPlace(place);
            if (!locationInfo) continue;

            const imageUrl = await fetchUnsplashImage(place);
            
            createExploreCard(placesContainer, {
                title: place,
                image: imageUrl,
                listItems: [`${locationInfo.city}, ${locationInfo.country}`],
                btnText: 'View Details',
                link: `details.html?destination=${encodeURIComponent(place)}`
            });
        }
    }
}

// --- Helper Functions for Data Lookup ---

function findCountryForCity(targetCity) {
    for (const country in mainData) {
        if (mainData[country].cities && mainData[country].cities[targetCity]) {
            return country;
        }
    }
    return null;
}

function findLocationForPlace(targetPlace) {
    for (const country in mainData) {
        const cities = mainData[country].cities;
        for (const city in cities) {
            const places = cities[city];
            
            // FIX: handle both Strings and Objects safely
            const found = places.some(p => {
                const pName = (typeof p === 'object') ? p.name : p;
                return pName === targetPlace || pName.includes(targetPlace);
            });

            if (found) {
                return { city, country };
            }
        }
    }
    return null;
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