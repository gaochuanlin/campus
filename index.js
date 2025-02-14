const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// 允许跨域请求
app.use(cors({
    origin: '*', // 允许所有来源访问
    methods: ['GET', 'POST', 'DELETE'], // 允许的 HTTP 方法
    allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
}));
app.use(express.json());

// 连接 MongoDB Atlas
mongoose.connect('mongodb+srv://q2621352955:202215665@cluster0.xanzx.mongodb.net/uploadDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Failed to connect to MongoDB Atlas', err));

// 定义上传记录的数据模型
const uploadSchema = new mongoose.Schema({
    caption: String,
    images: [String], // 存储图片的 URL
    uploadTime: String,
});

const Upload = mongoose.model('Upload', uploadSchema);

// 配置 Multer 用于文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // 上传文件存储目录
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // 文件名
    },
});

const upload = multer({ storage });

// 创建上传目录（如果不存在）
const fs = require('fs');
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// 上传图片和记录
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        console.log('收到上传请求:', req.files); // 调试信息
        const { caption } = req.body;
        const images = req.files.map(file => `https://campus-activity-platform.onrender.com/uploads/${file.filename}`);
        const uploadTime = new Date().toLocaleString();

        console.log('图片信息:', images); // 调试信息

        const newUpload = new Upload({ caption, images, uploadTime });
        await newUpload.save();

        console.log('上传记录已保存:', newUpload); // 调试信息

        res.status(201).json({ message: '上传成功', data: newUpload });
    } catch (error) {
        console.error('上传失败:', error); // 调试信息
        res.status(500).json({ message: '上传失败', error: error.message });
    }
});

// 获取所有上传记录
app.get('/uploads', async (req, res) => {
    try {
        const uploads = await Upload.find();
        res.status(200).json(uploads);
    } catch (error) {
        res.status(500).json({ message: '获取记录失败', error: error.message });
    }
});

// 删除上传记录
app.delete('/uploads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Upload.findByIdAndDelete(id);
        res.status(200).json({ message: '删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除失败', error: error.message });
    }
});

// 提供上传文件的静态访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});