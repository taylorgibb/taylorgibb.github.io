var Jimp = require('jimp');
var request = require('request');
var Twit = require('twit');
var fs = require('fs');

module.exports = function (context, req) {
    context.log('Starting function...');

    if (true || req.query.hue && req.query.saturation && req.query.brightness && req.query.rotation) {
        var targetHue = req.query.hue || 43 ;
        var targetSaturation = req.query.saturation || 175;
        var targetBrightness = req.query.brightness || 120;
        var targetRotation = req.query.rotation || -14;

        Jimp.read('https://www.taylorgibb.com/assets/avatar.png')
        .then(image => {
            var filters = [
                { apply: 'hue', params: [targetHue] },
                { apply: 'saturate', params: [targetSaturation / 2] },
            ];
    
            if(targetBrightness > 100) {
                filters.push( { apply: 'brighten', params: [100 - targetBrightness] });
            }
            else {
                filters.push( { apply: 'darken', params: [targetBrightness - 100] })
            }
            
            image.color(filters)
                 .rotate(targetRotation > 0 ? -Math.abs(targetRotation) : Math.abs(targetRotation))
                 .resize(400, 400)
                 .write('preview.png')
                 .getBase64(Jimp.MIME_JPEG, (a,b,c)=> {
                    var twitter = new Twit({

                    });
        
                    var imageBase64 = fs.readFileSync('2.png', {encoding: 'base64'});
                    twitter.post('account/update_profile_image', {image: b}, function (error, data) {
        
                        var timestamp = new Date().toISOString();
                        console.log('\nLog: ' + timestamp);
                        if (error) {
                            console.log('Failed to update profile image.');
                            console.log(error);
                        } else {
                            fs.writeFileSync(lastImagePath, newImage);
                            console.log('Wrote last image: ' + newImage);
                            console.log('Updated profile image: ' + data.profile_image_url);
                        }
            
                    });
                 })
            
          
            //image.getBase64("image/png", function(a, b, c) {
             //   console.log(b.substring(0, 200));

               

   
          //  })
        })
        .catch(err => {
            context.log(err);
        });

        context.res = {
            body: "GREAT_SUCCESS"
        };
    }
    else {
        context.res = {
            status: 400,
            body: "BOOM"
        };
    }
    context.done();
};