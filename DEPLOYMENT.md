# DEPLOYMENT.md — Hướng Dẫn Triển Khai, Cập Nhật 1-Click và Khôi Phục Sự Cố

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-16
> **Tài liệu liên quan:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [REQUIREMENTS.md](./REQUIREMENTS.md) · [TESTING.md](./TESTING.md)

---

## 1. Tổng Quan Môi Trường Triển Khai (100% Chi Phí 0 Đồng)

Toàn bộ hệ thống vận hành trên 4 dịch vụ miễn phí kết nối với nhau:

| Thành phần | Dịch vụ miễn phí khuyến nghị | Mục đích | Chi phí |
| :--- | :--- | :--- | :---: |
| **1. Kho mã nguồn & Tự động đóng gói** | **GitHub Private Repo** (`Play-with-me/LKDF`) + **GitHub Actions** | Lưu mã nguồn riêng tư, tự động đóng gói file cài Windows (`.exe`/`.msi`) mỗi khi đẩy bản mới. | **0 đồng** |
| **2. Máy chủ Phòng chơi & Cổng cập nhật** | **Render.com (Free Web Service)** hoặc **Koyeb Free** | Chạy `apps/server` (Node.js + WebSocket) và làm cổng trung gian tải bản cập nhật 1-Click. | **0 đồng** |
| **3. Kho lưu dữ liệu bền vững** | **Turso (SQLite Free)** hoặc **Upstash Redis / Supabase Free** | Lưu Hồ sơ Google, Thống kê người dùng và Bản chụp ván đấu (`RoomSnapshot`) khi máy chủ ngủ. | **0 đồng** |
| **4. Cổng xác thực tài khoản** | **Google Cloud Console (OAuth 2.0 Client)** | Cho phép người chơi bấm `[🔑 Đăng nhập bằng Google]` lấy Tên, Email và Ảnh đại diện. | **0 đồng** |

---

## 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)

> **Quy tắc bảo mật bắt buộc:** Không bao giờ dán mật khẩu, khóa bí mật (`Client Secret`, `Token`, `Private Key`) vào cuộc trò chuyện hoặc đưa trực tiếp vào mã nguồn. Toàn bộ khóa bí mật chỉ được điền vào mục *Environment Variables / Secrets* trên trang quản trị của dịch vụ.

### Bước 2.1 — Tạo Khóa Đăng nhập Google OAuth 2.0 (0 đồng)
1. Truy cập trang quản trị *Google Cloud Console* → Tạo dự án mới (ví dụ: `LKDF Tam Quoc Sat`).
2. Vào mục *APIs & Services → OAuth consent screen*: Điền tên ứng dụng `Tam Quốc Sát LKDF`, thêm địa chỉ Gmail của các thành viên trong nhóm.
3. Vào mục *Credentials → Create Credentials → OAuth client ID* (loại *Web application*):
   - Thêm đường dẫn gọi lại (Redirect URI): `https://<ten-may-chu-cloud-cua-ban>/api/auth/google/callback` (và `http://localhost:3001/api/auth/google/callback` để chạy thử trên máy).
4. Lưu lại 2 thông số: `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`.

### Bước 2.2 — Tạo Kho Lưu Dữ Liệu Cloud 0 đồng
1. Tạo 1 cơ sở dữ liệu miễn phí (ví dụ trên *Turso* hoặc *Supabase* / *Upstash*).
2. Lấy đường dẫn kết nối (`DATABASE_URL` và `DATABASE_AUTH_TOKEN`) để điền vào máy chủ.

### Bước 2.3 — Tạo Khóa Ký Bản Cập Nhật & Token Đọc GitHub Releases
1. Sinh cặp khóa ký bản cập nhật trên máy lập trình (để ứng dụng Windows xác minh bản cập nhật hợp lệ):
   ```powershell
   npx @tauri-apps/cli signer generate -w .tauri/lkdf.key
   ```
   - Khóa công khai (`Public Key`) được ghi vào cấu hình ứng dụng.
   - Khóa bí mật (`Private Key`) chỉ nạp vào mục *Actions Secrets* trên GitHub (`TAURI_SIGNING_PRIVATE_KEY`).
2. Trên GitHub, tạo 1 mã truy cập cá nhân chỉ có quyền đọc (`Fine-grained Personal Access Token` với quyền `Contents: Read-only` cho kho `Play-with-me/LKDF`) → Lưu thành biến `GITHUB_RELEASE_TOKEN` trên Máy chủ Cloud.

### Bước 2.4 — Đưa Máy Chủ (`apps/server`) Lên Cloud 0 Đồng
1. Kết nối kho GitHub `Play-with-me/LKDF` với dịch vụ chạy máy chủ miễn phí (*Render* hoặc *Koyeb*).
2. Điền danh sách biến môi trường (trong bảng cấu hình của dịch vụ, không lưu vào code):
   - `NODE_ENV=production`
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `JWT_SESSION_SECRET=...` *(chuỗi ngẫu nhiên bảo vệ phiên đăng nhập)*
   - `DATABASE_URL=...`
   - `GITHUB_REPO=Play-with-me/LKDF`
   - `GITHUB_RELEASE_TOKEN=...` *(dùng để tải bản cập nhật từ kho Private về cho người chơi)*

---

## 3. Quy Trình Phát Hành Bản Cập Nhật 1 Cú Nhấp Chuột (1-Click Update)

Sau khi đã cài đặt lần đầu cho nhóm bạn, mỗi khi sửa lỗi hoặc nâng cấp tính năng, bạn **không cần gửi lại file cài đặt thủ công**:

1. **Bước 1:** Tăng số phiên bản trong dự án (ví dụ từ `1.0.0` lên `1.0.1`), đẩy code lên GitHub và gắn nhãn phiên bản:
   ```powershell
   git tag v1.0.1
   git push origin main --tags
   ```
2. **Bước 2 (Tự động 100%):** GitHub Actions tự động đóng gói bộ cài Windows mới và đăng vào mục *Releases* của kho GitHub Private.
3. **Bước 3 (Trên máy của bạn bè):**
   - Khi bạn bè mở ứng dụng bản cũ (`1.0.0`), ứng dụng hỏi máy chủ `/api/update/latest` và hiện ngay hộp thoại:
     > **🔔 Đã có phiên bản mới (v1.0.1)!**
     > Bấm **"Cập nhật ngay"** để tự động nâng cấp và mở lại ứng dụng.
   - Người chơi chỉ cần nhấp chuột **1 lần** vào **`[⬇️ Cập nhật ngay]`** ngay trên ứng dụng (không cần mở trình duyệt hay vào GitHub).

### Lưu ý cho lần cài đặt đầu tiên trên Windows (Windows SmartScreen)
- Ở lần đầu tiên bạn bè tải file cài đặt `.exe`/`.msi` về máy, vì phần mềm nội bộ 0 đồng không mua chứng chỉ thương mại của Microsoft, Windows có thể hiện bảng xanh *"Windows protected your PC"*.
- Bạn chỉ cần dặn bạn bè bấm **`More info` → `Run anyway`** đúng **1 lần đầu tiên đó**. Từ các lần cập nhật 1-Click về sau bên trong ứng dụng, quá trình nâng cấp diễn ra tự động hoàn toàn.

---

## 4. Quy Trình Khôi Phục Khi Gặp Sự Cố (Rollback & Recovery)

### Tình huống 1 — Máy chủ Cloud 0 đồng tự nghỉ hoặc khởi động lại giữa ván đấu
- **Cách hệ thống tự khôi phục:** Không cần thao tác tay. Khi máy chủ khởi động lại xong (khoảng 30–60 giây), máy chủ tự đọc bản chụp `RoomSnapshot` mới nhất từ Kho dữ liệu Cloud 0 đồng; ứng dụng của 4–8 người chơi tự động kết nối lại về đúng ghế, đúng máu, đúng bài trên tay và đúng lượt đang đánh.

### Tình huống 2 — Bản cập nhật mới đẩy lên bị phát hiện lỗi nghiêm trọng
- **Cách khôi phục về bản cũ trong 1 phút (Rollback):**
  1. Vào mục *Releases* trên kho GitHub `Play-with-me/LKDF`.
  2. Chuyển bản phát hành bị lỗi sang trạng thái *Draft (Bản nháp)* hoặc xóa bản Release lỗi đó, giữ bản ổn định trước đó làm *Latest Release* (hoặc đẩy tag mới `v1.0.2` từ nhánh ổn định).
  3. Khởi động lại dịch vụ máy chủ trên trang quản trị Cloud nếu cần làm mới bộ nhớ đệm.
