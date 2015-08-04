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
        these("should match piotroski f-score", [
            ['XNYS', 'BR', ['asof', 'FQScore()'],
                1, 'quarter', new Date('2014-12-01'),
                [
                    [new Date('Wed Oct 01 2014 00:00:00 GMT-0400 (EDT)').toISOString(), 4]
                ]
            ],
            ['XNYS', 'MYE', ['asof', 'FQScore()'],
                1, 'quarter', new Date('2014-12-01'),
                [
                    [new Date('Wed Oct 01 2014 00:00:00 GMT-0400 (EDT)').toISOString(), 3]
                ]
            ]
        ], loadQuotes);
        these("should reject daily", [ // security, expressions, length, interval, asof
            ['XNGS', 'YHOO', ['invalid(asof)', 'open', 'high', 'low', 'close'],
                21, 'd1', new Date(2014, 1, 1)
            ]
        ], loadQuotesWithError('Expression is unknown: invalid(asof)'));
        these("should return daily", [
            ['XNGS', 'YHOO', ['asof', 'open', 'high', 'low', 'close'],
                21, 'd1', new Date(2014, 1, 1),
                [
                    [new Date(2014, 0, 2, 16, 0, 0).toISOString(),40.37,40.49,39.31,39.59],
                    [new Date(2014, 0, 3, 16, 0, 0).toISOString(),40.16,40.44,39.82,40.12],
                    [new Date(2014, 0, 6, 16, 0, 0).toISOString(),40.05,40.32,39.75,39.93],
                    [new Date(2014, 0, 7, 16, 0, 0).toISOString(),40.08,41.20,40.08,40.92],
                    [new Date(2014, 0, 8, 16, 0, 0).toISOString(),41.29,41.72,41.02,41.02],
                    [new Date(2014, 0, 9, 16, 0, 0).toISOString(),41.33,41.35,40.61,40.92],
                    [new Date(2014, 0, 10, 16, 0, 0).toISOString(),40.95,41.35,40.82,41.23],
                    [new Date(2014, 0, 13, 16, 0, 0).toISOString(),41.16,41.22,39.80,39.99],
                    [new Date(2014, 0, 14, 16, 0, 0).toISOString(),40.21,41.14,40.04,41.14],
                    [new Date(2014, 0, 15, 16, 0, 0).toISOString(),41.06,41.31,40.76,41.07],
                    [new Date(2014, 0, 16, 16, 0, 0).toISOString(),40.43,40.75,40.11,40.34],
                    [new Date(2014, 0, 17, 16, 0, 0).toISOString(),40.12,40.44,39.47,40.01],
                    [new Date(2014, 0, 21, 16, 0, 0).toISOString(),39.98,40.05,38.86,39.52],
                    [new Date(2014, 0, 22, 16, 0, 0).toISOString(),39.66,40.40,39.32,40.18],
                    [new Date(2014, 0, 23, 16, 0, 0).toISOString(),39.31,39.77,39.14,39.39],
                    [new Date(2014, 0, 24, 16, 0, 0).toISOString(),38.67,38.98,37.62,37.91],
                    [new Date(2014, 0, 27, 16, 0, 0).toISOString(),37.60,37.94,36.62,36.65],
                    [new Date(2014, 0, 28, 16, 0, 0).toISOString(),36.83,38.32,36.52,38.22],
                    [new Date(2014, 0, 29, 16, 0, 0).toISOString(),35.77,36.31,34.82,34.89],
                    [new Date(2014, 0, 30, 16, 0, 0).toISOString(),34.89,35.81,34.45,35.31],
                    [new Date(2014, 0, 31, 16, 0, 0).toISOString(),34.69,36.33,34.55,36.01]
                ]
            ]
        ], loadQuotes);
        these("should return weekly", [
            ['XNGS', 'YHOO', ['asof', 'open', 'high', 'low', 'close'],
                4, 'd5', new Date(2014, 1, 3),
                [
                    [new Date(2014, 0, 10, 16, 0, 0).toISOString(),40.05,41.72,39.75,41.23],
                    [new Date(2014, 0, 17, 16, 0, 0).toISOString(),41.16,41.31,39.47,40.01],
                    [new Date(2014, 0, 24, 16, 0, 0).toISOString(),39.98,40.40,37.62,37.91],
                    [new Date(2014, 0, 31, 16, 0, 0).toISOString(),37.60,38.32,34.45,36.01]
                ]
            ]
        ], loadQuotes);
        these("should return quarter", [
            ['XNGS', 'MORN', ['asof', 'revenue', 'diluted_earnings_per_share', 'total_liabilities', 'total_stockholders_equity', 'net_change_in_cash','free_cash_flow','PERCENT(total_liabilities,total_stockholders_equity)'],
                1, 'quarter', new Date(2014, 11, 1),
                [
                    [new Date(2014,9,1).toISOString(), 193106000, 0.67, 350591000, 669584000, 13064000, -3357000, 52.35952471982604]
                ]
            ]
        ], loadQuotes);
        these("should return annually", [
            ['XNGS', 'MORN', ['asof', 'revenue_mil', 'gross_margin', 'operating_income_mil', 'operating_margin', 'net_income_mil', 'earnings_per_share', 'dividends', 'payout_ratio', 'shares_mil', 'book_value_per_share', 'operating_cash_flow_mil', 'cap_spending_mil', 'free_cash_flow_mil', 'free_cash_flow_per_share', 'working_capital_mil', 'revenue', 'cogs', 'gross_margin', 'sg&a', 'r&d', 'other', 'operating_margin', 'net_int_inc_other', 'ebt_margin', 'tax_rate', 'net_margin', 'asset_turnover', 'return_on_assets', 'financial_leverage', 'return_on_equity', 'return_on_invested_capital', 'interest_coverage', 'year_over_year_revenue', '3-year_average_revenue', '5-year_average_revenue', '10-year_average_revenue', 'year_over_year_operating_income', '3-year_average_operating_income', '5-year_average_operating_income', '10-year_average_operating_income', 'year_over_year_net_income', '3-year_average_net_income', '5-year_average_net_income', '10-year_average_net_income', 'year_over_year_eps', '3-year_average_eps', '5-year_average_eps', '10-year_average_eps', 'operating_cash_flow_growth_yoy', 'free_cash_flow_growth_yoy', 'cap_ex_as_a_of_sales', 'free_cash_flow_to_sales', 'free_cash_flow_to_net_income', 'cash_short-term_investments', 'accounts_receivable', 'inventory', 'other_current_assets', 'total_current_assets', 'net_pp&e', 'intangibles', 'other_long-term_assets', 'total_assets', 'accounts_payable', 'short-term_debt', 'taxes_payable', 'accrued_liabilities', 'other_short-term_liabilities', 'total_current_liabilities', 'long-term_debt', 'other_long-term_liabilities', 'total_liabilities', 'total_stockholders_equity', 'total_liabilities_equity', 'current_ratio', 'quick_ratio', 'financial_leverage', 'debt_to_equity', 'days_sales_outstanding', 'days_inventory', 'payables_period', 'cash_conversion_cycle', 'receivables_turnover', 'inventory_turnover', 'fixed_assets_turnover', 'asset_turnover'],
                3, 'annual', new Date(2014, 3, 1),
                [
                    // annual financials are expected at the end of the following two months
                    [new Date(2012, 0, 1).toISOString(),631,71.15,138,21.92,98,1.92,0.15,8.2,51,16.67,165,-23,142,2.5,341,100,28.85,71.15,34.02,8.42,6.8,21.92,0.27,22.19,31.16,15.58,0.56,8.71,1.37,12.03,12.03,undefined,13.69,7.91,14.91,21.34,14.34,-0.17,12.29,undefined,13.88,2.06,13.7,undefined,12.94,0.7,11.58,undefined,33.67,30.38,3.69,22.43,1.44,40.12,10.3,undefined,1.8,52.22,5.82,39.1,2.86,100,undefined,undefined,undefined,6.24,16.85,23.09,undefined,3.93,27.02,72.98,100,2.26,2.18,1.37,undefined,64.8,undefined,undefined,undefined,5.63,undefined,9.69,0.56],
                    [new Date(2013, 0, 1).toISOString(),658,70.32,151,22.89,108,2.2,0.53,25,49,15.59,146,-30,116,2.36,217,100,29.68,70.32,33.08,7.81,6.55,22.89,0.45,23.34,34.42,16.42,0.59,9.76,1.44,13.67,13.67,undefined,4.26,11.18,8.63,19.63,8.85,6.33,5.14,undefined,9.88,9.44,7.89,73.16,14.58,9.84,7.53,undefined,-11.5,-18.14,4.56,17.61,1.07,30.85,12.34,undefined,2.36,45.55,8.06,42,4.39,100,undefined,undefined,undefined,6.46,18.24,24.7,undefined,5.67,30.37,69.63,100,1.84,1.75,1.44,undefined,63.12,undefined,undefined,undefined,5.78,undefined,8.65,0.59],
                    [new Date(2014, 0, 1).toISOString(),698,61.13,171,24.44,124,2.66,0.38,18.6,46,16.84,187,-34,153,3.22,167,100,38.87,61.13,30.14,undefined,6.54,24.44,1.05,25.49,31.48,17.69,0.67,11.92,1.49,17.45,17.45,undefined,6.07,7.93,6.8,17.48,13.26,12.13,4.17,undefined,14.3,12.67,5.95, undefined, 20.91, 16.09, 7.19, undefined, 27.85,32.01,4.81,21.92,1.24,28.97,11.46,undefined,2.94,43.36,10.19,41.76,4.7,100,undefined,undefined,undefined,6.93,20.27,27.2,undefined,5.83,33.03,66.97,100,1.59,1.49,1.49,undefined,59.72,undefined,undefined,undefined,6.11,undefined,7.39,0.67]
                ]
            ]
        ], loadQuotes);
        these("should return year over year", [
            ['XNGS', 'MORN', ['asof', 'PCO(1,earnings_per_share)'],
                1, 'annual', new Date(2013, 3, 1),
                [
                    // annual financials are expected at the end of the following two months
                    [new Date(2013, 0, 1).toISOString(),14.583333333333346]
                ]
            ]
        ], loadQuotes);
        these("should find BRK/A yahoo symbol", [
            ['XNYS', 'BRK/A', ['asof', 'open', 'high', 'low', 'close'],
                1, 'd1', new Date(2014, 1, 1),
                [
                    [new Date(2014, 0, 31, 16, 0, 0).toISOString(), 168017.00,    169625.00,    167638.00,    169511.00]
                ]
            ]
        ], loadQuotes);
        these("should find C^K yahoo symbol", [
            ['XNYS', 'C^K', ['asof', 'open', 'high', 'low', 'close'],
                1, 'd1', new Date(2014, 1, 1),
                [
                    [new Date(2014, 0, 31, 16, 0, 0).toISOString(), 25.72,25.75,25.65,25.70]
                ]
            ]
        ], loadQuotes);
        these("should find C^K morningstar symbol", [
            ['XNYS', 'C^K', ['asof', 'revenue_mil'],
                1, 'annual', new Date(2014, 3, 1),
                [
                    [new Date(2014, 0, 1).toISOString(), 76366]
                ]
            ]
        ], loadQuotes);
        these("should find ADK^A morningstar symbol", [
            ['XASE', 'ADK^A', ['asof', 'revenue_mil'],
                1, 'annual', new Date(2014, 3, 1),
                [
                    [new Date(2014, 0, 1).toISOString(), 223]
                ]
            ]
        ], loadQuotes);
        these("should find AA^ morningstar symbol", [
            ['XASE', 'AA^', ['asof', 'revenue_mil'],
                1, 'annual', new Date(2014, 2, 1),
                [
                    [new Date(2014, 0, 1).toISOString(), 23032]
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
                {
                    watch:[{
                        indicator: {
                            expression: 'volume',
                            interval: {value: 'd1'}
                        },
                        lower: 415800
                    }]
                },
                new Date(2014, 0, 13),new Date(2014, 0, 14),
                [{symbol: 'XNGS:YHOO', d1: {volume: 16047200}}]
            ]
        ], signalsCheck);
        it("should have non-empty values for BB F-Score", function(done){
            screener.signals([{
                exchange: getExchange("Toronto Stock Exchange"),
                includes:[getExchange("Toronto Stock Exchange").iri + "/BB"]
            }],{
                watch:[{
                    indicator:{
                        expression:"F-Score()",
                        interval: {value: 'annual'}
                    }
                }]
            },new Date(2015, 0, 1),new Date(2015, 3, 4)).then(function(result){
                expect(result).not.toEqual([]);
                expect(result[0].annual['F-Score()']).not.toBeUndefined();
            }).then(done, unexpected(done));
        });
    });

    describe("MMM", function(){
        describe("signals", function(){
            it("hold change", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
                }],{
                    watch:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        upper: "135.00"
                    }],
                    hold:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        difference: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        percent: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        upper: "4"
                    }]
                }, new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'watch',
                        price: 133.83
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'stop',
                        price: 140.93
                    }));
                }).then(done, unexpected(done));
            });
            it("hold", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
                }],{
                    watch:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        upper: "135.00"
                    }],
                    hold:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        difference: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        percent: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        upper: "4"
                    }]
                }, new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result.length).toEqual(9);
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'watch',
                        price: 133.83
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'hold',
                        price: 137.60
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'stop',
                        price: 140.93
                    }));
                }).then(done, unexpected(done));
            });
            it("multiple signals", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
                }],{
                    watch:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        lower: "140.00"
                    }],
                    hold:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        lower: "140.00"
                    }]
                }, new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result.length).toEqual(11);
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'watch',
                        price: 140.93
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'stop',
                        price: 138.95
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'watch',
                        price: 145.05
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'hold',
                        price: 148.59
                    }));
                }).then(done, unexpected(done));
            });
            it("watch change", function(done){
                screener.signals([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
                }],{
                    watch:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        difference: {
                            expression: "close",
                            interval: {value: 'd5'}
                        },
                        percent: {
                            expression: "close",
                            interval: {value: 'd5'}
                        },
                        upper: "-4"
                    }],
                    hold:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        difference: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        percent: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        upper: "4",
                        lower: "-4"
                    }]
                }, new Date('2014-10-01'),new Date('2014-11-01')).then(function(result){
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'watch',
                        price: 133.83
                    }));
                    expect(result).toContain(jasmine.objectContaining({
                        signal: 'stop',
                        price: 140.93
                    }));
                }).then(done, unexpected(done));
            });
        });
        describe("screen", function(){
            it("d1 close", function(done){
                screener.screen([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
                }],{
                    watch:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        lower: "140.00",
                        upper: "145.00"
                    }],
                    hold:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        },
                        lower: "135.00",
                        upper: "150.00"
                    }]
                }, new Date('2014-10-10'),new Date('2014-11-01')).then(function(result){
                    expect(result.length).toEqual(1);
                    expect(result[0].performance.length).toBe(1);
                    expect(result[0].watch.price).toBeCloseTo(140.93,2);
                    expect(result[0].price).toBeCloseTo(151.06,2);
                    expect(result[0].performance[0]).toBeCloseTo(7,0);
                    expect(result[0].growth).toBeCloseTo(7,0);
                    expect(result[0].exposure).toBeCloseTo(27,0);
                    expect(result[0].duration).toBeCloseTo(1/12,0);
                }).then(done, unexpected(done));
            });
            it("nothing", function(done){
                screener.screen([{
                    exchange: getExchange("New York Stock Exchange"),
                    includes:[getExchange("New York Stock Exchange").iri + "/MMM"]
                }],{
                    watch:[{
                        indicator: {
                            expression: "close",
                            interval: {value: 'd1'}
                        }
                    }]
                }, new Date('2014-10-10'),new Date('2014-10-11')).then(function(result){
                    expect(result.length).toEqual(1);
                    expect(result[0].performance.length).toBe(1);
                }).then(done, unexpected(done));
            });
        });
    });
});
