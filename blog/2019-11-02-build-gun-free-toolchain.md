---
title: Build GNU-free Toolchain
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [toolchain, llvm, linux]
---

在linux上，最为受欢迎的 C/CXX 编译器之一就是 gcc 系列了，其使用 GNU 协议开源。
除此之外，还有基于llvm的现代编译器 clang/clang++，它则使用更为宽松的 BSD 协议开源。
关于两者的比较，可以参见[这里](https://clang.llvm.org/comparison.html)。

本文将尝试编译一套与 gnu 编译器无关的基于 clang 的工具链。
clang 是用C++写的，其依赖于 C 和  C++ 标准库，C++ ABI 库，以及 stack unwinder（实际上，我们编译其他的c/c++源代码也离不开三种）。  
在clang编译器工具链中，我们可以采用 **musl**, **libcxx**, **libc++abi** 和 **libunwind** 四个库来完成。
其中，libc++, libc++abi 和 libunwind 属于llvm 自己开发的 C++ 运行时（C++ runtime）。

|  | clang系列编译器 | GNU 编译器 |
|------|:---:|:---:|
| C标准库   | musl     | glibc |
| C++标准库 | libcxx   | libstdc++ |
|C++ ABI 库| libc++abi| libgcc(?不确定) |
|stack unwinder| libunwind | libgcc |

需要指出的是，使用clang系列编译器时，也可以链接 GUN 的 glibc, libstdc++, libgcc 库，
这里我们为了与GNU无关，则把这个选择直接忽略。

这里插一句**libc** 和 **glibc**的区别， 
我们在编译程序时，使用ldd命令，可以看到二进制程序的链接库，而且大部分程序都会依赖于 libc。
在linux系统下，系统默认会有一个libc的库，大多数系统里面的这个libc库就是glibc，系统的大多数程序也都依赖于该库。  
glibc是C标准库的一个实现，而在较早之前 linux 有自己的C标准库实现，后来改用使用glibc，而自己原先带libc库不再维护。

回到正题，C标准库，除了glibc的实现外，还有另一个开源实现 [musl](https://www.musl-libc.org/)，采用 MIT 协议。
就C++标准库而言，llvm 也有一个实现，叫 [libc++](https://libcxx.llvm.org/)。
> libc++ is an implementation of the C++ standard library, targeting C++11, C++14 and above.
> All of the code in libc++ is dual licensed under the MIT license and the UIUC License (a BSD-like license).

<!--truncate-->
## 相关准备工作
为了实现这些库或clang编译器的编译，因此我们需要一个编译器。
我们还得转到gcc上面来，先安装gcc编译器，用 gcc 编译器编译这些库
（当然，等gcc编译好了clang后，也可以用clang把这些库重新编译一遍，这个过程叫"bootstrap"）。

嗯，我们基于[alpine](https://alpinelinux.org)系统（一个linux的发行版，很轻量级(约5MiB)，常用于构建docker镜像）
因为alpine的C标准库是musl，而非glibc。
> Alpine Linux is a security-oriented, lightweight Linux distribution based on musl libc and busybox.

为方便，我们在docker容器中执行各个阶段的编译构建过程。
```bash
mkdir build-llvm-project
cd build-llvm-project
docker run -it --rm -v ${PWD}:/root/build-llvm-project alpine:latest ash
```
后面的所有命令，都将在这个容器中进行，而非宿主机上。

在alpine容器中，安装build-base、make、cmake、python3(构建libcxx和clang编译时需要)等工具:
```bash
apk add --no-cache build-base cmake git python3 linux-headers
```

下载llvm相关源代码:
```bash
git clone https://github.com/llvm/llvm-project.git
cd llvm-project
git checkout llvmorg-9.0.0 # use 9.0.0 version
```
在上面git clone 的 llvm-project 的源码中，已经包含了liibunwind，libcxx-abi，libcxx，
此外，还包含llvm libc，lldb，lld，openmp的实现代码(这里就不展开了)。

我们采用自底层往上的原则，分别编译 libunwind，libc++abi，libcxx。

## 构建 libunwind
```bash
cd build-llvm-project/llvm-project
cd libunwind
cmake -B./build -H./ -DLIBUNWIND_ENABLE_SHARED=OFF -DLLVM_PATH=../llvm \  #-DLIBUNWIND_USE_COMPILER_RT=ON
    -DCMAKE_C_FLAGS="-fPIC"  -DCMAKE_CXX_FLAGS="-fPIC"
cmake --build ./build --target install 
cd ../
```

## 构建 libcxxabi
这里需要使用 LLVM unwinder。
```bash
cd libc++abi
cmake -B./build -H./ -DLIBCXXABI_ENABLE_STATIC=ON -DLIBCXXABI_USE_LLVM_UNWINDER=ON \
    -DLIBCXXABI_LIBUNWIND_PATH=../libunwind \
    -DLIBCXXABI_LIBCXX_INCLUDES=../libcxx/include -DLLVM_PATH=../llvm
cmake --build ./build --target install
cd ../
```

## 构建 libcxx
参见：https://libcxx.llvm.org/docs/BuildingLibcxx.html，
```bash
cd libcxx
cmake -B./build -H./  \
    -DLIBCXX_ENABLE_SHARED=ON -DLIBCXX_ENABLE_STATIC=ON  \
    # -DLIBCXX_ENABLE_ABI_LINKER_SCRIPT=OFF \
    -DLIBCXX_HAS_MUSL_LIBC=ON \
    -DLIBCXX_HAS_GCC_S_LIB=OFF \
    -DCMAKE_SHARED_LINKER_FLAGS="-lunwind" \
    -DLIBCXX_CXX_ABI=libcxxabi \
    -DLIBCXX_CXX_ABI_INCLUDE_PATHS=../libcxxabi/include \
    -DLLVM_PATH=../llvm
# -DLIBCXX_CXX_ABI_LIBRARY_PATH
cmake --build ./build --target install -j 8
cd ../
```
通过`DLIBCXX_HAS_GCC_S_LIB`项禁用libgcc。

至此，C++到运行时栈已经构建完成，如果有动态库，可以用以下命令来验证(见 https://blogs.gentoo.org/gsoc2016-native-clang/):
```
readelf -d ./build/lib/libc++.so.1 | grep NEEDED
 0x0000000000000001 (NEEDED)             Shared library: [libc.musl-x86_64.so.1]
 0x0000000000000001 (NEEDED)             Shared library: [libc++abi.so.1]
```

### 相关错误汇总

1. Error relocating
```
ldd  /usr/local/lib/libc++.so.1
	/lib/ld-musl-x86_64.so.1 (0x7f7961df0000)
	libc.musl-x86_64.so.1 => /lib/ld-musl-x86_64.so.1 (0x7f7961df0000)
	libc++abi.so.1 => /usr/local/lib/../lib/libc++abi.so.1 (0x7f7961bed000)
Error relocating /usr/local/lib/libc++.so.1: __divti3: symbol not found
```
这个东西是和builtins相关的，在 libgcc_s.so 里面或者compiler-rt里面。
所以在程序链接的时候需要链接libgcc或者compiler-rt。

## C++运行时编译测试
先安装一个clang编译器（因为clang可以指定c++标准库）：
```bash
apk add --no-cache clang
# export CC=clang
# export CXX=clang++
```
当然，我们安装的这个[clang 编译器](https://pkgs.alpinelinux.org/package/edge/main/x86_64/clang)也是基于libstdc++，libgcc构建的。

我们可以用新编译的C++运行时测试一下，使用上面安装的 clang 编译器来编译程序：

```bash
clang -stdlib=libc++ main.c -o main_c
ldd main_c
	/lib/ld-musl-x86_64.so.1 (0x7f236ce72000)
	libc.musl-x86_64.so.1 => /lib/ld-musl-x86_64.so.1 (0x7f236ce72000)

clang++ -stdlib=libc++ main.cpp -o main_cpp
ldd ./main_cpp
	/lib/ld-musl-x86_64.so.1 (0x7f5b0fa0f000)
	libc++.so.1 => /usr/local/lib/libc++.so.1 (0x7f5b0f8e9000)
	libc++abi.so.1 => /usr/local/lib/libc++abi.so.1 (0x7f5b0f880000)
	libgcc_s.so.1 => /usr/lib/libgcc_s.so.1 (0x7f5b0f86c000)
	libc.musl-x86_64.so.1 => /lib/ld-musl-x86_64.so.1 (0x7f5b0fa0f000)
```

上面也可以看到，程序现在还必须链接 libgcc_s.so.1动态库，下面我们来编译 compiler-rt 取代 libgcc_s.so.1。

## compiler-rt
llvm compiler-rt 包含 builtins，profile等。详细见 https://compiler-rt.llvm.org。  
另外，我们注意到:
> Generally, you need to build LLVM/Clang in order to build compiler-rt. You can build it either together with llvm and clang, or separately.
> To build it together, simply add compiler-rt to the -DLLVM_ENABLE_PROJECTS= option to cmake.
> To build it separately, first build LLVM separately to get llvm-config binary.

compiler-rt要么在编译llvm/clang是一块编译，要么等编译好来llvm/clang后再编译它。所以我们把编译出compiler-rt放在后面做。

> libcxxrt is functionally equivalent to libc++abi, 
> and is planned to be replaced by the latter later in this project  
> https://blogs.gentoo.org/gsoc2016-native-clang/2016/07/24/a-new-gentoo-stage4-musl-clang/

这里说，libcxxrt 和 libc++abi在功能上是相同的，并且未来后者会替换前者。  
不管怎样，开始编译:
```bash
cmake -B./llvm-build-with-compiler-rt -H./llvm -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local/clang-gnu/9.0.0 \
    -DLLVM_ENABLE_PROJECTS="clang;compiler-rt" \
	-DCOMPILER_RT_BUILD_SANITIZERS=OFF \
	-DCOMPILER_RT_BUILD_XRAY=OFF \
	-DCOMPILER_RT_BUILD_PROFILE=OFF \
    -DCOMPILER_RT_BUILD_LIBFUZZER=OFF \
    -DCOMPILER_RT_USE_BUILTINS_LIBRARY=ON \
    -DCLANG_DEFAULT_CXX_STDLIB=libc++ \
    -DCLANG_DEFAULT_UNWINDLIB=libunwind \
    -DCLANG_DEFAULT_RTLIB=compiler-rt \
    -DLLVM_DEFAULT_TARGET_TRIPLE=x86_64-pc-linux-musl
cmake --build ./llvm-build-with-compiler-rt --target install -j 8
```
这里，参考了[gentoo Linux](https://packages.gentoo.org/packages/sys-libs/compiler-rt)的compiler-rt的编译命令。
我们不编译 sanitizers、xray、profile runtime、libFuzzer，仅编译builtins和crtbegin.o/crtend.o。  
其中，`COMPILER_RT_USE_BUILTINS_LIBRARY`指定compiler-rt使用builtins而非libgcc。

我们再进行一次编译测试：
```bash
/usr/local/clang-gnu/9.0.0/bin/clang++  -stdlib=libc++ --rtlib=compiler-rt  main.cpp -o main_cpp
ldd main_cpp
	/lib64/ld-linux-x86-64.so.2 (0x7f78bb51c000)
	libc++.so.1 => /usr/local/lib/libc++.so.1 (0x7f78bb378000)
	libc++abi.so.1 => /usr/local/lib/libc++abi.so.1 (0x7f78bb319000)
	libc.musl-x86_64.so.1 => /lib64/ld-linux-x86-64.so.2 (0x7f78bb51c000)
```
这次发现已经没有了libgcc_s.so.1这个动态库（实际上使用了 compiler-rt），
至此，我们使用clang编译的二进制程序已经没有gnu相关的库了。  
实际上，由于编译clang的时候，已经指定了clang默认链接的c++ std库及unwind库, 因此这里也可以直接用`/usr/local/clang-gnu/9.0.0/bin/clang++ main.cpp -o main_cpp`进行编译。

----
注：编译sanitizers有错误`compiler-rt/lib/sanitizer_common/sanitizer_platform_limits_posix.cc:57:10: fatal error: fstab.h: No such file or directory`，而且gentoo Linux的compiler-rt也没有编译sanitizer。

## 用clang编译clang
现在有个问题，上面编译的clang编译器，还是依赖于 libstdc++,libgcc等库的，例:
```bash
ldd /usr/local/clang-gnu/9.0.0/bin/clang
	/lib/ld-musl-x86_64.so.1 (0x7f3267395000)
	libstdc++.so.6 => /usr/lib/libstdc++.so.6 (0x7f3260a7a000)
	libgcc_s.so.1 => /usr/lib/libgcc_s.so.1 (0x7f3260a66000)
	libc.musl-x86_64.so.1 => /lib/ld-musl-x86_64.so.1 (0x7f3267395000)
```
这里，再次编译clang，使得新编译的clang不包含gnu相关的库。
```bash
export CC=/usr/local/clang-gnu/9.0.0/bin/clang
export CXX=/usr/local/clang-gnu/9.0.0/bin/clang++
rm -rf ./llvm-build-with-compiler-rt # clean last build
# 除安装路径外，cmake 命令选项同上(用gcc编译clang的cmake命令)
cmake -B./llvm-build-with-compiler-rt -H./llvm -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX=/usr/local/clang/9.0.0 \
    -DLLVM_ENABLE_PROJECTS="clang;compiler-rt" \
	-DCOMPILER_RT_BUILD_SANITIZERS=OFF \
	-DCOMPILER_RT_BUILD_XRAY=OFF \
	-DCOMPILER_RT_BUILD_PROFILE=OFF \
    -DCOMPILER_RT_BUILD_LIBFUZZER=OFF \
    -DCOMPILER_RT_USE_BUILTINS_LIBRARY=ON \
    -DCLANG_DEFAULT_CXX_STDLIB=libc++ \
    -DCLANG_DEFAULT_UNWINDLIB=libunwind \
    -DCLANG_DEFAULT_RTLIB=compiler-rt \
    -DLLVM_DEFAULT_TARGET_TRIPLE=x86_64-pc-linux-musl
cmake --build ./llvm-build-with-compiler-rt --target install -j 8
rm -rf /usr/local/clang-gnu/9.0.0 # clean last clang compiled by GNU compilers.
```

```bash
ldd /usr/local/clang/9.0.0/bin/clang
	/lib/ld-musl-x86_64.so.1 (0x7f06f8cf3000)
	libc++.so.1 => /usr/local/lib/libc++.so.1 (0x7f06f2e55000)
	libc++abi.so.1 => /usr/local/lib/libc++abi.so.1 (0x7f06f2df6000)
	libc.musl-x86_64.so.1 => /lib/ld-musl-x86_64.so.1 (0x7f06f8cf3000)
```

PS: 最后，也还可以可择地，用这个新的clang编译器将libunwind、libcxxabi、libcxx、compiler-rt、clang等重新编译一遍。

## 参考
- https://blogs.gentoo.org/gsoc2016-native-clang/
- https://blogs.gentoo.org/gsoc2016-native-clang/2016/05/06/build-a-gnu-free-c-program-on-gentoo/
- https://packages.gentoo.org/packages/sys-libs/libcxxabi
- https://packages.gentoo.org/packages/sys-libs/libcxx
- https://blogs.gentoo.org/gsoc2016-native-clang/category/gentoo/
- https://github.com/rust-lang/rust/issues/65051#issuecomment-537862559