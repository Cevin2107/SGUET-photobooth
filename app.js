// ===== STATE & CONFIG =====
const STATE = {
    stream: null,
    photos: [null, null, null, null], // Giữ 4 slots để backup, nhưng chỉ dùng 3
    currentFilter: 'none',
    countdownTime: 3,
    isCapturing: false,
    isFlipped: true, // Start with flipped camera
    selectedFrame: null,
    finalImage: null,
    selectedDeviceId: null // Store selected camera device ID
};

const FILTERS = {
    none: '',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    warm: 'sepia(30%) saturate(1.4) brightness(1.1)'
};

// Frame positions - sẽ được import từ tool detector
let FRAME_POSITIONS = {
  "/Frames/Frame1.png": {
    "photoSize": {
      "width": 789,
      "height": 584
    },
    "positions": [
      {
        "x": 92,
        "y": 670,
        "centerX": false
      },
      {
        "x": 47,
        "y": 1279,
        "centerX": false
      },
      {
        "x": 45,
        "y": 1891,
        "centerX": false
      }
    ]
  },
  "/Frames/Frame2.png": {
    "photoSize": {
      "width": 782,
      "height": 576
    },
    "positions": [
      {
        "x": 49,
        "y": 670,
        "centerX": false
      },
      {
        "x": 51,
        "y": 1283,
        "centerX": false
      },
      {
        "x": 49,
        "y": 1895,
        "centerX": false
      }
    ]
  }
};

// ===== DOM ELEMENTS =====
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const countdown = document.getElementById('countdown');
const countdownNumber = document.getElementById('countdownNumber');

const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const singleCaptureBtn = document.getElementById('singleCaptureBtn');
const resetBtn = document.getElementById('resetBtn');
const selectFrameBtn = document.getElementById('selectFrameBtn');
const flipBtn = document.getElementById('flipBtn');

const photoCount = document.getElementById('photoCount');
const timerDisplay = document.getElementById('timerDisplay');

const frameModal = document.getElementById('frameModal');
const frameGrid = document.getElementById('frameGrid');

const swapModal = document.getElementById('swapModal');
const swapOptions = document.getElementById('swapOptions');
let swapFromIndex = null;

const qrModal = document.getElementById('qrModal');
const closeQrModal = document.getElementById('closeQrModal');
const downloadDirectBtn = document.getElementById('downloadDirectBtn');
const newPhotoBtn = document.getElementById('newPhotoBtn');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initTimerButtons();
    initFilterButtons();
    initEventListeners();
    initPhotoSlotButtons();
    loadFramePositions();
    loadFrames();
    updatePhotoCount();
    initCameraSelector();
});

// ===== TIMER BUTTONS =====
function initTimerButtons() {
    const timerButtons = document.querySelectorAll('.timer-btn:not(.timer-btn-custom)');
    const customTimerBtn = document.getElementById('customTimerBtn');
    const customTimerInput = document.getElementById('customTimerInput');
    
    timerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            timerButtons.forEach(b => b.classList.remove('active'));
            customTimerBtn.classList.remove('active');
            btn.classList.add('active');
            STATE.countdownTime = parseInt(btn.dataset.timer);
            timerDisplay.textContent = STATE.countdownTime === 0 ? 'Không' : `${STATE.countdownTime}s`;
            customTimerInput.classList.add('hidden');
        });
    });
    
    // Custom timer button toggle
    customTimerBtn.addEventListener('click', () => {
        customTimerInput.classList.toggle('hidden');
        if (!customTimerInput.classList.contains('hidden')) {
            document.getElementById('customTimer').focus();
        }
    });

    document.getElementById('applyCustomTimer').addEventListener('click', () => {
        const customValue = parseInt(document.getElementById('customTimer').value);
        if (customValue && customValue >= 0 && customValue <= 60) {
            STATE.countdownTime = customValue;
            timerDisplay.textContent = customValue === 0 ? 'Không' : `${customValue}s`;
            timerButtons.forEach(b => b.classList.remove('active'));
            customTimerBtn.classList.add('active');
            customTimerInput.classList.add('hidden');
        } else {
            alert('Vui lòng nhập số từ 0 đến 60!');
        }
    });
}

// ===== FILTER BUTTONS =====
function initFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.currentFilter = btn.dataset.filter;
            video.style.filter = FILTERS[STATE.currentFilter];
        });
    });
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    startBtn.addEventListener('click', startCamera);
    captureBtn.addEventListener('click', startAutoCapture);
    singleCaptureBtn.addEventListener('click', captureSinglePhoto);
    resetBtn.addEventListener('click', resetPhotos);
    selectFrameBtn.addEventListener('click', openFrameModal);
    
    // Frame modal buttons
    const closeFrameBtn = document.getElementById('closeFrameModal');
    const confirmFrameBtn = document.getElementById('confirmFrameBtn');
    if (closeFrameBtn) closeFrameBtn.addEventListener('click', closeFrameModal);
    if (confirmFrameBtn) confirmFrameBtn.addEventListener('click', selectFrame);
    
    // Swap modal buttons
    const closeSwapBtn = document.getElementById('closeSwapModal');
    if (closeSwapBtn) closeSwapBtn.addEventListener('click', closeSwapModal);
    
    // QR modal buttons
    closeQrModal.addEventListener('click', closeQRModal);
    downloadDirectBtn.addEventListener('click', downloadImage);
    
    // Other buttons
    flipBtn.addEventListener('click', toggleFlip);
    newPhotoBtn.addEventListener('click', () => {
        closeQRModal();
        resetPhotos();
    });
}

// ===== CAMERA =====
async function startCamera(deviceId = null) {
    try {
        const constraints = {
            video: { 
                width: { ideal: 1280 }, 
                height: { ideal: 960 }
            }
        };
        
        // If deviceId is provided, use exact device
        if (deviceId) {
            constraints.video.deviceId = { exact: deviceId };
        } else {
            // Default to user-facing camera
            constraints.video.facingMode = 'user';
        }
        
        STATE.stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        video.srcObject = STATE.stream;
        
        // Apply flip by default
        video.classList.add('flipped');
        
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        });
        
        startBtn.classList.add('hidden');
        captureBtn.classList.remove('hidden');
        flipBtn.classList.remove('hidden');
        
        return true;
        
    } catch (error) {
        console.error('Camera error:', error);
        alert('Không thể truy cập camera! Vui lòng kiểm tra quyền truy cập.');
        return false;
    }
}

function stopCamera() {
    if (STATE.stream) {
        STATE.stream.getTracks().forEach(track => track.stop());
        STATE.stream = null;
    }
}

function toggleFlip() {
    STATE.isFlipped = !STATE.isFlipped;
    video.classList.toggle('flipped', STATE.isFlipped);
}

// ===== AUTO CAPTURE =====
async function startAutoCapture() {
    if (STATE.isCapturing) return;
    
    STATE.isCapturing = true;
    captureBtn.disabled = true;
    
    // Chụp 3 ảnh tự động
    for (let i = 0; i < 3; i++) {
        // Countdown
        await doCountdown();
        
        // Capture
        await capturePhoto(i);
        
        // Wait before next photo (except last one)
        if (i < 2) {
            await sleep(1000);
        }
    }
    
    STATE.isCapturing = false;
    captureBtn.classList.add('hidden');
    resetBtn.classList.remove('hidden');
    selectFrameBtn.classList.remove('hidden');
    
    updatePhotoCount();
    updateButtons();
    
    // Tự động mở modal chọn frame
    setTimeout(() => openFrameModal(), 500);
}

async function doCountdown() {
    if (STATE.countdownTime === 0) return;
    
    countdown.classList.remove('hidden');
    
    for (let i = STATE.countdownTime; i > 0; i--) {
        countdownNumber.textContent = i;
        countdownNumber.style.animation = 'none';
        setTimeout(() => countdownNumber.style.animation = 'pulse 0.5s ease-in-out', 10);
        await sleep(1000);
    }
    
    countdown.classList.add('hidden');
}

async function capturePhoto(index) {
    // Apply filter
    ctx.filter = FILTERS[STATE.currentFilter];
    
    // Draw video to canvas
    ctx.save();
    
    // Mirror image nếu FLIP (vì video đã flip rồi)
    // Nếu không flip thì vẽ bình thường
    if (STATE.isFlipped) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.filter = 'none';
    
    // Save photo
    STATE.photos[index] = canvas.toDataURL('image/png');
    
    // Update UI
    const slot = document.querySelector(`.photo-slot[data-index="${index}"]`);
    const img = document.createElement('img');
    img.src = STATE.photos[index];
    slot.innerHTML = '';
    slot.appendChild(img);
    slot.classList.add('filled');
    
    // Re-add delete and swap buttons
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-photo-btn';
    deleteBtn.dataset.index = index;
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.addEventListener('click', () => deletePhoto(index));
    slot.appendChild(deleteBtn);
    
    const swapBtn = document.createElement('button');
    swapBtn.className = 'swap-photo-btn';
    swapBtn.dataset.index = index;
    swapBtn.innerHTML = '<i class="fas fa-arrows-rotate"></i>';
    swapBtn.addEventListener('click', () => openSwapModal(index));
    slot.appendChild(swapBtn);
    
    updatePhotoCount();
    updateButtons();
}

// ===== RESET =====
function resetPhotos() {
    STATE.photos = [null, null, null, null];
    STATE.selectedFrame = null;
    STATE.finalImage = null;
    
    document.querySelectorAll('.photo-slot').forEach((slot, index) => {
        slot.classList.remove('filled');
        slot.innerHTML = `
            <i class="fas fa-image"></i>
            <span>Ảnh ${index + 1}</span>
            <button class="delete-photo-btn hidden" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
            <button class="swap-photo-btn hidden" data-index="${index}">
                <i class="fas fa-arrows-rotate"></i>
            </button>
        `;
    });
    
    // Re-attach event listeners
    initPhotoSlotButtons();
    
    updatePhotoCount();
    updateButtons();
    
    captureBtn.classList.remove('hidden');
    captureBtn.disabled = false;
    singleCaptureBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');
    selectFrameBtn.classList.add('hidden');
}

function updatePhotoCount() {
    const count = STATE.photos.filter(p => p !== null).length;
    photoCount.textContent = `${count}/3`;
}

// ===== FRAMES =====
function loadFramePositions() {
    // Frame positions đã được định nghĩa ở đầu file
    // Có thể load thêm từ file external nếu cần
    console.log('Loaded frame positions:', Object.keys(FRAME_POSITIONS));
}

let currentPreviewFrame = null;

function loadFrames() {
    // Load frames từ folder Frames
    const frames = [
        { name: 'Frame 1', path: '/Frames/Frame1.png' },
        { name: 'Frame 2', path: '/Frames/Frame2.png' }
    ];
    
    frameGrid.innerHTML = '';
    
    frames.forEach(frame => {
        const item = document.createElement('div');
        item.className = 'frame-item';
        item.innerHTML = `
            <img src="${frame.path}" alt="${frame.name}">
            <p>${frame.name}</p>
        `;
        item.addEventListener('click', () => {
            // Update selection UI
            document.querySelectorAll('.frame-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            currentPreviewFrame = frame.path;
            
            // Generate preview
            generateFramePreview(frame.path);
        });
        frameGrid.appendChild(item);
    });
}

async function generateFramePreview(framePath) {
    const previewContainer = document.getElementById('framePreview');
    
    // Show loading
    previewContainer.innerHTML = '<p style="color: #666;">⏳ Đang tạo preview...</p>';
    
    try {
        const previewDataUrl = await createFramedImage(framePath);
        
        const img = document.createElement('img');
        img.src = previewDataUrl;
        previewContainer.innerHTML = '';
        previewContainer.appendChild(img);
    } catch (error) {
        console.error('Preview error:', error);
        previewContainer.innerHTML = '<p style="color: red;">❌ Lỗi: ' + error.message + '</p>';
    }
}

async function createFramedImage(framePath) {
    // Get positions for this frame
    console.log('Looking for frame config:', framePath);
    console.log('Available configs:', Object.keys(FRAME_POSITIONS));
    
    const config = FRAME_POSITIONS[framePath];
    if (!config) {
        throw new Error('Frame chưa có cấu hình vị trí! Path: ' + framePath);
    }
    
    console.log('Using config:', config);
    
    // Load frame image
    const frameImg = await loadImageSafe(framePath);
    
    // Load photos
    const photosToUse = STATE.photos.filter(p => p !== null).slice(0, 3);
    if (photosToUse.length === 0) {
        throw new Error('Không có ảnh nào!');
    }
    
    const photoImages = await Promise.all(
        photosToUse.map(photoData => loadImageSafe(photoData))
    );
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = frameImg.width;
    canvas.height = frameImg.height;
    const ctx = canvas.getContext('2d');
    
    // Draw white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw photos (behind frame)
    photoImages.forEach((photoImg, index) => {
        if (index >= config.positions.length) return;
        
        const pos = config.positions[index];
        const size = config.photoSize;
        
        // Calculate x position
        let x = pos.x;
        if (pos.centerX) {
            x = (canvas.width - size.width) / 2;
        }
        
        // Calculate scaling to cover the slot (like object-fit: cover)
        const scaleX = size.width / photoImg.width;
        const scaleY = size.height / photoImg.height;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = photoImg.width * scale;
        const scaledHeight = photoImg.height * scale;
        
        // Center crop
        const offsetX = (scaledWidth - size.width) / 2;
        const offsetY = (scaledHeight - size.height) / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, pos.y, size.width, size.height);
        ctx.clip();
        ctx.drawImage(photoImg, x - offsetX, pos.y - offsetY, scaledWidth, scaledHeight);
        ctx.restore();
    });
    
    // Draw frame on top
    ctx.drawImage(frameImg, 0, 0);
    
    // Return as JPEG with compression to reduce size
    return canvas.toDataURL('image/jpeg', 0.85);
}

function openFrameModal() {
    frameModal.classList.add('active');
    
    // Auto-select first frame
    setTimeout(() => {
        const firstFrame = document.querySelector('.frame-item');
        if (firstFrame) {
            firstFrame.click();
        }
    }, 100);
}

function closeFrameModal() {
    frameModal.classList.remove('active');
    currentPreviewFrame = null;
}

async function selectFrame(framePath) {
    // This is now the confirm button handler
    if (!currentPreviewFrame) {
        alert('Vui lòng chọn một khung ảnh!');
        return;
    }
    
    // Save frame path before closing modal
    const selectedFramePath = currentPreviewFrame;
    STATE.selectedFrame = selectedFramePath;
    closeFrameModal();
    
    // Show loading
    const loading = document.createElement('div');
    loading.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px 40px; border-radius: 10px; z-index: 9999; font-size: 18px;';
    loading.textContent = '⏳ Đang xử lý...';
    document.body.appendChild(loading);
    
    try {
        // Create final image with saved path
        const finalImageData = await createFramedImage(selectedFramePath);
        STATE.finalImage = finalImageData;
        
        document.body.removeChild(loading);
        
        // Show QR modal
        showQRCode();
    } catch (error) {
        if (document.body.contains(loading)) {
            document.body.removeChild(loading);
        }
        console.error('Frame selection error:', error);
        alert('Lỗi khi xử lý ảnh: ' + error.message);
    }
}

// Helper function to load image safely
function loadImageSafe(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Không thể tải: ' + src));
        img.src = src;
    });
}

// ===== QR CODE =====
function showQRCode() {
    if (!STATE.finalImage) {
        alert('Không có ảnh để hiển thị!');
        return;
    }
    
    qrModal.classList.add('active');
    
    // Show preview image
    const previewImg = document.getElementById('finalImagePreview');
    if (previewImg) {
        previewImg.src = STATE.finalImage;
    }
    
    // Store image in localStorage (with compression)
    const imageId = 'photo_' + Date.now();
    try {
        // Clear old photos to free space (keep only last 5)
        const keys = Object.keys(localStorage).filter(k => k.startsWith('photo_'));
        if (keys.length >= 5) {
            keys.sort().slice(0, keys.length - 4).forEach(k => localStorage.removeItem(k));
        }
        
        localStorage.setItem(imageId, STATE.finalImage);
        console.log('Saved image:', imageId, 'Size:', (STATE.finalImage.length / 1024).toFixed(2) + 'KB');
    } catch (e) {
        console.error('localStorage error:', e);
        alert('Không thể lưu ảnh! Dung lượng localStorage có thể đã đầy.\nBạn vẫn có thể tải trực tiếp về máy tính.');
        // Don't return, still show QR with current URL
    }
    
    // Create download URL
    const baseUrl = window.location.href.split('#')[0].split('?')[0];
    const downloadUrl = baseUrl + '?photo=' + imageId;
    
    console.log('Generating QR for:', downloadUrl);
    
    // Generate QR code
    const qrcodeContainer = document.getElementById('qrcode');
    
    // Completely clear old QR code and reset
    qrcodeContainer.innerHTML = '';
    
    // Add small delay to ensure clean state
    setTimeout(() => {
        try {
            new QRCode(qrcodeContainer, {
                text: downloadUrl,
                width: 256,
                height: 256,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (e) {
            console.error('QRCode generation error:', e);
            alert('Lỗi tạo mã QR! Vui lòng thử lại.');
        }
    }, 50);
}

function closeQRModal() {
    qrModal.classList.remove('active');
    
    // Clear QR code to prevent duplicates on next open
    const qrcodeContainer = document.getElementById('qrcode');
    if (qrcodeContainer) {
        qrcodeContainer.innerHTML = '';
    }
}

function downloadImage() {
    if (!STATE.finalImage) return;
    
    const link = document.createElement('a');
    link.download = `SGUET-Photobooth-${Date.now()}.png`;
    link.href = STATE.finalImage;
    link.click();
}

// ===== UTILITIES =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== CAMERA SELECTOR =====
async function initCameraSelector() {
    const select = document.getElementById('cameraSelect');
    const refreshBtn = document.getElementById('refreshCameraBtn');
    
    if (!select || !refreshBtn) return;
    
    // Populate camera list
    await populateCameraList();
    
    // Event listeners
    select.addEventListener('change', onCameraChange);
    refreshBtn.addEventListener('click', refreshCameraList);
}

async function getCameraDevices() {
    try {
        console.log('🔍 Requesting camera permission...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 960 } } 
        });
        
        console.log('✅ Camera permission granted');
        stream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`📷 Found ${videoDevices.length} camera(s):`, videoDevices.map(d => d.label));
        return videoDevices;
    } catch (err) {
        console.error('❌ Error getting cameras:', err);
        alert(`Không thể truy cập camera!\n\nLỗi: ${err.message}\n\nVui lòng:\n1. Cho phép truy cập camera\n2. Đóng các app khác đang dùng camera\n3. Reload trang (F5)`);
        return [];
    }
}

const CAMERA_TYPES = {
    phone: ['phone', 'mobile', 'android', 'iphone', 'samsung', 'remote', 'link', 'wireless'],
    virtual: ['vmix', 'obs', 'virtual', 'snap', 'manycam', 'xsplit', 'streamlabs', 'droidcam', 'iriun', 'epoccam', 'ndi', 'software'],
    integrated: ['integrated', 'built-in', 'facetime', 'webcam', 'hd webcam', 'laptop', 'internal']
};

function detectCameraType(label) {
    const lower = label.toLowerCase();
    for (const [type, keywords] of Object.entries(CAMERA_TYPES)) {
        if (keywords.some(keyword => lower.includes(keyword))) return type;
    }
    return 'physical';
}

function getCameraDisplay(camera, index) {
    const name = camera.label || `Camera ${index + 1}`;
    const type = detectCameraType(name);
    
    const icons = { phone: '📱', virtual: '🎥', integrated: '📹', physical: '📹' };
    const suffix = type === 'virtual' ? ' (Virtual)' : '';
    
    return {
        text: `${icons[type]} ${name}${suffix}`,
        type,
        isPhone: type === 'phone'
    };
}

async function populateCameraList() {
    const select = document.getElementById('cameraSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Đang tải...</option>';
    
    const cameras = await getCameraDevices();
    select.innerHTML = '<option value="">📷 Chọn camera...</option>';
    
    if (cameras.length === 0) {
        select.innerHTML = '<option value="" disabled>Không tìm thấy camera</option>';
        return;
    }
    
    // Add camera options
    cameras.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        const display = getCameraDisplay(camera, index);
        option.textContent = display.text;
        select.appendChild(option);
    });
    
    // Auto-select default camera
    if (!STATE.selectedDeviceId && cameras.length > 0) {
        const priority = ['integrated', 'physical', 'virtual', 'phone'];
        let defaultCamera = null;
        
        for (const type of priority) {
            defaultCamera = cameras.find(c => {
                const display = getCameraDisplay(c, 0);
                return display.type === type;
            });
            if (defaultCamera) break;
        }
        
        defaultCamera = defaultCamera || cameras[0];
        select.value = defaultCamera.deviceId;
        STATE.selectedDeviceId = defaultCamera.deviceId;
        await startCamera(defaultCamera.deviceId);
    } else if (STATE.selectedDeviceId) {
        select.value = STATE.selectedDeviceId;
    }
}

async function onCameraChange(event) {
    const deviceId = event.target.value;
    
    if (!deviceId) {
        stopCamera();
        startBtn.classList.remove('hidden');
        captureBtn.classList.add('hidden');
        flipBtn.classList.add('hidden');
        return;
    }
    
    stopCamera();
    const success = await startCamera(deviceId);
    if (success) STATE.selectedDeviceId = deviceId;
}

async function refreshCameraList() {
    await populateCameraList();
}

// ===== DOWNLOAD PAGE HANDLER =====
// Check if URL has photo query parameter
const urlParams = new URLSearchParams(window.location.search);
const photoId = urlParams.get('photo');

if (photoId) {
    const imageData = localStorage.getItem(photoId);
    if (imageData) {
        // Delay to ensure page loads
        setTimeout(() => {
            document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
                    <div style="background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 90%;">
                        <h1 style="color: #667eea; margin-bottom: 20px; text-align: center;">
                            <i class="fas fa-camera"></i> SGUET Photobooth
                        </h1>
                        <img src="${imageData}" style="max-width: 100%; height: auto; border-radius: 15px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); margin-bottom: 20px;">
                        <button onclick="downloadFromPage('${photoId}')" style="width: 100%; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-download"></i> Tải Ảnh Về
                        </button>
                    </div>
                </div>
                <script>
                    function downloadFromPage(photoId) {
                        const imageData = localStorage.getItem(photoId);
                        if (imageData) {
                            const link = document.createElement('a');
                            link.download = 'SGUET-Photobooth-' + Date.now() + '.png';
                            link.href = imageData;
                            link.click();
                        }
                    }
                </script>
            `;
        }, 100);
    } else {
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px;">
                <div style="background: white; border-radius: 20px; padding: 30px; text-align: center;">
                    <h1 style="color: #ff4444;">❌ Ảnh không tồn tại hoặc đã hết hạn</h1>
                    <p style="margin-top: 10px; color: #666;">Vui lòng quét lại mã QR hoặc chụp ảnh mới.</p>
                </div>
            </div>
        `;
    }
}

// ===== PHOTO MANAGEMENT =====
function initPhotoSlotButtons() {
    // Delete buttons
    document.querySelectorAll('.delete-photo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            deletePhoto(index);
        });
    });
    
    // Swap buttons
    document.querySelectorAll('.swap-photo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            openSwapModal(index);
        });
    });
}

function deletePhoto(index) {
    if (!STATE.photos[index]) return;
    
    STATE.photos[index] = null;
    
    // Update UI
    const slot = document.querySelector(`.photo-slot[data-index="${index}"]`);
    slot.classList.remove('filled');
    slot.innerHTML = `
        <i class="fas fa-image"></i>
        <span>Ảnh ${index + 1}</span>
        <button class="delete-photo-btn hidden" data-index="${index}">
            <i class="fas fa-times"></i>
        </button>
        <button class="swap-photo-btn hidden" data-index="${index}">
            <i class="fas fa-arrows-rotate"></i>
        </button>
    `;
    
    // Re-attach event listeners for this slot
    const deleteBtn = slot.querySelector('.delete-photo-btn');
    const swapBtn = slot.querySelector('.swap-photo-btn');
    deleteBtn.addEventListener('click', () => deletePhoto(index));
    swapBtn.addEventListener('click', () => openSwapModal(index));
    
    updatePhotoCount();
    updateButtons();
}

function openSwapModal(fromIndex) {
    if (!STATE.photos[fromIndex]) return;
    
    swapFromIndex = fromIndex;
    swapOptions.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const btn = document.createElement('button');
        btn.className = 'swap-option-btn';
        btn.textContent = `Ảnh ${i + 1}`;
        
        if (i === fromIndex) {
            btn.classList.add('disabled');
            btn.textContent += ' (Hiện tại)';
        } else if (!STATE.photos[i]) {
            btn.classList.add('disabled');
            btn.textContent += ' (Trống)';
        } else {
            btn.onclick = () => swapPhotos(fromIndex, i);
        }
        
        swapOptions.appendChild(btn);
    }
    
    swapModal.classList.add('active');
}

function closeSwapModal() {
    swapModal.classList.remove('active');
    swapFromIndex = null;
}

function swapPhotos(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    
    const temp = STATE.photos[fromIndex];
    STATE.photos[fromIndex] = STATE.photos[toIndex];
    STATE.photos[toIndex] = temp;
    
    // Update both slots
    [fromIndex, toIndex].forEach(index => {
        const slot = document.querySelector(`.photo-slot[data-index="${index}"]`);
        if (STATE.photos[index]) {
            const img = document.createElement('img');
            img.src = STATE.photos[index];
            slot.innerHTML = '';
            slot.appendChild(img);
            slot.classList.add('filled');
            
            // Re-add buttons
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-photo-btn';
            deleteBtn.dataset.index = index;
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.addEventListener('click', () => deletePhoto(index));
            slot.appendChild(deleteBtn);
            
            const swapBtn = document.createElement('button');
            swapBtn.className = 'swap-photo-btn';
            swapBtn.dataset.index = index;
            swapBtn.innerHTML = '<i class="fas fa-arrows-rotate"></i>';
            swapBtn.addEventListener('click', () => openSwapModal(index));
            slot.appendChild(swapBtn);
        }
    });
    
    closeSwapModal();
}

async function captureSinglePhoto() {
    const emptyIndex = STATE.photos.findIndex(p => p === null);
    if (emptyIndex === -1) {
        alert('Đã chụp đủ 3 ảnh!');
        return;
    }
    
    singleCaptureBtn.disabled = true;
    
    if (STATE.countdownTime > 0) {
        await showCountdown();
    }
    
    await capturePhoto(emptyIndex);
    
    singleCaptureBtn.disabled = false;
    updateButtons();
}

function updateButtons() {
    const photosFilled = STATE.photos.filter(p => p !== null).length;
    const hasEmptySlots = photosFilled < 3;
    
    // Show/hide single capture button if there are empty slots after initial capture
    if (hasEmptySlots && photosFilled > 0) {
        singleCaptureBtn.classList.remove('hidden');
    } else {
        singleCaptureBtn.classList.add('hidden');
    }
    
    // Show select frame button when all 3 photos are taken
    if (photosFilled === 3) {
        selectFrameBtn.classList.remove('hidden');
        captureBtn.classList.add('hidden');
        singleCaptureBtn.classList.add('hidden');
    } else {
        selectFrameBtn.classList.add('hidden');
    }
    
    // Show/hide reset button
    if (photosFilled > 0) {
        resetBtn.classList.remove('hidden');
    } else {
        resetBtn.classList.add('hidden');
    }
}
