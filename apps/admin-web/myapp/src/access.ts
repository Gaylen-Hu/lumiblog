/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  const role = currentUser?.role?.toLowerCase();
  return {
    canAdmin: role === 'admin',
    canEditor: role === 'admin' || role === 'editor',
  };
}
