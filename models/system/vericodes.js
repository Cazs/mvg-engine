const mongoose = require('mongoose');
const crypto = require('crypto');
var access_levels = require('../system/access_levels.js');
var PWD_MIN_LEN = new Number(8);

module.exports.VALIDATION_MODE_STRICT = "strict";
module.exports.VALIDATION_MODE_PASSIVE = "passive";

const vericodeSchema = mongoose.Schema(
  {
    usr:{
      type:String,
      required:true
    },
    code:{
      type:String,
      required:false
    },
    date_issued:{
      type:Number,
      required:false
    }
  });

const Vericodes = module.exports = mongoose.model('vericodes',vericodeSchema);
//module.exports.PWD_MIN_LEN = 8;

module.exports.ACCESS_MODE = access_levels.NORMAL;//Required access level to execute these methods
module.exports.VALIDATION_MODE = this.VALIDATION_MODE_STRICT;

module.exports.get = function(id,callback)
{
  var query = {usr:id};
  Vericodes.findOne(query, callback);
};

module.exports.getAll = function(callback)
{
  Vericodes.find({}, callback);
};

module.exports.add = function(vcode, callback)
{
  var code = generateCode(16);
  console.log('attempting to remove old vericode...');
  //sha1 hash the generated code
  var vericode = {
                    usr:vcode.usr,
                    code:crypto.createHash('sha1').update(code).digest('hex'),
                    date_issued:(new Date()/1000)
                  };

  console.log('new vericode for "%s": %s',vericode.usr, code);
  //remove any existing codes for that user
  Vericodes.findOneAndRemove({usr:vcode.usr}, {}, function(err, code)
  {
    if(err)
    {
      console.log(err);
      return;
    }
    //successfully deleted old vericode - if it existed.
    console.log('successfully deleted old vericode, creating new vericode...');
    Vericodes.create(vericode, function(err)
    {
      if(err)
      {
        callback(err);
        return;
      }
      console.log('successfully created vericode');
      //successfully created vericode, send email with code
      callback();
    });
  });
  /*Vericodes.findOneAndRemove({usr:vcode.usr},{});
  console.log(vericode);
  */
};

module.exports.update = function(vericode_id,vericode,callback)
{
  var query = {_id:vericode_id};
  //sha1 hash the generated code
  vericode.code = crypto.createHash('sha1').update(generateCode(16)).digest('hex');
  Vericodes.findOneAndUpdate(query,vericode,{},callback);
}

module.exports.validate = function(vericode, pwd, callback)
{
  var query = {
                usr:vericode.usr,
                code:crypto.createHash('sha1').update(vericode.code).digest('hex')
              };

  Vericodes.findOne(query, function(err, vericode)
  {
    if(err)
    {
        console.log(err);
        return;
    }

    if(vericode)
    {
      //username and code are correct, set new password
      var employees = require('../employees/employees.js');
      employees.get(vericode.usr, function(error, employee)
      {
          if(error)
          {
            console.log(error);
            return;
          }
          if(employee)
          {
            //found employee in db - change password and validate
            employee.pwd = pwd;
            //validate password
            //TODO: stricter validation
            if(pwd.length>=PWD_MIN_LEN)
            {
              //update employee password
              console.log('changing password for employee "%s"', vericode.usr);
              var sha = crypto.createHash('sha1');
              employee.pwd = sha.update(employee.pwd).digest('hex');
              employees.update(employee._id, employee, callback);
            }else{
              console.log('invalid password length, must be at least %s characters.', PWD_MIN_LEN);
              callback(new Error('invalid password length, must be at least '+PWD_MIN_LEN+' characters.'));
            }
          }else{
            console.log('invalid employee object..');
            callback(new Error('invalid employee object..'));
          }
      });
    }else{
      console.log('invalid username and/or vericode.');
      callback(new Error('invalid username and/or vericode.'));
    }
  });
}

module.exports.isValid = function(vericode)
{
  if(isNullOrEmpty(vericode))
    return false;
  //attribute validation
  if(isNullOrEmpty(vericode.usr))
    return false;
  if(isNullOrEmpty(vericode.code))
    return false;
  /*if(isNullOrEmpty(vericode.date_issued))
    return false;*/

    return true;
}

generateCode = function(len)
{
  var letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  var id = '';
  for(var i=0;i<len;i++)
  {
    var rand = Math.random() * (letters.length);
    id += letters.charAt(rand);
  }
  return id;
};

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
