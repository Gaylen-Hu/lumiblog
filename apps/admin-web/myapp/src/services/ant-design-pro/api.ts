// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/** 获取当前的用户 GET /api/users/me */
export async function currentUser(options?: { [key: string]: any }) {
  return request<API.CurrentUser>('/api/users/me', {
    method: 'GET',
    ...(options || {}),
  }).then((user) => ({ data: user }));
}

/** 退出登录 */
export async function outLogin(_options?: { [key: string]: any }) {
  localStorage.removeItem('access_token');
  return { success: true };
}

/** 登录接口 POST /api/auth/login */
export async function login(body: API.LoginParams, options?: { [key: string]: any }) {
  return request<API.LoginResult>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      email: body.username || body.email,
      password: body.password,
    },
    ...(options || {}),
  });
}
