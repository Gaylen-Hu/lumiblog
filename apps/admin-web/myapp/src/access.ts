/**
 * @see https://umijs.org/docs/max/access#access
 * */
export default function access(
  initialState: { currentUser?: API.CurrentUser } | undefined,
) {
  const { currentUser } = initialState ?? {};
  return {
    canAdmin: currentUser?.role === 'admin',
    canEditor: currentUser?.role === 'admin' || currentUser?.role === 'editor',
  };
}
