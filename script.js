// 切换模态框显示/隐藏
function toggleModal() {
    const modal = document.getElementById('modal');
    const preview = document.getElementById('preview');
    const captionInput = document.getElementById('captionInput');
    const imageUpload = document.getElementById('imageUpload');

    if (modal.style.display === 'none' || modal.style.display === '') {
        // 打开模态框时清空内容
        preview.innerHTML = '';
        captionInput.value = '';
        imageUpload.value = '';
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

// 预览图片
function previewImages() {
    const input = document.getElementById('imageUpload');
    const preview = document.getElementById('preview');
    preview.innerHTML = ''; // 清空之前的预览

    for (const file of input.files) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
}

// 上传图片到服务器
async function uploadImages() {
    const input = document.getElementById('imageUpload');
    const captionInput = document.getElementById('captionInput').value;

    if (input.files.length === 0) {
        alert("请选择图片上传！");
        return;
    }

    const formData = new FormData();
    formData.append('caption', captionInput);
    for (const file of input.files) {
        formData.append('images', file);
    }

    console.log('准备上传图片...'); // 调试信息

    try {
        const response = await fetch('https://campus-activity-platform.onrender.com/upload', {
            method: 'POST',
            body: formData,
        });

        console.log('服务器响应:', response); // 调试信息

        if (response.ok) {
            const data = await response.json();
            console.log('上传成功:', data); // 调试信息
            createGalleryItem(data.data);
            toggleModal();
        } else {
            alert('上传失败');
        }
    } catch (error) {
        console.error('上传失败:', error);
    }
}

// 从服务器加载上传记录
async function loadUploads() {
    try {
        const response = await fetch('https://campus-activity-platform.onrender.com/uploads');
        if (response.ok) {
            const uploads = await response.json();
            uploads.forEach((upload, index) => {
                createGalleryItem(upload, index);
            });
        } else {
            console.error('加载记录失败');
        }
    } catch (error) {
        console.error('加载记录失败:', error);
    }
}

// 删除上传记录
async function deleteUpload(id) {
    try {
        const response = await fetch(`https://campus-activity-platform.onrender.com/uploads/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            const galleryItem = document.querySelector(`[data-id="${id}"]`);
            if (galleryItem) {
                galleryItem.remove();
            }
        } else {
            console.error('删除失败');
        }
    } catch (error) {
        console.error('删除失败:', error);
    }
}

// 创建展示项
function createGalleryItem(upload, index) {
    const gallery = document.getElementById('gallery');
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    galleryItem.setAttribute('data-id', upload._id);

    // 图片
    const img = document.createElement('img');
    img.src = upload.images[0];
    galleryItem.appendChild(img);

    // 描述
    const captionNode = document.createElement('div');
    captionNode.className = 'caption';
    captionNode.innerText = upload.caption;
    galleryItem.appendChild(captionNode);

    // 上传时间
    const timeNode = document.createElement('div');
    timeNode.className = 'time';
    timeNode.innerText = upload.uploadTime;
    galleryItem.appendChild(timeNode);

    // 删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.onclick = function (e) {
        e.stopPropagation();
        deleteUpload(upload._id);
    };
    galleryItem.appendChild(deleteButton);

    // 点击展示栏打开新网页
    galleryItem.onclick = function () {
        const url = `details.html?images=${encodeURIComponent(JSON.stringify(upload.images))}&caption=${encodeURIComponent(upload.caption)}&uploadTime=${encodeURIComponent(upload.uploadTime)}`;
        window.open(url, '_blank');
    };

    gallery.appendChild(galleryItem);
}

// 页面加载时加载上传记录
window.onload = function () {
    loadUploads();
};