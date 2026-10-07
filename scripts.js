const API_URL_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"
const API_URL_OPEN_METEO_FORE = "https://api.open-meteo.com/v1/forecast"
const OPEN_WEATHER_API = "https://api.openweathermap.org/data/2.5/forecast"
const REVERSE_GEO_API = "http://api.openweathermap.org/geo/1.0/reverse"

/* Haetaan elementit */
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button")
const locationButton = document.getElementById("location-button");
const favoritesButton = document.getElementById("favorite-button");
const favoritesDiv = document.getElementById("favorites");

/* Alustetaan tämän hetkinen sijainti */
let currentLocation = null;

/*Hae taan suosikit local storagesta (FUNKTION ON TEHNYT CLAUDE AI)*/
function getFavorites() {
    return JSON.parse(localStorage.getItem("favorites")) || [];
}

/* Tallennetaan suosikiksi */
function saveFavorites(favorites) {
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

/*Funktio joka luo suosikeista napin */
function makeFavorites() {
    favoritesDiv.innerHTML = "";

    getFavorites().forEach(favorite => {
        const button = document.createElement("button");
        button.textContent = favorite.name;
        button.addEventListener("click", async () => {
            await showWeather(favorite.name, favorite.lat, favorite.lon)
        })
        favoritesDiv.appendChild(button);
    });
}

/* Suosikit napin toiminta */
favoritesButton.addEventListener("click", async () => {
    if (!currentLocation) {
        alert("Hea ensin paikkakuntaa, jonka haluat tallentaa suosikkeihin")
        return;
    }

    const favorites = getFavorites();
    favorites.push(currentLocation);
    saveFavorites(favorites);
    makeFavorites();

    });

/*Paikannus napin toiminta */
locationButton.addEventListener("click", async () => {
    if (!navigator.geolocation) {
        alert("Selaimesi ei tue GPS-Sijaintia")
        return;
    }

    console.log("Haetaan GPS-Sijaintia...")

    navigator.geolocation.getCurrentPosition( async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        console.log(`GPS-sijainti löytyi: Lat ${lat}, Lon ${lon}`);

        try {
            placeName = await getLocationName(lat, lon);
            await showWeather(placeName, lat, lon);
        } catch (error) {
            alert("Virhe.")
        }
    })
})

/* Funktio paikan nimen hakuun koordinaateilla */
async function getLocationName(lat, lon) {
    const response = await fetch(`${REVERSE_GEO_API}?lat=${lat}&lon=${lon}&limit=1&appid=${OPEN_WEATHER_KEY}`);

    const data = await response.json();

    if (data.length === 0) {
        alert("Paikan nimeä ei löytynyt");
    }

    const place = data[0];
    if (place.local_names && place.local_names.fi) {
        return place.local_names.fi;
    }
    return place.name;
}

/* Haku napin toiminta */
searchButton.addEventListener("click", async () => {
    const cityName = searchInput.value.trim();

    if (!cityName) {
        alert("Kirjoita kaupungin nimi ensin!")
        return;
    }
    try {
        const geocodingData = await getGeocodingData(cityName);
        await showWeather(`${geocodingData.name}, ${geocodingData.country}`, geocodingData.lat, geocodingData.lon);
        console.log("Koordinaatit: ", geocodingData);
    } catch (error) {
        alert("Kaupungin hakemisessa tapahtui virhe, yritä myöhemmin uudelleen.")
    }
})

/*Funktio koordinaattien hakuun api:sta käyttäjän antaman kaupungin nimen mukaan.*/
async function getGeocodingData(city) {
    const response = await fetch(`${API_URL_GEOCODING}?name=${encodeURIComponent(city)}&count=10&language=fi&format=json`)
    const data = await response.json();

    if (data.results && data.results.length >0 ) {
        const location = data.results[0];
        return {
            name: location.name,
            country: location.country,
            lat: location.latitude,
            lon: location.longitude
        };
    } else {
        throw new Error("Paikkakuntaa ei löytynyt.")
    }
}

/*Funktio sää datan hakuun open-meteo api */
async function getForecastDataMeteo(lat, lon) {
    const response = await fetch(`${API_URL_OPEN_METEO_FORE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,is_day&current_weather=true&forecast_hours=24&timezone=auto`);
    const data = await response.json();
    return data;
}

/*Funktio sää datan hakuun openweather api */
async function getForecastDataOpenWeather(lat, lon) {
    const response = await fetch(`${OPEN_WEATHER_API}?lat=${lat}&lon=${lon}&units=metric&appid=${OPEN_WEATHER_KEY}`);
    const data = await response.json();
    return data;
}

/*Hakee molemmat lähteet ja näyttää ne */
async function showWeather(locationName, lat, lon) {
    const meteoData = await getForecastDataMeteo(lat, lon);
    const openWeatherData = await getForecastDataOpenWeather(lat, lon);
    currentLocation = {name: locationName, lat: lat, lon: lon};
    display(locationName, meteoData, openWeatherData)
}

function makeTable(title, rows) {
    return `<p>${title}:</p>
    <table>
        <thead>
            <tr><th>24h</th><th>Lämpötila</th><th>Sää</th></tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}


/*Funktio säätietojen näyttämiseen */
function display(locationName, meteoData, openWeatherData) {
    document.getElementById("location-name").textContent = `Sää: ${locationName}`;

    const weatherSection = document.getElementById("weather");

    /* 1. Näytetään nykyinen sää (Open-Meteo current_weather) */
    let currentWeatherDiv = document.getElementById("current-weather");
    if (!currentWeatherDiv) {
        currentWeatherDiv = document.createElement("div");
        currentWeatherDiv.id = "current-weather";
        weatherSection.appendChild(currentWeatherDiv);
    }

    if (meteoData.current_weather) {
        const current = meteoData.current_weather;
        const icon = meteoIcon(current.weathercode, current.is_day === 1);
        currentWeatherDiv.style.display = "block";
        currentWeatherDiv.className = "current-weather-card";
        currentWeatherDiv.innerHTML = `
            <h3> Sää ${locationName} Juuri nyt (Open-Meteo)</h3>
            <i class="fa-solid ${icon}"></i>
            <div class="current-temp">${current.temperature} °C</div>
        `;
    }
    /*Meteo */
    let meteoRows = "";
    for (let i = 0; i < 24; i++) {
        const hour = meteoData.hourly.time[i].slice(11, 16);
        const icon = meteoIcon(meteoData.hourly.weather_code[i], meteoData.hourly.is_day[i] === 1);
        meteoRows += `<tr><td>${hour}</td><td>${Math.round(meteoData.hourly.temperature_2m[i])} °C</td><td><i class="fa-solid ${icon}"></i></td></tr>`;
    }
    let html = makeTable("Open-Meteo", meteoRows);

    /*Open weather */
    let openWeatherRows = "";
    const offset = openWeatherData.city.timezone;
    for (let i = 0; i<8; i++) {
        const entry = openWeatherData.list[i];
        const hour = new Date((entry.dt+offset)*1000).toISOString().slice(11, 16);
        const isDay = entry.weather[0].icon.endsWith("d");
        const icon = openIcon(entry.weather[0].id, isDay);
        openWeatherRows += `<tr><td>${hour}</td><td>${Math.round(entry.main.temp)} °C</td><td><i class="fa-solid ${icon}"></i></td></tr>`;
    }
    html += makeTable("OpenWeatherMap", openWeatherRows)

    let contentDiv = document.getElementById("weather-content");
    if (!contentDiv) {
        contentDiv = document.createElement("div");
        contentDiv.id = "weather-content";
        weatherSection.appendChild(contentDiv);
    }
    contentDiv.innerHTML = html;
}

/*Sää kuvakkeet */

/*Open-Meteo kuvake (fontawesome) */
function meteoIcon(code, isDay) {
    if (code === 0) return isDay ? "fa-sun" : "fa-moon";
    if (code === 1 || code === 2) return isDay ? "fa-cloud-sun" : "fa-cloud-moon";
    if (code === 3) return "fa-cloud";
    if (code === 45) return "fa-smog";
    if (code >= 51 &&  code <= 57) return "fa-cloud-rain";
    if (code >= 61 && code <=67) return "fa-cloud-showers-heavy";
    if (code >=71 && code <=77) return "fa-snowflake";
    if (code >=80 && code <= 82) return "fa-cloud-showers-heavy";
    if (code >= 95) return "fa-bolt";
    return "fa-question";
}

/*Open weather kuvake (fontawesome) */
function openIcon(id, isDay) {
    if (id >= 200 && id < 300) return "fa-bolt"
    if (id >= 300 && id < 400) return "fa-cloud-rain";
    if (id >= 500 && id < 600) return "fa-cloud-showers-heavy";
    if (id >= 600 && id < 700) return "fa-snowflake";
    if (id >= 700 && id < 800) return "fa-smog";
    if (id === 800) return isDay ? "fa-sun" : "fa-moon";
    if (id === 801 || id === 802) return isDay ? "fa-cloud-sun" : "fa-cloud-moon";
    if (id === 803 || id === 804) return "fa-cloud";
    return "fa-question";
}

makeFavorites();
