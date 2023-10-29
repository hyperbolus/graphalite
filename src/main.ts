"use strict";

import {Renderer} from "./Renderer";

import LEVEL from './levels/4284013.keyed?raw'

(async () => {
    const renderer = new Renderer(document.getElementById('display'));
    await renderer.initialize()

    let speed = 50

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'w': renderer.camera.y += speed; break;
            case 'a': renderer.camera.x -= speed; break;
            case 's': renderer.camera.y -= speed; break;
            case 'd': renderer.camera.x += speed; break;
            case 'q': renderer.camera.angle += 0.1; break;
            case 'e': renderer.camera.angle -= 0.1; break;
        }

        renderer.draw()
    })

    renderer.loadLevel(LEVEL)
    renderer.draw();
})()