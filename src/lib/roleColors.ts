/**
 * Shared role color definitions.
 *
 * Strong, fully-opaque colors used both for role badges and for coloring
 * usernames with their highest role's color.
 */

export interface SystemRoleStyle {
  label: string;
  /** Solid color used for the username and badge text/border. */
  color: string;
  /** Solid background color for the filled badge. */
  badgeBg: string;
  /** Text color rendered on top of the filled badge. */
  badgeText: string;
  priority: number;
}

export const systemRoleStyles: Record<string, SystemRoleStyle> = {
  fundador: {
    label: "FUNDADORA",
    color: "#ff2d78",
    badgeBg: "#ff2d78",
    badgeText: "#ffffff",
    priority: 1,
  },
  admin: {
    label: "Administrador(a)",
    color: "#f5a300",
    badgeBg: "#f5a300",
    badgeText: "#1a1300",
    priority: 2,
  },
  staff: {
    label: "Staff",
    color: "#2f80ff",
    badgeBg: "#2f80ff",
    badgeText: "#ffffff",
    priority: 3,
  },
  vip_diamante: {
    label: "VIP DIAMANTE",
    color: "#1bd3e6",
    badgeBg: "#0aa9bd",
    badgeText: "#04141a",
    priority: 4,
  },
  user: {
    label: "Usuário",
    color: "",
    badgeBg: "",
    badgeText: "",
    priority: 100,
  },
};

export const rolePriority = (role: string): number =>
  systemRoleStyles[role]?.priority ?? 100;

/** Returns the highest-priority known system role from a list (or undefined). */
export const getHighestSystemRole = (roles: string[]): string | undefined =>
  roles
    .filter((r) => r in systemRoleStyles && r !== "user")
    .sort((a, b) => rolePriority(a) - rolePriority(b))[0];

export interface CustomRoleLike {
  color?: string | null;
  display_order?: number | null;
}

/**
 * Determines the color that should be applied to a username, given the user's
 * system roles and custom roles. System roles take precedence by priority,
 * then custom roles by their display order. Returns undefined when the user
 * only has the default "user" role and no colored custom role.
 */
export const getNameColor = (
  systemRoles: string[] = [],
  customRoles: CustomRoleLike[] = []
): string | undefined => {
  const candidates: { color: string; priority: number }[] = [];

  for (const r of systemRoles) {
    const style = systemRoleStyles[r];
    if (style && style.color) {
      candidates.push({ color: style.color, priority: style.priority });
    }
  }

  customRoles.forEach((cr, i) => {
    if (cr?.color) {
      candidates.push({
        color: cr.color,
        priority: 50 + (cr.display_order ?? i),
      });
    }
  });

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0].color;
};
