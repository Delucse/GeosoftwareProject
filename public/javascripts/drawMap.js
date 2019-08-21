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

/**
 * @desc checks the "checked" status of the checkbox specified by the id and displays the layer on the map if the "checked"-status is true and hide the layer if the "checked" status is false.
 * @param {string} id specifies the checkbox
 */
function allCheckedEncounter(dataLength, elements, input){
	var allChecked = true;
	for(var i = 0; i < dataLength; i++){
		if(elements[i].checked === false){
			allChecked = false;
		}
	}
	return allChecked;
}


function isChecked(id, specialId, dataLength){
	if(id !== specialId){
		if(document.getElementById(id).checked == true){
			if(allChecked(dataLength, specialId)){
				document.getElementById(specialId).checked = true;
			}
		}
		else if(document.getElementById(id).checked == false){
			document.getElementById(specialId).checked = false;
		}
	}
	else{
		// if the "checked"-status of the "master"-checkbox is true, then every checkbox must have the status true
		if(document.getElementById(specialId).checked == true){
			for(var i = 0; i < dataLength; i++){
				document.getElementById(specialId+" "+i).checked = true;
			}
		}
		// if the "checked"-status of the "master"-checkbox is false, then every checkbox must have the status false
		else if(document.getElementById(specialId).checked == false){
			for(var j = 0; j < dataLength; j++){
				document.getElementById(specialId+" "+j).checked = false;
			}
		}
	}
}

/**
 * @desc checks if all checkboxes have the setting "checked == true"
 * @return {boolean} allChecked true, if every checkbox is checked; false, if that's not the case
 */

function allChecked(dataLength, specialId){
	var allChecked = true;
	for(var i = 0; i < dataLength; i++){
		if(document.getElementById(specialId+' '+i).checked === false){
			allChecked = false;
		}
	}
	return allChecked;
}

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
						createElement('summary', '', 'summary encounter '+id, '', 'details encounter '+id, '');
						addTableWithCheckbox('summary encounter '+id, 'Begegnungen');
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
							createElement('summary', '', 'summary encounter me '+id, '', 'details encounter me '+id, '');
							addTableWithCheckbox('summary encounter me '+id, 'Begegnungen mit mir selbst');
							createElement('ul', '', 'ul encounter me '+id, 'margin: 0px; list-style:none;', 'details encounter me '+id, '');
						}
						drawEncountersOnMap(map, queryResultEncountersUser[j], queryResultRoute[i], encountersMeLayerGroup, 'me', id, j);
					}
					else {
						//create other User encounter
						if(!(document.getElementById('li encounter others '+id))){
							createElement('li', '', 'li encounter others '+id, '', 'ul encounter '+id, '');
							createElement('details', '', 'details encounter others '+id, '', 'li encounter others '+id, '');
							createElement('summary', '', 'summary encounter others '+id, '', 'details encounter others '+id, '');
							addTableWithCheckbox('summary encounter others '+id, 'Begegnungen mit anderen Nutzern');
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
						addTableWithCheckbox('summary encounter animal '+id, '');
						createElement('ul', '', 'ul encounter animal '+id, 'margin: 0px; list-style:none;', 'details encounter animal '+id, '');
					}
					drawEncountersOnMap(map, queryResultEncountersAnimal[k], queryResultRoute[i], encountersAnimalsLayerGroup, 'animal', id, k);


				}
			}


		}
	}
	else {
		var message = ' Es sind keine Begegnungen mit den angegebenen Parametern vorhanden.'
		var alertContent = '<span class="oi oi-paperclip" aria-hidden="true"></span>' + message;
		createElement('div', 'col-12', 'message col', 'margin-top: 20px;', 'message', '');
		createElement('div', 'alert alert-warning', '', '', 'message col', alertContent);
	}
}


function createContent(queryResultEncounter, queryResultRoute, encounterTyp){
	var content
	if(encounterTyp === 'me'){
		content = 'Selbstbegegnung '+' auf den Routen "'+queryResultEncounter.routeName+'" und "'+queryResultEncounter.comparedRouteName+'".  ';
		if(queryResultEncounter.comparedRoute === queryResultRoute._id){
			content = 'Selbstbegegnung '+' auf den Routen "'+queryResultEncounter.comparedRouteName+'" und "'+queryResultEncounter.routeName+'".  ';
		}
	}
	else if(encounterTyp === 'others'){
		console.log(queryResultEncounter);
		content = 'Begegnung '+' mit dem Nutzer "'+queryResultEncounter.comparedToName+'" auf den Routen "'+queryResultEncounter.routeName+'" und "'+queryResultEncounter.comparedRouteName+'".  ';
		if(queryResultEncounter.comparedRoute === queryResultRoute._id){
			content = 'Begegnung '+' mit dem Nutzer "'+queryResultEncounter.userName+'" auf den Routen "'+queryResultEncounter.comparedRouteName+'" und "'+queryResultEncounter.routeName+'".  ';
		}
	}
	else {
		content = 'Begegnung '+' mit dem Tier "'+queryResultEncounter.animal+'" auf der Route "'+queryResultEncounter.comparedRouteName+'".  ';
	}
	return content;
}

/**
 * checks whether the given checkbox was checked or not and adds/removes the layer
 * @param id id of the checkbox
 */
function isCheckedEncounters(id){
	var element = document.getElementById(id);
	var elements = document.getElementsByClassName(element.className);
	if (element.id.match(/summary encounter (me|others|animal)/)){
		if (element.checked){
			checkEncounters(element.id);
			if (allCheckedEncounter(elements.length , elements)){
				document.getElementById(element.id).checked=true;
				document.getElementById(element.id.replace(/(me |others |animal )/,'')).checked=true;
			}
		}
		else{
			document.getElementById(element.id).checked=false;
			document.getElementById(element.id.replace(/(me |others |animal )/,'')).checked=false;
			uncheckEncounters(element.id);
		}
	}
	else {
		if (element.checked){
			checkEncounters(element.id);
		}
		else{
			uncheckEncounters(element.id);
		}
	}
}

function uncheckEncounters(className){
	var elements = document.getElementsByClassName(className);
	for (var i=0;i< elements.length;i++){
		elements[i].checked=false;
		elements[i].onchange();
		if(elements[i].id.includes("encounter me") ||
			elements[i].id.includes("encounter others") ||
			elements[i].id.includes("encounter animals")){
			isCheckedEncounters(elements[i].id);
		}
	}
}

function checkEncounters(className){
	var elements = document.getElementsByClassName(className);
	for (var i=0;i< elements.length;i++){
		elements[i].checked=true;
		elements[i].onchange();
		if(elements[i].id.includes("encounter me") ||
			elements[i].id.includes("encounter others") ||
			elements[i].id.includes("encounter animals")){
			isCheckedEncounters(elements[i].id);
		}
	}
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
	//erstellen einer Tabelle um die checkboxen und den Inhalt vernünftig anzuzeigen
	createElement('table','','Table'+encounterTyp+' '+index+' '+index2,'','ul encounter '+encounterTyp+' '+index,'',);
	var table = document.getElementById('Table'+encounterTyp+' '+index+' '+index2);
	var row = table.insertRow(0);
	var cell1 = row.insertCell(0);
	var cell2 = row.insertCell(1);
	//erstellen und einbinden der checkbox
	var checkbox= document.createElement('input');
	checkbox.id='li encounter checkbox '+encounterTyp+' '+index+' '+index2;
	checkbox.type="checkbox";
	checkbox.checked=true;
	checkbox.setAttribute('class', 'checkbox summary encounter '+encounterTyp+' '+index);
	cell1.append(checkbox);

	document.getElementById('li encounter checkbox '+encounterTyp+' '+index+' '+index2)
		.setAttribute('onchange', 'isCheckboxChecked('+'\'li encounter checkbox ' +encounterTyp+' '+index+' '+index2 +'\',' +JSON.stringify(maps.length-1)+','+JSON.stringify(layers.length-1)+')');

	//einbinden
	createElement('li', '', 'li encounter '+encounterTyp+' '+index+' '+index2, '', 'ul encounter '+encounterTyp+' '+index, content);
	cell2.append(document.getElementById('li encounter '+encounterTyp+' '+index+' '+index2));
	createElement('span', 'oi oi-zoom-in', 'span encounter '+encounterTyp+' '+index+' '+index2, 'cursor:pointer;', 'li encounter '+encounterTyp+' '+index+' '+index2, '');
	document.getElementById('span encounter '+encounterTyp+' '+index+' '+index2).setAttribute('onclick', 'zoomIn('+JSON.stringify(maps.length-1)+','+JSON.stringify(layers.length-1)+')');
}


function isCheckboxChecked(id, mapIndex, layerIndex) {
	var element = document.getElementById(id);
	var map = maps[mapIndex];
	var layer = layers[layerIndex];


	if(element.checked){
		// anzeigen des Elements
		layer.addTo(map);
		// document.getElementById(that.className).checked=true;

		var elements = document.getElementsByClassName(element.className);
		if (allCheckedEncounter(elements.length , elements)){
			document.getElementById(element.className).checked=true;
			document.getElementById(element.className.replace(/(me |others |animal )/,'')).checked=true;
		}
		// }
	}
	else{
		layer.remove()

		// console.log(document.getElementById(that.className));

		document.getElementById(element.className).checked=false;
		document.getElementById(element.className.replace(/(me |others |animal )/,'')).checked=false;
	}
}

function zoomIn(mapIndex, layerIndex){
	//bei Klick checkbox auf true setzen, damit auch etwas angezeigt wird
	var map = maps[mapIndex];
	var layer = layers[layerIndex];
	map.flyToBounds(layer.getBounds());
	layer.openPopup();
}

/**
 * adds a table with a given context to an element with a given id
 * @param id
 * @param content
 */
function addTableWithCheckbox(id, content) {
	createElement('table','','Table'+id,'',id,'',);
	var table = document.getElementById('Table'+id);
	var row = table.insertRow(0);
	var cell1 = row.insertCell(0);
	var cell2 = row.insertCell(1);

	var checkbox= document.createElement('input');
	checkbox.id='checkbox '+id;
	checkbox.type="checkbox";
	checkbox.checked=true;
	cell1.append(checkbox);
	if(id.match(/(me|others|animals)/)){
		console.log(id);
		checkbox.className=checkbox.id.replace(/(me|others|animals)/, "");
	}
	else {}
	document.getElementById('checkbox '+id).setAttribute('onchange', 'isCheckedEncounters(id)');
	cell2.innerHTML=content;
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
