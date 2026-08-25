// lib/env.ts
// Sumber tunggal env kritis yang divalidasi fail-closed (temuan L-12).
// Modul mana pun yang butuh nilai ini meng-import dari sini, sehingga guard
// tidak diduplikasi dan tidak bisa saling berbeda perilaku.

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export { JWT_SECRET };
