// jshint node: true
// jshint browser: true
// jshint jquery: true
// jshint esversion: 6
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application for filtering the encounters and routes
*/



/**
* @desc determines the current time and date and inserts it into the corresponding input fields
*/
function getCurrentTime(){
	var date = new Date();
	document.getElementById('datepicker').value = date.toLocaleDateString("fr-CA");
	document.getElementById('timepicker').value = date.toLocaleTimeString('de-De', {hour: '2-digit', minute:'2-digit'});
}


/**
* @desc filters the encounters of the current user
*/
function ajaxCallFilter(){
	var date = document.getElementById('datepicker').value;
	var time = document.getElementById('timepicker').value;
	if(date === '' || time === ''){
		// Microsoft Edge does not allow the date and time fields to be automatically filled
		// with values, so this must be handled separately.
		if(window.navigator.userAgent.indexOf("Edge") !== -1){
			window.alert('Bitte tragen Sie das Datum und die Uhrzeit ein.');
		}
		else {
			var ok = window.confirm('Bitte tragen Sie das Datum und die Uhrzeit ein.\n\nFür das aktuelle Datum bestätigen Sie bitte mit "OK".');
			if(ok){
				// calculate the current time and filters the encounters
				getCurrentTime();
				ajaxCallFilter();
			}
		}
	}
	else {
		// create an ISO String
		var dateISO = new Date(date+'T'+time+':00').toISOString();

		var user = [];
		var userInput = document.getElementsByClassName('user');
		for(var i = 0; i < userInput.length; i++){
			if(userInput[i].checked){
				user.push(userInput[i].value);
			}
		}

		var animal = [];
		var animalInput = document.getElementsByClassName('animal');
		for(var j = 0; j < animalInput.length; j++){
			if(animalInput[j].checked){
				animal.push(animalInput[j].value);
			}
		}

		var real;
		var realInput = document.getElementsByClassName('real');
		for(var k = 0; k < realInput.length; k++){
			if(realInput[k].checked){
				real = realInput[k].value;
			}
		}

		var type;
		var typeInput = document.getElementsByClassName('type');
		for(var l = 0; l < realInput.length; l++){
			if(typeInput[l].checked){
				type = typeInput[l].value;
			}
		}

		$.ajax({
			url: 'api/encounter/filter',
			type: 'POST',
			data: {
				real: JSON.stringify(real),
				user: JSON.stringify(user),
				animal: JSON.stringify(animal),
				type: JSON.stringify(type),
				date: dateISO,
				currentUserId: document.getElementsByClassName('currentUserId')[0].value
			}
		})
		.done (function( response) {
			// removes the selected element and its child elements
			$("#message").empty();
			$("#encounters").empty();
			if(typeof(response) === 'string'){
				var message;
				var alertContent;
				if(response === 'Error'){
					message = ' Es muss mindestens ein Nutzer oder eine Tierart als Parameter ausgewählt sein.';
					alertContent = '<span class="oi oi-warning" aria-hidden="true"></span>' + message;
					window.createElement('div', 'col-12', 'message col', 'margin-top: 20px;', 'message', '');
					window.createElement('div', 'alert alert-danger', '', '', 'message col', alertContent);
				}
				else if(response === 'Info'){
					message = ' Es liegen keine Routen mit den angegebenen Parametern in der Datenbank vor.';
					alertContent = '<span class="oi oi-paperclip" aria-hidden="true"></span>' + message;
					window.createElement('div', 'col-12', 'message col', 'margin-top: 20px;', 'message', '');
					window.createElement('div', 'alert alert-warning', '', '', 'message col', alertContent);
				}
			}
			else {
				window.drawEncounters(response[0], response[1], response[2]);
			}
		})
		.fail (function(xhr, status, errorThrown ) {
			console.log(errorThrown);
		});
	}
}



/**
* @desc checks the "checked" status of the checkbox and checks if the other checkboxes are also checked or not.
* @param {string} id specifies the checkbox
* @param {string} specialId specifies the "master"-checkbox
* @param {number} dataLength specifies the number of checkboxes
*/
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
* @param {number} dataLength specifies the number of checkboxes
* @param {string} specialId specifies the "master"-checkbox
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
