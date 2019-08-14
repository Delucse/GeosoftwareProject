// jshint esversion: 6
// jshint node: true
"use strict";

const mongoose = require('mongoose');

// schema for route
const routeSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['Aufnahme', 'Planung'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
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

module.exports = mongoose.model('Route', routeSchema);
