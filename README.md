# pH
A starting point for HTML games in TypeScript

### What is it?
pH consists of the following components:
- The _pH library_: a library of TypeScript classes and functions to assist with HTML game development.
- The _pH tool_: a node script that provides game bundling functionality and an HTTP server for debugging in Firefox.
- Some useful default settings for building and testing games in VS Code with the Debugger for Firefox extension.

Features include:
- _Loader_: downloads files and automatically converts them into useful objects (soundes, images, etc.) based on the file extension. Uses promises so you can use async/await.
- _CanvasUILayer_: provides button functionality for the canvas.
- _PixelFont_: draws bitmap fonts.
- _PixelationLayer_: scales up a low-res game.
- _SoundPlayer_ and _JukeBox_: provide a simple interface for playing sounds and looping music through Web Audio.
- More classes and functions to simplify various game-related operations.

#### License and Attributions

pH and the included sample game, Juicefruit Orchard, are [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Juicefruit Orchard uses a processed version of the font [m5x7](https://managore.itch.io/m5x7) by Daniel Linssen, which is [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

### Caveats
1. The (optional) pH tool is a node script that, among other things, writes to your hard drive, and runs an HTTP server. You should be wary of any downloaded script that does either of these things. Bugs in code that writes to your hard drive could cause data loss. Bugs in code that runs an HTTP server could affect your privacy. You should check any such script and make sure it does what you think it does, before running it.
2. This framework is at a very early stage of development. Expect major changes to the architecture as time goes on.
3. Be aware that if you are making an HTML game for people to play on the web, you need a web server to host it on. As far as I am aware, file sharing services like Dropbox don't cut it.

### Getting Started
<details>
  <summary>I'm using the pH library and pH tool</summary><p>
  
1. Install [TypeScript](https://www.typescriptlang.org/) Version 3.7.5 or higher and [Node](https://nodejs.org) Version 12.16.1 or higher. If you want to use VS Code and the Debugger for Firefox: install [VS Code](https://code.visualstudio.com/), [Firefox](https://mozilla.org/firefox), and the VS Code [Debugger for Firefox](https://marketplace.visualstudio.com/items?itemName=firefox-devtools.vscode-firefox-debug) extension.
2. Download a copy of the repo. From the GitHub page: click "Clone or Download", "Download ZIP" and save the zip file to an appropriate location. Then extract the contents of the zip file.
3. In a terminal, navigate to the "ph" subdirectory of the repo. Install the dependencies and compile the tool by typing the following commands:
```
npm install
tsc -p tsconfig.json
```
4. Create a new directory for your game project.
5. In a terminal, navigate to your project directory, and enter the following (changing the path as appropriate):
   ```
   node path_to_ph_installation/ph/ph.js init
   ```
   This adds files to the project directory to create an empty game. It also prints out a list of entries that you should consider adding to your version control file (e.g., your .gitignore file).
6. Edit ph.json with your text editor and edit the title, description and gameId fields. (gameId should be a short string identifying your game.)
7. Start the pH tool, the TypeScript compiler, and try running the game:
   - If you're using VS Code: open the newly created file `ph-dev.code-workspace` in VS Code. Open the build task list (Default: Ctrl-Shift-B) and select "Watch Source and Data". Then run the game in the Debugger for Firefox (Default: F5.)
   - If you're not using VS Code: Open a terminal, navigate to your project directory and enter
     ```
     node path_to_ph_installation/ph.js watch
     ```
     to start the ph tool in watch mode. Open a second terminal, navigate to your project directory, and enter
     ```
     tsc -p tsconfig.json --watch
     ```
     to start the TypeScript compiler in watch mode. Now open your browser and enter `http://localhost:8080/game/index.html` into the URL browser.
8. Each additional developer should set up their own version of the `localtsconfig.json` and `game.code-workspace` files. It may be possible to do this by running
```
node path_to_ph_installation/ph.js initlocal
```
but if you need customized versions of these files then you'll have to do it manually.
  
</p></details>
<details>
  <summary>I've set up my own project - I'm just using the pH library</summary><p>

1. Install Typescript version 3.7.5 or higher.
2. Download a copy of the repo. From the GitHub page: click "Clone or Download", "Download ZIP" and save the zip file to an appropriate location. Then extract the contents of the zip file. Copy the ph/lib folder into your own project.
3. Set up your TypeScript configuration to include "lib/**/*" before your own source files.

</p></details>

### Howto
I have tried to make the different features of pH as independent as possible. The _FrameManager_ and _LayerManager_ classes together provide something like a game loop, but you don't have to use them to use other features. The pH tool prescribes a certain directory structure for your project, but you can use the library without using the pH tool. Guides to specific features are below.

#### General

<details>
  <summary>Bundle your game using the pH tool</summary><p>
  
If you use VSCode with the default project setup created by the pH tool's init command, the easiest way to run the pH tool is to run the build command "Watch Source and Data" from VSCode. To run the ph tool (outside of VSCode), open a terminal, navigate to your project directory, and enter
```
node path_to_ph_installation/ph.js watch
```
This tool watches the filesystem for changes to your project, and updates the build/ subdirectory with the latest version of your game. It also runs an HTTP server which you can use to run and debug your game. (Why do you need an HTTP server? The reason is that browsers refuse to let web page javascript code load files directly off your hard drive, for security reasons.)

Project settings are in the ph.json file in your project directory. You should set gameId, title, and description yourself.

The pH tool treats certain subdirectories of your project as special:
- _resources/_ - Resources placed here will be bundled into the "game.dat" file in your build directory. A file counts as a "resource" if its file extension matches one of the strings in the resourceExtensions setting in your project's ph.json file. The "game.dat" file can be loaded into your game using the Loader class in the pH library.
- _static/_ - Files placed here will be copied without change into your build directory.
- _staticRoot/_ - Files placed here will not be copied across, but they will appear in the root directory in your HTTP server. You could put some site-wide files here, like a favicon or css file, to test that your game uses them correctly.
- _template/_ - Files placed here will be copied into the build directory, but in a modified form. The pH tool searches the files for patterns of the form ${<key>}, looks up the key in your project's ph.json file, and substitutes the corresponding value.
- _phaux/_ - pH expects TypeScript to use this folder as its compile destination. So it expects to find ".js" files here, which will be copied to the build directory. Also, the default project setup tells Debugger for Firefox to find the source map files here, for easy debugging.
- _src/_ - This directory is not used directly by the pH tool. But the default project settings tell TypeScript to look for source files here.

You can change these directories by editing the values in ph.json, but note that you will have to make corresponding changes to tsconfig.json, localtsconfig.json, .vscode/tasks.json and .vscode/launch.json.

A file in resources/ is only bundled into game.dat if its extension is in the "resourceExtensions" list. If you want to include other file types in your game, you can add the extensions here. However, the resource loader won't know how to decode them unless you write a file type handler, and register it with the resource loader. See that section for more details.

Another setting you may like to change is "allowRemote". If this is `false`, the HTTP server only allows connections from your own computer. If you set it to `true`, it will allow remote connections. On a typical home network, this means you can connect with other devices on your local network (so you can test the game on your phone). But if your computer has a public facing IP address then setting it to `true` will make the HTTP server accessible on the internet.
</p></details>

<details>
  <summary>Preload assets (Loader)</summary><p>
  
Note that the empty project already has one of these.
  
Constructing a loader (the Loader constructor requires an audiocontext, which it can use to decode audio files):
```typescript
let audioContext = new AudioContext();
let loader = new PH.Loader(audioContext);
```
Example of downloading a file (call from an async function):
```typescript
let myImg = <HTMLImageElement>await loader.getFile("img.png");
```
Download a file and set a callback that is called when the download makes progress (call from an async function):
```typescript
let data = await loader.getFile('game.dat',
    (bytes, totalBytes) => updateProgressDisplay(bytes, totalBytes));
```
The file "game.dat" is the default name of the bundled data produced by the pH tool. If a file ends in ".dat", the loader treats it as a pH bundle file. The result will be an object whose keys are the names of the files in your resources directory, and values are the decoded objects (images, sounds, etc.)

You can also use getFiles to get a list of files at once. The function call is analogous.

Loader can only decode a file if a handler function has been registered for the file's extension. You can implement your own handlers and register them using the loader's `addExtensionHandler` function.
</p></details>

<details>
  <summary>Automate frame requests and frame rate calculations (FrameManager)</summary><p>
  
Note that the empty project already has one of these.
  
Example usage of a frame manager:
```typescript
let fm = new PH.FrameManager({
    frameCallback: (deltat) => frame(deltat)
});
fm.start();
```
Now your `frame` function will be called once every "frame". The value of deltat passed to your function will be the time since the last frame. The definition of a frame is up to the browser, but in my experience it is often every 1/60 seconds, as long as your computer can handle it. You can call `fm.stop()` to stop it. You can check `fm.frameRate` if you want an estimate of the frame rate.
</p></details>

<details>
  <summary>Manage draw and update functions, and mouse and keyboard handling (LayerManager)</summary><p>
  
You can extend the `Layer` class to define a game component that needs to do any one or more of the following:
- Have a game logic update step that runs every frame;
- Draw something every frame;
- Handle mouse or keyboard events.

Then, you can use a LayerManager to help despatch the update, draw, and event handler calls to your game components.

Here's how you can use LayerManager. Note that the empty game created by pH init already does something like the following.

Create a layer manager:
```typescript
let layerManager = new PH.LayerManager();
```
Set up mouse and keyboard listeners:
```typescript
// By passing canvas to setupMouseListeners, we get mouse coordinates relative
// to the canvas.
layerManager.setupMouseListeners(canvas);
// By passing window to setupKeyboardListeners, we catch keyboard events when
// the window is in focus but the canvas is not.
layerManager.setupKeyboardListeners(window);
```
Now, create a class, e.g., called MenuLayer, extending PH.Layer. Set it as the only layer of the layer manager.
```typescript
layerManager.setMainLayers(new MenuLayer()); // You can pass in any number of layers
```
Inside your main game loop, call the layer manager's update and draw functions:
```typescript
layerManager.update(deltat);
layerManager.draw();
```
Now, if your MenuLayer class overrides the Layer class's `draw` function, it will get called as part of layerManager's draw step. If you override the `update` function, it will get called as part of the LayerManager's update step. And if you override one of the mouse or keyboard handling functions (e.g., `handleClick`), it will get called on the corresponding mouse or keyboard event.

If you have multiple layers, the layer manager's draw function will call them in order from first to last. The update function and the event handlers will call them in reverse order. Furthermore, for update and most of the event handlers, your override function must return a boolean value. If this return value is `true`, the layer manager will continue on its way. But if you return `false`, the layer manager will consider this event "caught" by your layer, and will not call the event handlers for the layers under it. It will also cancel the event so that other objects in the DOM and the browser won't try to process it. (Note that under typical circumstances, the release of the mouse button will trigger both a `mouseUp` and a `click` event, and each of these will propagate through your layers separately.)

The exception to this is `handleMouseMove`, which can't be cancelled in this way. The `handleMouseMove` function handles both the `mousemove` and `mouseout` events. It takes a parameter of type `MousePosition`, which is defined as `[number, number] | null`. A pair of numbers gives the mouse coordinates; null means that the mouse is outside the visible area.

Mouse move is special in another way, which is that two methods get called: `transformMousePosition`, and then `handleMouseMove`. Ordinarily, you can override `handleMouseMove`, and leave `transformMousePosition` alone. But in some circumstances, you may want to implement a layer that modifies the mouse position that gets passed to the `transformMousePosition` and `handleMouseMove` functions for _this and all lower layers_. To do this, override `transformMousePosition` and return the new mouse coordinates. PixelationLayer does this to transform the mouse coordinates from "on-screen canvas coordinates" to "off-screen coordinates".

The `setupMouseListeners` method has a second, optional, parameter, `touchToo`. Set this to `true` if you want the LayerManager to listen to touch-related events, and try to pretend that they are mouse events. This might give you an easy way to handle touch, but it is quite simplistic. In particular, you can't handle multitouch this way.

As a convenience, LayerManager has three functions to set layers: `setBottomLayers`, `setMainLayers` and `setTopLayers`. LayerManager just concatenates these (in the order bottom, main, top) to produce the full list of layers. The reason for this is that there may be layers that you want to add permanently (such as a PixelationLayer, which you would add at the top), while other layers are changing due to your game logic.

</p></details>

<details>
  <summary>Save and load data across sessions, (localStorageSave, localStorageLoad and related functions)</summary><p>
  
_Local storage_ is a browser feature that can be used to store data between browsing sessions. You can use this to add save/load functionality to your game. PH supplies some convenience functions for working with local storage. These functions add the following features:

- Data is automatically serialised/deserialised using JSON.stringify/JSON.parse. This means you can store data other than strings. Note that only _data_ is serialised. If your objects have methods, the methods will not get saved.
- The functions below attach a prefix to your key, based on the game ID. This way, you can avoid clashes between games hosted on the same web site. If you want to share values between games on the same site, use the original functions supplied by localStorage.

Before using these functions, set `window.gameId` (in the default empty project, this is done for you in the index.html template):
```typescript
window.gameId = "${gameId}";
```
Save a piece of data to local storage:
```typescript
PH.localStorageSave("gameState", gameState);
```
Load data from local storage:
```typescript
let gameState = PH.localStorageLoad("gameState");
```
Check if there is data stored under a given name:
```typescript
let isSaved = PH.localStorageIsSaved("gameState");
```
Remove data stored under a given name:
```typescript
PH.localStorageRemove("gameState");
```

</p></details>

<details>
  <summary>Delay a specified duration in an async/await function (delay)</summary><p>

Delay, for example, for 3 seconds (call from an async function):
```typescript
await PH.delay(3.0);
```

</p></details>

<details>
  <summary>Get the current time, in seconds (curTime)</summary><p>
  
Get the number of seconds since the Unix Epoch:
```typescript
let t = PH.curTime();
```

</p></details>

<details>
  <summary>Download a font into the document (quickFont)</summary><p>

Assuming the font `Karla-regular.ttf` is in your game's build folder:
```typescript
PH.quickFont("karla", "Karla-regular.ttf");
```
Now the "karla" font is available to use in CSS, or you can construct a PH.SimpleFont from it.

</p></details>

#### Graphics

<details>
  <summary>Create an off-screen canvas (createCanvas)</summary><p>
  
Create an off-screen canvas, for example, with dimensions 320 x 200:
```typescript
let offScreenCanvas = PH.createCanvas(320, 200);
```

</p></details>

<details>
  <summary>Set up pixelated graphics (PixelationLayer)</summary><p>
  
The idea here is to make an off-screen canvas, where we will draw all our graphics to. Then, the last stage of our draw loop, we use a `PixelationLayer` to scale the graphics up and draw to an on-screen canvas.

_In the game setup_: Create an off-screen canvas and get our on-screen canvas (for example, for 320 x 200 game resolution):
```typescript
let mainGameCanvas = PH.createCanvas(320, 200);
let outGameCanvas = <HTMLCanvasElement>document.getElementById('outGameCanvas')!;
```
Get the 2D contexts:
```typescript
let ctx = mainGameCanvas.getContext('2d')!;
let outCtx = outGameCanvas.getContext('2d')!;
```
Create a `PixelationLayer`:
```typescript
let pixelationLayer = new PH.PixelationLayer(ctx, outCtx, true, false);
```

_In the draw loop_: draw everything to `ctx`, and then get the PixelationLayer to to scale it up:
```typescript
pixelationLayer.draw();
```
During both preloading and the main game loop, call `pixelationLayer.update` to make sure the on-screen canvas has an appropriate image buffer size.

Alternatively, after creating the `pixelationLayer` you can add it at the top of a LayerManager. This will take care of setting up the event listener, updating the image buffer dimensions and making the draw call. It will also transform mouse coordinates for you.

</p></details>

<details>
  <summary>Draw text on a canvas (SimpleFont and PixelFont)</summary><p>

The SimpleFont and PixelFont classes provide convenient ways to draw text to the canvas.

A SimpleFont can be constructed from any font available to your document.
```typescript
let font = new PH.SimpleFont("Calibri", 16, 1.0, "#000000");
```
This creates a SimpleFont with Calibri size 16px and black color. The 1.0 says that the line size is equal to the font size, so in multiline text, each new line will be 16 pixels below the previous.

A PixelFont can be constructed from an image:
```typescript
let monospaceFont = new PixelFont(img, cellWidth, cellHeight, 0, lineHeight, startChar);
let variableFont = new PixelFont(img, cellWidth, cellHeight, 0, lineHeight, startChar, cellWidths);
```
The image must have the font characters arranged in a grid, starting from the character code startChar. You can make the font variable-width by including the cellWidths parameter, an array of numbers providing the width of each character in pixels. Another way to get a PixelFont is to use the `Loader` class to download a `.bff` file, but you may have to then adjust some properties manually to suit your tastes:
```typescript
let font = <PH.PixelFont>await loader.getFile('m5x7.bff');
font.img = PH.changeImageColor(font.img, [0, 0, 0]); // change text color to black
font.yOffset = -4; // otherwise the text draws too low
font.lineHeight = 10; // otherwise the space between new lines is too large
```

SimpleFont and PixelFont provide the same interface. To draw a single line of text:
```typescript
font.drawText(ctx, text, left, top);
```
To draw multi-line text:
```typescript
font.drawMultiLineText(ctx, textLines, left, top);
```
Here, `textLines` is an array of lines of text. You can produce such an array manually, or by using the wordWrap method:
```typescript
let textLines = font.wordWrap(text, width);
```
To draw a single line of centered text:
```typescript
font.drawCenteredText(ctx, text, midx, midy);
```

</p></details>

<details>
  <summary>Change the color of an image (changeImageColor)</summary><p>

This function makes a copy of an image, replacing the R, G and B values of every pixel by the specified values, but leaving the alpha value alone. This is useful for changing the color of a PixelFont.
```typescript
let newImg = PH.changeImageColor(oldImg, [R, G, B]);
```

</p></details>

<details>
  <summary>Draw rectangles using sprites (SpriteBox)</summary><p>

The SpriteBox provides a convenient way for drawing patterned rectangles (that you might use for borders, menu frames, and buttons) using sprites. The SpriteBox requires a (3N) x (3N) graphic (the value of N is up to you) consisting of the nine N x N tiles that will be arranged to draw the rectangle. In fact, you can put several of these grids in one image, so your image should have dimensions (3MN) x (3N), where M is the number of different tilesets. See the `boxes.png` file in the Juicefruit Orchard sample game for an example of the layout.

To construct a sprite box (for this example, it's the first grid in the image, and the tile size is 4):
```typescript
let mySpriteBox = new PH.SpriteBox(myImage, 4, 0);
```
To draw the sprite box:
```
mySpriteBox.draw(ctx, left, top, width, height);
```
For best results, width and height should be a multiple of the tile size.
</p></details>

<details>
  <summary>Fill the canvas a solid color (fillCanvas)</summary><p>

```typescript
PH.fillCanvas(ctx, "#000000"); // black
```
</p></details>

<details>
  <summary>Resize a canvas's image to match its size on the screen (resizeCanvasToSizeOnScreen)</summary><p>

The following call will resize a canvas's _image size_ to match the canvas's _size in CSS pixels_. Without this, you could end up with a 300x150 image being stretched to fill the whole game area.
```typescript
PH.resizeCanvasToSizeOnScreen(canvas);
```
Generally, this should make the image size big enough to look good. But technically, CSS pixels don't equal pixels on the screen. Passing `true` as the optional second parameter to this function attempts to account for this by using the browser's `devicePixelRatio` value...
```typescript
PH.resizeCanvasToSizeOnScreen(canvas, true)
```
... but there is still no guarantee that the pixels will match up, and there is nothing you can do about it.

</p></details>

#### UI

<details>
  <summary>Create interactive buttons on the canvas, (CanvasButton and CanvasUILayer)</summary><p>

Create SpriteBoxes for the unpressed and pressed button:
```typescript
let spriteBoxButton = new PH.SpriteBox(buttonImage, 4, 0);
let spriteBoxPressed = new PH.SpriteBox(buttonImage, 4, 1);
```
Create a button drawer:
```typescript
// Assuming mainFont is a PH.SimpleFont or PH.PixelFont, for drawing the button text
let buttonDrawer = new PH.CanvasButtonSpriteDrawer(spriteBoxButton, spriteBoxPressed, mainFont);
```
Create a Canvas UI layer:
```typescript
let uiLayer = new PH.CanvasUILayer();
```
Create a button and add it to the Canvas UI Layer:
```typescript
// Assume clickCallback is a function (button, mouseButton) => void.
// It will get called when the button is clicked.
let mouseButtons = [0, 2]; // Handle mouse buttons 0 (LMB) and 2 (RMB)
let b = new PH.CanvasButton(ctx, l, t, w, h,
    clickCallback, text, buttonDrawer, mouseButtons);
uiLayer.addButton(b);
```
If you're using a LayerManager, add the UI Layer to the layer manager:
```typescript
layerManager.setMainLayers(/* other layers, */ uiLayer);
```
The layer manager can then manage the draw and update calls and event handlers. If you are not using the layer manager, you need to

- Call uiLayer.handleMouseMove, uiLayer.handleMouseDown and uiLayer.handleMouseUp during your game's mousemove, mousedown and mouseup event handlers;
- Call uiLayer.draw during your game's draw routine.

</p></details>

<details>
  <summary>Use a custom mouse cursor in the canvas (CanvasCursorLayer)</summary><p>

Create a cursor layer:
```typescript
// elt - HTML element to hide the normal mouse cursor on. Not always equal to ctx.canvas
// coordinateLayer - a PH.CoordinateLayer to get the mouse coordinates from
// hotSpot - pixel coordinates of the hot spot, e.g., [0, 0] for top-left
let cursorLayer = new PH.CanvasCursorLayer(ctx, elt,
    coordinateLayer, cursorImage, hotSpot);
```
If you are using a LayerManager, add cursorLayer to it (position it after the layers you want to draw the cursor in front of). If not:

- call cursorLayer.draw() during your draw routine
- call cursorLayer.handleLayerRemoved() when you want to switch back to the operating system's mouse cursor.

</p></details>

#### Sound

<details>
  <summary>Play sounds (SoundPlayer)</summary><p>

Create a SoundPlayer:
```typescript
let audioContext = new AudioContext();
let soundPlayer = new PH.SoundPlayer(audioContext, {});
```
Play a sound:
```typescript
let mySound = soundPlayer.playSound(audioBuffer, false);
```
Stop a sound:
```typescript
soundPlayer.stopSound(mySound);
```
Toggle the volume on or off:
```typescript
soundPlayer.toggle();
```
If you want to do more advanced things with the Web Audio API, go ahead and create your own nodes, and connect them to `soundPlayer.fader.gainNode`.

</p></details>

<details>
  <summary>Loop music (JukeBox)</summary><p>

Create a JukeBox:
```typescript
jukeBox = new PH.JukeBox(soundPlayer);
```
Play one or more tracks:
```typescript
jukeBox.setMusic(myTrack /*, myTrack2, myTrack3, ... */);
```
Stop the music:
```typescript
jukeBox.setMusic();
```

</p></details>

