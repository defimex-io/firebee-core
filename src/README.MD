# FIRE BEE 测试报告

## 节点配置

测试网络环境为本地单节点环境，开启挖矿，并且不出空块，rpc 端口为 19585

创世区块： 

```json
{
  "config": {
    "chainId": 0,
    "Block": 0
  },
  "coinbase": "0x0000000000000000000000000000000000000000",
  "nBits": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "nonce": "0x0000000000000042",
  "extraData": "Let credit flow unprecedented,let infinite imagination possible,let infinite value can be reflected,To every corner of the planet.",
  "hashBlock": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "timestamp": 1562548148,
  "alloc": {
    "incubateAmount": [
      {
        "addr": "1PpBHEx782C4VrtnQcJRTogn5UYmzCWAPH",
        "balance": 35765823
      }
    ],
    "initAmount": [
      {
        "addr": "1PpBHEx782C4VrtnQcJRTogn5UYmzCWAPH",
        "balance": 35765823
      },
      {
        "addr": "1AJuWsi83jDFXxk5h7c83zhYjGfGJvVNjd",
        "balance": 10000000
      },
      {
        "addr": "1KRQ6bYBFghXWk8opHzCpENxzDHPF8npfV",
        "balance": 10000000
      },
      {
        "addr": "18PHh1yLX7HTXqX2oWhkiJmY2NWhb2bA17",
        "balance": 10000000
      },
      {
        "addr": "14jCZUfpywtZnimj4T1rgKh8pjyL4WW37g",
        "balance": 10000000
      },
      {
        "addr": "1PCy75hB5V6276ky7r3zeb5CAc9UD4DqLq",
        "balance": 10000000
      },
      {
        "addr": "1M8jHScegmwBv1ffobp7LwPuGLGpkxzMAE",
        "balance": 10000000
      },
      {
        "addr": "1P539tNSqCLaHcH8k12UJX7ES9LeuqHViP",
        "balance": 10000000
      },
      {
        "addr": "1PShMQMqFT4N4s1gnrgDtiwfYUxKAUB7Ac",
        "balance": 10000000
      },
      {
        "addr": "1JAhM3yHHcrjPPWwFEB8CCFEYY4NiDzkay",
        "balance": 10000000
      },
      {
        "addr": "18aoMT4fQxrrcq6JLuJQBdJ3jJJQaNigKv",
        "balance": 10000000
      },
      {
        "addr": "1M2gWaGwt99FJqJ9qAu6N7Z5sTA1nz2bMD",
        "balance": 10000000
      },
      {
        "addr": "1ZS6oCZFrbQkzUYmULCNDZDossqWfV65c",
        "balance": 10000000
      },
      {
        "addr": "1Bnq8W6MFsrDmtnESRhV1r8SWsEkBPGzsB",
        "balance": 10000000
      },
      {
        "addr": "1CKXtZ3nMX7JoYzycWzX9jb8VJzofpYcSq",
        "balance": 10000000
      },
      {
        "addr": "1M8j7NXSVUwfYTQt1wuVo4VDcdCXXE4Efg",
        "balance": 10000000
      },
      {
        "addr": "11qg9pSSsZc2F9QaiE61eAnmomptKkfP7",
        "balance": 10000000
      },
      {
        "addr": "1DnB3yVmxX5kYvGuYHmXsRxMXg4FKmcQJD",
        "balance": 10000000
      },
      {
        "addr": "12J3SHmYZ639PsSWVKSfZgdhUazTghnKmC",
        "balance": 10000000
      },
      {
        "addr": "1Cehek5xu2PZPRnf2FZjqtrjNcszePp16C",
        "balance": 10000000
      },
      {
        "addr": "1NRSPBydAASXDud4K35XkmHCcRNwQM6naQ",
        "balance": 10000000
      },
      {
        "addr": "1GnQs9YWCX84Xp7dTfTk3ZNhVLAdYuoX5y",
        "balance": 10000000
      }
    ],
    "userIncubateAmount": []
  }
}
```

validators.json

```json
[
  "wisdom://1AJuWsi83jDFXxk5h7c83zhYjGfGJvVNjd@120.76.101.153:19585"
]
```

节点配置文件

```yaml
spring:
  datasource:
    url: 'jdbc:postgresql://localhost:5432/wisdom_test'
    username: 'postgres'
    password: '******'

  jpa:
    hibernate:
      ddl-auto: create # create, update
    show-sql: false # enable jpa sql logs


p2p:
  address: 'wisdom://localhost:9585'
  #bootstraps: 'wisdom://localhost:9585'

miner:
  coinbase: '1AJuWsi83jDFXxk5h7c83zhYjGfGJvVNjd'
  validators: 'local-a/test-validators.json'
  allow-empty-block: 'false'

wisdom:
  consensus:
    genesis: 'local-a/test-genesis.json'
    block-interval: '5'
    enable-mining: 'true'
    fast-sync:
      directory: ''
  database:
    type: 'memory'
    directory: 'database/local-1'



transaction:
  day:
    count: 20
```

节点启动命令

```shell script
java -jar wisdom-core.jar --spring.config.location=classpath:application.properties,local.yml
```

## 测试过程

### 环境

1. 操作系统：macOS Catalina 10.15.7

### 操作步骤

1. USER1 部署，设置 USER1 为 owner

```shell script
METHOD=deploy USER=1 node -r ts-node/register test/firebee-test.ts
```

返回结果

```js
let result = {
  blockHeight: 1,
  blockHash: '5f703d16856173b098e7346d4dac15bb3ed0133313c16e1490e19b844fe00603',
  gasUsed: 1392,
  result: '17nZYvyDVPazZKLf1Ph33APAbxU6YygqoU',
  transactionHash: 'beb481c6f6b35d0ec1c8054dfa0972575be980ed957a6529b99b87f86e24d098',
  fee: 278400000,
  method: 'init',
  inputs: {
    ownerAddress: '1KRQ6bYBFghXWk8opHzCpENxzDHPF8npfV',
    blackHoleAddress: 'WX1111111111111111111115vGLbG'
  }
}
```

消耗 2.784 个 wdc，全部用于支付手续费

通过执行

```shell script
METHOD=wdc USER=1 node -r ts-node/register test/firebee-test.ts
``` 

查看到部署后 USER1 余额为 999999721600000

查询 owner = 1KRQ6bYBFghXWk8opHzCpENxzDHPF8npfV
```shell script
METHOD=getOwner CONTRACT_ADDRESS=node -r ts-node/register test/firebee-test.ts
``` 


查询用户信息，显示所有矩阵已经激活

```shell script
METHOD=user USER=1 node -r ts-node/register test/firebee-test.ts
```


- 2, 3, 4 推荐 1 

```shell script
METHOD=register USER=2 REFERRER= 1 node -r ts-node/register test/firebee-test.ts
METHOD=register USER=3 REFERRER= 1 node -r ts-node/register test/firebee-test.ts
METHOD=register USER=3 REFERRER= 1 node -r ts-node/register test/firebee-test.ts
```

### 多用户同时注册

```shell script
METHOD=deploy USER=1 node -r ts-node/register test/firebee-test.ts
METHOD=race node -r ts-node/register test/firebee-test.ts
```