// jshint browser: true
// jshint node: true
// jshint esversion: 6
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* auxiliary functions for creating a map
*/


/**
* @desc creates and shows a map with the city Münster as center
* @return {object} map
*/
 function createMap(id){
  var map = window.L.map(id).setView([51.9606649, 7.6261347], 11); // center of the map approximates the city Münster

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors",
    id: "osm"
  }).addTo(map);

  return map;
}


/**
* @desc swaps latitude and longitude and saves the result in a new array and returns it
* @param {array} coordinates array with the coordinates (of the route)
*	@return {array} coordinatesLatLng, array with the swaped coordinates of the route
*/
 function changeCoordinate(coordinates){
  var coordinatesLatLng = [];
  for(var i = 0; i < coordinates.length; i++){
    coordinatesLatLng.push(window.L.latLng([coordinates[i][1], coordinates[i][0]]));
  }
  return coordinatesLatLng;
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
