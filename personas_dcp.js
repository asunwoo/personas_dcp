//const fetch = require('node-fetch');

var token;
var dcpSourceId;
var dcpServiceId;

const dcpBaseURL = 'https://www.optimizelyapis.com/experiment/v1/';
const dcpBaseUpdateURL = 'https://www.optimizelyapis.com/experiment/v1/dcp_datasource_attributes/';
const dcpDataSourcesURL = 'https://www.optimizelyapis.com/experiment/v1/dcp_datasources/' + dcpSourceId + '/' + 'dcp_datasource_attributes';
const dcpBaseUserUpdateURL = 'https://vis.optimizely.com/api/customer_profile/';

const createAttrJSONPayload = '{"name":"%name%","datatype":"%datatype%","description":"%description%"}';
const unarchivePayload = '{"archived":false}';

var attributeMap;
var archivedAttributeMap;

async function fetchDCPAttributes(){
    let dcpAttributes = {
        headers: {
            "Token": token,
            "Content-Type": "application/json"
        },
        method: "GET",
        withCredentials: true,
        credentials: 'include'
    };

    console.log(dcpDataSourcesURL);

    try {
        let response = await fetch(dcpDataSourcesURL, dcpAttributes);
        const data = await response.json();

        attributeMap = new Map();
        archivedAttributeMap = new Map();
        for(var k in data) {
            if (data[k].archived == false) {
                attributeMap.set(data[k].name, data[k].id);
            } else{
                archivedAttributeMap.set(data[k].name, data[k].id);
            }
        }

    } catch(e){
        console.log("ERROR! ", e);
    }
}

async function createDCPAttribute(name, value) {
    // Default options are marked with *
    var url = dcpDataSourcesURL;
    var dataType = typeof value;

    if (dataType == "number"){
        dataType = "long"
    }

    var body = createAttrJSONPayload.replace('%name%', name).replace('%datatype%', dataType).replace('%description%', name);

    let callAttributes = {
        method: 'POST',
        credentials: 'include',
        headers: {
            "Token": token,
            "Content-Type": "application/json"
        },
        body: body, // body data type must match "Content-Type" header
    };

    try {
        let response = await fetch(url, callAttributes);
        if(response.status >= 200 && response.status < 300){
            return true;
        }

    } catch(e){
        console.log("ERROR! ", e);
    }
    return false;
}

async function unarchiveDCPAttribute(attributeId) {
    // Default options are marked with *
    var url = dcpBaseUpdateURL + attributeId;

    let callAttributes = {
        method: 'PUT',
        credentials: 'include',
        headers: {
            "Token": token,
            "Content-Type": "application/json"
        },
        body: unarchivePayload,
    }

    try {
        let response = await fetch(url, callAttributes);
        if(response.status >= 200 && response.status < 300){
            return true;
        }

    } catch(e){
        console.log("ERROR! ", e);
    }
    return false;
}

async function checkExistingAttributes(attributeName, attributeValue){
    var response;
    if(!attributeMap.has(attributeName)){
        if(archivedAttributeMap.has(attributeName)){
            response = await unarchiveDCPAttribute(archivedAttributeMap.get(attributeName));
        } else {
            response = await createDCPAttribute(attributeName, attributeValue);
        }
    }
    return response
}

async function updateDCPUser(dcpServiceId, dcpSourceId, userId, jsonPayload) {

    var url = dcpBaseUserUpdateURL + dcpServiceId + '/' + dcpSourceId + '/%22' + userId + '%22';

    let callAttributes = {
        method: 'POST',
        credentials: 'include',
        headers: {
            "Token": token,
            "Content-Type": "application/json"
        },
        body: jsonPayload, // body data type must match "Content-Type" header
    };
    try {
        let response = await fetch(url, callAttributes);
        console.log(response, response.status);
        if(response.status >= 200 && response.status < 300){
            return true;
        }

    } catch(e){
        console.log("ERROR! ", e);
    }
    return false;
}

function createUpdateUserPayload(event){
    var payload = {"data":{}};
    for(var k in event.traits) {
        payload.data[k] = event.traits[k];
    }

    payloadString = JSON.stringify(payload);
    console.log(payloadString);
    return payloadString;
}

function printResults(){
    console.log('Live');
    attributeMap.forEach(function(value, key) {
        console.log(key + ' = ' + value);
    });
    console.log('Archived');
    archivedAttributeMap.forEach(function(value, key) {
        console.log(key + ' = ' + value);
    });
}

// identify demonstrates how to filter event data, e.g. for removing PII
// and how to enrich data using fetch
async function identify(event, settings) {
    token = settings.apiKey;
    dcpSourceId = settings.dcpDatasourceId;
    dcpServiceId = settings.dcpServiceId;

    userId = event.anonymousId;

    try{
        await fetchDCPAttributes();
    }catch(e){
        console.log('ERROR Fetching existing DCP Attributes', e);
    }


    try{
        for(var k in event.traits) {
            await checkExistingAttributes(k, event.traits[k]);
        }

    }catch(e){
        console.log('ERROR Checking existing DCP Attributes', e);
    }

    return await updateDCPUser(dcpServiceId, dcpSourceId, userId, createUpdateUserPayload(event))
}

// group demonstrates how to handle an invalid event
async function group(event, settings) {
    if (!event.company) {
        throw new InvalidEventPayload("company is required")
    }
}

// page demonstrates how to handle an invalid setting
async function page(event, settings) {
    if (!settings.accountId) {
        throw new ValidationError("Account ID is required")
    }
}

// alias demonstrats how to handle an event that isn't supported
async function alias(event, settings) {
    throw new EventNotSupported("alias not supported")
}


// screen demonstrates how to handle an event that isn't supported
async function screen(event, settings) {
    throw new EventNotSupported("screen not supported")
}

// below are custom helper functions
function queryString(params) {
    return Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');
}
