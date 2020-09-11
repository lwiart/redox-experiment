# Introduction

Some quick and dirty code in a couple of days to experiment with Redox Data Model API for connection to EMRs (fetch patient demographic profile with medical record number, sending PDF file).
It is based on a very nice example made by Tom Jessessky with a 15 Minutes Video ([the demo video](https://www.youtube.com/watch?v=4_CURkT_fCo)) for using the Redox API and the Redox Dev Tools. 

## Installation
You will need a server to run the Destination code, but you can run this locally and get the code for your Source working. 

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

You must create in Redox dashboard Sources (EHR endpoints that will receive you calls) and Destinations (your endpoints that will receive calls)

- Sign up for a developer account at https://www.redoxengine.com/
- Create a Destination in Redox dashboard (will be your server endpoint for calling Redox APIs)
  - Method=Redox API / Format=JSON
  - Set the endpoint (your server endpoint) 
  - Set the verification token (just a secret you put in your code: DESTINATION_VERIFICATION_TOKEN)
  - Verification method can be set to GET ou POST (the code allows to verify with both) 
  - Now check that the connection is OK by clicking "Verify and Save" --> should be "Success!"
- With that destination, you can receive any kind of patient data that Redox offers in its DevTools (in the code, there are examples to receive appointments and store them in a local JSON DB)

- Create a Source for the "get patient demographics from her Medical Record Number" and "send PDF report" use cases
  - 





## Examples

### Get patient demographics from her Medical Record Number


### Send PDF report








