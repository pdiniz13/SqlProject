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


var options = [{
  url: 'https://data.sfgov.org/resource/tkzw-k3nq.json?$limit=50000'
}, {url: 'https://data.sfgov.org/resource/tkzw-k3nq.json?$limit=50000&$offset=50000'}];
var conString = "postgres://postgres:1234@localhost/postgres";
function callback(error, response, body) {
  console.log(error, "error");
  var trees = JSON.parse(body);
  console.log(body);
  //console.log(trees[0].qspecies);
  pg.connect(conString, function(err, client, done) {
    console.log(err);
    var locationQuery = "INSERT INTO location (xcoord, ycoord , latitude, longitude) select $1, $2, $3, $4 WHERE NOT EXISTS (SELECT xcoord FROM location WHERE xcoord = $1 and ycoord = $2);";
    var treeQuery = "INSERT INTO tree (name, qspeciesid, siteorder, qsiteinfo, qcaretaker, plantdate, dbh, plotsize, permitnotes, treeid, locationid) SELECT 'tree', (select distinct qspeciesid from qspecies where qspecies = $1 limit 1), $2, $3, $4, $5, $6, $7, $8, $9, (select distinct locationid from location where xcoord = $10 limit 1) WHERE NOT EXISTS (SELECT treeid FROM tree WHERE treeid = $9);";
    var qspeciesQuery = "INSERT INTO qspecies (qspecies,  picture) SELECT $1, $2 WHERE NOT EXISTS (SELECT qspecies FROM qspecies WHERE qspecies = $1);";
    async.map(trees, function(tree, cb) {
      var longitude,
        latitude,
        xcoord,
        ycoord;
      if (tree.location) {
        longitude = tree.location.longitude;
        latitude = tree.location.latitude;
        xcoord = tree.xcoord;
        ycoord = tree.ycoord;
      }
      else {
        longitude = "9999";
        latitude = "9999";
        xcoord = "9999";
        ycoord = "9999";
      }
      client.query(locationQuery, [xcoord, ycoord, longitude, latitude]);
    }, function(error, results) {
      console.log("Finished location inserts!", error, results);
      done();
    });
    async.map(trees, function(tree, cb) {
      client.query(qspeciesQuery, [tree.qspecies, 'nameless']);
    }, function(error, results) {
      console.log("Finished qspecies inserts!", error, results);
      done();
    });
    async.map(trees, function(tree, cb) {
      var xcoord = tree.xcoord || 999,
        treeid = tree.treeid,
        qspecies = tree.qspecies,
        siteorder = tree.siteorder || 9999,
        qsiteinfo = tree.qsiteinfo || 'unknown',
        qcaretaker = tree.qcaretaker || 'unknown',
        plantdate = tree.plantdate || new Date(0),
        dbh = tree.dbh || 999,
        plotsize = tree.plotsize || "unknown",
        permitnotes = tree.permitnotes || "unknown";
      client.query(treeQuery, [qspecies, siteorder, qsiteinfo, qcaretaker, plantdate, dbh, plotsize, permitnotes, treeid, xcoord]);
    }, function(error, results) {
      console.log("Finished tree inserts!", error, results);
      done();
    });
  });

}
var testFunction = function(options){
  request(options, callback);
};
async.map(options, testFunction, function(err, results){
  console.log(err);
  console.log(results);
});

module.exports = app;
