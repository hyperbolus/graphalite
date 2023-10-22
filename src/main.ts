"use strict";

import {Renderer} from "./Renderer";
import {Level} from "./Level";

import LEVEL from './levels/4284013.keyed?raw'
import ATLAS_1 from './resources/GJ_GameSheet-uhd.png'
import ATLAS_2 from './resources/GJ_GameSheet02-uhd.png'
import ATLAS_3 from './resources/FireSheet_01-uhd.png'

(async () => {
    const renderer = new Renderer(document.getElementById('display'));
    await renderer.initialize()
    renderer.loadLevel(LEVEL)
    renderer.draw();
})()