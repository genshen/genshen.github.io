const math = require('remark-math')
const katex = require('rehype-katex')

module.exports = {
  title: 'Blog',
  tagline: 'The tagline of my blog site',
  url: 'https://gensh.me',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'genshen', // Usually your GitHub org/user name.
  projectName: 'blog', // Usually your repo name.
  stylesheets: [
    'https://cdn.jsdelivr.net/npm/katex@0.11.0/dist/katex.min.css',
  ],
  themeConfig: {
    prism: {
      additionalLanguages: ['rust'],
    },
    navbar: {
      title: 'Blog',
      logo: {
        alt: 'Blog Logo',
        src: 'img/logo.svg',
      },
      links: [
        // {to: 'docs/doc1', label: 'Docs', position: 'left'},
        {to: '/', label: 'Blog', position: 'left'},
        {to: '/tags', label: 'Tags', position: 'left'},
        {to: 'about', label: 'About', position: 'left'},
        {
          href: 'https://github.com/genshen',
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
        //       label: 'Style Guide',
        //       to: 'docs/doc1',
        //     },
        //     {
        //       label: 'Second Doc',
        //       to: 'docs/doc2',
        //     },
        //   ],
        // },
        // {
        //   title: 'Community',
        //   items: [
        //     {
        //       label: 'Stack Overflow',
        //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
        //     },
        //     {
        //       label: 'Discord',
        //       href: 'https://discordapp.com/invite/docusaurus',
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
      copyright: `Copyright © ${new Date().getFullYear()} gensh.me`,
    },
  },
  presets: [
    [
      // '@docusaurus/preset-classic',
      require.resolve('./preset/index.js'), // preset set to be: './preset'
      {
        // docs: {
        //   path: 'docs',
        //   sidebarPath: require.resolve('./sidebars.js'),
        //   editUrl:
        //     'https://github.com/facebook/docusaurus/edit/master/website/',
        // },
        blog: {
          path: './blog',
          routeBasePath: '/',
          postsPerPage: 3,
          // https://spectrum.chat/unified/remark/remark-math-on-docusaurus-v2~220079aa-2dab-4d2e-b39a-a33563107dc5
          remarkPlugins: [math],
          rehypePlugins: [katex],
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
