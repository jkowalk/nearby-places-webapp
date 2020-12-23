/****************** GPS **************************/
var x = document.getElementById("p_geoloc");
var auto;
var last_position;
var state = 0;
var auto_r = false;
var closest_place;

function on_load() {
    window.addEventListener('popstate', function(e) {
        window.location.reload();
    });
}

function triggerLocation() {
    history.pushState(null, "", "index.html");
    if (state===0) {
        document.getElementById("header").textContent = "";
        document.getElementById("thumbnail").setAttribute("src", "");
        document.getElementById("summary").textContent = "";
        document.getElementById("description").textContent = "";
        document.getElementById("map").setAttribute("src", "");
        document.getElementById("header").innerHTML = "Nearby Places";
        document.getElementById("reload").textContent = "Neu laden...";
        var list = document.getElementById("list");
        list.style.animation = 'none';
        list.offsetHeight; /* trigger reflow */
        list.style.animation = null;
        document.getElementById("geoloc").style.animationName = "slide_up";
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(checkDistance, showError);
    } else {
        x.innerHTML = "Geolocation is not supported by this browser.";
    }
}

function checkDistance(coord) {
    var dist = distance(coord.coords.latitude, coord.coords.longitude, last_position.coords.latitude, last_position.coords.longitude, "M");
    alert(dist);
    if (Math.abs(dist) >= 10) {
        triggerLocation();
        if (state===1) {
            get_summary(closest_place.title);
        }
    }
}

function triggerReload() {
    if (state===1) {
        state=0;
    }
    document.getElementById("auto_reload").checked=false;
    auto_r=false;
    window.clearInterval(auto);
    triggerLocation();
}

function showPosition(position) {
    //x.innerHTML = "Latitude: " + position.coords.latitude +
    //  "<br>Longitude: " + position.coords.longitude;
    last_position = position;
    start_spin();
    fetch_data(position);
}

function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            x.innerHTML = "User denied the request for Geolocation.";
            break;
        case error.POSITION_UNAVAILABLE:
            x.innerHTML = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            x.innerHTML = "The request to get user location timed out.";
            break;
        case error.UNKNOWN_ERROR:
            x.innerHTML = "An unknown error occurred.";
            break;
    }
}



/*********    Fetch data     **************/
function fetch_data(position) {
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    var url = "https://de.wikipedia.org/w/api.php";
    var list = [];

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
            console.log(response);
            var pages = response.query.pages;
            change_content(pages);
        })
        .catch(function (error) {
            console.log(error);
        });
}

async function change_content(pages) {
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
            long: pages[page].coordinates[0].long,
            dist: pages[page].coordinates[0].dist,
            img: img_src,
        };
        list.push(p);
    }
    list.sort((a, b) => (a.dist > b.dist) ? 1 : -1);
    closest_place = list[0];
    stop_spin();
    if (state===0) {
        for (let i = 0; i < list.length; i++) {
            str += "<div class='tile' onclick='get_summary(\"" + list[i].title + "\")'>" +
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
}

function get_summary(title) {
    document.getElementById("header").innerHTML = title;
    document.getElementById("list").innerHTML = "";
    document.getElementById("reload").textContent = "Zurück";
    state = 1;
    start_spin();
    var page_title = title.replace(" ", "_");
    fetch("https://de.wikipedia.org/api/rest_v1/page/summary/" + title, {method: "GET"})
        .then(res => res.json())
        .then(show_summary);
}

async function show_summary(json) {
    stop_spin();
    document.getElementById("header").textContent=json.title;
    var thumb = document.getElementById("thumbnail");
    try {
        thumb.setAttribute("src", json.thumbnail.source);
        document.getElementById("img_wrapper").style.visibility="visible";
    } catch (e) {
        thumb.setAttribute("src", "");
        document.getElementById("img_wrapper").style.visibility="hidden";
    }
    document.getElementById("summary").textContent=json.extract;
    document.getElementById("link").innerHTML="<a target='_blank' href='https://de.wikipedia.org/wiki/" +
        json.title.replace(" ", "_") +
        "'>Zum Wikipedia Artikel...</a>";
    document.getElementById("description").textContent=json.description;
    document.getElementById("map").setAttribute("src", "https://maps.google.com/maps?q=" + json.coordinates.lat +
        ", " + json.coordinates.lon +
        "&z=18&output=embed");
}

function start_spin() {
    document.getElementsByClassName("main")[0].style.visibility="hidden";
    document.getElementById("spin_wrapper").innerHTML = "<div id=\"spin\"></div>";
}

function stop_spin() {
    document.getElementById("spin_wrapper").innerHTML = "";
    document.getElementsByClassName("main")[0].style.visibility="visible";
}

function auto_reload() {
    auto_r = document.getElementById("auto_reload").checked;
    if(auto_r) {
        auto = window.setInterval(function(){
            getLocation();
        }, 10000);
    } else {
        window.clearInterval(auto);
    }
}

function distance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 === lat2) && (lon1 === lon2)) {
        return 0;
    }
    else {
        var radlat1 = Math.PI * lat1/180;
        var radlat2 = Math.PI * lat2/180;
        var theta = lon1-lon2;
        var radtheta = Math.PI * theta/180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit==="K") { dist = dist * 1.609344 }
        if (unit==="N") { dist = dist * 0.8684 }
        return dist;
    }
}
