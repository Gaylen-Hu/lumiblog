/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        layout: false,
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        component: '404',
        path: '/user/*',
      },
    ],
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    icon: 'dashboard',
    component: './Welcome',
  },
  {
    path: '/content',
    name: 'content',
    icon: 'fileText',
    routes: [
      {
        path: '/content',
        redirect: '/content/tags',
      },
      {
        name: 'tags',
        icon: 'tags',
        path: '/content/tags',
        component: './content/tags',
      },
      // TODO: 后续添加
      // {
      //   name: 'categories',
      //   icon: 'folder',
      //   path: '/content/categories',
      //   component: './content/categories',
      // },
      // {
      //   name: 'articles',
      //   icon: 'read',
      //   path: '/content/articles',
      //   component: './content/articles',
      // },
    ],
  },
  {
    path: '/account',
    name: 'account',
    icon: 'user',
    routes: [
      {
        path: '/account',
        redirect: '/account/settings',
      },
      {
        name: 'settings',
        icon: 'setting',
        path: '/account/settings',
        component: './account/settings',
      },
    ],
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    component: '404',
    path: '/*',
  },
];
