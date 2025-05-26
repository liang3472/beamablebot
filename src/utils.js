import pRetry from 'p-retry';
import solanaWeb3 from '@solana/web3.js';
import bs58 from "bs58";

export const print = (...args) => {
  console.log(`[${new Date().toLocaleString('zh-CN', { hourCycle: 'h23' })}]`, ...args);
};

export const sleep = (t = 200) => new Promise(resolve => setTimeout(resolve, t));

export const retry = async (fn, options = {}) => {
  const defaultOptions = {
    retries: 5,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true,
    onRetry: (error, attempt) => {
      console.warn(`Retry attempt ${attempt}: ${error.message}`);
    }
  };

  const retryOptions = { ...defaultOptions, ...options };

  return pRetry(fn, retryOptions);
}

export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const genWallets = (num) => {
  const wallets = [];
  for (let i = 0; i < num; i++) {
    const wallet = solanaWeb3.Keypair.generate();
    wallets.push({
      address: wallet.publicKey.toString(),
      pk: bs58.encode(wallet.secretKey),
    });
  }
  return wallets;
}