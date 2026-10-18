import { NextRequest, NextResponse } from "next/server";
import { listOptionGroups, saveOptionGroup, deleteOptionGroup } from "@/lib/domain/catalog-store";
import { optionGroupSchema } from "@/lib/server/schemas";
import { ROLES, withPos } from "@/lib/server/pos-context";

/** GET /api/catalog/option-groups — lists reusable option groups in the library. */
export async function GET(request: NextRequest) {
  return withPos(request, ["Owner", "Manager", "Inventory", "Cashier"], async () => {
    return NextResponse.json({ data: listOptionGroups() });
  });
}

/** POST /api/catalog/option-groups — creates or updates a reusable option group in the library. */
export async function POST(request: NextRequest) {
  return withPos(request, ROLES.catalog, async () => {
    const body = await request.json().catch(() => ({}));
    const parsed = optionGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }
    const saved = saveOptionGroup(parsed.data);
    return NextResponse.json({ data: saved }, { status: 201 });
  });
}

/** DELETE /api/catalog/option-groups?id=... — deletes an option group from the library. */
export async function DELETE(request: NextRequest) {
  return withPos(request, ROLES.catalog, async () => {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    const success = deleteOptionGroup(id);
    return NextResponse.json({ success });
  });
}
