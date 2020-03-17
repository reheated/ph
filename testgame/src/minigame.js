(function() {
    "use strict";

    var MAX_DELTAT = 1.0 / 30; // Maximum time step the game simulation is allowed to make.
    var REST_TIME = 2.0; // Seconds after winning/losing that the minigame still displays

    // Gameplay settings
    var STARTING_LIVES = 3;
    var WIDTH = 320;
    var HEIGHT = 200;
    var BALLRAD = 5;
    var GRAVITY = 600;
    var WALLWIDTH = 2;
    var BALLMARGIN = 40;
    var MAXXVEL = 180;
    var XACCEL = 1440;
    var FRICTION = 720;
    var BOUNCE_VEL = 410; // Upward speed of the ball after every bounce.

    var BIRD_FLIGHT_X_SPEED = 1.5;
    var BIRD_FLIGHT_Y_SPEED = 0.1;
    var BIRDRAD = 5;
    var BIRDCOLLRAD = 3; // size for collision purposes

    var NUM_SEEDS = 6;
    var SEEDRAD = 5;
    var SEEDSPACE = 12;

    // Particles settings
    var MAX_PARTICLES = 2000;
    var PARTICLE_GRAVITY = 50;

    // Screen shake settings
    var SCREEN_SHAKE_DURATION = 0.5;

    // Cloud settings
    var CLOUD_COUNT = 3;
    var CLOUD_BUFFER = 100; // how far outside the screen it goes before wrapping
    var CLOUD_VEL = -6;

    // Grass settings
    var GRASSHEIGHT = 10;
    var GROUNDCOLOR = "#1f3513";

    // Dusk settings
    var SKY_Y_OFFSET = -100;

    // Sound settings
    var BPM = 136;
    var INTRO_BEATS = 4;
    var SONG_BEATS = 16 * 4; // 16 bars

    var resources = null;
    var ballx = null;
    var bally = null;
    var ballvx = null;
    var ballvy = null;
    var birdPositions = null;
    var birdVels = null;
    var seedPositions = null;
    var lives = null;
    var numGotSeeds = null;
    var endedTime = null;
    var won = null;
    var particles = null;
    var nextParticle = null;
    var lastShake = null;
    var cloudPositions = null;
    var minigameStartedTime = null;
    var birdArrivalRate = null;
    var minigamePlayedTimes = 0;

    var introTime = INTRO_BEATS / BPM * 60;
    var songTime = SONG_BEATS / BPM * 60;
    var nextSongPlay = null;
    var curSong = null;

    // the various juice levels you can upgrade
    var shakeSettings = null;
    var particleSettings = null;
    var detailSettings = null;
    var soundSettings = null;

    // translate x and y radius; rotate = angle in degrees. always = translate that applies always.
    var shakeMap = {
        0: {translate: 0, rotate: 0, always: 0},
        1: {translate: 1, rotate: 0, always: 0},
        2: {translate: 4, rotate: 0, always: 0},
        3: {translate: 8, rotate: 0, always: 0},
        4: {translate: 16, rotate: 6, always: 0},
        5: {translate: 32, rotate: 20, always: 1},
    }

    var particleMap = {
        0: {count: 0, loseCount: 0, maxInitSpeed: 10},
        1: {count: 10, loseCount: 25, maxInitSpeed: 20},
        2: {count: 20, loseCount: 50, maxInitSpeed: 30},
        3: {count: 60, loseCount: 100, maxInitSpeed: 45},
        4: {count: 140, loseCount: 200, maxInitSpeed: 70},
        5: {count: 300, loseCount: 400, maxInitSpeed: 100},
    }

    var detailMap = {
        0: {clouds: false, grass: false, dusk: false, floodlight: false, disco: false},
        1: {clouds: true, grass: false, dusk: false, floodlight: false, disco: false},
        2: {clouds: true, grass: true, dusk: false, floodlight: false, disco: false},
        3: {clouds: true, grass: true, dusk: true, floodlight: false, disco: false},
        4: {clouds: true, grass: true, dusk: true, floodlight: true, disco: false},
        5: {clouds: true, grass: true, dusk: true, floodlight: false, disco: true},
    }

    var soundMap = {
        0: {intro: null, music: null, get: null, bird: null, won: null},
        1: {intro: 'ld45_intro1', music: 'ld45_level1', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won1'},
        2: {intro: 'ld45_intro1', music: 'ld45_level2', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won1'},
        3: {intro: 'ld45_intro1', music: 'ld45_level3', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won1'},
        4: {intro: 'ld45_intro4', music: 'ld45_level4', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won4'},
        5: {intro: 'ld45_intro4', music: 'ld45_level5', get: 'ld45_get', bird: 'ld45_bird', won: 'ld45_won4'},
    }

    // keyboard setup
    var keymap = {37: 'left', 39: 'right'};
    var keysDown = null;


    window.minigameInit = function(resourcesObject, shake, particle, detail, sound, difficulty)
    {
        resources = resourcesObject;
        shakeSettings = shakeMap[shake];
        particleSettings = particleMap[particle];
        detailSettings = detailMap[detail];
        soundSettings = soundMap[sound];
        birdArrivalRate = (3 + difficulty) * 0.1;

        // Initalise

        ballx = WIDTH / 2;
        bally = HEIGHT / 4;

        ballvx = 0;
        ballvy = 0;

        birdPositions = [];
        birdVels = [];

        lives = STARTING_LIVES;
        numGotSeeds = 0;

        // generate seed positions
        var ok = false;
        var xs = [];
        for(var k = 0; k < NUM_SEEDS; k++)
        {
            var ok = false;
            while(!ok)
            {
                var z = Math.random() * (WIDTH - 2 * BALLMARGIN) + BALLMARGIN;
                ok = true;
                for(var l = 0; l < xs.length; l++)
                {
                    if(Math.abs(z - xs[l]) < SEEDSPACE)
                    {
                        ok = false;
                    }
                }
            }
            xs.push(z);
        }
        seedPositions = [];
        for(var k = 0; k < xs.length; k++)
        {
            seedPositions.push([xs[k], HEIGHT - WALLWIDTH - SEEDRAD]);
        }

        // particls and shaking
        initParticles();
        lastShake = null;

        // clouds
        cloudPositions = []
        for(var k = 0; k < CLOUD_COUNT; k++)
        {
            var x = Math.random() * (WIDTH + CLOUD_BUFFER) - CLOUD_BUFFER;
            var y = Math.random() * HEIGHT * 0.55;
            cloudPositions.push([x, y]);
        }

        endedTime = null;
        won = false;
        keysDown = {'left': false, 'right': false};

        minigamePlayedTimes += 1;
        if(minigamePlayedTimes == 1)
        {
            convoFirstMinigame();
        }
    }

    function startPlaying()
    {
        quickSound(soundSettings.intro);
        var t = curTime()
        minigameStartedTime = t;
        nextSongPlay = t + introTime;
    }

    function updateStep(deltat)
    {
        // GAMEPLAY STEP

        // apply gravity to ball velocity
        ballvy += GRAVITY * deltat;

        // apply player inputs to ball velocity
        if(keysDown.right && !keysDown.left)
        {
            ballvx = ballvx + XACCEL * deltat;
        }
        if(keysDown.left && !keysDown.right)
        {
            ballvx = ballvx - XACCEL * deltat;
        }

        // apply friction to x-velocity
        if(ballvx < 0)
        {
            ballvx = Math.min(0, ballvx + FRICTION * deltat);
        }
        if(ballvx > 0)
        {
            ballvx = Math.max(0, ballvx - FRICTION * deltat);
        }

        // apply maximum speed to x-velocity
        ballvx = Math.min(ballvx, MAXXVEL);
        ballvx = Math.max(ballvx, -MAXXVEL);

        // apply ball velocity to ball position
        ballx += ballvx * deltat;
        bally += ballvy * deltat;

        // apply bounce
        if(ballx < WALLWIDTH + BALLRAD)
        {
            var z = WALLWIDTH + BALLRAD;
            ballx = z + (z - ballx);
            ballvx = Math.abs(ballvx);
        }
        if(ballx > WIDTH - WALLWIDTH - BALLRAD)
        {
            var z = WIDTH - WALLWIDTH - BALLRAD;
            ballx = z - (ballx - z);
            ballvx = -Math.abs(ballvx);
        }
        if(bally > HEIGHT - WALLWIDTH - BALLRAD)
        {
            var z = HEIGHT - WALLWIDTH - BALLRAD;
            bally = z - (bally - z);
            ballvy = -BOUNCE_VEL;
        }

        // Create birds?
        var birdProb = birdArrivalRate * deltat;
        if(Math.random() < birdProb)
        {
            var goingLeft = (Math.random() < 0.5);
            var x, vx;
            if(goingLeft)
            {
                x = WIDTH;
                vx = -BIRD_FLIGHT_X_SPEED;
            }
            else
            {
                x = 0;
                vx = BIRD_FLIGHT_X_SPEED;
            }
            var y = (0.25 + 0.5 * Math.random()) * HEIGHT;
            var vy = ((Math.random() < 0.5)? 1 : -1) * BIRD_FLIGHT_Y_SPEED;
            birdPositions.push([x, y]);
            birdVels.push([vx, vy]);
        }

        // Update birds
        for(var k = birdPositions.length - 1; k >= 0; k--)
        {
            var pos = birdPositions[k];
            var vel = birdVels[k];
            pos[0] += vel[0];
            pos[1] += vel[1];
            if(pos[0] < -WALLWIDTH || pos[0] > WIDTH + WALLWIDTH)
            {
                // bird exited the play region - delete it
                birdPositions.splice(k, 1);
                birdVels.splice(k, 1);
            }
        }

        // Check collisions with seeds and birds
        for(var k = seedPositions.length - 1; k >= 0; k--)
        {
            var pos = seedPositions[k];
            var d = collDist(pos, [ballx, bally]);
            if(d < SEEDRAD + BALLRAD)
            {
                seedCollisionEffect(pos[0], pos[1]);
                seedPositions.splice(k, 1);
                numGotSeeds += 1;
            }
        }
        for(var k = birdPositions.length - 1; k >= 0; k--)
        {
            var pos = birdPositions[k];
            var d = collDist(pos, [ballx, bally]);
            if(d < BIRDCOLLRAD + BALLRAD)
            {
                birdCollisionEffect(pos[0], pos[1]);
                birdPositions.splice(k, 1);
                birdVels.splice(k, 1);
                lives -= 1;
            }
        }

        // Check if the game is won/lost
        if(numGotSeeds >= NUM_SEEDS)
        {
            won = true;
            endedTime = curTime();
            stopMusic();
            quickSound(soundSettings.won);
        }
        else if(lives <= 0)
        {
            won = false;
            endedTime = curTime();
            particleExplosion(ballx, bally, particleSettings.loseCount, "#cc0044");
            stopMusic();
        }
    }

    function seedCollisionEffect(x, y)
    {
        particleExplosion(x, y, particleSettings.count, "#461093");
        lastShake = curTime();
        quickSound(soundSettings.get);
    }

    function birdCollisionEffect(x, y)
    {
        particleExplosion(x, y, particleSettings.count, "#222222");
        lastShake = curTime();
        quickSound(soundSettings.bird);
    }

    function drawStep(ctx)
    {
        // DRAW STEP
        var t = curTime();
        
        // Draw walls
        ctx.fillStyle = "#000000";
        var b = 1000;
        ctx.fillRect(-b, -b, WALLWIDTH + b, HEIGHT + 2*b);
        ctx.fillRect(WIDTH - WALLWIDTH, -b, WALLWIDTH + b, HEIGHT + 2*b);
        ctx.fillStyle = GROUNDCOLOR;
        ctx.fillRect(0, HEIGHT - WALLWIDTH, WIDTH, WALLWIDTH + b);

        // Draw birds
        ctx.fillStyle = "#aaaaaa";
        for(var k = 0; k < birdPositions.length; k++)
        {
            var pos = birdPositions[k];
            var x = Math.floor(pos[0] - BIRDRAD + 0.5);
            var y = Math.floor(pos[1] - BIRDRAD + 0.5);
            var flip = birdVels[k][0] < 0;
            ctx.save();
            ctx.translate(x, y);
            if(flip)
            {
                ctx.translate(BIRDRAD * 2, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(resources.data.bird, 0, 0);
            ctx.restore();
        }

        // Draw seeds
        for(var k = 0; k < seedPositions.length; k++)
        {
            var pos = seedPositions[k];
            var x = Math.floor(pos[0] - SEEDRAD + 0.5);
            var y = Math.floor(pos[1] - SEEDRAD + 0.5);
            ctx.drawImage(resources.data.fruit, x, y);
        }

        // Draw player, if we haven't died
        var alive = (endedTime === null) || won;
        if(alive)
        {
            var x = Math.floor(ballx - BALLRAD + 0.5);
            var y = Math.floor(bally - BALLRAD + 0.5);
            ctx.drawImage(resources.data.playerface, x, y);
        }

        // Draw health
        var x = 306;
        var y = 4;
        for(var k = 0; k < lives; k++)
        {
            ctx.drawImage(resources.data.health, x, y);
            x -= 10;
        }
    }

    function initParticles()
    {
        particles = [];
        for(var k = 0; k < MAX_PARTICLES; k++)
        {
            var p = [false, 0, 0, 0, 0, "#000000"];
            particles.push(p);
        }
        nextParticle = 0;
    }

    function updateParticles(deltat)
    {
        for(var k = 0; k < MAX_PARTICLES; k++)
        {
            var p = particles[k];
            p[1] += p[3] * deltat; // x position += x-velocity
            p[2] += p[4] * deltat; // y position += y-velocity
            p[4] += PARTICLE_GRAVITY * deltat;
            if(p[2] > HEIGHT + WALLWIDTH)
            {
                p[0] = false; // fell off bottom of screen - disable
            }
        }
    }

    function drawParticles(ctx)
    {
        for(var k = 0; k < MAX_PARTICLES; k++)
        {
            var p = particles[k];
            if(p[0])
            {
                var x = Math.floor(p[1] + 0.5);
                var y = Math.floor(p[2] + 0.5);
                ctx.fillStyle = p[5];
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    function addParticle(x, y, vx, vy, c)
    {
        var p = particles[nextParticle];
        p[0] = true;
        p[1] = x;
        p[2] = y;
        p[3] = vx;
        p[4] = vy;
        p[5] = c;
        nextParticle = (nextParticle + 1) % MAX_PARTICLES;
    }

    function particleExplosion(x, y, count, c)
    {
        var rotPer = 2 * Math.PI / count;
        var rotOff = Math.random() * 2 * Math.PI;
        for(var k = 0; k < count; k++)
        {
            var rot = rotPer * k + rotOff;
            var vx = Math.cos(rot) * Math.random() * particleSettings.maxInitSpeed;
            var vy = Math.sin(rot) * Math.random() * particleSettings.maxInitSpeed;
            addParticle(x, y, vx, vy, c);
        }
    }

    function updateBackground(deltat)
    {
        for(var k = 0; k < CLOUD_COUNT; k++)
        {
            cloudPositions[k][0] += CLOUD_VEL * deltat;
            if(cloudPositions[k][0] < -CLOUD_BUFFER) cloudPositions[k][0] = WIDTH;
            else if(cloudPositions[k][0] > WIDTH) cloudPositions[k][0] = -CLOUD_BUFFER;
        }
    }

    function drawBackground(ctx)
    {
        var t = curTime();

        // draw dusk
        if(detailSettings.dusk)
        {
            ctx.drawImage(resources.data.dusk, 0, SKY_Y_OFFSET);
        }

        // draw floodlight
        if(detailSettings.floodlight)
        {
            ctx.globalAlpha = 0.4;
            ctx.globalCompositeOperation = 'multiply';
            ctx.drawImage(resources.data.floodlight, 0, SKY_Y_OFFSET);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
        
        // draw disco lights
        if(detailSettings.disco)
        {
            ctx.globalAlpha = 0.4;
            ctx.globalCompositeOperation = 'multiply';
            
            var z = Math.floor(t / 0.5) % 3;
            ctx.fillStyle = "#000000";
            var r = 300;
            var N = 7;
            for(var k = z-2; k < N; k+=3)
            {
                var a1 = (k / N) * Math.PI; // cut semicircle, so only 1pi
                var a2 = ((k + 2) / N) * Math.PI; // cut semicircle, so only 1pi
                ctx.beginPath();
                ctx.moveTo(160, 220);
                ctx.lineTo(160 + r * Math.cos(a1), 220 - r * Math.sin(a1));
                ctx.lineTo(160 + r * Math.cos(a2), 220 - r * Math.sin(a2));
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }

        // draw clouds
        if(detailSettings.clouds)
        {
            if(detailSettings.dusk) ctx.globalAlpha = 0.4;
            for(var k = 0; k < CLOUD_COUNT; k++)
            {
                var imgName = 'cloud' + k.toString();
                var pos = cloudPositions[k];
                // I won't round the positions here... the clouds become too distracting.
                // It's nicer with the AA on!
                var x = pos[0];
                var y = pos[1];
                ctx.drawImage(resources.data[imgName], x, y);
            }
            ctx.globalAlpha = 1;
        }

        // draw long grass
        if(detailSettings.grass)
        {
            ctx.drawImage(resources.data.longgrass, 0, HEIGHT - WALLWIDTH - GRASSHEIGHT);
        }
    }

    function drawForeground(ctx)
    {
        // draw short grass
        if(detailSettings.grass)
        {
            ctx.drawImage(resources.data.shortgrass, 0, HEIGHT - WALLWIDTH - GRASSHEIGHT + 1);
        }
    }

    function setScreenTransform(ctx)
    {
        // Set the transform
        var t = curTime();

        var shakeAmt = shakeSettings.always;
        var shakeHappening = (t < lastShake + SCREEN_SHAKE_DURATION);
        
        if(shakeHappening)
        {
            shakeAmt += shakeSettings.translate;
        }
    
        if(shakeAmt > 0)
        {
            var transx = (Math.random() * 2 - 1) * shakeAmt;
            var transy = (Math.random() * 2 - 1) * shakeAmt;
            ctx.translate(transx, transy);
        }

        if(shakeHappening && shakeSettings.rotate > 0)
        {
            var rot = (Math.random() * 2 - 1) * shakeSettings.rotate * 2 * Math.PI / 360;
            ctx.translate(WIDTH/2, HEIGHT/2);
            ctx.rotate(rot);
            ctx.translate(-WIDTH/2, -HEIGHT/2);
        }
    }

    function updateMusic()
    {
        var t = curTime();
        if(nextSongPlay !== null && t > nextSongPlay)
        {
            curSong = quickSound(soundSettings.music);
            nextSongPlay = t + songTime;
        }
    }

    function stopMusic()
    {
        if(curSong !== null)
        {
            resources.stopSound(curSong);
            curSong = null;
        }
        nextSongPlay = null;
    }

    window.minigameUpdate = function(deltat)
    {
        if(minigameStartedTime === null) // haven't started playing yet
        {
            startPlaying();
        }
        var timeSinceStarted = curTime() - minigameStartedTime;
        var isIntro = (timeSinceStarted < introTime);

        deltat = Math.min(deltat, MAX_DELTAT);

        if(endedTime !== null)
        {
            // don't update the game step, so we can't die
            if(curTime() > endedTime + REST_TIME)
            {
                minigameStartedTime = null;
                endMinigame(won);
            }
        }
        else if(!isIntro) // haven't won or lost yet, and not in intro
        {
            updateStep(deltat);
        }
        updateParticles(deltat);
        updateBackground(deltat);

        updateMusic();
    }

    window.minigameDraw = function(ctx)
    {
        // Draw basic sky
        ctx.fillStyle = "#78cfe3";
        ctx.fillRect(0, 0, outGameCanvas.width, outGameCanvas.height);

        setScreenTransform(ctx);
        drawBackground(ctx);
        drawParticles(ctx);
        drawStep(ctx);
        drawForeground(ctx);
        
        var timeSinceStarted = curTime() - minigameStartedTime;
        var isIntro = (timeSinceStarted < introTime);
        if(isIntro)
        {
            mainFont.drawText(ctx, "GET READY", 128, 32);
        }
    }

    function collDist(pos1, pos2)
    {
        // Distance for collision purposes (supremum distance)
        var dx = Math.abs(pos1[0] - pos2[0]);
        var dy = Math.abs(pos1[1] - pos2[1]);
        var d = Math.max(dx, dy);
        return d;
    }

    window.minigameHandleKeyDown = function(keyCode)
    {
        keysDown[keymap[keyCode]] = true;
    }
    
    window.minigameHandleKeyUp = function(keyCode)
    {
        keysDown[keymap[keyCode]] = false;
    }

    ////////////////
    // CONVERSATIONS
    ////////////////

    function convoFirstMinigame()
    {
        window.convoScene.convoEnqueue("s", "OK - I'm going to try to harvest some juicefruit.");
        window.convoScene.convoEnqueue("s", "It looks like I have to use the left and right arrow keys to collect all the fruit.");
        window.convoScene.convoEnqueue("s", "There are a lot of birds around. I'd better try not to crash into them.");
    }

})();