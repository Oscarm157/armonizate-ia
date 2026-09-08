/**
 * Avatares de marca, fuente única compartida (tabla de usuarios, OwnerChip de
 * leads/board, cabecera de perfil). En vez del arcoíris saturado anterior, una
 * rampa sobria de neutrales tintados derivada del sistema: gris de superficie,
 * mint de acento y navy de marca, todos a baja saturación. El color se fija por
 * hash del seed (id de persona), así el mismo usuario conserva su tono en cada
 * vista del panel.
 */
const AVATAR_TINTS = [
  "bg-[var(--crm-surface-3)] text-[var(--crm-ink-soft)]",
  "bg-[var(--crm-accent-tint-2)] text-[var(--crm-accent-strong)]",
  "bg-[rgba(40,64,104,0.32)] text-[#a9c0e0]",
  "bg-[rgba(130,139,155,0.16)] text-[var(--crm-ink-soft)]",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function avatarClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}
