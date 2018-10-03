import * as path from 'upath2';
import { BaiduOcr } from '../index';
import moment = require('moment');
import fs = require('fs-extra');

require('dotenv').config({
	path: path.join(__dirname, '..', '.env'),
});

import console from 'debug-color2';
console.setOptions({
	label: true,
	time: true,
	inspectOptions: {
		colors: true,
	},
});

const client = new BaiduOcr(process.env.BAIDU_AIP_APP_ID, process.env.BAIDU_AIP_API_KEY, process.env.BAIDU_AIP_SECRET_KEY);

client.recognizeFile('temp/0003.png')
	.tap(async function (ret)
	{
		console.ok(moment());
		console.dir(ret);

		//await fs.outputJSON('./temp/result.json', ret);
	})
;
