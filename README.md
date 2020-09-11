# Introduction

Some quick and dirty code in a couple of days to experiment with Redox Data Model API for connection to EMRs (fetch patient demographics from medical record number, and sending a PDF report to patient's file in the EHR).  
It is based on a very nice example from Tom Jessessky's 15 min video demoing the Redox API and Dev Tools: [watch the video](https://www.youtube.com/watch?v=4_CURkT_fCo) 

## Installation
You will need a node.js server to run the code. 

### Pre-Requisites
- [NodeJS](https://nodejs.org) and NPM installed

Clone this repository to your environment, and run the following command to install the npm packages required:
```
npm install
```

## Starting the App
To start the app, simply run
```
node index.js
```  

## Setup
You must create a Source (EHR endpoints that will receive you calls) and a Destination (your endpoints that will receive calls) in your Redox dashboard.

- Sign up for a developer account at https://www.redoxengine.com/
- Create a Destination in Redox dashboard (will be your server endpoint for calling Redox APIs)
  - Method=Redox API / Format=JSON
  - Set the endpoint (your server endpoint) 
  - Set the verification token (just a secret you put in your code: DESTINATION_VERIFICATION_TOKEN)
  - Verification method can be set to GET ou POST (the code allows to verify with both) 
  - Now check that the connection is OK by clicking "Verify and Save" --> should be "Success!"
- With that destination, you can receive any kind of patient data that Redox offers in its DevTools (in the code, there are examples to receive appointments and store them in a local JSON DB)

- Create a Source for the "get patient demographics from her Medical Record Number" and "send PDF report" use cases
  - Communication method = Redox API / Data format = JSON
  - Take note of the API key
  - Generate a Source Secret and take note of it

- Put in the index.js code the previously noted SOURCE_API_KEY and SOURCE_SECRET

## Getting patient demographics from Medical Record Number
Redox API allows to search patient by a variety of identifiers, such as MRN. See https://developer.redoxengine.com/data-models/PatientSearch.html.  

- Now, you can search patient by Medical Record Number, by using the following URL: **http://&lt;your IP address or domain name&gt;/patientsearch?id=&lt;the patient MRN&gt;**.  Here are some Redox patient MRN examples:
  - Timothy Bixby: 0000000001
  - Barbara Bixby: 0000000002
  - Walter Carthwright: 0000000003
- You should get the JSON response containing the patient demographics (name, address, DoB, etc)

### Sending PDF report
Redox API allows to send media such as PDF, JPG, PNG, etc. See https://developer.redoxengine.com/questions-and-answers/understanding-redox-media-data-model/  
Note: for files under 200kb, they can be sent directly through the API. For files bigger than 200kb, they first need to be uploaded to the Redox blob endpoint, which will synchronously return the file URI that can then be specified in a Media message.

- Use the following URL: **http://&lt;your IP address or domain name&gt;/sendpdf**
- You should get a success message, and HTTP status 200 in your console ;)

### Hint
Don't forget that for any Data Model you want to craft, you can use **Destinations > your destination > DevTools** in [your Redox dashboard](https://dashboard.redoxengine.com/), then select the Data Model type and event you want.  
Redox will automatically create the Data Model example!
