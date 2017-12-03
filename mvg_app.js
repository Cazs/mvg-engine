
//System imports
const express = require('express');
const mongoose = require('mongoose');
const body_parser = require('body-parser');
const path = require('path');
const fs = require('fs');
//const upload = multer({dest : __dirname + '/public/uploads/'});
//154.0.175.175
//Custom imports
const users = require('./models/users/users.js');
const events = require('./models/events/events.js');
const sessions = require('./models/system/sessions.js');
const errors = require('./models/system/error_msgs.js');
const access_levels = require('./models/system/access_levels.js');
const vericodes = require('./models/system/vericodes.js');
const counters = require('./models/system/counters.js');
const db = mongoose.connection;
const app = express();

//globals
const SESSION_TTL = 60 * 240;//Session valid for 4 hours
const DB_IP = '192.168.137.1';
const DB_NAME = 'mvg';
const PORT = 9999;
const APP_NAME = "MVG Vanilla Engine";
const APP_VERSION = '0.1';
const APP_VERSION_NAME = 'Durban';

mongoose.connect('mongodb://' + DB_IP + '/' + DB_NAME);

//init middle-ware
app.use(express.static(__dirname + '/../mvg-webapp'));
app.use(body_parser.urlencoded({extended:true}));

//RESTful endpoint definitions
app.get('/', function(req, res)
{
  res.setHeader("Content-Type","text/plain");
  res.end("Invalid request, please use /api/*.");
});

//Timestamp CRUD handlers
app.get('/api/timestamp/:object_id', function(req, res)
{
  get(req, res, counters, function(err, obj)
  {
    if(err)
    {
      errorAndCloseConnection(res, 500, errors.INTERNAL_ERR);
      logServerError(err);
      return;
    }
    console.log('user with session_id [%s] requested timestamp [%s].', req.headers.cookie, req.params.object_id);
    res.json(obj);
  });
});

//Events CRUD handlers
app.post('/api/event/add', function(req, res)
{
  add(req, res, events, function(err, event)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res, 409, errors.CONFLICT + ' - ' + err.message);
      return;
    }
    if(event)
    {
      console.log('successfully created event [%s].', event.event_name);
      res.end(event);
    } else {
      console.log('could not create event [%s]', event);
      errorAndCloseConnection(res, 409, errors.CONFLICT + ' - could not create event.');
    }
  });
});

app.get('/api/events',function(req, res)
{
  get(req, res, events, function(err, events_arr)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res, 409, errors.CONFLICT + ' - ' + err.message);
      return;
    }
    if(events_arr)
    {
      console.log('found & returned [%s] events from database.', events_arr.length);
      res.end(events_arr);
    } else {
      console.log('no events were found in the database.');
      errorAndCloseConnection(res, 404, errors.NOT_FOUND + ' - no events found.');
    }
  });
});

app.get('/api/event/:object_id',function(req, res)
{
  get(req, res, events, function(err, event)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res, 409, errors.CONFLICT + ' - ' + err.message);
      return;
    }
    if(event)
    {
      console.log('found & returned event [%s] from database.', event.event_name);
      res.end(event);
    } else {
      console.log('no events matching identifier [%s] were found in the database.', req.params.object_id);
      errorAndCloseConnection(res, 404, errors.NOT_FOUND + ' - event [' + req.params.object_id + '] was not found in the database.');
    }
  });
});

/**** User CRUD route handlers ****/
app.get('/api/user/:object_id',function(req, res)
{
  get(req, res, users, function(err, obj)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res, 500, errors.INTERNAL_ERR);
      return;
    }

    if(obj)
    {
      console.log('user with session_id [%s] requested user object [%s].', req.headers.cookie, obj.username);
      res.json(obj);
    }else
    {
      logServerError(new Error('database returned a null user object.'));
      errorAndCloseConnection(res, 409, errors.INTERNAL_ERR);
    }
  });
});

app.get('/api/users',function(req,res)
{
  getAll(req, res, users, function(err, obj)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res,500,errors.INTERNAL_ERR);
      return;
    }

    if(obj)
    {
      console.log('user with session_id [%s] requested all user objects.', req.headers.cookie);
      res.json(obj);
    }else
    {
      logServerError(err);
      errorAndCloseConnection(res, 409, errors.INTERNAL_ERR + ': ' + 'database returned null user objects.');
      return;
    }
  });
});

app.post('/api/user/add',function(req,res)
{
  var obj = req.body;
  //res.setHeader('Content-Type','application/json');

  //validate user obj
  if(!users.isValid(obj))
  {
    console.log('invalid user.')
    errorAndCloseConnection(res, 503, errors.INVALID_DATA);
    return;
  }

  users.add(obj, function(err, user)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res, 500, errors.INTERNAL_ERR);
      return;
    }
    console.log("successfully created new user.");
    res.json(user);
  });
});

app.post('/api/user/update/:object_id',function(req,res)
{
  //TODO: only user and authorized users can update
  updateObject(req, res, users);
});

app.post('/api/user/pwdreset',function(req, res)
{
  var vericode = req.body;
  if(vericode)
  {
    if(vericodes.isValid(vericode))
    {
      var pwd = vericode.pwd;
      if(pwd)
      {
        vericodes.validate(vericode, pwd, function(err)
        {
          if(err)
          {
            errorAndCloseConnection(res, 409, err.message);
            logServerError(err);
            return;
          }
          //successfully reset
          res.json({'message':'password has been successfully reset.'});
        });
      }else{
          errorAndCloseConnection(res, 409, 'invalid password.');
          logServerError(new Error('invalid password.'));
          return;
      }
    }else{
        errorAndCloseConnection(res, 409, 'invalid input data.');
        logServerError(new Error('invalid input data.'));
        return;
    }
  }else{
      errorAndCloseConnection(res, 409, 'invalid input data.');
      logServerError(new Error('invalid input data.'));
      return;
  }
});

app.post('/api/vericode/add', function(req, res)
{
  console.log('received vericode reset request.');
  res.setHeader('Content-Type','application/json');

  var vcode = req.body;

  if(vcode)
  {
    vcode.code="";
    vcode.date_issued=0;

    vericodes.add(vcode, function(err)
    {
      if(err)
      {
        errorAndCloseConnection(res, 500, err.message);
        logServerError(err);
        return;
      }
      res.json({'message':'successfully created vericode.'});
    });
  }else
  {
    errorAndCloseConnection(res, 500, 'invalid vericode object.');
    logServerError('invalid vericode object.');
  }
});

//Uploaded files server/route handler
app.get('/api/file/uploads/:file_id', function(req, res)
{
  var fpath = path.join(__dirname, '/uploads/'+req.params.file_id);
  var stat = fs.statSync(fpath);
  res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':stat.size});

  var dataStream = fs.createReadStream(fpath);
  dataStream.pipe(res);
  console.log('served file "%s"', req.params.file_id);
});

//Slider images file server
app.get('/api/images/slider/:file_id', function(req, res)
{
  var fpath = path.join(__dirname, '/public/images/slider/' + req.params.file_id);//<-- TODO: check, hard-coded
  var stat = fs.statSync(fpath);

  res.writeHead(200,{'Content-Type':'image/jpg','Content-Length':stat.size});

  var dataStream = fs.createReadStream(fpath);
  dataStream.pipe(res);

  console.log('served file [/public/images/slider/%s]', req.params.file_id);
});

app.get('/api/images/slider', function(req, res)
{
  //res.writeHead(200,{'Content-Type':'application/json'});

  fs.readdir(__dirname + '/public/images/slider/', function(err, data)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res,500,errors.INTERNAL_ERR);
      return;
    }
    //res.end(JSON.stringify(data));
    res.json(data);
  });
});

//Public directory file server
app.get('/:object',function(req, res)
{
  //if(path.existsSync(__dirname + '/public/'+req.params.object))
  var file_path = __dirname + '/public/'+req.params.object;
  fs.exists(file_path, function(exists)
  {
    if(exists)
    {
      //create download counter for file - if it already exists, nothing will be done except return the counter
      createCounter(req.params.object, function(ctr_err, counter)
      {
        if(ctr_err)
        {
          logServerError(ctr_err);
          errorAndCloseConnection(res, 409, errors.CONFLICT + ' - could not create counter for file ['+req.params.object+'], message: ' + ctr_err.message);
          return;
        }
        if(counter)
        {
          //update download counter for file
          counter.count += 1;
          counters.update(req.params.object, counter, function(err, ctr)
          {
            if(err)
            {
              logServerError(err);
              errorAndCloseConnection(res, 409, errors.CONFLICT + ' - ' + err.message);
              return;
            }
            if(ctr)
            {
              //updated download counter
              console.log('successfully updated download counter for [%s] to [%s].', req.params.object, ctr.count);
              var fpath = path.join(__dirname, '/public/' + req.params.object);
              var stat = fs.statSync(fpath);
              res.writeHead(200, {'Content-Type': 'text/plain', 'Content-Length': stat.size});
              
              var dataStream = fs.createReadStream(fpath);
              dataStream.pipe(res);
              console.log('served file [%s].', req.params.object); 
              //res.end('successfully served file ['+req.params.object+'].');//close connection
            } else logServerError(new Error("could not update download counter for file [" + req.params.object + "] "));
          });
        } else {
          logServerError(new Error('Could not create counter for file ['+req.params.object+'].'));
          errorAndCloseConnection(res, 409, errors.CONFLICT + ' - could not create counter for file ['+req.params.object+']');
          return;
        }
      });
    }else{
      logServerError(new Error("file [" + req.params.object + "] was not found."));
      errorAndCloseConnection(res, 404, errors.NOT_FOUND + " - file [" + req.params.object + "] was not found on this server.");
    }
  });
});

//File uploader
app.post('/api/upload', function(req, res, next)
{
  //TODO: check if file exists - and manage revisioning if it does.
  console.log('received upload request for "%s"', req.headers.filename);
  var write_stream = fs.createWriteStream( __dirname + '/uploads/' + req.headers.filename);
  req.pipe(write_stream);

  //In case any errors occur
  write_stream.on('error', function (err)
  {
    console.log(err);
    res.writeHead(409, {'content-type':'text/plain'});
    res.end(err);
    return;
  });

  console.log('%s has been successfully uploaded.', req.headers.filename);
  res.writeHead(200, {'content-type':'text/plain'});
  res.end(req.headers.filename + ' has been successfully uploaded.');
});

//Logo uploader
app.post('/api/upload/logo', function(req, res, next)
{
  //TODO: check if file exists - and manage revisioning if it does.
  console.log('received upload request for company logo.');
  var write_stream = fs.createWriteStream( __dirname + '/public/logos/logo.' + req.headers.filetype);
  req.pipe(write_stream);

  //In case any errors occur
  write_stream.on('error', function (err)
  {
    console.log(err);
    res.writeHead(409, {'content-type':'text/plain'});
    res.end(err);
    return;
  });

  console.log('company logo has been successfully updated.');
  res.writeHead(200, {'content-type':'text/plain'});
  res.end('company logo has been successfully updated.');
});

add = function(req, res, obj_model, callback)
{
  var obj = req.body;
  var session_id = req.headers.cookie;
  var session = sessions.search(session_id);
  
  res.setHeader('Content-Type','application/json');

  //validate obj
  if(!obj_model.isValid(obj))
  {
    console.log('invalid object %s', obj)
    errorAndCloseConnection(res, 503, errors.INVALID_DATA);
    return;
  }

  if(session!=null)
  {
    if(!session.isExpired())
    {
      if(session.access_level>=obj_model.ACCESS_MODE)
      {
        obj_model.add(obj, callback);
      }else {
        errorAndCloseConnection(res, 502, errors.UNAUTH);
      }
    }else {
      errorAndCloseConnection(res, 501, errors.SESSION_EXPIRED);
    }
  }else{
    errorAndCloseConnection(res, 501, errors.SESSION_EXPIRED);
  }
}

update = function(req, res, obj_model, callback)
{
  var obj_id = req.params.object_id;
  var obj = req.body;
  var session_id = req.headers.cookie;
  var session = sessions.search(session_id);

  res.setHeader('Content-Type','application/json');

  if(isNullOrEmpty(obj_id))
  {
    console.log('invalid object id: "%s".', JSON.stringify(obj_id));
    errorAndCloseConnection(res, 503, errors.INVALID_DATA);
    return;
  }

  if(!obj_model.isValid(obj))
  {
    console.log('invalid object "%s"', JSON.stringify(obj));
    errorAndCloseConnection(res, 503, errors.INVALID_DATA);
    return;
  }

  if(session!=null)
  {
    if(!session.isExpired())
    {
      if(session.access_level>=obj_model.ACCESS_MODE)
      {
        obj_model.update(obj_id, obj, callback);
      }else {
        errorAndCloseConnection(res, 502, errors.UNAUTH);
      }
    }else {
      errorAndCloseConnection(res, 501, errors.SESSION_EXPIRED);
    }
  }else{
    errorAndCloseConnection(res, 501, errors.SESSION_EXPIRED);
  }
}

get = function(req, res, obj_model, callback)
{
  var obj_id = req.params.object_id;
  var session_id = req.headers.cookie;
  var session = sessions.search(session_id);

  if(isNullOrEmpty(obj_id))
  {
    console.log('invalid object_id [%s].', obj_id)
    errorAndCloseConnection(res,503,errors.INVALID_DATA);
    return;
  }

  res.setHeader('Content-Type','application/json');

  if(session!=null)
  {
    if(!session.isExpired())
    {
      if(session.access_level>=obj_model.ACCESS_MODE)
      {
        //console.log('user [%s] GET request [%s]', session.user_id, obj_model.constructor.name);
        obj_model.get(obj_id, callback);
      }else {
        errorAndCloseConnection(res,502,errors.UNAUTH);
      }
    }else {
      errorAndCloseConnection(res,501,errors.SESSION_EXPIRED);
    }
  }else {
    errorAndCloseConnection(res,501,errors.SESSION_EXPIRED);
  }
}

getAll = function(req, res, obj_model, callback)
{
  var session_id = req.headers.cookie;
  var session = sessions.search(session_id);

  res.setHeader('Content-Type','application/json');

  if(session!=null)
  {
    if(!session.isExpired())
    {
      if(session.access_level>=obj_model.ACCESS_MODE)
      {
        obj_model.getAll(callback);
      }else{
        errorAndCloseConnection(res,502,errors.UNAUTH);
      }
    }else {
      errorAndCloseConnection(res,501,errors.SESSION_EXPIRED);
    }
  }else {
    errorAndCloseConnection(res,501,errors.SESSION_EXPIRED);
  }
}

errorAndCloseConnection = function(res, status, msg)
{
  res.status(status);
  res.setHeader('Connection','close');
  res.json({'message':msg});
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

logServerError = function(err)
{
  //TODO: log to file
  console.error(err.stack);
}

/**** user authentication ****/
app.post('/api/auth',function(req, res)
{
  var usr = req.body.username;
  var pwd = req.body.password;

  console.log('[%s] login request.', usr);

  res.setHeader('Content-Type','application/json');

  //validate input from client
  if(isNullOrEmpty(usr) || isNullOrEmpty(pwd))
  {
    console.log('invalid usr/pwd object.');
    errorAndCloseConnection(res,404,errors.NOT_FOUND);
    return;
  }

  //check if credentials match the ones in the database
  users.validate(usr, pwd, function(err, user)
  {
    if(err)
    {
      logServerError(err);
      errorAndCloseConnection(res,500,errors.INTERNAL_ERR);
      return;
    }
    if(user)
    {
      console.log('user [%s] successfully logged in.', usr);
      var session = sessions.newSession(user._id, SESSION_TTL, user.access_level);
      res.setHeader('Set-Cookie','session=' + session.session_id + ';ttl=' + session.ttl +
                      ';date=' + session.date_issued);
      res.setHeader('Content-Type','text/plain');
      res.json(session.session_id);
    }else
    {
      errorAndCloseConnection(res,404,errors.NOT_FOUND);
    }
  });
});

createCounter = function(counter_name, callback)
{
  //check if counter exists
  counters.get(counter_name, function(err, counter)
  {
    if(err)
    {
      //counter DNE
      //if(callback)
      //  callback(err, counter);
      //logServerError(err);
      //return;
    }
    //if counter DNE, create it, else return it
    if(!counter)
    {
      //create counter
      var count = {counter_name: counter_name};
      counters.add(count, function(add_err, ctr)
      {
        if(add_err)
        {
          if(callback)
            callback(add_err, null);
          else logServerError(add_err);
          return;
        }
        if(callback)
        {
          console.log('successfully created new counter [%s].', counter_name);
          callback(null, ctr);
        } else console.log('successfully created new counter [%s].', counter_name);
      });
    } else {
      if(callback)
        callback(null, counter);
      else console.log('counter [%s] already exists.', counter_name);      
    }
  });
}

//Init Counters & Timestamps
//createCounter('');

app.listen(PORT);
var app_full_name = APP_NAME + ' v' + APP_VERSION + ' - ' + APP_VERSION_NAME;
console.log('..::%s server is now running at localhost on port %s::..', app_full_name, PORT);
