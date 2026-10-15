/**
 * Role-based access helpers — the single source of truth for the sidebar filter
 * and the route guard. Reads the shape the backend returns on login / auth/me:
 *   user.is_superadmin : boolean
 *   user.roles         : string[]  (role keys, e.g. ["SUPERADMIN"])
 *   user.primary_role  : string
 *   user.permissions   : string[]  (granted drawer keys, e.g. ["doctors"])
 */

/**
 * @param {object|null} user
 * @returns {boolean}
 */
export const isSuperadmin = (user) =>
  Boolean(user?.is_superadmin) ||
  user?.primary_role === "SUPERADMIN" ||
  (Array.isArray(user?.roles) && user.roles.includes("SUPERADMIN"));

/**
 * Whether the user can access a given drawer. Superadmin bypasses.
 * @param {object|null} user
 * @param {string} permissionKey
 * @returns {boolean}
 */
export const hasDrawerAccess = (user, permissionKey) =>
  isSuperadmin(user) ||
  (Array.isArray(user?.permissions) &&
    user.permissions.includes(permissionKey));

/**
 * Whether a sidebar menu item should be visible to the user.
 * @param {object|null} user
 * @param {object} item - a menuItems entry
 * @returns {boolean}
 */
export const canSeeMenuItem = (user, item) => {
  const superadmin = isSuperadmin(user);

  // Hard-hidden by a feature flag (never shown, route blocked).
  if (item.hidden) return false;

  if (item.superadminOnly && !superadmin) return false;
  if (item.hideForSuperadmin && superadmin) return false;

  // Ungated items (dashboard, settings, request access) are visible to
  // everyone allowed above.
  if (!item.requiredPermission) return true;

  return hasDrawerAccess(user, item.requiredPermission);
};

/**
 * Whether the user may view the page at `pathname`. Routes not owned by any menu
 * item are allowed (nothing to gate); a matched-but-hidden item is denied.
 * @param {object|null} user
 * @param {string} pathname
 * @param {Array} menu - menuItems from Sidebar.jsx
 * @returns {boolean}
 */
export const canAccessRoute = (user, pathname, menu) => {
  // Can't evaluate without a user (e.g. pre-login) — let API/auth handle it.
  if (!user) return true;

  // Longest matching route wins, so "/dashboard" doesn't shadow every drawer.
  const item = menu
    .filter(
      (entry) =>
        entry.href === pathname || pathname.startsWith(`${entry.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!item) return true;

  // Shown in the sidebar as "coming soon", but not open yet.
  if (item.comingSoon) return false;

  return canSeeMenuItem(user, item);
};
