const http = require('http');
const URL = require('url');
const path = require('path');
const querystring = require('querystring');
const fs = require('fs');
const { evilTestSwitch, evilTypeCode, PARAMS_ERROR_CODE, TIMEOUT_CODE, ONE_IN_UID_LIST_ERROR_CODE, ONE_IN_UID_LIST_TIMEOUT_CODE, EVIL_TYPE_CODE_MAP, REQUEST_TIMEOUT_MS } = require('../config/evilTest');
const { USER_NUMBER, RETURN_SUCCESS_INFO } = require('../config/index');

// 连接数据库有点麻烦，直接模拟数据库所有user_profile信息
const generateProfiles = function (userNumber) {
    return Array(userNumber).fill('').map((item, index) => {
        return { uid: index + 1, profile: `profile${index + 1}` };
    });
};
const allProfileList = generateProfiles(USER_NUMBER);

http.createServer(function (request, response) {
    const urlObj = URL.parse(request.url);
    const pathname = querystring.unescape(urlObj.pathname);
    const params = querystring.parse(urlObj.query);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (params.uid) {
        const uids = params.uid.split(',').map(item => Number(item));
        // 一切正常的情况
        if (evilTestSwitch === false) {
            const profiles = allProfileList.filter((item, index) => {
                return uids.indexOf(item.uid) > -1;
            });
            response.writeHead(200);
            response.end(JSON.stringify(RETURN_SUCCESS_INFO({ data: profiles })));
            return;
        }

        // 用Promise模拟出现异常的情况
        const data = [];
        const uidLen = uids.length;
        let uidPromises = [];
        let reTryUids = [];

        switch (evilTypeCode) {
            case ONE_IN_UID_LIST_TIMEOUT_CODE:
                uidPromises = uids.map((uid, index) => {
                    return new Promise((r, j) => {
                        const lastIndex = uids.length - 1;
                        setTimeout(function () {
                            const uidItem = allProfileList.find(item => {
                                return item.uid === uid;
                            });
                            r(uidItem)
                            // 让最后一个uid故意100%超时
                        }, uidLen > 1 && index === lastIndex ? 10000 : 2000);
                    }).then(uidItem => {
                        data.push(uidItem);
                        return uidItem;
                    })
                })
                const p = Promise.race([
                    Promise.all(uidPromises),
                    new Promise(function (r, j) {
                        // 总时间超时
                        console.log(`总时间超时！超过${REQUEST_TIMEOUT_MS}毫秒`);
                        setTimeout(() => j('request timeout'), REQUEST_TIMEOUT_MS)
                    })
                ])
                    .then(data => {
                        response.writeHead(200);
                        response.end(JSON.stringify(RETURN_SUCCESS_INFO({ data })));
                    })
                    .catch(error => {
                        reTryUids = uids.filter(uid => {
                            return !data.find(item => { return item.uid === uid });
                        });
                        const returnInfo = EVIL_TYPE_CODE_MAP[evilTypeCode].returnInfo(REQUEST_TIMEOUT_MS, '毫秒', data, reTryUids);
                        response.writeHead(200);
                        response.end(
                            JSON.stringify(returnInfo),
                        );
                    });
                break;
            case ONE_IN_UID_LIST_ERROR_CODE:
                uidPromises = Promise.all(uids.map((uid, index) => {
                    return new Promise((r, j) => {
                        const lastIndex = uids.length - 1;
                        setTimeout(function () {
                            const uidItem = allProfileList.find(item => {
                                return item.uid === uid;
                            });
                            // 模拟其中有两个出错了
                            if (uidLen > 3 && (index === lastIndex || index === lastIndex - 1)) {
                                reTryUids.push(uidItem.uid);
                                j(uidItem)
                            } else {
                                r(uidItem)
                            }
                        });
                    }).then(uidItem => {
                        data.push(uidItem);
                        return uidItem;
                    })
                })).then(res => {
                    response.writeHead(200);
                    response.end(JSON.stringify(RETURN_SUCCESS_INFO({ data: res })));
                }).catch(() => {
                    const returnInfo = EVIL_TYPE_CODE_MAP[evilTypeCode].returnInfo(reTryUids.length, data, reTryUids);
                    response.writeHead(200);
                    response.end(
                        JSON.stringify(returnInfo),
                    );
                });
                break;
            // 其他错误比如参数错误。此时reTryUids为空数组，这些错误，前端不会在catch回调里发起自动重试。
            case PARAMS_ERROR_CODE:
                response.writeHead(200);
                response.end(
                    JSON.stringify(EVIL_TYPE_CODE_MAP[evilTypeCode].returnInfo('uid 参数错误！', reTryUids)),
                );
                break;
            default:
                response.writeHead(200);
                response.end(
                    JSON.stringify(EVIL_TYPE_CODE_MAP[evilTypeCode].returnInfo(reTryUids)),
                );
                break;
        }
    }
}).listen(8080);

console.log('Server running at http://127.0.0.1:8080/');
