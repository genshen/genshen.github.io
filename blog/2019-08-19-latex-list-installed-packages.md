---
title: LaTeX 列出安装的包
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [LaTeX]
---

可以使用以下代码列出 LaTeX 中已经安装的包，将其编译为pdf即可。

<!--truncate-->

```tex
\documentclass[10pt]{article}
\usepackage[a6paper,hmargin=3mm,vmargin=12mm]{geometry}

\usepackage[T1]{fontenc}
\begingroup
\catcode`\^^M=12\relax%
\expandafter\gdef\expandafter\trimtok\detokenize{i}#1^^M{#1}%
\gdef\trimmer#1{\expandafter\trimtok #1}%
\endgroup

\newread\reader

\immediate\write18{tlmgr list --only-installed > installed-packages.txt}
\begin{document}
\tiny
\begin{enumerate}
\openin\reader=installed-packages.txt\relax
\loop
    \readline\reader to \data
    \unless\ifeof\reader
        \item \trimmer{\data}
\repeat
\closein\reader
\end{enumerate}
\end{document}
```

## 更新（2022/3/25）
可以用 `tlmgr list --only-installed` 命令列出包。
见 https://tex.stackexchange.com/a/56012。