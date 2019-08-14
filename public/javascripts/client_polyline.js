// jshint esversion: 6

/**
* @desc Abgabe zu Aufgabe 7, Geosoft 1, SoSe 2019;
* application for creating a polyline and copying the geojson text representation
*/


/**
* @global routingControl, stores the routing control of the 'leaflet routing machine'
*/
var routingControl;
/**
* @global geojson, stores the content of the textarea 'geojsontextareaOutput'
*/
var geojson;
/**
* @global currentRoute, stores the current route of the 'leaflet routing machine'
*/
var currentRoute;


/**
* @desc creates,shows a map and creates, edits a polyline and catches an error
*/
function editAndShowPolyline(){
  "use strict";
  try{
    deleteText('geojsontextareaInput');
    deleteText('geojsontextareaOutput');
    document.getElementById("furtherInformation").reset();
    var mymap = createMap();
    editPolyline(mymap);
  }
  catch(err){
    // catches an error, if it is not possible to load the leaflet map/ leaflet script, shows a message
    document.getElementById("map").style.height = "40px";
    document.getElementById("mapError").innerHTML = "&#9888; Eine Anzeige der Karte ist momentan nicht möglich.";

    if(err.name == "ReferenceError"){
      alert("Die Karte kann nicht angezeigt werden.\n\nBitte überprüfen Sie Ihre Internetverbindung und laden die Seite neu.");
    }
  }
}

/**
* @desc creates,shows a map and updates, edits a polyline and catches an error
*/
function editAndShowPolylineUpdate(){
  "use strict";
  try{
    deleteText('geojsontextareaOutput');
    document.getElementById("furtherInformation").reset();
    var mymap = createMap();
    editPolyline(mymap);
    editExistingPolylineUpdate();
  }
  catch(err){
    // catches an error, if it is not possible to load the leaflet map/ leaflet script, shows a message
    document.getElementById("map").style.height = "40px";
    document.getElementById("mapError").innerHTML = "&#9888; Eine Anzeige der Karte ist momentan nicht möglich.";

    if(err.name == "ReferenceError"){
      alert("Die Karte kann nicht angezeigt werden.\n\nBitte überprüfen Sie Ihre Internetverbindung und laden die Seite neu.");
    }
  }
}

/**
* @desc creates and shows a map with the city Münster as center
* @return {object} map
*/
function createMap(){
  "use strict";
  var map = L.map("map").setView([51.9606649, 7.6261347], 11); // center of the map approximates the city Münster

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors",
    id: "osm"
  }).addTo(map);

  return map;
}

/**
* @desc determine if the input is GeoJson-valid regarding to a LineString in a FeatureCollection
* @param {string} lineStringId input (id of the textarea)
* @return {boolean} isValid, true: if the input is valid; false: if the input is not valid
*/
function isGeoJSONLineString(lineStringId){
  "use strict";
  /*
  * every valid GeoJson FeatureCollection regarding a linestring consist of:
  * - {"type" : "FeatureCollection", "features" : [{"type" : "Feature", "properties" : {"name" : "attribut", ... },
  *   "geometry" : {"type" : "LineString", "coordinates" : [[[Längengrad, Breitengrad], [ ... ]]}}, { ... }]}
  * - longitute: max 180.0, min -180.0
  * - latitude: max 90.0, min -90.0
  * - a linestring is defined by at least two points
  */
  var regularExpression = /^\s*{\s*"type"\s*:\s*"FeatureCollection"\s*,\s*"features"\s*:\s*\[\s*{\s*"type"\s*:\s*"Feature"\s*,\s*"properties"\s*:\s*({(\s*"[^"]*"\s*:\s*"[^"]*"\s*,\s*)*\s*"\s*[^"]*"\s*:\s*"[^"]*"\s*}\s*|\s*{\s*})\s*,\s*"geometry"\s*:\s*{\s*"type"\s*:\s*"LineString"\s*,\s*"coordinates"\s*:\s*\[\s*(\s*\[\s*(-?(([0-9]{1,2}|[1][0-7][0-9])(\.[0-9]*)?|180(\.0*)?))\s*,\s*(-?(([0-9]|[0-8][0-9])(\.[0-9]*)?|90(\.0*)?))\s*\]\s*,){1,}\s*\[\s*(-?(([0-9]{1,2}|[1][0-7][0-9])(\.[0-9]*)?|180(\.0*)?))\s*,\s*(-?(([0-9]|[0-8][0-9])(\.[0-9]*)?|90(\.0*)?))\s*\]\s*\]\s*}\s*}\s*\]\s*}\s*$/;

  var isValid = regularExpression.test(document.getElementById(lineStringId).value);
  return isValid;
}

/**
* @desc changes the border of the input field for the polygon if the input is not valid
*/
function showNotValidGeoJSONPolyline(){
  "use strict";
  if(isGeoJSONLineString("geojsontextareaInput")==false){
    document.getElementById("geojsontextareaInput").style.border = "3px solid red";
  }
  else{
    document.getElementById("geojsontextareaInput").style.border = "";
  }
}

/**
* @desc creates the given polyline to edit it based on 'leaflet routing mamchine'
* @throw an error message if the input of the textarea is empty or is not valid
*/
function editExistingPolyline(){
  "use strict";
  try{
    if(document.getElementById("geojsontextareaInput").value == ""){
      throw "fehlende Routeneingabe";
    }
    if(isGeoJSONLineString("geojsontextareaInput")==false){
      throw "Fehlerhafte Routeneingabe.\n\nEingabe muss nach folgendem Schema erfolgen:\n{\"type\" : \"FeatureCollection\", \"features\" : [{\"type\" : \"Feature\", \"properties\" : {\"name\" : \"attribute\", ... }, \"geometry\" : {\"type\" : \"LineString\", \"coordinates\" : [[Längengrad, Breitengrad], [ ... ]]}}]}\n\nAnmerkungen:\n- das Hinzufügen von Eigenschaften ist optional\n- es ist nur ein LineString (bzw. ein Route) in der FeatureCollection erlaubt";
    }
    document.getElementById("furtherInformation").reset();

    var polylineInput = JSON.parse(document.getElementById("geojsontextareaInput").value);

    if(polylineInput.features[0].properties.name != undefined){
      document.getElementById("nameInput").value = polylineInput.features[0].properties.name;
    }

    if(polylineInput.features[0].properties.type != undefined){
      document.getElementById("typeInput").value = polylineInput.features[0].properties.type;
    }

    if(polylineInput.features[0].properties.description != undefined){
      document.getElementById("descriptionInput").value = polylineInput.features[0].properties.description;
    }

    // deletes the calculated route, which was displayed at the map
    routingControl.spliceWaypoints(0, routingControl.getWaypoints().length);
    // deletes the calculated GeoJson-text representation of the corresponding route, which was displayed at the map
    deleteText('geojsontextareaOutput');

    var coordinates = polylineInput.features[0].geometry.coordinates;
    var latLngCoordinate = changeCoordinate(coordinates);

    /*
    * the 'leaflet routing machine' automatically calculates the route between two waypoints.
    * Because of this it is in my opinion necessary to have knowledge about the waypoints if
    * you want to display the route 1:1. Since the input can be any GeoJSON of type LineString,
    * it is not possible in my opinion. Especially if the original route does not run over roads.
    * Therefore, I decided to set the start and end points of a route as waypoints so that at
    * least one route can be calculated. This could be used to set additional waypoints to reach
    * the desired route.
    * I also tried to set all coordinates of a route as waypoints, but the calculated route does
    * not necessarily match the original route and the runtime is increased. In addition, it is
    * practically no longer possible to make changes to the route because the 'leaflet routing
    * machine' no longer reacts and crashes. These are the reasons why I did not implement it.
    * One of my ideas was to use the "IRoute" from the API, but I couldn't implement it.
    */
    routingControl.setWaypoints([latLngCoordinate[0], latLngCoordinate[latLngCoordinate.length-1]]);

    // deletes the input of the textarea to make a simple new input possible
    // deleteText('geojsontextareaInput');
    popup('myPopupInputFull');
  }
  catch(err){
    if(err == "fehlende Routeneingabe"){
      popup('myPopupInputEmpty');
    }
    else {
      alert(err);
    }
  }
}

/**
* @desc updates the given polyline to edit it based on 'leaflet routing mamchine'
* @throw an error message if the input of the textarea is empty or is not valid
*/
function editExistingPolylineUpdate(){
  "use strict";
  try{
    if(document.getElementById("geojsontextareaInput").value == ""){
      throw "fehlende Routeneingabe";
    }
    if(isGeoJSONLineString("geojsontextareaInput")==false){
      throw "Fehlerhafte Routeneingabe.\n\nEingabe muss nach folgendem Schema erfolgen:\n{\"type\" : \"FeatureCollection\", \"features\" : [{\"type\" : \"Feature\", \"properties\" : {\"name\" : \"attribute\", ... }, \"geometry\" : {\"type\" : \"LineString\", \"coordinates\" : [[Längengrad, Breitengrad], [ ... ]]}}]}\n\nAnmerkungen:\n- das Hinzufügen von Eigenschaften ist optional\n- es ist nur ein LineString (bzw. ein Route) in der FeatureCollection erlaubt";
    }
    document.getElementById("furtherInformation").reset();

    var polylineInput = JSON.parse(document.getElementById("geojsontextareaInput").value);

    if(polylineInput.features[0].properties.name != undefined){
      document.getElementById("nameInput").value = polylineInput.features[0].properties.name;
    }

    if(polylineInput.features[0].properties.type != undefined){
      document.getElementById("typeInput").value = polylineInput.features[0].properties.type;
    }

    if(polylineInput.features[0].properties.description != undefined){
      document.getElementById("descriptionInput").value = polylineInput.features[0].properties.description;
    }

    if(polylineInput.features[0].properties.id != undefined){
      document.getElementById("id").value = polylineInput.features[0].properties.id;
    }

    // deletes the calculated route, which was displayed at the map
    routingControl.spliceWaypoints(0, routingControl.getWaypoints().length);
    // deletes the calculated GeoJson-text representation of the corresponding route, which was displayed at the map
    deleteText('geojsontextareaOutput');

    var coordinates = polylineInput.features[0].geometry.coordinates;
    var latLngCoordinate = changeCoordinate(coordinates);

    routingControl.setWaypoints([latLngCoordinate[0], latLngCoordinate[latLngCoordinate.length-1]]);
  }
  catch(err){
    alert(err);
  }
}

/**
* @desc swaps latitude and longitude and saves the result in a new array and returns it
* @param {array} coordinates array with the coordinates (of the route)
*	@return {array} coordinatesLatLng, array with the swaped coordinates of the route
*/
function changeCoordinate(coordinates){
  "use strict";
  var coordinatesLatLng = [];
  for(var i = 0; i < coordinates.length; i++){
    coordinatesLatLng.push(L.latLng([coordinates[i][1], coordinates[i][0]]));
  }
  return coordinatesLatLng;
}

/**
* @desc creates a polyline between at least two points based on 'leaflet routing mamchine' and generates the corresponding geojson text representation
* @see http://www.liedman.net/leaflet-routing-machine/tutorials/interaction/
* @see https://github.com/perliedman/leaflet-routing-machine/blob/344ff09c8bb94d4e42fa583286d95396d8227c65/src/L.Routing.js
* @param {object} map, object, which is the map created by the function "createMap()"
*/
function editPolyline(map){
  "use strict";
  // creates a routing control with a geocoder
  routingControl = L.Routing.control({
    show: false,
    collapsible: true, // if true, a collapse button is added, if false, no button is added, if undefined, a button is added if the screen width is small (typically mobile devices)
    // because of the demo geocoder, afer a specific amount of requests the geocoder does not worked
    geocoder: L.Control.Geocoder.nominatim(),
    waypoints: [],
    routeWhileDragging: true,
    fitSelectedRoutes: true, // fits the route
    lineOptions: {
      styles: [{color: 'black', opacity: 0.15, weight: 9},
      {color: 'white', opacity: 0.8, weight: 6},
      {color: 'blue', opacity: 1, weight: 2}]
    }
  }).addTo(map);

  // updates the geojson text representation in the output-textarea, if all further information are given
  routingControl.on('routeselected', function(output) {
    currentRoute = output.route;
    geojson = L.Routing.routeToGeoJson(output.route);
    var geometry = L.Routing.routeToLineString(output.route);
    console.log(geometry.coordinates);
    document.getElementById('geometry').value = JSON.stringify(geometry.coordinates);//.replace(/{"type":"LineString","coordinates":/, '').replace(/\]\]}/, ']]');
    updateText(geojson);
  });

  // deletes the current geojson text representation in the output-textarea if no route is displayed
  routingControl.on('waypointschanged', function(output) {
    if(routingControl.getWaypoints().length == 2){
      var numberWaypointsExists = 2;
      for(var i = 0; i < output.waypoints.length; i++){
        // if latLng is null, then it is no waypoint
        if(output.waypoints[i].latLng == null){
          numberWaypointsExists = numberWaypointsExists - 1;
        }
      }
      // a route must have two waypoints, otherwise it cannot calculate any route
      if(numberWaypointsExists < 2){
        // clears the output textarea
        deleteText('geojsontextareaOutput');
        document.getElementById('geometry').value = "";
      }
    }

  });

  // @see http://www.liedman.net/leaflet-routing-machine/tutorials/interaction/
  map.on('click', function(e){
    var container = L.DomUtil.create('div');
    var startButton = createButton('Start', container);
    var destinationButton = createButton('Ziel', container);

    L.popup()
    .setContent(container)
    .setLatLng(e.latlng)
    .openOn(map);

    // sets the coordinates as target point
    L.DomEvent.on(destinationButton, 'click', function(){
      routingControl.spliceWaypoints(routingControl.getWaypoints().length-1, 1, e.latlng);
      map.closePopup();
    });

    // sets the coordinates as starting point
    L.DomEvent.on(startButton, 'click', function(){
      routingControl.spliceWaypoints(0, 1, e.latlng);
      map.closePopup();
    });
  });
}

/**
* @desc creates the geojson text representation of the drawn polyline
* @see https://github.com/perliedman/leaflet-routing-machine/blob/344ff09c8bb94d4e42fa583286d95396d8227c65/src/L.Routing.js
* @param {object} route, object, which stores the information and coordinates about the routed route
* @return {json} geojson, representation of the drawn polyline
*/
L.Routing.routeToGeoJson = function (route) {
  "use strict";
  var geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          // id: document.getElementById("id").value,
          // author: document.getElementById("author").value,
          type: document.getElementById("typeInput").value,
          name: document.getElementById("nameInput").value,
          description: document.getElementById("descriptionInput").value,
          // date: document.getElementById("date").value
        },
        geometry: L.Routing.routeToLineString(route)
      }
    ]
  };
  return geojson;
};

/**
* @desc creates a linestring with all coordinates of the drawn polyline
* @see https://github.com/perliedman/leaflet-routing-machine/blob/344ff09c8bb94d4e42fa583286d95396d8227c65/src/L.Routing.js
* @param {object} route, object, which stores the information and coordinates about the routed route
* @return {json} linestring with all coordinates of the drawn polyline
*/
L.Routing.routeToLineString = function(route) {
  "use strict";
  var lineCoordinates = [],
  i,
  latLng;

  for (i = 0; i < route.coordinates.length; i++) {
    latLng = L.latLng(route.coordinates[i]);
    lineCoordinates.push([latLng.lng, latLng.lat]);
  }

  return {
    type: 'LineString',
    coordinates: lineCoordinates
  };
};

/**
* @desc creates a button
* @param {string} label, name of the button
* @param {object} container, HTML-element 'div'
* @return {object} button
*/
function createButton(label, container){
  "use strict";
  var button = L.DomUtil.create('button','', container);
  button.setAttribute('type','button');
  button.innerHTML = label;
  return button;
}

/**
* @desc clears the output-textarea
* @param {string} elementId, specifies the HTML-element
*/
function deleteText(elementId){
  "use strict";
  document.getElementById(elementId).value = "";
}

/**
* @desc shows the geojson text representation from the the drawn polyline in the output-textarea
* @param {object} geojson
*/
function updateText(geojson){
  "use strict";
  document.getElementById("geojsontextareaOutput").value = JSON.stringify(geojson);
}

/**
* @desc copies the content of the textarea if it is not empty and displays a status message
*/
function copyText() {
  "use strict";
  var text = document.getElementById("geojsontextareaOutput");
  var popupText = document.getElementById("myPopupOutput");
  if(text.value == ""){
    popupText.innerHTML = "keine Polyline<br>verfügbar";
    popup('myPopupOutput');
  }
  else{
    text.select();
    // command to copy selected text
    document.execCommand("copy");
    popupText.innerHTML = "Polyline in<br>Zwischenablage<br>kopiert";
    popup('myPopupOutput');
  }
}

/**
* @desc shows a popup for 700 miliseconds and closes it afterwards
* @param {string} elementId, specifies the HTML-element
*/
function popup(elementId){
  "use strict";
  var popup = document.getElementById(elementId);
  popup.classList.toggle("show");
  setTimeout(function(){
    popup.classList.toggle("hide");
  }, 700);
}

/**
* @desc updates the output in the textarea as soon as all form fields are filled
*/
function updateForm(){
  "use strict";
  if((document.getElementById("nameInput").value!="") &&
  (document.getElementById("typeInput").value!="") &&
  (document.getElementById("descriptionInput").value!="")){

    if(geojson != undefined){
      geojson = L.Routing.routeToGeoJson(currentRoute);
      updateText(geojson);
    }
  }
}

/**
* @desc checks if all form fields are filled and posts these data
* @param {string} action, defines the action from the POST-method
* @throw an error if not all form fields are filled
*/
function isComplete(action){
  "use strict";
  try{
    if((document.getElementById("nameInput").value!="") &&
    (document.getElementById("typeInput").value!="") &&
    (document.getElementById("descriptionInput").value!="")&&
    (document.getElementById("geometry").value!="")){
      var form = document.getElementById('furtherInformation');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', action);
      form.submit();
    }
    else{
      throw "Es muss eine Route erstellt,\nsowie Angaben zum Typ, Namen und Beschreibung\ngemacht werden bevor die Route in der Datenbank abgespeichert werden kann.\n\nAnmerkung: Um ein valides GeoJson zu erstellen, bedarf es keiner Anführungszeichen!";
    }
  }
  catch(err){
    if(err == "Es muss eine Route erstellt,\nsowie Angaben zum Typ, Namen und Beschreibung\ngemacht werden bevor die Route in der Datenbank abgespeichert werden kann.\n\nAnmerkung: Um ein valides GeoJson zu erstellen, bedarf es keiner Anführungszeichen!"){
      alert(err);
    }
    else{
      console.log(err);
    }
  }
}
