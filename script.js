// Avoid clobbering global scope with IIFE
(function(window, document) {
// But don't indent...

const localStorage = window.localStorage;
const JSON         = window.JSON;

const API_KEY  = "0129f7bf1c80c0da1d1b4fdbf6fdbced";
const BASE_URL = "https://api.openweathermap.org/";

// openweathermap api paths
const CURRENT_WEATHER   = "data/2.5/weather";
const FIVE_DAY_FORECAST = "data/2.5/forecast";

// param type: "current" or "five"
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
            // TODO: Replace with bootstrap modal
            alert(response.status + ": " + response.statusText);

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
// Arbitrarily choose forecast for 9am UTC
// data.list (argument dataList) is an array of 3-hour forecasts
// returns a list of only five forecasts -- one per day at noon
function getListOfFiveForecasts(dataList) {
    let resultList = [];
    for (forecast of dataList) {
        let forecastTime = new Date(forecast.dt_txt);
        if (forecastTime.getHours() === 9) {
            // add a JS date object value to the forecast,
            // used later for sorting and display
            let data = {};
            data.main = forecast.weather[0].main;
            data.temp = forecast.main.temp;
            data.wind = forecast.wind.speed;
            data.humidity = forecast.main.humidity;
            data.date = forecastTime;
            resultList.push(data);
        }
    }

    return resultList;
}

function getCurrentForecast(data) {
    let result = {};
    result.main = data.weather[0].main;
    result.temp = data.main.temp;
    result.wind = data.wind.speed;
    result.humidity = data.main.humidity;

    return result;
}

// return undefined, modifies DOM
// param type: "five" or "current"
// created card will be attached to elem#parentId
function attachCardToDOM(cityName, parentId, data, type="five") {
    // Make div.card
    let cardClassList = ['card', 'h-100'];
    if (type === "current") {
        cardClassList.push("text-bg-primary");
    }
    const cardElem = createElem('div', ...cardClassList);

    // 1st child of div.card
    const cardImgElem = createElem(
        'div', 
        'card-img-top', 
        'text-center', 
         'p-2'
    );

    const iconClass = getIcon(data.main);
    const iconElem = createElem('i', iconClass);
    // append icon to 1st child
    cardImgElem.appendChild(iconElem)
    
    // append 1st child to div.card
    cardElem.appendChild(cardImgElem);
    
    // 2nd child of div.card 
    const cardHeaderElem = createElem('div', 'card-header');
    
    let cardTitle = cityName + ": ";
    if (type === "current") {
        cardTitle += "Current";
    } else {
        cardTitle += getDate(data.date);
    }
    const titleElem = createElem('h5', 'card-title');
    titleElem.textContent = cardTitle;

    // append to 2nd child
    cardHeaderElem.appendChild(titleElem);

    // append 2nd child to div.card
    cardElem.appendChild(cardHeaderElem);

    // 3rd child of div.card
    const cardBodyElem = createElem('div', 'card-body');

    // Set up text for children of 3rd child
    const temp = "Temp: " + data.temp + " F";
    const wind = "Wind Speed: " + data.wind + " mph";
    const humidity = "Humidity: " + data.humidity + "%";
    // create children of 3rd child
    const bodyData = [temp, wind, humidity];
    for (data of bodyData) {
        const p = createElem('p', 'card-text');
        p.textContent = data;
        // append children to 3rd child here in loop
        cardBodyElem.appendChild(p);
    }

    // append 3rd child to div.card
    cardElem.appendChild(cardBodyElem);

    // get div#parentId
    const parent = document.querySelector(parentId);
    const currentCard = document.querySelector(parentId + " > div");
    
    if (currentCard) {
        parent.replaceChild(cardElem, currentCard);
    } else {
        parent.appendChild(cardElem);
    }
}

// build and attach a card for each day of the five-day forecast
function attachFiveDayToDOM(cityName, dataList) {
    
    for (let i = 0; i < dataList.length; i++) {
        const parentId = "#day-" + (i + 1).toString();
        attachCardToDOM(cityName, parentId, dataList[i]);
    }
}

const citySearchButton = document.querySelector("#city-search-btn");
const citySearchInput  = document.querySelector("#city-search");

citySearchButton.addEventListener('click', function(event) {
    // Don't refresh page
    event.preventDefault();

    const city = citySearchInput.value.trim();
    
    // city is ''
    if (!city) {
        // TODO: Replace with a bootstrap modal
        alert("You must enter a value for city.");
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

            const abbrData = getCurrentForecast(data);
            // cache in localStorage
            addCityToLocalStorage(city, abbrData);
            // build card and attach it to DOM
            attachCardToDOM(city, "#current", abbrData, "current");

            return data.coord;
        })
        // coords is {lat: number, lon: number}
        .then(function(coords) {
            return getFiveDayForecastJSON(coords);
        })
        // fiveDayJSON is large list of 5 days of forecasts every 3 hours 
        .then(function(fiveDayJSON) {
            // We pick one forecast (at 9) for each day
            const fiveDayAbbr = getListOfFiveForecasts(fiveDayJSON.list);

            // attach each member of fiveDayAbbr[] to the DOM
            attachFiveDayToDOM(city, fiveDayAbbr);
            // add to localStorage cache
            addFiveDayToLocalStorage(city, fiveDayAbbr);

            
        })
        .catch(function(error) {
            console.error(error.message);
        })
});

const cityButtons = document.querySelector("#cities");

cityButtons.addEventListener("click", function(event) {
    const target = event.target;
    const cityName = target.value;
    loadWeatherDataFromCache(cityName);
});

/*************** localStorage cache management ***********************/

function addCityToLocalStorage(city, data) {
    // Don't add duplicate items to book-keeping list &
    // don't create duplicate buttons.
    const isInStorageAlready = localStorage.getItem(city);

    if (!isInStorageAlready) {
        addToCachedCitiesList(city);
        createCachedButton(city);
    }
    // Replace the data, though
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

// Caller checks whether cache is expired
function loadWeatherDataFromCache(cityName) {
    const cityData = JSON.parse(localStorage.getItem(cityName));
    attachCardToDOM(cityName, "#current", cityData.current, "current");
    attachFiveDayToDOM(cityName, cityData.fiveday);
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
        // Exit if, for some reason, city is already in list.
        if (cities.includes(city)) return;
        
        cities.push(city);
    } else {
        // cities === undefined
        cities = [city];
    }
    localStorage.setItem("cities", JSON.stringify(cities));
}

// (on DOM load) determines if cached forecasts are still
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

// Invalidate old cache entries on DOMloaded
document.addEventListener('DOMContentLoaded', pruneCachedForecasts); 

function createCachedButton(cityName) {

    const container = document.querySelector('#cities');
    const button = createElem(
        'button', 'cached', 'btn', 'btn-outline-secondary',
        'btn-sm', 'm-1'
    );
    button.value = cityName;
    button.setAttribute('data-city', cityName);
    button.textContent = cityName;
    container.appendChild(button);
}

function removeCachedButton(cityName) {
    const container = document.querySelector('#cities');
    const selector = `[data-city="${cityName}"]`;
    const button = document.querySelector(selector);
    // There might not be any buttons yet
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
    const formatted = dateObj.toLocaleString().split(",");
    if (formatted.length === 2) {
        return formatted[0];
    } else {
        const date = new Date(dateObj);
        return date.toLocaleDateString();
    }
}

function getIcon(mainWeather) {
    switch (mainWeather) {
        case 'Thunderstorm':
            return 'bi-cloud-lightning-rain';
        case 'Drizzle':
            return 'bi-cloud-drizzle';
        case 'Rain':
            return 'bi-cloud-rain';
        case 'Snow':
            return 'bi-cloud-snow';
        case 'Clear':
            return 'bi-sun';
        case 'Clouds':
            return 'bi-clouds';
        default:
            return 'bi-cloud-sun';
    }
}

// END IIFE
})(window, document);