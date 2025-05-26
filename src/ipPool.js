import axios from "axios";
import { CLIPROXY_PASSWORD, CLIPROXY_USERNAME, CLIPROXY_KEY } from './config.js';

const IP_CONF = {
  CLI: {
    username: CLIPROXY_USERNAME,
    password: CLIPROXY_PASSWORD,
    pk: CLIPROXY_KEY,
    initIps: (num) => {
      return axios.get(`https://api.cliproxy.com/traffic/api?key=${IP_CONF.CLI.pk}&username=${IP_CONF.CLI.username}&password=${IP_CONF.CLI.password}&region=rand&type=sticky&t=5&num=${num}&format=3`, {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "priority": "u=0, i",
        },
        referrerPolicy: "strict-origin-when-cross-origin",
        mode: "cors",
        credentials: "omit"
      })
        .then(res => res.data.split('\n'))
        .then(res => {
          return ip_pool = (res || []).map(row => {
            const arr = row.split('@');
            const userInfo = arr[0].split(':');
            const ipInfo = arr[1].split(':');
            console.log({ username: userInfo[0], password: userInfo[1], ip: ipInfo[0], port: ipInfo[1] })
            return { username: userInfo[0], password: userInfo[1], ip: ipInfo[0], port: ipInfo[1] }
          })
        });
    }
  },
}

const USE_IP = IP_CONF['CLI'];

export const username = USE_IP.username;
export const password = USE_IP.password;

let ip_pool = [];
export const initIps = USE_IP.initIps;

export const getIpPool = () => {
  return ip_pool;
}

let current = 0;

export const getIp = () => {
  let index = current % ip_pool.length;
  const ip = ip_pool[index];
  current = index + 1;
  return ip;
}