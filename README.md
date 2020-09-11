# Introduction

Some quick and dirty code to experiment with Redox Data Model API for connection to EMRs (fetch patient demographic profile with medical record number, sending PDF file).

It is based on a very nice example made by Tom Jessessky with a 15 Minutes Video ([the demo video](https://www.youtube.com/watch?v=4_CURkT_fCo)) for using the Redox API and the Redox Dev Tools. 

## Installation
You will need a server to run the Destination code, but you can run this locally and get the code for your Source working. 

### Pre-Requisites
- [NodeJS](https://nodejs.org) and NPM installed

Clone this repository to your environment, and run the following command to install the npm packages required:
```
npm install
```

## Setup
You need to create sources and destination in Redox:
- Sign up for a developer account at https://www.redoxengine.com/



## Starting the App
To start the app, simply run
```
node index.js
```  
