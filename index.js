"use strict";
/**
 * Created by user on 2018/8/21/021.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const fs = require("fs-extra");
const Promise = require("bluebird");
const path = require("upath2");
const debug_color2_1 = require("debug-color2");
debug_color2_1.default.setOptions({
    inspectOptions: {
        colors: true,
    },
});
//import moment = require('moment-timezone');
const moment = require("moment");
const baidu_aip_sdk_1 = require("baidu-aip-sdk");
exports.HASH_ALG = 'sha1';
exports.HASH_DIGEST = 'hex';
//export const HASH_DIGEST = 'base64';
function parseFile(file) {
    return Promise
        .resolve(file)
        .then(async function () {
        let buf;
        let pathData = null;
        let fileResolve = null;
        if (Buffer.isBuffer(file)) {
            buf = file;
        }
        else {
            fileResolve = path.resolve(file);
            pathData = path.parse(fileResolve);
            buf = await fs.readFile(fileResolve);
        }
        let hash = createHash(buf);
        let meta = {
            file: pathData ? file : null,
            fileResolve,
            hash,
            pathData,
        };
        //console.dir(meta);
        return {
            meta,
            buf,
        };
    });
}
exports.parseFile = parseFile;
function createHash(input, alg, digest) {
    // @ts-ignore
    return crypto.createHash(alg || exports.HASH_ALG).update(input).digest(digest || exports.HASH_DIGEST);
}
exports.createHash = createHash;
class BaiduOcr {
    constructor(APP_ID, API_KEY, SECRET_KEY) {
        this.options = {
            detect_language: true,
            probability: true,
        };
        this.eol = "\n";
        if (!APP_ID || !API_KEY || !SECRET_KEY) {
            debug_color2_1.default.error({
                APP_ID,
                API_KEY,
                SECRET_KEY,
            });
            throw new Error(`API 設定錯誤`);
        }
        this.client = new baidu_aip_sdk_1.ocr(String(APP_ID), API_KEY, SECRET_KEY);
    }
    recognizeFile(file, options = {}) {
        return parseFile(file)
            .bind(this)
            .then(async function ({ meta, buf, }) {
            let cache_file = meta.fileResolve + '.cache';
            let cache_txt = meta.fileResolve + '.txt';
            let result;
            let output;
            options = options || {};
            const disableCache = options && options.disableCache;
            debug_color2_1.default.debug(`檢查 ${meta.pathData.base}`);
            if (disableCache) {
                debug_color2_1.default.debug(`停用緩存功能`);
            }
            let date;
            let time_use = 0;
            if (meta.fileResolve) {
                if (!disableCache && await fs.pathExists(cache_file)) {
                    debug_color2_1.default.debug(`此檔案已經解析過了`);
                    let json = await fs.readJSON(cache_file);
                    let bool = json.meta.hash === meta.hash;
                    if (bool && options.overwrite) {
                        debug_color2_1.default.debug(`配對成功，但強制覆寫`);
                    }
                    else if (bool) {
                        debug_color2_1.default.debug(`配對成功，讀取緩存資料`);
                        result = json.result;
                        output = await this.stringify(result);
                        time_use = json.time_use;
                        date = json.date ? moment(json.date) : moment();
                    }
                    else {
                        debug_color2_1.default.warn(`配對失敗，重新處理檔案`);
                    }
                }
                else {
                    debug_color2_1.default.info(`開始處理 ${meta.pathData.base}`);
                }
            }
            if (!result) {
                let ss = Date.now();
                result = await this.apiBuffer(buf);
                output = await this.stringify(result);
                time_use = Date.now() - ss;
                date = moment();
            }
            if (!result || !result.words_result_num) {
                debug_color2_1.default.fail(`解析失敗，沒有分析到任何文字`);
            }
            if (!disableCache && meta.fileResolve) {
                debug_color2_1.default.debug(`寫入緩存資料`);
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
            debug_color2_1.default.debug(`結束 ${meta.pathData.base}`);
            return {
                meta,
                date,
                time_use,
                result,
                output,
            };
        });
    }
    apiBuffer(buf) {
        let self = this;
        return Promise
            .resolve(buf)
            .tap(function () {
            debug_color2_1.default.debug(`處理 Buffer 資料`);
        })
            .then(function (buf) {
            return buf.toString("base64");
        })
            .then(function (base64) {
            return self.apiBase64(base64);
        });
    }
    apiBase64(base64) {
        let self = this;
        let ss = Date.now();
        return Promise
            .resolve(base64)
            .tap(function () {
            debug_color2_1.default.debug(`開始傳送至伺服器`);
        })
            .then(function (base64) {
            return self.client.accurateBasic(base64, self.options);
        })
            .tap(function (result) {
            if (!self.validResult(result)) {
                let err = new Error(`發生錯誤 ${JSON.stringify(result)}`);
                return Promise.reject(Object.assign(err, result));
            }
            debug_color2_1.default.debug(`伺服器分析已完成`, '耗時', Date.now() - ss, 'ms');
        });
    }
    validResultError(result) {
        if (result && (result.error_code || result.error_msg)) {
            return true;
        }
        return false;
    }
    validResult(result) {
        if (this.validResultError(result)) {
            debug_color2_1.default.error(result);
        }
        else if (!result) {
            debug_color2_1.default.error(`result is ${typeof result}`);
        }
        else if (!result.words_result_num || !result.words_result || !result.words_result.length) {
            debug_color2_1.default.error(`result list is empty`);
        }
        else {
            return true;
        }
        return false;
    }
    toResultWords(result) {
        return result
            .words_result
            .reduce(function (a, result) {
            a.push(result.words);
            return a;
        }, []);
    }
    stringify(result) {
        return this.toResultWords(result).join(this.eol);
    }
}
exports.BaiduOcr = BaiduOcr;
exports.default = BaiduOcr;
