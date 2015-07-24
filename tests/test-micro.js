// test-screener.js
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

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60;

describe("Micro", function(){

    describe("load", function(){
        these("should return minutes", [
            ['XNYS', 'IBM', ['asof', 'high', 'low', 'open', 'close'],
                30, 'm1', new Date('2014-03-03T10:30:00-0500'),
                [
                    [new Date('2014-03-03T10:01:00-0500').toISOString(),184.1700,183.7700,183.9800,183.8000],
                    [new Date('2014-03-03T10:02:00-0500').toISOString(),184.0700,183.8000,183.8000,183.8600],
                    [new Date('2014-03-03T10:03:00-0500').toISOString(),183.8690,183.5800,183.8000,183.5800],
                    [new Date('2014-03-03T10:04:00-0500').toISOString(),183.7800,183.5600,183.5650,183.7500],
                    [new Date('2014-03-03T10:05:00-0500').toISOString(),183.8400,183.7000,183.7000,183.7300],
                    [new Date('2014-03-03T10:06:00-0500').toISOString(),183.8299,183.6800,183.7300,183.8200],
                    [new Date('2014-03-03T10:07:00-0500').toISOString(),183.8500,183.6300,183.8200,183.6800],
                    [new Date('2014-03-03T10:08:00-0500').toISOString(),183.8700,183.6600,183.6600,183.8111],
                    [new Date('2014-03-03T10:09:00-0500').toISOString(),183.9290,183.7700,183.8040,183.8300],
                    [new Date('2014-03-03T10:10:00-0500').toISOString(),183.9100,183.7700,183.8300,183.8000],
                    [new Date('2014-03-03T10:11:00-0500').toISOString(),183.8300,183.7400,183.8043,183.7500],
                    [new Date('2014-03-03T10:12:00-0500').toISOString(),183.7400,183.5100,183.7400,183.5100],
                    [new Date('2014-03-03T10:13:00-0500').toISOString(),183.6200,183.4300,183.5000,183.5262],
                    [new Date('2014-03-03T10:14:00-0500').toISOString(),183.7500,183.5000,183.5250,183.7200],
                    [new Date('2014-03-03T10:15:00-0500').toISOString(),183.7200,183.5900,183.7200,183.6000],
                    [new Date('2014-03-03T10:16:00-0500').toISOString(),183.5700,183.4000,183.5400,183.4700],
                    [new Date('2014-03-03T10:17:00-0500').toISOString(),183.6300,183.4200,183.4800,183.6300],
                    [new Date('2014-03-03T10:18:00-0500').toISOString(),183.6399,183.4600,183.6000,183.5000],
                    [new Date('2014-03-03T10:19:00-0500').toISOString(),183.5300,183.4730,183.4800,183.5300],
                    [new Date('2014-03-03T10:20:00-0500').toISOString(),183.6800,183.5200,183.5500,183.6600],
                    [new Date('2014-03-03T10:21:00-0500').toISOString(),183.7300,183.6600,183.6700,183.7300],
                    [new Date('2014-03-03T10:22:00-0500').toISOString(),183.8200,183.6950,183.7300,183.7600],
                    [new Date('2014-03-03T10:23:00-0500').toISOString(),183.7500,183.6100,183.7300,183.6314],
                    [new Date('2014-03-03T10:24:00-0500').toISOString(),183.7100,183.5700,183.6100,183.7100],
                    [new Date('2014-03-03T10:25:00-0500').toISOString(),183.7500,183.6700,183.7400,183.7100],
                    [new Date('2014-03-03T10:26:00-0500').toISOString(),183.7500,183.6900,183.7081,183.7250],
                    [new Date('2014-03-03T10:27:00-0500').toISOString(),183.7700,183.6100,183.7000,183.6500],
                    [new Date('2014-03-03T10:28:00-0500').toISOString(),183.6600,183.5600,183.6200,183.6250],
                    [new Date('2014-03-03T10:29:00-0500').toISOString(),183.7700,183.6350,183.6600,183.7700],
                    [new Date('2014-03-03T10:30:00-0500').toISOString(),183.9400,183.7390,183.7390,183.8300]
                ]
            ]
        ], loadQuotes);
        these("should return 10 minute intervals", [
            ['XNYS', 'IBM', ['asof', 'high', 'low', 'open', 'close'],
                6, 'm10', new Date('2014-03-03T11:00:00-0500'),
                [
                    [new Date('2014-03-03T10:10:00-0500').toISOString(),184.1700,183.5600,183.9800,183.8000],
                    [new Date('2014-03-03T10:20:00-0500').toISOString(),183.8300,183.4000,183.8043,183.6600],
                    [new Date('2014-03-03T10:30:00-0500').toISOString(),183.9400,183.5600,183.6700,183.8300],
                    [new Date('2014-03-03T10:40:00-0500').toISOString(),184.0500,183.8300,183.8510,184.0500],
                    [new Date('2014-03-03T10:50:00-0500').toISOString(),184.2900,183.9500,183.9800,183.9600],
                    [new Date('2014-03-03T11:00:00-0500').toISOString(),184.2740,183.9600,183.9600,184.2250]
                ]
            ]
        ], loadQuotes);
    });

    describe("MMM reversion", function(){
        it("signals", function(done){
            screener.signals([{
                exchange: getExchange("New York Stock Exchange"),
                includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
            }],{
                watch:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: {value: 'annual'}
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'd5'}
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: {value: 'd5'}
                    },
                    lower: "100000"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'd1'}
                    },
                    difference: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent: {
                        expression: "STDEV(20,close)",
                        interval: {value: 'd1'}
                    },
                    upper: "-200"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'd1'}
                    },
                    difference: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    upper: "-4"
                }, {
                    indicator: {
                        expression: "MAX(3,PercentB(SMA(20,close),2,STDEV(20,close)))",
                        interval: {value: 'd1'}
                    },
                    upper: "25"
                }, {
                    indicator: {
                        expression: "HOUR(asof)",
                        interval: {value: 'm60'}
                    },
                    lower: "10",
                    upper: "15"
                }, {
                    indicator: {
                        expression: "POC(6)",
                        interval: {value: 'm60'}
                    },
                    difference: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent: {
                        expression: "STDEV(20,close)",
                        interval: {value: 'd1'}
                    },
                    lower: "-200"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'm10'}
                    },
                    difference: {
                        expression: "POC(6)",
                        interval: {value: 'm60'}
                    },
                    upper: "0"
                }],
                hold:[{
                    indicator: {
                        expression: "WORKDAY(asof,0)",
                        interval: {value: 'd1'}
                    },
                    difference: {
                        expression:"WORKDAY(asof,10)",
                        interval: {value: 'd1'}
                    },
                    upper: "0"
                },{
                    indicator:{
                        expression:"close",
                        interval: {value: 'd1'}
                    },
                    difference:{
                        expression:"SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent:{
                        expression:"SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    upper:"0",
                    lower: "-15"
                }]
            }, new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                expect(result).toContain(jasmine.objectContaining({
                    signal: 'watch',
                    price: 134.98,
                    asof: '2014-10-14T17:30:00.000Z'
                }));
                expect(result).toContain(jasmine.objectContaining({
                    signal: 'stop',
                    price: 145.05,
                    asof: '2014-10-23T20:00:00.000Z'
                }));
            }).then(done, unexpected(done));
        });
        it("screen", function(done){
            screener.screen([{
                exchange: getExchange("New York Stock Exchange"),
                includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
            }],{
                watch:[{
                    indicator: {
                        expression: "F-Score()",
                        interval: {value: 'annual'}
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'd5'}
                    },
                    lower: "5"
                }, {
                    indicator: {
                        expression: "volume",
                        interval: {value: 'd5'}
                    },
                    lower: "100000"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'd1'}
                    },
                    difference: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent: {
                        expression: "STDEV(20,close)",
                        interval: {value: 'd1'}
                    },
                    upper: "-200"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'd1'}
                    },
                    difference: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    upper: "-4"
                }, {
                    indicator: {
                        expression: "MAX(3,PercentB(SMA(20,close),2,STDEV(20,close)))",
                        interval: {value: 'd1'}
                    },
                    upper: "25"
                }, {
                    indicator: {
                        expression: "HOUR(asof)",
                        interval: {value: 'm60'}
                    },
                    lower: "10",
                    upper: "15"
                }, {
                    indicator: {
                        expression: "POC(6)",
                        interval: {value: 'm60'}
                    },
                    difference: {
                        expression: "SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent: {
                        expression: "STDEV(20,close)",
                        interval: {value: 'd1'}
                    },
                    lower: "-200"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'm10'}
                    },
                    difference: {
                        expression: "POC(6)",
                        interval: {value: 'm60'}
                    },
                    upper: "0"
                }],
                hold:[{
                    indicator: {
                        expression: "WORKDAY(asof,0)",
                        interval: {value: 'd1'}
                    },
                    difference:{
                        expression:"WORKDAY(asof,10)",
                        interval: {value: 'd1'}
                    },
                    upper: "0"
                },{
                    indicator:{
                        expression:"close",
                        interval: {value: 'd1'}
                    },
                    difference:{
                        expression:"SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    percent:{
                        expression:"SMA(20,close)",
                        interval: {value: 'd1'}
                    },
                    upper:"0",
                    lower: "-15"
                }]
            }, new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                expect(result).toContain(jasmine.objectContaining({
                    price: 145.05,
                    asof: '2014-10-23T20:00:00.000Z'
                }));
                expect(result[0].growth).toBeCloseTo(9,0);
                expect(result[0].performance.length).toBe(1);
                expect(result[0].performance[0]).toBeCloseTo(9,0);
            }).then(done, unexpected(done));
        });
    });
});
