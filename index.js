const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs'); // 用于密码加密
const cloudinary = require('cloudinary').v2;
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

cloudinary.config({
    cloud_name: 'drzodhz1b',
    api_key: '531457894625658',
    api_secret: 'aTiadH9NQm_GgA-QZvbQGWxSCe4'
});

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

// 定义用户模型
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' } // 用户角色，默认为普通用户
});

const User = mongoose.model('User', userSchema);

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



// 注册接口
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: '账号已存在！' });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建新用户
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: '注册成功，请登录！' });
    } catch (error) {
        res.status(500).json({ message: '注册失败', error: error.message });
    }
});

// 登录接口
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: '用户名或密码错误！' });
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: '用户名或密码错误！' });
        }

        // 登录成功，返回用户角色
        res.status(200).json({ message: '登录成功！', role: user.role });
    } catch (error) {
        res.status(500).json({ message: '登录失败', error: error.message });
    }
});

// 初始化管理员账号
async function initializeAdminAccount() {
    const adminUsername = 'admin';
    const adminPassword = 'gcl2025';

    try {
        // 检查管理员账号是否已存在
        const existingAdmin = await User.findOne({ username: adminUsername });
        if (!existingAdmin) {
            // 加密密码
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            // 创建管理员账号
            const adminUser = new User({ username: adminUsername, password: hashedPassword, role: 'admin' });
            await adminUser.save();
            console.log('管理员账号已创建');
        } else {
            console.log('管理员账号已存在');
        }
    } catch (error) {
        console.error('初始化管理员账号失败:', error);
    }
}

// 启动服务器时初始化管理员账号
initializeAdminAccount();

// 百度AI的API Key和Secret Key
const BAIDU_API_KEY = '983tWkabaILvWT5tM1Ajzd1w';
const BAIDU_SECRET_KEY = 'EjdI4Ln43DHzE1ulgrmjMU5v7dbU5Sp9';

// 获取百度AI的Access Token
async function getBaiduAccessToken() {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
    const response = await axios.post(url);
    return response.data.access_token;
}

// 调用百度AI的通用物体和场景识别API
async function recognizeImage(imageUrl) {
    const accessToken = await getBaiduAccessToken();
    const url = `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${accessToken}`;
    const response = await axios.post(url, { url: imageUrl }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
}

// 上传图片和记录
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        const { caption } = req.body;

        // 上传图片到 Cloudinary
        const uploadPromises = req.files.map(file => {
            return cloudinary.uploader.upload_stream({
                folder: 'campus-activity-platform'
            }, (error, result) => {
                if (error) {
                    console.error('Cloudinary 上传失败:', error);
                    throw error;
                }
                return result;
            }).end(file.buffer);
        });

        const results = await Promise.all(uploadPromises);
        const images = results.map(result => result.secure_url);

        // 调用百度AI识别每张图片
        const recognitionResults = [];
        for (const imageUrl of images) {
            const recognitionResult = await recognizeImage(imageUrl);
            recognitionResults.push(recognitionResult);
        }

        // 保存记录到 MongoDB
        const uploadTime = new Date().toLocaleString();
        const newUpload = new Upload({
            caption,
            images,
            uploadTime,
            recognitionResults // 保存识别结果
        });
        await newUpload.save();

        res.status(201).json({ message: '上传成功', data: newUpload });
    } catch (error) {
        console.error('上传失败:', error);
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

// 搜索上传记录
app.get('/search', async (req, res) => {
    try {
        const { keyword } = req.query;

        // 从数据库中查找包含关键词的识别结果
        const uploads = await Upload.find({
            recognitionResults: {
                $elemMatch: {
                    result: {
                        $elemMatch: {
                            keyword: { $regex: keyword, $options: 'i' } // 模糊匹配
                        }
                    }
                }
            }
        });

        res.status(200).json(uploads);
    } catch (error) {
        res.status(500).json({ message: '搜索失败', error: error.message });
    }
});

// 提供上传文件的静态访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});