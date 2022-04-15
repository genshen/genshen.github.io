const math = require('remark-math')
const katex = require('rehype-katex')

module.exports = {
  title: 'Blog',
  tagline: 'The tagline of my blog site',
  url: 'https://gensh.me',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'genshen', // Usually your GitHub org/user name.
  projectName: 'blog', // Usually your repo name.
  stylesheets: [{
    href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
    type: 'text/css',
    integrity:
      'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
    crossorigin: 'anonymous',
  }],
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
      items: [
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
      '@docusaurus/preset-classic',
      {
        // docs: {
        //   path: 'docs',
        //   sidebarPath: require.resolve('./sidebars.js'),
        //   editUrl:
        //     'https://github.com/facebook/docusaurus/edit/master/website/',
        // },
        docs: false,
        blog: {
          path: './blog',
          routeBasePath: '/',
          postsPerPage: 3,
          blogDescription: 'A docusaurus powered blog!',
          // https://spectrum.chat/unified/remark/remark-math-on-docusaurus-v2~220079aa-2dab-4d2e-b39a-a33563107dc5
          remarkPlugins: [math],
          rehypePlugins: [katex],
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} gensh.me.`,
          },
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
