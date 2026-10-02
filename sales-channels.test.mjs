import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, feesFor} from './core.mjs';
const input = {price:100,productCost:40,packaging:2,sellerShipping:8,
 otherFixed:0,commission:12,fixedFee:0,taxes:5,ads:0,
 targetMargin:20,paymentFee:3.2,monthlyFee:110,monthlyOrders:100,
 channel:'ifood-basic'};
test('iFood: payment fee and monthly plan are accounted per order',()=>{
 const r=calculate(input);
 assert.equal(r.monthlyShare,1.1);
 assert.equal(r.variableFees,20.2);
 assert.equal(r.profit,28.7);
 assert.ok(r.suggested>r.breakEven);
});
test('iFood: direct payment removes optional processing fee',()=>{
 const direct=calculate({...input,paymentFee:0});
 assert.equal(direct.profit,31.9);
});
test('99Food: editable commission and processing fee',()=>{
 const r=calculate({...input,channel:'99food-99',commission:8.9,
  monthlyFee:0,paymentFee:3.2});
 assert.equal(r.profit,32.9); // Inclui os 5% de impostos da hipótese.
});
test('Shopee: charges use exact seller-entered fees',()=>{
 const r=calculate({...input,channel:'shopee',commission:14,
  fixedFee:4,monthlyFee:0,paymentFee:0});
 assert.equal(r.profit,27);
 assert.equal(feesFor('shopee',100,14,4).percentage,14);
});
test('monthly order count must be valid for nonzero monthly fee',()=>{
 assert.throws(()=>calculate({...input,monthlyOrders:0}),/pedidos mensais/);
});
test('zero-fee plans keep existing old scenarios compatible',()=>{
 const old={...input,monthlyFee:undefined,monthlyOrders:undefined,
  paymentFee:undefined,channel:'manual'};
 assert.ok(Number.isFinite(calculate(old).profit));
});
