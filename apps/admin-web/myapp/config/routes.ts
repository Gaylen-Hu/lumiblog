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
        redirect: '/content/articles',
      },
      {
        name: 'articles',
        icon: 'read',
        path: '/content/articles',
        component: './content/articles',
      },
      {
        name: 'article-create',
        path: '/content/articles/create',
        component: './content/articles/edit',
        hideInMenu: true,
      },
      {
        name: 'article-edit',
        path: '/content/articles/edit/:id',
        component: './content/articles/edit',
        hideInMenu: true,
      },
      {
        name: 'article-detail',
        path: '/content/articles/:id',
        component: './content/articles/detail',
        hideInMenu: true,
      },
      {
        name: 'tags',
        icon: 'tags',
        path: '/content/tags',
        component: './content/tags',
      },
      {
        name: 'wechat',
        icon: 'wechat',
        path: '/content/wechat',
        component: './content/wechat',
      },
      {
        name: 'categories',
        icon: 'folder',
        path: '/content/categories',
        component: './content/categories',
      },
      {
        name: 'media',
        icon: 'picture',
        path: '/content/media',
        component: './content/media',
      },
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
