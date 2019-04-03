---
layout: post
title: CSS Filters
updated: 2019-04-04 18:12
comments: true
---

Last year i decided i was going to write a little application that allowed people to change certain properties pertaining to my Twitter profile picture. With the introduction of CSS Filters, and in particular the `hue-rotate` function, i thought this was going to be a fairly trivial task. My plan was to use a combination of the `hue-rotate` and `rotate` CSS capabilities to manipulate an avatar on a webpage, and then submit the data to an Azure function that would in turn manipulate a raw copy of the image before publishing it to Twitter. The problem i quickly ran into is that the `hue-rotate` CSS Filter uses linear matrix approximation in the RGB colour space to perform the hue rotation and doesnt actually convert the values into HSV or HSL. This effectively meant that when i applied the same filter values using a server side image manipulation library i got completely different results, which my friends were quick to point out. 

You can read more about that particular issue [here](https://stackoverflow.com/questions/19187905/why-doesnt-hue-rotation-by-180deg-and-180deg-yield-the-original-color).

I decided to give it another go this afternoon with great results. Ultimately i ended up using [Jimp](https://github.com/oliver-moran/jimp) on the server and [Pixastic](https://github.com/jseidelin/pixastic) on the client side. The source code for the web page can be found over [here](https://github.com/taylorgibb/taylorgibb.github.io/blob/master/lab/avatar.md), and the code for the function lives [here](https://github.com/taylorgibb/taylorgibb.github.io/blob/master/functions/avatar/index.js). If you feel the need, you can even head over to [my lab and change the picture yourself](https://www.taylorgibb.com/lab/avatar.html). 