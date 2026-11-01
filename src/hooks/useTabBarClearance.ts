// The tab navigator reserves its own height and bottom safe area. Screens
// only need ordinary scroll padding, rather than duplicating bar geometry.
export function useTabBarClearance(extra = 24): number {
  return extra
}
