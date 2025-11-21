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

    try {
        await Promise.all([
            loadDestinationImages(decodedDestination),
            loadDestinationInfo(decodedDestination)
        ]);
        embedGoogleMap(decodedDestination);
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

// Fetch destination info and showing data from Wikipedia API
async function loadDestinationInfo(query) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Wikipedia API error');

    const data = await res.json();

    const contentDiv = document.querySelector('.details-content p');
    if (data.extract && contentDiv) {
        contentDiv.innerText = data.extract;

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
    }
}

async function embedGoogleMap(query) {
    const mapPlaceholder = document.querySelector('.map-placeholder');
    if (!mapPlaceholder) return;

    
    const encodedQuery = encodeURIComponent(query);
    const mapUrl = `https://maps.google.com/maps?q=${encodedQuery}&output=embed`;

    const iframe = document.createElement('iframe');
    iframe.src = mapUrl;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = '0';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';

    mapPlaceholder.innerHTML = '';
    mapPlaceholder.appendChild(iframe);
}
