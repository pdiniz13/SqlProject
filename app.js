var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var routes = require('./routes/index');
var users = require('./routes/users');
var pg = require('pg');
var async = require('async');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var options = {
  //url: 'https://data.sfgov.org/resource/tkzw-k3nq.json?$select=qspecies&$limit=50000'
  url: 'https://data.sfgov.org/resource/tkzw-k3nq.json?$limit=50000'
};
var conString = "postgres://postgres:1234@localhost/postgres";
function callback(error, response, body) {
  console.log(error, "connection");
  var trees = JSON.parse(body);
  //console.log(body);
  console.log(trees[0].qspecies);
  pg.connect(conString, function(err, client, done) {
    var query = "INSERT INTO tree (name, qspeciesid, siteorder, qsiteinfo, qcaretaker, plantdate, dbh, plotsize, permitnotes, locationid) VALUES ('tree', (select distinct qspeciesid from qspecies where qspecies = $1 limit 1), $2, $3, $4, $5, $6, $7, $8, (select distinct locationid from location where xcoord = $9 limit 1));";
    //for (var x = 0, count = trees.length; x < count; x++) {
    //var longitude,
    //  latitude,
    //  xcoord,
    //  ycoord;
    //if (trees[x].location) {
    //  longitude = trees[x].location.longitude;
    //  latitude = trees[x].location.latitude;
    //  xcoord = trees[x].xcoord;
    //  ycoord = trees[x].ycoord;
    //}
    //else {
    //  longitude = "999";
    //    latitude = "999";
    //    xcoord = "999";
    //    ycoord = "999";
    //}
    //client.query("" +
    //  "INSERT INTO location (xcoord, ycoord , latitude, longitude) select $1, $2, $3, $4 WHERE NOT EXISTS (SELECT xcoord FROM location WHERE xcoord = $1 and ycoord = $2);", [xcoord, ycoord, longitude, latitude],
    //  function(err, result) {
    //
    //    // handle an error from the query
    //      console.log(err);
    //
    //  });
    //var xcoord = trees[x].xcoord || 999,
    //  qspecies = trees[x].qspecies,
    //  siteorder = trees[x].siteorder || 9999,
    //  qsiteinfo = trees[x].gsiteinfo || 'unknown',
    //  qcaretaker = trees[x].qcaretaker || 'unknown',
    //  plantdate = trees[x].plantdate || new Date(0),
    //  dbh = trees[x].dbh || 999,
    //  plotsize = trees[x].plotsize || "unknown",
    //  permitnotes = trees[x].permitnotes || "unknown";
    async.map(trees, function(tree, cb) {
      var xcoord = tree.xcoord || 999,
        qspecies = tree.qspecies,
        siteorder = tree.siteorder || 9999,
        qsiteinfo = tree.gsiteinfo || 'unknown',
        qcaretaker = tree.qcaretaker || 'unknown',
        plantdate = tree.plantdate || new Date(0),
        dbh = tree.dbh || 999,
        plotsize = tree.plotsize || "unknown",
        permitnotes = tree.permitnotes || "unknown";
      client.query(query, [qspecies, siteorder, qsiteinfo, qcaretaker, plantdate, dbh, plotsize, permitnotes, xcoord]);
    }, function(error, results) {
      console.log("Finished inserts!", error, results);
      done();
    });
    //  client.query(, [qspecies, siteorder, qsiteinfo, qcaretaker, plantdate, dbh, plotsize, permitnotes, xcoord],
    //    function(err, result) {
    //
    //      // handle an error from the query
    //        console.log(err);
    //
    //    });
    ////}
    //done();
  });

}

request(options, callback);


module.exports = app;
