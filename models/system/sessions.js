const List = require('linked-list-adt');
const sessions = new List();

module.exports.newSession = function(user_id,ttl, access_level)
{
  var session = require('./session.js');
  session.session_id = generateSessionID(16);
  session.user_id=user_id;
  session.date_issued=new Date().getTime()/1000;
  session.ttl=ttl;
  session.access_level=access_level;

  sessions.add(session);

  return session;
}

module.exports.getFirstSession = function()
{
  return sessions.first();
}

module.exports.search = function(sess_id)
{
  for(var i=0;i<sessions.size();i++)
  {
    var session = sessions.get(i);
    if(session.session_id == sess_id)
    {
      return session;
    }
  }
  return null;
}

generateSessionID = function(len)
{
  var letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  var id = '';
  for(var i=0;i<len;i++)
  {
    var rand = Math.random() * (letters.length);
    id += letters.charAt(rand);
  }
  return id;
}
