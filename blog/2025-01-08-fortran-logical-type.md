---
slug: fortran-logical-type
title: Fortran77 编译器对 Logical 的处理
authors: [genshen]
tags: [compiler, CUDA, Linux]
# image: ./img/social-card.png
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

在Fortran 77 中，可以使用 Logical 类型的变量来表示 .true. 或者 .false.。
实际上，是采用4字节（64位）来存储 Logical。
对于Intel ifort 编译器和 GNU 下的 gfortran 编译器，.true. 的表示会有所不同：

| 编译器 | .true. | .false. |
|--| -- | -- |
| Intel ifort | 0xFFFFFFFF（全1） | 0x00000000 |
| GNU gfortran |  0x00000001 | 0x00000000 |

参考：https://stackoverflow.com/a/61597485

<!--truncate-->

由于这两类编译器对 .true. 的处理不同，导致最近遇到一个bug。
这里为了方便表述，进行了一些简化。
考虑如下的代码：
```fortran
c test.f
c 编译选项：
c intel: -fpp -r8 -fpconstant
c gfortran: -std=legacy -cpp -fdefault-real-8 -fdefault-double-8

      subroutine test(la,lb)

      LOGICAL LA,LB

      IF (LB) THEN
          write(6,*) 'LA is true.'
      ELSE
         IF (.NOT.LA) THEN
            write(6,*) 'LA is true, but enter here', LA
         ENDIF
      ENDIF
      return
      END
```
```cpp
// main.c
typedef unsigned int C_logical;
void test_(C_logical *la, C_logical *lb);

int main() {
    C_logical la = 0xFFFFFFFF; // intel: .true.
    C_logical lb = 0;
    test_(&la, &lb);
}
```
以上代码，在 Intel Fortran 编译器下，必然没问题（不输出任何内容）。但是在 GNU gfortran 下，则会输出“LA is true, but enter here T”。
我们虽然知道 gfortran下的 .true. 是另一种形式，但疑惑的是这里传递 0xFFFFFFFF，为何会进入`IF(.NOT. LA)` 这个条件分支且输出 LA 是 “T”。我们尚不清楚这其中的细节。

为了一探究竟，我们决定看下 gfortran 下的汇编代码。这里提供一个更简单的例子，来探索 gfortran 和 ifort 对 .true. 的处理方式：
```fortran
      PROGRAM NOT_EXAMPLE
      LOGICAL :: A
      INTEGER :: X, Y

      ! Initialize variables
      A = .TRUE.
      X = 1
      Y = 2

      ! Conditional statement using .NOT.
      IF (.NOT. A) THEN
         X = 16
c         write(6,*) 'A', A
      ELSE
         Y = 32
      ENDIF

      END PROGRAM NOT_EXAMPLE
```


<Tabs>
<TabItem value="intel" label="Intel ifort">

```armasm showLineNumbers
; ifort -O0 -fpp -r8 -fpconstant -S ./m.f -o m.s
; mark_description "Intel(R) Fortran Intel(R) 64 Compiler Classic for applications running on Intel(R) 64, Version 2021.3.0 Buil";
; mark_description "d 20210609_000000";
; mark_description "-O0 -fpp -r8 -fpconstant -S -o m.s";

..B1.2:                         # Preds ..B1.1
                                # Execution count [0.00e+00]
        movl      $-1, -16(%rbp) ; ref in content
        movl      $1, -12(%rbp) ; X = 1
        movl      $2, -8(%rbp) ; Y = 2
        movl      -16(%rbp), %eax
        testb     $1, %al  ; IF(.NOT. A)
        jne       ..B1.4

..B1.3:
        movl      $16, -12(%rbp ; X=16
        jmp       ..B1.5

..B1.4:
        movl      $32, -8(%rbp)   ; Y =32
..B1.5:                         
        movl      $0, %eax
        leave
    .cfi_restore 6
        ret
```

</TabItem>
<TabItem value="gnu" label="GNU gfortran">

```armasm showLineNumbers
; gfortran -std=legacy -cpp -fdefault-real-8 -fdefault-double-8  -S ./m.f -o m.s
    .file   "m.f"
    .text
    .type   MAIN__, @function
MAIN__:
.LFB0:
    .cfi_startproc
    pushq   %rbp
    .cfi_def_cfa_offset 16
    .cfi_offset 6, -16
    movq    %rsp, %rbp
    .cfi_def_cfa_register 6
    movl    $1, -4(%rbp) ; ref in content
    movl    $1, -8(%rbp) ; X= 1
    movl    $2, -12(%rbp) ; Y = 2
    movl    -4(%rbp), %eax
    xorl    $1, %eax  ; if(.NOT. A) : 与立即数 1 进行异或
    testl   %eax, %eax
    je  .L2
    movl    $16, -8(%rbp)  ; X = 16
    jmp .L4
.L2:
    movl    $32, -12(%rbp)  ; Y = 32
.L4:
    nop
    popq    %rbp

# more code truncated
```

</TabItem>

</Tabs>

可以看出，在 ifort 下，.true. 是 -1（也即 0xFFFFFFFF，汇编代码第8 行）;
而在 gfortran 下，.true. 是 1（也即 0x00000001，汇编代码第 13 行）。

而对于 if 中的比较操作，ifort 采用 `testb $1, %al` 指令，其只检测变量 A 最低位是否为1。
（具体来说是，al 寄存器是 eax 寄存器的低 8 位，testb 指令将立即数 1 和 %al 寄存器的内容进行按位与，并设置标志位ZF。
如果按位与的结果为 0，则 ZF 被设置为 1；否则，ZF 被设置为 0。这里，A 是 .true，按位与的结果非零，ZF 被设置为 0，然后jne指令进行跳转（ZF位0，jne指令会跳转）。）
而 gfortran 采用 `xorl $1, %eax` 指令，即直接将变量 A 与立即数 1 进行比较，看是否相等。
（即先进行异或，并将异或的结果存在 eax 中（即变量A 与 1 相等则 eax 为0，否则 eax 非零），再通过 testl 判断 eax 是否为0 并设置ZF位；最后依据 ZF 进行跳转。）

这也就解释了，gfortran 下，先前的代码，即使传递 0xFFFFFFFF，也仍然会进入`IF(.NOT. LA)` 这个条件分支了（因为 0xFFFFFFFF 与 1 不相等）。
至于gnu 下值为 "0xFFFFFFFF"的 LA，为什么输出为 “T”，这部分依赖于标准库的 `_gfortran_transfer_logical_write`，暂时还未进行详细的剖析，暂时留个悬念。
