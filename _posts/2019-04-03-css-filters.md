---
layout: post
title: CSS Filters
updated: 2019-04-04 18:12
comments: true
---

Last year i decided i was going to write a little application that allowed people to change certain properties pertaining to my Twitter profile picture. With the introduction of CSS Filters, and in particular the `hue-rotate` function, i thought this was going to be a fairly trivial task. My plan was to use a combination of the `hue-rotate` and `rotate` CSS capabilities to manipulate an avatar on a webpage, and then submit the data to an Azure function that would in turn manipulate a raw copy of the image before publishing it to Twitter. The problem i quickly ran into is that the `hue-rotate` CSS Filter uses linear matrix approximation in the RGB colour space to perform the hue rotation and doesnt actually convert the values into HSV or HSL. This effectively meant that when i applied the same filter values using a server side image manipulation library i got completely different results, which my friends were quick to point out. 

You can see how bad it really gets in this [StackOverflow question](https://stackoverflow.com/questions/19187905/why-doesnt-hue-rotation-by-180deg-and-180deg-yield-the-original-color) where a user kindly does a manual comparison and visual demonstration of the differences.

#### Client Side

On the client side i have two sliders, rotation is pretty straight forward so i am not going to get into that. What i want to show you is the approach i ended up using to adjust the hue of the image. The first things i needed to do was to include the [Pixastic](https://github.com/jseidelin/pixastic) library. Once that was done i dropped the image and canvas onto a page.

```html
<canvas id="output-canvas"></canvas>
<img style="display: none" id="avatar" src="/assets/avatar.png">
```

I also needed a way to adjust the value of the hue. Hue is typically expressed on a color wheel with values from `0` to `360` degrees. 

```html
<div class="toggle">
    <label>Hue</label>
    <input class="slider" id="hue" type="range" min="0" max="360" /> 
</div>
```

From there i attached an event handler that converted the values and scaled them to a value between `-1` and `1` which Pixastic required.

```javascript
$('#hue').on('change', function(){
    options["hue"] = parseInt($(this).val(), 10) / 360;
    update();
});
```

Most of the magic takes place in the update method you see above. This is executed every time you change the value of a slider and does the following:

 * Hides the image and the canvas
 * Sets the dimensions of the canvas
 * Draws the original image to the canvas
 * Processes the Pixastic effects

```javascript
function update(){
    var img = document.getElementById("avatar"),
        canvas = document.getElementById("output-canvas"),
        ctx = canvas.getContext("2d");

    canvas.style.display = "none";
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    Px = new Pixastic(ctx);
    Px["hsl"](options).done(function() {
        canvas.style.display = "block";
    };
}
```

Once you are done and you click upload, the values from the sliders are submitted to an Azure function.

#### Server Side

I decided to give it another go this afternoon with great results. Ultimately i ended up using [Jimp](https://github.com/oliver-moran/jimp) on the server and [Pixastic](https://github.com/jseidelin/pixastic) on the client side. The source code for the web page can be found over [here](https://github.com/taylorgibb/taylorgibb.github.io/blob/master/lab/avatar.md), and the code for the function lives [here](https://github.com/taylorgibb/taylorgibb.github.io/blob/master/functions/avatar/index.js). If you feel the need, you can even head over to [my lab and change the picture yourself](https://www.taylorgibb.com/lab/avatar.html). 
