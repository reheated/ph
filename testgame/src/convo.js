(function() {
    "use strict";

    var TIME_BEFORE_DISPLAY = 0.25; // time before displaying the convo.
    var MINCLICKDELAY = 0.1;

    var resources = null;

    var convoQ = [];
    var convoStartedTime = null;
    var lastClickTime = null;

    var nameDict = {
        "s": "Souviette",
        "r": "Rip"
    }

    window.convoInit = function(resourcesObject)
    {
        resources = resourcesObject;
    }

    window.convoEnqueue = function(speaker, msg, callback)
    {
        // a convo object is a tuple consisting of: name of speaker,
        // message, a callback function to be called when the message
        // is first shown, and a bool representing whether it's been
        // shown yet.
        if(typeof(callback) === "undefined") callback = null;
        var wrapped = (msg === null)? msg : PH.wordWrapByChars(msg, 33);
        convoQ.push([speaker, wrapped, callback, false]);
        
        if(convoQ.length === 1)
        {
            convoStartedTime = curTime();
        }

    }

    window.convoDraw = function(ctx)
    {
        // Show any conversation boxes
        var l = 8;
        var t = 120;
        var w = 304;
        var h = 72;


        if(convoQ.length > 0)
        {
            if(curTime() > convoStartedTime + TIME_BEFORE_DISPLAY)
            {
                var c = convoQ[0];
                if(!c[3])
                {
                    // haven't seen this message before - call its callback
                    if(c[2] !== null) c[2]();
                    c[3] = true;
                }

                if(c[1] == null) // no message
                {
                    dequeue();
                }
                else
                {
                    // draw the box
                    drawBox(ctx, 4, l, t, w, h);

                    if(c[0] === null)
                    {
                        // no speaker - just draw text
                        mainFont.drawMultiLineText(ctx, c[1], l + 4, t + 4);
                    }
                    else
                    {
                        // character portrait
                        ctx.drawImage(resources.data[c[0]], l + 4, t + 4);
                        
                        // character name
                        mainFont.drawText(ctx, nameDict[c[0]], l + 28, t + 4);

                        // message
                        mainFont.drawMultiLineText(ctx, c[1], l + 28, t + 20);
                    }
                }
            }
        }
    }

    window.convoGoing = function()
    {
        return convoQ.length > 0;
    }

    function dequeue()
    {
        convoQ.splice(0, 1);
        if(convoQ.length == 0) convoStartedTime = null;
    }

    window.convoHandleClick = function()
    {
        var t = curTime();
        if(t > convoStartedTime + TIME_BEFORE_DISPLAY &&
            (lastClickTime === null || t > lastClickTime + MINCLICKDELAY))
        {
            dequeue();
            lastClickTime = t;
        }
    }

})();