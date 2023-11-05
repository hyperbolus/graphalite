![Banner](./docs/banner.svg)

# About
Graphalite is a library to render Geometry Dash levels

# Usage
See: `src/main.ts`

Toggle `Renderer.debug` to enable devtools window.

Event listeners will probably be moved in the Renderer or Camera classes.  
> [!IMPORTANT]  
> `loadLevel()` expects a un-b64 encoded un-gzipped level object string.  
> It should be semi-colon (;) delimited.

# Test
```sh
pnpm dev
```

# Credits
- Absolute for the blocks.h file I turned into JSON
- IliasHDZ inspiration from GDViewer/GDRenderW
- Colon for sprite viewer which helped in development
- maxnut and GDRender contributors for object.json
- fig for carrying my dumb ass

# License
This software is distributed under the MIT License