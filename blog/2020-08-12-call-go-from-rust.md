---
id: call-go-from-rust
title: Rust 调用 Go 代码
author: genshen
# authorTitle: Front End Engineer @ Facebook
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [go, rust]
---

事情的起因是这样的。最近有个 rust 的[程序](https://github.com/misa-md/md-tools)，
想在 rust 代码中读取 [minio](https://min.io) (一种开源且兼容 AWS s3 api 的对象存储)中的文件，
但是无奈 rust 的 api [很不完善](https://github.com/minio/minio-rs/issues/8#issuecomment-529126752) 
且似乎现在也没啥维护（有一年没有更新了）。而另外一边，minio 的 go api 开发十分活跃且是最优先支持的。
因此我就想能不能让 rust 调用 go 的 minio api 来实现 minio 中的对象读取。  

虽然网络上面似乎也没太多相关的教程，但实际上也很容易做到。Rust 是一门面向底层开发的语言，其提供来很好的与 C 语言的互操作能力。
因此可以将 Go 代码中的相关函数导出为 C 语言的头文件声明，然后让 rust 像调用 C 一样间接地调用 Go 代码。 

<!--truncate-->
## Step 1: Go 代码
为例能够将 Go 代码导出为 C 语言的头文件，我们需要添加`import "C"` 和对应函数前面添加`export xxx`的注释。
如：  
```go title="api.go"
package main

import "C"
import (
	"fmt"
)

//export ReadMinioFile
func ReadMinioFile(path *C.char)
  fmt.Println("Hello " + C.GoString(path));
}

func main() {

}
```
这里还需要注意：1. 包名称必须为 main; 2. 必须有一个 main 函数(里面内容可以为空)。

为了进一步标准化，我们最好还需要在 Go 代码的同一目录下初始化一个 go.mod 文件，并指定包名。
```bash
# remember to change to your package name
go mod init github.com/misa-md/md-tools/src/ans/minio
```

然后就可以将 Go 代码编译为一个静态或者动态库，并生成对应的 .h 头文件了。例如静态库：
```bash
$ go build --buildmode=c-archive -o libapi.a
$ ls
 api.go go.mod go.sum libapi.a libapi.h
```

关于这部分导出 go 函数为 C 头文件的更多细节，可以查看网上的其他教程或文档 (如：https://medium.com/learning-the-go-programming-language/calling-go-functions-from-other-languages-4c7d8bcc69bf )。

## Step2: Rust call C
第二部分，就是让 rust 调用 C。这部分也有很多相关的文档可以参考:
- http://liufuyang.github.io/2020/02/02/call-c-in-rust.html
- https://rust-embedded.github.io/book/interoperability/c-with-rust.html#building-cc-code-with-the-cc-crate

由于我们需要调用的函数的实现并非在 rust 端，所以我们用 rust 的 `extern` 关键字来声明这些外部函数（这些声明称为 FFI bindings）。
这里有两种方式：第一种是手动根据 C 的头文件来手写这些函数声明 (主要是注意 C 和 Rust 的类型对应)，
这种方式对于简单的几个函数的情况可以适用，但函数多了很很费时费力且容易出错；第二种是使用 [bindgen](https://crates.io/crates/bindgen) 工具生成 Rust 的 FFI bindings。  

bindgen 工具有两种形式，一种是 library API, 另一种是 executable command-line API。
前者可以用于在 build.rs 文件中自动生成 FFI bindings，后者用于命令行下生成 FFI bindings。
例如采用后者的方式：
```bash
bindgen minio/libapi.h -o api_bindings.rs
```
然后就可以利用文件 libminio_api.rs 来实现对 Go 代码对调用了。  
这种方式虽然简单，但是还是需要手动执行命令，我们希望可以自动化完成。幸运的是，cargo 提供了 build.rs 文件，可以让我们将代码生成步骤放进 build.rs 文件中。下面将介绍这种方式

## Step3: 代码生成自动化
我们打开 cargo 工程目录 `build.rs` 文件，向里面添加如下内容：
```rust title="build.rs"
extern crate bindgen;

use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=src/ans/minio/api.go");

    // run `go build --buildmode=c-archive -o /path/to/save/libapi.a`
    let lib_out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    let mut cmd = Command::new("go");
    cmd.current_dir("src/ans/minio")
        .envs(env::vars())
        .args(&["build", "--buildmode=c-archive", "-o", format!("{}/{}", lib_out_path.display(), "libapi.a").as_str()]);

    let status = match cmd.status() {
        Ok(status) => status,
        Err(e) => panic!(format!("failed to execute command: {:?}\nerror: {}", cmd, e)),
    };
    assert!(status.success());

    // see https://github.com/golang/go/issues/11258 if there is linking error
    println!("cargo:rustc-link-search={}", lib_out_path.display());
    println!("cargo:rustc-link-lib=static=api");

    // Configure and generate bindings.
    let bindings = bindgen::Builder::default()
        .header(format!("{}/{}", lib_out_path.display(), "libapi.h").as_str())
        .generate()
        .expect("unable to generate bindings");

    // Write the generated bindings to an output file.
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings.write_to_file(out_path.join("api_bindings.rs"))
        .expect("Couldn't write bindings!");
}
```
在 build.rs 的 main 函数中:
- 通过 [cargo:rerun-if-changed](https://doc.rust-lang.org/cargo/reference/build-scripts.html) 告诉 cargo, 当 go 代码改变时，build.rs 会重新编译并执行。  
- 随后当代码块，即是利用`std::process::Command`来执行 go build 命令(并指定在哪个目录下执行命令)，以生成静态库 libapi.a 和对应当 .h 头文件。  
  其中生成当静态库和头文件位于变量 `lib_out_path` 指定的 out 目录 (位于构建目录下的一个out目录中)，这样生成当代码就不会和程序代码混在一块了。  
- 中间的两个 `println!` 宏：[cargo:rustc-link-search](https://doc.rust-lang.org/cargo/reference/build-scripts.html#rustc-link-search) 指定链接时，库 libapi.a 的搜索路径；[cargo:rustc-link-lib](https://doc.rust-lang.org/cargo/reference/build-scripts.html#rustc-link-lib) 指定链接库的类型(statis/dylib) 和名称。
- bindgen: 最后采用 bindgen 从 .h 头文件生成 rust 的 FFI bindings。生成的 
  FFI bindings 文件 `api_bindings.rs` 也同样放在 out 目录下。

这里，最后一步是将代码放置到构建目录下的out目录，对应 rust 程序使用可能会不方便引入。
因此，我们在 rust 工程的代码目录中，建立一个文件 `minio_api.rs`，将 FFI bindings 包含进来：
```rust title="minio_api.rs"
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

include!(concat!(env!("OUT_DIR"), "/api_bindings.rs"));
```

至此，我们将 step1 的 go build 步骤和第二步的步骤都放到了 build.rs 文件中，实现的代码生成的自动化，且能够依据文件变化自动更新。

## One moew thing
我们在 Go 代码中，可能会调用一些 C 的函数，如 `C.free` 函数 (即 C 的 free 函数)，需要引入一些头文件，如 `stdlib,h`：
```go title="api.go" {4}
package main

/*
#include <stdlib.h>
*/
import "C"

//export ReleaseMinioFile
func ReleaseMinioFile(data *C.char) {
	defer C.free(unsafe.Pointer(data)) release memory
}

func main() {
}
```

这样会导致一个小问题，后面执行 bindgen 时，会将 stdlib.h 里面的各种函数和类型声明也转化为 FFI bindings，
放到生成的 rust 中，导致生成的 rust 文件非常冗长 (有3000多行，如果没有加入 stdlib.h 则只有300行左右)。  
如果我们仅仅使用标准库头文件中的少数的几个函数，可以不引入头文件，仅声明一下即可：
如：
```go title="api.go" {4}
package main

/*
void free (void* ptr);
*/
import "C"
...
```
