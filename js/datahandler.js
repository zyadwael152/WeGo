export function searchJSON(keyword, mainData) {
    if (!keyword || typeof keyword !== 'string') {
        return null;
    }
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword === '') {
        return null;
    }
    const lowerCaseKeyword = trimmedKeyword.toLowerCase();

    if (!mainData) {
        console.error("Main data not loaded yet.");
        return null;
    }

    // 1. Search for a country
    for (const countryName in mainData) {
        if (countryName.toLowerCase() === lowerCaseKeyword) {
            const citiesInCountry = Object.keys(mainData[countryName].cities);
            return { type: "country", results: citiesInCountry.map(cityName => ({ name: cityName, country: countryName })) };
        }
    }

    // 2. Search for a city
    for (const countryName in mainData) {
        if (mainData[countryName].cities) {
            for (const cityName in mainData[countryName].cities) {
                if (cityName.toLowerCase() === lowerCaseKeyword) {
                    const placesInCity = mainData[countryName].cities[cityName].map(placeName => ({
                        name: placeName,
                        city: cityName,
                        country: countryName
                    }));
                    return { type: "city", results: placesInCity };
                }
            }
        }
    }

    // 3. Search for a place
    for (const countryName in mainData) {
        if (mainData[countryName].cities) {
            for (const cityName in mainData[countryName].cities) {
                const places = mainData[countryName].cities[cityName];
                for (const placeName of places) {
                    if (placeName.toLowerCase() === lowerCaseKeyword) {
                        return {
                            type: "place",
                            results: [{
                                name: placeName,
                                city: cityName,
                                country: countryName,
                            }]
                        };
                    }
                }
            }
        }
    }

    return null; // No match found
}
