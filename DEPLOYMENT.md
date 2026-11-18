# DEPLOYMENT.md — Hướng Dẫn Triển Khai, Cập Nhật 1-Click và Khôi Phục Sự Cố

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-18
> **Tài liệu liên quan:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [REQUIREMENTS.md](./REQUIREMENTS.md) · [TESTING.md](./TESTING.md) · [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md)

---

## 1. Tổng Quan Môi Trường Triển Khai (100% Chi Phí 0 Đồng)

Toàn bộ hệ thống vận hành trên 4 dịch vụ miễn phí kết nối với nhau:

| Thành phần | Dịch vụ miễn phí khuyến nghị | Mục đích | Chi phí |
| :--- | :--- | :--- | :---: |
| **1. Kho mã nguồn & Tự động đóng gói** | **GitHub Private Repo** (`Play-with-me/LKDF`) + **GitHub Actions** | Lưu mã nguồn riêng tư, tự động đóng gói bộ cài Windows NSIS (`.exe` + `latest.yml` + `.blockmap`) bằng `electron-builder` mỗi khi đẩy tag mới. | **0 đồng** |
| **2. Máy chủ Phòng chơi & Cổng cập nhật** | **Render.com (Free Web Service)** *(có sẵn `render.yaml`)* hoặc **Koyeb Free** | Chạy `apps/server` (Fastify 5 + WebSocket) và mở Cổng trung gian cập nhật (`/api/update/latest`, `/api/update/latest.yml`, `/api/update/download/:asset`). | **0 đồng** |
| **3. Kho lưu dữ liệu bền vững** | **Turso (libSQL / SQLite Free)** | Lưu Hồ sơ Google, Thống kê người dùng theo Thân Phận/25 Tướng và Bản chụp ván đấu (`RoomSnapshot`) khi máy chủ ngủ. | **0 đồng** |
| **4. Cổng xác thực tài khoản** | **Google Cloud Console (OAuth 2.0 Client)** | Cho phép người chơi bấm `[🔑 Đăng nhập bằng Google]` lấy Tên, Email và Ảnh đại diện. | **0 đồng** |

---

## 2. Thiết Lập Ban Đầu (Chỉ Làm 1 Lần Duy Nhất)

> **Quy tắc bảo mật bắt buộc:** Không bao giờ dán mật khẩu, khóa bí mật (`GOOGLE_CLIENT_SECRET`, `GITHUB_RELEASE_TOKEN`, `DATABASE_AUTH_TOKEN`, `JWT_SESSION_SECRET`) vào cuộc trò chuyện hoặc lưu vào mã nguồn/bộ cài `.exe`. Toàn bộ khóa bí mật chỉ điền vào mục *Environment Variables* trên máy chủ Render/Koyeb.

> *(Dành cho người mới chưa từng cài Cloud: Xem bản hướng dẫn chi tiết từng nút bấm bằng tiếng Việt tại **Mục 5** trong [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md)).*

### Bước 2.1 — Tạo Khóa Đăng nhập Google OAuth 2.0 (0 đồng)
1. Truy cập *Google Cloud Console* → Tạo dự án mới (ví dụ: `Tam Quoc Sat LKDF`).
2. Vào *APIs & Services → OAuth consent screen*:
   - Chọn **External**, đặt tên ứng dụng `Tam Quoc Sat LKDF`.
   - Tại mục **Test users** (khi app ở chế độ *Testing* 0đ), thêm đủ **Gmail của toàn bộ thành viên nhóm (4–8 người)**.
3. Vào *Credentials → Create Credentials → OAuth client ID* (loại **Web application**):
   - Thêm *Authorized redirect URIs*:
     - `http://localhost:3001/api/auth/google/callback` *(chạy thử trên máy)*
     - `https://<ten-may-chu-render-cua-ban>.onrender.com/api/auth/google/callback` *(chạy thật trên Cloud)*
4. Lưu lại 2 thông số: `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`.

### Bước 2.2 — Tạo Kho Lưu Dữ Liệu Cloud 0 đồng (Turso)
1. Đăng ký tài khoản miễn phí trên [Turso](https://turso.tech/) và tạo 1 database mới (ví dụ `lkdf-prod`).
2. Lấy 2 thông số kết nối:
   - `DATABASE_URL` (dạng `libsql://lkdf-prod-<ten>.turso.io`)
   - `DATABASE_AUTH_TOKEN` (Token đọc/ghi cơ sở dữ liệu).

### Bước 2.3 — Tạo Token Chỉ Đọc Cho Kho GitHub Private (`GITHUB_RELEASE_TOKEN`)
> Lưu ý kỹ thuật: Bộ cài Windows dùng **Electron (`electron-builder` + `electron-updater`)** với kiểm tra toàn vẹn **SHA-512** gắn trong `latest.yml` (không cần khóa ký trả phí hay Tauri signer). Toàn bộ quyền đọc kho GitHub Private nằm trọn trên máy chủ qua `GITHUB_RELEASE_TOKEN`.
1. Vào *GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens*.
2. Chọn **Only select repositories** → chọn duy nhất kho `Play-with-me/LKDF`.
3. Tại mục **Repository permissions → Contents**, chọn **`Read-only`** (không cấp quyền ghi hay xóa).
4. Sao chép Token đó gán làm biến `GITHUB_RELEASE_TOKEN` trên Máy chủ Cloud.

### Bước 2.4 — Đưa Máy Chủ (`apps/server`) Lên Cloud 0 Đồng (Render.com)
Kho mã nguồn đã chuẩn bị sẵn file [render.yaml](./render.yaml) tự động điền lệnh Build/Start:
1. Vào [Render.com](https://render.com/) → **New + → Blueprint** (hoặc *Web Service*) → chọn kho GitHub Private `Play-with-me/LKDF`.
2. Render tự nhận các lệnh từ `render.yaml`:
   - **Build Command:** `npm ci && npm run build:shared && npm run build --workspace=@lkdf/server`
   - **Start Command:** `npm run start --workspace=@lkdf/server`
   - **Health Check Path:** `/api/health`
3. Điền đầy đủ biến môi trường (*Environment Variables*):
   - `NODE_ENV=production`
   - `JWT_SESSION_SECRET=<chuỗi ngẫu nhiên dài >= 32 ký tự>` *(hoặc để Render tự sinh qua `generateValue`)*
   - `GOOGLE_CLIENT_ID=...`
   - `GOOGLE_CLIENT_SECRET=...`
   - `GOOGLE_REDIRECT_URI=https://<ten-service>.onrender.com/api/auth/google/callback`
   - `DATABASE_URL=libsql://...`
   - `DATABASE_AUTH_TOKEN=...`
   - `GITHUB_REPO=Play-with-me/LKDF`
   - `GITHUB_RELEASE_TOKEN=...`
4. Vào `https://<ten-service>.onrender.com/api/health` kiểm tra thấy `"ok": true, "googleConfigured": true, "updateProxyConfigured": true`.
5. Vào *GitHub Repo → Settings → Secrets and variables → Actions → Variables*, thêm biến công khai **`LKDF_SERVER_URL`** = `https://<ten-service>.onrender.com` để các bản `.exe` đóng gói từ GitHub Actions tự trỏ sẵn về đúng máy chủ cho cả 8 bạn (bạn bè mở app lên dùng ngay, không cần gõ địa chỉ server).

---

## 3. Quy Trình Đóng Gói & Phát Hành Bản Cập Nhật 1 Cú Nhấp Chuột (1-Click Update)

### Đóng gói kiểm thử trên máy Windows cục bộ
```powershell
npm run package:win
```
Bộ cài sẽ xuất ra tại `apps/desktop/release/`:
- `TamQuocSat-LKDF-Setup-<version>.exe` *(trình cài đặt NSIS 1 nhấp chuột không cần quyền Admin)*
- `TamQuocSat-LKDF-Setup-<version>.exe.blockmap`
- `latest.yml` *(chứa `version`, `sha512`, `size` để `electron-updater` xác minh)*

### Phát hành bản mới cho nhóm bạn qua GitHub Private Releases
1. Đẩy code mới lên `main` và gắn tag phiên bản (ví dụ `v1.0.0`, sau đó sửa lỗi thì `v1.0.1`):
   ```powershell
   git tag v1.0.1
   git push origin main --tags
   ```
   *(Hoặc vào tab **Actions → Release Windows Installer → Run workflow** trên GitHub để nhập tay số phiên bản mà không cần mở dòng lệnh).*
2. Workflow [`.github/workflows/release-windows.yml`](./.github/workflows/release-windows.yml) tự chạy trên Windows runner, kiểm tra toàn bộ test, đóng gói `TamQuocSat-LKDF-Setup-1.0.1.exe` + `latest.yml`, rồi đăng vào **GitHub Releases** của kho Private.
3. Khi nhóm bạn mở ứng dụng bản cũ (`v1.0.0`):
   - App gọi `GET /api/update/latest?currentVersion=1.0.0`.
   - Máy chủ dùng `GITHUB_RELEASE_TOKEN` đọc `latest.yml`, viết lại URL tải trỏ qua `/api/update/download/:asset` mà giữ nguyên mã băm `sha512`.
   - App hiện ngay hộp thoại **`🔔 Đã có phiên bản mới (v1.0.1)!`**. Người chơi bấm đúng **1 nút `[⬇️ Cập nhật ngay]`** → App tự tải qua proxy (`[⬇️ Đang tải bản cập nhật... XX%]`), kiểm tra `sha512`, tự cài đặt đè và khởi động lại ngay.

### Lưu ý cho lần cài đặt đầu tiên trên Windows (Windows SmartScreen)
- Ở lần đầu tiên bạn bè tải file `TamQuocSat-LKDF-Setup-1.0.0.exe` về máy, vì phần mềm nội bộ 0 đồng không mua chứng chỉ thương mại của Microsoft, Windows có thể hiện bảng xanh *"Windows protected your PC"*.
- Bạn chỉ cần dặn bạn bè bấm **`More info` → `Run anyway`** đúng **1 lần đầu tiên đó**. Từ các lần cập nhật 1-Click về sau bên trong ứng dụng, `electron-updater` tự tải đè và kiểm tra chữ ký `sha512` an toàn mà không phải tự tải tay trên trình duyệt nữa.

---

## 4. Quy Trình Khôi Phục Khi Gặp Sự Cố (Rollback & Recovery)

### Tình huống 1 — Máy chủ Cloud 0 đồng tự nghỉ hoặc khởi động lại giữa ván đấu
- **Cách hệ thống tự khôi phục:** Không cần thao tác tay. Khi máy chủ khởi động lại xong (khoảng 30–60 giây), ứng dụng hiển thị màn hình đánh thức có đếm giây; ngay khi bật lên, máy chủ tự nạp `RoomSnapshot` mới nhất từ **Turso**, đưa cả 4–8 người chơi về đúng ghế, đúng máu, đúng tay bài và đúng lượt đang đánh.

### Tình huống 2 — Bản cập nhật mới đẩy lên bị phát hiện lỗi nghiêm trọng
- **Cách khôi phục về bản cũ trong 1 phút (Rollback):**
  1. Vào mục *Releases* trên kho GitHub `Play-with-me/LKDF`.
  2. Chuyển bản phát hành bị lỗi sang trạng thái *Draft (Bản nháp)* hoặc xóa bản Release lỗi đó, giữ bản ổn định trước đó làm *Latest Release* (hoặc đẩy tag mới `v1.0.2` từ commit ổn định).
  3. Chờ tối đa 60 giây cho cache `/api/update` làm mới (hoặc gọi `GET /api/update/latest?refresh=1`).
