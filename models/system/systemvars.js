const mongoose = require('mongoose');
var access_levels = require('../system/access_levels.js');

const counterSchema = mongoose.Schema(
{
  counter_name:{
    type:String,
    required:true
  },
  count:{
    type:Number,
    required:false,
    default:0
  }
});

const Counter = module.exports = mongoose.model('counters',counterSchema);

module.exports.ACCESS_MODE = access_levels.NORMAL;//Required access level to execute these methods

module.exports.get = function(name, callback)
{
  var query = {counter_name:name};
  Counter.findOne(query, callback);
};

module.exports.getAll = function(callback)
{
  Counter.find({}, callback);
};

module.exports.add = function(counter, callback)
{
  console.log('attempting to remove old counter record...');
  //remove any existing codes for that user
  Counter.findOneAndRemove({counter_name:counter.counter_name}, {}, function(err, count)
  {
    if(err)
    {
      console.log(err);
      return;
    }
    //successfully deleted old record if it existed.
    console.log('successfully deleted old counter, creating new counter record...');
    Counter.create(counter, function(err)
    {
      if(err)
      {
        callback(err);
        return;
      }
      console.log('successfully created counter');
      //successfully created counter
      callback();
    });
  });
};

module.exports.update = function(counter_name, counter, callback)
{
  var query = {counter_name: counter_name};
  console.log('attempting to update counter[%s].', counter_name);
  Counter.findOneAndUpdate(query, counter, {}, callback);
}

module.exports.isValid = function(counter)
{
  console.log('validating counter:\n%s', JSON.stringify(counter));

  if(isNullOrEmpty(counter))
    return false;
  //attribute validation
  if(isNullOrEmpty(counter.counter_name))
    return false;
  /*if(isNullOrEmpty(counter.count))
    return false;*/

  console.log('valid counter.');

    return true;
}

isNullOrEmpty = function(obj)
{
  if(obj==null)
  {
    return true;
  }
  if(obj.length<=0)
  {
    return true;
  }
  return false;
}
