import http from 'http';
import url from 'url';
import socks from 'socks';
import { EventEmitter } from 'events';
import SocksProxyAgent from 'socks-proxy-agent';

class HttpProxy extends EventEmitter {
  constructor(options) {
    super();

    // Default options
    this.defaultOptions = {
      listenHost: 'localhost',
      listenPort: 12333,
      socksHost: 'localhost',
      socksPort: 1080
    };

    // Default proxy settings
    this.defaultProxy = {
      ipaddress: '127.0.0.1',
      port: 7890,
      type: 5
    };

    // Merge provided options with defaults
    this.options = { ...this.defaultOptions, ...options };

    // Configure proxy with credentials
    this.proxy = {
      ipaddress: this.options.socksHost,
      port: this.options.socksPort,
      type: 5,
      userId: this.options.socksUsername || '',
      password: this.options.socksPassword || ''
    };
  }

  _request(proxy, userRequest, userResponse) {
    try {
      const parsedUrl = url.parse(userRequest.url);
      const socksAgent = new SocksProxyAgent.SocksProxyAgent(
        `socks://${proxy.userId}:${proxy.password}@${proxy.ipaddress}:${proxy.port}`
      );

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path,
        method: userRequest.method || 'GET',
        headers: userRequest.headers,
        agent: socksAgent,
        timeout: 30000
      };

      const proxyRequest = http.request(requestOptions);

      proxyRequest.on('timeout', () => {
        proxyRequest.destroy();
        userResponse.writeHead(504);
        userResponse.end('Request timeout\n');
        this.emit('request:error', new Error('Request timeout'));
      });

      proxyRequest.on('response', proxyResponse => {
        proxyResponse.on('error', error => {
          this.emit('request:error', error);
          userResponse.writeHead(500);
          userResponse.end('Response error\n');
        });

        proxyResponse.pipe(userResponse);
        userResponse.writeHead(proxyResponse.statusCode, proxyResponse.headers);
        this.emit('request:success');
      });

      proxyRequest.on('error', error => {
        userResponse.writeHead(500);
        userResponse.end('Connection error\n');
        this.emit('request:error', error);
      });

      userRequest.on('error', error => {
        this.emit('request:error', error);
        proxyRequest.destroy();
      });

      userRequest.pipe(proxyRequest);

    } catch (error) {
      this.emit('request:error', error);
      userResponse.writeHead(500);
      userResponse.end('Internal server error\n');
    }
  }

  _connect(proxy, userRequest, userSocket, userHead) {
    try {
      const parsedUrl = url.parse(`http://${userRequest.url}`);
      const connectionOptions = {
        proxy,
        destination: {
          host: parsedUrl.hostname,
          port: parsedUrl.port ? +parsedUrl.port : 80
        },
        command: 'connect',
        timeout: 30000
      };

      const cleanupSockets = (socket1, socket2) => {
        try {
          if (socket1) {
            socket1.unpipe();
            socket1.destroy();
          }
          if (socket2) {
            socket2.unpipe();
            socket2.destroy();
          }
        } catch (error) {
          this.emit('connect:error', error);
        }
      };

      socks.SocksClient.createConnection(connectionOptions, (error, proxySocket) => {
        if (error) {
          cleanupSockets(userSocket);
          userSocket?.write(`HTTP/${userRequest.httpVersion} 500 Connection error\r\n\r\n`);
          this.emit('connect:error', error);
          return;
        }

        if (!proxySocket || !proxySocket.socket) {
          cleanupSockets(userSocket);
          userSocket?.write(`HTTP/${userRequest.httpVersion} 500 Invalid socket connection\r\n\r\n`);
          this.emit('connect:error', new Error('Invalid socket connection'));
          return;
        }

        const socket = proxySocket.socket;

        socket.on('error', error => {
          this.emit('connect:error', error);
          cleanupSockets(socket, userSocket);
        });

        userSocket.on('error', error => {
          this.emit('connect:error', error);
          cleanupSockets(socket, userSocket);
        });

        socket.on('timeout', () => {
          this.emit('connect:error', new Error('Connection timeout'));
          cleanupSockets(socket, userSocket);
        });

        socket.on('end', () => {
          cleanupSockets(socket, userSocket);
        });

        userSocket.on('end', () => {
          cleanupSockets(socket, userSocket);
        });

        socket.setTimeout(30000);
        socket.pipe(userSocket);
        userSocket.pipe(socket);

        try {
          socket.write(userHead);
          userSocket.write(`HTTP/${userRequest.httpVersion} 200 Connection established\r\n\r\n`);
          this.emit('connect:success');
          socket.resume();
        } catch (error) {
          this.emit('connect:error', error);
          cleanupSockets(socket, userSocket);
        }
      });
    } catch (error) {
      this.emit('connect:error', error);
      cleanupSockets(null, userSocket);
    }
  }

  start() {
    this.server = http.createServer();

    this.server.on('error', error => {
      console.error('Server error:', error);
      this.emit('server:error', error);
    });

    console.log(`Socks server listening on ${this.options.listenHost}:${this.options.listenPort}`);

    this.server.on('request', (...args) => this._request(this.proxy, ...args));
    this.server.on('connect', (...args) => this._connect(this.proxy, ...args));

    return this.server.listen(this.options.listenPort, this.options.listenHost);
  }
}

const createSocksServer = (options) => {
  console.log(
    `Listen on ${options.listenHost}:${options.listenPort}, ` +
    `and forward traffic to ${options.socksHost}:${options.socksPort}`
  );

  const proxy = new HttpProxy(options);
  return proxy.start();
}

export default createSocksServer;