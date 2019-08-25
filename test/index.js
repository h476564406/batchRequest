const { RETURN_SUCCESS_INFO } = require('../config/index');
const { EXCEPTION_LIST } = require('../test/exceptionsCase');
const { PARAMS_ERROR_CODE, ONE_IN_UID_LIST_TIMEOUT_CODE, ONE_IN_UID_LIST_ERROR_CODE, REQUEST_TIMEOUT_MS, EVIL_TYPE_CODE_MAP } = require('../config/evilTest');

/**
 * 
 * @param {*} ts setTimeout的定时时间
 * @param {*} expectionConfig  异常case配置
 * @param {*} triggerBatchTaskNumber 触发批量请求
 */
function initConfig(ts, triggerBatchTaskNumber, expectionConfig) {
    let timer = null;
    let cacheAjaxReqQueue = [];

    // 请求完毕，要从cacheAjaxReqQueue删除掉请求成功的对象。
    function filterCacheAjaxReqQueue(uidList) {
        cacheAjaxReqQueue = cacheAjaxReqQueue.filter(uid => {
            return uidList.indexOf(uid) === -1;
        })
    };

    // 设置定时器，每次定时器的回调被执行的时候，把cacheAjaxReqQueue里去重过的uidList作为参数发起batchRequest。
    function watchingStart(ts) {
        clearTimeout(timer);
        setTimeout((function () {
            console.log(`-----------watchingStart! settimeout ${ts}, cacheAjaxReqQueue.length ${cacheAjaxReqQueue.length}`);
            // 如果cacheAjaxReqQueue为空，那么重新设置定时器。
            if (!cacheAjaxReqQueue.length) {
                timer = watchingStart(ts);
                return;
            }
            // 去重操作
            const uidList = Array.from(new Set(cacheAjaxReqQueue));
            batchRequest(uidList)
        }), ts);
    };

    // 得到的profiles信息
    const getProfiles = function (profiles) {
        console.log('getProfiles');
        profiles.forEach((profile) => { });
    }

    // 遍历收集uid，确定列表长度，是否发起batchRequest
    function collectUids(uid) {
        if (cacheAjaxReqQueue.indexOf(uid) === -1) {
            cacheAjaxReqQueue.push(uid);
        }
        if (cacheAjaxReqQueue.length >= triggerBatchTaskNumber) {
            batchRequest(cacheAjaxReqQueue);
        }
    }

    let batchRequestIndex = 0;
    const batchRequest = function (uidList) {
        console.log(`batchRequest 执行第${++batchRequestIndex}次`);
        new Promise((r, j) => {
            if (expectionConfig.evilTestSwitch === false) {
                // 模拟异步调用完全成功
                setTimeout(function () {
                    const allProfileList = uidList.map(uid => {
                        return {
                            uid,
                            profile: `profile: ${uid}`
                        }
                    })
                    r(RETURN_SUCCESS_INFO({ data: allProfileList }));
                }, 2000)
            } else if (expectionConfig.evilTestSwitch === true) {
                // 模拟异步调用出现特定code码的异常
                EXCEPTION_LIST[expectionConfig.evilTypeCode](uidList, expectionConfig.evilTypeCode)
                    .then(res => {
                        r(res);
                    })
                    .catch((expection) => {
                        j(expection);
                    })
            }
        }).then(res => {
            const profiles = res.data;
            console.log(`perfect success! profiles.length 获得profiles ${profiles.length} 个`);
            getProfiles(profiles);
            filterCacheAjaxReqQueue(profiles.map(item => { return item.uid }));
            //  重新设置定时器
            timer = watchingStart(ts);
        }).catch(error => {
            if (error.code === ONE_IN_UID_LIST_TIMEOUT_CODE || error.code === ONE_IN_UID_LIST_ERROR_CODE) {
                console.log(`exception occur! profiles.length 获得profiles ${error.data.length} 个, 需要重试的uid ${error.reTryUids.length} 个：[${error.reTryUids.toString()}] `);
                console.log(`错误码: ${error.code}, 错误信息：${error.message} `);
                getProfiles(error.data);
                if (error.reTryUids && error.reTryUids.length) {
                    batchRequest(error.reTryUids);
                } else {
                    //  重新设置定时器
                    timer = watchingStart(ts);
                }
                filterCacheAjaxReqQueue(error.data.map(item => { return item.uid }));
            } else {
                // 其他类型的错误就不重新设置定时器了比如参数错误
                console.log(`错误码: ${error.code}, 错误信息：${error.message} `);
            }
        })
    };

    return function runTest(taskNumber) {
        console.log(`当前准备发起${taskNumber}次请求`, `${ts}ms内的请求会短时合并`);
        if (taskNumber < triggerBatchTaskNumber) {
            timer = watchingStart(ts);
        }
        for (let uid = 1; uid <= taskNumber; uid++) {
            collectUids(uid);
        }
    };
}

// [success]: 异步调用完全成功 evilTestSwitch: false
// const runTest = initConfig(100, 100, { evilTestSwitch: false });

// [exception]: 出现各种异常情况 evilTestSwitch: true, evilTypeCode 异常类型
// exception1
const runTest = initConfig(100, 100, { evilTestSwitch: true, evilTypeCode: ONE_IN_UID_LIST_TIMEOUT_CODE });
// exception2
// const runTest = initConfig(100, 100, { evilTestSwitch: true, evilTypeCode: ONE_IN_UID_LIST_ERROR_CODE });
// exception3
// const runTest = initConfig(100, 100, { evilTestSwitch: true, evilTypeCode: PARAMS_ERROR_CODE });

// 因为uid列表长度<100，会按定时器来发起batchRequest
// runTest(50);

// 因为uid列表长度>=100，会直接发起batchRequest
runTest(100);
