var address, map, infoWindow;
var markers = [];


function clearMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}

/*
 * Get the elevation at the coordinates of a latlng object using
 * the google maps elevation service. func is a callback function that
 * does what you want to do with the elevation once returned
 */
function getElevation(location, func){
    const elevator = new google.maps.ElevationService();
    elevator.getElevationForLocations(
        {
            locations: [location],
        },
        function (results, status) {
            func(results[0].elevation);
        }
    )
}


/*
 * Place a marker at a latlng object on the map
 * The map is also recentered on this new marker
 * If the marker is clicked, present the prompt to take to the 
 * results page
 */
function createMarker(place) {
    if (!place.geometry || !place.geometry.location) {
        console.log("Invalid Location for marker")
        return;
    }
    const icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25),
    };
    const marker = new google.maps.Marker({
        map,
        icon,
        title: place.name,
        position: place.geometry.location,
    });
    markers.push(marker);

    reCenterMap(place.geometry.location);

    google.maps.event.addListener(marker, "click", () => {
        presentPrompt(place.geometry.location, place.name);
    });
}

function drawWater(level){
    var canvas = document.getElementById("water");
    var ctx = canvas.getContext("2d");
    var pos =0;
    var width = 50;
    var pos2 =width*4;

    var y = canvas.height;
    var id = setInterval(rise,level*15);
    setInterval(waves,level*15);
    var deepblue="#0f6afc"; 
    var blue="#479dff"; 
    var space="#FFFFFF"; 
    function waves(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        threeWaves(ctx,pos2,y-10,width,space,deepblue,canvas.height);

        threeWaves(ctx,pos,y,width,deepblue,blue,canvas.height);
        ctx.fillStyle = blue;
        pos++;
        pos2-=.7;
        if(pos2 <= 0)
            pos2 = width*4 ;
        if(pos == width*4)
            pos=0;
    }
 
    function rise(){
        waves();
        y--;
        if(y < level*50){
            clearInterval(id);
            console.log(id);
        }   
    }

    
}

function threeWaves(ctx,pos,y,width,space,color,height){
        ctx.fillStyle = color;

        ctx.fillRect(0,y,1000,height);
        singleWave(ctx,pos-width*4,y,width,space ,color );
        singleWave(ctx,pos,y,width,space ,color );
        singleWave(ctx,pos+width*4,y,width,space,color  );

}

function singleWave(ctx,start,posH,width,space,color){
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.ellipse(start, posH+1, width-1, 15, 0, 0, Math.PI,true);
    ctx.fill();
    ctx.fillStyle = space;
    ctx.beginPath();
    ctx.ellipse(start+width*2, posH, width, 10, 0, 0, Math.PI,false);
    ctx.fill();


}
    
/*
 * Initialize the map
 * Creates a new google maps Map object centered on the US
 * Also places a search box object at the top of the map
 * If a places_changed event occurs from a search, place a marker 
 * at the location. If the map is clicked, present the prompt to check that location
 */
function initMap() {
    // Place center of map over US
    const US = { lat: 39.6394, lng: -101.2988 }
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: US,
        gestureHandling: "greedy",
    });
    infoWindow = new google.maps.InfoWindow({
        content: "Click anywhere on the map to get a location or use the search bar at the top",
        position: US,
    });

    const input = document.getElementById("search-input");
    const searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

    map.addListener("bounds_changed", function() {
        searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener("places_changed", function() {
        const places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        clearMarkers();

        const bounds = new google.maps.LatLngBounds();
        places.forEach(function(place) {
            if (!place.geometry || !place.geometry.location) {
                console.log("Invalid location returned");
                return;
            }
            createMarker(place);
            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            }
            else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });

    infoWindow.open(map);

    map.addListener("click", function(mapsMouseEvent) {
        clearMarkers();
        presentPrompt(mapsMouseEvent.latLng, null);
    });
}


/*
 * Create an info window prompting the user to check the sea level results for a location
 */
function presentPrompt(location, name) {
    infoWindow.close();

    let latitude = location.lat();
    let longitude = location.lng();

    displayLat = Math.round(latitude.toPrecision(6)*100)/100;
    displayLng = Math.round(longitude.toPrecision(6)*100)/100;

    // If the location was searched, include the location name as well. Othewise only include the coordinates
    if (name === null) {
        displayString = "You've selected a latitude of " + displayLat + " and a longitude of "  + displayLng + ".";
    }
    else {
        displayString = "You've selected " + name + " at a latitude of " + displayLat + " and a longitude of " + displayLng + ".";
    }

    promptString = "How likely is it that these coordinates will be affected?"

    let displayElement = document.createElement("p");
    displayElement.innerHTML = displayString;
    displayElement.className = "text-center"

    let promptElement = document.createElement("input");
    promptElement.type = "button";
    promptElement.className = "btn btn-primary";
    promptElement.value = promptString;

    promptElement.addEventListener('click', function() {
        loadResultPage(location);
    });

    // combine the button and the text elements into one for display
    let contentElement = document.createElement("div");
    contentElement.className = "justify-content-center"
    contentElement.append(displayElement);
    contentElement.append(promptElement)

    reCenterMap(location);

    // place the info window
    infoWindow = new google.maps.InfoWindow({
        position: location,
    });

    infoWindow.setContent(
        contentElement
    );
    infoWindow.open(map);
}


function reCenterMap(location) {
    map.setCenter(location);

    let zoom = map.getZoom();

    if (zoom < 8) {
        console.log("Changing zoom")
        map.setZoom(8);
    }
}


/* 
 * The result string is strucutured to meet the format expected by the django view function
 */
function loadResultPage(location) {
    getElevation(location, 
        function(elevation)
        {
            window.location.href = 'result?lng=' + location.lng() + '&lat=' + location.lat() + '&elev=' + elevation 
        }
    );
}

/*
 * Based on the chance filled by Django, display a different message and different speed for the water animation
 */
function fillResultData() {
    let chance = document.getElementById("chance").innerHTML;
    console.log(chance);
    if (chance === "extremely high") {
        document.getElementById("message").innerHTML= "If carbon dioxide emissions stay constant this location could be flooded by 2050 or even earlier."
        drawWater(.5);
    }
    else if (chance === "high") {
        document.getElementById("message").innerHTML= "If emissions stay constant this location could be flooded by 2100 and if emissions increase it could be flooded by 2050.";
        drawWater(.7);
    }
    else if(chance === "medium high") {
        document.getElementById("message").innerHTML= "If emissions stay constant this location probably won't flood by 2100 but if they increase flooding becomes a possibility.";
        drawWater(.9);
    }
    else if (chance === "medium") {
        document.getElementById("message").innerHTML= "If emissions don't increase moderately this location probably won't be flooded by 2100. ";
        drawWater(1);
    }
    else if (chance === "medium low") {
        document.getElementById("message").innerHTML= "If emissions don't increase drastically this location is probably safe until at least 2100.";
        drawWater(1.5);
    }
    else if (chance === "low") {
        document.getElementById("message").innerHTML= "This location is unlikely to flood by 2100 but in a worst case scenario could still flood in the future.";
        drawWater(2);
    }
    else { 
        document.getElementById("message").innerHTML= "This location is unlikely to flood due to rising sea levels.";
        drawWater(2.2);
    }
}
