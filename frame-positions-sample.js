// Sample Frame Positions Configuration
// Copy nội dung này vào app.js sau khi chạy detector.html

// Ví dụ cấu hình cho Frame1.png và Frame2.png
const SAMPLE_FRAME_POSITIONS = {
  "Frame1.png": {
    "photoSize": {
      "width": 400,
      "height": 300
    },
    "positions": [
      {
        "x": 50,
        "y": 100,
        "centerX": false
      },
      {
        "x": 50,
        "y": 450,
        "centerX": false
      },
      {
        "x": 50,
        "y": 800,
        "centerX": false
      }
    ]
  },
  "Frame2.png": {
    "photoSize": {
      "width": 380,
      "height": 285
    },
    "positions": [
      {
        "x": 60,
        "y": 120,
        "centerX": true
      },
      {
        "x": 60,
        "y": 470,
        "centerX": true
      },
      {
        "x": 60,
        "y": 820,
        "centerX": true
      }
    ]
  }
};

// Hướng dẫn:
// 1. Chạy detector.html để tự động phát hiện vị trí
// 2. Copy JSON được generate
// 3. Paste vào app.js thay thế FRAME_POSITIONS
// 4. Đảm bảo key của object khớp với path trong loadFrames()
//    Ví dụ: Nếu trong loadFrames() là 'Frames/Frame1.png'
//            thì trong FRAME_POSITIONS phải là 'Frames/Frame1.png'
