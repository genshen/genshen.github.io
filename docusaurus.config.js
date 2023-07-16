// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const math = require('remark-math')
const katex = require('rehype-katex')

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Blog',
  tagline: 'Blog site of gensh.me',
  url: 'https://blog.gensh.me',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'genshen', // Usually your GitHub org/user name.
  projectName: 'blog', // Usually your repo name.
  stylesheets: [{
    href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
    type: 'text/css',
    integrity:
      'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
    crossorigin: 'anonymous',
  }],
  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Blog',
        logo: {
          alt: 'Blog Logo',
          src: 'img/logo.svg',
        },
        items: [
          // {
          //   type: 'doc',
          //   docId: 'intro',
          //   position: 'left',
          //   label: 'Tutorial',
          // },
          {to: '/', label: 'Blog', position: 'left'},
          {to: '/archive', label: 'Archive', position: 'left'},
          {to: '/tags', label: 'Tags', position: 'left'},
          {to: 'about', label: 'About', position: 'left'},        {
            href: 'https://github.com/genshen',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
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
        copyright: `Copyright © ${new Date().getFullYear()} gensh.me.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['rust'],
      },
    }),
    presets: [
      [
        'classic',
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          // docs: {
          //   sidebarPath: require.resolve('./sidebars.js'),
          //   // Please change this to your repo.
          //   // Remove this to remove the "edit this page" links.
          //   editUrl:
          //     'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          // },
          docs: false,
          blog: {
            showReadingTime: true,
            routeBasePath: '/',
            postsPerPage: 3,
            blogDescription: 'A docusaurus powered blog!',
            // https://spectrum.chat/unified/remark/remark-math-on-docusaurus-v2~220079aa-2dab-4d2e-b39a-a33563107dc5
            remarkPlugins: [math],
            rehypePlugins: [katex],
            // blogSidebarTitle: 'All posts',
            blogSidebarCount: 8, // Or "ALL"
            // Please change this to your repo.
            // Remove this to remove the "edit this page" links.
            editUrl:
              'https://github.com/genshen/blog-site/tree/master/',
            feedOptions: {
              type: 'all',
              copyright: `Copyright © ${new Date().getFullYear()} gensh.me.`,
            },
          },
          theme: {
            customCss: require.resolve('./src/css/custom.css'),
          },
        }),
      ],
    ],
};

module.exports = config;
