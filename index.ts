/**
 * Created by user on 2018/8/21/021.
 */

import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import Promise = require('bluebird');
import * as path from 'upath2';

import console from 'debug-color2';
console.setOptions({
	inspectOptions: {
		colors: true,
	},
});

//import moment = require('moment-timezone');
import moment = require('moment');

import { ocr as AipOcrClient } from "baidu-aip-sdk";

export const HASH_ALG = 'sha1';
export const HASH_DIGEST = 'hex';
//export const HASH_DIGEST = 'base64';

export function parseFile(file: string | Buffer)
{
	return Promise
		.resolve(file)
		.then(async function ()
		{
			let buf: Buffer;
			let pathData: ReturnType<typeof path.parse> = null;
			let fileResolve: string = null;

			if (Buffer.isBuffer(file))
			{
				buf = file;
			}
			else
			{
				fileResolve = path.resolve(file);
				pathData = path.parse(fileResolve);
				buf = await fs.readFile(fileResolve);
			}

			let hash = createHash(buf);

			let meta: IMeta = {
				file: pathData ? file as string : null,
				fileResolve,
				hash,
				pathData,
			};

			//console.dir(meta);

			return {
				meta,
				buf,
			};
		})
		;
}

export function createHash(input: any, alg?: string, digest?: string)
{
	// @ts-ignore
	return crypto.createHash(alg || HASH_ALG).update(input).digest(digest || HASH_DIGEST)
}

export interface IBaiduOcrResultError
{
	error_msg: string;
	error_code: number;
}

export interface IBaiduOcrResult
{
	log_id: number,

	direction?: number,

	words_result_num: number,
	words_result: {
		words: string,
		probability?: {
			variance: number,
			average: number,
			min: number,
		}
	}[],
}

export interface IMeta
{
	file: string;
	fileResolve: string;
	hash: string;
	pathData: import("upath2/lib/type").IParse;
}

export interface IBaiduOcrCache
{
	meta: IMeta,
	date: Date | moment.Moment | number | string,
	time_use: number,
	result: IBaiduOcrResult,
}

export class BaiduOcr
{
	client: AipOcrClient;
	options = {
		detect_language: true,
		probability: true,
	};

	eol = "\n";

	constructor(APP_ID: number | string, API_KEY: string, SECRET_KEY: string)
	{
		if (!APP_ID || !API_KEY || !SECRET_KEY)
		{
			console.error({
				APP_ID,
				API_KEY,
				SECRET_KEY,
			});

			throw new Error(`API 設定錯誤`);
		}

		this.client = new AipOcrClient(String(APP_ID), API_KEY, SECRET_KEY);
	}

	recognizeFile(file: string | Buffer, options: {
		disableCache?: boolean,
		overwrite?: boolean,
	} = {})
	{
		return parseFile(file)
			.bind(this)
			.then(async function (this: BaiduOcr, {
				meta,
				buf,
			})
			{
				let cache_file = meta.fileResolve + '.cache';
				let cache_txt = meta.fileResolve + '.txt';

				let result: IBaiduOcrResult;
				let output: string;

				options = options || {};

				const disableCache = options && options.disableCache;

				console.debug(`檢查 ${meta.pathData.base}`);

				if (disableCache)
				{
					console.debug(`停用緩存功能`);
				}

				let date: Date | moment.Moment | number | string;
				let time_use = 0;

				if (meta.fileResolve)
				{
					if (!disableCache && await fs.pathExists(cache_file))
					{
						console.debug(`此檔案已經解析過了`);

						let json: IBaiduOcrCache = await fs.readJSON(cache_file);
						let bool = json.meta.hash === meta.hash;

						if (bool && options.overwrite)
						{
							console.debug(`配對成功，但強制覆寫`);
						}
						else if (bool)
						{
							console.debug(`配對成功，讀取緩存資料`);
							result = json.result;
							output = await this.stringify(result);

							time_use = json.time_use;
							date = json.date ? moment(json.date) : moment();
						}
						else
						{
							console.warn(`配對失敗，重新處理檔案`);
						}
					}
					else
					{
						console.info(`開始處理 ${meta.pathData.base}`);
					}
				}

				if (!result)
				{
					let ss = Date.now();

					result = await this.apiBuffer(buf);
					output = await this.stringify(result);

					time_use = Date.now() - ss;
					date = moment();
				}

				if (!result || !result.words_result_num)
				{
					console.fail(`解析失敗，沒有分析到任何文字`);
				}

				if (!disableCache && meta.fileResolve)
				{
					console.debug(`寫入緩存資料`);

					await fs.writeFile(cache_txt, output);

					await fs.writeJSON(cache_file, {
						meta,
						date,
						time_use,
						result,
					}, {
						spaces: "\t",
					});
				}

				console.debug(`結束 ${meta.pathData.base}`);

				return {
					meta,
					date,
					time_use,
					result,
					output,
				}
			})
		;
	}

	apiBuffer(buf: Buffer | Promise<Buffer>)
	{
		let self = this;

		return Promise
			.resolve(buf)
			.tap(function ()
			{
				console.debug(`處理 Buffer 資料`)
			})
			.then(function (buf)
			{
				return buf.toString("base64");
			})
			.then(function (base64)
			{
				return self.apiBase64(base64);
			})
			;
	}

	apiBase64(base64: string | Promise<string>)
	{
		let self = this;

		let ss = Date.now();

		return Promise
			.resolve(base64)
			.tap(function ()
			{
				console.debug(`開始傳送至伺服器`)
			})
			.then(function (base64)
			{
				return self.client.accurateBasic(base64, self.options) as any as IBaiduOcrResult
			})
			.tap(function (result)
			{
				if (!self.validResult(result))
				{
					let err = new Error(`發生錯誤 ${JSON.stringify(result)}`) as Error & IBaiduOcrResultError;
					return Promise.reject(Object.assign(err, result));
				}

				console.debug(`伺服器分析已完成`, '耗時', Date.now() - ss, 'ms')
			})
			;
	}

	validResultError<T extends IBaiduOcrResultError>(result: T | any): result is IBaiduOcrResultError & T
	{
		if (result && (result.error_code || result.error_msg))
		{
			return true;
		}

		return false;
	}

	validResult(result: IBaiduOcrResult): result is IBaiduOcrResult
	validResult(result: any): result is IBaiduOcrResult
	validResult(result: IBaiduOcrResult | IBaiduOcrResultError): result is IBaiduOcrResult
	{
		if (this.validResultError(result))
		{
			console.error(result);
		}
		else if (!result)
		{
			console.error(`result is ${typeof result}`);
		}
		else if (!result.words_result_num || !result.words_result || !result.words_result.length)
		{
			console.error(`result list is empty`);
		}
		else
		{
			return true;
		}

		return false;
	}

	toResultWords(result: IBaiduOcrResult)
	{
		return result
			.words_result
			.reduce(function (a: string[], result)
			{
				a.push(result.words);

				return a;
			}, [])
			;
	}

	stringify(result: IBaiduOcrResult)
	{
		return this.toResultWords(result).join(this.eol);
	}
}

export default BaiduOcr
