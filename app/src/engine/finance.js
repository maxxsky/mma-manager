// Shared monthly financial calculations — used by App, Dashboard, Finance
import { TRAINING } from "./data.js";
import { computeMonthlyIncome, computeMonthlyExpense, FACILITY_MAINT_RATE } from "./economy.js";

export function monthlyBurn(g) {
  return computeMonthlyExpense(g).total;
}

export function monthlyIn(g) {
  return computeMonthlyIncome(g).total;
}
