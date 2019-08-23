function getPolylineLeaflet(input){
  if(input.length > 0){
    for(var i = 0; i < input.length; i++){
      var map = createMap('map '+i);
      // create a red polyline from an array of LatLng points
      var latlngs = changeCoordinate(input[i].coordinates);
      console.log(latlngs);
      var polyline = L.polyline(latlngs, {color: 'red'}).addTo(map);
      // zoom the map to the polyline
      map.fitBounds(polyline.getBounds());
    }
  }
}

function getTime(input){
  if(input.length > 0){
    console.log(input);
    for(var i = 0; i < input.length; i++){
      var element = document.getElementById('date '+i);
      console.log(input[i].date);
      element.innerHTML = prettyTime(new Date(input[i].date));
    }
  }
}


/**
* @desc changes the time and date in a pretty way
* @param {date} time
* @return {string} prettyTime, time and date in a pretty way (day dd.mm.yyyy, hh:mm:ss)
*/
function prettyTime(time){
  var today = time;
  var day = today.getDate();
  // get the day of the week
  var dayNumber = today.getDay();
  var weekday = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samsatg'];
  // counting starts at 0
  var month = today.getMonth() + 1;
  var year = today.getFullYear();
  var hour = today.getHours();
  var minute = today.getMinutes();
  var second = today.getSeconds();
  // to retain the schema (hh:mm:ss, dd.mm.yyyy), a 0 must be added if necessary
  var add0 = [day, month, hour, minute, second];
  for(var i=0; i < add0.length; i++){
    if(add0[i] < 10){
      add0[i] = '0'+add0[i];
    }
  }
  var prettyTime = weekday[dayNumber]+' '+add0[0]+'.'+add0[1]+'.'+year+', '+add0[2]+':'+add0[3]+':'+add0[4]+' Uhr';
  return prettyTime;
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
* @desc creates and shows a map with the city Münster as center
* @return {object} map
*/
function createMap(id){
  "use strict";
  var map = L.map(id);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors",
    id: "osm"
  }).addTo(map);

  return map;
}
