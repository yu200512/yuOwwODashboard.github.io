// server.js (你的本地后端代码)
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors()); // 允许前端跨域请求

// 创建一个 API 接口供前端调用
app.get('/api/random-wallpaper', async (req, res) => {
    try {
        // 1. 配置壁纸引擎的“超级卡池” (包含分类名称和它们的最大页数)
        const categories = [
            { name: 'anime', pages: 22 },
            { name: 'nature', pages: 13 },
            { name: 'games', pages: 17 },
            { name: 'pixel-art', pages: 3 }
        ];

        // 2. 随机抽取一个分类
        const selectedCategory = categories[Math.floor(Math.random() * categories.length)];

        // 3. 根据抽中分类的最大页数，随机抽取页码
        const randomPageNum = Math.floor(Math.random() * selectedCategory.pages) + 1;
        
        // 4. 智能拼接网址
        let listUrl = `https://wallsflow.com/live-wallpapers/${selectedCategory.name}`;
        if (randomPageNum > 1) {
            listUrl = `https://wallsflow.com/live-wallpapers/${selectedCategory.name}/page/${randomPageNum}/`;
        }

        console.log(`🎲 正在抓取 [${selectedCategory.name}] 分类的第 ${randomPageNum} 页...`);

        // 5. 请求随机出来的列表页 (带上伪装面具)
        const myHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        };
        const { data } = await axios.get(listUrl, { headers: myHeaders });
        const $ = cheerio.load(data);
        
        const wallpaperLinks = [];
        
        // 6. 【核心修改】这里的抓取规则也必须变成动态的！只抓取当前选中分类的链接
        $(`a[href*="/live-wallpapers/${selectedCategory.name}/"][href$=".html"]`).each((i, el) => {
            const link = $(el).attr('href');
            if (link && !wallpaperLinks.includes(link)) {
                wallpaperLinks.push(link);
            }
        });

        if (wallpaperLinks.length === 0) {
            return res.status(404).json({ error: "没抓取到壁纸链接，可能是网站结构变了" });
        }

        // 3. 随机选一个详情页
        const randomLink = wallpaperLinks[Math.floor(Math.random() * wallpaperLinks.length)];
        
        // 4. 再次请求详情页，获取真实的 .mp4 视频源地址
        const detailPage = await axios.get(randomLink);
        const $$ = cheerio.load(detailPage.data);
        
        // 精准定位含有 video-lazy 类的 video 标签，找到它内部的 source 标签
        // 为了防错，如果 src 没有抓到，就尝试抓取 data-src（很多懒加载网站会把真实地址放在这里）
        const videoSrc = $$('video.video-lazy source').attr('src') || $$('video.video-lazy source').attr('data-src');
        // 5. 将真实的视频链接发回给你的前端
        res.json({ videoUrl: videoSrc });

    } catch (error) {
        console.error("抓取失败:", error.message);
        res.status(500).json({ error: "服务器抓取失败" });
    }
});

// 获取 Render 分配的端口，如果在本地运行则默认使用 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 后端服务器已启动，监听端口: ${PORT}`);
});