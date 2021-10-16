---
slug: install-hip-in-CUDA-env
title: 在 CUDA 环境下安装 HIP
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [toolchain, compiler, cuda, DCU, hpc]
---

HIP (Heterogeneous-Compute Interface for Portability) 是 AMD 开发的一款异构计算的接口工具。
HIP 允许只用写一套代码(hip代码), 就可以将程序同时在 NVIDIA GPU 和 AMD GPU 及 DCU 上编译运行。
> HIP is a C++ Runtime API and Kernel Language that allows developers to create portable applications for AMD and NVIDIA GPUs from single source code.

HIP 的 API 和 CUDA 的API十分类似，例如 CUDA 中内存拷贝用`cuMemory`, 在 hip 中用`hipMemcpy`，且参数也十分一致。
因此，会 CUDA 的开发者可以很轻松地转移到 hip 上。
并且，hip 还提供了[hipfy 工具](https://github.com/ROCm-Developer-Tools/HIPIFY)，将 CUDA 代码转换为 hip 代码。  
HIP 在不降低性能的前提下，统一了CUDA API 和AMD GPU 编程API，可谓极大地降低了各个平台的适配与移植工作，
做到了一套代码，在多个异构平台上运行。
可以说, "舍弃 CUDA，进入HIP时代"。

那么，在 NV GPU下，如何安装并使用 hip 呢？

<!--truncate-->

NVIDIA GPU下，为了能有用上HIP，也还是需要 CUDA SDK的，所以需要提前配置好相关驱动 和 CUDA 环境，
可参考[官方文档](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/index.html)。
以下我们默认 CUDA 安装在 `/usr/local/cuda-10.2` 目录下。

有了 CUDA 后，我们就可以安装 HIP 了。

## 安装 clang
默认情况下，HIP 使用 hcc 来编译处理过后的 hip 代码的，当然也可以换成用 HIP-Clang。

注意⚠️:   
1. 从这个[文档](https://rocm-documentation.readthedocs.io/en/latest/Programming_Guides/Programming-Guides.html#deprecation-notice)中可以看到（所以用 HIP 准没错）：
  > AMD is deprecating HCC to put more focus on HIP development and on other languages supporting heterogeneous compute.

2. 在 AMD GPU 下，编译 hip 代码，有两种方式，分别是 hcc 编译器和正在开发中的 HIP-clang编译器(写本文的时候其基本可用)。

我们这里使用 hip-clang，因此需要提前编译好 clang 工具链。此外，还需要准备编译器(如 gcc)和 cmake(建议3.11版及以后版本) 用来构建 llvm 和 clang 。
这里clang 选择从源代码编译（也可以通过包管理器）。
首先下载 llvm/clang源代码，这里用的 [12.0.0](https://github.com/llvm/llvm-project/releases/tag/llvmorg-12.0.0) 版本。
```bash
wget https://github.com/llvm/llvm-project/archive/llvmorg-12.0.0.tar.gz
tar -zxvf llvmorg-12.0.0.tar.gz
cd llvmorg-12.0.0
cmake -B./llvm-build -S./llvm -DCMAKE_INSTALL_PREFIX=~/.local/llvm \
    -DCMAKE_BUILD_TYPE=Release -DLLVM_ENABLE_ASSERTIONS=1 \
    -DLLVM_ENABLE_PROJECTS='clang;compiler-rt;lld;' \
    # -DLLVM_LINK_LLVM_DYLIB=ON \
    -DLLVM_TARGETS_TO_BUILD='AMDGPU;X86'
cmake --build ./llvm-build --target install
cd ~/.local/bin
ln -s ~/.local/llvm/bin/* ./ # now we can find clang in $PATH
```
:::note
这里，未开启 ***LLVM_LINK_LLVM_DYLIB***选项，主要是为了后续将可执行文件拷贝到其他机器上也可以直接运行，
而不用处理动态连接库不兼容的问题。  
作者实际上编译了 `clang;compiler-rt;lldb;libcxx;libcxxabi;libunwind;lld;openmp;` 模块，
包括 libcxx, libcxxabi, libunwind, openmp。
并且还开启了如下的选项：`-DCLANG_DEFAULT_CXX_STDLIB=libc++ -DCLANG_DEFAULT_UNWINDLIB=libunwind -DCLANG_DEFAULT_RTLIB=compiler-rt`。  
在第一轮编译完成之后，再用编译出来的 clang 编译一遍 llvm，并作为最终的编译器版本。 
另：如果第二遍编译时有类似于 `undefined reference to 'fmax'` 的错误，可以写个 clang-wrapper 脚本，强制 -lm 链接。
:::
更多可参考 https://aur.archlinux.org/cgit/aur.git/tree/PKGBUILD?h=llvm-amdgpu (blob: b898d4b02926f06d5d1d70832a2024bc40a6cecc)
https://rocmdocs.amd.com/en/latest/ROCm_Compiler_SDK/ROCm-Compiler-SDK.html#roc-device-library

## 编译 ROCm
HIP 依赖于 AMD ROCm，所以还需要安装 ROCm。
> ROCm is a collection of software ranging from drivers and runtimes to libraries and developer tools. 

ROCm 中包含hip需要的 hsa 等工具。

### 获取 ROCm 源代码
可根据[官方教程](https://rocmdocs.amd.com/en/latest/Installation_Guide/Installation-Guide.html#getting-the-rocm-source-code)来从源代码安装，也可以使用系统的包管理器安装。 
开始之前，需要使用 repo 工具来获取源码。  
```bash
mkdir -p ~/.local/bin/
# https://code.google.com/archive/p/git-repo
curl https://storage.googleapis.com/git-repo-downloads/repo > ~/.local/bin/repo
chmod a+x ~/.local/bin/repo
```
关于 repo 可参考：https://source.android.google.cn/setup/develop/repo
上面下载了一个简单的叫repo的shell脚本. 这其实只是个皮。
真正的repo也就是python的脚本 (需要 python3 环境执行), 要用repo init来下载。
init 步骤会去 google code 上克隆 repo 代码仓库，放到当前的 .repo 目录下。  
由于国内网络原因，可以使用[清华镜像](https://mirrors.tuna.tsinghua.edu.cn/help/git-repo)

```bash
mkdir ROCm-4
cd ROCm-4
REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo' repo init -u https://github.com/RadeonOpenCompute/ROCm.git -b roc-4.2.x
repo sync
```
:::note
如果 github 连接有困难，可采用镜像站点（如`https://github.com.cnpmjs.org`）, `-u` 参数替换为
https://github.com.cnpmjs.org/RadeonOpenCompute/ROCm.git。  
完成后，编辑 `.repo/manifests/default.xml` 文件，替换 github.com 为镜像地址。
:::

这里我们获取最新的 4.2.0 分支的代码，然后用repo下载其他相关的git仓库。  
可以看下ROCm 中都有哪些组件：
```log
5.8G	./.repo
8.4M	./AMDMIGraphX
410M	./openmp-extras
7.8M	./HIP
554M	./HIP-Examples
3.1M	./rccl
17M	./rdc
5.4M	./rocALUTION
207M	./rocBLAS
3.1M	./HIPIFY
322M	./MIOpen
3.2M	./rocFFT
3.0M	./rocPRIM
12M	./rocRAND
4.4M	./rocSOLVER
9.9M	./rocSPARSE
12M	./rocThrust
292K	./rocm-cmake
224K	./rocm_bandwidth_test
7.5M	./rocm_smi_lib
84K	./rocminfo
2.3M	./rocprofiler
180K	./rocr_debug_agent
4.8M	./roctracer
1.5M	./MIOpenGEMM
185M	./MIVisionX
5.5M	./RCP
12K	./ROC-smi
1.2G	./ROCK-Kernel-Driver
4.7M	./ROCR-Runtime
17M	./ROCT-Thunk-Interface
4.5M	./ROCclr
1.2M	./ROCdbgapi
450M	./ROCgdb
844K	./ROCm-CompilerSupport
3.5M	./ROCm-Device-Libs
8.5M	./ROCm-OpenCL-Runtime
3.9M	./ROCmValidationSuite
72M	./Tensile
1.7M	./atmi
52K	./clang-ocl
588K	./half
7.5M	./hipBLAS
1.6M	./hipCUB
592K	./hipFFT
5.1M	./hipSPARSE
9.0M	./hipfort
1.1G	./llvm-project
11G	./
```

### 构建准备
获取源码后，就可以通过源代码来编译 ROCm 来，但是官方并没有给出详细的构建 ROCm 栈的文档，
目前找到一篇[相关的博客](https://www.nathanotterness.com/2019/01/setting-up-amds-rocm-from-source.html) (_链接🔗已失效_)，可以作为参考。

我们这里，设置 ROCm 安装目录为 `$HOME/.local/rocm`，默认的安装目录是`/opt/rocm`，但是普通用户可能没有写权限。  
这里设置安装路径和构建编译器环境变量，下面会用到。
```bash
export ROCM_BUILD_DIR=`pwd`
export ROCM_INSTALL_DIR=$HOME/.local/rocm
export CC=clang
export CXX=clang++
# export AMDGPU_TARGETS="gfx906"
```

然后还需要安装一些依赖库，如 pkg-config [libelf-dev](http://elfutils.org/) [libnuma-dev](https://github.com/numactl/numactl) [libpci-dev](https://mj.ucw.cz/sw/pciutils/)
```bash
# build libelf
# ref: https://git.alpinelinux.org/aports/tree/main/elfutils/APKBUILD
wget https://sourceware.org/elfutils/ftp/0.179/elfutils-0.179.tar.bz2
tar xjvf elfutils-0.179.tar.bz2
cd elfutils-0.179
./configure --prefix=$HOME/.local/ --disable-debuginfod # --disable-nls
make
make install
```

```bash
# build libpci-dev
# ref: https://git.alpinelinux.org/aports/tree/main/pciutils/APKBUILD
wget https://mj.ucw.cz/download/linux/pci/pciutils-3.6.4.tar.gz
tar zxvf pciutils-3.6.4.tar.gz
cd pciutils-3.6.4
vi Makefile # add '-fPIC' as compile flags
make install SHARED=yes PREFIX=$HOME/.local/
install -D -m 644 lib/libpci.pc $HOME/.local/lib/pkgconfig/libpci.pc
install -D -m 644 lib/config.h $HOME/.local/include/pci/config.h
install -D -m 644 lib/header.h $HOME/.local/include/pci/header.h
install -D -m 644 lib/pci.h $HOME/.local/include/pci/pci.h
install -D -m 644 lib/types.h $HOME/.local/include/pci/types.h
ln -s $HOME/.local/lib/libpci.so.3 $HOME/.local/lib/libpci.so
```
我们将这些库都安装在`~/.local`下，因此需要设置相关环境变量:
```bash
export PKG_CONFIG_PATH=$HOME/.local/lib/pkgconfig:$PKG_CONFIG_PATH
export C_INCLUDE_PATH=$HOME/.local/include:$C_INCLUDE_PATH
export LD_LIBRARY_PATH=$HOME/.local/lib:$LD_LIBRARY_PATH
export LIBRARY_PATH=$HOME/.local/lib:$LIBRARY_PATH
```

### 构建 ROCT-Thunk-Interface
```bash
cd ROCT-Thunk-Interface
cmake -DCMAKE_BUILD_TYPE=Release -B./roct-thunk-interface-build -S./ -DCMAKE_INSTALL_PREFIX=$ROCM_INSTALL_DIR
cmake --build ./roct-thunk-interface-build --target install install-dev
cd ../
```
### rocm-cmake
https://github.com/xuhuisheng/rocm-build/blob/master/13.rocm-cmake.sh
```bash
cmake -DCMAKE_BUILD_TYPE=Release -B./build -S./ -DCMAKE_INSTALL_PREFIX=$ROCM_INSTALL_DIR
cmake --build ./build && cmake --install ./build
```
### ROCm-Device-Libs
```bash
cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=$ROCM_INSTALL_DIR -B./build -S./
cmake --build ./build && cmake --install ./build
```

### 构建 ROCR-Runtime
```bash
cd ROCR-Runtime/src
cmake -DCMAKE_BUILD_TYPE=Release -B./rocm-runtime-build -S./ -DCMAKE_INSTALL_PREFIX=$ROCM_INSTALL_DIR \
    -DLIBELF_INCLUDE_DIRS=$HOME/.local/include
cmake --build ./rocr-runtime-build  --target install
cd ../../
```


## 编译 HIP
HIP 源代码可以从github下载：https://github.com/ROCm-Developer-Tools/HIP/releases, 如 hipclang-4.2.0。
也可以用上面 ROCm 源码包里面的HIP代码。  
这里为了保持和ROCm版本相一致，使用后者(hip 版本为 rocm-4.2.0)。

为了可用的编译工具，还需要安装好 cmake(建议3.11版及以后版本), clang 需要能够支持 c++11。  
下面开始编译 hip 并安装到`~/.local/hip`下:  
```bash
cd HIP-hipclang-4.2.0
cmake -B./hip-build -S./ -DHIP_COMPILER=clang -DHIP_PLATFORM=nvidia \
    -DROCM_PATH=$ROCM_INSTALL_DIR \ #-DHSA_PATH=$ROCM_INSTALL_DIR/hsa
    -DCMAKE_INSTALL_PREFIX=$ROCM_INSTALL_DIR
cmake --build ./hip-build --target install
```

对于 4.2.0 似乎需要修改一个头文件
```diff
inline static hipError_t hipMemRangeGetAttributes(void** data, size_t* data_sizes,
                                                  hipMemRangeAttribute* attributes,
                                                  size_t num_attributes, const void* dev_ptr,
                                                  size_t count) {
-    auto attrs = hipMemRangeAttributeTocudaMemRangeAttribute(*attributes);
+    cudaMemRangeAttribute attrs = hipMemRangeAttributeTocudaMemRangeAttribute(*attributes);
    return hipCUDAErrorTohipError(cudaMemRangeGetAttributes(data, data_sizes, &attrs,
        num_attributes, dev_ptr, count));
}
```
## 使用 HIP
我们使用这个例子： https://github.com/ROCm-Developer-Tools/HIP-Examples/blob/master/vectorAdd

```bash
export CUDA_PATH=/software/nvidia/cuda/10.1/
export ROCM_PATH=$HOME/.local/rocm/
export HIP_PLATFORM=nvidia
export HIP_CLANG_PATH=$HOME/.local/llvm/
hipcc vectoradd_hip.cpp -o vec_add
./vec_add
```
编译完成后，就可以在GPU上运行这个向量加法程序了。

参考：
- https://github.com/ROCm-Developer-Tools/HIP/blob/master/INSTALL.md#building-hip-from-source
- https://mightynotes.wordpress.com/2017/03/01/install-amd-hip-on-nvidia-platform/
- https://www.nathanotterness.com/2019/01/setting-up-amds-rocm-from-source.html

