'use strict';
const PAGE_ACCESS_TOKEN = 'EAAJZAJH7KpFEBAK4a9SlqZCGev1D2felRCZB7zCrPNxmIgSGExl8PHWg3ekY1bu7Hb1xDUSyHnlVNZBAe0AVpVL3cjni5UsaqypYrk0tFCGIvyCqVo5zZBznJhcl1QwTWgKE5CKmTVcdvTlxff27BHYDTerOVUxhq1jdHvEEV0QZDZD';

var listeningport = process.env.PORT || 4000;

//Refernce Express , Bodyparser, Request, DialogFlow (api.ai)

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Listen at a PORT
app.listen(listeningport, function () {
console.log('Bus Aririval BOT listening at ...' + listeningport);
});

//Test function to test this program over http GET to know if it is wired up correctly
app.get('/', function (req, res) {
res.send('Bus Arrival BOT GET METHOD...');
});

const apiaiApp = apiai('16a4377835d74e6088bcf03d8a6719ab');

// 1. FACEBOOK
// Let Facebook validate our Webservice

/* For Facebook Validation. This is called during webhook setup in FB. make sure the verify token match */
app.get('/fbwebhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'VERIFY_TOKEN') {
     res.status(200).send(req.query['hub.challenge']);
   } else {
     res.status(403).end();
   }
 });

 // Listener for Facebook messenger that receives the incoming messages

app.post('/fbwebhook',  (req, res) => {

  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          processMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});


//Process messages from FB Messenger

function processMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

//Send the msg received from FB Messenger to DialogFlow and wait for the response from DialogFlow
  let apiai = apiaiApp.textRequest(text, {
    sessionId: 'busarrivalbot'
  });
  // Listen for response from DialogFlow

  apiai.on('response', (response) => {

    //Send the response back to FB Messenger
      console.log(response);
      let aiText = response.result.fulfillment.speech;
      request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
         recipient: {id: sender},
         message: {text: aiText}
       }
     }, (error, response) => {
    if (error) {
        console.log('Error sending message: ', error);
    } else if (response.body.error) {
        console.log('Error: ', response.body.error);
    }
  });
});


apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}

// Webhook implementation for DialogFlow

app.post('/fordf', (req, res) => {

   console.log('*** Call from DialogFlow ***');

   if (req.body.result.action === 'busarrivaltime') {

     // Extract the parameter : BusStop

     let busstop = req.body.result.parameters['BusStopNo'];
      let restUrl = 'http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=' + busstop;

      request({
                uri: restUrl,
                method: 'GET',
                headers: {'AccountKey': 'Qnkd9LUmSDG7ywX+BuCSAA=='}
                 }, (err, response, body) => {

                let jsonresponse = JSON.parse(body);
                let msg = '';

                for(var i = 0; i < jsonresponse.Services.length; i++) {

                    msg = msg +  'Bus No :' + jsonresponse.Services[i].ServiceNo + ' - ETA : ' +  jsonresponse.Services[i].NextBus.EstimatedArrival;
                    msg=msg + '\n';
                   }

                   return res.json({
                    speech: msg,
                    displayText: msg,
                    source: 'busarrivaltime'
                });
            })
        }
      });
