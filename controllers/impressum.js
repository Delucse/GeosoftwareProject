// jshint esversion: 6
// jshint node: true
"use strict";


/**
* @desc task 9 (project), Geosoft 1, SoSe 2019;
* application to render the imprint (dt.: Impressum) page
*/



/**
* @desc renders the imprint (dt.: Impressum) page
* @param {object} req request, containing information about the HTTP request
* @param {object} res response, to send back the desired HTTP response
*/
exports.getImpressum = (req, res) => {
  res.render('impressum', {
    title: 'Impressum'
    });
};
