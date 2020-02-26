(function() {
    "use strict";

    var TILE_SIZE = 4;

    var resources = null;

    window.boxesInit = function(resourcesObject)
    {
        resources = resourcesObject;
    }

    window.drawBox = function(ctx, id, l, t, w, h)
    {
        var htiles = Math.floor(h / TILE_SIZE);
        var wtiles = Math.floor(w / TILE_SIZE);
        for(var i = 0; i < htiles; i++)
        {
            var getI = (i == 0)? 0 : ((i == htiles - 1)? 2 : 1);
            for(var j = 0; j < wtiles; j++)
            {
                var getJ = (j == 0)? 0 : ((j == wtiles - 1)? 2 : 1);

                var gety = getI * TILE_SIZE;
                var getx = (getJ + 3 * id) * TILE_SIZE;

                var putx = l + j * TILE_SIZE;
                var puty = t + i * TILE_SIZE;
                ctx.drawImage(resources.data.boxes, getx, gety, TILE_SIZE, TILE_SIZE, putx, puty, TILE_SIZE, TILE_SIZE);
            }
        }
    }

})();
