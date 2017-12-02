var mongoose = require('mongoose');
var access_levels = require('../system/access_levels.js');

var eventSchema = mongoose.Schema(
  {
    event_name:
    {
      type:String,
      required:true
    },
    event_description:
    {
      type:String,
      required:true
    },
    event_price:
    {
      type:Number,
      required:true
    },
    event_date:
    {
      type:Number,
      required:true
    },
    event_venue:
    {
      type:String,
      required:true
    },
    event_location:
    {
      type:String,
      required:true
    },
    extra:
    {
      type:String,
      required:false
    }
  });

  var Events = mongoose.model('events', eventSchema);

  //Required Access Level for Write permissions.
  module.exports.WRITE_LVL = access_levels.ADMIN;
  module.exports.READ_LVL = access_levels.ALL;

  module.exports.add = function(evt, callback)
  {
    Events.create(evt, callback);
  }

  module.exports.get = function(evt_id, callback)
  {
    var query = {_id:evt_id};
    Events.find(query, callback);
  }

  module.exports.getAll = function(callback)
  {
    Events.find({}, callback);
  }

  module.exports.update = function(evt_id, evt, callback)
  {
    var query = {_id: evt_id};
    Events.findOneAndUpdate(query, evt, {}, callback);
  }

  module.exports.isValid = function(evt)
  {
    if(isNullOrEmpty(evt))
      return false;
    if(isNullOrEmpty(evt.event_name))
      return false;
    if(isNullOrEmpty(evt.event_description))
      return false;
    if(isNullOrEmpty(evt.event_price))
      return false;
    if(isNullOrEmpty(evt.event_date))
      return false;
    if(isNullOrEmpty(evt.event_venue))
      return false;
    if(isNullOrEmpty(evt.event_location))
      return false;
    if(isNullOrEmpty(evt.extra))
      return false;

      return true;
  }

  function isNullOrEmpty(obj)
  {
    if(obj==null || obj==undefined)
      return true;
    if(obj.length<=0)
      return true;

    return false;
  }
