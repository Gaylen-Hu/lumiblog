// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    id?: string;
    email?: string;
    name?: string;
    role?: 'admin' | 'editor' | 'viewer';
    avatar?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };

  type LoginResult = {
    access_token?: string;
    status?: string;
  };

  type LoginParams = {
    username?: string;
    email?: string;
    password?: string;
    autoLogin?: boolean;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type ErrorResponse = {
    errorCode: string;
    errorMessage?: string;
    success?: boolean;
  };
}
