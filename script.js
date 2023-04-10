document.querySelector("#search-btn").addEventListener("click", searchClicked);
document.querySelector("#clear-btn").addEventListener("click", clearClicked);
document.querySelector("#log-btn").addEventListener("click", logClicked);

var dropdownOptions = document.querySelectorAll('.dropdown-item');
var dropdownToggle = document.querySelector("#city_dropdown");

dropdownOptions.forEach(function (option) {
    option.addEventListener('click', function () {
        dropdownToggle.textContent = this.textContent;
        dropdownToggle.value = this.textContent;
    });
});

function searchClicked(event) {
    event.preventDefault();

    let addressInput = document.querySelector("#address")
    let regionInput = document.querySelector("#region")
    let cityInput = document.querySelector("#city")

    let address = addressInput.value;

    let valid = true;

    if (!validateAddress(address)) {
        document.querySelector("#addressInput .err").classList.remove("d-none")
        valid = false;
    } else {
        document.querySelector("#addressInput .err").classList.add("d-none")
    }

    let region = regionInput.value
    if (!validateRegion(region)) {
        document.querySelector("#regionInput .err").classList.remove("d-none")
        valid = false;
    } else {
        document.querySelector("#regionInput .err").classList.add("d-none")
    }

    cityInput = document.querySelector("#city_dropdown");
    let city = cityInput.value

    if (!validateCity(city)) {
        document.querySelector("#cityInput .err").classList.remove("d-none")
        valid = false;
    } else {
        document.querySelector("#cityInput .err").classList.add("d-none")
    }

    //getting the degrees type: metric -> celcious, imperial -> fahrenait
    let degree_format = document.querySelector("input[type=radio]:checked").value

    if (valid) {
        generateSearchRequest(address, region, city, degree_format)
        sendRequestToDB(address, region, city)

    }

}

function clearClicked() {

    document.querySelector("#address").value = ""
    document.querySelector("#region").value = ""
    dropdownToggle.textContent = "Select city"
    dropdownToggle.value = "Select city"

    document.querySelector("#celcious").checked = "checked"

    //clearing error labels
    let err_elems = document.querySelectorAll(".err")

    for (let err_elem of err_elems) {
        err_elem.classList.add("d-none")
    }

    //removing map layers

    document.getElementById("map").innerHTML = ""

    //hiding the results panel
    document.getElementById("results").style.display = "none"


}

function logClicked() {

    retrieveRequestsFromDB()

}

function appendRequests(json_obj) {

    let history_table = document.getElementById("modal_history_table")
    history_table.innerHTML = ""

    for (let record of json_obj) {

        let row = document.createElement("tr")
        for (let attribute in record) {

            let data = document.createElement("td")
            if (attribute == "timestamp") {
                record[attribute] = formatDateTime(record[attribute])
            }
            data.innerText = record[attribute]
            row.appendChild(data)
        }
        history_table.append(row)
    }


}


function validateAddress(address) {
    return address.trim();
}

function validateRegion(region) {
    return region.trim();
}

function validateCity(city) {
    return city != "Select city";
}

function generateSearchRequest(address, region, city, degree_format) {

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://nominatim.openstreetmap.org/search?q=" + address + ", " + region + ", " + city + "&format=json");
    xhr.send();

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {

            let result_obj = JSON.parse(xhr.responseText)

            let coords = processSearchResult(result_obj)

            if (!coords) return

            let lat = coords["lat"]
            let lon = coords["lon"]

            //focus on the first tab
            focusTab(document.getElementById("link_1"), 'tab1')

            //clearing map element before creating the map inside it
            document.getElementById("map").innerHTML = ""
            createMap(lat, lon)

            //Current  Weather call
            requestWeather(lat, lon, degree_format)

            //forecast call
            requestForecast(lat, lon, degree_format)

            //open AI call
            requestOpenAI("List and provide descriptions for the top 3 tourist attractions in " + city, city)

        }

    };

}

function processSearchResult(response) {
    if (!response.length) {
        alert("No result for that location.")
        return;
    }

    return response[0];
}

function requestWeather(lat, lon, degree_format) {

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon=" + lon + "&units=" + degree_format + "&APPID=bdf1b645bafe0108bd1beb1114ee29d1");
    xhr.send();

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            updateInfo(JSON.parse(xhr.responseText), degree_format)
            document.getElementById("results").style.display = "block"
        };
    };

}

function requestForecast(lat, lon, degree_format) {

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lon + "&units=" + degree_format + "&APPID=bdf1b645bafe0108bd1beb1114ee29d1");
    xhr.send();

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            updateForecast(JSON.parse(xhr.responseText), degree_format)
        };
    };

}

function requestOpenAI(question, city) {

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.openai.com/v1/completions");

    let request = {
        "model": "text-davinci-003",
        "prompt": question,
        "temperature": 0.7,
        "max_tokens": 256,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }


    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.setRequestHeader("Authorization", "Bearer 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")

    let attr_head = document.getElementById("attractions_header")
    let attr_content = document.getElementById("attractions_content")

    attr_head.innerText = "Attractions in " + city

    attr_content.innerHTML = '<div class="loading_icon spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>'
    xhr.send(JSON.stringify(request));
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            updateAttractions(JSON.parse(xhr.responseText))
        };
    };

}

function focusTab(clickedNavlink, clickedTabContentID) {
    let tabContents = document.querySelectorAll(".tab-pane")
    for (let tabc of tabContents) {
        tabc.classList.remove("show")
        tabc.classList.remove("active")
    }
    let clickedTabContent = document.getElementById(clickedTabContentID)

    clickedTabContent.classList.add("show")
    clickedTabContent.classList.add("active")

    let tabs = document.querySelectorAll(".nav-link")
    for (let tab of tabs) {
        tab.classList.remove("clicked")
    }
    clickedNavlink.classList.add("clicked")
}

function updateAttractions(attractions_obj) {
    let attr_content = document.getElementById("attractions_content")

    attr_content.innerText = ""

    let list = document.createElement("ul")

    let result = JSON.stringify(attractions_obj.choices[0].text)
    result = result.substring(1, result.length - 1)

    for (let attraction of result.split("\\n\\n")) {
        if (attraction.length < 5) continue;

        attraction = attraction.substring(3, attraction.length)
        let litem = document.createElement("li")
        litem.innerText = attraction
        list.appendChild(litem)
    }
    attr_content.append(list)

}

function updateInfo(weather_json_obj, degree_format) {
    let icon = document.getElementById("icon")
    icon.src = "https://openweathermap.org/img/w/" + weather_json_obj.weather[0].icon + ".png"

    let description = document.getElementById("des_val")
    description.innerHTML = weather_json_obj.weather[0].description + "&nbsp&nbsp in &nbsp&nbsp" + weather_json_obj.name

    let degree_symbol
    if (degree_format === "metric") {
        degree_symbol = " &deg;C"
    }
    else if (degree_format === "imperial") {
        degree_symbol = " &deg;F"
    }

    let degrees = document.getElementById("degrees_val")

    if (!weather_json_obj.main.hasOwnProperty("temp")) {
        degrees.innerHTML = "N.A."
    }
    else {
        degrees.innerHTML = weather_json_obj.main.temp + degree_symbol
    }

    let degrees_lo = document.getElementById("lo_val")
    if (!weather_json_obj.main.hasOwnProperty("temp_min")) {
        degrees_lo.innerHTML = "N.A."
    }
    else {
        degrees_lo.innerHTML = "L:" + weather_json_obj.main.temp_min + degree_symbol
    }

    let degrees_hi = document.getElementById("hi_val")
    if (!weather_json_obj.main.hasOwnProperty("temp_max")) {
        degrees_hi.innerHTML = "N.A."
    }
    else {
        degrees_hi.innerHTML = "H:" + weather_json_obj.main.temp_max + degree_symbol
    }

    let pressure, humidity, wind_speed, cloud_cover, sr, ss
    if (!weather_json_obj.main.hasOwnProperty("pressure")) {
        pressure = "N.A."
    }
    else {
        pressure = weather_json_obj.main.pressure
        if (degree_format === "metric") {
            pressure += " hPa"
        }
        else {
            pressure += " Mb"
        }
    }
    if (!weather_json_obj.wind.hasOwnProperty("speed")) {
        wind_speed = "N.A."
    }
    else {
        wind_speed = weather_json_obj.wind.speed
        if (degree_format === "metric") {
            wind_speed += " meters/sec"
        }
        else {
            wind_speed += " miles/hour"
        }
    }

    if (!weather_json_obj.main.hasOwnProperty("humidity")) {
        humidity = "N.A."
    }
    else {
        humidity = weather_json_obj.main.humidity + " %"
    }

    if (!weather_json_obj.clouds.hasOwnProperty("all")) {
        cloud_cover = "N.A."
    }
    else {
        cloud_cover = weather_json_obj.clouds.all + " %"
    }

    if (!weather_json_obj.sys.hasOwnProperty("sunrise")) {
        sr = "N.A."
    }
    else {
        sr = epochFormat(weather_json_obj.sys.sunrise)
    }

    if (!weather_json_obj.sys.hasOwnProperty("sunset")) {
        ss = "N.A."
    }
    else {
        ss = epochFormat(weather_json_obj.sys.sunset)
    }

    let weather_info = {
        "Pressure": pressure,
        "Humidity": humidity,
        "Wind Speed": wind_speed,
        "Cloud Cover": cloud_cover,
        "Sunrise": sr,
        "Sunset": ss
    }


    let table = document.getElementById("info_table")
    table.innerHTML = ""
    for (let info_title in weather_info) {


        let newRow = document.createElement("tr")
        let data_title = document.createElement("td")
        data_title.innerHTML = info_title

        let data_value = document.createElement("td")
        data_value.innerHTML = weather_info[info_title]

        newRow.appendChild(data_title)
        newRow.appendChild(data_value)
        table.appendChild(newRow)
    }



}

function formatDateTime(epoch_time) {

    let datetime = new Date(0); // The 0 there is the key, which sets the date to the epoch
    datetime.setUTCSeconds(epoch_time);

    //setting up the format
    let options = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false };
    return datetime.toLocaleString('en-US', options);

}

function updateForecast(forecast_json_obj, degree_format) {
    let table = document.getElementById("forecast_table")
    table.innerHTML = ""
    for (let i = 0; i <= 8; i++) {
        let location = forecast_json_obj.city.name

        let datetime = formatDateTime(forecast_json_obj.list[i].dt)

        let temp, pressure, humidity, wind_speed
        if (degree_format === "metric") {
            if (!forecast_json_obj.list[i].main.hasOwnProperty("temp")) {
                temp = "N.A."
            }
            else {
                temp = forecast_json_obj.list[i].main.temp + " &deg;C"
            }

            if (!forecast_json_obj.list[i].main.hasOwnProperty("pressure")) {
                pressure = "N.A."
            }
            else {
                pressure = forecast_json_obj.list[i].main.pressure + " hPa"
            }

            if (!forecast_json_obj.list[i].wind.hasOwnProperty("speed")) {
                wind_speed = "N.A."
            }
            else {
                wind_speed = forecast_json_obj.list[i].wind.speed + " meters/sec"
            }

        }
        else if (degree_format === "imperial") {
            if (!forecast_json_obj.list[i].main.hasOwnProperty("temp")) {
                temp = "N.A."
            }
            else {
                temp = forecast_json_obj.list[i].main.temp + " &deg;F"
            }

            if (!forecast_json_obj.list[i].main.hasOwnProperty("pressure")) {
                pressure = "N.A."
            }
            else {
                pressure = forecast_json_obj.list[i].main.pressure + " Mb"
            }

            if (!forecast_json_obj.list[i].wind.hasOwnProperty("speed")) {
                wind_speed = "N.A."
            }
            else {
                wind_speed = forecast_json_obj.list[i].wind.speed + " miles/hour"
            }
        }
        if (!forecast_json_obj.list[i].main.hasOwnProperty("humidity")) {
            humidity = "N.A."
        }
        else {
            humidity = forecast_json_obj.list[i].main.humidity + " %"
        }
        let icon_src = 'https://openweathermap.org/img/w/' + forecast_json_obj.list[i].weather[0].icon + '.png'
        let description

        if (!forecast_json_obj.list[i].weather[0].hasOwnProperty("description")) {
            description = "N.A."
        }
        else {
            description = forecast_json_obj.list[i].weather[0].description
        }

        let time, cloud_cover
        if (!forecast_json_obj.list[i].hasOwnProperty("dt")) {
            time = "N.A."
        }
        else {
            time = forecast_json_obj.list[i].dt
        }

        if (!forecast_json_obj.list[i].clouds.hasOwnProperty("all")) {
            cloud_cover = "N.A."
        }
        else {
            cloud_cover = forecast_json_obj.list[i].clouds.all + " %"
        }

        let next_hour = {
            "Time": epochFormat(time),
            "Summary": '<img src = "' + icon_src + '">',
            "Temp": temp,
            "Cloud Cover": cloud_cover,
            "Details": '<button id = "modal_' + i + '" type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#ModalGrid">View</button>'
        }



        let newRow = document.createElement("tr")
        for (let info_title in next_hour) {

            let data_value = document.createElement("td")
            data_value.innerHTML = next_hour[info_title]

            newRow.appendChild(data_value)

        }
        table.appendChild(newRow)

        let modal = document.getElementById("modal_" + i)
        modal.onclick = function () {
            setupModal(location, datetime, icon_src, description, humidity, pressure, wind_speed)

        }
    }



}

function epochFormat(epochTimestamp) {
    if (epochTimestamp === "N.A.") {
        return epochTimestamp
    }
    const timeZone = 'Europe/Nicosia'; // Time zone for India

    // Convert epoch timestamp to milliseconds
    const date = new Date(epochTimestamp * 1000);

    // Create a new Intl.DateTimeFormat object with the timeZone option set to the desired country's time zone
    const formatter = new Intl.DateTimeFormat('en-IN', { timeZone: timeZone, hour12: false, hour: 'numeric', minute: 'numeric' });

    // Format the date and time according to the specified format
    const time = formatter.format(date);

    return time;
}

function setupModal(location, datetime, icon_src, description, humidity, pressure, wind_speed) {
    let modal_header = document.getElementById("modal_head")
    let modal_icon = document.getElementById("modal_icon")
    let modal_description = document.getElementById("description_label")
    let modal_humidity = document.getElementById("humidity_label")
    let modal_pressure = document.getElementById("pressure_label")
    let modal_wind_speed = document.getElementById("wind_speed_label")

    modal_header.innerText = "Weather in " + location + " on " + datetime
    modal_icon.src = icon_src
    modal_description.innerText = description
    modal_humidity.innerText = humidity
    modal_pressure.innerText = pressure
    modal_wind_speed.innerText = wind_speed


}

function createMap(lat, lon) {
    var map = new ol.Map({// a map object is created
        target: 'map',// the id of the div in html to contain the map
        layers: [// list of layers available in the map 
            new ol.layer.Tile({// first and only layer is the OpenStreetMap tiled layer 
                source: new ol.source.OSM()
            })
        ], view: new ol.View({ // view allows to specify center, resolution, rotation of the map 
            center: ol.proj.fromLonLat([lon, lat]), // center of the map 
            zoom: 5 // zoom level (0 = zoomed out)
        }),

    });

    layer_precipation = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://tile.openweathermap.org/map/precipation_new/{z}/{x}/{y}.png?appid=bdf1b645bafe0108bd1beb1114ee29d1',
        })
    });
    map.addLayer(layer_precipation); // a precipation layer on map

    layer_temp = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=bdf1b645bafe0108bd1beb1114ee29d1',
        })
    });
    map.addLayer(layer_temp); // a temp layer on map

    map.updateSize()

}


function sendRequestToDB(address, region, city) {

    let xhr = new XMLHttpRequest()

    xhr.open("POST", "php/handle_request.php")
    xhr.setRequestHeader("Content-Type", "application/json")

    let obj_params = {
        "username": "ademos02",
        "address": address,
        "region": region,
        "city": city
    }

    xhr.send(JSON.stringify(obj_params));
    xhr.onreadystatechange = function () {

        if ((xhr.readyState === 4 && xhr.status === 200)) {
            //request successful
        }

    };

}

function retrieveRequestsFromDB() {

    let xhr = new XMLHttpRequest()

    xhr.open("GET", "php/handle_request.php?username=ademos02")
    // xhr.setRequestHeader("Content-Type", "application/json")

    xhr.send();
    xhr.onreadystatechange = function () {

        if ((xhr.readyState === 4 && xhr.status === 200)) {
            try {
                let last5 = JSON.parse(xhr.responseText);
                appendRequests(last5)
            } catch (error) {
                alert(xhr.responseText)
            }

        }

    };

}