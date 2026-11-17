# HƯỚNG DẪN SỬ DỤNG PINPOINT (CHROME EXTENSION + NODE.JS BACKEND)

PinPoint là công cụ hỗ trợ Reviewer và Maker ghi chú trực tiếp theo thời gian thực trên bất kỳ tài liệu Google Docs, Google Sheets hoặc file PDF nào trên trình duyệt.

---

## 1. CÁC TÍNH NĂNG CHÍNH

1. **3 Chế độ ghi chú (Annotation Modes)**:
   - **Bôi đen văn bản (Text selection)**: Chọn bất kỳ đoạn văn bản trên Docs/Sheets -> Icon bút `🖊️` nổi lên -> Click để tạo note.
   - **Vẽ vùng tự do (Freehand draw)**: Nhấn giữ phím `Alt` + rê chuột kéo vùng -> Thả chuột ra để tạo note trong khung viền đứt nét kèm pin `📌`.
   - **Click ô Google Sheets (Cell-click)**: Click vào bất kỳ ô tính nào (ví dụ B4) -> Icon bút `🖊️` xuất hiện ở góc ô -> Click để gán note cho ô đó.

2. **2 Vai trò (Roles)**:
   - **Reviewer**: Tạo note, chọn mức độ (🔴 Lỗi / ⚠️ Cần bổ sung / 💡 Góp ý), Đóng (Close) hoặc Mở lại (Reopen) note.
   - **Maker**: Nhận thông báo toast tức thời (< 1 giây) khi Reviewer tạo note. Maker không được xóa note của Reviewer mà chỉ có quyền Phản hồi (Reply) và bấm **Fixed ✓** khi đã hoàn thành sửa.

3. **Thông báo Real-time (Socket.io)**:
   - Cả 2 người cùng mở chung 1 URL file sẽ nhận toast thông báo ngay lập tức mà không cần F5 lại trang.
   - Khi Maker bấm **Fixed ✓**, ghim note trên màn hình của Reviewer lập tức đổi sang màu xanh `✅`.

---

## 2. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### Bước 1: Khởi động Backend Server
Mở Terminal và chạy các lệnh:
```bash
cd backend
npm run dev
```
Server sẽ chạy tại địa chỉ: `http://localhost:4000`.

### Bước 2: Build Extension
Mở một cửa sổ Terminal mới:
```bash
cd extension
npm run build
```
Thư mục `extension/dist` sẽ được tạo và cập nhật đầy đủ file manifest, background và content script.

### Bước 3: Cài đặt Extension vào Google Chrome
1. Mở Google Chrome và truy cập vào đường dẫn: `chrome://extensions/`
2. Bật công tắc **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải.
3. Nhấp vào nút **Load unpacked (Tải tiện ích đã giải nén)** ở góc trên bên trái.
4. Chọn thư mục: `/Users/nguyen/extension/dist` (hoặc thư mục `extension` nếu dùng bản build).
5. Bạn sẽ thấy biểu tượng **PinPoint** xuất hiện trên thanh công cụ của Chrome.

---

## 3. CÁCH KIỂM THỬ THỜI GIAN THỰC (REAL-TIME)

1. Mở 2 tab trình duyệt Chrome đến cùng một link Google Docs hoặc Google Sheets.
2. Trên **Tab 1**:
   - Nhấp vào icon tiện ích PinPoint trên thanh công cụ, chọn vai trò **Reviewer**.
   - Bôi đen một dòng chữ hoặc nhấn giữ `Alt` kéo một vùng hình chữ nhật.
   - Chọn loại note `🔴 Error`, gõ nội dung và nhấn **Pin Note**.
3. Trên **Tab 2**:
   - Chọn vai trò **Maker**.
   - Ngay lập tức trong vòng 1 giây, một thông báo toast sẽ nổi lên ở góc dưới màn hình:
     `⚠️ [reviewer@pinpoint.io] just annotated ...`
   - Ghim `📌` xuất hiện tại đúng vị trí tương ứng.
   - Maker nhấp vào ghim `📌`, nhập phản hồi hoặc nhấp nút màu xanh **Fixed ✓**.
4. Quay lại **Tab 1**:
   - Ghim lập tức chuyển sang màu xanh `✅` và hiển thị thông báo:
     `✅ Maker marked ... as fixed`.

---

## 4. LƯU Ý VỀ BẢO MẬT GITHUB TOKEN
> [!IMPORTANT]
> Token Personal Access của GitHub là thông tin nhạy cảm. Sau khi sử dụng để push dự án lên repository, bạn nên vào lại https://github.com/settings/tokens để revoke (thu hồi) token này nhằm bảo mật tài khoản.
