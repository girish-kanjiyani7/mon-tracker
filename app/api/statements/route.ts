import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  addDays,
  filterTransactionsInWindow,
  getDaysRemaining,
  getElapsedDays,
  localDateString,
  projectCycleSpend,
  resolveCycleWindow,
  summarizeStatementSpend,
  utcDateString,
  type CycleWindow,
} from "@/lib/statementCycle";

const COMPARISON_CYCLE_COUNT = 3;

type CycleSourceKind = "plaid" | "manual" | "calendar";

/**
 * Statement view for one account and cycle:
 * window boundaries, spend summary, pace projection, the cycle's
 * transactions, and same-point-in-cycle comparisons with prior cycles.
 * offset=0 is the current (open) cycle, 1 the previous statement, etc.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) {
      return NextResponse.json({ success: false, error: "accountId is required" }, { status: 400 });
    }

    const offsetParam = searchParams.get("offset") ?? "0";
    const offset = Number(offsetParam);
    if (!Number.isInteger(offset) || offset < 0) {
      return NextResponse.json({ success: false, error: "offset must be an integer >= 0" }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        item: { select: { institutionName: true } },
        statements: { orderBy: { closeDate: "asc" } },
      },
    });
    if (!account) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    const knownCloseDates = account.statements.map((s) => s.closeDate);
    const today = localDateString(new Date());
    const cycleSource = {
      closeDay: account.statementCloseDay,
      knownCloseDates,
      today,
    };

    const window = resolveCycleWindow({ ...cycleSource, offset });
    const comparisonWindows = Array.from({ length: COMPARISON_CYCLE_COUNT }, (_, i) =>
      resolveCycleWindow({ ...cycleSource, offset: offset + i + 1 })
    );

    const oldestOpenDate = comparisonWindows[COMPARISON_CYCLE_COUNT - 1].openDate;
    const transactions = await prisma.transaction.findMany({
      where: {
        accountId,
        date: { gte: new Date(oldestOpenDate), lte: new Date(window.closeDate) },
      },
      orderBy: { date: "desc" },
    });

    const windowTransactions = filterTransactionsInWindow(transactions, window);
    const spend = summarizeStatementSpend(windowTransactions);
    const elapsedDays = getElapsedDays(window, today);
    const totalDays = getElapsedDays(window, window.closeDate);
    const daysRemaining = getDaysRemaining(window, today);
    const isCurrentCycle = offset === 0;
    const projectedTotal = isCurrentCycle ? projectCycleSpend(spend.total, window, today) : spend.total;

    const previousCycles = comparisonWindows.map((comparisonWindow) => {
      const cycleTransactions = filterTransactionsInWindow(transactions, comparisonWindow);
      const total = summarizeStatementSpend(cycleTransactions).total;
      const samePointWindow: CycleWindow = {
        openDate: comparisonWindow.openDate,
        closeDate: minDate(addDays(comparisonWindow.openDate, elapsedDays - 1), comparisonWindow.closeDate),
      };
      const totalAtSamePoint = summarizeStatementSpend(
        filterTransactionsInWindow(cycleTransactions, samePointWindow)
      ).total;
      return { window: comparisonWindow, total, totalAtSamePoint };
    });

    const closedStatement = account.statements.find(
      (s) => utcDateString(s.closeDate) === window.closeDate
    );
    const sourceKind: CycleSourceKind =
      knownCloseDates.length > 0 ? "plaid" : account.statementCloseDay != null ? "manual" : "calendar";

    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
          institutionName: account.item.institutionName,
          statementCloseDay: account.statementCloseDay,
        },
        offset,
        isCurrentCycle,
        cycleSource: sourceKind,
        window,
        daysRemaining,
        elapsedDays,
        totalDays,
        spend,
        projectedTotal,
        statementBalance: closedStatement?.statementBalance ?? null,
        transactions: windowTransactions,
        previousCycles,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to build statement view", error);
    return NextResponse.json({ success: false, error: "Failed to load statement" }, { status: 500 });
  }
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}
