// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const toggleStation = vi.fn(async () => {});
const deleteStation = vi.fn(async () => {});
vi.mock("@/app/actions/admin", () => ({ toggleStation, deleteStation }));

afterEach(cleanup);

async function renderConfirm(active: boolean, scans = 12) {
  const { default: StationChangeConfirm } = await import("@/components/StationChangeConfirm");
  return render(
    <StationChangeConfirm
      station={{ id: "s1", name: "Photo Opp", active, scans }}
      impact={{ completed: 3, redeemed: 1, inProgress: 40, completesWithout: 2 }}
    />,
  );
}

describe("confirmación de cambios de estación", () => {
  it("antes de desactivar muestra a quién afecta y no aplica nada sin confirmar", async () => {
    await renderConfirm(true);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("3 personas ya completaron y seguirán completas. 1 tienen premio entregado.");
    expect(dialog.textContent).toContain("2 personas completarán el recorrido al quitarla");
    expect(toggleStation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("al activar avisa que los que van en curso la van a necesitar", async () => {
    await renderConfirm(false);
    fireEvent.click(screen.getByRole("button", { name: "Activar" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("3 personas ya completaron y seguirán completas");
    expect(dialog.textContent).toContain("40 personas que aún no completan");
    expect(dialog.querySelector('input[name="active"]')?.getAttribute("value")).toBe("1");
    expect(dialog.querySelector('input[name="confirm"]')?.getAttribute("value")).toBe("1");
  });

  it("no ofrece eliminar una estación con escaneos y explica por qué", async () => {
    await renderConfirm(true, 12);
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(screen.getByText(/No se puede eliminar: tiene escaneos/)).toBeTruthy();
  });

  it("sin escaneos sí deja eliminar, con confirmación", async () => {
    await renderConfirm(true, 0);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("No tiene escaneos");
    expect(deleteStation).not.toHaveBeenCalled();
  });
});
