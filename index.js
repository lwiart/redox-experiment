/*
Summary: in the following, there are examples of querying Redox sandbox to:
- Fetch patient demographic info from MRN (Medical Record Number)
- Push a PDF file to EHR

Some experiments were started but not finished:
- SSO: "EHR launch",ie. HCP is in EHR and wants to connect to an external app without having to reauthenticate into the app
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
	//Used to validate destination in Redox: must return the challenge value sent by Redox in the GET
	// if (req.headers['verification-token'] === DESTINATION_VERIFICATION_TOKEN) {
	// 	console.log('verification-token matched!');
	// 	return res.send(req.query.challenge);
	// }

	//Call getPatientDemographics with patient ID (req.query.id) being searched and type of ID = 'MR' (medical record number)
	var body;
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

//The following allows to verify the POST connection when destination is being created in Redox dashboard
//It also allows to get Appointment information for a patient and store it into the local json DB (example from Tom): watch the video, and see how to use the DevTools to send Appointment info
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

//Craft the Redox Data Model to query patient by MRN
//And call Redox API
function getPatientDemographics(id, idtype) {

}

function sendPdf() {
	//TODO: Destination dev tools: Data Model Media > New
	//Example: send PDF for patient Timothy, provider=Pat Granite
	/*
	{
	"Meta": {
		"DataModel": "Media",
		"EventType": "New",
		"EventDateTime": "2020-05-22T01:48:36.263Z",
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
			},
			{
				"ID": "e167267c-16c9-4fe3-96ae-9cff5703e90a",
				"IDType": "EHRID"
			},
			{
				"ID": "a1d4ee8aba494ca",
				"IDType": "NIST"
			}
		],
		"Demographics": {
			"FirstName": "Timothy",
			"MiddleName": "Paul",
			"LastName": "Bixby",
			"DOB": "2008-01-06",
			"SSN": "101-01-0001",
			"Sex": "Male",
			"Race": "White",
			"IsHispanic": null,
			"MaritalStatus": "Married",
			"IsDeceased": null,
			"DeathDateTime": null,
			"PhoneNumber": {
				"Home": "+18088675301",
				"Office": null,
				"Mobile": null
			},
			"EmailAddresses": [],
			"Language": "en",
			"Citizenship": [],
			"Address": {
				"StreetAddress": "4762 Hickory Street",
				"City": "Monroe",
				"State": "WI",
				"ZIP": "53566",
				"County": "Green",
				"Country": "US"
			}
		},
		"Notes": []
	},
	"Visit": {
		"VisitNumber": "1234",
		"AccountNumber": null
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
			"IDType": "NPI",
			"FirstName": "Pat",
			"LastName": "Granite",
			"Credentials": [
				"MD"
			],
			"Address": {
				"StreetAddress": "123 Main St.",
				"City": "Madison",
				"State": "WI",
				"ZIP": "53703",
				"County": "Dane",
				"Country": "USA"
			},
			"EmailAddresses": [],
			"PhoneNumber": {
				"Office": "+16085551234"
			},
			"Location": {
				"Type": null,
				"Facility": null,
				"Department": null,
				"Room": null
			}
		},
		"Authenticated": "False",
		"Authenticator": {
			"ID": null,
			"IDType": null,
			"FirstName": null,
			"LastName": null,
			"Credentials": [],
			"Address": {
				"StreetAddress": null,
				"City": null,
				"State": null,
				"ZIP": null,
				"County": null,
				"Country": null
			},
			"EmailAddresses": [],
			"PhoneNumber": {
				"Office": null
			},
			"Location": {
				"Type": null,
				"Facility": null,
				"Department": null,
				"Room": null
			}
		},
		"Availability": "Unavailable",
		"Notifications": [
			{
				"ID": "2434534567",
				"IDType": "NPI",
				"FirstName": "Sharon",
				"LastName": "Chalk",
				"Credentials": [
					"MD",
					"PhD"
				],
				"Address": {
					"StreetAddress": "312 Maple Dr. Suite 400",
					"City": "Verona",
					"State": "WI",
					"ZIP": "53593",
					"County": "Dane",
					"Country": "USA"
				},
				"EmailAddresses": [],
				"PhoneNumber": {
					"Office": "+16085559999"
				},
				"Location": {
					"Type": null,
					"Facility": null,
					"Department": null,
					"Room": null
				}
			},
			{
				"ID": "8263749385",
				"IDType": "NPI",
				"FirstName": "Jim",
				"LastName": "Mica",
				"Credentials": [
					"RN"
				],
				"Address": {
					"StreetAddress": "5235 Kennedy Ave.",
					"City": "Creve Cour",
					"State": "MO",
					"ZIP": "63141",
					"County": "Saint Louis",
					"Country": "USA"
				},
				"EmailAddresses": [],
				"PhoneNumber": {
					"Office": "+13145557777"
				},
				"Location": {
					"Type": null,
					"Facility": null,
					"Department": null,
					"Room": null
				}
			}
		]
	}
}
	*/ 

}

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

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//Some SSO experiment, work in progress.
	//The endpoint must be able to receive and process JSON Web Token (see Redox Destination > Dev Tools > Data Model SSO).

	app.get('/sso', function (req, res) {
		console.log('SSO request coming in:');
		console.log('----------------------');
		console.log(util.inspect(req.body));

		//must return a 301 once adhoc checks done
		res.sendStatus(200)
	});

	//if SSO error
	app.get('/ssoerror', function (req, res) {
		console.log('SSO Error!');
		console.log('----------');
		console.log(util.inspect(req.body));

		res.sendStatus(401)
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

}