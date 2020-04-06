# pH
A starting point for HTML games in Typescript

### What is it?
pH consists of the following components:
- The _pH library_: a library of typescript classes and functions to assist with HTML game development.
- The _pH tool_: a node script that provides game bundling functionality and an HTTP server for debugging in Firefox.
- Some useful default settings for building and testing games in VS Code with the Debugger for Firefox extension.

Features include:
- _Loader_: downloads files and automatically converts them into useful objects (soundes, images, etc.) based on the file extension. Uses promises so you can use async/await.
- _CanvasUILayer_: provides button functionality for the canvas.
- _PixelFont_: draws bitmap fonts.
- _PixelationLayer_: scales up a low-res game.
- _SoundPlayer_ and _JukeBox_: provide a simple interface for playing sounds and looping music through Web Audio.
- More classes and functions to simplify various game-related operations.

### Caveats
1. The (optional) pH tool is a node script that, among other things, writes to your hard drive, and runs an HTTP server. You should be wary of any downloaded script that does either of these things. Bugs in code that write to your hard drive could cause data loss. Bugs in code that runs an HTTP server could affect your privacy. You should check any such script and make sure it does what you think it does, before running it.
2. This framework is at a very early stage of development. Expect major changes to the architecture as time goes on.
3. Be aware that if you are making an HTML game for people to play on the web, you need a web server to host it on. As far as I am aware, file sharing services like DropBox don't cut it.

### Getting Started
<details>
  <summary>I'm using the pH library and pH tool</summary><p>
  
1. Install typescript version 3.7.5 or higher and node version 12.16.1 or higher. If you want to use VS Code and the Debugger for Firefox: install VS Code, Firefox, and the Debugger for Firefox extension.
2. Download a copy of the repo.
3. Create a new directory for your game project.
4. Open a terminal, navigate to your project directory, and enter
   ```
   node path_to_ph/ph/ph.js init
   ```
   This adds files to the project directory to create an empty game. It also provides you with a list of entries that you should consider adding to your version control file (e.g., your .gitignore file).
5. Edit ph.json with your text editor and edit the title, description and gameId fields. (gameId is just a short string identifying your game.)
6. Start the pH tool, the typescript compiler, and try running the game:
   - If you're using VS Code: open the newly created file `ph-dev.code-workspace` in VS Code. Open the build task list (Default: Ctrl-Shift-B) and select "Watch Source and Data". Then run the game in the Debugger for Firefox (Default: F5.)
   - If you're not using VS Code: Open a terminal, navigate to your project directory and enter
     ```
     node path_to_ph/ph.js watch
     ```
     to start the ph tool in watch mode. Open a second terminal, navigate to your project directory, and enter
     ```
     tsc -p tsconfig.json --watch
     ```
     to start the typescript compiler in watch mode. Now open your browser and enter `http://localhost:8080/game/index.html` into the URL browser.
  
</p></details>
<details>
  <summary>I've set up my own project - I'm just using the pH library</summary><p>

1. Install typescript version 3.7.5 or higher.
2. Download a copy of the repo, and copy the ph/lib folder into your own project.
3. Open tsconfig.json, and add "lib/**/*" to the list of includes, before your own files.

</p></details>

### Howto
I have tried to make the different features of pH as independent as possible. The _FrameManager_ and _LayerManager_ classes together provide something like a game loop, but you don't have to use them to use other features. The pH tool prescribes a certain directory structure for your project, but you can use the library without using the pH tool. Guides to specific features are below.

#### General

<details>
  <summary>Bundle your game using the pH tool</summary><p>
  
If you use VSCode with the default project setup created by the pH tool's init command, the easiest way to run the pH tool is to run the build command "Watch Source and Data" from VSCode. To run the ph tool (outside of VSCode), open a terminal, navigate to your project directory, and enter
```
node path_to_ph/ph.js watch
```
This tool watches the filesystem for changes to your project, and updates the build/ subdirectory with the latest version of your game. It also runs an HTTP server which you can use to run and debug your game. (Why do you need an HTTP server? The reason is that browsers refuse to let web page javascript code load files directly off your hard drive, for security reasons.)

Project settings are in the ph.json file in your project directory. You should set gameId, title, and description yourself.

The pH tool treats certain subdirectories of your project as special:
- _resources/_ - Files placed here will be bundled into the "game.dat" file in your build directory, as long as they have one of the extensions in your resourceExtensions setting. The "game.dat" file can be loaded into your game using the Loader class in the pH library.
- _static/_ - Files placed here will be copied without change into your build directory.
- _staticRoot/_ - Files placed here will not be copied across, but they will appear in the root directory in your HTTP server. You could put some site-wide files here, like a favicon or css file, to test that your game uses them correctly.
- _template/_ - Files placed here will be copied into the build directory, but in a modified form. The pH tool searches the files for patterns of the form ${<key>}, look up the key in your project's ph.json file, and substitute the corresponding value.
- _phaux/_ - pH expects typescript to use this folder as its compile destination. So it expects to find ".js" files here, which will be copied to the build directory. (Also, the default project setup tells Debugger for Firefox to find the source map files here, for easy debugging.)
- _src/_ - Not used directly by the pH tool. But the default project settings tell typescript to look for source files here.

You can change these directories by editing the values in ph.json, but note that you will have to make corresponding changes to tsconfig.json, localtsconfig.json, .vscode/tasks.json and .vscode/launch.json.

A file in resources/ is only bundled into game.dat if its extension is in the "resourceExtensions" list. If you want to include other file types in your game, you can add the extensions here. However, the resource loader won't know how to decode them unless you write a file type handler, and register it with the resource loader. See that section for more details.

Another setting you may like to change is "allowRemote". If this is `false`, the HTTP server only allows connections from your own computer. If you set it to `true`, it will allow remote connections. On a typical home network, this means you can connect with other devices on your local network (so you can test the game on your phone). But if your computer has a public facing IP address then setting it to `true` will make the HTTP server accessible on the internet.
</p></details>

<details>
  <summary>Preload assets (Loader)</summary><p>
  
Constructing a loader (the Loader constructor requires an audiocontext, which it can use to decode audio files):
```typescript
let audioContext = new AudioContext();
let loader = new PH.Loader(audioContext);
```
Example of downloading a file (call from an async function):
```typescript
let mainFont = <PH.PixelFont>await loader.getFile('m5x7.bff');
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
  
Example usage of a frame manager:
```typescript
let fm = new PH.FrameManager({
    frameCallback: (deltat) => frame(deltat)
});
fm.start();
```
Now your frame function will be called every "frame". The value of deltat passed to your function will be the time since the last frame. The definition of a frame is up to the browser, but in my experience it is often every 1/60 seconds, as long as your computer can handle it. You can call `fm.stop()` to stop it. You can check `fm.frameRate` if you want an estimate of the frame rate.
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
layerManager.setupMouseListeners(canvas);
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
Now, if your MenuLayer class overrides the Layer class's `draw` function, it will get called as part of layerManager's draw step. If you override the `update` function, it will get called as part of the LayerManager's update step. And if you override one of the mouse or keyboard handling functions (e.g., `handleClick`, it will get called on the corresponding mouse or keyboard event.

If you have multiple layers, the layer manager's draw function will call them in order from first to last. The update function and the event handlers will call them in reverse order. Furthermore, for update and most of the event handlers, your override function must return a boolean value. If this return value is `true`, the layer manager will continue on its way. But if you return `false`, the layer manager will consider this event "caught" by your layer, and will not call the event handlers for the layers under it. It will also cancel the event so that other objects in the DOM and the browser won't try to process it.

The exception to this is handleMouseMove, which can't be cancelled in this way.

Mouse move is special in another way, which is that two functions get called: handleMouseMoveClientCoords - which is passed the _client_  coordinates (i.e. pixel coordinates in the browser's viewport), and handleMouseMove - which is not passed any parameters. Often, you don't want to work with client coordinates. Therefore, one way to work with mouse move events is to define a layer that overrides handleMouseMoveClientCoords, converts the client coordinates into a coordinate system you do want to use, and stores the result somewhere. Then, other layers can just implement handleMouseMove, and look up the computed coordinates.

The `setupMouseListeners` method has a second, optional, parameter, `touchToo`. Set this to `true` if you want the LayerManager to listen to touch-related events, and try to pretend that they are mouse events. This might give you an easy way to handle touch, but it is quite simplistic. In particular, you can't handle multitouch this way.

As a convenience, LayerManager has three functions to set layers: `setBottomLayers`, `setMainLayers` and `setTopLayers`. LayerManager just concatenates these (in the order bottom, main, top) to produce the full list of layers. The reason for this is that there may be layers that you want to add permanently (such as a PixelationLayer, which you would add at the top), while other layers are changing due to your game logic.

</p></details>

<details>
  <summary>Save and load data across sessions, (localStorageSave, localStorageLoad and related functions)</summary><p>
Todo
</p></details>

<details>
  <summary>Delay a fixed time in an async/await function (delay)</summary><p>
Todo
</p></details>

<details>
  <summary>Get the current time, in seconds (curTime)</summary><p>
Todo
</p></details>

#### Graphics

<details>
  <summary>Create an off-screen canvas (createCanvas)</summary><p>
Todo
</p></details>

<details>
  <summary>Set up pixelated graphics (PixelationLayer)</summary><p>
Todo
</p></details>

<details>
  <summary>Draw rectangles using sprites (SpriteBox)</summary><p>
Todo
</p></details>

<details>
  <summary>Fill the canvas a solid color (fillCanvas)</summary><p>
Todo
</p></details>

<details>
  <summary>Download a font into the document (quickFont)</summary><p>
Todo
</p></details>

<details>
  <summary>Resize a canvas to take up the whole window (resizeCanvasToFullWindow)</summary><p>
Todo
</p></details>

#### UI

<details>
  <summary>Create interactive buttons on the canvas, (CanvasButton and CanvasUILayer)</summary><p>
Todo
</p></details>

<details>
  <summary>Use a custom mouse cursor in the canvas (CanvasCursorLayer)</summary><p>
Todo (also explain why we would do this, when we can do it with css)
</p></details>

<details>
  <summary>Draw fonts (SimpleFont and PixelFont)</summary><p>
Todo
</p></details>

<details>
  <summary>Change the color of an image (changeImageColor)</summary><p>
Todo
</p></details>

#### Sound

<details>
  <summary>Play sounds (SoundPlayer)</summary><p>
Todo
</p></details>

<details>
  <summary>Loop music (JukeBox)</summary><p>
Todo
</p></details>

