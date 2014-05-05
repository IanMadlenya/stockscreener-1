// tmx-list.js
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

importScripts('../assets/xls.js', 'utils.js');

var sectors = {
    "Mining": "http://www.tmx.com/en/pdf/Mining_Companies.xls",
    "Oil and Gas": "http://www.tmx.com/en/pdf/OilAndGas.xls",
    "Energy": "http://www.tmx.com/en/pdf/Energy.xls",
    "Clean Techology": "http://www.tmx.com/en/pdf/Cleantech.xls",
    "Life Sciences": "http://www.tmx.com/en/pdf/LifeSciences_Companies.xls",
    "Technology": "http://www.tmx.com/en/pdf/Technology.xls",
    "Diversified Industries": "http://www.tmx.com/en/pdf/Diversified_Industries.xls",
    "Real Estate": "http://www.tmx.com/en/pdf/RealEstate.xls"
};

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
            service: 'list',
            name: 'tmx-list'
        }, [channel.port1]);
    },
    'sector-list': function(event) {
        var exchange = event.data.exchange;
        var mic = exchange.mic;
        if (mic != 'XTSE' && mic != 'XTSX')
            return {status: 'success', result: []};
        var result = [];
        for (var sector in sectors) {
            result.push(sector);
        }
        return {
            status: 'success',
            result: result
        };
    },
    'security-list': (function(listResults, tickersForLetter, event) {
        var exchange = event.data.exchange;
        var mic = exchange.mic;
        if (mic != 'XTSE' && mic != 'XTSX')
            return {status: 'success', result: []};
        var sheetNumber = mic == 'XTSE' ? 0 : 1;
        var url = sectors[event.data.sector];
        if (!url)
            throw new Error('Unknown sector: ' + event.data.sector);
        return listResults(url).then(function(lists){
            return lists[sheetNumber];
        }).then(function(companies){
            var mincap = event.data.mincap;
            var maxcap = event.data.maxcap;
            var market = mic == 'XTSE' ? 'T' : 'V';
            return Promise.all(companies.filter(function(company){
                var cap = parseInt(company['QMV(C$)'], 10);
                return (!mincap || cap >= mincap) && (!maxcap || cap < maxcap);
            }).map(function(company){
                var root = company['Root'];
                var letter = root.charAt(0);
                return tickersForLetter(market + letter).then(function(tickers){
                    return tickers.filter(function(ticker){
                        return ticker == root || ticker.indexOf(root) == 0 && ticker.charAt(root.length) == '.';
                    });
                });
            })).then(function(arrays){
                return arrays.reduce(function(list, array){
                    return list.concat(array);
                }, []);
            });
        }).then(function(tickers){
            return tickers.map(function(ticker){
                return exchange.iri + '/' + encodeURI(ticker);
            });
        }).then(function(securities){
            return {
                status: 'success',
                result: securities
            };
        });
    }).bind(this,
        synchronized(cache(indexedDB, 'tmx-sectors', 13 * 24 * 60 * 60 * 1000, loadWorkbookSheetsAsObjects.bind(this, XLS))),
        synchronized(cache(indexedDB, 'tmx-securities', 3 * 24 * 60 * 60 * 1000, tickersForLetter))
    )
});

function decodeSymbol(pattern, symbol) {
    var regex = pattern.replace(/\./, '\\.').replace(/\{.?\}/, "\(.*\)");
    var m = symbol.match(new RegExp(regex));
    if (!m) return symbol;
    if (pattern.indexOf("{-}") >= 0)
        return m[1].replace(/[\-]/g, '.');
    return m[1];
}

function loadWorkbookSheetsAsObjects(XLS, url) {
    return promiseBinaryString(url).then(function(bin){
        return XLS.read(bin, {type:"binary"});
    }).then(function(workbook){
        var array = [];
        return workbook.SheetNames.reduce(function(promise, sheetName){
            return promise.then(sheetToObjects.bind(this, workbook.Sheets[sheetName])).then(function(results){
                array.push(results);
                return array;
            });
        }, Promise.resolve());
    });
}

function sheetToObjects(sheet) {
    return Promise.resolve(sheet).then(function(sheet){
        var out = [];
        if(!sheet || !sheet["!ref"]) throw new Error('Missing sheet');
        var range = XLS.utils.decode_range(sheet["!ref"]);
        var fs = ",", rs = "\n";

        for(var R = range.s.r; R <= range.e.r; ++R) {
            var row = [];
            for(var C = range.s.c; C <= range.e.c; ++C) {
                var cell = sheet[XLS.utils.encode_cell({c:C,r:R})];
                row.push(cell ? String(cell.v) : undefined);
            }
            out.push(row);
        }
        return out;
    }).then(function(rows){
        var headingIndex = findHeadingIndex(rows);
        if (headingIndex === undefined)
            throw new Error("Could not find Name column");
        var headers = rows[headingIndex].map(function(name){
            return name.replace(/\s*[\r\n][\s\S]*/, '').replace(/\s/g,'');
        });
        return rows.slice(headingIndex + 1).reduce(function(points, row){
            if (headers.length && headers.length == row.length) {
                points.push(object(headers, row));
            }
            return points;
        }, []);
    });
}

function findHeadingIndex(rows){
    for (var r=0; r<rows.length; r++) {
        var row = rows[r];
        if (row[1] && row[1].match(/Name/i)) {
            return r;
        }
    }
}

function tickersForLetter(marketLetter) {
    var market = marketLetter.charAt(0);
    var letter = marketLetter.charAt(1);
    var url = [
        "http://www.tmx.com/TMX/HttpController?GetPage=ListedCompaniesViewPage&SearchCriteria=Symbol&SearchKeyword=", letter,
        "&SearchType=StartWith&SearchIsMarket=Yes&Page=1&Market=", market, "&Language=en"
    ].join('');
    return promiseText(url).then(scrapeAllTickers.bind(this, []));
}

function scrapeAllTickers(previously, html){
    var results = previously.concat(scrapeTickers(html));
    var next = scrapeNextPage(html);
    if (!next) return results;
    return promiseText(next).then(scrapeAllTickers.bind(this, results));
}

function scrapeTickers(html) {
    var m;
    var result = [];
    var regex = /href="http:\/\/web.tmxmoney.com\/quote.php\?qm_symbol=[^"]+">(\S+)<\/a>/g;
    while (m = regex.exec(html)) {
        result.push(m[1]);
    }
    return result;
}

function scrapeNextPage(html) {
    var regex = /\/TMX\/HttpController\?(GetPage=ListedCompaniesViewPage[^"]*)">Next/;
    var qs = html.match(regex);
    if (!qs) return null;
    return "http://www.tmx.com/TMX/HttpController?" + qs[1].replace(/&amp;/g, '&');
}
