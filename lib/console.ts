/**
 * Created by user on 2018/10/3/003.
 */

import { Console } from 'debug-color2';

export const console = new Console(null, {
	label: true,
	time: true,
	inspectOptions: {
		colors: true,
	},
});

export const consoleDebug = new Console(null, {
	label: true,
	time: true,
	inspectOptions: {
		colors: true,
	},
});

export default console
