---
slug: swift-signal
title: 一起段错误引起的纷争(信号捕获)
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [go, mac]
---

最近在升级一个用 swift 写的 mac 平台的 [app](https://github.com/genshen/wssocks-plugin-ustb)，其中的核心代码是用 Go 写的。
因此，需要在 swift 端调用 Go 代码。
这个倒是有现成的方案，就是将 Go 的 api 导出为 C api，然后在 swift 端调用 C 的 api 即可。

问题就出在跨语言调用这块，调用核心的 Go api 时，直接给抛出了一个 `EXC_BAD_ACCESS` 错误:
```log
error: memory read failed for 0x0
Thread 7: EXC_BAD_ACCESS (code=1, address=0x4).
```
<!--truncate-->

## 最小 demo 复现
经过一系列的排查，创建了一个小 demo 工程，大概可以将我们程序简化为以下三个文件：
```go
// main.go
package main

import "C"
import (
	"fmt"
	"net/url"
)

type Options struct {
	LocalHttpAddr string
	RemoteUrl     *url.URL
}

//export GoApi
func GoApi() {
    opt := Options{
		LocalHttpAddr: "http addr",
		RemoteUrl: nil,
	}
	fmt.Println(opt)
}

func main() {
	// GoApi()
}
```
```
/* file module.modulemap */
module GoApi {
    header "go-api/libgo_api.h"
    link "go_api"
    export *
}
```
```swift
//  main.swift
import Foundation
import GoApi

GoApi()
print("Hello world")
```
其中，`main.go` 可以通过如下命令导出为 C 的头文件和静态库：
```bash
go build --buildmode=c-archive -o libgo_api.a
```

在 xcode 里面运行 swift 程序，直接`EXC_BAD_ACCESS`了。
但是，奇怪的是，如果直接运行 Go 程序或者用 C 语言来调用 Go api，却是正常运行的。

## 进一步研究
虽然上述的 Go 程序或者用 C 语言程序，在终端下运行是正常结束的，但是如果用 lldb/gdb，确实会看到`EXC_BAD_ACCESS`。
```log
$ lldb ./build/Debug/demo
(lldb) target create "./build/Debug/demo"
r
Current executable set to '/Users/xxxx/Desktop/tmp/hello/demo/build/Debug/demo' (x86_64).
(lldb) r
Process 6167 launched: '/Users/xxxx/Desktop/tmp/hello/demo/build/Debug/demo' (x86_64)
Process 6167 stopped
* thread #1, queue = 'com.apple.main-thread', stop reason = EXC_BAD_ACCESS (code=1, address=0x8)
    frame #0: 0x000000010008f800 demo`net/url.(*URL).String + 64
my`net/url.(*URL).String:
->  0x10008f800 <+64>: movq   0x8(%rax), %rcx
    0x10008f804 <+68>: movq   (%rax), %rbx
    0x10008f807 <+71>: testq  %rcx, %rcx
    0x10008f80a <+74>: je     0x10008f955               ; <+405>
Target 0: (my) stopped.
```

随后就去 Go 官方仓库提了个 [issue](https://github.com/golang/go/issues/51140) 问了下，最后得到的答复是，
Go 解 `nil` 引用的时候，确实会引发 panic，但是是可恢复的 panic，是符合预期的。
但是 swift 端却捕获了这个 signal，并停止了程序的运行（即，甩锅给 swift）。

另外，需要注意的一点是，调试工具似乎会先于程序捕获 signal (see https://github.com/dhatbj/SignalRecovery#instructions)。
这也是为什么上述 lldb 能够看到异常(panic 先被 lldb 捕获，而程序没有捕获)，而直接运行程序却没有看到异常（panic直接被程序捕获）。

问题似乎就这样解决了？
xcode 里运行程序，可能也是 debug 模式，panic 会先被 xcode 捕获。
这样，带来的麻烦就是，我没法在 xcode 里运行或者调试程序了，因为 xcode 会把正常的 panic 当成不可恢复的错误来处理，
直接让整个程序停掉了。
该问题解决方式可以按照[这里](https://github.com/dhatbj/SignalRecovery#instructions)给出的方案，在 "Scheme" 中取消勾选 "Debug executable"。
经测试，可用。
