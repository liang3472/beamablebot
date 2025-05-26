import chalk from 'chalk';
import puppeteer from 'puppeteer-extra';
import userAgentPlugin from 'puppeteer-extra-plugin-stealth/evasions/user-agent-override/index.js';
import { Mutex } from 'async-mutex';
import { sleep } from './utils.js';
import axios from 'axios';
import proxyManager from './proxy/index.js';
import { WRDO_AK } from './config.js';


const mutex = new Mutex();

let ChromeLauncher;
import('chrome-launcher').then((module) => {
  ChromeLauncher = module;
});

class Helper {
  constructor() { }

  async startProxy(taskId, ipType, config) {
    const { ip, port, username, password } = config;
    const release = await mutex.acquire();
    let url = await proxyManager.createServer(taskId, ipType, ip, port, username, password);
    release();
    return url;
  }

  async stopProxy(taskId) {
    console.log('stopProxy taskId:', taskId);
    proxyManager.stop(taskId);
  }

  async getBrowser(headless, proxyUrl, extraArgs) {
    const chromePath = ChromeLauncher.Launcher.getInstallations();

    const argArr = [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--no-startup-window',
      '--no-first-run',
      '--disabled-setupid-sandbox',
      '--disable-infobars',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--force-webrtc-ip-handling-policy',
      '--disable-extensions',
      '--disable-setuid-sandbox',
      '--no-zygote',
      '--disable-notifications',
      '--disable-dev-shm-usage',
      '--disable-web-security',
    ];
    puppeteer.use(userAgentPlugin({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' }));

    argArr.push(...(extraArgs || []));
    if (proxyUrl) {
      argArr.push('--proxy-server=' + proxyUrl);
    }

    const browser = await puppeteer.launch({
      headless,
      executablePath: chromePath[0],
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null,
      args: argArr,
      waitForInitialPage: false,
    });

    const pages = await browser.pages();
    if (pages.length > 1) {
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    }

    await sleep(2000);
    return browser;
  }

  async createEmail(email) {
    const options = {
      method: 'POST',
      headers: {
        "content-Type": "application/json",
        "wrdo-api-key": WRDO_AK
      },
      data: {
        emailAddress: email,
      },
      url: 'https://wr.do/api/v1/email',
    };
    return await axios(options).then(res => res.data);
  }

  async getEmailMessage(email, match) {
    const options = {
      method: 'GET',
      headers: {
        "content-Type": "application/json",
        "wrdo-api-key": WRDO_AK
      },
      params: {
        emailAddress: email,
        page: 1,
        size: 10,
      },
      url: 'https://wr.do/api/v1/email/inbox',
    };
    return await axios(options).then(res => ({
      text: res?.data?.list?.[0]?.text?.match(match)?.[0],
      date: res?.data?.list?.[0]?.date,
    }));
  }

  async waitEmailMessage(email, match) {
    return new Promise(async (resolve, reject) => {
      let retry = 0;
      let maxRetries = 3;
      let message;
      while (retry < maxRetries) {
        try {
          message = await this.getEmailMessage(email, match);
          if (!message) {
            continue;
          }
          const currentTime = new Date();
          const messageTime = new Date(message.date);
          messageTime.setSeconds(messageTime.getSeconds() + 20); // Add 10 seconds to the message time
          if (currentTime > messageTime) {
            // If the current time is greater than the message time plus 10 seconds, retry
            retry += 1;
            await sleep(10 * 1000);
            console.log(chalk.yellow('⏳ 重试中...'));
            continue;
          } else {
            // If the current time is not greater than the message time plus 10 seconds, resolve
            console.log(chalk.green('✅ 收到信息'));
            resolve(message);
            return;
          }
        } catch (error) {
          console.log(chalk.red('❌ 信息接收失败'));
          reject(error);
          return;
        }
      }
      reject(new Error(`Exceeded maximum retries of ${maxRetries}`));
    });
  }
}

export default Helper;