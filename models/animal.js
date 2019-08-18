// jshint esversion: 6
// jshint node: true
"use strict";

const mongoose = require('mongoose');

// schema for animal
const animalSchema = mongoose.Schema({

  individual_taxon_canonical_name: {
    type: String,
    required: true
  },
  study_id: {
    type: Number,
    required: true
  },
  individual_local_identifier: {
    type: String,
    required: true
  },
  sensor_type: {
    type: String,
    required: true
  },
  coordinates: {
    type: Array,
    required: true
  }
},
{
  versionKey: 'updates'
});

module.exports = mongoose.model('Animal', animalSchema);
