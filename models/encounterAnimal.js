// jshint esversion: 6
// jshint node: true
"use strict";

const mongoose = require('mongoose');

// schema for animal-user-encounter
const encounterAnimalSchema = mongoose.Schema({
  index: {
    type: Number,
    required: true
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  animal: {
    type: String,
    required: true
  },
  comparedRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  comparedRouteName: {
    type: String,
    required: true
  },
  comparedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comparedToName: {
    type: String,
    required: true
  },
  realEncounter: {
    type: Boolean,
    required: true
  },
  coordinates: {
    type: Array,
    required: true
  },
  midCoordinate: {
    type: Array,
    required: true
  },
  location_info: {
    type: String,
    required: true
  }
},
{
  versionKey: false
});

module.exports = mongoose.model('EncounterAnimal', encounterAnimalSchema);
