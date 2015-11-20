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

describe("Macro", function(){

    describe("load", function(){
        these("should reject daily", [ // security, expressions, length, interval, asof
            ['XNGS', 'YHOO', ['invalid(asof)', 'open', 'high', 'low', 'close'],
                21, 'day', new Date(2014, 1, 1)
            ]
        ], loadQuotesWithError('Expression is unknown: invalid(asof)'));
        these("should return daily", [
            ['XNGS', 'YHOO', ['asof', 'open', 'high', 'low', 'close'],
                21, 'day', new Date(2014, 1, 1),
                [
                    [new Date(2014, 0, 3, 0, 0, 0).toISOString(),40.37,40.49,39.31,39.59],
                    [new Date(2014, 0, 4, 0, 0, 0).toISOString(),40.16,40.44,39.82,40.12],
                    [new Date(2014, 0, 7, 0, 0, 0).toISOString(),40.05,40.32,39.75,39.93],
                    [new Date(2014, 0, 8, 0, 0, 0).toISOString(),40.08,41.20,40.08,40.92],
                    [new Date(2014, 0, 9, 0, 0, 0).toISOString(),41.29,41.72,41.02,41.02],
                    [new Date(2014, 0, 10, 0, 0, 0).toISOString(),41.33,41.35,40.61,40.92],
                    [new Date(2014, 0, 11, 0, 0, 0).toISOString(),40.95,41.35,40.82,41.23],
                    [new Date(2014, 0, 14, 0, 0, 0).toISOString(),41.16,41.22,39.80,39.99],
                    [new Date(2014, 0, 15, 0, 0, 0).toISOString(),40.21,41.14,40.04,41.14],
                    [new Date(2014, 0, 16, 0, 0, 0).toISOString(),41.06,41.31,40.76,41.07],
                    [new Date(2014, 0, 17, 0, 0, 0).toISOString(),40.43,40.75,40.11,40.34],
                    [new Date(2014, 0, 18, 0, 0, 0).toISOString(),40.12,40.44,39.47,40.01],
                    [new Date(2014, 0, 22, 0, 0, 0).toISOString(),39.98,40.05,38.86,39.52],
                    [new Date(2014, 0, 23, 0, 0, 0).toISOString(),39.66,40.40,39.32,40.18],
                    [new Date(2014, 0, 24, 0, 0, 0).toISOString(),39.31,39.77,39.14,39.39],
                    [new Date(2014, 0, 25, 0, 0, 0).toISOString(),38.67,38.98,37.62,37.91],
                    [new Date(2014, 0, 28, 0, 0, 0).toISOString(),37.60,37.94,36.62,36.65],
                    [new Date(2014, 0, 29, 0, 0, 0).toISOString(),36.83,38.32,36.52,38.22],
                    [new Date(2014, 0, 30, 0, 0, 0).toISOString(),35.77,36.31,34.82,34.89],
                    [new Date(2014, 0, 31, 0, 0, 0).toISOString(),34.89,35.81,34.45,35.31],
                    [new Date(2014, 1, 1, 0, 0, 0).toISOString(),34.69,36.33,34.55,36.01]
                ]
            ]
        ], loadQuotes);
        these("should return weekly", [
            ['XNGS', 'YHOO', ['asof', 'open', 'high', 'low', 'close'],
                4, 'week', new Date(2014, 1, 3),
                [
                    [new Date(2014, 0, 13, 0, 0, 0).toISOString(),40.05,41.72,39.75,41.23],
                    [new Date(2014, 0, 20, 0, 0, 0).toISOString(),41.16,41.31,39.47,40.01],
                    [new Date(2014, 0, 27, 0, 0, 0).toISOString(),39.98,40.40,37.62,37.91],
                    [new Date(2014, 1, 3, 0, 0, 0).toISOString(),37.60,38.32,34.45,36.01]
                ]
            ]
        ], loadQuotes);
        these("should return monthly", [
            ['XNGS', 'YHOO', ['asof', 'open', 'high', 'low', 'close'],
                4, 'month', new Date(2014, 1, 3),
                [
                    [new Date(2013, 10, 1, 0, 0, 0).toISOString(),33.36,35.06,31.70,32.94],
                    [new Date(2013, 11, 1, 0, 0, 0).toISOString(),33.15,37.35,32.06,36.98],
                    [new Date(2014, 0, 1, 0, 0, 0).toISOString(),37.04,41.05,36.25,40.44],
                    [new Date(2014, 1, 1, 0, 0, 0).toISOString(),40.37,41.72,34.45,36.01]
                ]
            ]
        ], loadQuotes);
        these("should find BRK/A yahoo symbol", [
            ['XNYS', 'BRK/A', ['asof', 'open', 'high', 'low', 'close'],
                1, 'day', new Date(2014, 1, 1),
                [
                    [new Date(2014, 1, 1, 0, 0, 0).toISOString(), 168017.00,    169625.00,    167638.00,    169511.00]
                ]
            ]
        ], loadQuotes);
        these("should find C^K yahoo symbol", [
            ['XNYS', 'C^K', ['asof', 'open', 'high', 'low', 'close'],
                1, 'day', new Date(2014, 1, 1),
                [
                    [new Date(2014, 1, 1, 0, 0, 0).toISOString(), 25.72,25.75,25.65,25.70]
                ]
            ]
        ], loadQuotes);
    });

    describe("signals", function(){
        these("should return", [
            [
                [{
                    ofExchange: 'XNGS',
                    includes: ['XNGS:YHOO']
                }],
                [{
                    indicator: {
                        expression: 'volume',
                        interval: {value: 'day'}
                    },
                    lower: 415800
                }],
                new Date(2014, 0, 13),new Date(2014, 0, 15),
                [{symbol: 'XNGS:YHOO', day: {volume: 16047200}}]
            ]
        ], signalsCheck);
    });

    describe("MMM", function(){
        describe("signals", function(){
            it("hold change", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }]
                }],[{
                    indicatorWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    upper: "135.00"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    differenceWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    percentWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    upper: "4"
                }], new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result).toContain(jasmine.objectContaining({
                        watch: jasmine.objectContaining({
                            asof: "2014-10-11T04:00:00.000Z",
                            price: 133.83
                        })
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        stop: jasmine.objectContaining({
                            price: 140.93
                        })
                    }));
                }).then(done, unexpected(done));
            });
            it("hold", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }]
                }],[{
                    indicatorWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    upper: "135.00"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    differenceWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    percentWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    upper: "4"
                }], new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result.length).toEqual(1);
                    expect(result[0].holding.length).toEqual(7);
                    expect(result).toContain(jasmine.objectContaining({
                        watch: jasmine.objectContaining({
                            price: 133.83
                        })
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        stop: jasmine.objectContaining({
                            price: 140.93
                        })
                    }));
                }).then(done, unexpected(done));
            });
            it("multiple signals", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }]
                }],[{
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    lower: "140.00"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    lower: "140.00"
                }], new Date('2014-10-10'),new Date('2014-11-02')).then(function(result){
                    expect(result.length).toEqual(2);
                    expect(result[0].holding.length).toEqual(1);
                    expect(result[1].holding.length).toEqual(6);
                    expect(result).toContain(jasmine.objectContaining({
                        watch: jasmine.objectContaining({
                            price: 140.93
                        })
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        stop: jasmine.objectContaining({
                            price: 138.95
                        })
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        watch: jasmine.objectContaining({
                            price: 145.05
                        })
                    }));
                }).then(done, unexpected(done));
            });
            it("watch change", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }]
                }],[{
                    indicatorWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    differenceWatch: {
                        expression: "open",
                        interval: {value: 'week'}
                    },
                    percentWatch: {
                        expression: "open",
                        interval: {value: 'week'}
                    },
                    upper: "-4"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    differenceWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    percentWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    upper: "4",
                    lower: "-4"
                }], new Date('2014-10-01'),new Date('2014-11-01')).then(function(result){
                    expect(result).toContain(jasmine.objectContaining({
                        watch: jasmine.objectContaining({
                            price: 134.18,
                            asof: '2014-10-15T04:00:00.000Z'
                        })
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        stop: jasmine.objectContaining({
                            price: 140.93,
                            asof: '2014-10-22T04:00:00.000Z'
                        })
                    }));
                }).then(done, unexpected(done));
            });
            it("correlated", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }],
                    correlated: {
                        exchange: getExchange("ARCX"),
                        ticker: "SPY",
                        iri: getExchange("ARCX").iri + "/SPY"
                    }
                }],[{
                    indicatorWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    differenceWatch: {
                        expression: "open",
                        interval: {value: 'week'}
                    },
                    percentWatch: {
                        expression: "open",
                        interval: {value: 'week'}
                    },
                    againstCorrelated: true,
                    upper: "-4"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    differenceWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    percentWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    upper: "4",
                    lower: "-4"
                }], new Date('2014-10-01'),new Date('2014-11-01')).then(function(result){
                    return result.filter(function(point){
                        return point.signal != 'hold';
                    });
                }).then(function(result){
                    expect(result).toContain(jasmine.objectContaining({
                        watch: jasmine.objectContaining({
                            price: 132.9,
                            asof: '2014-10-14T04:00:00.000Z'
                        })
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        stop: jasmine.objectContaining({
                            price: 140.93,
                            asof: '2014-10-22T04:00:00.000Z'
                        })
                    }));
                }).then(done, unexpected(done));
            });
        });
        describe("screen", function(){
            it("day close", function(done){
                screener.screen([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }]
                }],[{
                    indicatorWatch: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    lower: "140.00",
                    upper: "145.00"
                }, {
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    },
                    lower: "135.00",
                    upper: "150.00"
                }], new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result.length).toEqual(1);
                    expect(result[0].watch.price).toBeCloseTo(140.93,2);
                    expect(result[0].stop.price).toBeCloseTo(151.06,2);
                    expect(result[0].performance).toBeCloseTo(7,0);
                    expect(result[0].exposure).toBeCloseTo(5/260*100,1);
                    expect(result[0].positive_excursion).toBeCloseTo(8.96,2);
                    expect(result[0].negative_excursion).toBeCloseTo(-2.1,2);
                }).then(done, unexpected(done));
            });
            it("nothing", function(done){
                screener.screen([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[{
                        exchange: getExchange("New York Stock Exchange"),
                        iri: getExchange("New York Stock Exchange").iri + "/MMM",
                        ticker: "MMM"
                    }]
                }],[{
                    indicator: {
                        expression: "close",
                        interval: {value: 'day'}
                    }
                }], new Date('2014-10-23'),new Date('2014-10-24')).then(function(result){
                    expect(result.length).toEqual(1);
                    expect(result[0].performance).toBeCloseTo(7,0);
                }).then(done, unexpected(done));
            });
        });
    });
});
