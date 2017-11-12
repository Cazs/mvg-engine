var Session = module.exports = function()
{
  this.session_id = "";
  this.user_id = "";
  this.date_issued = 0;
  this.ttl = 0;
}

module.exports.isExpired = function()
{
  return ((this.date_issued + this.ttl) <= (new Date().getTime()/1000));
}
