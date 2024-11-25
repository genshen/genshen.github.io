---
slug: markdown-for-phd-thesis
title: 用 Markdown 写毕业论文
authors: [genshen]
tags: [markdown, LaTeX]
---

最近因为要写博士毕业论文了，由于研究生院也没有非常严格限制毕业论文的格式。于是想着有没有一种便携的方式来撰写毕业论文。

## 为什么不用 Microsoft word ?
- word 排版没有 LaTeX 的漂亮。
- word 内置的公式功能对于公式排版及其编号、引用不够方便。要解决这个问题，得借助 mathtype 等第三方工具。（题外话：最新版的 office 365 可以通过 LaTeX 插入一些简单公式）。
- 图片、表格、章节的交叉引用操作不方便，感觉每引用一次都得点好多下。
- 大型文档使用体验差。主要是几百页的好几万的文档，保存速度慢，甚至会崩。特别是审阅模式下，编辑时可能会有卡顿的情况。
- 文献引用不方便。word 内置的交叉引用感觉基本不好用，和文献管理器（如 endnote、zotero）没打通。
  不过，似乎这个额问题可以通过文件管理器解决。例如，我用的是 zotero，它有个word 插件，可以进行参考文件的插入和最后的汇总。

## 为什么不直接用 LaTeX ?
因为导师看毕业论文需要用 word 格式（无奈）。
LaTeX 偶尔也还是需要调整格式问题（如图片大小和子图；表格的排版相对 markdown 要麻烦一些。当然 markdown 不支持复杂的表格形式。）。
<!--truncate-->

所以，得有一种方法，可以解决上述的 word 的缺点，还能导出为满足毕业论文 word 模版格式的 word 文件。
大概考虑了几种可能的方案：
1. LaTeX 编译为 pdf，然后 pdf 转为 word：这个 pdf -> word 不太可靠，以前试过 adobe 家的 Acrobat，感觉转换的 word 会有各种错乱的问题。
2. LaTeX 直接转 word：看起来这个方案似乎还行，例如用 pandoc 来转？ 不过，LaTeX 里面用到的各种宏包、参考文献引用不确定是否可以正常转化。这个没正经尝试，感觉会有很多坑。
3. 用一种中间格式，可以转成 LaTeX，也可以转成word：对这个中间格式最基本的要求是支持图表的交叉引用、参考文献引用。一开始我想到的是 AsciiDoc，因为其已经内置了交叉引用了。但是其生态似乎没有 markdown 那么好，不确定是否会有坑，感兴趣的可以尝试下。另外，通过查阅资料，发现似乎可以用 markdown 来写论文。

## Markdown 的解决方案
这个主要是参考了 [colordi](https://www.zhihu.com/people/colordi-29/posts) 的相关博客。
这里主要解决 Markdown 如何进行交叉引用和文献引用的问题，markdown 到 word、LaTeX、pdf 的转化可以通过瑞士军刀 pandoc 进行。

### Tools
工欲善其事，必先利其器。我们先安装一些必要的工具。

- [pandoc](https://pandoc.org/installing.html#macos) and [pandoc-crossref](https://github.com/lierdakil/pandoc-crossref)
- LaTeX: e.g. TeX Live, BasicTeX
- Python 3
- [pandoc-minted](https://pypi.org/project/pandoc-minted/) and [Pygments](https://pypi.org/project/Pygments/)
<!-- - ninja -->

### 图片、表格等的交叉引用
pandoc 下针对 markdown 的交叉引用是通过 [pandoc-crossref](https://lierdakil.github.io/pandoc-crossref) 来达到效果的。
它支持图片、表格、代码、公式、章节的引用。  
可以在 markdown 中这么写：
```markdown
![cell_list](./cell-list.pdf){#fig:cell_list}

ls1-mardyn 等软件则采用 cell-list 数据结构，如 [@fig:cell_list] 所示。
```
发现这种写法和 LaTeX 有点像，在图片部分，给一个 label 名称，在引用的地方用 "@" 进行引用。
此外，作为额外补充，大括号内还支持写图片的其他属性，例如 `{width=100px}`，这是 pandoc 所支持的。
需要注意的是，不同类别的内容，有不同的前缀，例如图片就是 `fig`，具体如下：

| | label | ref | example |
| -- | -- | -- | -- |
| 图片 | #fig:label | @fig:label | `![a](image1.png){#fig:label}` |
| 公式| #eq:label | @eq:label | `$$ math $$ {#eq:label}`|
| 表格 | #tbl:label | @tbl:label | `: Caption {#tbl:label}` (见[这里](https://lierdakil.github.io/pandoc-crossref/#table-labels)) |
| 章节 | #sec:section | @sec:section | `Section {#sec:section}` |

其他的各种细节问题，可以参加 pandoc-crossref 文档，例如如何排版子图（类似于 LaTeX 的 subfigure）、引用代码。

#### 自定义引用格式
用于默认的图片的题注用的是 `Figure.`，引用的时候出现的是 `fig.`，这个在中文论文里面不不太对劲的，需要调整。
pandoc 中，可以通过 markdown 头部的 yaml 部分进行配置。例如，需要将引用改为 `图4` 这种形式，可以在 markdown 的开始，加上对应的配置（正如这篇博客的源码所示）：
```markdown
---
figureTitle: 图
tableTitle: 表
figPrefix: 图
eqnPrefix: 公式
tblPrefix: 表
---
```
这里，`xxTitle` 是出现在题注部分的，`xxPrefix` 是出现在正文引用的地方的。
当然，这些参数，还可以通过以下方式指定：
1. 在 markdown 文件的头部，用 yaml 格式指定，即上面说的方式。
2. 也可以在命令行通过 `-M` 参数传递给 pandoc，如:
    ```bash
    pandoc --filter pandoc-crossref -M chapters -M figureTitle="图" -M figPrefix="图" -i input.md -o output.docx
    ```
3. .yaml 格式的配置文件进行设置(见 https://lierdakil.github.io/pandoc-crossref/#settings-file)。
4. 单独的 metadata.yaml 文件，并在命令后通过 `--metadata-file metadata.yaml` 参数，指定文件路径。

更多的配置选项，可以参考 pandoc-crossref 的[文档](https://lierdakil.github.io/pandoc-crossref/#customization)。
另外，这个 yaml 部分不仅仅针对 pandoc-crossref，pandoc 本身也有一些选项可以通过其指定（如指定关键词）。

#### 子图的排版
```
<div id="fig:kmc_cu">
![step=0](./assets/vincent-06/0.png){#fig:kmc_vincent_06_0 width=25%}
![step=10000](./assets/vincent-06/1.png){#fig:kmc_vincent_06_1 width=25%}
![step=50000](./assets/vincent-06/5.png){#fig:kmc_vincent_06_2 width=25%}
![step=100000](./assets/vincent-06/10.png){#fig:kmc_vincent_06_3 width=25%}

![step=150000](./assets/vincent-06/25.png){#fig:kmc_vincent_06_4 width=25%}
![step=500000](./assets/vincent-06/50.png){#fig:kmc_vincent_06_5 width=25%}
![step=100000](./assets/vincent-06/100.png){#fig:kmc_vincent_06_6 width=25%}
![step=115000](./assets/vincent-06/115.png){#fig:kmc_vincent_06_7 width=25%}

MISA-AKMC 模拟的空位引导的富Cu析出过程可视化
</div>
```

### 参考文献引用
熟悉 LaTeX 的同学可能都知道，LaTeX 可以通过 .bib 文件和 bibtex 来引用参考文献，十分方便。
markdown 中，可以直接把这一功能搬运过来。
配合参考文献管理器，可以是这么一个工作流程：从参考文献管理器中 (我用的是 zeteor)，
导出参考文献到 .bib 格式（可能需要合并下先前导出的文献），然后在 workdown 里面直接用 `@`+文献名称，直接引用。  

相关教程可以参考[这里](https://glowkeeper.github.io/Markdown-with-References/)，也可以继续往下读。

和图表的引用类似，参考文献的引用可以是 `@citationkey` 或者 `[@citationkey]`。
如果需要在一处进行多个文献的引用，可以这么写 `[@germann_25_2005;@niethammer_ls1_2014]`。

在 pandoc 的转换过程时，可以用下面这个命令：
```bash
pandoc --citeproc --bibliography=ref.bib -M reference-section-title="参考文献" input.md -o output.docx
```
其中，`bibliography` 指定了 bib 文件的路径，`reference-section-title` 指定文末的参考文献那一节的标题名称，默认是 reference。

:::note
在使用过程中，还发现一个小细节，pandoc-crossref 对 citeproc 似乎有些干扰。
命令后中，得把 pandoc-csrssref 的参数写前面，citeproc 的参数写后面：如 `--filter pandoc-crossref --citeproc --bibliography=../ref.bib`，而不能 `--citeproc --bibliography=../ref.bib --filter pandoc-crossref`。
否则参考文件引用的地方，不会正确地显示引用标记，还是原先的 `[@citationkey]`。
:::

#### 引用格式
默认的参考文献的引用格式是类似于这样的 `(Niethammer et al. 2014)` 作者-年份。
但是，一般中文毕业论文里面都是数字上标的那种。然后参考文献列表，一般用 GB/T 7714 引用标准。  

这可以通过 csl 文件来指定。
具体的 csl 文件，可以在 zotero 文献管理器的 [style search](https://www.zotero.org/styles) 页面下载。
然后在 padoc 转换时，加上 `--csl=csl_file_path` 来指定 csl 文件路径。
如果你安装了 zotero，csl 文件也可在 `~/Zotero/styles` 目录找到（mac系统）。

### word 模板
参考 https://zhuanlan.zhihu.com/p/412817834 即可。
先用 `pandoc --print-default-data-file reference.docx > default-reference.docx` 命令，导出默认模版。
然后，修改模版的字体、段落、样式等。在 pandoc 转换时，用 `--reference-doc=default-reference.docx` 参数指定模版路径即可。

另外，需要提醒的是，修改模板样式，最好在样式表里面进行修改。

### 多个 markdown 文件
可以通过 `-i a.md b.md c.md` 这样指定多个 markdown 文件，和单个文件没啥区别。
这个时候，前面说的在 markdown 头部配置 yaml 的内容，则建议存到单独的一个 metadata.yaml 文件里面。

### markdown 转 LaTeX
参数和转换成word的类似，参考脚本如下：

```bash
pandoc --filter pandoc-crossref \
  --citeproc --bibliography=./ref.bib \ 
  --csl=./gb-t-7714-2005.csl --biblatex \
  --filter pandoc-minted input.md \
  -o _markdown_docs/output.tex
```

### 其他
pdf 格式图片如果长宽的缩放比例不对，可以关注这个 [issue](https://github.com/jgm/pandoc/issues/4322).

## 参考：
- https://glowkeeper.github.io/Markdown-with-References/
- https://zhuanlan.zhihu.com/p/412303737
- https://stackoverflow.com/questions/30092337/pandocmd-latex-should-generate-bibitem-in-bibliography
- 