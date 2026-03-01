/// <reference types="vite/client" />

// 支持 .txt 文件的 ?raw 导入
declare module '*.txt?raw' {
    const content: string;
    export default content;
}

declare module '*.txt' {
    const content: string;
    export default content;
}
