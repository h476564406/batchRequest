// 决定渲染多少个module
const USER_NUMBER = 20;
const RETURN_SUCCESS_INFO = (config = {}) => ({
    success: true,
    message: 'perfect',
    data: [],
    code: 'OK',
    ...config
});

module.exports = {
    USER_NUMBER,
    RETURN_SUCCESS_INFO
}
