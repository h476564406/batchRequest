const { RETURN_SUCCESS_INFO } = require('../config/index');
const { PARAMS_ERROR_CODE, ONE_IN_UID_LIST_TIMEOUT_CODE, ONE_IN_UID_LIST_ERROR_CODE, REQUEST_TIMEOUT_MS, EVIL_TYPE_CODE_MAP } = require('../config/evilTest');

// 用Promise模拟出现异常的情况

const data = [];
let uidPromises = [];
let reTryUids = [];

const EXCEPTION_LIST = {
    // case1: 客户端只发起一个api，但是node层在处理请求的时候，可能是在内网中调用其他服务，最后进行聚合。
    // 考虑node层n个请求，前n-1个请求都请求成功，第n个请求迟迟不反悔的情况。node层设置超时配置，到达时间后，
    // 将前n-1个的profileList和需要重新发起api的uid信息返回。
    [ONE_IN_UID_LIST_TIMEOUT_CODE]: function (uids, evilTypeCode) {
        const allProfileList = uids.map(uid => {
            return {
                uid,
                profile: `profile: ${uid}`
            }
        })
        const uidLen = uids.length;
        uidPromises = uids.map((uid, index) => {
            return new Promise((r, j) => {
                const lastIndex = uids.length - 1;
                setTimeout(function () {
                    const uidItem = allProfileList.find(item => {
                        return item.uid === uid;
                    });
                    r(uidItem)
                    // 让最后一个uid故意100%超时
                }, uidLen > 1 && index === lastIndex ? 100000 : 100);
            }).then(uidItem => {
                data.push(uidItem);
                return uidItem;
            })
        })
        return Promise.race([
            Promise.all(uidPromises),
            new Promise(function (r, j) {
                // 总时间超时
                console.log(`总时间超时！超过${REQUEST_TIMEOUT_MS}毫秒`);
                setTimeout(() => j('request timeout'), REQUEST_TIMEOUT_MS)
            })
        ])
            .then(data => {
                return RETURN_SUCCESS_INFO({ data });
            })
            .catch(() => {
                reTryUids = uids.filter(uid => {
                    return !data.find(item => { return item.uid === uid });
                });
                const returnInfo = EVIL_TYPE_CODE_MAP[evilTypeCode].returnInfo(REQUEST_TIMEOUT_MS, '毫秒', data, reTryUids);
                return Promise.reject(returnInfo);
            });
    },
    // case2: 模拟批量获取的uid中有两个请求失败的情况。
    [ONE_IN_UID_LIST_ERROR_CODE]: function (uids, evilTypeCode) {
        const allProfileList = uids.map(uid => {
            return {
                uid,
                profile: `profile: ${uid}`
            }
        })
        const uidLen = uids.length;
        return Promise.all(uids.map((uid, index) => {
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
        })).then(data => {
            return RETURN_SUCCESS_INFO({ data });
        }).catch(() => {
            const returnInfo = EVIL_TYPE_CODE_MAP[evilTypeCode].returnInfo(reTryUids.length, data, reTryUids);
            return Promise.reject(returnInfo);
        });
    }
}

module.exports = {
    EXCEPTION_LIST
};
