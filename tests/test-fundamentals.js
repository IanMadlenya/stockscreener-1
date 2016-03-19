// test-fundamentals.js
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
            ['XNYS', 'BR', ['asof', 'FQSCORE()'],
                1, 'quarter', new Date('2015-09-01'),
                [
                    [new Date('Wed Jul 01 2015 00:00:00 GMT-0400 (EDT)').toISOString(), 7]
                ]
            ],
            ['XNYS', 'MYE', ['asof', 'FQSCORE()'],
                1, 'quarter', new Date('2015-09-01'),
                [
                    [new Date('Wed Jul 01 2015 00:00:00 GMT-0400 (EDT)').toISOString(), 9]
                ]
            ]
        ], loadQuotes);
        these("should return quarter", [
            ['XNGS', 'MORN', ['asof', 'revenue'],
                1, 'quarter', new Date(2015, 11, 1),
                [
                    [new Date(2015,9,1).toISOString(), 195300000]
                ]
            ]
        ], loadQuotes);
        these("should return annually", [
            ['XNGS', 'MORN', [
                    'asof',
                    'revenue_mil',
                    'gross_margin',
                    'operating_income_mil',
                    'operating_margin',
                    'net_income_mil',
                    'earnings_per_share',
                    'dividends',
                    'payout_ratio',
                    'shares_mil',
                    'book_value_per_share',
                    'operating_cash_flow_mil',
                    'cap_spending_mil',
                    'free_cash_flow_mil',
                    'free_cash_flow_per_share',
                    'working_capital_mil',
                    'revenue',
                    'cogs',
                    'gross_margin',
                    'sg&a',
                    'r&d',
                    'other',
                    'operating_margin',
                    'net_int_inc_other',
                    'ebt_margin',
                    'tax_rate',
                    'net_margin',
                    'asset_turnover',
                    'return_on_assets',
                    'financial_leverage',
                    'return_on_equity',
                    'return_on_invested_capital',
                    'interest_coverage',
                    'year_over_year_revenue',
                    '3-year_average_revenue',
                    '5-year_average_revenue',
                    '10-year_average_revenue',
                    'year_over_year_operating_income',
                    '3-year_average_operating_income',
                    '5-year_average_operating_income',
                    '10-year_average_operating_income',
                    'year_over_year_net_income',
                    '3-year_average_net_income',
                    '5-year_average_net_income',
                    '10-year_average_net_income',
                    'year_over_year_eps',
                    '3-year_average_eps',
                    '5-year_average_eps',
                    '10-year_average_eps',
                    'operating_cash_flow_growth_yoy',
                    'free_cash_flow_growth_yoy',
                    'cap_ex_as_a_of_sales',
                    'free_cash_flow_to_sales',
                    'free_cash_flow_to_net_income',
                    'cash_short-term_investments',
                    'accounts_receivable',
                    'inventory',
                    'other_current_assets',
                    'total_current_assets',
                    'net_pp&e',
                    'intangibles',
                    'other_long-term_assets',
                    'total_assets',
                    'accounts_payable',
                    'short-term_debt',
                    'taxes_payable',
                    'accrued_liabilities',
                    'other_short-term_liabilities',
                    'total_current_liabilities',
                    'long-term_debt',
                    'other_long-term_liabilities',
                    'total_liabilities',
                    'total_stockholders_equity',
                    'total_liabilities_equity',
                    'current_ratio',
                    'quick_ratio',
                    'financial_leverage',
                    'debt_to_equity',
                    'days_sales_outstanding',
                    'days_inventory',
                    'payables_period',
                    'cash_conversion_cycle',
                    'receivables_turnover',
                    'inventory_turnover',
                    'fixed_assets_turnover',
                    'asset_turnover'
                ],
                3, 'annual', new Date(2014, 3, 1),
                [
                    // annual financials are expected at the end of the following two months
                    [
                        new Date(2012, 0, 1).toISOString(),
                        631,
                        71.15,
                        138,
                        21.92,
                        98,
                        1.92,
                        0.15,
                        8.2,
                        51,
                        16.67,
                        165,
                        -23,
                        142,
                        2.5,
                        341,
                        100,
                        28.85,
                        71.15,
                        34.02,
                        8.42,
                        6.8,
                        21.92,
                        0.27,
                        22.19,
                        31.16,
                        15.58,
                        0.56,
                        8.71,
                        1.37,
                        12.03,
                        11.83,
                        107.32,
                        13.69,
                        7.91,
                        14.91,
                        21.34,
                        14.34,
                        -0.17,
                        12.29,
                        undefined,
                        13.88,
                        2.06,
                        13.7,
                        undefined,
                        12.94,
                        0.7,
                        11.58,
                        undefined,
                        33.67,
                        30.38,
                        3.69,
                        22.43,
                        1.44,
                        40.12,
                        10.3,
                        undefined,
                        1.8,
                        52.22,
                        5.82,
                        39.1,
                        2.86,
                        100,
                        undefined,
                        undefined,
                        undefined,
                        6.24,
                        16.85,
                        23.09,
                        undefined,
                        3.93,
                        27.02,
                        72.98,
                        100,
                        2.26,
                        2.18,
                        1.37,
                        undefined,
                        64.8,
                        undefined,
                        undefined,
                        undefined,
                        5.63,
                        undefined,
                        9.69,
                        0.56
                    ], [
                        new Date(2013, 0, 1).toISOString(),
                        658,
                        70.32,
                        151,
                        22.89,
                        108,
                        2.2,
                        0.53,
                        25,
                        49,
                        15.59,
                        146,
                        -30,
                        116,
                        2.36,
                        217,
                        100,
                        29.68,
                        70.32,
                        33.08,
                        7.81,
                        6.55,
                        22.89,
                        0.45,
                        23.34,
                        34.42,
                        16.42,
                        0.59,
                        9.76,
                        1.44,
                        13.67,
                        13.25,
                        494.97,
                        4.26,
                        11.18,
                        8.63,
                        19.63,
                        8.85,
                        6.33,
                        5.14,
                        undefined,
                        9.88,
                        9.44,
                        7.89,
                        73.16,
                        14.58,
                        9.84,
                        7.53,
                        undefined,
                        -11.5,
                        -18.14,
                        4.56,
                        17.61,
                        1.07,
                        30.85,
                        12.34,
                        undefined,
                        2.36,
                        45.55,
                        8.06,
                        42,
                        4.39,
                        100,
                        undefined,
                        undefined,
                        undefined,
                        6.46,
                        18.24,
                        24.7,
                        undefined,
                        5.67,
                        30.37,
                        69.63,
                        100,
                        1.84,
                        1.75,
                        1.44,
                        undefined,
                        63.12,
                        undefined,
                        undefined,
                        undefined,
                        5.78,
                        undefined,
                        8.65,
                        0.59
                    ],[
                        new Date(2014, 0, 1).toISOString(),
                        698,
                        61.13,
                        171,
                        24.44,
                        124,
                        2.66,
                        0.38,
                        18.6,
                        46,
                        16.84,
                        187,
                        -34,
                        153,
                        3.22,
                        167,
                        100,
                        38.87,
                        61.13,
                        30.14,
                        undefined,
                        6.54,
                        24.44,
                        1.05,
                        25.49,
                        31.48,
                        17.69,
                        0.67,
                        11.92,
                        1.49,
                        17.45,
                        17.19,
                        781.75,
                        6.07,
                        7.93,
                        6.8,
                        17.48,
                        13.26,
                        12.13,
                        4.17,
                        undefined,
                        14.3,
                        12.67,
                        5.95,
                         undefined,
                         20.91,
                         16.09,
                         7.19,
                         undefined,
                         27.85,
                        32.01,
                        4.81,
                        21.92,
                        1.24,
                        28.97,
                        11.46,
                        undefined,
                        2.94,
                        43.36,
                        10.19,
                        41.76,
                        4.7,
                        100,
                        undefined,
                        undefined,
                        undefined,
                        6.93,
                        20.27,
                        27.2,
                        undefined,
                        5.83,
                        33.03,
                        66.97,
                        100,
                        1.59,
                        1.49,
                        1.49,
                        undefined,
                        59.72,
                        undefined,
                        undefined,
                        undefined,
                        6.11,
                        undefined,
                        7.39,
                        0.67
                    ]
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
        it("should have non-empty values for BB F-Score", function(done){
            screener.signals({
                exchange: getExchange("Toronto Stock Exchange"),
                includes:[{
                    exchange: getExchange("Toronto Stock Exchange"),
                    iri: getExchange("Toronto Stock Exchange").iri + "/BB",
                    ticker: "BB"
                }]
            },[{
                indicator:{
                    expression:"FSCORE()",
                    interval: {value: 'annual'}
                }
            }],new Date(2015, 0, 1),new Date(2015, 3, 4)).then(function(result){
                expect(result).not.toEqual([]);
                expect(result[0].watch.annual['FSCORE()']).not.toBeUndefined();
            }).then(done, unexpected(done));
        });
    });
});
