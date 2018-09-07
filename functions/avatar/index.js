var Jimp = require('jimp');
var request = require('request');
var Twit = require('twit');
var fs = require('fs');

module.exports = function (context, req) {
    var targetHue = req.query.hue || 180;
    var targetSaturation = req.query.saturation || 100;
    var targetBrightness = req.query.brightness || 85;
    var targetRotation = req.query.rotation || 0;

    Jimp.read('avatar.png')
        .then(image => {
            var filters = [
                { apply: 'hue', params: [targetHue] },
                { apply: 'saturate', params: [targetSaturation] }
            ];

            if (targetBrightness > 100) {
                //  filters.push( { apply: 'lighten', params: [Math.abs(100 - targetBrightness)] });
            }
            else {
                //  filters.push( { apply: 'darken', params: [100 - targetBrightness] })
            }

            image.color(filters)
                .rotate(targetRotation > 0 ? -Math.abs(targetRotation) : Math.abs(targetRotation))
                .resize(400, 400)
                .write('preview.png',
                    () => {
                        console.log('uploading')
                        var twitter = new Twit({
                            "consumer_key": 'YdjYSC0X7zRYM2ChkmIEaQ',
                            "consumer_secret": 'XmdyEH69ztkTX61uprwjipvqlNBUP9doDBn1OFUJc',
                            "access_token": '217000716-1qrBcC2Wu6h5KxNd2qfkK5tV6W8MTCn8gFOIblWD',
                            "access_token_secret": 'e8h3gMlxARwgN1NYU9FS1YuapMVD2b7AmUqSKs0RWh02v'
                        });
                        var imageBase64 = fs.readFileSync('preview.png', { encoding: 'base64' });
                        twitter.post('account/update_profile_image', { image: imageBase64 }, function (error, data) {
                            if (error) {
                                console.log('Failed to update profile image.');
                                console.log(error);
                            } else {
                                console.log('Updated profile image: ' + data.profile_image_url);
                            }

                        });
                    });
        })
        .catch(err => {
            context.log(err);
        });

    context.res = {
        body: "GREAT_SUCCESS"
    };
    context.done();
}

