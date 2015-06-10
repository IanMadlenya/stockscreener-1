// test-simulator.js
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
    describe("over", function(){
        var reversion = {
            name: "mean reversion",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
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
                        expression: "DATR(14,KELT(SMA(20,close),-2,SD(20,close)))",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "MIN(2,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "MIN(2,Percent(close,SMA(20,close)))",
                        interval: "d1"
                    },
                    lower: "90"
                }]
            }],
            exit: [{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"DATR(14,SMA(20,close))",
                        interval: "d1"
                    },
                    lower:"0"
                },{
                    indicator: {
                        expression: "MIN(4,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "WORKDAY(asof,-10)",
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
        var reversion_short = {
            name: "mean reversion short",
            entry: [{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "6"
                }, {
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
                    upper: "0"
                }, {
                    indicator: {
                        expression: "MAX(2,DATR(14,KELT(SMA(20,close),2,SD(20,close))))",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            }],
            exit: [{
                signal: 'buy',
                filters:[{
                    indicator:{
                        expression:"DATR(14,SMA(20,close))",
                        interval: "d1"
                    },
                    upper:"0"
                },{
                    indicator: {
                        expression: "MAX(4,DATR(14,KELT(SMA(20,close),2,SD(20,close))))",
                        interval: "d1"
                    },
                    upper: "0"
                }]
            },{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "WORKDAY(asof,-10)",
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
        var reversion_m30 = {
            name: "mean reversion m30",
            entry: [{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
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
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "6"
                }, {
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
        //[reversion, reversion_short, reversion_m30, reversion_m60_short].forEach(function(strategy){
        [reversion_m30].forEach(function(strategy){
            describe(strategy.name, function(){
                [
                    "Health Care",
                    "Transportation"
                ].forEach(function(sector){
                    describe(sector, function(){
                        _.range(2011,2015).forEach(function(year){
                            var sectors = [{
                                ofExchange: "New York Stock Exchange",
                                includeSectors:[sector],
                                mincap: 2000000000
                            }];
                            xit(year + ' performance', function(done){
                                var lower = new Date(year, 0, 1);
                                var upper = new Date(year+1, 0, 1);
                                return screener.performance(sectors,strategy.entry,strategy.exit,lower,upper).then(function(result){
                                    return [year, result.rate, result.amount, result.sd, result.rate /result.amount /result.sd].join(',');
                                }).then(function(result){
                                    expect(result).toBeUndefined();
                                }).then(done, unexpected(done));
                            });
                        });
                    });
                });
                it('signals', function(done){
                    var lower = new Date(2011, 0, 1);
                    var upper = new Date(2013,0,1);
                    screener.signal([{
                        ofExchange: "New York Stock Exchange",
                        includeSectors:["Health Care", "Transportation"],
                        mincap: 2000000000
                    }],strategy.entry,strategy.exit,lower,upper).then(function(result){
                        //expect(result).toBeUndefined();
                        //expect(aggregateSignals(result)).toBeUndefined();
                        //expect(positionsByDay(result)).toBeUndefined();
                        expect(timeline(result)).toBeUndefined();
                    }).then(done, unexpected(done));
                });
            });
        });
    });
    xdescribe("performance", function(){
        it("low value m60 Health Care 2014", function(done){
            screener.performance([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "60"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "2000000"
                }, {
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression:"DATR(14,HIGH_VALUE(32))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression:"DATR(14,POC(32))",
                        interval: "m60"
                    },
                    upper: "0"
                },{
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(128))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(32))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(result.rate / result.amount / result.sd).toBeCloseTo(0);
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("mean reversion Health Care one year", function(done){
            screener.performance([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
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
                        expression: "DATR(14,KELT(SMA(20,close),-2,SD(20,close)))",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "MIN(2,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "MIN(2,Percent(close,SMA(20,close)))",
                        interval: "d1"
                    },
                    lower: "90"
                }, {
                    indicator: {
                        expression: "MAX(3,PercentB(SMA(20,close),2,SD(20,close)))",
                        interval: "d1"
                    },
                    upper: "25"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"DATR(14,SMA(20,close))",
                        interval: "d1"
                    },
                    lower:"0"
                },{
                    indicator: {
                        expression: "MIN(4,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "MAX(10,PCO(1,SIGN(DATR(14,KELT(SMA(20,close),-2,SD(20,close))))))",
                        interval: "d1"
                    },
                    upper: "0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(result.rate / result.amount / result.sd).toBeCloseTo(0);
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("Pullback Consumer Services one year", function(done){
            screener.performance([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Consumer Services"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "6"
                }, {
                    indicator: {
                        expression: "FQScore()",
                        interval: "quarter"
                    },
                    upper: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "1",
                    upper: "100"
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
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.01,0.2,100)",
                        interval: "d5"
                    },
                    lower:"0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(result.rate / result.amount / result.sd).toBeCloseTo(0);
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("Blue Sky Health Care one year", function(done){
            screener.performance([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "6"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "1",
                    upper: "100"
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
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "d5"
                    },
                    lower:"0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(result.rate / result.amount / result.sd).toBeCloseTo(0);
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("long PSAR 0.02 m30 one year", function(done){
            screener.performance([{
                ofExchange: "New York Stock Exchange",
                includes:["TWX", "MMM","DIS","PEP","JNJ"]
            }],[{
                signal: 'buy',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    upper:"0"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    lower:"0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(result.rate / result.amount / result.sd).toBeCloseTo(0);
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("short PSAR 0.02 m30 six months", function(done){
            screener.performance([{
                ofExchange: "New York Stock Exchange",
                includes:["TWX", "MMM","DIS","PEP","JNJ"]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    lower:"0"
                }]
            }],[{
                signal: 'buy',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    upper:"0"
                }]
            }],new Date(2014, 3, 24),new Date(2014, 9, 18)).then(function(result){
                expect(result).toBeTruthy();
                expect(result.rate / result.amount / result.sd).toBeCloseTo(0);
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
    });
    xdescribe("signal", function(){
        it("buy one year", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                //includeSectors:["Basic Industries","Capital Goods","Consumer Durables","Consumer Non-Durables","Consumer Services","Finance","Health Care","Miscellaneous","Public Utilities","Technology","Transportation"],
                mincap: 250000000
                //includes:["CBT","CLF","CMC","DIS","FLR","FOE","GLW","MMM","TWX"]
                //includes:["ABC","ABT","AET","AGN","BAX","BCR","BDX","BMY","BSX","CAH","CBM","CHE","CI","CMN","CNC","COO","COV","CVS","CYH","DGX","EW","GSK","HGR","HLS","HRC","IVC","JNJ","LCI","LH","LLY","MCK","MD","MMM","MSA","NUS","NVO","NVS","OCR","PFE","RMD","SEM","STE","SYK","TEVA","TFX","THC","UHS","UNH","VAR","VRX","WAG","WLP"]
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "60"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "2000000"
                }, {
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression:"TPOC(64)",
                        interval: "m60"
                    },
                    upper: "100"
                }, {
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(64))",
                        interval: "m60"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression:"DATR(14,POC(64))",
                        interval: "m60"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression:"MAX(32,DATR(14,POC(64))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression:"DATR(14,POC(64))",
                        interval: "m60"
                    },
                    upper: "0"
                },{
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(128))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(64))",
                        interval: "m60"
                    },
                    upper: "-1"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("low value m60 Health Care one year", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "60"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: "d5"
                    },
                    lower: "2000000"
                }, {
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression:"DATR(14,HIGH_VALUE(32))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression:"DATR(14,POC(32))",
                        interval: "m60"
                    },
                    upper: "0"
                },{
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(120))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression:"DATR(14,LOW_VALUE(32))",
                        interval: "m60"
                    },
                    upper: "0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("mean reversion Health Care one year", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
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
                        expression: "DATR(14,KELT(SMA(20,close),-2,SD(20,close)))",
                        interval: "d1"
                    },
                    lower: "0"
                }, {
                    indicator: {
                        expression: "MIN(2,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression: "MIN(2,Percent(close,SMA(20,close)))",
                        interval: "d1"
                    },
                    lower: "90"
                }, {
                    indicator: {
                        expression: "MAX(3,PercentB(SMA(20,close),2,SD(20,close)))",
                        interval: "d1"
                    },
                    upper: "25"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"DATR(14,SMA(20,close))",
                        interval: "d1"
                    },
                    lower:"0"
                },{
                    indicator: {
                        expression: "MIN(4,DATR(14,KELT(SMA(20,close),-2,SD(20,close))))",
                        interval: "d1"
                    },
                    lower: "0"
                }]
            },{
                signal: 'sell',
                filters:[{
                    indicator: {
                        expression: "MAX(10,PCO(1,SIGN(DATR(14,KELT(SMA(20,close),-2,SD(20,close))))))",
                        interval: "d1"
                    },
                    upper: "0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("Pullback Consumer Services one year", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Consumer Services"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "6"
                }, {
                    indicator: {
                        expression: "FQScore()",
                        interval: "quarter"
                    },
                    upper: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "1",
                    upper: "100"
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
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.01,0.2,100)",
                        interval: "d5"
                    },
                    lower:"0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("Blue Sky Health Care one year", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includeSectors:["Health Care"],
                mincap: 250000000
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "6"
                }, {
                    indicator: {
                        expression: "close",
                        interval: "d5"
                    },
                    lower: "1",
                    upper: "100"
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
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "d5"
                    },
                    lower:"0"
                }]
            }],new Date(2013, 9, 26),new Date(2014, 9, 25)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("long PSAR 0.02 one week m30", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includes:["TWX", "MMM","DIS","PEP","JNJ"]
            }],[{
                signal: 'buy',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    upper:"0"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    lower:"0"
                }]
            }],new Date(2014, 9, 13),new Date(2014, 9, 18)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("long PSAR 0.02 six months m30", function(done){
            screener.signal([{
                ofExchange: "New York Stock Exchange",
                includes:["TWX", "MMM","DIS","PEP","JNJ"]
            }],[{
                signal: 'buy',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    upper:"0"
                }]
            }],[{
                signal: 'sell',
                filters:[{
                    indicator:{
                        expression:"PLOW(1,PSAR,0.02,0.2,100)",
                        interval: "m30"
                    },
                    lower:"0"
                }]
            }],new Date(2014, 3, 24),new Date(2014, 9, 18)).then(function(result){
                expect(result).toBeTruthy();
                expect(aggregateSignals(result)).toBeUndefined();
            }).then(done, unexpected(done));
        });
    });
    xdescribe("screen", function(){
        it("JNJ", function(done){
            screener.screen([{
                ofExchange: "New York Stock Exchange",
                includes:"JNJ"
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
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
                        expression:"DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression:"DATR(14,HIGH_VALUE(32))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            }],new Date('Wed Feb 05 2014 12:00:00-0500'),new Date('Wed Feb 05 2014 12:00:00-0500')).then(function(result){
                expect(result).toBeTruthy();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
        it("MMM", function(done){
            screener.screen([{
                ofExchange: "New York Stock Exchange",
                includes:"MMM"
            }],[{
                signal: 'buy',
                filters:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: "annual"
                    },
                    lower: "5"
                }, {
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
                        expression:"DATR(14,LOW_VALUE(20))",
                        interval: "d1"
                    },
                    upper: "0"
                }, {
                    indicator: {
                        expression:"DATR(14,HIGH_VALUE(32))",
                        interval: "m60"
                    },
                    lower: "0"
                }]
            }],new Date(2014, 0, 31),new Date(2014, 1, 14)).then(function(result){
                expect(result).toBeTruthy();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        });
    });
    xdescribe("load", function(){
        it("JNJ", function(done){
            screener.load("http://probabilitytrading.net/exchanges/nyse/JNJ", ["DATR(14,LOW_VALUE(20))"], 'd1', 10, new Date(2014,1,13)).then(function(result){
                expect(result).toBeTruthy();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
        })
        it("MMM", function(done){
            screener.load("http://probabilitytrading.net/exchanges/nyse/MMM", ["LOW_VALUE(120)","DATR(14,LOW_VALUE(120))","DATR(14,HIGH_VALUE(32))","DATR(14,LOW_VALUE(32))"], 'm60', 100, new Date(2014, 7, 13)).then(function(result){
                expect(result).toBeTruthy();
                expect(result).toBeUndefined();
            }).then(done, unexpected(done));
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

function timeline(signals) {
    return _.reduce(_.groupBy(signals, 'security'), function(returns, signals, security){
        var entry = null;
        return signals.reduce(function(returns, exit, i, signals){
            if (!entry && exit.signal == 'sell') {
                entry = exit;
                if (i == signals.length-1) {
                    returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,entry.price]);
                }
            } else if (!entry && exit.signal == 'buy') {
                entry = exit;
                if (i == signals.length-1) {
                    returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,-entry.price]);
                }
            } else if (entry.signal == 'sell' && exit.signal == 'buy') {
                returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,entry.price]);
                returns.push([security.replace(/.*\//,''),moment(exit.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,-exit.price]);
                entry = null;
            } else if (entry.signal == 'buy' && exit.signal == 'sell') {
                returns.push([security.replace(/.*\//,''),moment(entry.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,-entry.price]);
                returns.push([security.replace(/.*\//,''),moment(exit.asof).format('YYYY-MM-DD HH:mm:ss'),entry.price,exit.price]);
                entry = null;
            }
            return returns;
        }, returns);
    }, []).map(function(rows){
        return rows.join(',');
    }).join('\n');
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
