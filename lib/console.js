"use strict";
/**
 * Created by user on 2018/10/3/003.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const debug_color2_1 = require("debug-color2");
exports.console = new debug_color2_1.Console(null, {
    label: true,
    time: true,
    inspectOptions: {
        colors: true,
    },
});
exports.consoleDebug = new debug_color2_1.Console(null, {
    label: true,
    time: true,
    inspectOptions: {
        colors: true,
    },
});
exports.default = exports.console;
