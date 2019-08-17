// jshint node: true
// jshint esversion: 6
"use strict";

function createElement(elementName, className, id, style, parentElementId, content){
	var element = document.createElement(elementName);
	element.setAttribute("class", className);
	element.setAttribute("id", id);
	element.style = style;
	element.innerHTML = content;
	// console.log(parentElementId);
	document.getElementById(parentElementId).appendChild(element);
}

var layers = [];
var maps = [];

function drawEncounters(queryResultEncountersUser, queryResultEncountersAnimal, queryResultRoute){
	console.log(queryResultEncountersUser);

	if(queryResultEncountersUser.length + queryResultEncountersAnimal.length > 0){
		// createElement('div', '', 'encounters', '', 'main', '');
		for(var i = 0; i < queryResultRoute.length; i++){
			var map;
			var originalRoute;
			var encountersMeLayerGroup = [];
			var encountersOthersLayerGroup = [];
			var encountersAnimalsLayerGroup = [];

			var id = queryResultRoute[i]._id;

			for(var j = 0; j < queryResultEncountersUser.length; j++){
				if(queryResultEncountersUser[j].comparedRoute === queryResultRoute[i]._id || queryResultEncountersUser[j].routeId === queryResultRoute[i]._id){
					//create div-boxes

					if(!(document.getElementById('row map '+id))){
						createElement('div', 'row', 'row map '+id, "border-style: none none solid none; border-width: 1px;", 'encounters', '');
						createElement('div', 'col-12', 'col map '+id, "margin-top: 20px; margin-bottom: 44.2px;", 'row map '+id, '');
						createElement('p', '', '', '', 'col map '+id, '<b>Route '+queryResultRoute[i].name+'</b>');
						createElement('div', '', 'map '+id, "height:350px; width: 100%;", 'col map '+id, '');
						createElement('details', '', 'details encounter '+id, '', 'col map '+id, '');
						createElement('summary', '', 'summary encounter '+id, '', 'details encounter '+id, 'Begegnungen');
						createElement('ul', '', 'ul encounter '+id, 'margin: 0px; list-style:none;', 'details encounter '+id, '');
						map = createMap('map '+id);
						maps.push(map);
						originalRoute = L.polyline(changeCoordinate(queryResultRoute[i].coordinates), {color: 'blue'});

						var overlayMaps = {
							'Route': originalRoute.addTo(map)
						};
						var basemaps;
						L.control.layers(basemaps, overlayMaps).addTo(map);
						map.fitBounds(originalRoute.getBounds());
					}

					if(queryResultEncountersUser[j].userId === queryResultEncountersUser[j].comparedTo){
						//create self-encounter
						if(!(document.getElementById('li encounter me '+id))){
							if(document.getElementById('li encounter others '+id)){
								var encounterMe = document.createElement('li')
								encounterMe.setAttribute('id', 'li encounter me '+id);
								var list = document.getElementById('ul encounter '+id);
								list.insertBefore(encounterMe, list.childNodes[0]);
							}
							else {
								createElement('li', '', 'li encounter me '+id, '', 'ul encounter '+id, '');
							}
							createElement('details', '', 'details encounter me '+id, '', 'li encounter me '+id, '');
							createElement('summary', '', 'summary encounter me '+id, '', 'details encounter me '+id, 'Begegnungen mit mir selbst');
							createElement('ul', '', 'ul encounter me '+id, 'margin: 0px; list-style:none;', 'details encounter me '+id, '');
						}
						drawEncountersOnMap(map, queryResultEncountersUser[j], queryResultRoute[i], encountersMeLayerGroup, 'me', id, j);
					}
					else {
						//create other User encounter
						if(!(document.getElementById('li encounter others '+id))){
							createElement('li', '', 'li encounter others '+id, '', 'ul encounter '+id, '');
							createElement('details', '', 'details encounter others '+id, '', 'li encounter others '+id, '');
							createElement('summary', '', 'summary encounter others '+id, '', 'details encounter others '+id, 'Begegnungen mit anderen Nutzern');
							createElement('ul', '', 'ul encounter others '+id, 'margin: 0px; list-style:none;', 'details encounter others '+id, '');
						}
						drawEncountersOnMap(map, queryResultEncountersUser[j], queryResultRoute[i], encountersOthersLayerGroup, 'others', id, j);

					}
				}
			}

			for(var k = 0; k < queryResultEncountersAnimal.length; k++){
				if(queryResultEncountersAnimal[k].comparedRoute === queryResultRoute[i]._id){
					//create div-boxes
					if(!(document.getElementById('row map '+id))){
						createElement('div', 'row', 'row map '+id, "border-style: none none solid none; border-width: 1px;", 'encounters', '');
						createElement('div', 'col-12', 'col map '+id, "margin-top: 20px; margin-bottom: 44.2px;", 'row map '+id, '');
						createElement('p', '', '', '', 'col map '+id, '<b>Route '+queryResultRoute[i].name+'</b>');
						createElement('div', '', 'map '+id, "height:350px; width: 100%;", 'col map '+id, '');
						createElement('details', '', 'details encounter '+id, '', 'col map '+id, '');
						createElement('summary', '', 'summary encounter '+id, '', 'details encounter '+id, 'Begegnungen');
						createElement('ul', '', 'ul encounter '+id, 'margin: 0px; list-style:none;', 'details encounter '+id, '');
						map = createMap('map '+id);
						maps.push(map);
						originalRoute = L.polyline(changeCoordinate(queryResultRoute[i].coordinates), {color: 'blue'});

						var overlayMaps = {
							'Route': originalRoute.addTo(map)
						};
						var basemaps;
						L.control.layers(basemaps, overlayMaps).addTo(map);
						map.fitBounds(originalRoute.getBounds());
					}

					//create animal encounter
					if(!(document.getElementById('li encounter animal '+id))){
						createElement('li', '', 'li encounter animal '+id, '', 'ul encounter '+id, '');
						createElement('details', '', 'details encounter animal '+id, '', 'li encounter animal '+id, '');
						createElement('summary', '', 'summary encounter animal '+id, '', 'details encounter animal '+id, 'Begegnungen mit Tieren');
						createElement('ul', '', 'ul encounter animal '+id, 'margin: 0px; list-style:none;', 'details encounter animal '+id, '');
					}
					drawEncountersOnMap(map, queryResultEncountersAnimal[k], queryResultRoute[i], encountersAnimalsLayerGroup, 'animal', id, k);


				}
			}


		}
	}
	else {
		var message = 'Es sind keine Begegnungen mit den angegebenen Parametern vorhanden'
		var alertContent = '<span class="oi oi-paperclip" aria-hidden="true"></span>' + message;
		createElement('div', 'col-12', 'message col', 'margin-top: 20px;', 'message', '');
		createElement('div', 'alert alert-warning', '', '', 'message col', alertContent);
	}
}


function createContent(queryResultEncounter, queryResultRoute, encounterTyp){
	var content
	if(encounterTyp === 'me'){
		content = 'Selbstbegegnung '+queryResultEncounter.index+' auf den Routen "'+queryResultEncounter.routeName+'" und "'+queryResultEncounter.comparedRouteName+'".  ';
		if(queryResultEncounter.comparedRoute === queryResultRoute._id){
			content = 'Selbstbegegnung '+queryResultEncounter.index+' auf den Routen "'+queryResultEncounter.comparedRouteName+'" und "'+queryResultEncounter.routeName+'".  ';
		}
	}
	else if(encounterTyp === 'others'){
		content = 'Begegnung '+queryResultEncounter.index+' mit dem Nutzer "'+queryResultEncounter.comparedToName+'" auf den Routen "'+queryResultEncounter.routeName+'" und "'+queryResultEncounter.comparedRouteName+'".  ';
		if(queryResultEncounter.comparedRoute === queryResultRoute._id){
			content = 'Begegnung '+queryResultEncounter.index+' mit dem Nutzer "'+queryResultEncounter.userName+'" auf den Routen "'+queryResultEncounter.comparedRouteName+'" und "'+queryResultEncounter.routeName+'".  ';
		}
	}
	else {
		content = 'Begegnung '+queryResultEncounter.index+' mit dem Tier "'+queryResultEncounter.animal+'" auf der Route "'+queryResultEncounter.comparedRouteName+'".  ';
	}
	return content;
}




function drawEncountersOnMap(map, queryResultEncounter, queryResultRoute, encountersLayerGroup, encounterTyp, index, index2){

	var content = createContent(queryResultEncounter, queryResultRoute, encounterTyp);
	var comparedRoute = queryResultEncounter.comparedRoute;
	if(queryResultRoute._id === comparedRoute){
		comparedRoute = queryResultEncounter.routeId;
	}
	var button = '<form action="/encounter/'+encounterTyp+'/'+queryResultRoute._id+'/'+comparedRoute+'/'+queryResultEncounter.index+'" method="GET"><button type="submit">Teilen</button></form>'
	var contentPopup = '<b>'+content+'</b><br>'+JSON.parse(queryResultEncounter.location_info)+'<br>'+button;

	if(queryResultEncounter.coordinates.length > 1){
		// polyline
		var polyline = L.polyline(changeCoordinate(queryResultEncounter.coordinates), {color: 'red'}).addTo(map);
		polyline.bindPopup(contentPopup, {maxWidth: 300});
		encountersLayerGroup.push(polyline);
		layers.push(polyline);
	}
	else {
		// circle
		var circle = L.circle([queryResultEncounter.coordinates[0][1], queryResultEncounter.coordinates[0][0]], {color: 'red'}).addTo(map);
		circle.bindPopup(contentPopup, {maxWidth: 300});
		encountersLayerGroup.push(circle);
		layers.push(circle);
	}
	createElement('li', '', 'li encounter '+encounterTyp+' '+index+' '+index2, '', 'ul encounter '+encounterTyp+' '+index, content);
	createElement('span', 'oi oi-zoom-in', 'span encounter '+encounterTyp+' '+index+' '+index2, 'cursor:pointer;', 'li encounter '+encounterTyp+' '+index+' '+index2, '');
	document.getElementById('span encounter '+encounterTyp+' '+index+' '+index2).setAttribute('onclick', 'zoomIn('+JSON.stringify(maps.length-1)+','+JSON.stringify(layers.length-1)+')');
}


function zoomIn(mapIndex, layerIndex){
	//bei Klick checkbox auf true setzen, damit auch etwas angezeigt wird
	var map = maps[mapIndex];
	var layer = layers[layerIndex];
	map.flyToBounds(layer.getBounds());
	layer.openPopup();
}


/**
* @desc swaps latitude and longitude and saves the result in a new array and returns it
* @param {array} coordinates array with the coordinates (of the route)
*	@return {array} coordinatesLatLng, array with the swaped coordinates of the route
*/
function changeCoordinate(coordinates){
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
