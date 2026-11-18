# LKDF — Dự Án Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)

Ứng dụng trò chơi thẻ bài **Tam Quốc Sát** cài đặt trên máy tính **Windows** (`.exe`/`.msi`), thiết kế riêng cho nhóm bạn **từ 4 đến 8 người chơi thật** chơi trực tuyến từ xa qua Internet với ưu tiên số 1 là **độ ổn định**, **tự động hóa trọn vẹn luật chuẩn (108 lá bài, 25 tướng)**, **đăng nhập bằng Google để lưu/phân lọc thống kê người dùng (0 đồng)** và **cập nhật phiên bản mới chỉ bằng 1 cú nhấp chuột ngay trong ứng dụng**.

---

## 1. Tình Trạng Hiện Tại Của Dự Án

- **Giai đoạn hiện tại:** Hoàn thành trọn vẹn mã nguồn và đóng gói từ **Giai đoạn 0 đến Bước 5.1** trong [TASKS.md](./TASKS.md), chuẩn hóa đặc tả luật Yoka ([RULES_STANDARD.md](./RULES_STANDARD.md)), nạp đủ **25 Tướng + 32 Lá bài + 8 Họa tiết Doanh Trại A + 7 SFX (`.webp`/`.ogg`, `1.69 MB`)**, và nâng cấp toàn diện **Giao diện bàn đấu Doanh Trại A Responsive (`960×600`–`2K`) + Nhấn Giữ & Quăng Bài + Phóng to Ngọc Máu & 4 Ô Trang Bị Ngửa + Thanh Lệnh Ẩn Ngoài Lượt + Khoang Soi Kỹ Năng Thống Nhất**. Đã vượt 100% cổng kiểm chứng kỹ thuật của **Bước 5.2** (**85/85** unit tests, **500/500** ván Fuzz Test `0` deadlock, **23/23** integration tests, kiểm tra trực quan `960×600`, `1280×720` `4P–8P`, `1600×900` đạt `0` đè ghế / `0` lỗi console, quét bảo mật gói build & đóng gói thành công `TamQuocSat-LKDF-Setup-*.exe`).
- **Bước tiếp theo:** Bật dịch vụ Cloud 0đ theo **Mục 5** và gửi bộ cài cho nhóm 4–8 bạn chơi thử nghiệm thu theo **Mục 6** trong [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md).

---

## 2. Mục Lục Bộ 11 Tài Liệu Dự Án Chính Thức

Mỗi tài liệu dưới đây phụ trách một mảng thông tin duy nhất để đảm bảo toàn bộ dự án luôn nhất quán:

| STT | Tài liệu | Mục đích & Nội dung chính |
| :---: | :--- | :--- |
| **1** | **[README.md](./README.md)** *(File này)* | Điểm bắt đầu, giới thiệu dự án, tình trạng hiện tại và mục lục dẫn tới toàn bộ tài liệu khác. |
| **2** | **[REQUIREMENTS.md](./REQUIREMENTS.md)** | Mục tiêu, người dùng, phạm vi v1, bảng Thân Phận 4–8 người, danh sách 25 tướng & 108 lá bài chuẩn, đặc tả chi tiết 5 chức năng lớn và 8 tiêu chí nghiệm thu (`AC-1` đến `AC-8`). |
| **3** | **[DESIGN.md](./DESIGN.md)** | Giao diện **Doanh Trại A & Cổ Thư / Gỗ Mun** responsive (`960×600`–`2K`) không cuộn trang, Nhấn giữ & Quăng bài, 4 ô Trang bị ngửa, ma trận 5 trạng thái màn hình, phím tắt và tiện ích Windows. |
| **4** | **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Cấu trúc Monorepo (`packages/shared`, `apps/server`, `apps/desktop`), bảo mật giấu bài, luồng đăng nhập Google OAuth 2.0, lưu bản chụp trên Cloud 0đ và cổng cập nhật 1-Click (`302` CDN) từ GitHub Private. |
| **5** | **[DATA_MODEL.md](./DATA_MODEL.md)** | Mô hình dữ liệu người dùng (`UserProfile`, `UserStats`, `MatchHistory`), phòng chơi, trạng thái ván đấu (`MasterGameState` vs `PlayerViewState`), bảng phân quyền và vòng đời dữ liệu. |
| **6** | **[AGENTS.md](./AGENTS.md)** | Quy tắc làm việc bắt buộc dành cho AI: thứ tự đọc tài liệu, ranh giới tự quyết vs hỏi khách hàng, quy trình kiểm thử và bàn giao. |
| **7** | **[TASKS.md](./TASKS.md)** | Kế hoạch thực hiện chia nhỏ theo 6 giai đoạn, thứ tự phụ thuộc, sản phẩm bàn giao và điều kiện hoàn thành kiểm tra được. |
| **8** | **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md)** | Ghi nhớ mục tiêu, phạm vi đã xác nhận, phần đã hoàn thành, vấn đề tồn tại và bước tiếp theo *(đồng bộ cùng [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md))*. |
| **9** | **[TESTING.md](./TESTING.md)** | Chiến lược 4 tầng kiểm thử: Unit Test 108 lá & 25 tướng, Fuzz Test >= 500 ván (0 deadlock), Integration Test và Kịch bản nghiệm thu thực tế trên Windows. |
| **10** | **[DECISIONS.md](./DECISIONS.md)** | Lịch sử 12 quyết định quan trọng (`ADR-001` đến `ADR-012`) kèm bối cảnh, lý do và đánh đổi. |
| **11** | **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Hướng dẫn triển khai Cloud 0 đồng, thiết lập Google OAuth, cấu hình GitHub Private Actions cho cập nhật 1-Click và cách khôi phục khi có lỗi. |

### Tài liệu ngữ cảnh bổ trợ & Bàn giao AI giữa các máy
- **[CONTEXT.md](./CONTEXT.md)** — **Bản tổng hợp toàn bộ dự án từ Giai đoạn 0 đến hiện tại** giúp thành viên hoặc AI mới đọc 1 lượt nắm đủ 100% ngữ cảnh khi chuyển sang máy khác.
- **[graphify-out/GRAPH_REPORT.md](./graphify-out/GRAPH_REPORT.md)** — Bản đồ kiến trúc mã nguồn (`graphify`) giúp AI tra cứu cụm mô-đun & mối liên kết hàm trong vài giây.
- **[RULES_STANDARD.md](./RULES_STANDARD.md)** — **Đặc tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (108 lá & 25 Tướng, chuẩn viết code)** kèm đối chiếu loại bỏ bản nâng cấp và rà soát sai lệch mã nguồn.
- **[HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md)** — **Sổ tay điều khiển dự án dành riêng cho bạn (Người mới 100% không cần biết lập trình):** tổng hợp sẵn các câu lệnh Copy–Dán cho từng bước từ đầu đến cuối.
- **[docs/intent/v1-tam-quoc-sat.md](./docs/intent/v1-tam-quoc-sat.md)** — Bản chốt ý định gốc của phiên bản đầu (v1).

---

## 3. Cách Khởi Động và Sử Dụng (Sau Khi Khởi Tạo Mã Nguồn Ở Bước 0.2)

### 3.1. Dành cho Người chơi (Trên máy tính Windows)
1. Tải và chạy bộ cài đặt lần đầu (`TamQuocSat-Setup.exe` / `.msi`). *(Lưu ý: Ở lần mở đầu tiên, nếu Windows hiện bảng SmartScreen, bấm `More info` → `Run anyway`)*.
2. Bấm **`[🔑 Đăng nhập bằng Google]`** và xác nhận tài khoản Gmail trên trình duyệt (chỉ cần làm 1 lần đầu, các lần sau mở app tự động đăng nhập).
3. Chủ phòng bấm **`[➕ Tạo phòng chơi mới]`** và gửi mã phòng 6 ký tự cho 3–7 người bạn nhập vào **`[🚪 Vào phòng ngay]`**.
4. Khi có bản cập nhật mới, chỉ cần bấm **1 nút `[⬇️ Cập nhật ngay]`** hiện ngay trong ứng dụng.

### 3.2. Dành cho Thành viên Phát triển & Kiểm thử
Sau khi hoàn thành **Bước 0.2** trong [TASKS.md](./TASKS.md), sử dụng các lệnh sau tại thư mục gốc `c:\Tam quốc sát`:
```powershell
# Cài đặt thư viện
npm install

# Chạy kiểm tra kiểu dữ liệu và bộ kiểm thử đơn vị (108 lá bài & 25 tướng)
npm run typecheck
npm run test:unit

# Chạy kiểm thử giả lập tự động >= 500 ván cho các bàn 4-8 người
npm run test:fuzz

# Khởi động môi trường chạy thử trên máy (Máy chủ + Ứng dụng Windows)
npm run dev
```
