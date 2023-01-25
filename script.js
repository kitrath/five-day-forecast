const API_KEY = "0129f7bf1c80c0da1d1b4fdbf6fdbced";
const BASE_URL = "https://api.openweathermap.org/";

// Return tempratures in Fahrenhiet
const CURRENT_WEATHER = "data/2.5/weather";
const FIVE_DAY_FORECAST = "data/2.5/forecast";

// type: 'current' | 'five'
function completeURL(partialQueryString, type, appId=API_KEY) {
    const path = (type === 'current') ? CURRENT_WEATHER : FIVE_DAY_FORECAST;
    let queryString = partialQueryString;
    queryString += '&units=imperial&appid=' + appId;
    return BASE_URL + path + queryString;
}

function buildCurrentWeatherURL(cityName) {
    let queryString = '?q=' + encodeURIComponent(cityName);
    return completeURL(queryString, 'current');
}

function buildFiveDayWeatherURL(coords) {
    const lon = encodeURIComponent(coords.lon);
    const lat = encodeURIComponent(coords.lat);
    let queryString = '?lat=' + lat + '&lon=' + lon;
    return completeURL(queryString, 'five');
}

function buildURL(type, data) {
    switch (type) {
        case 'current':
            return buildCurrentWeatherURL(data);
        case 'five':
            return buildFiveDayWeatherURL(data);
        default:
            throw new Error('Unreachable!');
    }
}

async function getOpenWeatherData(type, data) {
    let url = buildURL(type, data);
    try {
        const response = await fetch(url);
        // response in 200s
        if (response.ok) {
            // Need `await` here so that, if response.json()
            // rejects, our function can throw 
            return await response.json();
        } else {
            throw new Error(`Unexpected status code: ${
                response.status
            } ${response.statusText}`);
        }
    } catch (error) {
        console.error(error.message);
    }
}

async function getCurrentWeatherJSON(cityName) {
    try {
        return await getOpenWeatherData('current', cityName);
    } catch (error) {
        // handleCityNotFounc(cityName);
        console.error(error.message);
    }
}

async function getFiveDayForecastJSON(coords) {
    try {
        return await getOpenWeatherData('five', coords);
    } catch (error) {
        console.error(error.message);
    }
}

// Extract only one forecast per day from a 5-day list of 3-hour forecasts
// Arbitrarily choose forecast for 12pm
// data.list (argument dataList) is an array of 3-hour forecasts
// returns a list of only five forecasts -- one per day at noon
function getListOfFiveForecasts(dataList) {
    let resultList = [];
    for (forecast of dataList) {
        const forecastTime = new Date(forecast.dt_txt);
        if (forecastTime.getHours() === 12) {
            // add a JS date object value to the forecast,
            // used later for sorting and display
            forecast.dateObject = forecastTime;
            resultList.push(forecast);
        }
    }
    return resultList;
}

const citySearchButton = document.querySelector("#city-search-btn");
const citySearchInput = document.querySelector("#city-search");

citySearchButton.addEventListener('click', function(event) {
    // Don't refresh page
    event.preventDefault();

    const city = citySearchInput.value.trim();
    
    // city is ''
    if (!city) {
        return;
    }

    // Check cache
    const cachedCity = JSON.parse(localStorage.getItem(city))

    if (cachedCity && isCachedForecastValid(cachedCity.timestamp)) {
        loadWeatherDataFromCache(city);
        // exit 
        return;
    }

    getCurrentWeatherJSON(city)

        .then(function (data) {

            console.log(data);
            // TODO: displayCurrentForecast();

            // cache in localStorage
            addCityToLocalStorage(city, data);

            return data.coord;
        })
        // coords is {lat: number, lon: number}
        .then(function(coords) {
            return getFiveDayForecastJSON(coords);
        })
        
        // fiveDayJSON is large list of 5 days worth of 3-hour forecasts 
        .then(function(fiveDayJSON) {
            // We pick one forecast (at noon) for each day
            const fiveDayAbbr = getListOfFiveForecasts(fiveDayJSON.list);
            // TODO: displayFiveDayForecast()

            // add to localStorage cache
            addFiveDayToLocalStorage(city, fiveDayAbbr);

            console.log(fiveDayAbbr);
        })

        .catch(function(error) {
            console.error(error.message);
        })
});

/*************** localStorage cache management ***********************/

function addCityToLocalStorage(city, data) {

    addToCachedCitiesList(city);
    createCachedButton(city);

    localStorage.setItem(
        city,
        JSON.stringify({
            timestamp: Date.now(),
            current: data
        })
    );
}

function addFiveDayToLocalStorage(city, data) {
    let cachedForecast = JSON.parse(localStorage.getItem(city));
    cachedForecast.fiveday = data;
    localStorage.setItem(city, JSON.stringify(cachedForecast));
}

function loadWeatherDataFromCache(city) {
    
}

function isCachedForecastValid(timeStamp, numHoursToCache = 3) {
    // 3,600,000 milliseconds in an hour
    const timeLimit = numHoursToCache * 3600000;
    const now = Date.now();
    return (now - timeStamp) < timeLimit;
}

// Might return []
// Removes invalid entries from localStorage and 
// from the 'cities' list
// Removes invalid buttons from DOM
// Caller responsible for stringify and store
function getValidCitiesList() {
    let cities = JSON.parse(localStorage.getItem("cities"));

    if (!cities) return;

    for (city of cities) {
        const cachedForecast = JSON.parse(localStorage.getItem(city));
        if (cachedForecast && isCachedForecastValid(cachedForecast.timestamp)) {
            // great. move on.
            continue;
        } else {
            removeCachedButton(city);
            localStorage.removeItem(city);
            // Don't alter list in loop
            city = null;
        }
    }
    return cities.filter(x => x);
}

// Adds city name to list of cached cities.
// If list doesn't exist, create one, add item
// and save to localStorage
function addToCachedCitiesList(city) {
    let cities = getValidCitiesList(); 
    if (cities) {
        cities.push(city);
    } else {
        // cities === undefined
        cities = [city];
    }
    localStorage.setItem("cities", JSON.stringify(cities));
}

// (on page load) determines if cached forecasts are still
// valid and creates a button for the valid ones
function pruneCachedForecasts(event) {

    const updatedCities = getValidCitiesList();

    if (updatedCities && updatedCities.length) {
        // create button for each survivor
        for (city of updatedCities) {
            createCachedButton(city);
        }
        localStorage.setItem(
            "cities", 
            JSON.stringify(updatedCities)
        );
    } else {
        localStorage.removeItem("cities");
    }
}

document.addEventListener('DOMContentLoaded', pruneCachedForecasts); 

function createCachedButton(cityName) {

    const container = document.querySelector('#cities');
    const button = createElem(
        'button', 'cached', 'btn', 'btn-outline-secondary', 'btn-sm'
    );
    button.setAttribute('data-city', cityName);
    button.textContent = cityName;
    container.appendChild(button);
}

function removeCachedButton(cityName) {
    const container = document.querySelector('#cities');
    const selector = `[data-city="${cityName}"]`;
    const button = document.querySelector(selector);
    if (button) {
        container.removeChild(button);
    }
}

function createElem(tagName, ...classList) {
    const el = document.createElement(tagName);
    if (classList.length) {
        el.setAttribute(
            "class",
            classList.join(" ")
        );
    }
    return el;
}

function getDate(dateObj) {
    // If no "," is present, entire locale string at index 0
    return dateObj.toLocaleString().split(",")[0];
}
