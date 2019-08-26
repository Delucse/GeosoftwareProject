// jshint node: true
// jshint browser: true
// jshint jquery: true
// jshint esversion: 6
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application for updating the status of an encounter
*/



/**
* @desc updates the status of the encounter and gives feedback
* @param {String} id specifies the encounter which will be updated
*/
function ajaxCallUpdate(id){
	var formData = {
		real: document.getElementById('cb '+id).checked,
		id: document.getElementById('id '+id).value,
		originalRoute: document.getElementById('originalRoute '+id).value,
		comparedRoute: document.getElementById('comparedRoute '+id).value,
		encounterTyp: document.getElementById('typ '+id).value,
		changedValue: document.getElementById('value '+id).value,
	};

	$.ajax({
		url: 'api/encounter/update',
		type: 'POST',
		data: formData
	})
	.done (function( response) {
		// parse + use data here
		var real;
		if(response.real === 'true'){
			window.alert('Die berechnete Begegnung wurde erfolgreich als tatsächliche Begegnung in der Datenbank abgespeichert.');
			real = true;
		}
		else if(response.real === 'false'){
			window.alert('Die berechnete Begegnung wurde erfolgreich als theorethische (nicht-tatsächliche) Begegnung in der Datenbank abgespeichert.');
			real = false;
		}

		// change the checked status of the current checkbox
		document.getElementById('cb '+response.encounterId+response.originalRoute).checked = real;
		// if it is a self-encounter, the checkboxes from the two involved encounters have to be checked or not
		if(response.comparedRoute){
			document.getElementById('cb '+response.encounterId+response.comparedRoute).checked = real;
		}

	})
	.fail (function(xhr, status, errorThrown ) {
		console.log(errorThrown);
	});
}
