## beamable 邀请脚本


### 使用
1、安装依赖
```
npm install
```
2、配置变量.env, 参考.env_simple
```
# https://wr.do/
WRDO_AK=WRDO的AK
LIMIT=并发数量(默认1)
CODES=邀请码(多个邀请码“，”分开)
EACH_COUNT=每个邀请码邀请数量(默认10个)

# https://share.cliproxy.com/share/2jvdtuw5j
CLIPROXY_USERNAME=cliproxy的用户名
CLIPROXY_PASSWORD=cliproxy的密码
CLIPROXY_KEY=cliproxy的key

# https://dashboard.capsolver.com/
CAPSOLVER_AK=capsolver的AK
```

3、启动
```
npm start
```