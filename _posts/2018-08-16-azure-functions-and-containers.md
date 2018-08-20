---
title: Azure Functions + Container Instances
updated: 2018-08-16 18:12
comments: true
---

I have a node.js application that does some short-lived work and for years i have used crontab to execute the application on a schedule. This would run the application until termination and then the machine would wait for crontab to start the process all over again. Recently, i got an urge to fix this and started looking at Docker. Im sure everyone knows what Docker is, so im going to cut to the chase. There were a few things that crossed my mind:

* I could rent a VM and install Docker and use cron to run the container on a schedule
* I could have an always running Docker container on ACI and use cron inside the container
* I could have a time based Azure function that creates and deletes containers on demand 

I ended up going with the last approach based on the costing shown in this [Azure Pricing Calculator estimate](https://azure.com/e/38ccb2b0d20b48358113517def97cdb6) that i put together. In terms of pricing, the virtual machine, which is an Azure A0 instance weighs in at 0.75.GBs of RAM and sports a single Intel Xeon E5-2630 v3 core with a price tag of $19.74 per month. Option two: running an always on container as an Azure Container Instance with 1GB of RAM and 1 vCPU would set us back $51.84 per month, with the last option of using Azure Functions to create and delete the containers on the same spec hardware coming in at $12.96 per month. It's also worth noting that Virtual Machines are billed per hour, while Azure Container Instances are billed per second. 

#### Container

The first thing i needed to do is actually containerize the application, which was ridiculously easy. We can start with an open source base image that already had node and python configured and craft the following `Dockerfile`. Everyone's `Dockerfile` is going to look different, but nevertheless, this is what it took to containerize my application.

```ruby
FROM beevelop/nodejs-python:latest
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD node src/index.js
```

Next i needed to build the Docker image and push it into a private Docker Hub repository.

```bash
docker run -t taylorgibb/simple-sync
docker push taylorgibb/simple-sync
```

### Creating a Service Principal

I needed this function to run under its own service principal. So the first thing i had to do was register a new application and service principal with the appropriate permissions. To do this, i needed two things, [openssl](http://gnuwin32.sourceforge.net/packages/openssl.htm)and the [Azure cli tools.](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) 

First we needed to generate a good `secret` to start with, openssl proved to be a useful tool to use for this.

```bash
openssl rand -base64 24
```

Now i can register my application in Azure Active Directory.

```bash
az ad app create --display-name simple-sync
                 --homepage http://developerhut.co.za
                 --identifier-uris http://developerhut.co.za
                 --password $SECRET
```
This returned an `application identifier` to me, which i used to create the service principal.

```bash
az ad create --id $APPLICATION_ID
```

The last step was creating a resource group and assigning a role to my newly created service principal. The `az account list` command will give me the subscription ID i need to do the role assignment.

```bash
az group create --location westeurope
                --name simple-sync

az account list

az role assignment create --assignee http://developerhut.co.za
                          --role Contributor 
                          --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/simple-sync
```

That was a lot of effort. Nevertheless, i now have a service principal that is constrained to the bounds of my resource group. In addition to better security, we also get better billing and peace of mind.

### The Functions

Next we needed to write a couple of Azure functions that coud create and delete our containers on a schedule. I had never written an Azure function before, but a few searches later and i was installing the [Azure Function Core Tools](https://github.com/Azure/azure-functions-core-tools)

```bash
npm install -g azure-function-core-tools
```

Once i had the tools installed, i needed to create a new Function App and then create the actual functions within the app. I am going to be creating a time based function using the JavaScript language option and will call my function `provision`, this is the first of the two functions i will create.

```bash
func init simple-functions
func new
func host start
```

I then needed to crack open the `index.js` file inside the `provision` directory and replace the boilerplate code with our own. My container is hosted in the Docker Hub registry, so you will notice that i pass in a `imageRegistryCredentials` parameter so that Azure knows where to get our container from. I am creating a Linux container in West Europe but the function is easy enough to change.

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

Next, i needed to run `npm init` in the `provision` folder so that npm would generate a `package.json` file. I could then added the two dependencies you see in the above code. 

```
npm install --save azure-arm-containerinstance
npm install --save ms-rest-azure
```

I also needed to edit the cron expression in the `function.json` file. I tried a couple of online cron expression generators, but Azure didn't like the expressions that they generated. I found [this](https://codehollow.com/2017/02/azure-functions-time-trigger-cron-cheat-sheet) article very useful for crafting expressions. After modification, the trigger was set to fire daily, and looked as follows:

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

Finally, i follow the above steps again and create another function called `delete`. Just as above, i had to run `npm init` to initialize the project and then install the required modules via `npm` with the `--save` flag.  The contents of the `delete` function is below.

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
            client.containerGroups.deleteMethod('simple', 'simple-containers').then((r) => {
                context.log('Delete completed', r);
            });
    });
};
```

I only wanted the  `delete` function to get executed 6 hours after the `provision` function had started the container, so it has a slightly different `function.json` definition too.

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

At this point, i committed my code to a private Github repository

```bash
az storage account create --name simplestorage --location westeurope --resource-group simple-sync --sku Standard_LRS

az functionapp create --deployment-source-url https://github.com/taylorgibb/simple-sync
                      --resource-group simple-sync 
                      --consumption-plan-location westeurope 
                      --name simple-functions
                      --storage-account simplestorage
```


In the two functions above, i use environment variables to keep sensitive information from being committed to source control. By definition, environment variables, are configured in the environment itself and that means we need to add a few more things to Azure. The settings i added were generated in the first part of the article on creating a service principal, along with some fake Docker Hub credentials. It goes without saying that these values will need to be substituted with your own if you are following along. 

```bash
az functionapp config appsettings set --name simple-functions
                                      --resource-group simple
                                      --settings AZURE_CLIENT_ID=XXX 
                                                 AZURE_CLIENT_SECRET=XXX
                                                 AZURE_TENANT_ID=XXX
                                                 AZURE_SUBSCRIPTION_ID=XXX 
                                                 DOCKER_USERNAME=XXX 
                                                 DOCKER_PASSWORD=XXX 
```

Now that all my config is complete, i used some nifty helper methods to mirror it onto my local machine so that i could test the functions locally in the future if i need to. When we run the below, it pulls all the settings into a special file called `local.settings.json` which lives in the root of your function app. The `local.settings.json` file is in the `.gitignore` by default and wont be committed to source control, keeping all your secrets safe.

```bash
func azure functionapp fetch-app-settings simple-functions
```

Thats pretty much all there was to it. At this point, i logged into the Azure portal and manually ran the `provision` function and verified that it created a new container instance, i then ran the `delete` function and ensured the container instance was removed. I ran into a couple of issues while making this, most notably with the Azure Function Core Tools there is a bug that prevents you from publishing functions from the command line if your function contains a `node_modules` folder. You can read more about that over [here](https://github.com/Azure/azure-functions-core-tools/issues/352). 
