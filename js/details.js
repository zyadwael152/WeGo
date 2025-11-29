import { UNSPLASH_KEY, getImageSearchTerm, getLocalDescription, getLocalMapEmbed } from './api.js';
import { loadTravelData } from './dataLoader.js';

document.addEventListener('DOMContentLoaded', async () => {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
    const params = new URLSearchParams(window.location.search);
    const destination = params.get('destination');

    if (!destination) {
        window.location.href = 'index.html';
        return;
    }

    const decodedDestination = decodeURIComponent(destination);
    document.querySelector('.details-title').textContent = decodedDestination;

    const descTitle = document.querySelector('.details-content h2');
    if (descTitle) descTitle.textContent = `About ${decodedDestination}`;

    // --- Load JSON Data for fallbacks ---
    let customData = null;
    try {
        const fullData = await loadTravelData();
        customData = findPlaceData(fullData, decodedDestination);
    } catch (e) {
        console.warn("Could not load local data for fallbacks.");
    }

    try {
        // Determine image search term (custom > destination name)
        const imageQuery = getImageSearchTerm(customData) || decodedDestination;

        await Promise.all([
            loadDestinationImages(imageQuery, customData),
            loadDestinationInfo(decodedDestination, customData)
        ]);
        embedGoogleMap(decodedDestination, customData);
    }
    catch (error) {
        console.error("Error loading details:", error);
        const errorMsg = document.querySelector('.details-content p');
        if (errorMsg) {
            errorMsg.textContent = "Could not load details. Please check your connection.";
        }
    }
});

/**
 * Loads destination images from Unsplash API first, falls back to local JSON images
 */
async function loadDestinationImages(query, customData) {
    const mainImg = document.querySelector('.gallery-img-main');
    const sideImgs = document.querySelectorAll('.gallery-img-side');
    let images = null;

    // Try API first
    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&client_id=${UNSPLASH_KEY}`;
        const res = await fetch(url);
        
        if (res.ok) {
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                images = data.results;
                console.log("Images loaded from Unsplash API");
            }
        }
    } catch (error) {
        console.warn("Failed to fetch images from Unsplash API:", error);
    }

    // Fallback to local JSON images if API failed
    if (!images && customData && customData.images && customData.images.length > 0) {
        images = customData.images.map(url => ({
            urls: { regular: url, small: url },
            alt_description: query
        }));
    }

    // Render images if available
    if (images && images.length > 0) {
        if (mainImg) {
            mainImg.src = images[0].urls.regular || images[0].urls.small;
            mainImg.alt = images[0].alt_description || query;
        }

        if (sideImgs[0] && images[1]) {
            sideImgs[0].src = images[1].urls.small || images[1].urls.regular;
            sideImgs[0].alt = images[1].alt_description || query;
        }
        if (sideImgs[1] && images[2]) {
            sideImgs[1].src = images[2].urls.small || images[2].urls.regular;
            sideImgs[1].alt = images[2].alt_description || query;
        }
    }
}

/**
 * Loads destination info from Wikipedia API first, falls back to local JSON description
 */
async function loadDestinationInfo(query, customData) {
    const contentDiv = document.querySelector('.details-content p');
    let wikiSuccess = false;

    // Try Wikipedia API first
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        const res = await fetch(url);

        if (res.ok) {
            const data = await res.json();
            if (data.extract && contentDiv) {
                contentDiv.innerText = data.extract;
                console.log("Description loaded from Wikipedia API");

                // Add Wikipedia link if available
                if (data.content_urls && data.content_urls.desktop) {
                    const wikiLink = document.createElement('a');
                    wikiLink.href = data.content_urls.desktop.page;
                    wikiLink.target = "_blank";
                    wikiLink.textContent = " Read more on Wikipedia";
                    wikiLink.style.color = "var(--main-color)";
                    wikiLink.style.fontWeight = "600";
                    wikiLink.style.textDecoration = "none";
                    wikiLink.style.display = "block";
                    wikiLink.style.marginTop = "10px";
                    contentDiv.appendChild(wikiLink);
                }
                wikiSuccess = true;
            }
        }
    } catch (error) {
        console.warn('Wikipedia API failed, checking local fallback...', error);
    }

    // Fallback to local JSON description if Wikipedia API failed
    if (!wikiSuccess && contentDiv) {
        const localDesc = getLocalDescription(customData);
        
        if (localDesc) {
            console.log("Using local JSON description fallback");
            contentDiv.innerText = localDesc;
        } else {
            contentDiv.innerText = `Explore the amazing ${query}. (Description currently unavailable)`;
        }
    }
}

/**
 * Embeds Google Map using local JSON data (always prioritized)
 * Falls back to generic search if no local data available
 */
function embedGoogleMap(query, customData) {
    const mapPlaceholder = document.querySelector('.map-placeholder');
    if (!mapPlaceholder) return;

    // 1. Determine the best search query
    let searchQuery = query;

    // Use custom image search term from JSON if available (it's usually more accurate)
    // We support checking the object directly OR using the helper function if you have it
    if (customData && customData.imageSearch) {
        searchQuery = customData.imageSearch;
    } else if (typeof getImageSearchTerm === 'function') {
        const term = getImageSearchTerm(customData);
        if (term) searchQuery = term;
    }

    // 2. Clean up the query
    // Remove keywords that might confuse Google Maps (e.g. searching for "Paris night" might fail, but "Paris" works)
    if (searchQuery) {
        searchQuery = searchQuery
            .replace(" night", "")
            .replace(" interior", "")
            .replace(" view", "")
            .replace(" skyline", "")
            .replace(" aerial", "");
    }

    // 3. Edge Case: Fix specific broad regions if needed
    if (searchQuery.trim().toLowerCase() === 'red sea') {
        searchQuery = 'Red Sea Governorate, Egypt';
    }

    const encodedQuery = encodeURIComponent(searchQuery);

    // 4. Generate Valid Google Maps Embed URL
    // We intentionally ignore 'customData.mapEmbed' here because the JSON contains broken placeholder links.
    // This dynamic URL ensures a working map 100% of the time.
    const iframeSrc = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    mapPlaceholder.innerHTML = `<iframe 
        src="${iframeSrc}" 
        width="100%" 
        height="100%" 
        style="border:0;" 
        allowfullscreen="" 
        loading="lazy">
    </iframe>`;
}

/**
 * Finds place data in the local JSON structure
 */
function findPlaceData(data, targetName) {
    if (!data) return null;
    const lowerTarget = targetName.toLowerCase();

    for (const country in data) {
        const cities = data[country].cities;
        for (const city in cities) {
            const places = cities[city];
            
            // Handle both array and object formats
            const placesArray = Array.isArray(places) ? places : (places.places || []);
            
            for (const place of placesArray) {
                // Check Object (our new format)
                if (typeof place === 'object' && place.name && place.name.toLowerCase() === lowerTarget) {
                    return place;
                }
                // Check String (old format)
                if (typeof place === 'string' && place.toLowerCase() === lowerTarget) {
                    return null;
                }
            }
        }
    }
    return null;
}