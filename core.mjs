// MargemLab: simulador, sem credenciais nem acesso a marketplaces.
const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;
const valid = n => Number.isFinite(n) && n >= 0;
export function feesFor(channel, price, customPercent = 0, customFixed = 0) {
  if (channel === "tiktok") return price < 50
    ? { percentage: 10, fixed: 4, description: "TikTok Shop: faixa abaixo de R$ 50" }
    : { percentage: 6, fixed: 6, description: "TikTok Shop: faixa a partir de R$ 50" };
  const channels = {
    meli: "Mercado Livre: tarifas do anúncio informadas pelo vendedor",
    shopee: "Shopee: tarifas informadas pelo vendedor",
    'ifood-basic': "iFood Básico: confira contrato e forma de pagamento",
    'ifood-delivery': "iFood Entrega: confira contrato e forma de pagamento",
    '99food-99': "99Food Entrega: confira contrato e custos logísticos",
    '99food-own': "99Food Entrega própria: confira contrato"
  };
  return { percentage: customPercent, fixed: customFixed,
    description: channels[channel] || "Tarifas personalizadas" };
}
export function calculate(input) {
  const { price, productCost, packaging, sellerShipping, otherFixed,
    commission, fixedFee, taxes, ads, targetMargin, channel = "manual",
    paymentFee = 0, monthlyFee = 0, monthlyOrders = 1 } = input;
  const amounts = [price, productCost, packaging, sellerShipping, otherFixed,
    commission, fixedFee, taxes, ads, targetMargin, paymentFee, monthlyFee, monthlyOrders];
  if (!amounts.every(valid)) throw new Error("Use somente valores não negativos e finitos.");
  if (monthlyFee > 0 && monthlyOrders <= 0)
    throw new Error("Informe pedidos mensais maiores que zero para dividir a mensalidade.");
  if ([commission, taxes, ads, targetMargin, paymentFee].some(n => n >= 100))
    throw new Error("As porcentagens devem ser menores que 100%.");
  const fees = feesFor(channel, price, commission, fixedFee);
  const variablePct = fees.percentage + paymentFee + taxes + ads;
  if (variablePct >= 100) throw new Error("A soma das taxas percentuais deve ser menor que 100%.");
  const monthlyShare = monthlyFee > 0 ? monthlyFee / monthlyOrders : 0;
  const fixedCosts = productCost + packaging + sellerShipping + otherFixed + fees.fixed + monthlyShare;
  const variableFees = price * variablePct / 100;
  const profit = price - variableFees - fixedCosts;
  return { fees, price: round2(price), profit: round2(profit),
    margin: price ? round2(100 * profit / price) : 0,
    netBeforeCosts: round2(price - variableFees - fees.fixed),
    variableFees: round2(variableFees), monthlyShare: round2(monthlyShare),
    totalCost: round2(variableFees + fixedCosts),
    breakEven: minimumPrice(input, 0), suggested: minimumPrice(input, targetMargin) };
}
export function minimumPrice(input, margin = 0) {
  const { productCost, packaging, sellerShipping, otherFixed, commission,
    fixedFee, taxes, ads, channel = "manual", paymentFee = 0,
    monthlyFee = 0, monthlyOrders = 1 } = input;
  if (monthlyFee > 0 && monthlyOrders <= 0) return null;
  const basic = productCost + packaging + sellerShipping + otherFixed
    + (monthlyFee > 0 ? monthlyFee / monthlyOrders : 0);
  const options = channel === "tiktok"
    ? [{ min: 0, max: 50, percentage: 10, fixed: 4 },
       { min: 50, max: Infinity, percentage: 6, fixed: 6 }]
    : [{ min: 0, max: Infinity, percentage: commission, fixed: fixedFee }];
  const candidates = [];
  for (const option of options) {
    const remaining = 1 - (option.percentage + paymentFee + taxes + ads + margin) / 100;
    if (remaining <= 0) continue;
    const candidate = Math.ceil(Math.max(option.min, (basic + option.fixed) / remaining) * 100 - 1e-8) / 100;
    if (candidate < option.max) candidates.push(candidate);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
