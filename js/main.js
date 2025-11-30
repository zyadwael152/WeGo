import { fetchUnsplashImage, fetchWikipediaDescription } from './api.js';
import { initializeAppData } from './dataLoader.js';
import { searchJSON } from './datahandler.js';

// ==================== STATE MANAGEMENT ====================
let mainData;
let validLocations = { cities: [], countries: [] };
let currentUnsplashController = null;
let searchTimeout = null;

// ==================== CURATED LISTS (TOP 10) ====================
const TOP_COUNTRIES = ["France", "Italy", "Japan", "United States", "Egypt", "Spain", "United Kingdom", "Brazil", "Australia", "Greece"];
const TOP_CITIES = ["Paris", "London", "New York", "Cairo", "Dubai", "Rome", "Barcelona", "Rio de Janeiro", "Bangkok", "Istanbul"];
const TOP_PLACES = [
    "Eiffel Tower", "Great Sphinx of Giza", "Statue of Liberty", "Colosseum", 
    "Taj Mahal", "Great Wall of China", "Qaitbay Citadel", "Burj Khalifa", 
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

// The function to limit the rate of function calls
function debounce(fn, wait = 300) {
    return (...args) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => fn(...args), wait);
    };
}

// The function to show status messages in the grid
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

document.addEventListener('DOMContentLoaded', async () =>{
    const appData = await initializeAppData();
    if(appData.initialized){
        mainData = appData.travelData;
        validLocations = appData.citiesCountries;
        console.log("App data initialized successfully");
    } 
    else{
        console.error("App data failed to initialize");
        showGridStatus('Failed to load application data. Please refresh.', 'error');
        return;
    }
    const path = window.location.pathname;
    if (path.includes('explore.html'))
        renderExplorePage();
    else if (path.includes('results.html')){
        const urlParams = new URLSearchParams(window.location.search);
        const searchParam = urlParams.get('search');
        setupSearchListener(); 
        
        if (searchParam){
            const queryText = document.getElementById('query-text');
            if(queryText) queryText.textContent = `"${searchParam}"`;
            performSearch(searchParam);
        }

    } 
    else{
        setupSearchListener();
        setupTrendingPills();
        setupInspireMeButton();
        await initializeCarousel();
        
        const navigationEntries = performance.getEntriesByType("navigation");
        const isReload = navigationEntries.length > 0 && navigationEntries[0].type === 'reload';

        if (isReload) 
            window.history.replaceState({}, document.title, window.location.pathname);
        else{
            const urlParams = new URLSearchParams(window.location.search);
            const searchParam = urlParams.get('search');
            
            if (searchParam){
                const introDiv = document.getElementById('intro');
                if (introDiv) introDiv.style.display = 'none';

                const searchInput = document.getElementById('search-input');
                if(searchInput) searchInput.value = searchParam;
                performSearch(searchParam);
            }
        }
    }
});

// The function to setup trending destination pills
function setupTrendingPills() {
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const destination = pill.getAttribute('data-destination');
            window.location.href = `results.html?search=${encodeURIComponent(destination)}`;
        });
    });
}

// The function to setup the "Inspire Me" button
function setupInspireMeButton() {
    const inspireBtn = document.getElementById('inspire-btn');
    if (!inspireBtn) return;

    inspireBtn.addEventListener('click', () =>{
        if (!mainData) return;
        const allCities = [];
        for (const country in mainData){
            if (mainData[country].cities) 
                allCities.push(...Object.keys(mainData[country].cities));
        }

        if (allCities.length > 0){
            const randomCity = allCities[Math.floor(Math.random() * allCities.length)];
            
            inspireBtn.textContent = '✨ Inspiring...';
            inspireBtn.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                window.location.href = `results.html?search=${encodeURIComponent(randomCity)}`;
            }, 500);
        }
    });
}

// The function to initialize the carousel
async function initializeCarousel() {
    const carouselContent = document.getElementById('carousel-content');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!carouselContent || !indicators) return;

    carouselContent.innerHTML = '';

    for (let i = 0; i < carouselCities.length; i++){
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

// The function to change slides
function changeSlide(direction){
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

// The function to go to a specific slide
function goToSlide(index){
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

// The function to start automatic carousel playback
function startCarouselAutoPlay(){
    carouselInterval = setInterval(() => {
        changeSlide(1);
    }, 5000);
}

// The function to reset carousel autoplay timer
function resetCarouselAutoPlay(){
    clearInterval(carouselInterval);
    startCarouselAutoPlay();
}

// The function to setup search listeners
function setupSearchListener(){
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (!searchBtn || !searchInput) return;
    
    searchBtn.addEventListener('click', () => handleHomeSearch(searchInput));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHomeSearch(searchInput);
    });
}

// The function to handle search from home page
function handleHomeSearch(inputElement){
    const keyword = inputElement.value.trim();
    if (!keyword){
        alert('Please enter a search keyword'); 
        return;
    }
    
    const path = window.location.pathname;
    if (!path.includes('results.html')){
         window.history.pushState({}, '', `?search=${encodeURIComponent(keyword)}`);
         performSearch(keyword);
    } 
    else 
        performSearch(keyword);
}

/**
 * @function performSearch
 * Main search handler: validates input, fetches Data, handles AbortController
 */
async function performSearch(keyword){
    const gridContainer = document.getElementById('destination-grid');
    const carouselWrapper = document.getElementById('carousel-wrapper');
    const resultsHeading = document.getElementById('results-heading');
    
    if(!gridContainer) return;

    if(carouselWrapper) carouselWrapper.style.display = 'none';
    gridContainer.style.display = 'grid'; 
    if(resultsHeading){
        resultsHeading.textContent = `Search Results for "${keyword}"`;
        resultsHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (!keyword){
        showGridStatus('Please enter a search keyword', 'warning');
        return;
    }

    if (!/^[a-zA-Z\s\-]+$/.test(keyword)){
        showGridStatus('Please enter a valid city or country name (Letters only)', 'warning');
        return;
    }

    const normalizedKeyword = keyword.toLowerCase().trim();

    if (validLocations && validLocations.cities && validLocations.countries) {
        const isValidLocation = validLocations.cities.some(city => 
            city.toLowerCase() === normalizedKeyword
        ) || validLocations.countries.some(country => 
            country.toLowerCase() === normalizedKeyword
        );
    }

    showGridStatus('Searching...', 'info');

    try{
        if (currentUnsplashController)
            currentUnsplashController.abort();
        currentUnsplashController = new AbortController();
        const signal = currentUnsplashController.signal;

        const searchResult = await searchJSON(keyword, mainData);

        if (!searchResult || searchResult.results.length === 0) {
            const isValidButNoData = validLocations.cities.some(c => c.toLowerCase() === normalizedKeyword);
            
            if (isValidButNoData)
                showGridStatus(`We recognize "${keyword}", but we don't have detailed travel guides for it yet.`, 'info');
            else
                showGridStatus(`No results found for "${keyword}". Try a major city or country.`, 'warning');
            return;
        }

        await displaySearchResults(searchResult.results, searchResult.type, signal);

    } 
    catch (error){
        if (error.name === 'AbortError'){
            console.log('Search cancelled');
            return;
        }
        console.error('Search error:', error);
        showGridStatus('An error occurred while searching. Please try again.', 'error');
    } 
    finally{
        currentUnsplashController = null;
    }
}

// The function to display search results
async function displaySearchResults(results, type, signal){
    const gridContainer = document.getElementById('destination-grid');
    
    const processCard = async (item) => {
        try{
            const queryTerm = item.imageSearch ? item.imageSearch : item.name;
            let imageUrl = await fetchUnsplashImage(queryTerm, signal);
            
            if (imageUrl === 'assets/0.jpg' && item.images && item.images.length > 0)
                imageUrl = item.images[0];
            
            let description = await fetchWikipediaDescription(item.name);

            if (!description){
                if (item.description) 
                    description = item.description;
                else{
                    if (type === 'country')
                        description = `Explore the beautiness of ${item.name}.`;
                    else if (type === 'city')
                        description = `Explore the beautiness of ${item.name}, ${item.country}.`;
                    else
                        description = `Located in ${item.city}, ${item.country}.`;
                }
            }
            return{
                title: item.name,
                description: description,
                imageUrl: imageUrl
            };
        } 
        catch (err){
            if (err.name === 'AbortError') throw err;
            return null; 
        }
    };

    const allCardsData = await Promise.all(results.map(processCard));

    gridContainer.innerHTML = ''; 

    let hasContent = false;
    allCardsData.forEach((data, index) => { 
        if(data) {
            createCard(gridContainer, data.title, data.description, data.imageUrl, index);
            hasContent = true;
        }
    });
}

// The function to create and append a card to the container
function createCard(container, title, desc, imgUrl, index = 0) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${index * 0.15}s`;
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

// The function to render the Explore page
async function renderExplorePage() {
    if (!mainData) return;

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

    const citiesContainer = document.getElementById('explore-cities');
    if(citiesContainer) {
        citiesContainer.innerHTML = '';
        for (const city of TOP_CITIES) {
            const parentCountry = findCountryForCity(city);
            if (!parentCountry) continue;

            const cityObj = mainData[parentCountry].cities[city];
            
            let places = [];
            if (cityObj.places && Array.isArray(cityObj.places))
                places = cityObj.places.slice(0, 3).map(p => (typeof p === 'object' ? p.name : p));
            
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

// Helper function to find the country for a given city
function findCountryForCity(targetCity){
    for (const country in mainData)
        if (mainData[country].cities && mainData[country].cities[targetCity])
            return country;   
    return null;
}

// Helper function to find the city and country for a given place
function findLocationForPlace(targetPlace) {
    for (const country in mainData) {
        const cities = mainData[country].cities;
        for (const city in cities) {
            const cityObj = cities[city];
            
            const places = cityObj.places || [];
            
            const found = places.some(p => {
                const pName = (typeof p === 'object') ? p.name : p;
                return pName === targetPlace || pName.includes(targetPlace);
            });

            if (found)
                return { city, country };
        }
    }
    return null;
}

// The function to create and append an explore card
function createExploreCard(container, data){
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
// Automatically highlight the current page in Navbar
document.addEventListener('DOMContentLoaded', () => {
    const currentLocation = location.href;
    const menuItem = document.querySelectorAll('nav .links a');
    const menuLength = menuItem.length;

    for (let i = 0; i < menuLength; i++) {
        // If the link href matches the current browser URL
        if (menuItem[i].href === currentLocation) {
            menuItem[i].classList.add("active");
        } else {
            // Ensure other links are NOT active
            menuItem[i].classList.remove("active");
        }
    }
});