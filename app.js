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


var conString = "postgres://postgres:1234@localhost/postgres";


var treeInsert = function(error, response, body) {
  console.log("inside request");
  console.log(error, "error");
  var trees = JSON.parse(body);
  //console.log(body);
  //console.log(trees[0].qspecies);
  pg.connect(conString, function(err, client, done) {
    console.log(err);
    var locationQuery = "INSERT INTO location (xcoord, ycoord , latitude, longitude) select $1, $2, $3, $4 WHERE NOT EXISTS (SELECT xcoord FROM location WHERE xcoord = $1 and ycoord = $2);";
    var treeQuery = "INSERT INTO tree (name, qspeciesid, siteorder, qsiteinfo, qcaretaker, plantdate, dbh, plotsize, permitnotes, treeid, locationid) SELECT 'tree', (select distinct qspeciesid from qspecies where qspecies = $1 limit 1), $2, $3, $4, $5, $6, $7, $8, $9, (select distinct locationid from location where xcoord = $10 limit 1) WHERE NOT EXISTS (SELECT treeid FROM tree WHERE treeid = $9);";
    var qspeciesQuery = "INSERT INTO qspecies (qspecies) SELECT $1 WHERE NOT EXISTS (SELECT qspecies FROM qspecies WHERE qspecies = $1);";
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
      client.query(qspeciesQuery, [tree.qspecies]);
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
};

var imageInsert = function() {
  pg.connect(conString, function(err, client, done) {
    console.log(err);
    var selectQuery = "select * from qspecies";
    client.query(selectQuery, function(err, results) {
      console.log(err, '   inside select for image');
      var queryResults = results.rows;
      var insertFunction = function(qspecies) {
        //console.log(qspecies);
        //console.log(qspecies.qspecies);
        //console.log(qspecies.qspeciesid);
        var qspeciesid = (qspecies.qspeciesid);
        var qspeciesname = (qspecies.qspecies);
        var qspeciesname = qspeciesname;
        var uri = "https://api.datamarket.azure.com/Bing/Search/v1/Image?Query='" + encodeURIComponent(qspeciesname) + "'&$top=1&$format=json";
        //console.log(uri);
        var options = {
          uri: uri,
          auth: {
            user: 'secret',
            pass: 'secret'
          }
        };

        var selectQuery = "SELECT * FROM image WHERE qspeciesid = $1;";
        client.query(selectQuery, [qspeciesid], function(err, results) {
          if (results.rows === undefined || results.rows[0] === undefined){
            console.log('database results', results);
            console.log('database rows', results.rows);
            request(options, function(err, response, results, body) {
              console.log(err, ' error inside picture request');
              var results = JSON.parse(results);
              console.log(results);
              console.log(results['d']);
              console.log(results.d.results[0]);
              var mediaurl = results.d.results[0] ? results.d.results[0].MediaUrl : "unknown";
              var mediaw = results.d.results[0] ? results.d.results[0].Width : 9999;
              var mediah = results.d.results[0] ? results.d.results[0].Height : 9999;
              var mediat = results.d.results[0] ? results.d.results[0].ContentType : "unknown";
              var thumbnailurl = results.d.results[0] ? results.d.results[0].Thumbnail.MediaUrl : "unknown";
              var thumbnailt = results.d.results[0] ? results.d.results[0].Thumbnail.ContentType : "unknown";
              var thumbnailw = results.d.results[0] ? results.d.results[0].Thumbnail.Width : 9999;
              var thumbnailh = results.d.results[0] ? results.d.results[0].Thumbnail.Height : 9999;
              var insertQuery = "INSERT INTO image (imageurl, imagewidth, imageheight, imagetype, qspeciesid) values ($1, $2, $3, $4, $5);";
              client.query(insertQuery, [mediaurl, mediaw, mediah, mediat, qspeciesid], function(err, results) {
                console.log(err, " error inside insert query");
                console.log(results);
              });
              var insertQuery2 = "INSERT INTO thumbnail (contenttype, url, width, height, qspeciesid) values ($1, $2, $3, $4, $5);";
              client.query(insertQuery2, [thumbnailt, thumbnailurl, thumbnailw, thumbnailh, qspeciesid], function(err, results) {
                console.log(err, " error inside insert query");
                console.log(results);
              });
            });
          }
        });
      };
        async.map(queryResults, insertFunction, function(err, results) {
          console.log(results);
          console.log(err);
        });
    });
  });
};

var options = {
  url: 'https://data.sfgov.org/resource/tkzw-k3nq.json?$limit=50000'
};
var options1 = {
  url: 'https://data.sfgov.org/resource/tkzw-k3nq.json?$limit=50000&$offset=50000'
};

async.series([
  function(callback){request(options, treeInsert); callback(null, 'ok')},
  function(callback){request(options1, treeInsert); callback(null, 'ok')},
  function(callback){imageInsert(); callback(null, 'ok')}
]);



module.exports = app;