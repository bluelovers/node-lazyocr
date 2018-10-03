/**
 * Created by user on 2018/8/21/021.
 */

import yargs = require('yargs');
import path = require('path');
import fs = require('fs-extra');
import fg = require('fast-glob');
import bluebird = require('bluebird');
import PACKAGE_JSON = require('../package.json');
import updateNotifier = require('update-notifier');
import console from '../lib/console';
import { BaiduOcr } from '../index';

const argv = yargs
	.option('app-id', {
		string: true,
		default: process.env.BAIDU_AIP_APP_ID,
	})
	.option('app-key', {
		string: true,
		default: process.env.BAIDU_AIP_API_KEY,
	})
	.option('secret-key', {
		string: true,
		default: process.env.BAIDU_AIP_SECRET_KEY,
	})
	.option('save-token', {
		alias: ['s'],
		boolean: true,
	})
	.option('disableCache', {
		boolean: true,
	})
	.option('overwrite', {
		boolean: true,
	})
	.option('deep', {
		number: true,
		default: 1,
	})
	.option('pattern', {
		alias: ['p'],
		array: true,
	})
	.option('cwd', {
		string: true,
		normalize: true,
		default: process.cwd(),
	})
	.showHelpOnFail(true)
	.argv
;

updateNotifier({
	pkg: PACKAGE_JSON,
}).notify();

const cwd = argv.cwd || process.cwd();

[
	cwd,
	process.cwd(),
	path.join(__dirname, '..'),
].forEach(function (cwd)
{
	if (!argv.appId || !argv.appKey || !argv.secretKey)
	{
		let ef: string;
		ef = path.join(cwd, '.env');

		if (fs.existsSync(ef))
		{
			require('dotenv').config({
				path: ef,
			});

			argv.appId = argv.appId || process.env.BAIDU_AIP_APP_ID;

			argv.appKey = argv.appKey || process.env.BAIDU_AIP_API_KEY;

			argv.secretKey = argv.secretKey || process.env.BAIDU_AIP_SECRET_KEY;
		}
	}
});

let pattern: string[] = [];

if (argv._.length)
{
	pattern.push(...argv._)
}
else
{
	pattern.push('*.png');
	pattern.push('*.jpg');
}

//console.dir(argv);

bluebird
	.resolve(fg.async<string>(pattern, {
		deep: argv.deep,
		cwd,
		onlyFiles: true,
		absolute: true,
	}))
	.then(ls =>
	{
		const client = new BaiduOcr(argv.appId, argv.appKey, argv.secretKey);

		console.yellow.info(`總共找到 ${ls.length} 檔案`);

		let _cache = {
			success: 0,
			fail: 0,
		};

		return bluebird
			.mapSeries(ls, function (file)
			{
				let base = path.relative(cwd, file);

				console.log(`開始處理 ${base}`);

				return client.recognizeFile(file, {
						disableCache: argv.disableCache,
						overwrite: argv.overwrite,
					})
					.tap(async function (ret)
					{
						console.success(`結束 ${base}`);

						_cache.success++;
					})
					.tapCatch(async function (e)
					{
						console.fail(`發生錯誤 ${base}`, e.message);

						_cache.fail++;
					})
					;
			})
			.tap(async function ()
			{
				console.info(`總共 完成 x ${_cache.success}, 失敗 x ${_cache.fail}`);
			})
			;
	})
;
