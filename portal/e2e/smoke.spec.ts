import { test, expect } from "@playwright/test";

test("login renderiza y se captura", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /entrar|iniciar/i })).toBeVisible();
  await page.screenshot({ path: "e2e/__screenshots__/login.png", fullPage: true });
});

test("ruta protegida redirige a login sin sesión", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
