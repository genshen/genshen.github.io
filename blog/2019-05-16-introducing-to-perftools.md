---
title: Introduction to Perftools
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [performance, linux]
---

[Perftools](https://github.com/gperftools/gperftools)是Google推出的一款CPU Profile及内存、堆栈分析工具。
本文将主要介绍其中的CPU Profile。


gperftools工具还可以生成火焰图🔥,火焰图十分方便找出程序的性能瓶颈。

![](/img/blog/flame_graph.svg)

<!--truncate-->

此外，需要注意区分两个项目: https://github.com/google/pprof, https://github.com/gperftools/gperftools,
前者主要面向go的, C++的项目用会存在一些问题(如函数名显示"__ZN14ItlRatesSolver6deltaEER7LatticeS1_N12LatticeTypes8lat_typeE"),C++项目用后者。

## 安装 perftools

### homebrew 安装
```bash
brew install perftools
```

### 从源码编译安装:
```bash
./configure --prefix=/usr/local/develop/gperftools/2.7 --disable-dependency-tracking
make 
make install
```
设置环境变量:
```bash
## gperftool 2.7
export GPERFTOOL_HOME=/usr/local/develop/gperftools/2.7
export PATH=$GPERFTOOL_HOME/bin:$PATH
export C_INCLUDE_PATH=$GPERFTOOL_HOME/include:$C_INCLUDE_PATH
export CPLUS_INCLUDE_PATH=$GPERFTOOL_HOME/include:$CPP_INCLUDE_PATH
export LIBRARY_PATH=$GPERFTOOL_HOME/lib:$LIBRARY_PATH
export LD_LIBRARY_PATH=$GPERFTOOL_HOME/lib:$LD_LIBRARY_PATH
```

## 安装 graphviz
graphviz主要用于gperftools结果的可视化，例如生成svg树形图片。 

### homebrew 安装
```bash
brew install graphviz
```

### 从源码编译安装:
```bash
./configure --prefix=/usr/local/develop/graphviz/2.40.1
make 
make install
```

设置环境变量:
```bash
## graphviz 2.40.1
export GRAPHVIZ_HOME=/usr/local/develop/graphviz/2.40.1
export PATH=$GRAPHVIZ_HOME/bin:$PATH
export C_INCLUDE_PATH=$GRAPHVIZ_HOME/include:$C_INCLUDE_PATH
export CPLUS_INCLUDE_PATH=$GRAPHVIZ_HOME/include:$CPP_INCLUDE_PATH
export LIBRARY_PATH=$GRAPHVIZ_HOME/lib:$LIBRARY_PATH
export LD_LIBRARY_PATH=$GRAPHVIZ_HOME/lib:$LD_LIBRARY_PATH
```


## 使用
见: https://gperftools.github.io/gperftools/cpuprofile.html。  

## 编译并执行程序

### 编译时链接`profiler`库

链接目标程序时，加上`-lprofiler`以链接profiler库, 最好编译和链接加上`-g`参数(虽然pprof不加-g参数也可以用)。  
如果程序使用cmake构建，可以:
```cmake
# link google profile tool
SET(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -lprofiler")

add_executable(my_exe main.cpp)
# target_link_libraries(my_exe PRIVATE third_part_libs)
```
```bash
cmake path/to/project -DCMAKE_BUILD_TYPE=Debug # debug构建会加上-g参数.
```

执行程序，其中`CPUPROFILE`环境变量指定cpu profile的文件路径:
```bash
CPUPROFILE=my_exe.prof ./my_exe
```
### 使用`LD_PRELOAD`环境变量
另一种运行程序的方式是使用`LD_PRELOAD`环境变量。在编译阶段使用`-lprofiler`链接profiler库，而是在运行时使用`LD_PRELOAD`环境变量指定。
```bash
LD_PRELOAD="/usr/local/develop/gperftools/2.7/lib/libprofiler.so" CPUPROFILE=my_exe.prof ./my_exe
```
这种方式对于**MPI**程序十分有用，因为在MPI环境下(多进程同时运行，且profile文件相同)编译时链接profiler库的方式似乎无法正确生成profile文件。而LD_PRELOAD的方式可以为每一个MPI进程生成一个profile文件(my_exe.prof.1 my_exe.prof.2 ...)。

## 分析
```bash
pprof --web ./my_exe my_exe.prof # show svg in your browser.
```

```bash
pprof --top ./my_exe my_exe.prof
Total: 20655 samples
    3859  18.7%  18.7%     6951  33.7% bond::FeX_comp
    3125  15.1%  33.8%    16763  81.2% bond::Edumb
    2483  12.0%  45.8%     3120  15.1% NormalLatticeList::get1nn
    2333  11.3%  57.1%     2461  11.9% LatticeTypes::isDumbbell
    1185   5.7%  62.9%     1562   7.6% LatticesList::get2nnStatus
    1101   5.3%  68.2%     1101   5.3% LatticesList::getLat
    1056   5.1%  73.3%     4132  20.0% LatticesList::get1nn
    1047   5.1%  78.4%     1049   5.1% LatticesList::get1nnBoundaryStatus
    1042   5.0%  83.4%     1711   8.3% LatticesList::get2nn
     903   4.4%  87.8%      903   4.4% NormalLatticeList::get2nn
```

生成用于产生[火焰图]( http://www.brendangregg.com/flamegraphs.html)的collapsed stacks:
```bash
pprof --collapsed  ./my_exe my_exe.prof > collapsed-stacks.txt
```

## 火焰图
参见: https://github.com/brendangregg/FlameGraph   

开始之前确保您的系统上安装了perl(mac上已经预装了).  
### 安装 FlameGraph
```bash
git clone git@github.com:brendangregg/FlameGraph.git
export PATH=/my/clone/dir/FlameGraph:$PATH
```
### 生产火焰图
```bash
flamegraph.pl ./collapsed-stacks.txt > flame_graph.svg
```

![](/img/blog/flame_graph.svg)
