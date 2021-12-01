---
title: HIP/CUDA wavefront 内线程通信中一些要注意的点
slug: cuda-warp-conmunication
author: genshen
authorURL: https://github.com/genshen
authorImageURL: https://avatars3.githubusercontent.com/u/11265498?s=460&v=4
tags: [performance, CUDA, HIP]
---

最近在用 HIP 写 SpMV（稀疏矩阵向量乘），在算法实现过程中，遇到了一些 wavefront/block 内线程通信的问题，在此记录下。

## 在条件语句中谨慎使用 __syncthreads 
我们都知道 `__syncthreads()` 可用于让 block 内的线程同步。  
在 AMD GPU 上（ROCm），__syncthreads 会被编译成 [`s_barrier`](https://llvm.org/docs/AMDGPU/AMDGPUAsmGFX9.html#id16) 指令（注：链接中的地址是 AMD GPU GFX9的内容），并加上必要的的全局访存(global memory) 和 LDS 访存 (shared memory) 的同步。

一般地，但 block 中的线程都会操作 LDS（如往其中写入数据），
但后续执行过程中，线程又需要用到 LDS 中的数据时（如从其中取数据），通常会在用数据之前加上 __syncthreads，
以保证前面**block 内所有的线程**操作 LDS 的步骤都已经完成了。

我们考虑下面这个示例代码：
```cpp {42,44}
#include <stdio.h>

constexpr int THREADS_PER_BLOCK = 256;
constexpr int N = 8;
constexpr int VECTOR_SIZE = 4;
constexpr int REDUCE_SIZE = 8;

__global__ void test_kernel(int *x, int *y, int alpha) {
  const int g_tid = threadIdx.x + blockDim.x * blockIdx.x; // global thread id

  const int g_bid = blockIdx.x; // global block id
  const int tid_in_block = g_tid % blockDim.x;

  __shared__ int SH[THREADS_PER_BLOCK];

  constexpr int VECTOR_NUM = THREADS_PER_BLOCK / VECTOR_SIZE; // vectors in block
  const int g_vector_id = g_tid / VECTOR_SIZE;
  const int tid_in_vector = g_tid % VECTOR_SIZE;
  const int vec_id_in_block = tid_in_block / VECTOR_SIZE;
  __shared__ int lds_y[VECTOR_NUM];

  int K = 0;
  for (int i = 0; i < N; i++) {
    const int index = i * THREADS_PER_BLOCK + g_tid;
    SH[tid_in_block] = x[index];
    __syncthreads(); // label:sync1:

    // reduce in vector
    if (vec_id_in_block < THREADS_PER_BLOCK / REDUCE_SIZE) { // label1:
      int sum = 0;
      for (int j = 0; j < REDUCE_SIZE / VECTOR_SIZE; j++) { // label2:
        const int lds_index = vec_id_in_block * REDUCE_SIZE + tid_in_vector + j * VECTOR_SIZE;
        sum += SH[lds_index];
      }
      for (int j = VECTOR_SIZE >> 1; j > 0; j >>= 1) {
        sum += __shfl_down(sum, j, VECTOR_SIZE);
      }
      // store sum value to y with memory coalescing
      if (tid_in_vector == 0) { // label3:
        lds_y[vec_id_in_block] = sum;
      }
    // }
    __syncthreads(); // label:sync2:
    // if (vec_id_in_block < THREADS_PER_BLOCK / REDUCE_SIZE) {
      if (tid_in_block < THREADS_PER_BLOCK / REDUCE_SIZE) { // label4:
        const int local_sum = lds_y[tid_in_block];
        y[K + tid_in_block] = alpha * local_sum;
      }
    }
    K += THREADS_PER_BLOCK / REDUCE_SIZE;
  }
}

int main() {
  constexpr int DATA_SIZE = THREADS_PER_BLOCK * N;
  int *hx = new int[DATA_SIZE];
  int *hy = new int[DATA_SIZE/REDUCE_SIZE];
  for (int i = 0; i < DATA_SIZE; i++) {
    hx[i] = i;
  }

  int *x = nullptr;
  int *y = nullptr;
  cudaMalloc(&x, DATA_SIZE * sizeof(int));
  cudaMalloc(&y, DATA_SIZE / REDUCE_SIZE * sizeof(int));
  cudaMemcpy(x, hx, DATA_SIZE * sizeof(int), cudaMemcpyHostToDevice);

  test_kernel<<<1, THREADS_PER_BLOCK>>>(x, y, 1);
  cudaDeviceSynchronize();
  cudaMemcpy(hy, y, DATA_SIZE / REDUCE_SIZE * sizeof(int), cudaMemcpyDeviceToHost);

  for (int i = 0; i < DATA_SIZE / REDUCE_SIZE; i++) {
    // let R <- REDUCE_SIZE;
    // hy[i] shoule be: R*(2*R*i+R-1)/2
    int R = REDUCE_SIZE;
    printf("%d\n", hy[i] == (R * (2 * R * i + R - 1) / 2));
  }
}
```

<!--truncate-->

上面的代码想实现的功能，等同于下面的 CPU 代码：
```cpp
constexpr int THREADS_PER_BLOCK = 256;
constexpr int N = 8;
constexpr int REDUCE_SIZE = 8;
constexpr int VECTOR_SIZE = 4;

constexpr int DATA_SIZE = THREADS_PER_BLOCK * N;
int *x = new int[DATA_SIZE];
int *y = new int[DATA_SIZE / REDUCE_SIZE];
for(int i = 0; i < DATA_SIZE; i++) {
    hx [i];
}

for(int i = 0; i < DATA_SIZE; i++) {
    int K = i / REDUCE_SIZE;
    y[K] += 1 * x [i]
}
```
即，将数组 x 中的元素，每 `REDUCE_SIZE` 个元素进行累加，结果写入数组 y。
为了高效计算，在 GPU 上我们不采用**让每个线程直接计算`REDUCE_SIZE` 个元素的加法**的方案，而是充分利用GPU的访存合并特性。
首先，各个线程地址连续地将数据加载进 LDS，然后再从 LDS 中读入数据，进行累加（称为 reduce 过程），最后将结果访存**连续地**写回数组 y。  

一个 Block 中有 `THREADS_PER_BLOCK` 个线程，在数据加载部分，每个线程每次只加载一个 int 的数据到 LDS 中；
reduce 部分，id 连续的每 `VECTOR_SIZE` 个线程组成一个 vector，并行地对 `REDUCE_SIZE` 个元素进行 reduce
（其中 VECTOR_SIZE < REDUCE_SIZE，且都是 2 的整数幂）。
这样，由于 LDS 中有 `THREADS_PER_BLOCK` 个数据，因此需要 `THREADS_PER_BLOCK/REDUCE_SIZE` 个 vector 进行 reduce
（见 label1处代码）。reduce 过程中，vector 内每个线程会计算 `REDUCE_SIZE / VECTOR_SIZE` 个数据的累加，
然后通过线程间通信的方式 `__shfl_down`，将 vector 内各线程累加的结果规约到该 vector 的第一个线程中(label3)。
为了保证数据写回部分也利用利用访存合并，我们再将各 vector 中的第一个线程的数据写入 LDS，
最后用 block 中前 `THREADS_PER_BLOCK / REDUCE_SIZE` 个连续的线程，将结果写回。  

以上是上述代码的大致流程。但是上面的计算结果可能是不对的。
即使 warp 内的线程（AMD GPU 中叫 wavefront）都是同时执行，但是不同 warp 间并不会同步。
我们将以上计算过程看成一系列的 LDS、计算及 `__syncthreads` 操作，存在一些 warp 进入 label1 处的 if，而一些 warp 不会进入 label1 处的 if 
（所谓进入是指，warp 内至少有一个线程的 if 条件为 true；而不进入是指 warp 内所有线程的 if 条件都为 false）。
对于不进入 label1 处 if 的 warp，其就不会执行 `label:sync2:` 处的 `__syncthreads` 操作；
如果进入 if，就会执行 `label:sync2:` 处的 `__syncthreads` 操作。
这样一来，就会造成 `__syncthreads` 操作的 “错位”。 warp A 还在 if 内读取 LDS，
而 warp B 可能已经执行下一轮的循环的 LDS 写入了（warp B 没进入 if）。
这样，就造成 warp A 在 `label:sync2:` 处进行 "barrier"，而 warp B 在 `label:sync1:` 处进行 "barrier"，
这就是前面说的“错位”的意思。
这种“错位”会造成 LDS 中的数据混乱。试想，warp A 很可能会读取到 warp B 在下一轮的循环中写入到 LDS 中的数据，这样就乱了。

其实，我们是期望 block 内所有的线程都可以在 `label:sync2:` 处同步一下。但是似乎和预期到不一样。
为了解决这个问题，***我们将以上代码中高亮的两行取消注释，使得 block 内所有的线程都会 `label:sync2:` 处进行同步***。
这里，用到的方法，就是将 if 代码块给拆开成两个 if 代码块，而 `__syncthreads` 操作放到 if 外面。
当然，对于上面的代码，如果外层循环如果仅执行一次（N=1时），似乎在条件语句中使用 `__syncthreads` 也是可以的，至少不会影响正确性。

总结来说，在条件语句中使用 `__syncthreads`，很可能会造成 "barrier" 的"错位"执行，
一般建议将 `__syncthreads` 放到 if 语句块的外面。
当然，这种建议也不一定是强制的。
