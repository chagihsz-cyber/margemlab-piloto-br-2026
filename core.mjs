// MargemLab: simulador, sem credenciais nem acesso a marketplaces.
const round2 = value => Math.round((value + Number.EPSILON) * 100) / 100;
const valid = n => Number.isFinite(n) && n >= 0;
export function feesFor(channel, price, customPercent = 0, customFixed = 0) {
  if (channel === "tiktok") return price < 50
    ? { percentage: 10, fixed: 4, description: "TikTok Shop: faixa abaixo de R$ 50" }
    : { percentage: 6, fixed: 6, description: "TikTok Shop: faixa a partir de R$ 50" };
  return { percentage: customPercent, fixed: customFixed,
    description: channel === "meli" ? "Mercado Livre: taxas manuais por anúncio" : "Tarifas personalizadas" };
}
export function calculate(input) {
  const { price, productCost, packaging, sellerShipping, otherFixed,
    commission, fixedFee, taxes, ads, targetMargin, channel = "manual" } = input;
  const amounts = [price, productCost, packaging, sellerShipping, otherFixed,
    commission, fixedFee, taxes, ads, targetMargin];
  if (!amounts.every(valid)) throw new Error("Use somente valores não negativos e finitos.");
  if ([commission, taxes, ads, targetMargin].some(n => n >= 100))
    throw new Error("As porcentagens devem ser menores que 100%.");
  const fees = feesFor(channel, price, commission, fixedFee);
  const variablePct = fees.percentage + taxes + ads;
  if (variablePct >= 100) throw new Error("A soma das taxas percentuais deve ser menor que 100%.");
  const fixedCosts = productCost + packaging + sellerShipping + otherFixed + fees.fixed;
  const variableFees = price * variablePct / 100;
  const profit = price - variableFees - fixedCosts;
  return { fees, price: round2(price), profit: round2(profit),
    margin: price ? round2(100 * profit / price) : 0,
    netBeforeCosts: round2(price - variableFees - fees.fixed),
    variableFees: round2(variableFees), totalCost: round2(variableFees + fixedCosts),
    breakEven: minimumPrice(input, 0), suggested: minimumPrice(input, targetMargin) };
}
export function minimumPrice(input, margin = 0) {
  const { productCost, packaging, sellerShipping, otherFixed, commission,
    fixedFee, taxes, ads, channel = "manual" } = input;
  const basic = productCost + packaging + sellerShipping + otherFixed;
  const options = channel === "tiktok"
    ? [{ min: 0, max: 50, percentage: 10, fixed: 4 },
       { min: 50, max: Infinity, percentage: 6, fixed: 6 }]
    : [{ min: 0, max: Infinity, percentage: commission, fixed: fixedFee }];
  const candidates = [];
  for (const option of options) {
    const remaining = 1 - (option.percentage + taxes + ads + margin) / 100;
    if (remaining <= 0) continue;
    const candidate = Math.ceil(Math.max(option.min, (basic + option.fixed) / remaining) * 100 - 1e-8) / 100;
    if (candidate < option.max) candidates.push(candidate);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
