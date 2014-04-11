// nasdaq-list.js

var industries = [
    "Basic Industries",
    "Capital Goods",
    "Consumer Durables",
    "Consumer Non-Durables",
    "Consumer Services",
    "Energy",
    "Finance",
    "Health Care",
    "Miscellaneous",
    "Public Utilities",
    "Technology",
    "Transportation"
];

onmessage = dispatch.bind(this, {
    close: function() {
        self.close();
    },
    ping: function() {
        return 'pong';
    },
    hello: function(event) {
        var channel = new MessageChannel();
        channel.port2.addEventListener('message', onmessage, false);
        channel.port2.start();
        event.ports[0].postMessage({
            cmd: 'register',
            service: 'list'
        }, [channel.port1]);
    },
    'sector-list': function(event) {
        var exchange = event.data.exchange;
        if (['XNCM', 'XNMS', 'XNGS', 'XNYS', 'XASE'].indexOf(exchange.mic) < 0)
            return {status: 'success', result: []};
        return {
            status: 'success',
            result: industries
        };
    },
    'security-list': (function(tickers, event) {
        var market = {
            'XNCM': "&exchange=NASDAQ&market=NCM",
            'XNMS': "&exchange=NASDAQ&market=NGM",
            'XNGS': "&exchange=NASDAQ&market=NGS",
            'XNYS': "&exchange=NYSE",
            'XASE': "&exchange=AMEX"
        };
        var exchange = event.data.exchange;
        if (!market[exchange.mic])
            return {status: 'success', result: []};
        if (industries.indexOf(event.data.sector) < 0)
            throw new Error('Unknown sector: ' + event.data.sector);
        var url = [
            "http://www.nasdaq.com/screening/companies-by-region.aspx?region=ALL&render=download",
            market[exchange.mic],
            "&industry=", encodeURIComponent(event.data.sector)
        ].join('');
        return tickers(url).then(function(tickers){
            return tickers.map(function(ticker){
                return exchange.iri + '/' + encodeURI(ticker);
            });
        }).then(function(securities){
            return {
                status: 'success',
                result: securities
            };
        });
    }).bind(this, synchronized(memoize(function(url){
        return promiseText(url).then(function(csv){
            return csv.split(/\r?\n/);
        }).then(function(lines){
            return lines.map(function(line) {
                if (line.charAt(0) == '"') {
                    return line.substring(1, line.indexOf('"', 1)).trim();
                } else if (line.indexOf(',') > 0) {
                    return line.substring(0, line.indexOf(',')).trim();
                } else {
                    return null;
                }
            });
        }).then(function(tickers){
            return tickers.filter(function(ticker) {
                return ticker && ticker != 'Symbol';
            });
        });
    })))
});

function synchronized(func) {
    var promise = Promise.resolve();
    return function(/* arguments */) {
        var context = this;
        var args = arguments;
        return promise = promise.catch(function() {
            // ignore previous error
        }).then(function() {
            return func.apply(context, args);
        });
    };
}

function memoize(func) {
    var memo = {};
    return function(key) {
        return memo[key] ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
}

function promiseText(url) {
    return new Promise(function(resolve, reject) {
        console.log(url);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 203)) {
                resolve(xhr.responseText);
            } else if (xhr.readyState == 4) {
                reject({status: xhr.statusText, message: xhr.responseText, url: url});
            }
        };
        xhr.open("GET", url, true);
        xhr.send();
    });
}

function dispatch(handler, event){
    var cmd = event.data.cmd || event.data;
    if (typeof cmd == 'string' && typeof handler[cmd] == 'function') {
        Promise.resolve(event).then(handler[cmd]).then(function(result){
            if (result !== undefined) {
                event.ports[0].postMessage(result);
            }
        }).catch(rejectNormalizedError).catch(function(error){
            event.ports[0].postMessage(error);
        });
    } else if (event.ports && event.ports.length) {
        console.log('Unknown command ' + cmd);
        event.ports[0].postMessage({
            status: 'error',
            message: 'Unknown command ' + cmd
        });
    } else {
        console.log(event.data);
    }
}

function rejectNormalizedError(error) {
    if (error.status != 'error' || error.message) {
        console.log(error);
    }
    if (error && error.status == 'error') {
        return Promise.reject(error);
    } else if (error.target && error.target.errorCode){
        return Promise.reject({
            status: 'error',
            errorCode: error.target.errorCode
        });
    } else if (error.message && error.stack) {
        return Promise.reject({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    } else if (error.message) {
        return Promise.reject({
            status: 'error',
            message: error.message
        });
    } else {
        return Promise.reject({
            status: 'error',
            message: error
        });
    }
}
