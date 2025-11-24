import { UNSPLASH_KEY, fetchUnsplashImage, fetchWikipediaDescription } from './api.js';
import { initializeAppData } from './dataLoader.js';
import { searchJSON } from './datahandler.js';

let mainData;
let validLocations;

// ==================== CURATED LISTS (TOP 10) ====================
const TOP_COUNTRIES = ["France", "Italy", "Japan", "United States", "Egypt", "Spain", "United Kingdom", "Brazil", "Australia", "Greece"];
const TOP_CITIES = ["Paris", "London", "New York", "Tokyo", "Dubai", "Rome", "Barcelona", "Rio de Janeiro", "Bangkok", "Istanbul"];
const TOP_PLACES = [
    "Eiffel Tower", "Pyramids of Giza", "Statue of Liberty", "Colosseum", 
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
        setupTrendingPills();
        setupInspireMeButton();
        await initializeCarousel();
        
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        
        if (searchParam) {
            const searchInput = document.getElementById('search-input');
            if(searchInput) searchInput.value = searchParam;
            performSearch(searchParam);
        }
    }
});

// ==================== TRENDING PILLS FUNCTIONALITY ====================
function setupTrendingPills() {
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const destination = pill.getAttribute('data-destination');
            window.location.href = `results.html?search=${encodeURIComponent(destination)}`;
        });
    });
}

// ==================== INSPIRE ME BUTTON ====================
function setupInspireMeButton() {
    const inspireBtn = document.getElementById('inspire-btn');
    if (!inspireBtn) return;

    inspireBtn.addEventListener('click', () => {
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

// ==================== CAROUSEL FUNCTIONALITY ====================
async function initializeCarousel() {
    const carouselContent = document.getElementById('carousel-content');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!carouselContent || !indicators) return;

    // Clear loading state
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

    // Auto-play carousel
    startCarouselAutoPlay();
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    if (slides.length === 0) return;

    // Remove active class
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');

    // Calculate new slide index
    currentSlide = (currentSlide + direction + slides.length) % slides.length;

    // Add active class
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    // Reset auto-play
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
    }, 5000); // Change every 5 seconds
}

function resetCarouselAutoPlay() {
    clearInterval(carouselInterval);
    startCarouselAutoPlay();
}

// =========================================
// 🔍 SEARCH LOGIC (Shared)
// =========================================

async function performSearch(keyword) {
    const gridContainer = document.getElementById('destination-grid');
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const resultsHeading = document.getElementById('results-heading');
    
    if(!gridContainer) return;

    // Hide carousel, show results grid
    if(carouselWrapper) carouselWrapper.style.display = 'none';
    gridContainer.style.display = 'grid';
    
    // Update heading
    if(resultsHeading) resultsHeading.textContent = `Search Results for "${keyword}"`;

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
    gridContainer.style.display = 'grid';

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
// 🌍 EXPLORE PAGE LOGIC (UPDATED)
// =========================================

async function renderExplorePage() {
    if (!mainData) return;

    // A. Top 10 Countries (Curated)
    const countriesContainer = document.getElementById('explore-countries');
    if(countriesContainer) {
        countriesContainer.innerHTML = '';
        
        for (const country of TOP_COUNTRIES) {
            // Only show if country exists in our data
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

    // B. Top 10 Cities (Curated)
    const citiesContainer = document.getElementById('explore-cities');
    if(citiesContainer) {
        citiesContainer.innerHTML = '';
        
        for (const city of TOP_CITIES) {
            // Find which country this city belongs to
            const parentCountry = findCountryForCity(city);
            if (!parentCountry) continue;

            const places = mainData[parentCountry].cities[city].slice(0, 3);
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

    // C. Top 10 Places (Curated)
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
            // Check if place exists in array (includes partial match logic if needed)
            if (places.includes(targetPlace) || places.some(p => p.includes(targetPlace))) {
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