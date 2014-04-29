// nasdaq-list.js
/* 
 *  Copyright (c) 2014 James Leigh, Some Rights Reserved
 * 
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 * 
 *  1. Redistributions of source code must retain the above copyright notice,
 *  this list of conditions and the following disclaimer.
 * 
 *  2. Redistributions in binary form must reproduce the above copyright
 *  notice, this list of conditions and the following disclaimer in the
 *  documentation and/or other materials provided with the distribution.
 * 
 *  3. Neither the name of the copyright holder nor the names of its
 *  contributors may be used to endorse or promote products derived from this
 *  software without specific prior written permission.
 * 
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 *  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 *  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 *  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 *  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 *  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 *  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 *  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 *  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

importScripts('utils.js');

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
    }).bind(this, synchronized(cache(indexedDB, 'nasdaq-sectors', function(url){
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
