---
title: Cross Building Mingw-w64 Toolchain on macOS
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [toolchain, gcc, windows, mingw]
---

In this blog, we will show the steps of building Mingw-w64 on macOS system.
In fact, we can install mingw-w64 corss building toolchain by [homebrew](https://formulae.brew.sh/formula/mingw-w64) package manager.
Here, we jsut analysis the building steps of mingw-w64 toolchain, and it can be easily migrated to linux system.

## Overview
We need to build following tools/libraries:
- binutils:  "Binutils is a collection of binary programming tools used to assemble, link and manipulate binary and object files.", like gnu linker `ld`, gnu assembler `as`, `nm`, `ar` and `strings`. see [more](https://www.gnu.org/software/binutils/).
- [texinfo](https://www.gnu.org/software/texinfo): [Apple's makeinfo is old and has bugs](https://github.com/Homebrew/homebrew-core/blob/master/Formula/mingw-w64.rb). It be only used as building dependency.
- gcc: compiler for c/c++/fortran language.
- [mingw-w64](http://mingw-w64.org): "The mingw-w64 project is a complete runtime environment for gcc to support binaries native to Windows 64-bit and 32-bit operating systems.". Provide windows api headers, runtime and other tools.
<!--truncate-->

## Build texinfo
```bash
wget https://ftp.gnu.org/gnu/texinfo/texinfo-6.7.tar.gz
# wget https://mirrors.ustc.edu.cn/gnu/texinfo/texinfo-6.7.tar.gz
tar zxvf texinfo-6.7.tar.gz
cd texinfo-6.7
./configure --prefix=$HOME/.local/develop/mingw-w64/texinfo
make
make install
```
Then set `PATH` env to load this tool:
```bash
export PATH=$HOME/.local/develop/mingw-w64/texinfo/bin:$PATH
```

## Build binutils
```bash
wget https://ftp.gnu.org/gnu/binutils/binutils-2.34.tar.xz
# wget https://mirrors.ustc.edu.cn/gnu/binutils/binutils-2.34.tar.gz
tar zxvf binutils-2.34.tar.gz
cd binutils-2.34
mkdir binutils-build && cd binutils-build
```
```bash
# in binutils-build directory
prefix=$HOME/.local/develop/mingw-w64/toolchain-x86_64
../configure --prefix=${prefix} \
    --target=x86_64-w64-mingw32 --enable-targets=x86_64-w64-mingw32 \
    --with-sysroot=${prefix}  --disable-multilib
make
make install
```
Then set `PATH` env to load binutils tools:
```bash
export PATH=$prefix/bin:$PATH
ln -s $prefix/x86_64-w64-mingw32 $prefix/mingw
```

## Copy mingw-w64 headers
```bash
wget https://downloads.sourceforge.net/project/mingw-w64/mingw-w64/mingw-w64-release/mingw-w64-v7.0.0.tar.bz2
# or download from https://github.com/mirror/mingw-w64 release
tar xvjf mingw-w64-v7.0.0.tar.bz2
cd mingw-w64-7.0.0/mingw-w64-headers/
mkdir headers-build
cd headers-build
```
```bash
# in headers-build directory
../configure --prefix=$prefix/x86_64-w64-mingw32 --host=x86_64-w64-mingw32
make
make install
```

## Build gcc
```bash
wget https://ftp.gnu.org/gnu/gcc/gcc-9.2.0/gcc-9.2.0.tar.gz
# wget https://mirrors.ustc.edu.cn/gnu/gcc/gcc-9.2.0/gcc-9.2.0.tar.gz
tar zxvf gcc-9.2.0.tar.gz
cd gcc-9.2.0
./contrib/download_prerequisites # download gmp mpfr mpc and isl, you can also edit this script to change base_url to use a mirror.
mkdir gcc-build
cd gcc-build
```
```bash
# in gcc-build directory
../configure --prefix=${prefix} \
    --with-sysroot=${prefix} \
    --target=x86_64-w64-mingw32 \
    --enable-languages=c,c++,fortran \
    --with-ld=${prefix}/bin/x86_64-w64-mingw32-ld
    --with-as${prefix}/bin/x86_64-w64-mingw32-as
    --disable-multilib \
    --enable-threads=posix
make all-gcc -j 8
make install-gcc
```
If we run `make all`, then error `pthread.h is not found` will happen.  
So winpthreads must be built befor finishing building gcc.

## Build the mingw-w64 runtime
```bash
cd mingw-w64-7.0.0/mingw-w64-crt/
mkdir build-crt
cd build-crt
```

```bash
# in build-crt
../configure --prefix=$prefix/x86_64-w64-mingw32 \
    --with-sysroot=$prefix/x86_64-w64-mingw32 \
    --host=x86_64-w64-mingw32 \
    --disable-lib32 \
    --enable-lib64 \
    CC=x86_64-w64-mingw32-gcc \
    CXX=x86_64-w64-mingw32-g++ \
    CPP=x86_64-w64-mingw32-cpp
make
make install
```

## Build the winpthreads library
```bash
cd mingw-w64-7.0.0/mingw-w64-libraries/winpthreads/
mkdir winpthreads-build
cd winpthreads-build
```
```bash
# in winpthreads-build
../configure --prefix=$prefix/x86_64-w64-mingw32 \
    --with-sysroot=$prefix/x86_64-w64-mingw32 \
    --host=x86_64-w64-mingw32 \
    CC=x86_64-w64-mingw32-gcc \
    CXX=x86_64-w64-mingw32-g++ \
    CPP=x86_64-w64-mingw32-cpp
make
make install
```

## Finish building GCC (runtime libraries)
```bash
cd gcc-9.2.0/gcc-build
make -j 8
make install
```

## Go for it
We have following source file, named main.cc
```cpp
#include <stdio.h>
#include <windows.h>
int main() {
    puts("Hello world!");
    MessageBox(NULL, TEXT("Hello GUI!"), TEXT("HelloMsg"), 0);
return 0;
}
```
Build it:
```bash
x86_64-w64-mingw32-g++ main.cc # it will produce `a.exe` file.
```
