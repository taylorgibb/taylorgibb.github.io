var Jimp = require('jimp');
var Twit = require('twit');
var fs = require('fs');

module.exports = function (context, req) {
    var targetHue =  parseInt(req.query.hue);
    var targetSaturation = parseInt(req.query.saturation);
    var targetBrightness = parseInt(req.query.brightness);
    var targetRotation = parseInt(req.query.rotation);

    context.log(targetHue + ' ' + targetSaturation + ' ' + targetBrightness + ' ' + targetRotation);

    Jimp.read('https://www.taylorgibb.com/assets/avatar.png')
        .then(image => {

            var filters = [
                { apply: 'hue', params: [targetHue] },
                { apply: 'saturate', params: [targetSaturation] },
                { apply: 'lighten', params: [Math.abs(100 - targetBrightness)] }
            ];

           image.color(filters)
                .rotate(targetRotation > 0 ? -Math.abs(targetRotation) : Math.abs(targetRotation))
                .getBase64(Jimp.MIME_PNG, 
                    (error,image) => {
                        if(error){
                            context.log(error);
                        }

                        var twitter = new Twit({
                            "consumer_key": process.env.TWITTER_CONSUMER_KEY,
                            "consumer_secret": process.env.TWITTER_CONSUMER_SECRET,
                            "access_token": process.env.TWITTER_ACCESS_TOKEN,
                            "access_token_secret": process.env.TWITTER_ACCESS_TOKEN_SECRET
                        });

                        twitter.post('account/update_profile_image', { image: image }, function (error, data) {
                            if (error) {
                                context.log(error);
                            } else {
                                context.log('Updated profile image: ' + data.profile_image_url);
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
