import { NextRequest, NextResponse } from "next/server";
import { listOptionGroups, saveOptionGroup, deleteOptionGroup } from "@/lib/domain/catalog-store";
import { optionGroupSchema } from "@/lib/server/schemas";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { ROLES, withPos } from "@/lib/server/pos-context";

function toOptionGroup(row: { groupKey: string; name: string; required: boolean; multi: boolean; choices: Prisma.JsonValue }) {
  return { id: row.groupKey, name: row.name, required: row.required, multi: row.multi, choices: row.choices };
}

async function listPersistedOptionGroups(branchId: string) {
  const rows = await prisma.posOptionGroup.findMany({ where: { branchId }, orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
  if (rows.length > 0) return rows.map(toOptionGroup);

  // Seed each branch once with the existing standard library so the POS keeps the same defaults.
  const defaults = listOptionGroups();
  await prisma.$transaction(defaults.map((group) => prisma.posOptionGroup.upsert({
    where: { branchId_groupKey: { branchId, groupKey: group.id } },
    update: {},
    create: { branchId, groupKey: group.id, name: group.name, required: group.required ?? false, multi: group.multi ?? false, choices: group.choices as Prisma.InputJsonValue },
  })));
  const seeded = await prisma.posOptionGroup.findMany({ where: { branchId }, orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
  return seeded.map(toOptionGroup);
}

/** GET /api/catalog/option-groups — lists reusable option groups in the library. */
export async function GET(request: NextRequest) {
  return withPos(request, ["Owner", "Manager", "Inventory", "Cashier"], async (context) => {
    return NextResponse.json({ data: context.mode === "database" ? await listPersistedOptionGroups(context.branchId) : listOptionGroups() });
  });
}

/** POST /api/catalog/option-groups — creates or updates a reusable option group in the library. */
export async function POST(request: NextRequest) {
  return withPos(request, ROLES.catalog, async (context) => {
    const body = await request.json().catch(() => ({}));
    const parsed = optionGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }
    if (context.mode === "database") {
      const group = parsed.data;
      const saved = await prisma.posOptionGroup.upsert({
        where: { branchId_groupKey: { branchId: context.branchId, groupKey: group.id } },
        update: { name: group.name, required: group.required ?? false, multi: group.multi ?? false, choices: group.choices as Prisma.InputJsonValue },
        create: { branchId: context.branchId, groupKey: group.id, name: group.name, required: group.required ?? false, multi: group.multi ?? false, choices: group.choices as Prisma.InputJsonValue },
      });
      return NextResponse.json({ data: toOptionGroup(saved) }, { status: 201 });
    }
    const saved = saveOptionGroup(parsed.data);
    return NextResponse.json({ data: saved }, { status: 201 });
  });
}

/** DELETE /api/catalog/option-groups?id=... — deletes an option group from the library. */
export async function DELETE(request: NextRequest) {
  return withPos(request, ROLES.catalog, async (context) => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    const success = context.mode === "database"
      ? (await prisma.posOptionGroup.deleteMany({ where: { branchId: context.branchId, groupKey: id } })).count > 0
      : deleteOptionGroup(id);
    return NextResponse.json({ success });
  });
}
