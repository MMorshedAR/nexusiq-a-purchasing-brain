export const plans = [
  { name: "Starter", price: 1000, items: ["Core inventory", "Demand forecasts", "Purchase planning", "CSV & Excel reports"] },
  { name: "Growth", price: 5000, items: ["Everything in Starter", "Supplier intelligence", "Risk & disruption analysis", "Cash-flow planning", "Team workspace"] },
  { name: "Enterprise", price: 20000, items: ["Everything in Growth", "Advanced team controls", "Priority support", "Enterprise integrations"] },
] as const;