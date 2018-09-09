---
layout: page
---

<div class="avatar-container">
    <div class="avatar-preview">
        <img id="avatar" src="/assets/avatar.png">
    </div>
    <div class="avatar-toggles">
        <div class="toggle">
            <label>Hue</label>
            <input class="slider" id="hue" type="range" min="0" max="255" /> 
        </div>
        <div class="toggle">
            <label>Saturation</label>
            <input class="slider" id="saturation" type="range" min="0" max="8" step="1" /> 
        </div>
        <div class="toggle">
            <label>Rotation</label>
            <input class="slider" id="rotation" type="range" min="-14" max="346" step="1" /> 
        </div>
    </div>
    <div class="controls">
        <button class="btn">
            <span>Upload</span> 
            <i style="display: none" class="fa fa-spinner fa-spin"></i>
        </button>    
    </div>
    <div class="text">
        <div> You can see the changes appear on my Twitter profile. Source code can be viewed here.</div>
    </div>
</div>
<style>
    body {
    margin: 0;
    padding: 0;
}
</style>
<script>
    $(document).ready(function() {
        var hue = getRandom(1, 256);
        var saturation = getRandom(1, 9);
        var rotate = -14;
        var h, s;

        $('#hue').val(hue);
        $('#saturation').val(saturation);
        $('#rotation').val(rotate);

        update();

        $('#hue').on('input', function(){
		    hue = (parseInt($(this).val(), 10) + 128) % 255;
		    update();
	    });
        $('#rotation').on('input', function(){
		    rotate = parseInt($(this).val(), 10);
		    update();
	    });

        $('#saturation').on('input', function(){
		    saturation = parseInt($(this).val(), 10);
		    update();
	    });

        function getRandom(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        }

        function update(){
             h = Math.floor(360 * (hue / 256.0));
             s = Math.floor(100 * (saturation / 8.0));
		    $('#avatar').css({
                'filter':'hue-rotate(' + h + 'deg) saturate(' + s + '%)',
                'transform': 'rotate(' + rotate + 'deg)'
		    });
        }
        
        $('button').click(function() {
            $('.controls button span').css({'display': 'none'});
            $('.controls button i').css({'display': 'block'});
            
            var url = `https://tweet-avatar.azurewebsites.net/api/avatar?code=XiwxXOWN3RcIaIgB10cK7KJrzoqJwaxlbyHktbTvgm9/QfM0IV33yA==`;
            $.getJSON( `${url}&hue=${h}&saturation=${s}&rotation=${rotate}`, function( data ) {
                $('.controls button span').css({'display': 'block'});
                $('.controls button i').css({'display': 'none'});
            })
        })
    })
</script>