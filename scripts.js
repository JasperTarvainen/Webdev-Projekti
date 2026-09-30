const API_URL_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"
const API_URL_OPEN_METEO_FORE = "https://api.open-meteo.com/v1/forecast"

/* Haetaan elementit */
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button")
const locationButton = document.getElementById("location-button");

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
            const weatherData = await getForecastDataMeteo(lat, lon);
            display(`Näytetään sijaintisi säätä`, weatherData);
        } catch (error) {
            alert("Virhe.")
        }
    })
})

/* Haku napin toiminta */
searchButton.addEventListener("click", async () => {
    const cityName = searchInput.value.trim();

    if (!cityName) {
        alert("Kirjoita kaupungin nimi ensin!")
        return;
    }
    try {
        const geocodingData = await getGeocodingData(cityName);
        console.log("Koordinaatit: ", geocodingData);
    } catch (error) {
        alert("Kaupunging hakemisessa tapahtui virhe, yritä myöhemmin uudelleen.")
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
    const response = await fetch(`${API_URL_OPEN_METEO_FORE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m`);
    const data = await response.json();
    return data;
}

/*Funktio säätietojen näyttämiseen */
function display(locationName, weatherData) {
    document.getElementById("location-name").textContent = locationName;

    const times = weatherData.hourly.time;
    const temperatures = weatherData.hourly.temperature_2m;

    /* Google gemini AI ehdottama toteutus tapa (seuraavat 4 riviä) */
    const rows = times.slice(0, 24).map((time, i) => {
        const timeString = new Date(time).toLocaleTimeString([], {hour: '2-digit'});
        return `<tr><td>${timeString}</td><td>${temperatures[i]} °C</td></tr>`;
    }).join("")
    /*LOPPU */
    const html = `<p>Päivän ennuste:</p>
    <table>
        <thead>
            <tr><th>24h</th><th>Lämpötila</th></tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;

    const weatherSection = document.getElementById("weather");

    let contentDiv = document.getElementById("weather-content");
    if (!contentDiv) {
        contentDiv = document.createElement("div");
        contentDiv.id = "weather-content";
        weatherSection.appendChild(contentDiv);
    }
    contentDiv.innerHTML = html;
}