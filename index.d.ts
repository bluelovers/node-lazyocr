/**
 * Created by user on 2018/8/21/021.
 */
/// <reference types="node" />
import Promise = require('bluebird');
import moment = require('moment');
import { ocr as AipOcrClient } from "baidu-aip-sdk";
export declare const HASH_ALG = "sha1";
export declare const HASH_DIGEST = "hex";
export declare function parseFile(file: string | Buffer): Promise<{
    meta: IMeta;
    buf: Buffer;
}>;
export declare function createHash(input: any, alg?: string, digest?: string): any;
export interface IBaiduOcrResultError {
    error_msg: string;
    error_code: number;
}
export interface IBaiduOcrResult {
    log_id: number;
    direction?: number;
    words_result_num: number;
    words_result: {
        words: string;
        probability?: {
            variance: number;
            average: number;
            min: number;
        };
    }[];
}
export interface IMeta {
    file: string;
    fileResolve: string;
    hash: string;
    pathData: import("upath2/lib/type").IParse;
}
export interface IBaiduOcrCache {
    meta: IMeta;
    date: Date | moment.Moment | number | string;
    time_use: number;
    result: IBaiduOcrResult;
}
export declare class BaiduOcr {
    client: AipOcrClient;
    options: {
        detect_language: boolean;
        probability: boolean;
    };
    eol: string;
    constructor(APP_ID: number | string, API_KEY: string, SECRET_KEY: string);
    recognizeFile(file: string | Buffer, options?: {
        disableCache?: boolean;
        overwrite?: boolean;
    }): Promise<{
        meta: IMeta;
        date: string | number | Date | moment.Moment;
        time_use: number;
        result: IBaiduOcrResult;
        output: string;
    }>;
    apiBuffer(buf: Buffer | Promise<Buffer>): Promise<IBaiduOcrResult>;
    apiBase64(base64: string | Promise<string>): Promise<IBaiduOcrResult>;
    validResultError<T extends IBaiduOcrResultError>(result: T | any): result is IBaiduOcrResultError & T;
    validResult(result: IBaiduOcrResult): result is IBaiduOcrResult;
    validResult(result: any): result is IBaiduOcrResult;
    toResultWords(result: IBaiduOcrResult): string[];
    stringify(result: IBaiduOcrResult): string;
}
export default BaiduOcr;
