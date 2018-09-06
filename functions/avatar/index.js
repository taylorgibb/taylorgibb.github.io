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
                 .resize(300, 300)
                 image.write('preview.png')

            var twitter = new Twit({
                "consumer_key": 'YdjYSC0X7zRYM2ChkmIEaQ',
                "consumer_secret": 'XmdyEH69ztkTX61uprwjipvqlNBUP9doDBn1OFUJc',
                "access_token": '217000716-1qrBcC2Wu6h5KxNd2qfkK5tV6W8MTCn8gFOIblWD',
                "access_token_secret": 'e8h3gMlxARwgN1NYU9FS1YuapMVD2b7AmUqSKs0RWh02v'
            });

             var imageBase64 = fs.readFileSync('preview2.png', {encoding: 'base64'});
            twitter.post('account/update_profile_image', {image: imageBase64}, function (error, data) {

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