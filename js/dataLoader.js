/**
 * Loads travel data from the JSON file
 * @returns {Promise<Object>} The parsed travel data object
 * @throws {Error} If the fetch fails or JSON is invalid
 */
export async function loadTravelData() {
  try{
    const res = await fetch('data/maindata.json');
    if (!res.ok) 
      throw new Error(`Failed to load travel data: ${res.status} ${res.statusText}`);
    
    const travelData = await res.json();
    console.log('Travel data loaded successfully');
    return travelData;
} 
  catch (error){
    console.error('Error loading travel data:', error);
    throw new Error(`Unable to load travel data: ${error.message}`);
  }
}

/**
 * Loads cities and countries mapping from JSON file
 * @returns {Promise<Object>} The parsed cities-countries data
 * @throws {Error} If the fetch fails or JSON is invalid
 */
export async function loadCitiesCountries(){
  try{
    const res = await fetch('data/cities-countries.json');
    if (!res.ok) 
      throw new Error(`Failed to load cities-countries data: ${res.status} ${res.statusText}`);
    
    const citiesCountriesData = await res.json();
    console.log('Cities-countries data loaded successfully');
    return citiesCountriesData;
  } 
  catch (error){
    console.error('Error loading cities-countries data:', error);
    throw new Error(`Unable to load cities-countries data: ${error.message}`);
  }
}

/**
 * Loads all required travel data at application startup
 * @returns {Promise<Object>} An object containing all loaded data
 */
export async function initializeAppData(){
  try{
    const [travelData, citiesCountries] = await Promise.all([
      loadTravelData(),
      loadCitiesCountries()
    ]);
    
    return {
      travelData,
      citiesCountries,
      initialized: true
    };
  } 
  catch (error){
    console.error('Failed to initialize application data:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
}