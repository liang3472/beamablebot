import chalk from 'chalk';
import pLimit from 'p-limit';
import path from 'path';
import fs from 'fs';
import Helper from './helper.js';
import { LIMIT, EACH_COUNT, CODES, CAPSOLVER_AK } from './config.js';
import { print, sleep, genWallets } from '../src/utils.js';
import { initIps, getIp } from './ipPool.js';

const helper = new Helper();
// 打码插件 Captcha Solver
const extensionId = 'pgojnojmmhpofjgdmaebadhbocahppod';

let currentIndex = 0;
const init = async (wallet, index) => {
    const config = getIp();
    try {
        await helper.createEmail(wallet.email);
    } catch (error) { }

    const proxyUrl = await helper.startProxy(index, 'socks5', config);
    const extensionPath = path.resolve(`./${extensionId}/1.15.5_0`);
    const browser = await helper.getBrowser(true, proxyUrl, ['--disable-extensions-except=' + extensionPath]);
    const page = await browser.newPage();
    await page.setViewport({
        width: 1024,
        height: 768,
        deviceScaleFactor: 1,
    });

    await page.goto(`chrome-extension://${extensionId}/www/index.html#/popup`);
    await page.evaluate(() => {
        chrome.storage.local.set({
            config: {
                "apiKey": CAPSOLVER_AK,
                "appId": "",
                "awsCaptchaMode": "click",
                "awsCollapse": false,
                "awsDelayTime": 0,
                "awsRepeatTimes": 10,
                "blackUrlList": [
                    ""
                ],
                "cloudflareCollapse": false,
                "cloudflareDelayTime": 0,
                "cloudflareMode": "click",
                "cloudflareRepeatTimes": 10,
                "datadomeCollapse": false,
                "datadomeDelayTime": 0,
                "datadomeMode": "click",
                "datadomeRepeatTimes": 10,
                "enabledForAwsCaptcha": true,
                "enabledForBlacklistControl": false,
                "enabledForCloudflare": true,
                "enabledForDataDome": false,
                "enabledForGeetestV4": false,
                "enabledForHCaptcha": false,
                "enabledForImageToText": true,
                "enabledForRecaptcha": true,
                "enabledForRecaptchaV3": true,
                "funCaptchaCollapse": false,
                "funCaptchaDelayTime": 0,
                "funCaptchaMode": "click",
                "funCaptchaRepeatTimes": 10,
                "geetestCollapse": false,
                "geetestDelayTime": 0,
                "geetestMode": "click",
                "geetestRepeatTimes": 10,
                "hCaptchaCollapse": false,
                "hCaptchaDelayTime": 0,
                "hCaptchaMode": "click",
                "hCaptchaRepeatTimes": 10,
                "hostOrIp": "",
                "isInBlackList": false,
                "isInit": true,
                "manualSolving": false,
                "port": 0,
                "proxyLogin": "",
                "proxyPassword": "",
                "proxyType": "http",
                "reCaptcha3Collapse": false,
                "reCaptcha3DelayTime": 0,
                "reCaptcha3Mode": "token",
                "reCaptcha3RepeatTimes": 10,
                "reCaptcha3TaskType": "ReCaptchaV3TaskProxyLess",
                "reCaptchaCollapse": false,
                "reCaptchaDelayTime": 0,
                "reCaptchaMode": "click",
                "reCaptchaRepeatTimes": 10,
                "recaptchaV3MinScore": 0.5,
                "solvedCallback": "captchaSolvedCallback",
                "textCaptchaCollapse": false,
                "textCaptchaDelayTime": 0,
                "textCaptchaMode": "click",
                "textCaptchaModule": "common",
                "textCaptchaRepeatTimes": 10,
                "textCaptchaResultAttribute": "capsolver-image-to-text-result",
                "textCaptchaSourceAttribute": "capsolver-image-to-text-source",
                "useCapsolver": true,
                "useProxy": false
            }
        });
    });
    await sleep(3 * 1000);

    let hasError = false;
    try {
        console.log(`使用邀请码：${wallet.code}`);
        currentIndex += 1;
        await page.goto(`https://hub.beamable.network/ref/${wallet.code}`,
            { timeout: 10 * 60 * 1000 });
        const status = await page.evaluate(() => document.querySelector('h1')?.innerText);
        if (status === '403 Forbidden') {
            throw new Error('403 Forbidden');
        }
        await page.bringToFront();
        await sleep(1000);

        const check = await Promise.race([
            page.waitForSelector('xpath//html/body/div/div[1]/div/div/div/div/div/div/div/form/div[2]/altcha-widget/div/div/div[1]/input',
                { timeout: 10 * 60 * 1000 }),
            page.waitForSelector('xpath//html/body/div/div[1]/div/div/div/div/div/div/div/form/div[2]/altcha-widget/div/div/div[1]/input',
                { timeout: 10 * 60 * 1000 })
        ]);

        const input = await Promise.race([
            page.waitForSelector('xpath//html/body/div/div[1]/div/div/div/div/div/div/div/form/input[1]',
                { timeout: 10 * 60 * 1000 }),
        ]);
        input.type(wallet.email,
            { delay: 50 }),
            await sleep(1000);

        await check.click();
        await sleep(5000);


        await page.click('xpath//html/body/div/div[1]/div/div/div/div/div/div/div/form/button',
            { timeout: 10 * 60 * 1000 });
        await sleep(3000);

        const textContent = await page.waitForSelector(`xpath//html/body/div/div[1]/div/div/div/div/div/div[2]/div/div/div`,
            { timeout: 10 * 60 * 1000 });
        const text = await page.evaluate(element => element.textContent, textContent);
        console.log(text);
        if (text === 'Check your email for a verification link') {
            const message = await helper.waitEmailMessage(wallet.email, /https:\/\/[^\s]+/);
            console.log('message:', message);
            const authPage = await browser.newPage();
            await authPage.goto(message.text,
                { timeout: 10 * 60 * 1000 });
            await authPage.bringToFront();
            await sleep(3 * 1000);
            authPage.close();
        }

        await sleep(3 * 1000);
    } catch (error) {
        console.error(error);
        hasError = true;
    } finally {
        await helper.stopProxy(index);
        await page.close();
        await browser.close();
    }

    if (hasError) {
        throw new Error('发生异常');
    } else {
        fs.appendFileSync('output.txt', `✅{ code: '${wallet.code}', email: '${wallet.email}', address: '${wallet.address}', pk: '${wallet.pk}' },` + '\n', (err) => {
            if (err) {
                console.error(`保存失败! ${err}`);
            } else {
                console.log('保存成功!');
            }
        });
    };
}

const exec = async (wallet, index) => {
    await init(wallet, index);
}

const loop = async (list) => {
    let errors = [];
    print(chalk.yellow(`初始化ip池ing...`));
    await initIps(list.length);
    const limit = pLimit(+LIMIT);
    const promises = list.map(async (wallet, index) => {
        return limit(async () => {
            try {
                print(chalk.yellow(`⏳ 序号: ${index} ${wallet?.address} ing...`));
                await exec(wallet, index);
            } catch (error) {
                console.error(error);
                errors.push(wallet);
            }
        })
    });
    await Promise.all(promises);

    if (errors.length) {
        print(chalk.red(`❌ 失败${errors.length}个`));
        await loop(errors);
    } else {
        print(chalk.green(`✅ 执行完成`));
    }
}

(async () => {
    const acounts = [];
    for (let code of CODES) {
        const wallets = genWallets(EACH_COUNT);
        print(chalk.green(`为邀请码 ${chalk.yellow(code)} 生成${chalk.yellow(wallets.length)}个钱包`));
        acounts.push(...wallets.map(wallet => ({ code, email: wallet.address.substr(10, 10).toLocaleLowerCase() + '@wr.do', ...wallet })));
    }
    console.log(acounts)
    await loop(acounts);
})();
