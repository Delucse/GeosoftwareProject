// jshint esversion: 6
// jshint node: true
"use strict";

const mongoose = require('mongoose');

// schema for user
const userSchema = mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
},
{
  versionKey: false
});

module.exports = mongoose.model('User', userSchema);
