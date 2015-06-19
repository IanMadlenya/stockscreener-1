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

importScripts('../assets/underscore.js');
importScripts('utils.js');

var LOOKUP_URL = "http://qt.morningstar.com/gidindex/acq.ashx?callback=AutoCompleteOracle.FCallBackAutoCompleteBox&range=32&key={t}";
var ANNUAL_URLS = ["http://financials.morningstar.com/ajax/exportKR2CSV.html?t={t}"];
var QUARTER_URLS = [
    "http://financials.morningstar.com/ajax/ReportProcess4CSV.html?reportType=is&period=3&dataType=A&denominatorView=raw&t={t}",
    "http://financials.morningstar.com/ajax/ReportProcess4CSV.html?reportType=bs&&period=3&dataType=A&denominatorView=raw&t={t}",
    "http://financials.morningstar.com/ajax/ReportProcess4CSV.html?reportType=cf&&period=3&dataType=A&denominatorView=raw&t={t}"
];

onmessage = handle.bind(this, {
    start: function() {
        return "started";
    },

    stop: function() {
        self.close();
    },

    ping: function() {
        return 'pong';
    },

    validate: function(data) {
        if ('annual' === data.interval)
            return data.fields.reduce(function(memo, field){
                if (['revenue', 'cogs', 'gross_margin', 'sg&a', 'r&d', 'other', 'operating_margin', 'net_int_inc_other', 'ebt_margin', 'tax_rate', 'net_margin', 'asset_turnover', 'return_on_assets', 'financial_leverage', 'return_on_equity', 'return_on_invested_capital', 'interest_coverage', 'year_over_year_revenue', '3-year_average_revenue', '5-year_average_revenue', '10-year_average_revenue', 'year_over_year_operating_income', '3-year_average_operating_income', '5-year_average_operating_income', '10-year_average_operating_income', 'year_over_year_net_income', '3-year_average_net_income', '5-year_average_net_income', '10-year_average_net_income', 'year_over_year_eps', '3-year_average_eps', '5-year_average_eps', '10-year_average_eps', 'operating_cash_flow_growth_yoy', 'free_cash_flow_growth_yoy', 'cap_ex_as_a_of_sales', 'free_cash_flow_to_sales', 'free_cash_flow_to_net_income', 'cash_short-term_investments', 'accounts_receivable', 'inventory', 'other_current_assets', 'total_current_assets', 'net_pp&e', 'intangibles', 'other_long-term_assets', 'total_assets', 'accounts_payable', 'short-term_debt', 'taxes_payable', 'accrued_liabilities', 'other_short-term_liabilities', 'total_current_liabilities', 'long-term_debt', 'other_long-term_liabilities', 'total_liabilities', 'total_stockholders_equity', 'total_liabilities_equity', 'current_ratio', 'quick_ratio', 'financial_leverage', 'debt_to_equity', 'days_sales_outstanding', 'days_inventory', 'payables_period', 'cash_conversion_cycle', 'receivables_turnover', 'inventory_turnover', 'fixed_assets_turnover', 'asset_turnover'].indexOf(field) >= 0)
                    return memo;
                if (['revenue_mil', 'gross_margin', 'operating_income_mil', 'operating_margin', 'net_income_mil', 'earnings_per_share', 'dividends', 'payout_ratio', 'shares_mil', 'book_value_per_share', 'operating_cash_flow_mil', 'cap_spending_mil', 'free_cash_flow_mil', 'free_cash_flow_per_share', 'working_capital_mil'].indexOf(field) >= 0)
                    return memo;
                throw new Error("Unknown field: " + field);
            }, {status: 'success'});
        else if ('quarter' === data.interval)
            return data.fields.reduce(function(memo, field){
                if (['accounts_payable_current_liabilities', 'accounts_receivable', 'accumulated_other_comprehensive_income_stockholders_equity', 'acquisitions_net', 'basic_earnings_per_share', 'basic_weighted_average_shares_outstanding', 'capital_expenditure_free_cash_flow', 'cash_and_cash_equivalents_cash', 'cash_at_beginning_of_period', 'cash_at_end_of_period', 'cash_used_in_operating_activities_cash_flows_from_operating_activities', 'common_stock_additional_paid-in_capital_stockholders_equity', 'cost_of_revenue', 'depreciation_amortization_cash_flows_from_operating_activities', 'diluted_earnings_per_share', 'diluted_weighted_average_shares_outstanding', 'dividend_paid_cash_flows_from_financing_activities', 'effect_of_exchange_rate_changes', 'free_cash_flow', 'goodwill_and_other_intangible_assets_non-current_assets', 'gross_profit', 'income_before_taxes', 'interest_expense', 'inventories', 'net_cash_provided_by_financing_activities', 'net_cash_provided_by_operating_activities', 'net_cash_used_for_investing_activities', 'net_change_in_cash', 'net_changes_in_working_capital', 'net_income', 'net_income_from_continuing_operations', 'net_investments_in_property_plant_and_equipment', 'net_property_plant_and_equipment_non-current_assets', 'non-current_liabilities', 'operating_cash_flow_free_cash_flow', 'operating_income', 'other', 'other_current_assets', 'other_current_liabilities', 'other_financing_activities_cash_flows_from_financing_activities', 'other_income', 'other_investing_activities', 'other_long-term_assets_non-current_assets', 'other_long-term_liabilities_long-term_debt', 'provision_for_income_taxes', 'purchases_of_investments', 'research_and_development_operating_expenses', 'retained_earnings_stockholders_equity', 'revenue', 'sales_general_and_administrative_operating_expenses', 'sales_maturities_of_investments', 'short-term_debt_current_liabilities', 'short-term_investments_cash', 'total_assets', 'total_cash_and_short-term_investments', 'total_current_assets', 'total_current_liabilities', 'total_liabilities', 'total_liabilities_and_stockholders_equity', 'total_non-current_assets', 'total_non-current_liabilities', 'total_operating_expenses', 'total_stockholders_equity', 'treasury_stock_stockholders_equity'].indexOf(field) >= 0)
                    return memo;
                throw new Error("Unknown field: " + field);
            }, {status: 'success'});
        else return Promise.reject({status: 'error'});
    },

    reset: function(data) {
        return {status: 'success'};
    },

    lookup: function(data) {
        return {status: 'success', result: []};
    },

    quote: (function(loadCSV, lookupSymbol, data) {
        var exchange = data.exchange;
        var ticker = data.ticker;
        var interval = data.interval;
        if (interval != 'annual' && interval != 'quarter')
            return {status: 'success', result: []};
        var urls = interval == 'annual' ? ANNUAL_URLS : QUARTER_URLS;
        var oneYearAgo = new Date();
        var yearsAgo = new Date(oneYearAgo.valueOf());
        oneYearAgo.setFullYear(yearsAgo.getFullYear() - 1);
        yearsAgo.setFullYear(yearsAgo.getFullYear() - 9);
        if (interval == 'annual' && data.end && new Date(data.end).valueOf() < yearsAgo.valueOf())
            return {status: 'success', result: []};
        else if (interval == 'quarter' && data.end && new Date(data.end).valueOf() < oneYearAgo.valueOf())
            return {status: 'success', result: []};
        var symbol = guessSymbol(exchange, ticker);
        return loadCSVFiles(loadCSV, urls, symbol).then(function(result){
            if (result.length) return result;
            return lookupSymbol(exchange, ticker).then(loadCSVFiles.bind(this, loadCSV, urls));
        }).then(function(result) {
            return {
                status: 'success',
                exchange: data.exchange,
                ticker: data.ticker,
                interval: interval,
                result: result
            };
        });
    }).bind(this,
        synchronized(cache(indexedDB, 'morningstar-financials', 4 * 60 * 60 * 1000, loadCSV)),
        lookupSymbol.bind(this, synchronized(cache(indexedDB, 'morningstar-symbols', 13 * 24 * 60 * 60 * 1000, promiseText)))
    )
});

function loadCSVFiles(loadCSV, urls, symbol) {
    return loadCSVRows(loadCSV, urls.map(function(url){
        return url.replace(/{t}/, encodeURIComponent(symbol));
    })).then(function(rows){
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
                if (row[0].indexOf('Total ') == 0 || row[0].indexOf('Net ') == 0 ||
                        cleanField(row[0]).indexOf(cleanField(suffix)) >= 0) {
                    suffix = ''; // Total row
                }
                for (var i=1; i < row.length; i++) {
                    if (row[i] && headers[i].match(/\d\d\d\d-\d\d/)) {
                        points[headers[i]] = points[headers[i]] || {dateTime: asof(headers[i])};
                        points[headers[i]][cleanField(row[0] + suffix)] = parseFloat(row[i].replace(/,/g, ''));
                    }
                }
            } else {
                console.log(headers, row);
            }
        });
        var keys = [];
        for (var key in points) {
            keys.push(key);
        }
        return keys.sort().map(function(key) {
            return points[key];
        });
    });
}

function loadCSVRows(loadCSV, urls) {
    if (!urls.length) return Promise.resolve([]);
    return loadCSV(urls[0]).then(function(first){
        return loadCSVRows(loadCSV, urls.slice(1)).then(function(rest) {
            return first.concat(rest);
        });
    });
}

function loadCSV(url) {
    return promiseText(url).then(parseCSV);
}

function guessSymbol(exchange, ticker) {
    return exchange.morningstarCode + ':' + ticker.replace(/\^/, 'PR');
}

function lookupSymbol(promiseText, exchange, ticker) {
    var root = ticker.replace(/^\W+/, '').replace(/\W.*$/, '');
    var url = LOOKUP_URL.replace(/{t}/, encodeURIComponent(root.toLowerCase()));
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

function cleanField(field) {
    return field.toLowerCase()
        .replace(' usd mil',' mil')
        .replace(' cad mil',' mil')
        .replace(' usd','')
        .replace(' cad','')
        .replace(/\(.*\)/g, '')
        .replace(/[\/]/g,' to ')
        .replace(/ & /g,' ')
        .replace(/[^a-z0-9 _\-&]/g, '')
        .trim().replace(/\s+/g, '_');
}

function asof(ym) {
    var m = ym.match(/(\d\d\d\d)-(\d\d)/);
    var date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);
    date.setMonth(date.getMonth() + 1); // start of next month
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function pad(num) {
    return (num < 10 ? '0' : '') +  num;
}

function isEmpty(obj) {
    for (var key in obj) if (obj[key] != undefined) return false;
    return true;
}
