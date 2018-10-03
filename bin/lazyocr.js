"use strict";
/**
 * Created by user on 2018/8/21/021.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const path = require("path");
const fs = require("fs-extra");
const fg = require("fast-glob");
const bluebird = require("bluebird");
const PACKAGE_JSON = require("../package.json");
const updateNotifier = require("update-notifier");
const console_1 = require("../lib/console");
const index_1 = require("../index");
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
    .argv;
updateNotifier({
    pkg: PACKAGE_JSON,
}).notify();
const cwd = argv.cwd || process.cwd();
[
    cwd,
    process.cwd(),
    path.join(__dirname, '..'),
].forEach(function (cwd) {
    if (!argv.appId || !argv.appKey || !argv.secretKey) {
        let ef;
        ef = path.join(cwd, '.env');
        if (fs.existsSync(ef)) {
            require('dotenv').config({
                path: ef,
            });
            argv.appId = argv.appId || process.env.BAIDU_AIP_APP_ID;
            argv.appKey = argv.appKey || process.env.BAIDU_AIP_API_KEY;
            argv.secretKey = argv.secretKey || process.env.BAIDU_AIP_SECRET_KEY;
        }
    }
});
let pattern = [];
if (argv._.length) {
    pattern.push(...argv._);
}
else {
    pattern.push('*.png');
    pattern.push('*.jpg');
}
//console.dir(argv);
bluebird
    .resolve(fg.async(pattern, {
    deep: argv.deep,
    cwd,
    onlyFiles: true,
    absolute: true,
}))
    .then(ls => {
    const client = new index_1.BaiduOcr(argv.appId, argv.appKey, argv.secretKey);
    console_1.default.yellow.info(`總共找到 ${ls.length} 檔案`);
    let _cache = {
        success: 0,
        fail: 0,
    };
    return bluebird
        .mapSeries(ls, function (file) {
        let base = path.relative(cwd, file);
        console_1.default.log(`開始處理 ${base}`);
        return client.recognizeFile(file, {
            disableCache: argv.disableCache,
            overwrite: argv.overwrite,
        })
            .tap(async function (ret) {
            console_1.default.success(`結束 ${base}`);
            _cache.success++;
        })
            .tapCatch(async function (e) {
            console_1.default.fail(`發生錯誤 ${base}`, e.message);
            _cache.fail++;
        });
    })
        .tap(async function () {
        console_1.default.info(`總共 完成 x ${_cache.success}, 失敗 x ${_cache.fail}`);
    });
});
