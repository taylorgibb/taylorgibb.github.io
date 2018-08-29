---
layout: page
header: false
---

<div class="avatar-container">
    <div class="avatar-preview">
        <img id="avatar" src="/assets/avatar.png">
    </div>
    <div class="avatar-toggles">
    <div class="toggle">
        <label>Hue</label>
        <input class="slider" id="hue" type="range" value="128" min="0" max="255" /> 
    </div>
     <div class="toggle">
        <label>Saturation</label>
        <input class="slider" id="saturation" type="range" value="4" min="0" max="8" step="1" /> 
    </div>
     <div class="toggle">
        <label>Brightness</label>
        <input class="slider" id="brightness" type="range" value="4" min="0" max="8" step="1" /> 
    </div>
     <div class="toggle">
        <label>Rotation</label>
        <input class="slider" id="rotation" type="range" value="0" min="0" max="360" step="1" /> 
    </div>
</div>

<script>

    $(document).ready(function() {
        var hue = getRandom(1, 256);
        var saturation = getRandom(1, 9);
        var brightness = getRandom(1, 9);
        var rotate = 0;

        $('#hue').val(hue);
        $('#saturation').val(saturation);
        $('#brightness').val(brightness);

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

        $('#brightness').on('input', function(){
		    brightness = parseInt($(this).val(), 10);
		    update();
	    });

        function getRandom(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        }

        function update(){
            var h = Math.floor(360 * (hue / 256.0));
            var s = Math.floor(200 * (saturation / 8.0));
            var b = 80 + Math.floor(40 * (brightness / 8.0));
		    $('#avatar').css({
                'filter':'hue-rotate(' + h + 'deg) saturate(' + s + '%) brightness(' + b + '%) ',
                'transform': 'rotate(' + rotate + 'deg)',
		    });
	    }
    })
</script>