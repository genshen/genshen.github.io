---
slug: script-for-compiler-wrapper
title: 一个用于包装编译器的脚本
authors: [genshen]
tags: [compiler, CUDA, Linux]
# image: ./img/social-card.png
---

有时候，在调用编译器的时候，我们像移除掉编译器的某些参数（例如这些参数是 cmake 等工具生成的，我们由不好修改cmake的内部机制）。
一种典型的场景是，英伟达的 nvcc 对很多 gcc/clang 的参数都不支持，当使用 nvcc 作为编译器时，需要移除掉一些参数或者进行特殊处理。

这时候，可以考虑用我御用的脚本。
下面的脚本是一个参考，支持移除编译器参数、修改或者添加编译器参数。
这里用的编译器是 hipcc（在英伟达平台上，hipcc 会调用 nvcc，然后 nvcc 调用系统的gcc），大家可以在此基础上进行修改。

<!--truncate-->

```bash
#!/bin/sh

set -e

LINKER=/usr/local/bin/hipcc
newcmd=""

collecting_compiler_info_flag=0

for arg in $@
do
  case $arg in
    # a workaround fixing for Jetbrains Clion compiler information collecting:
    # error message: nvcc cannot get compiler information
    "-xc++")
    collecting_compiler_info_flag=1
    newcmd="$newcmd $arg"
      ;;
    "-fpch-preprocess") # remove argument
    collecting_compiler_info_flag=1
    newcmd="$newcmd $arg"
      ;;

    "-fdiagnostics-color=always") # remove argument: nvcc does not support this argument
      ;;
    "-std=gnu++14") # remove argument
      ;;

    # OpenMP
    "-fopenmp")
     newcmd="$newcmd -Xcompiler -fopenmp";;

    "-fopenmp=libomp")
      newcmd="$newcmd -Xcompiler -fopenmp";;
    *)
      newcmd="$newcmd $arg";;
  esac
done

# debug: show debug info in cmake config step.
# CMake 配置阶段的时候，可以输出命令进行调试输出（需要输出到错误输出中），以检查参数是否进行了正确处理。
echo "CMAKE_DEBUG::"$collecting_compiler_info_flag $newcmd >&2

if [ "$collecting_compiler_info_flag" -eq 1 ]; then
  # for gathering compiler information by Jetbrains Clion
  newcmd="g++ $newcmd" # fallback to g++, skip hipcc and nvcc.
else 
  # for generally compiling
  newcmd="$LINKER $newcmd"
fi

# Finally execute the new command
exec $newcmd
```

将以上脚本命名为 `hipcc-nv-wrapper.sh`，然后就可以通过以下的命令，将包装后的编译器传入 CMake 等工具了。

```bash
# 示例中，仅指定 C++ 编译器为 hipcc-nv-wrapper.sh
cmake -DCMAKE_C_COMPILER=clang-18 -DCMAKE_CXX_COMPILER=/workspace/scripts/hipcc-nv-wrapper.sh -S ./ -B ./cmake-build-debug
```
