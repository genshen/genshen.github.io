/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  title: 'Blog',
  tagline: '⚡️ Painless static site generator',
  organizationName: 'facebook',
  projectName: 'docusaurus',
  baseUrl: '/',
  url: 'https://docusaurus-2.netlify.com',
  headerIcon: 'img/docusaurus.svg',
  favicon: 'img/docusaurus.ico',
  themeConfig: {
  //   algolia: {
  //     apiKey: '47ecd3b21be71c5822571b9f59e52544',
  //     indexName: 'docusaurus-2',
  //     algoliaOptions: {},
  //   },
    headerLinks: [
      // {url: 'docs/introduction', label: 'Docs'},
      {url: '/', label: 'Blog'},
      {url: 'about/', label: 'About'},
    ],
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} gensh.me.`,
    }
  },
  presets: [
    [
      require.resolve('./preset/index.js'), // preset set to be: './preset'
      {
        // docs: {
        //   path: 'docs',
        //   sidebarPath: require.resolve('./sidebars.js'),
        // },
        blog: {
          path: 'blog',
          routeBasePath: '/',
          postsPerPage: 3,
        },
      },
    ],
  ],
};
