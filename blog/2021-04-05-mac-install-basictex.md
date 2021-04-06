---
title: mac 干净安装 basictex
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [LaTeX]
---

basictex 是一个极简的 latex 版本，仅安装最基础的组件，不像 textlive 动辄两三 GB 的大小。
但是，basictex 带来的问题却是其安装比较复杂，本文主要记录其安装过程。

## 安装目录
和 textlive 一样，basictex 的安装包会将其自身会安装到系统目录，包括：
- /usr/local/texlive/2021basic
- /etc/paths.d/TeX
- /etc/manpaths.d/TeX
- /Library/TeX

这里，可能稍微有些洁癖，不喜欢安装包写入这些系统的目录。
目前的想法是，在其他地方建一些目录（普通用户可写的目录），将其软连接到这些系统目录中。
这样的好处是，随后用 tlmgr 工具安装各种包的时候，也不需要 sudo 权限了。  
例如，可放到 `~/.local/texlive` 下：
```bash
mkdir -p ~/.local/texlive
cd ~/.local/texlive
mkdir -p texlive etc.paths.d etc.manpaths.d library

cd /usr/local/
sudo ln -s ~/.local/develop/texlive/texlive ./texlive

cd /etc/etc.paths.d
sudo ln -s ~/.local/develop/texlive/etc.paths.d TeX

cd /etc/manpaths.d
sudo ln -s ~/.local/develop/texlive/etc.manpaths.d TeX

cd /Library
sudo ln -s ~/.local/develop/texlive/library/ ./TeX
```

## 安装
使用 brew 安装 basictex 或者 下载 [pkg 安装包](https://mirrors.tuna.tsinghua.edu.cn/CTAN/systems/mac/mactex/)进行安装。
```bash
brew install basictex
sudo chown -R genshen: ~/.local/develop/texlive #`genshen` 为普通用户名.
```
如果必要，可将路径 `~/.local/develop/texlive/texlive/2021basic/bin/universal-darwin`加入`PATH`环境变量中。

## 安装包
例如 `tlmgr install subfigure`，这里不需要 sudo 权限即可安装。

### 配置镜像
见 https://mirrors.tuna.tsinghua.edu.cn/help/CTAN/。
