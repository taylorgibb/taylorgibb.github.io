---
title: Azure Functions + Container Instances
updated: 2018-08-16 18:12
---

We have a node.js application that does some short-lived work and for years we have used crontab to execute the application on a schedule. This would run until termination and then the machine would wait for crontab to start the process all over again. Recently, we got an urge to fix this and started looking at Docker. Im sure everyone knows what Docker is, so lets cut to the chase. There were a few things that crossed my mind:

* We could rent a VM and install Docker and use crontab to run the container on a schedule
* We could have an always running Docker container on ACI and use crontab inside the container
* We could have a time based Azure function that creates a container on demand 

We ended up going with the last approach based on the costing shown in this [Azure Pricing Calculator estimate](https://azure.com/e/38ccb2b0d20b48358113517def97cdb6) that we put together. The virtual machine, which is an Azure A0 instance weighs in at 0.75.GBs of RAM and sports a single Intel Xeon E5-2630 v3 core with a price tag of $19.74 per month. Option two: running an always on contaniner as an Azure Conatiner Instance with 1GB of RAM and 1 vCPU would set us back $51.84, with the last option of using Azure Functions to provision and delete the containers on the same spec hardware coming in at $12.96 per month. Azure Container Instances have a significant advantage over using a virtual machine for this short-lived work, and that is that container instances are billed per second, while virtual machines are rounded up to the nearest hour.

#### Container

The first thing we need to do is actually containerize the application, which is ridiculously easy. We can start with an open source base image that already had node and python configured and craft the following `Dockerfile`.

```ruby
FROM beevelop/nodejs-python:latest
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD node src/index.js
```

Next we need to build the Docker image and push it into a private Docker Hub repository.

```bash
docker run -t taylorgibb/simple-sync
docker push taylorgibb/simple-sync
```

### Creating a Service Principal

We are going to want this function to run under its own service prinicipal. So the first thing we need to do is register a new application and service prinicipal with the appropriate permissions. To do this, we will two things, [openssl](http://gnuwin32.sourceforge.net/packages/openssl.htm) and the [Azure cli tools.](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) 

First up, we need to generate a good `secret`, openssl is a useful tool to use for this.

```bash
openssl rand -base64 24
```

We then need to use that create our application in Azure Active Directory.

```bash
az ad app create --display-name simple-sync
                 --homepage http://developerhut.co.za
                 --identifier-uris http://developerhut.co.za
                 --password $SECRET
```

This will retun an `application identifier` to us, which we can use to create the service principal.

```bash
az ad create --id $APPLICATION_ID
```

The last step is creating a resource group and assigning a role to our newly created service principal. The `az account list` command will give us the subscription ID we need to do the role assignmentace.

```bash
az group create --location westus 
                --name simple-sync

az account list

az role assignment create --assignee http://developerhut.co.za
                          --role Contributor 
                          --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/simple-sync
```

That was a lot of effort. Nevertheless, we now have a service principal that is constrained to the bounds of our resource group. In addition to better security, we also get better billing and peace of mind.

### The Functions

Next we needed to write an Azure function that could spawn us one of these containers on request. We had never written an Azure function before, but a few searches later and we were installing the [Azure Function Core Tools](https://github.com/Azure/azure-functions-core-tools)

```bash
npm install -g azure-function-core-tools
```

Once we have the tools installed, we need to create a new Function App and then create the actual function withing the app. We are going to be creating a time based function using the JavaScript language option and will call my function `provision`

```bash
func init -n
func new
func host start
```

We then need to crack open the `index.js` file inside the `provision` directory and replace the boiler plate code with our own. Our container is hosted in a Docker Hub registry, so you will notice us pass in a `imageRegistryCredentials` parameter so that Azure knows where to get our container from.

```javascript
module.exports = function (context) {
    const AZ = require('ms-rest-azure');
    const ACI = require('azure-arm-containerinstance');

    AZ.loginWithServicePrincipalSecret(
        process.env.AZURE_CLIENT_ID,
        process.env.AZURE_CLIENT_SECRET,
        process.env.AZURE_TENANT_ID,
        (err, credentials) => {
            if (err) {
                throw err;
        }
        let client = new ACI(credentials, process.env.AZURE_SUBSCRIPTION_ID);
        client.containerGroups.createOrUpdate('simple', 'simple-containers', {
            containers: [container],
            osType: 'Linux',
            location: 'West Europe',
            restartPolicy: 'never',
            imageRegistryCredentials: [{
                "server": "index.docker.io",
                "username": process.env.DOCKER_USERNAME,
                "password": process.env.DOCKER_PASSWORD}]
        }).then((r) => {
            context.done();
        }).catch((r) => {
            context.done();
        });
    });   
 };
```

We also need to run `npm init` in the `provision` folder so that npm will generate us a `package.json` file. We can then added the two dependencies you see above. 

```
npm install --save azure-arm-containerinstance
npm install --save ms-rest-azure
```

We also need to edit the cron expression in the `function.json` file. We tried a couple of online cron expression generators, but Azure didnt like the expression they generated. I found [this](https://codehollow.com/2017/02/azure-functions-time-trigger-cron-cheat-sheet) article very useful for crafting expressions. After modification, the trigger was set to fire daily, and looked as follows:

```javascript
{
  "disabled": false,
  "bindings": [
    {
      "name": "startTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 0 * * *"
    }
  ]
}
```

We now need to follow the above steps and create another function called `delete`. Just as above, we will have to run `npm init` to initialize the project and then install the required modules via `npm` with the `--save` flag.  The contents of the function is below,

```javascript
module.exports = function (context) {
    const ACI   = require('azure-arm-containerinstance');
    const AZ    = require('ms-rest-azure');

    AZ.loginWithServicePrincipalSecret(
        process.env.AZURE_CLIENT_ID,
        process.env.AZURE_CLIENT_SECRET,
        process.env.AZURE_TENANT_ID,
        (err, credentials) => {
            if (err) {
                throw err;
            }
            let client = new ACI(credentials, process.env.AZURE_SUBSCRIPTION_ID);
            client.containerGroups.deleteMethod('karocki', 'karocki-containers').then((r) => {
                context.log('Delete completed', r);
            });
    });
};
```

The `delete` function only needs to get executed 6 hours after the `provision` function has started the container, so it has a slightly different `function.json` definition too.

```javascript
{
  "disabled": false,
  "bindings": [
    {
      "name": "endTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 6 * * *"
    }
  ]
}
```



Lastly will notice a bunch of environment variables in the above script, these are things that we dont want commited to source control. We can declare them in a special file called `local.settings.json` which lives in the root of your function app. This file is in the function apps `.gitignore` file by default and wont be commited to source control. Our `local.settings.json` looks like this, slightly edited to remove sensitive information.

```javascript
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "AZURE_CLIENT_ID": "fghd04aa-490c-4323-932g9-3374ba37b96a",
    "AZURE_CLIENT_SECRET": "Zm/AI5cYyWSdyZoS6",
    "AZURE_TENANT_ID": "ccf08dsdas-asddas-asdc-9f11e490d18f",
    "AZURE_SUBSCRIPTION_ID": "12f88basdas33-asdas-13e-sadsdddd",
    "DOCKER_USERNAME": "whoami",
    "DOCKER_PASSWORD": "whatisthisdockerthing"  
  },
  "ConnectionStrings": {
    
  }
}
```
