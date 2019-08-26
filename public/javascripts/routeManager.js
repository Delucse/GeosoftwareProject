// jshint browser: true
// jshint node: true
// jshint esversion: 6
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application for creating a map for every single route from the current user
*/



/**
* @desc creates a map for every single route from the current user
* @param {array} input, result from the database-query (all routes from the current user)
*/
function getPolylineLeaflet(input){
  if(input.length > 0){
    for(var i = 0; i < input.length; i++){
      var map = window.createMap('map '+i);
      // create a red polyline from an array of LatLng points
      var latlngs = window.changeCoordinate(input[i].coordinates);
      var polyline = window.L.polyline(latlngs, {color: 'red'}).addTo(map);
      // zoom the map to the polyline
      map.fitBounds(polyline.getBounds());
    }
  }
}


/**
* @desc determines the time when the respective route was created in a pretty way
* @param {array} input, result from the database-query (all routes from the current user)
*/
function getTime(input){
  if(input.length > 0){
    for(var i = 0; i < input.length; i++){
      var element = document.getElementById('date '+i);
      element.innerHTML = window.prettyTime(new Date(input[i].date));
    }
  }
}
