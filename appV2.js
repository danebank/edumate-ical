const express = require('express');
const morgan = require('morgan');
const schedule = require('node-schedule');
const ics = require('ics');
const edumatedb = require('ibm_db');
const config = require('./config');
const dateFormat = require('dateFormat');

// initialise app
const app = express();

// load middleware
app.use(morgan('dev'));

// configure database
const connString = `DATABASE=${config.database.suffix};HOSTNAME=${config.database.hostname};UID=${config.database.username};PWD=${config.database.password};PORT=${config.database.port};PROTOCOL=TCPIP`;

// calendar data arrays
var staffEvents = [], jnrEvents = [], snrEvents = [];

// scheduled sync DB to calendar data arrays
var j = schedule.scheduleJob('*/1 * * * *', function(){
  console.log('Running database sync...');
  
  // Clean calendar temp arrays
  var staffEventsTemp = [];
  var jnrEventsTemp = [];
  var snrEventsTemp = [];
  
  // Connect to DB and extract data to calendar arrays
  edumatedb.open(connString, function (err,conn) {
  if (err) return console.log(err);
  conn.query(`select * from DB2INST1.VIEW_ICAL`, function (err, data) {
      if (err) console.log(err);
      if (data.length < 1) {
        //result not found
        console.log('no data');
      } else {
		// extract each rows data
        for (var i=0; i<data.length; i++) {
        
        	// Create a single event entry
        	var event =  {
        		'uid':String(data[i].EVENT_ID),
        		'title':data[i].EVENT,
        		'start': [
        			dateFormat(Date.parse(data[i].START_DATE),"yyyy"),
        			dateFormat(Date.parse(data[i].START_DATE),"m"),
        			dateFormat(Date.parse(data[i].START_DATE),"d"),
        			dateFormat(Date.parse(data[i].START_DATE),"H"),
        			dateFormat(Date.parse(data[i].START_DATE),"M")
        			],
        		'end': [
        			dateFormat(Date.parse(data[i].END_DATE),"yyyy"),
        			dateFormat(Date.parse(data[i].END_DATE),"m"),
        			dateFormat(Date.parse(data[i].END_DATE),"d"),
        			dateFormat(Date.parse(data[i].END_DATE),"H"),
        			dateFormat(Date.parse(data[i].END_DATE),"M")
        			]
        	}
        	
        	// If event is all day / multi all day then change start/end times to only have dates
        	if (data[i].ALL_DAY == 1) {
        		event.start = [ event.start[0], event.start[1], event.start[2] ];
        		event.end = [ event.end[0], event.end[1], event.end[2] ];
        	}
        	
        	// push row to appropriate calendar array
        	if(data[i].CATEGORY == "Staff") {staffEventsTemp.push(event);}
        	if(data[i].CATEGORY == "Snr General") {snrEventsTemp.push(event);}
        	if(data[i].CATEGORY == "Jnr General") {jnrEventsTemp.push(event);}
        }
        
        // copy temp arrays to live calendar arrays 
		staffEvents = staffEventsTemp;
  		snrEvents = snrEventsTemp;
  		jnrEvents = jnrEventsTemp; 
      }
      conn.close();
    }); 
  });
  
  
});

// web page calls
app.get('/staff', (req, res, next) => {
  //res.send(staffEvents);
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

app.get('/snr', (req, res, next) => {
  if(!snrEvents) res.status(404).send();
  ics.createEvents(snrEvents, (error, value) => {
    if (error) {
      console.log(error);
    } else {
      res.send(value);
    }
  });
});

// port listener
app.listen(config.server.port, () => {
  console.log(`Server is listening on port ${config.server.port}`);
});
