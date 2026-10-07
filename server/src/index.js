import { config } from './config.js';
import { createApp } from './app.js';

createApp().listen(config.port, () => {
  console.log(`KhangShop API đang chạy tại http://localhost:${config.port}`);
});
