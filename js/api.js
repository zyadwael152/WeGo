export const UNSPLASH_KEY = "gTvLtdY4Qu-uSwfyuOaWTs_OhtldDPyggw4-qDH5_o4";

const wikiCache = new Map();

/**
 * @function fetchUnsplashImage
 * Fetches a single random image for a destination from Unsplash API
 * @param {string} destination - Name of the destination
 * @param {AbortSignal} [signal] - Optional signal to cancel request
 * @returns {string} - URL of the image or placeholder if not found
 */
export async function fetchUnsplashImage(destination, signal = null) {
    try {
        const options = signal ? { signal } : {};
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination)}&client_id=${UNSPLASH_KEY}&per_page=1`,
            options
        );

        if (!response.ok) {
            console.warn(`Failed to fetch image for ${destination}: ${response.status}`);
            return 'assets/0.jpg'; // Fallback to placeholder
        }

        const data = await response.json();
        if (data.results && data.results.length > 0)
            return data.results[0].urls.small;

        return 'assets/0.jpg'; // Fallback if no results
    } catch (error) {
        if (error.name === 'AbortError') throw error; // Allow abort to bubble up
        console.error(`Error fetching image for ${destination}:`, error);
        return 'assets/0.jpg'; // Fallback on error
    }
}

/**
 * @function fetchWikipediaDescription
 * Fetches destination description from Wikipedia API with caching
 * @param {string} destinationName - Name of the destination to fetch info for
 * @returns {string|null} - Truncated description (150 chars) or null if not found
 */
export async function fetchWikipediaDescription(destinationName) {
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
