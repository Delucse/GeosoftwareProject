// jshint browser: true
// jshint node: true
// jshint esversion: 6
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* apllication for changing the cursor
*/



/**
* @desc change the current style of the cursor and disables the submit-button
* @param {String} cursor name of the cursor
*/
function changeCursor(cursor){
  document.body.style.cursor = cursor;
  // "progress" - arrow and clock (so you can still click anything)
  // "wait" - just the clock

  // disables all submit-buttons
  for(var i = 0; document.getElementsByClassName('submitButton').length; i++){
    document.getElementsByClassName('submitButton')[i].disabled = true;
  }
}
