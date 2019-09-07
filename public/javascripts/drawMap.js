// jshint node: true
// jshint browser: true
// jshint jquery: true
// jshint esversion: 6
"use strict";


/**
 * @desc task 9 (project), Geosoft 1, SoSe 2019;
 * application for showing all encounters belonging to the current user
 */



/**
 * @global layers, an array, which stores all encounters of the current user as layer
 */
var layers = [];

/**
 * @global maps, an array, which stores all maps
 */
var maps = [];



/**
 * @desc creates an HTML-element and appends it to another HTML-element
 * @param {String} elementName specifies HTML-element
 * @param {String} className specifies the class of the HTML-element
 * @param {String} id specifies the id of the the HTML-element
 * @param {String} style specifies the style of the HTML-element
 * @param {String} parentElementId specifies the id of the parent-element, to get the parent-element to append the "child"
 * @param {String} content specifies the content of the HTML-element
 */
function createElement(elementName, className, id, style, parentElementId, content){
	var element = document.createElement(elementName);
	element.setAttribute("class", className);
	element.setAttribute("id", id);
	element.style = style;
	element.innerHTML = content;
	document.getElementById(parentElementId).appendChild(element);
}


/**
 * @desc create a map for the encounters which belongs to the route
 * @param {string} id the id of the route
 * @param {object} route transferred route
 * @param {object} map
 * @return {object} map
 */
function createMapEncounters(id, route, map){
	if(!(document.getElementById('row map '+id))){
		createElement('div', 'row mapEncounter', 'row map '+id, "border-style: none none solid none; border-width: 1px;", 'encounters', '');
		createElement('div', 'col-12', 'col map '+id, "margin-top: 20px; margin-bottom: 44.2px;", 'row map '+id, '');
		createElement('p', '', '', '', 'col map '+id, '<b>Route '+route.name+'</b>');
		createElement('div', '', 'map '+id, "height:350px; width: 100%;", 'col map '+id, '');
		createElement('details', '', 'details encounter '+id, '', 'col map '+id, '');
		createElement('summary', '', 'summary encounter '+id, '', 'details encounter '+id, '');
		createCheckbox('summary encounter '+id, 'checkbox summary encounter '+id, '', 'isCheckedEncounters(id)', 'Begegnungen');
		createElement('ul', '', 'ul encounter '+id, 'margin: 0px; list-style:none;', 'details encounter '+id, '');
		map = window.createMap('map '+id);
		maps.push(map);
		var originalRoute = window.L.polyline(window.changeCoordinate(route.coordinates), {color: 'blue'});

		var overlayMaps = {
			'Route': originalRoute.addTo(map)
		};
		var basemaps;
		window.L.control.layers(basemaps, overlayMaps).addTo(map);
		map.fitBounds(originalRoute.getBounds());
	}
	return map;
}


/**
 * @desc creates the details and summary HTML-elements and the belonging checkbox for an encounter
 * @param {String} id the id of the route
 * @param {String} encounterTyp specifies the encounter (self-encounter, user-user encounter, user-animal encounter)
 * @param {String} content innerHTML of the summary-HTML-element
 */
function createDetailsEncounter(id, encounterTyp, content){
	createElement('details', 'details_encounter_'+id, 'details encounter '+encounterTyp+' '+id, '', 'li encounter '+encounterTyp+' '+id, '');
	createElement('summary', '', 'summary encounter '+encounterTyp+' '+id, '', 'details encounter '+encounterTyp+' '+id, '');
	createCheckbox('summary encounter '+encounterTyp+' '+id, 'checkbox summary encounter '+encounterTyp+' '+id, 'checkbox summary encounter '+id, 'isCheckedEncounters(id)', content);
	createElement('ul', '', 'ul encounter '+encounterTyp+' '+id, 'margin: 0px; list-style:none;', 'details encounter '+encounterTyp+' '+id, '');
}


/**
 * @desc generate the content for popUp of the leaflet-layer
 * @param {object} queryResultEncounter transferred encounter
 * @param {object} queryResultRoute transferred route
 * @param {String} encounterTyp specifies the encounter (self-encounter, user-user encounter, user-animal encounter)
 * @return {String} content
 */
function createContent(queryResultEncounter, queryResultRoute, encounterTyp){
	var content;
	if(encounterTyp === 'me'){
		content = 'Selbstbegegnung auf den Routen "'+queryResultEncounter.routeName+'" und "'+queryResultEncounter.comparedRouteName+'"';
		if(queryResultEncounter.comparedRoute === queryResultRoute._id){
			content = 'Selbstbegegnung auf den Routen "'+queryResultEncounter.comparedRouteName+'" und "'+queryResultEncounter.routeName+'"';
		}
	}
	else if(encounterTyp === 'others'){
		content = 'Begegnung mit dem Nutzer "'+queryResultEncounter.comparedToName+'" auf den Routen "'+queryResultEncounter.routeName+'" und "'+queryResultEncounter.comparedRouteName+'"';
		if(queryResultEncounter.comparedRoute === queryResultRoute._id){
			content = 'Begegnung mit dem Nutzer "'+queryResultEncounter.userName+'" auf den Routen "'+queryResultEncounter.comparedRouteName+'" und "'+queryResultEncounter.routeName+'"';
		}
	}
	else {
		content = 'Begegnung mit dem Tier "'+queryResultEncounter.animal+'" auf der Route "'+queryResultEncounter.comparedRouteName+'"';
	}
	return content;
}


/**
 * @desc retrieves weather data from OpenWeatherMap
 * @param {obejct} queryResultEncounter transferred encounter
 * @param {object} queryResultRoute transferred route
 * @param {String} encounterTyp specifies the encounter (self-encounter, user-user encounter, user-animal encounter)
 * @param {String} id the id of the route
 * @param {number} index specified the index of the encounter of the specified route
 * @param {boolean} specificEncounter describes if it is a single encounter or not
 */
function ajaxOpenWeather(queryResultEncounter, queryResultRoute, encounterTyp, id, index, specificEncounter){
	$.ajax({
		url: 'https:api.openweathermap.org/data/2.5/weather?lat='+queryResultEncounter.midCoordinate[1]+'&lon='+queryResultEncounter.midCoordinate[0]+'&units=metric&appid='+window.token.OPENWEATHERMAP_TOKEN,
		type: 'GET',
	})
		.done (function(response) {
			// parse + use data here
			var openWeather = response.name+', '+response.main.temp+'°C, <img src="http://openweathermap.org/img/w/'+response.weather[0].icon+'.png" title="'+response.weather[0].description+'">';
			createInformation(openWeather, queryResultRoute, queryResultEncounter, encounterTyp, id, index, specificEncounter);
		})
		.fail (function(xhr, status, errorThrown ) {
			JL().warn("An error occurred with the OpenWeatherMap API: " + errorThrown);
			var openWeather = 'Im Moment stehen keine Wetterdaten zur Verfügung.';
			createInformation(openWeather, queryResultRoute, queryResultEncounter, encounterTyp, id, index, specificEncounter);
		});
}


/**
 * @desc generates the content that is displayed for each encounter
 * @param {String} weather weather data from OpenWeatherMap
 * @param {obejct} queryResultEncounter transferred encounter
 * @param {object} queryResultRoute transferred route
 * @param {String} encounterTyp specifies the encounter (self-encounter, user-user encounter, user-animal encounter)
 * @param {String} id the id of the route
 * @param {number} index specified the index of the encounter of the specified route
 * @param {boolean} specificEncounter describes if it is a single encounter or not
 */
function createInformation(weather, queryResultRoute, queryResultEncounter, encounterTyp, id, index, specificEncounter){

	// checks which part from encounter belongs to the current route (original or compared Route?)
	var comparedRoute = queryResultEncounter.comparedRoute;
	var originalRoute = queryResultEncounter.routeId;
	var originalUser = queryResultEncounter.userName;
	var realEncounter = queryResultEncounter.realEncounter;
	var changedValue = 'original';
	if(queryResultRoute._id === comparedRoute){
		comparedRoute = queryResultEncounter.routeId;
		originalRoute = queryResultEncounter.comparedRoute;
		originalUser = queryResultEncounter.comparedToName;
		realEncounter = queryResultEncounter.realEncounterCompared;
		changedValue = 'compared';
	}
	var contentLocation = '<b>ortsbezogene Informationen:</b><br>'+queryResultEncounter.location_info + '<br>';
	if(queryResultEncounter.location_info !== 'keine ortsbezogenen Informationen abrufbar'){
		contentLocation = '<b>ortsbezogene Informationen:</b><br>'+JSON.parse(queryResultEncounter.location_info);
	}

	if(specificEncounter){
		// something else
		if(realEncounter){
			contentLocation += '<br><b>Die Begegnung ist von Nutzer "'+originalUser+'" als tätsächliche Begegnung deklariert worden.</b>';
		}
		else {
			contentLocation += '<br><b>Die Begegnung ist von Nutzer "'+originalUser+'" nicht als tätsächliche Begegnung deklariert worden.</b>';
		}
	}
	else {
		var share = '<a href="/encounter/'+encounterTyp+'/'+queryResultRoute._id+'/'+queryResultEncounter._id+'" title="Link zur ausgewählten Begegnung" target="_blank"><button style="margin-top:10px; margin-bottom:25px;">Begegnung teilen</button></a>';
		var changeStatus = '<input id="cb '+queryResultEncounter._id+originalRoute+'" type="checkbox"/> tatsächliche Begegnung? </label><input id="id '+queryResultEncounter._id+originalRoute+'" hidden value="'+queryResultEncounter._id+'"/><input id="originalRoute '+queryResultEncounter._id+originalRoute+'" hidden value="'+originalRoute+'"/><input id="comparedRoute '+queryResultEncounter._id+originalRoute+'" hidden value="'+comparedRoute+'"/><input id="typ '+queryResultEncounter._id+originalRoute+'"hidden value="'+encounterTyp+'"/><input id="value '+queryResultEncounter._id+originalRoute+'"hidden value="'+changedValue+'"/><button onclick="ajaxCallUpdate(\''+queryResultEncounter._id+originalRoute+'\')" style="margin-top:10px;">Status ändern</button>';
		contentLocation += changeStatus+'<br>'+share+'<br>';
		//
	}
	var contentDetails = '<b>aktuelles Wetter:</b><br>'+weather + '<br>'+contentLocation;
	createElement('li', '', 'li encounter '+encounterTyp+' '+id+' '+index+index, 'list-style:none', 'ul encounter '+encounterTyp+' '+id+' '+index, contentDetails);
	var checkbox = document.getElementById('cb '+queryResultEncounter._id+originalRoute);
	if(checkbox){
		checkbox.checked = realEncounter;
	}
}


/**
 * @desc creates the layer of the encounter and bind a popUp
 * @param {object} map
 * @param {obejct} queryResultEncounter transferred encounter
 * @param {object} queryResultRoute transferred route
 * @param {String} encounterTyp specifies the encounter (self-encounter, user-user encounter, user-animal encounter)
 * @param {String} id the id of the route
 * @param {number} index specified the index of the encounter of the specified route
 */
function drawEncountersOnMap(map, queryResultEncounter, queryResultRoute, encounterTyp, id, index){
	var content = createContent(queryResultEncounter, queryResultRoute, encounterTyp);
	var comparedRoute = queryResultEncounter.comparedRoute;
	if(queryResultRoute._id === comparedRoute){
		comparedRoute = queryResultEncounter.routeId;
	}

	var contentPopup = '<b>'+content+'</b><br><a onclick="goTofurtherInformation(\'details encounter '+encounterTyp+' '+id+' '+index+'\'); return false;" href="" title="weitere Informationen zur ausgewählten Begegnung">weitere Informationen</a>';
	if(queryResultEncounter.coordinates.length > 1){
		// polyline
		var polyline = window.L.polyline(window.changeCoordinate(queryResultEncounter.coordinates), {color: 'red'}).addTo(map);
		polyline.bindPopup(contentPopup, {maxWidth: 300});
		layers.push(polyline);
	}
	else {
		// circle
		var circle = window.L.circle([queryResultEncounter.coordinates[0][1], queryResultEncounter.coordinates[0][0]], {color: 'red'}).addTo(map);
		circle.bindPopup(contentPopup, {maxWidth: 300});
		layers.push(circle);
	}
	createElement('li', '', 'li encounter '+encounterTyp+' '+id+' '+index, '', 'ul encounter '+encounterTyp+' '+id, '');
	createElement('details', 'details_encounter_specific_'+id, 'details encounter '+encounterTyp+' '+id+' '+index, '', 'li encounter '+encounterTyp+' '+id+' '+index, '');
	createElement('summary', '', 'summary encounter '+encounterTyp+' '+id+' '+index, '', 'details encounter '+encounterTyp+' '+id+' '+index, '');

	createCheckbox('summary encounter '+encounterTyp+' '+id+' '+index, 'li encounter checkbox '+encounterTyp+' '+id+' '+index, 'checkbox summary encounter '+encounterTyp+' '+id, 'isCheckboxChecked('+'\'li encounter checkbox ' +encounterTyp+' '+id+' '+index +'\',' +JSON.stringify(maps.length-1)+','+JSON.stringify(layers.length-1)+')', content);
	createElement('span', 'oi oi-zoom-in', 'span encounter '+encounterTyp+' '+id+' '+index, 'cursor:pointer; margin-left: 5px;', 'summary encounter '+encounterTyp+' '+id+' '+index, '');
	document.getElementById('span encounter '+encounterTyp+' '+id+' '+index).setAttribute('onclick', 'zoomIn('+JSON.stringify(maps.length-1)+','+JSON.stringify(layers.length-1)+','+JSON.stringify('li encounter checkbox '+encounterTyp+' '+id+' '+index)+')');

	createElement('ul', '', 'ul encounter '+encounterTyp+' '+id+' '+index, '', 'details encounter '+encounterTyp+' '+id+' '+index, '');
}


/**
 * @desc checks what kind of encounter it is and displays it together with information
 * @param {object} queryResultEncountersUser all user-encounters which belongs to the current user
 * @param {object} queryResultEncountersAnimal all user-animal-encounters which belongs to the current user
 * @param {object} queryResultRoute all routes which belongs to the current user
 * @param {boolean} specificEncounter describes if it is a single encounter or not
 */
function drawEncounters(queryResultEncountersUser, queryResultEncountersAnimal, queryResultRoute, specificEncounter){

	var encounterCount = queryResultEncountersUser.length + queryResultEncountersAnimal.length;
	var message;
	var alertContent;
	if( encounterCount > 0 && encounterCount + queryResultRoute.length > 1){
		var foundRouteAndEncounter = false;
		for(var i = 0; i < queryResultRoute.length; i++){
			var map;
			var id = queryResultRoute[i]._id;
			for(var j = 0; j < queryResultEncountersUser.length; j++){
				if(queryResultEncountersUser[j].comparedRoute === queryResultRoute[i]._id || queryResultEncountersUser[j].routeId === queryResultRoute[i]._id){
					//create map
					map = createMapEncounters(id, queryResultRoute[i], map);

					if(queryResultEncountersUser[j].userId === queryResultEncountersUser[j].comparedTo){
						//create self-encounter
						if(!(document.getElementById('li encounter me '+id))){
							// keep order: 1st: self-encounter, 2nd user-encounter
							if(document.getElementById('li encounter others '+id)){
								var encounterMe = document.createElement('li');
								encounterMe.setAttribute('id', 'li encounter me '+id);
								var list = document.getElementById('ul encounter '+id);
								list.insertBefore(encounterMe, list.childNodes[0]);
							}
							else {
								createElement('li', '', 'li encounter me '+id, '', 'ul encounter '+id, '');
							}
							createDetailsEncounter(id, 'me', 'Begegnungen mit mir selbst');
							// createElement('details', 'details_encounter_'+id, 'details encounter me '+id, '', 'li encounter me '+id, '');
							// createElement('summary', '', 'summary encounter me '+id, '', 'details encounter me '+id, '');
							// createCheckbox('summary encounter me '+id, 'checkbox summary encounter me '+id, 'checkbox summary encounter '+id, 'isCheckedEncounters(id)', 'Begegnungen mit mir selbst');
							// createElement('ul', '', 'ul encounter me '+id, 'margin: 0px; list-style:none;', 'details encounter me '+id, '');
						}
						drawEncountersOnMap(map, queryResultEncountersUser[j], queryResultRoute[i], 'me', id, j);
						ajaxOpenWeather(queryResultEncountersUser[j], queryResultRoute[i], 'me', id, j, specificEncounter);
						foundRouteAndEncounter = true;
					}
					else {
						//create other user encounter
						if(!(document.getElementById('li encounter others '+id))){
							createElement('li', '', 'li encounter others '+id, '', 'ul encounter '+id, '');
							createDetailsEncounter(id, 'others', 'Begegnungen mit anderen Nutzern');
							// createElement('details', 'details_encounter_'+id, 'details encounter others '+id, '', 'li encounter others '+id, '');
							// createElement('summary', '', 'summary encounter others '+id, '', 'details encounter others '+id, '');
							// createCheckbox('summary encounter others '+id, 'checkbox summary encounter others '+id, 'checkbox summary encounter '+id, 'isCheckedEncounters(id)', 'Begegnungen mit anderen Nutzern');
							// createElement('ul', '', 'ul encounter others '+id, 'margin: 0px; list-style:none;', 'details encounter others '+id, '');
						}
						drawEncountersOnMap(map, queryResultEncountersUser[j], queryResultRoute[i], 'others', id, j);
						ajaxOpenWeather(queryResultEncountersUser[j], queryResultRoute[i], 'others', id, j, specificEncounter);
						foundRouteAndEncounter = true;
					}
				}
			}

			for(var k = 0; k < queryResultEncountersAnimal.length; k++){
				if(queryResultEncountersAnimal[k].comparedRoute === queryResultRoute[i]._id){
					//create map
					map = createMapEncounters(id, queryResultRoute[i], map);

					//create animal encounter
					if(!(document.getElementById('li encounter animal '+id))){
						createElement('li', '', 'li encounter animal '+id, '', 'ul encounter '+id, '');
						createDetailsEncounter(id, 'animal', 'Begegnungen mit Tieren');
						// createElement('details', 'details_encounter_'+id, 'details encounter animal '+id, '', 'li encounter animal '+id, '');
						// createElement('summary', '', 'summary encounter animal '+id, '', 'details encounter animal '+id, '');
						// createCheckbox('summary encounter animal '+id, 'checkbox summary encounter animal '+id, 'checkbox summary encounter '+id, 'isCheckedEncounters(id)', 'Begegnungen mit Tieren');
						// createElement('ul', '', 'ul encounter animal '+id, 'margin: 0px; list-style:none;', 'details encounter animal '+id, '');
					}
					drawEncountersOnMap(map, queryResultEncountersAnimal[k], queryResultRoute[i], 'animal', id, k);
					ajaxOpenWeather(queryResultEncountersAnimal[k], queryResultRoute[i], 'animal', id, k, specificEncounter);
					foundRouteAndEncounter = true;
				}
			}
		}
		if(!foundRouteAndEncounter){
			message = ' Es sind keine Begegnungen mit den angegebenen Parametern vorhanden.';
			alertContent = '<span class="oi oi-paperclip" aria-hidden="true"></span>' + message;
			createElement('div', 'col-12', 'message col', 'margin-top: 20px;', 'message', '');
			createElement('div', 'alert alert-warning', '', '', 'message col', alertContent);
		}
		else {
			// alter the border of the last Map-Div
			var lastMapEncounter = document.getElementsByClassName('mapEncounter');
			lastMapEncounter[lastMapEncounter.length-1].style="border-style: none";
		}
	}
	else {
		message = ' Es sind keine Begegnungen mit den angegebenen Parametern vorhanden.';
		if(specificEncounter){
			message = ' Die aufgerufene Begegnung existiert nicht (mehr).';
		}
		alertContent = '<span class="oi oi-paperclip" aria-hidden="true"></span>' + message;
		createElement('div', 'col-12', 'message col', 'margin-top: 20px;', 'message', '');
		createElement('div', 'alert alert-warning', '', '', 'message col', alertContent);
	}
}


/**
 * @desc scrolls to the specified HTML element and shows the information
 * @param {string} id id of the HTML element
 */
function goTofurtherInformation(id){
	var details1 = document.getElementById(id);
	//closes all details1-elements
	var allDetails1 = document.getElementsByClassName(details1.className);
	for(var i = 0; i < allDetails1.length; i++){
		allDetails1[i].open = false;
	}
	details1.open = true;

	var regEx = /details encounter [^ ]* .{24}/;
	var details2Id = regEx.exec(details1.id);
	var details2 = document.getElementById(details2Id);
	//closes all details2-elements
	var allDetails2 = document.getElementsByClassName(details2.className);
	for(var j = 0; j < allDetails2.length; j++){
		allDetails2[j].open = false;
	}
	details2.open = true;

	var details3 = document.getElementById(details2.id.replace(/(me |others |animal )/,''));
	details3.open = true;

	details1.scrollIntoView({
		behavior: "smooth",
		block:    "start",
	});
}


/**
 * @desc zooms on an encounter
 * @param {number} mapIndex specifies the map
 * @param {number} layerIndex specifies the layer
 * @param {String} id specifies the checkbox
 */
function zoomIn(mapIndex, layerIndex, id){
	// checked to true, so that it is guaranteed that the layer is displayed
	var checkbox = document.getElementById(id);
	checkbox.checked = true;
	checkbox.onchange();

	var map = maps[mapIndex];
	var layer = layers[layerIndex];
	map.flyToBounds(layer.getBounds());
	layer.openPopup();
}


/**
 * @desc create a checkbox for an encounter
 * @param {String} parentId specifies the id of the parent-element, to get the parent-element to append the "child"
 * @param {String} id specifies the checkbox
 * @param {String} className specifies the class of the checkbox
 * @param {String} functionname specifies function of the checkbox, if it is changed
 * @param {String} content specifies the content of the label of the checkbox
 */
function createCheckbox(parentId, id, className, functionname, content){
	var checkbox= document.createElement('input');
	checkbox.id=id;
	checkbox.type="checkbox";
	checkbox.checked=true;
	checkbox.className=className;
	checkbox.setAttribute('onchange', functionname);
	document.getElementById(parentId).append(checkbox);

	var label = document.createElement("Label");
	label.setAttribute("for",id);
	label.style.margin = '0px 0px 0px 5px';
	label.innerHTML = content;
	document.getElementById(parentId).appendChild(label);
}


/**
 * @desc checks if all encounter-checkboxes have the setting "checked === true"
 * @param {object} elements, input-elements with type "checkbox"
 * @return {boolean} allChecked: true, if all checkboxes are checked
 */
function allCheckedEncounter(elements){
	var allChecked = true;
	for(var i = 0; i < elements.length; i++){
		if(elements[i].checked === false){
			allChecked = false;
		}
	}
	return allChecked;
}


/**
 * checks whether the given checkbox was checked or not
 * @param {String} id id of the checkbox
 */
function isCheckedEncounters(id){
	var element = document.getElementById(id);
	if (element.checked){
		checkEncounters(element.id);
	}
	else{
		uncheckEncounters(element.id);
	}
}


/**
 * @desc checks if the checkbox from an encounter is checked and shows or hides the corresponding layer accordingly
 * @param {String} id specifies the checkbox
 * @param {number} mapIndex specifies the map
 * @param {number} layerIndex specifies the layer
 */
function isCheckboxChecked(id, mapIndex, layerIndex) {
	var element = document.getElementById(id);
	var map = maps[mapIndex];
	var layer = layers[layerIndex];

	if(element.checked){
		// show layer
		layer.addTo(map);

		var elements = document.getElementsByClassName(element.className);
		if (allCheckedEncounter(elements)){
			document.getElementById(element.className).checked = true;

			var allCheckboxes = document.getElementsByClassName(document.getElementById(element.className).className);
			if(allCheckedEncounter(allCheckboxes)){
				document.getElementById(element.className.replace(/(me |others |animal )/,'')).checked = true;
			}
		}
	}
	else{
		// hide layer
		layer.remove();

		document.getElementById(element.className).checked=false;
		document.getElementById(element.className.replace(/(me |others |animal )/,'')).checked=false;
	}
}


/**
 * unchecked all specified checkboxes
 * @param {String} className specifies all checkboxes with class "className"
 */
function uncheckEncounters(className){
	var elements = document.getElementsByClassName(className);
	for (var i=0;i< elements.length;i++){
		elements[i].checked=false;
		elements[i].onchange();
		if(elements[i].id.match(/encounter (me|others|animal)/)){
			isCheckedEncounters(elements[i].id);
		}
	}
}


/**
 * checked all specified checkboxes
 * @param {String} className specifies all checkboxes with class "className"
 */
function checkEncounters(className){
	var elements = document.getElementsByClassName(className);
	for (var i=0;i< elements.length;i++){
		elements[i].checked=true;
		elements[i].onchange();
		if(elements[i].id.match(/encounter (me|others|animal)/)){
			isCheckedEncounters(elements[i].id);
		}
	}
}
