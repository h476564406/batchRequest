export default {
    get: function (url) {
        return new Promise((r, j) => {
            const xhr = new XMLHttpRequest();
            xhr.onerror = (error) => {
                j(error)
            };
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                        const res = JSON.parse(xhr.responseText);
                        if (res.success) {
                            r(res.data)
                        } else {
                            j({ status: xhr.status, ...res })
                        }
                    } else {
                        j(xhr.status)
                    }
                }
            };
            xhr.open('GET', url, true);
            xhr.send(null);
        });
    }
};
