/*
Summary: in the following, there are examples of querying Redox sandbox to:
- Fetch patient demographic info from MRN (Medical Record Number): https://developer.redoxengine.com/data-models/PatientSearch.html
- Push a PDF file to EHR: https://developer.redoxengine.com/data-models/Media.html
- Some other stuff... (SSO basics started, to be finished): https://developer.redoxengine.com/data-models/SSO.html

Some experiments were started but not finished:
- SSO: "EHR launch", ie. HCP is in EHR and wants to connect to an external app without having to reauthenticate into the app.
- R^FHIR: Redox advertised that they have FHIR compliant APIs (for using instead of their Data Models approach). But this part seems to be too preliminary and not enough documented to be used
*/

const util = require("util");
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');

var DESTINATION_VERIFICATION_TOKEN = 'abc1234';
var SOURCE_API_KEY = 'e479fbe0-1c9b-42ce-acf7-6e586127e7c4';
var SOURCE_SECRET = 'KQ1x2yJxv7Nnu6AtwAUPzvBBbewZVpkBdznPYmjeWucKAWar7xOqGMBL1ep0WgHYbnP54j0U';
var authToken, authTokenExpires;


var lowdb = require('lowdb');
var db = lowdb('db.json');

db.defaults({ appointments: [] })
	.write();

app.use(bodyParser.json());

app.listen(80, function () {
	console.log('Server started. Listening on port 80.');
});

app.get('/', function (req, res) {
	res.send('Hello, World at timestamp='+Date.now());
});

//The following allows to verify the GET connection when destination is being created in Redox dashboard
app.get('/destination', function (req, res) {
	//Used to validate destination in Redox: must return the challenge value sent by Redox in the GET
	if (req.headers['verification-token'] === DESTINATION_VERIFICATION_TOKEN) {
		console.log('verification-token matched!');
		return res.send(req.query.challenge);
	}

	console.log('verification-token did not match :( ');
	res.sendStatus(400);
});

//GET: search patient by MRN
//Example: 
//1- from cmd line: start Node JS: node index.js
//2- then call the API: http://<your IP address or domain name>/patientsearch?id=0000000003
//   Example patients:
//    Timothy Bixby: 0000000001
//    Barbara Bixby: 0000000002
//    Walter Carthwright: 0000000003
app.get('/patientsearch', function (req, res) {
	//Craft the Data Model for PatientSearch with the patient ID (req.query.id) being searched and type of ID = 'MR' (medical record number)
	getAuthToken(function (token) {
		var options = {
			url: 'https://api.redoxengine.com/query',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			json: true
		};

		options.body = {
			"Meta": {
				"DataModel": "PatientSearch",
				"EventType": "Query",
				"EventDateTime": "2017-07-26T04:46:01.868Z",
				"Test": true,
				"Destinations": [
					{
						"ID": "0f4bd1d1-451d-4351-8cfd-b767d1b488d6",
						"Name": "Patient Search Endpoint"
					}
				]
			},
			"Patient": {
				"Identifiers": [
					{
						"ID": req.query.id,
						"IDType": "MR"
					}
				]

			}
		};

		request.post(options, function (err, response, body) {
			console.log('QUERY:');
			console.log('------');
			console.log(util.inspect(options.body));
			console.log('RESPONSE:');
			console.log('---------');
			console.log('Errors: ' + err);
			console.log('Status code: ' + response.statusCode);
			console.log('errors in body: ' + util.inspect(body.Meta.Errors));
			//console.log(body.Patient.Demographics);
			res.send("<h2>Demographic info for patient with MRN="+req.query.id+"</h2><code>"+JSON.stringify(body.Patient.Demographics)+"</code>");
		})
	});
});

//Create endpoint for sending PDF file: a dummy PDF for patient Timothy Bixby: 0000000001, HCP being Pat Granite.
//PDF file content goes into FileContents, base64 encoded
app.get('/sendpdf', function (req, res) {
	//Create a Media Data Model for sending a PDF file
	getAuthToken(function (token) {
		var options = {
			url: 'https://api.redoxengine.com/endpoint',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			json: true
		};

		options.body = {
			"Meta": {
				"DataModel": "Media",
				"EventType": "New",
				"EventDateTime": "2020-09-11T02:47:33.101Z",
				"Test": true,
				"Source": {
					"ID": "7ce6f387-c33c-417d-8682-81e83628cbd9",
					"Name": "Redox Dev Tools"
				},
				"Destinations": [
					{
						"ID": "af394f14-b34a-464f-8d24-895f370af4c9",
						"Name": "Redox EMR"
					}
				],
				"Message": {
					"ID": 5565
				},
				"Transmission": {
					"ID": 12414
				},
				"FacilityCode": null
			},
			"Patient": {
				"Identifiers": [
					{
						"ID": "0000000001",
						"IDType": "MR"
					}
				]
			},
			"Media": {
				"FileType": "PDF",
				"FileName": "SamplePDF",
				"FileContents": "JVBERi0xLjQKCjEgMCBvYmoKPDwKIC9UeXBlIC9DYXRhbG9nCiAvUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8CiAvVHlwZSAvUGFnZXMKIC9LaWRzIFszIDAgUl0KIC9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAogL1R5cGUgL1BhZ2UKIC9QYXJlbnQgMiAwIFIKIC9NZWRpYUJveCBbMCAwIDM1MCAyMDBdCiAvQ29udGVudHMgNCAwIFIKIC9SZXNvdXJjZXMgPDwKICAvUHJvY1NldCA1IDAgUgogIC9Gb250IDw8CiAgIC9GMSA2IDAgUgogID4+CiA+Pgo+PgplbmRvYmoKCjQgMCBvYmoKPDwgL0xlbmd0aCA3MyA+PgpzdHJlYW0KIEJUCiAgL0YxIDI0IFRmCiAgMTAwIDEwMCBUZAogIChIZWxsbyBmcm9tIFJlZG94KSBUagogRVQKZW5kc3RyZWFtCmVuZG9iagoKNSAwIG9iagogWy9QREYgL1RleHRdCmVuZG9iagoKNiAwIG9iago8PAogL1R5cGUgL0ZvbnQKIC9TdWJ0eXBlIC9UeXBlMQogL05hbWUgL0YxCiAvQmFzZUZvbnQgL0hlbHZldGljYQogL0VuY29kaW5nIC9NYWNSb21hbkVuY29kaW5nCj4+CmVuZG9iagoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwMDc0IDAwMDAwIG4KMDAwMDAwMDEyMCAwMDAwMCBuCjAwMDAwMDAxNzkgMDAwMDAgbgowMDAwMDAwMzY0IDAwMDAwIG4KMDAwMDAwMDQ2NiAwMDAwMCBuCjAwMDAwMDA0OTYgMDAwMDAgbgoKdHJhaWxlcgo8PAovU2l6ZSA4Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo2MjUKJSVFT0Y=",
				"DocumentType": "Sample Document",
				"DocumentID": "e52180fb-75a2-41ea-9fcd-661a996de53f",
				"DocumentDescription": null,
				"CreationDateTime": "2017-06-22T19:30:04.387Z",
				"ServiceDateTime": "2017-06-22T17:00:00.387Z",
				"Provider": {
					"ID": "4356789876",
					"IDType": "NPI"
				},
				"Availability": "Available",
			}
		};

		request.post(options, function (err, response, body) {
			console.log('MEDIA RESPONSE:');
			console.log('---------------');
			console.log('Errors: ' + err);
			console.log('Status code: ' + response.statusCode);
			console.log('errors in body: ' + util.inspect(body.Meta.Errors));
			res.send("PDF file sent, check your console: you should have a 200 HTTP status with no errors!");
		});
	})
});


//The following allows to verify the POST connection when destination is being created in Redox dashboard
//Unrelated to our use cases, but it also allows to get Appointment information for a patient and store it into the local json DB (example from Tom): watch the video, and see how to use the DevTools to send Appointment info
app.post('/destination', function (req, res) {
	console.log('request body: ' + util.inspect(req.body));

	//Used to validate destination in Redox: must return the challenge value sent by Redox in the POST
	if (typeof req.body.challenge !== 'undefined' && req.body.challenge) {
		return res.send(req.body.challenge);
	}

	if (typeof req.body.Meta !== 'undefined' && req.body.Meta && req.body.Meta.DataModel === 'Scheduling' && req.body.Meta.EventType === 'New') {
		console.log('Scheduling message received!');

		var appointment = {
			PatientFirstName: req.body.Patient.Demographics.FirstName,
			PatientLastName: req.body.Patient.Demographics.LastName,
			PatientIdentifiers: req.body.Patient.Identifiers,
			VisitDateTime: req.body.Visit.VisitDateTime,
			VisitReason: req.body.Visit.Reason,
			ProviderFirstName: req.body.Visit.AttendingProvider.FirstName,
			ProviderLastName: req.body.Visit.AttendingProvider.LastName,
			ProviderID: req.body.Visit.AttendingProvider.ID
		};

		db.get('appointments')
			.push(appointment)
			.write();

		getClinicalSummary(appointment);
	}

	res.sendStatus(200);
});

//Counterpart of the preceding: get the list of appointments that have been stored in the local JSON DB.
app.get('/appointments', function (req, res) {
	var appointments = db.get('appointments').value();
	res.send(appointments);
});

function getAuthToken(callback) {
	if (authToken && Date.now() < new Date(authTokenExpires).getTime()) {
		return callback(authToken);
	} else {
		//get new token

		var options = {
			url: 'https://api.redoxengine.com/auth/authenticate',
			method: 'POST',
			body: {
				apiKey: SOURCE_API_KEY,
				secret: SOURCE_SECRET
			}, 
			headers: {
				'Content-Type': 'application/json'
			},
			json: true
		};

		request.post(options, function (err, response, body) {
			//console.log('Step 1, getting AccessToken:'+ body);

			authToken = body.accessToken;
			authTokenExpires = body.expires;

			callback(authToken);
		});
	}
}


function getClinicalSummary(appointment) {
	getAuthToken(function (token) {
		var options = {
			url: 'https://api.redoxengine.com/query',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			json: true
		};

		options.body = {
			"Meta": {
				"DataModel": "Clinical Summary",
				"EventType": "PatientQuery",
				"EventDateTime": "2017-07-26T04:46:01.868Z",
				"Test": true,
				"Destinations": [
					{
						"ID": "ef9e7448-7f65-4432-aa96-059647e9b357",
						"Name": "Patient Query Endpoint"
					}
				]
			},
			"Patient": {
				"Identifiers": appointment.PatientIdentifiers
			}
		};

		request.post(options, function (err, response, body) {
			console.log('ClinicalSummary:');
			console.log(err);
			console.log(response.statusCode);
			console.log(body.Meta.DataModel + " was received");

			sendMedia(appointment);
		})
	});
}


function sendMedia(appointment) {
	getAuthToken(function (token) {
		var options = {
			url: 'https://api.redoxengine.com/endpoint',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			json: true
		};

		options.body = {
			"Meta": {
				"DataModel": "Media",
				"EventType": "New",
				"EventDateTime": "2017-07-26T04:51:21.918Z",
				"Test": true,
				"Destinations": [
					{
						"ID": "af394f14-b34a-464f-8d24-895f370af4c9",
						"Name": "Redox EMR"
					}
				],
				"FacilityCode": null
			},
			"Patient": {
				"Identifiers": appointment.PatientIdentifiers
			},
			"Media": {
				"FileType": "JPG",
				"FileName": "SampleImage",
				"FileContents": "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",
				"DocumentType": "Sample Image",
				"DocumentID": "b169923c-42g9-4fe3-91hg-8ckf1094e90l",
				"CreationDateTime": "2017-06-22T19:30:04.387Z",
				"ServiceDateTime": "2017-06-22T17:00:00.387Z",
				"Provider": {
					"ID": appointment.ProviderID
				},
				"Authenticated": "False",
				"Availability": "Available"
			}
		};

		request.post(options, function (err, response, body) {
			console.log('Media:');
			console.log(err);
			console.log(response.statusCode);
			console.log(body);
		});
	})
}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//Some SSO experiment, work in progress.
	//See: https://developer.redoxengine.com/questions-and-answers/redox-sso-data-model-hood/
	//First, create a Redox destination, Method=SSO, Format=JSON
	//The endpoint must be able to receive and process JSON Web Token (see Redox Destination > Dev Tools > Data Model SSO).
	//Steps:
	// 1- receive POST request from Redox
	// 2- verify JSON Web Token signature. If fails, return 403 (Invalid signature)
	// 3- verify that token is not expired. If fails, return 403 (Token expired)
	//From there, 2 options: either redirect to the right URL that will verify the user credentials, or verify user credentials before redirecting to the right URL
	// 4- respond with 302 and "Location: " set to the redirect URL
	//
	//To test, go to your Redox Destination > DevTools > send a JWT to the endpoint below
	// The request sent will contain a signed JWT as header and a Redox Data Model as body

	const jwt = require("jsonwebtoken");
	//Secret used to sign the JWT. Algo used: HMAC SHA256. the token will be sent in the header: "Authorization: Bearer <token>"
	const SSO_SECRET = "AoU3ZFudcFPTztyOzMKfJE39vMfXHgHx0B5unQQRphxdnKyZ3A9Y8JaJY3gN19ZDxmFQPuCU";

	
	// /!\ Having issues in Redox DevTools interface: seems that the call is not being sent to this endpoint... with javascript error (code 500)
	//URL to perform JWT verification and redirection.
	app.post('/sso', function (req, res) {
		console.log('SSO request coming in:');
		console.log('----------------------');
		console.log('Headers:');
		console.log(util.inspect(req.headers));
		console.log('Body:');
		console.log(util.inspect(req.body));

		//Step 1: verify JWT signature
		//Step 2: verify token not expired
		var payload;
		try {
			// Parse the JWT string and store the result in `payload`.
			// Note that we are passing the key in this method as well. This method will throw an error
			// if the token is invalid (if it has expired according to the expiry time we set on sign in),
			// or if the signature does not match
			//Note: I'm not sure verify does also check the expiration --> should be double checked and otherwise verified later 
			//      ie. check the timestamp in "exp" field and ensure that it's not going to expire within 30 sec, for example
			//const nowUnixSeconds = Math.round(Number(new Date()) / 1000)
			//if (payload.exp - nowUnixSeconds < 30) {
			//	return res.status(401).end()
			//}
			//Alternatively, HTTP status returned could be 418 "I’m a teapot" ;)
			payload = jwt.verify(req.headers.authorization.split(' ')[1], SSO_SECRET)
		} catch (e) {
			if (e instanceof jwt.JsonWebTokenError) {
				// if the error thrown is because the JWT is unauthorized, return a 403 error
				return res.status(403).end();
			}
			// otherwise, return a bad request error
			return res.status(400).end();
		}

		//Step 4: return a 302 redirection once checks done.
		//Must pass the Data Model in body (contain the HCP info) in some way...
		res.redirect('/ssohappy');
	});

	app.get('/ssohappy', function (req, res) {
		res.send("JWT verified, redirection done, SSO happy ;)");
	});

	//if SSO error
	app.get('/ssoerror', function (req, res) {
		console.log('SSO Error!');
		console.log('----------');
		console.log(util.inspect(req.body));
		res.send("SSO unhappy :(");
	});
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	//////////////////////////////////////FHIR experiment///////////////////////////////////////////////////////////////////
	//Some experiment started with R^FHIR API, but documentation seems scarce in Redox doc
	//And Redox team didn't advise to use R^FHIR and use their Data Models instead...
	var SOURCE_API_KEY_FHIR = 'f9fe9736-d252-4c68-bfc9-921a3dcd4883';
	var SOURCE_SECRET_FHIR = 'axoJzfQSCFYVtZ7kZAjblrLYYGXOftQC1NNiD7Tiv5VEjdglrSCwiQzkBDGOMrRQ1ecQ95Ov';
	app.get('/patientsearchfhir', function (req, res) {
		//Used to validate destination in Redox: must return the challenge value sent by Redox in the GET
		if (req.headers['verification-token'] === DESTINATION_VERIFICATION_TOKEN) {
			console.log('verification-token matched!');
			return res.send(req.query.challenge);
		}

		var patientId = req.query.id
		var IDType = 'MR';
		var patientDemographics = getPatientFhir(patientId, IDType)
		res.sendStatus(200)
	});
	function getAuthTokenFhir(callback) {
		if (authToken && Date.now() < new Date(authTokenExpires).getTime()) {
			return callback(authToken);
		} else {
			//get new token

			var options = {
				url: 'https://api.redoxengine.com/auth/authenticate',
				method: 'POST',
				body: {
					apiKey: SOURCE_API_KEY_FHIR,
					secret: SOURCE_SECRET_FHIR
				},
				headers: {
					'Content-Type': 'application/json'
				},
				json: true
			};

			request.post(options, function (err, response, body) {
				//console.log('Step 1, getting AccessToken:'+ body);

				authToken = body.accessToken;
				authTokenExpires = body.expires;

				callback(authToken);
			});
		}
	}

	function getPatientFhir(id, idtype) {
		console.log('Searching patient ' + idtype + '=' + util.inspect(id));
		getAuthToken(function (token) {
			var options = {
				url: 'https://api.redoxengine.com/fhir/$process-message',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + token
				},
				json: true
			};

			options.body = {
				"Meta": {
					"DataModel": "PatientSearch",
					"EventType": "Query",
					"EventDateTime": "2017-07-26T04:46:01.868Z",
					"Test": true,
					"Destinations": [
						{
							"ID": "0f4bd1d1-451d-4351-8cfd-b767d1b488d6",
							"Name": "Patient Search Endpoint"
						}
					]
				},
				"Patient": {
					"Identifiers": [
						{
							"ID": id,
							"IDType": idtype
						}
					]

				}
			};

			request.post(options, function (err, response, body) {
				console.log('RESPONSE:');
				console.log('Patient info:');
				console.log('Errors: ' + err);
				console.log('Status code: ' + response.statusCode);
				console.log('errors in body: ' + util.inspect(body.Meta.Errors));
				console.log(body.Patient.Demographics);
				return body.Patient.Demographics;
			})
		});
	}
	//////////////////////////////////////End of FHIR experiment///////////////////////////////////////////////////////////////////