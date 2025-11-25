export function searchJSON(keyword, mainData) {
    if (!keyword || typeof keyword !== 'string') return null;
    
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword === '') return null;
    
    const lowerCaseKeyword = trimmedKeyword.toLowerCase();

    if (!mainData) {
        console.error("Main data not loaded yet.");
        return null;
    }

    // 1. Search for a country
    for (const countryName in mainData) {
        if (countryName.toLowerCase() === lowerCaseKeyword) {
            const citiesInCountry = Object.keys(mainData[countryName].cities);
            return { 
                type: "country", 
                results: citiesInCountry.map(cityName => ({ 
                    name: cityName, 
                    country: countryName 
                })) 
            };
        }
    }

    // 2. Search for a city
    for (const countryName in mainData) {
        if (mainData[countryName].cities) {
            for (const cityName in mainData[countryName].cities) {
                if (cityName.toLowerCase() === lowerCaseKeyword) {
                    const placesList = mainData[countryName].cities[cityName];
                    
                    // HANDLE MIXED DATA (Strings vs Objects)
                    const normalizedPlaces = placesList.map(place => {
                        if (typeof place === 'object') {
                            return {
                                name: place.name,
                                city: cityName,
                                country: countryName,
                                // Pass custom data along if needed
                                customDesc: place.description,
                                customImage: place.imageSearch
                            };
                        }
                        return { name: place, city: cityName, country: countryName };
                    });

                    return { type: "city", results: normalizedPlaces };
                }
            }
        }
    }

    // 3. Search for a place
    for (const countryName in mainData) {
        if (mainData[countryName].cities) {
            for (const cityName in mainData[countryName].cities) {
                const places = mainData[countryName].cities[cityName];
                
                for (const place of places) {
                    // Normalize the name whether it's an object or string
                    const placeName = (typeof place === 'object') ? place.name : place;

                    if (placeName.toLowerCase() === lowerCaseKeyword) {
                        return {
                            type: "place",
                            results: [{
                                name: placeName,
                                city: cityName,
                                country: countryName,
                                // Pass object data if available
                                ...(typeof place === 'object' ? place : {})
                            }]
                        };
                    }
                }
            }
        }
    }

    return null; // No match found
}