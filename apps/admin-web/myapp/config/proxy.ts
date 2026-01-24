/**
 * @name 代理的配置
 * @see 在生产环境 代理是无法生效的，所以这里没有生产环境的配置
 * -------------------------------
 * The agent cannot take effect in the production environment
 * so there is no configuration of the production environment
 * For details, please see
 * https://pro.ant.design/docs/deploy
 *
 * @doc https://umijs.org/docs/guides/proxy
 */

// 从环境变量获取 API 地址，默认为本地后端
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export default {
  dev: {
    // localhost:8000/api/** -> API_BASE_URL/v1/**
    '/api/': {
      target: API_BASE_URL,
      changeOrigin: true,
      pathRewrite: { '^/api': '/v1' },
    },
  },
  /**
   * @name 详细的代理配置
   * @doc https://github.com/chimurai/http-proxy-middleware
   */
  test: {
    // localhost:8000/api/** -> https://preview.pro.ant.design/v1/**
    '/api/': {
      target: 'https://proapi.azurewebsites.net',
      changeOrigin: true,
      pathRewrite: { '^/api': '/v1' },
    },
  },
  pre: {
    '/api/': {
      target: 'your pre url',
      changeOrigin: true,
      pathRewrite: { '^/api': '/v1' },
    },
  },
};
