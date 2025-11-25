import { UNSPLASH_KEY } from './api.js';
import { loadTravelData } from './dataLoader.js';

document.addEventListener('DOMContentLoaded', async () => {
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

    // --- NEW: Load JSON Data to find custom overrides ---
    let customData = null;
    try {
        const fullData = await loadTravelData();
        customData = findPlaceData(fullData, decodedDestination);
    } catch (e) {
        console.warn("Could not load local data for fallbacks.");
    }
    // ----------------------------------------------------

    try {
        // Use custom image search term if available in JSON, otherwise use destination name
        const imageQuery = (customData && customData.imageSearch) ? customData.imageSearch : decodedDestination;

        await Promise.all([
            loadDestinationImages(imageQuery),
            loadDestinationInfo(decodedDestination, customData) // Pass customData for fallback
        ]);
        embedGoogleMap(decodedDestination, customData); // Pass customData for map override
    }
    catch (error) {
        console.error("Error loading details:", error);
        const errorMsg = document.querySelector('.details-content p');
        if (errorMsg) {
            errorMsg.textContent = "Could not load details. Please check your connection.";
        }
    }
});

async function loadDestinationImages(query) {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&client_id=${UNSPLASH_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Unsplash API error');

    const data = await res.json();
    const images = data.results;

    if (images && images.length > 0) {
        const mainImg = document.querySelector('.gallery-img-main');
        const sideImgs = document.querySelectorAll('.gallery-img-side');

        if (mainImg) {
            mainImg.src = images[0].urls.regular;
            mainImg.alt = images[0].alt_description || query;
        }

        if (sideImgs[0] && images[1]) {
            sideImgs[0].src = images[1].urls.small;
            sideImgs[0].alt = images[1].alt_description || query;
        }
        if (sideImgs[1] && images[2]) {
            sideImgs[1].src = images[2].urls.small;
            sideImgs[1].alt = images[2].alt_description || query;
        }
    }
}

// EDITED: Now accepts customData as a fallback
async function loadDestinationInfo(query, customData) {
    const contentDiv = document.querySelector('.details-content p');
    let wikiSuccess = false;

    try {
        // 1. Try Wikipedia API
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        const res = await fetch(url);

        if (res.ok) {
            const data = await res.json();
            if (data.extract && contentDiv) {
                contentDiv.innerText = data.extract;

                // Your original logic to create the link
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
        console.warn('Wikipedia API failed, checking fallback...');
    }

    // 2. Fallback: If Wiki failed (or 404), use JSON description
    if (!wikiSuccess && contentDiv) {
        if (customData && customData.description) {
            console.log("Using JSON fallback description.");
            contentDiv.innerText = customData.description;
        } else {
            contentDiv.innerText = `Explore the amazing ${query}. (Description currently unavailable)`;
        }
    }
}

// EDITED: Now checks for custom map embed
// Corrected Map Function
function embedGoogleMap(query, customData) {
    const mapPlaceholder = document.querySelector('.map-placeholder');
    if (!mapPlaceholder) return;

    // 1. Define the Search Query
    // If we have a specific imageSearch term in JSON (e.g. "Khan el-Khalili bazaar"), 
    // it's usually precise enough for Maps too. Otherwise use the name.
    let searchQuery = query;
    if (customData && customData.imageSearch) {
        searchQuery = customData.imageSearch.replace(" night", "").replace(" interior", ""); // Clean up search terms slightly
    }

    const encodedQuery = encodeURIComponent(searchQuery);

    // 2. Generate Valid Google Maps Embed URL (No API Key needed for this format)
    const iframeSrc = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

    // 3. Render
    mapPlaceholder.innerHTML = `<iframe 
        src="${iframeSrc}" 
        width="100%" 
        height="100%" 
        style="border:0;" 
        allowfullscreen="" 
        loading="lazy">
    </iframe>`;
}

// --- NEW HELPER FUNCTION ---
function findPlaceData(data, targetName) {
    if (!data) return null;
    const lowerTarget = targetName.toLowerCase();

    for (const country in data) {
        const cities = data[country].cities;
        for (const city in cities) {
            const places = cities[city];
            for (const place of places) {
                // Check Object (our new format)
                if (typeof place === 'object' && place.name.toLowerCase() === lowerTarget) {
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