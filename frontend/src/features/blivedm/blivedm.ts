// 获取当前环境变量，假设为PRODUCT_ENV
const environment = process.env.NODE_ENV;

// 定义基础URL
let baseUrl = "";
if (environment === "development") {
  baseUrl = ":8000";
} else if (environment === "production") {
  baseUrl = "/api/chatbot";
} else {
  throw new Error("未知环境变量");
}


export async function connect(): Promise<WebSocket> {
    const hostname = window.location.hostname;
    const wsUrl = `ws://${hostname}${baseUrl}/ws/`;
    console.log(`尝试连接WebSocket: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('WebSocket连接已建立');
        socket.send(JSON.stringify({
            type: 'connection',
            message: 'connection success'
        }));
    };
    
    socket.onclose = (event) => {
        console.log('WebSocket连接已关闭:', event);
        // 重新连接，每隔1秒尝试一次
        setTimeout(() => {
            console.log('正在重新连接...');
            connect(); // 重新调用connect()函数进行连接
        }, 1000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
    };
    
    return socket;
}
