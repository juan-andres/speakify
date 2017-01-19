require('./env');

var express = require('express');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var request = require('request');
var app = express();

var client_id = process.env.CLIENT_ID;
var client_secret = process.env.CLIENT_SECRET;
var redirect_uri = process.env.REDIRECT_URI;

app.set('port', (process.env.PORT || 8888));

app
  .use(express.static(__dirname + '/public'))
  .use(cookieParser());

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
  
app.get('/login', function(req, res) {

  var state = "randomString" + ((Math.random()*100000) | 0);
  console.log('clientid', client_id, client_secret);

  res.cookie('spotify_auth_state', state);

  var scope = "user-read-private user-read-email";
  res.redirect('https://accounts.spotify.com/authorize?' +  querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state
  }));
});

app.get('/callback', function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies['spotify_auth_state'] : null;


  res.clearCookie('spotify_auth_state');
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = body.access_token,
          refresh_token = body.refresh_token;

      var options = {
        url: 'https://api.spotify.com/v1/me',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      request.get(options, function(error, response, body) {
        console.log(body);
      });

      res.redirect('/#' +
         querystring.stringify({
           access_token: access_token,
           refresh_token: refresh_token
         }));

    } else {
      console.log('error', error, 'body', body);
      res.redirect('/#' + querystring.stringify({error: 'invalid token'}));
    }
  });
});

app.get('/refresh_token', function(req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/', function(req, res) {
  res.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
