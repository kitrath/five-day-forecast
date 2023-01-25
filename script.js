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
    const lon = encodeURIComponent(coords.lat);
    const lat = encodeURIComponent(coords.lon);
    let queryString = '?lat=' + lat + '&lon=' + lon;
    return completeURL(queryString, 'five');
}
// `type` arg can be one of 'current' or 'five'
// TODO: Rewrite, because five-day forecast takes lat and lon instead of city name
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

function getDate(dateObj) {
    // If no "," is present, entire locale string at index 0
    return dateObj.toLocaleString().split(",")[0];
}

function isCachedForecastValid(timeStamp, numHoursToCache = 3) {
    // 3,600,000 milliseconds in an hour
    const timeLimit = numHoursToCache * 3600000;
    const now = new Date.now();
    return (now - timeStamp) < timeLimit;
}