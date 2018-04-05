const express = require('express');
const morgan = require('morgan');
const schedule = require('node-schedule');
const ics = require('ics');
const edumatedb = require('ibm_db');
const config = require('./config');

// initialise app
const app = express();

// load middleware
app.use(morgan('dev'));

// configure database
const connString = `DATABASE=${config.database.suffix};HOSTNAME=${config.database.hostname};UID=${config.database.username};PWD=${config.database.password};PORT=${config.database.port};PROTOCOL=TCPIP`;

//var categories = ['staff', 'jnr', 'snr', 'whole'];
var categories = ['Dawn', 'Morning', 'Afternoon', 'Evening'];
edumatedb.open(connString, function (err,conn) {
  if (err) return console.log(err);
  for(var i in categories) {
    console.log(categories[i]);
    conn.query(`select * from DB2INST1.VIEW_ICAL where CATEGORY = ${categories[i]}`, function (err, data) {
      if (err) console.log(err);
      if (data.length < 1) {
        //result not found
        console.log('no data');
      } else {
        console.log(data);
      }
      conn.close();
    });
  }
});

// declare calendars
var staffEvents, jnrEvents, snrEvents = [];
var j = schedule.scheduleJob('*/1 * * * *', function(){
  console.log('Running database sync...');
  staffEvents = [
    {
      title: 'Lunch',
      start: [2018, 4, 5, 12, 30],
      duration: { minutes: 45 }
    },
    {
      title: 'Dinner',
      start: [2018, 4, 5, 18, 30],
      duration: { hours: 1, minutes: 30 }
    }
  ];
});

app.get('/staff', (req, res, next) => {
  if(!staffEvents) res.status(404).send();
  ics.createEvents(staffEvents, (error, value) => {
    if (error) {
      console.log(error);
    } else {
      res.send(value);
    }
  });
});

app.get('/jnr', (req, res, next) => {
  if(!jnrEvents) res.status(404).send();
  ics.createEvents(jnrEvents, (error, value) => {
    if (error) {
      console.log(error);
    } else {
      res.send(value);
    }
  });
});

app.listen(config.server.port, () => {
  console.log(`Server is listening on port ${config.server.port}`);
});
