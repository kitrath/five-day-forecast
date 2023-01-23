const API_KEY = "0129f7bf1c80c0da1d1b4fdbf6fdbced";
const BASE_URL = "https://api.openweathermap.org/";

// Return tempratures in Fahrenhiet
const CURRENT_WEATHER = "data/2.5/weather";
const FIVE_DAY_FORECAST = "data/2.5/forecast";

// Get coords from current weather query results.coord
function buildURL(base, path, queryStringObj, apiKey=API_KEY) {
    let searchParams = new URLSearchParams();
    for ([key, value] of Object.entries(queryStringObj)) {
        searchParams.append(key, value);
    }
    searchParams.append('appId', apiKey);

    return `${base}${path}?${searchParams}`;
}

function buildWeatherURLforCity(cityName, type = 'current') {
    let forecastType = CURRENT_WEATHER;
    if (type === 'five') {
        forecastType = FIVE_DAY_FORECAST;
    }
    const params = {
        q: cityName,
        units: 'imperial'
    };
    return buildURL(BASE_URL, forecastType, params);
}

async function getWeatherDataForCity(cityName, type) {
    let url = buildWeatherURLforCity(cityName, type);
    try {
        const response = await fetch(url);
        if (response.ok) {
            // Without `await`, response.json() will not 
            // throw if it fails. (The error would have
            // to be caught with a .catch() handler by the 
            // calling function.)
            return await response.json();
        } else {
            throw new Error(`Unexpected status code: ${
                response.status
            } ${response.statusText}`);
        }
    } catch (error) {
        console.error(error.message);
    }
};

function createElem(tagName, ...classList) {
    const el = document.createElement(tagName);
    if (classList.length) {
        document.setAttribute(
            "class",
            classList.join(" ")
        );
    }
    return el;
}
