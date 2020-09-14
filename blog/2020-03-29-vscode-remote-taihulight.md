---
id: vs-code-remote-on-sunway-taihulight
title: 在神威太湖之光上使用 vscode Remote
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [tool, vscode, supercomputer, hpc]
---

vs code 可谓是开发利器，其中的 vscode-remote 插件给开发者提供了在远程机器上(包括 ssh、docker、WSL)进行开发的选择，且十分便利。
再次之前，我们在太湖之光上编写代码很多时候都是ssh登录到机器到登录节点，然后在命令行下使用 vi 编辑器进行代码编写。
这样的开发方式固然可行，但很多 vscode 的先进功能都没有用上，如代码补全、智能提示、git集成、插件系统。

本文希望将 vscode 的功能给带到太湖之光上，以方便在该机器上的代码开发；通过 vscode 的强大功能来提升工作效率。

## 在太湖之光上 psn 节点安装 remote-ssh 扩展
本地安装好 Remote-SSH 扩展后，使用该扩展连接 psn 节点，即会开始下载 vscode-serve (由于远程无法连接互联网，会本地下载然后上传到远程)。  
如果本地下载上传还是失败，可以参照[该链接](https://stackoverflow.com/a/57601121/10068476) 手动下载并安装 vscode-serve。  
随后的尝试连接 remote 过程会出现失败（可以在 OUTPUT 中查看具体错误信息）：
```log
/home/export/base/{my_username}/.vscode-server/bin/{id}/node: /usr/lib64/libstdc++.so.6: version `GLIBCXX_3.4.14' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
> /home/export/base/{my_username}/.vscode-server/bin/{id}/node: /usr/lib64/libstdc++.so.6: version `GLIBCXX_3.4.18' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
> /home/export/base/{my_username}/.vscode-server/bin/{id}/node: /usr/lib64/libstdc++.so.6: version `CXXABI_1.3.5' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
> /home/export/base/{my_username}/.vscode-server/bin/{id}/node: /usr/lib64/libstdc++.so.6: version `GLIBCXX_3.4.15' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
> /home/export/base/{my_username}/.vscode-server/bin/{id}/node: /lib64/libc.so.6: version `GLIBC_2.17' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
> /home/export/base/{my_username}/.vscode-server/bin/{id}/node: /lib64/libc.so.6: version `GLIBC_2.16' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
> /home/export/base/{my_username}/.vscode-server/bin/{id}/node: /lib64/libc.so.6: version `GLIBC_2.14' not found (required by /home/export/base/{my_username}/.vscode-server/bin/{id}/node)
```
注⚠️：`~/.vscode-server/bin/` 下会有一个较长到十六进制字符串的目录，为方便这里用 `{id}` 代替。

这是由于 spn 节点的linux版本是 red-hat 6，其提供的 glibc 等链接库的版本比较落后，
而 vscode-serve 中的 node 需要 GLIBC_2.17 及以上的 glibc 和高版本的 libstdc++.so。  
另外，官方也有[相关说明](https://code.visualstudio.com/docs/remote/linux#_tips-by-linux-distribution)，
要求 RedHat Enterprise Linux 6 (64-bit) 版本需要 glibc >= 2.17 与 libstdc++ >= 3.4.18。

<!--truncate-->

为解决 libc 和 libstdc++ 版本问题，可以使用 patchelf 来更改 node 的链接库版本：
```bash
# on spn
cd ~/.vscode-server/bin/{id}/
/usr/sw-cluster/apps/Anaconda/anaconda3/bin/patchelf \
    --set-rpath /usr/sw-cluster/apps/lib/glibc-2.17/lib64/:/usr/sw-cluster/apps/Anaconda/anaconda3/lib/ \
    --set-interpreter /usr/sw-cluster/apps/lib/glibc-2.17/lib64/ld-linux-x86-64.so.2 ./node
```
使用 `ldd` 命令可以看到 node 已经链接到新到链接库：
```bash
ldd node
	linux-vdso.so.1 =>  (0x00007fff671ff000)
	libdl.so.2 => /usr/sw-cluster/apps/lib/glibc-2.17/lib64/libdl.so.2 (0x00002baa9ea6e000)
	librt.so.1 => /usr/sw-cluster/apps/lib/glibc-2.17/lib64/librt.so.1 (0x00002baa9ec72000)
	libstdc++.so.6 => /usr/sw-cluster/apps/Anaconda/anaconda3/lib/libstdc++.so.6 (0x00002baa9ee7a000)
	libm.so.6 => /usr/sw-cluster/apps/lib/glibc-2.17/lib64/libm.so.6 (0x00002baa9f1b5000)
	libgcc_s.so.1 => /usr/sw-cluster/apps/Anaconda/anaconda3/lib/libgcc_s.so.1 (0x00002baa9f4b3000)
	libpthread.so.0 => /usr/sw-cluster/apps/lib/glibc-2.17/lib64/libpthread.so.0 (0x00002baa9f6c5000)
	libc.so.6 => /usr/sw-cluster/apps/lib/glibc-2.17/lib64/libc.so.6 (0x00002baa9f8e3000)
	/usr/sw-cluster/apps/lib/glibc-2.17/lib64/ld-linux-x86-64.so.2 => /lib64/ld-linux-x86-64.so.2 (0x000000358ba00000)
```

具体可以参考[http://bbs.nsccwx.cn](http://bbs.nsccwx.cn/topic/405/在psn上使用vscode-remote)。

这样就可以正常使用 vscode remote 了。

## C/C++ 扩展
1. 前往 [github vscode-cpptools](https://github.com/microsoft/vscode-cpptools/releases) 下载对应版本的 c/c++ 扩展包。
2. 下载完成后，在扩展页面选择 "Install from VSIX..."，然后选择下载的 `cpptools-linux.vsix` 文件进行安装。
   需要注意的是，该扩展必须离线安装，因为如果是在线安装，安装完成后还会联网相关组件（参考[issue 2032](https://github.com/microsoft/vscode-cpptools/issues/2032#issuecomment-391215249)），而离线安装的 vsix 文件中会包含这些组件。
3. 扩展安装完成后，可能需要 reload vscode 以启用 c/c++ 扩展。
    但是随后启动 c/c++ 扩展还会存在错误:  
    ![](/img/blog/taihulight-ssh-remote/error-cpp-extension.png)  
    具体原因如下：
    ```log
    [Error - 13:42:50] Connection to server got closed. Server will not be restarted.
    /home/export/base/{my_username}/.vscode-server/extensions/ms-vscode.cpptools-0.27.0/bin/cpptools: /lib64/libc.so.6: version `GLIBC_2.17' not found (required by /home/export/base/{my_username}/.vscode-server/extensions/ms-vscode.cpptools-0.27.0/bin/cpptools)
    /home/export/base/{my_username}/.vscode-server/extensions/ms-vscode.cpptools-0.27.0/bin/cpptools: /lib64/libc.so.6: version `GLIBC_2.14' not found (required by /home/export/base/{my_username}/.vscode-server/extensions/ms-vscode.cpptools-0.27.0/bin/cpptools)
    ```
    这里还是 glibc 的问题，我们参照 remote-ssh 安装过程中类似的方式，使用 patchelf 工具来进行patch。
    需要修改链接库的文件包括 (version 0.27.0)：
    不过，需要注意的是，在 0.27.0 及其以后的版本中，上面的 patchelf 对对象有所区别，分别为：
    - `.vscode-server/extensions/ms-vscode.cpptools-0.27.0/bin` 下的 `cpptools` 与 `cpptools-srv`文件;
    - `.vscode-server/extensions/ms-vscode.cpptools-0.27.0//LLVM/bin` 下的 `clang-format` 的文件

## 配置 C/C++ 扩展
目前使用的是 `/usr/sw-mpp/swcc/swgcc530-tools` 下的 sw5gcc/sw5g++ 编译器, 
MPI 编译器使用的为 `/usr/sw-mpp/mpi2/mpiswgcc/bin` 下的 mpiswgcc/mpiswg++, 
如果使用的是 sw5cc/sw5CC 系列编译器，可能 includePath 需要另行配置。
```json
{
    "configurations": [
        {
            "name": "Linux",
            "includePath": [
                "${workspaceFolder}/**",
                "/usr/sw-mpp/swcc/swgcc530-tools/shared_include/**",
                "/usr/sw-mpp/swcc/swgcc530-tools/usr/include/**",
                "/usr/sw-mpp/swcc/swgcc530-tools/usr/include/c++/5.3.0/**",
                "/usr/sw-mpp/swcc/swgcc530-tools/usr_sw5/include/**",
                "/usr/sw-mpp/swcc/swgcc530-tools/usr_sw5/sw_64sw2-unknown-linux-gnu/include/c++/5.3.0/**",
                "/usr/sw-mpp/mpi2/mpiswgcc/include/**"
            ],
            "defines": [],
            "compilerPath": "/usr/sw-mpp/mpi2/mpiswgcc/bin/mpiswg++",
            "cStandard": "c99",
            "cppStandard": "c++11",
            "intelliSenseMode": "gcc-x64",
            "compilerArgs": [
                "-mhybrid"
            ]
        }
    ],
    "version": 4
}
```

## 来一些效果图
- Go to definition
  ![Go to definition](/img/blog/taihulight-ssh-remote/screenshot-go-to-definition.png)
- Auto completion
  ![Auto completion](/img/blog/taihulight-ssh-remote/screenshot-auto-completion.png)
