import type { Prisma } from "@prisma/client";

export type QuoteRequestWithRelations = Prisma.QuoteRequestGetPayload<{
  include: {
    service: { select: { id: true; name: true } };
    proposal: { select: { publicToken: true } };
    statusHistory: {
      select: {
        id: true;
        fromStatus: true;
        toStatus: true;
        actor: true;
        note: true;
        createdAt: true;
      };
    };
    internalNotes: {
      select: {
        id: true;
        content: true;
        createdAt: true;
        author: { select: { name: true; email: true } };
      };
    };
  };
}>;
