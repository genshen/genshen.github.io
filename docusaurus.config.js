/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  title: 'Blog',
  tagline: '⚡️ Painless static site generator',
  organizationName: 'gensh.me',
  projectName: 'blog',
  baseUrl: '/',
  url: 'https://gensh.me',
  favicon: 'img/docusaurus.ico',
  themeConfig: {
    navbar: {
      title: 'Blog',
      logo: {
        alt: 'Blog Logo',
        src: 'img/docusaurus.svg',
      },
      links: [
        {to: '/', label: 'Blog', position: 'left'},
        {to: 'about', label: 'About', position: 'left'},
        {
          href: 'https://github.com/facebook/docusaurus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        // {
        //   title: 'Docs',
        //   items: [
        //     {
        //       label: 'Introduction',
        //       to: 'docs/introduction',
        //     },
        //     {
        //       label: 'Themes',
        //       to: 'docs/themes',
        //     },
        //   ],
        // },
        {
          title: 'Social',
          items: [
            {
              label: 'Blog',
              to: '/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/genshen',
            }
          ],
        },
      ],
      logo: {
        alt: 'Facebook Open Source Logo',
        src: 'https://docusaurus.io/img/oss_logo.png',
      },
      copyright: `Copyright © ${new Date().getFullYear()} gensh.me`,
    },
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
