---
title: Disposable Infrastructure on Microsoft Azure
updated: 2018-08-16 18:12
---

I have a node.js application that does some short-lived work and for years i have used crontab to execute the application on a schedule. This would run until termination and then the machine would wait for crontab to start the process all over again. Recently, i got an urge to fix this and started looking at Docker. Im sure everyone knows what Docker is, so im going to cut to the chase, there were a few things that crossed my mind:

* I could rent a VM and install Docker and use crontab to run the container on a schedule
* I could have an always running Docker container on ACI and use crontab inside the conatiner to execute the application
* I could have a timer based Azure function that creates a container on demand 

First up, i needed to actually Dockerize the application, which was ridiculously easy. I started with a base image that already had node and python configured as these were the only dependencies i had.

```ruby
FROM beevelop/nodejs-python:latest
WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
CMD node src/index.js
```

I built the Docker image and pushed it into a private Docker Hub repository, after testing it locally on my machine. 

```bash
docker run -t taylorgibb/simple-sync
```

Next i needed to write an Azure function that could spawn me one of these containers on request. I had never written an Azure function before, but a few searches later and i was installing the (https://github.com/Azure/azure-functions-core-tools)[Azure Function Core Tools]

```bash
npm install -g azure-function-core-tools
```

Once i had the tools installed, i need to create a new Function App and then create the actual function itself. I am going to be creating a TimerTrigger using the JavaScript language option and will call my function `provision`

```bash
func init -n
func new
func host start
```

I then cracked open the `index.js` file inside the `provision` directory and replaced the boiler plate code with my own.

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

I also ran `npm init` in the `provision` folder so that npm will generate me a `package.json` file. I then added the two dependencies you see above. 

```
npm install --save azure-arm-containerinstance
npm install --save ms-rest-azure
```

I also edited the cron expression in my `function.json` file. I tried a couple of online cron expression generators, but Azure didnt like them all. I found (https://codehollow.com/2017/02/azure-functions-time-trigger-cron-cheat-sheet/)[this] article very useful for crafting expressions. After modification, the trigger was set to fire daily, and looked as follows:
```javascript
{
  "disabled": false,
  "bindings": [
    {
      "name": "myTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 0 0 * * *"
    }
  ]
}
```

