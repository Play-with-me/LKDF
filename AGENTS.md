# AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-16

Tài liệu này quy định các nguyên tắc bắt buộc cho mọi AI Agent tham gia phân tích, lập trình, kiểm thử hoặc bảo trì dự án này.

---

## 1. Thứ Tự Đọc Tài Liệu Trước Khi Làm Bất Kỳ Việc Gì

Khi bắt đầu một phiên làm việc mới, AI **bắt buộc đọc theo thứ tự sau** trước khi đề xuất kế hoạch hoặc sửa code:
1. **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md)** (và [`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md)) — Nắm trạng thái hiện tại, các quyết định đã khóa và việc tiếp theo.
2. **[REQUIREMENTS.md](./REQUIREMENTS.md)** — Nắm yêu cầu chức năng, bảng Thân Phận 4–8 người, 25 tướng chuẩn, 108 lá chuẩn và tiêu chí nghiệm thu.
3. **[DESIGN.md](./DESIGN.md)** — Khi làm việc liên quan đến giao diện, bố cục 4–8 ghế, nhãn nút hoặc 5 trạng thái màn hình.
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** & **[DATA_MODEL.md](./DATA_MODEL.md)** — Khi làm việc với lõi luật, máy chủ, đăng nhập Google, lưu trữ Cloud 0đ hoặc tự cập nhật 1-Click.
5. **[TASKS.md](./TASKS.md)** — Kiểm tra đúng đầu việc đang thực hiện và điều kiện hoàn thành của đầu việc đó.

---

## 2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc

- **Tách biệt tuyệt đối Lõi Luật (`packages/shared`):**
  - Toàn bộ quy tắc của 108 lá bài, 25 tướng, tính khoảng cách, ngăn xếp phản ứng (`interruptStack`) và bộ lọc giấu bài (`projectStateForPlayer`) phải viết bằng **TypeScript thuần trong `packages/shared`**, không phụ thuộc vào giao diện hay mạng.
- **Bảo mật trạng thái trên Máy chủ (`apps/server`):**
  - Máy chủ giữ `MasterGameState` và **chỉ gửi `PlayerViewState`** đã lọc sạch bài úp của đối thủ, chồng bài rút và Thân Phận ẩn xuống từng người chơi.
  - Không bao giờ nhúng khóa bí mật (`GOOGLE_CLIENT_SECRET`, `GITHUB_RELEASE_TOKEN`, `DATABASE_AUTH_TOKEN`, `TAURI_SIGNING_PRIVATE_KEY`) vào mã nguồn phía máy khách (`apps/desktop`).
- **Quy ước Giao diện (`apps/desktop`):**
  - Tuân thủ tuyệt đối [DESIGN.md](./DESIGN.md): Cố định `100vh` không cuộn trang ở bàn đấu (`min-h-0`, `min-w-0`), có đủ 5 trạng thái giao diện, nhãn nút ghi rõ hành động cụ thể, không hiển thị số liệu giả.

---

## 3. Phân Định Quyền Tự Quyết Của AI vs Việc Phải Hỏi Khách Hàng

### 3.1. Việc AI được tự quyết định (Không làm phiền khách hàng)
- Cấu trúc hàm, chia tách file nội bộ, đặt tên biến/kiểu dữ liệu TypeScript và tối ưu thuật toán bên trong các mô-đun đã chốt.
- Lựa chọn thư viện phụ trợ nhỏ, cấu hình kiểm tra kiểu (`tsconfig`), cấu hình bộ chạy test (`Vitest`) và viết thêm các bài kiểm thử tự động.
- Sửa các lỗi kỹ thuật phát sinh trong quá trình chạy thử miễn là giữ nguyên hành vi sản phẩm trong [REQUIREMENTS.md](./REQUIREMENTS.md).

### 3.2. Việc AI BẮT BUỘC phải hỏi khách hàng trước khi làm
- Bất kỳ thay đổi nào làm khác đi phạm vi đã khóa trong [REQUIREMENTS.md](./REQUIREMENTS.md) và [DECISIONS.md](./DECISIONS.md) (ví dụ: thêm/bớt tướng khỏi 25 tướng chuẩn, thay đổi bảng chia Thân Phận 4–8 người, thay đổi 4 nút Trọng Tài, hoặc đổi cơ chế đăng nhập Google).
- Mọi quyết định có thể phát sinh chi phí tài chính (vượt khỏi giới hạn 0 đồng), ảnh hưởng đến quyền riêng tư dữ liệu người dùng, hoặc công khai kho mã nguồn Private.
- Khi phát hiện yêu cầu mới của khách hàng mâu thuẫn với tài liệu đã chốt: phải chỉ rõ điểm mâu thuẫn, nêu phương án khuyến nghị kèm lợi ích/đánh đổi và chờ khách hàng xác nhận.

---

## 4. Quy Trình Thực Hiện, Kiểm Tra Thay Đổi & Bảo Vệ Công Việc Hiện Có

1. **Làm theo từng bước nhỏ trong [TASKS.md](./TASKS.md):**
   - Trước mỗi phần, nêu ngắn gọn kết quả sắp tạo.
   - Đọc kỹ các file liên quan trước khi chỉnh sửa; giữ nguyên các phần đang hoạt động ổn định, không tự ý xóa hoặc ghi đè công việc chưa rõ nguồn gốc.
2. **Kiểm tra thực tế trước khi báo cáo hoàn thành:**
   - Chạy kiểm tra kiểu dữ liệu (`typecheck`) và bộ kiểm thử liên quan trong [TESTING.md](./TESTING.md).
   - Không chạy các tiến trình treo vô hạn trên dòng lệnh.
   - **Không bao giờ đánh dấu `[x]` hoàn thành trong [TASKS.md](./TASKS.md) nếu chỉ mới viết code mà chưa chạy kiểm tra thực tế.**

---

## 5. Quy Tắc Cập Nhật Tài Liệu & Bàn Giao Tiến Độ

- Mỗi loại thông tin chỉ cập nhật tại **1 tài liệu gốc chính** (ví dụ: yêu cầu chức năng tại [REQUIREMENTS.md](./REQUIREMENTS.md), giao diện tại [DESIGN.md](./DESIGN.md), dữ liệu tại [DATA_MODEL.md](./DATA_MODEL.md)), các tài liệu khác dẫn link tới đó để tránh lệch thông tin.
- Sau khi hoàn thành và kiểm chứng xong mỗi đầu việc trong [TASKS.md](./TASKS.md), AI bắt buộc cập nhật trạng thái vào [TASKS.md](./TASKS.md) và đồng bộ tóm tắt tiến độ vào cả **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md)** lẫn **[`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md)**.
