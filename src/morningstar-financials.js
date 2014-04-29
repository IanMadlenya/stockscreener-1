// morningstar-financials.js
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
            service: 'quote'
        }, [channel.port1]);
    },

    validate: function(event) {
        if ('m12' != event.data.interval)
            return Promise.reject({status: 'error'});
        return event.data.fields.reduce(function(memo, field){
            if (['revenue', 'cogs', 'gross_margin', 'sg&a', 'r&d', 'other', 'operating_margin', 'net_int_inc_other', 'ebt_margin', 'tax_rate', 'net_margin', 'asset_turnover', 'return_on_assets', 'financial_leverage', 'return_on_equity', 'return_on_invested_capital', 'interest_coverage', 'year_over_year_revenue', '3-year_average_revenue', '5-year_average_revenue', '10-year_average_revenue', 'year_over_year_operating_income', '3-year_average_operating_income', '5-year_average_operating_income', '10-year_average_operating_income', 'year_over_year_net_income', '3-year_average_net_income', '5-year_average_net_income', '10-year_average_net_income', 'year_over_year_eps', '3-year_average_eps', '5-year_average_eps', '10-year_average_eps', 'operating_cash_flow_growth_yoy', 'free_cash_flow_growth_yoy', 'cap_ex_as_a_of_sales', 'free_cash_flow_to_sales', 'free_cash_flow_to_net_income', 'cash_short-term_investments', 'accounts_receivable', 'inventory', 'other_current_assets', 'total_current_assets', 'net_pp&e', 'intangibles', 'other_long-term_assets', 'total_assets', 'accounts_payable', 'short-term_debt', 'taxes_payable', 'accrued_liabilities', 'other_short-term_liabilities', 'total_current_liabilities', 'long-term_debt', 'other_long-term_liabilities', 'total_liabilities', 'total_stockholders_equity', 'total_liabilities_equity', 'current_ratio', 'quick_ratio', 'financial_leverage', 'debt_to_equity', 'days_sales_outstanding', 'days_inventory', 'payables_period', 'cash_conversion_cycle', 'receivables_turnover', 'inventory_turnover', 'fixed_assets_turnover', 'asset_turnover'].indexOf(field) >= 0)
                return memo;
            if (['revenue_mil', 'gross_margin', 'operating_income_mil', 'operating_margin', 'net_income_mil', 'earnings_per_share_usd', 'dividends_usd', 'payout_ratio', 'shares_mil', 'book_value_per_share_usd', 'operating_cash_flow_mil', 'cap_spending_mil', 'free_cash_flow_mil', 'free_cash_flow_per_share_usd', 'working_capital_mil'].indexOf(field) >= 0)
                return memo;
            throw new Error("Unknown field: " + field);
        }, {status: 'success'});
    },

    quote: (function(lookupSymbol, promiseText, event) {
        var exchange = event.data.exchange;
        var ticker = event.data.ticker;
        var symbol = guessSymbol(exchange, ticker);
        var interval = event.data.interval;
        var yearsAgo = new Date();
        yearsAgo.setFullYear(yearsAgo.getFullYear() - 9);
        if (interval != 'm12' || new Date(event.data.end).valueOf() < yearsAgo.valueOf())
            return {status: 'success', result: []};
        return encodeInURL(symbol).then(promiseText).then(function(text){
            if (text) return text;
            return lookupSymbol(exchange, ticker).then(encodeInURL).then(promiseText);
        }).then(function(csv){
            return csv.split(/\r?\n/);
        }).then(function(lines) {
            return lines.map(function(line) {
                return parseCSVLine(line);
            });
        }).then(function(rows){
            var suffix = '';
            var headers = [];
            var points = {};
            rows.forEach(function(row){
                if (row.length > 2 && row[1].match(/\d\d\d\d-\d\d/)) {
                    headers = row;
                    suffix = '';
                } else if (row.length == 1) {
                    suffix = ' ' + row[0];
                } else if (row.length == headers.length) {
                    for (var i=1; i < row.length - 1; i++) {
                        if (row[i]) {
                            points[headers[i]] = points[headers[i]] || {dateTime: asof(headers[i])};
                            points[headers[i]][cleanField(row[0] + suffix)] = parseFloat(row[i].replace(/,/g, ''));
                        }
                    }
                } else {
                    console.log(headers, row);
                }
            });
            return points;
        }).then(asArray).then(function(result) {
            return {
                status: 'success',
                exchange: event.data.exchange,
                ticker: event.data.ticker,
                interval: event.data.interval,
                result: result
            };
        });
    }).bind(this, lookupSymbol.bind(this, memoize(synchronized(promiseText))), synchronized(promiseText))
});

function guessSymbol(exchange, ticker) {
    return exchange.morningstarCode + ':' + ticker.replace(/\^/, 'PR');
}

function lookupSymbol(promiseText, exchange, ticker) {
    var root = ticker.replace(/^\W+/, '').replace(/\W.*$/, '');
    var url = [
        "http://qt.morningstar.com/gidindex/acq.ashx?callback=AutoCompleteOracle.FCallBackAutoCompleteBox&range=32",
        "&key=", encodeURIComponent(root.toLowerCase())
    ].join('');
    return Promise.all([promiseText(url + '.'), promiseText(url)]).then(function(two) {
        return two[0] + two[1];
    }).then(function(text){
        return text.split(';[').filter(function(line){
            return line.indexOf(exchange.morningstarCode) >= 0;
        }).map(function(line) {
            return line.substring(line.lastIndexOf(';') + 1);
        });
    }).then(function(results){
        if (results.length < 2) return results;
        var last = ticker.charAt(ticker.length - 1);
        var regex = new RegExp(ticker.replace(/\^/, '.PR').replace(/\W/g, '.*'));
        return results.sort(function(a, b){
            if (a == ticker) return -1;
            if (b == ticker) return 1;
            var ma = a.match(regex);
            var mb = b.match(regex);
            if (ma && !mb) return -1;
            if (!ma && mb) return 1;
            var lasta = a.charAt(a.length - 1);
            var lastb = b.charAt(b.length - 1);
            if (last == lasta && last != lastb) return -1;
            if (last != lasta && last == lastb) return 1;
            if (a.length < b.length) return -1;
            if (a.length > b.length) return 1;
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
    }).then(function(results){
        if (!results.length) return ticker; // fail silently
        return results[0];
    }).then(function(symbol){
        if (symbol != ticker)
            console.log("Using Morningstar symbol " + symbol + " for security " + exchange.mic + ':' + ticker);
        return exchange.morningstarCode + ':' + symbol;
    });
}

function encodeInURL(symbol) {
    return Promise.resolve("http://financials.morningstar.com/ajax/exportKR2CSV.html?t=" + encodeURIComponent(symbol));
}

function cleanField(field) {
    return field.toLowerCase()
        .replace(' usd mil',' mil')
        .replace(' cad mil',' mil')
        .replace(/\(.*\)/g, '')
        .replace(/[\/]/g,' to ')
        .replace(/ & /g,' ')
        .replace(/[^a-z0-9 _\-&]/g, '')
        .trim().replace(/\s+/g, '_');
}

function asof(ym) {
    var m = ym.match(/(\d\d\d\d)-(\d\d)/);
    var date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);
    date.setMonth(date.getMonth() + 3); // two months after the end of the fiscal year
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function pad(num) {
    return (num < 10 ? '0' : '') +  num;
}

function parseCSVLine(line) {
    if (line.indexOf(',') < 0) return [line];
    var m;
    var row = [];
    var regex = /(?:,|^)(?:"([^"]*)"|([^",]*))/g;
    if (line.charAt(0) == ',') {
        row.push('');
    }
    while (m = regex.exec(line)) {
        row.push(m[1] || m[2]);
    }
    return row;
}

function asArray(hash) {
    var keys = [];
    for (var key in hash) {
        keys.push(key);
    }
    return keys.sort().map(function(key) {
        return hash[key];
    });
}

function isEmpty(obj) {
    for (var key in obj) if (obj[key] != undefined) return false;
    return true;
}
