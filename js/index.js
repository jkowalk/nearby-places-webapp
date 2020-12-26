var geoloc_error = document.getElementById("p_geoloc");
var auto;
var last_position;
var current_position;
var state = 0;
var auto_r = false;
var closest_place;
var nearby_places = [];
var summary_data;

function on_load() {
    window.addEventListener('popstate', function (e) {
        window.location.reload();
    });
}

var close = document.querySelectorAll('[data-close="alert"]');
for (var i = 0; i < close.length; i++) {
    close[i].onclick = function(){
        var div = this.parentElement;
        div.style.opacity = '0';
        setTimeout(function(){div.style.display = 'none';}, 400);
    }
}

/********  Input Control  *************/

function start_button() {
    history.pushState(null, "", "index.html");
    start_button_animation();
    get_location(function (pos) {
        fetch_nearby_places_list(current_position, function () {
            show_list();
            last_position = current_position;
        });
    });
}

function refresh_back_button() {
    switch (state) {
        case 0:
            break;
        case 1:
            state = 0;
            document.getElementById("reload").innerText = "Neu laden";
            break;
    }
    get_location(function (pos) {
        fetch_nearby_places_list(current_position, function () {
            blank_screen();
            reset_show_list_animation();
            show_list();
            unveil_list();
            last_position = current_position;
        });
    });
}

function click_tile(title) {
    state = 1;
    blank_screen();
    fetch_summary(title, function () {
        show_summary();
        unveil_place();
        document.getElementById("reload").innerText = "Zurück";
    });
}

function auto_reload() {
    auto_r = document.getElementById("auto_reload").checked;
    if (auto_r) {
        document.getElementsByClassName("alert")[0].style.display="block";
        auto = window.setInterval(function () {
            get_location(function (pos) {
                var dist = get_distance(current_position.lat, current_position.long, last_position.lat, last_position.long);
                if (dist < 0.3) {
                    switch (state) {
                        case 0:
                            for (let i = 0; i < nearby_places.length; i++) {
                                nearby_places[i].dist = Math.round(get_distance(current_position.lat,
                                    current_position.long, nearby_places[i].lat, nearby_places[i].long) * 1000);
                            }
                            show_list();
                            break;
                        case 1:
                            summary_data.dist = Math.round(get_distance(current_position.lat, current_position.long, summary_data.lat, summary_data.long) * 1000);
                            var str = "";
                            if (summary_data.description) {
                                str += summary_data.description + " - ";
                            }
                            document.getElementById("description").innerText = str + summary_data.dist + " m entfernt";
                            break;
                    }
                } else {
                    switch (state) {
                        case 0:
                            refresh_back_button();
                            break;
                        case 1:
                            fetch_nearby_places_list(current_position, function () {
                                if (nearby_places[0].title !== summary_data.title) {
                                    fetch_summary(nearby_places[0].title, function () {
                                        show_summary();
                                        last_position = current_position;
                                    });
                                }
                            });
                            break;
                    }
                }
            });
        }, 5000);
    } else {
        window.clearInterval(auto);
    }
}

function switch_state() {
    switch (state) {
        case 0:

            break;
        case 1:
            break;
    }
}

/************** End: Input Control *******************/

/***************  View  *********************/

function blank_screen() {
    geoloc_error.innerHTML = "";
    document.getElementById("list").style.display = "none";
    document.getElementById("place").style.display = "none";
    start_spin();
}

function unveil_list() {
    stop_spin();
    document.getElementById("list").style.display = "flex";
}

function unveil_place() {
    stop_spin();
    document.getElementById("place").style.display = "block";
}

function start_button_animation() {
    document.getElementById("geoloc").style.animationName = "slide_up";
}

function show_list() {
    var list = nearby_places;
    var str = "";
    for (let i = 0; i < list.length; i++) {
        str += "<div class='tile' onclick='click_tile(\"" + list[i].title + "\")'>" +
            "<img class='thumbnail' src='" + list[i].img + "'>" +
            "<div class='text-block'>" +
            "<h3>" + list[i].title + "</h3>" +
            "<p>" + list[i].dist + " m entfernt</p>" +
            "</div>" +
            "</div>";
    }
    document.getElementById("list").innerHTML = str;
    document.getElementById('list').style.animationName = "fade_in";
    document.getElementsByClassName('footer')[0].style.animationName = "view_footer";
}

function reset_show_list_animation() {
    var list = document.getElementById("list");
    list.style.animation = 'none';
    list.offsetHeight; // trigger reflow
    list.style.animation = null;
}

function show_summary() {
    document.getElementById("header").innerHTML = summary_data.title;
    var str = "";
    if (summary_data.description) {
        str += summary_data.description + " - ";
    }
    document.getElementById("description").innerText = str + summary_data.dist + " m entfernt";
    document.getElementById("thumbnail").setAttribute("src", summary_data.img);
    document.getElementById("summary").textContent = summary_data.summary;
    document.getElementById("link").innerHTML = "<a target='_blank' href='https://de.wikipedia.org/wiki/" +
        summary_data.title.replace(" ", "_") +
        "'>Zum Wikipedia Artikel...</a>";
    document.getElementById("map").setAttribute("src", "https://maps.google.com/maps?q=" + summary_data.lat +
        ", " + summary_data.long +
        "&z=15&output=embed");
}

function start_spin() {
    document.getElementById("spin_wrapper").innerHTML = "<div id=\"spin\"></div>";
}

function stop_spin() {
    document.getElementById("spin_wrapper").innerHTML = "";
}

/***************  End: View  ********************/


/********************* Location Management  *************************/

function get_location(callback) {
    if (!navigator.geolocation) {
        console.log("Geolocation not supported");
        geoloc_error.innerHTML = "Geolocation is not supported by this browser.";
        current_position = null;
        callback(null);
    }
    navigator.geolocation.getCurrentPosition(
        function (position) {
            let returnValue = {
                lat: position.coords.latitude,
                long: position.coords.longitude
            };
            current_position = returnValue;
            callback(returnValue);
        }, showError
    )
}

function showError(error) {
    current_position = null;
    console.log(error);
    switch (error.code) {
        case error.PERMISSION_DENIED:
            geoloc_error.innerHTML = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            geoloc_error.innerHTML = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            geoloc_error.innerHTML = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            geoloc_error.innerHTML = "An unknown error occurred.";
            break;
    }
}

function get_distance(lat1, lon1, lat2, lon2) {
    if ((lat1 === lat2) && (lon1 === lon2)) {
        return 0;
    } else {
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        dist = dist * 1.609344;
        return dist; //in kilometers
    }
}

/******************  End: Location Management  ***********************/


/******************  Data Management  *********************/

function fetch_nearby_places_list(position, callback) {
    var lat = position.lat;
    var long = position.long;
    var url = "https://de.wikipedia.org/w/api.php";

    var params = {
        action: "query",
        generator: "geosearch",
        prop: "coordinates|pageimages|pageprops|description",
        ggscoord: lat + "|" + long,
        codistancefrompoint: lat + "|" + long,
        ggsnamespace: 0,
        ggsradius: 1000,
        colimit: "max",
        format: "json",
        ggslimit: 50,
        pilimit: 50,
        formatversion: 2,
        ppprop: "displaytitle",
        piprop: "thumbnail",
        pithumbsize: 320,
    };

    url = url + "?origin=*";
    Object.keys(params).forEach(function (key) {
        url += "&" + key + "=" + params[key];
    });

    fetch(url)
        .then(function (response) {
            return response.json();
        })
        .then(function (response) {
            parse_json_page_list(response.query.pages);
            callback();
        })
        .catch(function (error) {
            geoloc_error.innerHTML = "Irgendetwas ist schiefgelaufen :(, probier die Seite mal neu zu laden.";
            console.log(error);
        });
}

function parse_json_page_list(pages) {
    var str = "";
    var img_src;
    var list = [];

    for (var page in pages) {
        try {
            img_src = pages[page].thumbnail.source;
        } catch (e) {
            img_src = "ressources/no_img.jpg";
        }
        var p = {
            title: pages[page].title,
            description: pages[page].description,
            lat: pages[page].coordinates[0].lat,
            long: pages[page].coordinates[0].lon,
            dist: Math.round(pages[page].coordinates[0].dist),
            img: img_src,
        };
        list.push(p);
    }
    list.sort((a, b) => (a.dist > b.dist) ? 1 : -1);
    closest_place = list[0];
    nearby_places = list;
}

function fetch_summary(title, callback) {
    var page_title = title.replace(" ", "_");
    fetch("https://de.wikipedia.org/api/rest_v1/page/summary/" + page_title, {method: "GET"})
        .then(function (response) {
            return response.json();
        })
        .then(function (response) {
            parse_json_summary(response);
            callback();
        })
        .catch(function (error) {
            geoloc_error.innerHTML = "Irgendetwas ist schiefgelaufen :(, probier die Seite mal neu zu laden.";
            console.log(error);
        });
}

function parse_json_summary(data) {
    var img_src;
    try {
        img_src = data.thumbnail.source;
    } catch (e) {
        img_src = "";
    }
    var summary = {
        title: data.title,
        description: data.description,
        summary: data.extract,
        lat: data.coordinates.lat,
        long: data.coordinates.lon,
        dist: Math.round(get_distance(current_position.lat, current_position.long, data.coordinates.lat, data.coordinates.lon) * 1000),
        img: img_src,
    };
    summary_data = summary;
}

/*************** End: Data Management  ************/




function triggerLocation() {
    history.pushState(null, "", "index.html");
    if (state === 0) {
        document.getElementById("header").textContent = "";
        document.getElementById("thumbnail").setAttribute("src", "");
        document.getElementById("summary").textContent = "";
        document.getElementById("description").textContent = "";
        document.getElementById("map").setAttribute("src", "");
        document.getElementById("header").innerHTML = "Nearby Places";
        document.getElementById("reload").textContent = "Neu laden...";
        var list = document.getElementById("list");
        list.style.animation = 'none';
        list.offsetHeight; // trigger reflow
        list.style.animation = null;
        document.getElementById("geoloc").style.animationName = "slide_up";
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        geoloc_error.innerHTML = "Geolocation is not supported by this browser.";
    }
}