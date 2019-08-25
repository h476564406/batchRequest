# 批量发起uid请求，短时合并

## 场景：一个页面有多个module， 每个module的uid不一样，需要用uid请求对应的profile。
如果不做合并，那么n个module会发起n个api请求。

## 目的：通过短时内的api合并， 减少网络请求数。

1. 一个html页面，模拟场景，通过各个module的button操作发起uid请求。
* 配置项：决定渲染多少个module（USER_NUMBER）
2. 可配置的短时设置，在释放网络资源和页面的渲染时间之间取得平衡。
* 通过一个数组维护请求项，用定时器进行合批请求。 配置项：定时器时间（INBATCH_INTERVAL_MS）
* 针对请求的成功，失败，失败分情况，对数组进行操作，对定时器进行重新设置。
3. 考虑批量发起请求可能出现的异常。这个需要浏览端和服务端同学共同协商一个code码映射。浏览端通过返回的code码和其他信息做相应处理。
* 异常case定义在config/evilTest.js中, 通过evilTestSwitch和evilTypeCode码来控制模拟哪个异常。

## 执行
1. npm i 安装依赖包
2. npm start 启动浏览端页面
3. nodemon app/server.js 启动服务端node层
4. 配置config下的evilTest.js文件
* 测试没有异常情况下的batch Request，
  evilTestSwitch: false
* 测试异常情况的batch Request, 定义某种异常。
    evilTestSwitch: true,
    e.g. evilTypeCode: ONE_IN_UID_LIST_ERROR_CODE,
