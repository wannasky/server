(function () {
    var ws = new WebSocket('ws://' + location.host);

    ws.onopen = function () {
        console.log('liveReload功能已启动');
    }

    ws.onmessage = function (event) {
        const action = event.data;
        switch (action) {
            case 'refresh':
                location.reload();
                break;
            default:
                break;
        }
    }

})()
