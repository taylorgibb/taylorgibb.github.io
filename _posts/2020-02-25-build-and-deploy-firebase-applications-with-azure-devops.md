---
layout: post
title: Build + Deploy Firebase Apps with Azure DevOps
updated: 2018-08-25 18:12
comments: true
published: false
---

I am a big fan of continuous integration and have historically used Gitlab to achieve this for my personal projects. A few of
these projects are mirrored to my GitHub, but the building of the software is all done with Gitlab agents. These agents
run on a virtual machine in Azure. I have to keep this machine up to date, and for simplicity it is always running which costs
me a few dollars each month. In an ideal world, my builds would be cheaper and the maintenance would be non-existent.

There has been a lot of talk around Azure DevOps in my world lately, so i thought i would give it a bash. I have recently been
working on a project that hasn't found its source control home, so i thought it would be the perfect opportunity to kick the tyres on DevOps. 
The project in question happens to be an Ionic project that uses Google Firebase. It uses Firebase Hosting, Firebase Functions as well as the 
Firebase Database which we will have to keep in mind when designing our pipelines.

In a nut shell, here is what we need to do:

* npm install to restore all dependencies for the project
* globally npm install Cordova and Ionic
* add browser platform support to the Ionic project
* build the project using the Ionic cli 
* copy some files to the artifact staging directory
* publish the artifacts
