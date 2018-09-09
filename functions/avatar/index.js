var Jimp = require('jimp');
var Twit = require('twit');
var fs = require('fs');

module.exports = function (context, req) {
    var targetHue =  parseInt(req.query.hue);
    var targetSaturation = Math.max(parseInt(req.query.saturation), 1);
    var targetRotation = parseInt(req.query.rotation);

    context.log(targetHue + ' ' + targetSaturation + ' ' + targetRotation);

    Jimp.read('https://www.taylorgibb.com/assets/avatar.png')
        .then(image => {  
            let filters = [
                { apply: 'hue', params: [targetHue] },
            ];

            if(targetSaturation){
                let method = targetSaturation >= 50 ? 'saturate' : 'desaturate';
                let saturation = targetSaturation >= 50 ? ((targetSaturation - 50) * 2): 100 - ((targetSaturation) * 2); 
                context.log(method + ' ' + saturation)
                filters.push( { apply: method, params: [saturation] },)
            }

           image.color(filters)
                .rotate(targetRotation > 0 ? -Math.abs(targetRotation) : Math.abs(targetRotation))
                .getBase64Async(Jimp.MIME_PNG)
                .then((image) => {
                    var twitter = new Twit({
                        "consumer_key": process.env.TWITTER_CONSUMER_KEY,
                        "consumer_secret": process.env.TWITTER_CONSUMER_SECRET,
                        "access_token": process.env.TWITTER_ACCESS_TOKEN,
                        "access_token_secret": process.env.TWITTER_ACCESS_TOKEN_SECRET
                    });

                    twitter.post('account/update_profile_image', { image: image.substr(22) })
                           .catch(function (err) {
                                context.log(err.stack);
                                context.res = {
                                    body: { msg: "ERROR", data: err.stack }
                                }
                                context.done(); 
                            })
                           .then((result) => {
                                context.log('Img Url: ' + result.data.profile_image_url);
                                context.res = {
                                    body: { msg: "GREAT_SUCCESS", data: result.data.profile_image_url }
                                }
                                context.done();
                    });

                    
                }) 
        })
        .catch(err => {
            context.log(err);
            context.res = {
                body: { msg: "ERROR", data: err.stack }
            }
            context.done();
        });
         

}
