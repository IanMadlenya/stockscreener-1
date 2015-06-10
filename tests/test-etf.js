// test-etf.js
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

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3;

describe("screener", function(){
    describe("tsx", function(){
        var symbols = ['XCS','XMD','XIU','CRQ','CPD','XDV','XCV','XCG','CLO','ZEB','XEG','XFN','XIT','ZEO','ZUT','XMA','XSU','XSP','CLU','ZDJ','ZQQ'];
        xit("all", function(done){
            Promise.all(symbols.map(function(symbol){
                var lower = new Date(2005, 0, 1);
                var upper = new Date(2015, 0, 1);
                return screener.load("http://probabilitytrading.net/exchanges/tsx/" + symbol, ['asof','open','high','low','close'], 'd5',  1, lower, upper);
            })).then(function(data){
                var dates = _.map(data[1],'asof');
                return dates.map(function(date){
                    var open = data.map(function(points){
                        return points[_.sortedIndex(points, {asof:date}, 'asof')].open;
                    });
                    var high = data.map(function(points){
                        return points[_.sortedIndex(points, {asof:date}, 'asof')].high;
                    });
                    var low = data.map(function(points){
                        return points[_.sortedIndex(points, {asof:date}, 'asof')].low;
                    });
                    var close = data.map(function(points){
                        return points[_.sortedIndex(points, {asof:date}, 'asof')].close;
                    });
                    return [moment(date).format('YYYY-MM-DD')].concat(close).join(',');
                });
            }).then(function(result){
                expect([['date'].concat(symbols,symbols).join(',')].concat(result).join('\n')).toBeUndefined();
            }).then(done, unexpected(done));
        });
        symbols.forEach(function(symbol){
            xit(symbol, function(done){
                var lower = new Date(2010, 0, 1);
                var upper = new Date(2015, 0, 1);
                screener.load("http://probabilitytrading.net/exchanges/tsx/" + symbol, ['asof','open','high','low','close'], 'd5',  1, lower, upper).then(function(data){
                    return data.map(function(point){
                        return [moment(point.asof).format('YYYY-MM-DD')].concat(point.open, point.high, point.low, point.close).join(',');
                    });
                }).then(function(result){
                    expect([['date','open','high','low','close'].join(',')].concat(result).join('\n')).toBeUndefined();
                }).then(done, unexpected(done));
            });
        });
    });
    describe("over", function(){
        var bluesky = {
            name: "bluesky",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "50000"
                }, {
                    indicator: {
                        expression: "PMO(8,OBV,40)",
                        interval: "d5"
                    },
                    lower: "-10"
                }, {
                    indicator: {
                        expression: "CDO(20,50,SMA,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "CDO(1,14,EMA,CDO,20,50,SMA,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "MIN(10,DATR,14,SMA,50,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "PMO(40,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "MAX(20,AOH,5)",
                        interval: "d1"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "PLOW(250,close)",
                        interval: "d1"
                    },
                    upper: "200"
                }, {
                    indicator: {
                        expression: "PMO(40,OBV,40)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,SMA,200,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,open)",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "d5"
                    },
                    lower:"0"
                }]
            }]
        };
        var pullback = {
            name: "pullback",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "50000"
                }, {
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "d5"
                    },
                    upper:"0"
                }, {
                    indicator: {
                        expression: "CDO(20,50,SMA,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,SMA,50,close)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,open)",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "STO(5,3,3)",
                        interval: "d1"
                    },
                    upper: "25"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.01,0.2,100)",
                        interval: "d5"
                    },
                    lower:"0"
                }]
            }]
        };
        var reversion_m30 = {
            name: "mean reversion m30",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "400000"
                }, {
                    indicator: {
                        expression: "Percent(close,SMA(20,close))",
                        interval: "d1"
                    },
                    lower: "90"
                }, {
                    indicator: {
                        expression: "DATR(14,KELT(SMA(20,close),-2,SD(20,close)))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,KELT(SMA(150,POC(6)),-2,SD(150,POC(6))))",
                        interval: "m60"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,POC(12))",
                        interval: "m30"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "PCO(12,POC(12))",
                        interval: "m30"
                    },
                    lower: "0"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "WORKDAY(asof,-1)",
                        interval: "d1"
                    },
                    changeReference: {
                        expression: "WORKDAY(asof,0)",
                        interval: "d1"
                    },
                    lower: "0"
                },{
                    indicator: {
                        expression: "MIN(2,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    lower: "0"
                },{
                    indicator:{
                        expression:"close",
                        interval: "m60"
                    },
                    changeReference:{
                        expression:"POC(20)",
                        interval: "d1"
                    },
                    lower:"0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "WORKDAY(asof,-13)",
                        interval: "d1"
                    },
                    changeReference: {
                        expression: "WORKDAY(asof,0)",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "m60"
                    },
                    changeReference: {
                        expression: "close",
                        interval: "m30"
                    },
                    upper: "-9"
                }]
            }]
        };
        var reversion_m60_short = {
            name: "mean reversion m60 short",
            entry: [{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "100000"
                }, {
                    indicator: {
                        expression: "DATR(14,KELT(SMA(20,close),2,SD(20,close)))",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,KELT(SMA(150,POC(6)),2,SD(150,POC(6))))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            }],
            exit: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "MAX(2,DATR(14,KELT(SMA(20,close),2,SD(20,close))))",
                        interval: "d1"
                    },
                    upper: "0"
                },{
                    indicator:{
                        expression:"close",
                        interval: "m60"
                    },
                    changeReference:{
                        expression:"POC(20)",
                        interval: "d1"
                    },
                    upper:"0"
                }]
            },{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "WORKDAY(asof,-15)",
                        interval: "d1"
                    },
                    changeReference: {
                        expression: "WORKDAY(asof,0)",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            }]
        };
        var low = {
            name: "low",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "100000"
                }, {
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(32))",
                        interval: "m60"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,POC(12))",
                        interval: "m30"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "PCO(12,POC(12))",
                        interval: "m30"
                    },
                    lower: "0"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"close",
                        interval: "m60"
                    },
                    changeReference:{
                        expression:"POC(20)",
                        interval: "d1"
                    },
                    lower:"0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(32))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "m60"
                    },
                    changeReference: {
                        expression: "close",
                        interval: "m30"
                    },
                    upper: "-9"
                }]
            }]
        };
        var trend_up = {
            name: "trend up",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "100000"
                }, {
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(32))",
                        interval: "m60"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "PCO(12,POC(12))",
                        interval: "m30"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,POC(12))",
                        interval: "m30"
                    },
                    upper: "0"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"close",
                        interval: "m60"
                    },
                    changeReference:{
                        expression:"POC(20)",
                        interval: "d1"
                    },
                    lower:"0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(32))",
                        interval: "m60"
                    },
                    upper: "0"
                },{
                    indicator: {
                        expression: "PCO(12,POC(12))",
                        interval: "m30"
                    },
                    upper: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "m60"
                    },
                    changeReference: {
                        expression: "close",
                        interval: "m30"
                    },
                    upper: "-8"
                }]
            }]
        };
        var drop = {
            name: "drop",
            entry: [{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "100000"
                }, {
                    indicator: {
                        expression: "DATR(14,POC(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(256))",
                        interval: "m60"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(64))",
                        interval: "m60"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "PCO(12,POC(6))",
                        interval: "m60"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "DATR(14,POC(6))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            }],
            exit: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "DATR(14,LOW_VALUE(6))",
                        interval: "m60"
                    },
                    lower: "0"
                },{
                    indicator: {
                        expression: "PCO(12,POC(6))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            },{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "close",
                        interval: "m60"
                    },
                    changeReference: {
                        expression: "close",
                        interval: "m60"
                    },
                    lower: "8"
                }]
            }]
        };
        var psar = {
            name: "psar",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator:{
                        expression:"Percent(ATR(10),EMA(10,close))",
                        interval: "d1"
                    },
                    upper: "3",
                    lower:"2"
                },{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "d1"
                    },
                    upper:"0"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "d1"
                    },
                    lower:"0"
                }]
            }]
        };
        var symbols = ["VTI","XLB","XLE","XLF","XLI","XLK","XLP","XLU","XLV","XLY"];
        var equities = [{
            ofExchange: "Archipelago Electronic Communications Network",
            includes: symbols
        }];
        it("load", function(done){
            Promise.all(symbols.map(function(symbol){
                var lower = new Date(2014, 0, 1);
                var upper = new Date(2015, 0, 1);
                return screener.load("http://probabilitytrading.net/exchanges/arcx/" + symbol, ['asof','close','CDO(1,3,SMA,STO(14,3,1))','Percent(ATR(10),EMA(10,close))'], 'd1',  1, lower, upper);
            })).then(function(data){
                var dates = _.map(data[0],'asof').filter(function(date){
                    return data.reduce(function(present, points){
                        var i = _.sortedIndex(points, {asof:date}, 'asof');
                        return present && points[i] && points[i].asof.valueOf() == date.valueOf();
                    }, true);
                });
                return dates.map(function(date){
                    var price = data.map(function(points){
                        return points[_.sortedIndex(points, {asof:date}, 'asof')].close;
                    });
                    var indicator = data.map(function(points){
                        var indicator = points[_.sortedIndex(points, {asof:date}, 'asof')]['CDO(1,3,SMA,STO(14,3,1))'];
                        return indicator.toFixed(8);
                    });
                    var percent = data.map(function(points){
                        var percent = points[_.sortedIndex(points, {asof:date}, 'asof')]['Percent(ATR(10),EMA(10,close))'];
                        return percent.toFixed(8) + '%';
                    });
                    return [moment(date).format('YYYY-MM-DD'),'',''].concat(price, indicator, percent).join(',');
                });
            }).then(function(result){
                expect([['time','value','cash'].concat(symbols,symbols,symbols).join(',')].concat(result).join('\n')).toBeUndefined();
            }).then(done, unexpected(done));
        });
        [psar].forEach(function(strategy){
            describe(strategy.name, function(){
                _.range(2014,2015).forEach(function(year){
                    xit(year + ' performance', function(done){
                        var lower = new Date(year, 0, 1);
                        var upper = new Date(year+1, 0, 1);
                        return screener.performance(equities,strategy.entry,strategy.exit,lower,upper).then(function(result){
                            return [year, result.rate, result.amount, result.sd, result.rate /result.amount /result.sd].join(',');
                        }).then(function(result){
                            expect(result).toBeUndefined();
                        }).then(done, unexpected(done));
                    });
                });
                xit('signals', function(done){
                    var lower = new Date(2014, 0, 1);
                    var upper = new Date(2015, 0, 1);
                    Promise.all(symbols.map(function(symbol){
                        return screener.load("http://probabilitytrading.net/exchanges/arcx/" + symbol, ['asof','close','EMA(20,PCO(1,close))'], 'd1',  1, lower, upper);
                    })).then(function(history){
                        return screener.signal(equities,strategy.entry,strategy.exit,lower,upper).then(function(result){
                            //expect(result).toBeUndefined();
                            //expect(aggregateSignals(result)).toBeUndefined();
                            //expect(positionsByDay(result)).toBeUndefined();
                            //expect(timeline(result, history)).toBeUndefined();
                            expect(daily(symbols, result, history)).toBeUndefined();
                        });
                    }).then(done, unexpected(done));
                });
            });
        });
    });
});

function aggregateSignals(signals) {
    return _.reduce(_.groupBy(signals, 'security'), function(returns, signals, security){
        var entry = null;
        return signals.reduce(function(returns, exit, i, signals){
            if (!entry && (exit.signal == 'buy' || exit.signal == 'sell')) {
                entry = exit;
                if (i == signals.length-1) {
                    returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price]);
                }
            } else if (entry.signal == 'sell' && exit.signal == 'buy') {
                var rate = (entry.price - exit.price) / entry.price;
                returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,moment(exit.asof).format('YYYY-MM-DD HH:mm:ss'),exit.price,rate]);
                entry = null;
            } else if (entry.signal == 'buy' && exit.signal == 'sell') {
                var rate = (exit.price - entry.price) / entry.price;
                returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,moment(exit.asof).format('YYYY-MM-DD HH:mm:ss'),exit.price,rate]);
                entry = null;
            }
            return returns;
        }, returns);
    }, []).map(function(rows){
        return rows.join(',');
    }).join('\n');
}

function timeline(signals, history) {
    return _.reduce(_.groupBy(signals, 'security'), function(returns, signals, security){
        var entry = null;
        return signals.reduce(function(returns, exit, i, signals){
            var symbol = exit.security.replace(/.*\//,'');
            var prices = history.map(function(data){
                var idx = _.sortedIndex(data, {asof:exit.asof},'asof');
                var i = (idx && data[idx] && data[idx].asof.valueOf() > exit.asof.valueOf()) ? idx - 1 : idx;
                return data[i].close;
            });
            if (!entry && exit.signal == 'sell') {
                entry = exit;
                returns.push([moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),symbol,'',''].concat(prices));
            } else if (!entry && exit.signal == 'buy') {
                entry = exit;
                returns.push([moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),'','',symbol].concat(prices));
            } else if (entry.signal == 'sell' && exit.signal == 'buy') {
                returns.push([moment(exit.asof).format('YYYY-MM-DD HH:mm:ss'),'',symbol,''].concat(prices));
                entry = null;
            } else if (entry.signal == 'buy' && exit.signal == 'sell') {
                returns.push([moment(exit.asof).format('YYYY-MM-DD HH:mm:ss'),'',symbol,''].concat(prices));
                entry = null;
            }
            return returns;
        }, returns);
    }, []).map(function(rows){
        return rows.join(',');
    }).join('\n');
}

function daily(symbols, signals, data) {
    var dates = _.map(data[0],'asof').filter(function(date){
        return data.reduce(function(present, points){
            var i = _.sortedIndex(points, {asof:date}, 'asof');
            return present && points[i] && points[i].asof.valueOf() == date.valueOf();
        }, true);
    });
    var bySecurities = symbols.map(function(symbol){
        return signals.filter(function(signal){
            return signal.security.indexOf(symbol) >= 0;
        });
    });
    return [['time','value','holding','cash','positions'].concat(symbols,symbols).join(',')].concat(dates.map(function(date){
        var price = data.map(function(points){
            return points[_.sortedIndex(points, {asof:date}, 'asof')].close;
        });
        var pco = data.map(function(points){
            var pco = points[_.sortedIndex(points, {asof:date}, 'asof')]['EMA(20,PCO(1,close))'];
            return pco.toFixed(8) + '%';
        });
        var positions = bySecurities.map(function(signals){
            var idx = _.sortedIndex(signals, {asof:date}, 'asof');
            var i = signals[idx] && signals[idx].asof.valueOf() == date.valueOf() ? idx : idx - 1;
            if (signals[i] && signals[i].asof.valueOf() <= date.valueOf() && signals[i].signal == 'buy')
                return signals[i].security.replace(/.*\//,'');
            return '';
        }).join('');
        return [moment(date).format('YYYY-MM-DD'),'','','',positions].concat(price, pco).join(',');
    })).join('\n');
}

function positionsByDay(signals) {
    return _.map(_.reduce(_.groupBy(signals, 'security'), function(positions, signals, security){
        var entry = null;
        return signals.reduce(function(positions, exit, i, signals){
            if (!entry && (exit.signal == 'buy' || exit.signal == 'sell')) {
                entry = exit;
            } else {
                incDay(positions, entry.asof, exit.asof, 1);
                entry = null;
            }
            return positions;
        }, positions);
    }, incDay({}, new Date(2014,0,1), new Date(2015,0,1), 0)), function(value, key){
        return key + ',' + value;
    }).sort().join('\n');
}

function incDay(positions, lower, upper, amount) {
    var date = moment(lower);
    while (date.valueOf() <= upper.valueOf()) {
        var key = date.format('YYYY-MM-DD');
        positions[key] = amount + (positions[key] || 0);
        date = date.add(1,'days');
    }
    return positions;
}
