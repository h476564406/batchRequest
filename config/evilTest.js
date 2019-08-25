const PARAMS_ERROR_CODE = 1000;
const ONE_IN_UID_LIST_TIMEOUT_CODE = 1002;
const ONE_IN_UID_LIST_ERROR_CODE = 1003;
const REQUEST_TIMEOUT_MS = 1000;

// 异常和边界测试，在这个文件中配置。
const evilTypeList = [
    // case1: 客户端只发起一个api，但是node层在处理请求的时候，可能是在内网中调用其他服务，最后进行聚合。
    // 考虑node层n个请求，前n-1个请求都请求成功，第n个请求迟迟不反悔的情况。node层设置超时配置，到达时间后，
    // 将前n-1个的profileList和需要重新发起api的uid信息返回。
    {
        code: ONE_IN_UID_LIST_TIMEOUT_CODE,
        returnInfo: function (time = '3000', unit = '毫秒', data = [], reTryUids = []) {
            let timeInfo = '';
            if (time) {
                timeInfo = `耗时 ${time} ${unit}`;
            }
            console.log('object', {
                code: ONE_IN_UID_LIST_TIMEOUT_CODE,
                success: false,
                message: `批量获取的uid太多，先返回部分，${reTryUids.toString()} 请重新请求！! ${timeInfo}`,
                data,
                reTryUids
            });
            return {
                code: ONE_IN_UID_LIST_TIMEOUT_CODE,
                success: false,
                message: `批量获取的uid太多，先返回部分，${reTryUids.toString()} 请重新请求！! ${timeInfo}`,
                data,
                reTryUids
            };
        }
    },
    // case2: 模拟批量获取的uid中有两个请求失败的情况。
    {
        code: ONE_IN_UID_LIST_ERROR_CODE,
        returnInfo: function (errorNum = 2, data = [], reTryUids = []) {
            return {
                code: ONE_IN_UID_LIST_ERROR_CODE,
                success: false,
                message: `批量获取的uid中有${errorNum}个请求失败了！${reTryUids.toString()} 请重新请求！!`,
                data,
                reTryUids
            };
        }
    },
    // 模拟参数错误
    {
        code: PARAMS_ERROR_CODE,
        returnInfo: function (message = '参数错误！', reTryUids) {
            return {
                code: PARAMS_ERROR_CODE,
                success: false,
                message,
                reTryUids
            };
        }
    },
    // 没有设定为特定code的其他错误
    {
        code: false,
        returnInfo: function (reTryUids = []) {
            return {
                code: false,
                success: false,
                message: '出错了',
                reTryUids
            };
        }
    },
];

const EVIL_TYPE_CODE_MAP = evilTypeList.reduce((ac, cv) => {
    ac[cv.code] = cv;
    return ac;
}, {})

module.exports = {
    // 是否打开错误测试
    evilTestSwitch: true,
    evilTypeCode: ONE_IN_UID_LIST_ERROR_CODE,
    // evilTypeCode: ONE_IN_UID_LIST_TIMEOUT_CODE,
    // evilTypeCode: PARAMS_ERROR_CODE,
    // evilTypeCode: false,
    PARAMS_ERROR_CODE,
    ONE_IN_UID_LIST_ERROR_CODE,
    ONE_IN_UID_LIST_TIMEOUT_CODE,
    EVIL_TYPE_CODE_MAP,
    REQUEST_TIMEOUT_MS
}
