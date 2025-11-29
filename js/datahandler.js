// The function to search for a keyword in the main data JSON
export function searchJSON(keyword, mainData){
    if (!keyword || typeof keyword !== 'string') return null;
    
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword === '') return null;
    
    const lowerCaseKeyword = trimmedKeyword.toLowerCase();

    if (!mainData) {
        console.error("Main data not loaded yet.");
        return null;
    }

    for (const countryName in mainData){
        if (countryName.toLowerCase() === lowerCaseKeyword){
            const citiesInCountry = Object.keys(mainData[countryName].cities);
            return{ 
                type: "country", 
                results: citiesInCountry.map(cityName => ({ 
                    name: cityName, 
                    country: countryName 
                })) 
            };
        }
    }

    for (const countryName in mainData){
        if (mainData[countryName].cities){
            for (const cityName in mainData[countryName].cities){
                if (cityName.toLowerCase() === lowerCaseKeyword){
                    const cityObj = mainData[countryName].cities[cityName];
                    const placesList = cityObj.places || [];
                    
                    const normalizedPlaces = placesList.map(place => {
                        if (typeof place === 'object') {
                            return {
                                name: place.name,
                                city: cityName,
                                country: countryName,
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

    for (const countryName in mainData){
        if (mainData[countryName].cities){
            for (const cityName in mainData[countryName].cities){
                const cityObj = mainData[countryName].cities[cityName];
                const places = cityObj.places || [];
                
                for (const place of places){
                    const placeName = (typeof place === 'object') ? place.name : place;

                    if (placeName.toLowerCase() === lowerCaseKeyword){
                        return {
                            type: "place",
                            results: [{
                                name: placeName,
                                city: cityName,
                                country: countryName,
                                ...(typeof place === 'object' ? place : {})
                            }]
                        };
                    }
                }
            }
        }
    }

    return null;
}