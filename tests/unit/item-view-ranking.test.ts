import { describe, expect, it } from "vitest";

import { mergeItemViewRanking } from "@/lib/dashboard";

describe("mergeItemViewRanking", () => {
  it("preserva a ordem do ranking e junta os nomes", () => {
    const groups = [
      { serviceId: "b", _sum: { count: 10 } },
      { serviceId: "a", _sum: { count: 4 } },
    ];
    const names = [
      { id: "a", name: "Item A" },
      { id: "b", name: "Item B" },
    ];
    expect(mergeItemViewRanking(groups, names)).toEqual([
      { serviceId: "b", name: "Item B", count: 10 },
      { serviceId: "a", name: "Item A", count: 4 },
    ]);
  });

  it("descarta grupos sem nome correspondente (item removido)", () => {
    const groups = [
      { serviceId: "a", _sum: { count: 3 } },
      { serviceId: "sumiu", _sum: { count: 99 } },
    ];
    const names = [{ id: "a", name: "Item A" }];
    expect(mergeItemViewRanking(groups, names)).toEqual([
      { serviceId: "a", name: "Item A", count: 3 },
    ]);
  });

  it("trata _sum.count nulo como 0", () => {
    const groups = [{ serviceId: "a", _sum: { count: null } }];
    const names = [{ id: "a", name: "Item A" }];
    expect(mergeItemViewRanking(groups, names)).toEqual([
      { serviceId: "a", name: "Item A", count: 0 },
    ]);
  });
});
