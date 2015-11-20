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

describe("Validation", function(){
    these("should validate day field", [
        "open", "low", "high", "close", "asof", "adj_close"
    ], isValid('day'));

    these("should validate week field", [
        "open", "low", "high", "close", "asof", "adj_close"
    ], isValid('week'));

    these("should validate m1 field", [
        "open", "low", "high", "close", "asof", "total_volume"
    ], isValid('m1'));

    these("should validate m5 field", [
        "open", "low", "high", "close", "asof", "total_volume"
    ], isValid('m5'));

    these("should validate m10 field", [
        "open", "low", "high", "close", "asof", "total_volume"
    ], isValid('m10'));

    these("should validate m30 field", [
        "open", "low", "high", "close", "asof", "total_volume"
    ], isValid('m30'));

    these("should validate m60 field", [
        "open", "low", "high", "close", "asof", "total_volume"
    ], isValid('m60'));

    these("should validate m120 field", [
        "open", "low", "high", "close", "asof", "total_volume"
    ], isValid('m120'));

    these("should validate expression", [
        "asof", "SMA(20,close)", "EMA(21,close)"
    ], isValid('day'));

    these("should not validate expression", [
        "()", "foo()", "date()", "SMA()", "SMA(20)", "EMA()", "EMA(21)", "Adj Close"
    ], isInvalid('day'));

    these("should not validate expression in wrong period", [
        "F-Score()", "PERCENT(total_liabilities, total_stockholders_equity)"
    ], isInvalid('day'));

    these("should validate F-Score() expression", [
        "F-Score()"
    ], isValid('annual'));

    these("should validate Percent expression", [
        "PERCENT(total_liabilities, total_stockholders_equity)"
    ], isValid('quarter'));

    these("should validate quarter field", [
        'accounts_payable_current_liabilities', 'accounts_receivable', 'accumulated_other_comprehensive_income_stockholders_equity', 'acquisitions_net', 'basic_earnings_per_share', 'basic_weighted_average_shares_outstanding', 'capital_expenditure_free_cash_flow', 'cash_and_cash_equivalents_cash', 'cash_at_beginning_of_period', 'cash_at_end_of_period', 'cash_used_in_operating_activities_cash_flows_from_operating_activities', 'common_stock_additional_paid-in_capital_stockholders_equity', 'cost_of_revenue', 'depreciation_amortization_cash_flows_from_operating_activities', 'diluted_earnings_per_share', 'diluted_weighted_average_shares_outstanding', 'dividend_paid_cash_flows_from_financing_activities', 'effect_of_exchange_rate_changes', 'free_cash_flow', 'goodwill_and_other_intangible_assets_non-current_assets', 'gross_profit', 'income_before_taxes', 'interest_expense', 'inventories', 'net_cash_provided_by_financing_activities', 'net_cash_provided_by_operating_activities', 'net_cash_used_for_investing_activities', 'net_change_in_cash', 'net_changes_in_working_capital', 'net_income', 'net_income_from_continuing_operations', 'net_investments_in_property_plant_and_equipment', 'net_property_plant_and_equipment_non-current_assets', 'non-current_liabilities', 'operating_cash_flow_free_cash_flow', 'operating_income', 'other', 'other_current_assets', 'other_current_liabilities', 'other_financing_activities_cash_flows_from_financing_activities', 'other_income', 'other_investing_activities', 'other_long-term_assets_non-current_assets', 'other_long-term_liabilities_long-term_debt', 'provision_for_income_taxes', 'purchases_of_investments', 'research_and_development_operating_expenses', 'retained_earnings_stockholders_equity', 'revenue', 'sales_general_and_administrative_operating_expenses', 'sales_maturities_of_investments', 'short-term_debt_current_liabilities', 'short-term_investments_cash', 'total_assets', 'total_cash_and_short-term_investments', 'total_current_assets', 'total_current_liabilities', 'total_liabilities', 'total_liabilities_and_stockholders_equity', 'total_non-current_assets', 'total_non-current_liabilities', 'total_operating_expenses', 'total_stockholders_equity', 'treasury_stock_stockholders_equity'
    ], isValid('quarter'));

    these("should validate annual field", [
        'revenue_mil', 'gross_margin', 'operating_income_mil', 'operating_margin', 'net_income_mil', 'earnings_per_share', 'dividends', 'payout_ratio', 'shares_mil', 'book_value_per_share', 'operating_cash_flow_mil', 'cap_spending_mil', 'free_cash_flow_mil', 'free_cash_flow_per_share', 'working_capital_mil', 'revenue', 'cogs', 'gross_margin', 'sg&a', 'r&d', 'other', 'operating_margin', 'net_int_inc_other', 'ebt_margin', 'tax_rate', 'net_margin', 'asset_turnover', 'return_on_assets', 'financial_leverage', 'return_on_equity', 'return_on_invested_capital', 'interest_coverage', 'year_over_year_revenue', '3-year_average_revenue', '5-year_average_revenue', '10-year_average_revenue', 'year_over_year_operating_income', '3-year_average_operating_income', '5-year_average_operating_income', '10-year_average_operating_income', 'year_over_year_net_income', '3-year_average_net_income', '5-year_average_net_income', '10-year_average_net_income', 'year_over_year_eps', '3-year_average_eps', '5-year_average_eps', '10-year_average_eps', 'operating_cash_flow_growth_yoy', 'free_cash_flow_growth_yoy', 'cap_ex_as_a_of_sales', 'free_cash_flow_to_sales', 'free_cash_flow_to_net_income', 'cash_short-term_investments', 'accounts_receivable', 'inventory', 'other_current_assets', 'total_current_assets', 'net_pp&e', 'intangibles', 'other_long-term_assets', 'total_assets', 'accounts_payable', 'short-term_debt', 'taxes_payable', 'accrued_liabilities', 'other_short-term_liabilities', 'total_current_liabilities', 'long-term_debt', 'other_long-term_liabilities', 'total_liabilities', 'total_stockholders_equity', 'total_liabilities_equity', 'current_ratio', 'quick_ratio', 'financial_leverage', 'debt_to_equity', 'days_sales_outstanding', 'days_inventory', 'payables_period', 'cash_conversion_cycle', 'receivables_turnover', 'inventory_turnover', 'fixed_assets_turnover', 'asset_turnover'
    ], isValid('annual'));

    these("should validate annual expression", [
        "F-Score()"
    ], isValid('annual'));
});
