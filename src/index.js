"use strict"
import styles from './index.css';
const { evilTestSwitch, evilTypeCode, PARAMS_ERROR_CODE, TIMEOUT_CODE, ONE_IN_UID_LIST_ERROR_CODE, ONE_IN_UID_LIST_TIMEOUT_CODE, EVIL_TYPE_CODE_MAP, REQUEST_TIMEOUT_MS } = require('../config/evilTest');
const { USER_NUMBER } = require('../config/index');

import request from './xhr';
const MODULE_CONTAINER_ID = '#moduleContainer';
// 秒级的合批时间
const INBATCH_INTERVAL_MS = 5000;

const indexModule = {
    /** 
     * 通过一个缓存请求信息的队列维护合批信息。
     * Array [{
     *   uid: 1, // 用户信息
     *   // hocP: 请求行为的容器函数。在出现边界和异常的时候，可以快速发起单项api请求。
     *   hocP: getHocPromise(uid)
     * }]
     */
    cacheAjaxReqQueue: [],
    // 缓存下doms, 避免每次都查找节点
    domsCache: {},
    // 事件池
    events: [],
    /**
     * 渲染modules, 绑定事件
     * @param {String} containerSign 页面上的module container id, 在容器中生成多个modules以供测试
     * @param {Number} inBatchIntervalMs 秒级的合批时间，也是setTimeOut定时的时间
     */
    init: function (containerSign, inBatchIntervalMs) {
        const self = this;
        self.cacheAjaxReqQueue = [];
        const getHocPromise = function (uid) {
            return () => self.requestUserProfilesApi(uid);
        }
        const clickButton = function (uid) {
            // 避免重复加入队列
            if (!self.cacheAjaxReqQueue.find(item => item.uid === uid)) {
                self.cacheAjaxReqQueue.push({ uid, hocP: getHocPromise(uid) });
            }
        }
        self.events.push(clickButton);
        self.bindEventsToWinow(self.events);
        self.renderModules(containerSign, USER_NUMBER, self.events);
        self.timer = self.watchingStart(inBatchIntervalMs);
    },
    /**
     * 通过uidList请求profile的api，如果node层返回success: false, 调用catch里的回调。
     * 通过判断前后端服务协商好的状态码，回调中做相应处理。
     * @param {String} uidList
     */
    requestUserProfilesApi: function (uidList) {
        const self = this;
        return request.get(`http://127.0.0.1:8080/api/user_profile.json?uid=${uidList.toString()}`)
            .then(profileList => {
                self.renderProfiles(profileList);
            })
            .catch((error) => {
                // code码语义请查阅在config/evilTest下的注释
                if (error.code === ONE_IN_UID_LIST_TIMEOUT_CODE || error.code === ONE_IN_UID_LIST_ERROR_CODE) {
                    self.renderProfiles(error.data);
                    if (error.reTryUids && error.reTryUids.length) {
                        self.requestUserProfilesApi(error.reTryUids);
                    }
                }
            });
    },
    renderModules: function (containerSign, userNumber = 20, events = []) {
        const uidIds = this.generateMockedUserIds(userNumber);
        const containerNode = document.querySelector(containerSign);
        let str = '';
        for (var index = 0, len = uidIds.length; index < len; index++) {
            const uid = uidIds[index];
            str += `<div class="${styles.module}">
                <div><span class="${styles.moduleText}">module:${uid}</span><span>uid:${uid}</span></div>
                <div>
                    <button class="${styles.moduleButton}" id="button${uid}" onclick="clickButton(${uid})">
                        click me
                    </button>
                </div>
                <div class="${styles.profile}" id="profile${uid}"></div>
            </div>`;
        }
        containerNode.innerHTML = str;
    },
    /**
     * 设置定时器，每次定时器的回调被执行的时候，把cacheAjaxReqQueue里去重过的uidList作为参数发起请求。
     * 请求完毕，要从cacheAjaxReqQueue删除掉请求成功的对象。
     * @param {Number} inBatchIntervalMs
     */
    watchingStart: function (inBatchIntervalMs) {
        const self = this;
        clearTimeout(self.timer);
        setTimeout((function () {
            // 如果cacheAjaxReqQueue为空，那么重新设置定时器。
            if (!self.cacheAjaxReqQueue.length) {
                self.timer = self.watchingStart(inBatchIntervalMs);
                return;
            }
            console.log('settimeout fn called!!! cacheAjaxReqQueue', self.cacheAjaxReqQueue);
            // 去重操作
            const uidList = Array.from(new Set(self.cacheAjaxReqQueue.map(item => {
                return item.uid;
            })));
            // 无论请求成功还是失败，重新设置定时器
            self.requestUserProfilesApi(uidList).finally(() => {
                self.timer = self.watchingStart(INBATCH_INTERVAL_MS);
            });
        }), inBatchIntervalMs);
    },
    /**
     * 拿到profileList，在各个module中渲染对应的profile信息
     * @param {Array} profileList
     */
    renderProfiles: function (profileList) {
        (profileList || []).forEach((item) => {
            const { uid, profile } = item;
            if (!this.domsCache[`profile${uid}`]) {
                this.domsCache[`profile${uid}`] = document.querySelector(`#profile${uid}`);
                this.domsCache[`profile${uid}`].innerHTML = profile;
            }
        }, this);
        this.filterCacheAjaxReqQueue(profileList.map(item => { return item.uid }));
    },
    /**
     * 请求完毕，要从cacheAjaxReqQueue删除掉请求成功的对象。
     * @param uidList {Array}
     */
    filterCacheAjaxReqQueue: function (uidList) {
        this.cacheAjaxReqQueue = this.cacheAjaxReqQueue.filter(item => {
            return uidList.indexOf(item.uid) === -1;
        })
    },
    bindEventsToWinow: function (events) {
        events.forEach(function (fn) {
            window[fn.name] = fn;
        }, this);
    },
    generateMockedUserIds: function (userNumber) {
        return Array(userNumber).fill('').map((item, index) => {
            return index + 1;
        });
    },
};

indexModule.init(MODULE_CONTAINER_ID, INBATCH_INTERVAL_MS);

export default indexModule;
